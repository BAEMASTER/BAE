'use client';

import { useEffect, useState } from 'react';

const WORDS = ['uplift', 'brighten', 'elevate', 'inspire', 'change'];
const INTERVAL = 2500; // 2.5 seconds

export default function RotatingGlowWord() {
  const [index, setIndex] = useState(0);
  const next = (index + 1) % WORDS.length;

  // Rotate words
  useEffect(() => {
    const t = setInterval(() => {
      setIndex(i => (i + 1) % WORDS.length);
    }, INTERVAL);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="relative inline-block w-[7.5ch] text-left">
      {/* outgoing word */}
      <span
        key={`out-${index}`}
        className="absolute inset-0 animate-fadeSwitchOut rotating-gradient-text"
      >
        {WORDS[index]}
      </span>

      {/* incoming word */}
      <span
        key={`in-${next}`}
        className="absolute inset-0 animate-fadeSwitchIn rotating-gradient-text"
      >
        {WORDS[next]}
      </span>
    </span>
  );
}
