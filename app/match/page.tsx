'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw, Heart, MoreVertical, Flag, Ban } from 'lucide-react';
import { parseSavedProfiles, savedProfileUids, toggleSavedProfile, SavedProfile } from '@/lib/savedProfiles';
import { parseInterests, interestNames, createInterest, addInterests as addStructuredInterests, removeInterest as removeStructuredInterest, StructuredInterest } from '@/lib/structuredInterests';
import { formatPublicName } from '@/lib/formatName';
import { isBlockedInterest } from '@/lib/interestBlocklist';
import { Plus } from 'lucide-react';

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
  /* Desktop interest columns scrollbar */
  @media (min-width: 1024px) {
    .desk-scroll::-webkit-scrollbar {
      width: 5px;
    }
    .desk-scroll::-webkit-scrollbar-track {
      background: rgba(139,92,246,0.06);
      border-radius: 10px;
    }
    .desk-scroll::-webkit-scrollbar-thumb {
      background: rgba(253,224,71,0.25);
      border-radius: 10px;
    }
    .desk-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(253,224,71,0.45);
    }
  }
  /* Desktop overrides for partner/self video containers */
  @media (min-width: 1024px) {
    .partner-video-frame {
      height: auto !important;
      border-width: 1px !important;
      border-color: rgba(139, 92, 246, 0.3) !important;
      box-shadow:
        0 0 20px rgba(139,92,246,0.15),
        0 0 60px rgba(139,92,246,0.08),
        inset 0 0 30px rgba(0,0,0,0.3),
        0 0 0 1px rgba(253,224,71,0.06) !important;
      margin: 0 !important;
      margin-top: 0 !important;
    }
    .self-video-frame {
      position: relative !important;
      bottom: auto !important;
      right: auto !important;
      width: auto !important;
      height: auto !important;
      z-index: auto !important;
      border-radius: 1rem !important;
      border-width: 1px !important;
      border-color: rgba(139, 92, 246, 0.3) !important;
      box-shadow:
        0 0 20px rgba(139,92,246,0.15),
        0 0 60px rgba(139,92,246,0.08),
        inset 0 0 30px rgba(0,0,0,0.3),
        0 0 0 1px rgba(253,224,71,0.06) !important;
      flex: 1 1 0% !important;
    }
  }
  /* Hide Daily.co video overlay controls (PiP, enhance, etc.) */
  video::-webkit-media-controls-panel,
  video::-webkit-media-controls-overlay-play-button,
  video::-webkit-media-controls-enclosure,
  video::-webkit-media-controls {
    display: none !important;
    -webkit-appearance: none !important;
  }
  video::-webkit-media-controls-start-playback-button {
    display: none !important;
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

// --- ONBOARDING HINTS (first match only) ---
const ONBOARDING_HINTS: { text: string; arrow: 'up' | 'down'; style: React.CSSProperties }[] = [
  { text: 'More shared interests = more vibes', arrow: 'up', style: { top: '2.25rem', left: '50%', transform: 'translateX(-50%)' } },
  { text: 'Gold = you both love this', arrow: 'up', style: { top: '65%', left: '50%', transform: 'translateX(-50%)' } },
  { text: 'Tap + to add any interest to your profile', arrow: 'down', style: { bottom: '7.5rem', right: '0.75rem' } },
  { text: 'Tap \u2764\uFE0F to save this person', arrow: 'down', style: { bottom: '10rem', right: '0.75rem' } },
  { text: 'Tap to see all their interests', arrow: 'down', style: { bottom: '6rem', right: '0.75rem' } },
  { text: 'Meet someone new', arrow: 'down', style: { bottom: '3.75rem', right: '1rem' } },
];

/** Sorted UID pair key for deduplication (e.g. megavibes collection) */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join('_');
}

// --- REACTION CONSTANTS ---
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🤯', '👏', '🧠'];

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
            MEGAVIBE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-bold text-yellow-200/90 mt-3 tracking-wide"
          >
            5 Shared Interests!
          </motion.p>
        </motion.div>
      </motion.div>
    </>
  );
}

// --- REACTION CASCADE ---
function ReactionCascade({ emoji, originX, onComplete }: {
  emoji: string;
  originX: number; // viewport %
  onComplete: () => void;
}) {
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []); // ±30px gentle drift

  useEffect(() => {
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1.75 }}
      animate={{
        opacity: 0,
        x: drift,
        y: '-40vh',
        scale: 1,
      }}
      transition={{
        duration: 1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${originX}%`,
        bottom: '15vh',
        fontSize: '32px',
        filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))',
      }}
    >
      {emoji}
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
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const partnerUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMatchedRef = useRef(false);
  const matchRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userUidRef = useRef<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [celebratedCounts, setCelebratedCounts] = useState<Set<number>>(new Set());
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [savedUids, setSavedUids] = useState<Set<string>>(new Set());
  const [megaVibePreviouslyTriggered, setMegaVibePreviouslyTriggered] = useState(false);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [showPartnerDrawer, setShowPartnerDrawer] = useState(false);
  const [waitingMsgIdx, setWaitingMsgIdx] = useState(0);
  const [waitingTimedOut, setWaitingTimedOut] = useState(false);
  const myProfileRef = useRef<any>(null);
  const [onboardingNeeded, setOnboardingNeeded] = useState<boolean | null>(null); // null = unknown
  const [onboardingStep, setOnboardingStep] = useState(-1); // -1 = not started, 0-5 = showing, 6 = done
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  // --- QUICK ADD ---
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');

  // --- BLOCKLIST / NOTIFICATIONS ---
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [addNotification, setAddNotification] = useState<{ name: string; interest: string } | null>(null);

  // --- REACTIONS ---
  const [reactionCascades, setReactionCascades] = useState<Array<{ id: number; emoji: string; originX: number }>>([]);
  const reactionIdCounter = useRef(0);

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

          // Gate: redirect to profile if name or location not set
          if (!profileData.displayName?.trim() || !profileData.city?.trim() || !profileData.country?.trim()) {
            router.push('/profile');
            return;
          }

          myProfileRef.current = profileData;
          setMyProfile(profileData);
          const parsed = parseSavedProfiles(profileData.savedProfiles);
          setSavedProfiles(parsed);
          setSavedUids(savedProfileUids(parsed));
          setOnboardingNeeded(!profileData.matchOnboardingDone);
        } else {
          // No profile at all — send to profile setup
          router.push('/profile');
          return;
        }
      } catch (e) {
        console.error('Profile load failed:', e);
      }

      setAuthReady(true);
    });

    return () => unsub();
  }, [router]);

  // --- HEARTBEAT: keeps lastHeartbeat fresh so match API skips stale queue ghosts ---
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const beat = () => {
      updateDoc(doc(db, 'users', uid), {
        lastHeartbeat: new Date().toISOString(),
      }).catch(() => {});
    };
    beat(); // immediate first beat
    const id = setInterval(beat, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // --- iOS / MOBILE AUDIO UNLOCK ---
  // Mobile browsers block audio autoplay until a user gesture.
  // Any tap/click on the page will resume paused remote audio.
  useEffect(() => {
    const unlockAudio = () => {
      if (remoteAudioRef.current && remoteAudioRef.current.paused) {
        remoteAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

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
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
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
          const errBody = await res.json().catch(() => ({}));
          console.error('Match API error:', res.status, errBody);
          setError(true);
          setErrorMessage(`Match API failed (${res.status}: ${errBody.error || 'unknown'})`);
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

        // Retry poll: handles the case where both users enter the queue simultaneously
        // and neither finds the other on the first call
        clearMatchRetry();
        matchRetryRef.current = setInterval(async () => {
          if (isMatchedRef.current) { clearMatchRetry(); return; }
          try {
            const retryRes = await fetch('/api/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                interests: myProfileRef.current?.interests,
                selectedMode: 'video',
              }),
            });
            if (!retryRes.ok) return;
            const retryData = await retryRes.json();
            if (retryData.matched && !isMatchedRef.current) {
              clearMatchRetry();
              await joinRoom(retryData.roomUrl, retryData.partnerId);
            }
          } catch {}
        }, 4000);
      } catch (e) {
        setError(true);
        setErrorMessage('Match failed');
      }
    };

    startMatching();

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (partnerUnsubscribeRef.current) partnerUnsubscribeRef.current();
      clearMatchRetry();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  // --- CLEAR MATCH RETRY ---
  const clearMatchRetry = () => {
    if (matchRetryRef.current) {
      clearInterval(matchRetryRef.current);
      matchRetryRef.current = null;
    }
  };

  // --- JOIN ROOM ---
  const joinRoom = async (url: string, partnerId: string) => {
    if (callObjectRef.current) return;
    clearMatchRetry();

    try {
      // Fetch partner profile
      const pSnap = await getDoc(doc(db, 'users', partnerId));

      // Check megavibe status from user's own document (guaranteed readable,
      // unlike the megavibes collection which may be blocked by Firestore rules)
      const alreadyMegavibed = (myProfileRef.current?.megavibePairs || []).includes(partnerId);

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
      setMegaVibePreviouslyTriggered(alreadyMegavibed);

      // Create Daily call
      const daily = DailyIframe.createCallObject();
      callObjectRef.current = daily;

      // Helper: attach a video track to a <video> element
      const attachVideoTrack = (ref: React.RefObject<HTMLVideoElement | null>, track: MediaStreamTrack, label: string) => {
        if (!ref.current) return;
        ref.current.srcObject = new MediaStream([track]);
        ref.current.play().catch(() => {
          // iOS fallback: play muted first (safe for local which is always muted,
          // and for remote video-only since audio goes through a separate element)
          if (ref.current) {
            ref.current.muted = true;
            ref.current.play().catch((e) => {
              console.error(`Video play failed for ${label}:`, e);
            });
          }
        });
      };

      // Helper: play remote audio through a dedicated <audio> element
      const attachRemoteAudio = (track: MediaStreamTrack) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = new MediaStream([track]);
        console.log('🔊 Playing remote audio track');
        remoteAudioRef.current.play().catch(() => {
          console.warn('🔇 Audio autoplay blocked — will resume on next user tap');
        });
      };

      // Attach video AND audio tracks
      daily.on('track-started', ({ track, participant }: any) => {
        if (!participant) return;

        if (track.kind === 'video') {
          if (participant.local) {
            console.log('📹 Local video track from Daily');
            attachVideoTrack(yourVideoRef, track, 'LOCAL');
          } else {
            console.log('📹 Remote video track received');
            attachVideoTrack(theirVideoRef, track, 'REMOTE');
          }
        } else if (track.kind === 'audio' && !participant.local) {
          console.log('🔊 Remote audio track received');
          attachRemoteAudio(track);
        }
      });

      // Backup: participant-updated fires when track state changes
      // Catches cases where track-started was missed or track was replaced
      daily.on('participant-updated', ({ participant }: any) => {
        if (!participant || participant.local) return;

        // Video fallback
        const videoTrack = participant.tracks?.video?.persistentTrack || participant.tracks?.video?.track;
        if (videoTrack && videoTrack.readyState === 'live' && theirVideoRef.current) {
          if (!theirVideoRef.current.srcObject ||
              !(theirVideoRef.current.srcObject as MediaStream).getVideoTracks().some(t => t.readyState === 'live')) {
            console.log('📹 Attaching remote video via participant-updated fallback');
            attachVideoTrack(theirVideoRef, videoTrack, 'REMOTE-FALLBACK');
          }
        }

        // Audio fallback
        const audioTrack = participant.tracks?.audio?.persistentTrack || participant.tracks?.audio?.track;
        if (audioTrack && audioTrack.readyState === 'live') {
          const currentAudioStream = remoteAudioRef.current?.srcObject as MediaStream | null;
          if (!currentAudioStream || !currentAudioStream.getAudioTracks().some(t => t.readyState === 'live')) {
            console.log('🔊 Attaching remote audio via participant-updated fallback');
            attachRemoteAudio(audioTrack);
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

      // Receive reactions from partner
      daily.on('app-message', (event: any) => {
        const data = event?.data;
        if (data?.type === 'reaction' && !event?.fromId?.startsWith?.('local')) {
          const id = ++reactionIdCounter.current;
          setReactionCascades(prev => [...prev, {
            id,
            emoji: data.emoji,
            originX: data.originX,
          }]);
        }
        if (data?.type === 'interest-added' && !event?.fromId?.startsWith?.('local')) {
          setAddNotification({ name: data.name, interest: data.interest });
          setTimeout(() => setAddNotification(null), 2000);
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
      try {
        await daily.join({
          url,
          videoSource: mediaStreamRef.current?.getVideoTracks()[0] || true,
          audioSource: mediaStreamRef.current?.getAudioTracks()[0] || true,
        });
      } catch (joinErr) {
        // Daily join failed — reset all state so user can retry
        console.error('daily.join() failed:', joinErr);
        try { daily.destroy(); } catch {}
        callObjectRef.current = null;
        isMatchedRef.current = false;
        setIsMatched(false);
        setCurrentPartnerId(null);
        if (partnerUnsubscribeRef.current) {
          partnerUnsubscribeRef.current();
          partnerUnsubscribeRef.current = null;
        }
        setTheirProfile(null);
        setError(true);
        setErrorMessage('Failed to join video room. Please try again.');
        return;
      }

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
      // Outer catch: handles errors in profile loading, megavibe check, etc.
      console.error('Join room failed:', err);
      if (callObjectRef.current) {
        try { callObjectRef.current.destroy(); } catch {}
        callObjectRef.current = null;
      }
      isMatchedRef.current = false;
      setIsMatched(false);
      setCurrentPartnerId(null);
      if (partnerUnsubscribeRef.current) {
        partnerUnsubscribeRef.current();
        partnerUnsubscribeRef.current = null;
      }
      setTheirProfile(null);
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

        // Record this pair's MEGAVIBE on user's own document (guaranteed writable)
        if (user && currentPartnerId) {
          updateDoc(doc(db, 'users', user.uid), {
            megavibePairs: arrayUnion(currentPartnerId),
          }).catch(() => {});
          // Update local ref so subsequent matches in same session see it
          myProfileRef.current = {
            ...myProfileRef.current,
            megavibePairs: [...(myProfileRef.current?.megavibePairs || []), currentPartnerId],
          };
          setMegaVibePreviouslyTriggered(true);
        }
      }
    }
  }, [sharedInterests.length, isMatched, celebratedCounts, megaVibePreviouslyTriggered, user, currentPartnerId]);

  // --- CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      clearMatchRetry();
      if (callObjectRef.current) {
        try { callObjectRef.current.leave(); callObjectRef.current.destroy(); } catch {}
        callObjectRef.current = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
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

  // --- WAITING TIMEOUT (cold-start: no match after 30s) ---
  useEffect(() => {
    if (isMatched) { setWaitingTimedOut(false); return; }
    const t = setTimeout(() => {
      setWaitingTimedOut(true);
      clearMatchRetry(); // stop polling the match API
    }, 30_000);
    return () => clearTimeout(t);
  }, [isMatched]);

  // --- ONBOARDING HINT SEQUENCE (first match only) ---
  useEffect(() => {
    if (!isMatched || !onboardingNeeded || onboardingStep >= ONBOARDING_HINTS.length) return;

    if (onboardingStep === -1) {
      // Delay 2s after match before starting hints
      const delay = setTimeout(() => setOnboardingStep(0), 2000);
      return () => clearTimeout(delay);
    }

    // Advance to next hint after 3.5s (includes fade in/out time)
    const timer = setTimeout(() => {
      const next = onboardingStep + 1;
      setOnboardingStep(next);

      // All hints done — persist flag to Firestore
      if (next >= ONBOARDING_HINTS.length && user) {
        updateDoc(doc(db, 'users', user.uid), { matchOnboardingDone: true }).catch(() => {});
        setOnboardingNeeded(false);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isMatched, onboardingNeeded, onboardingStep, user]);

  // --- NEXT MATCH ---
  const handleNext = async () => {
    clearMatchRetry();

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

    // Clean up remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    isMatchedRef.current = false;
    setIsMatched(false);
    setWaitingTimedOut(false);
    setTheirProfile(null);
    setPartnerDisconnected(false);
    setShowPartnerDrawer(false);
    setCurrentPartnerId(null);
    setMegaVibePreviouslyTriggered(false);
    setCelebratedCounts(new Set()); // Reset celebrations for new match
    setShowMoreMenu(false);
    setShowReportModal(false);
    setBlockConfirm(false);
    setReportReason('');
    setReportDetails('');
    setReportDone(false);
    setReactionCascades([]);
    setQuickAddOpen(false);
    setQuickAddValue('');
    setAddNotification(null);
    setBlockedNotice(null);
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

        // Retry poll for simultaneous queue entry
        clearMatchRetry();
        matchRetryRef.current = setInterval(async () => {
          if (isMatchedRef.current) { clearMatchRetry(); return; }
          try {
            const retryRes = await fetch('/api/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                interests: myProfileRef.current?.interests,
                selectedMode: 'video',
              }),
            });
            if (!retryRes.ok) return;
            const retryData = await retryRes.json();
            if (retryData.matched && !isMatchedRef.current) {
              clearMatchRetry();
              await joinRoom(retryData.roomUrl, retryData.partnerId);
            }
          } catch {}
        }, 4000);
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

    // Blocklist check
    if (isBlockedInterest(interest)) {
      setBlockedNotice("That interest isn't allowed on BAE");
      setTimeout(() => setBlockedNotice(null), 2000);
      return;
    }

    console.log('Adding interest:', interest);

    // Flash feedback
    const key = interest.toLowerCase();
    setJustAdded(prev => new Set([...prev, key]));
    setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n; }), 700);

    playCollectSound();

    // Notification for both users
    const myName = formatPublicName(myProfile.displayName || 'Someone');
    setAddNotification({ name: myName, interest });
    setTimeout(() => setAddNotification(null), 2000);
    if (callObjectRef.current) {
      callObjectRef.current.sendAppMessage({ type: 'interest-added', name: myName, interest }, '*');
    }

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

  // --- QUICK ADD INTEREST ---
  const handleQuickAdd = async () => {
    const raw = quickAddValue.trim();
    if (!raw || !user || !myProfile) return;

    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    const currentStructured = parseInterests(myProfile.interests);
    const currentNames = interestNames(currentStructured);
    const toAdd: StructuredInterest[] = [];

    for (const item of items) {
      const normalized = item.charAt(0).toUpperCase() + item.slice(1);
      if (isBlockedInterest(normalized)) {
        setBlockedNotice("That interest isn't allowed on BAE");
        setTimeout(() => setBlockedNotice(null), 2000);
        setQuickAddValue('');
        return;
      }
      if (!currentNames.some(i => i.toLowerCase() === normalized.toLowerCase()) &&
          !toAdd.some(i => i.name.toLowerCase() === normalized.toLowerCase())) {
        toAdd.push(createInterest(normalized, 'profile'));
      }
    }

    if (!toAdd.length) { setQuickAddValue(''); setQuickAddOpen(false); return; }

    const updated = addStructuredInterests(currentStructured, toAdd);
    const updatedProfile = { ...myProfile, interests: updated };
    myProfileRef.current = updatedProfile;
    setMyProfile(updatedProfile);
    playCollectSound();

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        interests: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Quick-add failed:', e);
    }

    setQuickAddValue('');
    setQuickAddOpen(false);
  };

  // --- REMOVE OWN INTEREST ---
  const handleRemoveInterest = async (interest: string) => {
    if (!user || !myProfile) return;
    const currentStructured = parseInterests(myProfile.interests);
    const updated = removeStructuredInterest(currentStructured, interest);
    const updatedProfile = { ...myProfile, interests: updated };
    myProfileRef.current = updatedProfile;
    setMyProfile(updatedProfile);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        interests: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Remove interest failed:', e);
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

  // --- END CALL ---
  const handleEnd = async () => {
    clearMatchRetry();
    if (callObjectRef.current) {
      try { await callObjectRef.current.leave(); callObjectRef.current.destroy(); } catch {}
      callObjectRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
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
  };

  // --- REPORT USER ---
  const handleReport = async () => {
    if (!user || !currentPartnerId || !reportReason) return;
    setReportSubmitting(true);
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: user.uid,
          reportedId: currentPartnerId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportDone(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportDone(false);
        setReportReason('');
        setReportDetails('');
      }, 1500);
    } catch (e) {
      console.error('Report failed:', e);
    } finally {
      setReportSubmitting(false);
    }
  };

  // --- BLOCK USER ---
  const handleBlock = async () => {
    if (!user || !currentPartnerId) return;
    try {
      await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          blockedUserId: currentPartnerId,
        }),
      });
      setBlockConfirm(false);
      setShowMoreMenu(false);
      handleNext(); // immediately move to next match
    } catch (e) {
      console.error('Block failed:', e);
    }
  };

  // --- TRIGGER REACTION ---
  const triggerReaction = (emoji: string, buttonEl: HTMLElement) => {
    const rect = buttonEl.getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;

    const id = ++reactionIdCounter.current;
    setReactionCascades(prev => [...prev, { id, emoji, originX }]);

    // Send to partner (1 emoji per tap)
    if (callObjectRef.current) {
      callObjectRef.current.sendAppMessage({ type: 'reaction', emoji, originX }, '*');
    }
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
    <main className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex flex-col">
      <style>{scrollbarStyle}</style>

      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-violet-500/10 blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px]"></div>
      </div>

      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12 sm:h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 lg:justify-center lg:h-16 lg:bg-transparent lg:backdrop-blur-none lg:border-none">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-violet-400 bg-clip-text text-transparent lg:text-3xl lg:from-pink-400 lg:to-violet-400 lg:drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          BAE
        </div>
      </header>

      {/* INTEREST-ADD NOTIFICATION */}
      <AnimatePresence>
        {addNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[85] pointer-events-none"
          >
            <div
              className="px-4 py-2 rounded-full text-sm font-bold text-black whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #fde047, #fbbf24)',
                boxShadow: '0 0 20px rgba(253,224,71,0.5), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {addNotification.name} added {addNotification.interest}! ✨
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BLOCKED NOTICE TOAST */}
      <AnimatePresence>
        {blockedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full text-sm font-semibold text-red-100 bg-red-600/90 border border-red-400/30 whitespace-nowrap shadow-lg">
              {blockedNotice}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TICKET OVERLAY */}
      <AnimatePresence>{showTicket && <MegaVibeCelebration />}</AnimatePresence>

      {/* ==================== VIDEO GRID (shared structure, responsive layout) ==================== */}
      <div className="relative flex-1 flex flex-col overflow-hidden z-5 pt-14 lg:flex-none lg:h-[62vh] lg:flex-row lg:px-8 lg:pt-20 lg:pb-2 lg:gap-6">
        {/* Video area wrapper — positioning context for self-video thumbnail on mobile */}
        <div className="relative flex-1 min-h-0 flex flex-col lg:contents">
        {/* PARTNER VIDEO — flex-fills mobile, flex-1 panel on desktop */}
        <div
          className="partner-video-frame relative flex-1 min-h-0 mx-3 mt-1 rounded-2xl overflow-hidden border-[1.5px] border-[rgba(253,224,71,0.18)] shadow-[0_0_28px_rgba(253,224,71,0.08),0_4px_24px_rgba(0,0,0,0.4)] lg:order-2 lg:flex-shrink lg:mx-0 lg:mt-0 lg:bg-black"
        >
          <video
            ref={theirVideoRef}
            autoPlay
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!isMatched && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
              <AnimatePresence mode="wait">
                {!waitingTimedOut ? (
                  <motion.div
                    key="searching"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="text-center px-6"
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="timed-out"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="text-center px-8 max-w-sm"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-5xl mb-5"
                    >
                      🌱
                    </motion.div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      BAE is growing
                    </h2>
                    <p className="text-sm text-white/60 leading-relaxed mb-6">
                      No one's online right now — but the universe is expanding. Come back soon and you'll find your people.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/explorer')}
                      className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-full text-sm shadow-lg shadow-violet-500/25"
                    >
                      Explore People
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
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
        </div>

        {/* YOUR VIDEO — FaceTime thumbnail on mobile, flex-1 panel on desktop */}
        <div
          className="self-video-frame absolute z-20 bottom-4 right-6 w-[100px] h-[140px] rounded-xl overflow-hidden border-2 border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.5)] lg:order-1 lg:bg-black"
        >
          <video
            ref={yourVideoRef}
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
            className="w-full h-full object-cover lg:absolute lg:inset-0"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
        </div>

        {/* MOBILE INFO SECTION — compact, no scroll (lg:hidden) */}
        {/* pb-28 = 112px clears both the reaction bar (~48px) and bottom controls bar (~56px) */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden px-3 pt-1 pb-28 lg:hidden">
          {/* Partner info: name + heart + dots + interest pills */}
          {isMatched && theirProfile && (
            <div className="mb-2">
              {/* Name row */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-white flex-1 min-w-0 truncate">
                  {theirProfile?.displayName ? formatPublicName(theirProfile.displayName) : '...'}
                  {formatLocation(theirProfile) && <span className="text-xs font-semibold text-white/50"> — {formatLocation(theirProfile)}</span>}
                </h3>
                {currentPartnerId && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={handleToggleSave}
                    className="flex-shrink-0 p-0.5"
                  >
                    <Heart
                      size={20}
                      strokeWidth={1.5}
                      className={savedUids.has(currentPartnerId)
                        ? 'text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]'
                        : 'text-white/50 hover:text-pink-300 transition-colors'}
                    />
                  </motion.button>
                )}
                {currentPartnerId && (
                  <div className="relative flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-1 text-white/35 hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </motion.button>
                    <AnimatePresence>
                      {showMoreMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50"
                          style={{ background: 'rgba(20, 5, 40, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <button
                            onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Flag size={14} /> Report
                          </button>
                          <button
                            onClick={() => { setShowMoreMenu(false); setBlockConfirm(true); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/80 hover:text-red-400 hover:bg-white/5 transition-colors border-t border-white/5"
                          >
                            <Ban size={14} /> Block
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              {/* Partner interest pills — scrollable row with '+' badge */}
              <div className="flex gap-1.5 overflow-x-auto interests-scroll items-center">
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
                        if (!isAdded) addInterest(interest);
                      }}
                      disabled={isAdded && !isFlashing}
                      animate={isFlashing ? { scale: [1, 1.15, 1] } : {}}
                      transition={isFlashing ? { duration: 0.4 } : {}}
                      className={`relative px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                        isFlashing
                          ? 'bg-yellow-300 text-black border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.6)]'
                          : isAdded
                            ? 'bg-amber-300/10 text-amber-200/40 border border-amber-300/15 cursor-default'
                            : 'bg-yellow-300 text-black border border-yellow-200 cursor-pointer'
                      }`}
                    >
                      {interest}
                      {!isAdded && !isFlashing && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center text-[9px] font-black leading-none shadow-md">+</span>
                      )}
                    </motion.button>
                  );
                })}
                {theirInterestNames.length > 0 && (
                  <button
                    onClick={() => setShowPartnerDrawer(true)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0 bg-white/10 text-white/60 border border-white/20 hover:text-white hover:bg-white/15 transition-all"
                  >
                    See all
                  </button>
                )}
              </div>

              {/* MOBILE QUICK-ADD + YOUR INTERESTS */}
              <div className="mt-2">
                {!quickAddOpen ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuickAddOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/50 bg-white/8 border border-white/15 hover:text-white/70 hover:bg-white/12 transition-all"
                  >
                    <Plus size={12} /> Your interests
                  </motion.button>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <input
                        value={quickAddValue}
                        onChange={e => setQuickAddValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        placeholder="Add interest..."
                        autoFocus
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-full text-[12px] bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleQuickAdd}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-yellow-300 text-black"
                      >
                        Add
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setQuickAddOpen(false); setQuickAddValue(''); }}
                        className="p-1 text-white/40 hover:text-white/70"
                      >
                        <X size={14} />
                      </motion.button>
                    </div>
                    {/* Your interest pills with X to delete */}
                    <div className="flex gap-1.5 overflow-x-auto interests-scroll">
                      {myInterestNames.map((interest: string) => (
                        <div
                          key={`mob-my-${interest}`}
                          className="relative px-3 py-1.5 rounded-full text-[12px] font-semibold text-black bg-yellow-300/80 border border-yellow-200/60 whitespace-nowrap flex-shrink-0"
                        >
                          {interest}
                          <button
                            onClick={() => handleRemoveInterest(interest)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black leading-none shadow-md"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MOBILE SHARED INTERESTS — scrollable row with label + glow */}
          {isMatched && sharedInterests.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-bold text-yellow-300/70 tracking-wide uppercase mb-1.5">
                ✨ {sharedInterests.length} Shared Interest{sharedInterests.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-1.5 overflow-x-auto interests-scroll">
                {sharedInterests.map((interest: string, idx: number) => (
                  <motion.div
                    key={`m-shared-${interest}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-3 py-1.5 text-black bg-yellow-300 border border-yellow-200 rounded-full text-[12px] font-bold whitespace-nowrap flex-shrink-0"
                    style={{ boxShadow: '0 0 18px rgba(253,224,71,0.35), 0 0 6px rgba(253,224,71,0.2)' }}
                  >
                    {interest}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ONBOARDING HINTS */}
        <AnimatePresence mode="wait">
          {onboardingStep >= 0 && onboardingStep < ONBOARDING_HINTS.length && (() => {
            const hint = ONBOARDING_HINTS[onboardingStep];
            return (
              <motion.div
                key={onboardingStep}
                initial={{ opacity: 0, y: hint.arrow === 'up' ? 6 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: hint.arrow === 'up' ? 6 : -6 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute z-30 pointer-events-none flex flex-col items-center gap-1 lg:hidden"
                style={hint.style}
              >
                {hint.arrow === 'up' && (
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-amber-400/70 text-[10px] leading-none"
                  >
                    ▲
                  </motion.div>
                )}
                <div
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-medium text-white/90 whitespace-nowrap"
                  style={{
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(253,224,71,0.25)',
                    boxShadow: '0 0 12px rgba(253,224,71,0.1), 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="text-[13px]" aria-hidden>💡</span>
                  {hint.text}
                </div>
                {hint.arrow === 'down' && (
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-amber-400/70 text-[10px] leading-none"
                  >
                    ▼
                  </motion.div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* ========== DESKTOP BOTTOM SECTION (lg+ only) ========== */}
      <div className="hidden lg:flex flex-1 px-8 pt-3 pb-20 gap-8 z-10 min-h-0 overflow-hidden">
        {/* LEFT COLUMN — Your info */}
        <div className="flex-1 flex flex-col items-start min-w-0 overflow-y-auto desk-scroll">
          {myProfile && (
            <>
              <div className="rounded-xl px-4 py-2 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-sm font-bold text-amber-200">
                  {myProfile.displayName ? formatPublicName(myProfile.displayName) : 'You'}
                  {formatLocation(myProfile) && (
                    <span className="text-white/45 font-semibold"> — {formatLocation(myProfile)}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {myInterestNames.map((interest: string) => (
                  <div
                    key={`desk-my-${interest}`}
                    className="group relative px-5 py-2 rounded-full text-sm font-bold text-black bg-yellow-300 border border-yellow-200"
                  >
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black leading-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* DESKTOP QUICK-ADD */}
              {isMatched && (
                <div className="mt-3">
                  {!quickAddOpen ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuickAddOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white/50 bg-white/8 border border-white/15 hover:text-white/70 hover:bg-white/12 transition-all"
                    >
                      <Plus size={14} /> Add your own interest
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={quickAddValue}
                        onChange={e => setQuickAddValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        placeholder="Add interest..."
                        autoFocus
                        className="flex-1 min-w-0 px-4 py-2 rounded-full text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleQuickAdd}
                        className="px-4 py-2 rounded-full text-sm font-bold bg-yellow-300 text-black"
                      >
                        Add
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setQuickAddOpen(false); setQuickAddValue(''); }}
                        className="p-1.5 text-white/40 hover:text-white/70"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* CENTER COLUMN — Shared interests + vibe bar */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {isMatched && sharedInterests.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-yellow-300/70 tracking-wide uppercase mb-3">
                ✨ {sharedInterests.length} Shared Interest{sharedInterests.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-2">
                {sharedInterests.map((interest: string, idx: number) => (
                  <motion.div
                    key={`desk-shared-${interest}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-5 py-2 rounded-full text-sm font-bold text-black bg-yellow-300 border border-yellow-200"
                    style={{ boxShadow: '0 0 18px rgba(253,224,71,0.35), 0 0 6px rgba(253,224,71,0.2)' }}
                  >
                    {interest}
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN — Partner info */}
        <div className="flex-1 flex flex-col items-end min-w-0 overflow-y-auto desk-scroll">
          {isMatched && theirProfile && (
            <>
              <div className="flex items-center gap-2 rounded-xl px-4 py-2 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-sm font-bold text-amber-200">
                  {theirProfile.displayName ? formatPublicName(theirProfile.displayName) : '...'}
                  {formatLocation(theirProfile) && (
                    <span className="text-white/45 font-semibold"> — {formatLocation(theirProfile)}</span>
                  )}
                </span>
                {currentPartnerId && (
                  <motion.button whileTap={{ scale: 0.85 }} onClick={handleToggleSave} className="p-0.5">
                    <Heart
                      size={20}
                      strokeWidth={1.5}
                      className={savedUids.has(currentPartnerId)
                        ? 'text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]'
                        : 'text-white/50 hover:text-pink-300 transition-colors'}
                    />
                  </motion.button>
                )}
                {/* Desktop three-dot menu */}
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-1 text-white/35 hover:text-white transition-colors"
                  >
                    <MoreVertical size={16} />
                  </motion.button>
                  <AnimatePresence>
                    {showMoreMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50"
                        style={{ background: 'rgba(20, 5, 40, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <button
                          onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Flag size={14} /> Report
                        </button>
                        <button
                          onClick={() => { setShowMoreMenu(false); setBlockConfirm(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/80 hover:text-red-400 hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                          <Ban size={14} /> Block
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2.5">
                {theirInterestNames.map((interest: string) => {
                  const isAdded = myInterestNames.some(
                    (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
                  );
                  const isFlashing = justAdded.has(interest.toLowerCase());
                  return (
                    <motion.button
                      key={`desk-their-${interest}`}
                      whileHover={!isAdded ? { scale: 1.05 } : {}}
                      whileTap={!isAdded ? { scale: 0.95 } : {}}
                      onClick={() => { if (!isAdded) addInterest(interest); }}
                      disabled={isAdded && !isFlashing}
                      animate={isFlashing ? { scale: [1, 1.15, 1] } : {}}
                      transition={isFlashing ? { duration: 0.4 } : {}}
                      className={`relative px-5 py-2 rounded-full text-sm font-bold transition-all ${
                        isFlashing
                          ? 'bg-yellow-300 text-black border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.6)]'
                          : isAdded
                            ? 'bg-yellow-300/20 text-amber-200/40 border border-amber-300/15 cursor-default'
                            : 'bg-yellow-300 text-black border border-yellow-200 hover:bg-yellow-200 cursor-pointer'
                      }`}
                    >
                      {interest}
                      {!isAdded && !isFlashing && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center text-[9px] font-black leading-none shadow-md">+</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* REACTION CASCADE OVERLAY */}
      <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
        <AnimatePresence>
          {reactionCascades.map(c => (
            <ReactionCascade
              key={c.id}
              emoji={c.emoji}
              originX={c.originX}
              onComplete={() => setReactionCascades(prev => prev.filter(r => r.id !== c.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* REACTION BAR */}
      {isMatched && (
        <div
          className="absolute left-0 right-0 z-[35] flex justify-center pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
        >
          <div
            className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-full lg:gap-2 lg:px-4 lg:py-2"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {REACTION_EMOJIS.map(emoji => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 1.25 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                onClick={(e) => triggerReaction(emoji, e.currentTarget)}
                className="text-xl opacity-60 hover:opacity-100 active:opacity-100 transition-opacity p-1 lg:text-3xl lg:p-2"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center px-4 py-2 bg-black/60 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:px-8 lg:py-4"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
      >
        {/* End button - left */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEnd}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg text-sm lg:px-8 lg:py-3 lg:text-base lg:rounded-xl"
        >
          <X size={14} className="lg:hidden" />
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-full shadow-lg text-sm lg:px-8 lg:py-3 lg:text-base lg:rounded-xl lg:from-amber-500 lg:to-orange-500"
          >
            Next
            <RefreshCw size={14} className="lg:hidden" />
          </motion.button>
        )}
      </div>

      {/* PARTNER INTEREST DRAWER */}
      <AnimatePresence>
        {showPartnerDrawer && theirProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowPartnerDrawer(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-h-[50vh] sm:max-h-[60vh] rounded-t-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(165deg, rgba(45,10,70,0.97) 0%, rgba(26,0,51,0.98) 50%, rgba(20,5,60,0.97) 100%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderTop: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 -8px 40px rgba(88,28,135,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Handle bar — tap to close */}
              <button onClick={() => setShowPartnerDrawer(false)} className="w-full flex justify-center pt-3 pb-2 cursor-pointer">
                <div className="w-12 h-1 rounded-full bg-violet-400/40" />
              </button>

              {/* Header */}
              <div className="px-4 sm:px-5 pb-2 sm:pb-3 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                  {`${theirProfile?.displayName ? formatPublicName(theirProfile.displayName) : 'Partner'}'s Interests`}
                </h3>
                <button onClick={() => setShowPartnerDrawer(false)} className="text-violet-300/60 hover:text-white transition-colors p-2 -mr-1">
                  <X size={18} />
                </button>
              </div>

              {/* Interest grid */}
              <div
                className="px-4 sm:px-5 overflow-y-auto max-h-[calc(50vh-68px)] sm:max-h-[calc(60vh-72px)]"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
              >
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {theirInterestNames.map((interest: string) => {
                    const isShared = myInterestNames.some(
                      (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
                    );
                    const isFlashing = justAdded.has(interest.toLowerCase());
                    return (
                      <motion.button
                        key={interest}
                        whileHover={!isShared ? { scale: 1.05 } : {}}
                        whileTap={!isShared ? { scale: 0.95 } : {}}
                        onClick={() => { if (!isShared) addInterest(interest); }}
                        disabled={isShared && !isFlashing}
                        animate={isFlashing ? { scale: [1, 1.15, 1] } : {}}
                        transition={isFlashing ? { duration: 0.4 } : {}}
                        className={`px-3.5 py-1.5 sm:px-4.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                          isFlashing
                            ? 'bg-yellow-300 text-black border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.6)]'
                            : isShared
                              ? 'bg-yellow-300/15 text-yellow-300 border border-yellow-300/25 shadow-[0_0_8px_rgba(253,224,71,0.25)]'
                              : 'bg-violet-500/10 text-white/90 border border-violet-400/20 hover:bg-violet-500/20 hover:border-violet-400/30 cursor-pointer'
                        }`}
                      >
                        {!isShared && !isFlashing && <span className="text-violet-300/50 mr-1.5">+</span>}
                        {interest}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!reportSubmitting) { setShowReportModal(false); setReportReason(''); setReportDetails(''); } }} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl p-6"
              style={{
                background: 'linear-gradient(165deg, rgba(45,10,70,0.97) 0%, rgba(26,0,51,0.98) 100%)',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            >
              {reportDone ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">&#10003;</div>
                  <p className="text-white font-semibold">Report submitted</p>
                  <p className="text-white/50 text-sm mt-1">We&apos;ll review it shortly.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-white">Report User</h3>
                    <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportDetails(''); }} className="text-white/40 hover:text-white transition-colors p-1">
                      <X size={18} />
                    </button>
                  </div>

                  <label className="block text-sm text-white/60 font-medium mb-2">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-violet-400/50 mb-4"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Inappropriate content">Inappropriate content</option>
                    <option value="Underage user">Underage user</option>
                    <option value="Spam">Spam</option>
                    <option value="Other">Other</option>
                  </select>

                  <label className="block text-sm text-white/60 font-medium mb-2">Details (optional)</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Tell us more..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-violet-400/50 resize-none placeholder:text-white/20 mb-5"
                  />

                  <button
                    onClick={handleReport}
                    disabled={!reportReason || reportSubmitting}
                    className="w-full py-2.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BLOCK CONFIRMATION */}
      <AnimatePresence>
        {blockConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBlockConfirm(false)} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs rounded-2xl p-6 text-center"
              style={{
                background: 'linear-gradient(165deg, rgba(45,10,70,0.97) 0%, rgba(26,0,51,0.98) 100%)',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            >
              <Ban size={28} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Block this user?</h3>
              <p className="text-sm text-white/50 mb-5">You won&apos;t be matched with them again.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setBlockConfirm(false)}
                  className="flex-1 py-2.5 rounded-full border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlock}
                  className="flex-1 py-2.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold transition-colors"
                >
                  Block
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}