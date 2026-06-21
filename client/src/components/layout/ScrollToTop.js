import React, { useState, useEffect } from 'react';

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return visible ? (
    <button
      className='scroll-to-top'
      onClick={scrollUp}
      aria-label='Scroll to top'
      title='Back to top'
    >
      ↑
    </button>
  ) : null;
};

export default ScrollToTop;
