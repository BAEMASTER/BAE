'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db } from '@/lib/firebaseClient';
import { auth } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save } from 'lucide-react';

const NAV_H = 72;
const gradientClass = 'bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100';

export default function ProfilePage() {
  const [user, setUserState] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterestsState] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warn, setWarn] = useState(false);

  // Load auth + profile from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUserState(null);
        return;
      }
      setUserState(u);

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || u.displayName || '');
          setInterestsState(data.interests || []);
        } else {
          setDisplayName(u.displayName || '');
          setInterestsState([]);
        }
      } catch (e) {
        console.error('Error loading profile', e);
      }
    });

    return () => unsub();
  }, []);

  // Add interest pill
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterestsState([...interests, i]);
    }
    setNewInterest('');
  };

  // Remove interest pill
  const removeInterest = (i: string) => {
    setInterestsState(interests.filter((x) => x !== i));
  };

  // Save interests to Firestore
  const saveProfile = async () => {
    if (!user) return;
    if (interests.length < 3) {
      setWarn(true);
      setTimeout(() => setWarn(false), 2600);
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
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  // Go to match screen (BAE)
  const goBAE = () => {
    if (interests.length < 3) {
      setWarn(true);
      setTimeout(() => setWarn(false), 2600);
      return;
    }
    window.location.href = '/match';
  };

  const canBae = interests.length >= 3;
  const baeText = canBae ? 'BAE Someone ✨' : '3+ Interests Required';

  return (
    <main className={`min-h-screen w-full overflow-hidden ${gradientClass} text-fuchsia-900`}>
      {/* fixed header spacer */}
      <div style={{ height: NAV_H }} />

      {/* Personal mini card */}
      <section className="absolute top-6 right-6">
        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-sm w-32">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full border-2 border-fuchsia-400/40"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-white/30 flex items-center justify-center border-2 border-fuchsia-400/40">
                  <UserIcon size={28} className="text-fuchsia-600/70" />
                </div>
              )}
            </div>
            <h2 className="text-sm font-bold truncate w-full mt-2">{displayName || 'User'}</h2>
            <button className="text-[10px] text-fuchsia-600/70 hover:text-fuchsia-700 transition mt-1">
              Change Photo
            </button>
          </div>
        </div>
      </section>

      {/* Interests Hub */}
      <div className="mx-auto max-w-3xl px-6 pt-24 text-center">
        <h1 className="text-3xl font-extrabold mb-6 text-fuchsia-700 drop-shadow-md">Your Mega Interest Graph</h1>

        <div className="bg-white/30 backdrop-blur-lg p-5 rounded-2xl border border-white/40 shadow-sm mb-6">
          <p className="text-fuchsia-700 text-sm font-semibold mb-3">
            {MAIN_INSTRUCTION_COPY}<br/>
            <span className="text-xs text-fuchsia-600/60">{MOTIVATION_COPY}</span>
          </p>

          {/* Input + Add */}
          <div className="flex gap-3 mb-3">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add an interest..."
              className="flex-1 px-4 py-2 rounded-full bg-white/80 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-gray-700 text-sm"
            />
            <motion.button
              onClick={addInterest}
              disabled={saving}
              whileTap={{ scale: 0.94 }}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 font-bold text-white shadow-md hover:opacity-90 disabled:opacity-40 text-sm"
            >
              Add
            </motion.button>
          </div>

          {/* Interest Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <AnimatePresence>
              {interests.map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="px-3 py-1.5 bg-white/80 border border-fuchsia-300/30 rounded-full text-xs font-bold text-fuchsia-700 shadow-sm inline-flex items-center gap-1"
                >
                  {i}
                  <button onClick={() => removeInterest(i)} className="text-fuchsia-600 font-extrabold">
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Warning */}
          <AnimatePresence>
            {warn && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-red-600 text-xs font-bold mt-2"
              >
                ⚠️ Add at least 3 interests to unlock matching!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save + BAE Buttons */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-5">
            <motion.button
              onClick={saveProfile}
              disabled={saving || !canBae}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center justify-center py-2 rounded-full font-bold shadow-md border border-white/30 disabled:opacity-30 ${
                saved ? 'bg-green-500/80 border-green-500 text-white' : 'bg-gray-800/40 text-white'
              } text-sm`}
            >
              <Save size={14} className="mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </motion.button>

            <motion.button
              onClick={goBAE}
              disabled={!canBae}
              whileTap={{ scale: 0.97 }}
              className="py-2 rounded-full font-bold text-white shadow-lg bg-gradient-to-r from-fuchsia-500 to-amber-400 disabled:opacity-30 text-sm"
            >
              {baeText}
            </motion.button>
          </div>
        </div>
      </div>
    </main>
  );
}
