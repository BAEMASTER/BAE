'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save } from 'lucide-react';

// Match your homepage gradient (light, elegant, not dark)
const gradientClass = "bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100";

let app;
let db;
let firebaseAuth;

try {
  // Initialize Firebase app exactly once (client side)
  app = initializeApp(JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}"));
  db = getFirestore(app);
  firebaseAuth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minWarn, setMinWarn] = useState(false);
  const [ready, setReady] = useState(false);

  // Auth guard + load profile
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
          setDisplayName(data.displayName || u.displayName || '');
          setInterests(data.interests || []);
        } else {
          setDisplayName(u.displayName || '');
        }
      } catch (e) {
        console.error("Profile load failed:", e);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Add interest pill
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // Remove interest pill
  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  // Save interests (green flash retained)
  const saveProfile = async () => {
    if (!user) return;
    if (interests.length < 3) {
      setMinWarn(true);
      setTimeout(() => setMinWarn(false), 2000);
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
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  // Go to match only if 3+ interests exist
  const goBAE = () => {
    if (interests.length < 3) {
      setMinWarn(true);
      setTimeout(() => setMinWarn(false), 2000);
      return;
    }
    window.location.href = "/match/page";
  };

  if (!ready) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${gradientClass}`}>
        <p className="text-xl font-bold text-fuchsia-500 drop-shadow">Loading Profile...</p>
      </div>
    );
  }

  const canBae = interests.length >= 3;
  const baeText = canBae ? "BAE Someone Now" : "3 Interests Required";

  return (
    <main className={`min-h-screen pt-24 px-6 py-8 text-gray-900 ${gradientClass}`}>
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Headline: simple, clean, modern */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-fuchsia-600 text-center drop-shadow mb-6"
        >
          Your Profile
        </motion.h1>

        {/* Profile identity card (small, top-centered) */}
        <div className="bg-white/60 border border-white/40 rounded-2xl shadow-md p-5 flex items-center gap-4 mx-auto max-w-sm">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-fuchsia-200 flex items-center justify-center">
            {firebaseAuth.currentUser?.photoURL ? (
              <img src={firebaseAuth.currentUser.photoURL} className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={28} className="text-fuchsia-600/70" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-fuchsia-700/80">Signed in as</p>
            <p className="text-base font-bold truncate text-fuchsia-800">
              {displayName || firebaseAuth.currentUser?.email}
            </p>
          </div>
        </div>

        {/* Interests Hub (dominant section) */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-fuchsia-700">Your Interests</h2>

          <div className="flex gap-2 mb-4">
            <input
              placeholder="Add more interests..."
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              className="flex-1 px-4 py-2 rounded-full bg-white/70 border border-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder-gray-500"
            />
            <button
              onClick={addInterest}
              className="px-5 py-2 rounded-full bg-fuchsia-600 text-white font-bold shadow-sm hover:opacity-90 transition-all"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {interests.map(i => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-3 py-1.5 bg-white/70 border border-white/40 shadow-sm rounded-full text-sm font-semibold text-fuchsia-700 inline-flex items-center gap-1"
                >
                  {i}
                  <button onClick={() => removeInterest(i)} className="text-fuchsia-500 font-bold leading-none">×</button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {minWarn && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-red-600 text-sm font-bold mt-4"
            >
              Add at least 3 interests.
            </motion.p>
          )}
        </div>

        {/* Action buttons side-by-side */}
        <div className="grid grid-cols-2 gap-4 mx-auto max-w-xl">
          <motion.button
            onClick={saveProfile}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold transition-all ${
              saved ? "bg-green-500 text-white shadow-md" : "bg-white/70 border border-white/40 text-fuchsia-700 shadow-sm hover:opacity-90"
            }`}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Interests"}
          </motion.button>

          <motion.button
            onClick={goBAE}
            disabled={!canBae}
            whileHover={{ scale: canBae ? 1.03 : 1 }}
            whileTap={{ scale: canBae ? 0.97 : 1 }}
            className="w-full py-3 rounded-full font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {baeText}
          </motion.button>
        </div>

      </div>
    </main>
  );
}
