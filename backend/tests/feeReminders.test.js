const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { Fee } = require('../models/Other');
const { findReminderEligibleFees, sendFeeReminders } = require('../utils/feeReminders');

async function registerAndLogin(overrides = {}) {
  const payload = {
    name: 'Test User', email: 'user@test.com', password: 'Password123', role: 'student',
    ...overrides,
  };
  if (payload.role === 'student') {
    const res = await request(app).post('/api/auth/register').send(payload);
    return { token: res.body.token, user: res.body.user };
  }
  const user = await User.create(payload);
  return { token: user.getSignedToken(), user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } };
}

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

describe('findReminderEligibleFees — eligibility rules', () => {
  test('picks up fees due within the window and already-overdue fees, groups them per student', async () => {
    const { user: student } = await registerAndLogin({ email: 'elig-s1@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(2) });
    await Fee.create({ student: student.id, month: 'February', year: 2026, amount: 6000, type: 'Mess', status: 'pending', dueDate: daysFromNow(-1) });

    const { byStudent, eligibleCount } = await findReminderEligibleFees();
    expect(eligibleCount).toBe(2);
    expect(byStudent.size).toBe(1);
    const [{ fees }] = byStudent.values();
    expect(fees.length).toBe(2);
  });

  test('excludes fees due further out than the window', async () => {
    const { user: student } = await registerAndLogin({ email: 'elig-s2@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(10) });

    const { eligibleCount } = await findReminderEligibleFees();
    expect(eligibleCount).toBe(0);
  });

  test('excludes fees with no due date at all', async () => {
    const { user: student } = await registerAndLogin({ email: 'elig-s3@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending' });

    const { eligibleCount } = await findReminderEligibleFees();
    expect(eligibleCount).toBe(0);
  });

  test('excludes already-paid fees', async () => {
    const { user: student } = await registerAndLogin({ email: 'elig-s4@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'paid', dueDate: daysFromNow(1) });

    const { eligibleCount } = await findReminderEligibleFees();
    expect(eligibleCount).toBe(0);
  });

  test('excludes fees reminded recently (within the cooldown), but includes ones reminded long enough ago', async () => {
    const { user: student } = await registerAndLogin({ email: 'elig-s5@test.com' });
    const recentlyReminded = await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(1), lastReminderAt: hoursAgo(2) });
    const staleReminder = await Fee.create({ student: student.id, month: 'February', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(1), lastReminderAt: hoursAgo(25) });

    const { eligibleCount, byStudent } = await findReminderEligibleFees();
    expect(eligibleCount).toBe(1);
    const [{ fees }] = byStudent.values();
    expect(fees[0]._id.toString()).toBe(staleReminder._id.toString());
    expect(fees.find((f) => f._id.toString() === recentlyReminded._id.toString())).toBeUndefined();
  });
});

describe('sendFeeReminders — fails safe when email is unconfigured', () => {
  test('an empty run returns zeros without needing Brevo configured at all', async () => {
    const result = await sendFeeReminders();
    expect(result).toEqual({ studentsEmailed: 0, studentsFailed: 0, feesReminded: 0 });
  });

  test('a real eligible fee throws a clear "not configured" error (Brevo is deliberately unset in tests)', async () => {
    const { user: student } = await registerAndLogin({ email: 'send-s1@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(1) });

    await expect(sendFeeReminders()).rejects.toThrow(/not configured/i);
  });
});

describe('POST /api/fees/send-reminders', () => {
  test('is rejected for unauthenticated requests and for students', async () => {
    expect((await request(app).post('/api/fees/send-reminders').send({})).status).toBe(401);

    const { token } = await registerAndLogin({ email: 'route-s1@test.com' });
    const res = await request(app).post('/api/fees/send-reminders').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(403);
  });

  test('returns a clean success response when there is nothing to remind', async () => {
    const { token } = await registerAndLogin({ email: 'route-admin1@test.com', role: 'admin' });
    const res = await request(app).post('/api/fees/send-reminders').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.feesReminded).toBe(0);
  });

  test('surfaces the "email not configured" failure as a 500 once there is something to send', async () => {
    const { token: adminToken } = await registerAndLogin({ email: 'route-admin2@test.com', role: 'admin' });
    const { user: student } = await registerAndLogin({ email: 'route-s2@test.com' });
    await Fee.create({ student: student.id, month: 'January', year: 2026, amount: 45000, status: 'pending', dueDate: daysFromNow(1) });

    const res = await request(app).post('/api/fees/send-reminders').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/not configured/i);
  });
});

describe('POST /api/cron/fee-reminders', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;
  beforeAll(() => { process.env.CRON_SECRET = 'test-cron-secret'; });
  afterAll(() => { process.env.CRON_SECRET = ORIGINAL_SECRET; });

  test('rejects requests without the correct bearer secret — this route intentionally skips normal JWT auth', async () => {
    expect((await request(app).post('/api/cron/fee-reminders')).status).toBe(401);
    const wrong = await request(app).post('/api/cron/fee-reminders').set('Authorization', 'Bearer wrong-secret');
    expect(wrong.status).toBe(401);
  });

  test('runs the same job as the manual button when the secret matches', async () => {
    const res = await request(app).post('/api/cron/fee-reminders').set('Authorization', 'Bearer test-cron-secret');
    expect(res.status).toBe(200);
    expect(res.body.data.feesReminded).toBe(0);
  });
});
