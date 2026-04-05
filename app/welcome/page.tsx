'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const BEATS = [
  {
    headline: 'Talk.',
    sub: 'BAE gets to know you through conversation.',
    sub2: 'Your interests reveal themselves naturally.',
    bg: 'from-[#2D004F] via-[#5C0067] to-[#1A0033]',
    accent: 'text-violet-300',
    glow: 'bg-violet-500/30',
    glowAlt: 'bg-fuchsia-500/20',
  },
  {
    headline: 'Build.',
    sub: 'Every interest becomes part of your BAE room.',
    sub2: 'baewithme.com/you — a space that\'s purely you.',
    bg: 'from-[#1A0033] via-[#003355] to-[#001A33]',
    accent: 'text-amber-300',
    glow: 'bg-amber-500/25',
    glowAlt: 'bg-yellow-400/20',
  },
  {
    headline: 'Connect.',
    sub: 'Invite anyone into your room.',
    sub2: 'Shared interests glow. Real conversations happen.',
    bg: 'from-[#330022] via-[#660033] to-[#1A0022]',
    accent: 'text-rose-300',
    glow: 'bg-rose-500/25',
    glowAlt: 'bg-pink-400/20',
  },
];

const BEAT_DURATION = 4000;

export default function WelcomePage() {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (beat < BEATS.length - 1) {
        setBeat(prev => prev + 1);
      } else {
        setShowName(true);
      }
    }, BEAT_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [beat]);

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

  const skip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowName(true);
  };

  const current = BEATS[beat];

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* Animated background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={beat}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`absolute inset-0 bg-gradient-to-br ${current.bg}`}
        />
      </AnimatePresence>

      {/* Floating glow orbs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${beat}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 1 }}
          className="pointer-events-none absolute inset-0"
        >
          <div className={`absolute top-[15%] left-[10%] w-[500px] h-[500px] ${current.glow} blur-[180px] rounded-full animate-pulse`} />
          <div className={`absolute bottom-[10%] right-[10%] w-[600px] h-[600px] ${current.glowAlt} blur-[200px] rounded-full`} />
          <div className={`absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] ${current.glow} blur-[150px] rounded-full opacity-50`} />
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

      {/* Skip button */}
      {!showName && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={skip}
          className="absolute top-6 right-6 z-50 text-white/25 hover:text-white/60 text-sm font-medium transition-colors"
        >
          Skip →
        </motion.button>
      )}

      {/* Beat counter dots */}
      {!showName && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          {BEATS.map((_, i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              animate={{
                backgroundColor: i === beat ? '#fde047' : 'rgba(255,255,255,0.15)',
                scale: i === beat ? 1.3 : 1,
                boxShadow: i === beat ? '0 0 12px rgba(253,224,71,0.6)' : '0 0 0px transparent',
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
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
              {/* Big headline word */}
              <motion.h1
                className={`text-8xl sm:text-[10rem] lg:text-[12rem] font-black leading-none mb-6 sm:mb-8 ${current.accent}`}
                style={{
                  textShadow: `0 0 80px currentColor, 0 0 160px currentColor`,
                }}
              >
                {current.headline}
              </motion.h1>

              {/* Sub lines */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white/80 mb-3"
              >
                {current.sub}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg sm:text-xl text-white/40 font-medium"
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
              <motion.h2
                className="text-5xl sm:text-7xl font-black mb-4 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 60px rgba(253,224,71,0.3)' }}
              >
                Ready.
              </motion.h2>
              <p className="text-xl sm:text-2xl text-white/50 font-medium mb-12">
                What should BAE call you?
              </p>

              <div className="space-y-5">
                <input
                  ref={inputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGo()}
                  placeholder="Your first name"
                  className="w-full px-8 py-5 rounded-2xl bg-white/8 border border-white/15 text-white text-xl sm:text-2xl text-center font-semibold placeholder:text-white/20 outline-none focus:border-amber-400/40 focus:bg-white/10 focus:shadow-[0_0_40px_rgba(253,224,71,0.1)] transition-all"
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
                <button
                  onClick={() => router.push('/talk')}
                  className="text-white/20 hover:text-white/40 text-sm font-medium transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
