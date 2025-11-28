'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, CheckCircle, Heart, Plus } from 'lucide-react';

const MAIN_INSTRUCTION_COPY = "Add 3+ interests to start matching.";
const MOTIVATION_COPY = "The more interests you add, the stronger your connection potential glows ✨";

export default function ProfilePage() {
  const [authReady, setAuthReady] = useState(false);
  const [appInstance, setAppInstance] = useState<any>(null);
  const [firestore, setFirestore] = useState<any>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<any>(null);

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // 🔥 INIT FIREBASE + AUTH LISTENER
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
        if (!Object.keys(config).length) {
          console.error("❌ Firebase config missing");
          setAuthReady(true);
          return;
        }

        let app;
        if (!getApps().length) {
          app = initializeApp(config);
        } else {
          app = getApps()[0];
        }

        const { getAuth } = await import('firebase/auth');
        const { getFirestore } = await import('firebase/firestore');

        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setAppInstance(app);
        setFirebaseAuth(authInstance);
        setFirestore(dbInstance);

        if (!authInstance.currentUser) {
          const { signInAnonymously } = await import('firebase/auth');
          await signInAnonymously(authInstance);
        }

        const unsub = onAuthStateChanged(authInstance, async (u) => {
          setUser(u);

          if (!u) {
            setAuthReady(true);
            return;
          }

          const ref = doc(dbInstance, 'users', u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            setDisplayName(data.displayName || u.displayName || u.email || '');
            setInterests(data.interests || []);
          } else {
            setDisplayName(u.displayName || u.email || '');
          }

          setAuthReady(true);
        });

        return () => unsub();
      } catch (e) {
        console.error("🔥 Firebase init failed", e);
        setAuthReady(true);
      }
    };

    initFirebase();
  }, []);

  // ➕ ADD INTEREST
  const handleAddInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // ✖ REMOVE INTEREST
  const handleRemoveInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  // 💾 SAVE PROFILE (with green flash)
  const handleSaveProfile = async () => {
    if (!user || !authReady || !firestore || !appInstance) return;

    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }

    const ref = doc(firestore, 'users', user.uid);
    setSaving(true);

    try {
      await setDoc(ref, { displayName, interests, updatedAt: new Date().toISOString() }, { merge: true });

      setSaved(true); // ✅ green flash
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("❌ Save failed", e);
    } finally {
      setSaving(false);
    }
  };

  // ✨ GO TO MATCH PAGE
  const handleGoBAE = () => {
    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    window.location.href = "/match";
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <p className="text-xl font-black text-fuchsia-600 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-5 py-10 text-gray-900 flex flex-col items-center">

      {/* IDENTIFIER CARD (MINIMIZED) */}
      <div className="w-28 h-28 ring-4 ring-fuchsia-300/40 rounded-full bg-white/60 mb-5 flex items-center justify-center shadow-sm">
        <Heart size={52} className="text-fuchsia-500/80"/>
      </div>
      <h1 className="text-5xl font-black text-fuchsia-700 mb-2.5 text-center">Your Profile</h1>

      {/* INSTRUCTIONS */}
      <p className="text-sm font-semibold tracking-wide text-purple-800 mb-8">
        {MAIN_INSTRUCTION_COPY} <span className="text-xs opacity-60">{MOTIVATION_COPY}</span>
      </p>

      {/* ⚠ MINIMUM WARNING */}
      <AnimatePresence>
        {minInterestWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-200 text-red-900 border-2 border-red-500 px-4 py-2.5 rounded-xl text-base font-bold text-center shadow-md mb-5"
          >
            <XCircle size={18} className="inline-block mr-1.5"/> Add at least 3 interests to unlock matching
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ ADD PASSIONS INPUT */}
      <div className="flex w-full max-w-xl gap-3 mb-6">
        <input
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
          placeholder="Add interest..."
          className="flex-1 px-5 py-3 rounded-full bg-white/90 ring-2 ring-fuchsia-300 shadow-sm focus:outline-none focus:ring-fuchsia-600 text-gray-900 placeholder-gray-500 text-base font-medium"
          maxLength={30}
        />
        <motion.button
          onClick={handleAddInterest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          disabled={!newInterest.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-md hover:brightness-110 transition disabled:opacity-50"
        >
          <Plus size={18} className="inline-block mr-1"/> Add
        </motion.button>
      </div>

      {/* 💖 INTEREST PILLS */}
      <div className="flex-grow overflow-y-auto w-full max-w-4xl bg-white/30 backdrop-blur-lg p-6 rounded-3xl border border-white/20 shadow-inner mb-8">
        {interests.length === 0 && <p className="text-sm italic opacity-40 text-center">No interests yet</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {interests.map(i => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="px-5 py-2 rounded-full bg-white/90 border border-fuchsia-300/40 text-fuchsia-700 text-base font-bold shadow-sm flex items-center gap-2"
            >
              {i}
              <button onClick={() => handleRemoveInterest(i)} className="text-fuchsia-500 hover:text-red-600 font-black text-lg leading-none transition">×</button>
            </motion.span>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-5 w-full max-w-xl">
        <motion.button
          onClick={handleSaveProfile}
          disabled={saving}
          whileTap={{ scale: 0.96 }}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-lg font-black shadow-md transition border ${
            saved
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-white/80 text-fuchsia-600 border-fuchsia-300/30'
          }`}
        >
          <Save size={18}/> {saving ? 'Saving…' : saved ? <><CheckCircle size={18}/> Saved!</> : 'Save'}
        </motion.button>

        <motion.button
          onClick={handleGoBAE}
          whileHover={{ scale:1.03 }}
          whileTap={{ scale:0.97 }}
          disabled={!canBae}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 border-2 border-fuchsia-300/50 shadow-lg text-purple-900 text-lg font-black hover:brightness-110 transition disabled:opacity-50"
        >
          <Sparkles size={18}/> BAE Someone
        </motion.button>
      </div>

    </main>
  );
}
