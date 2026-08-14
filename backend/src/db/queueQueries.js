const { query } = require('../../config/db');

const PRIORITY_CASE = `CASE priority
  WHEN 'high' THEN 0
  WHEN 'medium' THEN 1
  WHEN 'low' THEN 2
  ELSE 3
END`;

async function getOrCreateQueue(serviceId) {
  const existing = await query(
    `SELECT * FROM queues WHERE service_id = $1 AND status = 'open' LIMIT 1`,
    [serviceId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query(
    `INSERT INTO queues (service_id, status) VALUES ($1, 'open') RETURNING *`,
    [serviceId],
  );
  return created.rows[0];
}

async function getQueueByServiceId(serviceId) {
  const result = await query(
    `SELECT * FROM queues WHERE service_id = $1 AND status = 'open' LIMIT 1`,
    [serviceId],
  );
  return result.rows[0] || null;
}

async function getQueueEntries(queueId) {
  const result = await query(
    `SELECT *, ROW_NUMBER() OVER (
        ORDER BY ${PRIORITY_CASE}, joined_at ASC, id ASC
      ) AS position
     FROM queue_entries
     WHERE queue_id = $1 AND status = 'waiting'
     ORDER BY ${PRIORITY_CASE}, joined_at ASC, id ASC`,
    [queueId],
  );
  return result.rows;
}

async function addQueueEntry(queueId, userId, studentName, priority = 'medium') {
  const result = await query(
    `INSERT INTO queue_entries (queue_id, user_id, student_name, priority, position, status)
     VALUES ($1, $2, $3, $4, 0, 'waiting')
     RETURNING *`,
    [queueId, userId, studentName, priority],
  );
  await updateEntryPositions(queueId);
  const updated = await query(`SELECT * FROM queue_entries WHERE id = $1`, [result.rows[0].id]);
  const row = updated.rows[0];
  return { ...row, position: Number(row.position) };
}

async function removeQueueEntry(entryId) {
  const result = await query(
    `DELETE FROM queue_entries WHERE id = $1 RETURNING *`,
    [entryId],
  );
  const removed = result.rows[0] || null;
  if (removed) await updateEntryPositions(removed.queue_id);
  return removed;
}

async function serveNextEntry(queueId) {
  const next = await query(
    `SELECT * FROM queue_entries
     WHERE queue_id = $1 AND status = 'waiting'
     ORDER BY ${PRIORITY_CASE}, joined_at ASC
     LIMIT 1`,
    [queueId],
  );
  const entry = next.rows[0];
  if (!entry) return null;

  const served = await query(
    `UPDATE queue_entries
     SET status = 'served', served_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [entry.id],
  );
  await updateEntryPositions(queueId);
  return served.rows[0];
}

async function updateEntryPositions(queueId) {
  await query(
    `UPDATE queue_entries e
     SET position = sub.pos
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY ${PRIORITY_CASE}, joined_at ASC, id ASC) as pos
       FROM queue_entries
       WHERE queue_id = $1 AND status = 'waiting'
     ) sub
     WHERE e.id = sub.id`,
    [queueId],
  );
}

async function swapQueueEntries(entryIdA, entryIdB) {
  const resultA = await query('SELECT joined_at, priority, queue_id FROM queue_entries WHERE id = $1', [entryIdA]);
  const resultB = await query('SELECT joined_at, priority FROM queue_entries WHERE id = $1', [entryIdB]);
  
  if (!resultA.rows[0] || !resultB.rows[0]) return false;
  const a = resultA.rows[0];
  const b = resultB.rows[0];
  
  await query(
    'UPDATE queue_entries SET joined_at = $1, priority = $2 WHERE id = $3',
    [b.joined_at, b.priority, entryIdA]
  );
  await query(
    'UPDATE queue_entries SET joined_at = $1, priority = $2 WHERE id = $3',
    [a.joined_at, a.priority, entryIdB]
  );
  
  await updateEntryPositions(a.queue_id);
  return true;
}

async function getQueueSummary() {
  const result = await query(
    `SELECT s.id AS service_id, s.name AS service_name, s.open,
            COUNT(qe.id)::int AS count
     FROM services s
     LEFT JOIN queues q ON q.service_id = s.id AND q.status = 'open'
     LEFT JOIN queue_entries qe ON qe.queue_id = q.id AND qe.status = 'waiting'
     GROUP BY s.id, s.name, s.open
     ORDER BY s.name`,
  );
  return result.rows.map((row) => ({
    serviceId: row.service_id,
    serviceName: row.service_name,
    open: row.open,
    count: row.count,
  }));
}

async function getUserActiveQueueEntry(userId) {
  const result = await query(
    `SELECT qe.position, s.name as service_name, s.duration as service_duration
     FROM queue_entries qe
     JOIN queues q ON qe.queue_id = q.id
     JOIN services s ON q.service_id = s.id
     WHERE qe.user_id = $1 AND qe.status = 'waiting'
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getOrCreateQueue,
  getQueueByServiceId,
  getQueueEntries,
  addQueueEntry,
  removeQueueEntry,
  serveNextEntry,
  updateEntryPositions,
  getQueueSummary,
  swapQueueEntries,
  getUserActiveQueueEntry,
};