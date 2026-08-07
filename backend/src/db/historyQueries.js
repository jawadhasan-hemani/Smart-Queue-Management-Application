const { query } = require('../../config/db');

/** Insert a queue history entry and return it. */
async function insertHistoryEntry({
  userId = null,
  studentName,
  serviceId,
  serviceName,
  priority,
  status,
  joinedAt,
  endedAt,
  waitedMinutes,
}) {
  const sql = `
    INSERT INTO queue_history
      (user_id, student_name, service_id, service_name, priority, status, joined_at, ended_at, waited_minutes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  try {
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
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('Duplicate history entry');
      error.code = 'DUPLICATE_HISTORY_ENTRY';
      throw error;
    }
    throw err;
  }
}

/** Get all history entries, optionally filtered. */
async function listHistory({ studentName, search, sortBy } = {}) {
  let sql = 'SELECT * FROM queue_history';
  const params = [];
  const conditions = [];

  if (studentName) {
    params.push(studentName.trim());
    conditions.push(`LOWER(student_name) = LOWER($${params.length})`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`service_name ILIKE $${params.length}`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (sortBy === 'wait-desc') {
    sql += ' ORDER BY waited_minutes DESC';
  } else if (sortBy === 'date-asc') {
    sql += ' ORDER BY ended_at ASC';
  } else {
    sql += ' ORDER BY ended_at DESC';
  }

  const { rows } = await query(sql, params);
  return rows;
}

/** Get average wait minutes based on filters. */
async function getAverageWaitMinutes({ studentName, serviceId, status } = {}) {
  let sql = 'SELECT COALESCE(ROUND(AVG(waited_minutes)), 0) as avg_wait FROM queue_history WHERE 1=1';
  const params = [];

  if (studentName) {
    params.push(studentName.trim());
    sql += ` AND LOWER(student_name) = LOWER($${params.length})`;
  }
  if (serviceId) {
    params.push(serviceId);
    sql += ` AND service_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  const { rows } = await query(sql, params);
  return Math.round(Number(rows[0]?.avg_wait || 0));
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
  listHistory,
  getAverageWaitMinutes,
  getHistoryById,
  getHistoryByUserId,
};
