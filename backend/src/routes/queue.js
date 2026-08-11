const express = require('express');

const queueQueries = require('../db/queueQueries');
const serviceQueries = require('../db/serviceQueries');
const { validateJoinInput } = require('../validators/queueValidator');
const { notifyJoin, notifyLeft, notifyServed, notifyIfNearTurn } = require('../services/notificationService');
const { recordHistory } = require('../services/historyService');

async function renotifyNearTurn(service, queueId) {
  const entries = await queueQueries.getQueueEntries(queueId);
  await Promise.all(
    entries.map((entry) =>
      notifyIfNearTurn({
        studentName: entry.student_name,
        serviceId: service.id,
        serviceName: service.name,
        position: Number(entry.position),
      })
    )
  );
}

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const summary = await queueQueries.getQueueSummary();
    res.status(200).json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:serviceId', async (req, res) => {
  try {
    const service = await serviceQueries.getServiceById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const queue = await queueQueries.getOrCreateQueue(service.id);
    const entries = await queueQueries.getQueueEntries(queue.id);

    const withWait = entries.map((entry) => ({
      ...entry,
      position: Number(entry.position),
      estimatedWaitMinutes: (Number(entry.position) - 1) * service.duration,
    }));

    res.status(200).json({
      serviceId: service.id,
      serviceName: service.name,
      count: withWait.length,
      queue: withWait,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:serviceId/join', async (req, res) => {
  try {
    const service = await serviceQueries.getServiceById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    if (!service.open) {
      return res.status(400).json({ error: 'This service is not currently accepting new queue entries.' });
    }

    const { valid, errors } = validateJoinInput(req.body);
    if (!valid) {
      return res.status(400).json({ errors });
    }

    const queue = await queueQueries.getOrCreateQueue(service.id);
    
    // Check for duplicate entry
    const existingEntries = await queueQueries.getQueueEntries(queue.id);
    if (existingEntries.some((e) => e.student_name.toLowerCase() === req.body.studentName.trim().toLowerCase())) {
      return res.status(400).json({ error: 'You are already in this queue.' });
    }

    const entry = await queueQueries.addQueueEntry(
      queue.id,
      req.body.userId || null,
      req.body.studentName.trim(),
      req.body.priority || 'medium',
    );

    await notifyJoin({
      studentName: entry.student_name,
      serviceId: service.id,
      serviceName: service.name,
      position: Number(entry.position),
    });
    await notifyIfNearTurn({
      studentName: entry.student_name,
      serviceId: service.id,
      serviceName: service.name,
      position: Number(entry.position),
    });

    res.status(201).json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:serviceId/move/:entryId', async (req, res) => {
  try {
    const { direction } = req.body;
    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction.' });
    }

    const service = await serviceQueries.getServiceById(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found.' });

    const queue = await queueQueries.getOrCreateQueue(service.id);
    const entries = await queueQueries.getQueueEntries(queue.id);
    
    const idx = entries.findIndex((e) => e.id === req.params.entryId);
    if (idx === -1) return res.status(404).json({ error: 'Entry not found.' });
    
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= entries.length) {
      return res.status(400).json({ error: 'Cannot move in that direction.' });
    }

    const entryA = entries[idx];
    const entryB = entries[swapIdx];

    const success = await queueQueries.swapQueueEntries(entryA.id, entryB.id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to move entry.' });
    }

    await renotifyNearTurn(service, queue.id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:serviceId/leave/:entryId', async (req, res) => {
  try {
    const removed = await queueQueries.removeQueueEntry(req.params.entryId);
    if (!removed) {
      return res.status(404).json({ error: 'Queue entry not found.' });
    }

    const service = await serviceQueries.getServiceById(req.params.serviceId);

    await notifyLeft({
      studentName: removed.student_name,
      serviceId: req.params.serviceId,
      serviceName: service ? service.name : 'Unknown',
    });

    try {
      await recordHistory({
        studentName: removed.student_name,
        serviceId: req.params.serviceId,
        serviceName: service ? service.name : 'Unknown',
        priority: removed.priority,
        joinedAt: new Date(removed.joined_at).getTime(),
        status: 'left',
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_HISTORY_ENTRY') {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    if (service) {
      await renotifyNearTurn(service, removed.queue_id);
    }

    res.status(200).json({ removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:serviceId/serve', async (req, res) => {
  try {
    const service = await serviceQueries.getServiceById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const queue = await queueQueries.getOrCreateQueue(service.id);
    const served = await queueQueries.serveNextEntry(queue.id);
    if (!served) {
      return res.status(404).json({ error: 'Queue is empty.' });
    }

    await notifyServed({
      studentName: served.student_name,
      serviceId: service.id,
      serviceName: service.name,
    });

    try {
      await recordHistory({
        studentName: served.student_name,
        serviceId: service.id,
        serviceName: service.name,
        priority: served.priority,
        joinedAt: new Date(served.joined_at).getTime(),
        status: 'served',
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_HISTORY_ENTRY') {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    await renotifyNearTurn(service, queue.id);

    res.status(200).json({ served });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;