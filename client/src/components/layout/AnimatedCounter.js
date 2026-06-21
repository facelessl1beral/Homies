import React, { useEffect, useState, useRef } from 'react';

const AnimatedCounter = ({ target, suffix = '', duration = 1200 }) => {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const startTime = performance.now();
    const numericTarget = parseFloat(target);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numericTarget));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(numericTarget);
      }
    };

    requestAnimationFrame(step);
  }, [target, duration]);

  return <>{count}{suffix}</>;
};

export default AnimatedCounter;
