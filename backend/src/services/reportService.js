const { createObjectCsvStringifier } = require('csv-writer');

// Column definitions per report type: { id: <row key>, title: <CSV header> }.
// Keep these in sync with the SELECT aliases in reportQueries.js.
const COLUMNS = {
  users: [
    { id: 'user_email', title: 'User Email' },
    { id: 'user_role', title: 'User Role' },
    { id: 'student_name', title: 'Student Name' },
    { id: 'service_name', title: 'Service' },
    { id: 'priority', title: 'Priority' },
    { id: 'visit_status', title: 'Visit Status' },
    { id: 'joined_at', title: 'Joined At' },
    { id: 'ended_at', title: 'Ended At' },
    { id: 'waited_minutes', title: 'Waited (min)' },
  ],
  services: [
    { id: 'service_id', title: 'Service ID' },
    { id: 'service_name', title: 'Service Name' },
    { id: 'description', title: 'Description' },
    { id: 'duration_minutes', title: 'Duration (min)' },
    { id: 'default_priority', title: 'Default Priority' },
    { id: 'is_open', title: 'Currently Open' },
    { id: 'currently_waiting', title: 'Currently Waiting' },
    { id: 'total_served', title: 'Total Served' },
    { id: 'total_left', title: 'Total Left' },
    { id: 'total_canceled', title: 'Total Canceled' },
    { id: 'avg_wait_minutes', title: 'Avg Wait (min)' },
  ],
  stats: [
    { id: 'service_id', title: 'Service ID' },
    { id: 'service_name', title: 'Service' },
    { id: 'total_visits', title: 'Total Visits' },
    { id: 'served_count', title: 'Served' },
    { id: 'left_count', title: 'Left' },
    { id: 'canceled_count', title: 'Canceled' },
    { id: 'avg_wait_minutes', title: 'Avg Wait (min)' },
    { id: 'max_wait_minutes', title: 'Max Wait (min)' },
  ],
  // Overall (non-grouped) stats report has no service columns.
  statsOverall: [
    { id: 'total_visits', title: 'Total Visits' },
    { id: 'served_count', title: 'Served' },
    { id: 'left_count', title: 'Left' },
    { id: 'canceled_count', title: 'Canceled' },
    { id: 'avg_wait_minutes', title: 'Avg Wait (min)' },
    { id: 'max_wait_minutes', title: 'Max Wait (min)' },
  ],
};

const FILENAMES = {
  users: 'users-report',
  services: 'services-report',
  stats: 'queue-stats-report',
};

/**
 * Convert an array of plain-object rows into a CSV string using the given
 * column definitions. Returns just the header row (no crash) when rows is
 * empty, so an empty report still downloads a valid, openable CSV.
 */
function rowsToCsv(rows, columns) {
  const stringifier = createObjectCsvStringifier({ header: columns });
  const header = stringifier.getHeaderString();
  const body = stringifier.stringifyRecords(rows || []);
  return header + body;
}

/** Users + queue participation history report -> CSV string. */
function generateUsersCsv(rows) {
  return rowsToCsv(rows, COLUMNS.users);
}

/** Service details + queue activity report -> CSV string. */
function generateServicesCsv(rows) {
  return rowsToCsv(rows, COLUMNS.services);
}

/**
 * Queue usage statistics report -> CSV string.
 * Pass grouped: true when rows came from getQueueStats({ groupByService: true }).
 */
function generateQueueStatsCsv(rows, grouped = false) {
  const columns = grouped ? COLUMNS.stats : COLUMNS.statsOverall;
  const asArray = Array.isArray(rows) ? rows : [rows];
  return rowsToCsv(asArray, columns);
}

/** Suggested download filename (no extension) for a given report type. */
function getReportFilename(type) {
  const base = FILENAMES[type] || 'report';
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}`;
}

module.exports = {
  rowsToCsv,
  generateUsersCsv,
  generateServicesCsv,
  generateQueueStatsCsv,
  getReportFilename,
  COLUMNS,
};
