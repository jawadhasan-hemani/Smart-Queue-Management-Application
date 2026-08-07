const { insertNotification } = require('../src/data/notificationQueries');
const { insertHistoryEntry } = require('../src/data/historyQueries');
const { pool } = require('../src/data/db');

async function run() {
  await insertNotification({
    studentName: 'Jesiah Agudelo',
    serviceId: '96b1e753-a606-477d-8f5c-05d28c6e169f',
    serviceName: 'Academic Advising',
    type: 'joined',
    message: 'You joined the Academic Advising queue.',
  });

  await insertNotification({
    studentName: 'Jesiah Agudelo',
    serviceId: '96b1e753-a606-477d-8f5c-05d28c6e169f',
    serviceName: 'Academic Advising',
    type: 'near_turn',
    message: 'You are next in line for Academic Advising.',
  });

  await insertHistoryEntry({
    studentName: 'Jesiah Agudelo',
    serviceId: '96b1e753-a606-477d-8f5c-05d28c6e169f',
    serviceName: 'Academic Advising',
    priority: 'medium',
    status: 'served',
    joinedAt: new Date(Date.now() - 20 * 60 * 1000),
    endedAt: new Date(),
    waitedMinutes: 20,
  });

  await insertHistoryEntry({
    studentName: 'Sam Rivera',
    serviceId: '96b1e753-a606-477d-8f5c-05d28c6e169f',
    serviceName: 'Financial Aid',
    priority: 'high',
    status: 'left',
    joinedAt: new Date(Date.now() - 35 * 60 * 1000),
    endedAt: new Date(Date.now() - 5 * 60 * 1000),
    waitedMinutes: 30,
  });

  await pool.end();
  console.log('Seed complete');
}

run().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
