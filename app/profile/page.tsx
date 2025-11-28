'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auth guard + load profile from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }
      setUser(u);

      const snap = await getDoc(doc(db, 'users', u.uid));
      const data = snap.data();
      if (data) {
        setDisplayName(data.displayName || u.displayName || '');
        setInterests(data.interests || []);
        setUser(u);
      } else {
        setDisplayName(u.displayName || '');
      }
    });

    return () => unsub();
  }, [router]);

  // Add interest pill
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests((prev) => [...prev, i]);
    }
    setNewInterest('');
  };

  // Remove pill
  const removeInterest = (i: string) => {
    setInterests((prev) => prev.filter((x) => x !== i));
  };

  // Save to Firestore
  const saveProfile = async () => {
    if (!user) return;
    if (interests.length < 3) {
      alert("Add 3+ interests first to enable BAE!");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName, interests, updatedAt: new Date() },
        { merge: true }
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // BAE Someone button
  const goBAE = () => {
    router.push('/match/page');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white px-6 pt-[96px]">
      {/* Profile card minimized to a small top-corner module */}
      {user && (
        <div className="absolute top-4 right-6 bg-gray-800 rounded-xl shadow-lg p-4 w-32 flex flex-col items-center">
          <img
            src={user.photoURL || ''}
            alt="Profile photo"
            className="w-24 h-24 rounded-full border-4 border-fuchsia-400/50 mb-2"
          />
          <span className="text-sm font-bold text-center truncate">
            {user.displayName || user.email}
          </span>
          <button
            onClick={() => console.log("Change photo handler here later")}
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 mt-1"
          >
            Change Photo
          </button>
        </div>
      )}

      {/* Interests Hub */}
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-center mb-8"
        >
          Your BAE Brain ✨
        </motion.h1>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-3xl font-bold text-center mb-2">Add More Interests!</h2>
          <p className="text-sm opacity-60 text-center mb-6">
            Add 3+ interests to unlock matching. Shared interests will <span className="text-fuchsia-300">glow ✨</span> on BAE.
          </p>

          {/* Input + Add */}
          <div className="flex gap-3 mb-6">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add new passion..."
              className="flex-1 px-4 py-2 rounded-full bg-gray-700 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            <button
              onClick={addInterest}
              disabled={saving}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Selected Interests Pills */}
          <AnimatePresence>
            <div className="flex flex-wrap gap-2 justify-center">
              {interests.map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: .92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: .92 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/20 text-sm font-semibold"
                >
                  {i}
                  <button onClick={() => removeInterest(i)} className="text-fuchsia-300 hover:text-white font-bold leading-none">
                    ×
                  </button>
                </motion.span>
              ))}
            </div>
          </AnimatePresence>
        </div>

        {/* Buttons: Save + BAE (equal sized, side-by-side) */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <motion.button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 rounded-xl font-extrabold text-lg shadow-lg bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600/20 hover:opacity-90 transition-all"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </motion.button>

          <motion.button
            onClick={goBAE}
            className="w-full py-3 rounded-xl font-extrabold text-lg shadow-lg bg-gradient-to-r from-pink-500 via-fuchsia-500 to-yellow-500 hover:opacity-90 transition-all"
          >
            BAE Someone ✨
          </motion.button>
        </div>

        {/* Temporary green flash on save */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-green-400 text-sm mt-3 font-semibold"
            >
              ✅ Profile Saved!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
