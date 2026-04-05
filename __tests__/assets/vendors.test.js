/**
 * Vendor CRUD tests
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

const ORG_ID = 'org-test-002';
const VENDOR_UUID = 'vendor-uuid-001';
const AUTH = 'Bearer test-token';

const sampleVendor = {
  uuid: VENDOR_UUID,
  name: 'Acme Corp',
  vendor_type: 'Hardware',
  category: 'Networking',
  status: 'Active',
  internal_owner: 'admin',
  email: 'vendor@acme.com',
  vendor_criticality: 'High',
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

describe('GET /api/assets/vendors', () => {
  test('returns list of vendors', async () => {
    db.query.mockResolvedValue({ rows: [sampleVendor] });

    const res = await request(app)
      .get('/api/assets/vendors')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items[0].uuid).toBe(VENDOR_UUID);
  });

  test('returns empty list when no vendors exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/assets/vendors')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/assets/vendors/:id', () => {
  test('returns a single vendor', async () => {
    db.query.mockResolvedValue({ rows: [sampleVendor] });

    const res = await request(app)
      .get(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(VENDOR_UUID);
  });
});

describe('POST /api/assets/vendors', () => {
  test('creates a vendor and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleVendor] });

    const res = await request(app)
      .post('/api/assets/vendors')
      .set(authHeaders())
      .send({
        name: 'Acme Corp',
        vendor_type: 'Hardware',
        category: 'Networking',
        internal_owner: 'admin',
        email: 'vendor@acme.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(VENDOR_UUID);
    expect(res.body.name).toBe('Acme Corp');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/assets/vendors')
      .set(authHeaders())
      .send({
        vendor_type: 'Hardware',
        category: 'Networking',
        internal_owner: 'admin',
        email: 'vendor@acme.com',
      });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/assets/vendors/:id', () => {
  test('updates a vendor and returns the updated row', async () => {
    const updatedVendor = { ...sampleVendor, name: 'Updated Corp' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleVendor] })   // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [updatedVendor] }); // UPDATE RETURNING

    const res = await request(app)
      .put(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders())
      .send({ name: 'Updated Corp' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Corp');
  });

  test('returns 404 when vendor does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when vendor belongs to a different org', async () => {
    const otherOrgVendor = { ...sampleVendor, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVendor] });

    const res = await request(app)
      .put(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/assets/vendors/:id', () => {
  test('soft-deletes a vendor and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleVendor] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when vendor does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when vendor belongs to a different org', async () => {
    const otherOrgVendor = { ...sampleVendor, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVendor] });

    const res = await request(app)
      .delete(`/api/assets/vendors/${VENDOR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
