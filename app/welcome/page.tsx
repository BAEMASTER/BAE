'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const BEATS = [
  {
    headline: 'Talk.',
    sub: 'BAE gets to know you through conversation.',
    sub2: 'Your interests reveal themselves naturally.',
    bg: 'from-[#1A0033] via-[#4D004D] to-[#000033]',
    glowColor: 'rgba(168,85,247,0.4)',
  },
  {
    headline: 'Build.',
    sub: 'Every interest becomes part of your BAE room.',
    sub2: 'baewithme.com/you — a space that\'s purely you.',
    bg: 'from-[#1A0033] via-[#4D004D] to-[#000033]',
    glowColor: 'rgba(253,224,71,0.4)',
  },
  {
    headline: 'Connect.',
    sub: 'Invite anyone into your room.',
    sub2: 'Shared interests glow. Real conversations happen.',
    bg: 'from-[#1A0033] via-[#4D004D] to-[#000033]',
    glowColor: 'rgba(244,63,94,0.4)',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const advance = () => {
    if (beat < BEATS.length - 1) {
      setBeat(prev => prev + 1);
    } else {
      setShowName(true);
    }
  };

  useEffect(() => {
    if (showName) setTimeout(() => inputRef.current?.focus(), 600);
  }, [showName]);

  const handleGo = () => {
    const trimmed = name.trim();
    if (trimmed) {
      router.push(`/talk?name=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/talk');
    }
  };

  const current = BEATS[beat];

  return (
    <main className="relative min-h-screen overflow-hidden text-white bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033]">
      {/* Background glow — matches homepage energy */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      {/* Accent glow that shifts per beat */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${beat}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px]"
            style={{ backgroundColor: current.glowColor }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Particle sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0],
              y: [0, -30 - Math.random() * 50],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Tap to continue + progress dots */}
      {!showName && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-5">
          <motion.button
            onClick={advance}
            animate={{ boxShadow: ['0 0 15px rgba(253,224,71,0.2)', '0 0 30px rgba(253,224,71,0.4)', '0 0 15px rgba(253,224,71,0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-8 py-3 rounded-full text-sm font-bold text-amber-300 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 transition-colors"
          >
            Tap to continue
          </motion.button>
          <div className="flex gap-3">
            {BEATS.map((_, i) => (
              <motion.div
                key={i}
                className="w-3.5 h-3.5 rounded-full"
                animate={{
                  backgroundColor: i === beat ? '#fde047' : 'rgba(255,255,255,0.15)',
                  scale: i === beat ? 1.3 : 1,
                  boxShadow: i === beat ? '0 0 16px rgba(253,224,71,0.7)' : '0 0 0px transparent',
                }}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <section
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
        onClick={() => !showName && advance()}
        style={{ cursor: showName ? 'default' : 'pointer' }}
      >
        <AnimatePresence mode="wait">
          {!showName ? (
            <motion.div
              key={`beat-${beat}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 1.05 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-center max-w-3xl"
            >
              {/* Big headline */}
              <h1
                className="text-8xl sm:text-[10rem] lg:text-[12rem] font-black leading-none mb-8 sm:mb-10 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                style={{
                  filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.5)) drop-shadow(0 0 120px rgba(253,224,71,0.25))',
                }}
              >
                {current.headline}
              </h1>

              {/* Sub lines — bold, warm, readable */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4"
              >
                {current.sub}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg sm:text-2xl font-semibold text-white/60"
              >
                {current.sub2}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="name-entry"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-center max-w-lg w-full"
            >
              <p className="text-xl sm:text-2xl text-white/50 font-semibold mb-4">
                The most interesting conversations in the world are on BAE.
              </p>
              <h2
                className="text-5xl sm:text-7xl font-black mb-12 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.4))' }}
              >
                Let&apos;s make yours.
              </h2>

              <div className="space-y-5">
                <input
                  ref={inputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGo()}
                  placeholder="Your first name"
                  className="w-full px-8 py-5 rounded-2xl bg-white/8 border border-white/15 text-white text-xl sm:text-2xl text-center font-semibold placeholder:text-white/20 outline-none focus:border-amber-400/40 focus:bg-white/10 focus:shadow-[0_0_40px_rgba(253,224,71,0.15)] transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 80px rgba(253,224,71,0.6), 0 0 120px rgba(245,158,11,0.3)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleGo}
                  className="w-full py-5 rounded-2xl font-black text-xl sm:text-2xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.1em]"
                  style={{ boxShadow: '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)' }}
                >
                  Let&apos;s Talk
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
