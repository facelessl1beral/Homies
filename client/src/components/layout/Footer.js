import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';

const Footer = ({ isAuthenticated }) => {
  const year = new Date().getFullYear();
  return (
    <footer className='site-footer'>
      <div className='footer-inner'>

        <div className='footer-brand'>
          <Link to='/' className='footer-logo'>🏠 Homies</Link>
          <p className='footer-tagline'>
            Roommate matchmaking built for Kyambogo University students.
            Match. Move in. Thrive.
          </p>
          <div className='footer-badges'>
            <span className='footer-badge footer-badge--stack'>MERN Stack</span>
            <span className='footer-badge'>KYU · {year}</span>
          </div>
        </div>

        <div className='footer-col'>
          <h4 className='footer-col-title'>Platform</h4>
          <ul>
            <li><Link to='/register'>Create account</Link></li>
            <li><Link to='/login'>Sign in</Link></li>
            {isAuthenticated ? (
              <>
                <li><Link to='/recommendations'>Discover roommates</Link></li>
                <li><Link to='/profiles'>Browse people</Link></li>
                <li><Link to='/dashboard'>My profile</Link></li>
              </>
            ) : (
              <>
                <li><Link to='/register'>Discover roommates</Link></li>
                <li><Link to='/register'>Browse people</Link></li>
              </>
            )}
          </ul>
        </div>

        <div className='footer-col'>
          <h4 className='footer-col-title'>Hostels</h4>
          <ul>
            <li><Link to='/admin'>Admin portal</Link></li>
            <li><Link to='/admin'>Manage rooms</Link></li>
            <li><Link to='/admin'>View matches</Link></li>
            <li><Link to='/admin'>Confirm bookings</Link></li>
          </ul>
        </div>

        <div className='footer-col'>
          <h4 className='footer-col-title'>Project</h4>
          <ul>
            <li>
              <a href='https://github.com/facelessl1beral/Homies'
                 target='_blank' rel='noopener noreferrer'>GitHub repo ↗</a>
            </li>
            <li>
              <a href='https://www.kyambogo.ac.ug'
                 target='_blank' rel='noopener noreferrer'>Kyambogo University ↗</a>
            </li>
            <li><span className='footer-credit'>Developer: Barry</span></li>
            <li><span className='footer-credit'>Supervisor reviewed</span></li>
          </ul>
        </div>

      </div>

      <div className='footer-bottom'>
        <span className='footer-copy'>
          © {year} Homies · Kyambogo University · Built with React, Node.js &amp; MongoDB
        </span>
        <div className='footer-bottom-badges'>
          <span className='footer-badge'>Payments by Flutterwave</span>
          <span className='footer-badge'>Photos by Cloudinary</span>
        </div>
      </div>
    </footer>
  );
};

const mapStateToProps = state => ({ isAuthenticated: state.auth.isAuthenticated });
export default connect(mapStateToProps)(Footer);
