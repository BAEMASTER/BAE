'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Camera, Sparkles } from 'lucide-react';

// --- STYLES ---
const scrollbarStyle = `
  .interests-scroll::-webkit-scrollbar { height: 4px; }
  .interests-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
  .interests-scroll::-webkit-scrollbar-thumb { background: rgba(253,224,71,0.3); border-radius: 2px; }
`;

// --- AUDIO HELPERS ---
let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
};

const playVibeSound = async (level: number) => {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  if (level >= 5) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(g).connect(ctx.destination);
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.5);
    });
  } else {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(440 * Math.pow(1.25, level - 1), now);
    osc.connect(g).connect(ctx.destination);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  }
};

// --- COMPONENTS ---

function FluidVibeOMeter({ count }: { count: number }) {
  const levels = ['COOL', 'REAL', 'DEEP', 'SUPER', 'GOLDEN TICKET'];
  const currentLevel = count > 0 ? levels[Math.min(count - 1, 4)] : null;
  if (count === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1 mt-2 pointer-events-none">
      <div className="relative w-4 h-32 rounded-full bg-black/40 backdrop-blur-md border border-white/20 overflow-hidden flex flex-col justify-end p-0.5 shadow-2xl">
        <motion.div
          animate={{ height: `${(count / 5) * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className="w-full rounded-full bg-gradient-to-t from-fuchsia-600 via-pink-500 to-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.5)]"
        />
        <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${count >= 5 ? 'bg-yellow-300 shadow-[0_0_8px_#fff]' : 'bg-white/20'}`} />
      </div>
      <p className="text-[9px] font-black text-yellow-300 tracking-widest uppercase text-center shadow-black drop-shadow-md">{currentLevel}</p>
    </motion.div>
  );
}

function GoldenTicketOverlay() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none p-6">
      <div className="bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-600 p-10 rounded-lg border-4 border-yellow-300 shadow-[0_0_60px_rgba(251,191,36,0.8)] text-center">
        <h1 className="text-6xl font-black text-black italic tracking-tighter">🎫 GOLDEN TICKET!</h1>
        <p className="text-black font-extrabold text-xl mt-2 uppercase">Perfect Match Found!</p>
      </div>
    </motion.div>
  );
}

// --- MAIN PAGE ---

export default function MatchPage() {
  const router = useRouter();
  const yourVideoRef = useRef<HTMLVideoElement>(null);
  const theirVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const callObject = useRef<any>(null);
  
  const [user, setUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [error, setError] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  // 1. Initial Auth and Preview Setup
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) setMyProfile(snap.data());

      // Start Preview Stream immediately for the blur effect
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPreviewStream(stream);
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      } catch (e) {
        console.error("Camera access denied");
        setError(true);
      }
    });
    return () => {
      unsub();
      previewStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // 2. Start Matching (Only after they click)
  const handleStartVibing = () => {
    // Stop the preview stream so Daily can take over the hardware cleanly
    previewStream?.getTracks().forEach(track => track.stop());
    setPermissionGranted(true);
    if (user && myProfile) {
      initiateMatch(user.uid, myProfile.interests);
    }
  };

  const initiateMatch = async (uid: string, interests: string[]) => {
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, interests, selectedMode: 'video' }),
      });
      const data = await res.json();
      if (data.matched) joinRoom(data.roomUrl, data.partnerId);

      onSnapshot(doc(db, 'users', uid), (snap) => {
        const d = snap.data();
        if (d?.status === 'matched' && d?.currentRoomUrl && !isMatched) {
          joinRoom(d.currentRoomUrl, d.partnerId);
        }
      });
    } catch (e) { setError(true); }
  };

  const joinRoom = async (url: string, partnerId: string) => {
    if (callObject.current) return;
    setIsMatched(true);
    const pSnap = await getDoc(doc(db, 'users', partnerId));
    if (pSnap.exists()) setTheirProfile(pSnap.data());

    const daily = DailyIframe.createFrame({ showLocalVideo: false });
    callObject.current = daily;

    daily.on('track-started', (evt) => {
      if (evt.track.kind !== 'video') return;
      const attempt = (count = 0) => {
        const ref = evt.participant.local ? yourVideoRef : theirVideoRef;
        if (ref.current) {
          ref.current.srcObject = new MediaStream([evt.track]);
          ref.current.play().catch(() => {});
        } else if (count < 20) setTimeout(() => attempt(count + 1), 150);
      };
      attempt();
    });

    await daily.join({ url });
  };

  const addInterest = async (interest: string) => {
    if (!user || !myProfile || myProfile.interests.includes(interest)) return;
    const updated = [...myProfile.interests, interest];
    setMyProfile({ ...myProfile, interests: updated });
    await updateDoc(doc(db, 'users', user.uid), { interests: updated });
  };

  const shared = useMemo(() => {
    if (!myProfile || !theirProfile) return [];
    const t = theirProfile.interests.map((i: string) => i.toLowerCase().trim());
    return myProfile.interests.filter((i: string) => t.includes(i.toLowerCase().trim()));
  }, [myProfile, theirProfile]);

  useEffect(() => {
    if (shared.length > 0) {
      playVibeSound(shared.length);
      if (shared.length >= 5) {
        setShowTicket(true);
        const timer = setTimeout(() => setShowTicket(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [shared.length]);

  if (error) return <div className="h-screen bg-black flex items-center justify-center text-white p-6 text-center">Camera error. Please ensure you have enabled permissions in your browser.</div>;

  // --- STAGE 0: PRE-FLIGHT (BLUR PREVIEW) ---
  if (!permissionGranted) {
    return (
      <div className="h-screen w-screen bg-[#0a001a] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="relative w-64 h-64 md:w-80 md:h-80 mb-10 group">
          <video 
            ref={previewVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover rounded-full border-4 border-yellow-400/30 blur-md scale-x-[-1]" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <Camera className="w-12 h-12 text-yellow-400 opacity-50" />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-black px-4 py-1 rounded-full shadow-lg">
            PRIVATE PREVIEW
          </div>
        </div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-6xl font-black text-white italic mb-4 tracking-tighter"
        >
          READY TO VIBE?
        </motion.h1>
        
        <p className="text-white/50 max-w-xs mb-10 text-sm font-medium">
          Once you enter, you'll be matched with people who share your passions.
        </p>

        <button 
          onClick={handleStartVibing}
          className="group relative px-12 py-5 bg-yellow-400 rounded-full flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(253,224,71,0.4)]"
        >
          <span className="text-black font-black text-xl tracking-tighter">START BAEING NOW</span>
          <Sparkles className="w-6 h-6 text-black animate-pulse" />
        </button>
      </div>
    );
  }

  // --- STAGE 1: MAIN VIDEO UI ---
  return (
    <main className="relative w-screen h-screen bg-[#0a001a] overflow-hidden flex flex-col">
      <style>{scrollbarStyle}</style>

      {/* TOP OVERLAY: INTERESTS & METER */}
      <div className="absolute inset-x-0 top-16 flex flex-col items-center pointer-events-none z-50">
        <AnimatePresence>
          {isMatched && shared.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap justify-center gap-2 px-4 max-w-md">
                {shared.map((i, idx) => (
                  <motion.div key={idx} initial={{ scale: 0, y: -10 }} animate={{ scale: 1, y: 0 }} className="px-4 py-1.5 bg-yellow-300 text-black font-black rounded-full text-[11px] shadow-[0_0_15px_#fbbf24]">
                    {i}
                  </motion.div>
                ))}
              </div>
              <FluidVibeOMeter count={shared.length} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>{showTicket && <GoldenTicketOverlay />}</AnimatePresence>

      <div className="flex-1 flex">
        {/* LOCAL VIDEO */}
        <div className="relative flex-1 bg-neutral-900 border-r border-white/5">
          <video ref={yourVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute bottom-20 left-4 bg-black/50 px-3 py-1 rounded text-[10px] text-white font-black tracking-widest uppercase">YOU</div>
          <div className="absolute bottom-0 w-full p-4 bg-black/40 backdrop-blur-md overflow-x-auto flex gap-2 interests-scroll">
            {myProfile?.interests.map((i: string) => <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white border border-white/10">{i}</span>)}
          </div>
        </div>

        {/* PARTNER VIDEO */}
        <div className="relative flex-1 bg-neutral-900 flex items-center justify-center">
          {isMatched ? (
            <>
              <video ref={theirVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-20 left-4 bg-black/50 px-3 py-1 rounded text-[10px] text-white font-black tracking-widest uppercase">{theirProfile?.displayName || 'Partner'}</div>
              <div className="absolute bottom-0 w-full p-4 bg-black/60 backdrop-blur-md overflow-x-auto flex gap-2 interests-scroll z-50">
                {theirProfile?.interests.map((i: string) => (
                  <button key={i} onClick={() => addInterest(i)} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${myProfile?.interests.includes(i) ? 'bg-yellow-400 text-black border-yellow-200' : 'bg-white/10 text-white border-white/20'}`}>
                    {myProfile?.interests.includes(i) ? '✨ ' + i : '+ ' + i}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
              <p className="text-yellow-400 font-black tracking-[0.3em] text-sm animate-pulse uppercase">Finding Your BAE...</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => window.location.href = '/'} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] p-4 bg-red-600 rounded-full text-white shadow-2xl hover:bg-red-700 transition-all active:scale-90">
        <X className="w-8 h-8" />
      </button>
    </main>
  );
}