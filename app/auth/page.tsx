'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { motion } from 'framer-motion';

const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  // Rotating word ticker
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const doSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
      alert('Sign-in failed. Check your settings and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 overflow-hidden">
      {/* Soft center glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[46rem] h-[46rem] rounded-full bg-fuchsia-300/18 blur-[140px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Meet. Match. BAE. */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl sm:text-6xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{` `}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            BAE.
          </span>
        </motion.h2>

        {/* One good conversation... */}
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

        {/* Secondary tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.6 }}
          className="text-lg sm:text-xl text-fuchsia-900/90 mb-2 font-semibold"
        >
          BAE is instant video conversations where your shared interests{' '}
          <span className="glow-word font-extrabold text-fuchsia-900">
            glow.
          </span>
        </motion.p>

        {/* Small CTA line */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.6 }}
          className="text-sm sm:text-base text-fuchsia-900/80 mb-8"
        >
          Sign in to start.
        </motion.p>

        {/* Button card */}
        <div className="bg-white/65 backdrop-blur-xl shadow-xl rounded-3xl border border-white/50 px-10 py-8 w-full max-w-xl">
          <button
            onClick={doSignIn}
            disabled={loading}
            className="w-full py-4 rounded-full text-lg sm:text-xl font-semibold text-white 
                       bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 
                       shadow-[0_15px_40px_rgba(236,72,153,0.35)]
                       hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]
                       transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
