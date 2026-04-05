/**
 * Platform CRUD tests
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

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-platform-001';
const PLATFORM_UUID = 'platform-uuid-001';
const AUTH = 'Bearer test-token';

const samplePlatform = {
  uuid: PLATFORM_UUID,
  name: 'IOS-XE',
  slug: 'ios-xe',
  description: 'Cisco IOS XE',
  tags: null,
  manufacturer_uuid: null,
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

describe('GET /api/ipam/platforms', () => {
  test('returns list of platforms', async () => {
    db.query.mockResolvedValue({ rows: [samplePlatform] });

    const res = await request(app)
      .get('/api/ipam/platforms')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(PLATFORM_UUID);
  });

  test('returns empty list when no platforms exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/platforms')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/platforms/:id', () => {
  test('returns a single platform', async () => {
    db.query.mockResolvedValue({ rows: [samplePlatform] });

    const res = await request(app)
      .get(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(PLATFORM_UUID);
  });
});

describe('POST /api/ipam/platforms', () => {
  test('creates a platform and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [samplePlatform] });

    const res = await request(app)
      .post('/api/ipam/platforms')
      .set(authHeaders())
      .send({ name: 'IOS-XE', slug: 'ios-xe' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(PLATFORM_UUID);
    expect(res.body.name).toBe('IOS-XE');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/platforms')
      .set(authHeaders())
      .send({ slug: 'ios-xe' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field slug is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/platforms')
      .set(authHeaders())
      .send({ name: 'IOS-XE' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/platforms/:id', () => {
  test('updates a platform and returns the updated row', async () => {
    const updated = { ...samplePlatform, name: 'IOS-XR' };
    db.query
      .mockResolvedValueOnce({ rows: [samplePlatform] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders())
      .send({ name: 'IOS-XR' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('IOS-XR');
  });

  test('returns 404 when platform does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when platform belongs to a different org', async () => {
    const otherOrg = { ...samplePlatform, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/platforms/:id', () => {
  test('soft-deletes a platform and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [samplePlatform] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when platform does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when platform belongs to a different org', async () => {
    const otherOrg = { ...samplePlatform, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/platforms/${PLATFORM_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
