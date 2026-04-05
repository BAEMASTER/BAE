'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

// Each emoji gets its own character — different pitch + wave shape
const EMOJI_SOUNDS: Record<string, { freq: number; type: OscillatorType; dur: number }> = {
  '❤️': { freq: 523, type: 'sine', dur: 0.15 },       // C5 — warm
  '🔥': { freq: 880, type: 'sawtooth', dur: 0.08 },   // A5 — snappy
  '😂': { freq: 698, type: 'triangle', dur: 0.1 },    // F5 — playful
  '🤯': { freq: 1047, type: 'sine', dur: 0.18 },      // C6 — high shimmer
  '👏': { freq: 587, type: 'square', dur: 0.06 },      // D5 — percussive pop
  '🧠': { freq: 784, type: 'sine', dur: 0.2 },        // G5 — rich harmonic
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
    // Brain gets a second harmonic overtone
    if (emoji === '🧠') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(1568, now); // G6
      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.start(now); osc2.stop(now + 0.25);
    }
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

// --- Animated Talk Preview ---
type ConvoLine = { type: 'bae' | 'user' | 'pills'; text?: string; pills?: string[] };

const CONVO_LINES: ConvoLine[] = [
  { type: 'bae', text: 'What did you do today that actually felt good?' },
  { type: 'user', text: 'Went to hot yoga this morning' },
  { type: 'bae', text: "That's a very specific kind of discipline. Is that a recent thing or have you always been that way?" },
  { type: 'user', text: "It started during COVID honestly. Now I can't go a week without it." },
  { type: 'bae', text: "So it became a ritual, not just a workout. That says a lot about you." },
  { type: 'pills', pills: ['Hot Yoga', 'Fitness', 'Wellness'] },
  { type: 'bae', text: "Tap to add to your interests:" },
  { type: 'bae', text: "What else keeps you grounded like that?" },
  { type: 'user', text: "Cooking. I make pasta from scratch every Sunday." },
  { type: 'bae', text: "Every Sunday — you're a ritual person. What's your signature dish?" },
  { type: 'pills', pills: ['Cooking', 'Italian Food', 'Sunday Rituals'] },
];

function TalkPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= CONVO_LINES.length) return;
    const delay = CONVO_LINES[visibleCount]?.type === 'pills' ? 600 : visibleCount === 0 ? 400 : 1200;
    const t = setTimeout(() => setVisibleCount(prev => prev + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-5 h-full flex flex-col justify-end gap-2.5 text-left overflow-hidden">
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-full">
        {CONVO_LINES.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {line.type === 'bae' && (
              <div>
                {i === 0 || CONVO_LINES[i - 1]?.type !== 'bae' ? (
                  <p className="text-white/35 text-xs font-medium mb-1">BAE</p>
                ) : null}
                <p className="text-white text-sm sm:text-base font-medium">{line.text}</p>
              </div>
            )}
            {line.type === 'user' && (
              <div className="border-l-2 border-amber-400/30 pl-3">
                <p className="text-white/65 text-sm sm:text-base font-medium">{line.text}</p>
              </div>
            )}
            {line.type === 'pills' && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {line.pills!.map((p, pi) => (
                  <motion.span
                    key={p}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 12, delay: pi * 0.12 }}
                  >
                    <GoldPill small>{p}</GoldPill>
                  </motion.span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BuildPreview() {
  const interests = ['Hot Yoga', 'Italian Food', 'AI', 'Stand-up Comedy', 'Parenting', 'Jazz', 'Photography', 'Travel', 'Philosophy', 'Cooking', 'Fitness', 'Vinyl Records'];
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-center">
      <p className="text-white font-black text-xl sm:text-2xl mb-1">Alex M.</p>
      <p className="text-white/30 text-sm font-medium mb-4">52 interests</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
        {interests.map(i => <GoldPill key={i} small>{i}</GoldPill>)}
      </div>
      <p className="text-amber-400/60 text-sm font-semibold">baewithme.com/alex</p>
    </div>
  );
}

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
        The only social media with a brain. Tap to React!
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

// --- Nav Arrow ---
function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      whileHover={{ opacity: 0.5 }}
      whileTap={{ scale: 0.9 }}
      className="text-white/20 hover:text-white/50 transition-opacity p-2"
    >
      <Icon size={36} strokeWidth={1.5} />
    </motion.button>
  );
}

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

  const goBack = () => {
    if (beat > 0) setBeat(prev => prev - 1);
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
    <main className="relative min-h-screen overflow-hidden text-white bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033]">
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px]"
            style={{ backgroundColor: current.glowColor }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows — desktop: between panels, mobile: screen edges */}
      {!showName && (
        <>
          {/* Left arrow — only if not first beat */}
          {beat > 0 && (
            <div className="absolute left-2 sm:left-4 md:left-[calc(40%-24px)] top-1/2 -translate-y-1/2 z-50">
              <NavArrow direction="left" onClick={goBack} />
            </div>
          )}
          {/* Right arrow — always visible on beats */}
          <div className="absolute right-2 sm:right-4 md:right-[calc(40%-24px)] top-1/2 -translate-y-1/2 z-50">
            <NavArrow direction="right" onClick={advance} />
          </div>
        </>
      )}

      {/* Content */}
      <section className="relative z-10 flex items-center justify-center min-h-screen px-10 sm:px-16 md:px-8 py-16 sm:py-0">
        <AnimatePresence mode="wait">
          {!showName ? (
            <motion.div
              key={`beat-${beat}`}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'circOut' } }}
              exit={{ opacity: 0, scale: 2, filter: 'blur(20px)', transition: { duration: 0.4, ease: 'circIn' } }}
              className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-6 md:gap-12"
            >
              {/* Left: Text */}
              <div className="flex-shrink-0 md:w-[40%] text-center md:text-left">
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4 md:mb-6 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.5)) drop-shadow(0 0 120px rgba(253,224,71,0.25))' }}
                >
                  {current.headline}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2"
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
                className="flex-1 w-full md:w-[60%] min-h-[300px] sm:min-h-[340px] md:min-h-[420px]"
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
              className="text-center max-w-lg w-full px-4"
            >
              <h2
                className="text-4xl sm:text-6xl font-black mb-2 text-white"
                style={{ filter: 'drop-shadow(0 0 40px rgba(255,180,255,0.3))' }}
              >
                Let&apos;s Talk.
              </h2>
              <h2
                className="text-3xl sm:text-5xl font-black mb-10 sm:mb-12 bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
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
