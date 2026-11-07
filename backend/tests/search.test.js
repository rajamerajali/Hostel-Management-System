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

describe('Global search', () => {
  test('short queries (<2 chars) return empty results without hitting the DB', async () => {
    const { token } = await registerAndLogin({ email: 'search-student1@test.com' });
    const res = await request(app)
      .get('/api/search?q=a')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ students: [], rooms: [], complaints: [], announcements: [] });
  });

  test('admin can find a student by name', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'search-admin@test.com', role: 'admin' });
    await registerAndLogin({ email: 'search-student2@test.com', name: 'Zebra Findme' });

    const res = await request(app)
      .get('/api/search?q=Zebra')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.students.length).toBe(1);
    expect(res.body.data.students[0].name).toBe('Zebra Findme');
  });

  test('a student never gets students/rooms categories back', async () => {
    const { token: studentToken } = await registerAndLogin({ email: 'search-student3@test.com' });
    const res = await request(app)
      .get('/api/search?q=anything')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.students).toEqual([]);
    expect(res.body.data.rooms).toEqual([]);
  });

  test('a regex-special-character query does not crash the endpoint', async () => {
    const { token } = await registerAndLogin({ email: 'search-student4@test.com' });
    const res = await request(app)
      .get('/api/search?q=' + encodeURIComponent('a(b['))
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
