'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const NAV_H = 72;

// EXACT gradient from your home page
const gradientClass = "bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 🚪 Check auth, load existing profile if present
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.uid);
      setDisplayName(user.displayName || ''); // default name

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || user.displayName || '');
          setInterests(data.interests || []);
        }
      } catch (e) {
        console.error('Error loading profile', e);
      }
    });

    return () => unsub();
  }, [router]);

  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  const saveProfile = async () => {
    if (!userId) return;
    if (interests.length < 3) {
      alert("Add 3+ interests to start matching. Your shared interests will glow ✨");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', userId),
        { displayName, interests, updatedAt: new Date() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2600); // fades automatically
    } catch (e: any) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={`w-screen min-h-screen flex flex-col items-center text-center p-6 text-purple-900 ${gradientClass}`}>

      {/* 🔱 HEADER */}
      <header
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 h-[72px]"
        style={{
          WebkitBackdropFilter: 'saturate(1.2) blur(8px)',
          backdropFilter: 'saturate(1.2) blur(8px)',
        }}
      >
        <div className="text-3xl font-extrabold tracking-tight text-fuchsia-600">BAE</div>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-semibold text-purple-900/70 hover:text-purple-900 transition-all"
        >
          Home
        </button>
      </header>

      {/* ✅ 3-interest onboarding copy */}
      <section className="mt-24 mb-6 max-w-2xl">
        <h2 className="text-xl font-bold text-purple-900/80">
          Add 3+ interests to start matching. Your shared interests will glow ✨
        </h2>
      </section>

      {/* Name input */}
      <div className="w-full max-w-xl mb-8">
        <label className="block text-sm font-semibold mb-2 text-purple-900/90">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full px-5 py-3 rounded-full bg-white/70 border border-white/10 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
        />
      </div>

      {/* Interests UI */}
      <div className="w-full max-w-3xl bg-white/15 p-6 rounded-3xl border border-white/10 backdrop-blur-lg shadow-lg">
        <h3 className="text-2xl font-bold mb-5 text-purple-900">Your Interests</h3>
        <p className="text-sm text-purple-900/80 mb-5">
          Add what matters to you. 3+ interests enables your glow moment later.
        </p>

        <div className="flex gap-3 mb-6 w-full max-w-xl mx-auto">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addInterest()}
            placeholder="e.g. Yoga, Tech, Music"
            className="flex-1 px-5 py-3 rounded-full bg-white/80 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          />
          <button
            onClick={addInterest}
            className="px-8 py-3 text-white font-bold rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-fuchsia-600 shadow-md hover:shadow-lg transition"
          >
            Add
          </button>
        </div>

        {/* Interest pills */}
        {interests.length === 0 && <p className="text-sm italic opacity-40">No interests yet</p>}

        <div className="flex flex-wrap justify-center gap-3">
          {interests.map((i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-fuchsia-700 font-semibold text-sm shadow-sm"
            >
              {i}
              <button
                onClick={() => removeInterest(i)}
                className="text-fuchsia-500 hover:text-fuchsia-700 font-bold text-lg leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Save CTA */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        disabled={saving}
        onClick={saveProfile}
        className={`mt-10 px-10 py-4 rounded-full font-extrabold text-xl shadow-lg transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 text-purple-900 hover:shadow-[0_0_36px_rgba(236,72,153,0.3)]'
        }`}
      >
        {saving ? 'Saving...' : saved ? '✔ Saved!' : 'Save Profile'}
      </motion.button>

    </main>
  );
}
