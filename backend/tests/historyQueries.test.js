const { pool, resetMockPool } = require('./testUtils/mockPool');

jest.mock('../config/db', () => { const { pool } = require('./testUtils/mockPool'); return { pool, query: pool.query }; });

const {
  insertHistoryEntry,
  listHistory,
  getHistoryById,
  getAverageWaitMinutes,
} = require('../src/db/historyQueries');

beforeEach(() => {
  resetMockPool();
});

describe('insertHistoryEntry', () => {
  it('sends the nine expected columns in order', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{}] });
    const joinedAt = new Date();
    const endedAt = new Date();

    await insertHistoryEntry({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      priority: 'medium',
      status: 'served',
      joinedAt,
      endedAt,
      waitedMinutes: 5,
    });

    const [, values] = pool.query.mock.calls[0];
    expect(values).toEqual([null, 'Alice', 's1', 'Svc', 'medium', 'served', joinedAt, endedAt, 5]);
  });
});

describe('listHistory', () => {
  it('builds no WHERE clause when no filters are given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listHistory({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(values).toEqual([]);
  });

  it('combines studentName and search with AND', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listHistory({ studentName: 'Alice', search: 'Advising' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('LOWER(student_name) = LOWER($1)');
    expect(sql).toContain('service_name ILIKE $2');
    expect(sql).toContain(' AND ');
    expect(values).toEqual(['Alice', '%Advising%']);
  });

  it('maps sortBy=date-asc to ended_at ASC', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listHistory({ sortBy: 'date-asc' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY ended_at ASC');
  });

  it('maps sortBy=wait-desc to waited_minutes DESC', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listHistory({ sortBy: 'wait-desc' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY waited_minutes DESC');
  });

  it('defaults to ended_at DESC for an unrecognized sortBy', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listHistory({ sortBy: 'nonsense' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY ended_at DESC');
  });
});

describe('getHistoryById', () => {
  it('returns null when no row matches', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await getHistoryById('missing');
    expect(result).toBeNull();
  });
});

describe('getAverageWaitMinutes', () => {
  it('queries without a studentName filter when none is given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ avg_wait: 7 }] });
    const avg = await getAverageWaitMinutes({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('student_name');
    expect(values).toEqual([]);
    expect(avg).toBe(7);
  });

  it('adds a studentName filter when given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ avg_wait: 12 }] });
    const avg = await getAverageWaitMinutes({ studentName: 'Alice' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('LOWER(student_name) = LOWER($1)');
    expect(values).toEqual(['Alice']);
    expect(avg).toBe(12);
  });

  it('adds a serviceId filter when given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ avg_wait: 9 }] });
    const avg = await getAverageWaitMinutes({ serviceId: 's1' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('service_id = $1');
    expect(values).toEqual(['s1']);
    expect(avg).toBe(9);
  });

  it('combines studentName and serviceId filters with AND', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ avg_wait: 15 }] });
    const avg = await getAverageWaitMinutes({ studentName: 'Alice', serviceId: 's1' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('LOWER(student_name) = LOWER($1)');
    expect(sql).toContain('service_id = $2');
    expect(sql).toContain(' AND ');
    expect(values).toEqual(['Alice', 's1']);
    expect(avg).toBe(15);
  });
});
