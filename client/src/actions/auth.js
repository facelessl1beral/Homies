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
    const errors = err.response.data.errors;

    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    }

    dispatch({
      type: REGISTER_FAIL
    });
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
    const errors = err.response.data.errors;

    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    }

    dispatch({
      type: LOGIN_FAIL
    });
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
