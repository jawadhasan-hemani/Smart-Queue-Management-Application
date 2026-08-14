const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

jest.mock('../middleware/authMiddleware', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.user = { id: 'test-user-id', uid: 'firebase-uid-123', role: 'user' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

const request = require('supertest');

const { createFakeDb } = require('./testUtils/fakeDb');
const mockDb = createFakeDb();
jest.mock('../config/db', () => ({ pool: mockDb, query: mockDb.query }));

const app = require('../src/app');
const serviceQueries = require('../src/db/serviceQueries');

beforeEach(async () => {
  mockDb.reset();
  mockGenerateContent.mockReset();
  mockGenerateContent.mockResolvedValue({ text: 'This is a mocked AI response.' });

  await serviceQueries.insertService(
    'General Academic Advising',
    'Course planning and general questions.',
    12,
    'medium',
    true,
  );
});

describe('POST /api/chat/session', () => {
  it('creates a new session for the authenticated user', async () => {
    const res = await request(app).post('/api/chat/session');
    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({
      user_id: 'test-user-id',
      title: 'New Chat',
    });
    expect(res.body.session.id).toBeDefined();
  });
});

describe('GET /api/chat/sessions', () => {
  it('returns an empty list when the user has no sessions yet', async () => {
    const res = await request(app).get('/api/chat/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
  });

  it('returns sessions belonging to the user, most recently updated first', async () => {
    const first = await request(app).post('/api/chat/session');
    const second = await request(app).post('/api/chat/session');

    const res = await request(app).get('/api/chat/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].id).toBe(second.body.session.id);
  });
});

describe('GET /api/chat/session/:id', () => {
  it('returns the session and its messages', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    await request(app).post('/api/chat').send({ message: 'Hello', sessionId });

    const res = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(sessionId);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2); // user msg + AI reply
  });

  it('returns 404 for a session that does not exist', async () => {
    const res = await request(app).get('/api/chat/session/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/chat/session/:id', () => {
  it('deletes an existing session', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    const res = await request(app).delete(`/api/chat/session/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting a session that does not exist', async () => {
    const res = await request(app).delete('/api/chat/session/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/chat', () => {
  it('saves the user message and returns an AI response', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    const res = await request(app).post('/api/chat').send({ message: 'How long is the wait?', sessionId });

    expect(res.status).toBe(200);
    expect(res.body.message.role).toBe('model');
    expect(res.body.message.content).toBe('This is a mocked AI response.');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('auto-titles a "New Chat" session from the first message', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    await request(app).post('/api/chat').send({ message: 'What is the wait for Financial Aid?', sessionId });

    const sessionRes = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(sessionRes.body.session.title).toBe('What is the wait for Financial Aid?');
  });

  it('truncates very long first messages when auto-titling', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    const longMessage = 'a'.repeat(80);
    await request(app).post('/api/chat').send({ message: longMessage, sessionId });

    const sessionRes = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(sessionRes.body.session.title.length).toBeLessThanOrEqual(60);
    expect(sessionRes.body.session.title.endsWith('...')).toBe(true);
  });

  it('does not re-title a session on a second message', async () => {
    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    await request(app).post('/api/chat').send({ message: 'First message', sessionId });
    await request(app).post('/api/chat').send({ message: 'Second message', sessionId });

    const sessionRes = await request(app).get(`/api/chat/session/${sessionId}`);
    expect(sessionRes.body.session.title).toBe('First message');
  });

  it('rejects a missing message', async () => {
    const created = await request(app).post('/api/chat/session');
    const res = await request(app).post('/api/chat').send({ sessionId: created.body.session.id });
    expect(res.status).toBe(400);
  });

  it('rejects a missing sessionId', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'Hi' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a sessionId that does not exist', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'Hi', sessionId: 'does-not-exist' });
    expect(res.status).toBe(404);
  });

  it('falls back gracefully when the AI call throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('AI service down'));

    const created = await request(app).post('/api/chat/session');
    const sessionId = created.body.session.id;

    const res = await request(app).post('/api/chat').send({ message: 'Hello?', sessionId });
    expect(res.status).toBe(200);
    expect(res.body.message.role).toBe('model');
    expect(res.body.message.content).toMatch(/unavailable/i);
  });
});