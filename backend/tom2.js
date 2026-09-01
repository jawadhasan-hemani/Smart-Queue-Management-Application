require('dotenv').config();
require('./config/db').query("SELECT * FROM queue_entries WHERE student_name = 'tom'").then(res => { console.log(res.rows); process.exit(0); });

