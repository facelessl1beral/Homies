#!/bin/bash
# ============================================================
# Homies — Full functional fix: Navbar + Landing + Footer + Auth reducer
# Run from: ~/Downloads/projects/hostel/Roomies
# Usage:    bash fix_all_functional.sh
# ============================================================
set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

LAYOUT="$(pwd)/client/src/components/layout"
REDUCERS="$(pwd)/client/src/reducers"
APP_CSS="$(pwd)/client/src/App.css"

echo -e "${CYAN}🔧 Homies — full functional fix starting...${NC}\n"
if [ ! -f "$APP_CSS" ]; then
  echo -e "${RED}✗ Run from the Roomies project root.${NC}"; exit 1
fi

# Backups
cp "$LAYOUT/Navbar.js"     "$LAYOUT/Navbar.js.bak3"   2>/dev/null || true
cp "$LAYOUT/Landing.js"    "$LAYOUT/Landing.js.bak3"   2>/dev/null || true
cp "$LAYOUT/Footer.js"     "$LAYOUT/Footer.js.bak3"    2>/dev/null || true
cp "$REDUCERS/auth.js"     "$REDUCERS/auth.js.bak"     2>/dev/null || true
echo -e "${GREEN}✓ Backups saved (.bak3)${NC}\n"

# ── 1. AUTH REDUCER — fix frozen loading state ─────────────
echo -e "${YELLOW}✍  Fixing reducers/auth.js...${NC}"
cat > "$REDUCERS/auth.js" << 'EOF'
import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT,
  CLEAR_PROFILE
} from '../actions/types';

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  user: null,
  profile: null
};

export default function authReducer(state = initialState, action) {
  const { type, payload } = action;
  switch (type) {
    case USER_LOADED:
      return { ...state, isAuthenticated: true, loading: false, user: payload };
    case REGISTER_SUCCESS:
    case LOGIN_SUCCESS:
      localStorage.setItem('token', payload.token);
      return { ...state, ...payload, isAuthenticated: true, loading: false };
    case REGISTER_FAIL:
    case LOGIN_FAIL:
    case AUTH_ERROR:
    case LOGOUT:
      localStorage.removeItem('token');
      return { ...state, token: null, isAuthenticated: false, loading: false, user: null };
    case CLEAR_PROFILE:
      return { ...state, profile: null };
    default:
      return state;
  }
}
EOF
echo -e "${GREEN}✓ auth reducer fixed (no more frozen loading state)${NC}"

# ── 2. NAVBAR ──────────────────────────────────────────────
echo -e "${YELLOW}✍  Writing Navbar.js...${NC}"
cat > "$LAYOUT/Navbar.js" << 'EOF'
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout } from '../../actions/auth';
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
        <span aria-hidden='true'>🏠</span>
        <span className='hm-nav-logo-text'>Homies</span>
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
EOF
echo -e "${GREEN}✓ Navbar.js written${NC}"

# ── 3. LANDING — hero bg + SVG + particles + typewriter ───
echo -e "${YELLOW}✍  Writing Landing.js...${NC}"
cat > "$LAYOUT/Landing.js" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AnimatedCounter from './AnimatedCounter';
import HowItWorks from './HowItWorks';
import Footer from './Footer';
import ParticleCanvas from './ParticleCanvas';
import MatchPreview from './MatchPreview';

const PHRASES = [
  'compatible humans.',
  'peaceful mornings.',
  'shared goals.',
  'your kind of vibe.',
  'a home away from home.',
];

const useTypewriter = (phrases, speed = 70, pause = 2200) => {
  const [text,      setText]      = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx,   setCharIdx]   = useState(0);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let t;
    if (!deleting && charIdx <= current.length) {
      t = setTimeout(() => { setText(current.slice(0, charIdx)); setCharIdx(c => c + 1); },
        charIdx === current.length ? pause : speed);
    } else if (deleting && charIdx >= 0) {
      t = setTimeout(() => { setText(current.slice(0, charIdx)); setCharIdx(c => c - 1); }, speed / 2);
    }
    if (!deleting && charIdx > current.length) setDeleting(true);
    if (deleting && charIdx < 0) { setDeleting(false); setPhraseIdx(i => (i + 1) % phrases.length); setCharIdx(0); }
    return () => clearTimeout(t);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return text;
};

const Landing = ({ isAuthenticated }) => {
  if (isAuthenticated) return <Redirect to='/dashboard' />;
  const typed = useTypewriter(PHRASES);

  return (
    <>
      <section className='landing'>

        {/* Hero background photo */}
        <div className='landing-hero-bg' aria-hidden='true'>
          <img src={require('../../img/showcase.jpg')} alt='' className='landing-hero-img' />
          <div className='landing-hero-overlay' />
        </div>

        {/* Particle network */}
        <ParticleCanvas />

        {/* SVG illustration — houses + animated dotted path */}
        <div className='landing-illustration' aria-hidden='true'>
          <svg viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <linearGradient id='hg1' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%'   stopColor='#7c3aed' stopOpacity='0.18'/>
                <stop offset='100%' stopColor='#ec4899' stopOpacity='0.10'/>
              </linearGradient>
              <linearGradient id='hg2' x1='0%' y1='100%' x2='100%' y2='0%'>
                <stop offset='0%'   stopColor='#ec4899' stopOpacity='0.15'/>
                <stop offset='100%' stopColor='#7c3aed' stopOpacity='0.08'/>
              </linearGradient>
            </defs>
            <ellipse cx='180'  cy='620' rx='260' ry='180' fill='url(#hg1)'/>
            <ellipse cx='1020' cy='160' rx='240' ry='200' fill='url(#hg2)'/>
            {/* House left — purple */}
            <g transform='translate(100,360)' opacity='0.55'>
              <path d='M0 120 L0 40 L70 -20 L140 40 L140 120 Z' fill='none' stroke='#7c3aed' strokeWidth='3' strokeLinejoin='round'/>
              <rect x='55' y='70' width='30' height='50' fill='none' stroke='#7c3aed' strokeWidth='3'/>
              <rect x='15' y='60' width='20' height='20' fill='rgba(124,58,237,0.18)' stroke='#7c3aed' strokeWidth='2.5'/>
              <rect x='105' y='60' width='20' height='20' fill='none' stroke='#7c3aed' strokeWidth='2.5'/>
            </g>
            {/* House right — pink */}
            <g transform='translate(960,440)' opacity='0.50'>
              <path d='M0 110 L0 35 L65 -18 L130 35 L130 110 Z' fill='none' stroke='#ec4899' strokeWidth='3' strokeLinejoin='round'/>
              <rect x='50' y='65' width='28' height='45' fill='none' stroke='#ec4899' strokeWidth='3'/>
              <rect x='14' y='55' width='18' height='18' fill='rgba(236,72,153,0.18)' stroke='#ec4899' strokeWidth='2.5'/>
              <rect x='98' y='55' width='18' height='18' fill='none' stroke='#ec4899' strokeWidth='2.5'/>
            </g>
            {/* Animated dotted match path */}
            <path d='M 240 450 Q 600 280 960 490' fill='none' stroke='#7c3aed' strokeWidth='2.5' strokeDasharray='6 10' opacity='0.4'>
              <animate attributeName='stroke-dashoffset' from='0' to='-48' dur='2s' repeatCount='indefinite'/>
            </path>
            {/* Handshake midpoint */}
            <text x='596' y='355' fontSize='20' textAnchor='middle' opacity='0.55'>🤝</text>
            {/* Floating dots */}
            <circle cx='600' cy='150' r='4'   fill='#ec4899' opacity='0.4'/>
            <circle cx='650' cy='200' r='3'   fill='#7c3aed' opacity='0.35'/>
            <circle cx='560' cy='220' r='2.5' fill='#7c3aed' opacity='0.3'/>
            <circle cx='300' cy='180' r='3'   fill='#ec4899' opacity='0.3'/>
            <circle cx='900' cy='650' r='3.5' fill='#7c3aed' opacity='0.3'/>
            <circle cx='780' cy='700' r='2.5' fill='#ec4899' opacity='0.25'/>
          </svg>
        </div>

        {/* Drifting blobs */}
        <div className='landing-blob landing-blob--1' aria-hidden='true'/>
        <div className='landing-blob landing-blob--2' aria-hidden='true'/>

        {/* Two-column hero */}
        <div className='landing-inner landing-inner--split'>

          <div className='landing-copy'>
            <div className='landing-eyebrow'>
              <span className='landing-eyebrow-dot' aria-hidden='true'/>
              Kyambogo University · Kampala, Uganda
            </div>

            <h1 className='landing-headline'>
              No more random<br/>pairings. Just<br/>
              <span className='text-gradient typewriter'>
                {typed}<span className='cursor' aria-hidden='true'>|</span>
              </span>
            </h1>

            <p className='landing-sub'>
              Homies matches KYU students on 22 real lifestyle factors —
              sleep schedules, study habits, cleanliness, and more.
              Find someone you'll actually want to live with.
            </p>

            <div className='landing-stats' aria-label='Platform statistics'>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={22} duration={1000}/></div>
                <div className='landing-stat-label'>Match factors</div>
              </div>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={5} duration={800}/></div>
                <div className='landing-stat-label'>Categories</div>
              </div>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={100} suffix='%' duration={1400}/></div>
                <div className='landing-stat-label'>Transparent</div>
              </div>
            </div>

            <div className='buttons'>
              <Link to='/register' className='btn btn-primary btn-lg'>Find my match →</Link>
              <Link to='/login'    className='btn btn-secondary btn-lg'>Sign in</Link>
            </div>

            <p className='landing-hint'>
              Hostel admin?{' '}
              <Link to='/admin' style={{ color: 'var(--accent-purple)', opacity: 0.8 }}>
                Manage your rooms here
              </Link>
            </p>
          </div>

          <div className='landing-demo' aria-label='Match preview demo'>
            <MatchPreview/>
          </div>
        </div>

        {/* Scroll nudge */}
        <div className='landing-scroll-hint' aria-hidden='true'>
          <span>See how it works</span>
          <div className='landing-scroll-arrow'>↓</div>
        </div>
      </section>

      <HowItWorks/>
      <Footer/>
    </>
  );
};

Landing.propTypes = { isAuthenticated: PropTypes.bool };
const mapStateToProps = state => ({ isAuthenticated: state.auth.isAuthenticated });
export default connect(mapStateToProps)(Landing);
EOF
echo -e "${GREEN}✓ Landing.js written${NC}"

# ── 4. FOOTER — all links functional ──────────────────────
echo -e "${YELLOW}✍  Writing Footer.js...${NC}"
cat > "$LAYOUT/Footer.js" << 'EOF'
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
              <a href='https://github.com/facelessl1beral/Roomies'
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
EOF
echo -e "${GREEN}✓ Footer.js written (all links use React Router Link)${NC}"

# ── 5. CSS — navbar hm-nav + container offset fix ─────────
echo -e "${YELLOW}✍  Appending CSS fixes to App.css...${NC}"
cat >> "$APP_CSS" << 'CSS'

/* ============================================
   NAVBAR — hm-nav (Airbnb-calm style)
   ============================================ */
:root { --navbar-height: 72px; }

.hm-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  height: var(--navbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  background: rgba(15,10,30,0.75);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid transparent;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
.hm-nav--scrolled {
  background: rgba(15,10,30,0.96);
  border-bottom-color: var(--border);
  box-shadow: 0 2px 24px rgba(0,0,0,0.18);
}
[data-theme="light"] .hm-nav        { background: rgba(255,255,255,0.78); }
[data-theme="light"] .hm-nav--scrolled { background: rgba(255,255,255,0.97); box-shadow: 0 2px 20px rgba(0,0,0,0.07); }

/* Logo */
.hm-nav-logo {
  display: flex; align-items: center; gap: 0.45rem;
  text-decoration: none; flex-shrink: 0;
}
.hm-nav-logo-text {
  font-family: var(--font-display);
  font-size: 1.35rem; font-weight: 700; letter-spacing: -0.03em;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* Right cluster */
.hm-nav-right { display: flex; align-items: center; gap: 0.2rem; }

/* Inline links */
.hm-nav-links { display: flex; align-items: center; gap: 0.1rem; margin-right: 0.4rem; }
.hm-nav-link {
  font-size: 0.88rem; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; padding: 0.45rem 0.85rem; border-radius: 99px;
  transition: background 0.18s, color 0.18s;
}
.hm-nav-link:hover { background: rgba(124,58,237,0.1); color: var(--text-primary); }

/* Theme toggle */
.hm-nav-icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  border: none; background: transparent; color: var(--text-secondary);
  font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.18s, transform 0.3s;
}
.hm-nav-icon-btn:hover { background: var(--bg-tertiary); transform: rotate(22deg); }

/* Sign up pill */
.hm-nav-signup {
  font-size: 0.88rem; font-weight: 600; color: var(--text-primary);
  text-decoration: none; padding: 0.45rem 1rem; border-radius: 99px;
  white-space: nowrap; transition: background 0.18s;
}
.hm-nav-signup:hover { background: var(--bg-tertiary); }

/* Auth group + hamburger */
.hm-nav-auth-group { position: relative; display: flex; align-items: center; }
.hm-nav-menu-btn {
  display: flex; align-items: center; justify-content: center;
  width: 52px; height: 38px; border-radius: 99px;
  border: 1px solid var(--border); background: var(--bg-card);
  cursor: pointer; padding: 0 12px;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.hm-nav-menu-btn:hover,
.hm-nav-menu-btn--open {
  box-shadow: 0 2px 14px rgba(0,0,0,0.16);
  border-color: var(--border-hover);
}
.hm-hamburger { display: flex; flex-direction: column; gap: 4px; width: 18px; }
.hm-hamburger span { display: block; height: 1.5px; background: var(--text-primary); border-radius: 2px; transition: all 0.2s; }

/* Admin badge */
.hm-admin-badge {
  font-size: 0.75rem; font-weight: 500; color: var(--text-muted);
  padding: 0.25rem 0.75rem; border: 1px solid var(--border);
  border-radius: 99px; margin-right: 0.35rem;
}

/* Dropdown */
.hm-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0;
  min-width: 210px; background: var(--bg-card);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  box-shadow: 0 10px 36px rgba(0,0,0,0.20);
  overflow: hidden; z-index: 500;
  animation: hmDropIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes hmDropIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.hm-dropdown-item {
  display: block; width: 100%; padding: 0.8rem 1.15rem;
  font-size: 0.88rem; font-weight: 400; color: var(--text-primary);
  text-decoration: none; background: none; border: none;
  text-align: left; cursor: pointer;
  transition: background 0.14s;
}
.hm-dropdown-item:hover        { background: var(--bg-secondary); }
.hm-dropdown-item--bold        { font-weight: 600; }
.hm-dropdown-item--muted       { color: var(--text-muted); font-size: 0.84rem; }
.hm-dropdown-item--danger      { color: var(--danger); }
.hm-dropdown-item--danger:hover { background: rgba(239,68,68,0.06); }
.hm-dropdown-divider           { height: 1px; background: var(--border); margin: 0.25rem 0; }

/* ── container offset — uses hm-nav height ── */
.container { margin-top: calc(var(--navbar-height) + 1.5rem); }

/* ── Landing hero bg ── */
.landing      { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: calc(var(--navbar-height) + 2rem) 2rem 5rem; }
.landing-hero-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.landing-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 0.15; filter: saturate(0.5); }
[data-theme="light"] .landing-hero-img { opacity: 0.08; }
.landing-hero-overlay { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(124,58,237,0.22) 0%, transparent 50%, rgba(236,72,153,0.12) 100%); }
[data-theme="light"] .landing-hero-overlay { background: linear-gradient(160deg, rgba(124,58,237,0.10) 0%, transparent 60%, rgba(236,72,153,0.06) 100%); }

/* ── Mobile ── */
@media (max-width: 768px) {
  .hm-nav { padding: 0 1.25rem; }
  .hm-nav-links { display: none; }
  .hm-nav-logo-text { font-size: 1.15rem; }
  .container { margin-top: calc(var(--navbar-height) + 1rem); }
}
@media (prefers-reduced-motion: reduce) {
  .hm-nav, .hm-dropdown { transition: none; animation: none; }
}
CSS
echo -e "${GREEN}✓ CSS appended${NC}\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅  ALL FIXED. Summary:${NC}"
echo ""
echo -e "  1. ${GREEN}reducers/auth.js${NC}     — AUTH_ERROR / LOGIN_FAIL / REGISTER_FAIL now handled"
echo -e "                           No more frozen loading state on bad credentials"
echo ""
echo -e "  2. ${GREEN}Navbar.js${NC}            — New hm-nav class (no conflict with old .navbar)"
echo -e "                           Sign up always visible · Log in in dropdown · closes on navigate"
echo -e "                           Theme toggle · scroll shadow · hostel admin state"
echo ""
echo -e "  3. ${GREEN}Landing.js${NC}           — Hero photo restored · SVG houses + animated path"
echo -e "                           Particles + blobs + typewriter + MatchPreview demo"
echo -e "                           Sign in & Sign up buttons → /login and /register correctly"
echo ""
echo -e "  4. ${GREEN}Footer.js${NC}            — All internal links use React Router <Link>"
echo -e "                           Auth-aware (different links when logged in)"
echo -e "                           External links open in new tab safely"
echo ""
echo -e "  5. ${GREEN}App.css${NC}             — .container offset fixed for hm-nav height"
echo -e "                           Hero bg CSS added · all responsive breakpoints"
echo ""
echo -e "${YELLOW}━━ NEXT STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  A. Dealbreaker pre-filter in routes/api/profile.js   (matching engine)"
echo -e "  B. Flutterwave payment gate + mount /api/payments    (biggest feature)"
echo -e "  C. Cloudinary photo upload (just needs .env creds)"
echo -e "  D. BFG Repo-Cleaner — purge .env from git history   (do before going public)"
echo -e "  E. Rate limiting on auth routes in server.js"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
