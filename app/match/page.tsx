'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
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
    
    // Warm, ascending chime (C major chord arpeggio)
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
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

  // State
  const [status, setStatus] = useState<'loading' | 'waiting' | 'matched' | 'error'>('loading');
  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showSharedAnimation, setShowSharedAnimation] = useState(false);

  // --- Initialize Match ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    const initMatch = async () => {
      try {
        // ✅ FIXED: Load my profile from correct path
        const snap = await getDoc(doc(db, 'artifacts/SO-INTERESTING/users', user.uid));
        if (!snap.exists()) {
          setStatus('error');
          return;
        }

        const myData: UserData = {
          displayName: snap.data().displayName || user.displayName || 'You',
          interests: snap.data().interests || [],
          location: snap.data().location || '',
        };
        setMyProfile(myData);

        // Call Match API
        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            interests: myData.interests,
            selectedMode: 'video',
          }),
        });

        const matchData = await matchRes.json();

        if (!matchRes.ok) {
          if (matchData.message?.includes('Waiting')) {
            setStatus('waiting');
            return;
          }
          throw new Error(matchData.error || 'Match failed');
        }

        if (matchData.matched) {
          // ✅ FIXED: Load partner profile from correct path
          const partnerSnap = await getDoc(doc(db, 'artifacts/SO-INTERESTING/users', matchData.partnerId));
          if (partnerSnap.exists()) {
            const theirData: UserData = {
              displayName: partnerSnap.data().displayName || 'Match',
              interests: partnerSnap.data().interests || [],
              location: partnerSnap.data().location || '',
            };
            setTheirProfile(theirData);

            // Calculate shared interests
            const shared = myData.interests.filter(i => 
              theirData.interests.some(ti => ti.toLowerCase() === i.toLowerCase())
            );
            setSharedInterests(shared);

            // Play sound and show animation
            if (shared.length > 0) {
              playConnectionChime();
              setShowSharedAnimation(true);
              setTimeout(() => setShowSharedAnimation(false), 2000);
            }
          }

          setStatus('matched');

          // Join Daily.co room
          if (localVideoRef.current && matchData.roomUrl) {
            callObject.current = DailyIframe.createFrame(localVideoRef.current, {
              showLeaveButton: false,
              showFullscreenButton: false,
              iframeStyle: {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '20px',
              },
            });

            await callObject.current.join({ url: matchData.roomUrl });
          }
        }
      } catch (err: any) {
        console.error('Match error:', err);
        setStatus('error');
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

  // --- Action Handlers ---
  const handleWatchYouTube = () => {
    alert('🎥 YouTube watch-together coming soon! Search for a video to watch with your match.');
    // TODO: Implement YouTube sync player
  };

  const handleListenSpotify = () => {
    alert('🎵 Spotify listen-together coming soon! Pick a song or playlist to share.');
    // TODO: Implement Spotify sync player
  };

  const handleAskGemini = () => {
    alert('🤖 Ask Gemini together coming soon! Explore topics with AI assistance.');
    // TODO: Implement shared Gemini chat
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
    router.push('/match');
  };

  // --- Render Loading State ---
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-fuchsia-600 animate-spin mx-auto mb-4" />
          <p className="text-2xl font-bold text-fuchsia-700">Finding your match...</p>
        </div>
      </div>
    );
  }

  // --- Render Waiting State ---
  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-6 animate-pulse">✨</div>
          <h2 className="text-3xl font-bold text-fuchsia-700 mb-4">Waiting for a match...</h2>
          <p className="text-lg text-purple-900 mb-8">We're finding someone who shares your interests</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-white/50 backdrop-blur-sm text-fuchsia-700 font-bold rounded-full shadow-lg"
          >
            Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // --- Render Error State ---
  if (status === 'error') {
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

  // --- Render Matched State (Main UI) ---
  const otherInterests = myProfile?.interests.filter(i => 
    !sharedInterests.some(si => si.toLowerCase() === i.toLowerCase())
  ) || [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100">
      
      {/* Glow Effects */}
      <div className="pointer-events-none absolute top-20 left-10 w-96 h-96 bg-fuchsia-300/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-10 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 h-16 backdrop-blur-md bg-white/10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-extrabold text-fuchsia-600"
        >
          BAE
        </motion.div>
        
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEndCall}
          className="flex items-center gap-2 px-5 py-2 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all"
        >
          <X size={18} />
          End Call
        </motion.button>
      </header>

      {/* Main Content */}
      <section className="relative z-10 pt-24 pb-12 px-6">
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-8 text-purple-900"
        >
          Your shared interests <span className="text-fuchsia-600">glow!</span> ✨
        </motion.h1>

        {/* Video + Interest Bridge Layout */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            
            {/* LEFT: Your Video */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative bg-white/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl"
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-fuchsia-200/50 to-pink-200/50 rounded-2xl overflow-hidden shadow-lg">
                <div ref={localVideoRef} className="w-full h-full" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-fuchsia-700">{myProfile?.displayName || 'You'}</h3>
                {myProfile?.location && (
                  <p className="text-sm text-purple-600">{myProfile.location}</p>
                )}
              </div>
            </motion.div>

            {/* CENTER: Shared Interest Bridge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className="relative flex flex-col items-center justify-center py-8"
            >
              {/* Connection Animation */}
              <AnimatePresence>
                {showSharedAnimation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="text-8xl">✨</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shared Interests */}
              {sharedInterests.length > 0 ? (
                <div className="flex flex-col gap-3 items-center">
                  {sharedInterests.map((interest, idx) => (
                    <motion.div
                      key={interest}
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ 
                        delay: 0.6 + (idx * 0.1),
                        type: 'spring',
                        stiffness: 300
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-200 to-yellow-300 text-yellow-900 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(252,211,77,0.6)] border-2 border-yellow-400"
                    >
                      {interest}
                    </motion.div>
                  ))}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-sm font-semibold text-purple-700 mt-2"
                  >
                    {sharedInterests.length} shared interest{sharedInterests.length > 1 ? 's' : ''}
                  </motion.p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-3">💫</div>
                  <p className="text-lg font-semibold text-purple-700">Start connecting!</p>
                </div>
              )}
            </motion.div>

            {/* RIGHT: Their Video */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative bg-white/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl"
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-indigo-200/50 to-purple-200/50 rounded-2xl overflow-hidden shadow-lg">
                <div ref={remoteVideoRef} className="w-full h-full" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-fuchsia-700">{theirProfile?.displayName || 'Match'}</h3>
                {theirProfile?.location && (
                  <p className="text-sm text-purple-600">{theirProfile.location}</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Other Interests (Below Videos) */}
          {otherInterests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center"
            >
              <p className="text-sm font-semibold text-purple-700 mb-3">Other interests:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {otherInterests.map(interest => (
                  <span
                    key={interest}
                    className="px-4 py-2 bg-white/50 backdrop-blur-sm text-fuchsia-700 rounded-full text-sm font-medium shadow-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWatchYouTube}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all"
            >
              <Youtube size={20} />
              Watch YouTube Together
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleListenSpotify}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full shadow-lg transition-all"
            >
              <Music size={20} />
              Listen to Spotify
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAskGemini}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full shadow-lg transition-all"
            >
              <Sparkles size={20} />
              Ask Gemini Together
            </motion.button>
          </motion.div>

          {/* Next Match Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMatch}
              className="px-8 py-3 bg-white/50 backdrop-blur-sm text-fuchsia-700 font-bold rounded-full shadow-lg hover:bg-white/70 transition-all"
            >
              Next Match →
            </motion.button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}