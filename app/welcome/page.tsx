'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reaction bar ---
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🤯', '👏', '🧠'];
type FlyingEmoji = { id: number; emoji: string; originX: number };

function FlyingReaction({ emoji, originX, onComplete }: { emoji: string; originX: number; onComplete: () => void }) {
  const drift = useMemo(() => (Math.random() - 0.5) * 80, []);
  useEffect(() => { const t = setTimeout(onComplete, 1200); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1.8 }}
      animate={{ opacity: 0, x: drift, y: '-35vh', scale: 0.8 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="absolute pointer-events-none"
      style={{ left: `${originX}%`, bottom: '100px', fontSize: '48px', filter: 'drop-shadow(0 0 12px rgba(253,224,71,0.6))' }}
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

function playReactionSound(emoji?: string) {
  try {
    const ctx = getCtx();
    const s = (emoji && EMOJI_SOUNDS[emoji]) || { freq: 784, type: 'sine' as OscillatorType, dur: 0.12 };
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

function playAddSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(659, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  } catch {}
}

// --- Two beats only ---
const BEATS = [
  {
    headline: 'It starts with a conversation.',
    sub: 'Talk to BAE. Your interests reveal themselves naturally.',
    glowColor: 'rgba(168,85,247,0.4)',
  },
  {
    headline: 'Then it gets fun.',
    sub: 'Connect with anyone. Shared interests glow. React in real time.',
    glowColor: 'rgba(244,63,94,0.4)',
  },
];

// --- Talk Preview — full width, cinematic ---
const TALK_PILLS = ['Hot Yoga', 'Fitness', 'Wellness', 'Discipline', 'Mind-body', 'Meditation'];

function TalkPreview() {
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleTap = (pill: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (added.has(pill)) return;
    playAddSound();
    setAdded(prev => new Set(prev).add(pill));
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-10 md:p-12 w-full text-left">
      <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
        <p className="text-xl sm:text-3xl md:text-4xl leading-[1.6] text-white/90 font-light">
          What did you do today that actually felt good?
        </p>
        <div className="pl-5 sm:pl-8 border-l-[4px] border-amber-400/40">
          <p className="text-lg sm:text-2xl md:text-3xl leading-[1.6] text-amber-200/60 font-light italic">
            Went to hot yoga this morning
          </p>
        </div>
        <p className="text-xl sm:text-3xl md:text-4xl leading-[1.6] text-white/90 font-light">
          That&apos;s a very specific kind of discipline. Love that.
        </p>
        <p className="text-lg sm:text-2xl md:text-3xl leading-[1.6] text-white/60 font-light">
          Tap what fits you:
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {TALK_PILLS.map(pill => {
            const isAdded = added.has(pill);
            return (
              <motion.button
                key={pill}
                whileTap={!isAdded ? { scale: 0.92 } : {}}
                onClick={(e) => handleTap(pill, e)}
                className={`inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full text-lg sm:text-xl font-black transition-all select-none ${
                  isAdded
                    ? 'text-emerald-300 bg-emerald-400/15 border-2 border-emerald-400/30'
                    : 'text-black bg-[#fde047] border-2 border-yellow-200 cursor-pointer'
                }`}
                style={!isAdded ? {
                  boxShadow: '0 0 30px rgba(253,224,71,0.55), 0 0 10px rgba(253,224,71,0.35)',
                } : {
                  boxShadow: '0 0 20px rgba(52,211,153,0.3)',
                }}
              >
                {isAdded ? (
                  <motion.span initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>✓</motion.span>
                ) : (
                  <span className="font-black">+</span>
                )}
                {pill}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Connect Preview — full width, cinematic ---
function ConnectPreview() {
  const [flying, setFlying] = useState<FlyingEmoji[]>([]);
  const idRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const handleReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playReactionSound(emoji);
    const barRect = barRef.current?.getBoundingClientRect();
    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!barRect) return;
    const originX = ((btnRect.left + btnRect.width / 2 - barRect.left) / barRect.width) * 100;
    const id = idRef.current++;
    setFlying(prev => [...prev, { id, emoji, originX }]);
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-10 md:p-12 w-full relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Video placeholders */}
        <div className="flex gap-4 sm:gap-6 mb-6">
          <div className="flex-1 aspect-video rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border border-white/10 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-lg sm:text-2xl font-bold">You</div>
          </div>
          <div className="flex-1 aspect-video rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border border-white/10 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-lg sm:text-2xl font-bold">Alex</div>
          </div>
        </div>

        {/* Human moment */}
        <p className="text-center text-white/60 text-lg sm:text-2xl font-medium italic mb-4">&ldquo;Wait, you do hot yoga too?!&rdquo;</p>

        {/* Shared interests */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
          <span className="px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-base sm:text-lg font-bold text-black bg-[#fde047] border border-yellow-200" style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}>Hot Yoga</span>
          <span className="px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-base sm:text-lg font-bold text-black bg-[#fde047] border border-yellow-200" style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}>Cooking</span>
          <span className="px-5 py-2.5 sm:px-7 sm:py-3 rounded-full text-base sm:text-lg font-bold text-black bg-[#fde047] border border-yellow-200" style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}>Travel</span>
        </div>

        {/* Flying emojis */}
        <AnimatePresence>
          {flying.map(f => (
            <FlyingReaction key={f.id} emoji={f.emoji} originX={f.originX} onComplete={() => setFlying(prev => prev.filter(x => x.id !== f.id))} />
          ))}
        </AnimatePresence>

        {/* Reaction bar */}
        <div ref={barRef} className="flex justify-center gap-3 sm:gap-5 py-3 sm:py-4 px-6 sm:px-8 rounded-full bg-white/5 border border-white/10 max-w-lg mx-auto">
          {REACTION_EMOJIS.map(emoji => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 1.4 }}
              onClick={(e) => handleReaction(emoji, e)}
              className="text-2xl sm:text-3xl hover:scale-110 transition-transform cursor-pointer select-none p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

const PREVIEWS = [TalkPreview, ConnectPreview];

// --- Main page ---
export default function WelcomePage() {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState('');
  const [launching, setLaunching] = useState(false);
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
    setLaunching(true);
    const trimmed = name.trim();
    setTimeout(() => {
      router.push(trimmed ? `/talk?name=${encodeURIComponent(trimmed)}` : '/talk');
    }, 500);
  };

  const current = BEATS[beat];
  const Preview = PREVIEWS[beat];

  return (
    <main className="relative min-h-dvh overflow-hidden text-white bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033]">
      {/* Launch burst */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0.8, scale: 0 }}
            animate={{ opacity: 0, scale: 4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <div className="w-[300px] h-[300px] rounded-full bg-gradient-radial from-yellow-300/60 via-amber-400/30 to-transparent blur-[40px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      {/* Accent glow per beat */}
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[250px]"
            style={{ backgroundColor: current.glowColor }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      {!showName && (
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <motion.button
            onClick={(e) => { e.stopPropagation(); advance(); }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(253,224,71,0.5)' }}
            whileTap={{ scale: 0.95 }}
            className="px-10 sm:px-14 py-4 rounded-full text-base sm:text-lg font-black text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-wide"
            style={{ boxShadow: '0 0 30px rgba(253,224,71,0.4)' }}
          >
            {beat < BEATS.length - 1 ? 'Next' : "Let\u2019s go"}
          </motion.button>
          <p className="text-white/20 text-xs font-medium">{beat + 1} / {BEATS.length}</p>
        </div>
      )}

      {/* Content */}
      <section className="relative z-10 flex items-center justify-center min-h-dvh px-4 sm:px-8 pt-6 sm:pt-8 pb-28 sm:pb-32">
        <AnimatePresence mode="wait">
          {!showName ? (
            <motion.div
              key={`beat-${beat}`}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'circOut' } }}
              exit={{ opacity: 0, scale: 2, filter: 'blur(20px)', transition: { duration: 0.4, ease: 'circIn' } }}
              className="w-full max-w-5xl flex flex-col items-center text-center gap-6 sm:gap-8"
            >
              {/* Headline */}
              <div>
                <h1
                  className="text-4xl sm:text-6xl md:text-8xl font-black leading-[1.15] mb-3 sm:mb-4 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 80px rgba(253,224,71,0.5)) drop-shadow(0 0 140px rgba(253,224,71,0.25))' }}
                >
                  {current.headline}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/70"
                >
                  {current.sub}
                </motion.p>
              </div>

              {/* Preview — full width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="w-full"
              >
                <Preview />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="name-entry"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'circOut' } }}
              className="text-center max-w-lg w-full px-4"
            >
              <h2
                className="text-5xl sm:text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                style={{ filter: 'drop-shadow(0 0 80px rgba(253,224,71,0.5)) drop-shadow(0 0 140px rgba(253,224,71,0.25))' }}
              >
                What&apos;s your name?
              </h2>
              <p className="text-xl sm:text-2xl text-white/50 font-semibold mb-10 sm:mb-14">
                Let&apos;s make BAE yours.
              </p>

              <div className="space-y-6">
                <input
                  ref={inputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGo()}
                  placeholder="Your first name"
                  className="w-full px-8 py-6 rounded-2xl bg-white/8 border-2 border-white/15 text-white text-2xl sm:text-3xl text-center font-semibold placeholder:text-white/20 outline-none focus:border-amber-400/50 focus:bg-white/10 focus:shadow-[0_0_60px_rgba(253,224,71,0.2)] transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 100px rgba(253,224,71,0.7), 0 0 160px rgba(245,158,11,0.35)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleGo}
                  className="w-full py-6 rounded-2xl font-black text-2xl sm:text-3xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.12em]"
                  style={{ boxShadow: '0 0 60px rgba(253,224,71,0.5), 0 0 120px rgba(245,158,11,0.25)' }}
                >
                  Talk on BAE
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
