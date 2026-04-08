'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import Header from '@/components/Header';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth || !db) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().displayName?.trim()) {
            // Existing user — show logged-in homepage
            setIsLoggedIn(true);
            setUsername(snap.data().username || null);
          } else {
            // New user — needs signup
            router.push('/welcome');
          }
        } catch {
          setIsLoggedIn(true);
        }
      } else {
        setIsLoggedIn(false);
        setUsername(null);
      }
    });
    return () => unsub();
  }, []);

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
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      {/* Nav for logged-in users / sign-in for returning visitors */}
      {isLoggedIn ? <Header /> : (
        <div className="absolute top-5 right-5 z-20 flex items-center gap-3">
          <span className="text-white/20 text-xs font-medium hidden sm:inline">Already have an account?</span>
          <button
            onClick={async () => {
              try {
                const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                await signInWithPopup(auth, provider);
                // onAuthStateChanged will handle the rest
              } catch {
                router.push('/auth');
              }
            }}
            className="px-5 py-2 rounded-full border border-amber-400/40 text-amber-300/70 text-sm font-semibold bg-transparent hover:bg-amber-400/10 hover:text-amber-300 transition-all"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>


      <section className={`relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen ${isLoggedIn ? 'pt-[110px]' : ''}`}>
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

        {/* CTA — different for logged-in vs new visitors */}
        {isLoggedIn && username ? (
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            {/* Context line */}
            <p className="text-base sm:text-lg text-white/70 font-medium">Send your link to anyone and start talking.</p>

            {/* Room link + button — one unit */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              <motion.p
                animate={{ textShadow: ['0 0 30px rgba(253,224,71,0.2)', '0 0 50px rgba(253,224,71,0.35)', '0 0 30px rgba(253,224,71,0.2)'] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-2xl sm:text-3xl md:text-4xl font-black text-center"
              >
                <span className="text-white">baewithme.com/</span>
                <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent">
                  {username}
                </span>
              </motion.p>

              {/* Smart button — Copy Link on desktop, Share on mobile */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Mobile: use native share sheet. Desktop: copy to clipboard.
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                if (isMobile && navigator.share) {
                  navigator.share({ title: 'BAE with me', url: `https://baewithme.com/${username}` }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(`https://baewithme.com/${username}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="px-12 sm:px-16 py-4 sm:py-5 rounded-full font-black text-lg sm:text-xl text-black bg-white hover:bg-white/90 transition-all"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(255,255,255,0.1)' }}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </motion.button>
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.07, boxShadow: '0 0 100px rgba(253,224,71,0.7), 0 0 160px rgba(245,158,11,0.35)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/welcome')}
            animate={{ boxShadow: ['0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)', '0 0 80px rgba(253,224,71,0.6), 0 0 140px rgba(245,158,11,0.3)', '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-16 sm:px-36 py-6 sm:py-9 rounded-full font-black text-2xl sm:text-4xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.15em] sm:tracking-[0.2em]"
          >
            ENTER
          </motion.button>
        )}

      </section>
    </main>
  );
}
