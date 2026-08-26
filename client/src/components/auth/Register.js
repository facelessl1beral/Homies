import React, { Fragment, useState } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { setAlert } from '../../actions/alert';
import { register, logout } from '../../actions/auth';
import PropTypes from 'prop-types';
import PasswordField from '../layout/PasswordField';

const Register = ({ setAlert, register, logout, isAuthenticated }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', password2: ''
  });
  const { firstName, lastName, email, password, password2 } = formData;
  const passwordsMatch = password.length > 0 && password === password2;
  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && password.length >= 6 && passwordsMatch;
  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    if (password !== password2) {
      setAlert('Passwords do not match', 'danger');
    } else {
      register({ firstName, lastName, email, password });
    }
  };

  // If already logged in as a different user, show a warning instead of silently redirecting
  if (isAuthenticated) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '480px', margin: '4rem auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👤</div>
        <h3 style={{ marginBottom: '0.5rem' }}>You're already logged in</h3>
        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
          To create a new account, please log out of your current session first.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
          <button
            className="btn btn-primary"
            onClick={() => { logout(); }}
          >
            Logout & Register New
          </button>
        </div>
      </div>
    );
  }

  const inputCss = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', width: '100%', fontSize: '0.95rem' };

  return (
    <Fragment>
      <h1 className='large text-primary'>Sign Up</h1>
      <p className='lead'>
        <i className='fas fa-user' /> Create Your Account
      </p>
      <form className='form' onSubmit={onSubmit}>
        <div className='form-group'>
          <input
            type='text'
            style={inputCss}
            placeholder='First Name'
            name='firstName'
            value={firstName}
            onChange={onChange}
            required
          />
        </div>
        <div className='form-group'>
          <input
            type='text'
            style={inputCss}
            placeholder='Last Name'
            name='lastName'
            value={lastName}
            onChange={onChange}
            required
          />
        </div>
        <div className='form-group'>
          <input
            type='email'
            style={inputCss}
            placeholder='Email Address'
            name='email'
            value={email}
            onChange={onChange}
            required
          />
        </div>
        <div className='form-group'>
          <PasswordField
            value={password}
            onChange={onChange}
            autoComplete='new-password'
            required
          />
          {password.length > 0 && password.length < 6 && (
            <small className='form-hint form-hint--warn'>
              {6 - password.length} more character{6 - password.length === 1 ? '' : 's'} needed
            </small>
          )}
        </div>
        <div className='form-group'>
          <PasswordField
            name='password2'
            placeholder='Confirm Password'
            value={password2}
            onChange={onChange}
            autoComplete='new-password'
            required
          />
          {/* Live confirmation feedback. Previously a mismatch was only
              discovered on submit, as a red toast, after the form had already
              been filled in — the most common registration failure, reported
              at the least useful moment. */}
          {password2.length > 0 && (
            <small className={`form-hint ${passwordsMatch ? 'form-hint--ok' : 'form-hint--warn'}`}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </small>
          )}
        </div>
        <input
          type='submit'
          className='btn btn-primary'
          value='Register'
          disabled={!canSubmit}
          style={canSubmit ? {} : { opacity: 0.5, cursor: 'not-allowed' }}
        />
      </form>
      <p className='my-1'>
        Already have an account? <Link to='/login'>Sign In</Link>
      </p>
    </Fragment>
  );
};

Register.propTypes = {
  setAlert: PropTypes.func.isRequired,
  register: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool
};

const mapStateToProps = state => ({
  isAuthenticated: state.auth.isAuthenticated
});

export default connect(mapStateToProps, { setAlert, register, logout })(Register);
