jest.mock('../config/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const request = require('supertest');

const { createFakeDb } = require('./testUtils/fakeDb');
const mockDb = createFakeDb();
jest.mock('../src/data/db', () => ({ pool: mockDb }));

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');

beforeEach(() => {
  resetStore();
  mockDb.reset();
});

describe('GET /api/notifications', () => {
  it('returns an empty list when no notifications exist', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([]);
  });

  it('creates a "joined" notification when a student joins the queue', async () => {
    const service = services[0];
    await request(app).post(`/api/queue/${service.id}/join`).send({ studentName: 'Test Student' });

    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThan(0);
    expect(res.body.notifications.some((n) => n.type === 'joined')).toBe(true);
  });

  it('filters notifications by studentName', async () => {
    const service = services[0];
    await request(app).post(`/api/queue/${service.id}/join`).send({ studentName: 'Alice' });
    await request(app).post(`/api/queue/${service.id}/join`).send({ studentName: 'Bob' });

    const res = await request(app).get('/api/notifications').query({ studentName: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThan(0);
    expect(res.body.notifications.every((n) => n.studentName === 'Alice')).toBe(true);
  });

  it('filters notifications by search text matching the message', async () => {
    const service = services[0];
    await request(app).post('/api/notifications').send({
      studentName: 'Alice',
      serviceId: service.id,
      type: 'custom',
      message: 'Please bring your ID card',
    });
    await request(app).post('/api/notifications').send({
      studentName: 'Bob',
      serviceId: service.id,
      type: 'custom',
      message: 'Unrelated note',
    });

    const res = await request(app).get('/api/notifications').query({ search: 'ID card' });
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].studentName).toBe('Alice');
  });

  it('filters notifications by type', async () => {
    const service = services[0];
    await request(app).post(`/api/queue/${service.id}/join`).send({ studentName: 'Alice' });

    const res = await request(app).get('/api/notifications').query({ type: 'joined' });
    expect(res.status).toBe(200);
    expect(res.body.notifications.every((n) => n.type === 'joined')).toBe(true);
  });

  it('rejects an invalid type filter', async () => {
    const res = await request(app).get('/api/notifications').query({ type: 'not-a-type' });
    expect(res.status).toBe(400);
    expect(res.body.errors.type).toBeDefined();
  });

  it('rejects a blank studentName filter', async () => {
    const res = await request(app).get('/api/notifications').query({ studentName: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/notifications/:id', () => {
  it('returns a single notification', async () => {
    const service = services[0];
    await request(app).post(`/api/queue/${service.id}/join`).send({ studentName: 'Test' });
    const list = await request(app).get('/api/notifications');
    const id = list.body.notifications[0].id;

    const res = await request(app).get(`/api/notifications/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.notification.id).toBe(id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/notifications/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/notifications', () => {
  const validPayload = () => ({
    studentName: 'Manual Student',
    serviceId: services[0].id,
    type: 'custom',
    message: 'A manual admin notification.',
  });

  it('creates a custom notification with valid input', async () => {
    const res = await request(app).post('/api/notifications').send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.notification.type).toBe('custom');
    expect(res.body.notification.read).toBe(false);
  });

  it('rejects a missing studentName', async () => {
    const { studentName, ...rest } = validPayload();
    const res = await request(app).post('/api/notifications').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.studentName).toBeDefined();
  });

  it('rejects a studentName over 100 characters', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ ...validPayload(), studentName: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.errors.studentName).toBeDefined();
  });

  it('rejects an unknown serviceId', async () => {
    const res = await request(app).post('/api/notifications').send({ ...validPayload(), serviceId: 'nope' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid type', async () => {
    const res = await request(app).post('/api/notifications').send({ ...validPayload(), type: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.errors.type).toBeDefined();
  });

  it('rejects a missing message', async () => {
    const { message, ...rest } = validPayload();
    const res = await request(app).post('/api/notifications').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.message).toBeDefined();
  });

  it('rejects a message over 300 characters', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ ...validPayload(), message: 'a'.repeat(301) });
    expect(res.status).toBe(400);
    expect(res.body.errors.message).toBeDefined();
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const created = await request(app).post('/api/notifications').send({
      studentName: 'Reader',
      serviceId: services[0].id,
      type: 'custom',
      message: 'Read me',
    });
    const id = created.body.notification.id;

    const res = await request(app).patch(`/api/notifications/${id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.notification.read).toBe(true);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/api/notifications/does-not-exist/read');
    expect(res.status).toBe(404);
  });
});

describe('near-turn re-check when the queue shifts (leave/serve)', () => {
  // Regression test: notifyIfNearTurn used to only fire at join time, so
  // students who moved into the threshold later (because someone ahead of
  // them left or was served) never got pinged. queue.js now re-checks the
  // whole remaining queue after every leave/serve.
  it('notifies students who move into near-turn range after the front of the queue is served', async () => {
    // svc-general seed: Liam (high, pos1), Maya (medium, pos2), Sofia (low, pos3).
    // Serving Liam should shift Maya to pos1 and Sofia to pos2 — both now <= threshold.
    const serveRes = await request(app).post('/api/queue/svc-general/serve');
    expect(serveRes.status).toBe(200);

    const notifRes = await request(app).get('/api/notifications?type=near_turn');
    expect(notifRes.status).toBe(200);
    const names = notifRes.body.notifications.map((n) => n.studentName);
    expect(names).toContain('Maya Chen');
    expect(names).toContain('Sofia Rossi');
  });

  it('notifies the remaining student who moves into range after someone leaves', async () => {
    // svc-career seed has one student (Ethan Brooks). Add two more low-priority
    // joiners so "New Student" lands at position 3 — outside the threshold.
    await request(app).post('/api/queue/svc-career/join').send({
      studentName: 'Buffer Student',
      priority: 'low',
    });
    const joinRes = await request(app).post('/api/queue/svc-career/join').send({
      studentName: 'New Student',
      priority: 'low',
    });
    expect(joinRes.body.entry.position).toBe(3);

    let notifRes = await request(app).get('/api/notifications?studentName=New Student&type=near_turn');
    expect(notifRes.body.notifications).toHaveLength(0);

    // Ethan leaves -> Buffer moves to pos1, New Student moves to pos2, within threshold.
    const ethan = (await request(app).get('/api/queue/svc-career')).body.queue.find(
      (e) => e.studentName === 'Ethan Brooks',
    );
    await request(app).delete(`/api/queue/svc-career/leave/${ethan.id}`);

    notifRes = await request(app).get('/api/notifications?studentName=New Student&type=near_turn');
    expect(notifRes.body.notifications).toHaveLength(1);
  });
});
