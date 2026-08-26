import axios from 'axios';
import { setAlert } from './alert';
import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT,
  CLEAR_PROFILE
} from './types';
import setAuthToken from '../utils/setAuthToken';


/**
 * Turn any axios failure into something the user can act on.
 *
 * Three distinct cases, which previously all produced the same result —
 * nothing at all:
 *
 *   1. The server answered with validation errors  -> show each one
 *   2. The server answered with a single message   -> show it
 *   3. There was no response                       -> show a network message
 *
 * Case 3 is the one that mattered. `err.response` is undefined when the
 * request never reached a server: connection refused, DNS failure, timeout,
 * offline, or a CORS preflight rejection. The old code read
 * `err.response.data.errors` unguarded, which threw a second TypeError from
 * inside the catch block, so the FAIL action never dispatched and no alert
 * appeared.
 *
 * The message names the API being called, because the most common cause of
 * this in practice is REACT_APP_API_URL pointing somewhere the device cannot
 * reach — a phone on the LAN cannot resolve `localhost:5000`, since on a
 * phone `localhost` is the phone.
 */
const dispatchRequestError = (dispatch, err, fallback) => {
  const errors = err.response && err.response.data && err.response.data.errors;
  if (errors && errors.length) {
    errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    return;
  }

  const msg = err.response && err.response.data && err.response.data.msg;
  if (msg) {
    dispatch(setAlert(msg, 'danger'));
    return;
  }

  if (!err.response) {
    const target = axios.defaults.baseURL || window.location.origin;
    dispatch(setAlert(
      `${fallback} — could not reach the server at ${target}. Check that it is running and reachable from this device.`,
      'danger',
      8000
    ));
    return;
  }

  dispatch(setAlert(`${fallback} (${err.response.status})`, 'danger'));
};

// Load User
export const loadUser = () => async dispatch => {
  // Short-circuit when there is no token to check.
  //
  // This used to fire a request to /api/auth unconditionally, including for
  // logged-out visitors who obviously could not be authenticated by it. The
  // auth reducer starts at loading:true and only leaves that state when the
  // request settles, and the Navbar hid its entire right-hand cluster while
  // loading — so on any hard page load the theme toggle, the Sign up button
  // and the hamburger were all missing until the round trip finished. Against
  // a free-tier host that has spun down, that round trip is 30-60 seconds.
  //
  // A visitor with no token needs no network call to establish that they are
  // not logged in, so we settle the state immediately.
  if (!localStorage.token) {
    return dispatch({ type: AUTH_ERROR });
  }

  setAuthToken(localStorage.token);

  try {
    const res = await axios.get('/api/auth');

    dispatch({
      type: USER_LOADED,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      type: AUTH_ERROR
    });
  }
};

// Register User
export const register = ({ firstName,lastName, email, password }) => async dispatch => {
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const body = JSON.stringify({ firstName,lastName, email, password });

  try {
    const res = await axios.post('/api/users', body, config);

    dispatch({ type: CLEAR_PROFILE });
    dispatch({
      type: REGISTER_SUCCESS,
      payload: res.data
    });
    dispatch(loadUser());
  } catch (err) {
    dispatchRequestError(dispatch, err, 'Could not create your account');
    dispatch({ type: REGISTER_FAIL });
  }
};

// Login User
export const login = (email, password) => async dispatch => {
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const body = JSON.stringify({ email, password });

  try {
    const res = await axios.post('/api/auth', body, config);

    dispatch({ type: CLEAR_PROFILE });
    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data
    });

    dispatch(loadUser());
  } catch (err) {
    // err.response is undefined when the request never reached a server at
    // all — DNS failure, connection refused, timeout, offline. Reading
    // err.response.data on that threw a TypeError *inside the catch block*,
    // so LOGIN_FAIL was never dispatched and no alert was ever shown. The
    // button simply did nothing, which is the worst possible failure: the
    // user cannot tell a wrong password from an unreachable server, and has
    // no reason to think anything happened at all.
    dispatchRequestError(dispatch, err, 'Could not sign in');
    dispatch({ type: LOGIN_FAIL });
  }
};

// Logout / Clear Profile
export const logout = () => dispatch => {
  // Clear the axios default header as well as the stored token. Without this
  // the stale x-auth-token stayed attached to every subsequent request for the
  // rest of the page's life, so the next login in the same tab could send two
  // different identities depending on which code path set the header last.
  setAuthToken(null);
  dispatch({ type: CLEAR_PROFILE });
  dispatch({ type: LOGOUT });
};
