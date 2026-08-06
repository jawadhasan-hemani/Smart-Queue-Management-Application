const express = require('express');

const historyQueries = require('../data/historyQueries');
const { listHistory, getAverageWaitMinutes } = require('../services/historyService');
const { validateHistoryQuery } = require('../validators/historyValidator');

const router = express.Router();

router.get('/summary', async (req, res) => {
  const { valid, errors } = validateHistoryQuery(req.query);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const { studentName, serviceId, status } = req.query;
  let rows = await listHistory({ studentName });
  if (serviceId) {
    rows = rows.filter((h) => h.serviceId === serviceId);
  }
  if (status) {
    rows = rows.filter((h) => h.status === status);
  }
  const avgWaitMinutes = await getAverageWaitMinutes({ studentName, serviceId, status });

  res.status(200).json({
    avgWaitMinutes,
    totalVisits: rows.length,
    served: rows.filter((h) => h.status === 'served').length,
    left: rows.filter((h) => h.status === 'left').length,
  });
});

router.get('/', async (req, res) => {
  const { valid, errors } = validateHistoryQuery(req.query);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const { studentName, search, sortBy } = req.query;
  const history = await listHistory({ studentName, search, sortBy });
  res.status(200).json({ history });
});

router.get('/:id', async (req, res) => {
  const row = await historyQueries.getHistoryById(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'History entry not found.' });
  }
  res.status(200).json({
    entry: {
      id: row.id,
      studentName: row.student_name,
      serviceId: row.service_id,
      serviceName: row.service_name,
      priority: row.priority,
      status: row.status,
      joinedAt: row.joined_at,
      endedAt: row.ended_at,
      waitedMinutes: row.waited_minutes,
    },
  });
});

module.exports = router;
