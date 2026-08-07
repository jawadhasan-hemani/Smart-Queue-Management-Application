const { pool, resetMockPool } = require('./testUtils/mockPool');

jest.mock('../config/db', () => { const { pool } = require('./testUtils/mockPool'); return { pool, query: pool.query }; });

const {
  insertNotification,
  listNotifications,
  getNotificationById,
  markNotificationRead,
} = require('../src/db/notificationQueries');

beforeEach(() => {
  resetMockPool();
});

describe('insertNotification', () => {
  it('sends the six expected columns in order', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{}] });

    await insertNotification({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      type: 'custom',
      message: 'hi',
    });

    const [, values] = pool.query.mock.calls[0];
    expect(values).toEqual([null, 'Alice', 's1', 'Svc', 'custom', 'hi']);
  });
});

describe('listNotifications', () => {
  it('builds no WHERE clause when no filters are given', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listNotifications({});
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(values).toEqual([]);
  });

  it('adds a studentName clause only', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listNotifications({ studentName: 'Alice' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('LOWER(student_name) = LOWER($1)');
    expect(values).toEqual(['Alice']);
  });

  it('combines studentName, search, and type with AND', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listNotifications({ studentName: 'Alice', search: 'id', type: 'custom' });
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain('LOWER(student_name) = LOWER($1)');
    expect(sql).toContain('$2');
    expect(sql).toContain('type = $3');
    expect(sql).toContain(' AND ');
    expect(values).toEqual(['Alice', '%id%', 'custom']);
  });

  it('always orders by created_at DESC', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await listNotifications({});
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('ORDER BY created_at DESC');
  });
});

describe('getNotificationById', () => {
  it('returns null when no row matches', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await getNotificationById('missing');
    expect(result).toBeNull();
  });

  it('returns the row when found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] });
    const result = await getNotificationById('n1');
    expect(result.id).toBe('n1');
  });
});

describe('markNotificationRead', () => {
  it('sets status to viewed', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'n1', status: 'viewed' }] });
    await markNotificationRead('n1');
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain("SET status = 'viewed'");
    expect(values).toEqual(['n1']);
  });

  it('returns null when the id does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await markNotificationRead('missing');
    expect(result).toBeNull();
  });
});
