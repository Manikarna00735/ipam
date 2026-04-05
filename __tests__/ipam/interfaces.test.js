/**
 * Interface CRUD tests
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

const ORG_ID = 'org-interface-001';
const INTERFACE_UUID = 'iface-uuid-001';
const DEVICE_UUID = '12345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleInterface = {
  uuid: INTERFACE_UUID,
  name: 'GigabitEthernet0/1',
  device_uuid: DEVICE_UUID,
  type: '1000base-t',
  description: null,
  speed: null,
  mac: null,
  mtu: null,
  tags: null,
  vrf_uuid: null,
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

describe('GET /api/ipam/interfaces', () => {
  test('returns list of interfaces', async () => {
    db.query.mockResolvedValue({ rows: [sampleInterface] });

    const res = await request(app)
      .get('/api/ipam/interfaces')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(INTERFACE_UUID);
  });

  test('returns empty list when no interfaces exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/interfaces')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/interfaces/:id', () => {
  test('returns a single interface', async () => {
    db.query.mockResolvedValue({ rows: [sampleInterface] });

    const res = await request(app)
      .get(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(INTERFACE_UUID);
  });
});

describe('POST /api/ipam/interfaces', () => {
  test('creates an interface and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleInterface] });

    const res = await request(app)
      .post('/api/ipam/interfaces')
      .set(authHeaders())
      .send({ name: 'GigabitEthernet0/1', device_uuid: DEVICE_UUID, type: '1000base-t' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(INTERFACE_UUID);
    expect(res.body.name).toBe('GigabitEthernet0/1');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/interfaces')
      .set(authHeaders())
      .send({ device_uuid: DEVICE_UUID, type: '1000base-t' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field device_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/interfaces')
      .set(authHeaders())
      .send({ name: 'GigabitEthernet0/1', type: '1000base-t' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field type is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/interfaces')
      .set(authHeaders())
      .send({ name: 'GigabitEthernet0/1', device_uuid: DEVICE_UUID });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/interfaces/:id', () => {
  test('updates an interface and returns the updated row', async () => {
    const updated = { ...sampleInterface, name: 'GigabitEthernet0/2' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleInterface] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders())
      .send({ name: 'GigabitEthernet0/2' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('GigabitEthernet0/2');
  });

  test('returns 404 when interface does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when interface belongs to a different org', async () => {
    const otherOrg = { ...sampleInterface, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/interfaces/:id', () => {
  test('soft-deletes an interface and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleInterface] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when interface does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when interface belongs to a different org', async () => {
    const otherOrg = { ...sampleInterface, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/interfaces/${INTERFACE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
