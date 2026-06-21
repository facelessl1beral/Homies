#!/bin/bash
# ============================================================
# Homies — Landing / HowItWorks / Footer integration script
# Run from: ~/Downloads/projects/hostel/Roomies
# Usage:    bash integrate.sh
# ============================================================

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

PROJECT_ROOT="$(pwd)"
LAYOUT="$PROJECT_ROOT/client/src/components/layout"
APP_CSS="$PROJECT_ROOT/client/src/App.css"

echo -e "${CYAN}🏠 Homies integration script starting...${NC}\n"

# ── Safety check ──────────────────────────────────────────
if [ ! -f "$APP_CSS" ]; then
  echo -e "${RED}✗ Not in the Roomies project root. cd into ~/Downloads/projects/hostel/Roomies first.${NC}"
  exit 1
fi

# ── Backup ────────────────────────────────────────────────
echo -e "${YELLOW}📦 Backing up existing files...${NC}"
cp "$LAYOUT/Landing.js"  "$LAYOUT/Landing.js.bak"
cp "$APP_CSS"             "${APP_CSS}.bak"
echo -e "${GREEN}✓ Backups saved (.bak files alongside originals)${NC}\n"

# ── Write Landing.js ──────────────────────────────────────
echo -e "${YELLOW}✍  Writing Landing.js...${NC}"
cat > "$LAYOUT/Landing.js" << 'LANDING'
import React from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AnimatedCounter from './AnimatedCounter';
import HowItWorks from './HowItWorks';
import Footer from './Footer';

const Landing = ({ isAuthenticated }) => {
  if (isAuthenticated) return <Redirect to='/dashboard' />;

  return (
    <>
      <section className='landing'>
        <div className='landing-hero-bg'>
          <img
            src={require('../../img/showcase.jpg')}
            alt='Students in a hostel common area'
            className='landing-hero-img'
          />
          <div className='landing-hero-overlay' />
        </div>

        <div className='landing-illustration' aria-hidden='true'>
          <svg viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <linearGradient id='houseGrad1' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='#7c3aed' stopOpacity='0.18' />
                <stop offset='100%' stopColor='#ec4899' stopOpacity='0.10' />
              </linearGradient>
              <linearGradient id='houseGrad2' x1='0%' y1='100%' x2='100%' y2='0%'>
                <stop offset='0%' stopColor='#ec4899' stopOpacity='0.15' />
                <stop offset='100%' stopColor='#7c3aed' stopOpacity='0.08' />
              </linearGradient>
            </defs>
            <ellipse cx='180' cy='620' rx='260' ry='180' fill='url(#houseGrad1)' />
            <ellipse cx='1020' cy='160' rx='240' ry='200' fill='url(#houseGrad2)' />
            <g transform='translate(140, 380)' opacity='0.5'>
              <path d='M0 120 L0 40 L70 -20 L140 40 L140 120 Z' fill='none' stroke='#7c3aed' strokeWidth='3' strokeLinejoin='round' />
              <rect x='55' y='70' width='30' height='50' fill='none' stroke='#7c3aed' strokeWidth='3' />
              <rect x='15' y='60' width='20' height='20' fill='none' stroke='#7c3aed' strokeWidth='2.5' />
              <rect x='105' y='60' width='20' height='20' fill='none' stroke='#7c3aed' strokeWidth='2.5' />
            </g>
            <g transform='translate(940, 460)' opacity='0.45'>
              <path d='M0 110 L0 35 L65 -18 L130 35 L130 110 Z' fill='none' stroke='#ec4899' strokeWidth='3' strokeLinejoin='round' />
              <rect x='50' y='65' width='28' height='45' fill='none' stroke='#ec4899' strokeWidth='3' />
              <rect x='14' y='55' width='18' height='18' fill='none' stroke='#ec4899' strokeWidth='2.5' />
              <rect x='98' y='55' width='18' height='18' fill='none' stroke='#ec4899' strokeWidth='2.5' />
            </g>
            <path d='M 280 470 Q 600 320 940 510' fill='none' stroke='#7c3aed' strokeWidth='2' strokeDasharray='6 10' opacity='0.35' />
            <circle cx='600' cy='150' r='4' fill='#ec4899' opacity='0.4' />
            <circle cx='650' cy='200' r='3' fill='#7c3aed' opacity='0.35' />
            <circle cx='560' cy='220' r='2.5' fill='#7c3aed' opacity='0.3' />
            <circle cx='300' cy='180' r='3' fill='#ec4899' opacity='0.3' />
            <circle cx='900' cy='650' r='3.5' fill='#7c3aed' opacity='0.3' />
            <circle cx='780' cy='700' r='2.5' fill='#ec4899' opacity='0.25' />
          </svg>
        </div>

        <div className='landing-inner'>
          <div className='landing-eyebrow'>Kyambogo University · Kampala</div>
          <h1 className='landing-headline'>
            Find your perfect<br />
            <span className='text-gradient'>hostel roommate</span>
          </h1>
          <p className='landing-sub'>
            Compatibility matching across 22 lifestyle factors.<br />
            No more random pairings — just compatible humans.
          </p>
          <div className='landing-stats'>
            <div className='landing-stat'>
              <div className='landing-stat-num'><AnimatedCounter target={22} duration={1000} /></div>
              <div className='landing-stat-label'>Compatibility factors</div>
            </div>
            <div className='landing-stat'>
              <div className='landing-stat-num'><AnimatedCounter target={5} duration={800} /></div>
              <div className='landing-stat-label'>Weighted categories</div>
            </div>
            <div className='landing-stat'>
              <div className='landing-stat-num'><AnimatedCounter target={100} suffix='%' duration={1400} /></div>
              <div className='landing-stat-label'>Transparent scoring</div>
            </div>
          </div>
          <div className='buttons'>
            <Link to='/register' className='btn btn-primary btn-lg'>Get started →</Link>
            <Link to='/login' className='btn btn-secondary btn-lg'>Sign in</Link>
          </div>
          <p className='landing-hint'>
            Hostel admin?{' '}
            <Link to='/admin' style={{ color: 'var(--accent-purple)', opacity: 0.8 }}>Sign in here</Link>
          </p>
        </div>
      </section>
      <HowItWorks />
      <Footer />
    </>
  );
};

Landing.propTypes = { isAuthenticated: PropTypes.bool };
const mapStateToProps = state => ({ isAuthenticated: state.auth.isAuthenticated });
export default connect(mapStateToProps)(Landing);
LANDING
echo -e "${GREEN}✓ Landing.js written${NC}"

# ── Write HowItWorks.js ───────────────────────────────────
echo -e "${YELLOW}✍  Writing HowItWorks.js...${NC}"
cat > "$LAYOUT/HowItWorks.js" << 'HOWITWORKS'
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01', icon: '✏️', title: 'Build your profile',
    description: 'Fill in your lifestyle habits — sleep schedule, study style, cleanliness, social preferences and more. The more you share, the better your matches.',
    detail: 'Our 9-step questionnaire covers everything from whether you cook to how you feel about guests. Takes about 3 minutes.',
    cta: { label: 'Create your profile', to: '/register' },
    color: 'var(--accent-purple)', bg: 'rgba(124,58,237,0.08)',
  },
  {
    number: '02', icon: '👆', title: 'Swipe on roommates',
    description: "Browse compatible students ranked by a live match score. Swipe right on people you'd want to live with, left to pass.",
    detail: 'Every card shows a % compatibility score calculated across 5 weighted categories — lifestyle, habits, academic, demographic, and hostel preferences.',
    cta: { label: 'See how matching works', to: '/register' },
    color: '#ec4899', bg: 'rgba(236,72,153,0.08)',
  },
  {
    number: '03', icon: '🤝', title: 'Mutual match',
    description: "When two students both swipe right on each other, it's a match. Your preferred hostel gets notified automatically.",
    detail: 'The hostel admin receives an email with both your profiles and room preferences so they can find the right room for you.',
    cta: null,
    color: 'var(--success)', bg: 'rgba(16,185,129,0.08)',
  },
  {
    number: '04', icon: '🏠', title: 'Get confirmed & move in',
    description: "The hostel admin assigns you a room. Pay a small booking fee via MTN Mobile Money, Airtel Money, or card — then you're in.",
    detail: 'Booking fee is UGX 5,000–10,000, charged only at confirmation. Both roommates pay before the room is locked in.',
    cta: { label: 'Register now', to: '/register' },
    color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)',
  },
];

const useReveal = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const StepCard = ({ step, index, isActive, onClick }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`hiw-card${isActive ? ' hiw-card--active' : ''}${visible ? ' hiw-card--visible' : ''}`}
      style={{ '--reveal-delay': `${index * 120}ms`, '--step-color': step.color, '--step-bg': step.bg }}
      onClick={() => onClick(index)}
      role='button' tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(index)}
      aria-expanded={isActive}
    >
      <div className='hiw-card-top'>
        <div className='hiw-step-num' style={{ color: step.color }}>{step.number}</div>
        <div className='hiw-icon'>{step.icon}</div>
      </div>
      <h3 className='hiw-card-title'>{step.title}</h3>
      <p className='hiw-card-desc'>{step.description}</p>
      <div className={`hiw-detail${isActive ? ' hiw-detail--open' : ''}`}>
        <p className='hiw-detail-text'>{step.detail}</p>
        {step.cta && (
          <Link to={step.cta.to} className='hiw-cta-link' onClick={e => e.stopPropagation()}>
            {step.cta.label} →
          </Link>
        )}
      </div>
      <div className='hiw-card-chevron' aria-hidden='true'>{isActive ? '▲' : '▼'}</div>
    </div>
  );
};

const ProgressBar = ({ active, total }) => (
  <div className='hiw-progress' role='progressbar' aria-valuenow={active + 1} aria-valuemax={total}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`hiw-progress-dot${i <= active ? ' hiw-progress-dot--filled' : ''}`} aria-hidden='true' />
    ))}
    <div className='hiw-progress-track-fill' style={{ width: `${(active / (total - 1)) * 100}%` }} />
  </div>
);

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [sectionRef, sectionVisible] = useReveal();
  const handleStep = i => setActiveStep(prev => prev === i ? -1 : i);
  return (
    <section className='hiw-section' ref={sectionRef}>
      <div className='container'>
        <div className={`hiw-header${sectionVisible ? ' hiw-header--visible' : ''}`}>
          <span className='hiw-eyebrow'>How it works</span>
          <h2 className='hiw-heading'>From profile to roommate in 4 steps</h2>
          <p className='hiw-subheading'>Designed for KYU students — fast, transparent, and built around how you actually live.</p>
        </div>
        <ProgressBar active={activeStep === -1 ? 0 : activeStep} total={steps.length} />
        <div className='hiw-grid'>
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} isActive={activeStep === i} onClick={handleStep} />
          ))}
        </div>
        <div className={`hiw-bottom-cta${sectionVisible ? ' hiw-bottom-cta--visible' : ''}`}>
          <p>Ready to find your match?</p>
          <Link to='/register' className='btn btn-primary'>Get started — it's free →</Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
HOWITWORKS
echo -e "${GREEN}✓ HowItWorks.js written${NC}"

# ── Write Footer.js ───────────────────────────────────────
echo -e "${YELLOW}✍  Writing Footer.js...${NC}"
cat > "$LAYOUT/Footer.js" << 'FOOTER'
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
          <p className='footer-tagline'>Roommate matchmaking built for Kyambogo University students. Match. Move in. Thrive.</p>
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
            <li><a href='https://github.com/facelessl1beral/Roomies' target='_blank' rel='noopener noreferrer'>GitHub repo ↗</a></li>
            <li><a href='https://www.kyambogo.ac.ug' target='_blank' rel='noopener noreferrer'>Kyambogo University ↗</a></li>
            <li><span className='footer-credit'>Developer: Barry</span></li>
            <li><span className='footer-credit'>Supervisor reviewed</span></li>
          </ul>
        </div>
      </div>
      <div className='footer-bottom'>
        <span className='footer-copy'>© {year} Homies · Kyambogo University · Built with React, Node.js &amp; MongoDB</span>
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
FOOTER
echo -e "${GREEN}✓ Footer.js written${NC}"

# ── Append CSS ────────────────────────────────────────────
echo -e "${YELLOW}✍  Appending CSS to App.css...${NC}"
cat >> "$APP_CSS" << 'CSS'

/* ============================================
   LANDING — HERO PHOTO BACKGROUND
   ============================================ */
.landing {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: calc(var(--navbar-height) + 3rem) 1.5rem 4rem;
}
.landing-hero-bg { position: absolute; inset: 0; z-index: 0; }
.landing-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 0.18; filter: saturate(0.6); }
[data-theme="light"] .landing-hero-img { opacity: 0.10; }
.landing-hero-overlay { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(124,58,237,0.22) 0%, transparent 50%, rgba(236,72,153,0.12) 100%); }
[data-theme="light"] .landing-hero-overlay { background: linear-gradient(160deg, rgba(124,58,237,0.10) 0%, transparent 60%, rgba(236,72,153,0.06) 100%); }
.landing-inner { position: relative; z-index: 1; text-align: center; max-width: 680px; margin: 0 auto; }
.landing-eyebrow { display: inline-block; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-purple); background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); padding: 0.3rem 1rem; border-radius: var(--radius-full); margin-bottom: 1.5rem; }
.landing-headline { font-family: var(--font-display); font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 700; line-height: 1.1; letter-spacing: -0.03em; color: var(--text-primary); margin-bottom: 1.25rem; }
.landing-sub { font-size: 1.1rem; color: var(--text-secondary); line-height: 1.65; margin-bottom: 2rem; }
.landing-stats { display: flex; justify-content: center; gap: 2rem; margin-bottom: 2.25rem; flex-wrap: wrap; }
.landing-stat { text-align: center; }
.landing-stat-num { font-family: var(--font-display); font-size: 2rem; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 0.3rem; }
.landing-stat-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
.buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.25rem; }
.btn-lg { padding: 0.8rem 2rem; font-size: 1rem; }
.landing-hint { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; }

/* ============================================
   HOW IT WORKS
   ============================================ */
.hiw-section { padding: 5rem 1.5rem; background: var(--bg-primary); position: relative; }
.hiw-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--border); }
.hiw-header { text-align: center; max-width: 560px; margin: 0 auto 2.5rem; opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
.hiw-header--visible { opacity: 1; transform: translateY(0); }
.hiw-eyebrow { display: inline-block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-purple); margin-bottom: 0.75rem; }
.hiw-heading { font-family: var(--font-display); font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 700; letter-spacing: -0.025em; color: var(--text-primary); margin-bottom: 0.75rem; }
.hiw-subheading { font-size: 1rem; color: var(--text-secondary); line-height: 1.6; }
.hiw-progress { display: flex; align-items: center; justify-content: center; margin: 0 auto 2.5rem; max-width: 360px; position: relative; height: 20px; }
.hiw-progress-track-fill { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); height: 2px; background: var(--accent-gradient); border-radius: 2px; transition: width 0.4s ease; z-index: 0; }
.hiw-progress-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--border); background: var(--bg-primary); transition: all 0.3s ease; position: relative; z-index: 1; flex-shrink: 0; }
.hiw-progress-dot + .hiw-progress-dot { margin-left: calc((360px - 40px) / 3 - 10px); }
.hiw-progress-dot--filled { background: var(--accent-purple); border-color: var(--accent-purple); box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }
.hiw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; max-width: 960px; margin: 0 auto 3rem; }
.hiw-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; cursor: pointer; transition: all 0.25s ease; opacity: 0; transform: translateY(24px); user-select: none; position: relative; }
.hiw-card--visible { opacity: 1; transform: translateY(0); transition-delay: var(--reveal-delay, 0ms); }
.hiw-card:hover { border-color: var(--border-hover); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.hiw-card--active { border-color: var(--step-color, var(--accent-purple)); background: var(--step-bg, rgba(124,58,237,0.06)); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.hiw-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.hiw-step-num { font-family: var(--font-display); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; opacity: 0.9; }
.hiw-icon { font-size: 1.5rem; line-height: 1; }
.hiw-card-title { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; letter-spacing: -0.01em; }
.hiw-card-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0.25rem; }
.hiw-detail { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, opacity 0.3s ease, margin 0.3s ease; opacity: 0; margin-top: 0; }
.hiw-detail--open { max-height: 200px; opacity: 1; margin-top: 1rem; }
.hiw-detail-text { font-size: 0.83rem; color: var(--text-secondary); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 0.85rem; margin-bottom: 0.85rem; }
.hiw-cta-link { font-size: 0.83rem; font-weight: 600; color: var(--accent-purple); text-decoration: none; transition: opacity 0.2s; }
.hiw-cta-link:hover { opacity: 0.75; }
.hiw-card-chevron { position: absolute; bottom: 0.9rem; right: 1rem; font-size: 0.6rem; color: var(--text-muted); transition: transform 0.25s; }
.hiw-bottom-cta { text-align: center; opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s; }
.hiw-bottom-cta--visible { opacity: 1; transform: translateY(0); }
.hiw-bottom-cta p { color: var(--text-secondary); margin-bottom: 1rem; font-size: 1rem; }

/* ============================================
   FOOTER
   ============================================ */
.site-footer { background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 3rem 1.5rem 0; }
.footer-inner { max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2rem; padding-bottom: 2.5rem; }
.footer-logo { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-decoration: none; display: inline-block; margin-bottom: 0.75rem; }
.footer-tagline { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.65; margin-bottom: 1rem; max-width: 220px; }
.footer-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.footer-badge { font-size: 0.72rem; font-weight: 500; padding: 0.2rem 0.7rem; border-radius: var(--radius-full); border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap; }
.footer-badge--stack { background: rgba(124,58,237,0.08); border-color: rgba(124,58,237,0.2); color: var(--accent-purple); }
.footer-col-title { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; }
.footer-col ul { list-style: none; padding: 0; margin: 0; }
.footer-col ul li { margin-bottom: 0.6rem; }
.footer-col ul li a, .footer-col ul li .footer-credit { font-size: 0.85rem; color: var(--text-secondary); text-decoration: none; transition: color 0.18s; line-height: 1; }
.footer-col ul li a:hover { color: var(--accent-purple); }
.footer-credit { font-size: 0.85rem; color: var(--text-muted); font-style: italic; }
.footer-bottom { max-width: 960px; margin: 0 auto; border-top: 1px solid var(--border); padding: 1.25rem 0 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
.footer-copy { font-size: 0.78rem; color: var(--text-muted); }
.footer-bottom-badges { display: flex; gap: 6px; flex-wrap: wrap; }

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .footer-inner { grid-template-columns: 1fr 1fr; }
  .footer-brand { grid-column: 1 / -1; }
  .hiw-grid { grid-template-columns: 1fr 1fr; }
  .landing-headline { font-size: clamp(2rem, 8vw, 2.8rem); }
  .landing-stats { gap: 1.25rem; }
}
@media (max-width: 480px) {
  .footer-inner { grid-template-columns: 1fr; }
  .hiw-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .hiw-card, .hiw-header, .hiw-bottom-cta { opacity: 1; transform: none; transition: none; }
}
CSS
echo -e "${GREEN}✓ CSS appended to App.css${NC}\n"

# ── Done ──────────────────────────────────────────────────
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅  All done! Files written:${NC}"
echo -e "   ${LAYOUT}/Landing.js"
echo -e "   ${LAYOUT}/HowItWorks.js"
echo -e "   ${LAYOUT}/Footer.js"
echo -e "   ${APP_CSS}  (CSS appended)"
echo ""
echo -e "${YELLOW}Backups saved as:${NC}"
echo -e "   ${LAYOUT}/Landing.js.bak"
echo -e "   ${APP_CSS}.bak"
echo ""
echo -e "${CYAN}Next: the dev server should hot-reload automatically.${NC}"
echo -e "${CYAN}If not: Ctrl+C and re-run  node server.js  /  npm start${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
