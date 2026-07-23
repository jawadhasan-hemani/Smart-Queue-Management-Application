const { randomUUID } = require('crypto');

const { historyEntries } = require('../data/store');

function recordHistory({ studentName, serviceId, serviceName, priority, joinedAt, status }) {
  const endedAt = Date.now();
  const waitedMinutes = Math.max(0, Math.round((endedAt - joinedAt) / 60_000));

  const entry = {
    id: randomUUID(),
    studentName,
    serviceId,
    serviceName,
    priority,
    status, // 'served' | 'left'
    joinedAt: new Date(joinedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    waitedMinutes,
  };

  historyEntries.push(entry);
  return entry;
}

module.exports = { recordHistory };
