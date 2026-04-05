/**
 * VRF CRUD tests
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

const ORG_ID = 'org-vrf-001';
const VRF_UUID = 'vrf-uuid-001';
const AUTH = 'Bearer test-token';

const sampleVrf = {
  uuid: VRF_UUID,
  name: 'VRF-MAIN',
  description: 'Main VRF',
  tag: null,
  tenant: null,
  importtarget: null,
  exporttarget: null,
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

describe('GET /api/ipam/vrfs', () => {
  test('returns list of VRFs', async () => {
    db.query.mockResolvedValue({ rows: [sampleVrf] });

    const res = await request(app)
      .get('/api/ipam/vrfs')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(VRF_UUID);
  });

  test('returns empty list when no VRFs exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/vrfs')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/vrfs/:id', () => {
  test('returns a single VRF', async () => {
    db.query.mockResolvedValue({ rows: [sampleVrf] });

    const res = await request(app)
      .get(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(VRF_UUID);
  });
});

describe('POST /api/ipam/vrfs', () => {
  test('creates a VRF and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleVrf] });

    const res = await request(app)
      .post('/api/ipam/vrfs')
      .set(authHeaders())
      .send({ name: 'VRF-MAIN' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(VRF_UUID);
    expect(res.body.name).toBe('VRF-MAIN');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/vrfs')
      .set(authHeaders())
      .send({ description: 'No name provided' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/vrfs/:id', () => {
  test('updates a VRF and returns the updated row', async () => {
    const updatedVrf = { ...sampleVrf, name: 'VRF-UPDATED' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleVrf] })   // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [updatedVrf] }); // UPDATE RETURNING

    const res = await request(app)
      .put(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders())
      .send({ name: 'VRF-UPDATED' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('VRF-UPDATED');
  });

  test('returns 404 when VRF does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when VRF belongs to a different org', async () => {
    const otherOrgVrf = { ...sampleVrf, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVrf] });

    const res = await request(app)
      .put(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/vrfs/:id', () => {
  test('soft-deletes a VRF and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleVrf] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when VRF does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when VRF belongs to a different org', async () => {
    const otherOrgVrf = { ...sampleVrf, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVrf] });

    const res = await request(app)
      .delete(`/api/ipam/vrfs/${VRF_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
