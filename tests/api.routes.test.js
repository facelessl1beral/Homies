/**
 * API — full route tests.
 *
 * INTEGRATION TESTS requiring a real database (docs/TEST-TAXONOMY.md §4).
 *
 * These exercise the whole vertical slice: HTTP request, routing, middleware,
 * handler, mongoose, response. They are the layer that unit tests cannot
 * reach, and they catch a specific class of fault that everything else misses
 * — a field name typed wrong inside a handler, a route mounted at a path the
 * client does not call, a refusal that returns the wrong status code.
 *
 * They run against `<your database>_test`, never the real one, and empty
 * every collection between tests.
 *
 * If MongoDB is not reachable the whole block SKIPS rather than fails, and
 * says so at the end of the run. A suite that goes red because a developer
 * has no database running teaches people to ignore red output, which is worse
 * than having no suite at all.
 *
 *   npm run test:api        runs these
 *   npm test                runs everything, skipping these if no database
 */

const request = require('supertest');
const express = require('express');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { describeWithDb } = require('./helpers/db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_not_used_in_production';

const User = require('../models/User');
const Hostel = require('../models/Hostel');

/** The real routers, mounted exactly as server.js mounts them. */
const buildApp = () => {
  const app = express();
  app.use(express.json({ extended: false }));
  app.use('/api/users', require('../routes/api/users'));
  app.use('/api/auth', require('../routes/api/auth'));
  app.use('/api/profile', require('../routes/api/profile'));
  app.use('/api/hostels', require('../routes/api/hostels'));
  return app;
};

const app = buildApp();

const makeStudent = async (over = {}) => User.create({
  firstName: 'Test', lastName: 'Student',
  email: over.email || `s${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`,
  password: await bcrypt.hash('secret123', 10),
  ...over,
});

const tokenFor = user =>
  jwt.sign({ user: { id: String(user._id) } }, process.env.JWT_SECRET, { expiresIn: '1h' });

const hostelTokenFor = hostel =>
  jwt.sign({ hostel: { id: String(hostel._id), role: 'admin' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

// ---------------------------------------------------------------------------

describeWithDb('API — registration and login', function () {

  it('201s or 200s a valid registration and returns a token', async () => {
    const res = await request(app).post('/api/users').send({
      firstName: 'Ada', lastName: 'Lovelace',
      email: 'ada@example.com', password: 'secret123',
    });
    assert.ok([200, 201].includes(res.status), `got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.token, 'registration must return a token');
  });

  it('400s a duplicate email rather than creating a second account', async () => {
    await makeStudent({ email: 'dupe@example.com' });
    const res = await request(app).post('/api/users').send({
      firstName: 'A', lastName: 'B', email: 'dupe@example.com', password: 'secret123',
    });
    assert.strictEqual(res.status, 400);
  });

  it('400s a short password', async () => {
    const res = await request(app).post('/api/users').send({
      firstName: 'A', lastName: 'B', email: 'short@example.com', password: 'abc',
    });
    assert.strictEqual(res.status, 400);
  });

  it('400s a malformed email', async () => {
    const res = await request(app).post('/api/users').send({
      firstName: 'A', lastName: 'B', email: 'not-an-email', password: 'secret123',
    });
    assert.strictEqual(res.status, 400);
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/users').send({
      firstName: 'A', lastName: 'B', email: 'nohash@example.com', password: 'secret123',
    });
    assert.ok(!JSON.stringify(res.body).includes('$2a$'), 'a bcrypt hash reached the client');
  });

  it('logs in with correct credentials', async () => {
    // routes/api/auth.js answers 202 on success, not 200. Asserting the
    // status the code actually returns rather than the one convention would
    // suggest — a test that disagrees with working code is a broken test,
    // and changing the route to satisfy it would break every client.
    await makeStudent({ email: 'login@example.com' });
    const res = await request(app).post('/api/auth')
      .send({ email: 'login@example.com', password: 'secret123' });
    assert.ok([200, 202].includes(res.status), `got ${res.status}`);
    assert.ok(res.body.token, 'login must return a token');
  });

  it('400s a wrong password', async () => {
    await makeStudent({ email: 'wrong@example.com' });
    const res = await request(app).post('/api/auth')
      .send({ email: 'wrong@example.com', password: 'not-the-password' });
    assert.strictEqual(res.status, 400);
  });

  it('400s an unknown email with the same message as a wrong password', async () => {
    // Distinguishing the two lets an attacker enumerate which addresses are
    // registered, which for a student housing app is a real disclosure.
    await makeStudent({ email: 'known@example.com' });
    const unknown = await request(app).post('/api/auth')
      .send({ email: 'nobody@example.com', password: 'secret123' });
    const wrongPw = await request(app).post('/api/auth')
      .send({ email: 'known@example.com', password: 'nope' });
    assert.strictEqual(unknown.status, wrongPw.status);
  });

  it('rejects a NoSQL operator in the email field', async () => {
    const res = await request(app).post('/api/auth')
      .send({ email: { $ne: null }, password: 'secret123' });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
    assert.ok(!res.body.token, 'a query operator must never yield a token');
  });
});

describeWithDb('API — profile endpoints require authentication', function () {

  it('401s GET /api/profile without a token', async () => {
    // Was public, returning every student's email and swipe history.
    const res = await request(app).get('/api/profile');
    assert.strictEqual(res.status, 401);
  });

  it('401s GET /api/users without a token', async () => {
    const res = await request(app).get('/api/users');
    assert.strictEqual(res.status, 401);
  });

  it('401s GET /api/profile/user/:id without a token', async () => {
    const user = await makeStudent();
    const res = await request(app).get(`/api/profile/user/${user._id}`);
    assert.strictEqual(res.status, 401);
  });

  it('200s with a valid token', async () => {
    const user = await makeStudent();
    const res = await request(app).get('/api/profile').set('x-auth-token', tokenFor(user));
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('withholds email, swipe history and room assignment from the listing', async () => {
    // The allowlist in lib/profileVisibility.js, asserted end to end rather
    // than only as a unit.
    await makeStudent({ email: 'private@example.com', accepted: ['x'], assignedRoom: '4B' });
    const viewer = await makeStudent();
    const res = await request(app).get('/api/profile').set('x-auth-token', tokenFor(viewer));

    const body = JSON.stringify(res.body);
    assert.ok(!body.includes('private@example.com'), 'email leaked');
    assert.ok(!body.includes('accepted'),  'swipe history leaked');
    assert.ok(!body.includes('assignedRoom'), 'room assignment leaked');
  });

  it('400s a malformed id rather than 500', async () => {
    const user = await makeStudent();
    const res = await request(app).get('/api/profile/user/not-an-id')
      .set('x-auth-token', tokenFor(user));
    assert.strictEqual(res.status, 400);
  });
});

describeWithDb('API — hostel admin routes', function () {

  // Field names copied from models/Hostel.js: the schema requires
  // `contactEmail`, not `email`. Guessing a fixture's field names instead of
  // reading the schema is what made the first run of this suite fail.
  const makeHostel = async (over = {}) => Hostel.create({
    name: over.name || `Test Hostel ${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    contactEmail: over.contactEmail || `h${Date.now()}@example.com`,
    password: await bcrypt.hash('secret123', 10),
    location: 'Kampala',
    rooms: over.rooms || [],
    ...over,
  });

  it('403s a student token on GET /rooms — not 500', async () => {
    // Three routes previously returned 500 here, protected only by a
    // TypeError rather than by a check.
    const student = await makeStudent();
    const res = await request(app).get('/api/hostels/rooms')
      .set('x-auth-token', tokenFor(student));
    assert.strictEqual(res.status, 403);
  });

  it('403s a student token on DELETE /rooms/:id', async () => {
    const student = await makeStudent();
    const res = await request(app).delete('/api/hostels/rooms/507f1f77bcf86cd799439011')
      .set('x-auth-token', tokenFor(student));
    assert.strictEqual(res.status, 403);
  });

  it('200s GET /rooms for a real hostel admin', async () => {
    const hostel = await makeHostel();
    const res = await request(app).get('/api/hostels/rooms')
      .set('x-auth-token', hostelTokenFor(hostel));
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('adds a room, then 400s a duplicate room number', async () => {
    const hostel = await makeHostel();
    const token = hostelTokenFor(hostel);

    const first = await request(app).post('/api/hostels/rooms')
      .set('x-auth-token', token).send({ roomNumber: '4B', capacity: 2 });
    assert.strictEqual(first.status, 200);

    const dupe = await request(app).post('/api/hostels/rooms')
      .set('x-auth-token', token).send({ roomNumber: '4B', capacity: 2 });
    assert.strictEqual(dupe.status, 400);
    assert.ok(/already exists/i.test(dupe.body.msg), dupe.body.msg);
  });

  it('400s a room with no number', async () => {
    const hostel = await makeHostel();
    const res = await request(app).post('/api/hostels/rooms')
      .set('x-auth-token', hostelTokenFor(hostel)).send({ capacity: 2 });
    assert.strictEqual(res.status, 400);
  });

  it('/api/hostels/public stays open and exposes no student data', async () => {
    await makeHostel({ name: 'Public Hostel' });
    await makeStudent({ email: 'hidden@example.com' });
    const res = await request(app).get('/api/hostels/public');
    assert.strictEqual(res.status, 200);
    assert.ok(!JSON.stringify(res.body).includes('hidden@example.com'));
  });
});

describeWithDb('API — booking refusals', function () {

  const hostelWithRoom = async (roomOver = {}) => {
    const hostel = await Hostel.create({
      // `name` is unique in the schema, so a fixed value collides on the
      // second test in the block even with collections emptied between runs.
      name: `Booking Hostel ${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      contactEmail: `b${Date.now()}@example.com`,
      password: await bcrypt.hash('secret123', 10), location: 'Kampala',
      rooms: [{ roomNumber: '4B', capacity: 2, occupants: [], status: 'available', ...roomOver }],
    });
    return { hostel, room: hostel.rooms[0] };
  };

  it('confirms two students into an empty room', async () => {
    const { hostel, room } = await hostelWithRoom();
    const a = await makeStudent();
    const b = await makeStudent();

    const res = await request(app).post('/api/hostels/matches/confirm')
      .set('x-auth-token', hostelTokenFor(hostel))
      .send({ studentAId: String(a._id), studentBId: String(b._id), roomId: String(room._id) });

    assert.strictEqual(res.status, 200, JSON.stringify(res.body));

    // The write actually landed — the assertion a unit test cannot make.
    const reloaded = await User.findById(a._id);
    assert.strictEqual(reloaded.bookingStatus, 'confirmed');
    assert.strictEqual(reloaded.assignedRoom, '4B');
  });

  it('400s a confirmation into a room that is already full', async () => {
    // The bug that mattered most: the old handler assigned occupants
    // outright, silently evicting whoever was already there.
    const { hostel, room } = await hostelWithRoom({ occupants: ['x', 'y'] });
    const a = await makeStudent();
    const b = await makeStudent();

    const res = await request(app).post('/api/hostels/matches/confirm')
      .set('x-auth-token', hostelTokenFor(hostel))
      .send({ studentAId: String(a._id), studentBId: String(b._id), roomId: String(room._id) });

    assert.strictEqual(res.status, 400);
  });

  it('400s a student who already holds a confirmed room', async () => {
    const { hostel, room } = await hostelWithRoom();
    const booked = await makeStudent({ bookingStatus: 'confirmed', assignedRoom: '2A' });
    const other = await makeStudent();

    const res = await request(app).post('/api/hostels/matches/confirm')
      .set('x-auth-token', hostelTokenFor(hostel))
      .send({ studentAId: String(booked._id), studentBId: String(other._id), roomId: String(room._id) });

    assert.strictEqual(res.status, 400);
    assert.ok(/already has a confirmed room/i.test(res.body.msg), res.body.msg);
  });

  it('400s deleting a room that still has occupants', async () => {
    const { hostel, room } = await hostelWithRoom({ occupants: ['someone'] });
    const res = await request(app).delete(`/api/hostels/rooms/${room._id}`)
      .set('x-auth-token', hostelTokenFor(hostel));
    assert.strictEqual(res.status, 400);
    assert.ok(/occupant/i.test(res.body.msg), res.body.msg);
  });

  it('deletes an empty room', async () => {
    const { hostel, room } = await hostelWithRoom();
    const res = await request(app).delete(`/api/hostels/rooms/${room._id}`)
      .set('x-auth-token', hostelTokenFor(hostel));
    assert.strictEqual(res.status, 200);
  });
});

describeWithDb('API — swipe endpoints', function () {

  it('records an accept and reports no match when it is one-sided', async () => {
    const me = await makeStudent();
    const them = await makeStudent();

    const res = await request(app).post('/api/profile/accept')
      .set('x-auth-token', tokenFor(me)).send({ id: String(them._id) });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mutual, false, 'a one-sided like is not a match');
  });

  it('reports a mutual match when the like is reciprocated', async () => {
    const me = await makeStudent();
    const them = await makeStudent({ accepted: [] });

    await request(app).post('/api/profile/accept')
      .set('x-auth-token', tokenFor(them)).send({ id: String(me._id) });

    const res = await request(app).post('/api/profile/accept')
      .set('x-auth-token', tokenFor(me)).send({ id: String(them._id) });

    assert.strictEqual(res.body.mutual, true);
    assert.ok(res.body.matchedWith, 'a match must name who it is with');
  });

  it('400s a swipe with a query operator instead of an id', async () => {
    const me = await makeStudent();
    const res = await request(app).post('/api/profile/accept')
      .set('x-auth-token', tokenFor(me)).send({ id: { $ne: null } });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  });
});
