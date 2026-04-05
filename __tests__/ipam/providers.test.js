/**
 * Provider CRUD tests
 * Covers: list, get, create, update, delete — happy paths and key error cases.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('pino-http', () => () => (_req, _res, next) => next());

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
}));

jest.mock('../../src/utils/firebaseAdmin', () => ({ ensureInitialized: jest.fn() }));
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  apps: [],
}));

jest.mock('../../src/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
  getTargetDisplay: jest.fn().mockReturnValue('test'),
}));

jest.mock('../../src/utils/firebase', () => ({
  getOrgDetails: jest.fn().mockResolvedValue({}),
  getUserDetails: jest.fn().mockResolvedValue({}),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-provider-001';
const PROVIDER_UUID = 'provider-uuid-001';
const AUTH = 'Bearer test-token';

const sampleProvider = {
  uuid: PROVIDER_UUID,
  name: 'AT&T',
  slug: 'att',
  description: 'Telecom provider',
  comments: '',
  asnscsv: '7018',
  tagscsv: '',
  orgid: ORG_ID,
  createdat: new Date().toISOString(),
  updatedat: new Date().toISOString(),
  deleted_at: null,
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  admin.auth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1' }),
  });
});

function authHeaders() {
  return { Authorization: AUTH, 'X-Org-Id': ORG_ID };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/ipam/providers', () => {
  test('returns list of providers', async () => {
    db.query.mockResolvedValue({ rows: [sampleProvider] });

    const res = await request(app)
      .get('/api/ipam/providers')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(PROVIDER_UUID);
  });

  test('returns empty list when no providers exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/providers')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/providers/:id', () => {
  test('returns a single provider', async () => {
    db.query.mockResolvedValue({ rows: [sampleProvider] });

    const res = await request(app)
      .get(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(PROVIDER_UUID);
  });
});

describe('POST /api/ipam/providers', () => {
  test('creates a provider and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleProvider] });

    const res = await request(app)
      .post('/api/ipam/providers')
      .set(authHeaders())
      .send({ name: 'AT&T', slug: 'att' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(PROVIDER_UUID);
    expect(res.body.name).toBe('AT&T');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/providers')
      .set(authHeaders())
      .send({ slug: 'att' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field slug is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/providers')
      .set(authHeaders())
      .send({ name: 'AT&T' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/providers/:id', () => {
  test('updates a provider and returns the updated row', async () => {
    const updated = { ...sampleProvider, name: 'Verizon' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleProvider] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders())
      .send({ name: 'Verizon' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Verizon');
  });

  test('returns 404 when provider does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when provider belongs to a different org', async () => {
    const otherOrg = { ...sampleProvider, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/providers/:id', () => {
  test('soft-deletes a provider and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleProvider] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when provider does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when provider belongs to a different org', async () => {
    const otherOrg = { ...sampleProvider, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/providers/${PROVIDER_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
