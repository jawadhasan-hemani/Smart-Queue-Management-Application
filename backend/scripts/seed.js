require('dotenv').config();
const { pool } = require('../config/db');
const { insertUserCredentials } = require('../src/db/userQueries');
const { insertService } = require('../src/db/serviceQueries');
const { insertNotification } = require('../src/db/notificationQueries');
const { insertHistoryEntry } = require('../src/db/historyQueries');

const HOURS = 60 * 60 * 1000;

async function run() {
  console.log('Seeding users...');
  const admin = await insertUserCredentials('seed-admin-uid', 'admin@queuesmart.edu', 'password123', 'admin');
  const student1 = await insertUserCredentials('seed-student-1', 'jesiah@queuesmart.edu', 'password123', 'user');
  const student2 = await insertUserCredentials('seed-student-2', 'sam.rivera@queuesmart.edu', 'password123', 'user');
  const student3 = await insertUserCredentials('seed-student-3', 'alex.chen@queuesmart.edu', 'password123', 'user');

  console.log('Seeding services...');
  const advising = await insertService(
    'Academic Advising', 'Walk-in academic advising for course planning.', 15, 'medium', true,
  );
  const financialAid = await insertService(
    'Financial Aid', 'Questions on FAFSA, grants, and loan disbursement.', 20, 'high', true,
  );
  const registrar = await insertService(
    'Registrar Services', 'Transcripts, enrollment verification, and holds.', 10, 'low', false,
  );

  console.log('Seeding queue entries (currently waiting)...');
  await pool.query(
    `INSERT INTO queues (service_id, status) VALUES ($1, 'open') RETURNING *`,
    [advising.id],
  );
  const advisingQueue = (await pool.query(
    `SELECT * FROM queues WHERE service_id = $1 AND status = 'open' LIMIT 1`,
    [advising.id],
  )).rows[0];

  await pool.query(
    `INSERT INTO queue_entries (queue_id, user_id, student_name, priority, status, position)
     VALUES ($1, $2, $3, 'medium', 'waiting', 1), ($1, $4, $5, 'high', 'waiting', 2)`,
    [advisingQueue.id, student2.id, 'Sam Rivera', student3.id, 'Alex Chen'],
  );

  console.log('Seeding queue history (completed visits across several days)...');
  const historyRows = [
    { user: student1, name: 'Jesiah Agudelo', service: advising, priority: 'medium', status: 'served', daysAgo: 0, waited: 12 },
    { user: student2, name: 'Sam Rivera', service: financialAid, priority: 'high', status: 'served', daysAgo: 1, waited: 25 },
    { user: student3, name: 'Alex Chen', service: advising, priority: 'low', status: 'left', daysAgo: 2, waited: 30 },
    { user: null, name: 'Taylor Brooks', service: registrar, priority: 'low', status: 'served', daysAgo: 3, waited: 8 },
    { user: student1, name: 'Jesiah Agudelo', service: financialAid, priority: 'high', status: 'served', daysAgo: 5, waited: 18 },
    { user: student2, name: 'Sam Rivera', service: advising, priority: 'medium', status: 'canceled', daysAgo: 6, waited: 5 },
    { user: null, name: 'Morgan Lee', service: advising, priority: 'medium', status: 'served', daysAgo: 7, waited: 14 },
    { user: student3, name: 'Alex Chen', service: financialAid, priority: 'high', status: 'served', daysAgo: 10, waited: 22 },
  ];

  for (const h of historyRows) {
    const endedAt = new Date(Date.now() - h.daysAgo * 24 * HOURS);
    const joinedAt = new Date(endedAt.getTime() - h.waited * 60 * 1000);
    await insertHistoryEntry({
      userId: h.user ? h.user.id : null,
      studentName: h.name,
      serviceId: h.service.id,
      serviceName: h.service.name,
      priority: h.priority,
      status: h.status,
      joinedAt,
      endedAt,
      waitedMinutes: h.waited,
    });
  }

  console.log('Seeding notifications...');
  await insertNotification({
    userId: student1.id,
    studentName: 'Jesiah Agudelo',
    serviceId: advising.id,
    serviceName: advising.name,
    type: 'joined',
    message: 'You joined the Academic Advising queue.',
  });
  await insertNotification({
    userId: student2.id,
    studentName: 'Sam Rivera',
    serviceId: financialAid.id,
    serviceName: financialAid.name,
    type: 'near_turn',
    message: 'You are next in line for Financial Aid.',
  });

  await pool.end();
  console.log('Seed complete: admin login is admin@queuesmart.edu / password123');
}

run().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});