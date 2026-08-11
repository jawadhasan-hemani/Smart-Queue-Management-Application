require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const res = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log('Tables:', res.rows.map(r => r.table_name));

  // Check if chat_messages exists
  const chatCheck = res.rows.find(r => r.table_name === 'chat_messages');
  if (chatCheck) {
    console.log('\nchat_messages table EXISTS');
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='chat_messages' ORDER BY ordinal_position"
    );
    console.log('Columns:', cols.rows);
  } else {
    console.log('\nchat_messages table DOES NOT EXIST');
  }

  // Check user_credentials table
  const ucCheck = res.rows.find(r => r.table_name === 'user_credentials');
  if (ucCheck) {
    console.log('\nuser_credentials table EXISTS');
    const sample = await pool.query('SELECT id, firebase_uid, email, role FROM user_credentials LIMIT 3');
    console.log('Sample users:', sample.rows);
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
