'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reaction bar for Connect preview ---
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🤯', '👏', '🧠'];

type FlyingEmoji = { id: number; emoji: string; originX: number };

function FlyingReaction({ emoji, originX, onComplete }: { emoji: string; originX: number; onComplete: () => void }) {
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []);
  useEffect(() => { const t = setTimeout(onComplete, 1000); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1.5 }}
      animate={{ opacity: 0, x: drift, y: '-30vh', scale: 0.8 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="absolute pointer-events-none"
      style={{ left: `${originX}%`, bottom: '80px', fontSize: '36px', filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))' }}
    >
      {emoji}
    </motion.div>
  );
}

let sharedCtx: AudioContext | null = null;
function playReactionSound() {
  try {
    if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (sharedCtx.state === 'suspended') sharedCtx.resume();
    const now = sharedCtx.currentTime;
    const osc = sharedCtx.createOscillator();
    const gain = sharedCtx.createGain();
    osc.connect(gain); gain.connect(sharedCtx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(784, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } catch {}
}

// --- Beat data ---
const BEATS = [
  {
    headline: 'It starts with a conversation.',
    sub: 'Talk to BAE. Your interests reveal themselves naturally.',
    sub2: '',
    glowColor: 'rgba(168,85,247,0.4)',
  },
  {
    headline: 'Everything you love, in one place.',
    sub: 'Your BAE room. Your interests. Your link to share.',
    sub2: '',
    glowColor: 'rgba(253,224,71,0.4)',
  },
  {
    headline: 'Connect.',
    sub: 'Invite anyone into your room.',
    sub2: 'Shared interests glow. Real conversations happen.',
    glowColor: 'rgba(244,63,94,0.4)',
  },
];

// --- Pill component ---
function GoldPill({ children, small }: { children: string; small?: boolean }) {
  return (
    <span
      className={`inline-block ${small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} rounded-full font-bold text-black bg-[#fde047] border border-yellow-200`}
      style={{ boxShadow: '0 0 16px rgba(253,224,71,0.45), 0 0 6px rgba(253,224,71,0.3)' }}
    >
      {children}
    </span>
  );
}

// --- Preview panels ---
function TalkPreview() {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-center gap-4 text-left">
      <p className="text-white/40 text-sm font-medium">BAE</p>
      <p className="text-white text-base sm:text-lg font-medium">What did you do today that actually felt good?</p>
      <div className="border-l-2 border-amber-400/30 pl-4">
        <p className="text-white/70 text-base sm:text-lg font-medium">Went to hot yoga this morning</p>
      </div>
      <p className="text-white/40 text-sm font-medium">BAE</p>
      <p className="text-white text-base sm:text-lg font-medium">That&apos;s a very specific kind of discipline. Is that a recent thing or have you always been that way?</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <GoldPill>Hot Yoga</GoldPill>
        <GoldPill>Fitness</GoldPill>
        <GoldPill>Wellness</GoldPill>
      </div>
    </div>
  );
}

function BuildPreview() {
  const interests = ['Hot Yoga', 'Italian Food', 'AI', 'Stand-up Comedy', 'Parenting', 'Jazz', 'Photography', 'Travel', 'Philosophy', 'Cooking', 'Fitness', 'Vinyl Records'];
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-center">
      <p className="text-white font-black text-xl sm:text-2xl mb-1">Jason R.</p>
      <p className="text-white/30 text-sm font-medium mb-4">52 interests</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
        {interests.map(i => <GoldPill key={i} small>{i}</GoldPill>)}
      </div>
      <p className="text-amber-400/60 text-sm font-semibold">baewithme.com/jason</p>
    </div>
  );
}

function ConnectPreview() {
  const [flying, setFlying] = useState<FlyingEmoji[]>([]);
  const idRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const handleReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playReactionSound();
    const barRect = barRef.current?.getBoundingClientRect();
    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!barRect) return;
    const originX = ((btnRect.left + btnRect.width / 2 - barRect.left) / barRect.width) * 100;
    const id = idRef.current++;
    setFlying(prev => [...prev, { id, emoji, originX }]);
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
      {/* Video placeholders */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 aspect-[4/3] rounded-xl bg-gradient-to-br from-violet-900/50 to-indigo-900/50 border border-white/5 flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-lg">You</div>
        </div>
        <div className="flex-1 aspect-[4/3] rounded-xl bg-gradient-to-br from-violet-900/50 to-indigo-900/50 border border-white/5 flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-lg">Alex</div>
        </div>
      </div>

      {/* Human moment */}
      <p className="text-center text-white/50 text-sm sm:text-base font-medium italic mb-2">&ldquo;Wait, you do hot yoga too?!&rdquo;</p>

      {/* Shared interests */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        <GoldPill small>Hot Yoga</GoldPill>
        <GoldPill small>Cooking</GoldPill>
        <GoldPill small>Travel</GoldPill>
      </div>

      {/* Flying emojis */}
      <AnimatePresence>
        {flying.map(f => (
          <FlyingReaction key={f.id} emoji={f.emoji} originX={f.originX} onComplete={() => setFlying(prev => prev.filter(x => x.id !== f.id))} />
        ))}
      </AnimatePresence>

      {/* Reaction bar — FUNCTIONAL */}
      <motion.p
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-center text-amber-300/60 text-xs font-semibold mb-2"
      >
        Go ahead
      </motion.p>
      <div ref={barRef} className="flex justify-center gap-2 sm:gap-3 py-2 px-3 rounded-full bg-white/5 border border-white/10">
        {REACTION_EMOJIS.map(emoji => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.4 }}
            onClick={(e) => handleReaction(emoji, e)}
            className="text-xl sm:text-2xl hover:scale-110 transition-transform cursor-pointer select-none"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS = [TalkPreview, BuildPreview, ConnectPreview];

// --- Main page ---
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
    router.push(trimmed ? `/talk?name=${encodeURIComponent(trimmed)}` : '/talk');
  };

  const current = BEATS[beat];
  const Preview = PREVIEWS[beat];

  return (
    <main className="relative min-h-screen overflow-hidden text-white bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033]">
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px]"
            style={{ backgroundColor: current.glowColor }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots + tap hint */}
      {!showName && (
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
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
        className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-8 py-16 sm:py-0"
        onClick={(e) => {
          // Don't advance if clicking reaction bar
          if ((e.target as HTMLElement).closest('[data-reaction-bar]')) return;
          if (!showName) advance();
        }}
        style={{ cursor: showName ? 'default' : 'pointer' }}
      >
        <AnimatePresence mode="wait">
          {!showName ? (
            <motion.div
              key={`beat-${beat}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.5 } }}
              exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)', transition: { duration: 0.3 } }}
              className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-8 md:gap-12"
            >
              {/* Left: Text */}
              <div className="flex-shrink-0 md:w-[40%] text-center md:text-left">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 md:mb-8 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.5)) drop-shadow(0 0 120px rgba(253,224,71,0.25))' }}
                >
                  {current.headline}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3"
                >
                  {current.sub}
                </motion.p>
                {current.sub2 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="text-base sm:text-lg md:text-xl font-semibold text-white/50"
                  >
                    {current.sub2}
                  </motion.p>
                )}
              </div>

              {/* Right: Interactive preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="flex-1 w-full md:w-[60%] min-h-[280px] sm:min-h-[320px] md:min-h-[400px]"
              >
                <Preview />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="name-entry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg w-full"
            >
              <h2
                className="text-5xl sm:text-7xl font-black mb-3 text-white"
                style={{ filter: 'drop-shadow(0 0 40px rgba(255,180,255,0.3))' }}
              >
                Let&apos;s Talk.
              </h2>
              <h2
                className="text-4xl sm:text-6xl font-black mb-12 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.4))' }}
              >
                And Make it Interesting.
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
