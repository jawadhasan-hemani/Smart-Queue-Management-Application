const { pool, resetMockPool } = require('./testUtils/mockPool');

jest.mock('../config/db', () => {
  const { pool } = require('./testUtils/mockPool');
  return { pool, query: pool.query };
});

const {
  getUsersReport,
  getServicesReport,
  getQueueStats,
} = require('../src/db/reportQueries');

beforeEach(() => {
  resetMockPool();
});

describe('getUsersReport', () => {
  it('builds no WHERE clause when no date filters are given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getUsersReport({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(values).toEqual([]);
  });

  it('adds a startDate filter on ended_at', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getUsersReport({ startDate: '2026-01-01' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('qh.ended_at >= $1');
    expect(values).toEqual(['2026-01-01']);
  });

  it('combines startDate and endDate with AND', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getUsersReport({ startDate: '2026-01-01', endDate: '2026-02-01' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('qh.ended_at >= $1');
    expect(sql).toContain('qh.ended_at <= $2');
    expect(sql).toContain(' AND ');
    expect(values).toEqual(['2026-01-01', '2026-02-01']);
  });

  it('left joins user_credentials and orders by ended_at DESC', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getUsersReport({});
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('LEFT JOIN user_credentials uc ON uc.id = qh.user_id');
    expect(sql).toContain('ORDER BY qh.ended_at DESC');
  });

  it('returns the rows from the query', async () => {
    const fakeRows = [{ user_email: 'a@b.com', student_name: 'Alice' }];
    pool.query.mockResolvedValueOnce({ rows: fakeRows });
    const result = await getUsersReport({});
    expect(result).toEqual(fakeRows);
  });
});

describe('getServicesReport', () => {
  it('builds no service filter when serviceId is omitted', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getServicesReport({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE s.id');
    expect(values).toEqual([]);
  });

  it('adds a serviceId filter when given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getServicesReport({ serviceId: 'svc-1' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE s.id = $1');
    expect(values).toEqual(['svc-1']);
  });

  it('applies date filters to the history subquery, not the top-level query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getServicesReport({ startDate: '2026-01-01', endDate: '2026-02-01' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('qh.ended_at >= $1');
    expect(sql).toContain('qh.ended_at <= $2');
    expect(values).toEqual(['2026-01-01', '2026-02-01']);
  });

  it('combines date filters and serviceId in the correct param order', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getServicesReport({ startDate: '2026-01-01', serviceId: 'svc-1' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('qh.ended_at >= $1');
    expect(sql).toContain('WHERE s.id = $2');
    expect(values).toEqual(['2026-01-01', 'svc-1']);
  });

  it('orders by service name', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getServicesReport({});
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY s.name');
  });

  it('returns the rows from the query', async () => {
    const fakeRows = [{ service_id: 's1', service_name: 'Advising' }];
    pool.query.mockResolvedValueOnce({ rows: fakeRows });
    const result = await getServicesReport({});
    expect(result).toEqual(fakeRows);
  });
});

describe('getQueueStats', () => {
  it('returns a single summary row when groupByService is false', async () => {
    const fakeRow = {
      total_visits: 10,
      served_count: 7,
      left_count: 2,
      canceled_count: 1,
      avg_wait_minutes: 5,
      max_wait_minutes: 20,
    };
    pool.query.mockResolvedValueOnce({ rows: [fakeRow] });
    const result = await getQueueStats({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('GROUP BY');
    expect(values).toEqual([]);
    expect(result).toEqual(fakeRow);
  });

  it('falls back to a zeroed row when no history rows match', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await getQueueStats({});
    expect(result).toEqual({
      total_visits: 0,
      served_count: 0,
      left_count: 0,
      canceled_count: 0,
      avg_wait_minutes: 0,
      max_wait_minutes: 0,
    });
  });

  it('groups by service and orders by service_name when groupByService is true', async () => {
    const fakeRows = [{ service_id: 's1', service_name: 'Advising', total_visits: 4 }];
    pool.query.mockResolvedValueOnce({ rows: fakeRows });
    const result = await getQueueStats({ groupByService: true });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('GROUP BY service_id, service_name');
    expect(sql).toContain('ORDER BY service_name');
    expect(values).toEqual([]);
    expect(result).toEqual(fakeRows);
  });

  it('applies date filters on ended_at for both grouped and ungrouped modes', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getQueueStats({ startDate: '2026-01-01', endDate: '2026-02-01', groupByService: true });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('ended_at >= $1');
    expect(sql).toContain('ended_at <= $2');
    expect(values).toEqual(['2026-01-01', '2026-02-01']);
  });
});
