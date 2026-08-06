const { query } = require('../../config/db');

/**
 * Find the open queue for a service, or create one if it doesn't exist.
 */
async function getOrCreateQueue(serviceId) {
  // Try to find existing open queue
  const find = `SELECT * FROM queues WHERE service_id = $1 AND status = 'open'`;
  let { rows } = await query(find, [serviceId]);
  if (rows.length > 0) return rows[0];

  // Create one
  const insert = `
    INSERT INTO queues (service_id, status)
    VALUES ($1, 'open')
    ON CONFLICT (service_id, status) DO UPDATE SET updated_at = NOW()
    RETURNING *;
  `;
  ({ rows } = await query(insert, [serviceId]));
  return rows[0];
}

/** Get queue metadata by service id. */
async function getQueueByServiceId(serviceId) {
  const sql = `SELECT * FROM queues WHERE service_id = $1 AND status = 'open'`;
  const { rows } = await query(sql, [serviceId]);
  return rows[0] || null;
}

/**
 * Return all entries for a queue, sorted by priority rank then arrival time.
 * Each entry includes a computed `position` (1-based).
 */
async function getQueueEntries(queueId) {
  const sql = `
    SELECT *,
           ROW_NUMBER() OVER (
             ORDER BY
               CASE priority
                 WHEN 'high'   THEN 0
                 WHEN 'medium' THEN 1
                 WHEN 'low'    THEN 2
               END,
               joined_at ASC
           ) AS position
    FROM queue_entries
    WHERE queue_id = $1
      AND status = 'waiting'
    ORDER BY
      CASE priority
        WHEN 'high'   THEN 0
        WHEN 'medium' THEN 1
        WHEN 'low'    THEN 2
      END,
      joined_at ASC;
  `;
  const { rows } = await query(sql, [queueId]);
  return rows.map((r) => ({ ...r, position: Number(r.position) }));
}

/**
 * Add a student to a queue. Position is computed as max + 1.
 */
async function addQueueEntry(queueId, userId, studentName, priority = 'medium') {
  // Get current max position
  const maxSql = `SELECT COALESCE(MAX(position), 0) AS max_pos FROM queue_entries WHERE queue_id = $1 AND status = 'waiting'`;
  const { rows: maxRows } = await query(maxSql, [queueId]);
  const nextPos = Number(maxRows[0].max_pos) + 1;

  const sql = `
    INSERT INTO queue_entries (queue_id, user_id, student_name, priority, position, status)
    VALUES ($1, $2, $3, $4, $5, 'waiting')
    RETURNING *;
  `;
  const { rows } = await query(sql, [queueId, userId, studentName, priority, nextPos]);
  return rows[0];
}

/**
 * Remove a queue entry (student leaves). Returns the removed entry.
 */
async function removeQueueEntry(entryId) {
  const sql = `
    UPDATE queue_entries
    SET status = 'cancelled', served_at = NOW()
    WHERE id = $1 AND status = 'waiting'
    RETURNING *;
  `;
  const { rows } = await query(sql, [entryId]);
  return rows[0] || null;
}

/**
 * Serve the next person in line (highest priority, earliest arrival).
 * Marks them as 'served' and returns the entry.
 */
async function serveNextEntry(queueId) {
  const sql = `
    UPDATE queue_entries
    SET status = 'served', served_at = NOW()
    WHERE id = (
      SELECT id FROM queue_entries
      WHERE queue_id = $1 AND status = 'waiting'
      ORDER BY
        CASE priority
          WHEN 'high'   THEN 0
          WHEN 'medium' THEN 1
          WHEN 'low'    THEN 2
        END,
        joined_at ASC
      LIMIT 1
    )
    RETURNING *;
  `;
  const { rows } = await query(sql, [queueId]);
  return rows[0] || null;
}

/**
 * Recalculate positions for all waiting entries in a queue.
 */
async function updateEntryPositions(queueId) {
  const sql = `
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               ORDER BY
                 CASE priority
                   WHEN 'high'   THEN 0
                   WHEN 'medium' THEN 1
                   WHEN 'low'    THEN 2
                 END,
                 joined_at ASC
             ) AS new_pos
      FROM queue_entries
      WHERE queue_id = $1 AND status = 'waiting'
    )
    UPDATE queue_entries
    SET position = ranked.new_pos
    FROM ranked
    WHERE queue_entries.id = ranked.id;
  `;
  await query(sql, [queueId]);
}

/**
 * Get a summary: count of waiting entries per service.
 */
async function getQueueSummary() {
  const sql = `
    SELECT s.id   AS "serviceId",
           s.name AS "serviceName",
           s.open,
           COUNT(qe.id) FILTER (WHERE qe.status = 'waiting') AS count
    FROM services s
    LEFT JOIN queues q     ON q.service_id = s.id AND q.status = 'open'
    LEFT JOIN queue_entries qe ON qe.queue_id = q.id
    GROUP BY s.id, s.name, s.open
    ORDER BY s.name;
  `;
  const { rows } = await query(sql);
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
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
};
