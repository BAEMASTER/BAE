'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_INTERESTS = [
  ['Italian Food', 'Art Museums', 'Running', 'AI', 'Standup Comedy'],
  ['Hot Yoga', 'Photography', 'Jazz', 'Hiking', 'Podcasts'],
  ['Psychology', 'Travel', 'Meditation', 'Surfing', 'Chess'],
  ['Parenting', 'Film', 'Dancing', 'Philosophy', 'Dogs'],
  ['Sci-Fi', 'Sneakers', 'Coffee', 'Live Music', 'Anime'],
  ['Cooking', 'Vinyl Records', 'Entrepreneurship', 'Gardening', 'Yoga'],
];

export default function HomePage() {
  const router = useRouter();
  const [setIndex, setSetIndex] = useState(0);
  const pills = ALL_INTERESTS[setIndex];

  useEffect(() => {
    const id = setInterval(() => {
      setSetIndex(prev => (prev + 1) % ALL_INTERESTS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

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
              className={`${i < 3 ? '' : 'hidden sm:block'} px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-bold text-black bg-[#fde047] border border-yellow-200 overflow-hidden`}
              style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={p}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="block whitespace-nowrap"
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
          whileHover={{ scale: 1.07, boxShadow: '0 0 80px rgba(253,224,71,0.6), 0 0 120px rgba(245,158,11,0.3)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          animate={{ boxShadow: ['0 0 40px rgba(253,224,71,0.35), 0 0 80px rgba(245,158,11,0.15)', '0 0 60px rgba(253,224,71,0.5), 0 0 100px rgba(245,158,11,0.25)', '0 0 40px rgba(253,224,71,0.35), 0 0 80px rgba(245,158,11,0.15)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-20 sm:px-32 py-7 sm:py-8 rounded-full font-extrabold text-xl sm:text-2xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.15em]"
        >
          Start Talking
        </motion.button>
      </section>
    </main>
  );
}
