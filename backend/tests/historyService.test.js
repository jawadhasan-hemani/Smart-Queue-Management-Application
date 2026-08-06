const { pool, resetMockPool } = require('./testUtils/mockPool');

jest.mock('../src/data/db', () => ({ pool: require('./testUtils/mockPool').pool }));

const { recordHistory } = require('../src/services/historyService');

function echoInsertAsRow(sql, values) {
  const [userId, studentName, serviceId, serviceName, priority, status, joinedAt, endedAt, waitedMinutes] = values;
  return Promise.resolve({
    rows: [{
      id: 'h1',
      user_id: userId,
      student_name: studentName,
      service_id: serviceId,
      service_name: serviceName,
      priority,
      status,
      joined_at: joinedAt,
      ended_at: endedAt,
      waited_minutes: waitedMinutes,
    }],
  });
}

beforeEach(() => {
  resetMockPool();
  pool.query.mockImplementation(echoInsertAsRow);
});

describe('recordHistory', () => {
  it('records an entry with a computed wait time', async () => {
    const joinedAt = Date.now() - 5 * 60_000;
    const entry = await recordHistory({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      priority: 'medium',
      joinedAt,
      status: 'served',
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe('served');
    expect(entry.waitedMinutes).toBeGreaterThanOrEqual(4);
    expect(entry.waitedMinutes).toBeLessThanOrEqual(6);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO queue_history'),
      expect.any(Array),
    );
  });

  it('never returns a negative wait time', async () => {
    const entry = await recordHistory({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      priority: 'low',
      joinedAt: Date.now() + 60_000,
      status: 'left',
    });
    expect(entry.waitedMinutes).toBeGreaterThanOrEqual(0);
  });

  it('supports a "left" status', async () => {
    const entry = await recordHistory({
      studentName: 'Bob',
      serviceId: 's2',
      serviceName: 'Svc2',
      priority: 'high',
      joinedAt: Date.now(),
      status: 'left',
    });
    expect(entry.status).toBe('left');
  });

  it('surfaces a typed DUPLICATE_HISTORY_ENTRY error when the DB rejects a repeat visit', async () => {
    // uq_queue_history_visit: same student + service + joined_at already recorded.
    const dupError = new Error('duplicate key value violates unique constraint');
    dupError.code = '23505';
    pool.query.mockRejectedValueOnce(dupError);

    await expect(
      recordHistory({
        studentName: 'Alice',
        serviceId: 's1',
        serviceName: 'Svc',
        priority: 'medium',
        joinedAt: Date.now(),
        status: 'served',
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_HISTORY_ENTRY' });
  });
});
