const express = require('express');

const { historyEntries } = require('../data/store');
const { validateHistoryQuery } = require('../validators/historyValidator');

const router = express.Router();

router.get('/', (req, res) => {
  const { valid, errors } = validateHistoryQuery(req.query);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  let list = historyEntries;
  if (req.query.studentName) {
    const name = req.query.studentName.trim().toLowerCase();
    list = list.filter((h) => h.studentName.toLowerCase() === name);
  }

  const sorted = [...list].sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
  res.status(200).json({ history: sorted });
});

router.get('/:id', (req, res) => {
  const entry = historyEntries.find((h) => h.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'History entry not found.' });
  }
  res.status(200).json({ entry });
});

module.exports = router;
