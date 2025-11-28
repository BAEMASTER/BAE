'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signInAnonymously, getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, Heart, Plus } from 'lucide-react';

const MAIN_TEXT = "Add 3+ interests to start matching.";
const SUB_TEXT = "The more interests you add, the stronger your connection glow ✨";
const MIN_REQUIRED = 3;

// Simple navigation helper
const useSimpleRouter = () => {
  const push = (path: string) => {
    window.location.href = path;
  };
  return { push };
};

export default function ProfilePage() {
  const router = useSimpleRouter();

  const [authReady, setAuthReady] = useState(false);
  const [firebaseApp, setFirebaseApp] = useState<any>(null);
  const [database, setDatabase] = useState<any>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<any>(null);

  const [user, setUserState] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // Init Firebase + Auth listener
  useEffect(() => {
    const init = async () => {
      try {
        const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
        if (!Object.keys(config).length) {
          console.error("❌ Missing Firebase config");
          setAuthReady(true);
          return;
        }

        const app = !getApps().length ? initializeApp(config) : getApps()[0];
        const auth = getAuth(app);
        const db = getFirestore(app);

        setFirebaseApp(app);
        setFirebaseAuth(auth);
        setDatabase(db);

        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const unsub = onAuthStateChanged(auth, async (u) => {
          setUserState(u);
          if (!u) {
            setAuthReady(true);
            return;
          }

          const ref = doc(db, `users/${u.uid}/profile`);
          try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              setDisplayName(data.displayName || u.displayName || u.email || 'BAE User');
              setInterests(data.interests || []);
            } else {
              setDisplayName(u.displayName || u.email || 'BAE User');
            }
          } catch (e) {
            console.error("❌ Load failed", e);
          } finally {
            setAuthReady(true);
          }
        });

        return () => unsub();

      } catch (e) {
        console.error("🔥 Init failed", e);
        setAuthReady(true);
      }
    };

    init();
  }, []);

  // Add interest
  const handleAdd = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // Remove interest
  const handleRemove = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  // Save interests
  const handleSave = async () => {
    if (!user || !authReady || !database || !firebaseApp) return;

    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }

    setSaving(true);
    const ref = doc(database, `users/${user.uid}/profile`);
    
    try {
      await setDoc(ref, { displayName, interests, updatedAt: new Date().toISOString() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("❌ Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  // Go to match page
  const navigateMatch = useCallback(() => {
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    router.push('/match/page');
  }, [interests.length, router]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <p className="text-xl font-black text-fuchsia-600 animate-pulse">Loading…</p>
      </div>
    );
  }

  const canBae = interests.length >= MIN_REQUIRED;
  const requiredRemaining = MIN_REQUIRED - interests.length;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-5 py-10 text-gray-900 flex flex-col items-center">

      {/* Avatar */}
      <div className="w-28 h-28 ring-4 ring-fuchsia-300/40 rounded-full bg-white/60 mb-4 flex items-center justify-center shadow-sm">
        {user?.photoURL ? (
          <img src={user.photoURL} className="w-full h-full object-cover rounded-full" alt="profile"/>
        ) : (
          <Save size={36} className="opacity-50"/>
        )}
      </div>

      <h1 className="text-4xl font-black text-fuchsia-700 mb-2 text-center">Your Profile</h1>

      {/* Input */}
      <div className="flex w-full max-w-xl gap-3 mb-6">
        <input
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add interest..."
          className="flex-1 px-5 py-3 rounded-full bg-white/90 ring-2 ring-fuchsia-300 shadow-sm focus:outline-none focus:ring-fuchsia-600 text-gray-900 placeholder-gray-500 text-base font-medium"
          maxLength={30}
        />
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          disabled={!newInterest.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-md hover:brightness-110 transition disabled:opacity-50"
        >
          <Plus size={18} className="inline-block mr-1"/> Add
        </motion.button>
      </div>

      {/* Warning */}
      <AnimatePresence>
        {minInterestWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-red-200 text-red-900 border-2 border-red-500 px-4 py-2.5 rounded-xl font-bold text-center shadow-md mb-5"
          >
            <XCircle size={18} className="inline-block mr-1"/> Need 3 interests!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interests */}
      <motion.div
        layout
        className="flex-grow overflow-y-auto w-full max-w-3xl bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-fuchsia-300/40 shadow-inner mb-6"
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <h3 className="text-lg font-bold text-fuchsia-800 mb-4 text-center">Your Interests ({interests.length}/{MIN_REQUIRED})</h3>
        {interests.length === 0 && <p className="text-sm italic opacity-40 text-center mb-3">No interests yet</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <AnimatePresence>
            {interests.map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="px-4 py-2 rounded-full bg-white/90 border border-fuchsia-300/40 text-fuchsia-700 font-bold shadow-sm flex items-center gap-2"
              >
                {i}
                <button onClick={() => handleRemove(i)} className="text-fuchsia-500 hover:text-red-600 font-black text-base leading-none transition">×</button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.96 }}
          className={`w-full py-3 rounded-2xl font-extrabold shadow-md transition border ${
            saved ? 'bg-green-500 text-white border-green-700' : 'bg-white/60 text-gray-700 border-fuchsia-300/30 hover:bg-white'
          }`}
        >
          <Save size={18} className="inline-block mr-1"/> {saving ? 'Saving…' : saved ? "Saved!" : "Save"}
        </motion.button>

        <motion.button
          onClick={navigateMatch}
          whileHover={{ scale:1.03 }}
          whileTap={{ scale:0.97 }}
          disabled={!canBae}
          className="w-full py-3 rounded-2xl font-extrabold text-white shadow-lg bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-700 hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={18} className="inline-block mr-1"/> {canBae ? 'GO BAE NOW!' : `Need ${requiredRemaining} More`}
        </motion.button>
      </div>

    </main>
  );
}
