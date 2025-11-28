'use client';

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, XCircle } from 'lucide-react';

// --- Constants ---
const MAIN_INSTRUCTION_COPY = "Add 3+ interests to activate BAE video matching.";
const MIN_REQUIRED = 3;

export default function ProfilePage() {
  const [authReady, setAuthReady] = useState(false);
  const [app, setApp] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // --- Init Firebase ---
  useEffect(() => {
    const init = async () => {
      try {
        const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
        if (!getApps().length) {
          const appInit = initializeApp(config);
          setApp(appInit);
          setAuth(getAuth(appInit));
          setDb(getFirestore(appInit));
        } else {
          const existing = getApps()[0];
          setApp(existing);
          setAuth(getAuth(existing));
          setDb(getFirestore(existing));
        }
      } catch(e) {
        console.error("Firebase init fail", e);
      }
    };
    init();
  }, []);

  // --- Load Profile on Auth ---
  useEffect(() => {
    if (!auth || !db) return;

    const ensureAuth = async () => {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    };
    ensureAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setAuthReady(true); return; }

      const ref = doc(db, `artifacts/${app?.name || "homepage"}/users/${u.uid}/profile/data`);

      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || u.displayName || 'Mystery BAE');
          setInterests(data.interests || []);
        } else {
          setDisplayName(u.displayName || 'Mystery BAE');
        }
      } catch (er) {
        console.error("Load fail", er);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [auth, db, app]);

  // ➕ Add interest
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // ✖ Remove interest
  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  // 💾 Save profile
  const saveProfile = async () => {
    if (!user || !authReady || !db) return;

    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }

    const ref = doc(db, `artifacts/${app?.name || "homepage"}/users/${user.uid}/profile/data`);
    setSaving(true);

    try {
      await setDoc(ref, {
        displayName,
        interests,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch(e) {
      console.error("Save fail", e);
    } finally {
      setSaving(false);
    }
  };

  // ✨ BAE Someone Now!
  const goBAE = () => {
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    window.location.href = "/";
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-200 to-fuchsia-200 flex items-center justify-center">
        <p className="text-xl font-black text-fuchsia-600 animate-pulse">Initializing BAE...</p>
      </div>
    );
  }

  const canBae = interests.length >= MIN_REQUIRED;

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-pink-50 to-purple-100 px-6 py-10 text-gray-900 flex flex-col items-center">

      {/* ❗Instruction (only shows if < 3 interests) */}
      <AnimatePresence>
        {!canBae && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/70 backdrop-blur-md border border-purple-300/40 px-4 py-2 rounded-xl shadow-md mb-4 text-sm font-bold text-purple-800"
          >
            <XCircle size={16} className="inline-block mr-1.5 opacity-70"/>
            {MAIN_INSTRUCTION_COPY}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input + Add */}
      <div className="flex w-full max-w-xl gap-2 mb-6">
        <input
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addInterest()}
          placeholder="Add interest..."
          className="flex-1 px-4 py-2 rounded-full ring-2 ring-purple-300/40 bg-white shadow-sm focus:outline-none focus:ring-fuchsia-500"
          maxLength={32}
        />
        <motion.button
          onClick={addInterest}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          disabled={!newInterest.trim()}
          className="flex items-center justify-center px-5 py-2 rounded-full bg-fuchsia-600 text-white font-black shadow-md hover:brightness-110 transition disabled:opacity-40"
        >
          <Plus size={16}/> Add
        </motion.button>
      </div>

      {/* Interest Pills */}
      <div className="flex-grow overflow-y-auto w-full max-w-4xl bg-white/30 backdrop-blur-lg p-6 rounded-3xl border border-white/20 shadow-inner mb-8">
        <h3 className="text-lg font-bold text-purple-800 mb-4 text-center">
          Your passions ({interests.length} added)
        </h3>

        <div className="flex flex-wrap justify-center gap-3">
          {interests.map(i => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="px-4 py-1.5 rounded-full bg-white/90 border border-purple-300/30 text-fuchsia-600 font-bold shadow-sm flex items-center gap-2"
            >
              {i}
              <button onClick={() => removeInterest(i)} className="opacity-70 hover:opacity-100 transition">×</button>
            </motion.span>
          ))}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex w-full max-w-xl gap-4">
        <motion.button
          onClick={saveProfile}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-lg font-black transition border shadow-md ${
            saved
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-white/70 text-fuchsia-600 border-purple-300/20 hover:bg-white'
          } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Save size={18}/> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </motion.button>

        <motion.button
          onClick={goBAE}
          whileHover={{ scale:1.03 }}
          whileTap={{ scale:0.97 }}
          disabled={!canBae}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-700 text-white text-lg font-black hover:brightness-110 transition disabled:opacity-40"
        >
          <Sparkles size={18}/> {canBae ? "BAE Someone Now!" : "Locked"}
        </motion.button>
      </div>

    </main>
  );
}
