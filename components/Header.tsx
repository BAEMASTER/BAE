'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const doSignIn = () => {
    if (!busy) router.push('/auth');
  };

  const doSignOut = async () => {
    try {
      setBusy(true);
      await signOut(auth);
      router.push('/');
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      setUser(null);
    }
  };

  return (
    <header
      className="
        fixed top-0 z-40 w-full
        bg-gradient-to-r from-rose-200/80 via-fuchsia-200/80 to-rose-200/80
        backdrop-blur-xl border-b border-white/30 shadow-md transition-all duration-500
        h-[72px] flex items-center
        px-6
      "
    >
      {/* LOGGED OUT HEADER */}
      {!user && (
        <div className="w-full flex items-center justify-between">
          <Link
            href="/"
            className="text-3xl font-extrabold text-fuchsia-600"
            style={{ textShadow: '0 0 16px rgba(236,72,153,0.18)' }}
          >
            BAE
          </Link>

          <button
            onClick={doSignIn}
            disabled={busy}
            className="
              px-6 py-2 rounded-full text-xl font-extrabold text-white
              bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-400
              shadow-[0_10px_26px_rgba(236,72,153,0.30)]
              hover:opacity-90 transition-all disabled:opacity-60
            "
          >
            {busy ? '…' : 'Sign in'}
          </button>
        </div>
      )}

      {/* LOGGED IN HEADER */}
      {user && (
        <div className="mx-auto flex max-w-6xl w-full items-center gap-6 text-fuchsia-700 leading-normal">
          {/* LOGO */}
          <Link
            href="/"
            className="
              text-3xl font-extrabold text-fuchsia-600
              hover:text-fuchsia-700 transition-colors
            "
            style={{ textShadow: '0 0 16px rgba(236,72,153,0.18)' }}
          >
            BAE
          </Link>

          {/* NAV (Profile stays, Interests removed, DevCheck kept) */}
          <nav className="flex items-center gap-6 text-lg font-semibold text-fuchsia-700/90">
            <Link href="/profile" className="hover:text-fuchsia-800 transition-colors">
              Profile
            </Link>
            <Link href="/devcheck" className="hover:text-fuchsia-800 transition-colors">
              DevCheck
            </Link>
          </nav>

          {/* RIGHT SIDE: NAME + SIGN OUT */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-base font-medium text-fuchsia-800/90">
              {user.displayName || user.email}
            </span>

            <button
              onClick={doSignOut}
              disabled={busy}
              className="
                px-4 py-2 rounded-xl border border-white/40 text-base font-semibold
                text-fuchsia-700 hover:bg-white/40 transition-all disabled:opacity-50
              "
            >
              {busy ? '…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
