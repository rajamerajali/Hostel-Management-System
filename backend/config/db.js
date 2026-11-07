const mongoose = require('mongoose');

// Cached on `global` so a warm serverless container (Vercel) reuses the same
// connection across invocations instead of reconnecting (and exhausting
// Atlas's connection limit) on every request.
let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI).then((m) => {
      console.log(`✅ MongoDB Connected: ${m.connection.host}`);
      return m;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`❌ MongoDB Error: ${error.message}`);
    throw error;
  }
  return cached.conn;
};

module.exports = connectDB;
