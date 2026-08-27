/**
 * PasswordField — component tests.
 *
 * COMPONENT TESTS (see docs/TESTING.md). These render a real React component
 * into a real DOM (jsdom) and interact with it the way a user would: finding
 * controls by their accessible name, clicking, typing. Nothing is mocked.
 *
 * They are not unit tests — a unit test would call a function and inspect its
 * return value, and this component's whole job is behaviour that only exists
 * once it is rendered. They are not end-to-end tests either: there is no
 * browser, no server, no network.
 *
 * Why this component is worth testing at all
 * ------------------------------------------
 * Two of the three things it fixes are invisible in the rendered output and
 * therefore invisible to manual testing:
 *
 *   1. The toggle is type="button". A bare <button> inside a <form> defaults
 *      to type="submit", so tapping the eye would submit a half-typed
 *      password and return "Invalid credentials" — a failure that looks like
 *      a wrong password rather than a wrong button.
 *
 *   2. aria-pressed and the state-dependent aria-label are what tell a screen
 *      reader user whether their password is currently visible on screen. You
 *      cannot see that by looking, so nobody would notice it regressing.
 *
 * Both are pinned below.
 */

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import PasswordField from '../components/layout/PasswordField';

afterEach(cleanup);

// The component is controlled, so tests need a stateful wrapper. Without one,
// typing would appear to do nothing and every test would be testing the
// harness rather than the component.
const Controlled = props => {
  const [value, setValue] = React.useState('');
  return <PasswordField value={value} onChange={e => setValue(e.target.value)} {...props} />;
};

describe('PasswordField', () => {

  it('hides the password by default', () => {
    const { container } = render(<Controlled />);
    expect(container.querySelector('input').type).toBe('password');
  });

  it('reveals and re-hides the password when the toggle is clicked', () => {
    const { container, getByLabelText } = render(<Controlled />);
    const input = container.querySelector('input');

    fireEvent.click(getByLabelText('Show password'));
    expect(input.type).toBe('text');

    fireEvent.click(getByLabelText('Hide password'));
    expect(input.type).toBe('password');
  });

  it('is a button, not a submit — so it cannot submit the form it sits in', () => {
    // The regression that would be least obvious in manual testing: clicking
    // the eye would submit a partially typed password and produce an
    // "Invalid credentials" error that looks like a wrong password.
    const { getByLabelText } = render(<Controlled />);
    expect(getByLabelText('Show password').getAttribute('type')).toBe('button');
  });

  it('announces its state to assistive technology', () => {
    // aria-pressed and the label are the only signal a screen reader user has
    // that their password is currently visible on screen. Revealing a
    // password on a shared or projected display is a real risk, so it must
    // not be possible to be in that state unknowingly.
    const { getByLabelText } = render(<Controlled />);

    const hidden = getByLabelText('Show password');
    expect(hidden.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(hidden);
    const shown = getByLabelText('Hide password');
    expect(shown.getAttribute('aria-pressed')).toBe('true');
  });

  it('is reachable by keyboard', () => {
    // The implementation this replaced used a clickable <span>, which is not
    // focusable, so a keyboard-only user had no way to check what they typed.
    const { getByLabelText } = render(<Controlled />);
    const toggle = getByLabelText('Show password');
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it('reports typed characters to its parent', () => {
    const onChange = jest.fn();
    const { container } = render(<PasswordField value='' onChange={onChange} />);
    fireEvent.change(container.querySelector('input'), { target: { value: 'hunter2' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('keeps the value intact across a visibility toggle', () => {
    const { container, getByLabelText } = render(<Controlled />);
    const input = container.querySelector('input');

    fireEvent.change(input, { target: { value: 'secret123' } });
    fireEvent.click(getByLabelText('Show password'));

    expect(container.querySelector('input').value).toBe('secret123');
  });

  it('passes through name and autoComplete so browsers fill it correctly', () => {
    const { container } = render(
      <Controlled name='password2' autoComplete='new-password' />
    );
    const input = container.querySelector('input');
    expect(input.name).toBe('password2');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  it('renders each field with independent visibility state', () => {
    // HostelLogin previously drove three fields from one shared flag, so
    // revealing the login password also revealed the new password and its
    // confirmation.
    const { getAllByLabelText, container } = render(
      <div>
        <Controlled name='password' />
        <Controlled name='password2' />
      </div>
    );

    fireEvent.click(getAllByLabelText('Show password')[0]);

    const inputs = container.querySelectorAll('input');
    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('password');
  });
});
