'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Video, X, Sparkles } from 'lucide-react';

const GOLD_GLOW_CLASSES = 'text-black bg-gradient-to-r from-yellow-300 to-yellow-500 border border-yellow-200 shadow-[0_0_20px_rgba(253,224,71,0.6)] animate-pulse-slow-reverse font-bold cursor-pointer';
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-md hover:bg-white/20 hover:border-white/40 cursor-pointer';

const useSimpleRouter = () => {
  const push = (path: string) => {
    window.location.href = path;
  };
  return { push };
};

// Add sound
const playAddSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const popOsc = audioContext.createOscillator();
    const popGain = audioContext.createGain();
    popOsc.connect(popGain);
    popGain.connect(audioContext.destination);
    popOsc.frequency.setValueAtTime(400, audioContext.currentTime);
    popOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
    popOsc.type = 'sine';
    popGain.gain.setValueAtTime(0.25, audioContext.currentTime);
    popGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    popOsc.start(audioContext.currentTime);
    popOsc.stop(audioContext.currentTime + 0.05);
    const shimmerFreqs = [800, 1000, 1200, 1400];
    const shimmerStart = audioContext.currentTime + 0.05;
    shimmerFreqs.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const startTime = shimmerStart + (index * 0.025);
      const duration = 0.08;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.log('Audio not supported');
  }
};

// Remove sound
const playRemoveSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(600, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.log('Audio not supported');
  }
};

// Interest Pill Component
function ExplorerInterestPill({
  interest,
  isShared,
  onToggle
}: {
  interest: string;
  isShared: boolean;
  onToggle: (interest: string) => void;
}) {
  const pillClasses = isShared ? GOLD_GLOW_CLASSES : NEUTRAL_PILL_CLASSES;

  return (
    <motion.button
      onClick={() => onToggle(interest)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92, transition: { type: "spring", stiffness: 400, damping: 10 } }}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold shadow-md transition-all duration-300 ${pillClasses}`}
    >
      {interest}
      {isShared && <span className="ml-1.5">✨</span>}
    </motion.button>
  );
}

// Interest Counter Badge
function InterestCounter({
  count,
  onClick
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.98 }}
      className="
        fixed top-24 right-8 z-30
        px-6 py-4 rounded-2xl
        bg-white/5 backdrop-blur-xl
        border border-white/10
        transition-all duration-300
        hover:border-white/20
        group
      "
    >
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ y: -10, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              scale: [1, 1.15, 1]
            }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl font-light text-white mb-1"
          >
            {count}
          </motion.div>
        </AnimatePresence>
        <div className="text-xs text-white/60 font-medium tracking-wide">
          interests
        </div>
        <div className="text-xs text-white/40 font-normal mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          tap to view
        </div>
      </div>
    </motion.button>
  );
}

// Your Interests Drawer
function YourInterestsDrawer({
  isOpen,
  onClose,
  interests,
  onRemove
}: {
  isOpen: boolean;
  onClose: () => void;
  interests: string[];
  onRemove: (interest: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center"
    >
      <motion.div
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#1a0a33] to-[#2d1b4e] w-full sm:w-auto sm:min-w-[600px] sm:max-w-3xl rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[80vh] overflow-y-auto border-t-2 sm:border-2 border-white/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl font-black text-white mb-1">Your Collection</h3>
            <p className="text-white/60 text-sm font-medium">{interests.length} interests curated</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {interests.length === 0 ? (
          <div className="text-white/70 text-center py-16 flex flex-col items-center">
            <Sparkles size={56} className="text-white/20 mb-4" />
            <p className="text-lg font-semibold mb-2">Your collection is empty</p>
            <p className="text-sm text-white/50">Start exploring to build your interest profile</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {interests.map((interest) => (
              <motion.div
                key={interest}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full text-white text-sm font-semibold transition-all"
              >
                {interest}
                <button
                  onClick={() => onRemove(interest)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-bold shadow-lg"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-8 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/10 hover:border-white/20"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function ExplorerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');

  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [unseenProfiles, setUnseenProfiles] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const router = useSimpleRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      if (!u) {
        setAuthReady(true);
        router.push('/auth');
        return;
      }

      try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() as any : null;

        if (data) {
          setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
          setUserInterests(Array.isArray(data.interests) ? data.interests : []);
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

  useEffect(() => {
    const fetchAllProfiles = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const profiles = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (profile: any) =>
              profile.id !== user.uid &&
              Array.isArray(profile.interests) &&
              profile.interests.length > 0
          );

        setAllProfiles(profiles);
        setUnseenProfiles([...profiles]);

        if (profiles.length > 0) {
          const randomIndex = Math.floor(Math.random() * profiles.length);
          setCurrentProfile(profiles[randomIndex]);
          setUnseenProfiles(profiles.filter((_, i) => i !== randomIndex));
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAllProfiles();
    }
  }, [user]);

  const showNextProfile = () => {
    if (unseenProfiles.length === 0) {
      const resetPool = allProfiles.filter((p) => p.id !== currentProfile?.id);
      setUnseenProfiles(resetPool);

      if (resetPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * resetPool.length);
        setCurrentProfile(resetPool[randomIndex]);
        setUnseenProfiles(resetPool.filter((_, i) => i !== randomIndex));
      }
    } else {
      const randomIndex = Math.floor(Math.random() * unseenProfiles.length);
      setCurrentProfile(unseenProfiles[randomIndex]);
      setUnseenProfiles(unseenProfiles.filter((_, i) => i !== randomIndex));
    }
  };

  const handleToggleInterest = async (interest: string) => {
    const interestLower = interest.toLowerCase();
    const alreadyExists = userInterests.some((i) => i.toLowerCase() === interestLower);

    if (alreadyExists) {
      // Remove
      playRemoveSound();
      const newInterests = userInterests.filter((i) => i.toLowerCase() !== interestLower);
      setUserInterests(newInterests);

      if (user) {
        try {
          const ref = doc(db, 'users', user.uid);
          await setDoc(
            ref,
            {
              interests: newInterests,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error('Remove failed', e);
        }
      }
    } else {
      // Add
      playAddSound();
      const newInterests = [...userInterests, interest];
      setUserInterests(newInterests);

      if (user) {
        try {
          const ref = doc(db, 'users', user.uid);
          await setDoc(
            ref,
            {
              interests: newInterests,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error('Add failed', e);
        }
      }
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    playRemoveSound();
    const newInterests = userInterests.filter((i) => i !== interest);
    setUserInterests(newInterests);

    if (user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          {
            interests: newInterests,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Remove failed', e);
      }
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">✨</div>
          <p className="text-xl font-black text-white/90">Loading Explorer...</p>
        </div>
      </div>
    );
  }

  const sharedInterests = currentProfile?.interests?.filter((i: string) =>
    userInterests.some((userInt) => userInt.toLowerCase() === i.toLowerCase())
  ) || [];
  const sharedCount = sharedInterests.length;

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] px-8 py-10 text-white overflow-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-8 h-[72px] backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]">
        <a href="/" className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </a>
        <div className="flex gap-6 items-center text-sm">
          <a href="/" className="text-white/70 hover:text-white font-semibold transition">Home</a>
          <a href="/profile" className="text-white/70 hover:text-white font-semibold transition">Profile</a>
          <a href="/explorer" className="text-yellow-300 font-semibold">Explorer</a>
          <span className="font-bold text-white/90">{displayName}</span>
        </div>
      </header>

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Interest Counter Badge */}
      <InterestCounter
        count={userInterests.length}
        onClick={() => setDrawerOpen(true)}
      />

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <YourInterestsDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            interests={userInterests}
            onRemove={handleRemoveInterest}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pt-24">
        
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-black bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent text-center mb-6"
        >
          Interest Explorer ✨
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <p className="text-xl sm:text-2xl text-white font-bold mb-2">
            Explore Other People's Interests Here!
          </p>
          <p className="text-xl sm:text-2xl text-white font-bold">
            Tap to Add Any Interest to Your Profile!
          </p>
        </motion.div>

        {!currentProfile && allProfiles.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={64} className="text-white/30 mx-auto mb-6" />
            <p className="text-2xl font-semibold text-white/70">
              No profiles available yet
            </p>
            <p className="text-lg text-white/50 mt-2">
              Be the first to add interests!
            </p>
          </div>
        ) : currentProfile ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white/5 backdrop-blur-lg p-10 rounded-[40px] border border-white/10 shadow-2xl max-w-4xl mx-auto"
            >
              {/* Profile Header */}
              <div className="mb-8 text-center">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
                  {currentProfile.displayName || 'Anonymous'}
                </h2>
                <p className="text-lg text-white/70 font-medium">
                  {currentProfile.city && currentProfile.state
                    ? `${currentProfile.city}, ${currentProfile.state}`
                    : currentProfile.city || currentProfile.location || 'The Cosmos'}
                </p>
              </div>

              {/* Interests */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {currentProfile.interests?.map((interest: string) => {
                  const isShared = userInterests.some(
                    (i: string) => i.toLowerCase() === interest.toLowerCase()
                  );
                  return (
                    <ExplorerInterestPill
                      key={interest}
                      interest={interest}
                      isShared={isShared}
                      onToggle={handleToggleInterest}
                    />
                  );
                })}
              </div>

              {/* Shared Count */}
              {sharedCount > 0 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center text-base font-bold mb-8 text-yellow-300 flex items-center justify-center gap-2"
                >
                  <Star size={20} className="animate-pulse" fill="#FDE047" />
                  {sharedCount} shared interest{sharedCount > 1 ? 's' : ''} found!
                </motion.p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={showNextProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold shadow-lg transition-all border border-white/10 hover:border-white/20 text-lg"
                >
                  <RefreshCw size={22} />
                  Next Profile
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg hover:shadow-xl transition-all text-lg"
                  onClick={() => router.push('/match')}
                >
                  <Video size={22} />
                  Match Now
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}

      </div>
    </main>
  );
}