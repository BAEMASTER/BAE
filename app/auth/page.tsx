'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebaseClient';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);

  // Rotating word logic
  const rotatingWords = [
    "change",
    "inspire",
    "uplift",
    "brighten",
    "enhance",
    "energize",
    "shift",
    "elevate",
  ];

  const [index, setIndex] = useState(0);
  const currentWord = rotatingWords[index];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % rotatingWords.length);
    }, 2600);

    return () => clearInterval(interval);
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
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-6">

      {/* Background Glow Pulse */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div className="w-[45rem] h-[45rem] rounded-full 
                        bg-fuchsia-300/20 blur-[140px]
                        animate-[pulseGlow_6s_ease-in-out_infinite]">
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl">

        {/* Glowing BAE Logo */}
        <div className="relative mb-10 flex flex-col items-center justify-center">

          {/* Glow Halo */}
          <div className="
            absolute w-[20rem] h-[20rem]
            bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400
            blur-[120px] rounded-full opacity-50
            animate-[baePulse_6s_ease-in-out_infinite]
          "></div>

          {/* BAE Text */}
          <div className="text-6xl font-extrabold text-fuchsia-700 tracking-tight relative z-10">
            BAE
          </div>
        </div>

        {/* Rotating Word Sentence */}
        <div className="text-fuchsia-900/70 font-medium text-lg mb-10">
          A good conversation can{" "}
          <span className="relative inline-block w-[90px] text-fuchsia-700 font-semibold">
            <span
              key={currentWord}
              className="absolute inset-0 animate-fade"
            >
              {currentWord}
            </span>
          </span>{" "}
          your whole day.
        </div>

        {/* Auth Card */}
        <div className="relative z-10 bg-white/60 backdrop-blur-xl shadow-xl
                        px-10 py-12 rounded-3xl border border-white/40
                        max-w-lg w-full text-center">

          {/* CTA Button */}
          <button
  onClick={doSignIn}
  disabled={loading}
  className={`
    w-full py-5 rounded-full text-xl font-extrabold text-white 
    transition-all duration-500
    ${
      loading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]"
    }
  `}
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
          0% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.15); opacity: 0.55; }
          100% { transform: scale(1); opacity: 0.35; }
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(4px); }
          10% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-4px); }
        }

        .animate-fade {
          animation: fadeInOut 2.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
