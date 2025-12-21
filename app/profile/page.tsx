'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, XCircle, Link as LinkIcon, MapPin, Globe } from 'lucide-react';

const MIN_REQUIRED = 3;
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';

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
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-full ${NEUTRAL_PILL_CLASSES} text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-default`}
    >
      {interest}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onRemove(interest)}
            whileHover={{ backgroundColor: "#ef4444" }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-10"
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

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const router = useSimpleRouter();

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
          setCity(data.city || '');
          setState(data.state || '');
          setCountry(data.country || '');
          setWebsite(data.website || '');
          setLinkedin(data.linkedin || '');
          setInstagram(data.instagram || '');
          setTwitter(data.twitter || '');
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

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(
        ref,
        {
          displayName,
          city,
          state,
          country,
          website,
          linkedin,
          instagram,
          twitter,
          interests,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const handleAddInterest = async () => {
    const i = newInterest.trim();
    if (!i || !user) return;

    const normalized = i.charAt(0).toUpperCase() + i.slice(1);
    
    if (!interests.includes(normalized)) {
      const newInterests = [...interests, normalized];
      setInterests(newInterests);
      
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { interests: newInterests, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {
        console.error('Auto-save failed', e);
      }
    }
    setNewInterest('');
  };

  const handleRemoveInterest = async (value: string) => {
    const newInterests = interests.filter((x) => x !== value);
    setInterests(newInterests);
    
    if (user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { interests: newInterests, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {
        console.error('Auto-save failed', e);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <p className="text-xl font-black text-white/90 animate-pulse">Initializing BAE...</p>
      </div>
    );
  }

  const canBae = interests.length >= MIN_REQUIRED;
  const requiredRemaining = Math.max(MIN_REQUIRED - interests.length, 0);

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] px-5 py-10 text-white flex flex-col items-center overflow-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]">
        <a href="/" className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </a>
        <div className="flex gap-6 items-center text-sm">
          <a href="/" className="text-white/70 hover:text-white font-semibold">Home</a>
          <a href="/profile" className="text-yellow-300 font-semibold">Profile</a>
          <a href="/explorer" className="text-white/70 hover:text-white font-semibold">Explorer</a>
          <span className="font-bold text-white/90">{displayName}</span>
        </div>
      </header>

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Save Success Toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg"
          >
            ✓ Profile Saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto pt-24">
        
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent text-center mb-8"
        >
          Your Profile
        </motion.h1>

        {/* Personal Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl mb-6"
        >
          <h3 className="text-2xl font-bold text-white/90 mb-6 flex items-center gap-2">
            <Globe size={24} />
            Personal Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="Los Angeles"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">State/Province</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="California"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="United States"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
              <LinkIcon size={16} />
              Personal Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">LinkedIn</label>
              <input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Instagram</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Twitter/X</label>
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="@username"
              />
            </div>
          </div>

          <motion.button
            onClick={handleSaveProfile}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl"
          >
            Save Profile Info
          </motion.button>
        </motion.div>

        {/* Interests Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl mb-6"
        >
          <h3 className="text-2xl font-bold text-white/90 mb-2 text-center">Your Interests</h3>
          <p className="text-sm text-white/70 mb-6 text-center">
            Your shared interests will glow during conversations - the more you add, the better!
          </p>

          {interests.length === 0 && (
            <p className="text-sm italic opacity-50 text-center text-white/70 mb-4">
              No interests yet — add a few to get started! ✨
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <AnimatePresence>
              {interests.map((i) => (
                <InterestPill key={i} interest={i} onRemove={handleRemoveInterest} />
              ))}
            </AnimatePresence>
          </div>

          <p className="text-center text-sm text-white/70 font-semibold mb-4">
            You've added {interests.length} interest{interests.length !== 1 ? 's' : ''}
          </p>

          <div className="flex w-full gap-3 mb-4">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
              placeholder="Add Your Interests Here!"
              className="flex-1 px-5 py-3 rounded-full bg-white/10 ring-2 ring-fuchsia-500/50 focus:outline-none focus:ring-fuchsia-400 text-white placeholder-white/50 text-sm"
              maxLength={40}
            />
            <motion.button
              onClick={handleAddInterest}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              disabled={!newInterest.trim()}
              className="px-5 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              Add
            </motion.button>
          </div>

          <AnimatePresence>
            {minInterestWarning && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bg-red-900/50 text-red-300 border-2 border-red-500/70 px-4 py-2.5 rounded-xl text-xs font-bold text-center"
              >
                <XCircle size={14} className="inline-block mr-1.5" />
                Add at least {MIN_REQUIRED} interests to unlock matching
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={() => router.push('/explorer')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="px-10 py-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xl font-black shadow-lg"
          >
            ✨ Explore Community
          </motion.button>

          <motion.button
            onClick={handleGoBAE}
            whileHover={{ scale: canBae ? 1.05 : 1 }}
            whileTap={{ scale: canBae ? 0.97 : 1 }}
            disabled={!canBae}
            className={`px-10 py-5 rounded-full text-xl font-black shadow-lg ${
              canBae 
                ? 'bg-gradient-to-r from-[#FF6F91] to-[#FF9B85] text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles size={24} className="inline mr-2" />
            {canBae ? 'BAE SOMEONE NOW!' : `Need ${requiredRemaining} more`}
          </motion.button>
        </div>

      </div>
    </main>
  );
}