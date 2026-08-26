import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// Some transitive dependencies read window.process. Provide it, but derive
// NODE_ENV from the real build-time value instead of hardcoding 'development'
// — a hardcoded value here would disable the production service worker.
window.process = window.process || { env: { NODE_ENV: process.env.NODE_ENV } };

ReactDOM.render(<App />, document.getElementById('root'));

/**
 * Service worker registration.
 *
 * Registered in production only, and actively UNREGISTERED in development.
 *
 * The dev server emits unhashed chunk names (1.chunk.js, main.chunk.js) whose
 * contents change on every recompile. A worker caching those will hand back a
 * stale chunk that no longer matches index.html, the script fails to parse,
 * and React never mounts — a white page with one console error, which looks
 * like a broken build rather than a caching problem. That cost us a debugging
 * session, and it would have cost one every time the source changed.
 *
 * The unregister branch matters as much as the register branch: anyone who
 * ran an earlier build already has a worker installed for localhost, and it
 * will keep serving them a stale app until something removes it. This removes
 * it automatically on the next dev server load, so nobody has to know to open
 * DevTools and clear a cache by hand.
 */
if ('serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          // Poll for a new deployment while the tab stays open. Without this a
          // long-lived tab never notices a redeploy.
          setInterval(() => reg.update(), 60 * 60 * 1000);
        })
        .catch(() => { /* PWA support is optional; the app works without it */ });
    });
  } else {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(r => r.unregister()))
      .catch(() => {});
    if (window.caches) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
  }
}
