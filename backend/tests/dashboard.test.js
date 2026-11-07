const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Room = require('../models/Room');
const Complaint = require('../models/Complaint');
const { Fee, Attendance } = require('../models/Other');

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

function utcDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('GET /api/dashboard-summary', () => {
  test('is rejected for unauthenticated requests and for students', async () => {
    const anon = await request(app).get('/api/dashboard-summary');
    expect(anon.status).toBe(401);

    const { token } = await registerAndLogin({ email: 'dash-student@test.com' });
    const student = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);
    expect(student.status).toBe(403);
  });

  test('returns every section the dashboard renders, even on an empty database', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin1@test.com', role: 'admin' });
    const res = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(Object.keys(d).sort()).toEqual(
      ['activity', 'attendanceWeekly', 'complaintCounts', 'feeMonthly', 'occupancyByBlock', 'recentComplaints', 'stats'].sort()
    );
    // Charts must still render on a fresh install, so the shapes have to be
    // fully-formed rather than empty/undefined.
    expect(d.occupancyByBlock.map((b) => b.block)).toEqual(['A', 'B', 'C', 'D']);
    expect(d.attendanceWeekly.days).toHaveLength(7);
    expect(d.attendanceWeekly.counts).toHaveLength(7);
    expect(d.complaintCounts).toEqual({ Resolved: 0, 'In Progress': 0, Pending: 0, Escalated: 0 });
  });

  test('aggregates occupancy per block from real rooms', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin2@test.com', role: 'admin' });
    await Room.create([
      { number: 'A-101', block: 'A', floor: 1, capacity: 3, occupied: 2 },
      { number: 'A-102', block: 'A', floor: 1, capacity: 2, occupied: 0 },
      { number: 'B-101', block: 'B', floor: 1, capacity: 2, occupied: 2 },
    ]);

    const res = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);
    const byBlock = res.body.data.occupancyByBlock;
    expect(byBlock.find((b) => b.block === 'A')).toEqual({ block: 'A', occupied: 2, available: 3 });
    expect(byBlock.find((b) => b.block === 'B')).toEqual({ block: 'B', occupied: 2, available: 0 });
    // Blocks with no rooms yet must still appear, so the chart keeps 4 bars.
    expect(byBlock.find((b) => b.block === 'D')).toEqual({ block: 'D', occupied: 0, available: 0 });
  });

  test('attendance covers exactly the last 7 days and ignores older records', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin3@test.com', role: 'admin' });
    const { user: s1 } = await registerAndLogin({ email: 'dash-s1@test.com' });
    const { user: s2 } = await registerAndLogin({ email: 'dash-s2@test.com' });

    const today = utcDaysAgo(0);
    await Attendance.create([
      { student: s1.id, date: today, status: 'present' },
      { student: s2.id, date: today, status: 'leave' },
      // Well outside the window — must not leak into any bucket.
      { student: s1.id, date: utcDaysAgo(30), status: 'absent' },
    ]);

    const res = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);
    const { days, counts } = res.body.data.attendanceWeekly;

    expect(days[6]).toBe(today);
    expect(counts[6]).toEqual({ present: 1, absent: 0, leave: 1 });
    const totalAbsent = counts.reduce((sum, c) => sum + c.absent, 0);
    expect(totalAbsent).toBe(0);
  });

  test('fee months are ordered chronologically across a year boundary, not alphabetically', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin4@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'dash-s3@test.com' });

    await Fee.create([
      { student: student.id, month: 'December', year: 2025, amount: 10000, status: 'paid' },
      { student: student.id, month: 'January', year: 2026, amount: 20000, status: 'pending' },
    ]);

    const res = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);
    const months = res.body.data.feeMonthly;

    expect(months.map((m) => m.label)).toEqual(['Dec', 'Jan']);
    expect(months[0]).toEqual({ label: 'Dec', paid: 10000, pending: 0 });
    expect(months[1]).toEqual({ label: 'Jan', paid: 0, pending: 20000 });
  });

  test('recent complaints are capped at 6, newest first, with the student populated', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin5@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'dash-s4@test.com', name: 'Populated Student' });

    for (let i = 0; i < 8; i++) {
      await Complaint.create({
        student: student.id, title: `Complaint ${i}`, description: 'x', category: 'Plumbing', status: 'Pending',
      });
    }

    const res = await request(app)
      .get('/api/dashboard-summary')
      .set('Authorization', `Bearer ${token}`);
    const recent = res.body.data.recentComplaints;

    expect(recent).toHaveLength(6);
    expect(recent[0].title).toBe('Complaint 7');
    expect(recent[0].student.name).toBe('Populated Student');
    expect(res.body.data.complaintCounts.Pending).toBe(8);
  });

  test('stats block stays identical to the standalone /api/stats response', async () => {
    const { token } = await registerAndLogin({ email: 'dash-admin6@test.com', role: 'admin' });
    await Room.create({ number: 'C-101', block: 'C', floor: 1, capacity: 2, occupied: 2, status: 'occupied' });

    const [summary, stats] = await Promise.all([
      request(app).get('/api/dashboard-summary').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/stats').set('Authorization', `Bearer ${token}`),
    ]);
    expect(summary.body.data.stats).toEqual(stats.body.data);
  });
});
