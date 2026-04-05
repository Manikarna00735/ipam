/**
 * Wireless LAN CRUD tests
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
  getTargetDisplay: jest.fn().mockReturnValue('Corp-WiFi'),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-wireless-001';
const WIRELESS_UUID = 'wireless-uuid-001';
const AUTH = 'Bearer test-token';

const sampleWireless = {
  uuid: WIRELESS_UUID,
  ssid: 'Corp-WiFi',
  status: 'Active',
  description: null,
  tag: null,
  tenant: null,
  tenantgroup: null,
  vlan_uuid: null,
  group: null,
  presharekey: null,
  authtype: 'WPA2',
  authcipher: null,
  interfaces: null,
  comments: null,
  orgid: ORG_ID,
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

describe('GET /api/ipam/wireless', () => {
  test('returns list of wireless LANs', async () => {
    db.query.mockResolvedValue({ rows: [sampleWireless] });

    const res = await request(app)
      .get('/api/ipam/wireless')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(WIRELESS_UUID);
  });

  test('returns empty list when no wireless LANs exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/wireless')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/wireless/:id', () => {
  test('returns a single wireless LAN', async () => {
    db.query.mockResolvedValue({ rows: [sampleWireless] });

    const res = await request(app)
      .get(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(WIRELESS_UUID);
  });
});

describe('POST /api/ipam/wireless', () => {
  test('creates a wireless LAN and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleWireless] });

    const res = await request(app)
      .post('/api/ipam/wireless')
      .set(authHeaders())
      .send({ ssid: 'Corp-WiFi', status: 'Active' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(WIRELESS_UUID);
    expect(res.body.ssid).toBe('Corp-WiFi');
  });

  test('returns 400 when required field ssid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/wireless')
      .set(authHeaders())
      .send({ status: 'Active' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field status is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/wireless')
      .set(authHeaders())
      .send({ ssid: 'Corp-WiFi' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/wireless/:id', () => {
  test('updates a wireless LAN and returns the updated row', async () => {
    const updated = { ...sampleWireless, ssid: 'Corp-WiFi-5G' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleWireless] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders())
      .send({ ssid: 'Corp-WiFi-5G' });

    expect(res.status).toBe(200);
    expect(res.body.ssid).toBe('Corp-WiFi-5G');
  });

  test('returns 404 when wireless LAN does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders())
      .send({ ssid: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when wireless LAN belongs to a different org', async () => {
    const otherOrg = { ...sampleWireless, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders())
      .send({ ssid: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/wireless/:id', () => {
  test('soft-deletes a wireless LAN and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleWireless] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when wireless LAN does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when wireless LAN belongs to a different org', async () => {
    const otherOrg = { ...sampleWireless, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/wireless/${WIRELESS_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
