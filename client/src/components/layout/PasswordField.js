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
        className='pw-field-toggle'
        onClick={() => setVisible(v => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {visible ? 'Hide' : 'Show'}
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
