/**
 * Circuit CRUD tests
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
  getTargetDisplay: jest.fn().mockReturnValue('CID-001'),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-circuit-001';
const CIRCUIT_UUID = 'circuit-uuid-001';
const PROVIDER_UUID = '12345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleCircuit = {
  uuid: CIRCUIT_UUID,
  provider_uuid: PROVIDER_UUID,
  type: 'fiber',
  status: 'Active',
  commitrate: null,
  customerip: null,
  description: null,
  gatewayip: null,
  installed: null,
  ordernumber: 'CID-001',
  provideraccount: null,
  tags: null,
  tenant: null,
  terminates: null,
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

describe('GET /api/ipam/circuits', () => {
  test('returns list of circuits', async () => {
    db.query.mockResolvedValue({ rows: [sampleCircuit] });

    const res = await request(app)
      .get('/api/ipam/circuits')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(CIRCUIT_UUID);
  });

  test('returns empty list when no circuits exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/circuits')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/ipam/circuits/:id', () => {
  test('returns a single circuit', async () => {
    db.query.mockResolvedValue({ rows: [sampleCircuit] });

    const res = await request(app)
      .get(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(CIRCUIT_UUID);
  });
});

describe('POST /api/ipam/circuits', () => {
  test('creates a circuit and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleCircuit] });

    const res = await request(app)
      .post('/api/ipam/circuits')
      .set(authHeaders())
      .send({ provider_uuid: PROVIDER_UUID, type: 'fiber', status: 'Active' });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(CIRCUIT_UUID);
    expect(res.body.type).toBe('fiber');
  });

  test('returns 400 when required field provider_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/circuits')
      .set(authHeaders())
      .send({ type: 'fiber', status: 'Active' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field type is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/circuits')
      .set(authHeaders())
      .send({ provider_uuid: PROVIDER_UUID, status: 'Active' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field status is missing', async () => {
    const res = await request(app)
      .post('/api/ipam/circuits')
      .set(authHeaders())
      .send({ provider_uuid: PROVIDER_UUID, type: 'fiber' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/ipam/circuits/:id', () => {
  test('updates a circuit and returns the updated row', async () => {
    const updated = { ...sampleCircuit, status: 'Inactive' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleCircuit] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Inactive');
  });

  test('returns 404 when circuit does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when circuit belongs to a different org', async () => {
    const otherOrg = { ...sampleCircuit, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/ipam/circuits/:id', () => {
  test('soft-deletes a circuit and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleCircuit] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when circuit does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when circuit belongs to a different org', async () => {
    const otherOrg = { ...sampleCircuit, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/ipam/circuits/${CIRCUIT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
