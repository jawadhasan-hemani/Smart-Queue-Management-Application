const request = require('supertest');
const app = require('../index'); // Path to your Express app
const admin = require('../config/firebase');

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

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Admin User', role: 'admin' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.user).toHaveProperty('role', 'admin');
  });

  it('GET /api/auth/admin-only - should reject normal user', async () => {
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'user123', // We already synced this user as a normal user above
      email: 'test@example.com'
    });

    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', 'Bearer user-token');
      
    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toContain('is not authorized');
  });

  it('GET /api/auth/admin-only - should allow admin user', async () => {
    admin.auth().verifyIdToken.mockResolvedValue({
      uid: 'admin123', // We synced this as admin
      email: 'admin@example.com'
    });

    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', 'Bearer admin-token');
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Welcome Admin');
  });
});
