const { pool } = require('./db');

async function insertNotification({ userId = null, studentName, serviceId, serviceName, type, message }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, student_name, service_id, service_name, type, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, studentName, serviceId, serviceName, type, message],
    );
    return rows[0];
  } catch (err) {
    // uq_notifications_near_turn_pending: student already has an unread
    // near-turn ping for this service — not an error, just a no-op.
    if (err.code === '23505') {
      return null;
    }
    throw err;
  }
}

async function listNotifications({ studentName, search, type } = {}) {
  const clauses = [];
  const values = [];

  if (studentName) {
    values.push(studentName);
    clauses.push(`LOWER(student_name) = LOWER($${values.length})`);
  }
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(message ILIKE $${values.length} OR service_name ILIKE $${values.length})`);
  }
  if (type) {
    values.push(type);
    clauses.push(`type = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC`,
    values,
  );
  return rows;
}

async function getNotificationById(id) {
  const { rows } = await pool.query(`SELECT * FROM notifications WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function markNotificationRead(id) {
  const { rows } = await pool.query(
    `UPDATE notifications SET status = 'viewed' WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

module.exports = {
  insertNotification,
  listNotifications,
  getNotificationById,
  markNotificationRead,
};
