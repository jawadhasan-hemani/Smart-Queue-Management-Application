const historyQueries = require('../db/historyQueries');

function mapHistoryEntry(row) {
  return {
    id: row.id,
    studentName: row.student_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priority: row.priority,
    status: row.status,
    joinedAt: row.joined_at,
    endedAt: row.ended_at,
    waitedMinutes: row.waited_minutes,
  };
}

async function recordHistory({ studentName, serviceId, serviceName, priority, joinedAt, status }) {
  const endedAt = Date.now();
  const waitedMinutes = Math.max(0, Math.round((endedAt - joinedAt) / 60_000));

  const row = await historyQueries.insertHistoryEntry({
    studentName,
    serviceId,
    serviceName,
    priority,
    status,
    joinedAt: new Date(joinedAt),
    endedAt: new Date(endedAt),
    waitedMinutes,
  });

  return mapHistoryEntry(row);
}

async function listHistory({ studentName, search, sortBy } = {}) {
  const rows = await historyQueries.listHistory({ studentName, search, sortBy });
  return rows.map(mapHistoryEntry);
}

async function getAverageWaitMinutes({ studentName, serviceId, status } = {}) {
  return historyQueries.getAverageWaitMinutes({ studentName, serviceId, status });
}

module.exports = { recordHistory, listHistory, getAverageWaitMinutes };
