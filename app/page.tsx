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

// --- STATIC ORB DATA ---
// Select a few key interests and define their fixed positions
const STATIC_ORBS = [
  { interest: 'Music', top: '25%', left: '10%' },
  { interest: 'Travel', top: '75%', left: '15%' },
  { interest: 'Art', top: '20%', right: '15%' },
  { interest: 'Meditation', top: '65%', right: '8%' },
  { interest: 'AI', top: '45%', left: '3%' },
  { interest: 'Cooking', top: '85%', right: '30%' },
];


export default function HomePage() {
  const router = useRouter();

  // Firebase, State, and Logic (All unchanged)
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
  }, []);

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

      {/* Deep-Space Gradient & Aurora remains */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] opacity-95"></div>
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
          <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>
      
      {/* 1. STATIC, GOLD GLOWING ORBS (New Feature) */}
      <div className="absolute inset-0 pointer-events-none opacity-90 z-0">
        {STATIC_ORBS.map(({ interest, ...pos }, index) => (
          <motion.div
            key={interest}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + index * 0.2, duration: 1.5, type: 'spring' }}
            // Styles for the gold glow and static positioning
            className="absolute bg-yellow-400/20 backdrop-blur-sm px-5 py-2 rounded-full text-sm font-extrabold text-yellow-300 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-300/50"
            style={{ 
              ...pos, 
              boxShadow: '0 0 20px rgba(252, 211, 77, 0.6)', // Gold glow effect
              animation: 'pulsate 3s ease-in-out infinite alternate', // Subtle pulse animation
              minWidth: '60px',
              textAlign: 'center'
            }}
          >
            {interest}
          </motion.div>
        ))}
      </div>
      
      {/* Add pulsate keyframes to your global CSS or inject a style tag if needed for the animation */}
      {/* @keyframes pulsate {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      */}


      {/* Header (Unchanged) */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md bg-black/50 border-b border-fuchsia-500/20">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]">
          BAE
        </div>
        <div className="text-white/80 text-sm">{userName}</div>
      </header>

      {/* HERO SECTION - The centerpiece */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen z-10">

        {/* HUGE, BRIGHT, SHINING TAGLINE (Unchanged) */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-7xl sm:text-8xl lg:text-[10rem] font-extrabold mb-8 drop-shadow-[0_0_50px_rgba(255,160,255,1)] leading-none" 
        >
          Meet. Match.
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent ml-4">
            BAE.
          </span>
        </motion.h2>

        {/* 2. EMOTIONAL TAGLINE (Your Beloved Line - Restored) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-3xl sm:text-4xl font-medium mb-3 text-white/95 drop-shadow-lg"
        >
          One great conversation can{' '}
          <span className="inline-block min-w-[12rem] relative align-baseline">
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
        
        {/* 3. DEFINITION LINE (The Simple, Straightforward Statement) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-xl sm:text-2xl font-light mb-16 text-white/70 drop-shadow-md max-w-2xl tracking-wide"
        >
          BAE is instant video conversations where your shared interests glow.
        </motion.p>

        {/* CTA Button (Unchanged) */}
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.05, boxShadow: "0 15px 40px rgba(255, 65, 108, 0.8)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-16 sm:px-20 py-6 sm:py-7 rounded-full text-white font-black transition-all disabled:opacity-50"
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