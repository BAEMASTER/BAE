'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
// Unused imports removed for cleanliness

// --- CONSTANTS ---
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];
const MIN_REQUIRED = 3;

// --- FLOATING BUBBLE DATA ---
const INTERESTS = [
  'Music', 'Travel', 'Yoga', 'Art', 'Sports', 'Meditation', 'AI', 
  'Cooking', 'Philosophy', 'Tech', 'History', 'Nature'
];

// Utility function for random bubble placement
const randomPos = () => ({
  // Increased random range to 90% for wider spread
  top: `${Math.random() * 85 + 5}%`, 
  left: `${Math.random() * 85 + 5}%`,
});


export default function HomePage() {
  const router = useRouter();

  // Firebase initialization
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

  // Auth + load user profile (Logic remains the same)
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

  // Rotate words ticker (Logic remains the same)
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // BAE CTA behavior (Logic remains the same)
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
    // 1. BACKGROUND CHANGE: Darker, more atmospheric background
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* Background Effect (Soft nebula/aurora effect) */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-fuchsia-950 to-indigo-950 opacity-90"></div>
      
      {/* 2. Floating Interest Bubbles (Maintained glow style) */}
      <div className="absolute inset-0 pointer-events-none opacity-80 z-0">
        {INTERESTS.map((interest, index) => (
          <motion.div
            key={interest}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0.5, 1, 1, 0.5],
            }}
            transition={{ 
              duration: 15 + Math.random() * 10,
              repeat: Infinity, 
              ease: "linear",
              delay: index * 1.5,
            }}
            // Apply randomPos for a wide, random placement
            className="absolute bg-white/20 border border-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
            style={randomPos()}
          >
            {interest}
          </motion.div>
        ))}
      </div>


      {/* Header (Changed to fit dark background) */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md bg-black/50">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]">
          BAE
        </div>
        <div className="text-white">Jason Rotman <button className="ml-2 px-3 py-1 bg-fuchsia-600/80 rounded-full text-sm font-semibold hover:bg-fuchsia-600">Sign out</button></div>
      </header>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen z-10">

        {/* 2. BIGGER, BRIGHTER Tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          // Increased size and stronger drop shadow
          className="text-7xl sm:text-8xl font-extrabold mb-8 drop-shadow-[0_0_25px_rgba(255,160,255,0.4)]"
        >
          Meet. Match.
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent ml-2">
            BAE.
          </span>
        </motion.h2>

        {/* Rotational Words - KEPT and STYLED for contrast */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-xl sm:text-2xl font-medium mb-12 text-white/90 drop-shadow-md"
        >
          One great conversation can{' '}
          <span className="inline-block min-w-[7rem] relative align-baseline">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                // Bright, contrasting text for rotating verb
                className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent font-extrabold drop-shadow-lg"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>{' '}
          your whole day.
        </motion.p>

        {/* 3. SLEEKER BAE Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 120 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-12 sm:px-16 py-5 sm:py-6 rounded-full text-white font-black transition-all disabled:opacity-50"
          style={{
            // Sleek gradient and strong shadow from mock-up style
            background: "linear-gradient(90deg, #ff8c42, #ff416c)", 
            boxShadow: "0 10px 30px rgba(255, 65, 108, 0.6)",
          }}
        >
          <span className="relative z-10 text-xl sm:text-2xl font-black">{isChecking ? 'Loading...' : 'BAE SOMEONE NOW!'}</span>
        </motion.button>

      </section>

      <footer className="absolute bottom-6 inset-x-0 text-center text-white/50 text-sm font-medium z-10">
        Built with ❤️ by BAE Team
      </footer>

    </main>
  );
}