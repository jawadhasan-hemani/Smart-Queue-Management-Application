require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  // 1. Create chat_sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title VARCHAR(100) DEFAULT 'New Chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (user_id) REFERENCES user_credentials(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
  `);
  console.log('✅ chat_sessions table created');

  // 2. Drop the old chat_messages table (it has no session_id column) and recreate
  await pool.query(`DROP TABLE IF EXISTS chat_messages CASCADE`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      session_id UUID NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'model')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (user_id) REFERENCES user_credentials(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);
  `);
  console.log('✅ chat_messages table recreated with session_id');

  // Verify
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_name IN ('chat_sessions','chat_messages') ORDER BY table_name"
  );
  console.log('Verified tables:', tables.rows.map(r => r.table_name));

  await pool.end();
}

run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
