const express = require('express');

const serviceQueries = require('../db/serviceQueries');
const { validateServiceInput } = require('../validators/serviceValidator');

const router = express.Router();

const { verifyFirebaseToken, authorize } = require('../../middleware/authMiddleware');

function mapService(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    priority: row.priority,
    open: row.open,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await serviceQueries.getAllServices();
    res.status(200).json({ services: rows.map(mapService) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const service = await serviceQueries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.status(200).json({ service: mapService(service) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', verifyFirebaseToken, authorize('admin'), async (req, res) => {
  const { valid, errors } = validateServiceInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  try {
    const service = await serviceQueries.insertService(
      req.body.name.trim(),
      req.body.description.trim(),
      Number(req.body.duration),
      req.body.priority,
      typeof req.body.open === 'boolean' ? req.body.open : true,
    );
    res.status(201).json({ service: mapService(service) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', verifyFirebaseToken, authorize('admin'), async (req, res) => {
  const { valid, errors } = validateServiceInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  try {
    const updated = await serviceQueries.updateService(req.params.id, {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      duration: Number(req.body.duration),
      priority: req.body.priority,
      open: typeof req.body.open === 'boolean' ? req.body.open : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.status(200).json({ service: mapService(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;