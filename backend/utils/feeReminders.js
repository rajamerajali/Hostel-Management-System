const { Fee } = require('../models/Other');
const { sendMail } = require('./mailer');

// Due within this many days (or already overdue) counts as reminder-eligible.
const REMINDER_WINDOW_DAYS = 3;
// Once a bill has been reminded, leave it alone for this long before it's
// eligible again — long enough that a daily cron run (or an admin clicking
// "Send Reminders" twice in a row) doesn't re-email the same person, short
// enough that a still-overdue bill gets nagged again the next day.
const COOLDOWN_HOURS = 20;

// Pure query + grouping half of the job, split out from the actual sending
// so the eligibility rules (the reminder window, the cooldown, one bucket
// per student) are unit-testable without needing Brevo configured at all.
async function findReminderEligibleFees() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);

  const eligible = await Fee.find({
    status: { $ne: 'paid' },
    dueDate: { $ne: null, $lte: windowEnd },
    $or: [{ lastReminderAt: null }, { lastReminderAt: { $lte: cooldownCutoff } }],
  }).populate('student', 'name email');

  const byStudent = new Map();
  for (const fee of eligible) {
    if (!fee.student?.email) continue; // orphaned fee (deleted student) — nothing to email
    const key = fee.student._id.toString();
    if (!byStudent.has(key)) byStudent.set(key, { student: fee.student, fees: [] });
    byStudent.get(key).fees.push(fee);
  }

  return { now, eligibleCount: eligible.length, byStudent };
}

// Shared by the admin's manual "Send Due Reminders" button (POST
// /api/fees/send-reminders) and the daily Vercel Cron (POST
// /api/cron/fee-reminders) — one email per student summarizing every bill
// of theirs that's due soon or overdue, not one email per bill, since a
// student with 3 pending fees shouldn't get 3 separate emails. Only checked
// for actually-configured email once there's at least one reminder to send
// — an empty run should never fail just because Brevo isn't set up yet.
async function sendFeeReminders() {
  const { now, eligibleCount, byStudent } = await findReminderEligibleFees();
  if (byStudent.size === 0) {
    return { studentsEmailed: 0, studentsFailed: 0, feesReminded: eligibleCount };
  }

  if (!process.env.BREVO_SMTP_KEY || !process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SENDER_EMAIL) {
    throw new Error('Email service not configured (BREVO_SMTP_KEY / BREVO_SMTP_LOGIN / BREVO_SENDER_EMAIL)');
  }

  let studentsEmailed = 0;
  let failed = 0;
  for (const { student, fees } of byStudent.values()) {
    const total = fees.reduce((sum, f) => sum + f.amount, 0);
    const rows = fees.map((f) => {
      const overdue = f.dueDate < now;
      const statusLabel = overdue ? 'Overdue' : `Due ${f.dueDate.toLocaleDateString('en-GB')}`;
      const statusColor = overdue ? '#fc8181' : '#f6c35a';
      return `<tr>
        <td style="padding:8px 12px;color:#e2e8f0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.08);">${f.type} — ${f.month} ${f.year}</td>
        <td style="padding:8px 12px;color:#e2e8f0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.08);">Rs ${f.amount.toLocaleString('en-IN')}</td>
        <td style="padding:8px 12px;color:${statusColor};font-size:12px;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.08);">${statusLabel}</td>
      </tr>`;
    }).join('');

    const mailOptions = {
      from: `"SmartHostel ERP" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: student.email,
      subject: `Fee Payment Reminder — Rs ${total.toLocaleString('en-IN')} due`,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;background:#0a0a1a;padding:24px;">
          <div style="max-width:480px;margin:0 auto;background:rgba(8,18,42,0.95);border:1px solid rgba(99,179,237,0.2);border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#f6c35a,#fc8181);padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🏠 SmartHostel ERP</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Fee Payment Reminder</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#e2e8f0;font-size:15px;">Hello <b>${student.name}</b>,</p>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
                You have ${fees.length} pending fee bill${fees.length === 1 ? '' : 's'} totalling
                <b style="color:#f6c35a;">Rs ${total.toLocaleString('en-IN')}</b>:
              </p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <thead>
                  <tr style="background:rgba(255,255,255,0.05);">
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;">Bill</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;">Amount</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;">Status</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <p style="font-size:12px;color:#94a3b8;">Please pay at your earliest convenience through the SmartHostel portal.</p>
            </div>
          </div>
        </div>`,
    };

    try {
      await sendMail(mailOptions);
      await Fee.updateMany({ _id: { $in: fees.map((f) => f._id) } }, { lastReminderAt: now });
      studentsEmailed++;
    } catch (err) {
      // Left without lastReminderAt so it's retried on the next run instead
      // of silently going un-reminded.
      console.error(`[fee-reminders] Failed to email ${student.email}:`, err.message);
      failed++;
    }
  }

  return { studentsEmailed, studentsFailed: failed, feesReminded: eligibleCount };
}

module.exports = { sendFeeReminders, findReminderEligibleFees };
