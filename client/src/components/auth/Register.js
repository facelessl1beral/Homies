import React, { Fragment, useState } from 'react';
import { connect } from 'react-redux';
import { Link, Redirect } from 'react-router-dom';
import { setAlert } from '../../actions/alert';
import { register, logout } from '../../actions/auth';
import PropTypes from 'prop-types';

const Register = ({ setAlert, register, logout, isAuthenticated }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', password2: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const { firstName, lastName, email, password, password2 } = formData;
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
        <div className='form-group' style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder='Password'
            name='password'
            value={password}
            onChange={onChange}
            minLength='6'
            required
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5, fontSize: '0.85rem', userSelect: 'none' }}
          >{showPassword ? 'Hide' : 'Show'}</span>
        </div>
        <div className='form-group' style={{ position: 'relative' }}>
          <input
            type={showPassword2 ? 'text' : 'password'}
            placeholder='Confirm Password'
            name='password2'
            value={password2}
            onChange={onChange}
            minLength='6'
            required
          />
          <span
            onClick={() => setShowPassword2(!showPassword2)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5, fontSize: '0.85rem', userSelect: 'none' }}
          >{showPassword2 ? 'Hide' : 'Show'}</span>
        </div>
        <input type='submit' className='btn btn-primary' value='Register' />
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
