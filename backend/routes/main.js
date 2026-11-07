// This is main.js

const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');
const { PASSWORD_REGEX, PASSWORD_HINT } = require('../utils/validators');
const logActivity = require('../utils/activityLog');

// ── USERS ROUTER ─────────────────────────────────────────
const usersRouter = express.Router();
usersRouter.use(protect);

usersRouter.get('/', authorize('admin', 'warden'), async (req, res) => {
  try {
    const { role, block, feeStatus } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (block) filter.block = block;
    if (feeStatus) filter.feeStatus = feeStatus;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin-only account creation — the only way to create a warden or another
// admin (public /auth/register is student-only). Does not return a token:
// the admin isn't logging in as the new user.
usersRouter.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, role, rollNo, branch, year, room } = req.body;
    if (!['admin', 'warden', 'student'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    if (!password || !PASSWORD_REGEX.test(password))
      return res.status(400).json({ success: false, message: PASSWORD_HINT });
    const user = await User.create({ name, email, password, phone, role, rollNo, branch, year, room });
    res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered' });
    res.status(400).json({ success: false, message: err.message });
  }
});

usersRouter.get('/:id', async (req, res) => {
  try {
    const isSelf = req.params.id === req.user._id.toString();
    if (!isSelf && !['admin', 'warden'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

usersRouter.put('/:id', async (req, res) => {
  try {
    const isSelf = req.params.id === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    // Password changes always go through PUT /auth/change-password instead —
    // findByIdAndUpdate skips the pre('save') hash hook, so a raw password
    // here would be stored in plain text.
    let { password, ...update } = req.body;
    // Nobody edits their own login email through self-service profile editing
    // (an admin editing a *different* user's record may still change it).
    if (isSelf) delete update.email;
    if (!isAdmin) {
      // Non-admins may edit their own basic profile fields, but never their
      // own privilege/status fields.
      const { role, isActive, feeStatus, attendance, ...safeFields } = update;
      update = safeFields;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Email already registered' });
    res.status(400).json({ success: false, message: err.message });
  }
});

usersRouter.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── ROOMS ROUTER ─────────────────────────────────────────
const roomsRouter = express.Router();
roomsRouter.use(protect);

roomsRouter.get('/', async (req, res) => {
  try {
    const { block, status, type } = req.query;
    const filter = {};
    if (block) filter.block = block;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const rooms = await Room.find(filter).populate('students', 'name rollNo email phone');
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

roomsRouter.post('/', authorize('admin', 'warden'), async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Bulk-create real rooms (e.g. from the admin's "Generate Rooms" form) —
// still goes through the real Room collection, not a fixture; duplicate
// room numbers are skipped rather than failing the whole batch.
roomsRouter.post('/bulk', authorize('admin', 'warden'), async (req, res) => {
  try {
    const { rooms } = req.body;
    if (!Array.isArray(rooms) || rooms.length === 0)
      return res.status(400).json({ success: false, message: 'rooms array is required' });
    try {
      const created = await Room.insertMany(rooms, { ordered: false });
      res.status(201).json({ success: true, count: created.length, data: created });
    } catch (bulkErr) {
      const inserted = bulkErr.insertedDocs || bulkErr.results || [];
      if (inserted.length > 0) {
        return res.status(201).json({
          success: true, count: inserted.length, data: inserted,
          message: `${inserted.length} of ${rooms.length} rooms created (some room numbers already existed).`,
        });
      }
      throw bulkErr;
    }
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

roomsRouter.put('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: room });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Allocate student to room
roomsRouter.post('/:id/allocate', authorize('admin', 'warden'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status === 'maintenance')
      return res.status(400).json({ success: false, message: 'Room is under maintenance' });
    if (room.occupied >= room.capacity)
      return res.status(400).json({ success: false, message: 'Room is full' });

    // Agar student ka pehle se koi room hai to usse remove karo
    const student = await User.findById(studentId);
    if (student?.room) {
      await Room.findOneAndUpdate(
        { number: student.room },
        { $pull: { students: studentId }, $inc: { occupied: -1 }, status: 'available' }
      );
    }

    room.students.push(studentId);
    room.occupied += 1;
    room.status = room.occupied >= room.capacity ? 'occupied' : 'available';
    await room.save();
    await User.findByIdAndUpdate(studentId, { room: room.number, block: room.block });
    await logActivity(`Room ${room.number} allocated to ${student?.name || 'a student'}`, 'room', req.user._id);
    res.json({ success: true, data: room });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

roomsRouter.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── COMPLAINTS ROUTER ─────────────────────────────────────
const complaintsRouter = express.Router();
complaintsRouter.use(protect);

complaintsRouter.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.student = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    const complaints = await Complaint.find(filter)
      .populate('student', 'name rollNo room avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

complaintsRouter.post('/', async (req, res) => {
  try {
    const user = req.user;
    const complaint = await Complaint.create({
      ...req.body,
      student: user._id,
      room: req.body.room || user.room,
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

complaintsRouter.put('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    const update = req.body;
    if (update.status === 'Resolved') update.resolvedAt = new Date();
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('student', 'name rollNo');
    if (update.status) {
      await logActivity(`Complaint "${complaint.title}" marked ${update.status}`, 'complaint', req.user._id);
    }
    res.json({ success: true, data: complaint });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

complaintsRouter.delete('/:id', authorize('admin', 'warden'), async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = { usersRouter, roomsRouter, complaintsRouter };
