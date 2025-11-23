'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import RotatingGlowWord from '@/components/RotatingGlowWord';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  const doSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100">

      {/* HERO LINE — Meet. Match. BAE. */}
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

      {/* One good conversation... */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.7 }}
        className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-4"
      >
        One good conversation can{' '}
        <RotatingGlowWord />{' '}
        your whole day.
      </motion.p>

      {/* Instant video line */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="text-lg sm:text-xl max-w-2xl text-fuchsia-900/90 mb-10 font-medium"
      >
        Instant video conversations with real people where your shared interests glow.
      </motion.p>

      {/* SIGN-IN CARD */}
      <div className="bg-white/60 backdrop-blur-xl px-10 py-10 rounded-3xl border border-white/40 shadow-xl max-w-lg w-full">

        <button
          disabled={loading}
          onClick={doSignIn}
          className={`w-full py-4 rounded-full text-xl sm:text-2xl font-extrabold text-white transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
          }`}
        >
          {loading ? 'Loading…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
