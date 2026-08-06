const { query } = require('../../config/db');

/** Insert a notification and return it. */
async function insertNotification(userId, studentName, serviceId, serviceName, type, message) {
  const sql = `
    INSERT INTO notifications (user_id, student_name, service_id, service_name, type, message, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'sent')
    RETURNING *;
  `;
  const { rows } = await query(sql, [userId, studentName, serviceId, serviceName, type, message]);
  return rows[0];
}

/** Get all notifications, optionally filtered by studentName. Newest first. */
async function getAllNotifications(studentName) {
  if (studentName) {
    const sql = `
      SELECT * FROM notifications
      WHERE LOWER(student_name) = LOWER($1)
      ORDER BY created_at DESC;
    `;
    const { rows } = await query(sql, [studentName.trim()]);
    return rows;
  }
  const sql = 'SELECT * FROM notifications ORDER BY created_at DESC';
  const { rows } = await query(sql);
  return rows;
}

/** Get notifications for a specific user_id. Newest first. */
async function getNotificationsByUserId(userId) {
  const sql = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC';
  const { rows } = await query(sql, [userId]);
  return rows;
}

/** Get a single notification by id. */
async function getNotificationById(id) {
  const sql = 'SELECT * FROM notifications WHERE id = $1';
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

/** Mark a notification as viewed. */
async function markAsViewed(id) {
  const sql = `
    UPDATE notifications
    SET status = 'viewed'
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

module.exports = {
  insertNotification,
  getAllNotifications,
  getNotificationsByUserId,
  getNotificationById,
  markAsViewed,
};
