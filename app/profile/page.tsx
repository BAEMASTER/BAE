'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StructuredInterest,
  parseInterests,
  interestNames,
  createInterest,
  addInterests as addStructuredInterests,
  removeInterest as removeStructuredInterest,
  countBySource,
  togglePin,
  pinnedNames,
} from '@/lib/structuredInterests';
import { isBlockedInterest } from '@/lib/interestBlocklist';
import { validateUsername } from '@/lib/reservedUsernames';

// --- CONSTANTS ---
const NEUTRAL_PILL_CLASSES = 'text-white/80 bg-white/10 border border-white/20 backdrop-blur-sm';
const GOLD_PILL_CLASSES = 'text-black bg-yellow-300 border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.8)] font-bold';

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

  return age >= 13;
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

// --- Spotify URL parser ---
const extractSpotifyTrackId = (url: string): string | null => {
  const match = url.match(/\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

// --- Interest Pill ---
function InterestPill({ interest, onRemove }: {
  interest: string;
  onRemove: (i: string) => void;
}) {
  const [active, setActive] = useState(false);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setActive(true)}
      onHoverEnd={() => setActive(false)}
      onTap={() => setActive(a => !a)}
      className={`group relative px-5 py-2 rounded-full text-sm font-semibold shadow-md cursor-pointer select-none ${GOLD_PILL_CLASSES}`}
    >
      {interest}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(interest); playRemoveSound(); }}
        className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/70 text-white flex items-center justify-center text-[10px] font-black shadow-lg z-10 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
      >
        ×
      </button>
    </motion.span>
  );
}

export default function ProfilePage() {
  const router = useRouter();

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
  const [ageError, setAgeError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [nameLocationSetupError, setNameLocationSetupError] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  // --- Username state ---
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameCopied, setUsernameCopied] = useState(false);

  // --- Spotify state ---
  const [spotifySong, setSpotifySong] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [showSpotifyInput, setShowSpotifyInput] = useState(true);

  // --- Links state ---
  const [links, setLinks] = useState<{ url: string; label: string }[]>([]);

  // --- Settings collapsed ---
  const [settingsOpen, setSettingsOpen] = useState(false);

  // --- Room updated toast ---
  const [roomToast, setRoomToast] = useState(false);
  const showRoomToast = () => {
    setRoomToast(true);
    setTimeout(() => setRoomToast(false), 2000);
  };

  // Check if locked: NO birthdate OR birthdate < 13
  const birthDate = formatDOB(birthYear, birthMonth, birthDay);
  const isProfileLocked = !birthDate || !isAdult(birthDate);

  // --- Load user ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/');
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
          if (data.spotifySong) {
            setSpotifySong(data.spotifySong);
            setSpotifyInput(`https://open.spotify.com/track/${data.spotifySong}`);
            setShowSpotifyInput(false);
          }
          if (data.links) {
            if (Array.isArray(data.links)) {
              setLinks(data.links);
            } else {
              // Migrate old format { website, instagram, other } to new array format
              const migrated: { url: string; label: string }[] = [];
              if (data.links.website) migrated.push({ url: data.links.website, label: 'Website' });
              if (data.links.instagram) migrated.push({ url: data.links.instagram, label: 'Instagram' });
              if (data.links.other) migrated.push({ url: data.links.other, label: '' });
              setLinks(migrated);
            }
          }
          if (data.displayName?.trim() && data.city?.trim() && data.country?.trim()) {
            setSetupComplete(true);
          }
        } else {
          setDisplayName(u.displayName || '');
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

    if (!dob || !isAdult(dob)) {
      setAgeError(true);
      setTimeout(() => setAgeError(false), 3000);
      return;
    }
    setAgeError(false);

    if (!city.trim() || !country.trim()) {
      setLocationError(true);
      setTimeout(() => setLocationError(false), 3000);
      return;
    }
    setLocationError(false);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName, firstName, lastName, city, state, country, birthDate: dob,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) { console.error('Save failed', e); }
  };

  const addInterest = async () => {
    const raw = newInterest.trim();
    if (!raw || !user) return;

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
    try { await setDoc(doc(db, 'users', user.uid), { interests: updated, updatedAt: new Date().toISOString() }, { merge: true }); showRoomToast(); }
    catch(e) { console.error(e); }
    setNewInterest('');
  };

  const handleRemoveInterest = async (val: string) => {
    const updated = removeStructuredInterest(structuredInterests, val);
    setStructuredInterests(updated);
    playRemoveSound();
    if (!user) return;
    try { await setDoc(doc(db, 'users', user.uid), { interests: updated, updatedAt: new Date().toISOString() }, { merge: true }); showRoomToast(); }
    catch(e) { console.error(e); }
  };


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
    navigator.clipboard.writeText(`baewithme.com/${username}`);
    setUsernameCopied(true);
    setTimeout(() => setUsernameCopied(false), 2000);
  };

  const shareBaeLink = async () => {
    if (!username) return;
    const url = `https://baewithme.com/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'BAE with me', url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      setUsernameCopied(true);
      setTimeout(() => setUsernameCopied(false), 2000);
    }
  };

  // --- Spotify handler ---
  const handleSpotifyInput = async (val: string) => {
    setSpotifyInput(val);
    const trackId = extractSpotifyTrackId(val);
    if (trackId) {
      setSpotifySong(trackId);
      setShowSpotifyInput(false);
      if (!user) return;
      try {
        await setDoc(doc(db, 'users', user.uid), { spotifySong: trackId, updatedAt: new Date().toISOString() }, { merge: true });
        showRoomToast();
      } catch (e) { console.error(e); }
    }
  };

  // --- Links handlers ---
  const saveLinks = async (newLinks: { url: string; label: string }[]) => {
    setLinks(newLinks);
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { links: newLinks, updatedAt: new Date().toISOString() }, { merge: true });
      showRoomToast();
    } catch (e) { console.error(e); }
  };

  const addLink = () => {
    setLinks(prev => [...prev, { url: '', label: '' }]);
  };

  const updateLink = (index: number, field: 'url' | 'label', value: string) => {
    setLinks(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLink = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    saveLinks(updated);
  };

  const detectLinkIcon = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com')) return 'IG';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'X';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YT';
    if (lower.includes('tiktok.com')) return 'TT';
    if (lower.includes('linkedin.com')) return 'LI';
    if (lower.includes('github.com')) return 'GH';
    if (lower.includes('spotify.com')) return 'SP';
    if (lower.includes('twitch.tv')) return 'TW';
    if (lower.includes('discord.')) return 'DC';
    if (lower.includes('facebook.com')) return 'FB';
    return '';
  };

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-white font-black">Initializing BAE...</div>;

  if (!user) {
    return null;
  }

  const isSetupIncomplete = !setupComplete;

  // AGE/DOB LOCKED VIEW
  if (isProfileLocked) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-4"><div className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden"><div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" /><div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" /></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-black mb-4">Age Verification Required</h2>
          <p className="text-lg text-white/70 mb-8">
            You must be 13+ to use BAE. Please update your birthdate below.
          </p>

          <div className="mb-6 p-4 bg-white/10 rounded-2xl border border-white/20">
            <label className="block text-sm font-semibold mb-4 text-left">Birthdate</label>
            <div className="grid grid-cols-3 gap-3">
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
                You must be 13+ to use BAE
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
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black font-black rounded-xl shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)] transition-shadow"
          >
            Verify & Continue
          </button>
        </motion.div>
      </div>
    );
  }

  // NAME + LOCATION SETUP
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
      if (!usernameInput.trim()) {
        setNameLocationSetupError('Pick a name for your BAE room');
        setTimeout(() => setNameLocationSetupError(''), 3000);
        return;
      }
      const usernameVal = usernameInput.toLowerCase().trim();
      const validation = validateUsername(usernameVal);
      if (!validation.valid) {
        setNameLocationSetupError(validation.error || 'Invalid room name');
        setTimeout(() => setNameLocationSetupError(''), 3000);
        return;
      }
      if (!user) return;
      try {
        const dob = formatDOB(birthYear, birthMonth, birthDay);
        const res = await fetch('/api/setup-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: usernameVal,
            city, state, country, birthDate: dob,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNameLocationSetupError(data.error || 'Something went wrong');
          setTimeout(() => setNameLocationSetupError(''), 4000);
          return;
        }
        setUsername(data.username);
        setDisplayName(data.displayName);
        setSetupComplete(true);
        setNameLocationSetupError('');
        router.push('/talk');
      } catch (e: any) {
        console.error('Setup save failed', e);
        setNameLocationSetupError('Something went wrong. Try again.');
        setTimeout(() => setNameLocationSetupError(''), 4000);
      }
    };

    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-4"><div className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden"><div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" /><div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" /></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xl w-full"
        >
          <h2 className="text-5xl sm:text-6xl font-black mb-4">Welcome to BAE!</h2>
          <p className="text-lg text-white/50 mb-8">
            Set up your profile. The fun part comes next.
          </p>

          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-base font-bold mb-2 text-white/70">First Name *</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
              <div>
                <label className="block text-base font-bold mb-2 text-white/70">Last Name *</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-base font-bold mb-2 text-white/70">City *</label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Your city"
                  className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
              <div>
                <label className="block text-base font-bold mb-2 text-white/70">State/Province</label>
                <input
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold mb-2 text-white/70">Country *</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* BAE Room Link */}
            <div className="mt-4 p-6 rounded-2xl bg-gradient-to-r from-yellow-300/8 to-amber-300/5 border border-yellow-300/20">
              <label className="block text-xl font-black mb-2 text-yellow-300">Your BAE Room *</label>
              <p className="text-sm text-white/50 mb-4">This is your personal room on BAE. Share your link so people can talk with you.</p>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-base font-mono font-bold">baewithme.com/</span>
                <input
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="yourname"
                  className="flex-1 px-5 py-4 rounded-xl bg-white/10 border-2 border-yellow-300/25 text-white text-lg placeholder:text-white/20 outline-none focus:border-yellow-300/50 focus:ring-2 focus:ring-yellow-300/20 font-mono font-bold"
                />
              </div>
              {usernameInput && (
                <p className="text-sm text-yellow-300/60 mt-3 font-mono font-bold">
                  Your link: baewithme.com/{usernameInput}
                </p>
              )}
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
            className="w-full mt-8 py-5 bg-gradient-to-r from-violet-500 to-indigo-500 font-black text-xl rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  // ========================
  // FULL PROFILE — SINGLE SCROLLABLE PAGE
  // ========================
  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center pt-8 pb-16 px-4"><div className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden"><div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" /><div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" /></div>
      {/* Room updated toast */}
      <AnimatePresence>
        {roomToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-sm font-semibold backdrop-blur-sm"
            style={{ boxShadow: '0 0 20px rgba(253,224,71,0.15)' }}
          >
            Your room has been updated
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-2xl space-y-12">

        {/* ===== 1. HERO SECTION ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2"
        >
          <h1 className="text-4xl sm:text-5xl font-black mb-1 tracking-tight">
            {displayName || 'You'}
          </h1>
          {city && (
            <p className="text-white/40 text-lg font-medium">
              {city}{state ? `, ${state}` : ''}{country ? ` — ${country}` : ''}
            </p>
          )}

          {/* BAE Link or Username Claim */}
          {username && usernameStatus === 'saved' ? (
            <div className="mt-5">
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-yellow-300/10 to-amber-300/5 border border-yellow-300/25">
                <span className="text-yellow-300 font-mono font-bold text-lg tracking-wide">baewithme.com/{username}</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3">
                <motion.button
                  onClick={copyBaeLink}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2.5 rounded-full bg-yellow-300 text-black font-bold text-base min-w-[80px] shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)] transition-shadow"
                >
                  {usernameCopied ? 'Copied!' : 'Copy'}
                </motion.button>
                <motion.button
                  onClick={shareBaeLink}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2.5 rounded-full bg-yellow-300 text-black font-bold text-base min-w-[80px] shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)] transition-shadow"
                >
                  Share
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="mt-5 p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-white/50 text-sm mb-3">Claim your BAE room link</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="flex items-center">
                    <span className="text-white/30 text-sm font-mono pl-3 pr-1 py-3">baewithme.com/</span>
                    <input
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="yourname"
                      maxLength={30}
                      className={`flex-1 px-2 py-3 bg-transparent text-white font-mono font-bold placeholder:text-white/20 outline-none ${
                        usernameStatus === 'available' ? 'text-green-300' :
                        usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-300' :
                        ''
                      }`}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />
                  {usernameStatus === 'checking' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">checking...</div>
                  )}
                </div>
                <motion.button
                  onClick={claimUsername}
                  whileTap={{ scale: 0.95 }}
                  disabled={usernameStatus !== 'available'}
                  className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                    usernameStatus === 'available'
                      ? 'bg-yellow-300 text-black shadow-[0_0_12px_rgba(253,224,71,0.3)]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  {usernameStatus === 'saving' ? 'Claiming...' : 'Claim'}
                </motion.button>
              </div>
              {usernameStatus === 'available' && (
                <p className="text-green-400 text-xs font-medium mt-2">baewithme.com/{usernameInput.toLowerCase().trim()} is yours</p>
              )}
              {usernameError && (usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <p className="text-red-400 text-xs font-medium mt-2">{usernameError}</p>
              )}
            </div>
          )}
        </motion.section>

        {/* ===== DIVIDER ===== */}
        <div className="border-t border-white/10 my-8" />

        {/* ===== 2. YOUR INTERESTS ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-black">Your Interests</h2>
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-300/15 text-yellow-300 border border-yellow-300/25">
              {interests.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mb-5 min-h-[3rem]">
            <AnimatePresence>
              {interests.map(i => (
                <InterestPill
                  key={i}
                  interest={i}
                  onRemove={handleRemoveInterest}
                />
              ))}
            </AnimatePresence>
            {interests.length === 0 && (
              <span className="text-white/20 text-sm italic">No interests yet — add some below</span>
            )}
          </div>

          {/* Add interest input */}
          <div className="flex gap-2">
            <input
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInterest()}
              placeholder="Add an interest (comma-separated for multiple)"
              className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 transition-all focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 outline-none"
            />
            <button onClick={addInterest} className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black rounded-full font-black transition-colors shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)]">Add</button>
          </div>

          {/* Talk to BAE invitation */}
          <motion.button
            onClick={() => router.push('/talk')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full mt-5 py-3 text-center bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black rounded-full font-black text-sm shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)] transition-shadow"
          >
            TALK TO DISCOVER MORE INTERESTS
          </motion.button>
        </motion.section>

        {/* ===== DIVIDER ===== */}
        <div className="border-t border-white/10 my-8" />

        {/* ===== 3. YOUR SONG ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
            Your Song <span className="text-lg">♪</span>
          </h2>

          {showSpotifyInput && (
            <input
              value={spotifyInput}
              onChange={e => handleSpotifyInput(e.target.value)}
              placeholder="Paste a Spotify song link"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all font-mono text-sm"
            />
          )}

          {spotifySong ? (
            <>
              <div className="mt-4 rounded-xl overflow-hidden">
                <iframe
                  src={`https://open.spotify.com/embed/track/${spotifySong}?theme=0`}
                  width="100%"
                  height="80"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                  style={{ border: 'none' }}
                />
              </div>
              {!showSpotifyInput && (
                <button
                  onClick={() => setShowSpotifyInput(true)}
                  className="mt-2 text-amber-300 text-xs hover:text-amber-200 transition-colors font-bold"
                >
                  Change song
                </button>
              )}
            </>
          ) : (
            <p className="text-white/20 text-sm mt-3 italic">Add a song that represents you</p>
          )}
        </motion.section>

        {/* ===== DIVIDER ===== */}
        <div className="border-t border-white/10 my-8" />

        {/* ===== 4. YOUR LINKS ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-2xl font-black mb-4">Your Links</h2>

          <div className="space-y-3">
            {links.map((link, index) => {
              const icon = detectLinkIcon(link.url);
              return (
                <div key={index} className="group flex items-center gap-2">
                  {icon && (
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 text-amber-300 text-xs font-black flex items-center justify-center">
                      {icon}
                    </span>
                  )}
                  <input
                    value={link.url}
                    onChange={e => updateLink(index, 'url', e.target.value)}
                    onBlur={() => saveLinks(links)}
                    placeholder="Paste a link"
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                  />
                  <input
                    value={link.label}
                    onChange={e => updateLink(index, 'label', e.target.value)}
                    onBlur={() => saveLinks(links)}
                    placeholder="Label (optional) — e.g. My podcast"
                    className="w-40 sm:w-48 flex-shrink-0 px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-xs"
                  />
                  <button
                    onClick={() => removeLink(index)}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/70 text-white flex items-center justify-center text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              onClick={addLink}
              className="w-full py-3 rounded-xl border-2 border-dashed border-amber-400/40 text-amber-300 font-bold text-sm bg-amber-400/5 hover:border-amber-400/60 hover:bg-amber-400/10 transition-all"
            >
              + Add a link
            </button>
          </div>
        </motion.section>

        {/* ===== DIVIDER ===== */}
        <div className="border-t border-white/10 my-8" />

        {/* ===== 5. SETTINGS (COLLAPSIBLE) ===== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className="flex items-center gap-2 text-amber-300 hover:text-amber-200 transition-colors font-bold text-lg border-2 border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10 rounded-full px-6 py-2.5"
          >
            Settings
            <motion.span
              animate={{ rotate: settingsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">First Name</label>
                      <input
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">Last Name</label>
                      <input
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">City</label>
                      <input
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="City"
                        className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm ${locationError && !city.trim() ? 'border-red-400/70' : 'border-white/20'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">State/Province</label>
                      <input
                        value={state}
                        onChange={e => setState(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/20 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1 uppercase tracking-wider">Country</label>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-white/10 border text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm ${locationError && !country.trim() ? 'border-red-400/70' : 'border-white/20'}`}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Birthdate */}
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">Birthdate</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className="px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-violet-400/50" style={{ colorScheme: 'dark' }}>
                        <option value="">Month</option>
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className="px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-violet-400/50" style={{ colorScheme: 'dark' }}>
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-violet-400/50" style={{ colorScheme: 'dark' }}>
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
                        className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-semibold text-center"
                      >
                        You must be 13+ to use BAE
                      </motion.div>
                    )}
                    {locationError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-semibold text-center"
                      >
                        City and country are required
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={saveProfile}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black font-black rounded-xl shadow-[0_0_12px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)] transition-shadow"
                  >
                    Save Changes
                  </button>

                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center text-green-400 font-semibold text-sm"
                      >
                        Saved!
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Change username */}
                  {username && (
                    <button
                      onClick={() => { setUsernameStatus('idle'); }}
                      className="text-amber-300 text-xs hover:text-amber-200 transition-colors font-bold"
                    >
                      Change username
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Legal links */}
        <div className="mt-12 mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/25 font-medium">
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</a>
          <span className="text-white/15">|</span>
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
          <span className="text-white/15">|</span>
          <a href="/guidelines" className="hover:text-white/50 transition-colors">Community Guidelines</a>
        </div>
      </div>

      <style jsx>{`
        select option {
          background: #1A0033;
          color: white;
        }
      `}</style>
    </div>
  );
}
