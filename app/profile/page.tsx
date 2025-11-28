'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, CheckCircle, Heart, Plus } from 'lucide-react';

// --- CONSTANTS ---
const MAIN_INSTRUCTION_COPY = "Add 3+ interests to unlock your BAE matches!";
const MOTIVATION_COPY = "The more you add, the stronger the connection potential glows ✨";
const MIN_REQUIRED = 3;

const useSimpleRouter = () => {
  return {
    push: (path: string) => {
      window.location.href = path;
    }
  };
};

let app = null;
let db = null;
let auth = null;

if (!getApps().length) {
  const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
  app = initializeApp(config);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export default function ProfilePage() {
  const router = useSimpleRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setAuthReady(true);
        return;
      }

      const profileRef = doc(db, `artifacts/${app.name || 'BAE'}/users/${u.uid}/profile/data`);
      try {
        const snap = await getDoc(profileRef);
        const data = snap.exists() ? snap.data() : null;

        if (data) {
          setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
          setInterests(data.interests || []);
        } else {
          setDisplayName(u.displayName || u.email || 'Mystery BAE');
        }
      } catch (e) {
        console.error("Profile load failed", e);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const handleAddInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [
        ...prev,
        i.charAt(0).toUpperCase() + i.slice(1).toLowerCase()
      ]);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  const handleSaveProfile = async () => {
    if (!user || !authReady || !db || !app) return;

    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 2000);
      return;
    }

    setSaving(true);

    const profileRef = doc(db, `artifacts/${app.name || 'BAE'}/users/${user.uid}/profile/data`);

    try {
      await setDoc(profileRef, {
        displayName,
        interests,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);

    } catch (e) {
      console.error("Interest save failed", e);
      setMinInterestWarning(true);
    } finally {
      setSaving(false);
    }
  };

  const handleGoBAE = useCallback(() => {
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 2000);
      return;
    }
    router.push('/match');
  }, [interests.length, router]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-fuchsia-100 to-indigo-200">
        <p className="text-xl font-black text-fuchsia-600 animate-pulse">Initializing BAE...</p>
      </div>
    );
  }

  const isUnlocked = interests.length >= MIN_REQUIRED;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-fuchsia-100 to-indigo-300 px-5 py-10 text-gray-900 flex flex-col items-center">

      {/* Small Identity Circle */}
      <div className="w-24 h-24 ring-4 ring-fuchsia-300/30 rounded-full bg-white/60 mb-4 flex items-center justify-center shadow-sm">
        <Heart size={40} className="text-fuchsia-500/70"/>
      </div>

      <h1 className="text-3xl font-black text-fuchsia-700 mb-6 text-center">Your Profile</h1>

      {/* Instruction Banner (Hidden when unlocked) */}
      <AnimatePresence>
        {!isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-lg bg-white/30 backdrop-blur-md p-4 rounded-xl border-2 border-fuchsia-400/40 shadow mb-5"
          >
            <p className="text-purple-900 font-extrabold text-center flex items-center gap-2 justify-center">
              <Info size={16} className="text-purple-700"/>
              {MAIN_INSTRUCTION_COPY}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Interest Input */}
      <div className="flex w-full max-w-xl gap-3 mb-6">
        <input
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
          placeholder="Add interest..."
          className="flex-1 px-5 py-3 rounded-full bg-white/90 ring-2 ring-pink-300 shadow-sm focus:outline-none focus:ring-fuchsia-600 text-gray-900 placeholder-gray-500 text-base font-medium"
        />
        <motion.button
          onClick={handleAddInterest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          disabled={!newInterest.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-md disabled:opacity-50"
        >
          <Plus size={16} className="inline-block mr-1"/> Add
        </motion.button>
      </div>

      {/* Interest Pill List */}
      <div className="flex-grow overflow-y-auto w-full max-w-3xl bg-white/40 p-6 rounded-3xl border border-white/20 shadow-inner mb-8">
        <h3 className="text-lg font-bold text-fuchsia-800 mb-4 text-center">
          Your Passions ({interests.length} total)
        </h3>

        <AnimatePresence>
          <div className="flex flex-wrap justify-center gap-3">
            {interests.map(i => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="px-4 py-2 rounded-full bg-white/90 border border-fuchsia-300/40 text-fuchsia-700 font-extrabold shadow-sm flex items-center gap-2"
              >
                {i}
                <button onClick={() => handleRemoveInterest(i)} className="text-fuchsia-500 hover:text-red-600 font-black text-lg leading-none">
                  ×
                </button>
              </motion.span>
            ))}
          </div>
        </AnimatePresence>
      </div>

      {/* Bottom Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
        <motion.button
          onClick={handleSaveProfile}
          disabled={saving}
          whileTap={{ scale: 0.96 }}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-lg font-black shadow-md transition border ${
            saved
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-white/80 text-fuchsia-600 border-fuchsia-300/30 hover:bg-white'
          }`}
        >
          <Save size={16}/> {saving ? 'Saving…' : 'Save'}
        </motion.button>

        <motion.button
          onClick={handleGoBAE}
          whileHover={{ scale:1.03 }}
          whileTap={{ scale:0.97 }}
          disabled={!isUnlocked}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 border-2 border-fuchsia-300/50 shadow-lg text-purple-900 text-lg font-black hover:brightness-110 transition disabled:opacity-50"
        >
          <Sparkles size={16}/> BAE Someone Now!
        </motion.button>
      </div>

      {/* ✅ TS SUCCESS MESSAGE IF USER SEES GREEN FLASH */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            className="text-center text-green-700 text-sm mt-3 font-bold"
          >
            <CheckCircle size={14} className="inline-block mr-1"/> Saved!
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
