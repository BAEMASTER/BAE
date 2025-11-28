'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save } from 'lucide-react';

const appId = "SO-INTERESTING"; // ✅ Hard-coded properly

let app = initializeApp(JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}"));
let db = getFirestore(app);
let auth = getAuth(app);

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMinInterestWarning, setShowMinInterestWarning] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // ✅ Load auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAuthReady(true);
        return;
      }
      setUser(u);

      const ref = doc(db, `artifacts/${appId}/users/${u.uid}/profile`, "main");
      const snap = await getDoc(ref);
      const data = snap.data();
      if (data) {
        setDisplayName(data.displayName || u.displayName || '');
        setInterests(data.interests || []);
      }
      setIsAuthReady(true);
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
    if (!user || interests.length < 3) {
      setShowMinInterestWarning(true);
      setTimeout(() => setShowMinInterestWarning(false), 3000);
      return;
    }

    setSaving(true);
    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, "main");
    await setDoc(ref, { displayName, interests, updatedAt: new Date() }, { merge: true });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500); // ✅ green flash stays brief
  };

  const goBAE = () => {
    if (interests.length < 3) {
      setShowMinInterestWarning(true);
      setTimeout(() => setShowMinInterestWarning(false), 3000);
      return;
    }
    router.push('/');
  };

  if (!isAuthReady) return <div className="text-center text-lg text-fuchsia-400">Loading...</div>;

  return (
    /* ✅ Homepage gradient matched */
    <main className="min-h-screen w-full bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800 px-6 py-12">

      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* PERSONAL PHOTO + NAME (MINIMIZED) */}
        <div className="md:col-span-1 flex flex-col items-center md:items-start">
          <div className="w-24 h-24 rounded-full border-4 border-fuchsia-400/40 overflow-hidden flex items-center justify-center bg-white/60 shadow-md">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={32} className="text-fuchsia-500/60" />
            )}
          </div>

          <button
            onClick={() => console.log("photo change later")}
            className="text-xs font-semibold mt-2 text-fuchsia-500/80 hover:text-fuchsia-600 transition"
          >
            Change Photo
          </button>

          <h2 className="mt-3 font-bold text-lg truncate max-w-[10rem] opacity-85">
            {displayName || user?.displayName || ''}
          </h2>
        </div>

        {/* INTEREST HUB (HERO, MAIN FOCUS) */}
        <div className="md:col-span-2 bg-white/60 backdrop-blur-md border border-fuchsia-200/40 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col">

          <h1 className="text-3xl font-extrabold mb-2">Your Profile</h1>

          <p className="text-lg font-semibold opacity-80 text-fuchsia-600 mb-6">
            Add 3+ interests to start matching.
          </p>

          {/* Add More Interests input */}
          <div className="flex gap-3 mb-5">
            <input
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInterest()}
              placeholder="Add new passion..."
              className="flex-1 px-4 py-2 rounded-full bg-white/80 border border-fuchsia-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            />
            <button
              onClick={addInterest}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-sm font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
              disabled={saving}
            >
              Add
            </button>
          </div>

          {/* Selected interest pills */}
          <div className="flex-grow mb-6 overflow-y-auto max-h-[340px] flex flex-wrap gap-2">
            {interests.map(i => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-fuchsia-300/40 text-xs font-semibold shadow-sm"
              >
                {i}
                <button onClick={() => removeInterest(i)} className="text-fuchsia-500 hover:text-fuchsia-600 font-bold text-sm leading-none">×</button>
              </motion.span>
            ))}
          </div>

          {/* Warning for minimum interests */}
          <AnimatePresence>
            {showMinInterestWarning && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-red-500 text-xs font-semibold text-center mb-4 bg-red-100/80 rounded-full py-1 px-2"
              >
                Add at least 3 interests to continue!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Interests + BAE buttons side-by-side */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <motion.button
              onClick={saveProfile}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-3 rounded-xl text-sm font-bold shadow-md border border-fuchsia-400/30 transition-all ${
                saved 
                  ? "bg-green-500 text-white border-green-500"  // ✅ green flash restored
                  : "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-fuchsia-600/20 hover:opacity-90"
              }`}
              disabled={saving}
            >
              <Save size={14} className="inline-block mr-1" />
              {saving ? "Saving…" : "Save Interests"}
            </motion.button>

            <motion.button
              onClick={goBAE}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 text-purple-900 text-sm font-bold shadow-lg hover:shadow-[0_0_16px_rgba(236,72,153,0.5)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={interests.length < 3}
            >
              {baeButtonText}
            </motion.button>
          </div>
        </div>

      </div>

    </main>
  );
}
