'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔐 Auth listener + load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.uid);
      setFirebaseUser(user);

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data) {
          setDisplayName(data.displayName || user.displayName || '');
          setPhotoURL(data.photoURL || user.photoURL || null);
          setInterests(data.interests || []);
        } else {
          setDisplayName(user.displayName || '');
          setPhotoURL(user.photoURL || null);
        }
      } catch (e) {
        console.error('Error loading profile', e);
      }
      
      setFirebaseUser(user);
    });

    return () => unsub();
  }, [router]);

  // ➕ Add interest
  const addInterest = () => {
    const i = newInterest.trim();
    if (i && !interests.includes(i)) {
      setInterests(prev => [...prev, i]);
    }
    setNewInterest('');
  };

  // ❌ Remove interest
  const removeInterest = (i: string) => {
    setInterests(prev => prev.filter(x => x !== i));
  };

  // 📸 Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoURL(URL.createObjectURL(file));
  };

  // 💾 Save profile (no redirect)
  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      await setDoc(
        doc(db, 'users', userId),
        { displayName, photoURL, interests, updatedAt: new Date() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ✨ BAE button click
  const handleBAEClick = () => {
    if (firebaseUser && interests.length >= 3) {
      router.push('/match');
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-rose-50 via-fuchsia-50 to-indigo-50 text-gray-900 flex flex-col items-center px-6 pt-24">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 h-[64px] bg-white/40 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          BAE
        </div>
      </header>

      {/* IDENTITY BOX */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-10"
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-28 h-28 rounded-full overflow-hidden border-3 border-white shadow-md bg-white flex items-center justify-center cursor-pointer hover:shadow-lg transition"
        >
          {photoURL ? (
            <Image
              src={photoURL}
              alt="Profile"
              width={112}
              height={112}
              className="object-cover"
            />
          ) : (
            <span className="text-2xl opacity-30">+</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />

        <h2 className="mt-5 font-extrabold text-lg opacity-80">Upload Photo</h2>
      </motion.section>

      {/* INTERESTS CARD */}
      <section className="w-full max-w-xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-6">
        <h2 className="text-xl font-extrabold text-purple-700 mb-4 tracking-tight">Interests</h2>

        {/* INPUT ROW */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInterest()}
            placeholder="Add an interest"
            className="flex-1 px-5 py-3 rounded-full bg-white shadow-sm border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-pink-300 focus:outline-none transition"
          />

          <button
            onClick={addInterest}
            className="px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-fuchsia-500 to-pink-500 shadow-md hover:opacity-90 transition"
          >
            Add
          </button>
        </div>

        {/* PILL LIST */}
        <div className="flex flex-wrap justify-center gap-2">
          {interests.map(i => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-purple-900 font-bold text-sm shadow-sm"
            >
              {i}
              <button onClick={() => removeInterest(i)} className="text-purple-400 hover:text-purple-700 transition">×</button>
            </span>
          ))}
        </div>

        {/* Count */}
        {!interests.length && (
          <p className="text-sm opacity-25 mt-3">No interests added</p>
        )}
        <p className="text-xs font-medium text-purple-700/60 mt-4">
          {interests.length} interest{interests.length === 1 ? '' : 's'} added
        </p>

        {/* BUTTON ROW */}
        <div className="grid grid-cols-2 gap-4 mt-8 w-full">
          {/* SAVE */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 rounded-full font-bold text-white bg-gradient-to-r from-fuchsia-500 to-purple-500 shadow-md hover:shadow-lg transition disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </motion.button>

          {/* BAE (Gated) */}
          <motion.button
            whileHover={{ scale: interests.length >= 3 ? 1.04 : 1 }}
            whileTap={{ scale: interests.length >= 3 ? 0.96 : 1 }}
            onClick={handleBAEClick}
            disabled={interests.length < 3}
            className="w-full py-3 rounded-full font-extrabold text-white bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-400 shadow-lg hover:shadow-2xl disabled:opacity-40"
          >
            BAE Someone ✨
          </motion.button>
        </div>

        {/* Unlock label */}
        {interests.length < 3 && (
          <p className="text-xs text-purple-900/60 mt-3">
            Add 3+ interests to unlock matching & glow ✨
          </p>
        )}

      </section>

      {/* Bottom padding so page never clips */}
      <div className="h-20" />
      
    </main>
  );
}
