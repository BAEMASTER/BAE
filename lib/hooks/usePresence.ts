'use client';

import { useEffect, useRef } from 'react';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresence() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {};
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const updatePresence = async (uid: string, presence: 'online' | 'offline') => {
      try {
        await setDoc(doc(db, 'users', uid), {
          presence,
          lastPresenceUpdate: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.error('Presence update failed', e);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      // Clear any existing heartbeat
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (!user) return;

      // Set online immediately
      updatePresence(user.uid, 'online');

      // Heartbeat
      intervalRef.current = setInterval(() => {
        updatePresence(user.uid, 'online');
      }, HEARTBEAT_INTERVAL);

      // Go offline on page close
      const handleBeforeUnload = () => {
        // Use sendBeacon for reliability on page close
        const payload = JSON.stringify({
          presence: 'offline',
          lastPresenceUpdate: new Date().toISOString(),
        });
        navigator.sendBeacon?.(`/api/presence?uid=${user.uid}`, payload);
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup function stored for the auth state change
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    });

    return () => {
      unsub();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
