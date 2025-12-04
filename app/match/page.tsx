'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Music, Sparkles, X, Loader2 } from 'lucide-react';

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

  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showSharedAnimation, setShowSharedAnimation] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    const initMatch = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          console.error('Profile not found');
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
          setError(true);
          return;
        }

        const matchData = await matchRes.json();

        if (matchData.matched) {
          await handleMatch(matchData.partnerId, matchData.roomUrl, myData);
          return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
          const data = docSnap.data();
          if (data?.status === 'matched' && data?.partnerId && data?.currentRoomUrl) {
            await handleMatch(data.partnerId, data.currentRoomUrl, myData);
            unsubscribe();
          }
        });

      } catch (err: any) {
        console.error('Match error:', err);
        setError(true);
      }
    };

    const handleMatch = async (partnerId: string, roomUrl: string, myData: UserData) => {
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
        callObject.current = DailyIframe.createFrame(localVideoRef.current, {
          showLeaveButton: false,
          showFullscreenButton: false,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '24px',
          },
        });

        await callObject.current.join({ url: roomUrl });
      }
    };

    initMatch();

    return () => {
      if (callObject.current) {
        try {
          callObject.current.destroy();
        } catch {}
        callObject.current = null;
      }
    };
  }, [router]);

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

  const handleEndCall = () => {
    if (callObject.current) {
      callObject.current.leave();
    }
    router.push('/');
  };

  const handleNextMatch = () => {
    if (callObject.current) {
      callObject.current.leave();
    }
    window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-6">😔</div>
          <h2 className="text-3xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-lg text-purple-900 mb-8">Something went wrong. Please try again.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-fuchsia-600 text-white font-bold rounded-full shadow-lg"
          >
            Go Home
          </motion.button>
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
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-8 h-20 backdrop-blur-md bg-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-extrabold text-white"
        >
          BAE
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEndCall}
          className="flex items-center gap-2 px-6 py-3 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all"
        >
          <X size={20} />
          End Call
        </motion.button>
      </header>

      {/* Main Content */}
      <section className="relative z-10 pt-28 pb-12 px-8 h-screen flex flex-col">
        
        {/* Video Grid */}
        <div className="flex-1 flex items-center justify-center gap-8 max-w-[1400px] mx-auto w-full">
          
          {/* Left Video - User */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative w-[35%]"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.5)] ring-4 ring-pink-400/50">
              <div ref={localVideoRef} className="w-full h-full bg-gradient-to-br from-pink-900/20 to-purple-900/20" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-2xl font-bold text-white drop-shadow-lg">{myProfile?.displayName || 'You'}</h3>
              {myProfile?.location && (
                <p className="text-sm text-pink-200">{myProfile.location}</p>
              )}
            </div>
          </motion.div>

          {/* Center - Interest Bridge */}
          <div className="w-[30%] flex flex-col items-center justify-center gap-6 relative">
            
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
                  className="absolute text-9xl"
                >
                  ✨
                </motion.div>
              )}
            </AnimatePresence>

            {isMatched && sharedInterests.length > 0 ? (
              <>
                <p className="text-xs font-bold text-yellow-200 uppercase tracking-wider mb-2">
                  Interest Bridge
                </p>
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
                    <div className="relative px-10 py-6 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-400 rounded-full shadow-[0_0_40px_rgba(251,191,36,0.8)] border-4 border-yellow-200">
                      <p className="text-2xl font-black text-white drop-shadow-lg text-center">
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
                <div className="text-7xl mb-4">💫</div>
                <p className="text-xl font-bold text-white drop-shadow-lg">Finding your match...</p>
                <p className="text-sm text-pink-200 mt-2">Interests will glow here</p>
              </motion.div>
            )}
          </div>

          {/* Right Video - Match */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative w-[35%]"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.5)] ring-4 ring-pink-400/50">
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
                  <div className="text-center">
                    <div className="text-7xl mb-4">✨</div>
                    <p className="text-2xl font-bold text-white drop-shadow-lg">Waiting for</p>
                    <p className="text-2xl font-bold text-white drop-shadow-lg">someone special...</p>
                  </div>
                </motion.div>
              ) : (
                <div ref={remoteVideoRef} className="w-full h-full" />
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                {theirProfile?.displayName || '...'}
              </h3>
              {theirProfile?.location && (
                <p className="text-sm text-pink-200">{theirProfile.location}</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleWatchYouTube}
            disabled={!isMatched}
            className={`flex items-center gap-3 px-8 py-4 text-white font-bold rounded-full shadow-lg transition-all ${
              isMatched 
                ? 'bg-red-500 hover:bg-red-600 cursor-pointer shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Youtube size={24} />
            Watch YouTube Together
          </motion.button>

          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleListenSpotify}
            disabled={!isMatched}
            className={`flex items-center gap-3 px-8 py-4 text-white font-bold rounded-full shadow-lg transition-all ${
              isMatched 
                ? 'bg-green-500 hover:bg-green-600 cursor-pointer shadow-[0_0_30px_rgba(34,197,94,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Music size={24} />
            Listen to Spotify
          </motion.button>

          <motion.button
            whileHover={{ scale: isMatched ? 1.05 : 1, y: -2 }}
            whileTap={{ scale: isMatched ? 0.95 : 1 }}
            onClick={handleAskGemini}
            disabled={!isMatched}
            className={`flex items-center gap-3 px-8 py-4 text-white font-bold rounded-full shadow-lg transition-all ${
              isMatched 
                ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer shadow-[0_0_30px_rgba(59,130,246,0.5)]' 
                : 'bg-gray-500 cursor-not-allowed opacity-40'
            }`}
          >
            <Sparkles size={24} />
            Ask Gemini Together
          </motion.button>
        </motion.div>

        {/* Next Match Button */}
        {isMatched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 text-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMatch}
              className="px-10 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full shadow-lg hover:bg-white/30 transition-all"
            >
              Next Match →
            </motion.button>
          </motion.div>
        )}
      </section>
    </main>
  );
}