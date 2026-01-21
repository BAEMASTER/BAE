'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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

const playMegaVibeFanfare = async () => {
  const audioContext = await getAudioContext();
  if (!audioContext) return;
  try {
    // Triumphant fanfare sequence - multiple notes in quick succession
    const notes = [
      { freq: 523.25, start: 0, duration: 0.15 },      // C5
      { freq: 659.25, start: 0.15, duration: 0.15 },   // E5
      { freq: 783.99, start: 0.3, duration: 0.15 },    // G5
      { freq: 1046.5, start: 0.45, duration: 0.2 },    // C6 (high note)
      { freq: 1174.66, start: 0.65, duration: 0.3 },   // D6 (climax)
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

    // Add a bass note underneath for gravitas
    const bassOsc = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(audioContext.destination);
    bassOsc.frequency.value = 261.63; // C4 (low note)
    bassOsc.type = 'sine';
    bassGain.gain.setValueAtTime(0.15, audioContext.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.95);
    bassOsc.start(audioContext.currentTime);
    bassOsc.stop(audioContext.currentTime + 0.95);
  } catch (e) {}
};

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: window.innerWidth / 2, y: window.innerHeight / 2, opacity: 1 }}
          animate={{
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
            y: window.innerHeight + 100,
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

function MegaVibeCelebration({
  onClose,
}: {
  onClose: () => void;
}) {
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

function ViewAllInterestsDrawer({
  theirInterests,
  myInterests,
  sharedInterests,
  theirName,
  onClose,
  onTeleport,
}: {
  theirInterests: string[];
  myInterests: string[];
  sharedInterests: string[];
  theirName: string;
  onClose: () => void;
  onTeleport: (interest: string) => void;
}) {
  const otherInterests = theirInterests.filter(
    (i) => !sharedInterests.some((s) => s.toLowerCase() === i.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 rounded-t-3xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="w-12 h-1 rounded-full bg-white/30" />
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={24} className="text-white/70" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto interests-scroll p-6">
          <h3 className="text-lg font-black text-white mb-6">All {theirName}'s Interests</h3>
          <div className="flex flex-wrap gap-3">
            {otherInterests.map((interest: string) => {
              const isAdded = myInterests.some(
                (i: string) => i.toLowerCase() === interest.toLowerCase()
              );
              return (
                <motion.button
                  key={interest}
                  whileHover={!isAdded ? { scale: 1.08 } : {}}
                  whileTap={!isAdded ? { scale: 0.95 } : {}}
                  onClick={() => {
                    if (!isAdded) {
                      onTeleport(interest);
                      onClose();
                    }
                  }}
                  disabled={isAdded}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    isAdded
                      ? 'bg-white/20 text-white/50 border border-white/20 cursor-default'
                      : 'bg-white/30 text-white border border-white/40 hover:bg-white/50 cursor-pointer'
                  }`}
                >
                  {interest} {isAdded ? '✓' : '+'}
                </motion.button>
              );
            })}
          </div>
          <p className="text-xs text-white/50 mt-8 text-center">Tap any to add to your profile</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MatchPage() {
  const router = useRouter();
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callObject = useRef<any>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const partnerUnsubscribeRef = useRef<(() => void) | null>(null);

  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [vibeCount, setVibeCount] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something went wrong.');
  const [cameraReady, setCameraReady] = useState(false);
  const [toastData, setToastData] = useState<{ interest: string; newCount: number } | null>(null);
  const [showGoldenTicket, setShowGoldenTicket] = useState(false);
  const [megaVibeTriggered, setMegaVibeTriggered] = useState(false);

  const sharedInterests = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    return myProfile.interests.filter((i: string) =>
      theirProfile.interests.some((ti: string) => ti.toLowerCase() === i.toLowerCase())
    );
  }, [myProfile, theirProfile]);

  const displayedInterests = useMemo(() => {
    if (!theirProfile) return [];
    return theirProfile.interests.filter(
      (i) => !sharedInterests.some((s) => s.toLowerCase() === i.toLowerCase())
    );
  }, [theirProfile, sharedInterests]);

  useEffect(() => {
    setVibeCount(sharedInterests.length);
  }, [sharedInterests.length]);

  useEffect(() => {
    if (sharedInterests.length === 5 && !megaVibeTriggered) {
      playMegaVibeFanfare();
      setShowGoldenTicket(true);
      setMegaVibeTriggered(true);
      // Auto-close after 3 seconds
      const timer = setTimeout(() => setShowGoldenTicket(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sharedInterests.length, megaVibeTriggered]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    let mounted = true;

    const startNativeCamera = async () => {
      try {
        for (let i = 0; i < 20; i++) {
          if (localVideoContainerRef.current) break;
          await new Promise(r => setTimeout(r, 50));
        }
        if (!localVideoContainerRef.current || !mounted) return;

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' },
          audio: true 
        });
        
        localStreamRef.current = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1)';
        
        localVideoContainerRef.current.innerHTML = '';
        localVideoContainerRef.current.appendChild(video);
        await video.play();
        if (mounted) setCameraReady(true);
      } catch (err) {
        if (mounted) {
          setErrorMessage('Camera access required');
          setError(true);
        }
      }
    };

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

        await new Promise(resolve => setTimeout(resolve, 1500));
        await startNativeCamera();
        
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

    const handleMatch = async (partnerId: string, roomUrl: string, myData: UserData) => {
      try {
        const partnerSnap = await getDoc(doc(db, 'users', partnerId));
        if (partnerSnap.exists()) {
          const theirData: UserData = {
            displayName: partnerSnap.data().displayName || 'Match',
            interests: partnerSnap.data().interests || [],
            location: partnerSnap.data().location || '',
          };
          if (!mounted) return;
          setTheirProfile(theirData);

          if (partnerUnsubscribeRef.current) {
            partnerUnsubscribeRef.current();
          }
          
          const partnerDocRef = doc(db, 'users', partnerId);
          partnerUnsubscribeRef.current = onSnapshot(partnerDocRef, (docSnap) => {
            if (docSnap.exists() && mounted) {
              const updatedTheirData: UserData = {
                displayName: docSnap.data().displayName || 'Match',
                interests: docSnap.data().interests || [],
                location: docSnap.data().location || '',
              };
              setTheirProfile(updatedTheirData);
            }
          });
        }

        if (!mounted) return;
        setIsMatched(true);

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        
        if (localVideoContainerRef.current) {
          localVideoContainerRef.current.innerHTML = '';
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        if (!localVideoContainerRef.current || !mounted) return;

        const daily = DailyIframe.createFrame(localVideoContainerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: false,
          showParticipantsBar: false,
          showLocalVideo: true,
          showUserNameChangeUI: false,
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: '1',
          },
        });

        callObject.current = daily;
        await daily.join({ url: roomUrl });
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (callObject.current) {
        try { callObject.current.destroy(); } catch {}
        callObject.current = null;
      }
    };
  }, [router]);

  const handleTeleportInterest = async (interest: string) => {
    if (!auth.currentUser || !myProfile) return;
    const alreadyAdded = myProfile.interests.some(
      (i: string) => i.toLowerCase() === interest.toLowerCase()
    );
    if (alreadyAdded) return;

    const newInterests = [...myProfile.interests, interest];
    setMyProfile(prev => prev ? { ...prev, interests: newInterests } : null);

    playVibe(sharedInterests.length + 1);
    const newCount = sharedInterests.length + 1;
    setToastData({ interest, newCount });
    setTimeout(() => setToastData(null), 2500);

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
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

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setIsMatched(false);
    setTheirProfile(null);
    setVibeCount(0);
    setShowGoldenTicket(false);
    setMegaVibeTriggered(false);
    setToastData(null);
    setCameraReady(false);

    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.innerHTML = '';
    }

    try {
      if (myProfile) {
        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: auth.currentUser?.uid,
            interests: myProfile.interests,
            selectedMode: 'video',
          }),
        });

        if (!matchRes.ok) {
          setError(true);
        }
      }
    } catch (err: any) {
      setError(true);
    }
  };

  const handleEndCall = async () => {
    if (callObject.current) {
      try { await callObject.current.destroy(); } catch {}
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        status: 'idle',
        currentRoomUrl: null,
        partnerId: null,
      });
    }
    router.push('/');
  };

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
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex flex-col">
      <style>{scrollbarStyle}</style>
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px]"></div>
      </div>

      {/* Header - Absolute positioned, no extra space */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </div>
      </header>

      {/* VIDEOS - Full flex, header is absolute so no padding needed */}
      <div className="relative flex-1 flex overflow-hidden z-5">
        <div className="relative flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
          
          {/* MEGA VIBE Screen Flash */}
          <AnimatePresence>
            {megaVibeTriggered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 pointer-events-none z-30 border-4"
                style={{
                  borderImage: 'conic-gradient(from 0deg, #FFD700, #FF69B4, #87CEEB, #FFD700) 1',
                  animation: 'spin 1.5s linear forwards',
                }}
              />
            )}
          </AnimatePresence>

          <style>{`
            @keyframes spin {
              from { border-image: conic-gradient(from 0deg, #FFD700, #FF69B4, #87CEEB, #FFD700) 1; }
              to { border-image: conic-gradient(from 360deg, #FFD700, #FF69B4, #87CEEB, #FFD700) 1; }
            }
          `}</style>
          
          {/* YOUR VIDEO */}
          <div className="relative flex-1 bg-black">
            <div ref={localVideoContainerRef} className="absolute inset-0 w-full h-full" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-indigo-900/20">
                <Loader2 className="w-12 h-12 text-white/70 animate-spin" />
              </div>
            )}
            
            {/* YOUR INTERESTS - High contrast backdrop, scrollable */}
            <div className="absolute bottom-0 left-0 right-0 z-15 flex justify-center pb-4 px-4">
              <div className="w-full max-w-4xl">
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-3 interests-scroll max-h-[18vh] overflow-y-auto md:overflow-y-auto md:overflow-x-hidden">
                  {/* Desktop: 2 rows × 3 cols, vertical scroll */}
                  <div className="hidden md:grid grid-cols-3 gap-2 auto-rows-max">
                    {myProfile?.interests.map((interest: string) => (
                      <div
                        key={interest}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/25 text-white border border-white/40 whitespace-nowrap text-center"
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                  
                  {/* Mobile: 1 row × 4 cols, horizontal scroll */}
                  <div className="md:hidden flex gap-2 min-w-max overflow-x-auto">
                    {myProfile?.interests.map((interest: string) => (
                      <div
                        key={interest}
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/25 text-white border border-white/40 whitespace-nowrap flex-shrink-0"
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 left-4 right-4 text-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                <h3 className="text-sm font-bold text-white">{myProfile?.displayName || 'You'}</h3>
              </div>
            </div>
          </div>

          {/* CENTER: SHARED INTERESTS GLOW - MOVED HIGHER */}
          <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-20" style={{ justifyContent: '20%' }}>
            <AnimatePresence>
              {isMatched && sharedInterests.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3">
                  {sharedInterests.slice(0, 5).map((interest: string, idx: number) => (
                    <motion.div
                      key={interest}
                      initial={{ opacity: 0, scale: 0, y: -30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative px-5 py-2.5 text-black bg-yellow-300 border-2 border-yellow-200 rounded-full text-sm font-bold shadow-[0_0_25px_rgba(253,224,71,0.8)]"
                    >
                      {interest}
                      <motion.div
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -inset-3 bg-yellow-400 rounded-full -z-10 blur-lg"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* CENTER: VIBE-O-METER - CENTERED */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            {isMatched && <FluidVibeOMeter count={vibeCount} />}
          </div>

          {/* THEIR VIDEO */}
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
              <>
                <div ref={remoteVideoContainerRef} className="absolute inset-0 w-full h-full" />
                <div className="absolute bottom-20 left-4 right-4 text-center">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                    <h3 className="text-sm font-bold text-white">
                      {theirProfile?.displayName || '...'}
                      {theirProfile?.location && <span className="text-xs font-semibold text-white/70"> • {theirProfile.location}</span>}
                    </h3>
                  </div>
                </div>
              </>
            )}

            {/* THEIR INTERESTS - High contrast backdrop, all interests visible, scrollable */}
            {isMatched && theirProfile && (
              <div className="absolute bottom-0 left-0 right-0 z-15 flex justify-center pb-4 px-4">
                <div className="w-full max-w-4xl">
                  <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-3 interests-scroll max-h-[18vh] overflow-y-auto md:overflow-y-auto md:overflow-x-hidden">
                    {/* Desktop: 2 rows × 3 cols, vertical scroll */}
                    <div className="hidden md:grid grid-cols-3 gap-2 auto-rows-max">
                      {displayedInterests.map((interest: string) => {
                        const isAdded = myProfile?.interests.some(
                          (i: string) => i.toLowerCase() === interest.toLowerCase()
                        );
                        return (
                          <motion.button
                            key={interest}
                            whileHover={!isAdded ? { scale: 1.08 } : {}}
                            whileTap={!isAdded ? { scale: 0.95 } : {}}
                            onClick={() => !isAdded && handleTeleportInterest(interest)}
                            disabled={isAdded}
                            className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all text-center ${
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
                    
                    {/* Mobile: 1 row × 4 cols, horizontal scroll */}
                    <div className="md:hidden flex gap-2 min-w-max overflow-x-auto">
                      {displayedInterests.map((interest: string) => {
                        const isAdded = myProfile?.interests.some(
                          (i: string) => i.toLowerCase() === interest.toLowerCase()
                        );
                        return (
                          <motion.button
                            key={interest}
                            whileHover={!isAdded ? { scale: 1.08 } : {}}
                            whileTap={!isAdded ? { scale: 0.95 } : {}}
                            onClick={() => !isAdded && handleTeleportInterest(interest)}
                            disabled={isAdded}
                            className={`relative px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                              isAdded
                                ? 'bg-white/15 text-white/40 border border-white/20 cursor-default'
                                : 'bg-white/25 text-white border border-white/40 hover:bg-white/35 cursor-pointer'
                            }`}
                          >
                            {interest}
                            {!isAdded && <Plus size={8} className="absolute top-0.5 right-0.5" />}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toastData && <VibeToast interest={toastData.interest} newCount={toastData.newCount} />}
      </AnimatePresence>

      <AnimatePresence>
        {showGoldenTicket && (
          <MegaVibeCelebration
            onClose={() => setShowGoldenTicket(false)}
          />
        )}
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
      </div>
    </main>
  );
}