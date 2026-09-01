require('dotenv').config();
require('./config/db').query("SELECT id, student_name, position, priority, sort_time FROM queue_entries WHERE status = 'waiting' ORDER BY position").then(res => { console.log(res.rows); process.exit(0); });
