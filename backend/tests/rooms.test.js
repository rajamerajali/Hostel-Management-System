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
  // Admin/warden accounts can no longer be created via the (now
  // student-only) public register endpoint — create directly via the model
  // for test setup, the same way a real admin creates one via POST /api/users.
  const user = await User.create(payload);
  return { token: user.getSignedToken(), user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } };
}

describe('Rooms: create + allocate (core domain logic)', () => {
  test('student cannot create a room', async () => {
    const { token } = await registerAndLogin({ email: 'student1@test.com' });
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: 'A101', block: 'A', floor: 1 });
    expect(res.status).toBe(403);
  });

  test('admin can create a room', async () => {
    const { token } = await registerAndLogin({ email: 'admin1@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: 'A101', block: 'A', floor: 1, capacity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('available');
    expect(res.body.data.occupied).toBe(0);
  });

  test('allocating a student fills the room and moves them out of their previous room', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'admin2@test.com', role: 'admin' });

    const roomA = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 'B101', block: 'B', floor: 1, capacity: 1 });
    const roomB = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 'B102', block: 'B', floor: 1, capacity: 1 });

    const { user: student } = await registerAndLogin({ email: 'student2@test.com' });

    // Allocate into room A first.
    const allocA = await request(app)
      .post(`/api/rooms/${roomA.body.data._id}/allocate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student.id });
    expect(allocA.status).toBe(200);
    expect(allocA.body.data.occupied).toBe(1);
    expect(allocA.body.data.status).toBe('occupied'); // capacity 1 -> full

    // Re-allocate the same student into room B: room A should free up.
    const allocB = await request(app)
      .post(`/api/rooms/${roomB.body.data._id}/allocate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student.id });
    expect(allocB.status).toBe(200);
    expect(allocB.body.data.occupied).toBe(1);

    const roomsRes = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`);
    const freedRoomA = roomsRes.body.data.find((r) => r._id === roomA.body.data._id);
    expect(freedRoomA.occupied).toBe(0);
    expect(freedRoomA.status).toBe('available');
  });

  test('allocating into a full room is rejected', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'admin3@test.com', role: 'admin' });
    const room = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 'C101', block: 'C', floor: 1, capacity: 1 });

    const { user: student1 } = await registerAndLogin({ email: 'student3@test.com' });
    const { user: student2 } = await registerAndLogin({ email: 'student4@test.com' });

    await request(app)
      .post(`/api/rooms/${room.body.data._id}/allocate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student1.id });

    const res = await request(app)
      .post(`/api/rooms/${room.body.data._id}/allocate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student2.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/full/i);
  });
});
