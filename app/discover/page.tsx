'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Sparkles, Search } from 'lucide-react';
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
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
};

const playMilestoneSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.08 + 0.2);
      osc.start(audioCtx.currentTime + i * 0.08);
      osc.stop(audioCtx.currentTime + i * 0.08 + 0.2);
    });
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

  const [collectedInterests, setCollectedInterests] = useState<string[]>([]);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [topicIcon, setTopicIcon] = useState<string | null>(null);
  const [topicHistory, setTopicHistory] = useState<{ icon: string; label: string; msgIdx: number }[]>([]);
  // Question reactions — track which messages have been reacted to
  const [questionReactions, setQuestionReactions] = useState<Record<number, string>>({});
  // Track interests selected since last AI response — for dynamic follow-up
  const [recentlySelected, setRecentlySelected] = useState<string[]>([]);
  const [showContinue, setShowContinue] = useState(false);
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Map interests/text to topic icons
  const detectTopicIcon = (text: string, interests: string[]): string => {
    const all = (text + ' ' + interests.join(' ')).toLowerCase();
    const map: [string[], string][] = [
      [['music', 'singing', 'guitar', 'piano', 'jazz', 'hip hop', 'rap', 'concert', 'band', 'instrument', 'song', 'dj', 'producer', 'vinyl', 'playlist', 'kirtan', 'mantra', 'chanting'], '🎵'],
      [['cook', 'food', 'recipe', 'restaurant', 'chef', 'cuisine', 'dinner', 'meal', 'raw food', 'nutrition', 'eating', 'vegan', 'plant-based'], '🍳'],
      [['fitness', 'gym', 'workout', 'running', 'exercise', 'lift', 'crossfit', 'training', 'marathon', 'strength'], '💪'],
      [['yoga', 'meditation', 'mindful', 'breathwork', 'spiritual', 'consciousness', 'awakening', 'presence', 'zen', 'buddhis', 'hindu', 'sai baba', 'kundalini', 'chakra', 'energy healing'], '🧘'],
      [['travel', 'trip', 'country', 'city', 'flight', 'explore', 'backpack', 'adventure', 'destination', 'abroad'], '✈️'],
      [['tech', 'coding', 'software', 'ai', 'artificial intelligence', 'programming', 'startup', 'app', 'build', 'engineer', 'claude', 'machine learning'], '💻'],
      [['business', 'entrepreneur', 'sales', 'hustle', 'revenue', 'company', 'startup', 'insurance', 'financial', 'invest', 'wealth', 'estate planning', 'money'], '📈'],
      [['family', 'kids', 'parent', 'father', 'mother', 'son', 'daughter', 'child', 'raising'], '👨‍👩‍👧‍👦'],
      [['film', 'movie', 'cinema', 'director', 'watch', 'tv', 'show', 'series', 'netflix', 'documentary'], '🎬'],
      [['book', 'reading', 'author', 'novel', 'literature', 'writing', 'poetry', 'poet', 'journal'], '📚'],
      [['art', 'paint', 'drawing', 'creative', 'design', 'gallery', 'museum', 'sculpture', 'photograph'], '🎨'],
      [['sport', 'basketball', 'football', 'soccer', 'tennis', 'baseball', 'golf', 'surf', 'ski', 'snowboard', 'swim', 'climb'], '⚽'],
      [['comedy', 'stand-up', 'funny', 'humor', 'laugh', 'improv', 'joke'], '😂'],
      [['nature', 'hiking', 'outdoor', 'mountain', 'ocean', 'beach', 'camping', 'garden', 'forest', 'trail'], '🌿'],
      [['love', 'relationship', 'dating', 'romance', 'intimacy', 'partner', 'marriage', 'tantra', 'sacred sexuality', 'polarity', 'attraction'], '❤️'],
      [['psychology', 'therapy', 'mental health', 'growth', 'personal development', 'self-improvement', 'coaching', 'sobriety'], '🧠'],
      [['fashion', 'style', 'clothing', 'sneaker', 'outfit', 'design'], '👔'],
      [['science', 'physics', 'biology', 'chemistry', 'space', 'astronomy', 'quantum', 'research'], '🔬'],
      [['dog', 'cat', 'pet', 'animal'], '🐕'],
      [['game', 'gaming', 'video game', 'board game', 'chess', 'poker'], '🎮'],
      [['coffee', 'tea', 'cafe', 'espresso'], '☕'],
      [['wine', 'beer', 'cocktail', 'drink', 'bar', 'whiskey'], '🍷'],
      [['dance', 'dancing', 'salsa', 'house music', 'electronic', 'rave', 'festival'], '💃'],
      [['philosophy', 'meaning', 'existence', 'purpose', 'stoic', 'wisdom', 'truth'], '💡'],
    ];
    for (const [keywords, icon] of map) {
      if (keywords.some(k => all.includes(k))) return icon;
    }
    return '✦';
  };

  // Auto-scroll
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestedInterests]);

  // Auth + load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/auth'); return; }
      setUser(u);

      try {
        const snap = await getDoc(doc(firestore, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          const interests = parseInterests(data.interests);
          setExistingInterests(interests);
          // Use Firebase Auth name (same as header), fall back to Firestore
          const authName = u.displayName?.split(' ')[0];
          const firestoreName = data.displayName?.split(' ')[0];
          setUserName(authName || firestoreName || '');

          if (data.discoverConversation?.length) {
            setMessages(data.discoverConversation);
            setConversationHistory(data.discoverConversation);
            setStarted(true);
            setIsFirstVisit(false);

            const suggested: SuggestedInterest[] = [];
            const existingNames = interestNames(interests).map(n => n.toLowerCase());
            const collected: string[] = [];
            data.discoverConversation.forEach((msg: ChatMessage, idx: number) => {
              if (msg.role === 'assistant') {
                const matches = msg.content.matchAll(/\[INTEREST:\s*([^\]]+)\]/g);
                for (const match of matches) {
                  const name = match[1].trim();
                  const isAdded = existingNames.includes(name.toLowerCase());
                  suggested.push({ name, added: isAdded, messageIdx: idx });
                  if (isAdded && !collected.includes(name)) collected.push(name);
                }
              }
            });
            setSuggestedInterests(suggested);
            setCollectedInterests(collected);
          }
        }
      } catch (e) { console.error('Load failed:', e); }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const startConversation = async () => {
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
            ? [{ role: 'user', content: `(The guest just sat down. Their first name is ${userName || 'there'}. Start the conversation.)` }]
            : currentMessages,
          existingInterests: interestNames(existingInterests),
        }),
      });

      if (!res.ok) throw new Error('Something went wrong');

      const data = await res.json();
      const fullText = data.text || '';

      setMessages(prev => {
        const updated = [...prev];
        updated[assistantIdx] = { role: 'assistant', content: fullText };
        return updated;
      });

      // Extract interests
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
        playDiscoverSound();
        // Start 5-second timer for continue button
        if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
        setShowContinue(false);
        continueTimerRef.current = setTimeout(() => setShowContinue(true), 5000);
      }
      setRecentlySelected([]);

      // Detect topic icon from response
      const interestNamesFromResponse = [...fullText.matchAll(/\[INTEREST:\s*([^\]]+)\]/g)].map(m => m[1].trim());
      const icon = detectTopicIcon(fullText, interestNamesFromResponse);
      setTopicIcon(icon);
      // Add to topic history if it's a new icon (avoid duplicates in a row)
      setTopicHistory(prev => {
        const lastIcon = prev.length > 0 ? prev[prev.length - 1].icon : null;
        if (icon !== lastIcon) {
          const label = interestNamesFromResponse[0] || 'Chat';
          return [...prev, { icon, label, msgIdx: assistantIdx }];
        }
        return prev;
      });

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
      // Retry once before showing error
      try {
        const retry = await fetch('/api/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMessages.length === 0
              ? [{ role: 'user', content: `(The guest just sat down. Their first name is ${userName || 'there'}. Start the conversation.)` }]
              : currentMessages,
            existingInterests: interestNames(existingInterests),
          }),
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryText = retryData.text || '';
          setMessages(prev => {
            const updated = [...prev];
            updated[assistantIdx] = { role: 'assistant', content: retryText };
            return updated;
          });
          // Still need to extract interests and save — jump to success path
          const retryInterests = [...retryText.matchAll(/\[INTEREST:\s*([^\]]+)\]/g)];
          const newRetry: SuggestedInterest[] = [];
          const existNames = interestNames(existingInterests).map(n => n.toLowerCase());
          for (const m of retryInterests) {
            const name = m[1].trim();
            if (!existNames.includes(name.toLowerCase())) {
              newRetry.push({ name, added: false, messageIdx: assistantIdx });
            }
          }
          if (newRetry.length > 0) {
            setSuggestedInterests(prev => [...prev, ...newRetry]);
            playDiscoverSound();
            if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
            setShowContinue(false);
            continueTimerRef.current = setTimeout(() => setShowContinue(true), 5000);
          }
          setRecentlySelected([]);
          const retryNamesFromResponse = retryInterests.map(m => m[1].trim());
          const retryIcon = detectTopicIcon(retryText, retryNamesFromResponse);
          setTopicIcon(retryIcon);
          setTopicHistory(prev => {
            const lastIcon = prev.length > 0 ? prev[prev.length - 1].icon : null;
            if (retryIcon !== lastIcon) {
              return [...prev, { icon: retryIcon, label: retryNamesFromResponse[0] || 'Chat', msgIdx: assistantIdx }];
            }
            return prev;
          });
          const retryFinal = [...currentMessages, { role: 'assistant' as const, content: retryText }];
          setConversationHistory(retryFinal);
          if (user) {
            try { await setDoc(doc(firestore, 'users', user.uid), { discoverConversation: retryFinal, updatedAt: new Date().toISOString() }, { merge: true }); } catch {}
          }
          setIsStreaming(false);
          setTimeout(() => inputRef.current?.focus(), 100);
          return;
        }
      } catch {}
      setMessages(prev => {
        const updated = [...prev];
        updated[assistantIdx] = { role: 'assistant', content: 'Hmm, hit a snag. Try sending that again.' };
        return updated;
      });
    }

    setIsStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isStreaming) return;
    if (!textOverride) setInput('');
    setShowContinue(false);
    if (continueTimerRef.current) clearTimeout(continueTimerRef.current);

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

    setCollectedInterests(prev =>
      prev.includes(interest.name) ? prev : [...prev, interest.name]
    );
    setRecentlySelected(prev => [...prev, interest.name]);
    // Reset continue timer — user is still active
    if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    setShowContinue(false);
    continueTimerRef.current = setTimeout(() => setShowContinue(true), 5000);

    setSuggestedInterests(prev =>
      prev.map(s => s.name === interest.name ? { ...s, added: true } : s)
    );

    // Milestone celebrations
    const newCount = collectedInterests.length + 1;
    if (newCount === 5 || newCount === 10 || newCount === 15 || newCount === 20 || newCount === 25) {
      playMilestoneSound();
      setMilestoneText(`${newCount} interests discovered!`);
      setTimeout(() => setMilestoneText(null), 2500);
    }

    try {
      await setDoc(doc(firestore, 'users', user.uid), {
        interests: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.error('Failed to add interest:', e);
    }
  };

  const handleContinue = async () => {
    if (isStreaming) return;
    setShowContinue(false);
    if (continueTimerRef.current) clearTimeout(continueTimerRef.current);

    let contextMsg: string;
    if (recentlySelected.length > 0) {
      contextMsg = `(User selected these interests: ${recentlySelected.join(', ')}. Continue the conversation based on what they picked — ask a follow-up that connects to the specific interests they chose. Be dynamic — if they picked something surprising, go there.)`;
    } else {
      contextMsg = `(User didn't select any of the suggested interests — they didn't resonate. Ask a fresh question about a different area of their life. Keep it grounded and real.)`;
    }

    const newMessages: ChatMessage[] = [...conversationHistory, { role: 'user', content: contextMsg }];
    setConversationHistory(newMessages);
    setRecentlySelected([]);
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

  const handleExploreInterest = async (name: string) => {
    if (isStreaming) return;
    const msg = `(User wants to explore interests related to "${name}". Show a variety of related interests they can add. Present them with brief framing text and multiple [INTEREST: name] pills.)`;
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

  // Render message — no bubbles, flowing text with BIG glowing interest pills
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
          <span key={`${msgIdx}-interest-${i}`} className="inline-flex items-center mx-1 my-2">
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 12 }}
              animate={isAdded
                ? { opacity: 1, scale: [1.2, 1], y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
              }
              transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.1 * i }}
              whileTap={!isAdded ? { scale: 0.92 } : {}}
              whileHover={!isAdded ? { scale: 1.08, y: -3 } : {}}
              onClick={() => {
                if (!isAdded && suggested) handleAddInterest(suggested);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-black transition-all select-none ${
                isAdded
                  ? 'text-emerald-300 bg-emerald-400/15 border-2 border-emerald-400/25'
                  : 'text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 border-2 border-yellow-200 cursor-pointer'
              }`}
              style={!isAdded ? {
                boxShadow: '0 0 25px rgba(253,224,71,0.5), 0 0 50px rgba(253,224,71,0.2)',
              } : {
                boxShadow: '0 0 15px rgba(52,211,153,0.2)',
              }}
            >
              {isAdded ? (
                <motion.span
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  ✓
                </motion.span>
              ) : (
                <span className="text-black/50">+</span>
              )}
              <span>{name}</span>
            </motion.button>

            {/* Explore related interests button */}
            {isAdded && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                onClick={() => handleExploreInterest(name)}
                className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-full bg-violet-500/25 border border-violet-400/30 text-violet-200 hover:bg-violet-500/40 hover:text-white hover:scale-105 transition-all text-xs font-bold"
              >
                <Search size={12} />
                <span>Explore</span>
              </motion.button>
            )}
          </span>
        );
      }
      return <span key={`${msgIdx}-text-${i}`}>{part}</span>;
    });
  };

  const addedCount = collectedInterests.length;

  // ====== LOADING ======
  if (!authReady) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex items-center justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-white/40 text-sm">Loading...</motion.div>
      </main>
    );
  }

  // ====== INTRO ======
  if (!started && isFirstVisit) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white overflow-hidden">
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
              transition={{ delay: 0.6, duration: 0.7 }}
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

            <div className="mt-8 mb-14" />

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              {existingInterests.length > 0 && (
                <p className="text-white/20 text-sm mb-5">You have {existingInterests.length} interest{existingInterests.length !== 1 ? 's' : ''}. Let's find more.</p>
              )}
              <motion.button
                onClick={startConversation}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(253,224,71,0.25), 0 0 60px rgba(253,224,71,0.08)',
                    '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(253,224,71,0.15)',
                    '0 0 30px rgba(253,224,71,0.25), 0 0 60px rgba(253,224,71,0.08)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="px-16 py-6 rounded-full font-black text-xl sm:text-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black border-2 border-yellow-300/40"
              >
                Let's Go
              </motion.button>
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  // ====== CONVERSATION — BRIGHT, FUN, SCROLLING ======
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white flex flex-col">

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-bold text-white/50 tracking-wide">Talk</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Discovery counter — prominent */}
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-300/10 to-amber-300/10 border border-yellow-300/20"
          >
            <Sparkles size={16} className="text-yellow-300" />
            <motion.span
              key={addedCount}
              initial={addedCount > 0 ? { scale: 1.5 } : {}}
              animate={{ scale: 1 }}
              className="text-yellow-300 font-black text-base"
            >
              {addedCount}
            </motion.span>
            <span className="text-yellow-300/50 text-xs font-bold">interests</span>
          </motion.div>

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
                setCollectedInterests([]);
                setStarted(false);
                setIsFirstVisit(true);
              } catch {}
            }}
            className="text-white/15 text-[11px] hover:text-white/40 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Interest conveyor belt — right sidebar (desktop) / bottom strip (mobile) */}
      <AnimatePresence>
        {collectedInterests.length > 0 && (
          <>
            {/* Desktop: fixed right sidebar — big glowing pills */}
            <div className="hidden md:flex fixed right-0 top-[60px] bottom-[80px] w-64 flex-col z-20 pointer-events-none">
              <div className="flex-1 flex flex-col justify-end overflow-y-auto py-4 pr-5 gap-3 pointer-events-auto scrollbar-thin" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(253,224,71,0.2) transparent' }}>
                <AnimatePresence initial={false}>
                  {[...collectedInterests].reverse().map((name, i) => (
                    <motion.button
                      key={name}
                      layout
                      initial={{ opacity: 0, x: 80, scale: 0.7 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -50, scale: 0.6 }}
                      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                      onClick={() => handleExploreInterest(name)}
                      className="pointer-events-auto group flex items-center gap-2 px-5 py-3.5 rounded-full text-base font-black text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 border-2 border-yellow-200 hover:brightness-110 transition-all cursor-pointer truncate"
                      style={{
                        opacity: Math.max(0.35, 1 - i * 0.04),
                        boxShadow: i < 6
                          ? `0 0 30px rgba(253,224,71,${0.6 - i * 0.08}), 0 0 60px rgba(253,224,71,${0.3 - i * 0.04}), 0 0 100px rgba(253,224,71,${0.15 - i * 0.02})`
                          : '0 0 15px rgba(253,224,71,0.2)',
                      }}
                    >
                      <span className="truncate">{name}</span>
                      <Search size={12} className="text-black/30 group-hover:text-black/60 transition-colors flex-shrink-0" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile: horizontal scroll strip at top */}
            <div className="md:hidden flex-shrink-0 overflow-x-auto border-b border-white/5 bg-black/10">
              <div className="flex gap-2 px-4 py-2 min-w-max">
                {collectedInterests.map((name) => (
                  <motion.button
                    key={name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleExploreInterest(name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black text-black bg-gradient-to-r from-yellow-300 to-amber-300 border border-yellow-200 whitespace-nowrap"
                    style={{ boxShadow: '0 0 10px rgba(253,224,71,0.3)' }}
                  >
                    {name}
                    <Search size={9} className="text-black/30" />
                  </motion.button>
                ))}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Milestone celebration */}
      <AnimatePresence>
        {milestoneText && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black font-black text-lg shadow-[0_0_60px_rgba(253,224,71,0.5)]"
          >
            {milestoneText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topic icon tower — left panel (desktop only) */}
      <div className="hidden md:flex fixed left-0 top-[60px] bottom-[80px] w-48 flex-col z-20">
        <div className="flex-1 flex flex-col justify-end overflow-y-auto py-4 pl-5 gap-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent' }}>
          <AnimatePresence initial={false}>
            {topicHistory.map((topic, i) => {
              const isLatest = i === topicHistory.length - 1;
              return (
                <motion.button
                  key={`${topic.icon}-${topic.msgIdx}`}
                  layout
                  initial={{ opacity: 0, x: -40, scale: 0.7 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                  onClick={() => {
                    // Scroll to the message at this index
                    const msgElements = messagesContainerRef.current?.querySelectorAll('[data-msg-idx]');
                    if (msgElements) {
                      for (const el of msgElements) {
                        if (el.getAttribute('data-msg-idx') === String(topic.msgIdx)) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          break;
                        }
                      }
                    }
                  }}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-2xl transition-all cursor-pointer ${
                    isLatest
                      ? 'bg-violet-500/15 border border-violet-400/20'
                      : 'hover:bg-white/5'
                  }`}
                  style={isLatest ? {
                    boxShadow: '0 0 20px rgba(139,92,246,0.15)',
                  } : {
                    opacity: Math.max(0.35, 1 - (topicHistory.length - 1 - i) * 0.1),
                  }}
                >
                  <span className={`text-3xl select-none transition-all ${isLatest ? '' : 'grayscale-[30%]'}`}
                    style={isLatest ? {
                      filter: 'drop-shadow(0 0 12px rgba(253,224,71,0.4))',
                    } : {}}
                  >
                    {topic.icon}
                  </span>
                  <span className={`text-[11px] font-bold truncate transition-colors ${
                    isLatest ? 'text-white/70' : 'text-white/25 group-hover:text-white/50'
                  }`}>
                    {topic.label}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Conversation — scrolling, flowing, BIG text, no bubbles */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 md:px-4 py-8 md:ml-48 md:mr-64" ref={messagesContainerRef}>
        <div className="max-w-2xl mx-auto space-y-8">
          {messages.filter(msg => !(msg.role === 'user' && msg.content.startsWith('('))).map((msg, idx) => (
            <motion.div
              key={idx}
              data-msg-idx={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === 'assistant' && (
                <div>
                  <div className="text-xl sm:text-2xl leading-[1.7] text-white/90 font-light whitespace-pre-wrap">
                    {renderMessage(msg.content, idx)}
                  </div>
                  {/* Question reaction bar */}
                  {msg.content && !msg.content.startsWith('(') && (
                    <div className="flex items-center gap-1 mt-3">
                      {questionReactions[idx] ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className="text-2xl"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.4))' }}
                        >
                          {questionReactions[idx]}
                        </motion.span>
                      ) : (
                        [
                          { emoji: '❤️', label: 'Love this' },
                          { emoji: '🧠', label: 'Smart' },
                          { emoji: '🔥', label: 'Fire' },
                          { emoji: '😂', label: 'Funny' },
                          { emoji: '🤔', label: 'Deep' },
                        ].map(({ emoji, label }) => (
                          <motion.button
                            key={emoji}
                            whileHover={{ scale: 1.3, y: -3 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setQuestionReactions(prev => ({ ...prev, [idx]: emoji }));
                              playAddSound();
                              // Send reaction as context for AI learning
                              const reactionMsg = `(User reacted to your last message with ${emoji} (${label}). This tells you about what kind of questions/comments they appreciate. Briefly acknowledge it warmly — like "glad that landed" or "love that you felt that" — then continue naturally.)`;
                              const newMsgs: ChatMessage[] = [...conversationHistory, { role: 'user', content: reactionMsg }];
                              setConversationHistory(newMsgs);
                              fetchResponse(newMsgs);
                            }}
                            className="text-lg opacity-30 hover:opacity-80 transition-opacity cursor-pointer p-1"
                            title={label}
                          >
                            {emoji}
                          </motion.button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="pl-5 sm:pl-6 border-l-[3px] border-amber-400/40 my-6">
                  <p className="text-lg sm:text-xl leading-[1.7] text-amber-200/60 font-light whitespace-pre-wrap italic">
                    {msg.content}
                  </p>
                </div>
              )}
            </motion.div>
          ))}

          {/* Streaming */}
          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 py-4"
            >
              <motion.div
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30"
              />
              <span className="text-white/20 text-sm font-medium">BAE is thinking...</span>
            </motion.div>
          )}

          {/* Continue button — appears 5s after pills, sends selected interests as context */}
          <AnimatePresence>
            {showContinue && !isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex justify-center py-4"
              >
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 border border-violet-400/25 text-white/80 text-sm font-bold hover:from-violet-500/35 hover:to-fuchsia-500/30 transition-all"
                >
                  {recentlySelected.length > 0 ? 'Keep going' : 'Next question'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-5 sm:px-8 py-4 bg-black/20 backdrop-blur-sm border-t border-white/10"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isStreaming ? '' : 'Say something...'}
            disabled={isStreaming}
            className="flex-1 px-6 py-4 rounded-full bg-white/8 border border-white/12 text-white text-base placeholder:text-white/20 outline-none focus:border-violet-400/30 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all disabled:opacity-30 font-medium"
          />
          <motion.button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            whileTap={{ scale: 0.9 }}
            whileHover={input.trim() && !isStreaming ? { scale: 1.05 } : {}}
            className={`p-4 rounded-full transition-all flex-shrink-0 ${
              input.trim() && !isStreaming
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-400/25'
                : 'bg-white/5 text-white/15'
            }`}
          >
            <Send size={18} />
          </motion.button>
          {messages.length > 2 && !isStreaming && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => handleSend('(User wants to switch to a completely new topic. Ask about a totally different area of their real, everyday life — not a hypothetical. Keep it grounded, easy to answer, fun.)')}
              className="px-5 py-4 rounded-full bg-violet-500/20 border border-violet-400/25 text-violet-200 text-sm font-bold hover:bg-violet-500/30 transition-all flex-shrink-0 whitespace-nowrap"
            >
              New topic
            </motion.button>
          )}
        </div>
      </div>
    </main>
  );
}
