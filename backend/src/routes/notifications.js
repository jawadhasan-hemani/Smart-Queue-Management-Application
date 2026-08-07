const express = require('express');

const { services } = require('../data/store');
const notificationQueries = require('../db/notificationQueries');
const { addNotification, markNotificationRead } = require('../services/notificationService');
const {
  validateNotificationInput,
  validateNotificationQuery,
} = require('../validators/notificationValidator');

const router = express.Router();

router.get('/', async (req, res) => {
  const { valid, errors } = validateNotificationQuery(req.query);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const { studentName, search, type } = req.query;
  const rows = await notificationQueries.listNotifications({ studentName, search, type });
  const notifications = rows.map((row) => ({
    id: row.id,
    studentName: row.student_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    type: row.type,
    message: row.message,
    read: row.status === 'viewed',
    createdAt: row.created_at,
  }));

  res.status(200).json({ notifications });
});

router.get('/:id', async (req, res) => {
  const row = await notificationQueries.getNotificationById(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  res.status(200).json({
    notification: {
      id: row.id,
      studentName: row.student_name,
      serviceId: row.service_id,
      serviceName: row.service_name,
      type: row.type,
      message: row.message,
      read: row.status === 'viewed',
      createdAt: row.created_at,
    },
  });
});

router.post('/', async (req, res) => {
  const { valid, errors } = validateNotificationInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const service = services.find((s) => s.id === req.body.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const notification = await addNotification({
    studentName: req.body.studentName.trim(),
    serviceId: service.id,
    serviceName: service.name,
    type: req.body.type,
    message: req.body.message.trim(),
  });

  res.status(201).json({ notification });
});

router.patch('/:id/read', async (req, res) => {
  const notification = await markNotificationRead(req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  res.status(200).json({ notification });
});

module.exports = router;
