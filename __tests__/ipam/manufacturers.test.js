/**
 * Manufacturer CRUD tests
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

const ORG_ID = 'org-mfr-001';
const MFR_UUID = 'mfr-uuid-001';
const AUTH = 'Bearer test-token';

const sampleManufacturer = {
  uuid: MFR_UUID,
  name: 'Cisco',
  slug: 'cisco',
  description: 'Networking hardware manufacturer',
  tags: null,
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

describe('GET /api/ipam/manufacturers', () => {
  test('returns list of manufacturers', async () => {
    db.query.mockResolvedValue({ rows: [sampleManufacturer] });

    const res = await request(app)
      .get('/api/ipam/manufacturers')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(MFR_UUID);
  });

  test('returns empty list when no manufacturers exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/manufacturers')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/manufacturers/:id', () => {
  test('returns a single manufacturer', async () => {
    db.query.mockResolvedValue({ rows: [sampleManufacturer] });

    const res = await request(app)
      .get(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(MFR_UUID);
  });
});

describe('POST /api/ipam/manufacturers', () => {
  test('creates a manufacturer and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleManufacturer] });

    const res = await request(app)
      .post('/api/ipam/manufacturers')
      .set(authHeaders())
      .send({ name: 'Cisco', slug: 'cisco' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(MFR_UUID);
    expect(res.body.name).toBe('Cisco');
  });

  test('returns 400 when required field name is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/manufacturers')
      .set(authHeaders())
      .send({ slug: 'cisco' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field slug is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/manufacturers')
      .set(authHeaders())
      .send({ name: 'Cisco' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/manufacturers/:id', () => {
  test('updates a manufacturer and returns the updated row', async () => {
    const updated = { ...sampleManufacturer, name: 'Cisco Systems' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleManufacturer] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders())
      .send({ name: 'Cisco Systems' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Cisco Systems');
  });

  test('returns 404 when manufacturer does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when manufacturer belongs to a different org', async () => {
    const otherOrg = { ...sampleManufacturer, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders())
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/manufacturers/:id', () => {
  test('soft-deletes a manufacturer and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleManufacturer] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when manufacturer does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when manufacturer belongs to a different org', async () => {
    const otherOrg = { ...sampleManufacturer, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/manufacturers/${MFR_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
