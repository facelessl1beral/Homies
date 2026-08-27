# Testing and Quality Assurance

How this project is verified, why it is verified that way, and what is
deliberately not covered.

---

## 1. The gates

Three commands. All three must pass before any change is described as done.

| Command | Proves | Runtime |
|---|---|---|
| `npm test` | Backend logic is correct (105 unit tests) | ~1s |
| `npm test --prefix client` | React components behave (35 tests) | ~4s |
| `npm run build --prefix client` | The frontend compiles and deploys | ~40s |
| `npm run doctor` | The environment and data are usable | ~3s |

`npm test` is the only one that gates correctness. The build gates
deployability. The doctor gates *situation* — it answers questions about the
running system that the other two cannot.

---

> For the standard unit / integration / end-to-end breakdown, and an explicit
> account of the two categories this project does **not** have, see
> [TEST-TAXONOMY.md](TEST-TAXONOMY.md).

## 2. The framework, and why this one

**Mocha 10** as the test runner, with Node's built-in `assert` module for
assertions. No assertion library, no mocking framework, no test database.

This is a deliberate reduction from what the project inherited. The original
suite used Mocha *plus* Chai *plus* chai-http *plus* should.js *plus*
supertest — five libraries, of which **three were not declared in
`package.json` and were not in the lockfile**. `npm test` exited with
`sh: 1: mocha: not found`. The project had no working verification at all.

Worse, the inherited tests could not have failed even once installed. Every
assertion sat inside a promise chain ending in
`.catch(err => console.log(err.message))`, so an assertion error was caught,
printed as a log line, and the test passed. They also asserted a response
shape (`res.body.user._id`) that the `User` model had not had for several
commits. **A green suite that cannot go red is worse than no suite**, because
it actively certifies that nothing is wrong.

The replacement uses Mocha and `assert` because that is sufficient. Adding
Chai to write `expect(x).to.equal(y)` instead of `assert.strictEqual(x, y)` is
a syntax preference that costs a dependency and a version to keep current.

### Why there is no test database

Tests run against **pure functions**, never against MongoDB. The matching
engine and the booking rules were extracted into `lib/` specifically so this
would be possible.

The alternative — `mongodb-memory-server` or a dedicated test database — was
rejected for three reasons:

1. It downloads a MongoDB binary on install, which fails on restricted
   networks and adds a slow, flaky step to every fresh clone.
2. It makes the suite stateful, and stateful suites develop order dependence.
3. It would not have caught the bugs that mattered. The dealbreaker bug was a
   *vocabulary* mismatch between the questionnaire and the filter. A database
   cannot detect that; only fixtures copied from the questionnaire can.

The cost of this choice is stated plainly in §6.

---

## 3. Test tiers — matching rigour to consequence

Not everything deserves the same rigour. Depth is matched to the cost of being
wrong.

| Cost of being wrong | Rigour | Applied to |
|---|---|---|
| Money, data loss, one user seeing another's data | Tests written **before** implementation. Exhaustive cases | Booking rules, authorisation, input guards |
| Broken workflow, corrupted state, silent failure | Tests alongside. Failure paths, not just the happy path | Matching engine, swipe state |
| Cosmetic, layout, wording | Manual check | CSS, copy, spacing |

### Tier 1 — tests first, from the requirement

`tests/booking.test.js` was written **before** `routes/api/hostels.js` was
touched. Every assertion in it fails against the previous implementation.

The reasoning: questions like "may this student be booked into this room" have
a small number of cases and a definite right answer. Enumerating them while
they are few is easy. Retrofitting them onto code you have already convinced
yourself is correct is much harder, because you end up writing tests that
agree with the code rather than with the requirement.

### Tier 2 — tests alongside, covering failure paths

The matching engine is scored logic, not an authorisation boundary, so it was
extracted and tested in the same change rather than before it. But the tests
cover the *failure* cases, not just the happy path: empty profiles, one-sided
data, candidates who fail a dealbreaker, opt-out values.

### Tier 3 — manual only

Nobody writes a test to prove a heading is centred.

---

## 4. What is tested, and why each one

**59 cases across three files.**

### `tests/matching.test.js` — 23 cases

Covers the compatibility engine in `lib/matching.js`.

The fixtures are the point. Every option string — `"Don't Care"`,
`'Same gender only'`, `'Non-smoker'`, `'Social smoker'` — is **copied verbatim
from `client/src/components/dashboard/EditProfile.js`**.

This is a *contract seam*: two halves of the system that must agree about a
vocabulary, with nothing structural forcing them to. The original bug was
exactly here. The server tested `roomieGender !== 'No preference'`, but the
questionnaire's opt-out is `"Don't Care"`. Every student who answered that
question had 100% of candidates filtered out and saw an empty Discover feed.
Students who skipped it saw a full one.

The logic was internally consistent. Tests written against invented fixtures
would have passed while the live feed was empty. Only fixtures taken from the
real form catch it.

Groups covered:
- **Opt-out regression** — the specific bug, pinned so it cannot return
- **New and incomplete profiles stay discoverable** — missing data must never
  exclude a candidate, or every new signup becomes invisible to every
  established user, which presents as "the app has no users"
- **Preference vs own habit** — smoking filters on `roomieSmoke` (what you
  asked for), not `smoke` (your own habit)
- **Bidirectional dealbreakers** — a pairing survives only if both are willing
- **Weighted scoring** — that the documented 40/20/15/10/15 weights are the
  weights actually applied
- **Ranking pipeline** — sort order, swipe status labels, non-mutation

### `tests/booking.test.js` — 19 cases

Covers `lib/booking.js`. Tier 1.

The bug being defended against: the confirm handler did
`room.occupants = [studentAId, studentBId]` — assignment, not append, with no
validation. Confirming a pair into an occupied room silently evicted the pair
already there, while leaving those students' own records still reading
`bookingStatus: 'confirmed'` for that room. Two pairs would hold the same room
and nothing anywhere would show a conflict.

Covered: capacity, duplicate bookings, self-pairing, missing entities,
deleting occupied rooms, switching between rooms, derived room status.

### `tests/security.test.js` — 17 cases

Covers `lib/validate.js`. Tier 1.

Mongoose builds queries from whatever it is handed. A request body sending
`{"id": {"$ne": null}}` where a string is expected puts a query *operator*
into the filter instead of a value.

This project was not exploitable through that path — but **only by accident**.
The login route is shielded because `express-validator`'s `isEmail()` rejects
non-strings; the profile update is shielded because it builds `$set` from a
hardcoded whitelist. Neither was a deliberate defence, and the accept/reject
endpoints took `req.body.id` into a query with no type checking at all.

Relying on an accident is what these tests fix.

---

## 5. Suite hygiene

**No test depends on another, or on execution order.** Every test builds its
own fixtures from a factory function and shares no state.

This matters more than it sounds. Test frameworks reset the database between
tests and reset *nothing else* — not caches, not rate-limit counters, not
module-level singletons, not environment variables. A suite that passes at 42
tests and fails at 59 usually has state leaking through one of those, and the
wrong fix is to raise a limit to hide it.

**After changing the suite, run it several times consecutively.** Passing once
is not evidence of stability.

```bash
for i in 1 2 3; do npm test | grep -E "passing|failing"; done
```

---

## 6. What the gates do NOT catch

The more valuable half of any test report.

- **No database integration.** Rules are unit tested; the mongoose code wiring
  them to handlers is verified only by inspection. A typo in a field name
  inside a handler would pass every test.
- **No HTTP-level tests.** No supertest, so route wiring, middleware order,
  and status codes are unverified. `middleware/hostelAuth.js` is correct by
  reading, not by assertion.
- **No browser tests.** No Jest, no Testing Library, no Cypress. Everything
  about React — rendering, Redux state, the swipe gesture, the theme toggle,
  the password field — is verified by hand.
- **CORS is unproven until deployed.** A preflight only happens in a real
  browser against a real cross-origin request.
- **Email delivery is unproven.** Failures are caught and reported, but no
  test asserts that a message arrives.
- **Nothing about how it feels to use.**

---

## 7. Manual test checklist

Run before any deployment. These cover what the automated gates cannot.

**Student flow**
1. Register — submit stays disabled until passwords match
2. Password Show/Hide works, and is reachable by keyboard (Tab, then Enter)
3. Complete the questionnaire, answering roommate gender as **"Don't Care"**
4. Open Discover — **cards must appear** (this is the regression that mattered)
5. Right-swipe someone who has not swiped you — quiet confirmation, **no**
   match overlay
6. From the other account, swipe back — overlay **does** fire, and the first
   account shows the "They already liked you" badge
7. Hard-refresh any page — theme toggle, Sign up and hamburger are present
   immediately
8. Repeat 4–6 on a phone: the drag gesture must work, not just the buttons

**Admin flow**
9. Log in at `/admin`, add a room, try adding the same room number again —
   must be refused by name
10. Confirm a match into a room — both students receive email
11. Confirm the *same* students again — must be refused, naming their room
12. Try to delete a room with occupants — must be refused
13. Switch an occupant to a partly-filled room — must succeed

**Deployment**
14. Redeploy, then load the site in a browser that visited the old build —
    the new version must appear without clearing site data

---

## 8. `npm run doctor`

A read-only diagnostic. Not a test — it makes no assertions about correct
behaviour. It reports on the state of a running system.

```bash
npm run doctor
```

### What it reports

| Section | Question answered |
|---|---|
| Runtime | Is Node the right version, and does it match `.node-version`? |
| Environment | Is `.env` present, which required keys are missing? |
| API target | **Which backend will the frontend actually reach?** |
| Local server | Is the API listening? |
| Database | Does it connect, and what is in it? |
| Discover feed | **Per student, how many cards will they see?** |
| Mutual matches | Which exist, and will an admin be able to see them? |

### Why it exists

Two problems are indistinguishable from a browser, and they have opposite
fixes:

- An empty Discover feed caused by an over-eager dealbreaker filter
- An empty Discover feed caused by an empty database

The doctor runs the **real matching engine over the real database** and reports
per-student card counts. That is a direct answer, in three seconds, to a
question that otherwise takes ten minutes of clicking and still leaves you
guessing.

It found two other things nothing else would have:

- `client/package.json` was proxying every API call to the **deployed**
  backend, so running a local server had no effect and local code changes
  appeared to do nothing.
- Three mutual matches were invisible to every hostel admin because the two
  students had chosen *different* preferred hostels. Nothing in the UI
  explains this. Demoing one of those pairs would show an empty Matches tab
  with no clue why.

### Why it matters for academic delivery

**Before a demonstration**, it tells you which accounts to demonstrate with.
Not every student in the database is a good demo — some have near-empty
profiles and score 0% against everyone. Picking one of those makes a working
system look broken. The doctor names the good ones.

**During a viva**, it is evidence. A marker asking "how do you know the
matching algorithm works on real data?" gets a per-student report over the
live database rather than an assertion. It also demonstrates that the system
was engineered to be *observable*, which is a stronger claim than that it
works.

**In the dissertation**, its output is quotable as verification evidence, and
the reasoning behind it — that an empty result and a broken filter present
identically, so the system must be able to distinguish them — is exactly the
kind of engineering judgement a final-year project is assessed on.

It is read-only by construction: it connects, reads, disconnects. Safe to run
against production.

---

## 9. Adding a test

```javascript
const assert = require('assert');
const { thing } = require('../lib/module');

describe('Module — behaviour group', () => {
  it('describes the requirement, not the implementation', () => {
    assert.strictEqual(thing(input), expected);
  });
});
```

Rules:

- **Name the requirement, not the code.** "refuses to overwrite a room that is
  already occupied", not "canConfirmBooking returns false".
- **Every bug fixed gets a regression test**, with a comment explaining what
  went wrong. Six months later the comment is the only record of why that
  check exists.
- **Copy fixture values from the source of truth.** If it comes from the
  questionnaire, copy the exact string from `EditProfile.js`.
- **Do not test framework behaviour or trivial getters.** A suite padded with
  those is worse than a smaller one — it dilutes attention and slows the run.
