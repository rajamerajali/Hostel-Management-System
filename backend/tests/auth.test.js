const request = require('supertest');
const app = require('../server');
const Otp = require('../models/Otp');

const studentPayload = {
  name: 'Test Student',
  email: 'student@test.com',
  password: 'Password123',
  role: 'student',
};

describe('Auth flow', () => {
  test('register creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(studentPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(studentPayload.email);
  });

  test('register ignores a client-supplied role and always creates a student', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload, email: 'escalate@test.com', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
  });

  test('register rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload, email: 'weak@test.com', password: 'weakpass' });
    expect(res.status).toBe(400);
  });

  test('register with duplicate email fails', async () => {
    await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app).post('/api/auth/register').send(studentPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('login with correct credentials succeeds', async () => {
    await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app).post('/api/auth/login').send({
      email: studentPayload.email,
      password: studentPayload.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('login with wrong password fails', async () => {
    await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app).post('/api/auth/login').send({
      email: studentPayload.email,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /me without a token is rejected', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /me with a valid token returns the user', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(studentPayload.email);
  });

  test('forgot-password without an email is rejected', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });

  test('forgot-password with no SMTP key configured fails gracefully (never hits real SMTP)', async () => {
    await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: studentPayload.email });
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/not configured/i);
  });
});

describe('Privilege-escalation and IDOR fixes', () => {
  test('POST /api/users without a token is rejected', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'X', email: 'newadmin@test.com', password: 'Password123', role: 'admin' });
    expect(res.status).toBe(401);
  });

  test('POST /api/users from a non-admin is rejected', async () => {
    const studentRes = await request(app).post('/api/auth/register').send(studentPayload);
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${studentRes.body.token}`)
      .send({ name: 'X', email: 'newadmin2@test.com', password: 'Password123', role: 'admin' });
    expect(res.status).toBe(403);
  });

  test('a non-admin cannot self-escalate role via PUT /api/users/:id', async () => {
    const studentRes = await request(app).post('/api/auth/register').send(studentPayload);
    const userId = studentRes.body.user.id;
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${studentRes.body.token}`)
      .send({ role: 'admin', name: 'Still Student' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('student');
    expect(res.body.data.name).toBe('Still Student');
  });

  test('a non-admin cannot update another user\'s record', async () => {
    const aRes = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload, email: 'a@test.com' });
    const bRes = await request(app)
      .post('/api/auth/register')
      .send({ ...studentPayload, email: 'b@test.com' });
    const res = await request(app)
      .put(`/api/users/${bRes.body.user.id}`)
      .set('Authorization', `Bearer ${aRes.body.token}`)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(403);
  });
});

describe('OTP persistence (DB-backed, replaces in-memory Map)', () => {
  test('issue + verify succeeds with the correct OTP', async () => {
    await Otp.issue('otp@test.com', '123456', 10 * 60 * 1000);
    await expect(Otp.verify('otp@test.com', '123456')).resolves.toBe(true);
  });

  test('verify fails with a wrong OTP', async () => {
    await Otp.issue('otp2@test.com', '123456', 10 * 60 * 1000);
    await expect(Otp.verify('otp2@test.com', '000000')).resolves.toBe(false);
  });

  test('verify fails once the OTP has expired', async () => {
    await Otp.issue('expired@test.com', '654321', -1000);
    await expect(Otp.verify('expired@test.com', '654321')).resolves.toBe(false);
  });

  test('re-issuing an OTP for the same email overwrites the previous one', async () => {
    await Otp.issue('reissue@test.com', '111111', 10 * 60 * 1000);
    await Otp.issue('reissue@test.com', '222222', 10 * 60 * 1000);
    await expect(Otp.verify('reissue@test.com', '111111')).resolves.toBe(false);
    await expect(Otp.verify('reissue@test.com', '222222')).resolves.toBe(true);
  });

  test('locks out after too many wrong attempts, even with the correct OTP afterward', async () => {
    await Otp.issue('lockout@test.com', '777888', 10 * 60 * 1000);
    for (let i = 0; i < 5; i++) {
      await expect(Otp.verify('lockout@test.com', '000000')).resolves.toBe(false);
    }
    await expect(Otp.verify('lockout@test.com', '777888')).resolves.toBe(false);
  });

  test('POST /api/auth/verify-otp accepts a persisted OTP', async () => {
    await Otp.issue('reset@test.com', '111222', 10 * 60 * 1000);
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'reset@test.com', otp: '111222' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/auth/verify-otp rejects a wrong OTP', async () => {
    await Otp.issue('reset2@test.com', '333444', 10 * 60 * 1000);
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'reset2@test.com', otp: '999999' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/reset-password sets a new password that can then be used to log in', async () => {
    await request(app).post('/api/auth/register').send(studentPayload);
    await Otp.issue(studentPayload.email, '555666', 10 * 60 * 1000);

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      email: studentPayload.email,
      otp: '555666',
      newPassword: 'Newpassword456',
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: studentPayload.email,
      password: 'Newpassword456',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });
});
