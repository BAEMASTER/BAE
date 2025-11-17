'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

function CallContent() {
  const searchParams = useSearchParams();
  const roomUrl = searchParams.get('room');
  const partnerId = searchParams.get('partner');

  const [userId, setUserId] = useState<string | null>(null);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [partnerInterests, setPartnerInterests] = useState<string[]>([]);
  const [shared, setShared] = useState<string[]>([]);

  // 1. Get userId from Firebase Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
  }, []);

  // 2. Load both interest sets
  useEffect(() => {
    if (!userId) return;

    const load = async () => {

      // user
      const userDoc = await getDoc(doc(
        db,
        'artifacts', 'SO-INTERESTING', 'users', userId, 'profile', 'main'
      ));
      const myData = userDoc.data() || {};
      const mine = myData.interests || [];
      setMyInterests(mine);

      // partner
      if (partnerId) {
        const partnerDoc = await getDoc(doc(
          db,
          'artifacts', 'SO-INTERESTING', 'users', partnerId, 'profile', 'main'
        ));
        const pData = partnerDoc.data() || {};
        const pInts = pData.interests || [];
        setPartnerInterests(pInts);

        // shared
        setShared(mine.filter((i: string) => pInts.includes(i)));
      }
    };

    load();
  }, [userId, partnerId]);

  if (!roomUrl) return <p>No room</p>;

  return (
    <div className="relative w-full h-screen flex flex-col bg-black">

      {/* Video Call */}
      <iframe
        src={`${roomUrl}?emb=1`}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />

      {/* Interest Bars */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60">

        <div className="flex justify-between gap-6">

          {/* YOUR INTERESTS */}
          <div className="flex-1">
            <p className="text-xs text-gray-300 mb-1 pl-1">You</p>
            <div className="flex flex-wrap gap-2">
              {myInterests.map((i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    shared.includes(i)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg animate-pulse'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          {/* PARTNER INTERESTS */}
          <div className="flex-1 text-right">
            <p className="text-xs text-gray-300 mb-1 pr-1">Partner</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {partnerInterests.map((i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    shared.includes(i)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg animate-pulse'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

        </div>

        {shared.length > 0 && (
          <p className="text-center text-sm text-pink-300 mt-2 animate-bounce">
            ✨ Shared vibe: {shared.join(', ')} ✨
          </p>
        )}

      </div>

    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <CallContent />
    </Suspense>
  );
}
