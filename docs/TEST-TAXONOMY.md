# Test Categories — Unit, Component, Integration, End-to-End

The standard testing vocabulary, mapped onto what this project actually has.
Written to be answerable under questioning, including the parts where the
honest answer is "we do not have that, and here is why".

---

## 1. The categories, and where we sit

The usual model is a pyramid: many cheap fast tests at the bottom, few slow
expensive ones at the top.

```
        ╱ E2E ╲          ← real browser + real server. WE HAVE NONE.
      ╱─────────╲
    ╱ Integration ╲      ← real HTTP + real DB.       47 tests
  ╱─────────────────╲
 ╱     Component     ╲   ← React in a fake DOM.       35 tests
╱─────────────────────╲
        Unit             ← one function, no I/O.      105 tests
```

**187 automated tests, in three of the four categories.** The remaining gap is
real and is covered in §5 rather than glossed over.

| Category | Count | Command | Speed | Needs |
|---|---|---|---|---|
| Unit | 105 | `npm run test:unit` | ~50 ms | nothing |
| Component | 35 | `npm test --prefix client` | ~4 s | jsdom |
| Integration | 18 | `npm run test:api` | ~100 ms | nothing |
| Integration (DB) | 29 | `npm run test:api` | ~3 s | MongoDB |
| End-to-end | 0 | — | — | browser + server + DB |

---

## 2. Unit tests — 105

**Definition.** One function, in isolation, no I/O. Given an input, assert the
output. If it touches a disk, a network, or a clock, it is not a unit test.

**Where:** `tests/*.test.js`, run by Mocha with Node's `assert`.

| File | Tests | Unit under test |
|---|---|---|
| `matching.test.js` | 23 | `lib/matching.js` — compatibility scoring, dealbreaker filtering |
| `booking.test.js` | 19 | `lib/booking.js` — room assignment rules |
| `security.test.js` | 17 | `lib/validate.js` — input guards, JWT handling |
| `visibility.test.js` | 14 | `lib/profileVisibility.js` — field allowlist |
| `whatsapp.test.js` | 32 | `lib/whatsapp.js` — phone normalisation, link building |

**Why so many are possible here.** The logic used to live inside route
handlers, tangled with `req`, `res` and mongoose calls, and could only run
inside an HTTP request against a live database. Extracting it into `lib/` is
what made unit testing possible at all. The tests were a consequence of that
refactor, not the reason for it — though they were the motivation.

**Example.**

```javascript
it('"Don\'t Care" imposes no gender constraint', () => {
  const me = student({ gender: 'Male', roomieGender: "Don't Care" });
  const survivors = pool.filter(o => passesDealbreakers(me, o));
  assert.strictEqual(survivors.length, 4);
});
```

No database, no server, no rendering. One function, one assertion.

---

## 3. Component tests — 35

**Definition.** A UI component rendered into a simulated DOM and driven the
way a user drives it — find a control by its accessible name, click it, type
into it, assert what changed. Real component, real DOM API, no browser.

Sometimes called "integration tests" in frontend writing, because a component
integrates markup, state and event handling. This document keeps them separate
because they involve **no server and no database**, which is the distinction
that matters when someone asks what is actually covered.

**Where:** `client/src/__tests__/`, run by Jest (bundled with `react-scripts`)
with React Testing Library, in jsdom.

| File | Tests | Component |
|---|---|---|
| `PasswordField.test.js` | 9 | Visibility toggle, keyboard access, ARIA state |
| `Navbar.test.js` | 11 | Loading / logged-out / logged-in rendering |
| `Register.test.js` | 15 | Submit gating, live validation feedback |

**Why these three.** Each had a real defect that manual testing missed:

- **PasswordField** — the toggle must be `type="button"`. A bare `<button>`
  inside a `<form>` defaults to `type="submit"`, so tapping the eye submitted
  a half-typed password and returned "Invalid credentials", a failure that
  looks like a wrong password rather than a wrong button. Invisible in the
  rendered output; only a test sees it.
- **Navbar** — the whole right-hand cluster was hidden while auth loaded.
  That state is transient and hard to catch by hand; a test holds the
  component in it indefinitely.
- **Register** — submit gating is combinatorial. The interesting cases are
  four fields right and one wrong, and enumerating those by hand after every
  change to the form is exactly the work worth automating.

**Testing by accessible name, not by class.** Controls are found with
`getByLabelText(/switch to light mode/i)` rather than `.hm-nav-icon-btn`. The
tests then describe what a user — or a screen reader — can reach, and survive
a styling change that renames a class.

**Proven to fail.** The Navbar suite was validated by reintroducing the
original bug: **5 of 20 tests went red, and all passed again once reverted.**
A test that has never been seen to fail is not evidence of anything.

---

## 4. Integration tests — 47

**Definition.** Several units together with their real dependencies — routing,
middleware, handlers and the database — asserting on HTTP status codes and
response bodies. `supertest` mounts the Express app in-process, so no port is
bound and no server needs starting.

Split into two tiers by what they need:

### Tier A — 18 tests, no database (`tests/api.auth.test.js`)

Authorisation, token validation, input guards, error shape. All of these
reject *before* any handler touches mongoose, so they run anywhere with no
infrastructure. Authorisation is the boundary where being wrong is most
expensive and also the cheapest to verify, so there is no excuse for leaving
it uncovered.

### Tier B — 29 tests, needs MongoDB (`tests/api.routes.test.js`)

Registration, login, profile visibility, hostel admin routes, booking
refusals, swipe reciprocity. These run against `<database>_test`, never the
real one, and empty every collection between tests.

**When MongoDB is unreachable this block SKIPS, and says so.** A suite that
goes red because a developer has no database running teaches people to ignore
red output — worse than having no suite. A suite that silently passes when it
did not run is worse still. Mocha reports them as *pending* and the run prints
which URI it tried.

### What these catch that nothing else could

- Route wiring — a handler mounted at a path the client does not call
- Middleware order — auth running after the handler rather than before
- **Status codes** — a refusal returning 500 instead of 401 or 403
- Mongoose field names — a typo inside a handler passes every unit test
- That a write actually landed, not just that the rule said it should

**This suite found a real bug on its first run.** A hostel admin token sent to
a student route returned **500**, because `middleware/auth.js` assigned
`req.user = decoded.user` — undefined for a hostel token — and called `next()`
anyway. The request reached the handler with no user id and failed further in.
The same accidental-protection pattern already fixed on the admin side was
still present on the student side, and only a status-code assertion exposed
it.

---

## 5. End-to-end tests — 0

**Definition.** A real browser driving the real application against a real
server and database. Cypress or Playwright.

**We have none.** Instead there is a **written manual checklist**
(`docs/TESTING.md` §7) covering the flows an E2E suite would automate:
registration, questionnaire, swiping, mutual match, admin booking refusals,
and redeployment cache behaviour.

**Why manual is defensible here.** E2E suites are slow, flaky, and expensive
to maintain, and they pay off when a flow is run repeatedly across many
releases. This project has one release. A written checklist executed once
carefully gives most of the assurance at a fraction of the cost.

**Why it is still a gap.** A checklist depends on a person remembering to run
it and being honest about the result. It cannot run in CI, and it does not
protect a future contributor.

---

## 6. What none of it covers

Worth stating directly, because a report of only green results invites the
assumption that everything else was covered too.

- **123 of 187 tests run without a database.** The other 29 need one and skip
  when it is absent.
- **No test runs against the deployed environment.** Everything is local.
- **No test runs in a real browser.** CSS, responsive layout, the touch swipe
  gesture and the service worker are all manual.
- **CORS is unprovable offline** — a preflight only happens in a real browser
  against a real cross-origin request. Verified manually, in DevTools.
- **Email delivery is not asserted.** `npm run check:email` is a tool, not a
  gate.
- **No performance or load testing.**

---

## 7. Two things that are not tests

Both are gates, and both catch things tests do not.

**`npm run build --prefix client`** — proves the frontend compiles and can be
deployed. It caught a real failure: `ERR_OSSL_EVP_UNSUPPORTED`, webpack 4's
MD4 hash removed from OpenSSL in Node 17+. The build had been silently
producing an incomplete output directory for some time.

**`npm run doctor`** — a read-only diagnostic that reports on a running
system. It makes no assertions about correctness; it answers questions that
tests cannot, because tests run against fixtures and this runs against
reality:

- Which backend will the frontend actually reach?
- What is in the database?
- Per student, how many cards will their Discover feed contain?

Its reason for existing: an empty Discover feed caused by a broken filter and
an empty feed caused by an empty database look identical in a browser, and
have opposite fixes. Doctor runs the real matching engine over the real data
and tells you which one you have, in three seconds.

---

## 8. Rigour by consequence

Alongside the standard taxonomy, this project matched **depth to the cost of
being wrong**, which is a different axis and arguably the more useful one.

| Cost of being wrong | Approach | Applied to |
|---|---|---|
| Money, data loss, one user seeing another's data | Tests written **before** implementation | Booking rules, profile visibility, input guards |
| Broken workflow, silent failure | Tests alongside, covering failure paths | Matching engine, WhatsApp links |
| Cosmetic | Manual check | CSS, spacing, wording |

`tests/booking.test.js` was written before `routes/api/hostels.js` was
modified, and every assertion in it fails against the previous implementation.
Retrofitting tests onto code you have already convinced yourself is correct
produces tests that agree with the code rather than with the requirement.

---

## 9. Likely questions

**"Why no end-to-end tests?"**
Automated browser suites are slow, flaky, and expensive to maintain, and they
pay off across many releases. This project has one. A written checklist
(docs/TESTING.md §7) executed carefully gives most of the assurance at a
fraction of the cost — but it depends on a person remembering to run it, which
§5 states plainly.

**"Isn't testing without a database just testing the easy parts?"**
The parts covered are where being wrong has consequences — who can see whom,
who gets which room, what one student can learn about another. Those are the
decisions worth pinning. But the criticism is fair as far as it goes, and §6
does not dispute it.

**"What is your code coverage?"**
Not measured, deliberately. Coverage counts which lines executed, not whether
the assertions were meaningful — a test that calls a function and asserts
nothing scores 100%. §8 documents reasoning about consequence instead.

**"How do you know the tests would catch a real bug?"**
Because they have been shown to. The Navbar suite was run against the original
buggy component: 5 of 20 failed. `booking.test.js` was written before the fix
and fails entirely against the old handler.

**"What would you add first, with more time?"**
Playwright or Cypress for the end-to-end journey, and CI so the suite runs on
every push rather than when someone remembers.
