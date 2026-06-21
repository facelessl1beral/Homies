import React, { useState, useEffect } from 'react';

// Fake profile data — gives the landing page human faces & names
const PROFILES = [
  { initials: 'AK', name: 'Aisha K.', course: 'Medicine · Y2', traits: ['Early riser', 'Quiet study', 'Tidy'], score: 94, color: '#7c3aed' },
  { initials: 'BM', name: 'Brian M.', course: 'Engineering · Y3', traits: ['Night owl', 'Social', 'Gym'], score: 87, color: '#ec4899' },
  { initials: 'CN', name: 'Cynthia N.', course: 'Law · Y1', traits: ['Early riser', 'Organised', 'Cook'], score: 91, color: '#a855f7' },
  { initials: 'DT', name: 'David T.', course: 'Commerce · Y2', traits: ['Flexible', 'Social', 'Music'], score: 82, color: '#06b6d4' },
  { initials: 'EO', name: 'Esther O.', course: 'Education · Y3', traits: ['Early riser', 'Quiet', 'Non-smoker'], score: 96, color: '#10b981' },
];

const ScoreRing = ({ score, color }) => {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width='56' height='56' viewBox='0 0 56 56' aria-hidden='true'>
      <circle cx='28' cy='28' r={r} fill='none' stroke='rgba(255,255,255,0.1)' strokeWidth='4' />
      <circle
        cx='28' cy='28' r={r} fill='none'
        stroke={color} strokeWidth='4'
        strokeLinecap='round'
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x='28' y='33' textAnchor='middle' fontSize='11' fontWeight='700' fill='#fff'>{score}%</text>
    </svg>
  );
};

const MatchPreview = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null); // 'left' | 'right'

  // Auto-cycle every 3s
  useEffect(() => {
    const t = setTimeout(() => swipe('right'), 3000);
    return () => clearTimeout(t);
  }, [current]);

  const swipe = dir => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(p => (p + 1) % PROFILES.length);
      setAnimating(false);
      setDirection(null);
    }, 420);
  };

  const p = PROFILES[current];
  const next = PROFILES[(current + 1) % PROFILES.length];

  return (
    <div className='mp-wrap' aria-label='Match preview demo'>

      {/* Stack of cards */}
      <div className='mp-stack'>

        {/* Background card (next) */}
        <div className='mp-card mp-card--back' style={{ '--card-color': next.color }}>
          <div className='mp-avatar' style={{ background: next.color }}>{next.initials}</div>
        </div>

        {/* Foreground card (current) */}
        <div
          className={`mp-card mp-card--front${animating ? ` mp-card--swipe-${direction}` : ''}`}
          style={{ '--card-color': p.color }}
        >
          <div className='mp-card-top'>
            <div className='mp-avatar' style={{ background: p.color }}>{p.initials}</div>
            <div>
              <div className='mp-name'>{p.name}</div>
              <div className='mp-course'>{p.course}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <ScoreRing score={p.score} color={p.color} />
            </div>
          </div>

          <div className='mp-traits'>
            {p.traits.map(t => (
              <span key={t} className='mp-trait'>{t}</span>
            ))}
          </div>

          <div className='mp-bar-row'>
            <span className='mp-bar-label'>Lifestyle</span>
            <div className='mp-bar'><div className='mp-bar-fill' style={{ width: `${p.score}%`, background: p.color }} /></div>
          </div>
        </div>

        {/* Swipe hint labels */}
        {animating && direction === 'right' && (
          <div className='mp-swipe-label mp-swipe-label--right'>✓ Match</div>
        )}
        {animating && direction === 'left' && (
          <div className='mp-swipe-label mp-swipe-label--left'>✗ Pass</div>
        )}
      </div>

      {/* Buttons */}
      <div className='mp-actions'>
        <button className='mp-btn mp-btn--pass' onClick={() => swipe('left')} aria-label='Pass'>✕</button>
        <div className='mp-dots'>
          {PROFILES.map((_, i) => (
            <span key={i} className={`mp-dot${i === current ? ' mp-dot--active' : ''}`} />
          ))}
        </div>
        <button className='mp-btn mp-btn--match' onClick={() => swipe('right')} aria-label='Match'>♥</button>
      </div>

      <p className='mp-caption'>Live demo · {PROFILES.length} sample profiles</p>
    </div>
  );
};

export default MatchPreview;
