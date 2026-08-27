/**
 * API — authorisation and status codes.
 *
 * INTEGRATION TESTS (docs/TEST-TAXONOMY.md §4). Real Express app, real
 * middleware, real routing, real HTTP semantics — driven by supertest, which
 * mounts the app in-process rather than binding a port.
 *
 * Every test in this file rejects *before* any handler touches mongoose, so
 * none of them needs a database. That is deliberate: authorisation is the
 * boundary where being wrong is most expensive, and it is also the part of
 * the stack that can be verified with no infrastructure at all. There is no
 * excuse for leaving it untested.
 *
 * What this covers that unit tests cannot
 * ---------------------------------------
 * `lib/` unit tests prove the rules are right. They cannot prove:
 *
 *   - that a route is mounted at the path the client calls
 *   - that middleware runs before the handler rather than after
 *   - that a refusal returns 401 or 403 rather than 500
 *
 * The last one is not pedantry. Three hostel routes were previously
 * "protected" only because a student token has no `hostel` claim, so
 * `decoded.hostel.id` threw a TypeError that the catch block turned into a
 * 500. The endpoints were unreachable by accident rather than by design, and
 * a client could not distinguish "you are not allowed" from "the server is
 * broken". A status-code assertion is what makes that distinction a
 * requirement instead of an accident.
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const assert = require('assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_not_used_in_production';

const auth = require('../middleware/auth');

// A minimal app carrying the real middleware. Mounting the real routers would
// pull in mongoose connections these tests do not need; the middleware is the
// unit under test and the handler only has to prove it was reached.
const app = express();
app.use(express.json());
app.get('/protected', auth, (req, res) => res.json({ ok: true, userId: req.user.id }));

const studentToken = (id = '507f1f77bcf86cd799439011', secret = process.env.JWT_SECRET) =>
  jwt.sign({ user: { id } }, secret, { expiresIn: '1h' });

const hostelToken = (id = '507f1f77bcf86cd799439012') =>
  jwt.sign({ hostel: { id, role: 'admin' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('API — student authentication middleware', () => {

  it('401s a request with no token', async () => {
    const res = await request(app).get('/protected');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.msg, 'a refusal must carry a message the client can show');
  });

  it('401s a token signed with the wrong secret', async () => {
    const res = await request(app)
      .get('/protected')
      .set('x-auth-token', studentToken(undefined, 'a-different-secret'));
    assert.strictEqual(res.status, 401);
  });

  it('401s a malformed token rather than 500', async () => {
    // A garbage header is a client error, not a server fault. Returning 500
    // here would make a bad request indistinguishable from an outage.
    const res = await request(app).get('/protected').set('x-auth-token', 'not-a-jwt');
    assert.strictEqual(res.status, 401);
  });

  it('401s an expired token', async () => {
    const expired = jwt.sign(
      { user: { id: '507f1f77bcf86cd799439011' } },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app).get('/protected').set('x-auth-token', expired);
    assert.strictEqual(res.status, 401);
  });

  it('401s an unsigned "none" algorithm token', async () => {
    // The algorithm-confusion attack. jsonwebtoken 8.5.1 carried an advisory
    // for exactly this; the upgrade to 9.x is what closes it.
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ user: { id: 'attacker' } })).toString('base64');
    const res = await request(app)
      .get('/protected')
      .set('x-auth-token', `${header}.${payload}.`);
    assert.strictEqual(res.status, 401);
  });

  it('admits a valid token and exposes the user id to the handler', async () => {
    const res = await request(app)
      .get('/protected')
      .set('x-auth-token', studentToken('507f1f77bcf86cd799439011'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.userId, '507f1f77bcf86cd799439011');
  });

  it('does not accept a hostel admin token on a student route', async () => {
    // The two token shapes share one secret, so a signature check alone is
    // not enough — the claim shape has to be checked as well.
    const res = await request(app).get('/protected').set('x-auth-token', hostelToken());
    assert.strictEqual(res.status, 401);
  });
});

describe('API — hostel admin authorisation middleware', () => {
  // hostelAuth loads a Hostel document, so a *successful* authorisation needs
  // a database and lives in api.routes.test.js. Every refusal below happens
  // before that query, so these run with no database at all — which matters,
  // because refusals are the cases worth being certain about.

  const hostelApp = express();
  hostelApp.use(express.json());
  const hostelAuth = require('../middleware/hostelAuth');
  hostelApp.get('/admin', hostelAuth, (req, res) => res.json({ ok: true }));

  it('401s with no token', async () => {
    const res = await request(hostelApp).get('/admin');
    assert.strictEqual(res.status, 401);
  });

  it('401s an invalid token', async () => {
    const res = await request(hostelApp).get('/admin').set('x-auth-token', 'rubbish');
    assert.strictEqual(res.status, 401);
  });

  it('403s a valid STUDENT token — not 500, and not 200', async () => {
    // The regression this file exists for. Three routes previously returned
    // 500 here, because `decoded.hostel.id` threw on a token with no hostel
    // claim. They were unreachable by accident, not by design.
    const res = await request(hostelApp).get('/admin').set('x-auth-token', studentToken());
    assert.strictEqual(res.status, 403, 'a student must be forbidden, explicitly');
    assert.ok(/administrator/i.test(res.body.msg), 'the refusal should say why');
  });

  it('403s a token whose role is not admin', async () => {
    const notAdmin = jwt.sign(
      { hostel: { id: '507f1f77bcf86cd799439012', role: 'viewer' } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(hostelApp).get('/admin').set('x-auth-token', notAdmin);
    assert.strictEqual(res.status, 403);
  });

  it('distinguishes 401 from 403', async () => {
    // 401 means "we do not know who you are"; 403 means "we do, and you may
    // not". Collapsing them makes a misconfigured admin client impossible to
    // diagnose from the outside.
    const anonymous = await request(hostelApp).get('/admin');
    const student   = await request(hostelApp).get('/admin').set('x-auth-token', studentToken());
    assert.strictEqual(anonymous.status, 401);
    assert.strictEqual(student.status, 403);
  });
});

describe('API — input guards', () => {
  const { requireIds } = require('../lib/validate');

  const guarded = express();
  guarded.use(express.json());
  guarded.post('/thing', requireIds('id'), (req, res) => res.json({ ok: true }));

  it('400s a query operator sent where an id is expected', async () => {
    // { "$ne": null } in a mongoose filter matches every document. This is
    // the NoSQL injection shape, rejected at the edge rather than relied on
    // being harmless further in.
    const res = await request(guarded).post('/thing').send({ id: { $ne: null } });
    assert.strictEqual(res.status, 400);
  });

  it('400s a missing id', async () => {
    const res = await request(guarded).post('/thing').send({});
    assert.strictEqual(res.status, 400);
  });

  it('400s an id that is not ObjectId-shaped', async () => {
    const res = await request(guarded).post('/thing').send({ id: 'not-an-id' });
    assert.strictEqual(res.status, 400);
  });

  it('names the offending field so the error is actionable', async () => {
    const res = await request(guarded).post('/thing').send({ id: [] });
    assert.ok(res.body.msg.includes('id'), res.body.msg);
  });

  it('admits a well-formed id', async () => {
    const res = await request(guarded).post('/thing').send({ id: '507f1f77bcf86cd799439011' });
    assert.strictEqual(res.status, 200);
  });
});

describe('API — error shape', () => {
  it('returns JSON, not HTML, for refusals', async () => {
    // Every client of this API speaks JSON. Falling through to Express's
    // default HTML error page hands a fetch() an unparseable body and turns
    // a clear 401 into a confusing parse error in the browser console.
    const res = await request(app).get('/protected');
    assert.ok(/application\/json/.test(res.headers['content-type']), res.headers['content-type']);
  });
});
