import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';
import { useTheme } from '../../App';

const Navbar = ({ auth: { isAuthenticated, loading }, logout }) => {
  const { theme, toggleTheme } = useTheme();
  const hostelToken = localStorage.getItem('hostelToken');
  const studentToken = localStorage.getItem('token');
  const isHostelAdmin = !!hostelToken && !studentToken && window.location.pathname.startsWith('/admin');

  const adminLinks = (
    <ul>
      <li><span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Hostel Admin</span></li>
      <li>
        <a href='#!' style={{ cursor: 'pointer' }} onClick={() => {
          localStorage.removeItem('hostelToken');
          localStorage.removeItem('hostelName');
          window.location.href = '/admin';
        }}>
          <span className='hide-sm'>Logout</span>
        </a>
      </li>
      <li>
        <button className='theme-toggle' onClick={toggleTheme} title='Toggle theme'>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </li>
    </ul>
  );

  const authLinks = (
    <ul>
      <li>
        <Link to='/recommendations'>
          <span className='hide-sm'>Discover</span>
        </Link>
      </li>
      <li>
        <Link to='/profiles'>
          <span className='hide-sm'>People</span>
        </Link>
      </li>
      <li>
        <Link to='/dashboard'>
          <span className='hide-sm'>My Profile</span>
        </Link>
      </li>
      <li>
        <a onClick={logout} href='#!' style={{ cursor: 'pointer' }}>
          <span className='hide-sm'>Logout</span>
        </a>
      </li>
      <li>
        <button className='theme-toggle' onClick={toggleTheme} title='Toggle theme'>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </li>
    </ul>
  );

  const guestLinks = (
    <ul>
      <li>
        <Link to='/register'>Register</Link>
      </li>
      <li>
        <Link to='/admin' style={{ opacity: 0.6, fontSize: '0.85rem' }}>Hostel Admin</Link>
      </li>
      <li>
        <Link to='/login'>Login</Link>
      </li>
      <li>
        <button className='theme-toggle' onClick={toggleTheme} title='Toggle theme'>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </li>
    </ul>
  );

  return (
    <nav className='navbar'>
      <h2>
        <Link to='/'>Homies</Link>
      </h2>
      {!loading && (
        <Fragment>{isHostelAdmin ? adminLinks : isAuthenticated ? authLinks : guestLinks}</Fragment>
      )}
    </nav>
  );
};

Navbar.propTypes = {
  logout: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(mapStateToProps, { logout })(Navbar);
