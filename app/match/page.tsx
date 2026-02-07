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
import { parseInterests, interestNames, createInterest, addInterests as addStructuredInterests, StructuredInterest } from '@/lib/structuredInterests';

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

// --- WAITING MESSAGES ---
const WAITING_MESSAGES = [
  'Finding someone new...',
  'Connecting you with a fellow human...',
  'Scanning the BAE universe...',
  'Your next conversation is loading...',
  'Someone interesting is on their way...',
];

// --- LOCATION HELPER ---
function formatLocation(profile: any): string {
  if (!profile?.city) return '';
  if (profile.country === 'United States' && profile.state) {
    return `${profile.city}, ${profile.state}`;
  }
  if (profile.country) return `${profile.city}, ${profile.country}`;
  return profile.city;
}

// --- VIBE METER ---
const VIBE_LEVELS = [
  { label: 'COOL', accent: '#7dd3fc', glow: '125,211,252' },
  { label: 'REAL', accent: '#6ee7b7', glow: '110,231,183' },
  { label: 'DEEP', accent: '#fcd34d', glow: '252,211,77' },
  { label: 'SUPER', accent: '#fb923c', glow: '251,146,60' },
  { label: 'MEGAVIBE', accent: '#a78bfa', glow: '167,139,250' },
];

const MAX_VISIBLE_INTERESTS = 8;

/** Sorted UID pair key for deduplication (e.g. megavibes collection) */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('_');
}

function FluidVibeOMeter({ count }: { count: number }) {
  const current = count > 0 ? VIBE_LEVELS[Math.min(count - 1, 4)] : null;
  const fillPercent = Math.min((count / 5) * 100, 100);

  if (count === 0 || !current) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Frosted glass capsule */}
      <div
        className="relative w-10 h-32 rounded-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 0 ${12 + count * 5}px rgba(${current.glow},${(0.08 + count * 0.04).toFixed(2)})
          `,
        }}
      >
        {/* Glass highlight */}
        <div
          className="absolute top-3 left-2 w-1 h-8 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(1px)' }}
        />

        {/* Thin track + fill */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 bottom-2.5 w-2 rounded-full bg-white/[0.06]">
          <motion.div
            animate={{ height: `${fillPercent}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 18 }}
            className="absolute bottom-0 w-full rounded-full"
            style={{
              background: 'linear-gradient(to top, #7dd3fc, #6ee7b7, #fcd34d, #fb923c, #a78bfa)',
              boxShadow: `0 0 6px rgba(${current.glow}, 0.3)`,
            }}
          />
        </div>

        {/* Breathing pulse at MEGAVIBE */}
        {count >= 5 && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 20px rgba(${current.glow},0.12)`,
                `0 0 35px rgba(${current.glow},0.22)`,
                `0 0 20px rgba(${current.glow},0.12)`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Level label */}
      <motion.div
        key={current.label}
        initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-3 py-1 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span
          className="text-[10px] font-medium tracking-[0.2em]"
          style={{ color: current.accent }}
        >
          {current.label}
        </span>
      </motion.div>
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
            backgroundColor: ['#FFD700', '#A78BFA', '#87CEEB', '#98FB98'][
              Math.floor(Math.random() * 4)
            ],
          }}
        />
      ))}
    </div>
  );
}

// --- MEGA VIBE SOUND ---
function playMegaVibeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Ascending major arpeggio: C5 → E5 → G5 → C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      const t = now + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });

    // High shimmer on the final note for sparkle
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.connect(sGain);
    sGain.connect(ctx.destination);
    shimmer.type = 'sine';
    const sStart = now + notes.length * 0.09;
    shimmer.frequency.setValueAtTime(2094, sStart); // C7
    sGain.gain.setValueAtTime(0, sStart);
    sGain.gain.linearRampToValueAtTime(0.06, sStart + 0.04);
    sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.5);
    shimmer.start(sStart);
    shimmer.stop(sStart + 0.5);
  } catch {}
}

// --- TAP-TO-ADD SOUND (satisfying "collected" chime) ---
function playCollectSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587, now);      // D5
    osc.frequency.setValueAtTime(880, now + 0.06); // A5
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
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
            className="text-9xl font-black text-yellow-300 drop-shadow-2xl tracking-tighter"
          >
            MEGA VIBE
          </motion.h1>
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
  const userUidRef = useRef<string | null>(null);

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
  const [megaVibePreviouslyTriggered, setMegaVibePreviouslyTriggered] = useState(false);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [waitingMsgIdx, setWaitingMsgIdx] = useState(0);
  const myProfileRef = useRef<any>(null);

  // --- SHARED INTERESTS ---
  const myInterestNames = useMemo(() => interestNames(parseInterests(myProfile?.interests)), [myProfile?.interests]);
  const theirInterestNames = useMemo(() => interestNames(parseInterests(theirProfile?.interests)), [theirProfile?.interests]);
  const sharedInterests = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    return myInterestNames.filter((i: string) =>
      theirInterestNames.some((ti: string) => ti.trim().toLowerCase() === i.trim().toLowerCase())
    );
  }, [myProfile, theirProfile, myInterestNames, theirInterestNames]);

  // --- AUTH ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }
      setUser(u);
      userUidRef.current = u.uid;

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

      // Check if this pair already had a MEGAVIBE
      try {
        const mvSnap = await getDoc(doc(db, 'megavibes', pairKey(user!.uid, partnerId)));
        setMegaVibePreviouslyTriggered(mvSnap.exists());
      } catch {
        setMegaVibePreviouslyTriggered(false);
      }

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

      // MEGAVIBE is a first-time-only discovery moment per unique pair
      if (!megaVibePreviouslyTriggered) {
        setShowTicket(true);
        playMegaVibeSound();
        setTimeout(() => setShowTicket(false), 2500);

        // Record this pair's MEGAVIBE in Firestore
        if (user && currentPartnerId) {
          const key = pairKey(user.uid, currentPartnerId);
          setDoc(doc(db, 'megavibes', key), {
            users: [user.uid, currentPartnerId].sort(),
            triggeredAt: new Date().toISOString(),
          }).catch(() => {});
          setMegaVibePreviouslyTriggered(true);
        }
      }
    } else if (sharedInterests.length > 5 && !celebratedCounts.has(sharedInterests.length)) {
      setCelebratedCounts(prev => new Set([...prev, sharedInterests.length]));
      setCurrentCelebration(sharedInterests.length);
      setTimeout(() => setCurrentCelebration(null), 1500);
    }
  }, [sharedInterests.length, isMatched, celebratedCounts, megaVibePreviouslyTriggered, user, currentPartnerId]);

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

  // --- BEFOREUNLOAD: server-side cleanup for tab close / refresh ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      const uid = userUidRef.current;
      if (!uid) return;
      // fetch with keepalive survives page unload — resets status server-side
      fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // --- WAITING MESSAGE ROTATION ---
  useEffect(() => {
    if (isMatched) return;
    const t = setInterval(() => setWaitingMsgIdx(i => (i + 1) % WAITING_MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, [isMatched]);

  // --- NEXT MATCH ---
  const handleNext = async () => {
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
        callObjectRef.current.destroy();
      } catch {}
      callObjectRef.current = null;
    }

    // Clean up old partner listener to prevent stale theirProfile updates
    if (partnerUnsubscribeRef.current) {
      partnerUnsubscribeRef.current();
      partnerUnsubscribeRef.current = null;
    }

    isMatchedRef.current = false;
    setIsMatched(false);
    setTheirProfile(null);
    setPartnerDisconnected(false);
    setCurrentPartnerId(null);
    setMegaVibePreviouslyTriggered(false);
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
    const currentStructured = parseInterests(myProfile.interests);
    const alreadyAdded = currentStructured.some(
      (i) => i.name.toLowerCase() === interest.toLowerCase()
    );

    if (alreadyAdded) {
      console.log('Interest already added:', interest);
      return;
    }

    console.log('Adding interest:', interest);
    playCollectSound();

    // Flash feedback
    const key = interest.toLowerCase();
    setJustAdded(prev => new Set([...prev, key]));
    setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n; }), 700);

    const newEntry = createInterest(interest, 'match', currentPartnerId || undefined);
    const updated = addStructuredInterests(currentStructured, [newEntry]);
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
        <Loader2 className="w-16 h-16 text-violet-500 animate-spin" />
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
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-violet-500/10 blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px]"></div>
      </div>

      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-violet-400 bg-clip-text text-transparent">
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

          {/* YOUR NAME + INTERESTS - Unified bottom overlay */}
          {myProfile && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-[52px]">
              <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3">
                {/* Name badge */}
                <div className="text-center mb-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                    <h3 className="text-sm font-bold text-white">
                      {myProfile?.displayName || 'You'}
                      {formatLocation(myProfile) && <span className="text-xs font-semibold text-white/60"> — {formatLocation(myProfile)}</span>}
                    </h3>
                  </div>
                </div>
                {/* Interest pills - horizontal scroll */}
                <div className="flex gap-1.5 overflow-x-auto interests-scroll">
                  {myInterestNames.map((interest: string) => (
                    <div
                      key={interest}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-300/15 text-amber-200 border border-amber-300/25 whitespace-nowrap flex-shrink-0"
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SHARED INTERESTS - Top of video area */}
        <AnimatePresence>
          {isMatched && sharedInterests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-[4.5rem] left-0 right-0 z-20 pointer-events-none px-4"
            >
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {(sharedInterests.length > MAX_VISIBLE_INTERESTS
                  ? sharedInterests.slice(0, MAX_VISIBLE_INTERESTS - 1)
                  : sharedInterests
                ).map((interest: string, idx: number) => (
                  <motion.div
                    key={`shared-${interest}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-3.5 py-1.5 text-black bg-yellow-300 border border-yellow-200/80 rounded-full text-xs font-bold shadow-[0_0_16px_rgba(253,224,71,0.5)]"
                  >
                    {interest}
                  </motion.div>
                ))}
                {sharedInterests.length > MAX_VISIBLE_INTERESTS && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (MAX_VISIBLE_INTERESTS - 1) * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-yellow-300/90 border border-yellow-300/20 backdrop-blur-sm"
                  >
                    +{sharedInterests.length - MAX_VISIBLE_INTERESTS + 1} more
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIBE METER - Centered between panels */}
        {isMatched && sharedInterests.length > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <FluidVibeOMeter count={sharedInterests.length} />
          </div>
        )}

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
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
              <div className="text-center px-6">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-5xl mb-4"
                >
                  ✨
                </motion.div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={waitingMsgIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-lg font-bold text-white"
                  >
                    {WAITING_MESSAGES[waitingMsgIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
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
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-full shadow-lg mx-auto"
                  >
                    Find Next Match
                    <RefreshCw size={16} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* THEIR NAME + INTERESTS - Unified bottom overlay */}
          {isMatched && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-[52px]">
              <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3">
                {/* Name + heart badge */}
                <div className="text-center mb-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {theirProfile?.displayName || '...'}
                      {formatLocation(theirProfile) && <span className="text-xs font-semibold text-white/60"> — {formatLocation(theirProfile)}</span>}
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
                {/* Interest pills - horizontal scroll */}
                {theirProfile && (
                  <div className="flex gap-1.5 overflow-x-auto interests-scroll">
                    {theirInterestNames.map((interest: string) => {
                      const isAdded = myInterestNames.some(
                        (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
                      );
                      const isFlashing = justAdded.has(interest.toLowerCase());
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
                          disabled={isAdded && !isFlashing}
                          animate={isFlashing ? { scale: [1, 1.15, 1] } : {}}
                          transition={isFlashing ? { duration: 0.4 } : {}}
                          className={`relative px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all pointer-events-auto ${
                            isFlashing
                              ? 'bg-yellow-300 text-black border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.6)]'
                              : isAdded
                                ? 'bg-amber-300/10 text-amber-200/40 border border-amber-300/15 cursor-default'
                                : 'bg-white/25 text-white border border-white/40 hover:bg-white/35 cursor-pointer'
                          }`}
                        >
                          {!isAdded && !isFlashing && <span className="text-white/40 mr-1">+</span>}
                          {interest}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center px-4 py-3 bg-black/60 backdrop-blur-sm">
        {/* End button - left */}
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

        <div className="flex-1" />

        {/* Next button - right */}
        {isMatched && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-full shadow-lg text-sm"
          >
            Next
            <RefreshCw size={14} />
          </motion.button>
        )}
      </div>
    </main>
  );
}