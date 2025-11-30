'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, XCircle, CheckCircle, RefreshCw } from 'lucide-react';

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

// Interest Pill Component (for user's own interests)
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

// Explorer Interest Pill (clickable to add)
function ExplorerInterestPill({ 
  interest, 
  isAlreadyAdded, 
  onAdd 
}: { 
  interest: string; 
  isAlreadyAdded: boolean; 
  onAdd: (interest: string) => void;
}) {
  const playPopShimmer = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Part 1: Soft Pop (warm bubble pop)
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
      
      // Part 2: Rising Shimmer (ascending sparkles)
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

  return (
    <motion.button
      onClick={() => {
        if (!isAlreadyAdded) {
          playPopShimmer();
          onAdd(interest);
        }
      }}
      whileHover={{ scale: isAlreadyAdded ? 1 : 1.05 }}
      whileTap={{ scale: isAlreadyAdded ? 1 : 0.95 }}
      disabled={isAlreadyAdded}
      className={`relative px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all ${
        isAlreadyAdded
          ? 'bg-fuchsia-100 text-fuchsia-400 border-2 border-fuchsia-200 cursor-default opacity-60'
          : 'bg-gradient-to-r from-fuchsia-50 to-pink-50 border-2 border-fuchsia-300/60 text-fuchsia-700 hover:shadow-lg cursor-pointer'
      }`}
    >
      {interest}
      {isAlreadyAdded && (
        <span className="ml-1.5 text-xs">✓</span>
      )}
    </motion.button>
  );
}

// Interest Explorer Component
function InterestExplorer({ 
  currentUserId, 
  userInterests, 
  onAddInterest 
}: { 
  currentUserId: string; 
  userInterests: string[]; 
  onAddInterest: (interest: string) => void;
}) {
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [unseenProfiles, setUnseenProfiles] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllProfiles = async () => {
      if (!currentUserId) return;
      
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        const profiles = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((profile: any) => 
            profile.id !== currentUserId && 
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

    fetchAllProfiles();
  }, [currentUserId]);

  const showNextProfile = () => {
    if (unseenProfiles.length === 0) {
      const resetPool = allProfiles.filter(p => p.id !== currentProfile?.id);
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl">✨</div>
      </div>
    );
  }

  if (!currentProfile && allProfiles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-fuchsia-600 font-semibold">No profiles available yet</p>
      </div>
    );
  }

  const sharedCount = currentProfile?.interests?.filter((i: string) => 
    userInterests.some(userInt => userInt.toLowerCase() === i.toLowerCase())
  ).length || 0;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {currentProfile ? (
          <motion.div
            key={currentProfile.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4">
              <h4 className="text-lg font-bold text-fuchsia-700">
                {currentProfile.displayName || 'Anonymous'} • {currentProfile.location || 'Unknown'}
              </h4>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {currentProfile.interests?.map((interest: string) => (
                <ExplorerInterestPill
                  key={interest}
                  interest={interest}
                  isAlreadyAdded={userInterests.some(i => i.toLowerCase() === interest.toLowerCase())}
                  onAdd={onAddInterest}
                />
              ))}
            </div>

            {sharedCount > 0 && (
              <p className="text-sm text-fuchsia-600 font-semibold mb-4">
                {sharedCount} shared interest{sharedCount > 1 ? 's' : ''} ✨
              </p>
            )}

            <motion.button
              onClick={showNextProfile}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <RefreshCw size={18} />
              Next Profile
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasSeenCelebration, setHasSeenCelebration] = useState(false);

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

  useEffect(() => {
    if (interests.length === MIN_REQUIRED && !hasSeenCelebration && user) {
      setShowCelebration(true);
      setHasSeenCelebration(true);
      
      const ref = doc(db, 'users', user.uid);
      setDoc(ref, { hasSeenCelebration: true }, { merge: true }).catch(console.error);
      
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [interests.length, hasSeenCelebration, user]);

  // AUTO-SAVE: Manual interest add
  const handleAddInterest = async () => {
    const i = newInterest.trim();
    if (!i || !user) return;

    const normalized = i.charAt(0).toUpperCase() + i.slice(1);
    
    if (!interests.includes(normalized)) {
      const newInterests = [...interests, normalized];
      setInterests(newInterests);
      
      // Auto-save to Firestore
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { 
            interests: newInterests,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Auto-save failed', e);
      }
    }
    setNewInterest('');
  };

  // AUTO-SAVE: Interest add from Explorer
  const handleAddInterestFromExplorer = async (interest: string) => {
    const interestLower = interest.toLowerCase();
    const alreadyExists = interests.some(i => i.toLowerCase() === interestLower);
    
    if (!alreadyExists && user) {
      const newInterests = [...interests, interest];
      setInterests(newInterests);
      
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { 
            interests: newInterests,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Auto-save failed', e);
      }
    }
  };

  const handleRemoveInterest = (value: string) => {
    setInterests((prev) => prev.filter((x) => x !== value));
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
      
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-fuchsia-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />
      </div>

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

      <div className="relative z-10 w-full max-w-7xl flex flex-col items-center">
    
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl sm:text-6xl font-black text-fuchsia-700 mb-4 text-center drop-shadow-sm"
        >
          Your Interests Profile
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-base sm:text-lg font-semibold text-purple-900 mb-8 text-center max-w-2xl px-4"
        >
          {MAIN_INSTRUCTION_COPY}
        </motion.p>

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

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex w-full max-w-xl gap-3 mb-8"
        >
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl"
          >
            <h3 className="text-xl font-bold text-fuchsia-800 mb-5 text-center">
              What You're Really Into
            </h3>

            {interests.length === 0 && (
              <p className="text-sm italic opacity-50 text-center text-purple-700 mb-4">
                No interests yet — add a few to get started! ✨
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3 mb-4">
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

            <p className="text-center text-sm text-fuchsia-600 font-semibold">
              You've added {interests.length} interest{interests.length !== 1 ? 's' : ''}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl"
          >
            <h3 className="text-xl font-bold text-fuchsia-800 mb-2 text-center">
              ✨ Get Inspired
            </h3>
            <p className="text-base font-semibold text-purple-900 mb-6 text-center">
              Explore others' interests - tap to add them to yours!
            </p>
            
            {user && (
              <InterestExplorer 
                currentUserId={user.uid}
                userInterests={interests}
                onAddInterest={handleAddInterestFromExplorer}
              />
            )}
          </motion.div>

        </div>

       {/* Single centered BAE button */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.6, duration: 0.6 }}
  className="flex justify-center w-full max-w-xl"
>
  <motion.button
    onClick={handleGoBAE}
    whileHover={{ scale: canBae ? 1.045 : 1 }}
    whileTap={{ scale: canBae ? 0.97 : 1 }}
    disabled={!canBae}
    className={`relative flex items-center justify-center gap-2 px-10 sm:px-14 py-5 sm:py-6 rounded-full text-white text-xl sm:text-2xl font-black shadow-lg transition-all ${
      canBae 
        ? 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:shadow-xl' 
        : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
    }`}
  >
    <Sparkles size={24} />
    <span className="relative z-10">
      {canBae ? 'BAE SOMEONE NOW!' : `Need ${requiredRemaining} more`}
    </span>
    {canBae && (
      <span className="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"></span>
    )}
  </motion.button>
</motion.div>
      </div>
    </main>
  );
}