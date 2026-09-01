require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const FIRST_NAMES = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Charlotte", "Elijah", "Amelia", "James", "Ava", "William", "Sophia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Theodore", "Harper", "Aiden", "Camila", "Jackson", "Gianna", "Sebastian", "Abigail", "Mateo", "Luna", "Jack", "Ella"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const PRIORITIES = ['low', 'medium', 'high'];
const OUTCOMES = ['served', 'left', 'canceled'];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
  return `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`;
}

async function clearTables() {
  console.log('Clearing existing data...');
  await pool.query(`
    TRUNCATE TABLE chat_messages, chat_sessions, notifications, queue_history, queue_entries, queues, services, user_profiles, user_credentials RESTART IDENTITY CASCADE;
  `);
}

async function run() {
  try {
    await clearTables();
    
    console.log('Seeding admin and test users...');
    const hashPassword = await bcrypt.hash('password123', 10);
    
    // 1 & 2. users & user_credentials
    const adminRes = await pool.query(
      `INSERT INTO user_credentials (firebase_uid, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id`,
      ['seed-admin-uid', 'admin@queuesmart.edu', hashPassword]
    );
    const adminId = adminRes.rows[0].id;
    await pool.query(`INSERT INTO user_profiles (user_id, email, full_name) VALUES ($1, $2, 'Admin')`, [adminId, 'admin@queuesmart.edu']);

    const studentIds = [];
    for (let i = 1; i <= 100; i++) {
      const name = generateName();
      const email = `${name.replace(' ', '.').toLowerCase()}${i}@queuesmart.edu`;
      const res = await pool.query(
        `INSERT INTO user_credentials (firebase_uid, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id`,
        [`seed-student-${i}`, email, hashPassword]
      );
      const sId = res.rows[0].id;
      await pool.query(`INSERT INTO user_profiles (user_id, email, full_name) VALUES ($1, $2, $3)`, [sId, email, name]);
      studentIds.push({ id: sId, name, email });
    }

    // 3. services
    console.log('Seeding services...');
    const services = [];
    for (const s of [
      { name: 'Academic Advising', desc: 'Walk-in academic advising for course planning.', duration: 15, p: 'medium', open: true },
      { name: 'Financial Aid', desc: 'Questions on FAFSA, grants, and loan disbursement.', duration: 20, p: 'high', open: true },
      { name: 'Registrar Services', desc: 'Transcripts, enrollment verification, and holds.', duration: 10, p: 'low', open: true },
      { name: 'IT Help Desk', desc: 'Wi-Fi connectivity, password resets, and software installation.', duration: 15, p: 'medium', open: true },
      { name: 'Housing & Residential Life', desc: 'Room assignments, maintenance requests, and move-in questions.', duration: 25, p: 'low', open: true },
      { name: 'Student Health Center', desc: 'Vaccinations, physicals, and general medical inquiries.', duration: 30, p: 'high', open: true },
      { name: 'Career Services', desc: 'Resume reviews, interview prep, and career counseling.', duration: 45, p: 'medium', open: true },
      { name: 'International Student Office', desc: 'Visa questions, OPT/CPT authorizations, and travel signatures.', duration: 20, p: 'high', open: true },
      { name: 'Veterans Affairs', desc: 'GI Bill certification, benefits advising, and support.', duration: 25, p: 'medium', open: true },
      { name: "Bursar's Office", desc: 'Tuition payments, payment plans, and refunds.', duration: 15, p: 'high', open: true }
    ]) {
      const res = await pool.query(
        `INSERT INTO services (name, description, duration, priority, open) VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
        [s.name, s.desc, s.duration, s.p, s.open]
      );
      services.push(res.rows[0]);
    }

    // 4. queues (currently open)
    console.log('Seeding queues...');
    const openQueues = {};
    for (const svc of services) {
      const qRes = await pool.query(
        `INSERT INTO queues (service_id, status) VALUES ($1, 'open') RETURNING id`,
        [svc.id]
      );
      openQueues[svc.id] = qRes.rows[0].id;
    }

    // 5. queue_entries (people currently waiting today)
    console.log('Seeding active queue entries...');
    for (const svc of services) {
      const numWaiting = getRandomInt(2, 6);
      for (let i = 1; i <= numWaiting; i++) {
        const student = getRandomItem(studentIds);
        await pool.query(
          `INSERT INTO queue_entries (queue_id, user_id, student_name, priority, status, position, joined_at)
           VALUES ($1, $2, $3, $4, 'waiting', $5, now() - interval '${getRandomInt(5, 60)} minutes')`,
          [openQueues[svc.id], student.id, student.name, getRandomItem(PRIORITIES), i]
        );
      }
    }

    // 6. queue_history (100+ rows per day from start of month)
    console.log('Seeding queue history (100+ visits per day)...');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    let totalVisits = 0;
    
    for (let day = 1; day <= currentDay; day++) {
      const numVisits = getRandomInt(100, 120);
      for (let i = 0; i < numVisits; i++) {
        const svc = getRandomItem(services);
        const priority = getRandomItem(PRIORITIES);
        const status = getRandomItem(OUTCOMES);
        const waitedMinutes = getRandomInt(2, 45);
        
        // Random hour between 8am and 5pm
        const hour = getRandomInt(8, 17);
        const minute = getRandomInt(0, 59);
        
        const joinedAt = new Date(currentYear, currentMonth, day, hour, minute, 0);
        const endedAt = new Date(joinedAt.getTime() + waitedMinutes * 60000);
        
        // ensure we don't insert future dates if today
        if (endedAt > now) continue;

        // All users are registered now
        const student = getRandomItem(studentIds);
        const userId = student.id;
        const name = student.name;

        try {
          await pool.query(
            `INSERT INTO queue_history (user_id, student_name, service_id, service_name, priority, status, joined_at, ended_at, waited_minutes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [userId, name, svc.id, svc.name, priority, status, joinedAt, endedAt, waitedMinutes]
          );
          totalVisits++;
        } catch (e) {
          if (e.code !== '23505') throw e; // ignore unique constraint violations
        }
      }
    }
    console.log(`Seeded ${totalVisits} queue history entries.`);

    // 7. notifications
    console.log('Seeding notifications...');
    for (let i = 0; i < 20; i++) {
      const student = getRandomItem(studentIds);
      const svc = getRandomItem(services);
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, student_name, service_id, service_name, type, message, created_at)
           VALUES ($1, $2, $3, $4, 'near_turn', $5, now() - interval '${getRandomInt(1, 48)} hours')`,
          [student.id, student.name, svc.id, svc.name, 'You are next in line for ' + svc.name]
        );
      } catch (e) {
        if (e.code !== '23505') throw e; // ignore unique constraint violations
      }
    }

    // 8. chat_sessions
    console.log('Seeding chat sessions...');
    const sessionIds = [];
    for (const student of studentIds) {
      const res = await pool.query(
        `INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES ($1, $2, now(), now()) RETURNING id`,
        [student.id, 'Help with Queue']
      );
      sessionIds.push({ sId: res.rows[0].id, uId: student.id });
    }

    // 9. chat_messages
    console.log('Seeding chat messages...');
    for (const session of sessionIds) {
      await pool.query(
        `INSERT INTO chat_messages (user_id, session_id, role, content, created_at) VALUES ($1, $2, 'user', 'How long is the wait?', now() - interval '2 minutes')`,
        [session.uId, session.sId]
      );
      await pool.query(
        `INSERT INTO chat_messages (user_id, session_id, role, content, created_at) VALUES ($1, $2, 'model', 'The estimated wait time is approximately 15 minutes.', now() - interval '1 minute')`,
        [session.uId, session.sId]
      );
    }

    await pool.end();
    console.log('Seed complete! All 9 tables populated successfully.');
    console.log('Admin login: admin@queuesmart.edu / password123');
  } catch (err) {
    console.error('Seed failed', err);
    process.exit(1);
  }
}

run();