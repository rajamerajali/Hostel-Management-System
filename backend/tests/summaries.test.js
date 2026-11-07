const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Room = require('../models/Room');
const Complaint = require('../models/Complaint');
const RoomChangeRequest = require('../models/RoomChangeRequest');
const { Visitor, Announcement } = require('../models/Other');

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

describe('GET /api/warden-summary', () => {
  test('is rejected for unauthenticated requests and for students', async () => {
    expect((await request(app).get('/api/warden-summary')).status).toBe(401);

    const { token } = await registerAndLogin({ email: 'ws-student@test.com' });
    const res = await request(app).get('/api/warden-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('returns the full room list (the grid draws a tile per room) plus trimmed lists and real counts', async () => {
    const { token } = await registerAndLogin({ email: 'ws-warden@test.com', role: 'warden' });
    const { user: student } = await registerAndLogin({ email: 'ws-s1@test.com', name: 'Grid Student' });

    await Room.create([
      { number: 'A-201', block: 'A', floor: 2, capacity: 2, occupied: 1 },
      { number: 'B-201', block: 'B', floor: 2, capacity: 3, occupied: 3 },
    ]);
    // 7 complaints, only 2 of them resolved -> 5 open.
    for (let i = 0; i < 7; i++) {
      await Complaint.create({
        student: student.id, title: `WC ${i}`, description: 'x', category: 'Plumbing',
        status: i < 2 ? 'Resolved' : 'Pending',
      });
    }
    await Visitor.create([
      { name: 'V1', purpose: 'meet', student: student.id, status: 'pending' },
      { name: 'V2', purpose: 'meet', student: student.id, status: 'pending' },
      { name: 'V3', purpose: 'meet', student: student.id, status: 'inside' },
    ]);

    const res = await request(app).get('/api/warden-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const d = res.body.data;

    expect(d.rooms).toHaveLength(2);
    // Trimmed to what the page actually lists...
    expect(d.recentComplaints).toHaveLength(5);
    expect(d.visitorQueue).toHaveLength(3);
    // ...while the stat cards still get counts over the whole collection.
    expect(d.openComplaints).toBe(5);
    expect(d.pendingVisitors).toBe(2);
    expect(d.recentComplaints[0].student.name).toBe('Grid Student');
  });

  test('caps the complaint list at 5 and the visitor queue at 4 regardless of collection size', async () => {
    const { token } = await registerAndLogin({ email: 'ws-warden2@test.com', role: 'warden' });
    const { user: student } = await registerAndLogin({ email: 'ws-s2@test.com' });

    for (let i = 0; i < 9; i++) {
      await Complaint.create({ student: student.id, title: `C${i}`, description: 'x', category: 'Other' });
      await Visitor.create({ name: `V${i}`, purpose: 'meet', student: student.id, status: 'pending' });
    }

    const res = await request(app).get('/api/warden-summary').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.recentComplaints).toHaveLength(5);
    expect(res.body.data.visitorQueue).toHaveLength(4);
    expect(res.body.data.pendingVisitors).toBe(9);
  });

  test('an admin may also open the warden dashboard', async () => {
    const { token } = await registerAndLogin({ email: 'ws-admin@test.com', role: 'admin' });
    const res = await request(app).get('/api/warden-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/notifications-summary', () => {
  test('requires authentication', async () => {
    expect((await request(app).get('/api/notifications-summary')).status).toBe(401);
  });

  test('filters to pending items server-side rather than returning whole collections', async () => {
    const { token } = await registerAndLogin({ email: 'ns-admin@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'ns-s1@test.com', name: 'Notif Student' });

    await Complaint.create([
      { student: student.id, title: 'Still pending', description: 'x', category: 'Other', status: 'Pending' },
      { student: student.id, title: 'Already resolved', description: 'x', category: 'Other', status: 'Resolved' },
    ]);
    await RoomChangeRequest.create([
      { student: student.id, currentRoom: 'A-101', preferredBlock: 'B', reason: 'Medical', status: 'pending' },
      { student: student.id, currentRoom: 'A-102', preferredBlock: 'C', reason: 'Medical', status: 'approved' },
    ]);
    await Announcement.create({ title: 'Notice one', content: 'body', category: 'General' });

    const res = await request(app).get('/api/notifications-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const d = res.body.data;

    expect(d.complaints).toHaveLength(1);
    expect(d.complaints[0].title).toBe('Still pending');
    expect(d.complaints[0].student.name).toBe('Notif Student');
    expect(d.roomRequests).toHaveLength(1);
    expect(d.roomRequests[0].preferredBlock).toBe('B');
    expect(d.announcements).toHaveLength(1);
  });

  test('students get announcements only — never other people\'s complaints or requests', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'ns-admin2@test.com', role: 'admin' });
    const { token: studentToken, user: student } = await registerAndLogin({ email: 'ns-s2@test.com' });

    await Complaint.create({ student: student.id, title: 'Pending one', description: 'x', category: 'Other', status: 'Pending' });
    await RoomChangeRequest.create({ student: student.id, currentRoom: 'A-101', preferredBlock: 'B', reason: 'Medical', status: 'pending' });
    await Announcement.create({ title: 'For everyone', content: 'body', category: 'General' });

    const asStudent = await request(app).get('/api/notifications-summary').set('Authorization', `Bearer ${studentToken}`);
    expect(asStudent.body.data.announcements).toHaveLength(1);
    expect(asStudent.body.data.complaints).toEqual([]);
    expect(asStudent.body.data.roomRequests).toEqual([]);

    // Same data, staff view — proves the student result was filtered by role,
    // not just an empty database.
    const asAdmin = await request(app).get('/api/notifications-summary').set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.body.data.complaints).toHaveLength(1);
    expect(asAdmin.body.data.roomRequests).toHaveLength(1);
  });
});

describe('GET /api/student-summary', () => {
  test('is rejected for unauthenticated requests and for staff roles', async () => {
    expect((await request(app).get('/api/student-summary')).status).toBe(401);

    const { token } = await registerAndLogin({ email: 'ss-warden@test.com', role: 'warden' });
    const res = await request(app).get('/api/student-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('caps complaints/announcements at 3, scopes complaints to the caller, and computes the attendance percentage server-side', async () => {
    const { token, user: me } = await registerAndLogin({ email: 'ss-s1@test.com', name: 'Me' });
    const { user: other } = await registerAndLogin({ email: 'ss-s2@test.com', name: 'Other' });

    for (let i = 0; i < 5; i++) {
      await Complaint.create({ student: me.id, title: `Mine ${i}`, description: 'x', category: 'Other' });
    }
    // Someone else's complaint must never show up in my dashboard.
    await Complaint.create({ student: other.id, title: 'Not mine', description: 'x', category: 'Other' });

    for (let i = 0; i < 5; i++) {
      await Announcement.create({ title: `Notice ${i}`, content: 'body', category: 'General' });
    }

    // 3 present, 1 absent -> 75%.
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'];
    await Promise.all(days.map((date, i) =>
      require('../models/Other').Attendance.create({ student: me.id, date, status: i < 3 ? 'present' : 'absent' })
    ));

    const res = await request(app).get('/api/student-summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const d = res.body.data;

    expect(d.complaints).toHaveLength(3);
    expect(d.complaints.every((c) => c.title.startsWith('Mine'))).toBe(true);
    expect(d.announcements).toHaveLength(3);
    expect(d.attendancePct).toBe(75);
  });

  test('reports null attendance percentage when no records exist yet, instead of dividing by zero', async () => {
    const { token } = await registerAndLogin({ email: 'ss-s3@test.com' });
    const res = await request(app).get('/api/student-summary').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.attendancePct).toBeNull();
  });
});
