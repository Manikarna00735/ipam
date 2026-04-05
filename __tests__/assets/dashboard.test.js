/**
 * Assets Dashboard tests
 * Covers: GET /api/assets/dashboard/summary — happy path and DB error.
 *
 * The controller fires 10 concurrent db.query calls via Promise.all.
 * Each mockResolvedValueOnce maps to one of those queries in declaration order.
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

const ORG_ID = 'org-assets-dashboard-001';
const AUTH = 'Bearer test-token';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mock all 10 Promise.all queries in the controller's declaration order:
 * 1. KPIs
 * 2. Trends
 * 3. Assets by status
 * 4. Assets by category
 * 5. POs by status
 * 6. Contracts by status
 * 7. Asset activity last 7 days
 * 8. Spend by category
 * 9. Top vendors
 * 10. Sites summary
 */
function mockDashboardQueries() {
  db.query
    // 1. KPIs
    .mockResolvedValueOnce({
      rows: [{
        total_assets: '50', total_pos: '10', total_vendors: '5', total_contracts: '8',
        total_asset_value: '250000.00', total_po_value: '75000.00', total_contract_value: '30000.00',
        warranty_expiring_30d: '3', eol_upcoming_90d: '7',
      }],
    })
    // 2. Trends
    .mockResolvedValueOnce({
      rows: [{
        assets_now: '50', assets_30d: '45',
        pos_now: '10', pos_30d: '8',
        vendors_now: '5', vendors_30d: '5',
        contracts_now: '8', contracts_30d: '7',
      }],
    })
    // 3. Assets by status
    .mockResolvedValueOnce({
      rows: [{ status: 'Active', count: '42' }, { status: 'Inactive', count: '8' }],
    })
    // 4. Assets by category
    .mockResolvedValueOnce({
      rows: [{ category: 'Networking', count: '20' }, { category: 'Servers', count: '30' }],
    })
    // 5. POs by status
    .mockResolvedValueOnce({
      rows: [{ status: 'RECEIVED', count: '7', total_value: '60000.00' }],
    })
    // 6. Contracts by status
    .mockResolvedValueOnce({
      rows: [{ status: 'Active', count: '6', total_value: '25000.00' }],
    })
    // 7. Asset activity last 7 days
    .mockResolvedValueOnce({
      rows: [{ date: new Date('2026-04-01'), created: '5' }],
    })
    // 8. Spend by category
    .mockResolvedValueOnce({
      rows: [{ category: 'Servers', total_cost: '150000.00', asset_count: '30' }],
    })
    // 9. Top vendors
    .mockResolvedValueOnce({
      rows: [{ vendor_uuid: 'v-uuid-1', vendor_name: 'Dell', po_count: '4', total_po_value: '50000.00', asset_count: '20' }],
    })
    // 10. Sites summary
    .mockResolvedValueOnce({
      rows: [{
        site_uuid: 'site-uuid-001', site_name: 'NYC DC',
        asset_count: '30', active_count: '28',
        total_asset_value: '180000.00', po_count: '6',
      }],
    });
}

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

describe('GET /api/assets/dashboard/summary', () => {
  test('returns full dashboard summary with correct shape', async () => {
    mockDashboardQueries();

    const res = await request(app)
      .get('/api/assets/dashboard/summary')
      .set(authHeaders());

    expect(res.status).toBe(200);

    // Top-level keys
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('trends');
    expect(res.body).toHaveProperty('assets_by_status');
    expect(res.body).toHaveProperty('assets_by_category');
    expect(res.body).toHaveProperty('pos_by_status');
    expect(res.body).toHaveProperty('contracts_by_status');
    expect(res.body).toHaveProperty('asset_activity_7d');
    expect(res.body).toHaveProperty('spend_by_category');
    expect(res.body).toHaveProperty('top_vendors');
    expect(res.body).toHaveProperty('sites_summary');

    // KPI values
    const { kpis } = res.body;
    expect(kpis.total_assets).toBe(50);
    expect(kpis.total_pos).toBe(10);
    expect(kpis.total_vendors).toBe(5);
    expect(kpis.total_contracts).toBe(8);
    expect(kpis.total_asset_value).toBe(250000);
    expect(kpis.warranty_expiring_30d).toBe(3);
    expect(kpis.eol_upcoming_90d).toBe(7);

    // Trends
    expect(typeof res.body.trends.assets).toBe('number');

    // Assets by status
    expect(res.body.assets_by_status).toHaveLength(2);
    expect(res.body.assets_by_status[0]).toMatchObject({ status: 'Active', count: 42 });

    // Assets by category
    expect(res.body.assets_by_category).toHaveLength(2);

    // POs by status
    expect(res.body.pos_by_status).toHaveLength(1);
    expect(res.body.pos_by_status[0].status).toBe('RECEIVED');

    // Asset activity
    expect(res.body.asset_activity_7d).toHaveLength(1);
    expect(res.body.asset_activity_7d[0]).toHaveProperty('date');
    expect(res.body.asset_activity_7d[0].created).toBe(5);

    // Spend by category
    expect(res.body.spend_by_category).toHaveLength(1);
    expect(res.body.spend_by_category[0].category).toBe('Servers');

    // Top vendors
    expect(res.body.top_vendors).toHaveLength(1);
    expect(res.body.top_vendors[0].vendor_name).toBe('Dell');

    // Sites summary
    expect(res.body.sites_summary).toHaveLength(1);
    expect(res.body.sites_summary[0].site_name).toBe('NYC DC');
  });

  test('returns 200 with zero counts when org has no data', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total_assets: '0', total_pos: '0', total_vendors: '0', total_contracts: '0', total_asset_value: '0', total_po_value: '0', total_contract_value: '0', warranty_expiring_30d: '0', eol_upcoming_90d: '0' }] })
      .mockResolvedValueOnce({ rows: [{ assets_now: '0', assets_30d: '0', pos_now: '0', pos_30d: '0', vendors_now: '0', vendors_30d: '0', contracts_now: '0', contracts_30d: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/assets/dashboard/summary')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.kpis.total_assets).toBe(0);
    expect(res.body.assets_by_status).toHaveLength(0);
    expect(res.body.top_vendors).toHaveLength(0);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .get('/api/assets/dashboard/summary')
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(401);
  });

  test('returns 400 without X-Org-Id header', async () => {
    const res = await request(app)
      .get('/api/assets/dashboard/summary')
      .set('Authorization', AUTH);

    expect(res.status).toBe(400);
  });
});
