// This is Otp.js
// Persists password-reset OTPs in MongoDB instead of an in-process Map, so
// they survive server restarts and work across multiple server instances.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const OtpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  otpHash:   { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts:  { type: Number, default: 0 },
}, { timestamps: true });

// TTL index: MongoDB auto-deletes the document once expiresAt passes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OtpSchema.statics.issue = async function (email, otp, ttlMs) {
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + ttlMs);
  await this.findOneAndUpdate(
    { email },
    { otpHash, expiresAt, attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const MAX_OTP_ATTEMPTS = 5;

OtpSchema.statics.verify = async function (email, otp) {
  const record = await this.findOne({ email });
  if (!record) return false;
  if (record.expiresAt.getTime() < Date.now() || record.attempts >= MAX_OTP_ATTEMPTS) {
    await record.deleteOne();
    return false;
  }
  const ok = await bcrypt.compare(otp, record.otpHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    return false;
  }
  return true;
};

OtpSchema.statics.clear = function (email) {
  return this.deleteOne({ email });
};

module.exports = mongoose.model('Otp', OtpSchema);
