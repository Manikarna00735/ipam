/**
 * Contract CRUD tests
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
  getTargetDisplay: jest.fn().mockReturnValue('Support Agreement'),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-contract-001';
const CONTRACT_UUID = 'contract-uuid-001';
const VENDOR_UUID = '12345678-1234-4123-8123-123456789012';
const AUTH = 'Bearer test-token';

const sampleContract = {
  uuid: CONTRACT_UUID,
  contract_name: 'Support Agreement',
  contract_type: 'Support',
  vendor_uuid: VENDOR_UUID,
  status: 'Active',
  start_date: null,
  end_date: null,
  value: 0,
  currency: 'USD',
  payment_terms: null,
  renewal_type: null,
  notice_period: 0,
  renewal_reminder: 30,
  internal_owner: null,
  linked_assets: [],
  linked_licenses: [],
  linked_pos: [],
  documents: [],
  notes: null,
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

describe('GET /api/assets/contracts', () => {
  test('returns list of contracts', async () => {
    db.query.mockResolvedValue({ rows: [sampleContract] });

    const res = await request(app)
      .get('/api/assets/contracts')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].uuid).toBe(CONTRACT_UUID);
  });

  test('returns empty list when no contracts exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/assets/contracts')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/assets/contracts/:id', () => {
  test('returns a single contract', async () => {
    db.query.mockResolvedValue({ rows: [sampleContract] });

    const res = await request(app)
      .get(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(CONTRACT_UUID);
  });
});

describe('POST /api/assets/contracts', () => {
  test('creates a contract and returns 201', async () => {
    db.query.mockResolvedValue({ rows: [sampleContract] });

    const res = await request(app)
      .post('/api/assets/contracts')
      .set(authHeaders())
      .send({ contract_name: 'Support Agreement', contract_type: 'Support', vendor_uuid: VENDOR_UUID });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(CONTRACT_UUID);
    expect(res.body.contract_name).toBe('Support Agreement');
  });

  test('returns 400 when required field contract_name is missing', async () => {
    const res = await request(app)
      .post('/api/assets/contracts')
      .set(authHeaders())
      .send({ contract_type: 'Support', vendor_uuid: VENDOR_UUID });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field contract_type is missing', async () => {
    const res = await request(app)
      .post('/api/assets/contracts')
      .set(authHeaders())
      .send({ contract_name: 'Support Agreement', vendor_uuid: VENDOR_UUID });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field vendor_uuid is missing', async () => {
    const res = await request(app)
      .post('/api/assets/contracts')
      .set(authHeaders())
      .send({ contract_name: 'Support Agreement', contract_type: 'Support' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/assets/contracts/:id', () => {
  test('updates a contract and returns the updated row', async () => {
    const updated = { ...sampleContract, contract_name: 'Revised Agreement' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleContract] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders())
      .send({ contract_name: 'Revised Agreement' });

    expect(res.status).toBe(200);
    expect(res.body.contract_name).toBe('Revised Agreement');
  });

  test('returns 404 when contract does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders())
      .send({ contract_name: 'X' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when contract belongs to a different org', async () => {
    const otherOrg = { ...sampleContract, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .put(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders())
      .send({ contract_name: 'X' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/assets/contracts/:id', () => {
  test('soft-deletes a contract and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleContract] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('returns 404 when contract does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when contract belongs to a different org', async () => {
    const otherOrg = { ...sampleContract, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrg] });

    const res = await request(app)
      .delete(`/api/assets/contracts/${CONTRACT_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
