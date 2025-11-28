'use client';

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User, getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Twitch, Youtube, Link, Globe, User as UserIcon, Save } from 'lucide-react';

// --- Firebase Initialization Setup ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const router = {
  push: (path: string) => {
    window.history.pushState({}, '', path);
    window.location.reload();
  }
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMinInterestWarning, setShowMinInterestWarning] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [platformLinks, setPlatformLinks] = useState({
    instagram: '',
    tiktok: '',
    twitch: '',
    youtube: '',
    website: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
        setIsAuthReady(true);
        return;
      }
      setUser(u);

      const userDocRef = doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'data');
      try {
        const snap = await getDoc(userDocRef);
        const data = snap.data();

        if (data) {
          setDisplayName(data.displayName || u.displayName || '');
          setInterests(data.interests || []);
          setPlatformLinks({
            instagram: data.platformLinks?.instagram || '',
            tiktok: data.platformLinks?.tiktok || '',
            twitch: data.platformLinks?.twitch || '',
            youtube: data.platformLinks?.youtube || '',
            website: data.platformLinks?.website || '',
          });
        } else {
          setDisplayName(u.displayName || '');
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const handlePlatformChange = (name: keyof typeof platformLinks, value: string) => {
    setPlatformLinks(prev => ({ ...prev, [name]: value }));
  };

  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  const saveProfile = async () => {
    if (!user) return;

    if (interests.length < 3) {
      setShowMinInterestWarning(true);
      setTimeout(() => setShowMinInterestWarning(false), 3000);
      return;
    }

    setSaving(true);
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    try {
      await setDoc(
        userDocRef,
        { displayName, interests, updatedAt: new Date().toISOString(), platformLinks },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const goBAE = () => {
    if (interests.length < 3) {
      setShowMinInterestWarning(true);
      setTimeout(() => setShowMinInterestWarning(false), 3000);
      return;
    }
    router.push('/');
  };

  const triggerPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-200 via-fuchsia-200 to-rose-200 flex items-center justify-center">
        <p className="text-xl font-bold text-fuchsia-700">Loading Profile...</p>
      </div>
    );
  }

  const canBae = interests.length >= 3;
  const baeButtonText = canBae ? 'BAE Someone ✨' : '3 Interests Required';

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-200 via-fuchsia-200 to-rose-200 pt-[96px] text-fuchsia-900">
      
      <input
        type="file"
        ref={photoInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => console.log("Photo upload handler here later", e.target.files?.[0])}
      />

      <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* --- PERSONAL SECTION (MINIMIZED) --- */}
        <div className="bg-white/20 backdrop-blur-2xl border border-white/30 shadow-xl rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 mb-2 overflow-hidden rounded-full border-4 border-white/40 shadow-md">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <UserIcon size={36} className="text-fuchsia-700/60" />
              </div>
            )}
          </div>

          <button 
            onClick={triggerPhotoPicker} 
            className="text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800 transition"
          >
            Change Photo
          </button>

          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="mt-3 w-full text-center bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-white/40"
          />
        </div>

        {/* --- INTERESTS HUB (HERO SECTION) --- */}
        <div className="col-span-1 md:col-span-2 bg-white/20 backdrop-blur-2xl border border-white/30 shadow-2xl rounded-2xl p-8 flex flex-col min-h-[560px]">

          <div className="mb-6 pb-4 border-b border-white/20">
            <h2 className="text-2xl font-extrabold mb-1 text-fuchsia-800">Add More Interests!</h2>
            <p className="text-base font-medium opacity-80">Add 3+ to unlock glowing matches.</p>
          </div>

          <div className="flex gap-3 mb-6">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add more interests..."
              className="flex-1 px-4 py-2 rounded-full bg-white/70 shadow-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-fuchsia-600/60 text-base"
            />
            <button
              onClick={addInterest}
              disabled={saving}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-400 text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-40"
            >
              Add
            </button>
          </div>

          <div className="flex-grow overflow-y-auto mb-4">
            <h3 className="text-lg font-bold mb-3 text-fuchsia-800/90">Selected Interests ({interests.length})</h3>
            <AnimatePresence>
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.91 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.91 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-rose-500/20 border border-white/30 text-sm font-semibold shadow-sm"
                  >
                    {i}
                    <button onClick={() => removeInterest(i)} className="text-fuchsia-700 hover:text-fuchsia-900 font-bold leading-none">×</button>
                  </motion.span>
                ))}
              </div>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showMinInterestWarning && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -6 }}
                className="bg-rose-500/20 text-rose-700 border border-rose-500/30 px-4 py-2 rounded-xl text-center text-sm font-bold shadow-md"
              >
                Add at least 3 interests!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <motion.button
              onClick={saveProfile}
              disabled={saving || !canBae}
              whileTap={{ scale: 0.96 }}
              className={`w-full py-3 rounded-xl text-lg font-extrabold shadow-lg transition-all ${
                saved ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:opacity-90'
              } disabled:opacity-40`}
            >
              <Save size={16} className="inline mr-2" />
              {saving ? 'Saving…' : 'Save'}
            </motion.button>

            <motion.button
              onClick={goBAE}
              disabled={!canBae}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-3 rounded-xl text-lg font-extrabold shadow-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {baeButtonText}
            </motion.button>
          </div>

        </div>

      </div>

    </main>
  );
}
