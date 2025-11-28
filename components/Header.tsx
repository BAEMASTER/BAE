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
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const showError = (message: string) => {
    console.error("User Alert:", message);
  };

  const doGooglePopupSignIn = async () => {
    try {
      setBusy(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
      // after login success, send home
      router.push('/');
    } catch (e) {
      console.error(e);
      showError('Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const doSignIn = () => {
    // route to auth page instead of popup
    router.push('/auth');
  };

  const doSignOut = async () => {
    try {
      setBusy(true);
      await signOut(auth);
      router.push('/');
    } catch (e) {
      console.error(e);
      showError('Sign-out failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header
      className="
        fixed top-0 z-40 w-full
        bg-gradient-to-r from-rose-200/80 via-fuchsia-200/80 to-rose-200/80
        backdrop-blur-xl
        border-b border-white/30
        shadow-md
        transition-all duration-500
        h-[72px] flex items-center
      "
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 text-fuchsia-700 leading-normal">

        {/* Logo / Brand */}
        <Link
          href="/"
          className="text-3xl font-extrabold text-fuchsia-600 hover:text-fuchsia-700 transition-colors"
          style={{ textShadow: "0 0 18px rgba(236,72,153,0.22)" }}
        >
          BAE
        </Link>

        {/* Right-Side User Box */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full border border-white/40 shadow-sm"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-fuchsia-200/40 border border-white/30 shadow-sm" />
                )}

                <span className="hidden text-base sm:inline text-fuchsia-700/90 font-semibold max-w-[11rem] truncate">
                  {user.displayName || user.email}
                </span>
              </div>

              <button
                onClick={doSignOut}
                disabled={busy}
                className="rounded-xl border border-white/40 px-4 py-2 text-base font-semibold text-fuchsia-700 hover:bg-white/40 transition-all disabled:opacity-50"
              >
                Sign out
              </button>
            </>
          ) : (
            // Logged-out button
            <button
              onClick={doSignIn}
              disabled={busy}
              className="px-6 py-2.5 rounded-full text-xl font-extrabold tracking-tight text-white bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 shadow-[0_10px_26px_rgba(236,72,153,0.32)] hover:shadow-[0_15px_40px_rgba(236,72,153,0.42)] transition-all disabled:opacity-50"
            >
              {busy ? '…' : 'Sign in'}
            </button>
          )}
        </div>
      </div>

      {/* BONUS: Add Google popup trigger inside auth page */}
      {/* Call this on the auth page button instead of header */}
      {/* If you want to use it, expose rotating guru words there */}

    </header>
  );
}
