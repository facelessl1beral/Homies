# Deployment

Two front ends, one API, one database. All on free tiers.

---

## Environment variables

### API (Render)

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | Atlas connection string |
| `JWT_SECRET` | yes | Long random string. Changing it logs everyone out |
| `NODE_ENV` | yes | `production` |
| `CORS_ORIGINS` | yes in production | Comma-separated frontend origins, no trailing slash |
| `SMTP_HOST/PORT/USER/PASS` | optional | Gmail needs an **App Password** |

Leaving `CORS_ORIGINS` blank allows any origin. Acceptable locally; set it in
production.

### Client (Vercel / Cloudflare Pages)

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://<your-api>.onrender.com` — no trailing slash |

Read at **build time**, not runtime. Changing it requires a rebuild.

---

## Render — API

- Build: `npm install`
- Start: `node server.js`
- Node version comes from `.node-version`

Health check: `GET /api/health` returns environment and database state. Use it
to confirm which backend you reached, and to wake a sleeping instance before a
demonstration.

**The free tier sleeps after ~15 minutes idle** and takes 30–60s to wake.

---

## Cloudflare Pages — client

- Build command: `npm run build`
- Output directory: `build`
- Root directory: `client`

**Use `npm run build`, not `react-scripts build` directly.** The npm script
sets `CI=false`. Cloudflare sets `CI=true`, and Create React App treats
warnings as errors under CI — the build would fail on lint warnings that are
not errors. `npm run build:strict` runs the strict version deliberately.

`client/public/_redirects` provides the SPA fallback. Without it a hard load
of `/dashboard` returns Cloudflare's own 404 and the app never boots, which is
indistinguishable from a broken deployment.

---

## Vercel — client

Same settings. `client/vercel.json` provides the SPA rewrite. It no longer
proxies `/api`; the client calls the API directly and CORS permits it.

---

## Order of operations

1. Deploy the API. Confirm `GET /api/health`.
2. Set `REACT_APP_API_URL` on the client host.
3. Deploy the client.
4. Add the client's origin to `CORS_ORIGINS` on the API. Redeploy the API.
5. Load the client, log in, confirm no CORS errors in the console.

Step 4 is the one people forget. Until it is done, every authenticated request
fails at preflight with a console error that does not resemble its cause.

---

## After redeploying

The service worker is network-first for navigations and versioned by
`CACHE_VERSION` in `client/public/sw.js`, so a redeploy is picked up on the
next load. **If you change the caching strategy, bump `CACHE_VERSION`** — a
browser holding a bad cache has no other way to escape it.

Test this deliberately: load the old build, redeploy, reload **without**
clearing site data. The new version must appear.
