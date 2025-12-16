'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw } from 'lucide-react';

interface UserData {
  displayName: string;
  interests: string[];
  location?: string;
}

const playConnectionChime = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = 523.25;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const playTeleportSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Whoosh sound
    const whoosh = audioContext.createOscillator();
    const whooshGain = audioContext.createGain();
    whoosh.connect(whooshGain);
    whooshGain.connect(audioContext.destination);
    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(200, audioContext.currentTime);
    whoosh.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
    whooshGain.gain.setValueAtTime(0.1, audioContext.currentTime);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    whoosh.start(audioContext.currentTime);
    whoosh.stop(audioContext.currentTime + 0.3);
    
    // Chime on arrival
    const chime = audioContext.createOscillator();
    const chimeGain = audioContext.createGain();
    chime.connect(chimeGain);
    chimeGain.connect(audioContext.destination);
    chime.type = 'sine';
    chime.frequency.value = 800;
    chimeGain.gain.setValueAtTime(0.15, audioContext.currentTime + 0.35);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    chime.start(audioContext.currentTime + 0.35);
    chime.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio not supported');
  }
};

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
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again.');
  const [isResetting, setIsResetting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [addNotification, setAddNotification] = useState<string | null>(null);
  const [teleportingInterest, setTeleportingInterest] = useState<{interest: string, fromX: number, fromY: number} | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    let mounted = true;

    const startNativeCamera = async () => {
      console.log('🎥 Starting camera...');
      
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
        
        if (mounted) {
          setCameraReady(true);
          console.log('✅ Camera ready');
        }
        
      } catch (err) {
        console.error('❌ Camera error:', err);
        if (mounted) {
          setErrorMessage('Camera access required. Please allow camera permissions.');
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
        console.error('Init error:', err);
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

          const shared = myData.interests.filter((i: string) => 
            theirData.interests.some((ti: string) => ti.toLowerCase() === i.toLowerCase())
          );
          setSharedInterests(shared);

          if (shared.length > 0) {
            playConnectionChime();
          }
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

        console.log('🔗 Switching to Daily.co...');
        
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
            borderRadius: '1rem',
          },
        });

        callObject.current = daily;
        await daily.join({ url: roomUrl });
        console.log('✅ Daily call joined!');
        
      } catch (err: any) {
        console.error('Match error:', err);
        if (mounted) {
          setErrorMessage('Failed to connect');
          setError(true);
        }
      }
    };

    initEverything();

    return () => {
      mounted = false;
      
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (callObject.current) {
        try {
          callObject.current.destroy();
        } catch {}
        callObject.current = null;
      }
    };
  }, [router]);

  const handleTeleportInterest = async (interest: string, event: React.MouseEvent) => {
    if (!auth.currentUser || !myProfile) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTeleportingInterest({
      interest,
      fromX: rect.left + rect.width / 2,
      fromY: rect.top + rect.height / 2,
    });
    
    playTeleportSound();
    
    setTimeout(() => {
      setTeleportingInterest(null);
    }, 500);
    
    const newInterests = [...myProfile.interests, interest];
    setMyProfile({ ...myProfile, interests: newInterests });
    
    // Check if it's now shared
    const isNowShared = theirProfile?.interests.some((i: string) => i.toLowerCase() === interest.toLowerCase());
    if (isNowShared && !sharedInterests.some((s: string) => s.toLowerCase() === interest.toLowerCase())) {
      setSharedInterests([...sharedInterests, interest]);
    }
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        interests: newInterests,
      });
      
      setAddNotification(`Added ${interest}! 🎉`);
      setTimeout(() => setAddNotification(null), 3000);
    } catch (err) {
      console.error('Failed to add interest:', err);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (callObject.current) {
      try {
        callObject.current.destroy();
      } catch {}
      callObject.current = null;
    }
    
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        status: 'idle',
        queuedAt: null,
        partnerId: null,
        currentRoomUrl: null,
      });
    }
    
    window.location.reload();
  };

  const handleEndCall = async () => {
    if (callObject.current) {
      try {
        await callObject.current.destroy();
      } catch {}
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={20} className={isResetting ? 'animate-spin' : ''} />
              {isResetting ? 'Resetting...' : 'Reset & Try Again'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-full shadow-lg"
            >
              Go Home
            </motion.button>
          </div>
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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033]">
      
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[150px] animate-pulse-slow-reverse"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-8 h-16 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]"
        >
          BAE
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEndCall}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg text-sm"
        >
          <X size={16} />
          End
        </motion.button>
      </header>

      {/* Toast Notification */}
      <AnimatePresence>
        {addNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 inset-x-0 z-40 flex justify-center px-4"
          >
            <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm">
              {addNotification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teleporting Pill Animation */}
      <AnimatePresence>
        {teleportingInterest && (
          <motion.div
            initial={{ 
              x: teleportingInterest.fromX, 
              y: teleportingInterest.fromY,
              scale: 1,
              opacity: 1 
            }}
            animate={{ 
              x: window.innerWidth / 2, 
              y: window.innerHeight - 100,
              scale: 0.8,
              opacity: 0.5
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed z-50 px-4 py-2 bg-yellow-300 text-black rounded-full text-sm font-semibold shadow-lg pointer-events-none"
            style={{ position: 'fixed', left: 0, top: 0 }}
          >
            {teleportingInterest.interest}
            <motion.div
              animate={{
                opacity: [0, 1, 0],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
              }}
              className="absolute -inset-2 bg-yellow-400 rounded-full -z-10 blur-md"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative z-10 pt-16 pb-4 px-2 sm:px-4 min-h-screen">
        
        {/* DESKTOP: Side-by-side | MOBILE: Vertical Stack */}
        <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-2 sm:gap-3 max-w-7xl mx-auto">
          
          {/* YOUR VIDEO */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex-1 flex flex-col min-h-0"
          >
            <div className="relative flex-1 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
              <div 
                ref={localVideoContainerRef} 
                className="absolute inset-0 w-full h-full"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-indigo-900/20">
                  <Loader2 className="w-12 h-12 text-white/70 animate-spin" />
                </div>
              )}
            </div>
            
            {/* YOUR NAME */}
            <div className="mt-2 text-center">
              <h3 className="text-base sm:text-lg font-bold text-white/90">
                {myProfile?.displayName || 'You'}
              </h3>
            </div>
            
            {/* YOUR INTERESTS BAR */}
            <div className="mt-2 bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/10">
              <div className="flex flex-wrap gap-1.5 justify-center max-h-16 overflow-y-auto">
                {myProfile?.interests.map((interest: string) => {
                  const isShared = sharedInterests.some((s: string) => s.toLowerCase() === interest.toLowerCase());
                  return (
                    <motion.div
                      key={interest}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isShared
                          ? 'bg-yellow-300/20 text-yellow-300 border border-yellow-300/50'
                          : 'bg-white/10 text-white/70 border border-white/20'
                      }`}
                    >
                      {interest}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* SHARED INTERESTS ZONE (Middle on Desktop) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden lg:flex lg:w-64 flex-col items-center justify-center gap-3 px-2"
          >
            {!isMatched ? (
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="text-center"
              >
                <div className="text-4xl mb-2">💫</div>
                <p className="text-sm font-bold text-white/70">Finding match...</p>
              </motion.div>
            ) : sharedInterests.length > 0 ? (
              <>
                <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">⭐ Shared ⭐</p>
                <div className="flex flex-col gap-2 items-center">
                  <AnimatePresence>
                    {sharedInterests.map((interest: string, idx: number) => (
                      <motion.div
                        key={interest}
                        initial={{ opacity: 0, scale: 0, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative px-4 py-2 text-black bg-yellow-300 border border-yellow-200 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(253,224,71,0.8)]"
                      >
                        {interest}
                        <motion.div
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                          className="absolute -inset-1 bg-yellow-400 rounded-full -z-10 blur-md"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <p className="text-xs text-white/60 mt-2">{sharedInterests.length} match{sharedInterests.length > 1 ? 'es' : ''}</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-white/50">Tap their interests<br/>to discover matches!</p>
              </div>
            )}
          </motion.div>

          {/* THEIR VIDEO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex-1 flex flex-col min-h-0"
          >
            <div className="relative flex-1 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
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
                <div 
                  ref={remoteVideoContainerRef}
                  className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/20"
                />
              )}
            </div>
            
            {/* THEIR NAME */}
            <div className="mt-2 text-center">
              <h3 className="text-base sm:text-lg font-bold text-white/90">
                {theirProfile?.displayName || '...'}
                {theirProfile?.location && (
                  <span className="text-sm font-semibold text-white/60"> • {theirProfile.location}</span>
                )}
              </h3>
            </div>
            
            {/* THEIR INTERESTS BAR (Tappable!) */}
            {isMatched && theirProfile && (
              <div className="mt-2 bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/10">
                <p className="text-xs text-yellow-300 font-bold text-center mb-1">Tap to add ⬇️</p>
                <div className="flex flex-wrap gap-1.5 justify-center max-h-16 overflow-y-auto">
                  {theirProfile.interests.map((interest: string) => {
                    const isShared = sharedInterests.some((s: string) => s.toLowerCase() === interest.toLowerCase());
                    const isAlreadyAdded = myProfile?.interests.some((i: string) => i.toLowerCase() === interest.toLowerCase());
                    
                    return (
                      <motion.button
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: isAlreadyAdded ? 1 : 1.1 }}
                        whileTap={{ scale: isAlreadyAdded ? 1 : 0.9 }}
                        disabled={isAlreadyAdded}
                        onClick={(e) => !isAlreadyAdded && handleTeleportInterest(interest, e)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          isShared
                            ? 'bg-yellow-300/20 text-yellow-300 border border-yellow-300/50 cursor-default'
                            : isAlreadyAdded
                            ? 'bg-white/30 text-white/50 border border-white/30 cursor-default'
                            : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 cursor-pointer'
                        }`}
                      >
                        {interest}
                        {isAlreadyAdded && <span className="ml-1">✓</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* SHARED INTERESTS ZONE (Mobile Only - Below Videos) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:hidden mt-3 flex flex-col items-center gap-2 pb-4"
        >
          {isMatched && sharedInterests.length > 0 && (
            <>
              <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">⭐ Shared Interests ⭐</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                <AnimatePresence>
                  {sharedInterests.map((interest: string, idx: number) => (
                    <motion.div
                      key={interest}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative px-4 py-2 text-black bg-yellow-300 border border-yellow-200 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(253,224,71,0.8)]"
                    >
                      {interest}
                      <motion.div
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                        className="absolute -inset-1 bg-yellow-400 rounded-full -z-10 blur-md"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>

        {/* NEXT BUTTON */}
        {isMatched && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex justify-center mt-4 pb-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMatch}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
            >
              Next Match
              <RefreshCw size={18} />
            </motion.button>
          </motion.div>
        )}
      </section>
    </main>
  );
}