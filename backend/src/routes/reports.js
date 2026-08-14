const express = require('express');

const { verifyFirebaseToken, authorize } = require('../../middleware/authMiddleware');
const reportQueries = require('../db/reportQueries');
const reportService = require('../services/reportService');

const router = express.Router();

const VALID_TYPES = ['users', 'services', 'stats'];

/**
 * Basic YYYY-MM-DD sanity check for optional date-range query params.
 * We don't hard-fail on a bad format elsewhere in this codebase's routes,
 * but a malformed date silently breaks the SQL comparison, so it's worth
 * a real 400 here.
 */
function isValidDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * GET /api/admin/reports?type=users|services|stats&format=csv|pdf
 * Optional: startDate, endDate (YYYY-MM-DD), serviceId (services only),
 * groupByService (stats only, 'true'/'false').
 * Admin-gated. Streams a CSV or PDF file back as an attachment.
 */
router.get('/', verifyFirebaseToken, authorize('admin'), async (req, res) => {
  const {
    type,
    format = 'csv',
    startDate,
    endDate,
    serviceId,
    groupByService,
  } = req.query;

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Invalid or missing 'type'. Must be one of: ${VALID_TYPES.join(', ')}.`,
    });
  }

  if (format !== 'csv' && format !== 'pdf') {
    return res.status(400).json({ error: "format must be 'csv' or 'pdf'." });
  }
  if (type === 'stats' && format === 'pdf') {
    return res.status(400).json({ error: "PDF export isn't available for stats reports yet — use format=csv." });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({ error: 'startDate/endDate must be in YYYY-MM-DD format.' });
  }

  try {
    const grouped = groupByService === 'true';
    let rows;

    if (type === 'users') {
      rows = await reportQueries.getUsersReport({ startDate, endDate });
    } else if (type === 'services') {
      rows = await reportQueries.getServicesReport({ startDate, endDate, serviceId });
    } else {
      rows = await reportQueries.getQueueStats({ startDate, endDate, groupByService: grouped });
    }

    const filename = `${reportService.getReportFilename(type)}.${format}`;
    res.status(200);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      let doc;
      if (type === 'users') doc = reportService.generateUsersPdf(rows);
      else if (type === 'services') doc = reportService.generateServicesPdf(rows);
      else doc = reportService.generateQueueStatsPdf(rows, grouped);
      doc.pipe(res);
      return;
    }

    let csv;
    if (type === 'users') csv = reportService.generateUsersCsv(rows);
    else if (type === 'services') csv = reportService.generateServicesCsv(rows);
    else csv = reportService.generateQueueStatsCsv(rows, grouped);

    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;