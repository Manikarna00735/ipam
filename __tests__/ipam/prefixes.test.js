/**
 * Prefix (network) CRUD tests
 * Covers: list, get, create (valid, invalid format, duplicate, overlap),
 *         update (valid, 404, 403), delete (valid, active IPs guard, 404, 403)
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
const PREFIX_UUID = 'prefix-uuid-001';
const SITE_UUID = '00000000-0000-0000-0000-000000000001';
const AUTH = 'Bearer test-token';

// Valid body for creating a prefix (all required fields included)
const validPrefixBody = {
  prefix: '192.168.1.0/24',
  site_uuid: SITE_UUID,
  status: 'active',
  role: 'production',
  tenant: 'acme',
};

const samplePrefix = {
  uuid: PREFIX_UUID,
  prefix: '192.168.1.0/24',
  role: 'production',
  status: 'active',
  orgid: ORG_ID,
  site_uuid: SITE_UUID,
  vrf_uuid: null,
  vlan_uuid: null,
  tenant: 'acme',
  tenantgroup: null,
  createdat: new Date().toISOString(),
  updatedat: new Date().toISOString(),
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

describe('GET /api/ipam/prefixes', () => {
  test('returns list of prefixes', async () => {
    db.query.mockResolvedValue({ rows: [samplePrefix] });

    const res = await request(app)
      .get('/api/ipam/prefixes')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items[0].uuid).toBe(PREFIX_UUID);
  });

  test('returns empty list when no prefixes exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/prefixes')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/prefixes/:id', () => {
  test('returns a single prefix', async () => {
    db.query.mockResolvedValue({ rows: [samplePrefix] });

    const res = await request(app)
      .get(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(PREFIX_UUID);
  });

  test('returns 404 when prefix does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/ipam/prefixes', () => {
  test('creates a prefix and returns 201', async () => {
    // duplicate check → none; overlap check → none; INSERT
    db.query
      .mockResolvedValueOnce({ rows: [] })          // duplicate check
      .mockResolvedValueOnce({ rows: [] })          // overlap check (all prefixes)
      .mockResolvedValueOnce({ rows: [samplePrefix] }); // INSERT RETURNING

    const res = await request(app)
      .post('/api/ipam/prefixes')
      .set(authHeaders())
      .send(validPrefixBody);

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(PREFIX_UUID);
    expect(res.body.prefix).toBe('192.168.1.0/24');
  });

  test('returns 400 for invalid prefix format', async () => {
    // Validation fails in the controller (IP parsing) — no db calls needed
    const res = await request(app)
      .post('/api/ipam/prefixes')
      .set(authHeaders())
      .send({ ...validPrefixBody, prefix: 'not-an-ip' });

    expect(res.status).toBe(400);
  });

  test('returns 409 when prefix already exists', async () => {
    // Duplicate check returns existing row
    db.query.mockResolvedValueOnce({ rows: [samplePrefix] });

    const res = await request(app)
      .post('/api/ipam/prefixes')
      .set(authHeaders())
      .send(validPrefixBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  test('returns 409 when prefix overlaps with an existing one', async () => {
    const overlappingPrefix = { prefix: '192.168.1.0/23' }; // parent range that contains /24
    db.query
      .mockResolvedValueOnce({ rows: [] })                    // no exact duplicate
      .mockResolvedValueOnce({ rows: [overlappingPrefix] });  // overlap check

    const res = await request(app)
      .post('/api/ipam/prefixes')
      .set(authHeaders())
      .send(validPrefixBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/overlaps/);
  });
});

describe('PUT /api/ipam/prefixes/:id', () => {
  test('updates a prefix and returns the updated row', async () => {
    const updatedPrefix = { ...samplePrefix, role: 'staging' };
    db.query
      .mockResolvedValueOnce({ rows: [samplePrefix] })    // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [updatedPrefix] });  // UPDATE RETURNING

    const res = await request(app)
      .put(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders())
      .send({ role: 'staging' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('staging');
  });

  test('returns 404 when prefix does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders())
      .send({ role: 'staging' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when prefix belongs to a different org', async () => {
    const otherOrgPrefix = { ...samplePrefix, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgPrefix] });

    const res = await request(app)
      .put(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders())
      .send({ role: 'staging' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/prefixes/:id', () => {
  test('soft-deletes a prefix and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })             // active IPs check → none
      .mockResolvedValueOnce({ rows: [samplePrefix] }) // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [] });            // UPDATE SET deleted_at

    const res = await request(app)
      .delete(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when active IPs exist (deletion blocked)', async () => {
    const activeIp = { uuid: 'ip-uuid-001', status: 'active' };
    db.query.mockResolvedValueOnce({ rows: [activeIp] }); // active IPs check

    const res = await request(app)
      .delete(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    // Controller returns 404 with a descriptive message when active IPs block deletion
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/active IP/i);
  });

  test('returns 404 when prefix does not exist', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // active IPs check → none
      .mockResolvedValueOnce({ rows: [] }); // fetch → not found

    const res = await request(app)
      .delete(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when prefix belongs to a different org', async () => {
    const otherOrgPrefix = { ...samplePrefix, orgid: 'other-org' };
    db.query
      .mockResolvedValueOnce({ rows: [] })               // active IPs check → none
      .mockResolvedValueOnce({ rows: [otherOrgPrefix] }); // fetch

    const res = await request(app)
      .delete(`/api/ipam/prefixes/${PREFIX_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
