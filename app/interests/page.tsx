'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InterestsPage() {
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const router = useRouter();

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const handleContinue = () => {
    if (interests.length < 3) {
      alert('Please add at least 3 interests to continue.');
      return;
    }
    // Later: save to Firestore
    localStorage.setItem('userInterests', JSON.stringify(interests));
    router.push('/'); // back to home or next step
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen 
      bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800 text-center p-6">
      <h1 className="text-3xl font-bold mb-4">What are you into? 💜</h1>
      <p className="text-fuchsia-600 mb-6">Add at least 3 interests to start matching.</p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          placeholder="e.g. Yoga, Tech, Music"
          className="p-2 rounded-lg border border-fuchsia-400 focus:outline-fuchsia-600 text-black"
        />
        <button
          onClick={addInterest}
          className="bg-fuchsia-500 text-white px-4 py-2 rounded-lg hover:bg-fuchsia-600"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {interests.map((i) => (
          <span
            key={i}
            className="bg-fuchsia-300 text-fuchsia-900 px-4 py-1 rounded-full font-semibold"
          >
            {i}
          </span>
        ))}
      </div>

      <button
        onClick={handleContinue}
        className="bg-fuchsia-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-fuchsia-700 transition"
      >
        Continue
      </button>
    </main>
  );
}
