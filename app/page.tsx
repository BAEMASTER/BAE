'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONSTANTS ---
const ROTATING_WORDS = ['UPLIFT', 'ELEVATE', 'INSPIRE', 'CHANGE']; 
const MIN_REQUIRED = 3;

// --- FEATURED INTERESTS (Neutral + One Glowing) ---
const FEATURED_INTERESTS = [
  'Indian Food', 'Art Museums', 'Running', 
  'AI', // <-- This will be the glowing pill
  'Physics', 'Standup Comedy'
];

export default function HomePage() {
  const router = useRouter();

  // Firebase/Auth/State/Logic
  const [app] = useState(() => {
    const configEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    const config = configEnv ? JSON.parse(configEnv) : {};
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(config);
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch {}
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsChecking(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data();
        setUserName(data?.displayName || u.displayName || u.email || 'You');
        setUserInterests(data?.interests || []);
      } catch (e) {
        console.error("Profile load failed", e);
      }
      setIsChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] opacity-95"></div>
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
          <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>
      
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md bg-black/50 border-b border-fuchsia-500/20">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]">
          BAE
        </div>
        
        <div className="flex items-center gap-8">
          <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors font-medium text-sm">
            How BAE Works
          </a>
          <button
            onClick={() => router.push('/explorer')}
            className="text-white/70 hover:text-white transition-colors font-medium text-sm"
          >
            Explorer
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="text-white/70 hover:text-white transition-colors font-medium text-sm"
          >
            Profile
          </button>
          <button
            onClick={() => router.push('/match')}
            className="text-white/70 hover:text-white transition-colors font-medium text-sm"
          >
            Match
          </button>
        </div>

        {user ? (
          <div className="text-white/80 text-sm font-medium">{userName}</div>
        ) : (
          <button
            onClick={() => router.push('/auth')}
            className="px-8 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold text-base hover:shadow-lg hover:shadow-pink-500/50 transition-all"
          >
            Sign In
          </button>
        )}
      </header>

      {/* HERO SECTION - Compact layout, no dead space */}
      <section className="relative flex flex-col items-center text-center px-4 z-10 pt-8 sm:pt-12 pb-20">

        {/* 1. ELEGANT INTEREST ROW - On top, tight spacing */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10 max-w-4xl"
        >
          {FEATURED_INTERESTS.map((interest, i) => {
            const isGlow = interest === 'AI';
            return (
              <div 
                key={interest}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-default ${
                  isGlow 
                    ? 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] animate-pulse-slow-reverse' 
                    : 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm'
                }`}
              >
                {interest}
              </div>
            );
          })}
          <div className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white/40 border border-white/10 bg-transparent italic">
            + and more
          </div>
        </motion.div>

        {/* 2. HUGE, BRIGHT HEADLINE */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl sm:text-7xl lg:text-9xl font-extrabold mb-6 sm:mb-8 drop-shadow-[0_0_50px_rgba(255,160,255,0.8)] leading-tight" 
        >
          Meet. Match.
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent ml-2 sm:ml-4">
            BAE.
          </span>
        </motion.h2>

        {/* 3. EMOTIONAL TAGLINE */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-2xl sm:text-3xl lg:text-3xl font-medium mb-8 text-white/95 drop-shadow-lg max-w-4xl" 
        >
          <span className="block sm:inline">One great conversation can{' '}</span>
          <span className="inline-block min-w-[7rem] sm:min-w-[12rem] relative align-baseline">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="bg-gradient-to-r from-yellow-100 to-pink-300 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>{' '}
          <span className="block sm:inline">YOUR WHOLE DAY.</span>
        </motion.p>

        {/* SEPARATOR */}
        <motion.div 
           initial={{ scaleX: 0, opacity: 0 }}
           animate={{ scaleX: 1, opacity: 0.5 }}
           transition={{ delay: 0.3, duration: 0.8 }}
           className="w-20 sm:w-28 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent mb-8"
        />

        {/* CTA BUTTON - Changes based on auth/profile state */}
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.05, boxShadow: "0 15px 40px rgba(245, 158, 11, 0.7)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!user) {
              router.push('/auth');
            } else if (userInterests.length < MIN_REQUIRED) {
              router.push('/profile');
            } else {
              router.push('/match');
            }
          }}
          disabled={isChecking}
          className="relative px-12 sm:px-20 py-5 sm:py-7 rounded-full text-white font-black transition-all disabled:opacity-50 mb-12"
          style={{
            background: "linear-gradient(90deg, #F59E0B, #F97316)",
            boxShadow: "0 10px 30px rgba(245, 158, 11, 0.4)",
          }}
        >
          <span className="relative z-10 text-xl sm:text-2xl font-black tracking-wider">
            {isChecking ? 'Initializing...' : !user ? 'BAE SOMEONE NOW!' : userInterests.length < MIN_REQUIRED ? 'Complete Your Profile' : 'BAE SOMEONE NOW!'}
          </span>
        </motion.button>

      </section>

      <footer className="absolute bottom-6 inset-x-0 text-center text-white/20 text-sm font-medium z-10">
        Your interests make you interesting
      </footer>
    </main>
  );
}