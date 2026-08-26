# Project Status

Last updated: 26 August 2026. Handin: Friday 28 August 2026.

A candid account of what works, what does not, and what was deliberately left
undone. Written on the principle that **looking finished is more dangerous
than looking unfinished** — a control enforced in one layer and bypassed in
another is worse than no control, because it stops anyone from looking.

---

## 1. What the system is

A two-sided platform. Students build lifestyle profiles, discover compatible
roommates through a swipe interface, mutually match, and are confirmed into
shared hostel rooms by hostel administrators.

```
┌──────────────┐   REACT_APP_API_URL   ┌──────────────┐
│ React client │ ────────────────────► │ Express API  │ ──► MongoDB
│ (static host)│  ◄──── CORS ────────  │  (Render)    │
└──────────────┘                       └──────────────┘
```

**The contract is `models/User.js`** — one flat document carrying auth,
profile, 22 questionnaire answers, swipe state (`accepted` / `rejected` id
arrays) and booking status. `models/Hostel.js` holds rooms as an embedded
subdocument array. There is no Match or Booking collection: a match is derived
at read time by finding reciprocal entries in `accepted`.

Two JWT flows share one secret. Student tokens carry `{ user: { id } }`;
hostel tokens carry `{ hostel: { id, role: 'admin' } }`.

---

## 2. Done — and verified

| Area | State | Verified by |
|---|---|---|
| Matching engine | Extracted to `lib/matching.js`, pure, 23 tests | `npm test` + doctor on 20 real students |
| Dealbreaker filter | Opt-out vocabulary corrected | 20/20 feeds populated (was ~0) |
| Mutual match | Server-decided; overlay only on real reciprocity | Code review + manual |
| Booking integrity | Capacity, duplicate, delete and switch guards, 19 tests | `npm test` |
| Hostel authorisation | One middleware, all 8 routes | Route audit |
| Input guards | `lib/validate.js`, 17 tests | `npm test` |
| `jsonwebtoken` | 8.5.1 → 9.x (signature bypass advisory) | Compatibility tested, all call shapes |
| API base | One mechanism (`REACT_APP_API_URL`) | doctor |
| CORS | Explicit allowlist, `x-auth-token` permitted | Not verified against a browser |
| Uploads | Mounted in all environments | Code review |
| Service worker | Network-first, versioned cache, prod-only | Manual |
| Password toggle | Shared accessible component, 3 forms | Manual |
| Touch swipe | Touch handlers added | **Needs manual check on a phone** |
| Diagnostics | `npm run doctor` | Self-evident |
| Test suite | 59 passing, stable across repeated runs | 3× consecutive |

### The five findings that mattered most

1. **The Discover feed was empty for most users.** The dealbreaker filter
   tested for `'No preference'`; the questionnaire's opt-out is `"Don't Care"`.
   Anyone answering that question matched nobody. Anyone skipping it saw a full
   feed — the exact inversion of correct behaviour.
2. **"It's a Match!" fired on every right-swipe** with no reciprocity check,
   while the admin dashboard used real mutual-match logic. The two halves of
   the system disagreed about what a match is.
3. **Booking could silently corrupt data.** `room.occupants = [a, b]` —
   assignment, not append, no validation. Two pairs could hold one room with
   nothing showing a conflict.
4. **`npm test` did not run**, and the inherited tests could not have failed
   even if it had — every assertion was swallowed by a `.catch`.
5. **Local development was talking to the deployed backend**, so running a
   local server had no effect and local API changes appeared to do nothing.

---

## 3. Known limitations — deliberate, documented

### Not fixed, with reasons

| Limitation | Why not | Remediation |
|---|---|---|
| **`mongoose` 5.13.23 is EOL** with a critical advisory | Fix requires 5 → 9. Mongoose 6 removed all four connection options `server.js` passes, and changes `strictQuery` defaults. Guaranteed breakage with no time to recover | Upgrade to 6.13.10+, remove deprecated options, audit query casting |
| **185 build-tooling advisories** | Transitive dependencies of `react-scripts@3.0.1`. They run in webpack and the dev server, never in production. `npm audit fix --force` would take react-scripts 3 → 5 | Upgrade react-scripts, or migrate to Vite |
| **Ten `roomie*` fields collected but unscored** | `roomieAge`, `roomieCourse`, `roomieFood`, `roomieDrink`, `roomieCook`, `roomieSem`, `roomieUniv`, `roomieCountry` are unused. Adding them to the *filter* is what caused the original bug; adding them to *scoring* changes documented weights | Add a sixth weighted category and rebalance |
| **Uploads do not survive a restart** | Render's free tier has an ephemeral filesystem | Mounted disk, or Cloudinary / S3 |
| **Payments are UI only** | No Payment model, no Flutterwave integration, no amounts modelled | See `docs/PAYMENTS.md` |
| **No HTTP-level tests** | No supertest; route wiring verified by inspection | Add supertest with an in-memory database |

### Behaviour that surprises people

- **A mutual match is invisible to admins unless both students chose the same
  `preferredHostel`.** By design, but nothing in the UI says so. Three of the
  eight current matches are affected.
- **A profile with no lifestyle answers scores 0% against everyone.** Correct —
  there is no evidence of compatibility — but it looks broken.
- **Render's free tier sleeps after ~15 minutes** and takes 30–60s to wake.
  Hit `/api/health` before a demonstration to warm it.

---

## 4. Remaining before handin

**Blocking**
- [ ] Untrack committed `.patch` files
- [ ] Manual test checklist (`docs/TESTING.md` §7), especially touch swipe
- [ ] Redeploy API and client; set `REACT_APP_API_URL` and `CORS_ORIGINS`
- [ ] Verify CORS against the deployed client in a real browser

**Valuable**
- [ ] Second front end on Cloudflare Pages as a demo fallback
- [ ] README rewrite

**Out of scope, stated**
- Payment processing, real-time chat, ML-based matching, mobile apps

---

## 5. Costs

Everything runs on free tiers. **Total: $0.**

| Service | Tier | Limit that matters |
|---|---|---|
| MongoDB Atlas | M0 | 512 MB |
| Render | Free web service | Sleeps after 15 min idle; 30–60s cold start |
| Cloudflare Pages | Free | Unlimited static requests |
| Gmail SMTP | App Password | ~500 emails/day |

The Render cold start is a **hosting tier characteristic, not a defect**, and
is worth stating explicitly rather than letting it be discovered during a
demonstration.

---

## 6. Why the matching model is deterministic, not ML

Stated here because it is the design decision most likely to be questioned.

A weighted-sum model was chosen over machine learning because:

1. **No historical outcome data exists.** There are no records of which
   roommate pairings succeeded, so there is nothing to train on. A model
   trained on compatibility *scores* would only learn to reproduce the scoring
   function it was trained from.
2. **Explainability is a requirement.** Every score decomposes into five
   category percentages, and the swipe card can show a student exactly which
   fields they share. A learned model would produce a number nobody could
   justify to the student it affects.
3. **Scale does not justify the overhead.** Twenty students, and a realistic
   deployment of a few hundred. The pipeline would cost more than it returns.

The engine is a documented, inspectable function — a defensible engineering
choice for this problem, not a limitation.
