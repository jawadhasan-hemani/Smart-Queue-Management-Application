require('dotenv').config();
const db = require('./config/db');
async function test() {
  const res = await db.query(`SELECT s.name, q.id as queue_id, q.status as q_status, qe.id as entry_id, qe.student_name, qe.status FROM services s LEFT JOIN queues q ON q.service_id = s.id LEFT JOIN queue_entries qe ON qe.queue_id = q.id WHERE s.name = 'Financial Aid'`);
  console.log(res.rows);
  process.exit(0);
}
test();
