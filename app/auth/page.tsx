'use client';

import { useEffect, useState, useRef } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// Shared rotating config with home
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

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
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      // ✅ After login success, send to onboarding profile page
      router.push('/profile');

    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Optional: router guard for already-logged-in users
  useEffect(() => {
    // If already signed in, skip auth page friction
    const unsub = onAuthStateChanged?.(auth, (user) => {
      if (user) {
        router.push('/profile');
      }
    });
    return () => unsub?.();
  }, [router]);

  return (
    <div className="min-h-screen flex items-start justify-center pt-32 relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 overflow-hidden">

      {/* Soft ambient center glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[46rem] h-[46rem] rounded-full bg-fuchsia-300/18 blur-[140px]" />
      </div>

      {/* AUTH CARD */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl w-full">

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{` `}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            BAE.
          </span>
        </motion.h2>

        {/* Rotating culture tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-10"
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

        {/* 3-Interest onboarding explanation ✅ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
          className="mb-6 px-4"
        >
          <p className="text-fuchsia-700/80 text-sm font-medium">
            Add 3+ interests on the next screen to unlock matching.  
            That’s when the magic <span className="px-2 py-0.5 rounded bg-fuchsia-300/25 font-bold">glows ✨</span>
          </p>
        </motion.div>

        {/* Card UI */}
        <AnimatePresence mode="wait">
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="bg-white/65 backdrop-blur-xl shadow-xl rounded-2xl border border-white/50 px-10 py-8 w-full max-w-xl"
          >
            <h3 className="text-fuchsia-700 text-2xl font-extrabold mb-6">See The Glow</h3>

            <button
              onClick={doSignIn}
              disabled={loading}
              className="w-full py-5 rounded-full text-2xl font-extrabold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.48)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading…' : 'Continue with Google'}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
