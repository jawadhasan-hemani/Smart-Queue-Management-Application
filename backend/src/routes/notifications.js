const express = require('express');

const { notifications, services } = require('../data/store');
const { addNotification } = require('../services/notificationService');
const { validateNotificationInput } = require('../validators/notificationValidator');

const router = express.Router();

function sortedByNewest(list) {
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

router.get('/', (req, res) => {
  const { studentName } = req.query;
  let list = notifications;

  if (studentName !== undefined) {
    if (typeof studentName !== 'string' || !studentName.trim()) {
      return res.status(400).json({ errors: { studentName: 'studentName filter cannot be blank.' } });
    }
    const name = studentName.trim().toLowerCase();
    list = list.filter((n) => n.studentName.toLowerCase() === name);
  }

  res.status(200).json({ notifications: sortedByNewest(list) });
});

router.get('/:id', (req, res) => {
  const notification = notifications.find((n) => n.id === req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  res.status(200).json({ notification });
});

// Admin-triggered / manual notification (e.g. custom announcements).
// System-generated notifications (joined/near_turn/served) are created
// directly by the notificationService when queue events happen.
router.post('/', (req, res) => {
  const { valid, errors } = validateNotificationInput(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  const service = services.find((s) => s.id === req.body.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const notification = addNotification({
    studentName: req.body.studentName.trim(),
    serviceId: service.id,
    serviceName: service.name,
    type: req.body.type,
    message: req.body.message.trim(),
  });

  res.status(201).json({ notification });
});

router.patch('/:id/read', (req, res) => {
  const notification = notifications.find((n) => n.id === req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  notification.read = true;
  res.status(200).json({ notification });
});

module.exports = router;
