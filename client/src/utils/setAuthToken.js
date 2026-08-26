import axios from 'axios';

/**
 * Where the API lives.
 *
 * One mechanism, used everywhere:
 *
 *   REACT_APP_API_URL unset  -> relative paths, same origin as the frontend
 *   REACT_APP_API_URL set    -> that origin
 *
 * Local development reads client/.env.development, which points at
 * http://localhost:5000. Production reads the value set in the hosting
 * platform's environment variables.
 *
 * This replaces three separate mechanisms that disagreed with each other: a
 * `proxy` entry in client/package.json pointing at the deployed backend, a
 * rewrite rule in vercel.json, and a single component that checked
 * REACT_APP_API_URL by hand while the other twenty-one calls used relative
 * paths. The worst consequence was that `npm start` forwarded every API call
 * to the *deployed* backend, so running a local server changed nothing and
 * every request paid a cold-start delay against a remote host.
 *
 * Because the client now calls the API cross-origin, the server has matching
 * CORS configuration. The two must be changed together.
 */
export const API_BASE = process.env.REACT_APP_API_URL || '';

axios.defaults.baseURL = API_BASE;

// A request that never settles is worse than one that fails: the auth reducer
// stays in its loading state and parts of the UI wait forever. Generous enough
// to survive a free-tier cold start, finite enough to eventually give up.
axios.defaults.timeout = 45000;

const setAuthToken = token => {
  if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

export default setAuthToken;
