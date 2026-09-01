require('dotenv').config();
const { query } = require('../config/db');
const queueQueries = require('../src/db/queueQueries');
const serviceQueries = require('../src/db/serviceQueries');

const REALISTIC_SERVICES = [
  { name: 'General Academic Advising', description: 'Course planning, degree requirements, and general questions.', duration: 15, priority: 'medium' },
  { name: 'Registration & Enrollment', description: 'Add/drop help, holds, waitlists, and enrollment issues.', duration: 10, priority: 'high' },
  { name: 'Financial Aid Advising', description: 'Scholarships, aid packages, and payment plan guidance.', duration: 20, priority: 'high' },
  { name: 'Career & Internship Advising', description: 'Resume review, internship search, and career pathways.', duration: 30, priority: 'low' },
  { name: 'Housing & Residential Life', description: 'Dorm assignments, maintenance issues, and room changes.', duration: 15, priority: 'medium' },
  { name: 'International Student Services', description: 'Visa questions, travel signatures, and OPT/CPT help.', duration: 25, priority: 'medium' },
  { name: 'Student Health Center', description: 'Immunizations, general checkups, and health services.', duration: 20, priority: 'high' },
  { name: 'IT Help Desk', description: 'Password resets, Wi-Fi issues, and device troubleshooting.', duration: 10, priority: 'medium' },
  { name: 'Veterans Services', description: 'GI Bill benefits, certification, and military support.', duration: 30, priority: 'medium' },
  { name: 'Disability Support Services', description: 'Accommodations, accessibility, and student support.', duration: 45, priority: 'high' },
];

const STUDENT_FIRST_NAMES = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'James', 'Ava', 'William', 'Sophia', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Evelyn', 'Theodore', 'Harper', 'Jawad', 'Jesiah', 'Sam', 'Alex', 'Taylor'];
const STUDENT_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

function getRandomName() {
  const first = STUDENT_FIRST_NAMES[Math.floor(Math.random() * STUDENT_FIRST_NAMES.length)];
  const last = STUDENT_LAST_NAMES[Math.floor(Math.random() * STUDENT_LAST_NAMES.length)];
  return `${first} ${last}`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('Clearing database...');
  await query('TRUNCATE services CASCADE');
  await query('TRUNCATE queues CASCADE');
  await query('TRUNCATE queue_entries CASCADE');
  await query('TRUNCATE queue_history CASCADE');
  await query('TRUNCATE notifications CASCADE');

  console.log('Seeding 10 realistic services...');
  
  for (const svc of REALISTIC_SERVICES) {
    const service = await serviceQueries.insertService(svc.name, svc.description, svc.duration, svc.priority, true);
    const queue = await queueQueries.getOrCreateQueue(service.id);
    
    const numStudents = getRandomInt(5, 15);
    console.log(`Seeding ${numStudents} students for ${service.name}...`);
    
    for (let i = 0; i < numStudents; i++) {
      const studentName = getRandomName();
      // Add entry with artificial joined_at spacing so they aren't all at the exact same millisecond
      const entry = await queueQueries.addQueueEntry(queue.id, null, studentName, svc.priority);
      // Manually stagger the joined_at times in the DB so sorting is stable
      const staggeredTime = new Date(Date.now() - (numStudents - i) * 60000);
      await query('UPDATE queue_entries SET joined_at = $1 WHERE id = $2', [staggeredTime, entry.id]);
    }
    
    // Re-evaluate positions after all time staggers
    await queueQueries.updateEntryPositions(queue.id);
  }
  
  console.log('Seed complete! Database has 10 services with 5 to 15 students each.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
