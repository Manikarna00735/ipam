/**
 * Auth & Org middleware tests
 * Verifies 401/403 behaviour before any route handler runs.
 */

// ── Mocks (hoisted by Jest before imports) ──────────────────────────────────

// Suppress pino-http request logging in tests
jest.mock('pino-http', () => () => (_req, _res, next) => next());

// Suppress logger output
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
}));

// Stub Firebase Admin SDK
jest.mock('../../src/utils/firebaseAdmin', () => ({ ensureInitialized: jest.fn() }));
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn().mockReturnValue({}) },
  apps: [],
}));

// Stub DB so no real connection is attempted
jest.mock('../../src/db', () => ({
  query: jest.fn(),
  pool: { query: jest.fn() },
}));

// Stub activity logger
jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
  getTargetDisplay: jest.fn().mockReturnValue('test'),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const request = require('supertest');
const admin = require('firebase-admin');
const { app } = require('../../src/index');

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORG_ID = 'test-org-123';
const VALID_UID = 'user-abc';
const VALID_TOKEN = 'valid-bearer-token';

function setAuthSuccess() {
  admin.auth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: VALID_UID }),
  });
}

function setAuthFailure() {
  admin.auth.mockReturnValue({
    verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid token')),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('Authorization', 'Basic sometoken')
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 401 when token is invalid (Firebase rejects it)', async () => {
    setAuthFailure();

    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('Authorization', `Bearer invalid-token`)
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('passes through to route when token is valid', async () => {
    setAuthSuccess();
    const db = require('../../src/db');
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(200);
  });
});

describe('requireOrg middleware', () => {
  beforeEach(() => setAuthSuccess());

  test('returns 400 when X-Org-Id header is missing', async () => {
    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('passes through when X-Org-Id is present', async () => {
    const db = require('../../src/db');
    db.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/ipam/vlans')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .set('X-Org-Id', ORG_ID);

    expect(res.status).toBe(200);
  });
});
