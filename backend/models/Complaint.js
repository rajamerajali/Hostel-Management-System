const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room:       { type: String, default: 'Not Assigned' },
  title:      { type: String, required: true },
  description:{ type: String, required: true },
  category:   { type: String, enum: ['Plumbing','Electrical','IT','Maintenance','Food','Appliances','Other'], default: 'Other' },
  priority:   { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  status:     { type: String, enum: ['Pending','In Progress','Resolved','Escalated'], default: 'Pending' },
  resolvedAt: { type: Date },
  remarks:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', ComplaintSchema);