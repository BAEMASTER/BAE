'use client';

import AgeGateWrapper from '@/components/AgeGateWrapper';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw, Plus } from 'lucide-react';

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

interface UserData {
  displayName: string;
  interests: string[];
  location?: string;
}

let audioContextInstance: AudioContext | null = null;

const getAudioContext = async (): Promise<AudioContext | null> => {
  try {
    if (!audioContextInstance) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextInstance = new AudioCtx();
    }
    if (audioContextInstance.state === 'suspended') {
      await audioContextInstance.resume();
    }
    return audioContextInstance;
  } catch (e) {
    return null;
  }
};

const playVibe = async (level: number) => {
  const audioContext = await getAudioContext();
  if (!audioContext) return;
  try {
    const frequencies = [523.25, 659.25, 783.99, 987.77, 1174.66];
    const freq = frequencies[Math.min(level - 1, 4)];
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  } catch (e) {}
};

const playVibeLevel = async (level: number) => {
  const audioContext = await getAudioContext();
  if (!audioContext) return;
  try {
    const frequencies = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
    const freq = frequencies[Math.min(level - 1, 3)];
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.3);
  } catch (e) {}
};

const playMegaVibeFanfare = async () => {
  const audioContext = await getAudioContext();
  if (!audioContext) return;
  try {
    const notes = [
      { freq: 523.25, start: 0, duration: 0.15 },
      { freq: 659.25, start: 0.15, duration: 0.15 },
      { freq: 783.99, start: 0.3, duration: 0.15 },
      { freq: 1046.5, start: 0.45, duration: 0.2 },
      { freq: 1174.66, start: 0.65, duration: 0.3 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.25, audioContext.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + duration);
      
      osc.start(audioContext.currentTime + start);
      osc.stop(audioContext.currentTime + start + duration);
    });

    const bassOsc = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(audioContext.destination);
    bassOsc.frequency.value = 261.63;
    bassOsc.type = 'sine';
    bassGain.gain.setValueAtTime(0.15, audioContext.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.95);
    bassOsc.start(audioContext.currentTime);
    bassOsc.stop(audioContext.currentTime + 0.95);
  } catch (e) {}
};

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

function FluidVibeOMeter({ count }: { count: number }) {
  const levels = ['COOL', 'REAL', 'DEEP', 'SUPER', 'MEGA'];
  const currentLevel = count > 0 ? levels[Math.min(count - 1, 4)] : null;

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center gap-3 z-15"
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

function VibeToast({ interest, newCount }: { interest: string; newCount: number }) {
  const messages = { 1: '✨ Cool', 2: '🌟 Real', 3: '🔥 Deep', 4: '💥 Super', 5: '🎫 MEGA' };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-32 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-2xl"
    >
      {messages[newCount as keyof typeof messages]} ({newCount}/5) - {interest}
    </motion.div>
  );
}

function EnableCameraOverlay({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white font-extrabold rounded-full text-lg shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.7)]"
      >
        Enable Camera
      </motion.button>
    </motion.div>
  );
}

function CelebrationPopout({ level }: { level: number }) {
  const labels = ['COOL', 'REAL', 'DEEP', 'SUPER'];
  const label = labels[level - 1];
  const sizes = ['text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];
  const size = sizes[level - 1];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1 }}
        className={`${size} font-black text-white drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]`}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}

function MegaVibeCelebration() {
  return (
    <>
      <Confetti />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none"
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
            5 SHARED PASSIONS
          </motion.p>
        </motion.div>
      </motion.div>
    </>
  );
}

function MatchPageContent() {
  const router = useRouter();
  const yourVideoRef = useRef<HTMLVideoElement>(null);
  const theirVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const dailyContainerRef = useRef<HTMLDivElement | null>(null);
  const callObject = useRef<any>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const partnerUnsubscribeRef = useRef<(() => void) | null>(null);

  const [user, setUser] = useState<any | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [vibeCount, setVibeCount] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something went wrong.');
  const [toastData, setToastData] = useState<{ interest: string; newCount: number } | null>(null);
  const [showGoldenTicket, setShowGoldenTicket] = useState(false);
  const [megaVibeTriggered, setMegaVibeTriggered] = useState(false);
  const [celebratedLevels, setCelebratedLevels] = useState<Set<number>>(new Set());
  const [currentCelebration, setCurrentCelebration] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [previewStarted, setPreviewStarted] = useState(false);

  const sharedInterests = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    return myProfile.interests.filter((i: string) =>
      theirProfile.interests.some((ti: string) => ti.trim().toLowerCase() === i.trim().toLowerCase())
    );
  }, [myProfile, theirProfile]);

  const displayedInterests = useMemo(() => {
    if (!theirProfile) return [];
    return theirProfile.interests.filter(
      (i) => !sharedInterests.some((s) => s.trim().toLowerCase() === i.trim().toLowerCase())
    );
  }, [theirProfile, sharedInterests]);

  // Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Preview stream function (triggered by user click, not auto)
  const startPreviewStream = async () => {
    if (previewStreamRef.current) return;
    if (!yourVideoRef.current) return;

    try {
      console.log('Starting preview stream (user-triggered)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });

      previewStreamRef.current = stream;
      yourVideoRef.current.srcObject = stream;
      console.log('Preview stream started');
      setPreviewStarted(true);

      try {
        await yourVideoRef.current.play();
        console.log('Preview video playing');
      } catch (e) {
        console.error('Play failed:', e);
      }
    } catch (err: any) {
      console.error('Camera error:', err.name, err.message);
      setError(true);
      setErrorMessage('Camera and microphone access required. Please enable permissions in browser settings.');
    }
  };

  useEffect(() => {
    setVibeCount(sharedInterests.length);
  }, [sharedInterests.length]);

  // MEGA VIBE trigger with auto-close
  useEffect(() => {
    if (sharedInterests.length === 5 && !megaVibeTriggered) {
      if (audioEnabled) playMegaVibeFanfare();
      setShowGoldenTicket(true);
      setMegaVibeTriggered(true);
      const timer = setTimeout(() => setShowGoldenTicket(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sharedInterests.length, megaVibeTriggered, audioEnabled]);

  // Celebration popout for levels 1-4
  useEffect(() => {
    if (sharedInterests.length >= 1 && sharedInterests.length <= 4) {
      if (!celebratedLevels.has(sharedInterests.length)) {
        if (audioEnabled) playVibeLevel(sharedInterests.length);
        setCurrentCelebration(sharedInterests.length);
        setCelebratedLevels(prev => new Set([...prev, sharedInterests.length]));
        const timer = setTimeout(() => setCurrentCelebration(null), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [sharedInterests.length, celebratedLevels]);

  // Gate audio to first user gesture (iOS requirement)
  const enableAudio = async () => {
    if (audioEnabled) return;
    try {
      await getAudioContext();
      setAudioEnabled(true);
    } catch (err) {
      console.error('Failed to enable audio:', err);
    }
  };

  const handleMatch = async (partnerId: string, roomUrl: string, myData: UserData) => {
    try {
      const partnerSnap = await getDoc(doc(db, 'users', partnerId));
      if (partnerSnap.exists()) {
        const theirData: UserData = {
          displayName: partnerSnap.data().displayName || 'Match',
          interests: partnerSnap.data().interests || [],
          location: partnerSnap.data().location || '',
        };
        setTheirProfile(theirData);

        if (partnerUnsubscribeRef.current) {
          partnerUnsubscribeRef.current();
        }
        
        const partnerDocRef = doc(db, 'users', partnerId);
        partnerUnsubscribeRef.current = onSnapshot(partnerDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const updatedTheirData: UserData = {
              displayName: docSnap.data().displayName || 'Match',
              interests: docSnap.data().interests || [],
              location: docSnap.data().location || '',
            };
            setTheirProfile(updatedTheirData);
          }
        });
      }

      setIsMatched(true);

      // Stop preview stream - Daily will own the camera now
      if (previewStreamRef.current) {
        console.log('Handing preview stream to Daily (not stopping it)');
        // DON'T stop tracks - we'll reuse the stream on reset
        // Just detach from video element
        if (yourVideoRef.current) {
          yourVideoRef.current.srcObject = null;
        }
      }

      // Create Daily call with custom video handling (no UI)
      dailyContainerRef.current = document.createElement('div');
      dailyContainerRef.current.style.display = 'none';
      document.body.appendChild(dailyContainerRef.current);

      const daily = DailyIframe.createFrame(dailyContainerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: false,
        showParticipantsBar: false,
        showLocalVideo: false,
        showUserNameChangeUI: false,
      });

      callObject.current = daily;
      
      // Set up video stream handling with track-started (more reliable than participant-joined)
      daily.on('track-started', (evt: any) => {
        const { participant, track } = evt;
        if (!track || track.kind !== 'video') return;

        const targetRef = participant.local ? yourVideoRef : theirVideoRef;
        const isLocal = participant.local;

        console.log(`track-started (${isLocal ? 'LOCAL' : 'REMOTE'}):`, {
          refExists: !!targetRef.current,
          trackKind: track.kind,
        });

        // Attach track, with retry if ref not yet mounted
        const attachTrack = () => {
          if (targetRef.current) {
            console.log(`Attaching ${isLocal ? 'YOUR' : 'THEIR'} video track`);
            targetRef.current.srcObject = new MediaStream([track]);
            targetRef.current.play().catch(() => {});
          } else {
            console.warn(`⚠️ ${isLocal ? 'YOUR' : 'THEIR'} video ref is null, retrying in 100ms...`);
            // Retry once if React hasn't painted the video tag yet
            setTimeout(attachTrack, 100);
          }
        };

        attachTrack();
      });

      await daily.join({ url: roomUrl });

      // CRITICAL: Publish your video/audio to the room
      console.log('Publishing video to Daily room...');
      await daily.updateInputSettings({
        video: { isScreenShare: false },
        audio: true,
      });

    } catch (err: any) {
      setError(true);
    }
  };

  // Heavy initialization only after auth
  useEffect(() => {
    if (!authReady || !user) return;

    let mounted = true;

    const initEverything = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          setError(true);
          return;
        }

        const myData: UserData = {
          displayName: snap.data().displayName || user.displayName || 'You',
          interests: snap.data().interests || [],
          location: snap.data().location || '',
        };
        
        if (!mounted) return;
        setMyProfile(myData);

        if (!myData.interests || myData.interests.length < 3) {
          router.push('/profile');
          return;
        }

        await updateDoc(doc(db, 'users', user.uid), {
          status: 'idle',
          queuedAt: null,
          partnerId: null,
          currentRoomUrl: null,
        });

        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            interests: myData.interests,
            selectedMode: 'video',
          }),
        });

        if (!matchRes.ok) {
          setError(true);
          return;
        }

        const matchData = await matchRes.json();

        if (matchData.matched) {
          await handleMatch(matchData.partnerId, matchData.roomUrl, myData);
          return;
        }

        timeoutIdRef.current = setTimeout(async () => {
          await updateDoc(doc(db, 'users', user.uid), {
            status: 'idle',
            queuedAt: null,
          });
          setError(true);
        }, 300000);

        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeRef.current = onSnapshot(userDocRef, async (docSnap) => {
          const data = docSnap.data();
          if (data?.status === 'matched' && data?.partnerId && data?.currentRoomUrl) {
            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            await handleMatch(data.partnerId, data.currentRoomUrl, myData);
            if (unsubscribeRef.current) unsubscribeRef.current();
          }
        });

      } catch (err: any) {
        if (mounted) {
          setError(true);
        }
      }
    };

    initEverything();

    return () => {
      mounted = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (partnerUnsubscribeRef.current) partnerUnsubscribeRef.current();
      if (callObject.current) {
        try { callObject.current.destroy(); } catch {}
        callObject.current = null;
      }
      if (dailyContainerRef.current) {
        dailyContainerRef.current.remove();
        dailyContainerRef.current = null;
      }
      // Stop preview tracks only on page unmount (not on reset)
      if (previewStreamRef.current) {
        console.log('Stopping preview stream on page unmount');
        previewStreamRef.current.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
      }
    };
  }, [authReady, user, router]);

  const handleTeleportInterest = async (interest: string) => {
    if (!user || !myProfile) return;
    const alreadyAdded = myProfile.interests.some(
      (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
    );
    if (alreadyAdded) return;

    const newInterests = [...myProfile.interests, interest];
    setMyProfile(prev => prev ? { ...prev, interests: newInterests } : null);

    playVibe(sharedInterests.length + 1);
    const newCount = sharedInterests.length + 1;
    setToastData({ interest, newCount });
    setTimeout(() => setToastData(null), 2500);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        interests: newInterests,
      });
    } catch (err) {
      setMyProfile(myProfile);
    }
  };

  const resetState = async () => {
    if (callObject.current) {
      try { 
        await callObject.current.leave();
        callObject.current.destroy(); 
      } catch {}
      callObject.current = null;
    }

    // Clean up Daily container DOM node
    if (dailyContainerRef.current) {
      dailyContainerRef.current.remove();
      dailyContainerRef.current = null;
    }

    setIsMatched(false);
    setTheirProfile(null);
    setVibeCount(0);
    setShowGoldenTicket(false);
    setMegaVibeTriggered(false);
    setToastData(null);
    setCelebratedLevels(new Set()); // Reset celebrated levels for new match
    setPreviewStarted(false); // Reset preview state for next match

    if (yourVideoRef.current) yourVideoRef.current.srcObject = null;
    if (theirVideoRef.current) theirVideoRef.current.srcObject = null;

    // Restart preview stream for next match
    if (yourVideoRef.current) {
      if (previewStreamRef.current) {
        // Stream already exists - just reattach to video element
        console.log('Reusing existing preview stream...');
        yourVideoRef.current.srcObject = previewStreamRef.current;
        try {
          await yourVideoRef.current.play();
          console.log('Preview stream reattached');
        } catch (err) {
          console.error('Failed to play preview:', err);
        }
      } else {
        // Only request if stream was somehow lost
        try {
          console.log('Requesting new preview stream...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true,
          });
          previewStreamRef.current = stream;
          yourVideoRef.current.srcObject = stream;
          await yourVideoRef.current.play();
          console.log('New preview stream started');
        } catch (err: any) {
          console.error('Failed to get preview:', err.message);
        }
      }
    }

    try {
      if (myProfile) {
        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            interests: myProfile.interests,
            selectedMode: 'video',
          }),
        });

        if (!matchRes.ok) {
          setError(true);
          return;
        }

        const matchData = await matchRes.json();

        // If immediate match, connect
        if (matchData.matched) {
          await handleMatch(matchData.partnerId, matchData.roomUrl, myProfile);
          return;
        }

        // Otherwise, wait for Firestore listener to pick up the match
        timeoutIdRef.current = setTimeout(async () => {
          await updateDoc(doc(db, 'users', user.uid), {
            status: 'idle',
            queuedAt: null,
          });
          setError(true);
        }, 300000);

        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeRef.current = onSnapshot(userDocRef, async (docSnap) => {
          const data = docSnap.data();
          if (data?.status === 'matched' && data?.partnerId && data?.currentRoomUrl) {
            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            await handleMatch(data.partnerId, data.currentRoomUrl, myProfile);
            if (unsubscribeRef.current) unsubscribeRef.current();
          }
        });
      }
    } catch (err: any) {
      setError(true);
    }
  };

  const handleEndCall = async () => {
    if (callObject.current) {
      try { await callObject.current.destroy(); } catch {}
    }
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        status: 'idle',
        currentRoomUrl: null,
        partnerId: null,
      });
    }
    router.push('/');
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

  if (!myProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex flex-col" onClick={enableAudio}>
      <style>{scrollbarStyle}</style>
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </div>
      </header>

      {/* VIDEOS - Full split screen */}
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
          
          {/* Enable camera overlay - shows until stream starts */}
          <AnimatePresence>
            {!previewStarted && (
              <EnableCameraOverlay onClick={startPreviewStream} />
            )}
          </AnimatePresence>
          
          {/* YOUR INTERESTS - Bottom, full width, 2 rows with vertical scroll */}
          {myProfile && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-4">
              <div className="w-full">
                <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3 interests-scroll overflow-y-auto" style={{ maxHeight: 'calc(2 * 2.5rem + 1.5rem)' }}>
                  <div className="grid gap-2 auto-rows-max" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                    {myProfile.interests.map((interest: string) => (
                      <div
                        key={interest}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/25 text-white border border-white/40 whitespace-nowrap text-center"
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* YOUR NAME - Bottom left */}
          <div className="absolute bottom-20 left-4 right-4 text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
              <h3 className="text-sm font-bold text-white">{myProfile?.displayName || 'You'}</h3>
            </div>
          </div>
        </div>

        {/* CENTER OVERLAY - SHARED INTERESTS + VIBE METER */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 pt-20">
          <AnimatePresence>
            {isMatched && sharedInterests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-12">
                {sharedInterests.slice(0, 5).map((interest: string, idx: number) => (
                  <motion.div
                    key={`shared-${idx}`}
                    initial={{ opacity: 0, scale: 0, y: -30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="px-5 py-2.5 text-black bg-yellow-300 border-2 border-yellow-200 rounded-full text-sm font-bold shadow-[0_0_25px_rgba(253,224,71,0.8)]"
                  >
                    {interest}
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="-inset-3 bg-yellow-400 rounded-full -z-10 blur-lg pointer-events-none"
                      style={{
                        position: 'absolute',
                        inset: '-12px',
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* VIBE METER - Centered below interests */}
          {isMatched && (
            <div className="pointer-events-none">
              <FluidVibeOMeter count={vibeCount} />
            </div>
          )}
        </div>

        {/* THEIR VIDEO (RIGHT) */}
        <div className="relative flex-1 bg-black">
          {!isMatched ? (
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
          ) : (
            <video
              ref={theirVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* THEIR INTERESTS - Bottom, full width, 2 rows with vertical scroll */}
          {isMatched && theirProfile && (
            <div className="absolute bottom-0 left-0 right-0 z-15 pb-4">
              <div className="w-full">
                <div className="bg-black/40 backdrop-blur-xl border-t border-white/20 p-3 interests-scroll overflow-y-auto" style={{ maxHeight: 'calc(2 * 2.5rem + 1.5rem)' }}>
                  <div className="grid gap-2 auto-rows-max" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                    {displayedInterests.map((interest: string) => {
                      const isAdded = myProfile?.interests.some(
                        (i: string) => i.trim().toLowerCase() === interest.trim().toLowerCase()
                      );
                      return (
                        <motion.button
                          key={interest}
                          whileHover={!isAdded ? { scale: 1.08 } : {}}
                          whileTap={!isAdded ? { scale: 0.95 } : {}}
                          onClick={() => !isAdded && handleTeleportInterest(interest)}
                          disabled={isAdded}
                          className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                            isAdded
                              ? 'bg-white/15 text-white/40 border border-white/20 cursor-default'
                              : 'bg-white/25 text-white border border-white/40 hover:bg-white/35 cursor-pointer'
                          }`}
                        >
                          {interest}
                          {!isAdded && <Plus size={10} className="absolute top-1 right-1" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THEIR NAME - Bottom center */}
          {isMatched && (
            <div className="absolute bottom-20 left-4 right-4 text-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                <h3 className="text-sm font-bold text-white">
                  {theirProfile?.displayName || '...'}
                  {theirProfile?.location && <span className="text-xs font-semibold text-white/70"> • {theirProfile.location}</span>}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toastData && <VibeToast interest={toastData.interest} newCount={toastData.newCount} />}
      </AnimatePresence>

      <AnimatePresence>
        {currentCelebration && <CelebrationPopout level={currentCelebration} />}
      </AnimatePresence>

      <AnimatePresence>
        {showGoldenTicket && <MegaVibeCelebration />}
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        {isMatched && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetState}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg text-sm"
          >
            Next
            <RefreshCw size={14} />
          </motion.button>
        )}

        {!isMatched && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEndCall}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg text-sm"
          >
            <X size={14} />
            End
          </motion.button>
        )}
      </div>
    </main>
  );
}

export default function MatchPage() {
  return (
    <AgeGateWrapper>
      <MatchPageContent />
    </AgeGateWrapper>
  );
}