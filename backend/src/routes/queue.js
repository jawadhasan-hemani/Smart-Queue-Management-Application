const express = require('express');

const queueQueries = require('../db/queueQueries');
const serviceQueries = require('../db/serviceQueries');
const { validateJoinInput } = require('../validators/queueValidator');

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
    const entry = await queueQueries.addQueueEntry(
      queue.id,
      req.body.userId || null,
      req.body.studentName.trim(),
      req.body.priority || 'medium',
    );

    res.status(201).json({ entry });
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

    res.status(200).json({ served });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;