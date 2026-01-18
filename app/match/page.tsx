'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw } from 'lucide-react';

// Add scrollbar-hide to globals (hide scrollbar but allow scrolling)
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

interface UserData {
  displayName: string;
  interests: string[];
  location?: string;
}

// --- VIBE LEVELS ---
const VIBE_LEVELS = {
  0: { name: 'No Connection', color: 'gray' },
  1: { name: 'Connected', color: 'blue' },
  2: { name: 'Vibing', color: 'orange' },
  3: { name: 'Deep Vibe', color: 'gold' },
  4: { name: 'Super Vibe', color: 'gold-bright' },
  5: { name: 'MEGA VIBE', color: 'rainbow', celebration: true },
};

// --- SOUND EFFECTS ---
const playVibe = (level: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const frequencies = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C, E, G, B, D (ascending)
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
  } catch (e) {
    console.log('Audio not supported');
  }
};

const playBellDing = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 1046.5;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio not supported');
  }
};

// --- CONFETTI COMPONENT ---
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            opacity: 1,
          }}
          animate={{
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
            y: window.innerHeight + 100,
            opacity: 0,
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 2,
            ease: 'easeIn',
          }}
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

// --- VIBE-O-METER COMPONENT ---
function VibeOMeter({ count }: { count: number }) {
  const vibeNames = ['', 'Connected', 'Vibing', 'Deep Vibe', 'Super Vibe', 'MEGA VIBE'];
  
  // Continuous scaling and glow based on count (no discrete steps)
  const orbSize = 24 + count * 12; // Grows smoothly: 24px → 84px
  const glowIntensity = count * 0.2; // 0 → 1.0
  const pulseSpeed = 5 - count * 0.5; // Pulses faster as vibe increases
  
  // Color progression: gray → blue → peachy → gold → intense gold → rainbow
  const getOrbColor = () => {
    if (count === 0) return 'from-white/30 to-white/20';
    if (count < 1.5) return 'from-blue-400/50 to-blue-300/40';
    if (count < 2.5) return 'from-orange-300/50 to-orange-200/40';
    if (count < 3.5) return 'from-yellow-300/60 to-yellow-200/50';
    if (count < 4.5) return 'from-yellow-300/80 to-pink-300/70';
    return 'from-yellow-300 via-pink-400 to-fuchsia-500';
  };
  
  const getGlowColor = () => {
    if (count === 0) return 'rgba(255,255,255,0.1)';
    if (count < 1.5) return 'rgba(96,165,250,0.4)';
    if (count < 2.5) return 'rgba(253,186,116,0.5)';
    if (count < 3.5) return 'rgba(253,224,71,0.6)';
    if (count < 4.5) return 'rgba(253,224,71,0.8)';
    return 'rgba(253,224,71,1), 0 0 80px rgba(236,72,153,0.8)';
  };

  return (
    <div className="w-full px-4 py-4 bg-gradient-to-r from-black/40 to-transparent">
      <div className="max-w-full mx-auto">
        {/* Label */}
        <div className="text-center mb-4">
          <p className="text-xs sm:text-sm font-bold text-white/80 tracking-widest">VIBE-O-METER</p>
        </div>

        {/* Orb Container */}
        <div className="flex items-center justify-center mb-4">
          {/* Comet Aura Background */}
          <motion.div
            animate={{
              boxShadow: `0 0 ${40 + count * 20}px ${getGlowColor()}`,
              scale: 1 + glowIntensity * 0.2,
            }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            className="absolute w-32 h-32 rounded-full blur-3xl"
          />

          {/* Main Orb */}
          <motion.div
            animate={{
              scale: 1 + glowIntensity * 0.15,
              boxShadow: `0 0 ${20 + count * 15}px ${getGlowColor()}`,
            }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            className={`relative z-10 rounded-full flex items-center justify-center border-2 border-white/40 bg-gradient-to-br ${getOrbColor()}`}
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
            }}
          >
            {/* Pulsing inner glow */}
            <motion.div
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: pulseSpeed,
                repeat: Infinity,
              }}
              className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent"
            />

            {/* Vibe count (small, subtle) */}
            {count > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-20 text-xs sm:text-sm font-black text-white"
              >
                {count}/5
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Vibe Name */}
        <div className="text-center">
          <motion.p
            key={count}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="text-sm sm:text-base font-bold text-white/90"
          >
            {vibeNames[count] || 'No Connection'}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

// --- VIBE TOAST COMPONENT ---
function VibeToast({ interest, newCount }: { interest: string; newCount: number }) {
  const messages = {
    1: '✨ Connected',
    2: '🌟 Vibing',
    3: '🔥 Deep Vibe',
    4: '💥 Super Vibe',
    5: '🎫 MEGA VIBE',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed top-32 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-2xl"
    >
      {messages[newCount as keyof typeof messages]} ({newCount}/5) - {interest}
    </motion.div>
  );
}

// --- GOLDEN TICKET CELEBRATION ---
function GoldenTicketCelebration({
  theirProfile,
  sharedInterests,
  onClose,
}: {
  theirProfile: UserData;
  sharedInterests: string[];
  onClose: () => void;
}) {
  return (
    <>
      <Confetti />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="relative px-8 py-10 bg-gradient-to-br from-yellow-400 via-pink-400 to-fuchsia-500 rounded-3xl text-center max-w-md shadow-2xl"
        >
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-4xl font-black text-white mb-2">MEGA VIBE</h2>
          <p className="text-xl text-white/95 font-bold mb-6">
            You share 5 passions with {theirProfile.displayName}
          </p>

          {/* Shared Interests Display */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {sharedInterests.slice(0, 5).map((interest) => (
              <motion.div
                key={interest}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: sharedInterests.indexOf(interest) * 0.1 }}
                className="px-4 py-2 bg-white/90 text-black font-bold rounded-full text-sm"
              >
                {interest}
              </motion.div>
            ))}
          </div>

          <p className="text-white/80 font-semibold mb-6">This is special. Let's talk about it.</p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-8 py-3 bg-white text-black font-black rounded-full hover:bg-white/90 transition-all"
          >
            Keep Vibing
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}

// --- MAIN MATCH PAGE ---
export default function MatchPage() {
  const router = useRouter();
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callObject = useRef<any>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [floatingInterests, setFloatingInterests] = useState<string[]>([]);
  const [vibeCount, setVibeCount] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again.');
  const [isResetting, setIsResetting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [toastData, setToastData] = useState<{ interest: string; newCount: number } | null>(null);
  const [showGoldenTicket, setShowGoldenTicket] = useState(false);

  // Calculate shared interests count
  useEffect(() => {
    if (myProfile && theirProfile) {
      const shared = myProfile.interests.filter((i: string) =>
        theirProfile.interests.some((ti: string) => ti.toLowerCase() === i.toLowerCase())
      );
      setSharedInterests(shared);
      setVibeCount(shared.length);
      
      // Show golden ticket at 5
      if (shared.length === 5 && !showGoldenTicket) {
        playBellDing();
        setShowGoldenTicket(true);
      }
    }
  }, [myProfile, theirProfile, showGoldenTicket]);

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
          setErrorMessage('Profile not found');
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
          setErrorMessage('Failed to start matching');
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
          setErrorMessage('Matching took too long');
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
          setErrorMessage(err.message || 'Failed to initialize');
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
          showLocalVideo: false,
          showUserNameChangeUI: false,
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
          },
        });

        callObject.current = daily;
        await daily.join({ url: roomUrl });
        
      } catch (err: any) {
        if (mounted) {
          setErrorMessage('Failed to connect');
          setError(true);
        }
      }
    };

    initEverything();

    return () => {
      mounted = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
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

    playVibe(vibeCount + 1);

    // Add to profile
    const newInterests = [...myProfile.interests, interest];
    setMyProfile({ ...myProfile, interests: newInterests });

    // Add to floating interests for animation
    setFloatingInterests([...floatingInterests, interest]);

    // Show toast
    const newCount = sharedInterests.length + 1;
    setToastData({ interest, newCount });
    setTimeout(() => setToastData(null), 2500);

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        interests: newInterests,
      });
    } catch (err) {
      console.error('Failed to add interest:', err);
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

  const handleNextMatch = () => {
    window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-6">😔</div>
          <h2 className="text-3xl font-bold text-red-400 mb-4">Connection Error</h2>
          <p className="text-lg text-white/70 mb-8">{errorMessage}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full shadow-lg"
          >
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
      
      {/* Inject scrollbar-hide styles */}
      <style>{scrollbarHideStyle}</style>
      
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 flex-shrink-0">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
          BAE
        </div>
        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full text-sm"
        >
          <X size={16} />
          End
        </button>
      </header>

      {/* SECTION 1: VIBE-O-METER */}
      <div className="relative z-10 flex-shrink-0 bg-gradient-to-r from-black/40 to-transparent">
        <VibeOMeter count={vibeCount} />
      </div>

      {/* SECTION 2: VIDEO SECTION WITH FLOATING INTERESTS */}
      <div className="relative flex-1 flex flex-col lg:flex-row z-10 min-h-0">
        
        {/* YOUR VIDEO */}
        <div className="relative flex-1">
          <div 
            ref={localVideoContainerRef} 
            className="absolute inset-0 w-full h-full bg-black"
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-indigo-900/20">
              <Loader2 className="w-12 h-12 text-white/70 animate-spin" />
            </div>
          )}
          
          {/* YOUR NAME */}
          <div className="absolute bottom-32 left-4 right-4 text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
              <h3 className="text-sm font-bold text-white">
                {myProfile?.displayName || 'You'}
              </h3>
            </div>
          </div>
        </div>

        {/* CENTER: FLOATING SHARED INTERESTS */}
        <AnimatePresence>
          {isMatched && sharedInterests.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
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
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="absolute -inset-3 bg-yellow-400 rounded-full -z-10 blur-lg"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* THEIR VIDEO */}
        <div className="relative flex-1">
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
              <div 
                ref={remoteVideoContainerRef}
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/20"
              />
              
              {/* THEIR NAME */}
              <div className="absolute bottom-32 left-4 right-4 text-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                  <h3 className="text-sm font-bold text-white">
                    {theirProfile?.displayName || '...'}
                    {theirProfile?.location && (
                      <span className="text-xs font-semibold text-white/70"> • {theirProfile.location}</span>
                    )}
                  </h3>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 3: INTEREST PILLS (Bottom) */}
      
      {/* DESKTOP VERSION - 2x5 Grid */}
      <div className="hidden lg:flex relative z-10 flex-shrink-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 py-4 backdrop-blur-sm border-t border-white/10 max-h-[20vh] overflow-y-auto scrollbar-hide">
        <div className="max-w-full mx-auto w-full">
          {isMatched && theirProfile ? (
            <>
              <p className="text-xs text-yellow-300 font-bold text-center mb-3">Tap to add their interests ⬇️</p>
              
              <div className="flex gap-4 min-h-0">
                {/* YOUR INTERESTS (Left) - Grid 5 columns, 2 rows */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 font-bold mb-2 text-center">Your Interests</p>
                  <div className="grid grid-cols-5 gap-1.5 auto-rows-max">
                    {myProfile?.interests.map((interest: string) => (
                      <div
                        key={interest}
                        className="px-1.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white/80 border border-white/20 whitespace-nowrap text-center truncate overflow-hidden"
                        title={interest}
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEPARATOR */}
                <div className="w-px bg-white/20"></div>

                {/* THEIR INTERESTS (Right - Tappable) - Grid 5 columns, 2 rows */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 font-bold mb-2 text-center">Their Interests</p>
                  <div className="grid grid-cols-5 gap-1.5 auto-rows-max">
                    {theirProfile?.interests.map((interest: string) => {
                      const isAdded = myProfile?.interests.some(
                        (i: string) => i.toLowerCase() === interest.toLowerCase()
                      );
                      const isShared = sharedInterests.some(
                        (s: string) => s.toLowerCase() === interest.toLowerCase()
                      );

                      return (
                        <motion.button
                          key={interest}
                          whileHover={!isAdded ? { scale: 1.08 } : {}}
                          whileTap={!isAdded ? { scale: 0.95 } : {}}
                          onClick={() => !isAdded && handleTeleportInterest(interest)}
                          disabled={isAdded}
                          className={`px-1.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap text-center truncate overflow-hidden ${
                            isShared
                              ? 'bg-yellow-300 text-black border border-yellow-200'
                              : isAdded
                              ? 'bg-white/20 text-white/50 border border-white/20 cursor-default'
                              : 'bg-white/30 text-white border border-white/40 hover:bg-white/50 cursor-pointer'
                          }`}
                          title={interest}
                        >
                          {interest}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Waiting state - show only your interests in grid */
            <>
              <p className="text-xs text-white/60 font-bold text-center mb-3">Your Interests</p>
              <div className="grid grid-cols-10 gap-1.5 auto-rows-max">
                {myProfile?.interests.map((interest: string) => (
                  <div
                    key={interest}
                    className="px-1.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white/80 border border-white/20 whitespace-nowrap text-center truncate overflow-hidden"
                    title={interest}
                  >
                    {interest}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBILE VERSION - Collapsible sections */}
      <div className="lg:hidden relative z-10 flex-shrink-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 py-3 backdrop-blur-sm border-t border-white/10 max-h-[25vh] overflow-y-auto scrollbar-hide">
        <div className="max-w-full mx-auto w-full space-y-3">
          {isMatched && theirProfile ? (
            <>
              <p className="text-xs text-yellow-300 font-bold text-center mb-2">Tap to add their interests ⬇️</p>
              
              {/* YOUR INTERESTS - Collapsible on mobile */}
              <div>
                <p className="text-xs text-white/60 font-bold mb-1.5 text-center">Your Interests (showing first 5)</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {myProfile?.interests.slice(0, 5).map((interest: string) => (
                    <div
                      key={interest}
                      className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white/80 border border-white/20 whitespace-nowrap"
                      title={interest}
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              </div>

              {/* THEIR INTERESTS - Collapsible on mobile */}
              <div>
                <p className="text-xs text-white/60 font-bold mb-1.5 text-center">Their Interests (showing first 5)</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {theirProfile?.interests.slice(0, 5).map((interest: string) => {
                    const isAdded = myProfile?.interests.some(
                      (i: string) => i.toLowerCase() === interest.toLowerCase()
                    );
                    const isShared = sharedInterests.some(
                      (s: string) => s.toLowerCase() === interest.toLowerCase()
                    );

                    return (
                      <motion.button
                        key={interest}
                        whileHover={!isAdded ? { scale: 1.08 } : {}}
                        whileTap={!isAdded ? { scale: 0.95 } : {}}
                        onClick={() => !isAdded && handleTeleportInterest(interest)}
                        disabled={isAdded}
                        className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                          isShared
                            ? 'bg-yellow-300 text-black border border-yellow-200'
                            : isAdded
                            ? 'bg-white/20 text-white/50 border border-white/20 cursor-default'
                            : 'bg-white/30 text-white border border-white/40 hover:bg-white/50 cursor-pointer'
                        }`}
                        title={interest}
                      >
                        {interest}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Waiting state - show first 8 interests */
            <>
              <p className="text-xs text-white/60 font-bold text-center mb-2">Your Interests (showing first 8)</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {myProfile?.interests.slice(0, 8).map((interest: string) => (
                  <div
                    key={interest}
                    className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white/80 border border-white/20 whitespace-nowrap"
                    title={interest}
                  >
                    {interest}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* VIBE TOAST */}
      <AnimatePresence>
        {toastData && <VibeToast interest={toastData.interest} newCount={toastData.newCount} />}
      </AnimatePresence>

      {/* GOLDEN TICKET CELEBRATION */}
      <AnimatePresence>
        {showGoldenTicket && theirProfile && (
          <GoldenTicketCelebration
            theirProfile={theirProfile}
            sharedInterests={sharedInterests}
            onClose={() => setShowGoldenTicket(false)}
          />
        )}
      </AnimatePresence>

      {/* NEXT BUTTON (Bottom right) */}
      {isMatched && (
        <motion.button
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNextMatch}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg text-sm"
        >
          Next
          <RefreshCw size={16} />
        </motion.button>
      )}
    </main>
  );
}