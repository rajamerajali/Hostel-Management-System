const mongoose = require('mongoose');

// ── Visitor ──────────────────────────────────────────────
const VisitorSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  phone:    { type: String },
  purpose:  { type: String, required: true },
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room:     { type: String },
  entryTime:{ type: Date },
  exitTime: { type: Date },
  status:   { type: String, enum: ['pending','inside','completed','denied'], default: 'pending' },
  approvedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Fee ──────────────────────────────────────────────────
const FeeSchema = new mongoose.Schema({
  student:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:     { type: String, required: true },
  year:      { type: Number, required: true },
  amount:    { type: Number, required: true },
  type:      { type: String, enum: ['Semester','Mess','Maintenance','Late Fine'], default: 'Semester' },
  status:    { type: String, enum: ['paid','pending','partial'], default: 'pending' },
  paidAt:    { type: Date },
  dueDate:   { type: Date },
  transactionId: { type: String },
  // Set by utils/feeReminders.js whenever a reminder email actually goes out
  // for this bill — lets the reminder job skip anyone already reminded
  // recently instead of re-emailing every time it runs (manually or via the
  // daily Vercel Cron).
  lastReminderAt: { type: Date },
}, { timestamps: true });

// ── Announcement ─────────────────────────────────────────
const AnnouncementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  content:  { type: String, required: true },
  category: { type: String, enum: ['Event','Finance','Mess','Rules','General'], default: 'General' },
  priority: { type: String, enum: ['normal','high','urgent'], default: 'normal' },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pinned:   { type: Boolean, default: false },
  audience: { type: String, enum: ['all','student','warden'], default: 'all' },
}, { timestamps: true });

// ── Attendance ───────────────────────────────────────────
const AttendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:    { type: String, required: true },        // "YYYY-MM-DD"
  status:  { type: String, enum: ['present','absent','leave'], default: 'absent' },
  markedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = {
  Visitor:     mongoose.model('Visitor', VisitorSchema),
  Fee:         mongoose.model('Fee', FeeSchema),
  Announcement:mongoose.model('Announcement', AnnouncementSchema),
  Attendance:  mongoose.model('Attendance', AttendanceSchema),
};
