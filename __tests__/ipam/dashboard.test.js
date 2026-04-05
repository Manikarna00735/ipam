/**
 * IPAM Dashboard tests
 * Covers: GET /api/ipam/dashboard — happy path and DB error.
 *
 * The controller fires 8 concurrent db.query calls via Promise.all.
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

const ORG_ID = 'org-ipam-dashboard-001';
const AUTH = 'Bearer test-token';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mock all 8 Promise.all queries in the controller's declaration order:
 * 1. KPIs (counts per resource)
 * 2. IP types (public/private/total)
 * 3. IP utilization (allocated/total)
 * 4. Trends (% change vs 30 days ago)
 * 5. VLANs by status
 * 6. IP activity last 7 days
 * 7. Sites summary
 * 8. Prefix health
 */
function mockDashboardQueries() {
  db.query
    // 1. KPIs
    .mockResolvedValueOnce({
      rows: [{ prefixes: '5', subnets: '12', devices: '8', racks: '3', vlans: '6', vrfs: '2', sites: '4' }],
    })
    // 2. IP types
    .mockResolvedValueOnce({
      rows: [{ private_ips: '100', public_ips: '20', ip_addresses: '120' }],
    })
    // 3. IP utilization
    .mockResolvedValueOnce({
      rows: [{ allocated: '80', total: '120' }],
    })
    // 4. Trends
    .mockResolvedValueOnce({
      rows: [{
        prefixes_now: '5', prefixes_30d: '4',
        subnets_now: '12', subnets_30d: '10',
        devices_now: '8', devices_30d: '6',
        racks_now: '3', racks_30d: '3',
        vlans_now: '6', vlans_30d: '5',
        vrfs_now: '2', vrfs_30d: '2',
      }],
    })
    // 5. VLANs by status
    .mockResolvedValueOnce({
      rows: [{ status: 'Active', count: '5' }, { status: 'Reserved', count: '1' }],
    })
    // 6. IP activity last 7 days
    .mockResolvedValueOnce({
      rows: [{ date: new Date('2026-04-01'), allocated: '10' }],
    })
    // 7. Sites summary
    .mockResolvedValueOnce({
      rows: [{
        uuid: 'site-uuid-001', name: 'NYC DC',
        lat: null, lng: null,
        prefixes: '2', subnets: '5', private_ips: '40', public_ips: '8',
        devices: '3', racks: '1', vlans: '0', vrfs: '0',
      }],
    })
    // 8. Prefix health
    .mockResolvedValueOnce({
      rows: [{ prefix: '10.0.0.0/8', used_public: '0', used_private: '80', free: '16777134' }],
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

describe('GET /api/ipam/dashboard', () => {
  test('returns full dashboard summary with correct shape', async () => {
    mockDashboardQueries();

    const res = await request(app)
      .get('/api/ipam/dashboard/summary')
      .set(authHeaders());

    expect(res.status).toBe(200);

    // Top-level keys
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('trends');
    expect(res.body).toHaveProperty('vlans_by_status');
    expect(res.body).toHaveProperty('vrfs_by_status');
    expect(res.body).toHaveProperty('ip_activity_7d');
    expect(res.body).toHaveProperty('sites_summary');
    expect(res.body).toHaveProperty('prefix_health');

    // KPI values
    const { kpis } = res.body;
    expect(kpis.prefixes).toBe(5);
    expect(kpis.subnets).toBe(12);
    expect(kpis.devices).toBe(8);
    expect(kpis.vlans).toBe(6);
    expect(kpis.vrfs).toBe(2);
    expect(kpis.sites).toBe(4);
    expect(kpis.ip_addresses).toBe(120);
    expect(typeof kpis.utilization_pct).toBe('number');

    // Trends
    expect(typeof res.body.trends.prefixes).toBe('number');

    // VLANs by status
    expect(res.body.vlans_by_status).toHaveLength(2);
    expect(res.body.vlans_by_status[0]).toMatchObject({ status: 'Active', count: 5 });

    // VRFs by status (synthetic — always 1 entry)
    expect(res.body.vrfs_by_status).toHaveLength(1);
    expect(res.body.vrfs_by_status[0].status).toBe('active');

    // IP activity
    expect(res.body.ip_activity_7d).toHaveLength(1);
    expect(res.body.ip_activity_7d[0]).toHaveProperty('date');
    expect(res.body.ip_activity_7d[0]).toHaveProperty('allocated');

    // Sites summary
    expect(res.body.sites_summary).toHaveLength(1);
    expect(res.body.sites_summary[0].name).toBe('NYC DC');

    // Prefix health
    expect(res.body.prefix_health).toHaveLength(1);
    expect(res.body.prefix_health[0].prefix).toBe('10.0.0.0/8');
  });

  test('returns 200 with zero counts when org has no data', async () => {
    // All queries return empty/zero results
    db.query
      .mockResolvedValueOnce({ rows: [{ prefixes: '0', subnets: '0', devices: '0', racks: '0', vlans: '0', vrfs: '0', sites: '0' }] })
      .mockResolvedValueOnce({ rows: [{ private_ips: '0', public_ips: '0', ip_addresses: '0' }] })
      .mockResolvedValueOnce({ rows: [{ allocated: '0', total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ prefixes_now: '0', prefixes_30d: '0', subnets_now: '0', subnets_30d: '0', devices_now: '0', devices_30d: '0', racks_now: '0', racks_30d: '0', vlans_now: '0', vlans_30d: '0', vrfs_now: '0', vrfs_30d: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/dashboard/summary')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.kpis.prefixes).toBe(0);
    expect(res.body.kpis.utilization_pct).toBe(0);
    expect(res.body.vlans_by_status).toHaveLength(0);
    expect(res.body.ip_activity_7d).toHaveLength(0);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .get('/api/ipam/dashboard/summary')
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(401);
  });

  test('returns 400 without X-Org-Id header', async () => {
    const res = await request(app)
      .get('/api/ipam/dashboard/summary')
      .set('Authorization', AUTH);

    expect(res.status).toBe(400);
  });
});
