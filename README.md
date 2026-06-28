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
- Backend: Node.js v22, Express.js, Helmet
- Database: MongoDB 7 (dev) / MongoDB Atlas (production)
- Auth: JWT — separate token flows for students and hostel admins
- File upload: Multer
- Email: Nodemailer SMTP
- Payments: Flutterwave — MTN Mobile Money, Airtel Money (Phase 4)
- PWA: Web App Manifest + Service Worker

## Getting Started

### Prerequisites
- Node.js v22
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

### Running Locally

Terminal 1 — Backend:

    node server.js

Terminal 2 — Frontend:

    cd client && NODE_OPTIONS=--openssl-legacy-provider npm start

- App: http://localhost:3000
- API: http://localhost:5000
- Admin: http://localhost:3000/admin

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

## Academic Context

Final year Information Systems project — Kyambogo University, June 2026.
Deterministic weighted-sum model chosen over ML: no historical outcome data, explainability required for academic review, scale does not justify ML pipeline overhead.

## License

MIT
