jest.mock('../config/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const request = require('supertest');

const db = require('../config/db');
const app = require('../src/app');

let services;
let queues;
let queueEntries;
let idCounter;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function priorityRank(p) {
  return { high: 0, medium: 1, low: 2 }[p] ?? 3;
}

function resetFakeDb() {
  idCounter = 0;
  services = [
    { id: 'svc-general', name: 'General Advising', description: 'd', duration: 12, priority: 'medium', open: true },
    { id: 'svc-financial', name: 'Financial Aid', description: 'd', duration: 15, priority: 'high', open: false },
  ];
  queues = [];
  queueEntries = [];
}

function fakeQuery(text) {
  const params = arguments[1] || [];
  const sql = text.replace(/\s+/g, ' ').trim();

  if (sql.startsWith('SELECT * FROM services WHERE id')) {
    const [id] = params;
    const row = services.find((s) => s.id === id);
    return Promise.resolve({ rows: row ? [row] : [] });
  }

  if (sql.startsWith("SELECT * FROM queues WHERE service_id")) {
    const [serviceId] = params;
    const row = queues.find((q) => q.service_id === serviceId && q.status === 'open');
    return Promise.resolve({ rows: row ? [row] : [] });
  }

  if (sql.startsWith('INSERT INTO queues')) {
    const [serviceId] = params;
    const row = { id: nextId('queue'), service_id: serviceId, status: 'open' };
    queues.push(row);
    return Promise.resolve({ rows: [row] });
  }

  if (sql.startsWith('SELECT *, ROW_NUMBER()')) {
    const [queueId] = params;
    const rows = queueEntries
      .filter((e) => e.queue_id === queueId && e.status === 'waiting')
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at)
      .map((e, idx) => ({ ...e, position: idx + 1 }));
    return Promise.resolve({ rows });
  }

  if (sql.startsWith('INSERT INTO queue_entries')) {
    const [queueId, userId, studentName, priority] = params;
    idCounter += 1;
    const row = {
      id: nextId('entry'),
      queue_id: queueId,
      user_id: userId,
      student_name: studentName,
      priority,
      position: 0,
      status: 'waiting',
      joined_at: idCounter,
      served_at: null,
    };
    queueEntries.push(row);
    return Promise.resolve({ rows: [row] });
  }

  if (sql.startsWith('DELETE FROM queue_entries WHERE id')) {
    const [id] = params;
    const idx = queueEntries.findIndex((e) => e.id === id);
    if (idx === -1) return Promise.resolve({ rows: [] });
    const [removed] = queueEntries.splice(idx, 1);
    return Promise.resolve({ rows: [removed] });
  }

  if (sql.startsWith('SELECT * FROM queue_entries') && sql.includes('LIMIT 1')) {
    const [queueId] = params;
    const rows = queueEntries
      .filter((e) => e.queue_id === queueId && e.status === 'waiting')
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at);
    return Promise.resolve({ rows: rows.length ? [rows[0]] : [] });
  }

  if (sql.startsWith('UPDATE queue_entries') && sql.includes("SET status = 'served'")) {
    const [id] = params;
    const entry = queueEntries.find((e) => e.id === id);
    if (entry) {
      entry.status = 'served';
      entry.served_at = Date.now();
    }
    return Promise.resolve({ rows: entry ? [entry] : [] });
  }

  if (sql.startsWith('UPDATE queue_entries e')) {
    const [queueId] = params;
    const waiting = queueEntries
      .filter((e) => e.queue_id === queueId && e.status === 'waiting')
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.joined_at - b.joined_at);
    waiting.forEach((e, idx) => {
      e.position = idx + 1;
    });
    return Promise.resolve({ rows: [] });
  }

  if (sql.startsWith('SELECT s.id AS service_id')) {
    const rows = services.map((s) => {
      const q = queues.find((qq) => qq.service_id === s.id && qq.status === 'open');
      const count = q ? queueEntries.filter((e) => e.queue_id === q.id && e.status === 'waiting').length : 0;
      return { service_id: s.id, service_name: s.name, open: s.open, count };
    });
    return Promise.resolve({ rows });
  }

  throw new Error(`Unhandled fake SQL in test: ${sql}`);
}

beforeEach(() => {
  resetFakeDb();
  db.query.mockReset();
  db.query.mockImplementation(fakeQuery);
});

describe('GET /api/queue', () => {
  it('returns a queue-length summary for every service', async () => {
    const res = await request(app).get('/api/queue');
    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveLength(2);
    expect(res.body.summary.find((s) => s.serviceId === 'svc-general').count).toBe(0);
  });
});

describe('GET /api/queue/:serviceId', () => {
  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).get('/api/queue/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns an empty queue for a service nobody has joined yet', async () => {
    const res = await request(app).get('/api/queue/svc-general');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.queue).toEqual([]);
  });

  it('orders the queue by priority then arrival time, with computed wait time', async () => {
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Maya', priority: 'medium' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Liam', priority: 'high' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Sofia', priority: 'low' });

    const res = await request(app).get('/api/queue/svc-general');
    expect(res.status).toBe(200);
    expect(res.body.queue.map((e) => e.student_name)).toEqual(['Liam', 'Maya', 'Sofia']);
    expect(res.body.queue[0].position).toBe(1);
    expect(res.body.queue[0].estimatedWaitMinutes).toBe(0);
    expect(res.body.queue[1].estimatedWaitMinutes).toBe(12); 
    expect(res.body.queue[2].estimatedWaitMinutes).toBe(24);
  });
});

describe('POST /api/queue/:serviceId/join', () => {
  it('creates a queue entry for an open service', async () => {
    const res = await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Maya' });
    expect(res.status).toBe(201);
    expect(res.body.entry.student_name).toBe('Maya');
    expect(res.body.entry.priority).toBe('medium');
  });

  it('rejects a missing student name', async () => {
    const res = await request(app).post('/api/queue/svc-general/join').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.studentName).toBeDefined();
  });

  it('rejects an invalid priority', async () => {
    const res = await request(app)
      .post('/api/queue/svc-general/join')
      .send({ studentName: 'Maya', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.errors.priority).toBeDefined();
  });

  it('rejects joining a closed service with 400', async () => {
    const res = await request(app).post('/api/queue/svc-financial/join').send({ studentName: 'Maya' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).post('/api/queue/does-not-exist/join').send({ studentName: 'Maya' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/queue/:serviceId/leave/:entryId', () => {
  it('removes an entry and recalculates positions for those left behind', async () => {
    const first = await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Maya', priority: 'medium' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Liam', priority: 'medium' });

    const removeRes = await request(app).delete(`/api/queue/svc-general/leave/${first.body.entry.id}`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.removed.student_name).toBe('Maya');

    const queueRes = await request(app).get('/api/queue/svc-general');
    expect(queueRes.body.queue).toHaveLength(1);
    expect(queueRes.body.queue[0].student_name).toBe('Liam');
    expect(queueRes.body.queue[0].position).toBe(1);
  });

  it('returns 404 for an unknown entry id', async () => {
    const res = await request(app).delete('/api/queue/svc-general/leave/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/queue/:serviceId/serve', () => {
  it('serves the highest-priority user first and removes them from the queue', async () => {
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Maya', priority: 'medium' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Liam', priority: 'high' });

    const res = await request(app).post('/api/queue/svc-general/serve');
    expect(res.status).toBe(200);
    expect(res.body.served.student_name).toBe('Liam');

    const queueRes = await request(app).get('/api/queue/svc-general');
    expect(queueRes.body.queue).toHaveLength(1);
    expect(queueRes.body.queue[0].student_name).toBe('Maya');
  });

  it('serves users in order across repeated calls', async () => {
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Maya', priority: 'low' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Liam', priority: 'high' });
    await request(app).post('/api/queue/svc-general/join').send({ studentName: 'Sofia', priority: 'medium' });

    const first = await request(app).post('/api/queue/svc-general/serve');
    const second = await request(app).post('/api/queue/svc-general/serve');
    const third = await request(app).post('/api/queue/svc-general/serve');

    expect(first.body.served.student_name).toBe('Liam');
    expect(second.body.served.student_name).toBe('Sofia');
    expect(third.body.served.student_name).toBe('Maya');
  });

  it('returns 404 when the queue is empty', async () => {
    const res = await request(app).post('/api/queue/svc-general/serve');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/empty/i);
  });

  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).post('/api/queue/does-not-exist/serve');
    expect(res.status).toBe(404);
  });
});