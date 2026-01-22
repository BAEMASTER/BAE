'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import LoginModal from '@/components/LoginModal';

// --- CONSTANTS ---
const MIN_REQUIRED = 3;
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';
const GOLD_PILL_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] font-bold';

const playAddSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  } catch {}
};

const playRemoveSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(330, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  } catch {}
};

// --- Interest Pill ---
function InterestPill({ interest, onRemove }: { interest: string; onRemove: (i: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      className={`relative px-5 py-2 rounded-full text-sm font-semibold shadow-md cursor-default ${GOLD_PILL_CLASSES}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {interest}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { onRemove(interest); playRemoveSound(); }}
            whileHover={{ backgroundColor: '#ef4444' }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm z-10"
          >
            ×
          </motion.button>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  // --- Firebase ---
  const [app] = useState(() => {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {};
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(config);
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');

  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // --- Load user ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (!u) { setAuthReady(true); return; }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.exists() ? snap.data() as any : null;
        if (data) {
          setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
          setCity(data.city || '');
          setState(data.state || '');
          setCountry(data.country || '');
          setWebsite(data.website || '');
          setInterests(Array.isArray(data.interests) ? data.interests : []);
        } else {
          setDisplayName(u.displayName || u.email || 'Mystery BAE');
        }
      } catch (e) { console.error('Profile load failed', e); }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleLoginSuccess = () => {
    // After successful login, page will re-render with user data
    // No need to redirect since they came to profile intentionally
  };

  // --- Handlers ---
  const saveProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName, city, state, country, website,
        interests, updatedAt: new Date().toISOString()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) { console.error('Save failed', e); }
  };

  const addInterest = async () => {
    const i = newInterest.trim();
    if (!i || !user) return;
    const normalized = i.charAt(0).toUpperCase() + i.slice(1);
    if (!interests.includes(normalized)) {
      const newInterests = [...interests, normalized];
      setInterests(newInterests);
      playAddSound();
      try { await setDoc(doc(db, 'users', user.uid), { interests: newInterests, updatedAt: new Date().toISOString() }, { merge: true }); }
      catch(e) { console.error(e); }
    }
    setNewInterest('');
  };

  const removeInterest = async (val: string) => {
    const newInterests = interests.filter(x => x !== val);
    setInterests(newInterests);
    playRemoveSound();
    if (!user) return;
    try { await setDoc(doc(db, 'users', user.uid), { interests: newInterests, updatedAt: new Date().toISOString() }, { merge: true }); }
    catch(e) { console.error(e); }
  };

  const handleBAEClick = () => {
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    router.push('/match');
  };

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-white font-black">Initializing BAE...</div>;

  const requiredRemaining = Math.max(MIN_REQUIRED - interests.length, 0);

  // GATED FOR NON-LOGGED-IN USERS
  if (!user) {
    return (
      <main className="relative min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center pt-8 px-4">
        {/* Blurred content area */}
        <div className="blur-md opacity-40 pointer-events-none">
          <h1 className="text-4xl font-extrabold mb-6 drop-shadow-md">Your Profile</h1>

          {/* SIDE-BY-SIDE CARDS */}
          <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">

            {/* PERSONAL INFO */}
            <motion.div className="flex-1 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Personal Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="input" />
                <div className="input" />
                <div className="input" />
                <div className="input" />
              </div>

              <h4 className="font-semibold mt-4 mb-2">Personal Website</h4>
              <div className="input mb-2" />

              <h4 className="font-semibold mt-4 mb-2">Social Links</h4>
              <div className="input mb-2" />
              <div className="input mb-2" />
              <div className="input mb-2" />
              <div className="input mb-2" />
              <div className="input mb-2" />

              <div className="w-full mt-4 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 font-bold rounded-xl shadow-lg" />
            </motion.div>

            {/* YOUR INTERESTS */}
            <motion.div className="flex-1 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-center">Your Interests</h3>
              <div className="flex flex-wrap gap-3 mb-4 justify-center">
                <div className="h-8 w-24 bg-white/10 rounded-full" />
                <div className="h-8 w-24 bg-white/10 rounded-full" />
                <div className="h-8 w-24 bg-white/10 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 rounded-full bg-white/10" />
                <div className="h-10 w-20 rounded-full bg-white/10" />
              </div>
            </motion.div>

          </div>

          <div className="mt-8 px-12 py-5 rounded-full font-black text-white text-xl shadow-lg bg-gray-500/50 w-fit mx-auto" />
        </div>

        {/* Login Modal - Shows immediately for non-logged-in users */}
        <LoginModal
          isOpen={true}
          onClose={() => {/* User stays on page until they sign in */}}
          auth={auth}
          onLoginSuccess={handleLoginSuccess}
        />
      </main>
    );
  }

  // FULL PROFILE FOR LOGGED-IN USERS
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center pt-8 px-4">
      
      <h1 className="text-4xl font-extrabold mb-6 drop-shadow-md">Your Profile</h1>

      {/* SIDE-BY-SIDE CARDS */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">

        {/* PERSONAL INFO */}
        <motion.div className="flex-1 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
          <h3 className="text-xl font-bold mb-4">Personal Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" className="input" />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="input" />
            <input value={state} onChange={e => setState(e.target.value)} placeholder="State/Province" className="input" />
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="input" />
          </div>

          <h4 className="font-semibold mt-4 mb-2">Personal/Professional Website</h4>
          <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="input mb-2" />

          <button onClick={saveProfile} className="w-full mt-6 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 font-bold rounded-xl shadow-lg">Save Changes</button>
          
          {/* Save Success Message */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 text-center text-green-400 font-semibold text-sm"
              >
                ✓ Saved!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* YOUR INTERESTS */}
        <motion.div className="flex-1 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
          <h3 className="text-xl font-bold mb-4 text-center">Your Interests</h3>
          <div className="flex flex-wrap gap-3 mb-4 justify-center">
            <AnimatePresence>
              {interests.map(i => <InterestPill key={i} interest={i} onRemove={removeInterest} />)}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <input value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => e.key === 'Enter' && addInterest()} placeholder="Add interest..." className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white" />
            <button onClick={addInterest} className="px-6 py-2 bg-pink-500 rounded-full font-bold">Add</button>
          </div>
        </motion.div>

      </div>

      {/* BAE BUTTON */}
      <button 
        onClick={handleBAEClick} 
        className={`mt-8 px-12 py-5 rounded-full font-black text-white text-xl shadow-lg transition-all ${interests.length >= MIN_REQUIRED ? 'bg-gradient-to-r from-[#FF6F91] to-[#FF9B85]' : 'bg-gray-500/50 cursor-not-allowed'}`}
      >
        {interests.length >= MIN_REQUIRED ? 'BAE SOMEONE NOW!' : `Need ${requiredRemaining} More`}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          color: white;
          outline: none;
        }
        .input:focus {
          border-color: #fuchsia-400;
          box-shadow: 0 0 0 2px rgba(255,0,255,0.3);
        }
      `}</style>

    </main>
  );
}