const mongoose = require('mongoose');

const RoomChangeRequestSchema = new mongoose.Schema({
  student:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentRoom:    { type: String, required: true },
  currentBlock:   { type: String },
  preferredBlock: { type: String, required: true },
  reason:         { type: String, required: true },
  details:        { type: String },
  status:         { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote:     { type: String },
  reviewedAt:     { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('RoomChangeRequest', RoomChangeRequestSchema);