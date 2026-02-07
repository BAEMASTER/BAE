'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw, Heart } from 'lucide-react';
import { parseSavedProfiles, savedProfileUids, toggleSavedProfile, SavedProfile } from '@/lib/savedProfiles';

const scrollbarStyle = `
  .interests-scroll::-webkit-scrollbar {
    height: 4px;
  }
  .interests-scroll::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
    border-radius: 2px;
  }
  .interests-scroll::-webkit-scrollbar-thumb {
    background: rgba(253,224,71,0.3);
    border-radius: 2px;
  }
  .interests-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(253,224,71,0.5);
  }
`;

// --- VIBE METER ---
function FluidVibeOMeter({ count }: { count: number }) {
  const levels = ['COOL', 'REAL', 'DEEP', 'SUPER', 'MEGAVIBE'];
  const currentLevel = count > 0 ? levels[Math.min(count - 1, 4)] : null;

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center gap-3 z-15 pointer-events-none"
    >
      <div className="relative w-10 h-32 rounded-full 
        bg-white/10 backdrop-blur-xl 
        shadow-[inset_0_0_20px_rgba(255,255,255,0.08)]
        overflow-hidden border border-white/5">
        <motion.div
          animate={{ height: `${(count / 5) * 100}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="absolute bottom-0 w-full bg-gradient-to-t from-yellow-300 via-pink-400 to-fuchsia-500"
          style={{
            filter: 'blur(0.5px)',
            boxShadow: count > 0 ? `inset 0 0 ${10 + count * 3}px rgba(255,255,255,${0.2 + count * 0.05})` : 'none',
          }}
        />
      </div>
      <motion.p
        key={currentLevel}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-xs font-black text-yellow-300/90 tracking-wider"
      >
        {currentLevel}
      </motion.p>
    </motion.div>
  );
}

// --- CONFETTI ---
function Confetti() {
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: viewport.w / 2, y: viewport.h / 2, opacity: 1 }}
          animate={{
            x: viewport.w / 2 + (Math.random() - 0.5) * 400,
            y: viewport.h + 100,
            opacity: 0,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 2, ease: 'easeIn' }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98'][
              Math.floor(Math.random() * 4)
            ],
          }}
        />
      ))}
    </div>
  );
}

// --- MEGA VIBE CELEBRATION ---
function MegaVibeCelebration() {
  return (
    <>
      <Confetti />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: -100 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="text-center"
        >
          <motion.h1
            animate={{ 
              scale: [1, 1.05, 1],
              textShadow: [
                '0 0 20px rgba(253,224,71,0.5)',
                '0 0 40px rgba(253,224,71,0.8)',
                '0 0 20px rgba(253,224,71,0.5)'
              ]
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-9xl font-black text-yellow-300 drop-shadow-2xl tracking-tighter mb-4"
          >
            MEGA VIBE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white font-bold text-xl tracking-widest"
          >
            5 SHARED INTERESTS
          </motion.p>
        </motion.div>
      </motion.div>
    </>
  );
}

// --- INTEREST MILESTONE POP-OUT ---
function InterestMilestonePop({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99] pointer-events-none"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1 }}
        className="text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]"
      >
        {count} SHARED!
      </motion.div>
    </motion.div>
  );
}

// --- MAIN PAGE ---
export default function MatchPage() {
  const router = useRouter();
  const yourVideoRef = useRef<HTMLVideoElement>(null);
  const theirVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const callObjectRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const partnerUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMatchedRef = useRef(false);

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<number | null>(null);
  const [celebratedCounts, setCelebratedCounts] = useState<Set<number>>(new Set());
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [savedUids, setSavedUids] = useState<Set<string>>(new Set());
  const myProfileRef = useRef<any>(null);

  // --- SHARED INTERESTS ---
  const sharedInterests = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    return myProfile.interests.filter((i: string) =>
      theirProfile.interests.some((ti: string) => ti.trim().toLowerCase() === i.trim().toLowerCase())
    );
  }, [myProfile, theirProfile]);

  // --- AUTH ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }
      setUser(u);

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const profileData = snap.data();
          myProfileRef.current = profileData;
          setMyProfile(profileData);
          const parsed = parseSavedProfiles(profileData.savedProfiles);
          setSavedProfiles(parsed);
          setSavedUids(savedProfileUids(parsed));
        }
      } catch (e) {
        console.error('Profile load failed:', e);
      }

      setAuthReady(true);
    });

    return () => unsub();
  }, [router]);

  // --- GET CAMERA + INITIATE MATCH ---
  useEffect(() => {
    if (!authReady || !user || !myProfileRef.current) return;

    const startMatching = async () => {
      // Clean up any previous match state first
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          status: 'idle',
          currentRoomUrl: null,
          partnerId: null,
          matchedAt: null,
        });
        console.log('✅ Cleaned up previous match state');
      } catch (e) {
        console.error('Cleanup failed:', e);
      }

      // Get camera
      if (!mediaStreamRef.current) {
        try {
          mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true,
          });
          if (yourVideoRef.current) {
            yourVideoRef.current.srcObject = mediaStreamRef.current;
            yourVideoRef.current.play().catch(() => {});
          }
        } catch (err: any) {
          setError(true);
          setErrorMessage('Camera permission denied');
          return;
        }
      }

      // Call match API
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            interests: myProfileRef.current.interests,
            selectedMode: 'video',
          }),
        });

        if (!res.ok) {
          setError(true);
          setErrorMessage('Match API failed');
          return;
        }

        const data = await res.json();

        // If immediate match
        if (data.matched) {
          await joinRoom(data.roomUrl, data.partnerId);
          return;
        }

        // Otherwise, listen for match
        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          const d = snap.data();
          if (d?.status === 'matched' && d?.currentRoomUrl && d?.partnerId && !isMatchedRef.current) {
            await joinRoom(d.currentRoomUrl, d.partnerId);
          }
        });
      } catch (e) {
        setError(true);
        setErrorMessage('Match failed');
      }
    };

    startMatching();

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (partnerUnsubscribeRef.current) partnerUnsubscribeRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  // --- JOIN ROOM ---
  const joinRoom = async (url: string, partnerId: string) => {
    if (callObjectRef.current) return;

    try {
      // Get partner profile
      const pSnap = await getDoc(doc(db, 'users', partnerId));
      if (pSnap.exists()) {
        setTheirProfile(pSnap.data());

        // Subscribe to partner updates
        if (partnerUnsubscribeRef.current) partnerUnsubscribeRef.current();
        partnerUnsubscribeRef.current = onSnapshot(doc(db, 'users', partnerId), (snap) => {
          if (snap.exists()) {
            setTheirProfile(snap.data());
          }
        });
      }

      isMatchedRef.current = true;
      setIsMatched(true);
      setCurrentPartnerId(partnerId);

      // Create Daily call
      const daily = DailyIframe.createCallObject();
      callObjectRef.current = daily;

      // Helper: attach a video track to a ref
      const attachTrack = (ref: React.RefObject<HTMLVideoElement | null>, track: MediaStreamTrack, label: string) => {
        if (ref.current) {
          ref.current.srcObject = new MediaStream([track]);
          ref.current.play().catch((err: any) => {
            console.error(`Play failed for ${label}:`, err);
          });
        }
      };

      // Attach video tracks
      daily.on('track-started', ({ track, participant }: any) => {
        if (!participant || track.kind !== 'video') return;

        if (participant.local) {
          // Local track — update to Daily's managed version for consistency
          console.log('📹 Local video track from Daily');
          attachTrack(yourVideoRef, track, 'LOCAL');
        } else {
          // Remote track — attach to partner panel
          console.log('📹 Remote video track received');
          attachTrack(theirVideoRef, track, 'REMOTE');
        }
      });

      // Backup: participant-updated fires when track state changes
      // Catches cases where track-started was missed or track was replaced
      daily.on('participant-updated', ({ participant }: any) => {
        if (!participant || participant.local) return;
        const videoTrack = participant.tracks?.video?.persistentTrack || participant.tracks?.video?.track;
        if (videoTrack && videoTrack.readyState === 'live' && theirVideoRef.current) {
          // Only set if partner panel has no active video
          if (!theirVideoRef.current.srcObject ||
              !(theirVideoRef.current.srcObject as MediaStream).getVideoTracks().some(t => t.readyState === 'live')) {
            console.log('📹 Attaching remote video via participant-updated fallback');
            attachTrack(theirVideoRef, videoTrack, 'REMOTE-FALLBACK');
          }
        }
      });

      // Detect partner disconnect
      daily.on('participant-left', ({ participant }: any) => {
        if (participant && !participant.local) {
          console.log('Partner left the call');
          setPartnerDisconnected(true);
          if (theirVideoRef.current) {
            theirVideoRef.current.srcObject = null;
          }
        }
      });

      // Ensure fresh tracks before joining
      if (mediaStreamRef.current) {
        const videoTracks = mediaStreamRef.current.getVideoTracks();
        const audioTracks = mediaStreamRef.current.getAudioTracks();
        
        console.log('Video tracks active?', videoTracks.length > 0, videoTracks[0]?.enabled);
        console.log('Audio tracks active?', audioTracks.length > 0, audioTracks[0]?.enabled);
        
        // Ensure enabled
        videoTracks.forEach(t => t.enabled = true);
        audioTracks.forEach(t => t.enabled = true);
      }

      // Join with media stream
      await daily.join({
        url,
        videoSource: mediaStreamRef.current?.getVideoTracks()[0] || true,
        audioSource: mediaStreamRef.current?.getAudioTracks()[0] || true,
      });

      // Force video/audio to be published to room
      console.log('Forcing video/audio publishing to room...');
      await daily.updateInputSettings({
        video: { processor: { type: 'none' } },
        audio: { processor: { type: 'none' } },
      });

      // Explicitly unmute audio
      daily.setLocalAudio(true);
      console.log('✅ Audio enabled and unmuted');
    } catch (err: any) {
      console.error('Join room failed:', err);
      setError(true);
      setErrorMessage('Failed to join room');
    }
  };

  // --- CELEBRATION TRIGGERS ---
  useEffect(() => {
    if (!isMatched) return;

    if (sharedInterests.length >= 5 && !celebratedCounts.has(5)) {
      setCelebratedCounts(prev => new Set([...prev, 5]));
      setShowTicket(true);
      setTimeout(() => setShowTicket(false), 1500);
    } else if (sharedInterests.length > 5 && !celebratedCounts.has(sharedInterests.length)) {
      setCelebratedCounts(prev => new Set([...prev, sharedInterests.length]));
      setCurrentCelebration(sharedInterests.length);
      setTimeout(() => setCurrentCelebration(null), 1500);
    }
  }, [sharedInterests.length, isMatched, celebratedCounts]);

  // --- CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        try { callObjectRef.current.leave(); callObjectRef.current.destroy(); } catch {}
        callObjectRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
      if (partnerUnsubscribeRef.current) { partnerUnsubscribeRef.current(); partnerUnsubscribeRef.current = null; }
      if (user) {
        updateDoc(doc(db, 'users', user.uid), {
          status: 'idle', currentRoomUrl: null, partnerId: null, matchedAt: null,
        }).catch(() => {});
      }
    };
  }, [user]);

  // --- NEXT MATCH ---
  const handleNext = async () => {
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
        callObjectRef.current.destroy();
      } catch {}
      callObjectRef.current = null;
    }

    isMatchedRef.current = false;
    setIsMatched(false);
    setTheirProfile(null);
    setPartnerDisconnected(false);
    setCurrentPartnerId(null);
    setCelebratedCounts(new Set()); // Reset celebrations for new match
    if (theirVideoRef.current) {
      theirVideoRef.current.srcObject = null;
    }

    // Reset status to idle before requesting new match (Issue 6: prevent double-match)
    if (user && myProfileRef.current) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          status: 'idle',
          currentRoomUrl: null,
          partnerId: null,
          matchedAt: null,
        });

        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            interests: myProfileRef.current.interests,
            selectedMode: 'video',
          }),
        });

        const data = await res.json();
        if (data.matched) {
          await joinRoom(data.roomUrl, data.partnerId);
          return;
        }

        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          const d = snap.data();
          if (d?.status === 'matched' && d?.currentRoomUrl && d?.partnerId && !isMatchedRef.current) {
            await joinRoom(d.currentRoomUrl, d.partnerId);
          }
        });
      } catch (e) {
        setError(true);
      }
    }
  };

  // --- ADD INTEREST (TAP THEIRS) ---
  const addInterest = async (interest: string) => {
    if (!user || !myProfile) {
      console.error('No user or profile');
      return;
    }

    // Check if already added
    const alreadyAdded = myProfile.interests.some(
      (i: string) => i.toLowerCase() === interest.toLowerCase()
    );
    
    if (alreadyAdded) {
      console.log('Interest already added:', interest);
      return;
    }

    console.log('Adding interest:', interest);

    const updated = [...myProfile.interests, interest];
    const updatedProfile = { ...myProfile, interests: updated };
    myProfileRef.current = updatedProfile;
    setMyProfile(updatedProfile);

    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        interests: updated,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Interest added to Firestore:', interest);
    } catch (e) {
      console.error('❌ Failed to add interest:', e);
      // Revert on error
      setMyProfile(myProfile);
    }
  };

  // --- TOGGLE SAVE PARTNER ---
  const handleToggleSave = async () => {
    if (!user || !currentPartnerId) return;
    const next = toggleSavedProfile(savedProfiles, currentPartnerId, 'match');
    setSavedProfiles(next);
    setSavedUids(savedProfileUids(next));
    await setDoc(doc(db, 'users', user.uid), { savedProfiles: next }, { merge: true });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="text-6xl mb-6">😔</div>
          <h2 className="text-3xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-lg text-white/70 mb-8">{errorMessage}</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.location.reload()} className="px-8 py-3 bg-yellow-500 text-white font-bold rounded-full">
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex flex-col">
      <style>{scrollbarStyle}</style>

      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px]"></div>
      </div>

      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </div>
      </header>

      {/* TICKET OVERLAY */}
      <AnimatePresence>{showTicket && <MegaVibeCelebration />}</AnimatePresence>

      {/* INTEREST MILESTONE POP-OUT */}
      <AnimatePresence>{currentCelebration && <InterestMilestonePop count={currentCelebration} />}</AnimatePresence>

      {/* VIDEO GRID */}
      <div className="relative flex-1 flex overflow-hidden z-5 pt-14">
        {/* YOUR VIDEO (LEFT) */}
        <div className="relative flex-1 bg-black">
          <video
            ref={yourVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* YOUR INTERESTS - Bottom, stacked rows */}
          {myProfile && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-4">
              <div className="w-full">
                <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3 interests-scroll overflow-y-auto" style={{ maxHeight: 'calc(2 * 2.5rem + 1.5rem)' }}>
                  <div className="flex flex-wrap gap-2">
                    {myProfile.interests.map((interest: string) => (
                      <div
                        key={interest}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/25 text-white border border-white/40 whitespace-nowrap"
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* YOUR NAME */}
          <div className="absolute bottom-20 left-4 right-4 text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
              <h3 className="text-sm font-bold text-white">{myProfile?.displayName || 'You'}</h3>
            </div>
          </div>
        </div>

        {/* CENTER - SHARED INTERESTS + VIBE METER */}
        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20" style={{ paddingTop: '40px' }}>
          <AnimatePresence>
            {isMatched && sharedInterests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {sharedInterests.slice(0, 5).map((interest: string, idx: number) => (
                  <motion.div
                    key={`shared-${idx}`}
                    initial={{ opacity: 0, scale: 0, y: -30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="px-5 py-2.5 text-black bg-yellow-300 border-2 border-yellow-200 rounded-full text-sm font-bold shadow-[0_0_25px_rgba(253,224,71,0.8)]"
                  >
                    {interest}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* VIBE METER - Centered below interests */}
          {isMatched && <FluidVibeOMeter count={sharedInterests.length} />}
        </div>

        {/* THEIR VIDEO (RIGHT) */}
        <div className="relative flex-1 bg-black">
          {/* Always render video element so ref is available when track-started fires */}
          <video
            ref={theirVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!isMatched && (
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40"
            >
              <div className="text-center px-4">
                <div className="text-5xl mb-3">✨</div>
                <p className="text-lg font-bold text-white">Waiting for<br/>someone special...</p>
              </div>
            </motion.div>
          )}
          {/* Partner disconnect overlay */}
          <AnimatePresence>
            {isMatched && partnerDisconnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <div className="text-center px-4">
                  <p className="text-xl font-bold text-white mb-4">Partner disconnected</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg mx-auto"
                  >
                    Find Next Match
                    <RefreshCw size={16} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* THEIR INTERESTS - Bottom, stacked rows */}
          {isMatched && theirProfile && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-4">
              <div className="w-full">
                <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3 interests-scroll overflow-y-auto" style={{ maxHeight: 'calc(2 * 2.5rem + 1.5rem)' }}>
                  <div className="flex flex-wrap gap-2">
                    {theirProfile.interests.map((interest: string) => {
                      const isAdded = myProfile?.interests.some(
                        (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
                      );
                      return (
                        <motion.button
                          key={interest}
                          whileHover={!isAdded ? { scale: 1.08 } : {}}
                          whileTap={!isAdded ? { scale: 0.95 } : {}}
                          onClick={() => {
                            console.log('Tapped interest:', interest);
                            if (!isAdded) {
                              addInterest(interest);
                            }
                          }}
                          disabled={isAdded}
                          className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all pointer-events-auto ${
                            isAdded
                              ? 'bg-white/15 text-white/40 border border-white/20 cursor-default'
                              : 'bg-white/25 text-white border border-white/40 hover:bg-white/35 cursor-pointer'
                          }`}
                        >
                          {interest}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THEIR NAME + HEART */}
          {isMatched && (
            <div className="absolute bottom-20 left-4 right-4 text-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {theirProfile?.displayName || '...'}
                  {theirProfile?.location && <span className="text-xs font-semibold text-white/70"> • {theirProfile.location}</span>}
                </h3>
                {currentPartnerId && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleToggleSave}
                    className="pointer-events-auto cursor-pointer p-0.5"
                  >
                    <Heart
                      size={16}
                      strokeWidth={1.5}
                      className={savedUids.has(currentPartnerId)
                        ? 'text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]'
                        : 'text-white/60 hover:text-pink-300 transition-colors'}
                    />
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEXT BUTTON */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        {isMatched && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg text-sm"
          >
            Next
            <RefreshCw size={14} />
          </motion.button>
        )}
      </div>

      {/* END BUTTON */}
      <div className="absolute bottom-6 left-6 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            if (callObjectRef.current) {
              try { await callObjectRef.current.leave(); callObjectRef.current.destroy(); } catch {}
              callObjectRef.current = null;
            }
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach(t => t.stop());
              mediaStreamRef.current = null;
            }
            if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
            if (partnerUnsubscribeRef.current) { partnerUnsubscribeRef.current(); partnerUnsubscribeRef.current = null; }
            if (user) {
              await updateDoc(doc(db, 'users', user.uid), {
                status: 'idle', currentRoomUrl: null, partnerId: null, matchedAt: null,
              }).catch(() => {});
            }
            router.push('/');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg text-sm"
        >
          <X size={14} />
          End
        </motion.button>
      </div>
    </main>
  );
}