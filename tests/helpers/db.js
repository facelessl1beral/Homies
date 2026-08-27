/**
 * Test harness for HTTP-level (integration) tests.
 *
 * Two tiers, because the tests divide cleanly by what they need:
 *
 *   Tier A — no database. Authorisation, token validation, request
 *            validation, 404 handling. These reject before any handler
 *            touches mongoose, so they run anywhere, always.
 *
 *   Tier B — needs a real database. Anything that reads or writes a
 *            document. These call `describeWithDb`, which checks once
 *            whether MongoDB is reachable and *skips* the block if it is
 *            not, rather than failing.
 *
 * Why skipping rather than failing
 * --------------------------------
 * A suite that fails when a developer has no MongoDB running teaches people
 * to ignore red output, which is worse than having no tests. A suite that
 * silently passes when it did not run is worse still. So Tier B skips
 * loudly: mocha reports the block as pending, and `npm run test:api` prints
 * why at the end.
 *
 * The database used is `<MONGO_URI database name>_test`, never the real one.
 * Tests drop their own collections between runs, and dropping the wrong
 * database is not a mistake worth risking for the sake of a shorter line of
 * configuration.
 */

const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_not_used_in_production';
process.env.NODE_ENV = 'test';

let dbAvailable = null;

/** Derive a test database URI from MONGO_URI, never reusing the real one. */
const testUri = () => {
  const base = process.env.MONGO_TEST_URI
    || process.env.MONGO_URI
    || 'mongodb://127.0.0.1:27017/kyu_hostel';
  if (process.env.MONGO_TEST_URI) return base;
  // Insert _test before any query string.
  const [head, query] = base.split('?');
  return `${head.replace(/\/?$/, '')}_test${query ? '?' + query : ''}`;
};

/** Connect once. Returns false if MongoDB is not reachable. */
async function connect() {
  if (dbAvailable !== null) return dbAvailable;
  try {
    await mongoose.connect(testUri(), {
      useNewUrlParser: true, useUnifiedTopology: true,
      useFindAndModify: false, useCreateIndex: true,
      serverSelectionTimeoutMS: 3000,
    });
    dbAvailable = true;
  } catch (err) {
    dbAvailable = false;
  }
  return dbAvailable;
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

/** Empty every collection. Cheaper than dropping and recreating indexes. */
async function clear() {
  if (!dbAvailable) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

/**
 * describe() that skips its whole block when no database is reachable.
 *
 * Mocha needs the skip decision synchronously at definition time, so the
 * connection is opened in a root-level before hook and the block uses
 * this.skip() in its own before hook — which mocha does allow.
 */
function describeWithDb(title, fn) {
  describe(title, function () {
    before(async function () {
      this.timeout(10000);
      const ok = await connect();
      if (!ok) this.skip();
    });
    beforeEach(async () => { await clear(); });
    fn.call(this);
  });
}

after(async () => {
  await disconnect();
  if (dbAvailable === false) {
    console.log(
      '\n  \x1b[33mDatabase tests were SKIPPED — no MongoDB reachable.\x1b[0m\n' +
      `  \x1b[2mTried: ${testUri()}\x1b[0m\n` +
      '  \x1b[2mStart MongoDB and re-run to exercise them.\x1b[0m\n'
    );
  }
});

module.exports = { connect, disconnect, clear, describeWithDb, testUri };
