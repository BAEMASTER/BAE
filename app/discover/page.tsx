'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
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

const SAMPLE_QUESTIONS = [
  "What could you give a TED talk on with zero prep?",
  "If I looked at your YouTube history, what would I find?",
  "What's a strong opinion you have that most people disagree with?",
  "What's the most random rabbit hole you've gone down?",
  "When you were a kid, what did you think you'd be doing now?",
];

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedInterests, setSuggestedInterests] = useState<SuggestedInterest[]>([]);
  const [existingInterests, setExistingInterests] = useState<StructuredInterest[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [started, setStarted] = useState(false);
  const [userName, setUserName] = useState('');

  const [lastAddedInterest, setLastAddedInterest] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);
  const autoFollowUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick 3 random sample questions
  const [sampleQuestions] = useState(() => {
    const shuffled = [...SAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestedInterests]);

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

          // Returning user — skip intro, load conversation
          if (data.discoverConversation?.length) {
            setMessages(data.discoverConversation);
            setConversationHistory(data.discoverConversation);
            setStarted(true);
            setIsFirstVisit(false);

            // Re-extract suggested interests from history
            const suggested: SuggestedInterest[] = [];
            const existingNames = interestNames(interests).map(n => n.toLowerCase());
            data.discoverConversation.forEach((msg: ChatMessage, idx: number) => {
              if (msg.role === 'assistant') {
                const matches = msg.content.matchAll(/\[INTEREST:\s*([^\]]+)\]/g);
                for (const match of matches) {
                  const name = match[1].trim();
                  suggested.push({
                    name,
                    added: existingNames.includes(name.toLowerCase()),
                    messageIdx: idx,
                  });
                }
              }
            });
            setSuggestedInterests(suggested);
          }
        }
      } catch (e) {
        console.error('Load failed:', e);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const startInterview = async () => {
    setStarted(true);
    await fetchResponse([]);
  };

  const fetchResponse = async (currentMessages: ChatMessage[]) => {
    setIsStreaming(true);
    setLastAddedInterest(null);

    const assistantIdx = currentMessages.length;
    setMessages([...currentMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.length === 0
            ? [{ role: 'user', content: `(The guest just sat down. Their first name is ${userName || 'there'}. Start the interview.)` }]
            : currentMessages,
          existingInterests: interestNames(existingInterests),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('API error:', res.status, errData);
        throw new Error(errData.error || 'Interview failed');
      }

      const data = await res.json();
      const fullText = data.text || '';

      setMessages(prev => {
        const updated = [...prev];
        updated[assistantIdx] = { role: 'assistant', content: fullText };
        return updated;
      });

      // Extract interests from response
      const interestMatches = fullText.matchAll(/\[INTEREST:\s*([^\]]+)\]/g);
      const newSuggested: SuggestedInterest[] = [];
      const existingNames = interestNames(existingInterests).map(n => n.toLowerCase());

      for (const match of interestMatches) {
        const name = match[1].trim();
        if (!existingNames.includes(name.toLowerCase())) {
          newSuggested.push({ name, added: false, messageIdx: assistantIdx });
        }
      }

      if (newSuggested.length > 0) {
        setSuggestedInterests(prev => [...prev, ...newSuggested]);
      }

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
      console.error('Interview error:', e);
      setMessages(prev => {
        const updated = [...prev];
        updated[assistantIdx] = { role: 'assistant', content: 'Hmm, something went wrong. Try again in a moment.' };
        return updated;
      });
    }

    setIsStreaming(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // User is typing — cancel any auto-follow-up
    if (autoFollowUpRef.current) clearTimeout(autoFollowUpRef.current);
    setRecentlyAdded([]);

    setInput('');
    const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: text }];
    setMessages(newMessages);
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

  const handleAddInterest = async (interest: SuggestedInterest) => {
    if (interest.added || !user) return;
    if (isBlockedInterest(interest.name)) return;

    const newInterest = createInterest(interest.name, 'profile');
    const updated = addStructuredInterests(existingInterests, [newInterest]);
    setExistingInterests(updated);
    playAddSound();
    setLastAddedInterest(interest.name);
    setRecentlyAdded(prev => [...prev, interest.name]);

    setSuggestedInterests(prev =>
      prev.map(s => s.name === interest.name ? { ...s, added: true } : s)
    );

    try {
      await setDoc(doc(firestore, 'users', user.uid), {
        interests: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.error('Failed to add interest:', e);
    }

    // Auto-follow-up: wait 3 seconds after last tap, then AI continues
    if (autoFollowUpRef.current) clearTimeout(autoFollowUpRef.current);
    autoFollowUpRef.current = setTimeout(() => {
      if (!isStreaming) {
        const added = [...recentlyAdded, interest.name];
        setRecentlyAdded([]);
        const systemMsg = added.length === 1
          ? `(User tapped and added "${added[0]}" to their profile. React naturally — like "nice one" or "good pick" — then ask if there's anything else on their mind about this topic, or if they want to move on to something new. Keep it warm and casual, like a friend. If they seem done with this area, pivot to something totally different about their life.)`
          : `(User tapped and added these interests: ${added.join(', ')}. React naturally and briefly. Then ask if anything else comes to mind on this topic or if they want to switch gears. Keep it casual and warm.)`;
        const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: systemMsg }];
        fetchResponse(newMessages);
      }
    }, 3000);
  };

  // Render message text, replacing [INTEREST: x] with inline pills
  const renderMessage = (content: string, msgIdx: number) => {
    const parts = content.split(/(\[INTEREST:\s*[^\]]+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[INTEREST:\s*([^\]]+)\]/);
      if (match) {
        const name = match[1].trim();
        const suggested = suggestedInterests.find(
          s => s.name.toLowerCase() === name.toLowerCase()
        );
        const isAdded = suggested?.added || interestNames(existingInterests).some(
          n => n.toLowerCase() === name.toLowerCase()
        );

        return (
          <motion.button
            key={`${msgIdx}-interest-${i}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isAdded
              ? { opacity: 1, scale: [1.2, 1] }
              : { opacity: 1, scale: 1 }
            }
            whileTap={!isAdded ? { scale: 0.95 } : {}}
            onClick={() => {
              if (!isAdded && suggested) handleAddInterest(suggested);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold mx-1 my-1 transition-all ${
              isAdded
                ? 'bg-green-400/20 text-green-300 border border-green-400/30'
                : 'text-black bg-yellow-300 border border-yellow-200 ring-2 ring-yellow-200/40 cursor-pointer hover:scale-105'
            }`}
            style={!isAdded ? { boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' } : {}}
          >
            {isAdded ? '✓' : '+'}
            <span className="ml-0.5">{name}</span>
          </motion.button>
        );
      }
      return <span key={`${msgIdx}-text-${i}`}>{part}</span>;
    });
  };

  if (!authReady) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-white/50 text-sm">
          Loading...
        </motion.div>
      </main>
    );
  }

  // ====== INTRO SCREEN (first-time visitors only) ======
  if (!started && isFirstVisit) {
    return (
      <main className="min-h-screen w-full text-white overflow-y-auto" style={{ background: '#070412' }}>

        {/* Ambient light show */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ opacity: [0.08, 0.15, 0.08], x: ['-5%', '5%', '-5%'] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-violet-600 blur-[200px]"
          />
          <motion.div
            animate={{ opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, delay: 3 }}
            className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-amber-500 blur-[180px]"
          />
          <motion.div
            animate={{ opacity: [0.03, 0.07, 0.03] }}
            transition={{ duration: 10, repeat: Infinity, delay: 5 }}
            className="absolute top-[40%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500 blur-[150px]"
          />
        </div>

        <div className="relative z-10">

          {/* ===== HERO — full viewport ===== */}
          <div className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 lg:px-20">

            <div className="w-full max-w-5xl">

              {/* BAE AI badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex justify-center mb-8"
              >
                <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400/20 bg-amber-400/5">
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 8px rgba(251,191,36,0.4)',
                        '0 0 16px rgba(251,191,36,0.7)',
                        '0 0 8px rgba(251,191,36,0.4)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2.5 h-2.5 rounded-full bg-amber-400"
                  />
                  <span className="text-amber-300 text-sm font-bold tracking-wider">BAE AI</span>
                </div>
              </motion.div>

              {/* Main headline */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="text-center mb-6"
              >
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-3">
                  <span className="text-white">Tell </span>
                  <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 bg-clip-text text-transparent">BAE</span>
                  <span className="text-white"> About Your World</span>
                </h1>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white/40">
                  Watch the Magic Happen
                </h2>
              </motion.div>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-center text-lg sm:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed mb-14"
              >
                The best conversation you've never had. Until now.
              </motion.p>

              {/* Three cards — Talk / See / Fun */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-16 max-w-4xl mx-auto"
              >
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="rounded-2xl p-6 sm:p-8 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                    className="text-4xl mb-4"
                  >
                    ✦
                  </motion.div>
                  <h3 className="text-xl font-black text-white mb-2">Talk with BAE</h3>
                  <p className="text-white/35 text-sm leading-relaxed">Smart questions that go wherever you go. No script. No agenda. Just real conversation.</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="rounded-2xl p-6 sm:p-8 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.05))',
                    border: '1px solid rgba(251,191,36,0.2)',
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className="text-4xl mb-4"
                  >
                    +
                  </motion.div>
                  <h3 className="text-xl font-black text-white mb-2">See Your Interests Come Alive</h3>
                  <p className="text-white/35 text-sm leading-relaxed">Golden pills appear as you talk. Tap the ones that feel like you. Watch your profile build itself.</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="rounded-2xl p-6 sm:p-8 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(16,185,129,0.05))',
                    border: '1px solid rgba(52,211,153,0.15)',
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                    className="text-4xl mb-4"
                  >
                    ✨
                  </motion.div>
                  <h3 className="text-xl font-black text-white mb-2">Have Fun</h3>
                  <p className="text-white/35 text-sm leading-relaxed">This isn't a form or a quiz. It's you, talking freely, discovering things about yourself you didn't know you'd say.</p>
                </motion.div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
                className="text-center mb-6"
              >
                {existingInterests.length > 0 && (
                  <p className="text-white/25 text-sm mb-5">You have {existingInterests.length} interest{existingInterests.length !== 1 ? 's' : ''}. Let's find more.</p>
                )}
                <motion.button
                  onClick={startInterview}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 40px rgba(251,191,36,0.3), 0 0 80px rgba(245,158,11,0.1)',
                      '0 0 60px rgba(251,191,36,0.5), 0 0 120px rgba(245,158,11,0.2)',
                      '0 0 40px rgba(251,191,36,0.3), 0 0 80px rgba(245,158,11,0.1)',
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="px-20 py-7 rounded-full font-black text-2xl sm:text-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-2 border-yellow-300/50"
                >
                  Begin
                </motion.button>
              </motion.div>

              {/* Sample question teaser */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-white/20 text-sm italic">
                  First question might be: "{sampleQuestions[0]}"
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ====== CONVERSATION ======
  const addedCount = suggestedInterests.filter(s => s.added).length;

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <button
          onClick={() => router.push('/profile')}
          className="p-2 text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <motion.div
            animate={{
              boxShadow: [
                '0 0 12px rgba(139,92,246,0.4)',
                '0 0 24px rgba(139,92,246,0.6)',
                '0 0 12px rgba(139,92,246,0.4)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 border border-violet-400/40 flex items-center justify-center flex-shrink-0"
          >
            <span className="text-sm font-bold">✦</span>
          </motion.div>
          <h1 className="text-base font-black text-white">BAE AI</h1>
        </div>
        {/* Interest score */}
        {addedCount > 0 && (
          <motion.div
            key={addedCount}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-300/10 border border-yellow-300/20"
          >
            <span className="text-yellow-300 font-black text-sm">+{addedCount}</span>
            <span className="text-yellow-300/50 text-[10px] font-semibold">new</span>
          </motion.div>
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
              setMessages([]);
              setConversationHistory([]);
              setSuggestedInterests([]);
              setStarted(false);
              setIsFirstVisit(true);
            } catch {}
          }}
          className="text-white/20 text-[11px] hover:text-white/50 transition-colors"
        >
          Start over
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.filter(msg => !(msg.role === 'user' && msg.content.startsWith('('))).map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="max-w-[88%] px-5 py-4 rounded-2xl text-base leading-relaxed whitespace-pre-wrap"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))',
                  border: '1px solid rgba(139,92,246,0.25)',
                }}
              >
                <div className="text-white/90 font-medium">
                  {renderMessage(msg.content, idx)}
                </div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="max-w-[80%] px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-400/20 text-base text-white font-medium leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            )}
          </motion.div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div
              className="px-5 py-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-violet-300/60 text-base font-medium"
              >
                ✦ ✦ ✦
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Show me related button */}
        {lastAddedInterest && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-2"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                const msg = `Show me more interests related to ${lastAddedInterest}`;
                setLastAddedInterest(null);
                const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: msg }];
                setMessages(prev => [...prev]);
                await fetchResponse(newMessages);
              }}
              className="px-4 py-2 rounded-full text-xs font-bold bg-violet-500/20 border border-violet-400/20 text-violet-300 hover:bg-violet-500/30 transition-all"
            >
              Show me related interests
            </motion.button>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 py-4 bg-black/30 backdrop-blur-sm border-t border-white/10"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-3 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isStreaming ? "" : "Tell BAE anything..."}
            disabled={isStreaming}
            className="flex-1 px-5 py-4 rounded-2xl bg-white/8 border border-white/15 text-white text-base placeholder:text-white/25 outline-none focus:border-violet-400/40 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all disabled:opacity-40"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            whileTap={{ scale: 0.9 }}
            whileHover={input.trim() && !isStreaming ? { scale: 1.05 } : {}}
            className={`p-4 rounded-2xl transition-all ${
              input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-white/5 text-white/15'
            }`}
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
