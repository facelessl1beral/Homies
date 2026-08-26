import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Password input with a show/hide toggle.
 *
 * Extracted as a shared component rather than repeated three times, because
 * the accessibility details are easy to get subtly wrong and there is no
 * reason for the student login, the registration form and the hostel admin
 * login to drift apart.
 *
 * Two details worth keeping:
 *
 *  - The toggle is a <button type="button">. Inside a <form>, a bare <button>
 *    defaults to type="submit", so tapping the eye icon would submit the form
 *    with a half-typed password and produce a spurious "Invalid credentials".
 *
 *  - aria-pressed and a live aria-label describe the current state, so a
 *    screen reader user is told whether their password is currently visible.
 *    Revealing a password on a shared or projected screen is a real risk, so
 *    it must not be possible to be in that state without knowing.
 */
const PasswordField = ({
  value,
  onChange,
  name = 'password',
  id,
  placeholder = 'Password',
  minLength = 6,
  autoComplete = 'current-password',
  required = false,
  ...rest
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className='pw-field'>
      <input
        id={id || `${name}-input`}
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        autoComplete={autoComplete}
        required={required}
        className='pw-field-input'
        {...rest}
      />
      <button
        type='button'
        className={`pw-field-toggle${visible ? ' is-visible' : ''}`}
        onClick={() => setVisible(v => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {/* An eye glyph is ambiguous on its own — an open eye could mean
            "your password is visible" or "click to make it visible". The
            slash resolves it the way every password field the user has met
            resolves it: struck through means hidden. aria-label carries the
            unambiguous wording for anyone who cannot see the icon. */}
        <svg width='18' height='18' viewBox='0 0 24 24' fill='none'
             stroke='currentColor' strokeWidth='2'
             strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
          <circle cx='12' cy='12' r='3' />
          {!visible && <line x1='3' y1='3' x2='21' y2='21' />}
        </svg>
      </button>
    </div>
  );
};

PasswordField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  minLength: PropTypes.number,
  autoComplete: PropTypes.string,
  required: PropTypes.bool,
};

export default PasswordField;
