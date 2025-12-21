'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, Save, Video, ChevronDown, X } from 'lucide-react';

const GOLD_GLOW_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] animate-pulse-slow-reverse';
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';

const useSimpleRouter = () => {
  const push = (path: string) => {
    window.location.href = path;
  };
  return { push };
};

// Sound effect for adding interest
const playTeleportSound = () => {
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

// Interest Pill in Explorer
function ExplorerInterestPill({
  interest,
  isAlreadyAdded,
  isShared,
  onAdd
}: {
  interest: string;
  isAlreadyAdded: boolean;
  isShared: boolean;
  onAdd: (interest: string) => void;
}) {
  let pillClasses = NEUTRAL_PILL_CLASSES;
  
  if (isShared && isAlreadyAdded) {
    pillClasses = GOLD_GLOW_CLASSES + ' cursor-default';
  } else if (isAlreadyAdded) {
    pillClasses = 'bg-white/50 text-black/60 border-white/50 cursor-default opacity-80';
  }

  return (
    <motion.button
      onClick={() => {
        if (!isAlreadyAdded) {
          playTeleportSound();
          onAdd(interest);
        }
      }}
      whileHover={{ scale: isAlreadyAdded ? 1 : 1.05 }}
      whileTap={{ scale: isAlreadyAdded ? 1 : 0.95 }}
      disabled={isAlreadyAdded}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold shadow-md transition-all ${pillClasses}`}
    >
      {interest}
      {isAlreadyAdded && <span className="ml-1.5">✓</span>}
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end sm:items-center sm:justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-purple-900/95 to-fuchsia-900/95 backdrop-blur-xl w-full sm:w-auto sm:min-w-[500px] sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 max-h-[70vh] overflow-y-auto border-t-2 sm:border-2 border-white/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">Your Interests ({interests.length})</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {interests.length === 0 ? (
          <p className="text-white/70 text-center py-8">No interests yet! Start exploring to add some.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <div
                key={interest}
                className="group relative px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white text-sm font-semibold"
              >
                {interest}
                <button
                  onClick={() => onRemove(interest)}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition"
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const handleAddInterest = async (interest: string) => {
    const interestLower = interest.toLowerCase();
    const alreadyExists = userInterests.some((i) => i.toLowerCase() === interestLower);

    if (!alreadyExists && user) {
      const newInterests = [...userInterests, interest];
      setUserInterests(newInterests);

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

        // Show toast
        setToastMessage(`✨ ${interest} added!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (e) {
        console.error('Auto-save failed', e);
      }
    }
  };

  const handleRemoveInterest = async (interest: string) => {
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
    <main className="relative min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] px-5 py-10 text-white overflow-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 h-[72px] backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]">
        <a href="/" className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </a>
        <div className="flex gap-6 items-center text-sm">
          <a href="/" className="text-white/70 hover:text-white font-semibold">Home</a>
          <a href="/profile" className="text-white/70 hover:text-white font-semibold">Profile</a>
          <a href="/explorer" className="text-yellow-300 font-semibold">Explorer</a>
          <span className="font-bold text-white/90">{displayName}</span>
        </div>
      </header>

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Your Interests Badge */}
      <motion.button
        onClick={() => setDrawerOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-20 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold rounded-full shadow-lg"
      >
        🎯 Your: {userInterests.length}
        <ChevronDown size={16} />
      </motion.button>

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
      <div className="relative z-10 w-full max-w-3xl mx-auto pt-24">
        
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent text-center mb-4"
        >
          Interest Explorer ✨
        </motion.h1>

        <p className="text-center text-lg text-white/70 mb-8">
          Discover people through what they love
        </p>

        {!currentProfile && allProfiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-semibold text-white/70">
              No profiles available yet. Be the first to add interests!
            </p>
          </div>
        ) : currentProfile ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
              {/* Profile Header */}
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentProfile.displayName || 'Anonymous'}
                </h2>
                <p className="text-white/70">
                  {currentProfile.city && currentProfile.state
                    ? `${currentProfile.city}, ${currentProfile.state}`
                    : currentProfile.location || 'The Cosmos'}
                </p>
              </div>

              {/* Interests */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {currentProfile.interests?.map((interest: string) => (
                  <ExplorerInterestPill
                    key={interest}
                    interest={interest}
                    isAlreadyAdded={userInterests.some(
                      (i: string) => i.toLowerCase() === interest.toLowerCase()
                    )}
                    isShared={sharedInterests.some(
                      (i: string) => i.toLowerCase() === interest.toLowerCase()
                    )}
                    onAdd={handleAddInterest}
                  />
                ))}
              </div>

              {/* Shared Count */}
              {sharedCount > 0 && (
                <p className="text-center text-sm font-semibold mb-6 text-yellow-300">
                  <Star size={16} className="inline-block mr-1 animate-pulse" fill="#FDE047" />
                  {sharedCount} shared interest{sharedCount > 1 ? 's' : ''} found!
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  onClick={showNextProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/20 text-white font-bold shadow-lg hover:bg-white/30 transition"
                >
                  <RefreshCw size={20} />
                  Next Profile
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold shadow-lg hover:shadow-xl transition"
                  onClick={() => router.push('/match')}
                >
                  <Video size={20} />
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

function setDoc(ref: any, arg1: { interests: string[]; updatedAt: string; }, arg2: { merge: boolean; }) {
  throw new Error('Function not implemented.');
}