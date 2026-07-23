const request = require('supertest');

const app = require('../src/app');
const { services, resetStore } = require('../src/data/store');

beforeEach(() => {
  resetStore();
});

describe('GET /api/services', () => {
  it('returns the list of seeded services', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services.length).toBe(4);
  });
});

describe('GET /api/services/:id', () => {
  it('returns a single service', async () => {
    const res = await request(app).get(`/api/services/${services[0].id}`);
    expect(res.status).toBe(200);
    expect(res.body.service.id).toBe(services[0].id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/services/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/services', () => {
  const validPayload = {
    name: 'Housing Advising',
    description: 'On/off campus housing guidance.',
    duration: 10,
    priority: 'medium',
  };

  it('creates a service with valid input', async () => {
    const res = await request(app).post('/api/services').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.service).toMatchObject({
      name: validPayload.name,
      description: validPayload.description,
      duration: validPayload.duration,
      priority: validPayload.priority,
      open: true,
    });
    expect(res.body.service.id).toBeDefined();

    const list = await request(app).get('/api/services');
    expect(list.body.services.length).toBe(5);
  });

  it('respects an explicit open:false flag', async () => {
    const res = await request(app).post('/api/services').send({ ...validPayload, open: false });
    expect(res.status).toBe(201);
    expect(res.body.service.open).toBe(false);
  });

  it('trims whitespace from name and description', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ ...validPayload, name: '  Housing Advising  ', description: '  desc  ' });
    expect(res.status).toBe(201);
    expect(res.body.service.name).toBe('Housing Advising');
    expect(res.body.service.description).toBe('desc');
  });

  it('rejects a missing name', async () => {
    const { name, ...rest } = validPayload;
    const res = await request(app).post('/api/services').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('rejects a blank/whitespace-only name', async () => {
    const res = await request(app).post('/api/services').send({ ...validPayload, name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('rejects a name over 100 characters', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ ...validPayload, name: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('accepts a name of exactly 100 characters', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ ...validPayload, name: 'a'.repeat(100) });
    expect(res.status).toBe(201);
  });

  it('rejects a missing description', async () => {
    const { description, ...rest } = validPayload;
    const res = await request(app).post('/api/services').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.description).toBeDefined();
  });

  it('rejects a missing duration', async () => {
    const { duration, ...rest } = validPayload;
    const res = await request(app).post('/api/services').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.duration).toBeDefined();
  });

  it('rejects a zero or negative duration', async () => {
    const res = await request(app).post('/api/services').send({ ...validPayload, duration: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.duration).toBeDefined();

    const res2 = await request(app).post('/api/services').send({ ...validPayload, duration: -5 });
    expect(res2.status).toBe(400);
    expect(res2.body.errors.duration).toBeDefined();
  });

  it('rejects a non-integer duration', async () => {
    const res = await request(app).post('/api/services').send({ ...validPayload, duration: 7.5 });
    expect(res.status).toBe(400);
    expect(res.body.errors.duration).toBeDefined();
  });

  it('rejects a missing or invalid priority', async () => {
    const { priority, ...rest } = validPayload;
    const res = await request(app).post('/api/services').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.errors.priority).toBeDefined();

    const res2 = await request(app)
      .post('/api/services')
      .send({ ...validPayload, priority: 'urgent' });
    expect(res2.status).toBe(400);
    expect(res2.body.errors.priority).toBeDefined();
  });

  it('reports multiple field errors at once', async () => {
    const res = await request(app).post('/api/services').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
    expect(res.body.errors.description).toBeDefined();
    expect(res.body.errors.duration).toBeDefined();
    expect(res.body.errors.priority).toBeDefined();
  });
});

describe('PUT /api/services/:id', () => {
  const update = {
    name: 'Updated Name',
    description: 'Updated description.',
    duration: 25,
    priority: 'high',
    open: false,
  };

  it('updates an existing service', async () => {
    const id = services[0].id;
    const res = await request(app).put(`/api/services/${id}`).send(update);
    expect(res.status).toBe(200);
    expect(res.body.service).toMatchObject(update);
    expect(res.body.service.id).toBe(id);
  });

  it('persists the update on subsequent reads', async () => {
    const id = services[1].id;
    await request(app).put(`/api/services/${id}`).send(update);
    const res = await request(app).get(`/api/services/${id}`);
    expect(res.body.service.name).toBe('Updated Name');
  });

  it('returns 404 for an unknown service id', async () => {
    const res = await request(app).put('/api/services/does-not-exist').send(update);
    expect(res.status).toBe(404);
  });

  it('rejects an invalid update payload', async () => {
    const id = services[0].id;
    const res = await request(app)
      .put(`/api/services/${id}`)
      .send({ ...update, name: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  it('leaves open unchanged when omitted from the update', async () => {
    const id = services[0].id; // seeded open: true
    const { open, ...withoutOpen } = update;
    const res = await request(app).put(`/api/services/${id}`).send(withoutOpen);
    expect(res.status).toBe(200);
    expect(res.body.service.open).toBe(true);
  });
});