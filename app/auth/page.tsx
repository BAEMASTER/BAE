'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const ROTATING_WORDS = ['change', 'brighten', 'inspire', 'enhance'];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2600);

    return () => clearInterval(id);
  }, []);

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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 overflow-hidden">
      {/* Background pulse glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[45rem] h-[45rem] rounded-full bg-fuchsia-300/20 blur-[140px] animate-[pulseGlow_6s_ease-in-out_infinite]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-6 flex flex-col items-center text-center">
        {/* Hero headline identical to homepage */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{` `}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            BAE.
          </span>
        </motion.h2>

        {/* Tagline with rotating glowing verb */}
        <p className="text-lg sm:text-xl md:text-2xl max-w-2xl text-fuchsia-900/90 font-semibold mb-4 flex flex-wrap items-baseline justify-center gap-1">
          <span>A good conversation can</span>
          <span className="relative inline-block min-w-[6rem] text-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={ROTATING_WORDS[wordIndex]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.45)] font-bold"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          <span>your whole day.</span>
        </p>

        {/* Simple CTA line */}
        <p className="text-fuchsia-900/80 mb-8 text-base sm:text-lg">
          Sign in to start.
        </p>

        {/* Button card container for a bit of depth */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl px-6 py-8 sm:px-10 sm:py-10 max-w-3xl w-full flex justify-center">
          <button
            onClick={doSignIn}
            disabled={loading}
            className={`relative w-full max-w-xl px-10 sm:px-14 py-5 sm:py-6 rounded-full text-2xl sm:text-3xl font-extrabold tracking-tight text-white transition-all duration-500 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
            }`}
          >
            {loading ? 'Loading…' : 'Continue with Google'}
          </button>
        </div>
      </div>

      {/* Local keyframes for the pulse glow */}
      <style jsx>{`
        @keyframes pulseGlow {
          0% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.25;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
