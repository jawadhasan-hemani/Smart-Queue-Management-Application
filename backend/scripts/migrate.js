const fs = require('fs');
const path = require('path');
const { pool } = require('../src/data/db');

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
