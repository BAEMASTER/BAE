'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-6">

      {/* Background Glow Pulse */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[45rem] h-[45rem] rounded-full bg-fuchsia-300/20 blur-[140px] animate-[pulseGlow_6s_ease-in-out_infinite]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-3xl">

        {/* Hero Headline */}
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-fuchsia-700 mb-8 leading-[1.1] relative">
          Meet.<br className="sm:hidden" />
          Match.<br className="sm:hidden" />

          <span className="relative inline-block">
            {/* Glow behind BAE */}
            <span className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400 blur-[80px] opacity-60 animate-[baePulse_6s_ease-in-out_infinite]"></span>

            {/* Text */}
            <span className="relative z-10 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
              BAE.
            </span>
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl font-medium text-fuchsia-900/80 max-w-2xl mb-10">
          A good conversation can change your whole day.
        </p>

        {/* Auth Card */}
        <div className="bg-white/60 backdrop-blur-xl shadow-xl px-10 py-12 rounded-3xl border border-white/40 max-w-lg w-full text-center">

          {/* CTA Button */}
          <button
            onClick={doSignIn}
            disabled={loading}
            className={`w-full py-5 rounded-full text-xl font-extrabold text-white transition-all duration-500 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]"
            }`}
          >
            {loading ? "Loading…" : "Continue with Google"}
          </button>

        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes pulseGlow {
          0% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
          100% { opacity: 0.25; transform: scale(1); }
        }

        @keyframes baePulse {
          0% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.07); }
          100% { opacity: 0.45; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
