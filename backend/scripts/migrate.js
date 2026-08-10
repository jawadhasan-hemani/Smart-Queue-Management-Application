const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'schema.sql'), 'utf8');
  await pool.query(sql);
  await pool.end();
  console.log('Migration complete');
}

run().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
