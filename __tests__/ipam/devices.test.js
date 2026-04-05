/**
 * Device CRUD tests
 * Covers: list, get, create, update, delete, update-rack-position — happy paths and key error cases.
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

const ORG_ID = 'org-device-001';
const DEVICE_UUID = 'device-uuid-001';
const DEVICE_VALID_UUID = '12345678-1234-4123-8123-123456789001';
const SITE_UUID = '12345678-1234-4123-8123-123456789012';
const RACK_UUID = '22345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleDevice = {
  uuid: DEVICE_UUID,
  name: 'core-switch-01',
  devicetype: 'Switch',
  role: 'Core',
  site_uuid: SITE_UUID,
  description: null,
  assettag: null,
  tag: null,
  tenant: null,
  tenantgroup: null,
  manufacturer_uuid: null,
  platform_uuid: null,
  rack_uuid: null,
  location_uuid: null,
  interfaces: null,
  ips: null,
  airflow: null,
  cluster: null,
  serialno: null,
  services: null,
  virtualchassis: null,
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

describe('GET /api/ipam/devices', () => {
  test('returns list of devices', async () => {
    db.query.mockResolvedValue({ rows: [sampleDevice] });

    const res = await request(app)
      .get('/api/ipam/devices')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(DEVICE_UUID);
  });

  test('returns empty list when no devices exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/devices')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/devices/:id', () => {
  test('returns a single device', async () => {
    db.query.mockResolvedValue({ rows: [sampleDevice] });

    const res = await request(app)
      .get(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(DEVICE_UUID);
  });
});

describe('POST /api/ipam/devices', () => {
  test('creates a device and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleDevice] });

    const res = await request(app)
      .post('/api/ipam/devices')
      .set(authHeaders())
      .send({ name: 'core-switch-01', devicetype: 'Switch', role: 'Core', site_uuid: SITE_UUID });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(DEVICE_UUID);
    expect(res.body.name).toBe('core-switch-01');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/devices')
      .set(authHeaders())
      .send({ devicetype: 'Switch', role: 'Core', site_uuid: SITE_UUID });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field site_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/devices')
      .set(authHeaders())
      .send({ name: 'core-switch-01', devicetype: 'Switch', role: 'Core' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/devices/:id', () => {
  test('updates a device and returns the updated row', async () => {
    const updated = { ...sampleDevice, name: 'core-switch-02' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleDevice] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders())
      .send({ name: 'core-switch-02' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('core-switch-02');
  });

  test('returns 404 when device does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when device belongs to a different org', async () => {
    const otherOrg = { ...sampleDevice, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/devices/:id', () => {
  test('soft-deletes a device and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleDevice] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when device does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when device belongs to a different org', async () => {
    const otherOrg = { ...sampleDevice, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/devices/${DEVICE_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/ipam/common/rack', () => {
  test('updates device rack position and returns the updated row', async () => {
    const updated = { ...sampleDevice, rack_uuid: RACK_UUID, face: 'front', position: 10 };
    db.query.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put('/api/ipam/common/rack')
      .set(authHeaders())
      .send({ uuid: DEVICE_VALID_UUID, rack_uuid: RACK_UUID, face: 'front', position: 10 });

    expect(res.status).toBe(200);
    expect(res.body.rack_uuid).toBe(RACK_UUID);
  });
});
