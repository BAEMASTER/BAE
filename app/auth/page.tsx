"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { motion } from "framer-motion";
import RotatingGlowWord from "@/components/RotatingGlowWord";

const WORDS = ["uplift", "brighten", "inspire", "change", "elevate"];

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

      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[45rem] h-[45rem] rounded-full bg-fuchsia-300/20 blur-[140px] animate-pulse" />
      </div>

      {/* AUTH CARD */}
      <div className="relative z-10 bg-white/60 backdrop-blur-xl shadow-xl px-10 py-12 rounded-3xl border border-white/40 max-w-lg w-full text-center">

        {/* HEADLINE */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl sm:text-6xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            BAE.
          </span>
        </motion.h2>

        {/* MAIN TAGLINE */}
        <p className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-6">
          One good conversation can{" "}
          <RotatingGlowWord words={WORDS} /> your whole day.
        </p>

        {/* SECONDARY */}
        <p className="text-lg sm:text-xl text-fuchsia-900/90 mb-10 font-medium">
          Instant video conversations with real people where your shared
          interests glow.
        </p>

        {/* SIGN IN BUTTON */}
        <button
          onClick={doSignIn}
          disabled={loading}
          className={`w-full py-5 rounded-full text-2xl font-extrabold text-white transition-all ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]"
          }`}
        >
          {loading ? "Loading…" : "Sign in to start"}
        </button>
      </div>
    </div>
  );
}
