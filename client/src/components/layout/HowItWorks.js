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
