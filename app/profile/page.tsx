'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously, getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, Heart, Plus } from 'lucide-react';

// --- CONSTANTS (in scope so no "not found" errors) ---
const MAIN_INSTRUCTION_COPY = "Add 3+ interests to unlock your BAE matches. Every passion counts!";
const MOTIVATION_COPY = "The more interests you add, the stronger your BAE connection will glow ✨";
const APP_NAME_FALLBACK = "SO-INTERESTING";

export default function ProfilePage() {
  const [firebaseApp, setFirebaseApp] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [user, setUserState] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterestsState] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // Simple nav
  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };
  const goMatch = () => {
    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    window.history.pushState({}, '', '/match/page');
    window.location.reload();
  };

  // Firebase init exactly once at runtime
  useEffect(() => {
    const initFirebase = async () => {
      try {
        let appInstance;

        const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");

        if (!config.projectId && !Object.keys(config).length) {
          console.error("❌ Firebase config missing");
          setAuthReady(true);
          return;
        }

        if (!getApps().length) {
          appInstance = initializeApp(config, config.projectId || APP_NAME_FALLBACK);
        } else {
          appInstance = getApps()[0];
        }

        const firebaseAuth = getAuth(appInstance);
        const firestore = getFirestore(appInstance);

        setFirebaseApp(appInstance);
        setAuth(firebaseAuth);
        setDb(firestore);

        if (!firebaseAuth.currentUser) {
          await signInAnonymously(firebaseAuth);
        }

        const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
          setUserState(u);
          setAuthReady(true);

          if (!u) return;

          const appName = appInstance?.name || APP_NAME_FALLBACK;
          const profileRef = doc(firestore, `artifacts/${appName}/users/${u.uid}/profile/data`);

          try {
            const snap = await getDoc(profileRef);
            const data = snap.exists() ? snap.data() : null;
            const name = data?.displayName || u.displayName || u.email || "BAE Human";

            setDisplayName(name);
            setInterestsState(data?.interests || []);
          } catch (e) {
            console.error("❌ Profile load fail:", e);
          }
        });

        return () => unsub();

      } catch (e) {
        console.error("❌ Firebase init crash:", e);
        setAuthReady(true);
      }
    };

    initFirebase();
  }, []);

  const addInterest = () => {
    const i = newInterest.trim();
    if (!i) return;

    const formatted = i.charAt(0).toUpperCase() + i.slice(1).toLowerCase();
    if (!interests.includes(formatted)) {
      setInterestsState(prev => [...prev, formatted]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterestsState(prev => prev.filter(x => x !== i));
  };

  const saveProfile = async () => {
    if (!user || !db || !auth) return;
    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(()=>setMinInterestWarning(false),1800);
      return;
    }

    setSaving(true);
    const appName = firebaseApp?.name || APP_NAME_FALLBACK;
    const profileRef = doc(db, `artifacts/${appName}/users/${user.uid}/profile/data`);

    try {
      await setDoc(profileRef, {
        displayName,
        interests,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaved(true);
      setTimeout(()=>setSaved(false),1300);
    } catch (e) {
      console.error("🔥 Save fail:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-50 to-indigo-100 px-6 pt-24 text-gray-900"
    >
      <div className="max-w-4xl mx-auto">

        {/* identity — small */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-white/60 border-4 border-fuchsia-400/40 overflow-hidden shadow-sm">
            { user?.photoURL
              ? <img src={user.photoURL} className="w-full h-full object-cover" alt="profile"/>
              : <UserIcon size={36} className="opacity-50 m-auto"/>
            }
          </div>
          <h2 className="text-xl font-black mt-2 text-fuchsia-600 truncate text-center w-full max-w-[260px]">
            {displayName || "BAE Human"}
          </h2>
        </div>

        {/* BIG Interests Card */}
        <div className="bg-white/35 backdrop-blur-lg rounded-3xl p-8 shadow-xl border-2 border-pink-300/40 min-h-[60vh] flex flex-col">
          
          <div className="text-center mb-6">
            <Heart size={28} className="text-fuchsia-500 mx-auto mb-1"/>
            <h1 className="text-3xl font-black text-fuchsia-700">Profile Interests</h1>
            <p className="text-sm text-fuchsia-600/70">{MAIN_INSTRUCTION_COPY}</p>
          </div>

          {/* Input */}
          <div className="flex gap-3 mb-6">
            <input
              value={newInterest}
              onChange={(e)=>setNewInterest(e.target.value)}
              onKeyDown={(e)=>e.key==='Enter' && addInterest()}
              placeholder="Add a passion..."
              className="flex-1 px-4 py-2 rounded-full bg-white/60 border border-pink-300/70 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 shadow-inner"
              maxLength={26}
            />
            <button
              onClick={addInterest}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black shadow-md hover:brightness-110 transition"
            >
              <Plus size={16} className="inline mr-1"/> Add
            </button>
          </div>

          {/* Selected Pills */}
          <div className="flex-grow overflow-y-auto mb-6">
            <h3 className="text-base font-black text-purple-700 mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-500"/> Selected ({interests.length}/3)
            </h3>
            <AnimatePresence>
              <div className="flex flex-wrap gap-2">
                {interests.map(i=>(
                  <motion.span
                    key={i}
                    initial={{opacity:0, scale:0.85}}
                    animate={{opacity:1, scale:1}}
                    exit={{opacity:0, scale:0.85}}
                    className="px-4 py-1.5 rounded-full bg-fuchsia-200/70 border border-fuchsia-400/30 font-bold text-xs shadow-sm flex items-center gap-1 whitespace-nowrap"
                  >
                    {i}
                    <button onClick={()=>removeInterest(i)} className="opacity-70 hover:opacity-100 transition">
                      ×
                    </button>
                  </motion.span>
                ))}
              </div>
            </AnimatePresence>
          </div>

          {/* Warnings */}
          {minInterestWarning && (
            <div className="text-center text-red-500 font-black text-xs mb-4">
              <XCircle size={14} className="inline mr-1"/> Need at least 3 interests!
            </div>
          )}

          {/* 2 Buttons at bottom */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <motion.button
              onClick={saveProfile}
              whileTap={{scale:0.96}}
              className="w-full py-3 rounded-2xl font-black text-base shadow-md transition-all bg-gradient-to-br from-gray-100 to-green-100 border border-green-300/40 hover:brightness-105"
            >
              <span className="flex items-center justify-center gap-1">
                <Save size={16}/>
                Save
              </span>
            </motion.button>

            <motion.button
              onClick={goMatch}
              whileTap={{scale:0.96}}
              disabled={interests.length < 3}
              className="w-full py-3 rounded-2xl font-black text-base shadow-md transition-all bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18}/> BAE
              </span>
            </motion.button>
          </div>

          {/* small redirect option */}
          {saved && (
            <p className="text-center text-xs text-green-600 font-black mt-4">
              ✅ Saved!
              <span onClick={goHome} className="text-fuchsia-600 underline ml-2 cursor-pointer hover:text-purple-700">
                BAE Now?
              </span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
