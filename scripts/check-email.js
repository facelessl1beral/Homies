#!/usr/bin/env node
/**
 * Email delivery check.
 *
 *   npm run check:email -- you@example.com
 *
 * Sends one real message through the configured SMTP transport and reports
 * what happened in enough detail to act on.
 *
 * This exists because email is the one part of the system that unit tests
 * cannot cover. `sendBookingEmails` in routes/api/hostels.js catches its own
 * errors by design — a failed notification must never roll back a booking
 * that has already been written — which means a misconfigured SMTP account
 * fails silently, logging a warning nobody is watching. The first time you
 * would otherwise discover it is when a student says they never got their
 * room confirmation.
 *
 * Three separate things can be wrong and they need different fixes:
 *
 *   1. Configuration missing   — no SMTP_* values in .env
 *   2. Authentication rejected — wrong password, or a Google account password
 *                                used where an App Password is required
 *   3. Accepted but undelivered — the server took it and it landed in spam,
 *                                or was silently dropped
 *
 * Only case 3 requires actually looking in an inbox, which is why this sends
 * a real message rather than only verifying the connection.
 */

require('dotenv').config({ override: false });
const nodemailer = require('nodemailer');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok   = m => console.log(`  ${C.green}✓${C.reset} ${m}`);
const fail = m => console.log(`  ${C.red}✗${C.reset} ${m}`);
const warn = m => console.log(`  ${C.yellow}!${C.reset} ${m}`);
const note = m => console.log(`    ${C.dim}${m}${C.reset}`);

const recipient = process.argv[2] || process.env.SMTP_USER;

(async () => {
  console.log(`${C.bold}Email delivery check${C.reset}\n`);

  // --- 1. Configuration ----------------------------------------------------
  console.log(`${C.bold}${C.cyan}Configuration${C.reset}`);
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(k => !process.env[k]);

  if (missing.length) {
    fail(`Missing: ${missing.join(', ')}`);
    note('Booking confirmations will be skipped. The booking itself still succeeds.');
    note('Add these to .env — see .env.example.');
    process.exit(1);
  }
  ok(`${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${process.env.SMTP_USER}`);

  const port = Number(process.env.SMTP_PORT);
  if (![25, 465, 587, 2525].includes(port)) {
    warn(`Port ${port} is unusual. Gmail uses 587 (STARTTLS) or 465 (TLS).`);
  }

  // A Google account password is 8-16 characters of anything; an App Password
  // is exactly 16 lowercase letters, often pasted with the spaces Google shows.
  if (/gmail|google/i.test(process.env.SMTP_HOST)) {
    const pass = process.env.SMTP_PASS.replace(/\s/g, '');
    if (pass.length !== 16) {
      warn('This does not look like a Gmail App Password (16 characters).');
      note('Gmail rejects account passwords for SMTP. Generate an App Password at:');
      note('Google Account -> Security -> 2-Step Verification -> App passwords');
    } else if (/\s/.test(process.env.SMTP_PASS)) {
      note('Spaces in SMTP_PASS are stripped automatically — Google displays them for readability.');
    }
  }

  if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    fail(`"${recipient}" is not a valid email address`);
    note('Usage: npm run check:email -- you@example.com');
    process.exit(1);
  }

  // --- 2. Connection and authentication ------------------------------------
  console.log(`\n${C.bold}${C.cyan}Connection${C.reset}`);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s/g, ''),
    },
  });

  try {
    await transporter.verify();
    ok('Connected and authenticated');
  } catch (err) {
    fail(`Could not authenticate: ${err.message}`);
    if (/invalid login|username and password not accepted|535/i.test(err.message)) {
      note('Credentials rejected. For Gmail this is almost always an account');
      note('password used where an App Password is required.');
    } else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(err.message)) {
      note('Could not reach the server. Check the host, the port, and whether');
      note('outbound SMTP is blocked on this network — many ISPs block port 25.');
    }
    process.exit(1);
  }

  // --- 3. Real delivery ----------------------------------------------------
  console.log(`\n${C.bold}${C.cyan}Delivery${C.reset}`);
  try {
    const info = await transporter.sendMail({
      from: `"Homies" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: 'Homies — email delivery test',
      text: 'If you are reading this, Homies can send email from this account.',
      html: `
        <h2 style="font-family:system-ui,sans-serif">Homies email is working</h2>
        <p style="font-family:system-ui,sans-serif">
          This is an automated test from <code>npm run check:email</code>.
          If you received it, booking confirmation emails will reach students.
        </p>
        <p style="font-family:system-ui,sans-serif;color:#888;font-size:0.85rem">
          Sent ${new Date().toISOString()} from ${process.env.SMTP_HOST}
        </p>`,
    });
    ok(`Accepted for delivery to ${recipient}`);
    note(`Message id: ${info.messageId}`);
    if (info.rejected && info.rejected.length) {
      warn(`Rejected: ${info.rejected.join(', ')}`);
    }
  } catch (err) {
    fail(`Send failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n${C.green}${C.bold}SMTP is working.${C.reset}`);
  console.log(`${C.dim}Now check the inbox for ${recipient}. "Accepted for delivery" means the`);
  console.log(`server took the message — it does not prove it reached the inbox rather`);
  console.log(`than a spam folder. Check spam too, and mark it as not spam if it landed`);
  console.log(`there, or students will lose their booking confirmations the same way.${C.reset}\n`);

  process.exit(0);
})();
