const express = require('express');

const { services, queueEntries } = require('../data/store');

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

router.post('/:serviceId/serve', (req, res) => {
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

  res.status(200).json({
    served: next,
    queue: withPositionAndWait(orderedQueueFor(service.id), service),
  });
});

module.exports = router;