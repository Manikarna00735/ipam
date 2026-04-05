/**
 * Purchase Order CRUD tests
 * Covers: list, get, create (valid, missing required fields),
 *         update (valid, 404, 403, bulk asset auto-creation on RECEIVED),
 *         soft-delete (valid, 404, 403).
 * Verifies that deleteFile is NOT called on soft delete (files preserved for recovery).
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

const ORG_ID = 'org-test-004';
const PO_UUID = 'po-uuid-001';
const VENDOR_UUID = '00000000-0000-0000-0000-000000000010';
const SITE_UUID = '00000000-0000-0000-0000-000000000001';
const AUTH = 'Bearer test-token';

const samplePO = {
  uuid: PO_UUID,
  po_id: 'PO-2024-001',
  vendor_uuid: VENDOR_UUID,
  site_uuid: SITE_UUID,
  quantity: 2,
  unit_cost: 500,
  total_value: 1000,
  status: 'DRAFT',
  category: 'Networking',
  model: 'Switch X',
  department: 'IT',
  quantity_received: 0,
  document_url: null,
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
  // generateQrCode returns null by default — avoids extra db.query calls in bulk-create path
  storage.generateQrCode.mockResolvedValue(null);
  storage.deleteFile.mockResolvedValue(undefined);
  storage.uploadFile.mockResolvedValue('https://storage/doc.pdf');
});

function authHeaders() {
  return { Authorization: AUTH, 'X-Org-Id': ORG_ID };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/assets/po', () => {
  test('returns list of purchase orders', async () => {
    db.query.mockResolvedValue({ rows: [samplePO] });

    const res = await request(app)
      .get('/api/assets/po')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items[0].uuid).toBe(PO_UUID);
  });

  test('returns empty list when no POs exist', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/assets/po')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('GET /api/assets/po/:id', () => {
  test('returns a single purchase order', async () => {
    db.query.mockResolvedValue({ rows: [samplePO] });

    const res = await request(app)
      .get(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.items[0].uuid).toBe(PO_UUID);
  });
});

describe('POST /api/assets/po', () => {
  test('creates a PO and returns 201', async () => {
    db.query.mockResolvedValueOnce({ rows: [samplePO] }); // INSERT RETURNING

    const res = await request(app)
      .post('/api/assets/po')
      .set(authHeaders())
      .send({
        po_id: 'PO-2024-001',
        vendor_uuid: VENDOR_UUID,
        site_uuid: SITE_UUID,
        quantity: 2,
        unit_cost: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.uuid).toBe(PO_UUID);
    expect(res.body.po_id).toBe('PO-2024-001');
  });

  test('returns 400 when required field po_id is missing', async () => {
    const res = await request(app)
      .post('/api/assets/po')
      .set(authHeaders())
      .send({
        vendor_uuid: VENDOR_UUID,
        site_uuid: SITE_UUID,
        quantity: 2,
        unit_cost: 500,
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field quantity is missing', async () => {
    const res = await request(app)
      .post('/api/assets/po')
      .set(authHeaders())
      .send({
        po_id: 'PO-2024-001',
        vendor_uuid: VENDOR_UUID,
        site_uuid: SITE_UUID,
        unit_cost: 500,
      });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/assets/po/:id', () => {
  test('updates a PO and returns the updated row', async () => {
    const updatedPO = { ...samplePO, status: 'SUBMITTED' };
    db.query
      .mockResolvedValueOnce({ rows: [samplePO] })   // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [updatedPO] });  // UPDATE RETURNING

    const res = await request(app)
      .put(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders())
      .send({ status: 'SUBMITTED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  test('returns 404 when PO does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders())
      .send({ status: 'SUBMITTED' });

    expect(res.status).toBe(404);
  });

  test('returns 403 when PO belongs to a different org', async () => {
    const otherOrgPO = { ...samplePO, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgPO] });

    const res = await request(app)
      .put(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders())
      .send({ status: 'SUBMITTED' });

    expect(res.status).toBe(403);
  });

  test('auto-creates assets when status changes to RECEIVED', async () => {
    // PO with quantity=2 transitioning DRAFT → RECEIVED
    const draftPO = { ...samplePO, status: 'DRAFT', quantity: 2 };
    const receivedPO = { ...samplePO, status: 'RECEIVED' };

    // fetch → UPDATE RETURNING → bulk INSERT RETURNING
    // generateQrCode returns null (set in beforeEach) so no extra db.query calls for QR
    db.query
      .mockResolvedValueOnce({ rows: [draftPO] })
      .mockResolvedValueOnce({ rows: [receivedPO] })
      .mockResolvedValueOnce({ rows: [{ uuid: 'new-asset-1' }, { uuid: 'new-asset-2' }] });

    const res = await request(app)
      .put(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders())
      .send({ status: 'RECEIVED' });

    expect(res.status).toBe(200);
    // generateQrCode should be called once per created asset (quantity=2)
    expect(storage.generateQrCode).toHaveBeenCalledTimes(2);
  });

  test('auto-creates assets when status changes to PARTIALLY_RECEIVED', async () => {
    const draftPO = { ...samplePO, status: 'DRAFT', quantity: 3, quantity_received: 0 };
    const partialPO = { ...samplePO, status: 'PARTIALLY_RECEIVED' };

    db.query
      .mockResolvedValueOnce({ rows: [draftPO] })
      .mockResolvedValueOnce({ rows: [partialPO] })
      .mockResolvedValueOnce({ rows: [{ uuid: 'new-asset-1' }] }); // 1 asset for quantity_received=1

    const res = await request(app)
      .put(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders())
      .send({ status: 'PARTIALLY_RECEIVED', quantity_received: 1 });

    expect(res.status).toBe(200);
    expect(storage.generateQrCode).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/assets/po/:id', () => {
  test('soft-deletes a PO and returns 204', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [samplePO] }) // fetch-before-mutate
      .mockResolvedValueOnce({ rows: [] });        // UPDATE SET deleted_at

    const res = await request(app)
      .delete(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(204);
  });

  test('does NOT call deleteFile on soft delete (files preserved for recovery)', async () => {
    const poWithDoc = { ...samplePO, document_url: 'https://storage/po-doc.pdf' };
    db.query
      .mockResolvedValueOnce({ rows: [poWithDoc] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app)
      .delete(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders());

    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  test('returns 404 when PO does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 403 when PO belongs to a different org', async () => {
    const otherOrgPO = { ...samplePO, orgid: 'other-org' };
    db.query.mockResolvedValueOnce({ rows: [otherOrgPO] });

    const res = await request(app)
      .delete(`/api/assets/po/${PO_UUID}`)
      .set(authHeaders());

    expect(res.status).toBe(403);
  });
});
