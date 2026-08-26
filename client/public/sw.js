/**
 * Homies service worker.
 *
 * Strategy, and why
 * -----------------
 * The previous version was cache-first for every non-API GET, with a
 * hardcoded cache name that was never bumped. Once a build was cached it was
 * served forever. During development that meant a source change produced a
 * white screen — the worker returned a stale chunk that no longer matched
 * index.html, the script failed, React never mounted. In production it meant
 * a returning visitor kept the old app after a redeploy, permanently, with no
 * way to know they needed to clear a cache.
 *
 * The rule that fixes it: **anything that can change gets network-first;
 * only content-hashed files get cache-first.**
 *
 * CRA emits hashed filenames for production JS and CSS (main.3fe4683b.chunk.js).
 * A hashed URL's contents can never change, so caching it forever is safe and
 * correct. Everything else — navigations, index.html, the manifest — is
 * fetched fresh when the network allows, and only falls back to cache when
 * offline. That preserves offline capability while making a redeploy take
 * effect immediately.
 *
 * CACHE_VERSION must be bumped whenever this file's caching behaviour changes.
 * The activate handler deletes every cache that does not match, which is what
 * lets a broken cache heal itself rather than requiring users to clear it.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `homies-${CACHE_VERSION}`;
const OFFLINE_URL = '/index.html';

// Deliberately minimal. The previous version precached
// '/static/js/bundle.js', '/static/js/main.chunk.js' and '/static/js/1.chunk.js'
// — dev-server filenames that do not exist in a production build. cache.addAll
// rejects the whole batch if any single entry 404s, so the precache silently
// did nothing in production and the "offline capable" claim was only true by
// accident via runtime caching. Precaching just the shell avoids that trap.
const PRECACHE = ['/', OFFLINE_URL, '/manifest.json'];

const isHashedAsset = url =>
  /\/static\/(js|css|media)\/.+\.[0-9a-f]{8,}\.(js|css|woff2?|png|jpe?g|svg|gif)$/.test(url.pathname);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll is all-or-nothing, so each entry is added individually and a
      // single missing file cannot take the whole precache down with it.
      .then(cache => Promise.all(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (!url.protocol.startsWith('http')) return;

  // Never touch the API or uploaded media. Caching an authenticated response
  // risks showing one student another student's data after a login switch.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  // Never cache cross-origin requests. With REACT_APP_API_URL the API is now a
  // different origin, and the pathname check above would not catch it.
  if (url.origin !== self.location.origin) return;

  // Content-hashed assets: safe to cache forever, because the URL changes
  // whenever the content does.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // Everything else: network first, cache only as an offline fallback.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

// Lets the page tell a waiting worker to take over immediately.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
