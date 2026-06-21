import React from 'react';

const HomiesLogo = ({ size = 32, showText = true }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
    {/* SVG Icon — house with two person silhouettes forming the roof */}
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#ec4899"/>
        </linearGradient>
      </defs>

      {/* House body */}
      <rect x="6" y="20" width="28" height="16" rx="2" fill="url(#hg)" opacity="0.9"/>

      {/* Door */}
      <rect x="16" y="27" width="8" height="9" rx="1.5" fill="white" opacity="0.9"/>

      {/* Left window */}
      <rect x="8" y="23" width="5" height="5" rx="1" fill="white" opacity="0.7"/>

      {/* Right window */}
      <rect x="27" y="23" width="5" height="5" rx="1" fill="white" opacity="0.7"/>

      {/* Two person silhouettes forming the roof */}
      {/* Left person */}
      <circle cx="15" cy="10" r="4" fill="url(#hg)"/>
      <path d="M8 20 Q8 14 15 14 Q19 14 20 17 Q21 14 25 14 Q32 14 32 20 Z" fill="url(#hg)"/>

      {/* Right person head — slightly overlapping */}
      <circle cx="25" cy="10" r="4" fill="url(#hg)" opacity="0.85"/>

      {/* Roof line connecting them */}
      <path d="M4 21 L20 6 L36 21" stroke="url(#hg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>

    {/* Wordmark */}
    {showText && (
      <span style={{
        fontFamily: "'Clash Display', 'Arial', sans-serif",
        fontWeight: 700,
        fontSize: size * 0.6,
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        Homies
      </span>
    )}
  </span>
);

export default HomiesLogo;
