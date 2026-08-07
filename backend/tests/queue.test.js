jest.mock('../middleware/authMiddleware', () => ({
  verifyFirebaseToken: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

jest.mock('../config/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const request = require('supertest');

const { createFakeDb } = require('./testUtils/fakeDb');
const mockDb = createFakeDb();
jest.mock('../config/db', () => ({ pool: mockDb, query: mockDb.query }));

const db = require('../config/db');
const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');

beforeEach(() => {
  resetStore();
  mockDb.reset();
  
  mockDb.query('INSERT INTO services (name, description, duration, priority, open) VALUES ($1, $2, $3, $4, $5)', [
    'General Advising', 'd', 12, 'medium', true,
  ]).then(res => {
    res.rows[0].id = 'svc-general';
  });

  mockDb.query('INSERT INTO services (name, description, duration, priority, open) VALUES ($1, $2, $3, $4, $5)', [
    'Financial Aid', 'd', 15, 'high', false,
  ]).then(res => {
    res.rows[0].id = 'svc-financial';
  });
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