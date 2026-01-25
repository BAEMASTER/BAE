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
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl w-full">

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-black leading-tight text-white mb-6 drop-shadow-[0_0_20px_rgba(255,160,255,0.4)]"
        >
          Log In to Access
          <br />
          <span className="bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
            BAE
          </span>
        </motion.h1>

        {/* Tagline with glowing pill */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-lg sm:text-xl text-white/90 font-semibold mb-12 flex flex-wrap items-center justify-center gap-2"
        >
          BAE is Where Your Shared Interests{' '}
          <span className="inline-flex">
            <motion.span
              animate={{ 
                boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-2 bg-yellow-300 text-black font-black rounded-full border-2 border-yellow-200 whitespace-nowrap"
            >
              GLOW
            </motion.span>
          </span>
        </motion.p>

        {/* Card UI */}
        <AnimatePresence mode="wait">
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/10 px-8 sm:px-10 py-10 w-full max-w-md"
          >
            <h3 className="text-white text-xl font-black mb-8 text-center">Let's Begin</h3>
            
            <button
              onClick={doSignIn}
              disabled={loading || busy}
              className="w-full py-4 rounded-full text-lg font-extrabold text-white bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.7)] transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              {loading ? 'Loading…' : busy ? '…' : 'Continue with Google'}
            </button>

            <p className="text-white/50 text-xs text-center mt-6">
              Your interests make you interesting
            </p>
          </motion.div>
        </AnimatePresence>

      </div>
    </main>
    </>
  );
}