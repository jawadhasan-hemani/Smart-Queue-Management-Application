const express = require('express');
const { randomUUID } = require('crypto');

const { services, queueEntries } = require('../data/store');
const { validateJoinInput } = require('../validators/queueValidator');
const { notifyJoin, notifyIfNearTurn, notifyServed, notifyLeft } = require('../services/notificationService');
const { recordHistory } = require('../services/historyService');

const router = express.Router();

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function orderedQueueFor(serviceId) {
  return queueEntries
    .filter((e) => e.serviceId === serviceId)
    .sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.joinedAt - b.joinedAt,
    );
}

function withPositionAndWait(entries, service) {
  const duration = service?.duration ?? 10;
  return entries.map((entry, idx) => ({
    ...entry,
    position: idx + 1,
    estimatedWaitMinutes: idx * duration,
  }));
}

// Re-checks near-turn status for everyone remaining in a service's queue.
// Called after a leave/serve shifts positions, so students who move into
// the threshold get pinged even though they didn't just join. Safe to call
// on every shift because uq_notifications_near_turn_pending (schema.sql) no-ops
// for anyone who already has an unread ping — this never spams duplicates.
async function renotifyNearTurn(service) {
  const withPosition = withPositionAndWait(orderedQueueFor(service.id), service);
  await Promise.all(
    withPosition.map((entry) =>
      notifyIfNearTurn({
        studentName: entry.studentName,
        serviceId: service.id,
        serviceName: service.name,
        position: entry.position,
      }),
    ),
  );
}

router.get('/', (req, res) => {
  const summary = services.map((s) => ({
    serviceId: s.id,
    serviceName: s.name,
    open: s.open,
    count: orderedQueueFor(s.id).length,
  }));
  res.status(200).json({ summary });
});

router.get('/:serviceId', (req, res) => {
  const service = services.find((s) => s.id === req.params.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const ordered = orderedQueueFor(service.id);
  res.status(200).json({
    serviceId: service.id,
    serviceName: service.name,
    count: ordered.length,
    queue: withPositionAndWait(ordered, service),
  });
});

router.post('/:serviceId/join', async (req, res) => {
  const service = services.find((s) => s.id === req.params.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (!service.open) {
    return res.status(400).json({ error: 'This service is not currently open for new queue entries.' });
  }

  const { valid, errors } = validateJoinInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const entry = {
    id: randomUUID(),
    serviceId: service.id,
    studentName: req.body.studentName.trim(),
    priority: req.body.priority || 'medium',
    joinedAt: Date.now(),
  };

  queueEntries.push(entry);

  const withPosition = withPositionAndWait(orderedQueueFor(service.id), service);
  const placed = withPosition.find((e) => e.id === entry.id);

  await notifyJoin({
    studentName: entry.studentName,
    serviceId: service.id,
    serviceName: service.name,
    position: placed.position,
  });
  await notifyIfNearTurn({
    studentName: entry.studentName,
    serviceId: service.id,
    serviceName: service.name,
    position: placed.position,
  });

  res.status(201).json({
    entry: placed,
    queue: withPosition,
  });
});

router.delete('/:serviceId/leave/:entryId', async (req, res) => {
  const service = services.find((s) => s.id === req.params.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const index = queueEntries.findIndex(
    (e) => e.id === req.params.entryId && e.serviceId === service.id,
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Queue entry not found.' });
  }

  const [removed] = queueEntries.splice(index, 1);

  await notifyLeft({
    studentName: removed.studentName,
    serviceId: service.id,
    serviceName: service.name,
  });

  try {
    await recordHistory({
      studentName: removed.studentName,
      serviceId: service.id,
      serviceName: service.name,
      priority: removed.priority,
      joinedAt: removed.joinedAt,
      status: 'left',
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_HISTORY_ENTRY') {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }

  await renotifyNearTurn(service);

  res.status(200).json({
    removed,
    queue: withPositionAndWait(orderedQueueFor(service.id), service),
  });
});

router.post('/:serviceId/serve', async (req, res) => {
  const service = services.find((s) => s.id === req.params.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const ordered = orderedQueueFor(service.id);
  const next = ordered[0];
  if (!next) {
    return res.status(404).json({ error: 'Queue is empty.' });
  }

  const index = queueEntries.findIndex((e) => e.id === next.id);
  queueEntries.splice(index, 1);

  await notifyServed({
    studentName: next.studentName,
    serviceId: service.id,
    serviceName: service.name,
  });

  try {
    await recordHistory({
      studentName: next.studentName,
      serviceId: service.id,
      serviceName: service.name,
      priority: next.priority,
      joinedAt: next.joinedAt,
      status: 'served',
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_HISTORY_ENTRY') {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }

  await renotifyNearTurn(service);

  res.status(200).json({
    served: next,
    queue: withPositionAndWait(orderedQueueFor(service.id), service),
  });
});

module.exports = router;
