/**
 * Rack CRUD tests
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

const ORG_ID = 'org-rack-001';
const RACK_UUID = 'rack-uuid-001';
const SITE_UUID = '12345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleRack = {
  uuid: RACK_UUID,
  name: 'Rack-A01',
  slug: 'rack-a01',
  status: 'Active',
  site_uuid: SITE_UUID,
  description: null,
  assettag: null,
  tagscsv: null,
  tenant: null,
  facilityid: null,
  role: null,
  location_uuid: null,
  heightu: null,
  widthin: null,
  depth: null,
  powerutilization: null,
  spaceutilization: null,
  serialnumber: null,
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

describe('GET /api/ipam/racks', () => {
  test('returns list of racks', async () => {
    db.query.mockResolvedValue({ rows: [sampleRack] });

    const res = await request(app)
      .get('/api/ipam/racks')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(RACK_UUID);
  });

  test('returns empty list when no racks exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/racks')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/racks/:id', () => {
  test('returns a single rack', async () => {
    db.query.mockResolvedValue({ rows: [sampleRack] });

    const res = await request(app)
      .get(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(RACK_UUID);
  });
});

describe('POST /api/ipam/racks', () => {
  test('creates a rack and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleRack] });

    const res = await request(app)
      .post('/api/ipam/racks')
      .set(authHeaders())
      .send({ name: 'Rack-A01', slug: 'rack-a01', status: 'Active', site_uuid: SITE_UUID });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(RACK_UUID);
    expect(res.body.name).toBe('Rack-A01');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/racks')
      .set(authHeaders())
      .send({ slug: 'rack-a01', status: 'Active', site_uuid: SITE_UUID });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field site_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/racks')
      .set(authHeaders())
      .send({ name: 'Rack-A01', slug: 'rack-a01', status: 'Active' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/racks/:id', () => {
  test('updates a rack and returns the updated row', async () => {
    const updated = { ...sampleRack, name: 'Rack-B01' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleRack] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders())
      .send({ name: 'Rack-B01' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Rack-B01');
  });

  test('returns 404 when rack does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when rack belongs to a different org', async () => {
    const otherOrg = { ...sampleRack, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/racks/:id', () => {
  test('soft-deletes a rack and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleRack] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when rack does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when rack belongs to a different org', async () => {
    const otherOrg = { ...sampleRack, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/racks/${RACK_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
