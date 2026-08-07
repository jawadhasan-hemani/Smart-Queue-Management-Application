jest.mock('../config/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const request = require('supertest');

const { createFakeDb } = require('./testUtils/fakeDb');
const mockDb = createFakeDb();
jest.mock('../config/db', () => ({ pool: mockDb, query: mockDb.query }));

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');
const { recordHistory } = require('../src/services/historyService');

beforeEach(() => {
  resetStore();
  mockDb.reset();
});

describe('GET /api/history', () => {
  it('returns an empty list when nothing has happened yet', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
  });

  it('reflects entries recorded through the service layer, most recent first', async () => {
    await recordHistory({
      studentName: 'Older',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 10_000,
      status: 'served',
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await recordHistory({
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
    await recordHistory({
      studentName: 'Alice',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });
    await recordHistory({
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

  it('filters by search text matching the service name', async () => {
    await recordHistory({
      studentName: 'Alice',
      serviceId: services[0].id,
      serviceName: 'Academic Advising',
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });
    await recordHistory({
      studentName: 'Bob',
      serviceId: services[0].id,
      serviceName: 'Financial Aid',
      priority: 'medium',
      joinedAt: Date.now(),
      status: 'served',
    });

    const res = await request(app).get('/api/history').query({ search: 'Advising' });
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(res.body.history[0].studentName).toBe('Alice');
  });

  it('sorts by wait time descending when sortBy=wait-desc', async () => {
    await recordHistory({
      studentName: 'ShortWait',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 1_000,
      status: 'served',
    });
    await recordHistory({
      studentName: 'LongWait',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 20 * 60_000,
      status: 'served',
    });

    const res = await request(app).get('/api/history').query({ sortBy: 'wait-desc' });
    expect(res.status).toBe(200);
    expect(res.body.history[0].studentName).toBe('LongWait');
  });

  it('rejects an invalid sortBy value', async () => {
    const res = await request(app).get('/api/history').query({ sortBy: 'not-a-sort' });
    expect(res.status).toBe(400);
    expect(res.body.errors.sortBy).toBeDefined();
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

describe('GET /api/history/summary', () => {
  it('returns zeroed summary when there is no history yet', async () => {
    const res = await request(app).get('/api/history/summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ avgWaitMinutes: 0, totalVisits: 0, served: 0, left: 0 });
  });

  it('aggregates avgWaitMinutes, totalVisits, served, and left', async () => {
    await recordHistory({
      studentName: 'Alice',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 10 * 60_000,
      status: 'served',
    });
    await recordHistory({
      studentName: 'Bob',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 20 * 60_000,
      status: 'left',
    });

    const res = await request(app).get('/api/history/summary');
    expect(res.status).toBe(200);
    expect(res.body.totalVisits).toBe(2);
    expect(res.body.served).toBe(1);
    expect(res.body.left).toBe(1);
    expect(res.body.avgWaitMinutes).toBeGreaterThan(0);
  });

  it('filters by serviceId', async () => {
    await recordHistory({
      studentName: 'Alice',
      serviceId: services[0].id,
      serviceName: services[0].name,
      priority: 'medium',
      joinedAt: Date.now() - 10 * 60_000,
      status: 'served',
    });
    await recordHistory({
      studentName: 'Bob',
      serviceId: services[1].id,
      serviceName: services[1].name,
      priority: 'medium',
      joinedAt: Date.now() - 10 * 60_000,
      status: 'served',
    });

    const res = await request(app).get('/api/history/summary').query({ serviceId: services[0].id });
    expect(res.status).toBe(200);
    expect(res.body.totalVisits).toBe(1);
  });
});

describe('GET /api/history/:id', () => {
  it('returns a single history entry', async () => {
    const entry = await recordHistory({
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
