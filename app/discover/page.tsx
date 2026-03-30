'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Send } from 'lucide-react';
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

          // Load previous conversation if exists
          if (data.discoverConversation?.length) {
            setMessages(data.discoverConversation);
            setConversationHistory(data.discoverConversation);

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

  // Start the conversation if empty
  useEffect(() => {
    if (authReady && user && messages.length === 0 && !isStreaming) {
      streamResponse([]);
    }
  }, [authReady, user]);

  const streamResponse = async (currentMessages: ChatMessage[]) => {
    setIsStreaming(true);

    // Add empty assistant message for streaming
    const assistantIdx = currentMessages.length;
    setMessages([...currentMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.length === 0
            ? [{ role: 'user', content: '(The guest just sat down. Start the podcast.)' }]
            : currentMessages,
          existingInterests: interestNames(existingInterests),
        }),
      });

      if (!res.ok) throw new Error('Stream failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantIdx] = { role: 'assistant', content: fullText };
                return updated;
              });
            }
          } catch {}
        }
      }

      // Extract interests from completed message
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
      console.error('Stream error:', e);
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

    // Save user message immediately
    if (user) {
      try {
        await setDoc(doc(firestore, 'users', user.uid), {
          discoverConversation: newMessages,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}
    }

    await streamResponse(newMessages);
  };

  const handleAddInterest = async (interest: SuggestedInterest) => {
    if (interest.added || !user) return;
    if (isBlockedInterest(interest.name)) return;

    const newInterest = createInterest(interest.name, 'profile');
    const updated = addStructuredInterests(existingInterests, [newInterest]);
    setExistingInterests(updated);
    playAddSound();

    // Mark as added
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
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mx-1 my-0.5 transition-all ${
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
        <div className="text-white/50">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <button
          onClick={() => router.push('/profile')}
          className="p-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Discover Yourself</h1>
          <p className="text-white/40 text-xs">Your podcast. Your interests. Your story.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400/70 text-xs font-medium tracking-wide uppercase">Live</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-500/30 border border-violet-400/20 text-white'
                  : 'bg-white/5 border border-white/10 text-white/90'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="whitespace-pre-wrap">{renderMessage(msg.content, idx)}</div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </motion.div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-white/40 text-sm"
              >
                ...
              </motion.div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Added interests count */}
      {suggestedInterests.filter(s => s.added).length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-white/30 text-xs whitespace-nowrap flex-shrink-0">Added:</span>
            {suggestedInterests.filter(s => s.added).map(s => (
              <span
                key={s.name}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-300/15 text-amber-200/60 border border-amber-300/20 whitespace-nowrap flex-shrink-0"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isStreaming ? "Listening..." : "Say something..."}
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 text-sm disabled:opacity-50"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-xl transition-all ${
              input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                : 'bg-white/5 text-white/20'
            }`}
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
