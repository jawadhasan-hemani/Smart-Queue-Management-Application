// Jest's jest.mock() factory can't close over an outer `let` binding (it's
// hoisted above the rest of the file), but it CAN reference a variable whose
// name starts with `mock` — so we hold the mutable current-user state there.
const mockAuthState = { currentUser: { uid: 'test-admin', role: 'admin' } };

jest.mock('../middleware/authMiddleware', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.user = mockAuthState.currentUser;
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`,
      });
    }
    next();
  },
}));

const request = require('supertest');

jest.mock('../src/db/reportQueries', () => ({
  getUsersReport: jest.fn(),
  getServicesReport: jest.fn(),
  getQueueStats: jest.fn(),
}));

const app = require('../src/app');
const reportQueries = require('../src/db/reportQueries');

beforeEach(() => {
  mockAuthState.currentUser = { uid: 'test-admin', role: 'admin' };
  jest.clearAllMocks();
});

describe('GET /api/admin/reports auth gating', () => {
  it('rejects a request with no authenticated user', async () => {
    // authMiddleware is mocked at the top of this file; verifyFirebaseToken always
    // calls next() with req.user = mockAuthState.currentUser, so this exercises
    // authorize()'s "no req.user" branch the same way an unauthenticated request would in prod.
    mockAuthState.currentUser = null;
    const res = await request(app).get('/api/admin/reports?type=stats');
    expect(res.status).toBe(403);
  });

  it('rejects a non-admin user with 403', async () => {
    mockAuthState.currentUser = { uid: 'test-user', role: 'user' };
    const res = await request(app).get('/api/admin/reports?type=stats');
    expect(res.status).toBe(403);
  });

  it('allows an admin user through', async () => {
    reportQueries.getQueueStats.mockResolvedValueOnce({
      total_visits: 0,
      served_count: 0,
      left_count: 0,
      canceled_count: 0,
      avg_wait_minutes: 0,
      max_wait_minutes: 0,
    });
    const res = await request(app).get('/api/admin/reports?type=stats');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/reports validation', () => {
  it('rejects a missing type', async () => {
    const res = await request(app).get('/api/admin/reports');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  it('rejects an invalid type', async () => {
    const res = await request(app).get('/api/admin/reports?type=bogus');
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported format', async () => {
    const res = await request(app).get('/api/admin/reports?type=stats&format=pdf');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/csv/i);
  });

  it('rejects a malformed startDate', async () => {
    const res = await request(app).get('/api/admin/reports?type=stats&startDate=01-01-2026');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/);
  });

  it('rejects a malformed endDate', async () => {
    const res = await request(app).get('/api/admin/reports?type=stats&endDate=not-a-date');
    expect(res.status).toBe(400);
  });

  it('accepts a well-formed date range', async () => {
    reportQueries.getQueueStats.mockResolvedValueOnce({
      total_visits: 1,
      served_count: 1,
      left_count: 0,
      canceled_count: 0,
      avg_wait_minutes: 5,
      max_wait_minutes: 5,
    });
    const res = await request(app)
      .get('/api/admin/reports?type=stats&startDate=2026-01-01&endDate=2026-02-01');
    expect(res.status).toBe(200);
    expect(reportQueries.getQueueStats).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-02-01' }),
    );
  });
});

describe('GET /api/admin/reports?type=users', () => {
  it('returns a CSV with the users report header row', async () => {
    reportQueries.getUsersReport.mockResolvedValueOnce([
      {
        user_email: 'alice@example.com',
        user_role: 'user',
        student_name: 'Alice',
        service_name: 'Advising',
        priority: 'medium',
        visit_status: 'served',
        joined_at: '2026-01-01T10:00:00.000Z',
        ended_at: '2026-01-01T10:20:00.000Z',
        waited_minutes: 20,
      },
    ]);

    const res = await request(app).get('/api/admin/reports?type=users');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('users-report');
    expect(res.text).toContain('User Email');
    expect(res.text).toContain('alice@example.com');
  });
});

describe('GET /api/admin/reports?type=services', () => {
  it('passes serviceId through to the query layer', async () => {
    reportQueries.getServicesReport.mockResolvedValueOnce([]);
    const res = await request(app).get('/api/admin/reports?type=services&serviceId=svc-1');
    expect(res.status).toBe(200);
    expect(reportQueries.getServicesReport).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 'svc-1' }),
    );
    expect(res.text).toContain('Service ID');
  });
});

describe('GET /api/admin/reports?type=stats', () => {
  it('returns the overall (ungrouped) stats columns by default', async () => {
    reportQueries.getQueueStats.mockResolvedValueOnce({
      total_visits: 3,
      served_count: 2,
      left_count: 1,
      canceled_count: 0,
      avg_wait_minutes: 8,
      max_wait_minutes: 15,
    });
    const res = await request(app).get('/api/admin/reports?type=stats');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Total Visits');
    expect(res.text).not.toContain('Service ID');
  });

  it('returns the per-service stats columns when groupByService=true', async () => {
    reportQueries.getQueueStats.mockResolvedValueOnce([
      { service_id: 's1', service_name: 'Advising', total_visits: 3, served_count: 2, left_count: 1, canceled_count: 0, avg_wait_minutes: 8, max_wait_minutes: 15 },
    ]);
    const res = await request(app).get('/api/admin/reports?type=stats&groupByService=true');
    expect(res.status).toBe(200);
    expect(reportQueries.getQueueStats).toHaveBeenCalledWith(
      expect.objectContaining({ groupByService: true }),
    );
    expect(res.text).toContain('Service ID');
  });
});

describe('GET /api/admin/reports error handling', () => {
  it('returns 500 when the query layer throws', async () => {
    reportQueries.getUsersReport.mockRejectedValueOnce(new Error('db exploded'));
    const res = await request(app).get('/api/admin/reports?type=users');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
