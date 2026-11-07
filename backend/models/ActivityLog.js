const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['room', 'complaint', 'fee', 'visitor', 'announcement'], required: true },
  by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
