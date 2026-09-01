require('dotenv').config();
const db = require('./config/db');

async function fixPositions() {
  const queues = await db.query(`SELECT id FROM queues WHERE status = 'open'`);
  
  for (const q of queues.rows) {
    await db.query(
      `UPDATE queue_entries e
       SET position = sub.pos
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY priority DESC, sort_time ASC, id ASC) as pos
         FROM queue_entries
         WHERE queue_id = $1 AND status = 'waiting'
       ) sub
       WHERE e.id = sub.id`,
      [q.id]
    );
    console.log(`Updated positions for queue ${q.id}`);
  }
  console.log("Done");
  process.exit(0);
}
fixPositions().catch(console.error);
