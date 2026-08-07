const { query } = require('../../config/db');

async function getServiceById(id) {
  const result = await query('SELECT * FROM services WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = { getServiceById };