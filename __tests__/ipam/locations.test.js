/**
 * Location CRUD tests
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

const ORG_ID = 'org-location-001';
const LOCATION_UUID = 'location-uuid-001';
const SITE_UUID = '12345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleLocation = {
  uuid: LOCATION_UUID,
  name: 'Floor 1',
  slug: 'floor-1',
  status: 'Active',
  site_uuid: SITE_UUID,
  description: null,
  rackscount: null,
  devicescount: null,
  tagscsv: null,
  tenant: null,
  tenantgroup: null,
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

describe('GET /api/ipam/locations', () => {
  test('returns list of locations', async () => {
    db.query.mockResolvedValue({ rows: [sampleLocation] });

    const res = await request(app)
      .get('/api/ipam/locations')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(LOCATION_UUID);
  });

  test('returns empty list when no locations exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/locations')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/locations/:id', () => {
  test('returns a single location', async () => {
    db.query.mockResolvedValue({ rows: [sampleLocation] });

    const res = await request(app)
      .get(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(LOCATION_UUID);
  });
});

describe('POST /api/ipam/locations', () => {
  test('creates a location and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleLocation] });

    const res = await request(app)
      .post('/api/ipam/locations')
      .set(authHeaders())
      .send({ name: 'Floor 1', slug: 'floor-1', status: 'Active', site_uuid: SITE_UUID });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(LOCATION_UUID);
    expect(res.body.name).toBe('Floor 1');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/locations')
      .set(authHeaders())
      .send({ slug: 'floor-1', status: 'Active', site_uuid: SITE_UUID });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field site_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/locations')
      .set(authHeaders())
      .send({ name: 'Floor 1', slug: 'floor-1', status: 'Active' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/locations/:id', () => {
  test('updates a location and returns the updated row', async () => {
    const updated = { ...sampleLocation, name: 'Floor 2' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleLocation] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders())
      .send({ name: 'Floor 2' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Floor 2');
  });

  test('returns 404 when location does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when location belongs to a different org', async () => {
    const otherOrg = { ...sampleLocation, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/locations/:id', () => {
  test('soft-deletes a location and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleLocation] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when location does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when location belongs to a different org', async () => {
    const otherOrg = { ...sampleLocation, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/locations/${LOCATION_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
