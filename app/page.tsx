'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Each column has words of similar length — prevents pill resize on rotation
const COLUMNS = [
  ['Italian Food', 'Photography', 'Psychology', 'Live Music', 'Meditation', 'Vinyl Records'],
  ['Art Museums', 'Parenting', 'Gardening', 'Podcasts', 'Sneakers', 'Cooking'],
  ['Running', 'Surfing', 'Dancing', 'Hiking', 'Coffee', 'Chess'],
  ['AI', 'Yoga', 'Film', 'Jazz', 'Dogs', 'Sci-Fi'],
  ['Standup Comedy', 'Hot Yoga', 'Philosophy', 'Travel', 'Anime', 'Fitness'],
];

export default function HomePage() {
  const router = useRouter();
  const [indices, setIndices] = useState([0, 0, 0, 0, 0]);

  useEffect(() => {
    // Stagger each column's rotation so they don't all swap at once
    const timers = COLUMNS.map((col, colIdx) =>
      setInterval(() => {
        setIndices(prev => {
          const next = [...prev];
          next[colIdx] = (next[colIdx] + 1) % col.length;
          return next;
        });
      }, 3000 + colIdx * 700)
    );
    return () => timers.forEach(clearInterval);
  }, []);

  const pills = COLUMNS.map((col, i) => col[indices[i]]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen gap-10 sm:gap-14">
        {/* Interest pills — single row, ghost glow on transition */}
        <div className="flex justify-center gap-2.5 sm:gap-3">
          {pills.map((p, i) => (
            <div
              key={i}
              className={`${i < 3 ? '' : 'hidden sm:block'} relative w-[120px] sm:w-[155px] h-[40px] sm:h-[48px] rounded-full text-sm sm:text-base font-bold text-black bg-[#fde047] border border-yellow-200 transition-all duration-500`}
              style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={p}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
                >
                  {p}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[1.05] drop-shadow-[0_0_60px_rgba(255,180,255,0.4)]">
          Be Yourself on{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">BAE</span>
        </h1>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.07, boxShadow: '0 0 100px rgba(253,224,71,0.7), 0 0 160px rgba(245,158,11,0.35)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          animate={{ boxShadow: ['0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)', '0 0 80px rgba(253,224,71,0.6), 0 0 140px rgba(245,158,11,0.3)', '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-20 sm:px-36 py-7 sm:py-9 rounded-full font-black text-2xl sm:text-3xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.15em]"
        >
          Start Talking
        </motion.button>
      </section>
    </main>
  );
}
