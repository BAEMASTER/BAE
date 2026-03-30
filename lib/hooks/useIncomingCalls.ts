'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { parseInterests, interestNames } from '@/lib/structuredInterests';
import { formatPublicName } from '@/lib/formatName';

export type IncomingCall = {
  callId: string;
  visitorUid: string;
  visitorName: string;
  visitorInterests: string[];
  createdAt: string;
};

export function useIncomingCalls() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {};
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let unsubCalls: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubCalls) { unsubCalls(); unsubCalls = null; }
      setIncomingCall(null);

      if (!user) return;

      // Listen for ringing calls where we are the owner
      const q = query(
        collection(db, 'directCalls'),
        where('ownerUid', '==', user.uid),
        where('status', '==', 'ringing')
      );

      unsubCalls = onSnapshot(q, async (snap) => {
        if (snap.empty) {
          setIncomingCall(null);
          return;
        }

        // Take the most recent ringing call
        const callDoc = snap.docs[0];
        const callData = callDoc.data();

        // Fetch visitor profile
        try {
          const visitorSnap = await getDoc(doc(db, 'users', callData.visitorUid));
          const visitorData = visitorSnap.exists() ? visitorSnap.data() : null;
          const visitorInterests = visitorData?.interests
            ? interestNames(parseInterests(visitorData.interests)).slice(0, 6)
            : [];

          setIncomingCall({
            callId: callDoc.id,
            visitorUid: callData.visitorUid,
            visitorName: visitorData ? formatPublicName(visitorData.displayName) : 'Someone',
            visitorInterests,
            createdAt: callData.createdAt,
          });
        } catch {
          setIncomingCall({
            callId: callDoc.id,
            visitorUid: callData.visitorUid,
            visitorName: 'Someone',
            visitorInterests: [],
            createdAt: callData.createdAt,
          });
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubCalls) unsubCalls();
    };
  }, []);

  return incomingCall;
}
