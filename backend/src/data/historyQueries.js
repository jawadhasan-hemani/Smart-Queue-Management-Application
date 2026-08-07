// SQL query layer for the `queue_history` table.
// NOTE: not yet used by historyService.js — that swap happens in a
// later step, once this layer has been tested against a real branch.

const { pool } = require('./db');

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
  try {
    const { rows } = await pool.query(
      `INSERT INTO queue_history
         (user_id, student_name, service_id, service_name, priority, status, joined_at, ended_at, waited_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, studentName, serviceId, serviceName, priority, status, joinedAt, endedAt, waitedMinutes],
    );
    return rows[0];
  } catch (err) {
    // uq_queue_history_visit: this exact visit (student + service + joined_at)
    // was already resolved into a history row — surface a typed error so the
    // route can return 409 instead of a generic 500.
    if (err.code === '23505') {
      const dup = new Error('This queue visit was already recorded in history.');
      dup.code = 'DUPLICATE_HISTORY_ENTRY';
      throw dup;
    }
    throw err;
  }
}

async function listHistory({ studentName, search, sortBy = 'date-desc' } = {}) {
  const clauses = [];
  const values = [];

  if (studentName) {
    values.push(studentName);
    clauses.push(`LOWER(student_name) = LOWER($${values.length})`);
  }
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`service_name ILIKE $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = {
    'date-asc': 'ended_at ASC',
    'wait-desc': 'waited_minutes DESC',
    'date-desc': 'ended_at DESC',
  }[sortBy] || 'ended_at DESC';

  const { rows } = await pool.query(
    `SELECT * FROM queue_history ${where} ORDER BY ${orderBy}`,
    values,
  );
  return rows;
}

async function getHistoryById(id) {
  const { rows } = await pool.query(`SELECT * FROM queue_history WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function getAverageWaitMinutes({ studentName, serviceId, status } = {}) {
  const clauses = ['waited_minutes > 0'];
  const values = [];

  if (studentName) {
    values.push(studentName);
    clauses.push(`LOWER(student_name) = LOWER($${values.length})`);
  }
  if (serviceId) {
    values.push(serviceId);
    clauses.push(`service_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT COALESCE(ROUND(AVG(waited_minutes)), 0) AS avg_wait
     FROM queue_history WHERE ${clauses.join(' AND ')}`,
    values,
  );
  return Number(rows[0].avg_wait);
}

module.exports = {
  insertHistoryEntry,
  listHistory,
  getHistoryById,
  getAverageWaitMinutes,
};
