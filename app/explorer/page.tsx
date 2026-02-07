'use client';

import AgeGateWrapper from '@/components/AgeGateWrapper';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Heart } from 'lucide-react';
import { parseSavedProfiles, savedProfileUids, toggleSavedProfile, SavedProfile } from '@/lib/savedProfiles';

// --- BAE BRAND ---
const BAE_GRADIENT = "bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent";

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

// --- VIBE GLOW ---
function getVibeGlow(sharedCount: number): { boxShadow: string; borderClass: string; pulse: boolean } {
  if (sharedCount === 0) return { boxShadow: 'none', borderClass: 'border-white/10', pulse: false };
  if (sharedCount <= 2) return {
    boxShadow: '0 0 15px rgba(253,224,71,0.15), 0 0 8px rgba(253,224,71,0.08)',
    borderClass: 'border-yellow-300/20',
    pulse: false,
  };
  if (sharedCount <= 4) return {
    boxShadow: '0 0 25px rgba(253,224,71,0.3), 0 0 12px rgba(253,224,71,0.2)',
    borderClass: 'border-yellow-300/30',
    pulse: false,
  };
  return {
    boxShadow: '0 0 40px rgba(253,224,71,0.45), 0 0 20px rgba(253,224,71,0.35), 0 0 8px rgba(253,224,71,0.25)',
    borderClass: 'border-yellow-300/40',
    pulse: true,
  };
}

// --- INTEREST PILL ---
function InterestPill({
  interest,
  isPreExisting,
  isTeleported,
  onTeleport,
  onUndoTeleport,
}: {
  interest: string;
  isPreExisting: boolean;
  isTeleported: boolean;
  onTeleport: (i: string) => void;
  onUndoTeleport: (i: string) => void;
}) {
  if (isPreExisting) {
    return (
      <motion.div
        layout
        className="relative px-5 py-2 rounded-full text-sm bg-gradient-to-r from-yellow-300 to-yellow-400 text-black font-bold border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.4)]"
      >
        {interest}
      </motion.div>
    );
  }

  if (isTeleported) {
    return (
      <motion.div layout className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0.7 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-yellow-300/40 blur-sm pointer-events-none"
        />
        <motion.button
          initial={{ scale: 1.12, boxShadow: '0 0 28px rgba(253,224,71,0.9)' }}
          animate={{ scale: 1, boxShadow: '0 0 12px rgba(253,224,71,0.4)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => onUndoTeleport(interest)}
          className="relative px-5 py-2 rounded-full text-sm bg-gradient-to-r from-yellow-300 to-yellow-400 text-black font-bold border border-yellow-200 cursor-pointer"
        >
          {interest}
          <span className="ml-1.5 text-black/30">✕</span>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.05, borderColor: 'rgba(253,224,71,0.4)' }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onTeleport(interest)}
      className="relative px-5 py-2 rounded-full text-sm text-white bg-white/10 border border-white/20 font-semibold cursor-pointer transition-colors duration-200 hover:bg-white/15"
    >
      {interest}
      <span className="ml-1.5 text-white/30">+</span>
    </motion.button>
  );
}

// --- SEARCH BAR ---
function SearchBar({ query, onChange }: { query: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
      <input
        type="text"
        placeholder="Explore people into..."
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-10 py-3.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 text-sm transition-all"
      />
      {query && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2"
        >
          <X size={16} strokeWidth={1.5} className="text-black/60 hover:text-pink-300 transition-colors" />
        </button>
      )}
    </div>
  );
}

// --- VIBE GLOW CARD ---
function VibeGlowCard({
  profile,
  index,
  userInterests,
  baselineInterests,
  teleportedMap,
  onTeleport,
  onUndoTeleport,
  isSaved,
  onToggleSave,
  saveSource,
}: {
  profile: any;
  index: number;
  userInterests: string[];
  baselineInterests: Set<string>;
  teleportedMap: Map<string, string>;
  onTeleport: (interest: string, cardId: string) => void;
  onUndoTeleport: (interest: string, cardId: string) => void;
  isSaved: boolean;
  onToggleSave: () => void;
  saveSource?: 'match' | 'explorer';
}) {
  const sharedCount = profile.interests.filter((i: string) =>
    userInterests.some(ui => ui.toLowerCase() === i.toLowerCase())
  ).length;

  const { boxShadow, borderClass, pulse } = getVibeGlow(sharedCount);

  const location = profile.location
    || [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
    || 'Unknown Location';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, boxShadow }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-white/5 backdrop-blur-3xl rounded-3xl border ${borderClass} p-6 flex flex-col transition-shadow duration-[600ms]`}
      style={{ boxShadow }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center text-xl font-black text-white shrink-0">
          {profile.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-white truncate">{profile.displayName || 'Anonymous'}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50 truncate">{location}</span>
            {saveSource === 'match' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-400/20 text-pink-300 whitespace-nowrap">
                Met on video
              </span>
            )}
            {saveSource === 'explorer' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300/90 whitespace-nowrap">
                Found exploring
              </span>
            )}
          </div>
        </div>
        {sharedCount > 0 && (
          <span className="text-yellow-300 font-bold text-sm whitespace-nowrap shrink-0">
            {sharedCount} shared
          </span>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          className="shrink-0 cursor-pointer p-1"
        >
          <motion.div
            animate={isSaved ? { scale: [1.3, 1] } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              className={isSaved ? 'text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]' : 'text-black/60 hover:text-pink-300 transition-colors'}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Interests */}
      <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[200px] sm:max-h-[250px]">
        <div className="flex flex-wrap gap-2">
          {profile.interests.map((interest: string) => {
            const lower = interest.toLowerCase();
            const isTeleportedOnThisCard = teleportedMap.get(lower) === profile.id;
            const isPreExisting = baselineInterests.has(lower)
              || (userInterests.some(ui => ui.toLowerCase() === lower) && !isTeleportedOnThisCard);

            return (
              <InterestPill
                key={interest}
                interest={interest}
                isPreExisting={isPreExisting}
                isTeleported={isTeleportedOnThisCard}
                onTeleport={(i) => onTeleport(i, profile.id)}
                onUndoTeleport={(i) => onUndoTeleport(i, profile.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Breathing pulse for 5+ shared */}
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 40px rgba(253,224,71,0.25)',
              '0 0 60px rgba(253,224,71,0.45)',
              '0 0 40px rgba(253,224,71,0.25)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}

// --- INTEREST DRAWER ---
function InterestDrawer({
  open,
  onClose,
  userInterests,
  newInterest,
  onNewInterestChange,
  onAdd,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  userInterests: string[];
  newInterest: string;
  onNewInterestChange: (v: string) => void;
  onAdd: () => void;
  onDelete: (i: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl bg-gradient-to-br from-[#2A0845] via-[#4D004D] to-[#1A0033] backdrop-blur-3xl border border-yellow-300/20 rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(253,224,71,0.1),0_0_80px_rgba(168,85,247,0.15)] overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-4 z-50 text-white text-2xl font-light w-10 h-10 flex items-center justify-center hover:text-yellow-300 transition-colors"
            >
              ✕
            </button>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-6 text-center">
              Your <span className={BAE_GRADIENT}>Interests</span>
            </h3>

            {/* Add input */}
            <div className="flex gap-2 mb-8">
              <input
                type="text"
                placeholder="Add new interest..."
                className="flex-1 px-5 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300/40 text-sm transition-all"
                value={newInterest}
                onChange={(e) => onNewInterestChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAdd()}
              />
              <button
                onClick={onAdd}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-yellow-300 to-pink-400 text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                Add
              </button>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {userInterests.length === 0 && (
                <p className="text-white/30 text-sm italic py-6 text-center w-full">No interests yet.</p>
              )}
              <AnimatePresence>
                {userInterests.map((i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    onClick={() => onDelete(i)}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-black bg-gradient-to-r from-yellow-300 to-yellow-400 border border-yellow-200 flex items-center gap-2 hover:brightness-125 transition-all active:scale-95"
                  >
                    {i}
                    <span className="opacity-40">✕</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- MAIN PAGE CONTENT ---
function ExplorerPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newInterest, setNewInterest] = useState('');
  const [baselineInterests, setBaselineInterests] = useState<Set<string>>(new Set());
  const [teleportedMap, setTeleportedMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [savedProfilesList, setSavedProfilesList] = useState<SavedProfile[]>([]);
  const [savedProfileIds, setSavedProfileIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }

      setUser(u);

      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setDisplayName(data?.displayName || 'Mystery BAE');
        setUserInterests(data?.interests || []);
        const parsed = parseSavedProfiles(data?.savedProfiles);
        setSavedProfilesList(parsed);
        setSavedProfileIds(savedProfileUids(parsed));
      }

      const snapshot = await getDocs(collection(db, 'users'));
      const profiles = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((p: any) => p.id !== u.uid && Array.isArray(p.interests) && p.interests.length > 0);
      setAllProfiles(profiles);

      const currentInterests: string[] = snap.exists() ? (snap.data()?.interests || []) : [];
      setBaselineInterests(new Set(currentInterests.map(s => s.toLowerCase())));
      setTeleportedMap(new Map());
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredProfiles = useMemo(() => {
    let profiles = allProfiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      profiles = profiles.filter((p: any) =>
        p.interests.some((i: string) => i.toLowerCase().includes(q))
      );
    }
    if (showSaved) {
      profiles = profiles.filter((p: any) => savedProfileIds.has(p.id));
    }
    return profiles;
  }, [allProfiles, searchQuery, showSaved, savedProfileIds]);

  const handleToggleSave = async (profileId: string) => {
    const next = toggleSavedProfile(savedProfilesList, profileId, 'explorer');
    setSavedProfilesList(next);
    setSavedProfileIds(savedProfileUids(next));
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { savedProfiles: next }, { merge: true });
    }
  };

  const handleBAEClick = () => {
    if (userInterests.length < 3) return;
    router.push('/match');
  };

  const handleTeleport = async (interest: string, cardId: string) => {
    if (userInterests.some(i => i.toLowerCase() === interest.toLowerCase())) return;
    const newInterests = [...userInterests, interest];
    playSound([440, 880]);
    setUserInterests(newInterests);
    setTeleportedMap(prev => {
      const next = new Map(prev);
      next.set(interest.toLowerCase(), cardId);
      return next;
    });
    if (user) await setDoc(doc(db, 'users', user.uid), { interests: newInterests }, { merge: true });
  };

  const handleUndoTeleport = async (interest: string, cardId: string) => {
    const newInterests = userInterests.filter(i => i.toLowerCase() !== interest.toLowerCase());
    playSound([330, 110]);
    setUserInterests(newInterests);
    setTeleportedMap(prev => {
      const next = new Map(prev);
      next.delete(interest.toLowerCase());
      return next;
    });
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
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    const newInterests = [...userInterests, normalized];
    setUserInterests(newInterests);
    setNewInterest('');
    playSound([440, 880]);
    if (user) await setDoc(doc(db, 'users', user.uid), { interests: newInterests }, { merge: true });
  };

  if (loading) return (
    <div className="h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-3xl font-black bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent"
      >
        Exploring...
      </motion.div>
    </div>
  );

  if (!user) return null;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white overflow-y-auto flex flex-col font-sans">

      {/* Background aura */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/20 blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[140px] animate-pulse-reverse"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-2">
              Interest <span className={BAE_GRADIENT}>Explorer</span>
            </h1>
            <p className="text-base sm:text-lg text-white/70 font-medium">
              <span className={BAE_GRADIENT}>Tap any interest</span> to add it to your profile
            </p>
          </div>

          {/* Orb */}
          <div className="flex flex-col items-center shrink-0">
            <motion.button
              key={userInterests.length}
              initial={{ scale: 1.1, boxShadow: '0 0 40px rgba(253,224,71,0.6)' }}
              animate={{ scale: 1, boxShadow: '0 0 25px rgba(255,160,255,0.7)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              onClick={() => setDrawerOpen(true)}
              className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-yellow-300 to-pink-400 text-white border-2 border-white/30 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300"
            >
              <span className="text-3xl sm:text-5xl font-extrabold">{userInterests.length}</span>
              <span className="text-[10px] sm:text-sm font-semibold">Interests</span>
            </motion.button>
            <span className="text-xs mt-1.5 text-white/50">tap to edit</span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar query={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Result count + toggle */}
        <div className="mb-4 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
          <div className="text-sm text-white/50">
            {searchQuery.trim() ? (
              <span>{filteredProfiles.length} explorer{filteredProfiles.length !== 1 ? 's' : ''} into &apos;{searchQuery.trim()}&apos;</span>
            ) : (
              <span>{filteredProfiles.length} explorer{filteredProfiles.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaved(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white transition-all ${
                !showSaved ? 'ring-1 ring-yellow-300/60 shadow-[0_0_8px_rgba(253,224,71,0.3)]' : 'hover:bg-white/15'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setShowSaved(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white transition-all flex items-center gap-1.5 ${
                showSaved ? 'ring-1 ring-yellow-300/60 shadow-[0_0_8px_rgba(253,224,71,0.3)]' : 'hover:bg-white/15'
              }`}
            >
              Saved
              {savedProfileIds.size > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-400/20 text-pink-200 font-bold">
                  {savedProfileIds.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1">
          {filteredProfiles.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full text-center py-16"
            >
              {showSaved ? (
                <>
                  <Heart size={48} className="mx-auto mb-4 text-white/20" />
                  <h2 className="text-xl font-bold text-white/80 mb-2">No saved profiles yet</h2>
                  <p className="text-white/40">Heart a profile to save it here</p>
                </>
              ) : searchQuery.trim() ? (
                <>
                  <div className="text-5xl mb-4 opacity-60">~</div>
                  <h2 className="text-xl font-bold text-white/80 mb-2">No explorers found into &apos;{searchQuery.trim()}&apos;</h2>
                  <p className="text-white/40">Try a different interest</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-6 opacity-80">~</div>
                  <h2 className="text-2xl font-bold text-white/90 mb-3">The universe is quiet</h2>
                  <p className="text-white/50 text-lg">No other explorers yet. You&apos;re early — share BAE and watch this space come alive.</p>
                </>
              )}
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProfiles.map((profile: any, index: number) => (
                <VibeGlowCard
                  key={profile.id}
                  profile={profile}
                  index={index}
                  userInterests={userInterests}
                  baselineInterests={baselineInterests}
                  teleportedMap={teleportedMap}
                  onTeleport={handleTeleport}
                  onUndoTeleport={handleUndoTeleport}
                  isSaved={savedProfileIds.has(profile.id)}
                  onToggleSave={() => handleToggleSave(profile.id)}
                  saveSource={showSaved ? savedProfilesList.find(sp => sp.uid === profile.id)?.source : undefined}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BAE BUTTON */}
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
      </div>

      {/* Interest Drawer */}
      <InterestDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userInterests={userInterests}
        newInterest={newInterest}
        onNewInterestChange={setNewInterest}
        onAdd={handleAddInterest}
        onDelete={handleDeleteInterest}
      />
    </main>
  );
}

// --- EXPORT WITH AGE GATE WRAPPER ---
export default function ExplorerPage() {
  return (
    <AgeGateWrapper>
      <ExplorerPageContent />
    </AgeGateWrapper>
  );
}
