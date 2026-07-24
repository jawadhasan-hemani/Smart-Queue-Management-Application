const { randomUUID } = require('crypto');

const { notifications } = require('../data/store');

// A student counts as "near being served" once their queue position is at
// or below this number.
const NEAR_TURN_THRESHOLD = 2;

function addNotification({ studentName, serviceId, serviceName, type, message }) {
  const notification = {
    id: randomUUID(),
    studentName,
    serviceId,
    serviceName,
    type,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notification);
  return notification;
}

function notifyJoin({ studentName, serviceId, serviceName, position }) {
  return addNotification({
    studentName,
    serviceId,
    serviceName,
    type: 'joined',
    message: `You joined the queue for ${serviceName}. You are position ${position}.`,
  });
}

function notifyIfNearTurn({ studentName, serviceId, serviceName, position }) {
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

function notifyServed({ studentName, serviceId, serviceName }) {
  return addNotification({
    studentName,
    serviceId,
    serviceName,
    type: 'served',
    message: `You have been served for ${serviceName}.`,
  });
}

module.exports = {
  addNotification,
  notifyJoin,
  notifyIfNearTurn,
  notifyServed,
  NEAR_TURN_THRESHOLD,
};
// Notification/History modules maintained by Jesiah Aqudelo
