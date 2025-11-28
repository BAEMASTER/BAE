'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Save, Sparkles, XCircle } from 'lucide-react';

// Homepage gradient
const HOME_GRADIENT = "bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100";

export default function ProfilePage() {
  const [user, setUserState] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterestsState] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minWarning, setMinWarning] = useState(false);

  // Auth guard + load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUserState(u);
      setUserState(u);
      setDisplayName(u.displayName || u.email || '');

      // Load interests from Firestore
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.data();
        if (data?.interests) {
          setInterestsState(data.interests);
        }
      } catch (e) {
        console.error('profile load failed', e);
      }
    });
    return () => unsub();
  }, []);

  // Add interest
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterestsState(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // Remove interest
  const removeInterest = (i: string) => {
    setInterestsState(prev => prev.filter(x => x !== i));
  };

  // Save interests
  const saveProfile = async () => {
    if (!user) return;

    if (interests.length < 3) {
      setMinWarning(true);
      setTimeout(() => setMinWarning(false), 1800);
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: displayName, interests, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error('interest save failed', e);
    } finally {
      setSaving(false);
    }
  };

  // Navigate to match page
  const goBAE = () => {
    if (interests.length < 3) {
      setMinWarning(true);
      setTimeout(() => setMinWarning(false), 1800);
      return;
    }
    routerPush('/match');
  };

  // Simple router push without && for powershell later if needed
  const routerPush = (path: string) => {
    window.location.href = path;
  };

  return (
    <main className={`min-h-screen w-full ${HOME_GRADIENT} text-gray-900 px-6 py-8`}>

      {/* Header minimized identity */}
      <div className="max-w-5xl mx-auto mt-[72px]">

        <h1 className="text-4xl font-black text-fuchsia-700 mb-2 text-center">
          Your Profile
        </h1>

        {/* Photo + name small */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28 rounded-full bg-white/70 shadow border-4 border-fuchsia-400/50 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-full h-full object-cover"/>
            ) : (
              <UserIcon size={40} className="text-fuchsia-500/60"/>
            )}
          </div>
          <button 
            onClick={() => console.log('photo change later')} 
            className="text-sm font-bold text-fuchsia-600/70 hover:text-fuchsia-700 mt-1 transition"
          >
            Change Photo
          </button>
        </div>

        {/* Interests main focus */}
        <div className="bg-white/35 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/30 shadow-lg min-h-[50vh] flex flex-col">

          <h2 className="text-2xl font-extrabold text-fuchsia-700 mb-3 text-center">
            Add More Interests ✨
          </h2>

          {/* Interest input */}
          <div className="flex gap-3 mb-6 max-w-xl mx-auto w-full">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              placeholder="Your passions..."
              className="flex-1 px-5 py-3 rounded-full bg-white/80 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 shadow-sm"
              maxLength={28}
            />
            <motion.button
              onClick={addInterest}
              whileHover={{scale:1.05}}
              whileTap={{scale:0.95}}
              disabled={!newInterest.trim()}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 text-white rounded-full font-extrabold shadow-md hover:opacity-90 disabled:opacity-40 transition"
            >
              Add
            </motion.button>
          </div>

          {/* Selected pills */}
          <div className="flex-grow overflow-y-auto mb-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <AnimatePresence>
                {interests.map((i) => (
                  <motion.span
                    key={i}
                    initial={{opacity:0,scale:0.8}}
                    animate={{opacity:1,scale:1}}
                    exit={{opacity:0,scale:0.8}}
                    className="px-3.5 py-2 rounded-full bg-white/80 border border-fuchsia-400/20 text-fuchsia-700 text-sm font-bold shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    {i}
                    <button onClick={() => removeInterest(i)} className="text-fuchsia-500 hover:text-red-600 font-black leading-none">
                      ×
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Warning if <3 */}
          <AnimatePresence>
            {minWarning && (
              <motion.div
                initial={{opacity:0,y:6}}
                animate={{opacity:1,y:0}}
                exit={{opacity:0,y:6}}
                className="bg-red-500/20 text-red-700 font-bold py-3 px-5 rounded-2xl text-center mb-4 shadow-sm border border-red-400/30 mx-auto w-fit"
              >
                <XCircle size={18} className="inline-block mr-2 align-text-bottom"/>
                Add at least 3 interests to continue
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom buttons equal sized */}
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto w-full mt-auto">
            <motion.button
              onClick={saveProfile}
              disabled={saving}
              whileTap={{scale:0.97}}
              className="w-full py-3 rounded-2xl font-black shadow-md transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500/80 to-fuchsia-600/90 hover:opacity-90 disabled:opacity-40"
            >
              <Save size={18}/>
              { saving ? 'Saving…' : 'Save' }
            </motion.button>

            <motion.button
              onClick={goBAE}
              whileHover={{scale:1.04}}
              whileTap={{scale:0.97}}
              disabled={interests.length < 3}
              className="w-full py-3 rounded-2xl font-black shadow-md transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400 hover:opacity-95 disabled:opacity-40"
            >
              <Sparkles size={18}/> BAE Someone
            </motion.button>
          </div>

          {/* Green flash on save */}
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{opacity:0,y:-5}}
                animate={{opacity:1,y:0}}
                exit={{opacity:0,y:-5}}
                className="text-center text-green-700 text-sm mt-3 font-bold"
              >
                <CheckCircle size={18} className="inline-block mr-1 align-text-bottom"/>
                Saved!
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </main>
  );
}
