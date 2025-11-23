'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

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
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100">

      {/* 🌟 BACKGROUND PULSE */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div className="w-[45rem] h-[45rem] rounded-full bg-fuchsia-300/20 blur-[140px] animate-[pulseGlow_6s_ease-in-out_infinite]"></div>
      </div>

      {/* 🌟 AUTH CARD */}
      <div className="relative z-10 bg-white/60 backdrop-blur-xl shadow-xl px-10 py-12 rounded-3xl border border-white/40 max-w-lg w-full text-center">

        {/* ✨ BAE LOGO WITH GLOW */}
        <div className="text-4xl font-extrabold text-fuchsia-700 mb-3 relative">
          <span className="relative z-10">BAE</span>
          <span className="absolute inset-0 blur-2xl opacity-50 bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400 rounded-full"></span>
        </div>

        {/* 🌟 INSPIRING LINE */}
        <p className="text-fuchsia-900/70 font-medium mb-8">
          A good conversation can change your whole day.
        </p>

        {/* 🔥 MAIN HEADLINE */}
        <h1 className="text-4xl font-extrabold text-fuchsia-700 leading-tight mb-3">
          Meet Someone New,<br />Share Your Glow!
        </h1>

        {/* SUBTEXT */}
        <p className="text-fuchsia-900/80 mb-10">
          Have fun. Meet people. Watch your shared interests glow.
        </p>

        {/* SIGN IN BUTTON */}
        <button
          onClick={doSignIn}
          disabled={loading}
          className={`
            w-full py-4 rounded-full text-lg font-semibold text-white transition-all
            ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
            }
          `}
        >
          {loading ? 'Loading…' : 'Continue with Google'}
        </button>

      </div>

      {/* KEYFRAME FOR PULSE */}
      <style jsx>{`
        @keyframes pulseGlow {
          0% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
          100% { opacity: 0.25; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
