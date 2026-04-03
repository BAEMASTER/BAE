'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, signInAnonymously, type User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StructuredInterest,
  parseInterests,
  interestNames,
  createInterest,
  addInterests as addStructuredInterests,
  removeInterest as removeStructuredInterest,
  countBySource,
  mostRecentInterest,
  togglePin,
  pinnedNames,
} from '@/lib/structuredInterests';
import { isBlockedInterest } from '@/lib/interestBlocklist';
import { validateUsername } from '@/lib/reservedUsernames';

// --- CONSTANTS ---
const MIN_REQUIRED = 3;
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';
const GOLD_PILL_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] font-bold';

const INTEREST_EXAMPLES = [
  'Italian food', 'rock climbing', '90s hip hop', 'astrophysics',
  'street photography', 'board games', 'Korean dramas', 'open source',
  'jazz piano', 'sustainable fashion', 'lucid dreaming', 'manga',
  'film noir', 'sourdough bread', 'muay thai', 'vintage synths',
];

const COUNTRIES = [
  'United States',
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia',
  'Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica',
  'Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt',
  'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon',
  'Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar',
  'Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia',
  'Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal',
  'Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan',
  'Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  'Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
  'Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden',
  'Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago',
  'Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','Uruguay',
  'Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

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

// --- Interest Pill (tap to reveal actions, double-tap to pin) ---
function InterestPill({ interest, pinned, onRemove, onTogglePin, canPin }: {
  interest: string;
  pinned: boolean;
  onRemove: (i: string) => void;
  onTogglePin: (i: string) => void;
  canPin: boolean;
}) {
  const [active, setActive] = useState(false);
  const pinnedStyle = pinned
    ? 'text-black bg-yellow-300 border-2 border-amber-400 shadow-[0_0_20px_rgba(253,224,71,0.9),0_0_40px_rgba(245,158,11,0.3)] font-black'
    : GOLD_PILL_CLASSES;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      className={`relative px-5 py-2 rounded-full text-sm font-semibold shadow-md cursor-pointer select-none ${pinnedStyle} ${active ? 'ring-2 ring-violet-400/60' : ''}`}
      onClick={() => setActive(a => !a)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {pinned && <span className="mr-1">✦</span>}
      {interest}
      <AnimatePresence>
        {active && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={(e) => { e.stopPropagation(); onRemove(interest); playRemoveSound(); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg z-10"
            >
              ×
            </motion.button>
            {(canPin || pinned) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={(e) => { e.stopPropagation(); onTogglePin(interest); }}
                className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg z-10 ${
                  pinned ? 'bg-amber-500 text-black' : 'bg-violet-500 text-white'
                }`}
              >
                ✦
              </motion.button>
            )}
          </>
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');

  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  const [structuredInterests, setStructuredInterests] = useState<StructuredInterest[]>([]);
  const interests = useMemo(() => interestNames(structuredInterests), [structuredInterests]);
  const [newInterest, setNewInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [nameLocationSetupError, setNameLocationSetupError] = useState('');
  const [setupComplete, setSetupComplete] = useState(false); // only true after Firestore confirms name+city+country
  const [exampleIdx, setExampleIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'interests' | 'stats' | 'info'>('interests');
  const [showTalkTransition, setShowTalkTransition] = useState(false);

  // --- Username state ---
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameCopied, setUsernameCopied] = useState(false);

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
          setDisplayName(data.displayName || '');
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setCity(data.city || '');
          setState(data.state || '');
          setCountry(data.country || '');
          // Parse DOB into year/month/day
          if (data.birthDate) {
            const [year, month, day] = data.birthDate.split('-');
            setBirthYear(year || '');
            setBirthMonth(month || '');
            setBirthDay(day || '');
          }
          
          if (data.username) {
            setUsername(data.username);
            setUsernameInput(data.username);
            setUsernameStatus('saved');
          }
          setStructuredInterests(parseInterests(data.interests));
          // Mark setup complete if Firestore already has required fields
          if (data.displayName?.trim() && data.city?.trim() && data.country?.trim()) {
            setSetupComplete(true);
          }
        } else {
          // Brand new user — pre-fill from Google auth as suggestion, but city/country stay empty
          // so isSetupIncomplete triggers the setup screen
          setDisplayName(u.displayName || '');
        }
      } catch (e) { console.error('Profile load failed', e); }
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Rotate placeholder examples
  useEffect(() => {
    const t = setInterval(() => setExampleIdx(i => (i + 1) % INTEREST_EXAMPLES.length), 2500);
    return () => clearInterval(t);
  }, []);

  // --- Handlers ---
  const saveProfile = async () => {
    if (!user) return;
    
    const dob = formatDOB(birthYear, birthMonth, birthDay);
    
    // Check age when saving - require valid DOB
    if (!dob || !isAdult(dob)) {
      setAgeError(true);
      setTimeout(() => setAgeError(false), 3000);
      return;
    }
    
    setAgeError(false);

    // Require city and country
    if (!city.trim() || !country.trim()) {
      setLocationError(true);
      setTimeout(() => setLocationError(false), 3000);
      return;
    }
    setLocationError(false);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName, city, state, country, birthDate: dob,
        interests: structuredInterests, updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) { console.error('Save failed', e); }
  };

  const addInterest = async () => {
    const raw = newInterest.trim();
    if (!raw || !user) return;

    // Split on commas so "Italian food, hiking, yoga" → 3 separate pills
    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    const toAdd: StructuredInterest[] = [];
    for (const item of items) {
      const normalized = item.charAt(0).toUpperCase() + item.slice(1);
      if (isBlockedInterest(normalized)) continue;
      if (!interests.some(i => i.toLowerCase() === normalized.toLowerCase()) &&
          !toAdd.some(i => i.name.toLowerCase() === normalized.toLowerCase())) {
        toAdd.push(createInterest(normalized, 'profile'));
      }
    }
    if (!toAdd.length) { setNewInterest(''); return; }

    const updated = addStructuredInterests(structuredInterests, toAdd);
    setStructuredInterests(updated);
    playAddSound();
    try { await setDoc(doc(db, 'users', user.uid), { interests: updated, updatedAt: new Date().toISOString() }, { merge: true }); }
    catch(e) { console.error(e); }
    setNewInterest('');
  };

  const handleRemoveInterest = async (val: string) => {
    const updated = removeStructuredInterest(structuredInterests, val);
    setStructuredInterests(updated);
    playRemoveSound();
    if (!user) return;
    try { await setDoc(doc(db, 'users', user.uid), { interests: updated, updatedAt: new Date().toISOString() }, { merge: true }); }
    catch(e) { console.error(e); }
  };

  const handleTogglePin = async (val: string) => {
    const updated = togglePin(structuredInterests, val);
    setStructuredInterests(updated);
    playAddSound();
    if (!user) return;
    try { await setDoc(doc(db, 'users', user.uid), { interests: updated, updatedAt: new Date().toISOString() }, { merge: true }); }
    catch(e) { console.error(e); }
  };

  const currentPinnedCount = structuredInterests.filter(i => i.pinned).length;

  // --- Username handlers ---
  useEffect(() => {
    const val = usernameInput.toLowerCase().trim();
    if (!val || val === username) {
      setUsernameStatus(val === username && username ? 'saved' : 'idle');
      setUsernameError('');
      return;
    }
    const validation = validateUsername(val);
    if (!validation.valid) {
      setUsernameStatus('invalid');
      setUsernameError(validation.error || '');
      return;
    }
    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?username=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus('available');
          setUsernameError('');
        } else {
          setUsernameStatus('taken');
          setUsernameError(data.error || 'Already taken');
        }
      } catch {
        setUsernameStatus('invalid');
        setUsernameError('Could not check availability');
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [usernameInput, username]);

  const claimUsername = async () => {
    if (!user || usernameStatus !== 'available') return;
    const val = usernameInput.toLowerCase().trim();
    setUsernameStatus('saving');
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, username: val }),
      });
      if (res.ok) {
        setUsername(val);
        setUsernameStatus('saved');
        playAddSound();
      } else {
        const data = await res.json();
        setUsernameStatus('taken');
        setUsernameError(data.error || 'Could not claim username');
      }
    } catch {
      setUsernameStatus('invalid');
      setUsernameError('Something went wrong');
    }
  };

  const copyBaeLink = () => {
    if (!username) return;
    navigator.clipboard.writeText(`${window.location.origin}/${username}`);
    setUsernameCopied(true);
    setTimeout(() => setUsernameCopied(false), 2000);
  };

  const handleBAEClick = () => {
    if (isProfileLocked) return;
    if (isSetupIncomplete) return;
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
  const isSetupIncomplete = !setupComplete;

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

          <AnimatePresence>
            {ageError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-semibold text-center"
              >
                You must be 18+ to use BAE
              </motion.div>
            )}
          </AnimatePresence>

          <style jsx>{`
            select {
              color-scheme: dark;
            }
            select option {
              background: #1A0033;
              color: white;
            }
          `}</style>

          <button 
            onClick={saveProfile}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-500 font-bold rounded-xl shadow-lg"
          >
            Verify & Continue
          </button>
        </motion.div>
      </main>
    );
  }

  // TRANSITION TO TALK — shows after setup, before redirecting to Talk
  if (showTalkTransition) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-lg"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-4xl sm:text-5xl font-black leading-tight mb-10"
          >
            Here's how you build your interest profile on BAE...you Talk!
          </motion.h1>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/discover')}
            className="px-14 py-5 rounded-full font-black text-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-2 border-yellow-300/40 shadow-[0_0_40px_rgba(253,224,71,0.3)]"
          >
            Let's Talk. And Make it Interesting.
          </motion.button>
        </motion.div>
      </main>
    );
  }

  // NAME + LOCATION SETUP — shows if age verified but name/location missing
  if (isSetupIncomplete) {
    const handleSetupSave = async () => {
      if (!firstName.trim() || !lastName.trim()) {
        setNameLocationSetupError('Please enter your first and last name');
        setTimeout(() => setNameLocationSetupError(''), 3000);
        return;
      }
      if (!city.trim() || !country.trim()) {
        setNameLocationSetupError('Please enter your city and country');
        setTimeout(() => setNameLocationSetupError(''), 3000);
        return;
      }
      if (!user) return;
      try {
        const dob = formatDOB(birthYear, birthMonth, birthDay);
        const displayFmt = `${firstName.trim()} ${lastName.trim().charAt(0)}.`;
        await setDoc(doc(db, 'users', user.uid), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayFmt,
          city, state, country, birthDate: dob,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setDisplayName(displayFmt);
        setSetupComplete(true);
        setNameLocationSetupError('');
        // Show transition screen before Talk
        setShowTalkTransition(true);
      } catch (e) {
        console.error('Setup save failed', e);
      }
    };

    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          <h2 className="text-3xl font-black mb-3">Welcome in!</h2>
          <p className="text-base text-white/60 mb-2">
            People on BAE see each other's first name, last initial, and location in the world.
          </p>
          <p className="text-sm text-white/40 mb-8">
            The fun part comes next.
          </p>

          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-white/70">First Name *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-white/70">Last Name *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-white/70">City *</label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Your city"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-white/70">State/Province</label>
                <input
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-white/70">Country *</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <AnimatePresence>
            {nameLocationSetupError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-semibold text-center"
              >
                {nameLocationSetupError}
              </motion.div>
            )}
          </AnimatePresence>

          <style jsx>{`
            select option {
              background: #1A0033;
              color: white;
            }
          `}</style>

          <button
            onClick={handleSetupSave}
            className="w-full mt-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 font-bold rounded-xl shadow-lg"
          >
            Continue
          </button>
        </motion.div>
      </main>
    );
  }

  // FULL PROFILE FOR LOGGED-IN ADULTS
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center pt-8 pb-16 px-4">

      {/* HEADER */}
      <h1 className="text-4xl sm:text-5xl font-black mb-6 flex items-center justify-center gap-3 flex-wrap drop-shadow-[0_0_30px_rgba(255,160,255,0.6)]">
        <span>All About</span>
        <motion.span
          animate={{
            boxShadow: ['0 0 15px rgba(253,224,71,0.6)', '0 0 25px rgba(253,224,71,0.9)', '0 0 15px rgba(253,224,71,0.6)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-6 py-2 bg-yellow-300 text-black font-black rounded-full border-2 border-yellow-200 text-3xl sm:text-4xl"
        >
          YOU
        </motion.span>
      </h1>

      {/* TAB BAR */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'interests' as const, label: 'Interests' },
          { id: 'stats' as const, label: 'Your BAE' },
          { id: 'info' as const, label: 'Personal Info' },
        ]).map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-yellow-300 text-black shadow-[0_0_12px_rgba(253,224,71,0.4)]'
                : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
            }`}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ===== INTERESTS TAB ===== */}
          {activeTab === 'interests' && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 backdrop-blur-lg px-7 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-7 rounded-3xl border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-xl font-bold">Your Interests</h3>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${interests.length >= MIN_REQUIRED ? 'bg-green-400/15 text-green-300' : 'bg-yellow-400/15 text-yellow-300'}`}>
                  {interests.length >= MIN_REQUIRED
                    ? `${interests.length} interests`
                    : `${interests.length}/${MIN_REQUIRED} minimum`}
                </span>
              </div>
              <p className="text-white/90 text-sm mb-1">Add everything you love! Your interests, your passions, your work, your favorite places and more!</p>
              <p className="text-white/30 text-xs mb-5">Tap an interest to pin your top 5 — the ones you could talk about all day. <span className="text-amber-300/50">✦ = pinned</span></p>

              <div className="flex flex-wrap gap-3 mb-5 min-h-[3rem]">
                <AnimatePresence>
                  {interests.map(i => {
                    const si = structuredInterests.find(s => s.name === i);
                    return (
                      <InterestPill
                        key={i}
                        interest={i}
                        pinned={!!si?.pinned}
                        onRemove={handleRemoveInterest}
                        onTogglePin={handleTogglePin}
                        canPin={currentPinnedCount < 5}
                      />
                    );
                  })}
                </AnimatePresence>
                {interests.length === 0 && (
                  <span className="text-white/20 text-sm italic">No interests yet — add some below</span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInterest()}
                  placeholder={`e.g. ${INTEREST_EXAMPLES[exampleIdx]}`}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 transition-all focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 outline-none"
                />
                <button onClick={addInterest} className="px-6 py-2.5 bg-pink-400 hover:bg-pink-300 text-white rounded-full font-bold transition-colors">Add</button>
              </div>

              {/* Discover — AI podcast entry */}
              <motion.button
                onClick={() => router.push('/discover')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 px-5 py-4 rounded-2xl text-left transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
                  border: '1px solid rgba(139,92,246,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/60 to-indigo-500/60 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">✦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-semibold">Tell BAE About It</p>
                    <p className="text-white/40 text-xs">Talk to BAE and build your interests through conversation</p>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* ===== YOUR BAE (STATS) TAB ===== */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* YOUR BAE LINK */}
              <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
                <h4 className="text-lg font-bold mb-1">Your BAE Link</h4>
                <p className="text-white/50 text-sm mb-4">Share this link so people can BAE with you</p>

                {username && usernameStatus === 'saved' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-violet-400/30 text-white font-mono text-sm truncate">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/{username}
                      </div>
                      <motion.button
                        onClick={copyBaeLink}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-bold text-sm whitespace-nowrap"
                      >
                        {usernameCopied ? 'Copied!' : 'Copy'}
                      </motion.button>
                    </div>
                    <button
                      onClick={() => { setUsernameStatus('idle'); }}
                      className="text-white/30 text-xs hover:text-white/50 transition-colors"
                    >
                      Change username
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          value={usernameInput}
                          onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="choose a username"
                          maxLength={30}
                          className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-white/30 outline-none transition-all ${
                            usernameStatus === 'available' ? 'border-green-400/50 focus:ring-2 focus:ring-green-400/20' :
                            usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400/50 focus:ring-2 focus:ring-red-400/20' :
                            'border-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20'
                          }`}
                        />
                        {usernameStatus === 'checking' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">checking...</div>
                        )}
                      </div>
                      <motion.button
                        onClick={claimUsername}
                        whileTap={{ scale: 0.95 }}
                        disabled={usernameStatus !== 'available'}
                        className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                          usernameStatus === 'available'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {usernameStatus === 'saving' ? 'Claiming...' : 'Claim'}
                      </motion.button>
                    </div>
                    {usernameStatus === 'available' && (
                      <p className="text-green-400 text-xs font-medium">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/{usernameInput.toLowerCase().trim()} is yours for the taking
                      </p>
                    )}
                    {usernameError && (usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <p className="text-red-400 text-xs font-medium">{usernameError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Hero stat */}
              <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-6xl font-black bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent"
                >
                  0
                </motion.div>
                <p className="text-white/50 text-sm font-medium mt-1">Conversations</p>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                  <div className="text-3xl font-black text-amber-300">{interests.length}</div>
                  <p className="text-white/40 text-xs font-medium mt-1">Total Interests</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                  <div className="text-3xl font-black text-emerald-300">{countBySource(structuredInterests, 'match') + countBySource(structuredInterests, 'explorer')}</div>
                  <p className="text-white/40 text-xs font-medium mt-1">Collected from Others</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                  <div className="text-3xl font-black text-sky-300">0</div>
                  <p className="text-white/40 text-xs font-medium mt-1">Interests You Spread</p>
                </div>
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                  <div className="text-3xl font-black text-violet-300">0</div>
                  <p className="text-white/40 text-xs font-medium mt-1">MEGAVIBEs</p>
                </div>
              </div>

              {/* Latest Interest */}
              {structuredInterests.length > 0 && (() => {
                const recent = mostRecentInterest(structuredInterests);
                if (!recent) return null;
                const dateStr = recent.addedAt
                  ? new Date(recent.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';
                return (
                  <div className="bg-white/5 backdrop-blur-lg p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-white/40 text-xs font-medium mb-1">Most recent interest added</p>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-300/15 text-yellow-200 border border-yellow-300/25">
                        {recent.name}
                      </span>
                    </div>
                    <span className="text-white/25 text-xs">{dateStr}</span>
                  </div>
                );
              })()}

              {/* Conversations */}
              <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-white/60 mb-3 tracking-wide uppercase">Conversations</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Longest conversation</span>
                    <span className="text-lg font-bold text-yellow-300">—</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Average length</span>
                    <span className="text-lg font-bold text-yellow-300">—</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Total shared interests discovered</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                </div>
              </div>

              {/* Connections */}
              <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-white/60 mb-3 tracking-wide uppercase">Connections</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Farthest match</span>
                    <span className="text-lg font-bold text-yellow-300">—</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Countries connected</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Cities connected</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">People saved</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                </div>
              </div>

              {/* Impact */}
              <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-white/60 mb-3 tracking-wide uppercase">Your Impact</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Interests you spread to others</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">People your interests traveled to</span>
                    <span className="text-lg font-bold text-yellow-300">0</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ===== PERSONAL INFO TAB ===== */}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4">Personal Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" className="input" />
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="City *" className={`input ${locationError && !city.trim() ? 'border-red-400/70' : ''}`} />
                <input value={state} onChange={e => setState(e.target.value)} placeholder="State/Province" className="input" />
                <select value={country} onChange={e => setCountry(e.target.value)} className={`input ${locationError && !country.trim() ? 'border-red-400/70' : ''}`}>
                  <option value="">Country *</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <AnimatePresence>
                {locationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-semibold text-center"
                  >
                    City and country are required to save your profile
                  </motion.div>
                )}
              </AnimatePresence>

              <h4 className="font-semibold mt-4 mb-3">Birthdate</h4>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className="input">
                  <option value="">Month</option>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className="input">
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="input">
                  <option value="">Year</option>
                  {Array.from({ length: 125 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button onClick={saveProfile} className="w-full mt-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 font-bold rounded-xl shadow-lg hover:shadow-violet-500/25 transition-shadow">Save Changes</button>

              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 text-center text-green-400 font-semibold text-sm"
                  >
                    Saved!
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* BAE BUTTON — persistent across all tabs */}
      <div className="mt-10 flex flex-col items-center gap-3">
        {interests.length >= MIN_REQUIRED ? (
          <>
            <p className="text-white/50 text-sm font-medium">Your profile is ready. Go meet someone.</p>
            <motion.button
              onClick={handleBAEClick}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245,158,11,0.4), 0 0 60px rgba(249,115,22,0.15)',
                  '0 0 30px rgba(245,158,11,0.7), 0 0 80px rgba(249,115,22,0.3)',
                  '0 0 20px rgba(245,158,11,0.4), 0 0 60px rgba(249,115,22,0.15)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-16 py-6 rounded-full font-black text-white text-2xl bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-300/30"
            >
              BAE With Someone Now
            </motion.button>
          </>
        ) : (
          <>
            <p className="text-white/30 text-sm">Add {requiredRemaining} more interest{requiredRemaining !== 1 ? 's' : ''} to get started</p>
            <div className="px-16 py-6 rounded-full font-black text-white/30 text-2xl bg-white/5 border border-white/10 cursor-not-allowed">
              BAE With Someone Now
            </div>
          </>
        )}
      </div>

      {/* Legal links */}
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/25 font-medium">
        <a href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</a>
        <span className="text-white/15">|</span>
        <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
        <span className="text-white/15">|</span>
        <a href="/guidelines" className="hover:text-white/50 transition-colors">Community Guidelines</a>
      </div>

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
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139,92,246,0.3);
        }
        select {
          color-scheme: dark;
        }
        select option {
          background: #1A0033;
          color: white;
        }
      `}</style>

    </main>
  );
}