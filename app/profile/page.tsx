'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 🚪 Auth guard + load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.uid);

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || user.displayName || '');
          setInterests(data.interests || []);
        } else {
          setDisplayName(user.displayName || '');
        }
      } catch (e) {
        console.error('Error loading profile', e);
      }
    });

    return () => unsub();
  }, [router]);

  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  const saveProfile = async () => {
    if (!userId) return;

    if (interests.length < 3) {
      alert('Add 3+ interests first to unlock matching & glow!');
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', userId),
        { displayName, interests, updatedAt: new Date() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (e) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const goHome = () => router.push('/');

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">

      {/* HEADER */}
      <header
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px]"
        style={{
          WebkitBackdropFilter: 'saturate(1.2) blur(8px)',
          backdropFilter: 'saturate(1.2) blur(8px)',
        }}
      >
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">BAE</div>
        <button
          onClick={goHome}
          className="text-sm font-semibold text-purple-900/70 hover:text-purple-900 transition-all"
        >
          Home
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-6 pt-24">

        {/* TITLE */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 bg-clip-text text-transparent drop-shadow-xl mb-10 text-center"
        >
          Your Profile
        </motion.h1>

        {/* DISPLAY NAME */}
        <div className="w-full max-w-xl mx-auto mb-8">
          <label className="block text-sm font-semibold mb-2 text-purple-900/90">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full px-5 py-3 rounded-full bg-white/80 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          />
        </div>

        {/* INTERESTS BOX */}
        <div className="w-full bg-white/15 p-8 rounded-3xl border border-white/20 backdrop-blur-lg shadow-lg">
          <h2 className="text-3xl font-bold text-purple-900 mb-2 text-center">Your Interests</h2>

          {/* 3-INTEREST ONBOARDING COPY + GLOW PILL */}
          <p className="text-sm text-purple-900/80 font-semibold text-center mb-5">
            Add 3+ interests to unlock matching. Shared interests will{' '}
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-[0_0_18px_rgba(236,72,153,0.55)]">
              glow ✨
            </span>{' '}
            on BAE.
          </p>

          {/* ADD INTEREST INPUT */}
          <div className="flex gap-3 mb-6 w-full max-w-xl mx-auto">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add an interest"
              className="flex-1 px-5 py-3 rounded-full bg-white/80 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            />
            <button
              onClick={addInterest}
              className="px-8 py-3 text-white font-bold rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 shadow-md hover:shadow-lg transition"
            >
              Add
            </button>
          </div>

          {/* LIST OF INTEREST PILLS WITH REMOVE */}
          {interests.length === 0 && <p className="text-sm italic opacity-40 text-center mb-4">No interests yet</p>}

          <div className="flex flex-wrap justify-center gap-3">
            {interests.map((i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-fuchsia-700 font-semibold text-sm shadow-sm hover:bg-white/90 transition"
              >
                {i}
                <button
                  onClick={() => removeInterest(i)}
                  className="text-fuchsia-500 hover:text-fuchsia-700 font-bold text-lg leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* SAVE PROFILE BUTTON */}
        <div className="flex justify-center items-center pt-8 pb-8">
          <motion.button
            whileHover={{ scale: interests.length >= 3 ? 1.04 : 1 }}
            whileTap={{ scale: interests.length >= 3 ? 0.97 : 1 }}
            onClick={saveProfile}
            disabled={interests.length < 3 || saving}
            className={`relative px-14 py-5 rounded-full text-2xl font-extrabold tracking-tight transition-all ${
              interests.length < 3
                ? 'bg-gray-500/40 text-white/40 cursor-not-allowed border border-white/10'
                : saved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 text-purple-900 shadow-lg hover:shadow-[0_0_24px_rgba(236,72,153,0.4)]'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✔ Saved!' : 'Save Profile'}
          </motion.button>
        </div>

      </div>

      <footer className="text-center text-fuchsia-800/60 text-sm pb-6">
        Built with ❤️ by BAE Team
      </footer>

    </main>
  );
}
