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

describe('Activity log', () => {
  test('allocating a room writes an activity entry visible via GET /api/activity', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'admin-activity@test.com', role: 'admin' });
    const room = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 'D101', block: 'D', floor: 1, capacity: 1 });
    const { user: student } = await registerAndLogin({ email: 'student-activity@test.com' });

    await request(app)
      .post(`/api/rooms/${room.body.data._id}/allocate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student.id });

    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].type).toBe('room');
    expect(res.body.data[0].text).toMatch(/D101/);
    expect(res.body.data[0].by.name).toBe('Test User');
  });

  test('a student cannot read the activity feed', async () => {
    const { token } = await registerAndLogin({ email: 'student-noaccess@test.com' });
    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
