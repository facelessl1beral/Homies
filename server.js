const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ override: false }); // Render injects env vars directly

const app = express();

// Middleware
app.use(express.json({ extended: false }));
app.use(helmet());

/**
 * CORS.
 *
 * The frontend and the API are deployed to different origins (the client to a
 * static host, the API here), so the browser will refuse cross-origin requests
 * unless this server says otherwise.
 *
 * Until now this was avoided rather than solved: the dev server had a `proxy`
 * entry and Vercel had a rewrite rule, both of which made the API look
 * same-origin by forwarding through the frontend host. That worked, but it
 * meant three different mechanisms resolved API URLs in three environments,
 * and none of them applied locally in the way anyone expected — `npm start`
 * forwarded every call to the *deployed* backend, so running a local server
 * had no effect at all.
 *
 * Handling CORS properly here means the client can call the API directly and
 * one mechanism (REACT_APP_API_URL) works everywhere.
 *
 * The allowlist comes from CORS_ORIGINS, comma separated. When it is not set
 * we allow any origin, which is correct for local development and for an
 * academic deployment where the API holds no secrets beyond what a logged-in
 * student can already see. Set it in production to name the real frontends.
 */
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header: same-origin requests, curl, and health checks.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  // x-auth-token is not a CORS-safelisted header, so it must be named
  // explicitly or every authenticated request fails its preflight.
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kyu_hostel', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
// Routes
app.use('/api/users',   require('./routes/api/users'));
app.use('/api/auth',    require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/hostels', require('./routes/api/hostels'));
app.use('/api/upload', require('./routes/api/upload'));

const path = require('path');

/**
 * Uploaded avatars.
 *
 * Multer writes to client/public/uploads. In production the server serves
 * client/build, and nothing mounted client/public — so a photo uploaded after
 * deployment was written to a directory no route could reach and the avatar
 * came back as index.html. It only appeared to work because
 * `react-scripts build` copies public/ into build/ at build time, so images
 * committed before a deploy were served and images uploaded after one were
 * not.
 *
 * Mounting the upload directory explicitly makes the behaviour identical in
 * development and production.
 *
 * Note this does not survive a restart on an ephemeral filesystem such as
 * Render's free tier. Persisting uploads needs a mounted disk or object
 * storage; see docs. This at least makes them work for the life of the
 * instance instead of never.
 */
app.use('/uploads', express.static(path.join(__dirname, 'client', 'public', 'uploads')));

// Lightweight health check. Useful for confirming which backend you have
// actually reached, and for waking a spun-down free-tier instance before a
// demo rather than during one.
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    database: states[mongoose.connection.readyState] || 'unknown',
    time: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
