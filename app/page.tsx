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

// --- FEATURED INTERESTS (Top Row) ---
const FEATURED_INTERESTS = ['Music', 'Travel', 'Cooking', 'AI', 'Art'];

export default function HomePage() {
  const router = useRouter();

  // Firebase Initialization
  const [app] = useState(() => {
    const configEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    const config = configEnv ? JSON.parse(configEnv) : {};
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(config);
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  // State definitions
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);

  // Auth + profile load
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

  // Rotate words ticker
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // BAE CTA behavior
  const handleBAEClick = () => {
    if (isChecking) return;
    if (!user) return router.push('/auth');
    if (userInterests.length < MIN_REQUIRED) {
      alert(`Add at least ${MIN_REQUIRED} interests before BAEing someone!`);
      return;
    }
    router.push('/match');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* --- BACKGROUND (UNCHANGED) --- */}
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
        <div className="text-white/80 text-sm">{userName}</div>
      </header>

      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 min-h-screen z-10 pt-20">

        {/* 1. HORIZONTAL INTEREST ROW (New Feature) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8 sm:mb-12 max-w-3xl"
        >
          {FEATURED_INTERESTS.map((interest, i) => (
            <div 
              key={interest}
              className="px-5 py-2 rounded-full text-sm sm:text-base font-semibold text-white/90 backdrop-blur-md border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-yellow-300/50 hover:shadow-[0_0_20px_rgba(253,224,71,0.3)] transition-all cursor-default"
              style={{
                // Subtle gradient hints
                background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)`
              }}
            >
              {interest}
            </div>
          ))}
          {/* "+ and more" Bubble */}
          <div className="px-5 py-2 rounded-full text-sm sm:text-base font-semibold text-white/60 border border-white/5 bg-transparent italic">
            + and more
          </div>
        </motion.div>


        {/* 2. HUGE, BRIGHT, SHINING TAGLINE (Responsive Fix Applied) */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          // text-5xl on mobile -> text-9xl on desktop
          className="text-6xl sm:text-7xl lg:text-9xl font-extrabold mb-6 sm:mb-8 drop-shadow-[0_0_50px_rgba(255,160,255,0.8)] leading-tight" 
        >
          Meet. Match.
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent ml-2 sm:ml-4">
            BAE.
          </span>
        </motion.h2>

        {/* 3. EMOTIONAL TAGLINE (Beloved Line) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-2xl sm:text-3xl lg:text-4xl font-medium mb-8 text-white/95 drop-shadow-lg max-w-4xl"
        >
          One great conversation can{' '}
          <span className="inline-block min-w-[8rem] sm:min-w-[12rem] relative align-baseline">
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
          YOUR WHOLE DAY.
        </motion.p>
        
        {/* 4. SEPARATOR LINE */}
        <motion.div 
           initial={{ scaleX: 0, opacity: 0 }}
           animate={{ scaleX: 1, opacity: 0.5 }}
           transition={{ delay: 0.3, duration: 0.8 }}
           className="w-24 sm:w-32 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent mb-8"
        />

        {/* 5. DEFINITION LINE (Refined) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg sm:text-xl font-light mb-12 sm:mb-16 text-white/80 drop-shadow-md max-w-2xl tracking-wide leading-relaxed"
        >
          BAE is instant video conversations where your shared interests{' '}
          <span className="font-bold text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.8)] animate-pulse">
            glow
          </span>.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.05, boxShadow: "0 15px 40px rgba(255, 65, 108, 0.8)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-12 sm:px-20 py-5 sm:py-7 rounded-full text-white font-black transition-all disabled:opacity-50 mb-12"
          style={{
            background: "linear-gradient(90deg, #FF6F91, #FF9B85)",
            boxShadow: "0 10px 30px rgba(255, 65, 108, 0.4)",
          }}
        >
          <span className="relative z-10 text-xl sm:text-2xl font-black tracking-wider">{isChecking ? 'Initializing...' : 'BAE SOMEONE NOW!'}</span>
        </motion.button>

      </section>

      <footer className="absolute bottom-6 inset-x-0 text-center text-white/20 text-sm font-medium z-10">
        Totally Different. Totally You.
      </footer>

    </main>
  );
}