const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { Announcement } = require('../models/Other');

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

describe('Fees: real ledger + User.feeStatus sync', () => {
  test('creating a fee bill sets the student\'s feeStatus to due', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'fees-admin1@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'fees-student1@test.com' });

    const res = await request(app)
      .post('/api/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ student: student.id, month: 'January', year: 2026, type: 'Semester', amount: 45000 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');

    const updated = await User.findById(student.id);
    expect(updated.feeStatus).toBe('due');
  });

  test('marking a fee paid sets the student\'s feeStatus to paid', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'fees-admin2@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'fees-student2@test.com' });

    const bill = await request(app)
      .post('/api/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ student: student.id, month: 'February', year: 2026, type: 'Mess', amount: 6000 });

    const pay = await request(app)
      .put(`/api/fees/${bill.body.data._id}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ transactionId: 'TXN-123' });
    expect(pay.status).toBe(200);
    expect(pay.body.data.status).toBe('paid');

    const updated = await User.findById(student.id);
    expect(updated.feeStatus).toBe('paid');
  });

  test('a student only sees their own fee records', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'fees-admin3@test.com', role: 'admin' });
    const { token: studentToken, user: student } = await registerAndLogin({ email: 'fees-student3@test.com' });
    const { user: otherStudent } = await registerAndLogin({ email: 'fees-student4@test.com' });

    await request(app).post('/api/fees').set('Authorization', `Bearer ${adminToken}`)
      .send({ student: student.id, month: 'March', year: 2026, type: 'Semester', amount: 45000 });
    await request(app).post('/api/fees').set('Authorization', `Bearer ${adminToken}`)
      .send({ student: otherStudent.id, month: 'March', year: 2026, type: 'Semester', amount: 45000 });

    const res = await request(app)
      .get('/api/fees')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].student.name).toBe('Test User');
  });

  test('a student cannot create a fee bill', async () => {
    const { token: studentToken, user: student } = await registerAndLogin({ email: 'fees-student5@test.com' });
    const res = await request(app)
      .post('/api/fees')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ student: student.id, month: 'April', year: 2026, type: 'Semester', amount: 45000 });
    expect(res.status).toBe(403);
  });

  test('monthly analytics groups and sorts chronologically across a year boundary', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'fees-admin4@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'fees-student6@test.com' });

    await request(app).post('/api/fees').set('Authorization', `Bearer ${adminToken}`)
      .send({ student: student.id, month: 'December', year: 2025, type: 'Semester', amount: 10000 });
    await request(app).post('/api/fees').set('Authorization', `Bearer ${adminToken}`)
      .send({ student: student.id, month: 'January', year: 2026, type: 'Semester', amount: 20000 });

    const res = await request(app)
      .get('/api/fees/analytics/monthly')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const relevant = res.body.data.filter((d) => d._id.month === 'December' || (d._id.month === 'January' && d._id.year === 2026));
    // December 2025 must come before January 2026 despite "D" > "J" alphabetically.
    const decIndex = res.body.data.findIndex((d) => d._id.year === 2025 && d._id.month === 'December');
    const janIndex = res.body.data.findIndex((d) => d._id.year === 2026 && d._id.month === 'January');
    expect(decIndex).toBeGreaterThanOrEqual(0);
    expect(janIndex).toBeGreaterThan(decIndex);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });
});

describe('POST /api/fees/bulk — general challan for every student', () => {
  test('is rejected for unauthenticated requests and for students', async () => {
    expect((await request(app).post('/api/fees/bulk').send({})).status).toBe(401);

    const { token } = await registerAndLogin({ email: 'bulk-student1@test.com' });
    const res = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${token}`).send({ month: 'January', year: 2026, amount: 45000 });
    expect(res.status).toBe(403);
  });

  test('requires month, year and amount', async () => {
    const { token } = await registerAndLogin({ email: 'bulk-admin1@test.com', role: 'admin' });
    const res = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${token}`).send({ month: 'January' });
    expect(res.status).toBe(400);
  });

  test('bills every student, syncs their feeStatus, and raises one Finance announcement', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'bulk-admin2@test.com', role: 'admin' });
    await registerAndLogin({ email: 'bulk-s1@test.com', name: 'Bulk One' });
    await registerAndLogin({ email: 'bulk-s2@test.com', name: 'Bulk Two' });
    await registerAndLogin({ email: 'bulk-s3@test.com', name: 'Bulk Three' });

    const res = await request(app)
      .post('/api/fees/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'January', year: 2026, type: 'Semester', amount: 45000 });
    expect(res.status).toBe(201);
    expect(res.body.data.billedCount).toBe(3);
    expect(res.body.data.skippedCount).toBe(0);

    const fees = await request(app).get('/api/fees').set('Authorization', `Bearer ${adminToken}`);
    expect(fees.body.data.length).toBe(3);
    expect(fees.body.data.every((f) => f.status === 'pending' && f.amount === 45000)).toBe(true);

    const students = await User.find({ role: 'student' });
    expect(students.every((s) => s.feeStatus === 'due')).toBe(true);

    const announcements = await Announcement.find({ category: 'Finance' });
    expect(announcements.length).toBe(1);
    expect(announcements[0].title).toContain('January 2026');
  });

  test('running it again for the same month/type skips already-billed students instead of double-billing them', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'bulk-admin3@test.com', role: 'admin' });
    await registerAndLogin({ email: 'bulk-s4@test.com' });
    await registerAndLogin({ email: 'bulk-s5@test.com' });

    const first = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'February', year: 2026, type: 'Mess', amount: 6000 });
    expect(first.body.data.billedCount).toBe(2);

    // A 3rd student joins after the first run — only they should get billed.
    await registerAndLogin({ email: 'bulk-s6@test.com' });
    const second = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'February', year: 2026, type: 'Mess', amount: 6000 });
    expect(second.status).toBe(201);
    expect(second.body.data.billedCount).toBe(1);
    expect(second.body.data.skippedCount).toBe(2);

    const fees = await request(app).get('/api/fees').set('Authorization', `Bearer ${adminToken}`);
    expect(fees.body.data.filter((f) => f.month === 'February' && f.year === 2026).length).toBe(3);
  });

  test('returns 400 instead of a bill when every student is already billed', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'bulk-admin4@test.com', role: 'admin' });
    await registerAndLogin({ email: 'bulk-s7@test.com' });

    await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'March', year: 2026, type: 'Semester', amount: 45000 });
    const again = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'March', year: 2026, type: 'Semester', amount: 45000 });
    expect(again.status).toBe(400);
  });

  test('returns 400 when there are no students to bill', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'bulk-admin5@test.com', role: 'admin' });
    const res = await request(app).post('/api/fees/bulk').set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'April', year: 2026, type: 'Semester', amount: 45000 });
    expect(res.status).toBe(400);
  });
});
