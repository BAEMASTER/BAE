'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Save, XCircle, CheckCircle } from 'lucide-react';

// Copy + config
const MAIN_INSTRUCTION_COPY = 'Your shared interests will glow during conversations - the more you add, the better!';
const MIN_REQUIRED = 3;

// Simple router using window.location
const useSimpleRouter = () => {
  const push = (path: string) => {
    window.location.href = path;
  };
  return { push };
};

// Interest Pill Component
function InterestPill({ interest, onRemove }: { interest: string; onRemove: (i: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 25 
      }}
      whileHover={{ scale: 1.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-50 to-pink-50 border-2 border-fuchsia-300/60 text-fuchsia-700 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all cursor-default"
    >
      {interest}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onRemove(interest)}
            whileHover={{ backgroundColor: "#ef4444" }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-fuchsia-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-10 leading-none"
            aria-label="Remove interest"
          >
            ×
          </motion.button>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasSeenCelebration, setHasSeenCelebration] = useState(false);

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
          setHasSeenCelebration(data.hasSeenCelebration || false);
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

  // Check for celebration when hitting 3 interests (only first time)
  useEffect(() => {
    if (interests.length === MIN_REQUIRED && !hasSeenCelebration && user) {
      setShowCelebration(true);
      setHasSeenCelebration(true);
      
      // Save the flag to Firestore
      const ref = doc(db, 'users', user.uid);
      setDoc(ref, { hasSeenCelebration: true }, { merge: true }).catch(console.error);
      
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [interests.length, hasSeenCelebration, user]);

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
    <main className="relative min-h-screen w-full bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-5 py-10 text-gray-900 flex flex-col items-center overflow-hidden">
      
      {/* Subtle background texture/pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-fuchsia-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />
      </div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-3">
              <CheckCircle size={32} className="animate-bounce" />
              <div>
                <p className="text-2xl font-black">You're Ready to BAE! 🎉</p>
                <p className="text-sm opacity-90">Keep adding more for better matches</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        {/* Tiny identity strip */}
        <div className="w-full mb-4 text-xs text-purple-800/70">
          {user && (
            <>
              <span className="font-semibold">Signed in as:</span>{' '}
              <span className="font-bold">{displayName}</span>
            </>
          )}
        </div>

        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl sm:text-6xl font-black text-fuchsia-700 mb-4 text-center drop-shadow-sm"
        >
          Your Interests Profile
        </motion.h1>

        {/* Instruction text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-base sm:text-lg font-semibold text-purple-900 mb-8 text-center max-w-2xl px-4"
        >
          {MAIN_INSTRUCTION_COPY}
        </motion.p>

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
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex w-full max-w-xl gap-3 mb-8"
        >
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="hidden"
          />
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
            placeholder="Add Your Interests Here!"
            className="flex-1 px-5 py-3.5 rounded-full bg-white/80 backdrop-blur-sm ring-2 ring-fuchsia-300/50 shadow-md focus:outline-none focus:ring-fuchsia-500 focus:ring-2 text-gray-900 placeholder-gray-500 text-base font-medium transition-all"
            maxLength={40}
          />
          <motion.button
            onClick={handleAddInterest}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            disabled={!newInterest.trim()}
            className="px-6 py-3.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </motion.button>
        </motion.div>

        {/* Interest pill list */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex-grow w-full max-w-4xl bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl mb-8"
        >
          <h3 className="text-xl font-bold text-fuchsia-800 mb-5 text-center">
            What You're Really Into ({interests.length})
          </h3>

          {interests.length === 0 && (
            <p className="text-sm italic opacity-50 text-center text-purple-700">
              No interests yet — add a few to get started! ✨
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <AnimatePresence>
              {interests.map((i) => (
                <InterestPill 
                  key={i} 
                  interest={i} 
                  onRemove={handleRemoveInterest} 
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl"
        >
          <motion.button
            onClick={handleSaveProfile}
            disabled={saving}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-black shadow-lg transition-all border-2 ${
              saved
                ? 'bg-green-500 text-white border-green-600 shadow-green-300/50'
                : 'bg-white/80 backdrop-blur-sm text-fuchsia-600 border-fuchsia-300/50 hover:bg-white hover:shadow-xl'
            } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Save size={18} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Interests'}
          </motion.button>

          <motion.button
            onClick={handleGoBAE}
            whileHover={{ scale: canBae ? 1.03 : 1 }}
            whileTap={{ scale: canBae ? 0.97 : 1 }}
            disabled={!canBae}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-lg font-black shadow-lg transition-all ${
              canBae 
                ? 'bg-gradient-to-r from-amber-300 to-yellow-400 border-2 border-yellow-500/50 shadow-yellow-300/50 hover:shadow-xl hover:brightness-110' 
                : 'bg-gray-300 text-gray-500 border-2 border-gray-400/50 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles size={18} />
            {canBae ? 'BAE SOMEONE NOW!' : `Need ${requiredRemaining} more`}
          </motion.button>
        </motion.div>
      </div>
    </main>
  );
}