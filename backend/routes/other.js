const express = require('express');
const User = require('../models/User');
const { Visitor, Fee, Announcement, Attendance } = require('../models/Other');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/activityLog');
const { sendFeeReminders } = require('../utils/feeReminders');

// ── VISITORS ─────────────────────────────────────────────
const visitorsRouter = express.Router();
visitorsRouter.use(protect);

visitorsRouter.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    const visitors = await Visitor.find(filter)
      .populate('student', 'name room block')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Front-desk staff logs who a visitor is here to see — students never had
// a self-service "log my own visitor" flow, so this requires an explicit
// student id and is admin/warden-only.
visitorsRouter.post('/', authorize('admin', 'warden'), async (req, res) => {
  try {
    const { student, ...rest } = req.body;
    if (!student) return res.status(400).json({ success: false, message: 'student is required' });
    const visitor = await Visitor.create({ ...rest, student });
    res.status(201).json({ success: true, data: visitor });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

visitorsRouter.put('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    const update = req.body;
    if (update.status === 'inside') update.entryTime = new Date();
    if (update.status === 'completed') update.exitTime = new Date();
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, update, { new: true }).populate('student', 'name');
    if (update.status === 'inside') {
      await logActivity(`Visitor ${visitor.name} checked in for ${visitor.student?.name || 'a student'}`, 'visitor', req.user._id);
    }
    res.json({ success: true, data: visitor });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// ── FEES ──────────────────────────────────────────────────
const feesRouter = express.Router();
feesRouter.use(protect);

feesRouter.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    const fees = await Fee.find(filter).populate('student', 'name rollNo room').sort({ createdAt: -1 });
    res.json({ success: true, count: fees.length, data: fees });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// User.feeStatus is a quick-glance summary shown on Students/Dashboard/Profile
// badges; the Fee collection below is the real transactional ledger. Every
// bill create/pay keeps the two in sync so neither one goes stale.
const FEE_STATUS_MAP = { pending: 'due', paid: 'paid', partial: 'partial' };

feesRouter.post('/', authorize('admin', 'warden'), async (req, res) => {
  try {
    const fee = await Fee.create(req.body);
    await User.findByIdAndUpdate(fee.student, { feeStatus: FEE_STATUS_MAP[fee.status] || 'due' });
    const populated = await fee.populate('student', 'name rollNo room');
    await logActivity(`Fee bill created for ${populated.student?.name || 'a student'} (${fee.month} ${fee.year})`, 'fee', req.user._id);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Bills every current student in one request instead of the admin repeating
// "create bill" once per student for what's usually the same routine
// monthly charge. Skips anyone who already has a Fee for the same
// (month, year, type) so re-running this by accident doesn't double-bill
// people, and raises one Announcement (category 'Finance') so every
// student sees it through the same notification bell that already
// surfaces announcements — no separate notification system needed.
feesRouter.post('/bulk', authorize('admin', 'warden'), async (req, res) => {
  try {
    const { month, year, type, amount, dueDate } = req.body;
    if (!month || !year || !amount) {
      return res.status(400).json({ success: false, message: 'month, year and amount are required' });
    }
    const billType = type || 'Semester';

    const students = await User.find({ role: 'student' }).select('_id');
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No students to bill' });
    }

    const existing = await Fee.find({ month, year: Number(year), type: billType }).select('student');
    const alreadyBilled = new Set(existing.map((f) => f.student.toString()));
    const toBill = students.filter((s) => !alreadyBilled.has(s._id.toString()));

    if (toBill.length === 0) {
      return res.status(400).json({ success: false, message: 'Every student already has a bill for this month and type.' });
    }

    await Fee.insertMany(toBill.map((s) => ({
      student: s._id, month, year: Number(year), type: billType, amount: Number(amount),
      ...(dueDate ? { dueDate } : {}),
    })));
    await User.updateMany({ _id: { $in: toBill.map((s) => s._id) } }, { feeStatus: 'due' });

    const amountStr = Number(amount).toLocaleString('en-IN');
    const dueStr = dueDate ? ` Due by ${new Date(dueDate).toLocaleDateString('en-GB')}.` : '';
    await Announcement.create({
      title: `New Fee Bill: ${billType} — ${month} ${year}`,
      content: `A ${billType.toLowerCase()} fee of Rs ${amountStr} has been billed for ${month} ${year}.${dueStr} Please pay at your earliest convenience.`,
      category: 'Finance', priority: 'high', author: req.user._id,
    });

    const skipped = students.length - toBill.length;
    await logActivity(
      `Fee bill created for ${toBill.length} student${toBill.length === 1 ? '' : 's'} (${month} ${year})`
      + (skipped ? `, ${skipped} already billed` : ''),
      'fee', req.user._id
    );

    res.status(201).json({ success: true, data: { billedCount: toBill.length, skippedCount: skipped } });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

feesRouter.put('/:id/pay', authorize('admin', 'warden'), async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id,
      { status: 'paid', paidAt: new Date(), transactionId: req.body.transactionId },
      { new: true }).populate('student', 'name');
    await User.findByIdAndUpdate(fee.student, { feeStatus: 'paid' });
    await logActivity(`Fee payment recorded for ${fee.student?.name || 'a student'}`, 'fee', req.user._id);
    res.json({ success: true, data: fee });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Manual trigger for the same reminder job the daily Vercel Cron runs (see
// POST /api/cron/fee-reminders in server.js) — lets an admin send a round
// right now instead of waiting for the next scheduled run.
feesRouter.post('/send-reminders', authorize('admin', 'warden'), async (req, res) => {
  try {
    const result = await sendFeeReminders();
    if (result.studentsEmailed > 0) {
      await logActivity(`Fee reminder emails sent to ${result.studentsEmailed} student${result.studentsEmailed === 1 ? '' : 's'}`, 'fee', req.user._id);
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Analytics
const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

feesRouter.get('/analytics/monthly', authorize('admin', 'warden'), async (req, res) => {
  try {
    const data = await Fee.aggregate([
      { $group: { _id: { month: '$month', year: '$year', status: '$status' },
          total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    // `month` is stored as a name (e.g. "January"), so a plain Mongo $sort on
    // it would order alphabetically rather than chronologically — sort here instead.
    data.sort((a, b) => (a._id.year - b._id.year) || (MONTH_ORDER.indexOf(a._id.month) - MONTH_ORDER.indexOf(b._id.month)));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────
const announcementsRouter = express.Router();
announcementsRouter.use(protect);

announcementsRouter.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'name role')
      .sort({ pinned: -1, createdAt: -1 });
    res.json({ success: true, count: announcements.length, data: announcements });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

announcementsRouter.post('/', authorize('admin', 'warden'), async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, author: req.user._id });
    await logActivity(`Announcement "${ann.title}" published`, 'announcement', req.user._id);
    res.status(201).json({ success: true, data: ann });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

announcementsRouter.put('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: ann });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

announcementsRouter.delete('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── ATTENDANCE ─────────────────────────────────────────────
const attendanceRouter = express.Router();
attendanceRouter.use(protect);

attendanceRouter.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    if (req.query.date) filter.date = req.query.date;
    const records = await Attendance.find(filter).populate('student', 'name rollNo room');
    res.json({ success: true, count: records.length, data: records });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

attendanceRouter.post('/bulk', authorize('admin', 'warden'), async (req, res) => {
  try {
    // records = [{ student, date, status }]
    const { records } = req.body;
    const ops = records.map(r => ({
      updateOne: {
        filter: { student: r.student, date: r.date },
        update: { $set: { ...r, markedBy: req.user._id } },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    res.json({ success: true, message: `${records.length} records saved` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = { visitorsRouter, feesRouter, announcementsRouter, attendanceRouter };
