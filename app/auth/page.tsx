'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc } from 'firebase/firestore';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace('/'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userData = {
        displayName: user.displayName,
        email: user.email,
        lastLogin: new Date().toISOString(),
      };

      await setDoc(userRef, userData, { merge: true });

      router.push('/');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      setError(error.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="
        relative min-h-screen flex flex-col items-center justify-center p-6
        bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100
      "
    >
      <div className="max-w-md w-full p-8 bg-white/70 backdrop-blur-md rounded-xl shadow-2xl text-center">

        {/* HEADLINE */}
        <h1 className="text-4xl font-extrabold text-fuchsia-700 mb-3">
          Meet Someone New, Share Your Glow!
        </h1>

        {/* SUBHEADLINE */}
        <p className="text-lg text-gray-700 mb-8 font-medium">
          Have fun. Meet people. Watch your shared interests glow.
        </p>

        {error && (
          <p className="text-red-500 mb-4 border border-red-300 bg-red-50 p-2 rounded-lg text-sm">
            {error}
          </p>
        )}

        {/* SIGN-IN BUTTON */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`
            w-full py-5 px-6 rounded-full text-white font-extrabold text-xl 
            transition-all duration-300
            ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
            }
          `}
        >
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </main>
  );
}
