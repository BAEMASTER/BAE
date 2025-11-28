'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save } from 'lucide-react';

const NAV_H = 72;
const gradientClass = 'bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warn, setWarn] = useState(false);

  // Load auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || u.displayName || '');
          setInterests(data.interests || []);
        } else {
          setDisplayName(u.displayName || '');
        }
      } catch (e) {
        console.error('Error loading profile', e);
      }
    });
    return () => unsub();
  }, []);

  const setInterests = (items: string[]) => {
    setInterests(items);
  };

  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests([...interests, i]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterests(interests.filter((x) => x !== i));
  };

  const saveProfile = async () => {
    if (!user) return;
    if (interests.length < 3) {
      setUngreenWarning(true);
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
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setUngreenWarning = (flag: boolean) => {
    setWarn(flag);
    setTimeout(() => setWarn(false), 2600);
  };

  const goBAE = () => {
    if (interests.length < 3) {
      setWarn(true);
      setTimeout(() => setWarn(false), 3000);
      return;
    }
    window.location.href = '/match';
  };

  const isReady = interests.length >= 3;
  const baeText = isReady ? 'BAE Someone ✨' : '3+ Interests Required';

  return (
    <main className={`min-h-screen w-full overflow-hidden text-fuchsia-900 ${gradientClass}`}>
      {/* header spacer */}
      <div style={{ height: NAV_H }} />

      {/* personal mini card */}
      <section className="absolute top-6 right-6">
        <div className="bg-black/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 shadow-sm text-right max-w-[160px]">
          <img
            src={user?.photoURL || ''}
            alt=""
            className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-fuchsia-400/40"
          />
          <h2 className="text-base font-extrabold truncate text-center">{displayName || 'User'}</h2>
          <button className="text-xs text-center text-fuchsia-300/80 hover:text-fuchsia-200 transition w-full">
            Change Photo
          </button>
        </div>
      </section>

      {/* interest hub main */}
      <div className="mx-auto max-w-3xl px-6 pt-28 text-center">
        <h1 className="text-4xl font-extrabold mb-8 text-fuchsia-600 drop-shadow-lg">Your Profile</h1>

        {/* add interests */}
        <div className="mb-6 bg-white/20 backdrop-blur-lg p-5 rounded-2xl border border-white/30 shadow-sm max-w-xl mx-auto">
          <p className="text-fuchsia-700 text-sm font-semibold mb-3">
            Add 3+ interests to start matching. Shared interests glow ✨
          </p>
          <div className="flex gap-3 mb-3">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add an interest..."
              className="flex-1 px-4 py-2 rounded-full bg-white/80 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            <motion.button
              onClick={addInterest}
              disabled={saving}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 font-bold text-white shadow-md hover:opacity-90 transition disabled:opacity-40"
            >
              Add
            </motion.button>
          </div>

          {/* interest pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <AnimatePresence>
              {interests.map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="px-3 py-1.5 bg-white/70 border border-white/40 shadow-sm rounded-full text-sm font-semibold text-fuchsia-700 inline-flex items-center gap-1 m-1"
                >
                  {i}
                  <button onClick={() => removeInterest(i)} className="text-fuchsia-600 font-bold">
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* warning */}
          <AnimatePresence>
            {warn && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-red-600 text-xs font-bold text-center mt-2"
              >
                Add at least 3 interests to unlock matching ✨
              </motion.div>
            )}
          </AnimatePresence>

          {/* save + bae buttons */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-6">
            <motion.button
              onClick={saveProfile}
              disabled={!isReady || saving}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center justify-center w-full py-3 rounded-full font-bold text-white shadow-md transition ${
                saved ? 'bg-green-500/80 border border-green-500' : 'bg-gray-800/40 border border-white/10 hover:opacity-85 disabled:opacity-30'
              }`}
            >
              <Save size={16} className="mr-2" />
              {saving ? 'Saving…' : 'Save'}
            </motion.button>
            <motion.button
              onClick={goBAE}
              disabled={!isReady}
              whileTap={{ scale: 0.96 }}
              className="w-full py-3 rounded-full font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-400 shadow-lg disabled:opacity-30"
            >
              {baeText}
            </motion.button>
          </div>
        </div>

        {/* bottom spacer */}
        <div className="h-16" />
      </div>

      <footer className="text-center text-xs opacity-40">Built by BAE Team</footer>
    </main>
  );
}
