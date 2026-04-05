/**
 * Region CRUD tests
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

const ORG_ID = 'org-region-001';
const REGION_UUID = 'region-uuid-001';
const AUTH = 'Bearer test-token';

const sampleRegion = {
  uuid: REGION_UUID,
  name: 'US East',
  slug: 'us-east',
  description: 'US East Coast',
  tagscsv: '',
  sitescount: 0,
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

describe('GET /api/ipam/regions', () => {
  test('returns list of regions', async () => {
    db.query.mockResolvedValue({ rows: [sampleRegion] });

    const res = await request(app)
      .get('/api/ipam/regions')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(REGION_UUID);
  });

  test('returns empty list when no regions exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/regions')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/regions/:id', () => {
  test('returns a single region', async () => {
    db.query.mockResolvedValue({ rows: [sampleRegion] });

    const res = await request(app)
      .get(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(REGION_UUID);
  });
});

describe('POST /api/ipam/regions', () => {
  test('creates a region and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleRegion] });

    const res = await request(app)
      .post('/api/ipam/regions')
      .set(authHeaders())
      .send({ name: 'US East', slug: 'us-east' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(REGION_UUID);
    expect(res.body.name).toBe('US East');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/regions')
      .set(authHeaders())
      .send({ slug: 'us-east' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field slug is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/regions')
      .set(authHeaders())
      .send({ name: 'US East' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/regions/:id', () => {
  test('updates a region and returns the updated row', async () => {
    const updatedRegion = { ...sampleRegion, name: 'US West' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleRegion] })
      .mockResolvedValueOnce({ rows: [updatedRegion] });

    const res = await request(app)
      .put(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders())
      .send({ name: 'US West' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('US West');
  });

  test('returns 404 when region does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when region belongs to a different org', async () => {
    const otherOrgRegion = { ...sampleRegion, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgRegion] });

    const res = await request(app)
      .put(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/regions/:id', () => {
  test('soft-deletes a region and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleRegion] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when region does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when region belongs to a different org', async () => {
    const otherOrgRegion = { ...sampleRegion, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgRegion] });

    const res = await request(app)
      .delete(`/api/ipam/regions/${REGION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
