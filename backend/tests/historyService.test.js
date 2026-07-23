const { historyEntries, resetStore } = require('../src/data/store');
const { recordHistory } = require('../src/services/historyService');

beforeEach(() => {
  resetStore();
});

describe('recordHistory', () => {
  it('records an entry with a computed wait time', () => {
    const joinedAt = Date.now() - 5 * 60_000; // 5 minutes ago
    const entry = recordHistory({
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
    expect(historyEntries).toContainEqual(entry);
  });

  it('never returns a negative wait time', () => {
    const entry = recordHistory({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      priority: 'low',
      joinedAt: Date.now() + 60_000, // edge case: joinedAt in the future
      status: 'left',
    });
    expect(entry.waitedMinutes).toBeGreaterThanOrEqual(0);
  });

  it('supports a "left" status', () => {
    const entry = recordHistory({
      studentName: 'Bob',
      serviceId: 's2',
      serviceName: 'Svc2',
      priority: 'high',
      joinedAt: Date.now(),
      status: 'left',
    });
    expect(entry.status).toBe('left');
  });
});
