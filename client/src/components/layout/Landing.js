import React, { useState, useEffect } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AnimatedCounter from './AnimatedCounter';
import HowItWorks from './HowItWorks';
import HostelsSection from './HostelsSection';
import Footer from './Footer';
import ParticleCanvas from './ParticleCanvas';
import ScrollToTop from './ScrollToTop';
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
  const typed = useTypewriter(PHRASES);
  // hook must come before early return

  if (isAuthenticated) return <Redirect to="/dashboard" />;

  return (
    <>
      <section className='landing'>

        {/* Hero background photo */}
        <div className='landing-hero-bg' aria-hidden='true'>
          <img src={require('../../img/hostel.jpeg')} alt='' className='landing-hero-img' />
          <div className='landing-hero-overlay' />
        </div>

        {/* Particle network */}
        <ParticleCanvas />
        {/* Floating photo blobs */}
        <div className='landing-photo-blob landing-photo-blob--1' aria-hidden='true'>
          <img src={require('../../img/hostel.jpeg')} alt='' className='landing-photo-blob-img'/>
        </div>
        <div className='landing-photo-blob landing-photo-blob--2' aria-hidden='true'>
          <img src={require('../../img/rooms.png')} alt='' className='landing-photo-blob-img'/>
        </div>

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
              <span className='text-gradient'>No more random<br/>pairings. Just</span><br/>
              <span className='text-gradient typewriter'>{typed}</span><span className='cursor' aria-hidden='true'>|</span>
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
      <HostelsSection/>
      <Footer/>
      <ScrollToTop/>
    </>
  );
};

Landing.propTypes = { isAuthenticated: PropTypes.bool };
const mapStateToProps = state => ({ isAuthenticated: state.auth.isAuthenticated });
export default connect(mapStateToProps)(Landing);
