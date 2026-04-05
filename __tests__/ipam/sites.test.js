/**
 * Site CRUD tests
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

const ORG_ID = 'org-site-001';
const SITE_UUID = 'site-uuid-001';
const AUTH = 'Bearer test-token';

const sampleSite = {
  uuid: SITE_UUID,
  name: 'New York DC',
  slug: 'new-york-dc',
  status: 'Active',
  description: 'Primary datacenter',
  tagscsv: null,
  tenant: null,
  tenantgroup: null,
  physicaladdress: null,
  shippingaddress: null,
  comments: null,
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

describe('GET /api/ipam/sites', () => {
  test('returns list of sites', async () => {
    db.query.mockResolvedValue({ rows: [sampleSite] });

    const res = await request(app)
      .get('/api/ipam/sites')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(SITE_UUID);
  });

  test('returns empty list when no sites exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/sites')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/sites/:id', () => {
  test('returns a single site', async () => {
    db.query.mockResolvedValue({ rows: [sampleSite] });

    const res = await request(app)
      .get(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(SITE_UUID);
  });
});

describe('POST /api/ipam/sites', () => {
  test('creates a site and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleSite] });

    const res = await request(app)
      .post('/api/ipam/sites')
      .set(authHeaders())
      .send({ name: 'New York DC', slug: 'new-york-dc', status: 'Active' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(SITE_UUID);
    expect(res.body.name).toBe('New York DC');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/sites')
      .set(authHeaders())
      .send({ slug: 'new-york-dc', status: 'Active' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field status is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/sites')
      .set(authHeaders())
      .send({ name: 'New York DC', slug: 'new-york-dc' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/sites/:id', () => {
  test('updates a site and returns the updated row', async () => {
    const updatedSite = { ...sampleSite, name: 'Los Angeles DC' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleSite] })
      .mockResolvedValueOnce({ rows: [updatedSite] });

    const res = await request(app)
      .put(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders())
      .send({ name: 'Los Angeles DC' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Los Angeles DC');
  });

  test('returns 404 when site does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when site belongs to a different org', async () => {
    const otherOrgSite = { ...sampleSite, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgSite] });

    const res = await request(app)
      .put(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/sites/:id', () => {
  test('soft-deletes a site and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleSite] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when site does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when site belongs to a different org', async () => {
    const otherOrgSite = { ...sampleSite, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgSite] });

    const res = await request(app)
      .delete(`/api/ipam/sites/${SITE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
