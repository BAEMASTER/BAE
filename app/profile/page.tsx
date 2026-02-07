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

const INTEREST_EXAMPLES = [
  'Italian food', 'rock climbing', '90s hip hop', 'astrophysics',
  'street photography', 'board games', 'Korean dramas', 'open source',
  'jazz piano', 'sustainable fashion', 'lucid dreaming', 'manga',
  'film noir', 'sourdough bread', 'muay thai', 'vintage synths',
];

const COUNTRIES = [
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
  'Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay',
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

// --- Interest Pill (tap OR hover to reveal delete) ---
function InterestPill({ interest, onRemove }: { interest: string; onRemove: (i: string) => void }) {
  const [active, setActive] = useState(false);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      className={`relative px-5 py-2 rounded-full text-sm font-semibold shadow-md cursor-pointer select-none ${GOLD_PILL_CLASSES} ${active ? 'ring-2 ring-violet-400/60' : ''}`}
      onClick={() => setActive(a => !a)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {interest}
      <AnimatePresence>
        {active && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={(e) => { e.stopPropagation(); onRemove(interest); playRemoveSound(); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg z-10"
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

  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');

  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [minInterestWarning, setMinInterestWarning] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);

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
        interests, updatedAt: new Date().toISOString()
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
    const toAdd: string[] = [];
    for (const item of items) {
      const normalized = item.charAt(0).toUpperCase() + item.slice(1);
      if (!interests.includes(normalized) && !toAdd.includes(normalized)) {
        toAdd.push(normalized);
      }
    }
    if (!toAdd.length) { setNewInterest(''); return; }

    const newInterests = [...interests, ...toAdd];
    setInterests(newInterests);
    playAddSound();
    try { await setDoc(doc(db, 'users', user.uid), { interests: newInterests, updatedAt: new Date().toISOString() }, { merge: true }); }
    catch(e) { console.error(e); }
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

  // FULL PROFILE FOR LOGGED-IN ADULTS
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center pt-8 pb-16 px-4">
      
      <h1 className="text-4xl sm:text-5xl font-black mb-8 flex items-center justify-center gap-3 flex-wrap drop-shadow-[0_0_30px_rgba(255,160,255,0.6)]">
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

      {/* SIDE-BY-SIDE CARDS — interests first (the star of BAE) */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">

        {/* YOUR INTERESTS — the hero section */}
        <motion.div className="flex-[1.2] bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold">Your Interests</h3>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${interests.length >= MIN_REQUIRED ? 'bg-green-400/15 text-green-300' : 'bg-yellow-400/15 text-yellow-300'}`}>
              {interests.length >= MIN_REQUIRED
                ? `${interests.length} interests`
                : `${interests.length}/${MIN_REQUIRED} minimum`}
            </span>
          </div>
          <p className="text-white/40 text-xs mb-4">Have fun adding your unique interests! The more interests, the better!</p>

          <div className="flex flex-wrap gap-3 mb-5 min-h-[3rem]">
            <AnimatePresence>
              {interests.map(i => <InterestPill key={i} interest={i} onRemove={removeInterest} />)}
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
            <button onClick={addInterest} className="px-6 py-2.5 bg-violet-500 hover:bg-violet-400 rounded-full font-bold transition-colors">Add</button>
          </div>
        </motion.div>

        {/* PERSONAL INFO */}
        <motion.div className="flex-1 bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl">
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

      </div>

      {/* BAE BUTTON */}
      <div className="mt-12 flex flex-col items-center gap-3">
        {interests.length >= MIN_REQUIRED ? (
          <>
            <p className="text-white/50 text-sm font-medium">Your profile is ready. Go meet someone.</p>
            <motion.button
              onClick={handleBAEClick}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(139,92,246,0.4), 0 0 60px rgba(59,130,246,0.15)',
                  '0 0 30px rgba(139,92,246,0.7), 0 0 80px rgba(59,130,246,0.3)',
                  '0 0 20px rgba(139,92,246,0.4), 0 0 60px rgba(59,130,246,0.15)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-16 py-6 rounded-full font-black text-white text-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 border-2 border-violet-300/30"
            >
              BAE SOMEONE NOW
            </motion.button>
          </>
        ) : (
          <>
            <p className="text-white/30 text-sm">Add {requiredRemaining} more interest{requiredRemaining !== 1 ? 's' : ''} to get started</p>
            <div className="px-16 py-6 rounded-full font-black text-white/30 text-2xl bg-white/5 border border-white/10 cursor-not-allowed">
              BAE SOMEONE NOW
            </div>
          </>
        )}
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