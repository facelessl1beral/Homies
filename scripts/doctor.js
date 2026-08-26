#!/usr/bin/env node
/**
 * Homies doctor — environment and data diagnostic.
 *
 *   npm run doctor
 *
 * Answers the questions that are slow and error-prone to check by clicking
 * through the UI:
 *
 *   - Is my environment configured, and which values are missing?
 *   - Which backend will the frontend actually talk to?
 *   - Can I reach the database, and what is in it?
 *   - Given the real data, will the Discover feed have cards in it?
 *
 * That last one is the point. The dealbreaker bug presented as an empty feed,
 * which is indistinguishable from "there are no other users yet" when you are
 * looking at a browser. This runs the real matching engine over the real
 * database and reports, per student, how many candidates survive. An empty
 * feed and an empty database are different problems and this tells them apart.
 *
 * Read-only. It never writes to the database.
 *
 * Uses only dependencies the project already has.
 */

require('dotenv').config({ override: false });

const fs = require('fs');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

let problems = 0;
let warnings = 0;

const heading = t => console.log(`\n${C.bold}${C.cyan}${t}${C.reset}`);
const ok      = m => console.log(`  ${C.green}✓${C.reset} ${m}`);
const warn    = m => { warnings++; console.log(`  ${C.yellow}!${C.reset} ${m}`); };
const fail    = m => { problems++;  console.log(`  ${C.red}✗${C.reset} ${m}`); };
const note    = m => console.log(`    ${C.dim}${m}${C.reset}`);

// ---------------------------------------------------------------------------

function checkRuntime() {
  heading('Runtime');
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) ok(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node} — this project needs 18 or newer`);

  const pinned = path.join(__dirname, '..', '.node-version');
  if (fs.existsSync(pinned)) {
    const want = fs.readFileSync(pinned, 'utf8').trim();
    if (!process.versions.node.startsWith(want.split('.')[0])) {
      warn(`.node-version pins ${want} but you are running ${process.versions.node}`);
      note('Deployment uses the pinned version. A mismatch here can hide build failures until you deploy.');
    }
  }
}

function checkEnv() {
  heading('Environment');
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    fail('No .env file in the project root');
    note('Copy .env.example to .env and fill it in.');
    return;
  }
  ok('.env found');

  const required = {
    MONGO_URI:  'database connection — nothing works without it',
    JWT_SECRET: 'signs login tokens — login and all private routes fail without it',
  };
  const optional = {
    SMTP_HOST: 'email', SMTP_PORT: 'email', SMTP_USER: 'email', SMTP_PASS: 'email',
  };

  for (const [key, why] of Object.entries(required)) {
    if (process.env[key]) ok(`${key} is set`);
    else { fail(`${key} is missing — ${why}`); }
  }

  const missingMail = Object.keys(optional).filter(k => !process.env[k]);
  // Checking only that the keys exist reported "SMTP credentials are set" for
  // a .env still containing the literal example values, which is exactly the
  // false confidence this tool exists to prevent. Placeholders are now
  // detected and reported as unconfigured.
  const PLACEHOLDERS = [/your_?gmail/i, /change_?me/i, /^example/i, /your@/i, /^xxx/i];
  const placeholder = Object.keys(optional).filter(
    k => process.env[k] && PLACEHOLDERS.some(re => re.test(process.env[k]))
  );

  if (placeholder.length) {
    warn(`SMTP is using placeholder values (${placeholder.join(', ')})`);
    note('These came from .env.example and will be rejected by the mail server.');
    note('Email is optional — nothing else depends on it. See docs/STATUS.md.');
  } else if (missingMail.length === 0) {
    ok('SMTP credentials are set');
    note('Run `npm run check:email -- you@example.com` to confirm they actually work.');
  } else {
    warn(`SMTP not fully configured (missing: ${missingMail.join(', ')})`);
    note('Booking confirmation emails will be skipped. Everything else works.');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    warn('JWT_SECRET is short. Use a long random string.');
  }
}

function checkApiTarget() {
  heading('Which backend will the frontend use?');
  const clientDir = path.join(__dirname, '..', 'client');

  const pkg = JSON.parse(fs.readFileSync(path.join(clientDir, 'package.json'), 'utf8'));
  if (pkg.proxy) {
    fail(`client/package.json still has a "proxy" entry: ${pkg.proxy}`);
    note('The API base is now set by REACT_APP_API_URL. A leftover proxy will override it silently.');
  }

  const readEnvFile = file => {
    const p = path.join(clientDir, file);
    if (!fs.existsSync(p)) return null;
    const line = fs.readFileSync(p, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .find(l => l.startsWith('REACT_APP_API_URL='));
    return line ? line.split('=').slice(1).join('=').trim() : null;
  };

  const dev = readEnvFile('.env.development');
  if (!dev) {
    warn('client/.env.development does not set REACT_APP_API_URL');
    note('`npm start` will use relative paths and API calls will 404.');
  } else if (/localhost|127\.0\.0\.1/.test(dev)) {
    ok(`Development calls go to ${dev}`);
  } else {
    warn(`Development calls go to a REMOTE backend: ${dev}`);
    note('Local code changes to the API will appear to do nothing.');
  }

  const prod = readEnvFile('.env.production');
  if (prod) ok(`Production build would call ${prod}`);
  else {
    note('No client/.env.production — production reads REACT_APP_API_URL from the hosting platform.');
    note('Set it in Vercel / Cloudflare Pages / Render, or the deployed app will call its own origin.');
  }
}

function checkLocalServer() {
  return new Promise(resolve => {
    heading('Local API server');
    const port = process.env.PORT || 5000;
    const req = http.get({ host: '127.0.0.1', port, path: '/api/hostels/public', timeout: 2500 }, res => {
      if (res.statusCode === 200) ok(`Responding on port ${port}`);
      else warn(`Responding on port ${port} but returned HTTP ${res.statusCode}`);
      res.resume();
      resolve();
    });
    req.on('timeout', () => { req.destroy(); warn(`No response on port ${port}`); resolve(); });
    req.on('error', () => {
      warn(`Nothing listening on port ${port}`);
      note('Start it with: node server.js');
      resolve();
    });
  });
}

async function checkDatabase() {
  heading('Database');
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kyu_hostel';
  const redacted = uri.replace(/\/\/[^@]+@/, '//***:***@');

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true, useUnifiedTopology: true,
      useFindAndModify: false, useCreateIndex: true,
      serverSelectionTimeoutMS: 8000,
    });
    ok(`Connected to ${redacted}`);
  } catch (err) {
    fail(`Cannot connect to ${redacted}`);
    note(err.message);
    note('If this is localhost, check MongoDB is running. If it is Atlas, check the IP allowlist.');
    return null;
  }

  const User   = require('../models/User');
  const Hostel = require('../models/Hostel');

  const users   = await User.find().select('-password').lean();
  const hostels = await Hostel.find().lean();

  if (users.length === 0) fail('No students in the database — the feed will be empty for everyone');
  else if (users.length < 3) warn(`Only ${users.length} student(s). You need at least 3 for a convincing demo.`);
  else ok(`${users.length} students`);

  if (hostels.length === 0) warn('No hostels registered — the landing page listing and admin portal will be empty');
  else {
    const rooms = hostels.reduce((n, h) => n + (h.rooms ? h.rooms.length : 0), 0);
    ok(`${hostels.length} hostel(s), ${rooms} room(s) total`);
  }

  const { isMessageable } = require('../lib/whatsapp');
  const messageable = users.filter(u => isMessageable(u.phone));
  if (users.length) {
    if (messageable.length === 0) {
      warn('No student has a usable WhatsApp number — the admin message button will never appear');
      note('Students add one in Edit Profile. It is optional, but it is the notification channel.');
    } else if (messageable.length < users.length) {
      warn(`${messageable.length} of ${users.length} students have a usable WhatsApp number`);
    } else {
      ok('Every student has a usable WhatsApp number');
    }
  }

  const withProfile = users.filter(u => u.sleepSchedule || u.cleanliness || u.food);
  if (users.length && withProfile.length === 0) {
    warn('No student has filled in any lifestyle fields — every match score will be 0');
  }

  return users;
}

function checkFeeds(users) {
  heading('Discover feed — will anyone see cards?');
  if (!users || users.length < 2) {
    warn('Need at least 2 students to evaluate this');
    return;
  }

  const { rankCandidates } = require('../lib/matching');
  let empty = 0;

  for (const u of users) {
    const others = users.filter(o => String(o._id) !== String(u._id));
    const ranked = rankCandidates(u, others);
    const unswiped = ranked.filter(r => r.status === '-');
    const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || String(u._id);
    const top = ranked.length ? `top score ${ranked[0].score}%` : 'no candidates';

    if (unswiped.length === 0) {
      empty++;
      const why = ranked.length === 0
        ? 'all candidates removed by a dealbreaker'
        : 'has already swiped everyone';
      warn(`${name}: empty feed — ${why}`);
    } else {
      ok(`${name}: ${unswiped.length} card(s) to swipe, ${top}`);
    }
  }

  if (empty > 0 && empty === users.length) {
    fail('Every student has an empty feed. Check the dealbreaker filter in lib/matching.js.');
  }
}

async function checkMutualMatches(users) {
  heading('Mutual matches');
  if (!users || users.length < 2) return;

  const byId = new Map(users.map(u => [String(u._id), u]));
  const pairs = new Set();
  let oneSided = 0;

  for (const u of users) {
    for (const id of (u.accepted || []).map(String)) {
      const other = byId.get(id);
      if (!other) continue;
      if ((other.accepted || []).map(String).includes(String(u._id))) {
        pairs.add([String(u._id), id].sort().join('|'));
      } else oneSided++;
    }
  }

  if (pairs.size === 0) {
    warn('No mutual matches yet — the admin Matches tab will be empty');
    note('Two students must swipe right on each other AND both set the same preferredHostel.');
  } else {
    ok(`${pairs.size} mutual match(es)`);
    for (const key of pairs) {
      const [a, b] = key.split('|').map(id => byId.get(id));
      const nameOf = u => u.name || u.firstName || 'unknown';
      const sameHostel = a.preferredHostel && a.preferredHostel === b.preferredHostel;
      if (sameHostel) ok(`  ${nameOf(a)} ↔ ${nameOf(b)} — both chose ${a.preferredHostel}`);
      else warn(`  ${nameOf(a)} ↔ ${nameOf(b)} — different preferred hostels, so no admin will see this pair`);
    }
  }
  if (oneSided > 0) note(`${oneSided} one-sided like(s) pending — expected, not a problem`);
}

// ---------------------------------------------------------------------------

(async () => {
  console.log(`${C.bold}Homies doctor${C.reset} ${C.dim}— read-only diagnostic${C.reset}`);

  checkRuntime();
  checkEnv();
  checkApiTarget();
  await checkLocalServer();

  const users = await checkDatabase();
  if (users) {
    checkFeeds(users);
    await checkMutualMatches(users);
  }

  console.log('');
  if (problems > 0) {
    console.log(`${C.red}${C.bold}${problems} problem(s)${C.reset}, ${warnings} warning(s). Fix the problems first.`);
  } else if (warnings > 0) {
    console.log(`${C.yellow}${C.bold}No problems, ${warnings} warning(s).${C.reset} Read them — several are demo blockers rather than errors.`);
  } else {
    console.log(`${C.green}${C.bold}All checks passed.${C.reset}`);
  }
  console.log('');

  await mongoose.disconnect().catch(() => {});
  process.exit(problems > 0 ? 1 : 0);
})();
