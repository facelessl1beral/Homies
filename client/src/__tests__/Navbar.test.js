/**
 * Navbar — component tests.
 *
 * COMPONENT TESTS (see docs/TESTING.md §5). A real React component rendered
 * into a real DOM (jsdom), driven the way a user drives it. No browser, no
 * server, no network.
 *
 * These exist because of a specific reported bug: opening a URL directly, or
 * refreshing, left the navbar with a logo and nothing else — no theme toggle,
 * no Sign up, no menu button. Navigating between pages with in-app links
 * looked fine.
 *
 * The cause was that Navbar wrapped its entire right-hand cluster in
 * {!loading && ...}. The auth reducer starts at loading:true, so until auth
 * settled the whole cluster was unmounted — including the theme toggle and
 * the menu button, which do not depend on identity at all. Against a
 * free-tier backend that had spun down, "until auth settled" was 30-60
 * seconds, so the first visitor of the day saw a navbar with no controls for
 * up to a minute.
 *
 * The fix only matters in the loading state, which is transient and awkward
 * to catch by hand — you would need a throttled network and quick eyes. A
 * test holds the component in that state indefinitely, which is exactly what
 * the first block below does. Every assertion in it fails against the old
 * component.
 *
 * Navbar is connected to Redux, uses react-router's useLocation, and reads a
 * theme context, so all three are supplied rather than mocked. Using the real
 * connect() wiring means these tests also prove mapStateToProps, not just the
 * render logic.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore } from 'redux';
import Navbar from '../components/layout/Navbar';
import { ThemeContext } from '../App';

afterEach(cleanup);

// Minimal store — Navbar reads state.auth and nothing else.
const renderNavbar = auth => render(
  <Provider store={createStore(() => ({ auth }))}>
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: jest.fn() }}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </ThemeContext.Provider>
  </Provider>
);

const LOADING    = { isAuthenticated: false, loading: true };
const LOGGED_OUT = { isAuthenticated: false, loading: false };
const LOGGED_IN  = { isAuthenticated: true,  loading: false };

// Controls are found by accessible name rather than class, so the tests
// describe what a user (or a screen reader) can reach, and survive styling
// changes that rename a class.
const themeToggle = q => q.queryByLabelText(/switch to (light|dark) mode/i);
const menuButton  = q => q.queryByLabelText(/menu/i);

describe('Navbar — while authentication is still loading', () => {

  it('renders the right-hand cluster at all', () => {
    const { container } = renderNavbar(LOADING);
    expect(container.querySelector('.hm-nav-right')).toBeTruthy();
  });

  it('renders the theme toggle', () => {
    // Chrome, not identity. There is no reason for it to be unavailable
    // while we are still working out who the visitor is.
    expect(themeToggle(renderNavbar(LOADING))).toBeTruthy();
  });

  it('renders the menu button', () => {
    expect(menuButton(renderNavbar(LOADING))).toBeTruthy();
  });

  it('shows guest links rather than an empty bar', () => {
    // A returning user briefly sees "Sign up" before it swaps. Far better
    // than an empty navbar, and rare now that logged-out visitors no longer
    // wait on a network call at all.
    expect(renderNavbar(LOADING).getByText(/sign up/i)).toBeInTheDocument();
  });
});

describe('Navbar — logged out', () => {

  it('offers sign up', () => {
    expect(renderNavbar(LOGGED_OUT).getByText(/sign up/i)).toBeInTheDocument();
  });

  it('does not offer the authenticated destinations', () => {
    const q = renderNavbar(LOGGED_OUT);
    expect(q.queryByText('Discover')).toBeNull();
    expect(q.queryByText('My Profile')).toBeNull();
  });
});

describe('Navbar — logged in', () => {

  it('offers the authenticated destinations', () => {
    const q = renderNavbar(LOGGED_IN);
    expect(q.getByText('Discover')).toBeInTheDocument();
    expect(q.getByText('My Profile')).toBeInTheDocument();
  });

  it('no longer offers sign up', () => {
    expect(renderNavbar(LOGGED_IN).queryByText(/sign up/i)).toBeNull();
  });
});

describe('Navbar — the chrome is present in every state', () => {
  // The invariant the bug violated, stated once as a sweep. This is the
  // assertion most likely to catch someone reorganising the conditionals
  // later and reintroducing the same gate.
  it.each([
    ['loading',    LOADING],
    ['logged out', LOGGED_OUT],
    ['logged in',  LOGGED_IN],
  ])('theme toggle and menu button are present when %s', (_label, auth) => {
    const q = renderNavbar(auth);
    expect(themeToggle(q)).toBeTruthy();
    expect(menuButton(q)).toBeTruthy();
  });
});
