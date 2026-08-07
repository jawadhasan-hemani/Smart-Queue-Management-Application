const { query } = require('../../config/db');

async function insertNotification({ userId = null, studentName, serviceId, serviceName, type, message }) {
  const sql = `
    INSERT INTO notifications (user_id, student_name, service_id, service_name, type, message, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'sent')
    RETURNING *;
  `;
  try {
    const { rows } = await query(sql, [userId, studentName, serviceId, serviceName, type, message]);
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      return null;
    }
    throw err;
  }
}

/** Get all notifications, optionally filtered. Newest first. */
async function listNotifications({ studentName, search, type } = {}) {
  let sql = 'SELECT * FROM notifications';
  const params = [];
  const conditions = [];

  if (studentName) {
    params.push(studentName.trim());
    conditions.push(`LOWER(student_name) = LOWER($${params.length})`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`message ILIKE $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
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
async function markNotificationRead(id) {
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
  listNotifications,
  getNotificationsByUserId,
  getNotificationById,
  markNotificationRead,
};
