"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import RotatingGlowWord from "@/components/RotatingGlowWord";

const NAV_H = 72;
const ROTATING_WORDS = ["uplift", "brighten", "inspire", "change", "elevate"];

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        setUserInterests(data?.interests || []);
        setUserName(data?.displayName || user.displayName || "You");
      } else {
        setUserId(null);
      }
      setIsChecking(false);
    });
    return () => unsub();
  }, []);

  const handleBAEClick = () => {
    if (!userId) return router.push("/auth");
    if (userInterests.length < 3)
      return alert("Add at least 3 interests before BAEing someone!");
    router.push("/match");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-[120px] rounded-full" />

      {/* HEADER */}
      <header
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px]"
        style={{
          WebkitBackdropFilter: "saturate(1.2) blur(8px)",
          backdropFilter: "saturate(1.2) blur(8px)",
        }}
      >
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">
          BAE
        </div>
        <button
          onClick={() => router.push(userId ? "/profile" : "/auth")}
          className="px-5 py-2 rounded-full bg-white/30 hover:bg-white/40 border border-white/40 text-sm font-semibold text-fuchsia-700 transition-all"
        >
          {userId ? userName : "Sign In"}
        </button>
      </header>

      <section
        className="flex flex-col items-center text-center px-6"
        style={{ paddingTop: NAV_H + 48 }}
      >
        {/* MEET MATCH BAE */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-extrabold leading-tight text-fuchsia-700 drop-shadow-2xl mb-6"
        >
          Meet. Match.{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            BAE.
          </span>
        </motion.h2>

        {/* MAIN TAGLINE */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-3xl sm:text-4xl font-bold text-fuchsia-800/90 mb-6"
        >
          One good conversation can{" "}
          <RotatingGlowWord words={ROTATING_WORDS} /> your whole day.
        </motion.p>

        {/* SECONDARY TAGLINE */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="text-lg sm:text-xl max-w-3xl text-fuchsia-900/90 mb-12 font-medium"
        >
          Instant video conversations with real people where your shared
          interests glow.
        </motion.p>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.045 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-12 py-6 rounded-full text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)] transition-all duration-500 overflow-hidden"
        >
          <span className="relative z-10">
            {isChecking ? "Loading..." : "BAE Someone Now!"}
          </span>
        </motion.button>

        <div className="h-16" />
      </section>

      <footer className="text-center text-fuchsia-800/60 text-sm pb-6">
        Built with ❤️ by BAE Team
      </footer>
    </main>
  );
}
