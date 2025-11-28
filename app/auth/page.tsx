'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Shared rotating config with home
const ROTATING_WORDS = ['uplift', 'elevate', 'inspire', 'change'];

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

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
      await signInWithPopup(auth, provider);
      router.push('/profile'); // ✅ forward after login success
    } catch (e) {
      console.error('Sign-in error:', e);
      alert('Sign-in failed, try again.');
    } finally {
      setLoading(false);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-start justify-center pt-32 relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 overflow-hidden text-white">

      {/* Soft ambient center glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[46rem] h-[46rem] rounded-full bg-fuchsia-300/18 blur-[140px]" />
      </div>

      {/* AUTH CONTENT */}
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

        {/* 3-interest onboarding copy (stands out in glowing pill style) */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-base font-semibold mb-8"
        >
          Add 3+ interests to start matching. Your shared interests will{' '}
          <span className="inline-flex">
            <span
              className="px-3 py-1 rounded-full bg-fuchsia-600 text-white font-bold shadow-[0_0_14px_rgba(236,72,153,0.65)]"
            >
              glow ✨
            </span>
          </span>
        </motion.p>

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
              disabled={loading || busy}
              className="w-full py-5 rounded-full text-2xl font-extrabold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.48)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading…' : busy ? '…' : 'Continue with Google'}
            </button>
          </motion.div>
        </AnimatePresence>

      </div>
    </main>
  );
}
