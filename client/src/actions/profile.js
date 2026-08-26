import axios from 'axios';
import { setAlert } from './alert';
import {
  GET_PROFILE,
  VIEW_PROFILE,
  GET_PROFILES,
  GET_RECOMMENDATIONS,
  RECOMMENDATIONS_ERROR,
  PROFILE_ERROR,
  REJECT_PROFILE,
  ACCEPT_PROFILE,
  CLEAR_PROFILE
  
} from './types';

export const getCurrentProfile = () => async dispatch => {
  try {
    const res = await axios.get('/api/profile/me');
    dispatch({ type: GET_PROFILE, payload: res.data });
  } catch (err) {
    dispatch({
      type: PROFILE_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};

export const getProfiles = () => async dispatch => {
  dispatch({ type: CLEAR_PROFILE });
  try {
    const res = await axios.get('/api/profile');
    dispatch({ type: GET_PROFILES, payload: res.data });
  } catch (err) {
    dispatch({
      type: PROFILE_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};

export const getRecommendations = () => async dispatch => {
  dispatch({ type: CLEAR_PROFILE });
  try {
    const res = await axios.get('/api/profile/recommended');
    dispatch({ type: GET_RECOMMENDATIONS, payload: res.data });
  } catch (err) {
    dispatch({
      type: RECOMMENDATIONS_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};

export const rejectUser = (id) => async dispatch => {
  try {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const res = await axios.post('/api/profile/reject', { id }, config);
    dispatch({ type: REJECT_PROFILE, payload: res.data });
    dispatch(setAlert('Passed', 'dark'));
    return { ok: true };
  } catch (err) {
    dispatch(setAlert('Could not save that swipe \u2014 please try again', 'danger'));
    dispatch({
      type: RECOMMENDATIONS_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};

// Returns { mutual, matchedWith } so the caller can decide whether a real
// mutual match happened. The thunk resolving to a value is deliberate: the
// swipe UI needs the answer immediately and it is not worth putting a
// transient one-shot event into global Redux state to get it there.
export const acceptUser = (id) => async dispatch => {
  try {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const res = await axios.post('/api/profile/accept', { id }, config);
    dispatch({ type: ACCEPT_PROFILE, payload: res.data.profile });
    if (res.data.mutual) {
      dispatch(setAlert("It's a match!", 'success'));
    } else {
      dispatch(setAlert('Liked \u2014 we\u2019ll tell you if they like you back', 'success'));
    }
    return { mutual: !!res.data.mutual, matchedWith: res.data.matchedWith };
  } catch (err) {
    dispatch(setAlert('Could not save that swipe \u2014 please try again', 'danger'));
    dispatch({
      type: RECOMMENDATIONS_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
    return { mutual: false, matchedWith: null, error: true };
  }
};

export const getProfileById = userId => async dispatch => {
  try {
    const res = await axios.get(`/api/profile/user/${userId}`);
    dispatch({ type: VIEW_PROFILE, payload: res.data });
  } catch (err) {
    dispatch({
      type: PROFILE_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};

export const createProfile = (formData, history, edit = false) => async dispatch => {
  try {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const res = await axios.post('/api/profile', formData, config);
    dispatch({ type: GET_PROFILE, payload: res.data });
    dispatch(setAlert(edit ? 'Profile Updated' : 'Profile Created', 'success'));
    history.push('/dashboard');
  } catch (err) {
    const errors = err.response?.data?.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    }
    dispatch({
      type: PROFILE_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status }
    });
  }
};
