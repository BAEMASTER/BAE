'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
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

type FlyingEmoji = { id: number; emoji: string; originX: number };

function FlyingReaction({ emoji, originX, onComplete }: { emoji: string; originX: number; onComplete: () => void }) {
  const drift = useMemo(() => (Math.random() - 0.5) * 100, []);
  useEffect(() => { const t = setTimeout(onComplete, 1200); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 2 }}
      animate={{ opacity: 0, x: drift, y: '-40vh', scale: 0.8 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="absolute pointer-events-none"
      style={{ left: `${originX}%`, bottom: '60px', fontSize: '52px', filter: 'drop-shadow(0 0 12px rgba(253,224,71,0.6))' }}
    >
      {emoji}
    </motion.div>
  );
}

let sharedCtx: AudioContext | null = null;
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

const EMOJI_SOUNDS: Record<string, { freq: number; type: OscillatorType; dur: number }> = {
  '❤️': { freq: 523, type: 'sine', dur: 0.15 },
  '🔥': { freq: 880, type: 'sawtooth', dur: 0.08 },
  '😂': { freq: 698, type: 'triangle', dur: 0.1 },
  '🤯': { freq: 1047, type: 'sine', dur: 0.18 },
  '👏': { freq: 587, type: 'square', dur: 0.06 },
  '🧠': { freq: 784, type: 'sine', dur: 0.2 },
};

function playSound(emoji: string) {
  try {
    const ctx = getCtx();
    const s = EMOJI_SOUNDS[emoji] || { freq: 784, type: 'sine' as OscillatorType, dur: 0.12 };
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = s.type; osc.frequency.setValueAtTime(s.freq, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    osc.start(now); osc.stop(now + s.dur);
    if (emoji === '🧠') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(1568, now);
      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.start(now); osc2.stop(now + 0.25);
    }
  } catch {}
}

export default function HomePage() {
  const router = useRouter();
  const [indices, setIndices] = useState([0, 0, 0, 0, 0]);
  const [flying, setFlying] = useState<FlyingEmoji[]>([]);
  const idRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

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

  const handleReaction = (emoji: string) => {
    playSound(emoji);
    const barRect = barRef.current?.getBoundingClientRect();
    if (!barRect) return;
    const originX = 30 + Math.random() * 40; // spread across center
    const id = idRef.current++;
    setFlying(prev => [...prev, { id, emoji, originX }]);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      {/* Flying emojis — full page */}
      <div className="fixed inset-0 z-30 pointer-events-none">
        <AnimatePresence>
          {flying.map(f => (
            <FlyingReaction key={f.id} emoji={f.emoji} originX={f.originX} onComplete={() => setFlying(prev => prev.filter(x => x.id !== f.id))} />
          ))}
        </AnimatePresence>
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen">
        {/* Interest pills */}
        <div className="flex justify-center gap-2.5 sm:gap-3 mb-8 sm:mb-12">
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
        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[1.1] mb-8 sm:mb-12 drop-shadow-[0_0_60px_rgba(255,180,255,0.4)]">
          Be Yourself on{' '}
          <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent">BAE</span>
        </h1>

        {/* Reaction bar */}
        <div ref={barRef} className="flex justify-center gap-3 sm:gap-5 py-4 px-6 sm:px-10 rounded-full bg-white/5 border border-white/10 mb-8 sm:mb-12 relative z-40">
          {REACTION_EMOJIS.map(emoji => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 1.5 }}
              whileHover={{ scale: 1.15 }}
              onClick={() => handleReaction(emoji)}
              className="text-3xl sm:text-4xl cursor-pointer select-none p-1 sm:p-2 min-w-[48px] min-h-[48px] flex items-center justify-center transition-transform"
            >
              {emoji}
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
