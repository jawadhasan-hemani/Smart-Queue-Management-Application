const { query } = require('../../config/db');

/**
 * Report 1: Users + their queue participation history.
 * One row per completed queue visit (served/left/canceled), joined to
 * the user_credentials account when we can match on user_id.
 * Optional date range filters on queue_history.ended_at.
 */
async function getUsersReport({ startDate, endDate } = {}) {
  const params = [];
  const conditions = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`qh.ended_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`qh.ended_at <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      uc.email            AS user_email,
      uc.role             AS user_role,
      qh.student_name      AS student_name,
      qh.service_name      AS service_name,
      qh.priority          AS priority,
      qh.status             AS visit_status,
      qh.joined_at          AS joined_at,
      qh.ended_at            AS ended_at,
      qh.waited_minutes       AS waited_minutes
    FROM queue_history qh
    LEFT JOIN user_credentials uc ON uc.id = qh.user_id
    ${where}
    ORDER BY qh.ended_at DESC;
  `;
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Report 2: Service details + queue activity.
 * One row per service, with current open-queue waiting count and
 * lifetime totals pulled from queue_history.
 */
async function getServicesReport({ startDate, endDate, serviceId } = {}) {
  const params = [];
  const historyConditions = ['qh.service_id = s.id::text'];

  if (startDate) {
    params.push(startDate);
    historyConditions.push(`qh.ended_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    historyConditions.push(`qh.ended_at <= $${params.length}`);
  }

  let serviceFilter = '';
  if (serviceId) {
    params.push(serviceId);
    serviceFilter = `WHERE s.id = $${params.length}`;
  }

  const sql = `
    SELECT
      s.id                          AS service_id,
      s.name                        AS service_name,
      s.description                 AS description,
      s.duration                    AS duration_minutes,
      s.priority                    AS default_priority,
      s.open                        AS is_open,
      COALESCE(wq.waiting_count, 0) AS currently_waiting,
      COALESCE(hist.served_count, 0)   AS total_served,
      COALESCE(hist.left_count, 0)     AS total_left,
      COALESCE(hist.canceled_count, 0) AS total_canceled,
      COALESCE(hist.avg_wait, 0)       AS avg_wait_minutes
    FROM services s
    LEFT JOIN (
      SELECT q.service_id, COUNT(qe.id)::int AS waiting_count
      FROM queues q
      JOIN queue_entries qe ON qe.queue_id = q.id AND qe.status = 'waiting'
      WHERE q.status = 'open'
      GROUP BY q.service_id
    ) wq ON wq.service_id = s.id
    LEFT JOIN (
      SELECT
        qh.service_id,
        COUNT(*) FILTER (WHERE qh.status = 'served')::int   AS served_count,
        COUNT(*) FILTER (WHERE qh.status = 'left')::int     AS left_count,
        COUNT(*) FILTER (WHERE qh.status = 'canceled')::int AS canceled_count,
        COALESCE(ROUND(AVG(qh.waited_minutes)), 0)::int     AS avg_wait
      FROM queue_history qh
      WHERE ${historyConditions.join(' AND ')}
      GROUP BY qh.service_id
    ) hist ON hist.service_id = s.id::text
    ${serviceFilter}
    ORDER BY s.name;
  `;
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Report 3: Queue usage statistics summary (one row overall, or one
 * row per service when groupByService is true).
 * Number served, average wait time, and left/canceled counts.
 */
async function getQueueStats({ startDate, endDate, groupByService = false } = {}) {
  const params = [];
  const conditions = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`ended_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`ended_at <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  if (groupByService) {
    const sql = `
      SELECT
        service_id,
        service_name,
        COUNT(*)::int                                        AS total_visits,
        COUNT(*) FILTER (WHERE status = 'served')::int        AS served_count,
        COUNT(*) FILTER (WHERE status = 'left')::int          AS left_count,
        COUNT(*) FILTER (WHERE status = 'canceled')::int      AS canceled_count,
        COALESCE(ROUND(AVG(waited_minutes)), 0)::int           AS avg_wait_minutes,
        COALESCE(MAX(waited_minutes), 0)::int                   AS max_wait_minutes
      FROM queue_history
      ${where}
      GROUP BY service_id, service_name
      ORDER BY service_name;
    `;
    const { rows } = await query(sql, params);
    return rows;
  }

  const sql = `
    SELECT
      COUNT(*)::int                                     AS total_visits,
      COUNT(*) FILTER (WHERE status = 'served')::int      AS served_count,
      COUNT(*) FILTER (WHERE status = 'left')::int         AS left_count,
      COUNT(*) FILTER (WHERE status = 'canceled')::int      AS canceled_count,
      COALESCE(ROUND(AVG(waited_minutes)), 0)::int            AS avg_wait_minutes,
      COALESCE(MAX(waited_minutes), 0)::int                     AS max_wait_minutes
    FROM queue_history
    ${where};
  `;
  const { rows } = await query(sql, params);
  return rows[0] || {
    total_visits: 0,
    served_count: 0,
    left_count: 0,
    canceled_count: 0,
    avg_wait_minutes: 0,
    max_wait_minutes: 0,
  };
}

module.exports = {
  getUsersReport,
  getServicesReport,
  getQueueStats,
};
