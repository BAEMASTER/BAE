'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, signInAnonymously, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Loader2, Send, User as UserIcon } from 'lucide-react';
import { parseInterests, interestNames, createInterest, addInterests as addStructuredInterests, StructuredInterest } from '@/lib/structuredInterests';
import { formatPublicName } from '@/lib/formatName';

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

  // Guest entry state
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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
            setPageState('guest-entry');
            return;
          }
          setVisitorUser(user);

          // Check if this is an anonymous guest (from guest entry)
          if (user.isAnonymous) {
            setPageState('guest-entry');
            return;
          }

          // Check if visitor has a full profile
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const profile = snap.data();
            const interests = parseInterests(profile.interests);
            if (profile.displayName?.trim() && interests.length >= 1) {
              setVisitorProfile(profile);
              initiateCall(user.uid, data);
              return;
            }
          }
          // Signed in but no profile — still show guest entry for speed
          setGuestName(user.displayName?.split(' ')[0] || '');
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
          body: JSON.stringify({ ownerUid: ownerData.uid, visitorUid }),
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
  }, [db, router]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      if (ownerPresenceRef.current) ownerPresenceRef.current();
      if (callListenerRef.current) callListenerRef.current();
    };
  }, []);

  // --- Guest join handler ---
  const handleGuestJoin = async () => {
    if (!guestName.trim() || !owner || isJoining) return;
    setIsJoining(true);
    try {
      // Sign in anonymously to get a temp uid for Daily.co
      let user = visitorUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
        setVisitorUser(user);
      }
      // Go straight to the call — pass guest info as query params
      initiateCall(user.uid, owner);
    } catch (e) {
      console.error('Guest join failed', e);
      setIsJoining(false);
    }
  };

  // --- Auth handler ---
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      try {
        await signInWithRedirect(auth, new GoogleAuthProvider());
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

  // Guest entry — just type your name and join
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

          {/* Owner interests preview — the hook */}
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

          {/* Just type your name */}
          <div className="space-y-4 mt-6">
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestJoin()}
              placeholder="What's your name?"
              autoFocus
              className="w-full px-6 py-5 rounded-2xl bg-white/10 border-2 border-white/15 text-white text-xl text-center placeholder:text-white/25 outline-none focus:border-yellow-300/40 focus:ring-2 focus:ring-yellow-300/15 font-bold"
            />

            <motion.button
              onClick={handleGuestJoin}
              disabled={!guestName.trim() || isJoining}
              whileHover={guestName.trim() && !isJoining ? { scale: 1.03 } : {}}
              whileTap={guestName.trim() && !isJoining ? { scale: 0.97 } : {}}
              className={`w-full py-5 rounded-2xl font-black text-xl transition-all ${
                guestName.trim() && !isJoining
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black shadow-[0_0_40px_rgba(253,224,71,0.3)]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {isJoining ? 'Joining...' : 'Join'}
            </motion.button>
          </div>

          <p className="text-white/20 text-xs mt-6">
            No account needed. Just jump in.
          </p>
          <button
            onClick={handleSignIn}
            className="text-violet-300/50 text-xs mt-3 hover:text-violet-300/80 transition-colors underline"
          >
            Already on BAE? Sign in
          </button>
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
                Calling {ownerPublicName}...
              </h2>
              <div className="flex items-center justify-center gap-2 text-violet-300 mb-6">
                <Phone className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Ringing</span>
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
