'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save } from 'lucide-react';

const gradientClass = "bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100";

const appId = "SO-INTERESTING";

let app = initializeApp(JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}"));
let db = getFirestore(app);
let firebaseAuth = getAuth(app);

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warn, setWarn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      if (!u) {
        window.location.href = "/auth";
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || '');
          setInterests(data.interests || []);
        } else {
          setDisplayName(u.displayName || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

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
    if (!user) return;
    if (interests.length < 3) {
      setWarn(true);
      setTimeout(() => setWarn(false), 1800);
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
    } finally {
      setSaving(false);
    }
  };

  const canBae = interests.length >= 3;
  const baeText = canBae ? "BAE Someone ✨" : "3 Interests Required";

  return (
    <main className={`min-h-screen pt-24 px-6 py-8 ${gradientClass}`}>
      <div className="mx-auto max-w-4xl space-y-6">

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-fuchsia-600 text-center drop-shadow mb-6"
        >
          Your Profile
        </motion.h1>

        {/* Small Identity Card */}
        <div className="bg-gray-800/25 backdrop-blur-lg border border-gray-700/20 rounded-2xl shadow-md p-4 flex items-center gap-3 max-w-xs mx-auto">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-fuchsia-200 flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover rounded-full" />
            ) : (
              <UserIcon size={22} className="text-fuchsia-600/70" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-white/70">Signed in as</p>
            <p className="text-sm font-bold truncate text-fuchsia-800/90">
              {displayName || user?.email || "User"}
            </p>
            <button onClick={() => console.log("change photo later")} className="text-xs text-fuchsia-500 hover:text-fuchsia-600 font-semibold transition">
              Change Photo
            </button>
          </div>
        </div>

        {/* Interest Hub Card */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-3 text-fuchsia-700">Interests</h2>
          <p className="text-sm font-semibold text-fuchsia-600/80 mb-4">
            Add 3+ interests to enable matching magic ✨
          </p>

          <div className="flex gap-2 mb-4">
            <input
              placeholder="Add more interests..."
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              className="flex-1 px-4 py-2 rounded-full bg-white/70 border border-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder-gray-500"
            />
            <motion.button
              onClick={addInterest}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 font-bold shadow-md hover:opacity-90 transition text-white disabled:opacity-50"
            >
              Add
            </motion.button>
          </div>

          <AnimatePresence>
            {warn && <p className="text-red-600 text-xs font-bold text-center mt-2">Add at least 3 interests.</p>}
          </AnimatePresence>

          <div className="flex flex-wrap justify-center">
            <AnimatePresence>
              {interests.map(i => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-3 py-1.5 bg-white/70 border border-white/40 shadow-sm rounded-full text-sm font-semibold text-fuchsia-800 inline-flex items-center gap-1 m-1"
                >
                  {i}
                  <button onClick={() => removeInterest(i)} className="text-fuchsia-600 font-bold">×</button>
                </motion.span>
              ))}
            </AnimatePresence>
          </AnimatePresence>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <motion.button
            onClick={saveProfile}
            disabled={saving || !canBae || !ready}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center justify-center w-full py-3 rounded-full font-bold transition ${
              saved ? "bg-green-500 text-white shadow-md" : "bg-gray-800/40 text-white border border-white/10 hover:opacity-85 disabled:opacity-30"
            }`}
          >
            <Save size={16} className="mr-2" />
            {saving ? "Saving…" : "Save"}
          </motion.button>

          <motion.button
            onClick={() => (window.location.href = "/match")}
            disabled={!canBae}
            whileTap={{ scale: 0.96 }}
            className="w-full py-3 rounded-full font-bold text-white bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 shadow-lg disabled:opacity-30"
          >
            {baeText}
          </motion.button>
        </div>

      </div>
    </main>
  );
}
