'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

export function ReactionCascade({ emoji, originX, onComplete }: {
  emoji: string;
  originX: number;
  onComplete: () => void;
}) {
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    const t = setTimeout(onComplete, isMobile ? 1000 : 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: isMobile ? 1 : 1.75 }}
      animate={{
        opacity: 0,
        x: drift,
        y: isMobile ? '-25vh' : '-40vh',
        scale: isMobile ? 0.85 : 1,
      }}
      transition={{
        duration: isMobile ? 0.9 : 1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${originX}%`,
        bottom: isMobile ? '18vh' : '15vh',
        fontSize: isMobile ? '48px' : '32px',
        filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))',
      }}
    >
      {emoji}
    </motion.div>
  );
}
