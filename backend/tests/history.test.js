const request = require('supertest');

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');
const { recordHistory } = require('../src/services/historyService');

beforeEach(() => {
  resetStore();
});

describe('GET /api/history', () => {
  it('returns an empty list when nothing has happened yet', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
  });

  it('reflects entries recorded through the service layer, most recent first', async () => {
    recordHistory({
      studentName: 'Older',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 10_000,
      status: 'served',
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    recordHistory({
      studentName: 'Newer',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 5_000,
      status: 'left',
    });

    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(2);
    expect(res.body.history[0].studentName).toBe('Newer');
  });

  it('filters by studentName', async () => {
    recordHistory({
      studentName: 'Alice',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });
    recordHistory({
      studentName: 'Bob',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });

    const res = await request(app).get('/api/history').query({ studentName: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(res.body.history[0].studentName).toBe('Alice');
  });

  it('rejects a blank studentName filter', async () => {
    const res = await request(app).get('/api/history').query({ studentName: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects a studentName filter over 100 characters', async () => {
    const res = await request(app).get('/api/history').query({ studentName: 'a'.repeat(101) });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/history/:id', () => {
  it('returns a single history entry', async () => {
    const entry = recordHistory({
      studentName: 'Solo',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });

    const res = await request(app).get(`/api/history/${entry.id}`);
    expect(res.status).toBe(200);
    expect(res.body.entry.id).toBe(entry.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/history/does-not-exist');
    expect(res.status).toBe(404);
  });
});
