const notificationQueries = require('../db/notificationQueries');

const NEAR_TURN_THRESHOLD = 2;

function mapNotification(row) {
  return {
    id: row.id,
    studentName: row.student_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    type: row.type,
    message: row.message,
    read: row.status === 'viewed',
    createdAt: row.created_at,
  };
}

async function addNotification({ studentName, serviceId, serviceName, type, message }) {
  const row = await notificationQueries.insertNotification({
    studentName,
    serviceId,
    serviceName,
    type,
    message,
  });
  // null means insertNotification hit the near-turn uniqueness guard —
  // the student already has one pending, so there's nothing new to return.
  return row ? mapNotification(row) : null;
}

async function notifyJoin({ studentName, serviceId, serviceName, position }) {
  return addNotification({
    studentName,
    serviceId,
    serviceName,
    type: 'joined',
    message: `You joined the queue for ${serviceName}. You are position ${position}.`,
  });
}

async function notifyIfNearTurn({ studentName, serviceId, serviceName, position }) {
  if (position <= NEAR_TURN_THRESHOLD) {
    return addNotification({
      studentName,
      serviceId,
      serviceName,
      type: 'near_turn',
      message: `You're almost up for ${serviceName}! Estimated position: ${position}.`,
    });
  }
  return null;
}

async function notifyServed({ studentName, serviceId, serviceName }) {
  return addNotification({
    studentName,
    serviceId,
    serviceName,
    type: 'served',
    message: `You have been served for ${serviceName}.`,
  });
}

async function notifyLeft({ studentName, serviceId, serviceName }) {
  return addNotification({
    studentName,
    serviceId,
    serviceName,
    type: 'left',
    message: `You left the queue for ${serviceName}.`,
  });
}

async function markNotificationRead(id) {
  const row = await notificationQueries.markNotificationRead(id);
  return row ? mapNotification(row) : null;
}

module.exports = {
  addNotification,
  notifyJoin,
  notifyIfNearTurn,
  notifyServed,
  notifyLeft,
  markNotificationRead,
  NEAR_TURN_THRESHOLD,
};
