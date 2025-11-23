'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { motion } from 'framer-motion';
import RotatingGlowWord from '@/components/RotatingGlowWord';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  const doSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br
                    from-rose-100 via-fuchsia-100 to-indigo-100 px-6">

      {/* Background glows (match homepage feel) */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] 
                      bg-fuchsia-300/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] 
                      bg-indigo-300/20 blur-[120px] rounded-full" />

      {/* AUTH CARD */}
      <div className="relative z-10 bg-white/60 backdrop-blur-xl shadow-xl
                      px-10 py-12 rounded-3xl border border-white/40 max-w-xl w-full text-center">

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

        {/* One good conversation… */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-6"
        >
          One good conversation can{' '}
          <RotatingGlowWord />{' '}
          your whole day.
        </motion.p>

        {/* Secondary tagline w/ glowing “glow” */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-lg sm:text-xl text-fuchsia-900/80 mb-10 font-medium"
        >
          Instant video conversations where your shared interests{' '}
          <span className="glow-word">glow</span>.
        </motion.p>

        {/* SIGN IN BUTTON */}
        <button
          onClick={doSignIn}
          disabled={loading}
          className={`w-full py-4 rounded-full text-xl font-bold text-white transition-all
            ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
            }
          `}
        >
          {loading ? 'Loading…' : 'Sign in to Start'}
        </button>
      </div>
    </div>
  );
}
