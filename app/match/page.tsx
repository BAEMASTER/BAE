'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

// --- Types ---
interface UserData {
  displayName: string;
  interests: string[];
}

const getUserProfileRef = (userId: string) =>
  doc(db, `artifacts/SO-INTERESTING/users/${userId}/profile/main`);

export default function MatchPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLDivElement>(null);
  const callObject = useRef<any>(null);

  // State
  const [status, setStatus] = useState<'loading' | 'waiting' | 'matched' | 'error'>('loading');
  const [myProfile, setMyProfile] = useState<UserData | null>(null);
  const [theirProfile, setTheirProfile] = useState<UserData | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds

  // --- 1. Match + room logic ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/auth');
      return;
    }

    const initMatch = async () => {
      try {
        // Load my profile interests
        const snap = await getDoc(getUserProfileRef(user.uid));
        if (!snap.exists()) throw new Error('Profile not found.');
        const myData: UserData = {
          displayName: user.displayName || 'Me',
          interests: snap.data().interests || [],
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
        if (!matchRes.ok) throw new Error(matchData.error || 'Matchmaking failed.');

        if (matchData.message?.includes('Waiting')) {
          setStatus('waiting');
          return;
        }

        if (matchData.matched) {
          setStatus('matched');

          // Load partner profile if exists
          const partnerSnap = await getDoc(getUserProfileRef(matchData.partnerId));
          if (partnerSnap.exists()) {
            setTheirProfile({
              displayName: partnerSnap.data().displayName || 'Match',
              interests: partnerSnap.data().interests || [],
            });
          }

          // Create/Join Daily room
          if (videoRef.current) {
            callObject.current = DailyIframe.createFrame(videoRef.current, {
              showLeaveButton: false,
              iframeStyle: {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              },
            });
            await callObject.current.join({ url: matchData.roomUrl });
          }
        }
      } catch (err: any) {
        console.error('🔥 Match error:', err);
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

  // --- 2. Countdown timer (UI only) ---
  useEffect(() => {
    if (status !== 'matched') return;
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
      .toString()
      .padStart(1, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- 3. Combine + sort interests and mark shared ---
  const { allInterests } = useMemo(() => {
    if (!myProfile) return { allInterests: [] };
    if (!theirProfile) {
      return {
        allInterests: myProfile.interests.map((interest) => ({ interest, isShared: false })),
      };
    }

    const mySet = new Set(myProfile.interests);
    const theirSet = new Set(theirProfile.interests);
    const combined = new Set([...mySet, ...theirSet]);

    const list = Array.from(combined).map((interest) => ({
      interest,
      isShared: mySet.has(interest) && theirSet.has(interest),
    }));

    // Sort: shared first
    list.sort((a, b) => Number(b.isShared) - Number(a.isShared));

    return {
      allInterests: list,
    };
  }, [myProfile, theirProfile]);

  // --- 4. Render UI ---
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 h-[72px] backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">
          BAE
        </div>

        {/* Navigation items */}
        <nav className="hidden sm:flex gap-6 text-sm font-semibold text-white/90">
          <button onClick={() => router.push('/')} className="hover:text-fuchsia-300 transition">Home</button>
          <button onClick={() => router.push('/profile')} className="hover:text-fuchsia-300 transition">Profile</button>
          <button onClick={() => router.push('/devcheck')} className="hover:text-fuchsia-300 transition">DevCheck</button>
        </nav>

        {/* Sign In / Continue with Google button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/auth')}
          className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold px-5 py-2 rounded-full shadow-md text-sm"
        >
          Continue with Google
        </motion.button>
      </header>


      {/* PAGE BODY */}
      <section className="relative z-20 flex flex-col items-center text-center px-6 pt-[72px]">
        
        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-purple-900/90 mt-10 mb-8"
        >
          Your shared interests <span className="text-fuchsia-600">glow!</span> ✨
        </motion.h1>

        {/* MATCH CARDS + VIDEO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl items-start">

          {/* Card 1 */}
          <div className="relative bg-white/40 rounded-3xl p-6 shadow-lg backdrop-blur-lg flex flex-col items-center">
            {/* Face */}
            <div className="w-64 h-64 bg-[rgba(255,255,255,0.2)] rounded-2xl overflow-hidden shadow">
              {/* Replace with their actual video in production */}
              <div ref={videoRef} className="w-full h-full absolute inset-0 z-0 opacity-90"></div>
            </div>

            {/* Gold glowing shared interest chips centered on video */}
            {theirProfile && (
              <div className="absolute top-[200px] flex flex-col gap-2 items-center">
                {theirProfile.interests.filter((i) => myProfile?.interests.includes(i)).map((interest) => (
                  <motion.span
                    key={interest}
                    initial={{ opacity: 0, scale: 0.4, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 250 }}
                    className="bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(252,211,77,0.6)]"
                  >
                    {interest}
                  </motion.span>
                ))}
              </div>
            )}

            {/* Unmatched interests static pills (same color for all unmatched) */}
            <div className="mt-16 flex flex-wrap justify-center gap-2 max-w-sm">
              {myProfile?.interests.filter((i) => !theirProfile?.interests.includes(i)).map((interest) => (
                <span 
                  key={interest} 
                  className="bg-fuchsia-300/25 text-white/80 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                >
                  {interest}
                </span>
              ))}
              {theirProfile?.interests.filter((i) => !myProfile?.interests.includes(i)).map((interest) => (
                <span 
                  key={interest} 
                  className="bg-fuchsia-300/25 text-white/80 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative bg-white/40 rounded-3xl p-6 shadow-lg backdrop-blur-lg flex flex-col items-center">
            <div className="w-64 h-64 bg-[rgba(255,255,255,0.2)] rounded-2xl overflow-hidden shadow" >
              <div className="absolute inset-0 z-0 opacity-90">
                {/* Placeholder for production side */}
                {/* Replace this with their video later */}
              </div>
            </div>

            <div className="absolute top-[200px] flex flex-col gap-2 items-center">
              <motion.span
                initial={{ opacity: 0, scale: 0.4, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 250 }}
                className="bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(252,211,77,0.6)]"
              >
                Hiking
              </motion.span>
              <motion.span
                initial={{ opacity: 0, scale: 0.4, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 250 }}
                className="bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(252,211,77,0.6)]"
              >
                Board Games
              </motion.span>
            </div>


            <div className="mt-16 flex flex-wrap justify-center gap-2 max-w-sm">
              {['Cooking','Cycling','Science Fiction','Photography','Learning'].map((interest) => (
                <span 
                  key={interest} 
                  className="bg-fuchsia-300/25 text-white/80 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/60 text-xs pb-4"
        >
          You have 5 minutes in this initial match ⏱
        </motion.footer>

        {/* Continue / Next Match button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/match')}
          className="mt-4 mb-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-8 py-3 rounded-full shadow-lg"
        >
          Next Match →
        </motion.button>

      </section>
    </main>
  );
}
