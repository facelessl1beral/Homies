# Homies — Match. Move in. Thrive.

A two-sided web platform for hostel roommate matchmaking and room booking, built for students at Kyambogo University (KYU), Kampala, Uganda.

## What It Does

Students create detailed lifestyle profiles, discover compatible roommates through a Tinder-style swipe interface, mutually match, and are confirmed into shared hostel rooms by administrators through a managed booking confirmation flow.

## Key Features

- Matching Engine V2 — 22 fields, 5 weighted categories (Lifestyle 40%, Habits 20%, Academic 15%, Demographic 10%, Hostel 15%)
- Dealbreaker pre-filter — hard incompatibilities excluded before scoring
- Match insight tooltips — each swipe card shows shared and different fields
- Tinder-style swipe interface — accept, reject, mutual match detection
- Hostel admin portal — room management and booking confirmation
- Room management — batch add, view occupants, remove or switch students
- Profile photo upload — direct device upload via Multer
- Dark/light theme — CSS variable system, persists across sessions
- PWA — installable on Android/iOS, offline capable via Service Worker
- Mobile-first — fully responsive across 375px, 480px, 768px
- Landing page — hero photo, typewriter, animated counters, live hostel listing
- Cold start nudge — prompt when fewer than 3 lifestyle fields completed

## Tech Stack

- Frontend: React 16, Redux, React Router v5, Bootstrap 4
- Backend: Node.js 18+, Express.js, Helmet, CORS
- Database: MongoDB 7 (dev) / MongoDB Atlas (production)
- Testing: Mocha 10 + Node assert — 59 unit tests, no database required
- Auth: JWT — separate token flows for students and hostel admins
- File upload: Multer
- Email: Nodemailer SMTP
- Payments: mobile money UI prototype — MTN, Airtel (no gateway integration)
- PWA: Web App Manifest + Service Worker

## Getting Started

### Prerequisites
- Node.js 18 or newer (deployment pins 18.20.0 via `.node-version`)
- MongoDB 7
- npm

### Installation

    git clone https://github.com/facelessl1beral/Homies.git
    cd Homies
    npm install
    cd client && npm install && cd ..

Create a .env file in the root:

    MONGO_URI=mongodb://127.0.0.1:27017/kyu_hostel
    JWT_SECRET=your_jwt_secret
    NODE_ENV=development
    PORT=5000
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_gmail@gmail.com
    SMTP_PASS=your_gmail_app_password
    FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret
    FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public

Copy `.env.example` to `.env` and fill it in. `client/.env.development`
already points the frontend at `http://localhost:5000` and needs no changes.

### Running Locally

Terminal 1 — Backend:

    node server.js

Terminal 2 — Frontend:

    cd client && npm start

- App: http://localhost:3000
- API: http://localhost:5000
- Admin: http://localhost:3000/admin
- Health: http://localhost:5000/api/health

### Verifying

    npm test                        # 59 unit tests
    npm run doctor                  # environment + data diagnostic
    npm run build --prefix client   # production build

`npm run doctor` is the fastest way to find out whether anything is wrong. It
reports which backend the frontend will reach, what is in the database, and —
per student — how many cards their Discover feed will contain. See
[docs/TESTING.md](docs/TESTING.md).

## Matching Algorithm

### Stage 1 — Dealbreaker Filter
Hard incompatibilities excluded before scoring: smoker vs non-smoker, gender preference mismatch.

### Stage 2 — Weighted Category Scoring

| Category   | Weight | Fields |
|------------|--------|--------|
| Lifestyle  | 40%    | Sleep schedule, cleanliness, study preference, social, noise, guests, exercise |
| Habits     | 20%    | Food, smoking, drinking, cooking |
| Academic   | 15%    | University, course, semester |
| Demographic| 10%    | Gender, age, country |
| Hostel     | 15%    | Preferred hostel, room type, floor, bathroom, proximity |

Formula: finalScore = (Lifestyle x 0.40) + (Habits x 0.20) + (Academic x 0.15) + (Demographic x 0.10) + (Hostel x 0.15)

Result rounded to nearest integer. Verified by hand calculation against live data.

## Documentation

| Document | Contents |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | What works, what does not, known limitations |
| [docs/TESTING.md](docs/TESTING.md) | Test framework, tiers, manual checklist, the doctor |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment variables, Render, Cloudflare Pages, Vercel |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Mobile money prototype and what integration needs |

## Known Constraints

- **Render's free tier sleeps** after ~15 minutes idle and takes 30–60 seconds
  to wake. Hit `/api/health` before a demonstration to warm it. This is a
  hosting tier characteristic, not a defect.
- **Uploaded photos do not survive a restart** on Render's ephemeral
  filesystem. Persisting them needs a mounted disk or object storage.
- **`mongoose` 5.x is end-of-life** and carries advisories that cannot be
  resolved without a four major-version upgrade. Input guards in
  `lib/validate.js` close the reachable paths; see docs/STATUS.md §3.
- **Payments are user interface only.** Nothing is charged. See docs/PAYMENTS.md.

## Academic Context

Final year Information Systems project — Kyambogo University, June 2026.
Deterministic weighted-sum model chosen over ML: no historical outcome data, explainability required for academic review, scale does not justify ML pipeline overhead.

## License

MIT
