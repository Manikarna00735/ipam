const request = require('supertest');
const { app } = require('../src/index');
const db = require('../src/db');

describe('Auth', () => {
  const testEmail = `test+${Date.now()}@example.com`;
  let token;

  test('register', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: testEmail, password: 'password123' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('email', testEmail);
  });

  test('login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  afterAll(async () => {
    // cleanup user
    await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
    await db.pool.end();
  });
});
