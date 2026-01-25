'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { doc, getDoc } from 'firebase/firestore';

// Shared rotating config with home
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Redirect already-signed-in users to profile (no friction)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/profile');
      }
    });
    return () => unsub();
  }, [router]);

  // Rotating ticker
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const doSignIn = async () => {
    try {
      setLoading(true);
      setBusy(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user has 3+ interests
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const interestCount = userDoc.exists() ? (userDoc.data().interests || []).length : 0;

      if (interestCount >= 3) {
        // Has 3+ interests → go to homepage
        router.push('/');
      } else {
        // Has 0-2 interests → go to profile to add more
        router.push('/profile');
      }
    } catch (e) {
      console.error('Sign-in error:', e);
      alert('Sign-in failed, try again.');
    } finally {
      setLoading(false);
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] overflow-hidden text-white pt-[72px]">

      {/* Soft ambient center glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[46rem] h-[46rem] rounded-full bg-fuchsia-500/15 blur-[140px] animate-pulse"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px]"></div>
      </div>

      {/* AUTH CONTENT */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-7xl sm:text-8xl lg:text-9xl font-black leading-tight text-white mb-8 drop-shadow-[0_0_20px_rgba(255,160,255,0.4)]"
        >
          Log In to Access{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
            BAE
          </span>
        </motion.h1>

        {/* Tagline with glowing pill */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-2xl sm:text-3xl lg:text-4xl text-white/90 font-semibold mb-12 flex flex-wrap items-center justify-center gap-3"
        >
          BAE is Where Your Shared Interests{' '}
          <span className="inline-flex">
            <motion.span
              animate={{ 
                boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-5 py-3 bg-yellow-300 text-black font-black rounded-full border-2 border-yellow-200 whitespace-nowrap text-2xl sm:text-3xl lg:text-4xl"
            >
              GLOW
            </motion.span>
          </span>
        </motion.p>

        {/* Big Login Button - Main CTA */}
        <AnimatePresence mode="wait">
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            {/* Age confirmation checkbox */}
            <motion.label
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 mb-6 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-white/40 bg-white/10 cursor-pointer accent-yellow-300"
              />
              <span className="text-sm text-white/80 font-semibold">
                I confirm I'm 18 or older
              </span>
            </motion.label>

            <button
              onClick={doSignIn}
              disabled={loading || busy || !ageConfirmed}
              className="w-full py-6 sm:py-8 rounded-full text-2xl sm:text-3xl font-extrabold text-white bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.7)] transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              {loading ? 'Loading…' : busy ? '…' : 'Continue with Google'}
            </button>
          </motion.div>
        </AnimatePresence>

      </div>
    </main>
    </>
  );
}