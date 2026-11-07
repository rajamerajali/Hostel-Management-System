# Quick Reference: Render + Nodemailer IPv6 Fix

## What Was Fixed

**Problem:** Render.com free tier can't reach Gmail SMTP over IPv6, causing emails to hang/timeout

**Solution:** Custom IPv4-only DNS lookup + comprehensive error logging + timeout protection

---

## Deployment Steps (Copy-Paste)

### 1. Ensure Environment Variables in Render Dashboard

```
GMAIL_USER = your-email@gmail.com
GMAIL_PASS = xxxx xxxx xxxx xxxx  (16-char App Password from myaccount.google.com/apppasswords)
NODE_ENV = production
```

### 2. Push Your Code

```bash
git add backend/routes/auth.js
git commit -m "Fix: IPv4-only Nodemailer config for Render"
git push origin main
```

### 3. Redeploy on Render

- Render auto-deploys if using GitHub integration, OR
- Click "Deploy" in Render dashboard

### 4. Watch Logs

Visit Render dashboard → **Logs** and look for:

✅ **Success:** 
```
✅ Nodemailer SMTP Connection Verified - Ready to send emails
```

❌ **Failure:**
```
❌ Nodemailer SMTP Connection Failed: Invalid login...
```
→ Fix your GMAIL_PASS

---

## Test It

```bash
curl -X POST https://YOUR-BACKEND.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test@example.com"}'
```

Watch the logs in real-time. You'll see detailed step-by-step output.

---

## Key Code Changes

### Before
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family: 4,  // Not enough! Node could still try IPv6
  auth: { ... }
});
```

### After
```javascript
// Custom lookup to FORCE IPv4
const ipv4OnlyLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { family: 4, all: false }, callback);
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  lookup: ipv4OnlyLookup,  // ← KEY FIX
  family: 4,               // ← Fallback
  connectionTimeout: 10000,  // ← Prevent hangs
  socketTimeout: 10000,      // ← Prevent hangs
  auth: { ... }
});

// Verify on startup
transporter.verify((error, success) => {
  if (error) console.error('❌ Connection Failed:', error.message);
  else console.log('✅ Connection Verified');
});
```

### Before (forgot-password)
```javascript
await transporter.sendMail({ ... });
res.json({ success: true, message: 'OTP sent' });
```

### After (forgot-password)
```javascript
try {
  // Validate env vars
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ message: 'Email service not configured' });
  }

  console.log(`[forgot-password] Starting email send to: ${email}`);
  
  // Send with timeout protection
  const sendMailPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout after 15s')), 15000)
  );
  
  const result = await Promise.race([sendMailPromise, timeoutPromise]);
  
  console.log(`✅ Email sent to ${email}`);
  res.json({ success: true, message: 'OTP sent' });
  
} catch (emailError) {
  // Detailed error logging
  console.error(`❌ Email failed:`, emailError.message);
  
  if (emailError.code === 'ENETUNREACH') {
    console.error('   ↳ IPv6 issue (should be fixed now)');
  } else if (emailError.code === 'ECONNREFUSED') {
    console.error('   ↳ Check GMAIL_USER & GMAIL_PASS');
  } else if (emailError.message.includes('timeout')) {
    console.error('   ↳ Network timeout (Render overloaded?)');
  }
  
  res.status(500).json({ message: 'Failed to send OTP' });
}
```

---

## Logs You'll See

### Startup
```
✅ Nodemailer SMTP Connection Verified - Ready to send emails
```

### When Email is Sent
```
[forgot-password] Looking up user with email: test@example.com
[forgot-password] User found: John Doe (507f1f77bcf86cd799439011)
[forgot-password] OTP generated for test@example.com: 523891 (expires in 10 min)
[forgot-password] Starting email send to: test@example.com
[forgot-password] From: your-email@gmail.com
[forgot-password] SMTP Host: smtp.gmail.com:587 (IPv4-only via custom lookup)
✅ [forgot-password] Email sent successfully to: test@example.com
   Response ID: 250 2.0.0 OK
   Message ID: <abc123@google.com>
```

### If Error
```
❌ [forgot-password] Email sending failed for: test@example.com
   Error Type: ECONNREFUSED
   Error Message: connect ECONNREFUSED
   ↳ Connection Refused: SMTP server rejected the connection
   ↳ Check credentials: GMAIL_USER and GMAIL_PASS
```

---

## If Still Not Working

1. **Check Render logs** — what's the exact error?
2. **Check GMAIL_PASS** — is it the 16-char App Password (not your Gmail password)?
3. **Try locally** — `npm start` on your machine, test /forgot-password endpoint
4. **Switch to Mailgun** — more reliable than Gmail SMTP (see RENDER_NODEMAILER_FIX.md)

---

## Files Modified

- ✅ `backend/routes/auth.js` — Updated transporter config + forgot-password route
- 📄 `RENDER_NODEMAILER_FIX.md` — Full documentation (read this for details)

Done! 🚀
