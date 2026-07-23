const { notifications, resetStore } = require('../src/data/store');
const {
  addNotification,
  notifyJoin,
  notifyIfNearTurn,
  notifyServed,
  NEAR_TURN_THRESHOLD,
} = require('../src/services/notificationService');

beforeEach(() => {
  resetStore();
});

describe('addNotification', () => {
  it('creates a notification with a generated id, unread status, and timestamp', () => {
    const n = addNotification({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      type: 'custom',
      message: 'hi',
    });

    expect(n.id).toBeDefined();
    expect(n.read).toBe(false);
    expect(n.createdAt).toBeDefined();
    expect(notifications).toContainEqual(n);
  });
});

describe('notifyJoin', () => {
  it('creates a "joined" notification referencing the queue position', () => {
    const n = notifyJoin({ studentName: 'Alice', serviceId: 's1', serviceName: 'Svc', position: 3 });
    expect(n.type).toBe('joined');
    expect(n.message).toContain('3');
  });
});

describe('notifyIfNearTurn', () => {
  it('creates a near_turn notification when position is at the threshold', () => {
    const n = notifyIfNearTurn({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      position: NEAR_TURN_THRESHOLD,
    });
    expect(n).not.toBeNull();
    expect(n.type).toBe('near_turn');
  });

  it('returns null and creates no notification when position is beyond the threshold', () => {
    const before = notifications.length;
    const n = notifyIfNearTurn({
      studentName: 'Alice',
      serviceId: 's1',
      serviceName: 'Svc',
      position: NEAR_TURN_THRESHOLD + 5,
    });
    expect(n).toBeNull();
    expect(notifications.length).toBe(before);
  });
});

describe('notifyServed', () => {
  it('creates a "served" notification', () => {
    const n = notifyServed({ studentName: 'Alice', serviceId: 's1', serviceName: 'Svc' });
    expect(n.type).toBe('served');
  });
});
