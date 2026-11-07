const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

async function registerAndLogin(overrides = {}) {
  const payload = {
    name: 'Test User',
    email: 'user@test.com',
    password: 'Password123',
    role: 'student',
    ...overrides,
  };
  if (payload.role === 'student') {
    const res = await request(app).post('/api/auth/register').send(payload);
    return { token: res.body.token, user: res.body.user };
  }
  const user = await User.create(payload);
  return { token: user.getSignedToken(), user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } };
}

describe('Self-service account: profile edit + change password', () => {
  test('a user can update their own name/phone via PUT /users/:id', async () => {
    const { token, user } = await registerAndLogin({ email: 'account-student1@test.com' });
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Student', phone: '0300-1112223' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Student');
    expect(res.body.data.phone).toBe('0300-1112223');
  });

  test('sending a password field through PUT /users/:id is silently ignored (never stored in plain text)', async () => {
    const { token, user } = await registerAndLogin({ email: 'account-student2@test.com' });
    await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Still Test User', password: 'plaintext-not-hashed' });

    // The original password must still work — proving the PUT didn't overwrite it.
    const login = await request(app).post('/api/auth/login').send({ email: 'account-student2@test.com', password: 'Password123' });
    expect(login.status).toBe(200);
  });

  test('change-password requires the correct current password', async () => {
    const { token } = await registerAndLogin({ email: 'account-student3@test.com' });
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword1', newPassword: 'NewPassword123' });
    expect(res.status).toBe(401);
  });

  test('change-password rejects a weak new password', async () => {
    const { token } = await registerAndLogin({ email: 'account-student4@test.com' });
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123', newPassword: 'weak' });
    expect(res.status).toBe(400);
  });

  test('change-password succeeds and the new password works on next login', async () => {
    const { token } = await registerAndLogin({ email: 'account-student5@test.com' });
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPassword456' });
    expect(res.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'account-student5@test.com', password: 'Password123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/auth/login').send({ email: 'account-student5@test.com', password: 'NewPassword456' });
    expect(newLogin.status).toBe(200);
  });

  test('a user cannot edit another user\'s profile', async () => {
    const { token: token1 } = await registerAndLogin({ email: 'account-student6@test.com' });
    const { user: user2 } = await registerAndLogin({ email: 'account-student7@test.com' });
    const res = await request(app)
      .put(`/api/users/${user2.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  test('a student cannot change their own login email via self-edit', async () => {
    const { token, user } = await registerAndLogin({ email: 'account-student8@test.com' });
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Still Test User', email: 'hijacked-email@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('account-student8@test.com');
  });

  test('an admin cannot change their own login email via self-edit either', async () => {
    const { token, user } = await registerAndLogin({ email: 'account-admin1@test.com', role: 'admin' });
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Admin', email: 'hijacked-admin-email@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('account-admin1@test.com');
  });
});
