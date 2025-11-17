'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { auth, db } from '@\/lib\/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

export default function MatchPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const router = useRouter();
  const videoRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    const createAndJoinRoom = async () => {
      try {
        console.log('🎬 Starting createAndJoinRoom...');

        // ✅ Destroy any previous Daily iframe
        if (frameRef.current) {
          console.log('🧹 Cleaning up existing Daily frame before creating new one...');
          frameRef.current.destroy();
          frameRef.current = null;
        }

        // ✅ Ensure video container is ready
        if (!videoRef.current) {
          await new Promise((r) => setTimeout(r, 100));
          if (!videoRef.current) throw new Error('Video container not ready.');
        }

        // ✅ Create Daily room
        const res = await fetch('/api/create-room', { method: 'POST' });
        if (!res.ok) throw new Error('Room creation failed.');
        const data = await res.json();
        if (!data?.url) throw new Error('No URL returned.');
        console.log('✅ Room created:', data.url);

        // ✅ Create and join Daily iframe safely
        frameRef.current = DailyIframe.createFrame(videoRef.current, {
          showLeaveButton: true,
          iframeStyle: {
            position: 'relative',
            width: '100%',
            height: '80vh',
            border: 'none',
            borderRadius: '16px',
            zIndex: '10', // ✅ changed from number → string
          },
        });

        console.log('🧩 Joining Daily room...');
        await frameRef.current.join({ url: data.url });

        console.log('🎥 Successfully joined room!');
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error:', err);
        setError(err.message || 'Could not start video.');
        setLoading(false);
      }
    };

    const loadUserInterests = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.warn('⚠️ No user found. Redirecting to login...');
          router.push('/auth');
          return;
        }

        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          if (data?.interests) {
            console.log('💡 Loaded interests:', data.interests);
            setInterests(data.interests);
          }
        } else {
          console.log('No user interests found in Firestore.');
        }
      } catch (err) {
        console.error('🔥 Error loading user interests:', err);
      }
    };

    createAndJoinRoom();
    loadUserInterests();

    // ✅ Cleanup on unmount
    return () => {
      const existing = frameRef.current;
      if (existing) {
        console.log('🧹 Cleaning up Daily call on unmount...');
        try {
          existing.destroy();
        } catch (e) {
          console.warn('⚠️ Cleanup skipped:', e);
        }
        frameRef.current = null;
      }
    };
  }, [router]);

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center 
      bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 
      text-fuchsia-800 text-center p-4"
    >
      {loading && !error && (
        <>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-fuchsia-500 mb-6" />
          <h1 className="text-3xl font-bold">
            Finding your next <span className="text-fuchsia-600">BAE</span> 💫
          </h1>
          <p className="mt-4 text-fuchsia-700/70 text-lg">
            Setting up your video match...
          </p>
        </>
      )}

      {error && (
        <>
          <h1 className="text-3xl font-bold text-red-500">Oops 😅</h1>
          <p className="mt-2 text-fuchsia-700/70">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-fuchsia-500 text-white px-6 py-3 rounded-full 
            font-semibold hover:bg-fuchsia-600 transition"
          >
            Back Home
          </button>
        </>
      )}

      {/* ✅ Always render the video container */}
      <div ref={videoRef} className="w-full max-w-5xl mt-4 h-[80vh] relative z-10" />

      {/* ✅ User Interests Section */}
      {!loading && interests.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {interests.map((interest, idx) => (
            <span
              key={idx}
              className="bg-fuchsia-200 text-fuchsia-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm"
            >
              {interest}
            </span>
          ))}
        </div>
      )}
    </main>
  );
}
