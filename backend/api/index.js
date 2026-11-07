// Vercel serverless entry point — re-exports the existing Express app.
// Vercel auto-detects this file under api/ as a Node.js Serverless Function;
// vercel.json's rewrite forwards every request path here unchanged, so the
// app's own `/api/...` route registrations keep matching as-is.
module.exports = require('../server.js');
