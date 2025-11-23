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

      {/* PULSE BACKGROUND */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[50rem] h-[50rem] rounded-full bg-fuchsia-300/20 blur-[140px] animate-[pulseGlow_6s_ease-in-out_infinite]" />
      </div>

      {/* AUTH CONTENT */}
      <div className="relative z-10 max-w-2xl w-full text-center px-6">

        {/* HEADLINE: MEET. MATCH. BAE. */}
        <h1 className="text-6xl font-extrabold tracking-tight mb-8 leading-[1.15]">
          <span className="text-purple-800">Meet.</span>{' '}
          <span className="text-purple-800">Match.</span>{' '}
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500">
            {/* Glow */}
            <span className="absolute inset-0 blur-3xl bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 opacity-40"></span>
            <span className="relative z-10">BAE.</span>
          </span>
        </h1>

        {/* TAGLINE */}
        <p className="text-xl text-purple-900/80 mb-10">
          A good conversation can change your whole day!
        </p>

        {/* CTA */}
        <p className="text-purple-800/70 mb-6 font-medium">
          Sign in to start your <span className="font-bold text-fuchsia-700">BAExperience.</span>
        </p>

        {/* SIGN IN BUTTON */}
        <button
          onClick={doSignIn}
          disabled={loading}
          className={`
            w-full max-w-xl py-5 rounded-full text-2xl font-semibold text-white mx-auto
            transition-all
            ${loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
            }
          `}
        >
          {loading ? 'Loading…' : 'Continue with Google'}
        </button>
      </div>

      {/* KEYFRAME ANIMATION */}
      <style jsx>{`
        @keyframes pulseGlow {
          0% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.05); }
          100% { opacity: 0.25; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
