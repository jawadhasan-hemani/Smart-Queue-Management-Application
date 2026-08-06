const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Execute a parameterized SQL query against the pool.
 * @param {string} text  – SQL statement with $1, $2, … placeholders
 * @param {any[]}  params – values for placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
