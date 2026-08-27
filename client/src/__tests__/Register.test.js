/**
 * Register — component tests.
 *
 * COMPONENT TESTS (see docs/TESTING.md §5).
 *
 * The behaviour under test is submit gating: the button stays disabled until
 * the form can actually succeed, and the password fields report their state
 * as the user types.
 *
 * Before this, a password mismatch was only reported on submit, as a red
 * toast, after the whole form had been filled in. That is the most common
 * registration failure delivered at the least useful moment — the user has
 * already committed the effort, and the feedback arrives detached from the
 * field that caused it.
 *
 * Gating logic is easy to get subtly wrong in ways manual testing misses,
 * because it has a combinatorial shape: five inputs, and the interesting
 * cases are the ones where four are right and one is not. Enumerating those
 * by hand every time the form changes is exactly the work worth automating.
 *
 * Register is connected to Redux and renders <Link>, so a store and a Router
 * are supplied. setAlert and register are real action creators but never
 * reach the network here, because submit is never successfully triggered in
 * these tests — the assertions are all about the state before submission.
 */

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore } from 'redux';
import Register from '../components/auth/Register';

afterEach(cleanup);

const renderRegister = () => render(
  <Provider store={createStore(() => ({ auth: { isAuthenticated: false, loading: false } }))}>
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  </Provider>
);

/** Fill the form. Omit a field or pass a bad value to test the gate. */
const fill = (q, { firstName = 'Ash', lastName = 'K', email = 'a@b.com',
                   password = 'secret123', password2 = 'secret123' } = {}) => {
  const set = (placeholder, value) => {
    const el = q.container.querySelector(`input[placeholder="${placeholder}"]`);
    if (el) fireEvent.change(el, { target: { value } });
  };
  set('First Name', firstName);
  set('Last Name', lastName);
  set('Email Address', email);
  set('Password', password);
  set('Confirm Password', password2);
};

const submitButton = q => q.container.querySelector('input[type="submit"]');

describe('Register — submit gating', () => {

  it('starts disabled on an empty form', () => {
    expect(submitButton(renderRegister()).disabled).toBe(true);
  });

  it('enables once every field is valid', () => {
    const q = renderRegister();
    fill(q);
    expect(submitButton(q).disabled).toBe(false);
  });

  it('stays disabled when the passwords do not match', () => {
    // The single most common registration failure, previously only reported
    // after submit.
    const q = renderRegister();
    fill(q, { password: 'secret123', password2: 'secret124' });
    expect(submitButton(q).disabled).toBe(true);
  });

  it('stays disabled when the password is too short', () => {
    const q = renderRegister();
    fill(q, { password: 'abc', password2: 'abc' });
    expect(submitButton(q).disabled).toBe(true);
  });

  it.each([
    ['first name', { firstName: '' }],
    ['last name',  { lastName: '' }],
    ['email',      { email: '' }],
  ])('stays disabled when the %s is missing', (_label, overrides) => {
    // The combinatorial cases: four fields right, one wrong. Checking these
    // by hand after every change to the form is the work this replaces.
    const q = renderRegister();
    fill(q, overrides);
    expect(submitButton(q).disabled).toBe(true);
  });

  it('treats whitespace as empty', () => {
    const q = renderRegister();
    fill(q, { firstName: '   ' });
    expect(submitButton(q).disabled).toBe(true);
  });
});

describe('Register — live feedback', () => {

  it('says nothing about matching before the confirmation is typed', () => {
    // Feedback on an untouched field is noise, and trains people to ignore it.
    const q = renderRegister();
    fill(q, { password2: '' });
    expect(q.queryByText(/passwords/i)).toBeNull();
  });

  it('reports a mismatch as the user types, not on submit', () => {
    const q = renderRegister();
    fill(q, { password2: 'wrong' });
    expect(q.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('confirms a match', () => {
    const q = renderRegister();
    fill(q);
    expect(q.getByText(/passwords match/i)).toBeInTheDocument();
  });

  it('counts the characters still needed on a short password', () => {
    const q = renderRegister();
    fill(q, { password: 'abcd', password2: '' });
    expect(q.getByText(/2 more characters/i)).toBeInTheDocument();
  });

  it('uses the singular when one character remains', () => {
    // Small, but "1 more characters" is the kind of detail that makes an
    // interface feel unfinished, and nobody notices it in review.
    const q = renderRegister();
    fill(q, { password: 'abcde', password2: '' });
    expect(q.getByText(/1 more character\b/i)).toBeInTheDocument();
  });
});

describe('Register — password fields', () => {

  it('masks both password inputs by default', () => {
    const q = renderRegister();
    const pw  = q.container.querySelector('input[placeholder="Password"]');
    const pw2 = q.container.querySelector('input[placeholder="Confirm Password"]');
    expect(pw.type).toBe('password');
    expect(pw2.type).toBe('password');
  });

  it('gives each field its own visibility toggle', () => {
    // A single shared toggle would reveal the new password while the user is
    // confirming it — the failure HostelLogin had.
    const q = renderRegister();
    expect(q.getAllByLabelText(/show password/i).length).toBe(2);
  });
});
