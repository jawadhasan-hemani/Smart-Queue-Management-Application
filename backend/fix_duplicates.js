require('dotenv').config();
const db = require('./config/db');

async function fixDuplicates() {
  // Get all services
  const { rows: services } = await db.query('SELECT * FROM services ORDER BY created_at ASC');
  
  const grouped = {};
  for (const s of services) {
    if (!grouped[s.name]) grouped[s.name] = [];
    grouped[s.name].push(s);
  }

  for (const [name, list] of Object.entries(grouped)) {
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for "${name}"`);
      const primary = list[0];
      const duplicates = list.slice(1);

      // Get primary queue
      let primaryQueueRes = await db.query(`SELECT id FROM queues WHERE service_id = $1 AND status = 'open' LIMIT 1`, [primary.id]);
      let primaryQueueId;
      if (primaryQueueRes.rows.length === 0) {
        primaryQueueRes = await db.query(`INSERT INTO queues (service_id, status) VALUES ($1, 'open') RETURNING id`, [primary.id]);
      }
      primaryQueueId = primaryQueueRes.rows[0].id;

      for (const dup of duplicates) {
        // Get dup queues
        const dupQueues = await db.query(`SELECT id FROM queues WHERE service_id = $1`, [dup.id]);
        for (const dq of dupQueues.rows) {
          // Move entries
          const updateRes = await db.query(`UPDATE queue_entries SET queue_id = $1 WHERE queue_id = $2 RETURNING id`, [primaryQueueId, dq.id]);
          console.log(`  Moved ${updateRes.rowCount} entries from dup ${dup.id} to primary ${primary.id}`);
        }
        
        // Delete dup
        await db.query(`DELETE FROM services WHERE id = $1`, [dup.id]);
        console.log(`  Deleted dup service ${dup.id}`);
      }
    }
  }

  console.log("Done");
  process.exit(0);
}

fixDuplicates().catch(console.error);
