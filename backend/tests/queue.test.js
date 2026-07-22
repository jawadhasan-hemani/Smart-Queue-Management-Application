const request = require('supertest');

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');

beforeEach(() => {
  resetStore();
});

describe('GET /api/queue', () => {
  it('returns a queue-length summary for every service', async () => {
    const res = await request(app).get('/api/queue');
    expect(res.status).toBe(200);
    expect(res.body.summary.length).toBe(4);
    const general = res.body.summary.find((s) => s.serviceId === 'svc-general');
    expect(general.count).toBe(3);
  });
});

describe('GET /api/queue/:serviceId', () => {
  it('returns the queue ordered by priority then join time', async () => {
    const res = await request(app).get('/api/queue/svc-general');
    expect(res.status).toBe(200);
    expect(res.body.serviceId).toBe('svc-general');
    expect(res.body.count).toBe(3);
    expect(res.body.queue[0].studentName).toBe('Liam Okafor');
    expect(res.body.queue[0].position).toBe(1);
    expect(res.body.queue[1].studentName).toBe('Maya Chen');
    expect(res.body.queue[2].studentName).toBe('Sofia Rossi');
  });

  it('includes an estimated wait time based on the service duration', async () => {
    const res = await request(app).get('/api/queue/svc-general');
    expect(res.body.queue[0].estimatedWaitMinutes).toBe(0);
    expect(res.body.queue[1].estimatedWaitMinutes).toBe(12);
    expect(res.body.queue[2].estimatedWaitMinutes).toBe(24);
  });

  it('returns an empty queue for a service with no one waiting', async () => {
    const res = await request(app).get('/api/queue/svc-financial');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.queue).toEqual([]);
  });

  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).get('/api/queue/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/queue/:serviceId/serve', () => {
  it('serves the highest-priority user first and removes them from the queue', async () => {
    const res = await request(app).post('/api/queue/svc-general/serve');
    expect(res.status).toBe(200);
    expect(res.body.served.studentName).toBe('Liam Okafor');
    expect(res.body.queue.find((e) => e.studentName === 'Liam Okafor')).toBeUndefined();
    expect(res.body.queue.length).toBe(2);
  });

  it('recomputes positions after serving', async () => {
    await request(app).post('/api/queue/svc-general/serve');
    const res = await request(app).get('/api/queue/svc-general');
    expect(res.body.queue[0].studentName).toBe('Maya Chen');
    expect(res.body.queue[0].position).toBe(1);
  });

  it('serves users in order across repeated calls', async () => {
    const first = await request(app).post('/api/queue/svc-general/serve');
    const second = await request(app).post('/api/queue/svc-general/serve');
    const third = await request(app).post('/api/queue/svc-general/serve');
    expect(first.body.served.studentName).toBe('Liam Okafor');
    expect(second.body.served.studentName).toBe('Maya Chen');
    expect(third.body.served.studentName).toBe('Sofia Rossi');
  });

  it('returns 404 when the queue is already empty', async () => {
    const res = await request(app).post('/api/queue/svc-financial/serve');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/empty/i);
  });

  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).post('/api/queue/does-not-exist/serve');
    expect(res.status).toBe(404);
  });

  it('does not affect other services queues', async () => {
    await request(app).post('/api/queue/svc-general/serve');
    const res = await request(app).get('/api/queue/svc-registration');
    expect(res.body.count).toBe(2);
  });
});

describe('seed data sanity check', () => {
  it('has the expected seeded service ids', () => {
    const ids = services.map((s) => s.id).sort();
    expect(ids).toEqual(['svc-career', 'svc-financial', 'svc-general', 'svc-registration']);
  });
});