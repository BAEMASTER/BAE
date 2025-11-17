"use client";

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import { Loader2, X } from 'lucide-react';

// ✅ Firebase setup
const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}');
const appId = process.env.NEXT_PUBLIC_APP_ID || 'SO-INTERESTING';

// ✅ Type definitions for profile state
interface UserProfile {
  id: string;
  interests: string[];
  selectedMode: string;
  status: string;
  currentRoomUrl: string | null;
  partnerId: string | null;
  displayName: string;
}

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    interests: [],
    selectedMode: 'Single',
    status: 'idle',
    currentRoomUrl: null,
    partnerId: null,
    displayName: 'User',
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');

  // ✅ Firebase initialization
  useEffect(() => {
    console.log('Starting Firebase init...');
    if (!firebaseConfig.apiKey) {
      console.error('Firebase config missing!');
      setError('Firebase config missing.');
      setLoading(false);
      return;
    }

    try {
      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized');
      } else {
        app = getApp();
        console.log('Using existing Firebase app');
      }

      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      setDb(firestore);
      setAuth(userAuth);

      onAuthStateChanged(userAuth, (user) => {
        console.log('Auth state changed:', user ? user.uid : 'No user');
        if (user) {
          setUserId(user.uid);
          setProfile((p) => ({
            ...p,
            id: user.uid,
            displayName: user.displayName || 'User',
          }));
        }
        setIsAuthReady(true);
        setLoading(false);
      });
    } catch (e: any) {
      console.error('Firebase init failed:', e);
      setError('Failed to initialize Firebase: ' + e.message);
      setLoading(false);
    }
  }, []);

  // ✅ Sync Firestore profile
  useEffect(() => {
    if (!db || !userId) return;

    const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/main`);
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile((p) => ({ ...p, ...snapshot.data() }));
        }
      },
      (e) => {
        console.error('Profile fetch error:', e);
        setError('Error loading profile data: ' + e.message);
      }
    );

    return () => unsubscribe();
  }, [db, userId]);

  // ✅ Sign in with Google
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('Google sign-in successful');
    } catch (e: any) {
      console.error('Google sign-in failed:', e);
      setError('Failed to sign in with Google: ' + e.message);
    }
  };

  // ✅ Add interest
  const handleAddInterest = async () => {
    if (!newInterest || !db || !userId) return;
    try {
      const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/main`);
      const currentInterests: string[] = profile.interests || [];
      if (!currentInterests.includes(newInterest)) {
        await setDoc(
          profileRef,
          { interests: [...currentInterests, newInterest] },
          { merge: true }
        );
        setNewInterest('');
      }
    } catch (e: any) {
      console.error('Add interest error:', e);
      setError('Failed to add interest: ' + e.message);
    }
  };

  // ✅ Remove interest
  const handleRemoveInterest = async (interest: string) => {
    if (!db || !userId) return;
    try {
      const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/main`);
      const currentInterests: string[] = profile.interests || [];
      await setDoc(
        profileRef,
        { interests: currentInterests.filter((i) => i !== interest) },
        { merge: true }
      );
    } catch (e: any) {
      console.error('Remove interest error:', e);
      setError('Failed to remove interest: ' + e.message);
    }
  };

  // ✅ Update profile
  const handleUpdateProfile = async (updates: any) => {
    if (!db || !userId) return;
    try {
      const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile/main`);
      await updateDoc(profileRef, updates);
    } catch (e: any) {
      console.error('Update profile error:', e);
      setError('Failed to update profile: ' + e.message);
    }
  };

  // ✅ Start matching
  const handleStartMatching = async () => {
    if (!db || !userId) return;
    try {
      await handleUpdateProfile({ status: 'waiting', timestamp: Timestamp.now() });
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          interests: profile.interests,
          selectedMode: profile.selectedMode,
        }),
      });
      const data = await response.json();
      if (data.roomUrl && data.partnerId) {
        await handleUpdateProfile({
          status: 'matched',
          currentRoomUrl: data.roomUrl,
          partnerId: data.partnerId,
        });
      }
    } catch (e: any) {
      console.error('Start matching error:', e);
      setError('Failed to start matching: ' + e.message);
    }
  };

  // ✅ Stop matching
  const handleStopMatching = async () => {
    if (!db || !userId) return;
    try {
      await handleUpdateProfile({
        status: 'idle',
        currentRoomUrl: deleteField(),
        partnerId: deleteField(),
      });
    } catch (e: any) {
      console.error('Stop matching error:', e);
      setError('Failed to stop matching: ' + e.message);
    }
  };

  // ✅ Render states
  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="ml-3 text-white">Connecting to Firebase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-500 text-white p-4 rounded">{error}</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <button
          onClick={handleGoogleSignIn}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4">Best App Ever</h1>
      <div className="mb-4">
        <p>Welcome, {profile.displayName}!</p>
        <button
          onClick={() => auth.signOut()}
          className="bg-red-500 text-white px-4 py-2 rounded mt-2"
        >
          Sign out
        </button>
      </div>

      {profile.status !== 'matched' ? (
        <div>
          <div className="mb-4">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add interest (e.g., physics)"
              className="bg-gray-800 text-white p-2 rounded mr-2"
            />
            <button
              onClick={handleAddInterest}
              className="bg-indigo-500 text-white px-4 py-2 rounded"
            >
              Add interest
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-xl">Interests</h2>
            <ul className="flex flex-wrap gap-2">
              {(profile.interests || []).map((interest) => (
                <li
                  key={interest}
                  className="flex items-center bg-gray-800 p-2 rounded"
                >
                  <span>{interest}</span>
                  <X
                    className="ml-2 cursor-pointer"
                    size={16}
                    onClick={() => handleRemoveInterest(interest)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <select
              value={profile.selectedMode}
              onChange={(e) =>
                handleUpdateProfile({ selectedMode: e.target.value })
              }
              className="bg-gray-800 text-white p-2 rounded"
            >
              <option value="Single">Single Interest</option>
              <option value="Multiple">Multiple Interests (AND)</option>
            </select>
          </div>

          <button
            onClick={handleStartMatching}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Start matching
          </button>
          {profile.status === 'waiting' && (
            <button
              onClick={handleStopMatching}
              className="bg-yellow-500 text-white px-4 py-2 rounded ml-2"
            >
              Stop matching
            </button>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-xl mb-4">Matched!</h2>
          <iframe
            src={profile.currentRoomUrl || ''}
            allow="camera; microphone"
            className="w-full h-[500px] rounded"
          />
          <button
            onClick={handleStopMatching}
            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
          >
            End video call
          </button>
        </div>
      )}

      <div className="mt-4 p-4 bg-yellow-900 text-white rounded">
        <p>
          <strong>App ID:</strong> {appId}
        </p>
        <p>
          <strong>User ID:</strong> {userId || 'N/A'}
        </p>
        <p>
          <strong>Full Profile Path:</strong> artifacts/{appId}/users/
          {userId || 'N/A'}/profile/main
        </p>
      </div>
    </div>
  );
};

export default App;
