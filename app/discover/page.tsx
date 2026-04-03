'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Sparkles, ChevronUp, ChevronDown, Search, MessageCircle } from 'lucide-react';
import {
  StructuredInterest,
  parseInterests,
  interestNames,
  createInterest,
  addInterests as addStructuredInterests,
} from '@/lib/structuredInterests';
import { isBlockedInterest } from '@/lib/interestBlocklist';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SuggestedInterest = {
  name: string;
  added: boolean;
  messageIdx: number;
};

// What's on the center stage right now
type StageState =
  | { type: 'welcome' }
  | { type: 'userEcho'; text: string }
  | { type: 'breathing' }
  | { type: 'utterance'; text: string; interests: { name: string; added: boolean }[] }
  | { type: 'error'; text: string };

const playDiscoverSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const gain2 = audioCtx.createGain();
    osc1.connect(gain1); gain1.connect(audioCtx.destination);
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc1.frequency.setValueAtTime(523, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.08);
    gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc1.start(); osc1.stop(audioCtx.currentTime + 0.12);
    osc2.frequency.setValueAtTime(784, audioCtx.currentTime + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(1047, audioCtx.currentTime + 0.14);
    gain2.gain.setValueAtTime(0, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc2.start(); osc2.stop(audioCtx.currentTime + 0.18);
  } catch {}
};

const playAddSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
};

// Parse BAE's message into text parts and interest names
function parseUtterance(content: string): { text: string; interests: string[] } {
  const interests: string[] = [];
  const text = content.replace(/\[INTEREST:\s*([^\]]+)\]/g, (_, name) => {
    interests.push(name.trim());
    return '';
  }).trim();
  return { text, interests };
}

export default function DiscoverPage() {
  const router = useRouter();

  const [firebaseApp] = useState(() => {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {};
    return getApps().length ? getApps()[0] : initializeApp(config);
  });
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [existingInterests, setExistingInterests] = useState<StructuredInterest[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [started, setStarted] = useState(false);
  const [userName, setUserName] = useState('');

  // Session-collected interests for the sidebar
  const [collectedInterests, setCollectedInterests] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [longPressInterest, setLongPressInterest] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exploring mode — user is browsing related interests, not in normal conversation
  const [isExploring, setIsExploring] = useState(false);

  // The center stage — only shows the CURRENT moment
  const [stage, setStage] = useState<StageState>({ type: 'welcome' });
  // Track which interests in the current utterance have been added
  const [currentPillStates, setCurrentPillStates] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLInputElement>(null);

  // Auth + load existing data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth');
        return;
      }
      setUser(u);

      try {
        const snap = await getDoc(doc(firestore, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          const interests = parseInterests(data.interests);
          setExistingInterests(interests);
          if (data.displayName) setUserName(data.displayName.split(' ')[0]);

          // Returning user — show last BAE message on stage
          if (data.discoverConversation?.length) {
            const msgs: ChatMessage[] = data.discoverConversation;
            setConversationHistory(msgs);
            setStarted(true);
            setIsFirstVisit(false);

            // Find last assistant message and show it on stage
            const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
            if (lastAssistant) {
              const { text, interests: foundInterests } = parseUtterance(lastAssistant.content);
              const existingNames = interestNames(interests).map(n => n.toLowerCase());
              const pillStates: Record<string, boolean> = {};
              const interestData = foundInterests.map(name => {
                const isAdded = existingNames.includes(name.toLowerCase());
                pillStates[name.toLowerCase()] = isAdded;
                return { name, added: isAdded };
              });
              setCurrentPillStates(pillStates);
              setStage({ type: 'utterance', text, interests: interestData });
            }

            // Rebuild collected interests from history
            const collected: string[] = [];
            const existingNames = interestNames(interests).map(n => n.toLowerCase());
            msgs.forEach((msg: ChatMessage) => {
              if (msg.role === 'assistant') {
                const matches = msg.content.matchAll(/\[INTEREST:\s*([^\]]+)\]/g);
                for (const match of matches) {
                  const name = match[1].trim();
                  if (existingNames.includes(name.toLowerCase()) && !collected.includes(name)) {
                    collected.push(name);
                  }
                }
              }
            });
            setCollectedInterests(collected);
          }
        }
      } catch (e) {
        console.error('Load failed:', e);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const startConversation = async () => {
    setStarted(true);
    setStage({ type: 'breathing' });
    await fetchResponse([]);
  };

  const fetchResponse = async (currentMessages: ChatMessage[]) => {
    setIsStreaming(true);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.length === 0
            ? [{ role: 'user', content: `(The guest just sat down. Their first name is ${userName || 'there'}. Start the conversation.)` }]
            : currentMessages,
          existingInterests: interestNames(existingInterests),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Something went wrong');
      }

      const data = await res.json();
      const fullText = data.text || '';

      // Parse into text + interests
      const { text, interests } = parseUtterance(fullText);
      const existingNames = interestNames(existingInterests).map(n => n.toLowerCase());
      const pillStates: Record<string, boolean> = {};
      const interestData = interests.map(name => {
        const isAdded = existingNames.includes(name.toLowerCase());
        pillStates[name.toLowerCase()] = isAdded;
        return { name, added: isAdded };
      });
      setCurrentPillStates(pillStates);

      if (interests.length > 0) playDiscoverSound();

      // Show on stage
      setStage({ type: 'utterance', text, interests: interestData });

      // Save conversation
      const finalMessages = [...currentMessages, { role: 'assistant' as const, content: fullText }];
      setConversationHistory(finalMessages);
      if (user) {
        try {
          await setDoc(doc(firestore, 'users', user.uid), {
            discoverConversation: finalMessages,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch {}
      }
    } catch (e) {
      console.error('Error:', e);
      setStage({ type: 'error', text: 'Something went wrong. Try again.' });
    }

    setIsStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isStreaming) return;

    if (!textOverride) setInput('');
    setLongPressInterest(null);

    // Show user echo briefly, then breathing, then fetch
    setStage({ type: 'userEcho', text });

    const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: text }];
    setConversationHistory(newMessages);

    if (user) {
      try {
        await setDoc(doc(firestore, 'users', user.uid), {
          discoverConversation: newMessages,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}
    }

    // User echo → breathing → fetch
    setTimeout(() => {
      setStage({ type: 'breathing' });
      setTimeout(() => {
        fetchResponse(newMessages);
      }, 800);
    }, 1200);
  };

  const handleAddInterest = async (interestName: string) => {
    if (!user) return;
    if (isBlockedInterest(interestName)) return;
    if (currentPillStates[interestName.toLowerCase()]) return;

    const newInterest = createInterest(interestName, 'profile');
    const updated = addStructuredInterests(existingInterests, [newInterest]);
    setExistingInterests(updated);
    playAddSound();

    // Mark as added in current pills
    setCurrentPillStates(prev => ({ ...prev, [interestName.toLowerCase()]: true }));

    // Add to sidebar collection
    setCollectedInterests(prev =>
      prev.includes(interestName) ? prev : [...prev, interestName]
    );

    // Auto-open sidebar when first interest is collected
    if (collectedInterests.length === 0) setSidebarOpen(true);

    // Update stage interests
    setStage(prev => {
      if (prev.type !== 'utterance') return prev;
      return {
        ...prev,
        interests: prev.interests.map(i =>
          i.name.toLowerCase() === interestName.toLowerCase()
            ? { ...i, added: true }
            : i
        ),
      };
    });

    try {
      await setDoc(doc(firestore, 'users', user.uid), {
        interests: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.error('Failed to add interest:', e);
    }
  };

  // Long press handlers for sidebar interests
  const handleLongPressStart = (name: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressInterest(name);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Explore related interests — skips user echo, goes straight to breathing + fetch
  const handleExploreInterest = async (name: string) => {
    if (isStreaming) return;
    setLongPressInterest(null);
    setIsExploring(true);
    setStage({ type: 'breathing' });

    const msg = `(User wants to explore interests related to "${name}". Show a variety of related interests they can add. Present them with brief framing text and multiple [INTEREST: name] pills. Stay in interest exploration mode — don't pivot to a new conversation topic.)`;
    const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: msg }];
    setConversationHistory(newMessages);

    if (user) {
      try {
        await setDoc(doc(firestore, 'users', user.uid), {
          discoverConversation: newMessages,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}
    }

    await fetchResponse(newMessages);
  };

  // Continue conversation — exit explore mode and ask BAE to resume naturally
  const handleContinueConversation = async () => {
    if (isStreaming) return;
    setIsExploring(false);
    setStage({ type: 'breathing' });

    const msg = `(User is done exploring interests and wants to continue the conversation. Pick up naturally — ask a new question or follow up on something interesting from earlier. Don't mention the interest exploration.)`;
    const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: msg }];
    setConversationHistory(newMessages);

    if (user) {
      try {
        await setDoc(doc(firestore, 'users', user.uid), {
          discoverConversation: newMessages,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}
    }

    await fetchResponse(newMessages);
  };

  const handleGoDeeper = (name: string) => {
    setLongPressInterest(null);
    handleExploreInterest(name);
  };

  const handleTalkAbout = (name: string) => {
    setLongPressInterest(null);
    setIsExploring(false);
    handleSend(`Let's talk more about ${name}`);
  };

  // ====== LOADING ======
  if (!authReady) {
    return (
      <main className="min-h-screen w-full bg-[#0a0711] text-white flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30"
        />
      </main>
    );
  }

  // ====== INTRO SCREEN ======
  if (!started && isFirstVisit) {
    return (
      <main className="min-h-screen w-full bg-[#0a0711] text-white overflow-hidden">
        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none">
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full top-[20%] left-[30%]"
            style={{ background: 'rgba(139, 92, 246, 0.05)', filter: 'blur(80px)' }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 25, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full top-[50%] right-[20%]"
            style={{ background: 'rgba(212, 168, 67, 0.04)', filter: 'blur(80px)' }}
            animate={{ x: [0, -20, 30, 0], y: [0, 30, -10, 0], scale: [1, 0.95, 1.1, 1] }}
            transition={{ duration: 30, repeat: Infinity, delay: 8 }}
          />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 sm:px-12">
          <div className="w-full max-w-3xl text-center">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight"
            >
              Let's Talk.
            </motion.h1>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight mt-1"
            >
              <span className="text-white">And Make it </span>
              <span className="relative">
                <motion.span
                  className="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 bg-clip-text text-transparent"
                  animate={{ filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Interesting
                </motion.span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-yellow-300/0 via-yellow-300/80 to-yellow-300/0"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                />
              </span>
              <span className="text-white">.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="text-lg sm:text-xl text-white/30 max-w-xl mx-auto leading-relaxed mt-8 mb-14 font-light tracking-wide"
            >
              A conversation that discovers who you are.
              <br />
              <span className="text-white/15">Not a chatbot. Not a quiz. Something new.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              {existingInterests.length > 0 && (
                <p className="text-white/15 text-sm mb-5 font-medium tracking-wide">
                  You have {existingInterests.length} interest{existingInterests.length !== 1 ? 's' : ''}. Let's find more.
                </p>
              )}
              <motion.button
                onClick={startConversation}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(253,224,71,0.2), 0 0 60px rgba(253,224,71,0.06)',
                    '0 0 50px rgba(253,224,71,0.35), 0 0 100px rgba(253,224,71,0.12)',
                    '0 0 30px rgba(253,224,71,0.2), 0 0 60px rgba(253,224,71,0.06)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="px-16 py-6 rounded-full font-black text-xl sm:text-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-2 border-yellow-300/30"
              >
                Let's Go
              </motion.button>
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  // ====== THE PRESENT-TENSE EXPERIENCE ======
  return (
    <main className="h-screen w-full bg-[#0a0711] text-white flex flex-col overflow-hidden">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full top-[20%] left-[25%]"
          style={{ background: 'rgba(139, 92, 246, 0.05)', filter: 'blur(80px)' }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bottom-[20%] right-[15%]"
          style={{ background: 'rgba(212, 168, 67, 0.03)', filter: 'blur(80px)' }}
          animate={{ x: [0, -20, 30, 0], y: [0, 30, -10, 0] }}
          transition={{ duration: 30, repeat: Infinity, delay: 8 }}
        />
      </div>

      {/* Minimal top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-1.5 text-white/20 hover:text-white/50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs font-medium text-white/20 tracking-widest uppercase">Talk</span>
        </div>

        <div className="flex items-center gap-3">
          {collectedInterests.length > 0 && (
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-300/8 border border-yellow-300/12 hover:bg-yellow-300/12 transition-all"
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles size={12} className="text-yellow-300/70" />
              <motion.span
                key={collectedInterests.length}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="text-yellow-300/80 font-black text-xs"
              >
                {collectedInterests.length}
              </motion.span>
              {sidebarOpen ? (
                <ChevronDown size={12} className="text-yellow-300/40" />
              ) : (
                <ChevronUp size={12} className="text-yellow-300/40" />
              )}
            </motion.button>
          )}
          <button
            onClick={async () => {
              if (!user) return;
              try {
                await fetch('/api/clear-interview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ uid: user.uid }),
                });
                setConversationHistory([]);
                setCollectedInterests([]);
                setCurrentPillStates({});
                setStarted(false);
                setIsFirstVisit(true);
                setStage({ type: 'welcome' });
              } catch {}
            }}
            className="text-white/10 text-[11px] hover:text-white/30 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Collected interests sidebar/tray */}
      <AnimatePresence>
        {sidebarOpen && collectedInterests.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 overflow-hidden border-b border-white/5"
          >
            <div className="px-5 py-3 flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {collectedInterests.map((name, i) => (
                <motion.button
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onPointerDown={() => handleLongPressStart(name)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                  className="relative px-3 py-1.5 rounded-full text-[11px] font-bold text-amber-300/60 bg-amber-300/8 border border-amber-300/10 hover:bg-amber-300/15 hover:text-amber-300/80 transition-all cursor-pointer select-none"
                >
                  {name}

                  {/* Long-press menu */}
                  <AnimatePresence>
                    {longPressInterest === name && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex flex-col gap-1 p-1.5 rounded-xl bg-[#1a1025] border border-white/10 shadow-xl shadow-black/40 min-w-[160px]"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleGoDeeper(name)}
                          className="px-3 py-2 rounded-lg text-left text-xs font-medium text-violet-300 hover:bg-violet-500/15 transition-colors"
                        >
                          Go deeper
                        </button>
                        <button
                          onClick={() => handleTalkAbout(name)}
                          className="px-3 py-2 rounded-lg text-left text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-colors"
                        >
                          Talk about this
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close long-press menu when tapping elsewhere */}
      {longPressInterest && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setLongPressInterest(null)}
        />
      )}

      {/* ====== CENTER STAGE ====== */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-xl text-center">
          <AnimatePresence mode="wait">

            {/* WELCOME */}
            {stage.type === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="text-3xl sm:text-4xl font-light text-white/90 tracking-tight leading-snug">
                  Let's Talk. And <span className="text-amber-300 font-normal">Make it Interesting.</span>
                </h2>
                <p className="text-sm text-white/25 mt-4 font-light tracking-wide">
                  Tell BAE anything — your day, an obsession, a question, whatever's alive in you.
                </p>
                <motion.p
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs text-white/15 mt-8 tracking-widest"
                >
                  start typing _
                </motion.p>
              </motion.div>
            )}

            {/* USER ECHO — brief display of what they said */}
            {stage.type === 'userEcho' && (
              <motion.div
                key="echo"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-lg sm:text-xl text-white/40 font-light italic tracking-wide leading-relaxed">
                  {stage.text}
                </p>
              </motion.div>
            )}

            {/* BREATHING — the thinking state */}
            {stage.type === 'breathing' && (
              <motion.div
                key="breathing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center"
              >
                <motion.div
                  animate={{
                    scale: [0.8, 1.3, 0.8],
                    opacity: [0.2, 0.5, 0.2],
                    boxShadow: [
                      '0 0 20px rgba(139,92,246,0.2)',
                      '0 0 40px rgba(139,92,246,0.4)',
                      '0 0 20px rgba(139,92,246,0.2)',
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-12 h-12 rounded-full bg-violet-500/15 border border-violet-500/20"
                />
              </motion.div>
            )}

            {/* BAE'S UTTERANCE — the present moment */}
            {stage.type === 'utterance' && (
              <motion.div
                key={`utterance-${conversationHistory.length}`}
                initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-8"
              >
                {/* BAE's text */}
                <div className="flex items-start gap-3 justify-center">
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 8px rgba(139,92,246,0.3)',
                        '0 0 16px rgba(139,92,246,0.5)',
                        '0 0 8px rgba(139,92,246,0.3)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-violet-400 mt-3 flex-shrink-0"
                  />
                  <p className="text-xl sm:text-2xl lg:text-[26px] font-light text-white/90 leading-[1.65] tracking-tight text-center">
                    {stage.text}
                  </p>
                </div>

                {/* Interest pills */}
                {stage.interests.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-wrap justify-center gap-3"
                  >
                    {stage.interests.map((interest, i) => {
                      const isAdded = currentPillStates[interest.name.toLowerCase()] || false;
                      return (
                        <motion.div
                          key={interest.name}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                          className="flex items-center gap-1"
                        >
                          {/* The pill itself */}
                          <motion.button
                            whileHover={!isAdded ? { scale: 1.06, y: -2 } : {}}
                            whileTap={!isAdded ? { scale: 0.95 } : {}}
                            onClick={() => !isAdded && handleAddInterest(interest.name)}
                            className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all select-none ${
                              isAdded
                                ? 'text-amber-300/70 bg-amber-300/10 border border-amber-300/20'
                                : 'text-white/90 bg-white/6 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20'
                            }`}
                            style={isAdded ? {
                              boxShadow: '0 0 20px rgba(212,168,67,0.25)',
                            } : {}}
                          >
                            {isAdded && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                                className="mr-1.5"
                              >
                                ✓
                              </motion.span>
                            )}
                            {!isAdded && <span className="mr-1.5 text-white/30">+</span>}
                            {interest.name}

                            {/* Ripple on add */}
                            {isAdded && (
                              <motion.span
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0 rounded-full border border-amber-300/50 pointer-events-none"
                              />
                            )}
                          </motion.button>

                          {/* Explore icon — appears after pill is added */}
                          <AnimatePresence>
                            {isAdded && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0, width: 0 }}
                                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                                exit={{ opacity: 0, scale: 0, width: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                onClick={() => handleExploreInterest(interest.name)}
                                className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-400/20 flex items-center justify-center text-violet-300/70 hover:bg-violet-500/25 hover:text-violet-300 transition-all flex-shrink-0"
                                title={`Explore interests related to ${interest.name}`}
                              >
                                <Search size={13} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Continue conversation button — visible when exploring or when pills have been added */}
                {(isExploring || stage.interests.some(i => currentPillStates[i.name.toLowerCase()])) && !isStreaming && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    onClick={handleContinueConversation}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white/40 bg-white/[0.04] border border-white/[0.08] hover:text-white/60 hover:bg-white/[0.07] transition-all mt-2"
                  >
                    <MessageCircle size={13} />
                    Continue conversation
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ERROR */}
            {stage.type === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-base text-white/40 font-light">{stage.text}</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Input */}
      <div
        className="relative z-10 flex-shrink-0 px-6 sm:px-8 py-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isStreaming ? '' : 'Say something...'}
              disabled={isStreaming}
              className="w-full px-6 py-4 pr-14 rounded-full bg-white/[0.03] border border-white/[0.06] text-white text-base placeholder:text-white/15 outline-none focus:border-violet-500/25 focus:bg-white/[0.05] focus:shadow-[0_0_40px_rgba(139,92,246,0.06)] transition-all disabled:opacity-20 font-light tracking-wide"
            />
            <motion.button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              whileTap={{ scale: 0.9 }}
              whileHover={input.trim() && !isStreaming ? { scale: 1.1 } : {}}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                input.trim() && !isStreaming
                  ? 'text-violet-400 hover:text-violet-300'
                  : 'text-white/10'
              }`}
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Global keyframe for pill glow */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(212,168,67,0.3); }
          50% { box-shadow: 0 0 25px rgba(212,168,67,0.5); }
        }
      `}</style>
    </main>
  );
}
