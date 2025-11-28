'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const NAV_H = 72;
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userInterests, setUserName] = useState<string[]>([]);
  const [userName, setUserInterests] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);

  // 🚪 Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        setUserInterests(data?.interests || []);
        setUserName(data?.displayName || user.displayName || 'You');
      } else {
        setUserId(null);
      }
      setIsChecking(false);
    });
    return () => unsub();
  }, []);

  // 🔄 Rotating ticker words
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const handleBAEClick = () => {
    if (!userId) return router.push('/auth');
    if (userInterests.length < 3) {
      alert('Add at least 3 interests before BAEing someone!');
      return;
    }
    router.push('/match');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">

      {/* Glow background accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-[120px] rounded-full" />

      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px]"
        style={{
          WebkitBackdropFilter: 'saturate(1.2) blur(8px)',
          backdropFilter: 'saturate(1.2) blur(8px)',
        }}
      >
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">BAE</div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6" style={{ paddingTop: NAV_H + 48 }}>

        {/* Meet. Match. BAE. */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{` `}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">BAE.</span>
        </motion.h2>

        {/* Conversation tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-4"
        >
          One good conversation can{' '}
          <span className="inline-flex justify-center min-w-[7rem]">
            <span
              key={wordIndex}
              className="rotate-word bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-extrabold"
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
          </span>{' '}
          your whole day.
        </motion.p>

        {/* Updated glowing "glow" word like UI chips */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.6 }}
          className="text-lg sm:text-xl max-w-3xl text-purple-900 mb-10 font-semibold"
        >
          BAE is instant video conversations where your shared interests{' '}
          <motion.span
            animate={{
              boxShadow: [
                '0 0 12px rgba(255, 215, 0, 0.55)',
                '0 0 22px rgba(255, 215, 0, 0.85)',
                '0 0 12px rgba(255, 215, 0, 0.55)',
              ],
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 text-purple-900 font-bold"
          >
            glow
          </motion.span>.
        </motion.p>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.045 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-10 sm:px-14 py-5 sm:py-6 rounded-full text-2xl sm:text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)] transition-all duration-500 overflow-hidden"
        >
          <span className="relative z-10">{isChecking ? 'Loading...' : 'BAE Someone Now!'}</span>
        </motion.button>

      </section>

      <footer className="text-center text-fuchsia-800/60 text-sm pb-6">
        Built with ❤️ by BAE Team
      </footer>

    </main>
  );
}
