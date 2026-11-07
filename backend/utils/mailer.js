const nodemailer = require('nodemailer');

// Shared Brevo SMTP transporter — originally lived inline in routes/auth.js
// for the password-reset OTP email; extracted here so the fee due-date
// reminder job (and anything else that needs to send mail later) reuses the
// same connection setup instead of duplicating it.
if (!process.env.BREVO_SMTP_KEY || !process.env.BREVO_SMTP_LOGIN) {
  console.error('❌ CRITICAL: BREVO_SMTP_KEY / BREVO_SMTP_LOGIN environment variables are not both set!');
  console.error('   Email-sending endpoints will fail. Please set both in your environment.');
  console.error('   Find them at: https://app.brevo.com/settings/keys/smtp (Login + generated SMTP key)');
}

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    // Brevo's SMTP login is the account login shown on the same page the key
    // was generated (usually your Brevo account email) — NOT the literal
    // string "apikey" (that's SendGrid's convention, not Brevo's).
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY,
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

// Skipped in tests (would open a real connection to Brevo on every test run)
// and skipped on Vercel (this module reloads on every cold start there, so
// an eager verify would add a Brevo round-trip to every cold invocation,
// not just once per process like on Render) — real send failures are still
// logged by sendMail() below when something is actually sent.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Nodemailer SMTP Connection Failed:', error.message);
      console.error('   Host: smtp-relay.brevo.com, Port: 587');
      console.error('   Check BREVO_SMTP_KEY at: https://app.brevo.com/settings/keys/smtp');
    } else {
      console.log('✅ Nodemailer SMTP Connection Verified - Ready to send emails via Brevo');
    }
  });
}

// Races the actual send against a 15s timeout — Render/Vercel's free tiers
// can otherwise hang on a stalled SMTP connection well past what a caller
// (an HTTP request, or a cron run with its own duration cap) can afford to
// wait.
async function sendMail(mailOptions) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
  );
  return Promise.race([transporter.sendMail(mailOptions), timeoutPromise]);
}

module.exports = { transporter, sendMail };
