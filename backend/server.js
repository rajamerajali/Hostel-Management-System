// ====== CRITICAL: Force IPv4 DNS globally for Render.com ======
// Must be at the very top before any requires or DNS lookups
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./config/db');
const isMainModule = require.main === module;
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const authRouter = require('./routes/auth');
const { usersRouter, roomsRouter, complaintsRouter } = require('./routes/main');
const { visitorsRouter, feesRouter, announcementsRouter, attendanceRouter } = require('./routes/other');
const RoomChangeRequest = require('./models/RoomChangeRequest');
const { protect, authorize } = require('./middleware/auth');

// Runs for both traditional (Render, `node server.js`) and serverless
// (Vercel, required as a module) execution — only Jest tests (NODE_ENV=test)
// skip this, since they manage their own mongodb-memory-server instead.
if (process.env.NODE_ENV !== 'test') {
  connectDB().catch((err) => console.error('Initial MongoDB connection failed:', err.message));
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet());

// Local dev origins are hardcoded; the real production origins (Vercel
// frontend URL(s)) come entirely from ALLOWED_ORIGINS (comma-separated) so
// new origins can be added via an env var + redeploy, no code change needed.
const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const allowedOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500',
  ...envOrigins,
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Cheap once connected; guarantees a fresh retry on the very next request if
// a cold start's initial connectDB() attempt above failed. Skipped in tests,
// which connect mongoose to their own mongodb-memory-server directly and
// never set MONGODB_URI.
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    connectDB().then(() => next()).catch(next);
  });
}

// Skipped entirely in tests — Jest's suite calls these routes far more than
// any real rate limit within a single process, and rate-limiting itself is
// an operational concern the functional test suite isn't exercising.
const isTest = process.env.NODE_ENV === 'test';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => isTest,
  message: { success: false, message: 'Too many requests, please try again later' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  message: { success: false, message: 'Too many login attempts, try again in 15 minutes' }
});
// Temporarily disabled at the user's request while the project is still
// under active development/testing (repeated login/register/OTP attempts,
// and just normal page navigation making several API calls each, kept
// tripping both the general 100-per-15-min limit and the 10-per-15-min auth
// limit) — ask before re-enabling once the project is closer to final.
// app.use('/api/', limiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);
// app.use('/api/auth/forgot-password', authLimiter);
// app.use('/api/auth/verify-otp', authLimiter);
// app.use('/api/auth/reset-password', authLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/rooms',         roomsRouter);
app.use('/api/complaints',    complaintsRouter);
app.use('/api/visitors',      visitorsRouter);
app.use('/api/fees',          feesRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/attendance',    attendanceRouter);

// Shared by GET /api/stats and GET /api/dashboard-summary so the two can
// never drift apart. Returns `{ stats, complaintCounts }` — complaintCounts
// keeps the raw status strings ('In Progress' etc.) that the dashboard's
// doughnut chart labels itself with, while `stats.complaints` keeps the
// camelCase shape the stat cards already expect.
async function computeStats() {
  const User      = require('./models/User');
  const Room      = require('./models/Room');
  const Complaint = require('./models/Complaint');
  const { Visitor, Fee } = require('./models/Other');
  const [students, rooms, complaints, visitors, fees] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Visitor.countDocuments({ status: 'inside' }),
    Fee.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const roomMap = rooms.reduce((a, r) => ({ ...a, [r._id]: r.count }), {});
  const compMap = complaints.reduce((a, c) => ({ ...a, [c._id]: c.count }), {});
  return {
    stats: {
      students,
      occupiedRooms:    roomMap.occupied    || 0,
      availableRooms:   roomMap.available   || 0,
      maintenanceRooms: roomMap.maintenance || 0,
      complaints: {
        pending:    compMap.Pending        || 0,
        inProgress: compMap['In Progress'] || 0,
        resolved:   compMap.Resolved       || 0,
        escalated:  compMap.Escalated      || 0,
      },
      visitorsInside: visitors,
      feesCollected:  fees[0]?.total || 0,
    },
    complaintCounts: {
      Resolved:      compMap.Resolved       || 0,
      'In Progress': compMap['In Progress'] || 0,
      Pending:       compMap.Pending        || 0,
      Escalated:     compMap.Escalated      || 0,
    },
  };
}

app.get('/api/stats', protect, async (req, res) => {
  try {
    const { stats } = await computeStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const BLOCKS = ['A', 'B', 'C', 'D'];
const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Dates are stored as 'YYYY-MM-DD' strings written from `toISOString()`
// (UTC) everywhere else in the app — this must match that, not local time,
// or the newest day would silently miss its records for part of each day.
function lastNDates(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// One request for the whole admin dashboard, replacing the 6 separate calls
// it used to fire (stats, complaints, activity, rooms, fee analytics,
// attendance). Beyond saving round-trips, this aggregates server-side: the
// old version shipped every room, every attendance record and every
// complaint over the wire just to derive a handful of numbers client-side.
app.get('/api/dashboard-summary', protect, authorize('admin', 'warden'), async (req, res) => {
  try {
    const Room        = require('./models/Room');
    const Complaint   = require('./models/Complaint');
    const ActivityLog = require('./models/ActivityLog');
    const { Fee, Attendance } = require('./models/Other');

    const attendanceDays = lastNDates(7);

    const [statsResult, recentComplaints, activity, roomsByBlock, feeRows, attendanceRows] = await Promise.all([
      computeStats(),
      Complaint.find().populate('student', 'name rollNo room avatar').sort({ createdAt: -1 }).limit(6),
      ActivityLog.find().populate('by', 'name role').sort({ createdAt: -1 }).limit(10),
      Room.aggregate([
        { $group: { _id: '$block', occupied: { $sum: '$occupied' }, capacity: { $sum: '$capacity' } } },
      ]),
      Fee.aggregate([
        { $group: { _id: { month: '$month', year: '$year', status: '$status' }, total: { $sum: '$amount' } } },
      ]),
      Attendance.aggregate([
        { $match: { date: { $in: attendanceDays } } },
        { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
      ]),
    ]);

    const blockMap = roomsByBlock.reduce((a, b) => ({ ...a, [b._id]: b }), {});
    const occupancyByBlock = BLOCKS.map((block) => {
      const b = blockMap[block];
      const occupied = b?.occupied || 0;
      return { block, occupied, available: Math.max((b?.capacity || 0) - occupied, 0) };
    });

    // `month` is stored as a name ('January'), so it has to be sorted by
    // calendar position rather than alphabetically before taking the tail.
    const feeGrouped = {};
    for (const row of feeRows) {
      const key = `${row._id.month} ${row._id.year}`;
      if (!feeGrouped[key]) {
        feeGrouped[key] = { label: row._id.month.slice(0, 3), month: row._id.month, year: row._id.year, paid: 0, pending: 0 };
      }
      if (row._id.status === 'paid') feeGrouped[key].paid += row.total;
      else feeGrouped[key].pending += row.total;
    }
    const feeMonthly = Object.values(feeGrouped)
      .sort((a, b) => (a.year - b.year) || (MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)))
      .slice(-6)
      .map(({ label, paid, pending }) => ({ label, paid, pending }));

    const attendanceMap = {};
    for (const row of attendanceRows) {
      const { date, status } = row._id;
      if (!attendanceMap[date]) attendanceMap[date] = { present: 0, absent: 0, leave: 0 };
      if (status in attendanceMap[date]) attendanceMap[date][status] = row.count;
    }
    const attendanceWeekly = {
      days: attendanceDays,
      counts: attendanceDays.map((d) => attendanceMap[d] || { present: 0, absent: 0, leave: 0 }),
    };

    res.json({
      success: true,
      data: {
        stats: statsResult.stats,
        complaintCounts: statsResult.complaintCounts,
        recentComplaints,
        activity,
        occupancyByBlock,
        feeMonthly,
        attendanceWeekly,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Everything the warden dashboard renders, in one request instead of the
// three it used to fire (/visitors, /complaints, /rooms). Rooms are returned
// in full because that page draws a tile per room and derives its own totals
// from them; complaints and visitors are trimmed to what's actually shown
// plus the counts the stat cards need, rather than shipping both collections
// whole. Admins are allowed too — they can open the warden dashboard.
app.get('/api/warden-summary', protect, authorize('admin', 'warden'), async (req, res) => {
  try {
    const Room      = require('./models/Room');
    const Complaint = require('./models/Complaint');
    const { Visitor } = require('./models/Other');

    const [rooms, recentComplaints, openComplaints, visitorQueue, pendingVisitors] = await Promise.all([
      // Only the fields the tile grid and the block-occupancy bars read. In
      // particular the residents are NOT populated here: this page never
      // shows them, so sending each room's occupants (with their email and
      // phone) would be both the bulk of the payload and needless exposure
      // of student contact details.
      Room.find().select('number block type status capacity occupied'),
      Complaint.find().populate('student', 'name rollNo room').sort({ createdAt: -1 }).limit(5),
      Complaint.countDocuments({ status: { $ne: 'Resolved' } }),
      Visitor.find().populate('student', 'name room block').sort({ createdAt: -1 }).limit(4),
      Visitor.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: { rooms, recentComplaints, openComplaints, visitorQueue, pendingVisitors },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Backs the sidebar/bell notification badges for every role, replacing the
// three polled requests (/announcements, /complaints, /room-change-requests)
// that ran every minute on every page. The pending-only filtering now happens
// in the database instead of after downloading both collections whole.
// Capped at 50 per category: the badge maxes out at "9+" anyway, so a larger
// list would only add payload nobody reads.
app.get('/api/notifications-summary', protect, async (req, res) => {
  try {
    const Complaint = require('./models/Complaint');
    const { Announcement } = require('./models/Other');
    const isStaff = ['admin', 'warden'].includes(req.user.role);

    const [announcements, complaints, roomRequests] = await Promise.all([
      Announcement.find().select('title content priority createdAt').sort({ createdAt: -1 }).limit(50),
      isStaff
        ? Complaint.find({ status: 'Pending' }).populate('student', 'name').select('title room student createdAt').sort({ createdAt: -1 }).limit(50)
        : Promise.resolve([]),
      isStaff
        ? RoomChangeRequest.find({ status: 'pending' }).populate('student', 'name').select('preferredBlock student createdAt').sort({ createdAt: -1 }).limit(50)
        : Promise.resolve([]),
    ]);

    res.json({ success: true, data: { announcements, complaints, roomRequests } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// One request for the student dashboard, replacing the three it used to fire
// (/complaints, /announcements, /attendance) — the latter two were each
// downloading a whole collection just to show the top 3 or derive one
// percentage. Scoped to authorize('student') since this is the student's own
// dashboard; admins/wardens never route here.
app.get('/api/student-summary', protect, authorize('student'), async (req, res) => {
  try {
    const Complaint = require('./models/Complaint');
    const { Announcement, Attendance } = require('./models/Other');

    const [complaints, announcements, attendanceRows] = await Promise.all([
      Complaint.find({ student: req.user._id }).select('title status createdAt').sort({ createdAt: -1 }).limit(3),
      Announcement.find().select('title createdAt').sort({ pinned: -1, createdAt: -1 }).limit(3),
      Attendance.aggregate([
        { $match: { student: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const attMap = attendanceRows.reduce((a, r) => ({ ...a, [r._id]: r.count }), {});
    const attendanceTotal = attendanceRows.reduce((sum, r) => sum + r.count, 0);
    const attendancePct = attendanceTotal > 0 ? Math.round(((attMap.present || 0) / attendanceTotal) * 100) : null;

    res.json({ success: true, data: { complaints, announcements, attendancePct } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Invoked by Vercel Cron (see the `crons` entry in vercel.json) once a day
// to send fee due-date reminder emails — deliberately NOT behind `protect`,
// since a scheduled job has no logged-in user/JWT to send. Vercel attaches
// `Authorization: Bearer $CRON_SECRET` automatically to its own cron
// requests once CRON_SECRET is set as an env var on the project; checking it
// here is what stops anyone else who finds this URL from triggering mail
// sends for free. Same underlying job as the admin's manual "Send Due
// Reminders" button (POST /api/fees/send-reminders) — see
// utils/feeReminders.js for the actual logic, shared so the two triggers
// can never drift apart.
app.post('/api/cron/fee-reminders', async (req, res) => {
  try {
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { sendFeeReminders } = require('./utils/feeReminders');
    const result = await sendFeeReminders();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Escapes regex metacharacters in user-supplied search text so it can't be
// used to build an invalid or catastrophically slow regular expression.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/search', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ success: true, data: { students: [], rooms: [], complaints: [], announcements: [] } });
    }
    const rx = new RegExp(escapeRegex(q), 'i');
    const User = require('./models/User');
    const Room = require('./models/Room');
    const Complaint = require('./models/Complaint');
    const { Announcement } = require('./models/Other');
    const role = req.user.role;

    const [students, rooms, complaints, announcements] = await Promise.all([
      role === 'admin'
        ? User.find({ role: 'student', $or: [{ name: rx }, { rollNo: rx }, { email: rx }] }).select('name rollNo room block').limit(5)
        : Promise.resolve([]),
      ['admin', 'warden'].includes(role)
        ? Room.find({ number: rx }).select('number block status').limit(5)
        : Promise.resolve([]),
      Complaint.find({ title: rx, ...(role === 'student' ? { student: req.user._id } : {}) }).select('title status').limit(5),
      Announcement.find({ title: rx }).select('title category').limit(5),
    ]);

    res.json({ success: true, data: { students, rooms, complaints, announcements } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/activity', protect, authorize('admin', 'warden'), async (req, res) => {
  try {
    const ActivityLog = require('./models/ActivityLog');
    const activities = await ActivityLog.find().populate('by', 'name role').sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV,
    dbConnected: mongoose.connection.readyState === 1,
  });
});

app.get('/api/room-change-requests/my', protect, async (req, res) => {
  try {
    const requests = await RoomChangeRequest.find({ student: req.user._id })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/room-change-requests', protect, async (req, res) => {
  try {
    const user = req.user;
    const request = await RoomChangeRequest.create({
      student:        user._id,
      currentRoom:    user.room  || 'Not assigned',
      currentBlock:   user.block || '',
      preferredBlock: req.body.preferredBlock,
      reason:         req.body.reason,
      details:        req.body.details || '',
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/room-change-requests', protect, authorize('admin','warden'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await RoomChangeRequest.find(filter)
      .populate('student', 'name rollNo room block email phone')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/room-change-requests/:id', protect, authorize('admin','warden'), async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    const request = await RoomChangeRequest.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote: reviewNote||'', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('student', 'name rollNo room');
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

if (isMainModule) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API Base: http://localhost:${PORT}/api\n`);
  });
}

module.exports = app;