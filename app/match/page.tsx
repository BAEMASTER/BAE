'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Camera, Sparkles } from 'lucide-react';

/* --- STYLES --- */
const scrollbarStyle = `
  .interests-scroll::-webkit-scrollbar { height: 4px; }
  .interests-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
  .interests-scroll::-webkit-scrollbar-thumb { background: rgba(253,224,71,0.3); border-radius: 2px; }
`;

/* --- AUDIO --- */
let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
};

const playVibeSound = (level: number) => {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = level >= 5 ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(440 * Math.pow(1.25, level - 1), now);
  osc.connect(g).connect(ctx.destination);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.15, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  osc.start(now);
  osc.stop(now + 0.4);
};

/* --- COMPONENTS --- */
function FluidVibeOMeter({ count }: { count: number }) {
  if (count === 0) return null;
  const labels = ['COOL', 'REAL', 'DEEP', 'SUPER', 'GOLDEN'];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mt-2 pointer-events-none">
      <div className="w-4 h-32 rounded-full bg-black/40 border border-white/20 overflow-hidden flex flex-col justify-end p-0.5 shadow-2xl">
        <motion.div
          animate={{ height: `${Math.min(count, 5) * 20}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 14 }}
          className="w-full rounded-full bg-gradient-to-t from-fuchsia-600 via-pink-500 to-yellow-300 shadow-[0_0_15px_#fbbf24]"
        />
      </div>
      <p className="text-[10px] font-black text-yellow-300 tracking-[0.2em] mt-2 drop-shadow-md">
        {labels[Math.min(count - 1, 4)]}
      </p>
    </motion.div>
  );
}

function GoldenTicketOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
    >
      <div className="bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 p-10 rounded-xl border-4 border-yellow-200 shadow-[0_0_50px_rgba(251,191,36,0.6)] text-center">
        <h1 className="text-5xl md:text-7xl font-black italic text-black tracking-tighter">🎫 GOLDEN TICKET</h1>
        <p className="font-black mt-2 uppercase text-black tracking-widest text-lg">Perfect Match!</p>
      </div>
    </motion.div>
  );
}

/* --- MAIN PAGE --- */
export default function MatchPage() {
  const router = useRouter();
  const yourVideoRef = useRef<HTMLVideoElement>(null);
  const theirVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const callObjectRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [error, setError] = useState(false);
  const [prevSharedCount, setPrevSharedCount] = useState(0);

  /* --- AUTH + CAMERA --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push('/auth');
      setUser(u);

      const snap = await getDoc(doc(db, 'users', u.uid));
      setMyProfile({ ...snap.data(), interests: snap.data()?.interests || [] });

      if (!mediaStreamRef.current) {
        try {
          mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (previewVideoRef.current) previewVideoRef.current.srcObject = mediaStreamRef.current;
        } catch {
          setError(true);
        }
      }
    });
    return () => unsub();
  }, []);

  /* --- SHARED INTERESTS COMPUTED --- */
  const shared = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    const t = theirProfile.interests.map((i: string) => i.toLowerCase());
    return myProfile.interests.filter((i: string) => t.includes(i.toLowerCase()));
  }, [myProfile, theirProfile]);

  /* --- PLAY VIBE SOUND + GOLDEN TICKET --- */
  useEffect(() => {
    if (shared.length !== prevSharedCount) {
      if (shared.length > 0) playVibeSound(shared.length);
      if (shared.length >= 5) {
        setShowTicket(true);
        setTimeout(() => setShowTicket(false), 3000);
      }
      setPrevSharedCount(shared.length);
    }
  }, [shared.length, prevSharedCount]);

  /* --- MATCH + NEXT --- */
  const initiateMatch = async () => {
    setIsMatched(false);
    setTheirProfile(null);
    setPrevSharedCount(0); // Reset vibe meter for new match

    if (callObjectRef.current) {
      await callObjectRef.current.leave?.();
      callObjectRef.current.destroy?.();
      callObjectRef.current = null;
    }

    await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, interests: myProfile.interests }),
    });

    onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const d = snap.data();
      if (d?.status === 'matched' && d?.currentRoomUrl) joinRoom(d.currentRoomUrl, d.partnerId);
    });
  };

  const joinRoom = async (url: string, partnerId: string) => {
    const pSnap = await getDoc(doc(db, 'users', partnerId));
    setTheirProfile({ ...pSnap.data(), interests: pSnap.data()?.interests || [] });
    setIsMatched(true);

    const daily = DailyIframe.createCallObject();
    callObjectRef.current = daily;

    daily.on('track-started', ({ track, participant }) => {
  if (!participant || track.kind !== 'video') return; // <-- guard added
  const ref = participant.local ? yourVideoRef : theirVideoRef;
  if (ref.current) ref.current.srcObject = new MediaStream([track]);
});


await daily.join({ 
  url, 
  audioSource: mediaStreamRef.current!.getAudioTracks()[0] || true, 
  videoSource: mediaStreamRef.current!.getVideoTracks()[0] || true 
});

  };

  /* --- ADD INTEREST (TAP TO STEAL) --- */
  const addInterest = async (interest: string) => {
    if (myProfile.interests.includes(interest)) return;
    const updated = [...myProfile.interests, interest];
    setMyProfile({ ...myProfile, interests: updated }); // immediate UI update
    await updateDoc(doc(db, 'users', user.uid), { interests: updated });
  };

  /* --- RENDER --- */
  if (error) return <div className="h-screen flex items-center justify-center text-white">Camera Permission Denied</div>;

  if (!permissionGranted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a001a] p-6 text-center">
        <video
          ref={previewVideoRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-64 rounded-full border-4 border-yellow-400/20 blur-sm scale-x-[-1] mb-8 object-cover"
        />
        <h1 className="text-4xl font-black text-white italic tracking-tighter mb-8">READY TO BAE?</h1>
        <button
          onClick={() => {
            getAudioCtx().resume();
            setPermissionGranted(true);
            initiateMatch();
          }}
          className="bg-yellow-400 px-12 py-5 rounded-full font-black text-xl shadow-[0_0_30px_rgba(253,224,71,0.4)] hover:scale-105 transition-transform"
        >
          START BAEING
        </button>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen bg-black flex flex-col relative overflow-hidden">
      <style>{scrollbarStyle}</style>
      <AnimatePresence>{showTicket && <GoldenTicketOverlay />}</AnimatePresence>

      {/* TOP SHARED INTERESTS + VIBE O METER */}
      <div className="absolute inset-x-0 top-10 flex flex-col items-center pointer-events-none z-50">
        <div className="flex flex-wrap justify-center gap-2 px-4 max-w-lg">
          {shared.map((i: string, idx: number) => (
            <motion.div
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-4 py-1.5 bg-yellow-300 text-black font-black rounded-full text-[11px] shadow-[0_0_15px_#fbbf24]"
            >
              {i}
            </motion.div>
          ))}
        </div>
        <FluidVibeOMeter count={shared.length} />
      </div>

      {/* VIDEO GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* YOU */}
        <div className="flex-1 relative border-r border-white/5 bg-neutral-900">
          <video ref={yourVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute bottom-20 left-4 bg-black/40 px-3 py-1 rounded text-[10px] text-white font-bold uppercase tracking-widest">YOU</div>
          <div className="absolute bottom-0 w-full p-4 bg-black/30 backdrop-blur-md overflow-x-auto flex gap-2 interests-scroll">
            {myProfile?.interests.map((i: string) => (
              <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white border border-white/10 whitespace-nowrap">
                {i}
              </span>
            ))}
          </div>
        </div>

        {/* PARTNER */}
        <div className="flex-1 relative bg-neutral-900 flex">
          {isMatched ? (
            <>
              <video ref={theirVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-20 left-4 bg-black/40 px-3 py-1 rounded text-[10px] text-white font-bold uppercase tracking-widest">
                {theirProfile?.displayName || 'Match'}
              </div>
              <div className="absolute bottom-0 w-full p-4 bg-black/50 backdrop-blur-md overflow-x-auto flex gap-2 interests-scroll z-50">
                {theirProfile?.interests.map((i: string) => (
                  <button
                    key={i}
                    onClick={() => addInterest(i)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      myProfile.interests.includes(i)
                        ? 'bg-yellow-400 text-black border-transparent'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    {myProfile.interests.includes(i) ? '✨ ' + i : '+ ' + i}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="m-auto flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin text-yellow-400 mb-4" />
              <p className="text-yellow-400 font-black tracking-widest text-xs animate-pulse">FINDING BAE...</p>
            </div>
          )}
        </div>
      </div>

      {/* NEXT BUTTON */}
      <button
        onClick={initiateMatch}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-600 p-5 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all z-[60]"
      >
        <X className="text-white w-6 h-6" />
      </button>
    </main>
  );
}
