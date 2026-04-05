/**
 * Assets CRUD tests
 * Covers: list, get, create (valid, missing required fields),
 *         update (valid, 404, 403), soft-delete (valid, 404, 403).
 * Verifies that deleteFile is NOT called on soft delete.
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

jest.mock('../../src/utils/storage', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  generateQrCode: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const storage = require('../../src/utils/storage');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-test-003';
const ASSET_UUID = 'asset-uuid-001';
const SITE_UUID = '00000000-0000-0000-0000-000000000001';
const AUTH = 'Bearer test-token';

const sampleAsset = {
  uuid: ASSET_UUID,
  asset_id: 'ASSET-001',
  category: 'Networking',
  site_uuid: SITE_UUID,
  status: 'Active',
  model: null,
  serial_no: null,
  document_url: null,
  qr_code_url: null,
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
  // generateQrCode returns null so the QR UPDATE branch is skipped in tests
  storage.generateQrCode.mockResolvedValue(null);
  storage.deleteFile.mockResolvedValue(undefined);
  storage.uploadFile.mockResolvedValue('https://storage/doc.pdf');
});

function authHeaders() {
  return { Authorization: AUTH, 'X-Org-Id': ORG_ID };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/assets', () => {
  test('returns list of assets', async () => {
    db.query.mockResolvedValue({ rows: [sampleAsset] });

    const res = await request(app)
      .get('/api/assets')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items[0].uuid).toBe(ASSET_UUID);
  });

  test('returns empty list when no assets exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/assets')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/assets/:id', () => {
  test('returns a single asset', async () => {
    db.query.mockResolvedValue({ rows: [sampleAsset] });

    const res = await request(app)
      .get(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(ASSET_UUID);
  });
});

describe('POST /api/assets', () => {
  test('creates an asset and returns 201', async () => {
    // INSERT RETURNING; generateQrCode returns null so no QR UPDATE
    db.query.mockResolvedValueOnce({ rows: [sampleAsset] });

    const res = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .field('asset_id', 'ASSET-001')
      .field('category', 'Networking')
      .field('site_uuid', SITE_UUID)
      .field('status', 'Active');

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(ASSET_UUID);
  });

  test('returns 400 when required field asset_id is missing', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .field('category', 'Networking')
      .field('site_uuid', SITE_UUID)
      .field('status', 'Active');

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field category is missing', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .field('asset_id', 'ASSET-001')
      .field('site_uuid', SITE_UUID)
      .field('status', 'Active');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/assets/:id', () => {
  test('updates an asset and returns the updated row', async () => {
    const updatedAsset = { ...sampleAsset, status: 'Inactive' };
    db.query
      .mockResolvedValueOnce({ rows: [sampleAsset] })    // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [updatedAsset] });  // UPDATE RETURNING

    const res = await request(app)
      .put(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Inactive');
  });

  test('returns 404 when asset does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when asset belongs to a different org', async () => {
    const otherOrgAsset = { ...sampleAsset, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgAsset] });

    const res = await request(app)
      .put(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders())
      .send({ status: 'Inactive' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/assets/:id', () => {
  test('soft-deletes an asset and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [sampleAsset] }) // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [] });           // UPDATE SET deleted_at

    const res = await request(app)
      .delete(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('does NOT call deleteFile on soft delete (files preserved for recovery)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ ...sampleAsset, document_url: 'https://storage/doc.pdf' }] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app)
      .delete(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders());

    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  test('returns 404 when asset does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when asset belongs to a different org', async () => {
    const otherOrgAsset = { ...sampleAsset, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgAsset] });

    const res = await request(app)
      .delete(`/api/assets/${ASSET_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
