const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget: a logging failure should never break the real action
// (room allocation, complaint update, etc.) that triggered it.
async function logActivity(text, type, userId) {
  try {
    await ActivityLog.create({ text, type, by: userId });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = logActivity;
