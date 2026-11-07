const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  number:   { type: String, required: true, unique: true },
  block:    { type: String, required: true, enum: ['A','B','C','D'] },
  floor:    { type: Number, required: true },
  type:     { type: String, enum: ['Single','Double','Triple'], default: 'Double' },
  capacity: { type: Number, default: 2 },
  occupied: { type: Number, default: 0 },
  status:   { type: String, enum: ['available','occupied','maintenance'], default: 'available' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  amenities:{ type: [String], default: ['WiFi'] },
  rent:     { type: Number, default: 7000 },
}, { timestamps: true });

RoomSchema.virtual('isFull').get(function () {
  return this.occupied >= this.capacity;
});

module.exports = mongoose.model('Room', RoomSchema);
