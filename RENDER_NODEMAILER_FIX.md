# Render.com + Nodemailer IPv6 Fix Guide

## Problem Analysis

**Root Cause:** Render.com's free tier instances have limited or no support for outbound IPv6 connections. When Node.js tries to resolve `smtp.gmail.com`, it may receive both IPv4 and IPv6 addresses, and Nodemailer was attempting to connect via IPv6 first, which would hang/timeout due to network unreachability.

**Original Error:**
```
connect ENETUNREACH 2607:f8b0:400e:c08::587 - Local (:::0)
```
This `2607:...` is an IPv6 address that Render cannot reach.

---

## Fixes Applied to `backend/routes/auth.js`

### 1. **Custom IPv4-Only DNS Lookup Function** ⭐ PRIMARY FIX

```javascript
const ipv4OnlyLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { family: 4, all: false }, callback);
};
```

**Why This Works:**
- `family: 4` forces **only IPv4** addresses to be returned from DNS
- `all: false` returns only the first IPv4 address (don't return all addresses, which could include IPv6)
- This is passed to Nodemailer's `lookup` option, ensuring it ONLY attempts IPv4 connections
- More reliable than just setting `family: 4` in the transporter config

**Difference from Before:**
- ❌ Before: `family: 4` was set, but Nodemailer could still attempt IPv6 if Node decided to try both
- ✅ Now: Custom `lookup` function guarantees only IPv4 is used

---

### 2. **Enhanced Nodemailer Transporter Configuration**

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  
  // IPv4-only settings
  lookup: ipv4OnlyLookup,      // Custom lookup function
  family: 4,                    // Fallback
  
  // Connection timeout settings (CRITICAL for Render)
  connectionTimeout: 10000,     // 10 seconds
  socketTimeout: 10000,         // 10 seconds
  
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});
```

**Key Improvements:**
- **`lookup: ipv4OnlyLookup`** — Forces IPv4 DNS resolution
- **`connectionTimeout: 10000`** — Don't wait more than 10 seconds to connect
  - Render's free tier can be slow; this prevents indefinite hangs
  - Original: no explicit timeout (Node's default is 2+ minutes)
- **`socketTimeout: 10000`** — Don't wait more than 10 seconds for socket operations
- Port 587 with `secure: false` (STARTTLS) is more compatible than 465 on Render

---

### 3. **Transporter Verification on Startup**

```javascript
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer SMTP Connection Failed:', error.message);
  } else {
    console.log('✅ Nodemailer SMTP Connection Verified - Ready to send emails');
  }
});
```

**Benefits:**
- Runs when your Express server starts
- **Immediately catches configuration issues** (bad credentials, network unreachable)
- You'll see `❌ Failed` in Render logs at startup if credentials are wrong
- No more guessing why emails fail after deployment

---

### 4. **Comprehensive Error Logging in forgot-password Route**

The route now logs **every step** and **every error type**:

```javascript
// Before sending:
console.log(`[forgot-password] Starting email send to: ${email}`);
console.log(`[forgot-password] From: ${process.env.GMAIL_USER}`);
console.log(`[forgot-password] SMTP Host: smtp.gmail.com:587 (IPv4-only via custom lookup)`);

// After sending:
console.log(`✅ [forgot-password] Email sent successfully to: ${email}`);
console.log(`   Response ID: ${result.response}`);
console.log(`   Message ID: ${result.messageId}`);

// On error:
console.error(`❌ [forgot-password] Email sending failed for: ${email}`);
console.error(`   Error Type: ${emailError.code || emailError.name || 'Unknown'}`);
console.error(`   Error Message: ${emailError.message}`);
```

**Specific Error Code Handling:**

| Error Code | Meaning | Action |
|-----------|---------|--------|
| `ENETUNREACH` | IPv6 connectivity issue | Custom lookup should now prevent this |
| `ECONNREFUSED` | SMTP server rejected connection | Check GMAIL_USER & GMAIL_PASS |
| `ENOTFOUND` | DNS resolution failed | Check internet connectivity |
| `ESOCKET` | Connection lost/hung up | Timeout settings catch this |
| `*timeout*` | Operation took too long | Render free tier resource limit |

---

### 5. **Timeout Protection with Promise.race()**

```javascript
const sendMailPromise = transporter.sendMail(mailOptions);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
);
const result = await Promise.race([sendMailPromise, timeoutPromise]);
```

**Why This Matters:**
- On Render, network operations can hang indefinitely
- This enforces a **15-second maximum** for email sending
- If it takes longer, you get a clear "timeout" error instead of hanging forever
- Prevent your endpoint from blocking for minutes

---

### 6. **Environment Variable Validation**

```javascript
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error('❌ CRITICAL: GMAIL_USER and/or GMAIL_PASS environment variables are not set!');
  console.error('   Forgot-password endpoint will fail. Please set these in your Render environment.');
}
```

**Benefits:**
- Fails fast at route initialization, not at first email send
- Clear error message in logs
- In forgot-password, double-checks before attempting to send:
  ```javascript
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ message: 'Email service not configured.' });
  }
  ```

---

## Deployment Checklist for Render.com

### Step 1: Verify Environment Variables

In your Render Dashboard:
1. Go to **Settings** → **Environment**
2. Confirm these are set:
   - `GMAIL_USER` = your Gmail email (e.g., `your-email@gmail.com`)
   - `GMAIL_PASS` = your App Password (NOT your regular Gmail password)
     - Generate at: https://myaccount.google.com/apppasswords
     - Select "Mail" + "Windows/Linux"
     - Copy the 16-character password

**❌ Common Mistake:**
Using your regular Gmail password instead of an App Password. Gmail rejects this for security.

### Step 2: Redeploy Backend

```bash
# In your Render dashboard:
# 1. Push to GitHub (if using auto-deploy)
# 2. Or click "Deploy" in Render dashboard
# 3. Wait for build to complete
```

### Step 3: Check Render Logs Immediately

In Render Dashboard → **Logs**:

**✅ You should see:**
```
✅ Nodemailer SMTP Connection Verified - Ready to send emails
```

**❌ If you see:**
```
❌ Nodemailer SMTP Connection Failed: Invalid login: 535-5.7.8 Username and password not accepted
```
→ Your `GMAIL_PASS` is wrong. Regenerate it.

```
❌ Nodemailer SMTP Connection Failed: connect ENETUNREACH
```
→ The IPv6 fix didn't work (unlikely with new code) or Render has network issues. Contact Render support.

### Step 4: Test the Endpoint

```bash
curl -X POST https://your-render-backend.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Watch the Render logs in real-time:**

**✅ Success logs:**
```
[forgot-password] Looking up user with email: test@example.com
[forgot-password] User found: John Doe (507f1f77bcf86cd799439011)
[forgot-password] OTP generated for test@example.com: 123456 (expires in 10 min)
[forgot-password] Starting email send to: test@example.com
[forgot-password] From: your-email@gmail.com
[forgot-password] SMTP Host: smtp.gmail.com:587 (IPv4-only via custom lookup)
✅ [forgot-password] Email sent successfully to: test@example.com
   Response ID: 250 2.0.0 OK
   Message ID: <abc123@google.com>
```

**❌ Failure logs will show specific error:**
```
❌ [forgot-password] Email sending failed for: test@example.com
   Error Type: ECONNREFUSED
   Error Message: connect ECONNREFUSED
   ↳ Connection Refused: SMTP server rejected the connection
   ↳ Check credentials: GMAIL_USER and GMAIL_PASS
```

---

## Troubleshooting

### Scenario 1: Emails Still Not Sending

**Check these in order:**

1. **Render Logs Show Error**
   - Copy the exact error message from logs
   - Follow the specific error code handler above (ECONNREFUSED, etc.)

2. **No Error in Logs** (just hangs)
   - This means the timeout protection is working
   - The request hits the 15-second timeout
   - Could indicate: network problems on Render, Gmail throttling, or Render free tier overloaded
   - Try again in 5 minutes; Render free tier has cold start issues

3. **Startup Verification Failed**
   - Look for `❌ Nodemailer SMTP Connection Failed` at startup
   - Likely cause: wrong credentials
   - Regenerate App Password at https://myaccount.google.com/apppasswords

### Scenario 2: Works Locally But Not on Render

This is classic IPv6 issue. The new custom lookup function should fix this.

**But if it persists:**
- Render might have upgraded their IPv6 support or network config
- Try alternative: Use `smtp-relay.brevo.com` (free tier, no credentials needed) instead of Gmail
  - Or Mailgun free tier
  - Or SendGrid free tier

### Scenario 3: Connection Timeouts Every Time

**Causes:**
- Render free tier is overloaded (CPU/memory limits)
- Upgrade to paid tier
- **Or** switch to a transactional email service (Mailgun, SendGrid, Brevo)
  - These are faster and more reliable than Gmail SMTP

---

## Optional: Further Optimizations

### A. Switch to Mailgun (Free Tier)

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  secure: false,
  lookup: ipv4OnlyLookup,
  family: 4,
  connectionTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
    pass: process.env.MAILGUN_API_KEY,
  },
});
```

**Pros:**
- More reliable than Gmail SMTP
- Faster
- Better logging
- Free tier: 100 emails/day

### B. Use Environment Variable with Fallback

```javascript
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' ? true : false,
  lookup: ipv4OnlyLookup,
  family: 4,
  connectionTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);
```

This lets you easily switch email providers without code changes.

---

## Summary of Changes

| Item | Before | After |
|------|--------|-------|
| DNS Resolution | `dns.setDefaultResultOrder('ipv4first')` only | + Custom `ipv4OnlyLookup` function |
| Nodemailer Options | `family: 4` only | `family: 4` + `lookup` + timeouts |
| Connection Timeout | None (indefinite) | 10 seconds |
| Socket Timeout | None (indefinite) | 10 seconds |
| Error Logging | Generic `err.message` | Specific error codes + diagnostics |
| Startup Check | None | `transporter.verify()` |
| Env Var Validation | None | Check at startup + in route |
| Request Timeout | None | 15 seconds with Promise.race() |

---

## Questions?

If emails are still not sending after these fixes:

1. **Share Render logs** — the detailed error output from the new logging
2. **Confirm GMAIL_USER and GMAIL_PASS are set** in Render environment
3. **Try a test email locally first** to ensure your Gmail app password is correct
4. **Consider switching to Mailgun/SendGrid** if Render free tier remains unreliable

Good luck! 🚀
