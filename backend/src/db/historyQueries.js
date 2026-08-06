const { query } = require('../../config/db');

/** Insert a queue history entry and return it. */
async function insertHistoryEntry(
  userId,
  studentName,
  serviceId,
  serviceName,
  priority,
  status,
  joinedAt,
  endedAt,
  waitedMinutes,
) {
  const sql = `
    INSERT INTO queue_history
      (user_id, student_name, service_id, service_name, priority, status, joined_at, ended_at, waited_minutes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const { rows } = await query(sql, [
    userId,
    studentName,
    serviceId,
    serviceName,
    priority,
    status,
    joinedAt,
    endedAt,
    waitedMinutes,
  ]);
  return rows[0];
}

/** Get all history entries, optionally filtered by studentName. Newest first. */
async function getAllHistory(studentName) {
  if (studentName) {
    const sql = `
      SELECT * FROM queue_history
      WHERE LOWER(student_name) = LOWER($1)
      ORDER BY ended_at DESC;
    `;
    const { rows } = await query(sql, [studentName.trim()]);
    return rows;
  }
  const sql = 'SELECT * FROM queue_history ORDER BY ended_at DESC';
  const { rows } = await query(sql);
  return rows;
}

/** Get a single history entry by id. */
async function getHistoryById(id) {
  const sql = 'SELECT * FROM queue_history WHERE id = $1';
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

/** Get history entries for a specific user_id. Newest first. */
async function getHistoryByUserId(userId) {
  const sql = 'SELECT * FROM queue_history WHERE user_id = $1 ORDER BY ended_at DESC';
  const { rows } = await query(sql, [userId]);
  return rows;
}

module.exports = {
  insertHistoryEntry,
  getAllHistory,
  getHistoryById,
  getHistoryByUserId,
};
