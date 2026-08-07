// Postgres connection pool (Neon).
// DATABASE_URL comes from your personal Neon branch — see backend/.env.example.
// This file only sets up the pool; it does not run any queries itself.

require('dotenv').config();
const { Pool } = require('pg');

// Tests mock this module entirely (jest.mock('../src/data/db', ...)), so this
// file is never even required in the test run — safe to fail loudly here.
if (!process.env.DATABASE_URL) {
  throw new Error(
    '[db] DATABASE_URL is not set. Copy backend/env.example to backend/.env and fill in your Neon connection string.',
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  // Neon's free-tier compute auto-suspends after inactivity; the first query
  // after a suspend can take a few seconds to wake it back up, so this needs
  // more headroom than pg's short default.
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
});

// Without this, an error on an idle client (e.g. Neon's pooler recycling a
// connection) is an unhandled 'error' event and crashes the whole process.
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

module.exports = { pool };