'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { createInterest } from '@/lib/structuredInterests';

// --- Reaction bar ---
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🤯', '👏', '🧠'];

function FloatingEmoji({ emoji, onComplete }: { emoji: string; onComplete: () => void }) {
  useEffect(() => { const t = setTimeout(onComplete, 900); return () => clearTimeout(t); }, []);
  return (
    <motion.span
      initial={{ opacity: 1, y: 0, scale: 1.2 }}
      animate={{ opacity: 0, y: -60, scale: 0.9 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="absolute pointer-events-none -top-12 left-1/2 -translate-x-1/2 text-3xl sm:text-4xl"
      style={{ filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))' }}
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
    white: 'Make Your BAE More...',
    gold: 'YOU',
    sub: 'Talk authentically about your life. Tap what resonates. Your interests make your conversations on BAE more fun and real.',
    glowColor: 'rgba(168,85,247,0.4)',
  },
  {
    white: 'Make Your BAE the Most Fun Place to',
    gold: 'Meet.',
    sub: 'Your interests. Your song. Your links. Your room.',
    glowColor: 'rgba(253,224,71,0.4)',
  },
  {
    white: 'Talk with Your',
    gold: 'People!',
    sub: 'Invite your people to your room.',
    glowColor: 'rgba(244,63,94,0.4)',
  },
];

// --- Talk Preview — full width, cinematic ---
const TALK_PILLS = ['Hot Yoga', 'Fitness', 'Wellness', 'Mind-body'];

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
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {TALK_PILLS.map(pill => {
            const isAdded = added.has(pill);
            return (
              <motion.button
                key={pill}
                whileTap={!isAdded ? { scale: 0.95 } : {}}
                onClick={(e) => handleTap(pill, e)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm sm:text-base font-bold transition-colors select-none ${
                  isAdded
                    ? 'text-emerald-300 bg-emerald-400/15 border-2 border-emerald-400/30'
                    : 'text-black bg-[#fde047] border-2 border-yellow-200 cursor-pointer'
                }`}
                style={!isAdded ? {
                  boxShadow: '0 0 20px rgba(253,224,71,0.45), 0 0 6px rgba(253,224,71,0.3)',
                } : {
                  boxShadow: '0 0 14px rgba(52,211,153,0.25)',
                }}
              >
                {isAdded ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>✓</motion.span>
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
  const [activeFloat, setActiveFloat] = useState<{ id: number; emoji: string; idx: number } | null>(null);
  const idRef = useRef(0);

  const handleReaction = (emoji: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playReactionSound(emoji);
    const id = idRef.current++;
    setActiveFloat({ id, emoji, idx });
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

        {/* Reaction bar — emojis float up from their own position */}
        <div className="flex justify-center gap-3 sm:gap-5 py-3 sm:py-4 px-6 sm:px-8 rounded-full bg-white/5 border border-white/10 max-w-lg mx-auto">
          {REACTION_EMOJIS.map((emoji, idx) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 1.4 }}
              onClick={(e) => handleReaction(emoji, idx, e)}
              className="relative text-2xl sm:text-3xl hover:scale-110 transition-transform cursor-pointer select-none p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {emoji}
              <AnimatePresence>
                {activeFloat && activeFloat.idx === idx && (
                  <FloatingEmoji key={activeFloat.id} emoji={activeFloat.emoji} onComplete={() => setActiveFloat(null)} />
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function playPillSound() {
  try {
    const ctx = getCtx(); const now = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(); osc.stop(now + 0.15);
  } catch {}
}

// --- Profile Preview — aspirational room card with Spotify ---
const PROFILE_INTERESTS = ['Hot Yoga', 'Italian Food', 'AI', 'Stand-up Comedy', 'Jazz', 'Travel', 'Philosophy', 'Cooking'];

function ProfilePreview() {
  const [extraInterests, setExtraInterests] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    setExtraInterests(prev => [...prev, val]);
    setInput('');
    playPillSound();
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 w-full overflow-hidden">
      <div className="max-w-2xl mx-auto">
        {/* Name + location */}
        <div className="text-center mb-5">
          <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">Alex M.</h3>
          <p className="text-white/40 text-sm font-medium">Brooklyn, NY</p>
        </div>

        {/* Interests */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-4">
          {[...PROFILE_INTERESTS, ...extraInterests].map(interest => (
            <motion.span
              key={interest}
              initial={PROFILE_INTERESTS.includes(interest) ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
              className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-black bg-[#fde047] border border-yellow-200"
              style={{ boxShadow: '0 0 16px rgba(253,224,71,0.45), 0 0 6px rgba(253,224,71,0.25)' }}
            >
              {interest}
            </motion.span>
          ))}
        </div>

        {/* Interactive add interest */}
        <div className="flex justify-center gap-2 mb-5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            onClick={e => e.stopPropagation()}
            placeholder="Add an interest..."
            className="px-4 py-2 rounded-full bg-white/6 border-2 border-amber-400/25 text-white text-sm text-center placeholder:text-white/20 outline-none focus:border-amber-400/50 focus:shadow-[0_0_15px_rgba(253,224,71,0.1)] font-semibold w-48 sm:w-56 transition-all"
          />
          {input.trim() && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleAdd}
              className="px-4 rounded-full font-black text-sm bg-amber-400 text-black"
            >
              +
            </motion.button>
          )}
        </div>

        {/* Spotify embed */}
        <div className="mb-5 rounded-xl overflow-hidden">
          <iframe
            src="https://open.spotify.com/embed/track/6GWOLPRxzswlHk93sT509g?theme=0&utm_source=generator"
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0"
          />
        </div>

        {/* Links */}
        <div className="flex justify-center gap-3 mb-5">
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold text-white/50 bg-white/5 border border-white/10">
            alexm.design
          </span>
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold text-white/50 bg-white/5 border border-white/10">
            @alexcreates
          </span>
        </div>

        {/* Room link */}
        <div className="text-center">
          <p
            className="text-lg sm:text-xl font-black"
            style={{ filter: 'drop-shadow(0 0 20px rgba(253,224,71,0.3))' }}
          >
            <span className="text-white/40">baewithme.com/</span>
            <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent">alex</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const PREVIEWS = [TalkPreview, ProfilePreview, ConnectPreview];

// --- Main page ---
export default function WelcomePage() {
  const router = useRouter();
  const [beat, setBeat] = useState(0);
  const [showSignup, setShowSignup] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Signup state
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [city, setCity] = useState('');
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth || !db) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        // Check if existing user — try Firestore first, then creation time as fallback
        let isExisting = false;

        // Method 1: Check Firestore for profile
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists() && snap.data().displayName?.trim()) {
            isExisting = true;
          }
        } catch {
          // Firestore failed — use creation time as fallback
          // If account was created more than 60 seconds ago, they're existing
          const createdAt = new Date(u.metadata.creationTime || 0).getTime();
          if (Date.now() - createdAt > 60000) {
            isExisting = true;
          }
        }

        if (isExisting) {
          router.replace('/');
          return;
        }

        // New user — show signup form
        setUser(u);
        setFirstName(u.displayName?.split(' ')[0] || '');
      }
    });
    return () => unsub();
  }, [auth, db, router]);

  const advance = () => {
    if (beat < BEATS.length - 1) {
      setBeat(prev => prev + 1);
    } else {
      setShowSignup(true);
    }
  };

  useEffect(() => {
    if (showSignup && user) setTimeout(() => firstNameRef.current?.focus(), 600);
  }, [showSignup, user]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch {
      try { await signInWithRedirect(auth, provider); } catch {}
    }
  };

  const handleAddInterest = () => {
    const val = interestInput.trim();
    if (!val || signupInterests.length >= 3) return;
    setSignupInterests(prev => [...prev, val]);
    setInterestInput('');
    if (signupInterests.length === 2) {
      playChordSound();
    } else {
      playCollectSound();
    }
  };

  const handleSignupComplete = async () => {
    if (!firstName.trim() || !city.trim() || signupInterests.length < 3 || !user || !db || isSaving) return;
    setIsSaving(true);
    try {
      // Merge new interests with any existing ones (never overwrite)
      const newInterests = signupInterests.map(name => createInterest(name, 'profile'));
      let mergedInterests = newInterests;
      try {
        const existing = await getDoc(doc(db, 'users', user.uid));
        if (existing.exists() && existing.data().interests?.length) {
          const { addInterests, parseInterests } = await import('@/lib/structuredInterests');
          mergedInterests = addInterests(parseInterests(existing.data().interests), newInterests);
        }
      } catch {}

      await setDoc(doc(db, 'users', user.uid), {
        displayName: firstName.trim(),
        firstName: firstName.trim(),
        city: city.trim(),
        interests: mergedInterests,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setLaunching(true);
      setTimeout(() => router.push('/talk'), 500);
    } catch (e) {
      console.error('Signup failed', e);
      setIsSaving(false);
    }
  };

  // Sound for adding interest
  const playCollectSound = () => {
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(); osc.stop(now + 0.15);
    } catch {}
  };

  const playChordSound = () => {
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {}
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
      {!showSignup && (
        <div className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
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
      <section className="relative z-10 flex items-center justify-center min-h-dvh px-4 sm:px-8 pt-4 sm:pt-6 pb-32 sm:pb-36">
        <AnimatePresence mode="wait">
          {!showSignup ? (
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
                  className="text-3xl sm:text-5xl md:text-6xl font-black leading-[1.15] mb-2 sm:mb-3"
                  style={{ filter: 'drop-shadow(0 0 60px rgba(255,180,255,0.4))' }}
                >
                  <span className="text-white">{current.white} </span>
                  <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent">{current.gold}</span>
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-base sm:text-lg md:text-xl font-semibold text-white/80"
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
              key="signup"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'circOut' } }}
              className="text-center max-w-md w-full px-4"
            >
              {/* Before auth: just the Google button */}
              {!user ? (
                <>
                  <h2
                    className="text-4xl sm:text-6xl font-black mb-10 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent"
                    style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.4))' }}
                  >
                    Join BAE
                  </h2>
                  <motion.button
                    onClick={handleGoogleSignIn}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-5 rounded-2xl font-black text-xl bg-white text-black flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </motion.button>
                </>
              ) : (
                /* After auth: personalized form */
                <>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl sm:text-6xl font-black mb-8 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent"
                    style={{ filter: 'drop-shadow(0 0 60px rgba(253,224,71,0.4))' }}
                  >
                    Hi {firstName || 'there'}!
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        ref={firstNameRef}
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Your name"
                        className="px-5 py-4 rounded-2xl bg-white/6 border-2 border-white/10 text-white text-lg text-center placeholder:text-white/20 outline-none focus:border-amber-400/40 focus:shadow-[0_0_20px_rgba(253,224,71,0.1)] font-semibold transition-all"
                      />
                      <input
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Your city"
                        className="px-5 py-4 rounded-2xl bg-white/6 border-2 border-white/10 text-white text-lg text-center placeholder:text-white/20 outline-none focus:border-amber-400/40 focus:shadow-[0_0_20px_rgba(253,224,71,0.1)] font-semibold transition-all"
                      />
                    </div>

                    <p className="text-white/40 text-base font-semibold text-center">
                      Drop 3 things you love.
                    </p>

                    {signupInterests.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2.5">
                        {signupInterests.map(interest => (
                          <motion.span
                            key={interest}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                            className="px-5 py-2.5 rounded-full text-base font-bold text-black bg-[#fde047] border border-yellow-200"
                            style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}
                          >
                            ✓ {interest}
                          </motion.span>
                        ))}
                      </div>
                    )}

                    {signupInterests.length < 3 && (
                      <div className="flex gap-2">
                        <input
                          value={interestInput}
                          onChange={e => setInterestInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddInterest()}
                          placeholder={signupInterests.length === 0 ? 'e.g. Italian food' : signupInterests.length === 1 ? 'e.g. hiking' : 'one more...'}
                          className="flex-1 px-5 py-4 rounded-2xl bg-white/6 border-2 border-amber-400/25 text-white text-lg text-center placeholder:text-white/20 outline-none focus:border-amber-400/50 focus:shadow-[0_0_25px_rgba(253,224,71,0.12)] font-semibold transition-all"
                        />
                        <motion.button
                          onClick={handleAddInterest}
                          disabled={!interestInput.trim()}
                          whileTap={{ scale: 0.95 }}
                          className={`px-6 rounded-2xl font-black text-xl ${
                            interestInput.trim() ? 'bg-amber-400 text-black' : 'bg-white/5 text-white/15'
                          } transition-all`}
                        >
                          +
                        </motion.button>
                      </div>
                    )}

                    <motion.button
                      onClick={handleSignupComplete}
                      disabled={!firstName.trim() || !city.trim() || signupInterests.length < 3 || isSaving}
                      whileHover={firstName.trim() && city.trim() && signupInterests.length >= 3 && !isSaving ? { scale: 1.03 } : {}}
                      whileTap={firstName.trim() && city.trim() && signupInterests.length >= 3 && !isSaving ? { scale: 0.97 } : {}}
                      animate={firstName.trim() && city.trim() && signupInterests.length >= 3 && !isSaving ? {
                        boxShadow: ['0 0 30px rgba(253,224,71,0.3)', '0 0 50px rgba(253,224,71,0.5)', '0 0 30px rgba(253,224,71,0.3)']
                      } : {}}
                      transition={firstName.trim() && city.trim() && signupInterests.length >= 3 ? { duration: 2, repeat: Infinity } : {}}
                      className={`w-full py-5 rounded-2xl font-black text-lg sm:text-xl transition-all mt-2 ${
                        firstName.trim() && city.trim() && signupInterests.length >= 3 && !isSaving
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black'
                          : 'bg-white/5 text-white/15 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? 'Setting up...' : 'Talk on BAE'}
                    </motion.button>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
