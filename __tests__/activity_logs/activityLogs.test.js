/**
 * Activity Logs tests
 * Covers:
 *   POST /api/activity-logs — createActivityLog (valid, missing fields, invalid enum)
 *   POST /api/activity-logs/query — queryActivityLogs
 *     • page 1: total_count is a number
 *     • page 2+: total_count is null (n+1 trick, skip expensive COUNT)
 *     • filtered query returns matching items
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

// Firebase utils used by activityLogsController
jest.mock('../../src/utils/firebase', () => ({
  getOrgDetails: jest.fn().mockResolvedValue({ name: 'Test Org' }),
  getUserDetails: jest.fn().mockResolvedValue({ fullName: 'Test User' }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const db = require('../../src/db');
const { app } = require('../../src/index');

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-test-005';
const AUTH = 'Bearer test-token';

const sampleLog = {
  event_id: 'evt-001',
  timestamp: new Date().toISOString(),
  orgid: ORG_ID,
  org_name: 'Test Org',
  module: 'ipam',
  category: 'config',
  severity: 'info',
  outcome: 'success',
  actor_type: 'user',
  actor_id: 'user-1',
  actor_display: 'Test User',
  event_type: 'VLAN_CREATED',
  event_label: 'VLAN Created',
  target_type: 'vlan',
  target_id: 'vlan-uuid-001',
  target_display: 'Management',
  created_at: new Date().toISOString(),
};

const validCreatePayload = {
  module: 'ipam',
  category: 'config',
  event_type: 'VLAN_CREATED',
  event_label: 'VLAN Created',
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

// ── CREATE tests ──────────────────────────────────────────────────────────────

describe('POST /api/activity-logs', () => {
  test('creates a log entry and returns 201 with event_id and timestamp', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ event_id: 'evt-001', timestamp: new Date().toISOString() }],
    });

    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send(validCreatePayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('event_id');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('returns 400 when required field module is missing', async () => {
    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send({
        category: 'config',
        event_type: 'VLAN_CREATED',
        event_label: 'VLAN Created',
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 when required field event_type is missing', async () => {
    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send({
        module: 'ipam',
        category: 'config',
        event_label: 'VLAN Created',
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid module enum value', async () => {
    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send({
        module: 'invalid_module',
        category: 'config',
        event_type: 'VLAN_CREATED',
        event_label: 'VLAN Created',
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid category enum value', async () => {
    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send({
        module: 'ipam',
        category: 'not_a_valid_category',
        event_type: 'VLAN_CREATED',
        event_label: 'VLAN Created',
      });

    expect(res.status).toBe(400);
  });

  test('accepts optional fields (severity, outcome, actor_type)', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ event_id: 'evt-002', timestamp: new Date().toISOString() }],
    });

    const res = await request(app)
      .post('/api/activity-logs')
      .set(authHeaders())
      .send({
        ...validCreatePayload,
        severity: 'warning',
        outcome: 'failed',
        actor_type: 'system',
        target_type: 'vlan',
        target_id: 'vlan-uuid-001',
        target_display: 'Management',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('event_id');
  });
});

// ── QUERY tests ───────────────────────────────────────────────────────────────

describe('POST /api/activity-logs/query', () => {
  test('page 1 returns items with a numeric total_count', async () => {
    // Page 1: COUNT query runs first, then data query
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '42' }] })  // COUNT(*)
      .mockResolvedValueOnce({ rows: [sampleLog] });       // data

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ page: 1, page_size: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(typeof res.body.total_count).toBe('number');
    expect(res.body.total_count).toBe(42);
    expect(res.body.page).toBe(1);
  });

  test('page 2+ returns items with total_count as null (no COUNT query)', async () => {
    // Page 2: only data query runs (no COUNT)
    db.query.mockResolvedValueOnce({ rows: [sampleLog] }); // data only

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ page: 2, page_size: 10 });

    expect(res.status).toBe(200);
    expect(res.body.total_count).toBeNull();
    expect(res.body.page).toBe(2);
    // DB should only have been called once (no COUNT call)
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('has_more is true when more rows exist beyond page_size', async () => {
    // Fetch n+1 rows to detect has_more — page_size=1, so fetch 2 rows
    const twoRows = [sampleLog, { ...sampleLog, event_id: 'evt-002' }];
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '5' }] }) // COUNT
      .mockResolvedValueOnce({ rows: twoRows });          // data (n+1 = 2)

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ page: 1, page_size: 1 });

    expect(res.status).toBe(200);
    expect(res.body.has_more).toBe(true);
    expect(res.body.items).toHaveLength(1); // sliced to page_size
  });

  test('has_more is false on last page', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [sampleLog] }); // exactly page_size rows

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ page: 1, page_size: 10 });

    expect(res.status).toBe(200);
    expect(res.body.has_more).toBe(false);
  });

  test('accepts module filter and returns filtered results', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [sampleLog] });

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ page: 1, module: 'ipam' });

    expect(res.status).toBe(200);
    expect(res.body.items[0].module).toBe('ipam');
  });

  test('returns 400 for invalid module filter value', async () => {
    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({ module: 'invalid_module' });

    expect(res.status).toBe(400);
  });

  test('returns empty items when no logs match', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/activity-logs/query')
      .set(authHeaders())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total_count).toBe(0);
  });
});
