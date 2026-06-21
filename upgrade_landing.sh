#!/bin/bash
# ============================================================
# Homies — Upgraded Landing: animated canvas + new React bits
# Run from: ~/Downloads/projects/hostel/Roomies
# Usage:    bash upgrade_landing.sh
# ============================================================

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
LAYOUT="$(pwd)/client/src/components/layout"
APP_CSS="$(pwd)/client/src/App.css"

echo -e "${CYAN}🎨 Homies — aesthetic upgrade starting...${NC}\n"

if [ ! -f "$APP_CSS" ]; then
  echo -e "${RED}✗ Run this from the Roomies project root.${NC}"; exit 1
fi

# ── Backup ────────────────────────────────────────────────
cp "$LAYOUT/Landing.js" "$LAYOUT/Landing.js.bak2" 2>/dev/null || true
echo -e "${GREEN}✓ Landing.js backed up${NC}\n"

# ── ParticleCanvas.js ─────────────────────────────────────
echo -e "${YELLOW}✍  Writing ParticleCanvas.js...${NC}"
cat > "$LAYOUT/ParticleCanvas.js" << 'EOF'
import React, { useEffect, useRef } from 'react';

// Floating particle network — draws animated nodes + connecting lines
// representing the roommate matching network
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles;

    const PARTICLE_COUNT = 55;
    const CONNECT_DIST   = 140;
    const COLORS = ['#7c3aed', '#9d5cf6', '#ec4899', '#a855f7', '#c084fc'];

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    const rand = (min, max) => Math.random() * (max - min) + min;

    const makeParticle = () => ({
      x:    rand(0, W),
      y:    rand(0, H),
      vx:   rand(-0.35, 0.35),
      vy:   rand(-0.35, 0.35),
      r:    rand(2, 4.5),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: rand(0.4, 0.85),
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.01, 0.025),
    });

    const init = () => {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Update + draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        const pulseR = p.r + Math.sin(p.pulse) * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    init();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
};

export default ParticleCanvas;
EOF
echo -e "${GREEN}✓ ParticleCanvas.js written${NC}"

# ── MatchPreview.js ───────────────────────────────────────
echo -e "${YELLOW}✍  Writing MatchPreview.js...${NC}"
cat > "$LAYOUT/MatchPreview.js" << 'EOF'
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
EOF
echo -e "${GREEN}✓ MatchPreview.js written${NC}"

# ── Landing.js ────────────────────────────────────────────
echo -e "${YELLOW}✍  Writing Landing.js...${NC}"
cat > "$LAYOUT/Landing.js" << 'EOF'
import React, { useEffect, useRef } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import AnimatedCounter from './AnimatedCounter';
import HowItWorks from './HowItWorks';
import Footer from './Footer';
import ParticleCanvas from './ParticleCanvas';
import MatchPreview from './MatchPreview';

// Typewriter hook — cycles through phrases
const useTypewriter = (phrases, speed = 70, pause = 2200) => {
  const [text, setText] = React.useState('');
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [charIdx, setCharIdx] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timeout;

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, charIdx === current.length ? pause : speed);
    } else if (deleting && charIdx >= 0) {
      timeout = setTimeout(() => {
        setText(current.slice(0, charIdx));
        setCharIdx(c => c - 1);
      }, speed / 2);
    }

    if (!deleting && charIdx > current.length) setDeleting(true);
    if (deleting && charIdx < 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % phrases.length);
      setCharIdx(0);
    }

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return text;
};

const PHRASES = [
  'compatible humans.',
  'peaceful mornings.',
  'shared goals.',
  'your kind of vibe.',
  'a home away from home.',
];

const Landing = ({ isAuthenticated }) => {
  if (isAuthenticated) return <Redirect to='/dashboard' />;

  const typed = useTypewriter(PHRASES);

  return (
    <>
      <section className='landing'>

        {/* Animated particle network background */}
        <ParticleCanvas />

        {/* Subtle gradient blobs */}
        <div className='landing-blob landing-blob--1' aria-hidden='true' />
        <div className='landing-blob landing-blob--2' aria-hidden='true' />

        {/* ── Two-column hero layout ── */}
        <div className='landing-inner landing-inner--split'>

          {/* Left: copy */}
          <div className='landing-copy'>
            <div className='landing-eyebrow'>
              <span className='landing-eyebrow-dot' />
              Kyambogo University · Kampala, Uganda
            </div>

            <h1 className='landing-headline'>
              No more random<br />
              pairings. Just<br />
              <span className='text-gradient typewriter'>
                {typed}<span className='cursor'>|</span>
              </span>
            </h1>

            <p className='landing-sub'>
              Homies matches KYU students on 22 real lifestyle factors —
              sleep schedules, study habits, cleanliness, and more.
              Find someone you'll actually want to live with.
            </p>

            <div className='landing-stats'>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={22} duration={1000} /></div>
                <div className='landing-stat-label'>Match factors</div>
              </div>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={5} duration={800} /></div>
                <div className='landing-stat-label'>Categories</div>
              </div>
              <div className='landing-stat'>
                <div className='landing-stat-num'><AnimatedCounter target={100} suffix='%' duration={1400} /></div>
                <div className='landing-stat-label'>Transparent</div>
              </div>
            </div>

            <div className='buttons'>
              <Link to='/register' className='btn btn-primary btn-lg'>
                Find my match →
              </Link>
              <Link to='/login' className='btn btn-secondary btn-lg'>
                Sign in
              </Link>
            </div>

            <p className='landing-hint'>
              Hostel admin?{' '}
              <Link to='/admin' style={{ color: 'var(--accent-purple)', opacity: 0.8 }}>
                Manage your rooms here
              </Link>
            </p>
          </div>

          {/* Right: live swipe demo */}
          <div className='landing-demo'>
            <MatchPreview />
          </div>

        </div>

        {/* Scroll indicator */}
        <div className='landing-scroll-hint' aria-hidden='true'>
          <span>See how it works</span>
          <div className='landing-scroll-arrow'>↓</div>
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
EOF
echo -e "${GREEN}✓ Landing.js written${NC}"

# ── Append CSS ────────────────────────────────────────────
echo -e "${YELLOW}✍  Appending upgraded CSS to App.css...${NC}"
cat >> "$APP_CSS" << 'CSS'

/* ============================================
   LANDING V2 — UPGRADED AESTHETIC
   ============================================ */
.landing {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: calc(var(--navbar-height) + 2rem) 2rem 5rem;
}

/* Gradient blobs */
.landing-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
.landing-blob--1 {
  width: 520px; height: 520px;
  background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
  top: -80px; left: -120px;
  animation: blobDrift1 14s ease-in-out infinite alternate;
}
.landing-blob--2 {
  width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%);
  bottom: 60px; right: -80px;
  animation: blobDrift2 18s ease-in-out infinite alternate;
}
@keyframes blobDrift1 {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(60px, 40px) scale(1.08); }
}
@keyframes blobDrift2 {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(-40px, -30px) scale(1.05); }
}
[data-theme="light"] .landing-blob--1 { background: radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%); }
[data-theme="light"] .landing-blob--2 { background: radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%); }

/* Two-column layout */
.landing-inner--split {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  max-width: 1100px;
  width: 100%;
}

.landing-copy { text-align: left; }

/* Eyebrow */
.landing-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-purple);
  background: rgba(124,58,237,0.08);
  border: 1px solid rgba(124,58,237,0.2);
  padding: 0.3rem 1rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.5rem;
}
.landing-eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent-purple);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

/* Headline */
.landing-headline {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
}

/* Typewriter cursor */
.typewriter { display: inline-block; min-width: 2px; }
.cursor {
  display: inline-block;
  color: var(--accent-purple);
  animation: blink 0.9s step-end infinite;
  font-weight: 300;
  margin-left: 1px;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.landing-sub {
  font-size: 1.05rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 2rem;
  max-width: 460px;
}

/* Stats */
.landing-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.landing-stat { text-align: left; }
.landing-stat-num {
  font-family: var(--font-display);
  font-size: 1.9rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 0.2rem;
}
.landing-stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.btn-lg { padding: 0.8rem 2rem; font-size: 1rem; }
.landing-hint { font-size: 0.85rem; color: var(--text-muted); }

/* Scroll hint */
.landing-scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  z-index: 1;
  animation: fadeInUp 1.5s ease 1s both;
}
.landing-scroll-arrow {
  animation: bounce 2s ease-in-out infinite;
  font-size: 1rem;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ============================================
   MATCH PREVIEW DEMO CARD
   ============================================ */
.mp-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  user-select: none;
}

.mp-stack {
  position: relative;
  width: 300px;
  height: 200px;
}

.mp-card {
  position: absolute;
  inset: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: var(--shadow-lg);
  transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
}

.mp-card--back {
  transform: scale(0.93) translateY(10px);
  opacity: 0.6;
  z-index: 0;
  border-top: 3px solid var(--card-color, var(--accent-purple));
}

.mp-card--front {
  z-index: 1;
  border-top: 3px solid var(--card-color, var(--accent-purple));
}

.mp-card--swipe-right {
  transform: translateX(120%) rotate(15deg);
  opacity: 0;
}
.mp-card--swipe-left {
  transform: translateX(-120%) rotate(-15deg);
  opacity: 0;
}

.mp-card-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mp-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  flex-shrink: 0;
}

.mp-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.mp-course {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 1px;
}

.mp-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.mp-trait {
  font-size: 0.72rem;
  padding: 0.18rem 0.6rem;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  font-weight: 500;
}

.mp-bar-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.mp-bar-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 500;
}
.mp-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  overflow: hidden;
}
.mp-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

/* Swipe labels */
.mp-swipe-label {
  position: absolute;
  top: 1rem;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.35rem 0.9rem;
  border-radius: var(--radius-full);
  z-index: 3;
  animation: popIn 0.2s ease;
}
.mp-swipe-label--right {
  right: 1rem;
  background: rgba(16,185,129,0.15);
  color: var(--success);
  border: 2px solid var(--success);
}
.mp-swipe-label--left {
  left: 1rem;
  background: rgba(239,68,68,0.12);
  color: var(--danger);
  border: 2px solid var(--danger);
}
@keyframes popIn {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

/* Action buttons */
.mp-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.mp-btn {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-card);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}
.mp-btn--pass:hover  { border-color: var(--danger);  color: var(--danger);  transform: scale(1.1); }
.mp-btn--match:hover { border-color: var(--success); color: var(--success); transform: scale(1.1); }
.mp-btn--match { color: #ec4899; border-color: rgba(236,72,153,0.4); }

.mp-dots { display: flex; gap: 5px; }
.mp-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.3s;
}
.mp-dot--active {
  background: var(--accent-purple);
  width: 18px;
  border-radius: 3px;
}

.mp-caption {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
  letter-spacing: 0.03em;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 900px) {
  .landing-inner--split {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }
  .landing-copy { text-align: center; }
  .landing-sub { max-width: 100%; }
  .landing-stats { justify-content: center; }
  .landing-stat { text-align: center; }
  .buttons { justify-content: center; }
  .landing-demo { display: flex; justify-content: center; }
}

@media (max-width: 480px) {
  .mp-stack { width: 260px; height: 185px; }
  .landing-headline { font-size: clamp(1.9rem, 7vw, 2.4rem); }
}

@media (prefers-reduced-motion: reduce) {
  .landing-blob, .cursor, .landing-scroll-arrow,
  .landing-eyebrow-dot, .mp-card { animation: none !important; transition: none !important; }
}
CSS
echo -e "${GREEN}✓ CSS appended${NC}\n"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅  Upgrade complete! Files written:${NC}"
echo -e "   ${LAYOUT}/Landing.js"
echo -e "   ${LAYOUT}/ParticleCanvas.js   ← new"
echo -e "   ${LAYOUT}/MatchPreview.js     ← new"
echo -e "   App.css  (CSS appended)"
echo ""
echo -e "${YELLOW}Backup: Landing.js.bak2${NC}"
echo -e "${CYAN}Dev server should hot-reload. Open http://localhost:3000${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
