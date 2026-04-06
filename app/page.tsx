'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interest columns ---
const COLUMNS = [
  ['Italian Food', 'Photography', 'Psychology', 'Vinyl Records', 'Meditation', 'Investing'],
  ['Art Museums', 'Parenting', 'Gardening', 'Podcasts', 'Cooking', 'Physics'],
  ['Running', 'Surfing', 'Dancing', 'Hiking', 'Chess', 'EDM'],
  ['AI', 'Yoga', 'Film', 'Jazz', 'Dogs', 'Sci-Fi'],
  ['Standup Comedy', 'Philosophy', 'Travel', 'Hot Yoga', 'Anime', 'Fitness'],
];

// --- Reaction bar ---
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🤯', '👏', '🧠'];

function FloatEmoji({ emoji, onComplete }: { emoji: string; onComplete: () => void }) {
  useEffect(() => { const t = setTimeout(onComplete, 800); return () => clearTimeout(t); }, []);
  return (
    <motion.span
      initial={{ opacity: 0.9, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -40, scale: 1.1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="absolute pointer-events-none -top-10 left-1/2 -translate-x-1/2 text-3xl sm:text-4xl"
      style={{ filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.4))' }}
    >
      {emoji}
    </motion.span>
  );
}

let sharedCtx: AudioContext | null = null;
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

function playTapSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } catch {}
}

export default function HomePage() {
  const router = useRouter();
  const [indices, setIndices] = useState([0, 0, 0, 0, 0]);
  const [floatingEmoji, setFloatingEmoji] = useState<{ id: number; emoji: string; idx: number } | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
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

  const handleReaction = (emoji: string, idx: number) => {
    playTapSound();
    const id = idRef.current++;
    setFloatingEmoji({ id, emoji, idx });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>


      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen">
        {/* Interest pills */}
        <div className="flex justify-center gap-2.5 sm:gap-3 mb-5 sm:mb-12">
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
        <h1 className="text-5xl sm:text-8xl lg:text-9xl font-black leading-[1.1] mb-5 sm:mb-12 drop-shadow-[0_0_60px_rgba(255,180,255,0.4)]">
          Be Yourself on{' '}
          <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent">BAE</span>
        </h1>

        {/* Reaction bar */}
        <div className="flex justify-center gap-3 sm:gap-5 py-3 sm:py-4 px-5 sm:px-10 rounded-full bg-white/5 border border-white/10 mb-5 sm:mb-12">
          {REACTION_EMOJIS.map((emoji, idx) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => handleReaction(emoji, idx)}
              className="relative text-3xl sm:text-4xl cursor-pointer select-none p-1 sm:p-2 min-w-[48px] min-h-[48px] flex items-center justify-center transition-transform"
            >
              {emoji}
              <AnimatePresence>
                {floatingEmoji && floatingEmoji.idx === idx && (
                  <FloatEmoji key={floatingEmoji.id} emoji={floatingEmoji.emoji} onComplete={() => setFloatingEmoji(null)} />
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Enter button */}
        <motion.button
          whileHover={{ scale: 1.07, boxShadow: '0 0 100px rgba(253,224,71,0.7), 0 0 160px rgba(245,158,11,0.35)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/welcome')}
          animate={{ boxShadow: ['0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)', '0 0 80px rgba(253,224,71,0.6), 0 0 140px rgba(245,158,11,0.3)', '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-24 sm:px-36 py-7 sm:py-9 rounded-full font-black text-3xl sm:text-4xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.2em]"
        >
          ENTER
        </motion.button>
      </section>
    </main>
  );
}
