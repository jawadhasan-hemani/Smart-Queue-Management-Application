const { pool, resetMockPool } = require('./testUtils/mockPool');

jest.mock('../config/db', () => { const { pool } = require('./testUtils/mockPool'); return { pool, query: pool.query }; });

const {
  addNotification,
  notifyJoin,
  notifyIfNearTurn,
  notifyServed,
  notifyLeft,
  NEAR_TURN_THRESHOLD,
} = require('../src/services/notificationService');

function fakeRow(overrides = {}) {
  return {
    id: 'n1',
    user_id: null,
    student_name: 'Alice',
    service_id: 's1',
    service_name: 'Svc',
    type: 'custom',
    message: 'hi',
    status: 'sent',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  resetMockPool();
});

describe('addNotification', () => {
  it('inserts via the query layer and returns a camelCase, unread notification', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fakeRow()] });

    const n = await addNotification({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      type: 'custom',
      message: 'hi',
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      expect.any(Array),
    );
    expect(n.id).toBe('n1');
    expect(n.read).toBe(false);
    expect(n.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('notifyJoin', () => {
  it('creates a "joined" notification referencing the queue position', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [fakeRow({ type: 'joined', message: 'You are position 3.' })],
    });

    const n = await notifyJoin({ studentName: 'Alice', serviceId: 's1', serviceName: 'Svc', position: 3 });
    expect(n.type).toBe('joined');
    expect(n.message).toContain('3');
  });
});

describe('notifyIfNearTurn', () => {
  it('creates a near_turn notification when position is at the threshold', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fakeRow({ type: 'near_turn' })] });

    const n = await notifyIfNearTurn({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      position: NEAR_TURN_THRESHOLD,
    });
    expect(n).not.toBeNull();
    expect(n.type).toBe('near_turn');
  });

  it('returns null and never queries when position is beyond the threshold', async () => {
    const n = await notifyIfNearTurn({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      position: NEAR_TURN_THRESHOLD + 5,
    });
    expect(n).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns null instead of throwing when the DB rejects a duplicate pending ping', async () => {
    // uq_notifications_near_turn_pending: student already has one unread
    // near-turn notification for this service.
    const dupError = new Error('duplicate key value violates unique constraint');
    dupError.code = '23505';
    pool.query.mockRejectedValueOnce(dupError);

    const n = await notifyIfNearTurn({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      position: NEAR_TURN_THRESHOLD,
    });
    expect(n).toBeNull();
  });
});

describe('notifyServed', () => {
  it('creates a "served" notification', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fakeRow({ type: 'served' })] });

    const n = await notifyServed({ studentName: 'Alice', serviceId: 's1', serviceName: 'Svc' });
    expect(n.type).toBe('served');
  });
});

describe('notifyLeft', () => {
  it('creates a "left" notification when a student leaves the queue', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fakeRow({ type: 'left', message: 'You left the queue for Svc.' })] });

    const n = await notifyLeft({ studentName: 'Alice', serviceId: 's1', serviceName: 'Svc' });
    expect(n.type).toBe('left');
    expect(n.message).toContain('left the queue');
  });
});
