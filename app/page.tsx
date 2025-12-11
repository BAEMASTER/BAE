// UPDATED HOMEPAGE CODE WITH GLOWING FLOATING INTEREST BUBBLES + SIMPLER CTA BUTTON + KEEP ROTATING WORDS
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  getAuth,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// --- CONSTANTS ---
const ROTATING_WORDS = ["uplift", "elevate", "inspire", "change"]; // KEEP
const MIN_REQUIRED = 3;

export default function HomePage() {
  const router = useRouter();

  // Firebase initialization
  const [app] = useState(() => {
    const configEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    const config = configEnv ? JSON.parse(configEnv) : {};
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(config);
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);

  // Rotating Words
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((p) => (p + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Auth
  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }
    };
    init();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setIsChecking(false);

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.data();
        setUserName(data?.displayName || "You");
        setUserInterests(data?.interests || []);
      } catch {}

      setIsChecking(false);
    });

    return () => unsub();
  }, []);

  // CTA
  const handleBAEClick = () => {
    if (isChecking) return;
    if (!user) return router.push("/auth");
    if (userInterests.length < MIN_REQUIRED) {
      alert("Add at least 3 interests before BAEing someone!");
      return;
    }
    router.push("/match");
  };

  // Floating interest bubbles (random placement in area)
  const INTERESTS = ["Music", "Travel", "Yoga", "Art", "Sports", "Meditation", "AI", "Indian Food"];

  const randomPos = () => ({
    top: `${Math.random() * 60 + 20}%`,
    left: `${Math.random() * 70 + 10}%`,
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Soft nebula background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-800 to-indigo-900 opacity-70"></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md/30 bg-black/20">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]">
          BAE
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 min-h-screen z-10">
        {/* TITLE */}
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-6xl sm:text-7xl font-extrabold mb-6 drop-shadow-[0_0_20px_rgba(255,160,255,0.3)]"
        >
          Meet. Match.{" 