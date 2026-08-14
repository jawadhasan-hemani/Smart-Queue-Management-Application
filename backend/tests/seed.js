require('dotenv').config();

const { pool } = require('../config/db');
const { getAllServices, insertService } = require('../src/db/serviceQueries');
const { getOrCreateQueue, addQueueEntry, getQueueEntries } = require('../src/db/queueQueries');
const { insertNotification } = require('../src/db/notificationQueries');
const { insertHistoryEntry } = require('../src/db/historyQueries');

const DUMMY_SERVICES = [
  { name: 'General Academic Advising', description: 'Course planning, degree requirements, and general questions.', duration: 12, priority: 'medium', open: true },
  { name: 'Registration & Enrollment', description: 'Add/drop help, holds, waitlists, and enrollment issues.', duration: 8, priority: 'high', open: true },
  { name: 'Career & Internship Advising', description: 'Resume review, internship search, and career pathways.', duration: 20, priority: 'low', open: true },
  { name: 'Financial Aid Advising', description: 'Scholarships, aid packages, and payment plan guidance.', duration: 15, priority: 'high', open: true },
];

const DUMMY_WAITING = {
  'General Academic Advising': [
    { studentName: 'Maya Chen', priority: 'medium' },
    { studentName: 'Liam Okafor', priority: 'high' },
    { studentName: 'Sofia Rossi', priority: 'low' },
  ],
  'Registration & Enrollment': [
    { studentName: 'Noah Kim', priority: 'high' },
    { studentName: 'Ava Nguyen', priority: 'medium' },
  ],
  'Career & Internship Advising': [
    { studentName: 'Ethan Brooks', priority: 'low' },
  ],
  'Financial Aid Advising': [
    { studentName: 'Diego Martinez', priority: 'high' },
    { studentName: 'Grace Lin', priority: 'medium' },
  ],
};

const DUMMY_HISTORY = [
  { studentName: 'Priya Patel', service: 'General Academic Advising', priority: 'medium', status: 'served', daysAgo: 1, waitedMinutes: 14 },
  { studentName: 'Jordan Ellis', service: 'General Academic Advising', priority: 'high', status: 'served', daysAgo: 1, waitedMinutes: 6 },
  { studentName: 'Hannah Wu', service: 'General Academic Advising', priority: 'low', status: 'left', daysAgo: 2, waitedMinutes: 25 },
  { studentName: 'Marcus Bell', service: 'Registration & Enrollment', priority: 'high', status: 'served', daysAgo: 2, waitedMinutes: 9 },
  { studentName: 'Isabella Torres', service: 'Registration & Enrollment', priority: 'medium', status: 'served', daysAgo: 3, waitedMinutes: 11 },
  { studentName: 'Owen Fischer', service: 'Registration & Enrollment', priority: 'low', status: 'canceled', daysAgo: 3, waitedMinutes: 4 },
  { studentName: 'Zara Ahmed', service: 'Career & Internship Advising', priority: 'medium', status: 'served', daysAgo: 4, waitedMinutes: 22 },
  { studentName: 'Caleb Johnson', service: 'Career & Internship Advising', priority: 'low', status: 'served', daysAgo: 5, waitedMinutes: 30 },
  { studentName: 'Ruby Sanchez', service: 'Career & Internship Advising', priority: 'high', status: 'left', daysAgo: 5, waitedMinutes: 18 },
  { studentName: 'Ken Osei', service: 'Financial Aid Advising', priority: 'high', status: 'served', daysAgo: 6, waitedMinutes: 13 },
  { studentName: 'Mei Lin', service: 'Financial Aid Advising', priority: 'medium', status: 'served', daysAgo: 7, waitedMinutes: 19 },
  { studentName: 'Dylan Ford', service: 'Financial Aid Advising', priority: 'low', status: 'canceled', daysAgo: 8, waitedMinutes: 5 },
  { studentName: 'Aaliyah Brooks', service: 'General Academic Advising', priority: 'medium', status: 'served', daysAgo: 9, waitedMinutes: 17 },
  { studentName: 'Tomás Rivera', service: 'Registration & Enrollment', priority: 'high', status: 'served', daysAgo: 10, waitedMinutes: 8 },
  { studentName: 'Chloe Baker', service: 'Career & Internship Advising', priority: 'medium', status: 'left', daysAgo: 12, waitedMinutes: 27 },
];

async function seedServices() {
  const existing = await getAllServices();
  const existingNames = new Set(existing.map((s) => s.name));

  for (const svc of DUMMY_SERVICES) {
    if (existingNames.has(svc.name)) continue;
    const row = await insertService(svc.name, svc.description, svc.duration, svc.priority, svc.open);
    console.log(`  + created service "${row.name}"`);
  }

  return getAllServices();
}

async function seedWaitingStudents(services) {
  const byName = new Map(services.map((s) => [s.name, s]));

  for (const [serviceName, students] of Object.entries(DUMMY_WAITING)) {
    const service = byName.get(serviceName);
    if (!service) continue;

    const queue = await getOrCreateQueue(service.id);
    const alreadyWaiting = await getQueueEntries(queue.id);
    if (alreadyWaiting.length > 0) {
      console.log(`  = "${serviceName}" already has students waiting, skipping`);
      continue;
    }

    for (const student of students) {
      await addQueueEntry(queue.id, null, student.studentName, student.priority);
    }
    console.log(`  + added ${students.length} waiting student(s) to "${serviceName}"`);
  }
}

async function seedHistory(services) {
  const byName = new Map(services.map((s) => [s.name, s]));
  let added = 0;
  let skipped = 0;

  for (const entry of DUMMY_HISTORY) {
    const service = byName.get(entry.service);
    if (!service) continue;

    const endedAt = new Date(Date.now() - entry.daysAgo * 24 * 60 * 60 * 1000);
    const joinedAt = new Date(endedAt.getTime() - entry.waitedMinutes * 60 * 1000);

    try {
      await insertHistoryEntry({
        studentName: entry.studentName,
        serviceId: service.id,
        serviceName: service.name,
        priority: entry.priority,
        status: entry.status,
        joinedAt,
        endedAt,
        waitedMinutes: entry.waitedMinutes,
      });
      added += 1;
    } catch (err) {
      if (err.code === 'DUPLICATE_HISTORY_ENTRY') {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }
  console.log(`  + added ${added} history entr${added === 1 ? 'y' : 'ies'}${skipped ? ` (${skipped} already existed, skipped)` : ''}`);
}

async function seedNotifications(services) {
  const service = services[0];
  if (!service) return;

  await insertNotification({
    studentName: 'Jesiah Agudelo',
    serviceId: service.id,
    serviceName: service.name,
    type: 'joined',
    message: `You joined the ${service.name} queue.`,
  });

  await insertNotification({
    studentName: 'Jesiah Agudelo',
    serviceId: service.id,
    serviceName: service.name,
    type: 'near_turn',
    message: `You are next in line for ${service.name}.`,
  });

  console.log('  + added sample notifications');
}

async function run() {
  console.log('Seeding services...');
  const services = await seedServices();

  console.log('Seeding students currently waiting in queues...');
  await seedWaitingStudents(services);

  console.log('Seeding past queue history (powers the Users/Services/Stats reports)...');
  await seedHistory(services);

  console.log('Seeding sample notifications...');
  await seedNotifications(services);

  await pool.end();
  console.log('Seed complete');
}

run().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});