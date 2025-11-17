'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const un = onAuthStateChanged(auth, (u) => setUser(u));
    return () => un();
  }, []);

  // IMPORTANT: Using a custom modal/message box for errors, NOT alert()
  const showError = (message: string) => {
    // In a real app, this would show a notification or modal.
    console.error("User Alert:", message);
    // Note: Since we cannot use alert(), we log the error here.
  };

  const doSignIn = async () => {
    try {
      setBusy(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
      showError('Sign-in failed. Check your Firebase config/domains.');
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    try {
      setBusy(true);
      await signOut(auth);
    } catch (e) {
      console.error(e);
      showError('Sign-out failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    {/* CHANGE: Updated the background gradient to a light, bright one, and changed the border/shadow colors 
      to match the light theme.
    */}
    <header className="fixed top-0 z-40 w-full bg-gradient-to-r from-pink-300/80 via-purple-300/80 to-indigo-300/80 backdrop-blur-xl border-b border-purple-400/40 shadow-lg transition-all duration-700">
      {/* CHANGE: Updated primary text color to dark purple (text-purple-900) */}
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 text-purple-900">
        <Link
          href="/"
          className="text-2xl font-extrabold text-purple-900 hover:text-purple-700 transition-colors"
        >
          BAE
        </Link>

        {/* CHANGE: Updated nav link colors to dark purple */}
        <nav className="ml-4 flex items-center gap-5 text-sm text-purple-700">
          <Link href="/" className="hover:text-purple-900 transition-colors">
            Home
          </Link>
          <Link href="/me" className="hover:text-purple-900 transition-colors">
            Profile
          </Link>
          <Link href="/devcheck" className="hover:text-purple-900 transition-colors">
            DevCheck
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="avatar"
                    width={28}
                    height={28}
                    {/* CHANGE: Updated border color */}
                    className="rounded-full border border-purple-400/60"
                  />
                ) : (
                  {/* CHANGE: Updated placeholder color */}
                  <div className="h-7 w-7 rounded-full bg-purple-200/40" />
                )}
                {/* CHANGE: Updated text color */}
                <span className="hidden text-sm sm:inline text-purple-700">
                  {user.displayName || user.email}
                </span>
              </div>
              <button
                onClick={doSignOut}
                disabled={busy}
                {/* CHANGE: Updated button styling to match light theme: dark text/border on light background */}
                className="rounded-md border border-purple-400/60 px-3 py-1.5 text-sm text-purple-800 hover:bg-purple-100/60 transition-all disabled:opacity-60"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={doSignIn}
              disabled={busy}
              {/* CHANGE: Kept the vibrant sign-in button but ensured it contrasts well */}
              className="rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:opacity-90 transition-all disabled:opacity-60"
            >
              {busy ? '…' : 'Continue with Google'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}