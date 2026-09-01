require('dotenv').config();
const db = require('./config/db');
async function test() {
  const res = await db.query(`SELECT s.id AS service_id, s.name, COUNT(qe.id)::int AS count FROM services s LEFT JOIN queues q ON q.service_id = s.id AND q.status = 'open' LEFT JOIN queue_entries qe ON qe.queue_id = q.id AND qe.status = 'waiting' GROUP BY s.id, s.name`);
  console.log(res.rows);
  process.exit(0);
}
test();
