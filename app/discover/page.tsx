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
  const [started, setStarted] = useState(false);
  const [userName, setUserName] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

          // Load previous conversation if exists
          if (data.discoverConversation?.length) {
            setMessages(data.discoverConversation);
            setConversationHistory(data.discoverConversation);
            setStarted(true);

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

      // Update the message
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
      // Show error in the message
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
            animate={{ opacity: 1, scale: 1 }}
            whileTap={!isAdded ? { scale: 0.95 } : {}}
            onClick={() => {
              if (!isAdded && suggested) handleAddInterest(suggested);
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold mx-1 my-0.5 transition-all ${
              isAdded
                ? 'bg-amber-300/15 text-amber-200/50 border border-amber-300/20'
                : 'bg-yellow-300 text-black border border-yellow-200 shadow-[0_0_12px_rgba(253,224,71,0.5)] cursor-pointer hover:shadow-[0_0_20px_rgba(253,224,71,0.7)]'
            }`}
          >
            {!isAdded && <span className="text-[10px]">+</span>}
            {name}
            {isAdded && <span className="text-[10px] ml-0.5">added</span>}
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

  // ====== INTRO SCREEN ======
  if (!started) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          {/* Oracle icon */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 30px rgba(139,92,246,0.3)',
                '0 0 60px rgba(139,92,246,0.5)',
                '0 0 30px rgba(139,92,246,0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/40 border border-violet-400/30 flex items-center justify-center"
          >
            <span className="text-3xl">✦</span>
          </motion.div>

          <h1 className="text-3xl font-black mb-3">
            {userName ? `${userName}, let's get into it.` : `Let's get into it.`}
          </h1>
          <div className="text-white/50 text-base leading-loose mb-10">
            <p>We'll talk. I'll listen.</p>
            <p>As your interests come up,</p>
            <p>tap the golden pills to add them to your profile.</p>
          </div>

          {/* Existing interests preview */}
          {existingInterests.length > 0 && (
            <div className="mb-8">
              <p className="text-white/25 text-xs mb-3">You already have {existingInterests.length} interest{existingInterests.length !== 1 ? 's' : ''} — let's find more</p>
              <div className="flex flex-wrap justify-center gap-2">
                {interestNames(existingInterests).slice(0, 6).map(name => (
                  <span key={name} className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-300/10 text-amber-200/40 border border-amber-300/15">
                    {name}
                  </span>
                ))}
                {existingInterests.length > 6 && (
                  <span className="px-3 py-1 rounded-full text-xs text-white/20">+{existingInterests.length - 6} more</span>
                )}
              </div>
            </div>
          )}

          <motion.button
            onClick={startInterview}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(139,92,246,0.3), 0 0 60px rgba(99,102,241,0.15)',
                '0 0 30px rgba(139,92,246,0.5), 0 0 80px rgba(99,102,241,0.25)',
                '0 0 20px rgba(139,92,246,0.3), 0 0 60px rgba(99,102,241,0.15)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-12 py-4 rounded-full font-black text-lg bg-gradient-to-r from-violet-500 to-indigo-500 border border-violet-400/30"
          >
            Start the interview
          </motion.button>

          <p className="mt-6 text-white/20 text-xs italic">
            First question might be something like: "What's your favorite movie?"
          </p>
        </motion.div>
      </main>
    );
  }

  // ====== CONVERSATION ======
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button
          onClick={() => router.push('/profile')}
          className="p-2 text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/40 border border-violet-400/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✦</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white/80">The Interview</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/30 text-[11px] font-medium">live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex gap-3 max-w-[88%]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-400/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[10px]">✦</span>
                </div>
                <div className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                  {renderMessage(msg.content, idx)}
                </div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-violet-500/20 border border-violet-400/15 text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            )}
          </motion.div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-400/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px]">✦</span>
            </div>
            <motion.div
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white/30 text-sm pt-1"
            >
              thinking...
            </motion.div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Discovered interests tray */}
      {suggestedInterests.filter(s => s.added).length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-white/20 text-[11px] whitespace-nowrap flex-shrink-0">Discovered:</span>
            {suggestedInterests.filter(s => s.added).map(s => (
              <span
                key={s.name}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-300/10 text-amber-200/50 border border-amber-300/15 whitespace-nowrap flex-shrink-0"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 py-3 border-t border-white/5"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isStreaming ? "" : "Your turn..."}
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-violet-400/30 focus:bg-white/8 text-sm transition-all disabled:opacity-40"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-2xl transition-all ${
              input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20'
                : 'bg-white/5 text-white/15'
            }`}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
