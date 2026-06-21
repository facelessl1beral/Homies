import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';
import HomiesLogo from './HomiesLogo';
import { useTheme } from '../../App';

const Navbar = ({ auth: { isAuthenticated, loading }, logout }) => {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const menuRef                   = useRef(null);
  const location                  = useLocation();

  const hostelToken   = localStorage.getItem('hostelToken');
  const studentToken  = localStorage.getItem('token');
  const isHostelAdmin = !!hostelToken && !studentToken && location.pathname.startsWith('/admin');

  // Scroll shadow
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close on outside click
  useEffect(() => {
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); setMenuOpen(false); };
  const handleAdminLogout = () => {
    localStorage.removeItem('hostelToken');
    localStorage.removeItem('hostelName');
    window.location.href = '/admin';
  };

  return (
    <nav className={`hm-nav${scrolled ? ' hm-nav--scrolled' : ''}`} role='navigation' aria-label='Main navigation'>

      {/* Logo */}
      <Link to='/' className='hm-nav-logo' aria-label='Homies home'>
        <HomiesLogo size={28} showText={true} />
      </Link>

      {/* Right cluster */}
      {!loading && (
        <div className='hm-nav-right'>

          {/* Authenticated nav links (hidden on mobile — in dropdown instead) */}
          {isAuthenticated && !isHostelAdmin && (
            <div className='hm-nav-links hide-sm'>
              <Link to='/recommendations' className='hm-nav-link'>Discover</Link>
              <Link to='/profiles'        className='hm-nav-link'>People</Link>
              <Link to='/dashboard'       className='hm-nav-link'>My Profile</Link>
            </div>
          )}

          {/* Theme toggle */}
          <button
            className='hm-nav-icon-btn'
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          {/* ── GUEST ── */}
          {!isAuthenticated && !isHostelAdmin && (
            <div className='hm-nav-auth-group' ref={menuRef}>
              {/* Sign up pill — always visible */}
              <Link
                to='/register'
                className='hm-nav-signup'
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>

              {/* Hamburger + dropdown */}
              <button
                className={`hm-nav-menu-btn${menuOpen ? ' hm-nav-menu-btn--open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label='Open navigation menu'
                aria-expanded={menuOpen}
                aria-haspopup='true'
              >
                <span className='hm-hamburger'>
                  <span /><span /><span />
                </span>
              </button>

              {menuOpen && (
                <div className='hm-dropdown' role='menu' aria-label='Navigation menu'>
                  <Link to='/login'    className='hm-dropdown-item hm-dropdown-item--bold' role='menuitem' onClick={() => setMenuOpen(false)}>Log in</Link>
                  <Link to='/register' className='hm-dropdown-item'                        role='menuitem' onClick={() => setMenuOpen(false)}>Sign up</Link>
                  <div className='hm-dropdown-divider' role='separator' />
                  <Link to='/admin'    className='hm-dropdown-item hm-dropdown-item--muted' role='menuitem' onClick={() => setMenuOpen(false)}>Hostel admin portal</Link>
                </div>
              )}
            </div>
          )}

          {/* ── AUTHENTICATED STUDENT ── */}
          {isAuthenticated && !isHostelAdmin && (
            <div className='hm-nav-auth-group' ref={menuRef}>
              <button
                className={`hm-nav-menu-btn${menuOpen ? ' hm-nav-menu-btn--open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label='Open navigation menu'
                aria-expanded={menuOpen}
              >
                <span className='hm-hamburger'><span /><span /><span /></span>
              </button>

              {menuOpen && (
                <div className='hm-dropdown' role='menu'>
                  <Link to='/dashboard'       className='hm-dropdown-item' role='menuitem' onClick={() => setMenuOpen(false)}>My profile</Link>
                  <Link to='/recommendations' className='hm-dropdown-item' role='menuitem' onClick={() => setMenuOpen(false)}>Discover roommates</Link>
                  <Link to='/profiles'        className='hm-dropdown-item' role='menuitem' onClick={() => setMenuOpen(false)}>Browse people</Link>
                  <div className='hm-dropdown-divider' role='separator' />
                  <button className='hm-dropdown-item hm-dropdown-item--danger' role='menuitem' onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          )}

          {/* ── HOSTEL ADMIN ── */}
          {isHostelAdmin && (
            <div className='hm-nav-auth-group' ref={menuRef}>
              <span className='hm-admin-badge'>Hostel Admin</span>
              <button
                className='hm-nav-menu-btn'
                onClick={() => setMenuOpen(o => !o)}
                aria-label='Open navigation menu'
              >
                <span className='hm-hamburger'><span /><span /><span /></span>
              </button>
              {menuOpen && (
                <div className='hm-dropdown' role='menu'>
                  <button className='hm-dropdown-item hm-dropdown-item--danger' role='menuitem' onClick={handleAdminLogout}>Log out</button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </nav>
  );
};

Navbar.propTypes = {
  logout: PropTypes.func.isRequired,
  auth:   PropTypes.object.isRequired,
};
const mapStateToProps = state => ({ auth: state.auth });
export default connect(mapStateToProps, { logout })(Navbar);
