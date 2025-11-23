'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_H = 72;

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  const words = ['uplift', 'brighten', 'inspire', 'change', 'elevate'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        setUserInterests(data?.interests || []);
        setUserName(data?.displayName || user.displayName || 'You');
      } else {
        setUserId(null);
      }
      setIsChecking(false);
    });
    return () => unsub();
  }, []);

  const handleBAEClick = () => {
    if (!userId) return router.push('/auth');
    if (userInterests.length < 3)
      return alert('Add at least 3 interests before BAEing someone!');
    router.push('/match');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">

      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-[120px] rounded-full" />

      <header
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px]"
        style={{
          WebkitBackdropFilter: 'saturate(1.2) blur(8px)',
          backdropFilter: 'saturate(1.2) blur(8px)',
        }}
      >
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">
          BAE
        </div>
        <button
          onClick={() => router.push(userId ? '/profile' : '/auth')}
          className="px-5 py-2 rounded-full bg-white/30 hover:bg-white/40 border border-white/40 text-sm font-semibold text-fuchsia-700 transition-all"
        >
          {userId ? userName : 'Sign In'}
        </button>
      </header>

      <section
        className="flex flex-col items-center text-center px-6"
        style={{ paddingTop: NAV_H + 48 }}
      >

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

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="text-2xl sm:text-3xl font-bold text-fuchsia-800/90 mb-4"
        >
          One good conversation can{' '}
          <span className="relative inline-block w-[140px]">
            <AnimatePresence mode="wait">
              <motion.span
                key={words[index]}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45 }}
                className="relative z-10 bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-extrabold"
              >
                {words[index]}
              </motion.span>

              {/* GLOW BEHIND WORD */}
              <motion.span
                key={`glow-${words[index]}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 0.55, scale: 1 }}
                exit={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 blur-xl rounded-full bg-gradient-to-r from-fuchsia-400/40 to-pink-400/40"
              />
            </AnimatePresence>
          </span>{' '}
          your whole day.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="text-lg sm:text-xl max-w-3xl text-fuchsia-900/90 mb-10 font-medium"
        >
          Instant video conversations with real people.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.045 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBAEClick}
          disabled={isChecking}
          className="relative px-10 sm:px-14 py-5 sm:py-6 rounded-full text-2xl sm:text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)] transition-all duration-500 overflow-hidden"
        >
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)] bg-[length:200%_100%] opacity-0 hover:opacity-100 animate-[shimmer_3.8s_linear_infinite]" />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-pink-400/35 via-fuchsia-400/35 to-indigo-400/35 blur-2xl"
            animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <span className="relative z-10">{isChecking ? 'Loading...' : 'BAE Someone Now!'}</span>
        </motion.button>

        <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/30 border border-white/40 text-fuchsia-700 font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
          People online right now
        </div>

        {userInterests.length > 0 && (
          <div className="mt-12 bg-white/20 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/40 max-w-xl mx-auto shadow-lg">
            <h3 className="text-fuchsia-800 text-xl font-extrabold mb-5 tracking-tight">
              Your Interests
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {userInterests.map((interest) => (
                <span
                  key={interest}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-100 to-pink-100 text-fuchsia-700 font-semibold text-sm shadow-sm hover:from-fuchsia-200 hover:to-pink-200 transition-colors"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="h-16" />
      </section>

      <footer className="text-center text-fuchsia-800/60 text-sm pb-6">
        Built with ❤️ by BAE Team
      </footer>
    </main>
  );
}
