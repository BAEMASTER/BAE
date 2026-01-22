'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import LoginModal from '@/components/LoginModal';

// --- BAE BRAND ---
const BAE_GRADIENT = "bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent";

// --- PILL STYLES ---
const GOLD_PILL = 'text-black bg-gradient-to-r from-yellow-300 to-yellow-500 border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.8)] font-bold';
const NEUTRAL_PILL = 'text-white bg-white/10 border border-white/20 backdrop-blur-md hover:bg-white/20 hover:border-white/40 font-semibold';

// --- SOUND EFFECT ---
const playSound = (freqs: number[]) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freqs[0], audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqs[1], audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  } catch {}
};

function InterestPill({
  interest,
  isAdded,
  isShared,
  onToggle,
}: {
  interest: string;
  isAdded: boolean;
  isShared: boolean;
  onToggle: (i: string) => void;
}) {
  const classes = isShared && isAdded
    ? 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-black font-bold border border-yellow-200' 
    : isAdded
    ? 'bg-white/40 text-black border-white/40 font-bold'
    : isShared
    ? 'text-black bg-gradient-to-r from-yellow-300 to-yellow-400 border border-yellow-200 font-bold' 
    : 'text-white bg-white/10 border border-white/20 font-semibold hover:bg-white/20 hover:border-white/40';

  return (
    <button
      onClick={() => onToggle(interest)}
      className={`relative px-5 py-2 rounded-full text-sm transition-all duration-200 cursor-pointer ${classes}`}
    >
      {interest} {isAdded ? '✓' : '+'}
    </button>
  );
}

// --- MAIN PAGE ---
export default function ExplorerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [unseenProfiles, setUnseenProfiles] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newInterest, setNewInterest] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (!u) { 
        setLoading(false); 
        return; 
      }

      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setDisplayName(data?.displayName || 'Mystery BAE');
        setUserInterests(data?.interests || []);
      }

      const snapshot = await getDocs(collection(db, 'users'));
      const profiles = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((p: any) => p.id !== u.uid && Array.isArray(p.interests) && p.interests.length > 0);
      setAllProfiles(profiles);
      setUnseenProfiles(profiles);
      if (profiles.length) {
        const idx = Math.floor(Math.random() * profiles.length);
        setCurrentProfile(profiles[idx]);
        setUnseenProfiles(profiles.filter((_, i) => i !== idx));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showNextProfile = () => {
    let pool = unseenProfiles.length === 0 ? allProfiles.filter(p => p.id !== currentProfile?.id) : unseenProfiles;
    if (!pool.length) return;
    const idx = Math.floor(Math.random() * pool.length);
    setCurrentProfile(pool[idx]);
    setUnseenProfiles(pool.filter((_, i) => i !== idx));
  };

  const handleLoginSuccess = () => {
    if (userInterests.length < 3) {
      router.push('/profile');
    }
  };

  const handleBAEClick = () => {
    if (userInterests.length < 3) {
      return;
    }
    router.push('/match');
  };

  const handleToggleInterest = async (interest: string) => {
    const exists = userInterests.some(i => i.toLowerCase() === interest.toLowerCase());
    const newInterests = exists ? userInterests.filter(i => i.toLowerCase() !== interest.toLowerCase()) : [...userInterests, interest];
    exists ? playSound([330, 110]) : playSound([440, 880]);
    setUserInterests(newInterests);
    if (user) await setDoc(doc(db, 'users', user.uid), { interests: newInterests }, { merge: true });
  };

  const handleDeleteInterest = async (interest: string) => {
    const newInterests = userInterests.filter(i => i.toLowerCase() !== interest.toLowerCase());
    setUserInterests(newInterests);
    playSound([330, 110]);
    if (user) await setDoc(doc(db, 'users', user.uid), { interests: newInterests }, { merge: true });
  };

  const handleAddInterest = async () => {
    const trimmed = newInterest.trim();
    if (!trimmed || userInterests.some(i => i.toLowerCase() === trimmed.toLowerCase())) return;
    const newInterests = [...userInterests, trimmed];
    setUserInterests(newInterests);
    setNewInterest('');
    playSound([440, 880]);
    if (user) await setDoc(doc(db, 'users', user.uid), { interests: newInterests }, { merge: true });
  };

  if (loading) return <div className="h-screen bg-[#1A0033] flex items-center justify-center text-white font-black text-2xl">IGNITING...</div>;

  // GATED FOR NON-LOGGED-IN USERS
  if (!user) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white overflow-y-auto flex flex-col font-sans">
        {/* Background aura */}
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/20 blur-[140px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[140px] animate-pulse-reverse"></div>
        </div>

        {/* Blurred content area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 blur-md pointer-events-none opacity-50">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-6xl font-black mb-3">
                Interest <span className={BAE_GRADIENT}>Explorer</span>
              </h1>
              <div className="text-xl sm:text-2xl font-bold leading-snug space-y-2">
                <p className="text-white/95"><span className={BAE_GRADIENT}>Expand your interests</span> by seeing what others love</p>
                <p className="text-white/90"><span className={BAE_GRADIENT}>Tap an interest</span> to add it to your profile</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-300 to-pink-400 text-white shadow-[0_0_25px_rgba(255,160,255,0.7)] border-2 border-white/30 flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-extrabold">0</span>
                <span className="text-sm font-semibold mt-1">Interests</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Modal - Shows immediately for non-logged-in users */}
        <LoginModal
          isOpen={true}
          onClose={() => {/* User stays on page until they sign in */}}
          auth={auth}
          onLoginSuccess={handleLoginSuccess}
        />
      </main>
    );
  }

  // FULL EXPLORER FOR LOGGED-IN USERS
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white overflow-y-auto flex flex-col font-sans">

      {/* Background aura */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/20 blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[140px] animate-pulse-reverse"></div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2">

        {/* Headline + Orb */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl sm:text-6xl font-black mb-3">
              Interest <span className={BAE_GRADIENT}>Explorer</span>
            </h1>
            <div className="text-xl sm:text-2xl font-bold leading-snug space-y-2">
              <p className="text-white/95"><span className={BAE_GRADIENT}>Expand your interests</span> by seeing what others love</p>
              <p className="text-white/90"><span className={BAE_GRADIENT}>Tap an interest</span> to add it to your profile</p>
            </div>
          </div>

          {/* Orb */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setDrawerOpen(true)}
              className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-300 to-pink-400 text-white shadow-[0_0_25px_rgba(255,160,255,0.7)] border-2 border-white/30 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300"
            >
              <span className="text-5xl font-extrabold">{userInterests.length}</span>
              <span className="text-sm font-semibold mt-1">Interests</span>
            </button>
            <span className="text-xs mt-2 text-white/70">tap to view/edit</span>
          </div>
        </div>

        {currentProfile && (
          <motion.div 
            key={currentProfile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 p-8 flex flex-col max-h-[55vh] shadow-2xl relative overflow-hidden"
          >
            {/* Profile Info */}
            <div className="flex flex-col gap-2 mb-6 border-b border-white/10 pb-6 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(255,160,255,0.6)]">
                  {currentProfile.displayName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    {currentProfile.displayName || 'Anonymous'}
                  </h2>
                  <span className="text-sm sm:text-base text-white/70">
                    {currentProfile.location || 'Unknown Location'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
              <div className="flex flex-wrap gap-3">
                {currentProfile.interests.map((i: string) => (
                  <InterestPill 
                    key={i} 
                    interest={i} 
                    isAdded={userInterests.some(ui => ui.toLowerCase() === i.toLowerCase())}
                    isShared={userInterests.some(ui => ui.toLowerCase() === i.toLowerCase())}
                    onToggle={handleToggleInterest} 
                  />
                ))}
              </div>
            </div>

            {/* Shared Count */}
            {(() => {
              const sharedCount = currentProfile.interests.filter((i: string) => 
                userInterests.some(ui => ui.toLowerCase() === i.toLowerCase())
              ).length;
              return sharedCount > 0 ? (
                <div className="text-center mb-4 shrink-0">
                  <span className="inline-flex items-center gap-2 text-yellow-300 font-bold text-lg">
                    ⭐ {sharedCount} shared interest{sharedCount > 1 ? 's' : ''}!
                  </span>
                </div>
              ) : null;
            })()}

            {/* Next Button */}
            <div className="pt-2 flex justify-center shrink-0">
              <motion.button 
                onClick={showNextProfile}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-14 py-4 text-xl font-black rounded-full shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
              >
                Next Profile
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* BAE BUTTON - Bottom of page - centered capsule */}
      <div className="flex justify-center w-full py-8">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          whileHover={userInterests.length >= 3 ? { scale: 1.05 } : {}}
          whileTap={userInterests.length >= 3 ? { scale: 0.95 } : {}}
          onClick={handleBAEClick}
          disabled={userInterests.length < 3}
          className={`px-16 py-5 rounded-full font-black text-white text-xl shadow-lg transition-all ${
            userInterests.length >= 3 
              ? 'bg-gradient-to-r from-[#FF6F91] to-[#FF9B85] cursor-pointer hover:shadow-[0_15px_40px_rgba(255,65,108,0.6)]' 
              : 'bg-gray-500/50 cursor-not-allowed opacity-60'
          }`}
        >
          {userInterests.length >= 3 ? 'BAE SOMEONE NOW!' : `Need ${Math.max(3 - userInterests.length, 0)} More Interest${3 - userInterests.length !== 1 ? 's' : ''}`}
        </motion.button>
      </div>

      {/* Interest Collection Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
          >
            <div className="absolute inset-0" onClick={() => setDrawerOpen(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#1A0033]/95 border border-white/20 rounded-[32px] p-10 shadow-2xl overflow-hidden"
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-6 right-6 p-2 flex items-center justify-center hover:scale-110 transition-all z-[110]"
              >
                <X 
                  size={32} 
                  strokeWidth={2.5} 
                  className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                />
              </button>

              <h3 className="text-xl font-bold text-white mb-6 text-center tracking-tight uppercase tracking-widest">Your Interests</h3>

              <div className="flex gap-2 mb-8">
                <input
                  type="text"
                  placeholder="Add new interest…"
                  className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-yellow-400/50 text-sm transition-all"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                />
                <button
                  onClick={handleAddInterest}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-500 transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {userInterests.length === 0 && (
                  <p className="text-white/30 text-sm italic py-6 text-center w-full">No interests yet.</p>
                )}
                {userInterests.map((i) => (
                  <button
                    key={i}
                    onClick={() => handleDeleteInterest(i)}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-black bg-gradient-to-r from-yellow-300 to-yellow-400 border border-yellow-200 flex items-center gap-2 hover:brightness-125 transition-all active:scale-95"
                  >
                    {i}
                    <span className="opacity-40">✕</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}