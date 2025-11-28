'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, XCircle } from 'lucide-react';

// Copy + config
const MAIN_INSTRUCTION_COPY = 'Add 3+ interests to start matching.';
const MOTIVATION_COPY = 'The more interests you add, the stronger your connection potential glows ✨';
const MIN_REQUIRED = 3;

// Simple router using window.location
const useSimpleRouter = () => {
  const push = (path: string) => {
    window.location.href = path;
  };
  return { push };
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  const router = useSimpleRouter();

  // Load user + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      if (!u) {
        setAuthReady(true);
        return;
      }

      try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() as any : null;

        if (data) {
          setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
          setInterests(Array.isArray(data.interests) ? data.interests : []);
        } else {
          setDisplayName(u.displayName || u.email || 'Mystery BAE');
        }
      } catch (e) {
        console.error('Profile load failed', e);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const handleAddInterest = () => {
    const i = newInterest.trim();
    if (!i) return;

    if (!interests.includes(i)) {
      // Capitalize first letter, keep the rest as typed
      const normalized = i.charAt(0).toUpperCase() + i.slice(1);
      setInterests((prev) => [...prev, normalized]);
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (value: string) => {
    setInterests((prev) => prev.filter((x) => x !== value));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(
        ref,
        {
          displayName,
          interests,
          updatedAt: new Date().toISOString(),
        },
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

  const handleGoBAE = () => {
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    router.push('/match');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <p className="text-xl font-black text-fuchsia-600 animate-pulse">
          Loading Profile...
        </p>
      </div>
    );
  }

  const canBae = interests.length >= MIN_REQUIRED;
  const requiredRemaining = Math.max(MIN_REQUIRED - interests.length, 0);

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-5 py-10 text-gray-900 flex flex-col items-center">
      {/* Tiny identity strip */}
      <div className="w-full max-w-3xl mb-4 text-xs text-purple-800/70">
        {user && (
          <>
            <span className="font-semibold">Signed in as:</span>{' '}
            <span className="font-bold">{displayName}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="text-5xl sm:text-6xl font-black text-fuchsia-700 mb-3 text-center drop-shadow-sm">
        Your Profile
      </h1>

      {/* Instruction text – only show if below minimum */}
      {interests.length < MIN_REQUIRED && (
        <p className="text-sm font-semibold tracking-wide text-purple-800 mb-6 text-center">
          {MAIN_INSTRUCTION_COPY}{' '}
          <span className="text-xs opacity-70">{MOTIVATION_COPY}</span>
        </p>
      )}

      {/* Warning for min interests */}
      <AnimatePresence>
        {minInterestWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-red-200 text-red-900 border-2 border-red-500 px-4 py-2.5 rounded-xl text-sm font-bold text-center shadow-md mb-5"
          >
            <XCircle size={16} className="inline-block mr-1.5 align-text-bottom" />
            Add at least {MIN_REQUIRED} interests to unlock matching
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interest input */}
      <div className="flex w-full max-w-xl gap-3 mb-6">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="hidden" // keep logic but not visible for now
        />
        <input
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
          placeholder="Add an interest... (e.g., Retro Gaming, Coffee Rituals)"
          className="flex-1 px-5 py-3 rounded-full bg-white/90 ring-2 ring-fuchsia-300 shadow-sm focus:outline-none focus:ring-fuchsia-600 text-gray-900 placeholder-gray-500 text-base font-medium"
          maxLength={40}
        />
        <motion.button
          onClick={handleAddInterest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          disabled={!newInterest.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-md hover:brightness-110 transition disabled:opacity-50"
        >
          Add
        </motion.button>
      </div>

      {/* Interest pill list */}
      <div className="flex-grow w-full max-w-4xl bg-white/40 backdrop-blur-lg p-6 rounded-3xl border border-white/40 shadow-inner mb-8">
        <h3 className="text-lg font-bold text-fuchsia-800 mb-3 text-center">
          Your Passions ({interests.length})
        </h3>

        {interests.length === 0 && (
          <p className="text-sm italic opacity-40 text-center">
            No interests yet — add a few to get started.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <AnimatePresence>
            {interests.map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="px-5 py-2 rounded-full bg-white/90 border border-fuchsia-300/40 text-fuchsia-700 text-sm sm:text-base font-bold shadow-sm flex items-center gap-2"
              >
                {i}
                <button
                  onClick={() => handleRemoveInterest(i)}
                  className="text-fuchsia-500 hover:text-red-600 font-black text-lg leading-none transition"
                >
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        <motion.button
          onClick={handleSaveProfile}
          disabled={saving}
          whileTap={{ scale: 0.96 }}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-base font-black shadow-md transition border ${
            saved
              ? 'bg-green-500 text-white border-green-700'
              : 'bg-white/80 text-fuchsia-600 border-fuchsia-300/30 hover:bg-white'
          } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Save size={18} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Interests'}
        </motion.button>

        <motion.button
          onClick={handleGoBAE}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={!canBae}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 border-2 border-fuchsia-300/50 shadow-lg text-purple-900 text-lg font-black hover:brightness-110 transition disabled:opacity-50"
        >
          <Sparkles size={18} />
          {canBae ? 'BAE SOMEONE NOW!' : `Need ${requiredRemaining} more`}
        </motion.button>
      </div>
    </main>
  );
}
