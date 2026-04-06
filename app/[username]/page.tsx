'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, signInAnonymously, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Loader2, Send, User as UserIcon } from 'lucide-react';
import { parseInterests, interestNames, createInterest, addInterests as addStructuredInterests, StructuredInterest } from '@/lib/structuredInterests';
import { formatPublicName } from '@/lib/formatName';

// --- Sounds ---
let sharedCtx: AudioContext | null = null;
function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}
function playCollectSound() {
  try {
    const ctx = getCtx(); const now = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(); osc.stop(now + 0.15);
  } catch {}
}
function playChordSound() {
  try {
    const ctx = getCtx(); const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.2);
    });
  } catch {}
}

// --- Waiting room messages (softly positive) ---
const WAITING_MESSAGES = [
  "Take a breath. Something good is about to happen.",
  "No filters. No likes. Just two people.",
  "The best conversations start with presence.",
  "You're about to have a real conversation.",
  "Breathe in... breathe out... you're here.",
  "Every great connection starts with showing up.",
  "Two people. One moment. No script.",
  "You showed up. That's already enough.",
  "Something real is about to happen.",
  "Let your guard down. This is a safe space.",
  "The world gets better one conversation at a time.",
  "Be curious. Be kind. Be you.",
];

type OwnerProfile = {
  uid: string;
  displayName: string;
  city: string;
  country: string;
  interests: StructuredInterest[];
  isOnline: boolean;
};

type PageState =
  | 'loading'
  | 'not-found'
  | 'host-lobby'       // Owner is in their own room — sees waiting visitors
  | 'guest-entry'      // Guest just needs to type their name
  | 'need-auth'        // Visitor needs to sign in (fallback)
  | 'need-onboarding'  // Visitor signed in but needs name + interests
  | 'waiting'          // Waiting for owner (optimistic first 5 min)
  | 'ringing'          // Owner is online, call is ringing
  | 'connecting'       // Owner accepted, joining room
  | 'offline'          // Owner is confirmed offline (after 5 min)
  | 'ping-sent';       // Visitor sent a ping

export default function BaeLinkPage() {
  const params = useParams();
  const router = useRouter();
  const username = (params.username as string)?.toLowerCase();

  // Firebase setup
  const [firebaseApp] = useState(() => {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {};
    return getApps().length ? getApps()[0] : initializeApp(config);
  });
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  // State
  const [pageState, setPageState] = useState<PageState>('loading');
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [visitorUser, setVisitorUser] = useState<any>(null);
  const [visitorProfile, setVisitorProfile] = useState<any>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [waitingMessageIdx, setWaitingMessageIdx] = useState(0);
  const [breathePhase, setBreathePhase] = useState<'in' | 'out'>('in');

  // Mini signup state
  const [signupStep, setSignupStep] = useState<'auth' | 'profile'>('auth');
  const [firstName, setFirstName] = useState('');
  const [city, setCity] = useState('');
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Legacy guest name (kept for backward compat with initiateCall)
  const guestName = firstName;

  // Host lobby state
  const [isOwner, setIsOwner] = useState(false);
  type WaitingVisitor = { callId: string; visitorUid: string; visitorName: string; createdAt: string };
  const [waitingVisitors, setWaitingVisitors] = useState<WaitingVisitor[]>([]);
  const [admitting, setAdmitting] = useState<string | null>(null);

  // Quick onboarding state (legacy — kept for signed-in users who need setup)
  const [onboardName, setOnboardName] = useState('');
  const [onboardInterests, setOnboardInterests] = useState('');

  // Timers
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerPresenceRef = useRef<(() => void) | null>(null);
  const callListenerRef = useRef<(() => void) | null>(null);

  // Rotate waiting messages
  useEffect(() => {
    if (pageState !== 'waiting' && pageState !== 'ringing') return;
    const interval = setInterval(() => {
      setWaitingMessageIdx(i => (i + 1) % WAITING_MESSAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [pageState]);

  // Breathing animation
  useEffect(() => {
    if (pageState !== 'waiting') return;
    const interval = setInterval(() => {
      setBreathePhase(p => p === 'in' ? 'out' : 'in');
    }, 4000);
    return () => clearInterval(interval);
  }, [pageState]);

  // Step 1: Look up the owner
  useEffect(() => {
    if (!username) return;

    const lookupOwner = async () => {
      try {
        const res = await fetch(`/api/user-lookup?username=${encodeURIComponent(username)}`);
        if (res.status === 404) {
          setPageState('not-found');
          return;
        }
        const data = await res.json();
        setOwner(data);

        // Check visitor auth — if already signed in with profile, go direct. Otherwise guest entry.
        const unsub = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            // Not signed in — show guest entry (just type name)
            setPageState(prev => prev === 'loading' ? 'guest-entry' : prev);
            return;
          }
          setVisitorUser(user);

          // Check if this is the OWNER visiting their own room
          if (user.uid === data.uid) {
            setIsOwner(true);
            setPageState('host-lobby');
            return;
          }

          // Anonymous users need to sign in properly
          if (user.isAnonymous) {
            setPageState(prev => prev === 'loading' ? 'guest-entry' : prev);
            return;
          }

          // Check if visitor has a full profile
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const profile = snap.data();
            const interests = parseInterests(profile.interests);
            if (profile.displayName?.trim() && interests.length >= 1) {
              setVisitorProfile(profile);
              setFirstName(profile.displayName?.split(' ')[0] || '');
              initiateCall(user.uid, data);
              return;
            }
          }
          // Signed in but no profile — show mini signup step 2
          setFirstName(user.displayName?.split(' ')[0] || '');
          setSignupStep('profile');
          setPageState('guest-entry');
        });

        return () => unsub();
      } catch {
        setPageState('not-found');
      }
    };

    lookupOwner();
  }, [username]);

  // Initiate the call flow
  const initiateCall = useCallback(async (visitorUid: string, ownerData: OwnerProfile) => {
    if (ownerData.isOnline) {
      // Owner is online — ring them
      setPageState('ringing');
      try {
        const res = await fetch('/api/direct-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerUid: ownerData.uid, visitorUid, guestName: guestName.trim() || null }),
        });
        const data = await res.json();
        if (data.callId) {
          setCallId(data.callId);
          // Listen for call status changes
          callListenerRef.current = onSnapshot(
            doc(db, 'directCalls', data.callId),
            (snap) => {
              const callData = snap.data();
              if (!callData) return;
              if (callData.status === 'accepted' && callData.roomUrl) {
                setPageState('connecting');
                // Navigate to match page with direct call params
                const guestParams = guestName.trim() ? `&guest=true&guestName=${encodeURIComponent(guestName.trim())}` : '';
                router.push(`/match?directCall=true&roomUrl=${encodeURIComponent(callData.roomUrl)}&partnerId=${encodeURIComponent(ownerData.uid)}${guestParams}`);
              } else if (callData.status === 'declined') {
                setPageState('offline');
              }
            }
          );
        }
      } catch {
        setPageState('waiting');
      }
    } else {
      // Owner is offline — show waiting state, transition to offline after 5 min
      setPageState('waiting');

      // Listen for owner coming online
      ownerPresenceRef.current = onSnapshot(
        doc(db, 'users', ownerData.uid),
        (snap) => {
          const data = snap.data();
          if (!data) return;
          const staleCutoff = Date.now() - 90_000;
          const lastPresence = data.lastPresenceUpdate ? new Date(data.lastPresenceUpdate).getTime() : 0;
          if (data.presence === 'online' && lastPresence > staleCutoff) {
            // Owner came online! Ring them
            setOwner(prev => prev ? { ...prev, isOnline: true } : prev);
            initiateCall(visitorUid, { ...ownerData, isOnline: true });
          }
        }
      );

      // After 5 minutes, shift to definitive offline state
      waitingTimerRef.current = setTimeout(() => {
        setPageState(prev => prev === 'waiting' ? 'offline' : prev);
      }, 5 * 60 * 1000);
    }
  }, [db, router, guestName]);

  // Host lobby: listen for waiting visitors
  useEffect(() => {
    if (!isOwner || !owner || pageState !== 'host-lobby') return;
    const q = query(
      collection(db, 'directCalls'),
      where('ownerUid', '==', owner.uid),
      where('status', '==', 'ringing')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const visitors: WaitingVisitor[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let name = 'Someone';
        try {
          const vSnap = await getDoc(doc(db, 'users', data.visitorUid));
          if (vSnap.exists()) {
            name = formatPublicName(vSnap.data().displayName || 'Someone');
          }
        } catch {}
        // Check for guest name in the call data or fallback
        visitors.push({
          callId: d.id,
          visitorUid: data.visitorUid,
          visitorName: data.guestName || name,
          createdAt: data.createdAt,
        });
      }
      setWaitingVisitors(visitors);
    }, () => setWaitingVisitors([]));
    return () => unsub();
  }, [isOwner, owner, pageState, db]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      if (ownerPresenceRef.current) ownerPresenceRef.current();
      if (callListenerRef.current) callListenerRef.current();
    };
  }, []);

  // --- Guest join handler ---
  // --- Host admits a waiting visitor ---
  const handleAdmit = async (visitor: WaitingVisitor) => {
    if (admitting) return;
    setAdmitting(visitor.callId);
    try {
      const res = await fetch('/api/direct-call', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: visitor.callId, action: 'accept' }),
      });
      const data = await res.json();
      if (data.roomUrl) {
        router.push(`/match?directCall=true&roomUrl=${encodeURIComponent(data.roomUrl)}&partnerId=${encodeURIComponent(visitor.visitorUid)}`);
      }
    } catch (e) {
      console.error('Admit failed', e);
      setAdmitting(null);
    }
  };

  // --- Mini signup: add interest pill ---
  const handleAddSignupInterest = () => {
    const val = interestInput.trim();
    if (!val || signupInterests.length >= 3) return;
    setSignupInterests(prev => [...prev, val]);
    setInterestInput('');
    if (signupInterests.length === 2) {
      // Third interest — chord resolution
      playChordSound();
    } else {
      playCollectSound();
    }
  };

  // --- Mini signup: complete profile and join ---
  const handleMiniSignupJoin = async () => {
    if (!firstName.trim() || !city.trim() || signupInterests.length < 3 || !visitorUser || !owner || isJoining) return;
    setIsJoining(true);
    try {
      // Save profile to Firestore
      const interests = signupInterests.map(name => createInterest(name, 'profile'));
      await setDoc(doc(db, 'users', visitorUser.uid), {
        displayName: firstName.trim(),
        firstName: firstName.trim(),
        city: city.trim(),
        interests,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Now initiate the call
      await initiateCall(visitorUser.uid, owner);
    } catch (e) {
      console.error('Mini signup join failed', e);
      setIsJoining(false);
    }
  };

  // --- Auth handler ---
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch {
      try {
        await signInWithRedirect(auth, provider);
      } catch (e) {
        console.error('Sign in failed', e);
      }
    }
  };

  // --- Quick onboarding submit ---
  const handleOnboardingSubmit = async () => {
    if (!visitorUser || !onboardName.trim()) return;
    const items = onboardInterests.split(',').map(s => s.trim()).filter(Boolean);
    if (items.length < 3) return;

    const structured = items.map(name =>
      createInterest(name.charAt(0).toUpperCase() + name.slice(1), 'profile')
    );

    try {
      await setDoc(doc(db, 'users', visitorUser.uid), {
        displayName: onboardName.trim(),
        interests: structured,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setVisitorProfile({ displayName: onboardName.trim(), interests: structured });
      if (owner) {
        initiateCall(visitorUser.uid, owner);
      }
    } catch (e) {
      console.error('Onboarding save failed', e);
    }
  };

  // --- Send ping ---
  const handleSendPing = async () => {
    if (!owner || !visitorUser) return;
    try {
      const profileInterests = visitorProfile?.interests
        ? interestNames(parseInterests(visitorProfile.interests)).slice(0, 5)
        : [];
      await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUid: owner.uid,
          visitorUid: visitorUser.uid,
          visitorName: visitorProfile?.displayName || visitorUser.displayName || 'Someone',
          visitorInterests: profileInterests,
        }),
      });
      setPageState('ping-sent');
    } catch (e) {
      console.error('Ping failed', e);
    }
  };

  // --- Owner interest pills ---
  const ownerInterestNames = owner?.interests ? interestNames(parseInterests(owner.interests)) : [];
  const ownerPublicName = owner ? formatPublicName(owner.displayName) : '';

  // ====== RENDER ======

  // Loading
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-white/50 text-sm">Loading...</p>
        </motion.div>
      </main>
    );
  }

  // Not found
  if (pageState === 'not-found') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <h1 className="text-4xl font-black mb-4">Hmm...</h1>
          <p className="text-white/60 text-lg mb-8">
            We couldn't find anyone with that BAE link. Check the URL and try again.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 font-bold rounded-xl"
          >
            Go to BAE
          </button>
        </motion.div>
      </main>
    );
  }

  // Host lobby — owner is in their room
  if (pageState === 'host-lobby') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white pt-[72px]">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl sm:text-6xl font-black mb-3 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 bg-clip-text text-transparent"
            style={{ filter: 'drop-shadow(0 0 40px rgba(253,224,71,0.4))' }}>
            Your Room
          </h1>
          <p className="text-white/50 text-lg font-medium mb-2">baewithme.com/{username}</p>
          <p className="text-white/30 text-sm mb-10">Share your link — anyone who taps it will appear here.</p>

          {/* Waiting visitors */}
          {waitingVisitors.length === 0 ? (
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="py-16"
            >
              <p className="text-white/25 text-xl font-medium">No one here yet.</p>
              <p className="text-white/15 text-sm mt-2">When someone taps your link, they&apos;ll show up here.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <p className="text-amber-300/70 text-sm font-bold mb-6">
                {waitingVisitors.length} {waitingVisitors.length === 1 ? 'person' : 'people'} waiting
              </p>
              {waitingVisitors.map(v => (
                <motion.div
                  key={v.callId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="text-left">
                    <p className="text-white font-bold text-lg">{v.visitorName}</p>
                    <p className="text-white/30 text-sm">Waiting to join</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAdmit(v)}
                    disabled={admitting === v.callId}
                    className="px-6 py-3 rounded-full font-black text-base text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 disabled:opacity-50"
                    style={{ boxShadow: '0 0 20px rgba(253,224,71,0.3)' }}
                  >
                    {admitting === v.callId ? 'Connecting...' : 'Let in'}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Share link */}
          <div className="mt-12">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                navigator.clipboard.writeText(`https://baewithme.com/${username}`);
              }}
              className="px-8 py-3 rounded-full text-sm font-bold text-amber-300 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 transition-colors"
            >
              Copy room link
            </motion.button>
          </div>
        </div>
      </main>
    );
  }

  // Mini signup — sign in + profile to join
  if (pageState === 'guest-entry' || pageState === 'need-auth' || pageState === 'need-onboarding') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          <h1 className="text-4xl sm:text-5xl font-black mb-3">
            BAE with {ownerPublicName}
          </h1>

          {/* Owner interests preview */}
          {ownerInterestNames.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8 mt-4">
              {ownerInterestNames.slice(0, 10).map(interest => (
                <span key={interest} className="px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-yellow-300/15 to-amber-300/10 border border-yellow-300/20 text-yellow-300/80">
                  {interest}
                </span>
              ))}
              {ownerInterestNames.length > 10 && (
                <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-white/5 text-white/30">
                  +{ownerInterestNames.length - 10} more
                </span>
              )}
            </div>
          )}

          {/* Step 1: Google Auth */}
          {signupStep === 'auth' && !visitorUser?.uid ? (
            <div className="space-y-4 mt-6">
              <motion.button
                onClick={handleSignIn}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-5 rounded-2xl font-black text-xl bg-white text-black flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </motion.button>
              <p className="text-white/20 text-xs mt-4">
                Sign in to join {ownerPublicName}&apos;s room
              </p>
            </div>
          ) : (
            /* Step 2: Name + City + 3 Interests */
            <div className="space-y-4 mt-6 text-left">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoFocus
                  className="px-5 py-4 rounded-xl bg-white/8 border border-white/15 text-white text-base text-center placeholder:text-white/25 outline-none focus:border-amber-400/40 font-semibold"
                />
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  className="px-5 py-4 rounded-xl bg-white/8 border border-white/15 text-white text-base text-center placeholder:text-white/25 outline-none focus:border-amber-400/40 font-semibold"
                />
              </div>

              {/* Interests */}
              <p className="text-white/50 text-sm font-semibold text-center mt-2">
                Add 3 interests to get started
              </p>

              {/* Collected interest pills */}
              {signupInterests.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {signupInterests.map(interest => (
                    <motion.span
                      key={interest}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                      className="px-4 py-2 rounded-full text-sm font-bold text-black bg-[#fde047] border border-yellow-200"
                      style={{ boxShadow: '0 0 20px rgba(253,224,71,0.5), 0 0 6px rgba(253,224,71,0.3)' }}
                    >
                      ✓ {interest}
                    </motion.span>
                  ))}
                </div>
              )}

              {/* Interest input */}
              {signupInterests.length < 3 && (
                <div className="flex gap-2">
                  <input
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSignupInterest()}
                    placeholder={`Interest ${signupInterests.length + 1} of 3`}
                    className="flex-1 px-5 py-4 rounded-xl bg-white/8 border-2 border-amber-400/30 text-white text-base text-center placeholder:text-white/25 outline-none focus:border-amber-400/60 focus:shadow-[0_0_20px_rgba(253,224,71,0.1)] font-semibold"
                  />
                  <motion.button
                    onClick={handleAddSignupInterest}
                    disabled={!interestInput.trim()}
                    whileTap={{ scale: 0.95 }}
                    className={`px-5 rounded-xl font-black text-lg ${
                      interestInput.trim()
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/5 text-white/20'
                    }`}
                  >
                    +
                  </motion.button>
                </div>
              )}

              {/* Join button */}
              <motion.button
                onClick={handleMiniSignupJoin}
                disabled={!firstName.trim() || !city.trim() || signupInterests.length < 3 || isJoining}
                whileHover={firstName.trim() && city.trim() && signupInterests.length >= 3 && !isJoining ? { scale: 1.03 } : {}}
                whileTap={firstName.trim() && city.trim() && signupInterests.length >= 3 && !isJoining ? { scale: 0.97 } : {}}
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all mt-2 ${
                  firstName.trim() && city.trim() && signupInterests.length >= 3 && !isJoining
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black shadow-[0_0_40px_rgba(253,224,71,0.3)]'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </main>
    );
  }

  // Waiting / Ringing
  if (pageState === 'waiting' || pageState === 'ringing') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          {/* Breathing circle */}
          <motion.div
            animate={{
              scale: breathePhase === 'in' ? 1.15 : 0.95,
              opacity: breathePhase === 'in' ? 0.6 : 0.3,
            }}
            transition={{ duration: 4, ease: 'easeInOut' }}
            className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-400/20 flex items-center justify-center"
          >
            <motion.div
              animate={{
                scale: breathePhase === 'in' ? 1.1 : 0.9,
              }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/50 to-indigo-500/50"
            />
          </motion.div>

          {pageState === 'ringing' ? (
            <>
              <h2 className="text-2xl font-black mb-2">
                Waiting for {ownerPublicName}...
              </h2>
              <div className="flex items-center justify-center gap-2 text-amber-300/70 mb-6">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-amber-400"
                />
                <span className="text-sm">You&apos;re in the waiting room</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-2">
                Waiting for {ownerPublicName}...
              </h2>
              <p className="text-white/40 text-sm mb-6">
                They'll be here any moment
              </p>
            </>
          )}

          {/* Owner interests */}
          {ownerInterestNames.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {ownerInterestNames.slice(0, 10).map(interest => (
                <span key={interest} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white/60">
                  {interest}
                </span>
              ))}
            </div>
          )}

          {/* Rotating message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={waitingMessageIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-white/30 text-sm italic"
            >
              {WAITING_MESSAGES[waitingMessageIdx]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </main>
    );
  }

  // Connecting
  if (pageState === 'connecting') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black">Connecting...</h2>
        </motion.div>
      </main>
    );
  }

  // Offline
  if (pageState === 'offline') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-white/30" />
          </div>

          <h2 className="text-2xl font-black mb-2">
            {ownerPublicName} isn't on BAE right now
          </h2>
          <p className="text-white/40 text-sm mb-8">
            Send them a ping so they know you're here.
          </p>

          <motion.button
            onClick={handleSendPing}
            whileTap={{ scale: 0.95 }}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-500 font-bold rounded-xl text-lg flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send a ping
          </motion.button>

          <p className="text-white/20 text-xs mt-4">
            Or just text them to get on BAE
          </p>
        </motion.div>
      </main>
    );
  }

  // Ping sent
  if (pageState === 'ping-sent') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="text-6xl mb-6"
          >
            ✨
          </motion.div>
          <h2 className="text-2xl font-black mb-2">Ping sent!</h2>
          <p className="text-white/50 text-sm mb-8">
            We let {ownerPublicName} know you're here. Hang tight.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-white/10 border border-white/20 font-bold rounded-xl text-sm hover:bg-white/15 transition-colors"
          >
            Go to BAE Home
          </button>
        </motion.div>
      </main>
    );
  }

  return null;
}
