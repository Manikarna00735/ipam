const request = require('supertest');
const { app } = require('../src/index');
const db = require('../src/db');

let token;
let orgId = 'test-org';
let prefixId, subnetId, ipId;

beforeAll(async () => {
  // create a user and login
  const email = `test+${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const r = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  token = r.body.token;
});

afterAll(async () => {
  // cleanup created rows
  if (ipId) await db.query('DELETE FROM ips WHERE id = $1', [ipId]);
  if (subnetId) await db.query('DELETE FROM subnets WHERE id = $1', [subnetId]);
  if (prefixId) await db.query('DELETE FROM prefixes WHERE id = $1', [prefixId]);
  await db.query("DELETE FROM users WHERE email LIKE 'test+%@example.com'");
  await db.pool.end();
});

test.skip('create prefix -> subnet -> ip flow', async () => {
  const prefixRes = await request(app)
    .post('/api/ipam/prefixes')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Org-Id', orgId)
    .send({ prefix: '10.10.0.0/16', status: 'active' });
  expect(prefixRes.statusCode).toBe(201);
  prefixId = prefixRes.body.id;

  const subnetRes = await request(app)
    .post(`/api/ipam/prefixes/${prefixId}/subnets`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Org-Id', orgId)
    .send({ subnet: '10.10.1.0/24', status: 'active' });
  expect(subnetRes.statusCode).toBe(201);
  subnetId = subnetRes.body.id;

  const ipRes = await request(app)
    .post(`/api/ipam/prefixes/${prefixId}/subnets/${subnetId}/ips`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Org-Id', orgId)
    .send({ ip: '10.10.1.5' });
  expect(ipRes.statusCode).toBe(201);
  ipId = ipRes.body.id;

  const listIp = await request(app)
    .get(`/api/ipam/prefixes/${prefixId}/subnets/${subnetId}/ips`)
    .set('Authorization', `Bearer ${token}`)
    .set('X-Org-Id', orgId);
  expect(listIp.statusCode).toBe(200);
  expect(Array.isArray(listIp.body.items)).toBe(true);
});
