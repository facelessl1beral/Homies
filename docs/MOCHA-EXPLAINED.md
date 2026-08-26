# How Our Testing Works — A Walkthrough

Written to be read by someone who has not touched the test code, and to be
answerable under questioning. Every claim here can be checked by running the
command next to it.

---

## 1. The thirty-second version

We use **Mocha**, a JavaScript test runner, with Node's built-in **`assert`**
module. `npm test` runs 73 tests in about 25 milliseconds and needs no
database, no network, and no browser.

```bash
npm test
```

---

## 2. What Mocha actually is

Mocha is a **test runner**. It does three things and nothing else:

1. Finds test files
2. Executes the functions inside them
3. Reports which threw an error and which did not

That is the whole idea. **A test passes if it does not throw. It fails if it
throws.** Everything else is presentation.

### The two functions

```javascript
describe('Booking rules', () => {        // a group, for organisation
  it('refuses to delete an occupied room', () => {   // one test
    assert.strictEqual(canDeleteRoom(occupiedRoom).ok, false);
  });
});
```

- **`describe(name, fn)`** — groups related tests. Purely organisational;
  it affects the output layout and nothing else. They can nest.
- **`it(name, fn)`** — one test. The name should complete the sentence
  "it ...", which is why our tests read like `it('refuses to delete an
  occupied room')`.

### How a failure happens

`assert.strictEqual(a, b)` throws an `AssertionError` when `a !== b`. Mocha
catches it, marks that `it` failed, prints expected versus actual, and carries
on to the next test. If nothing throws, Mocha prints a tick.

There is no magic. You could write your own runner in about forty lines. What
Mocha adds is the reporting, the `--watch` mode, and correct handling of
`async` tests.

### How Mocha finds our tests

From `package.json`:

```json
"test": "mocha tests/*.test.js --exit"
```

Every file matching `tests/*.test.js` is loaded and run. `--exit` forces the
process to quit when the suite finishes, rather than hanging on an open handle.

---

## 3. Why Mocha, and why nothing else

**What the project had before:** Mocha *plus* Chai *plus* chai-http *plus*
should.js *plus* supertest. Five libraries — and three of them were **not in
`package.json` and not in the lockfile**. `npm test` exited with:

```
sh: 1: mocha: not found
```

The project had no working verification at all.

**The worse part.** Even with everything installed, those tests could not have
failed. Every assertion sat inside a promise chain ending in:

```javascript
.catch(err => console.log(err.message));
```

An assertion error is an error. That `.catch` swallowed it, printed it as an
ordinary log line, and let the test pass. They also asserted a response shape
(`res.body.user._id`) that the `User` model had not had for several commits.

**A green suite that cannot go red is worse than no suite**, because it
actively certifies that nothing is wrong.

**Why `assert` and not Chai.** Chai lets you write
`expect(x).to.equal(y)` instead of `assert.strictEqual(x, y)`. That is a
readability preference. It costs a dependency, a version to keep current, and
one more thing a new contributor has to learn. `assert` ships with Node.

> **If asked "why not Jest?"** — Jest is excellent, and is the natural choice
> when you are testing React components, because it bundles a DOM
> implementation and snapshot testing. We test **pure backend logic**, none of
> which touches a DOM, so we would be installing a large dependency for its
> runner alone. Jest would be the right answer if we added component tests.

---

## 4. Why no test database

**Every test runs against pure functions.** No MongoDB, no HTTP server.

That is why `lib/matching.js`, `lib/booking.js`, `lib/validate.js` and
`lib/profileVisibility.js` exist as separate modules. The logic used to be
inline inside route handlers, tangled with `req`, `res` and mongoose calls, and
therefore untestable without standing up the whole stack.

**Extracting the logic was the change that made testing possible.** The tests
were a consequence.

We considered `mongodb-memory-server` and rejected it:

1. It downloads a MongoDB binary at install time, which fails on restricted
   networks and adds a slow, fragile step to every fresh clone.
2. It makes the suite stateful, and stateful suites develop order dependence —
   test 12 passes only because test 9 left a record behind.
3. **It would not have caught our actual bug.** More on that below.

The cost of this decision is stated openly in §8.

---

## 5. The three tiers — rigour matched to consequence

Not all code deserves equal scrutiny. We match depth to the cost of being
wrong.

| Cost of being wrong | Approach | Applied to |
|---|---|---|
| Money, data loss, one user seeing another's data | Tests written **before** the code | Booking rules, authorisation, profile visibility |
| Broken workflow, silent failure | Tests alongside, covering failure paths | Matching engine |
| Cosmetic | Manual check | CSS, spacing, wording |

**Tier 1 in practice.** `tests/booking.test.js` was written *before*
`routes/api/hostels.js` was modified. Every assertion in it fails against the
old code. Retrofitting tests onto code you have already convinced yourself is
correct produces tests that agree with the code rather than with the
requirement.

---

## 6. What our 73 tests cover

| File | Tests | Covers |
|---|---|---|
| `matching.test.js` | 23 | Compatibility scoring and dealbreaker filtering |
| `booking.test.js` | 19 | Room assignment rules |
| `security.test.js` | 17 | Input guards and JWT handling |
| `visibility.test.js` | 14 | Which profile fields may be shown to whom |

### The most important detail in the whole suite

Every option string in `matching.test.js` — `"Don't Care"`,
`'Same gender only'`, `'Non-smoker'` — is **copied verbatim from
`client/src/components/dashboard/EditProfile.js`**.

This is deliberate, and it is the answer to the most likely hard question.

**The bug.** The server filtered candidates with:

```javascript
if (current.roomieGender !== 'No preference' && ...) return false;
```

But the questionnaire never offers `'No preference'` for that field. Its
opt-out is `"Don't Care"`. So every student who answered the roommate-gender
question had **100% of candidates filtered out** and saw an empty Discover
feed. Students who *skipped* the question saw a full one — the exact inversion
of correct behaviour.

**Why it survived.** The logic was internally consistent. Reviewing
`profile.js` alone, it reads correctly. The fault only exists in the
*relationship* between two files that nothing forced to agree.

**Why the fixtures matter.** A test written with invented fixtures like
`{ roomieGender: 'No preference' }` would have passed happily while the live
feed was empty. Only fixtures copied from the real form catch it.

**Why a test database would not have helped.** This is a vocabulary mismatch
between a form and a filter. A database has no opinion about which strings a
dropdown offers.

> **If asked "how do you know your tests are testing the right thing?"** —
> this is the answer. We identified where two parts of the system must agree
> with nothing structurally forcing them to, and we pinned that seam using
> values taken from the source of truth.

### The second-most important test

`visibility.test.js` parses `models/User.js`, extracts every schema field, and
**fails if any field is classified neither public nor private**.

Add a field to the User model and the suite goes red until someone decides who
may see it. That converts "somebody remembered to think about this" into "the
build will not pass until somebody thinks about this" — the only version that
survives the project being handed to someone else.

---

## 7. Test hygiene

**No test depends on another, or on run order.** Every test builds its own
fixtures from a factory:

```javascript
const student = (overrides = {}) => ({ _id: 'x', gender: '', ...overrides });
```

Order dependence is insidious because it produces a suite that passes locally
and fails in CI, or passes at 42 tests and fails at 73. The usual cause is
shared state — a cache, a counter, a module-level variable — and the usual
wrong fix is to raise a limit until the symptom disappears.

**Passing once is not evidence of stability.** After changing the suite:

```bash
for i in 1 2 3; do npm test | grep -E "passing|failing"; done
```

Ours reports `73 passing` three times, in roughly 25ms each.

---

## 8. What we do NOT test — and why saying so matters

The most useful section to be able to answer on.

- **No database integration.** The rules are tested; the mongoose code calling
  them is verified by inspection. A misspelled field name inside a handler
  would pass every test.
- **No HTTP tests.** No supertest, so route wiring, middleware order and
  status codes are unverified by automation.
- **No React tests.** Rendering, Redux state, the swipe gesture and the theme
  toggle are all checked by hand.
- **CORS is only proven in a browser.** A preflight does not happen in Node.
- **Email delivery is not asserted.** Hence `npm run check:email`.

> **If asked "what are the weaknesses of your testing?"** — give this list
> directly. A report of only green results invites the assumption that
> everything else was covered too. Naming the gaps is the stronger position,
> and it is more accurate.

---

## 9. The other two gates

`npm test` is one of three.

| Command | Proves |
|---|---|
| `npm test` | Logic is correct |
| `npm run build --prefix client` | The frontend compiles and can deploy |
| `npm run doctor` | The environment and live data are usable |

### `npm run doctor` — the one worth demonstrating

Read-only. It makes no assertions about correctness; it reports on a running
system.

**The problem it solves.** Two situations look identical in a browser and have
opposite fixes:

- An empty Discover feed because the filter is broken
- An empty Discover feed because the database is empty

Doctor runs the **real matching engine over the real database** and reports,
per student, how many cards they will see. Three seconds, definite answer.

It also found two things nothing else would have: that local development was
proxying every API call to the *deployed* backend, so local code changes had no
effect; and that three mutual matches were invisible to every hostel admin
because the two students had chosen different preferred hostels.

**Why it helps in a viva.** Asked "how do you know the matching algorithm
works on real data?", the answer is a per-student report over the live
database, not an assertion. It also demonstrates the system was built to be
*observable* — a stronger claim than that it works.

It also tells you **which accounts to demonstrate with**. Not every student is
a good demo: some have near-empty profiles and score 0% against everyone,
which makes a working system look broken.

---

## 10. Likely questions, with answers

**"Why so few tests for a project this size?"**
73 tests cover the logic where being wrong has consequences. We deliberately
did not pad the count with tests of framework behaviour or trivial getters — a
suite padded that way is worse than a smaller one, because it dilutes
attention and slows the run.

**"How do you know the tests would catch a real bug?"**
Because they were written against real ones. `booking.test.js` was written
before the fix and every assertion fails against the previous implementation.
Check out the earlier commit and run it.

**"What's your code coverage percentage?"**
We do not measure it, deliberately. Coverage measures which lines executed, not
whether the assertions were meaningful — a test calling a function and
asserting nothing scores 100%. We reasoned about consequence instead, which is
what §5 documents.

**"Why did you extract the logic into `lib/`?"**
Testability, and it is also better architecture. The matching engine is a pure
function of two profiles. Having it inline in a route handler meant it could
only run inside an HTTP request against a live database.

**"What would you do with more time?"**
Supertest for HTTP-level tests, React Testing Library for components, and a
migration off mongoose 5, which is end-of-life and carries a critical
advisory that cannot be resolved without a four major-version upgrade.
