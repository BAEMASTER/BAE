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
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold mx-1 my-1 transition-all ${
              isAdded
                ? 'bg-amber-300/10 text-amber-200/40 border border-amber-300/15'
                : 'text-black bg-yellow-300 border border-yellow-200 ring-2 ring-yellow-200/40 cursor-pointer hover:scale-105'
            }`}
            style={!isAdded ? { boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' } : {}}
          >
            {!isAdded && <span className="text-xs font-black">+</span>}
            {name}
            {isAdded && <span className="text-[11px] ml-0.5">added</span>}
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center max-w-lg"
        >
          {/* Big bold greeting */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-black mb-6 leading-tight"
          >
            <span className="text-white">Tell </span>
            <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">BAE</span>
            <span className="text-white"> About It</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-white/50 text-lg leading-relaxed mb-12"
          >
            <p>I'll ask. You talk.</p>
            <p className="mt-1">Tap the <span className="text-yellow-300 font-bold">golden pills</span> to collect your interests.</p>
          </motion.div>

          {/* Existing interests as glowing pills */}
          {existingInterests.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-white/30 text-sm mb-4">You have {existingInterests.length} interest{existingInterests.length !== 1 ? 's' : ''} so far — let's find more</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {interestNames(existingInterests).slice(0, 8).map((name, i) => (
                  <motion.span
                    key={name}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.06, type: 'spring', stiffness: 300 }}
                    className="px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-300/10 text-yellow-200/50 border border-yellow-300/15"
                  >
                    {name}
                  </motion.span>
                ))}
                {existingInterests.length > 8 && (
                  <span className="px-4 py-1.5 rounded-full text-sm text-white/20">+{existingInterests.length - 8} more</span>
                )}
              </div>
            </motion.div>
          )}

          <motion.button
            onClick={startInterview}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-14 py-5 rounded-full font-black text-xl bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-300/30 shadow-[0_0_30px_rgba(245,158,11,0.4),0_0_60px_rgba(249,115,22,0.15)]"
          >
            Start the interview
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="mt-6 text-white/25 text-sm"
          >
            First question might be: "What's your favorite movie?"
          </motion.p>
        </motion.div>
      </main>
    );
  }

  // ====== CONVERSATION ======
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
          <h1 className="text-base font-black text-white">Tell BAE About It</h1>
        </div>
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
            } catch {}
          }}
          className="text-white/20 text-[11px] hover:text-white/50 transition-colors"
        >
          Start over
        </button>
      </div>

      {/* Interest counter */}
      {suggestedInterests.filter(s => s.added).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 py-3 bg-yellow-300/5 border-b border-yellow-300/10"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.4 }}
              key={suggestedInterests.filter(s => s.added).length}
              className="w-8 h-8 rounded-full bg-yellow-300 text-black font-black text-sm flex items-center justify-center shadow-[0_0_15px_rgba(253,224,71,0.5)]"
            >
              {suggestedInterests.filter(s => s.added).length}
            </motion.div>
            <div className="flex gap-2 overflow-x-auto flex-1">
              {suggestedInterests.filter(s => s.added).map(s => (
                <span
                  key={s.name}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-300/15 text-yellow-200 border border-yellow-300/20 whitespace-nowrap flex-shrink-0"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, idx) => (
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
            placeholder={isStreaming ? "" : "Your turn..."}
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
