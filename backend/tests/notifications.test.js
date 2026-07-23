const request = require('supertest');

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');

beforeEach(() => {
  resetStore();
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
