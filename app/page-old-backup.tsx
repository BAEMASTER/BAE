'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@\/lib\/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type Trend = { topic: string; category?: string };

export default function HomePage() {
  const router = useRouter();
  const [trending, setTrending] = useState<Trend[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [selectedTrending, setSelectedTrending] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const fallbackTrends: Trend[] = useMemo(
    () => [
      { topic: 'World Series' },
      { topic: 'AI news' },
      { topic: 'Climate talks' },
      { topic: 'Space discovery' },
      { topic: 'Market moves' },
      { topic: 'Viral moment' },
      { topic: 'New music' },
      { topic: 'Design trends' },
    ],
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const interests = userDoc.data()?.interests || [];
          setUserInterests(interests);
        } catch {
          setUserInterests([]);
        }
      } else {
        setUserId(null);
        setUserInterests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const topics = trending.length > 0 ? trending : fallbackTrends;

  const toggleTrending = (topic: string) => {
    setSelectedTrending((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const visibleTrends = showAllTrending ? topics : topics.slice(0, 3);
  const visibleInterests = showAllInterests
    ? userInterests
    : userInterests.slice(0, 3);

 const startMatch = (type: 'topic' | 'interest') => {
  const selected = type === 'topic' ? selectedTrending : selectedInterests;
  if (selected.length === 0) return;
  
  // Store in sessionStorage for match page
  sessionStorage.setItem('selectedInterests', JSON.stringify(selected));
  router.push('/match');
};

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-4rem)] px-6 text-center pt-24">
      {/* HERO */}
      <header className="space-y-2 mb-6">
        <h1 className="text-5xl md:text-6xl font-extrabold drop-shadow-lg">
          Join BAE ✨
        </h1>
        <p className="text-3xl md:text-4xl font-extrabold text-pink-200 drop-shadow-lg tracking-tight">
          Meet People Who Love What You Love, Instantly
        </p>
      </header>

      {/* MAIN MATCH GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left w-full max-w-5xl transform scale-110 -mt-4">
        {/* Trending */}
        <div>
          <h2 className="text-3xl font-bold mb-3">Jump in now 🔥</h2>
          <p className="text-base text-white/80 mb-4">What’s happening right now</p>

          <div className="flex flex-col gap-4">
            {visibleTrends.map((item) => (
              <button
                key={item.topic}
                onClick={() => toggleTrending(item.topic)}
                className={`rounded-full px-6 py-4 text-lg font-semibold transition-all duration-200 ${
                  selectedTrending.includes(item.topic)
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl scale-105'
                    : 'bg-white text-indigo-700 hover:bg-white/90 shadow-md hover:shadow-xl'
                }`}
              >
                {selectedTrending.includes(item.topic) && '✓ '}
                {item.topic}
              </button>
            ))}

            {topics.length > 3 && (
              <button
                onClick={() => setShowAllTrending(!showAllTrending)}
                className="text-sm text-white/80 hover:text-white underline mt-1"
              >
                {showAllTrending ? 'Show less ↑' : 'Show more ↓'}
              </button>
            )}
          </div>

          <button
            onClick={() => startMatch('topic')}
            disabled={selectedTrending.length === 0}
            className={`mt-6 w-full rounded-full px-10 py-5 text-xl font-bold transition-all duration-200 ${
              selectedTrending.length > 0
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-2xl hover:scale-105'
                : 'bg-gray-400/50 text-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedTrending.length === 0
              ? 'Select a topic'
              : `Match on ${selectedTrending.join(', ')}`}
          </button>
        </div>

        {/* Interests */}
        <div>
          <h2 className="text-3xl font-bold mb-3">Find your people ✨</h2>
          <p className="text-base text-white/80 mb-4">Your interests</p>

          <div className="flex flex-col gap-4">
            {visibleInterests.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`rounded-full px-6 py-4 text-lg font-semibold transition-all duration-200 ${
                  selectedInterests.includes(interest)
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-xl scale-105'
                    : 'bg-white text-purple-700 hover:bg-white/90 shadow-md hover:shadow-xl'
                }`}
              >
                {selectedInterests.includes(interest) && '✓ '}
                {interest}
              </button>
            ))}

            {userInterests.length > 3 && (
              <button
                onClick={() => setShowAllInterests(!showAllInterests)}
                className="text-sm text-white/80 hover:text-white underline mt-1"
              >
                {showAllInterests ? 'Show less ↑' : 'Show more ↓'}
              </button>
            )}
          </div>

          <button
            onClick={() => startMatch('interest')}
            disabled={selectedInterests.length === 0}
            className={`mt-6 w-full rounded-full px-10 py-5 text-xl font-bold transition-all duration-200 ${
              selectedInterests.length > 0
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-2xl hover:scale-105'
                : 'bg-gray-400/50 text-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedInterests.length === 0
              ? 'Select an interest'
              : `Match on ${selectedInterests.join(', ')}`}
          </button>
        </div>
      </section>

      <div className="mt-8 text-center">
        <p className="text-sm text-white/70">Feeling adventurous?</p>
        <button
          onClick={() => router.push('/match?random=1')}
          className="mt-2 inline-flex items-center justify-center rounded-full border-2 border-white/30 text-white px-6 py-2 text-sm hover:bg-white/10 hover:border-white/50 transition-all duration-200"
        >
          Surprise me ✨
        </button>
      </div>
    </div>
  );
}
