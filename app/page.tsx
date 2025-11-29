'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, CheckCircle, Heart, Plus } from 'lucide-react';

// --- CONSTANTS ---
const NAV_H = 72;
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

const MIN_REQUIRED = 3;

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

  // Auth + load user profile
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
        const snap = await getDoc(doc(db, 'users', u.uid, 'profile', 'data'));
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

  // ✅ FIXED BAE CTA behavior (ALL cases covered)
const MIN_REQUIRED = 3;

const handleBAEClick = () => {
  if (isChecking) return; // still loading auth/profile

  // CASE 1: not signed in
  if (!user) {
    router.push('/auth');
    return;
  }

  // CASE 2: signed in but needs more interests
  if (userInterests.length < MIN_REQUIRED) {
    console.error("❌ Minimum interests not met for matching:", user.uid);
    alert(`Add at least ${MIN_REQUIRED} interests to unlock video matches! (${MIN_REQUIRED - userInterests.length} more needed!)`);
    return;
  }

  // CASE 3: signed in + enough interests = GO MATCH
  router.push('/match');
};


  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">

      {/* Glow accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-3xl rounded-full" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md">
        <div className="text-3xl font-extrabold text-fuchsia-600">BAE</div>
      </header>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen">

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-extrabold mb-6 text-fuchsia-700 drop-shadow-xl"
        >
          Meet. Match. <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">BAE.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-2xl sm:text-3xl font-bold mb-8 text-purple-900"
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
                className="bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-extrabold"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>{' '}
          your whole day.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.045 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-10 sm:px-14 py-5 sm:py-6 rounded-full text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-lg hover:shadow-xl transition-all"
        >
          <span className="relative z-10 text-xl sm:text-2xl font-black">{isChecking ? 'Loading...' : 'BAE SOMEONE NOW!'}</span>
          <span className="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"></span>
        </motion.button>

      </section>

      <footer className="absolute bottom-6 inset-x-0 text-center text-fuchsia-800/60 text-sm font-medium">
        Built with ❤️ by BAE Team
      </footer>

    </main>
  );
}