'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Music, Sparkles, X, Loader2, RefreshCw } from 'lucide-react';

// --- Types ---
interface UserData {
  displayName: string;
  interests: string[];
  location?: string;
}

// --- Sound Effect ---
const playConnectionChime = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [261.63, 329.63, 392.00, 523.25];
    
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      const startTime = audioContext.currentTime + (index * 0.1);
      const duration = 0.3;
      
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.log('Audio not supported');
  }
};

export default function MatchPage() {
  const router = useRouter();
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const callObject = useRef<any>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showSharedAnimation, setShowSharedAnimation] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again.');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    // Initialize local video immediately
  const initializeLocalVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' },
      audio: true 
    });
    
    localStreamRef.current = stream;
    
    // Wait for container
    for (let i = 0; i < 20; i++) {
      if (localVideoRef.current) break;
      await new Promise(r => setTimeout(r, 50));
    }
    
    if (!localVideoRef.current) return;
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1)';
    
    localVideoRef.current.innerHTML = '';
    localVideoRef.current.appendChild(video);
    video.play();
    
  } catch (err: any) {
    console.error('Camera error:', err);
    setError(true);
  }
};
        
        
    const cleanupAndInit = async () => {
      try {
        // Start camera FIRST
        await initializeLocalVideo();
        
        // Clean up any stale state
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          status: 'idle',
          queuedAt: null,
          partnerId: null,
          currentRoomUrl: null,
        });

        // Then initialize matching
        await initMatch();
      } catch (err) {
        console.error('Cleanup error:', err);
        setError(true);
      }
    };

    const initMatch = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          console.error('Profile not found');
          setErrorMessage('Profile not found. Please complete your profile first.');
          setError(true);
          return;
        }

        const myData: UserData = {
          displayName: snap.data().displayName || user.displayName || 'You',
          interests: snap.data().interests || [],
          location: snap.data().location || '',
        };
        setMyProfile(myData);

        if (!myData.interests || myData.interests.length < 3) {
          console.error('Not enough interests');
          router.push('/profile');
          return;
        }

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
          const text = await matchRes.text();
          console.error('Match API error:', text);
          setErrorMessage('Failed to start matching. Please try again.');
          setError(true);
          return;
        }

        const matchData = await matchRes.json();

        if (matchData.matched) {
          await handleMatch(matchData.partnerId, matchData.roomUrl, myData);
          return;
        }

        timeoutIdRef.current = setTimeout(async () => {
          console.warn('Match timeout - cleaning up');
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            status: 'idle',
            queuedAt: null,
          });
          setErrorMessage('Matching took too long. Please try again.');
          setError(true);
        }, 300000);

        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeRef.current = onSnapshot(userDocRef, async (docSnap) => {
          const data = docSnap.data();
          if (data?.status === 'matched' && data?.partnerId && data?.currentRoomUrl) {
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
            }
            await handleMatch(data.partnerId, data.currentRoomUrl, myData);
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
            }
          }
        });

      } catch (err: any) {
        console.error('Match error:', err);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setError(true);
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

          const shared = myData.interests.filter(i => 
            theirData.interests.some(ti => ti.toLowerCase() === i.toLowerCase())
          );
          setSharedInterests(shared);

          if (shared.length > 0) {
            playConnectionChime();
            setShowSharedAnimation(true);
            setTimeout(() => setShowSharedAnimation(false), 2000);
          }
        }

        setIsMatched(true);

        if (localVideoRef.current && roomUrl) {
          try {
            // Stop the local preview video first
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            
            // Clear the preview video element
            if (localVideoRef.current) {
              localVideoRef.current.innerHTML = '';
            }

         // Now create Daily.co call
callObject.current = DailyIframe.createFrame(localVideoRef.current, {
  // Hide ALL UI
  showLeaveButton: false,
  showFullscreenButton: false,
  showParticipantsBar: false,
  customTrayButtons: {},
  
  // Additional UI hiding
  showLocalVideo: true,
  showUserNameChangeUI: false,
  
  // Styling to fill container
  iframeStyle: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '24px',
  },
  
  // CRITICAL: Custom layout to show ONLY video
  customLayout: true,
});

           const joinResult = await callObject.current.join({ 
  url: roomUrl,
  startVideoOff: false,
  startAudioOff: false,
});

if (!joinResult) {
  throw new Error('Failed to join video room');
}

// Configure layout to hide UI
await callObject.current.setShowNamesMode(false);
await callObject.current.setActiveSpeakerMode(false);

          } catch (videoError) {
            console.error('Video room error:', videoError);
            
            if (callObject.current) {
              try {
                callObject.current.destroy();
              } catch {}
              callObject.current = null;
            }
            
            await updateDoc(doc(db, 'users', user.uid), {
              status: 'idle',
              currentRoomUrl: null,
              partnerId: null,
            });
            
            setErrorMessage('The video room is no longer available. Please try matching again.');
            setError(true);
          }
        }
      } catch (err) {
        console.error('Handle match error:', err);
        setErrorMessage('Failed to connect with your match. Please try again.');
        setError(true);
      }
    };

    cleanupAndInit();

    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        const data = JSON.stringify({
          userId: auth.currentUser.uid,
          action: 'cleanup'
        });
        navigator.sendBeacon('/api/cleanup', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
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
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          status: 'idle',
          currentRoomUrl: null,
        }).catch(err => console.error('Cleanup error:', err));
      }
    };
  }, [router]);

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
    
    setIsResetting(false);
    window.location.reload();
  };

  const handleWatchYouTube = () => {
    if (!isMatched) return;
    alert('🎥 YouTube watch-together coming soon!');
  };

  const handleListenSpotify = () => {
    if (!isMatched) return;
    alert('🎵 Spotify listen-together coming soon!');
  };

  const handleAskGemini = () => {
    if (!isMatched) return;
    alert('✨ Ask Gemini together coming soon!');
  };

  const handleEndCall = async () => {
    if (callObject.current) {
      try {
        await callObject.current.leave();
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

  const handleNextMatch = async () => {
    if (callObject.current) {
      try {
        await callObject.current.leave();
      } catch {}
    }
    
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        status: 'idle',
        currentRoomUrl: null,
        partnerId: null,
      });
    }
    
    window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-6">😔</div>
          <h2 className="text-3xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-lg text-purple-900 mb-8">{errorMessage}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-fuchsia-600 animate-spin" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700">
      
      {/* Animated blob background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20 backdrop-blur-md bg-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl sm:text-4xl font-extrabold text-white"
        >
          BAE
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEndCall}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all text-sm sm:text-base"
        >
          <X size={18} />
          <span className="hidden sm:inline">End Call</span>
          <span className="sm:hidden">End</span>
        </motion.button>
      </header>

      {/* Main Content */}
      <section className="relative z-10 pt-20 sm:pt-28 pb-8 sm:pb-12 px-4 sm:px-8 min-h-screen flex flex-col">
        
        {/* Video Grid - BIGGER VIDEOS (40% each) */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-7xl mx-auto w-full">
          
          {/* Left Video - User - BIGGER */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative w-full lg:w-[40%] max-w-md lg:max-w-none"
          >
            <div className="relative aspect-[3/4] rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.5)] lg:shadow-[0_0_60px_rgba(236,72,153,0.5)] ring-2 lg:ring-4 ring-pink-400/50">
              <div ref={localVideoRef} className="w-full h-full bg-gradient-to-br from-pink-900/20 to-purple-900/20" />
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{myProfile?.displayName || 'You'}</h3>
              {myProfile?.location && (
                <p className="text-xs sm:text-sm text-pink-200">{myProfile.location}</p>
              )}
            </div>
          </motion.div>

          {/* Center - Interest Bridge - SMALLER (20%) - NO LABEL */}
          <div className="w-full lg:w-[20%] flex flex-col items-center justify-center gap-4 sm:gap-6 relative py-6 sm:py-8">
            
            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 40 - 20, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}

            <AnimatePresence>
              {showSharedAnimation && (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1.5, rotate: 360 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute text-7xl sm:text-9xl"
                >
                  ✨
                </motion.div>
              )}
            </AnimatePresence>

            {isMatched && sharedInterests.length > 0 ? (
              <>
                {sharedInterests.map((interest, idx) => (
                  <motion.div
                    key={interest}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      y: [0, -10, 0],
                    }}
                    transition={{ 
                      delay: 0.5 + (idx * 0.2),
                      y: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.3,
                      }
                    }}
                    className="relative"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full blur-xl opacity-75 animate-pulse" />
                    
                    {/* Main orb */}
                    <div className="relative px-6 py-4 sm:px-8 sm:py-5 lg:px-10 lg:py-6 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.8)] lg:shadow-[0_0_40px_rgba(251,191,36,0.8)] border-2 lg:border-4 border-yellow-200">
                      <p className="text-lg sm:text-xl lg:text-2xl font-black text-white drop-shadow-lg text-center whitespace-nowrap">
                        {interest}
                      </p>
                    </div>

                    {/* Sparkles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="absolute w-2 h-2 bg-yellow-200 rounded-full"
                        style={{
                          left: `${50 + Math.cos((i * Math.PI * 2) / 8) * 80}%`,
                          top: `${50 + Math.sin((i * Math.PI * 2) / 8) * 80}%`,
                        }}
                      />
                    ))}
                  </motion.div>
                ))}
                <p className="text-sm font-bold text-yellow-200 mt-4">
                  {sharedInterests.length} shared interest{sharedInterests.length > 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-center"
              >
                <div className="text-5xl sm:text-7xl mb-4">💫</div>
                <p className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">Finding your match...</p>
                <p className="text-xs sm:text-sm text-pink-200 mt-2">Interests will glow here</p>
              </motion.div>
            )}
          </div>

          {/* Right Video - Match - BIGGER */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative w-full lg:w-[40%] max-w-md lg:max-w-none"
          >
            <div className="relative aspect-[3/4] rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.5)] lg:shadow-[0_0_60px_rgba(236,72,153,0.5)] ring-2 lg:ring-4 ring-pink-400/50">
              {!isMatched ? (
                <motion.div 
                  animate={{ 
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40"
                >
                  <div className="text-center px-4">
                    <div className="text-5xl sm:text-7xl mb-4">✨</div>
                    <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Waiting for</p>
                    <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">someone special...</p>
                  </div>
                </motion.div>
              ) : (
                <div ref={remoteVideoRef} className="w-full h-full" />
              )}
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                {theirProfile?.displayName || '...'}
              </h3>
              {theirProfile?.location && (
                <p className="text-xs sm:text-sm text-pink-200">{theirProfile.location}</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-4"
        >
          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleWatchYouTube}
            disabled={!isMatched}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 text-white font-bold rounded-full shadow-lg transition-all text-sm sm:text-base w-full sm:w-auto ${
              isMatched 
                ? 'bg-red-500 hover:bg-red-600 cursor-pointer shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Youtube size={20} className="sm:w-6 sm:h-6" />
            <span>Watch YouTube Together</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleListenSpotify}
            disabled={!isMatched}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 text-white font-bold rounded-full shadow-lg transition-all text-sm sm:text-base w-full sm:w-auto ${
              isMatched 
                ? 'bg-green-500 hover:bg-green-600 cursor-pointer shadow-[0_0_30px_rgba(34,197,94,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Music size={20} className="sm:w-6 sm:h-6" />
            <span>Listen to Spotify</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleAskGemini}
            disabled={!isMatched}
            className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 text-white font-bold rounded-full shadow-lg transition-all text-sm sm:text-base w-full sm:w-auto ${
              isMatched 
                ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-[0_0_30px_rgba(59,130,246,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Sparkles size={20} className="sm:w-6 sm:h-6" />
            <span>Ask Gemini Together</span>
          </motion.button>
        </motion.div>

        {/* Next Match Button */}
        {isMatched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-4 sm:mt-6 text-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMatch}
              className="px-8 sm:px-10 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full shadow-lg hover:bg-white/30 transition-all text-sm sm:text-base"
            >
              Next Match →
            </motion.button>
          </motion.div>
        )}
      </section>
    </main>
  );
}