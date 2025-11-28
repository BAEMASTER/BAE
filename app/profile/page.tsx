'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save, Sparkles } from 'lucide-react';

// --- ADD THE CONSTANTS HERE (Fix your error) ---
const MAIN_INSTRUCTION_COPY = "Add More Interests!";
const MOTIVATION_COPY = "The more interests you add, the stronger your BAE connection will glow ✨";

export default function ProfilePage() {
  // Firebase initialization only at runtime, exactly once
  const [authReady, setAuthReady] = useState(false);
  const [app, setApp] = useState<any>(null);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  const [user, setUserState] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterestsState] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // Simple navigation replacement (works in PowerShell, no && chaining needed)
  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  const navigateMatch = () => {
    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 2000);
      return;
    }
    window.history.pushState({}, '', '/match/page');
    window.location.reload();
  };

  useEffect(() => {
    const initFirebase = async () => {
      let firebaseApp;

      if (!getApps().length) {
        firebaseApp = initializeApp(JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}"));
      } else {
        firebaseApp = getApps()[0];
      }

      const firebaseAuth = getAuth(firebaseApp);
      const firestore = getFirestore(firebaseApp);

      // Only set state once Firebase is guaranteed initialized
      setApp(firebaseApp);
      setAuth(firebaseAuth);
      setDb(firestore);

      // Anonymous sign-in fallback if needed
      if (!firebaseAuth.currentUser) {
        try {
          await signInAnonymously(firebaseAuth);
        } catch (e) {
          console.error("Anonymous auth failed", e);
        }
      }

      // Auth listener + load profile
      const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
        setUserState(u);
        if (!u) {
          setAuthReady(true);
          return;
        }

        const profileRef = doc(firestore, `artifacts/${firebaseApp.name || "SO-INTERESTING"}/users/${u.uid}/profile/data`);
        try {
          const snap = await getDoc(profileRef);
          const data = snap.exists() ? snap.data() : null;

          if (data) {
            setDisplayName(data.displayName || u.displayName || u.email || '');
            setInterestsState(data.interests || []);
          } else {
            setDisplayName(u.displayName || u.email || '');
          }
        } catch (e) {
          console.error("Profile load failed", e);
        } finally {
          setAuthReady(true);
        }
      });

      return () => unsub();
    };

    initFirebase();
  }, []);

  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterestsState((prev) => [...prev, i]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterestsState((prev) => prev.filter((x) => x !== i));
  };

  const saveProfile = async () => {
    if (!user || !authReady || !db) return;

    if (interests.length < 3) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 2000);
      return;
    }

    setSaving(true);
    const profileRef = doc(db, `artifacts/${app.name || "SO-INTERESTING"}/users/${user.uid}/profile/data`);

    try {
      await setDoc(profileRef, {
        displayName,
        interests,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);

    } catch (e) {
      console.error("Interest save failed", e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 px-6 py-14 text-white">

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Small personal identity card */}
        <div className="md:col-span-1 bg-gray-800/55 backdrop-blur-xl p-4 rounded-2xl border border-white/25 flex flex-col items-center gap-2 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center border-4 border-fuchsia-400/40 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-full h-full object-cover"/>
            ) : (
              <UserIcon size={32} className="text-fuchsia-300/70"/>
            )}
          </div>
          <span className="text-lg font-bold text-white/90 truncate w-full text-center px-2">
            {displayName || "User"}
          </span>
          <button
            onClick={() => alert("Photo change later")}
            className="text-xs font-semibold text-fuchsia-300/90 hover:text-white transition"
          >
            Change Profile Photo
          </button>
        </div>

        {/* Interest hub */}
        <div className="md:col-span-2 bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-md border border-white/20 flex flex-col min-h-[520px]">

          <div className="mb-4 border-b border-white/10 pb-2">
            <h2 className="text-2xl font-extrabold text-fuchsia-300 flex items-center gap-2">
              <Sparkles size={22}/> Profile Interests
            </h2>
            <p className="text-fuchsia-200 text-sm mt-1 opacity-80">{MAIN_INSTRUCTION_COPY}</p>
            <p className="text-white/50 text-xs mt-1">{MOTIVATION_COPY}</p>
          </div>

          {/* Input */}
          <div className="flex gap-3 my-4">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Add a passion..."
              className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 shadow-sm"
            />
            <motion.button
              onClick={addInterest}
              whileHover={{scale:1.03}}
              whileTap={{scale:0.97}}
              className="px-5 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full font-bold text-sm shadow-md"
            >
              Add
            </motion.button>
          </div>

          {/* Selected interest pills */}
          <div className="flex-grow overflow-y-auto mb-5 pr-1">
            <h3 className="text-sm font-bold text-white/90 mb-2 flex items-center gap-1">
              <Sparkles size={14}/> Selected ({interests.length})
            </h3>
            <AnimatePresence>
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <motion.span
                    key={i}
                    initial={{opacity:0, scale:0.9}}
                    animate={{opacity:1, scale:1}}
                    exit={{opacity:0, scale:0.9}}
                    className="px-3 py-1 rounded-full bg-fuchsia-500/18 border border-fuchsia-300/18 text-xs font-semibold shadow-sm flex items-center gap-1"
                  >
                    {i}
                    <button onClick={() => removeInterest(i)} className="text-xs opacity-70 hover:opacity-100">×</button>
                  </motion.span>
                ))}
              </div>
            </AnimatePresence>
          </div>

          {/* Min interest warning */}
          <AnimatePresence>
            {minInterestWarning && (
              <motion.div
                initial={{opacity:0,y:-6}}
                animate={{opacity:1,y:0}}
                exit={{opacity:0,y:-6}}
                className="bg-red-500/30 border border-red-400/40 text-red-100 text-xs font-bold py-2 px-3 rounded-xl text-center mb-3 shadow-sm"
              >
                3+ interests required
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={saveProfile}
              disabled={saving || interests.length < 3}
              whileTap={{scale:0.97}}
              className={`w-full py-3 rounded-xl font-extrabold text-sm shadow-sm transition-all border
                ${saved
                  ? 'bg-green-500/80 border-green-400/60'
                  : 'bg-white/15 border-white/25 hover:opacity-80'
                }
                ${(saving || interests.length < 3) && !saved ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <Save size={16} className="mr-1 inline-block align-text-bottom"/>
              {saving ? 'Saving…' : 'Save'}
            </motion.button>

            <motion.button
              onClick={navigateMatch}
              whileHover={{ scale:1.03 }}
              whileTap={{ scale:0.97 }}
              disabled={interests.length < 3}
              className="w-full py-3 rounded-xl font-extrabold text-sm shadow-sm transition-all bg-gradient-to-r from-fuchsia-500 via-pink-500 to-yellow-500 hover:opacity-90 disabled:opacity-40"
            >
              <Sparkles size={16} className="mr-1 inline-block align-text-bottom"/>
              BAE
            </motion.button>
          </div>

          {/* Small link to home */}
          {saved && (
            <motion.p
              initial={{opacity:0}}
              animate={{opacity:1}}
              exit={{opacity:0}}
              className="text-green-200 text-[10px] mt-3 text-center font-bold opacity-80"
            >
              Also saved on homepage
              <motion.span
                onClick={navigateHome}
                className="cursor-pointer underline ml-1 hover:text-white transition"
              >
                (Go home)
              </motion.span>
            </motion.p>
          )}

        </div>

      </div>

    </main>
  );
}
