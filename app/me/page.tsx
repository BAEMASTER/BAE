'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@\/lib\/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState({
    instagram: '',
    tiktok: '',
    youtube: '',
    twitch: '',
    website: '',
    x: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          if (data) {
            setInterests(data.interests || []);
            setBio(data.bio || '');
            setSocials(data.socials || {
              instagram: '',
              tiktok: '',
              youtube: '',
              twitch: '',
              website: '',
              x: '',
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const saveProfile = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', userId),
        { interests, bio, socials, updatedAt: new Date() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-[120px] rounded-full" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <header className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 bg-clip-text text-transparent drop-shadow-xl"
          >
            Your Profile
          </motion.h1>
          <p className="mt-3 text-lg text-fuchsia-800/90">
            Tell us what you love and how to connect
          </p>
        </header>

        <div className="space-y-10">
          {/* Interests */}
          <section className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent mb-4">
              Your Interests
            </h2>
            <p className="text-fuchsia-900/80 text-sm mb-6">
              Add all of your interests   shared ones glow when you BAE somebody.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="Add an interest (e.g., yoga, physics)"
                className="flex-1 px-4 py-3 rounded-full bg-white/90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              />
              <button
                onClick={addInterest}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-semibold rounded-full hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all"
              >
                Add
              </button>
            </div>

            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => (
                  <div
                    key={interest}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-fuchsia-700 font-medium shadow-sm"
                  >
                    <span>{interest}</span>
                    <button
                      onClick={() => removeInterest(interest)}
                      className="text-fuchsia-500 hover:text-fuchsia-700 font-bold text-xl leading-none"
                    >
                       
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fuchsia-700/70 text-sm italic">
                No interests added yet
              </p>
            )}
          </section>

             {/* Socials */}
          <section className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent mb-4">
              Share Your World on BAE
            </h2>
            <p className="text-fuchsia-900/80 text-sm mb-6">
              Link your socials so matches can explore what inspires you.
            </p>

            {Object.entries(socials).map(([key, value]) => (
              <div key={key} className="mb-5">
                <label className="block text-fuchsia-900/90 text-sm font-semibold mb-2 capitalize">
                  {key === 'x' ? 'X (Twitter)' : key}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    setSocials({ ...socials, [key]: e.target.value })
                  }
                  placeholder={
                    key === 'website'
                      ? 'https://yoursite.com'
                      : key === 'youtube'
                      ? 'Channel URL or @handle'
                      : '@username'
                  }
                  className="w-full px-4 py-3 rounded-full bg-white/90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                />
              </div>
            ))}
          </section>

          {/* Save */}
          <div className="flex justify-center pt-8 pb-12">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={saveProfile}
              disabled={saving || interests.length === 0}
              className={`relative px-14 py-5 rounded-full text-2xl font-extrabold tracking-tight text-white
                transition-all ${
                  interests.length === 0
                    ? 'bg-gray-400/50 text-gray-300 cursor-not-allowed'
                    : saving
                    ? 'bg-fuchsia-400 text-white'
                    : saved
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
                }`}
            >
              {saving ? 'Saving...' : saved ? '? Saved!' : 'Save Profile'}
            </motion.button>
          </div>

          {interests.length === 0 && (
            <p className="text-center text-fuchsia-800/70 text-sm pb-8">
              Add at least one interest to save your profile
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
