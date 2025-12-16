'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, XCircle, CheckCircle, RefreshCw, Star } from 'lucide-react';

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

// Custom Styles for Glow - Matching Homepage Exactly
const GOLD_GLOW_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] animate-pulse-slow-reverse';
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';

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
      className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-full ${NEUTRAL_PILL_CLASSES} text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-default`}
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
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-10 leading-none"
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
  isShared,
  onAdd 
}: { 
  interest: string; 
  isAlreadyAdded: boolean; 
  isShared: boolean;
  onAdd: (interest: string) => void;
}) {
  const playPopShimmer = () => {
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

  let pillClasses = NEUTRAL_PILL_CLASSES;
  if (isShared && isAlreadyAdded) {
    // Gold glow for shared interests - EXACT match to homepage AI pill
    pillClasses = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] animate-pulse-slow-reverse cursor-default';
  } else if (isAlreadyAdded) {
    // Non-shared interests that are added (just muted)
    pillClasses = 'bg-white/50 text-black/60 border-white/50 cursor-default opacity-80';
  } else {
    // Not added yet - neutral style
    pillClasses = NEUTRAL_PILL_CLASSES;
  }

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
      className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-md transition-all ${pillClasses}`}
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
      <div className="text-center py-12 text-white/70">
        <div className="animate-spin text-4xl">✨</div>
        <p className="mt-2">Loading BAE Profiles...</p>
      </div>
    );
  }

  if (!currentProfile && allProfiles.length === 0) {
    return (
      <div className="text-center py-12 text-white/70">
        <p className="font-semibold">No profiles available yet. Be the first to add interests!</p>
      </div>
    );
  }

  const sharedInterests = currentProfile?.interests?.filter((i: string) => 
    userInterests.some(userInt => userInt.toLowerCase() === i.toLowerCase())
  ) || [];
  const sharedCount = sharedInterests.length;

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
              <h4 className="text-xl font-bold text-white/90">
                {currentProfile.displayName || 'Anonymous'} • {currentProfile.location || 'The Cosmos'}
              </h4>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {currentProfile.interests?.map((interest: string) => (
                <ExplorerInterestPill
                  key={interest}
                  interest={interest}
                  isAlreadyAdded={userInterests.some(i => i.toLowerCase() === interest.toLowerCase())}
                  isShared={sharedInterests.some(i => i.toLowerCase() === interest.toLowerCase())} 
                  onAdd={onAddInterest}
                />
              ))}
            </div>

            {sharedCount > 0 && (
              <p className="text-sm font-semibold mb-4 text-yellow-300 drop-shadow-md">
                <Star size={14} className="inline-block mr-1 align-text-bottom animate-ping-slow" fill="#FDE047" stroke="#CA8A04"/>
                {sharedCount} shared interest{sharedCount > 1 ? 's' : ''} found!
              </p>
            )}

            <motion.button
              onClick={showNextProfile}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/20 text-white/90 font-bold shadow-lg hover:shadow-xl hover:bg-white/30 transition-all border border-white/10"
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
          { 
            displayName: displayName,
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
            displayName: displayName,
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <p className="text-xl font-black text-white/90 animate-pulse">
          Initializing BAE...
        </p>
      </div>
    );
  }

  const canBae = interests.length >= MIN_REQUIRED;
  const requiredRemaining = Math.max(MIN_REQUIRED - interests.length, 0);

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] px-5 py-10 text-white flex flex-col items-center overflow-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px] backdrop-blur-md bg-black/50 border-b border-fuchsia-500/20 text-white">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]">
          BAE
        </div>
        <div className="flex gap-4 text-white/80 text-sm">
          <a href="/" className="hover:text-white transition-colors">Home</a>
          <span className="font-bold text-white/90">{displayName}</span>
        </div>
      </header>

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-black px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-3">
              <CheckCircle size={32} className="animate-bounce" />
              <div>
                <p className="text-2xl font-black">You're Ready to BAE! 🎉</p>
                <p className="text-sm opacity-90">Keep adding more for better matches</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto pt-2">
        
        {/* Title Section */}
        <div className="text-center mb-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,160,255,0.4)] mb-2"
          >
            Your Interests Profile
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg sm:text-xl font-semibold text-white/70 max-w-2xl mx-auto px-4 drop-shadow-md"
          >
            {MAIN_INSTRUCTION_COPY}
          </motion.p>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-8">
          
          {/* Left Column - Your Interests */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white/90 mb-5 text-center">
              What You're Really Into
            </h3>

            {interests.length === 0 && (
              <p className="text-sm italic opacity-50 text-center text-white/70 mb-4">
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

            <p className="text-center text-sm text-white/70 font-semibold mb-4">
              You've added {interests.length} interest{interests.length !== 1 ? 's' : ''}
            </p>

            {/* Input Section - Moved here! */}
            <div className="flex w-full gap-3 mb-4">
              <input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                placeholder="Add Your Interests Here!"
                className="flex-1 px-5 py-3 rounded-full bg-white/10 backdrop-blur-md ring-2 ring-fuchsia-500/50 shadow-inner focus:outline-none focus:ring-fuchsia-400 focus:ring-2 text-white placeholder-white/50 text-sm font-medium transition-all"
                maxLength={40}
              />
              <motion.button
                onClick={handleAddInterest}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                disabled={!newInterest.trim()}
                className="px-5 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add
              </motion.button>
            </div>

            {/* Warning Message - Moved here too! */}
            <AnimatePresence>
              {minInterestWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-red-900/50 text-red-300 border-2 border-red-500/70 px-4 py-2.5 rounded-xl text-xs font-bold text-center shadow-md"
                >
                  <XCircle size={14} className="inline-block mr-1.5 align-text-bottom" />
                  Add at least {MIN_REQUIRED} interests to unlock matching
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Column - Get Inspired */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white/90 mb-2 text-center">
              ✨ Get Inspired
            </h3>
            <p className="text-base font-semibold text-white/70 mb-6 text-center">
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

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex justify-center w-full"
        >
          <motion.button
            onClick={handleGoBAE}
            whileHover={{ scale: canBae ? 1.045 : 1 }}
            whileTap={{ scale: canBae ? 0.97 : 1 }}
            disabled={!canBae}
            className={`relative flex items-center justify-center gap-2 px-10 sm:px-14 py-5 sm:py-6 rounded-full text-white text-xl sm:text-2xl font-black shadow-lg transition-all ${
              canBae 
                ? 'bg-gradient-to-r from-[#FF6F91] to-[#FF9B85] hover:shadow-[0_10px_30px_rgba(255,100,150,0.6)]' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
            style={canBae ? { boxShadow: "0 10px 30px rgba(255, 65, 108, 0.4)" } : {}}
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