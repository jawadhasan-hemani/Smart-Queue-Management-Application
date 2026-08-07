const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };