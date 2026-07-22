const express = require('express');
const { randomUUID } = require('crypto');

const { services } = require('../data/store');
const { validateServiceInput } = require('../validators/serviceValidator');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ services });
});

router.get('/:id', (req, res) => {
  const service = services.find((s) => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }
  res.status(200).json({ service });
});

router.post('/', (req, res) => {
  const { valid, errors } = validateServiceInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const now = new Date().toISOString();
  const service = {
    id: randomUUID(),
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    duration: Number(req.body.duration),
    priority: req.body.priority,
    open: typeof req.body.open === 'boolean' ? req.body.open : true,
    createdAt: now,
    updatedAt: now,
  };

  services.push(service);
  res.status(201).json({ service });
});

router.put('/:id', (req, res) => {
  const service = services.find((s) => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const { valid, errors } = validateServiceInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  service.name = req.body.name.trim();
  service.description = req.body.description.trim();
  service.duration = Number(req.body.duration);
  service.priority = req.body.priority;
  if (typeof req.body.open === 'boolean') {
    service.open = req.body.open;
  }
  service.updatedAt = new Date().toISOString();

  res.status(200).json({ service });
});

module.exports = router;