'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONSTANTS ---
const MIN_REQUIRED = 3;
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';
const GOLD_PILL_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] font-bold';

// --- AGE CALCULATION ---
const isAdult = (dob: string): boolean => {
  if (!dob) return false;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 18;
};

// Format year/month/day into ISO date string
const formatDOB = (year: string, month: string, day: string): string => {
  if (!year || !month || !day) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

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
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);

  // Check if locked: NO birthdate OR birthdate < 18
  const birthDate = formatDOB(birthYear, birthMonth, birthDay);
  const isProfileLocked = !birthDate || !isAdult(birthDate);

  // --- Load user ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // Not logged in - redirect to auth
        router.push('/auth');
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const data = snap.exists() ? snap.data() as any : null;
        if (data) {
          setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
          setCity(data.city || '');
          setState(data.state || '');
          setCountry(data.country || '');
          setWebsite(data.website || '');
          
          // Parse DOB into year/month/day
          if (data.birthDate) {
            const [year, month, day] = data.birthDate.split('-');
            setBirthYear(year || '');
            setBirthMonth(month || '');
            setBirthDay(day || '');
          }
          
          setInterests(Array.isArray(data.interests) ? data.interests : []);
        } else {
          setDisplayName(u.displayName || u.email || 'Mystery BAE');
        }
      } catch (e) { console.error('Profile load failed', e); }
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // --- Handlers ---
  const saveProfile = async () => {
    if (!user) return;
    
    const dob = formatDOB(birthYear, birthMonth, birthDay);
    
    // Check age when saving - require valid DOB
    if (!dob || !isAdult(dob)) {
      // Stay locked
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName, city, state, country, website, birthDate: dob,
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
    if (isProfileLocked) return; // Don't allow if locked
    if (interests.length < MIN_REQUIRED) {
      setMinInterestWarning(true);
      setTimeout(() => setMinInterestWarning(false), 1800);
      return;
    }
    router.push('/match');
  };

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-white font-black">Initializing BAE...</div>;

  // REDIRECT TO AUTH IF NOT LOGGED IN
  if (!user) {
    return null; // Will redirect via useEffect
  }

  const requiredRemaining = Math.max(MIN_REQUIRED - interests.length, 0);

  // AGE/DOB LOCKED VIEW - shows if NO DOB or DOB < 18
  if (isProfileLocked) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-black mb-4">Age Verification Required</h2>
          <p className="text-lg text-white/70 mb-8">
            You must be 18+ to use BAE. Please update your birthdate below.
          </p>
          
          <div className="mb-6 p-4 bg-white/10 rounded-2xl border border-white/20">
            <label className="block text-sm font-semibold mb-4 text-left">Birthdate</label>
            <div className="grid grid-cols-3 gap-3">
              {/* Month */}
              <select 
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
              >
                <option value="">Month</option>
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              
              {/* Day */}
              <select 
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              
              {/* Year */}
              <select 
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
              >
                <option value="">Year</option>
                {Array.from({ length: 125 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={saveProfile}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 font-bold rounded-xl shadow-lg"
          >
            Verify & Continue
          </button>
        </motion.div>
      </main>
    );
  }

  // FULL PROFILE FOR LOGGED-IN ADULTS
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

          <h4 className="font-semibold mt-4 mb-3">Birthdate</h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Month */}
            <select 
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className="input"
            >
              <option value="">Month</option>
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            
            {/* Day */}
            <select 
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className="input"
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            
            {/* Year */}
            <select 
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="input"
            >
              <option value="">Year</option>
              {Array.from({ length: 125 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
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