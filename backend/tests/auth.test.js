// Mock the database module before any requires
jest.mock('../config/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

const request = require('supertest');
const app = require('../index');
const admin = require('../config/firebase');
const db = require('../config/db');

// Mock firebase-admin
jest.mock('../config/firebase', () => {
  return {
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn()
    })
  };
});

describe('Authentication Module API', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/sync - should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/auth/sync').send({});
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Not authorized, no token provided');
  });

  it('POST /api/auth/sync - should return 401 if token is invalid', async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer bad-token')
      .send({});

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Not authorized, token failed verification');
  });

  it('POST /api/auth/sync - should sync user successfully', async () => {
    // Mock successful verification
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com'
    });

    // Mock DB: findUserByFirebaseUid returns null (middleware lookup)
    // Then insertUserCredentials returns the new user
    // Then insertUserProfile returns a profile
    db.query
      // middleware lookup — no user found yet
      .mockResolvedValueOnce({ rows: [] })
      // insertUserCredentials (includes bcrypt hash internally, but query mock)
      .mockResolvedValueOnce({
        rows: [{
          id: 'uuid-1',
          firebase_uid: 'user123',
          email: 'test@example.com',
          role: 'user',
          created_at: new Date().toISOString(),
        }]
      })
      // insertUserProfile
      .mockResolvedValueOnce({
        rows: [{
          id: 'profile-1',
          user_id: 'uuid-1',
          full_name: 'Test User',
          email: 'test@example.com',
        }]
      });

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer good-token')
      .send({ name: 'Test User' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'User synced successfully');
    expect(res.body.user).toHaveProperty('role', 'user');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
  });

  it('POST /api/auth/sync - should assign admin role if requested', async () => {
    // Mock successful verification
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'admin123',
      email: 'admin@example.com'
    });

    // Mock DB
    db.query
      // middleware lookup — no user found yet
      .mockResolvedValueOnce({ rows: [] })
      // insertUserCredentials
      .mockResolvedValueOnce({
        rows: [{
          id: 'uuid-admin',
          firebase_uid: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
          created_at: new Date().toISOString(),
        }]
      })
      // insertUserProfile
      .mockResolvedValueOnce({
        rows: [{
          id: 'profile-admin',
          user_id: 'uuid-admin',
          full_name: 'Admin User',
          email: 'admin@example.com',
        }]
      });

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Admin User', role: 'admin' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.user).toHaveProperty('role', 'admin');
  });

  it('GET /api/auth/admin-only - should reject normal user', async () => {
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com'
    });

    // Mock DB: middleware finds user with 'user' role
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-1',
        firebase_uid: 'user123',
        email: 'test@example.com',
        role: 'user',
      }]
    });

    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', 'Bearer user-token');

    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toContain('is not authorized');
  });

  it('GET /api/auth/admin-only - should allow admin user', async () => {
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'admin123',
      email: 'admin@example.com'
    });

    // Mock DB: middleware finds user with 'admin' role
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-admin',
        firebase_uid: 'admin123',
        email: 'admin@example.com',
        role: 'admin',
      }]
    });

    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', 'Bearer admin-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Welcome Admin');
  });

  it('POST /api/auth/sync - should return 500 on database error', async () => {
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'user-err',
      email: 'err@example.com'
    });

    // middleware lookup succeeds
    db.query
      .mockResolvedValueOnce({ rows: [] })
      // insertUserCredentials throws
      .mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Error User' });

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty('error', 'Server error while syncing user');
  });
});
