/**
 * VLAN CRUD tests
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

const ORG_ID = 'org-test-001';
const VLAN_UUID = 'vlan-uuid-001';
const AUTH = 'Bearer test-token';

const sampleVlan = {
  uuid: VLAN_UUID,
  name: 'Management',
  role: 'management',
  status: 'Active',
  tag: '10',
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

describe('GET /api/ipam/vlans', () => {
  test('returns list of VLANs', async () => {
    db.query.mockResolvedValue({ rows: [sampleVlan] });

    const res = await request(app)
      .get('/api/ipam/vlans')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(VLAN_UUID);
  });

  test('returns empty list when no VLANs exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/vlans')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/vlans/:id', () => {
  test('returns a single VLAN', async () => {
    db.query.mockResolvedValue({ rows: [sampleVlan] });

    const res = await request(app)
      .get(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(VLAN_UUID);
  });
});

describe('POST /api/ipam/vlans', () => {
  test('creates a VLAN and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleVlan] });

    const res = await request(app)
      .post('/api/ipam/vlans')
      .set(authHeaders())
      .send({ name: 'Management', status: 'Active' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(VLAN_UUID);
    expect(res.body.name).toBe('Management');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/vlans')
      .set(authHeaders())
      .send({ status: 'Active' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/vlans/:id', () => {
  test('updates a VLAN and returns the updated row', async () => {
    const updatedVlan = { ...sampleVlan, name: 'Updated VLAN' };
    // First call: fetch-before-mutate; second call: UPDATE RETURNING
    db.query
      .mockResolvedValueOnce({ rows: [sampleVlan] })
      .mockResolvedValueOnce({ rows: [updatedVlan] });

    const res = await request(app)
      .put(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders())
      .send({ name: 'Updated VLAN' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated VLAN');
  });

  test('returns 404 when VLAN does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // not found

    const res = await request(app)
      .put(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when VLAN belongs to a different org', async () => {
    const otherOrgVlan = { ...sampleVlan, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVlan] });

    const res = await request(app)
      .put(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/vlans/:id', () => {
  test('soft-deletes a VLAN and returns 204', async () => {
    // First call: fetch-before-mutate; second call: UPDATE SET deleted_at
    db.query
      .mockResolvedValueOnce({ rows: [sampleVlan] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when VLAN does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when VLAN belongs to a different org', async () => {
    const otherOrgVlan = { ...sampleVlan, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgVlan] });

    const res = await request(app)
      .delete(`/api/ipam/vlans/${VLAN_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
