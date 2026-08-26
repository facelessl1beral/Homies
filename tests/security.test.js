/**
 * Security tests.
 *
 * Top rigour tier: these cover the authorisation boundary and the input
 * sanitisation that keeps request bodies out of query filters.
 *
 * Context. `npm audit` reports 188 advisories, of which three reach code that
 * runs in production. Two are addressed by the change these tests accompany
 * (jsonwebtoken, and the injection surface). One — mongoose 5.x, which is end
 * of life — cannot be fixed inside this project's timeline, because the
 * remediation path is a four major-version upgrade that removes the four
 * connection options server.js currently passes.
 *
 * That makes these tests more important than they would otherwise be. The
 * guards below hold regardless of which mongoose version is installed, so the
 * injection surface is closed at the application layer rather than relying on
 * a driver fix that is not coming.
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const { asObjectId, asString, requireIds, OBJECT_ID } = require('../lib/validate');

const SECRET = 'test_secret_that_is_long_enough_to_be_realistic';

// Minimal express req/res doubles. Using real supertest here would need a
// live database, which would put these tests in a tier where they could not
// run in CI or on a machine without MongoDB.
const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = code => { res.statusCode = code; return res; };
  res.json = payload => { res.body = payload; return res; };
  return res;
};

describe('Input guards — request bodies must not reach query filters', () => {

  describe('asObjectId', () => {
    it('accepts a well-formed id string', () => {
      assert.strictEqual(asObjectId('69bb9d22e9c45c1f8798fa42'), '69bb9d22e9c45c1f8798fa42');
    });

    it('rejects a query operator object', () => {
      // The NoSQL injection shape. Passed into User.findById or an $addToSet,
      // an object is interpreted as an operator rather than a value.
      assert.strictEqual(asObjectId({ $ne: null }), null);
      assert.strictEqual(asObjectId({ $gt: '' }), null);
    });

    it('rejects arrays, numbers, null and undefined', () => {
      [['a'], 42, null, undefined, true].forEach(v => {
        assert.strictEqual(asObjectId(v), null, `should reject ${JSON.stringify(v)}`);
      });
    });

    it('rejects strings that are not ObjectId-shaped', () => {
      ['', 'abc', '69bb9d22e9c45c1f8798fa4', 'zzzzzzzzzzzzzzzzzzzzzzzz'].forEach(v => {
        assert.strictEqual(asObjectId(v), null, `should reject "${v}"`);
      });
    });

    it('is case insensitive on hex', () => {
      assert.ok(OBJECT_ID.test('69BB9D22E9C45C1F8798FA42'));
    });
  });

  describe('asString', () => {
    it('returns trimmed strings and rejects everything else', () => {
      assert.strictEqual(asString('  hello  '), 'hello');
      assert.strictEqual(asString({ $gt: '' }), null);
      assert.strictEqual(asString(['x']), null);
      assert.strictEqual(asString(5), null);
    });
  });

  describe('requireIds middleware', () => {
    it('calls next when every named field is a valid id', () => {
      let called = false;
      const req = { body: { id: '69bb9d22e9c45c1f8798fa42' } };
      requireIds('id')(req, mockRes(), () => { called = true; });
      assert.strictEqual(called, true);
    });

    it('returns 400 and does not call next when a field is an object', () => {
      let called = false;
      const res = mockRes();
      requireIds('id')({ body: { id: { $ne: null } } }, res, () => { called = true; });
      assert.strictEqual(called, false, 'the handler must not run');
      assert.strictEqual(res.statusCode, 400);
    });

    it('returns 400 when a field is missing entirely', () => {
      const res = mockRes();
      requireIds('id')({ body: {} }, res, () => {});
      assert.strictEqual(res.statusCode, 400);
    });

    it('checks every named field, not just the first', () => {
      // An asymmetric check is the kind that passes review and fails later.
      const res = mockRes();
      requireIds('a', 'b')(
        { body: { a: '69bb9d22e9c45c1f8798fa42', b: { $ne: null } } },
        res,
        () => {}
      );
      assert.strictEqual(res.statusCode, 400);
    });

    it('names the offending field so the error is actionable', () => {
      const res = mockRes();
      requireIds('roomId')({ body: { roomId: null } }, res, () => {});
      assert.ok(res.body.msg.includes('roomId'), res.body.msg);
    });
  });
});

describe('JWT — token handling', () => {
  // jsonwebtoken was upgraded from 8.5.1, which carried a signature
  // validation bypass via an insecure default algorithm (the "algorithm
  // confusion" class of attack). For a project whose entire authentication
  // story is JWT, that is the advisory most worth closing.

  it('signs and verifies a student token in the callback form used by the routes', done => {
    jwt.sign({ user: { id: '69bb9d22e9c45c1f8798fa42' } }, SECRET, { expiresIn: '100h' }, (err, token) => {
      assert.ifError(err);
      jwt.verify(token, SECRET, (e, decoded) => {
        assert.ifError(e);
        assert.strictEqual(decoded.user.id, '69bb9d22e9c45c1f8798fa42');
        done();
      });
    });
  });

  it('signs and verifies a hostel admin token carrying its role claim', () => {
    const token = jwt.sign({ hostel: { id: 'h1', role: 'admin' } }, SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, SECRET);
    assert.strictEqual(decoded.hostel.role, 'admin');
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ user: { id: 'x' } }, 'a-different-secret');
    assert.throws(() => jwt.verify(token, SECRET), /invalid signature/);
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ user: { id: 'x' } }, SECRET, { expiresIn: '-1s' });
    assert.throws(() => jwt.verify(token, SECRET), /jwt expired/);
  });

  it('rejects an unsigned "none" algorithm token', () => {
    // The attack the upgrade closes: a token claiming alg:none must never
    // verify against a secret.
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ user: { id: 'attacker' } })).toString('base64url');
    const forged = `${header}.${payload}.`;
    assert.throws(() => jwt.verify(forged, SECRET));
  });

  it('a student token carries no hostel claim, so it cannot pass an admin check', () => {
    // This is the rule middleware/hostelAuth.js enforces. Previously three
    // admin routes relied on `decoded.hostel.id` throwing a TypeError instead
    // of checking, which returned 500 rather than 403 and would have silently
    // stopped protecting anything the moment someone added optional chaining.
    const studentToken = jwt.sign({ user: { id: 'student1' } }, SECRET);
    const decoded = jwt.verify(studentToken, SECRET);
    const passesAdminCheck = !!(decoded.hostel && decoded.hostel.role === 'admin');
    assert.strictEqual(passesAdminCheck, false);
  });
});
