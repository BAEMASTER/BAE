'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  const isActive = (path: string) => pathname === path;

  // Common nav links for both logged in and out
  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link 
      href={href}
      className={`text-base font-semibold transition-colors ${
        isActive(href)
          ? 'relative'
          : 'text-white/70 hover:text-white'
      }`}
    >
      {isActive(href) ? (
        <>
          <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
            {label}
          </span>
          <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
        </>
      ) : (
        label
      )}
    </Link>
  );

  return (
    <header
      className="
        fixed top-0 z-40 w-full
        bg-[#1A0033]/80 backdrop-blur-xl
        border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]
        h-[72px] flex items-center
        px-4 sm:px-6 transition-all duration-500
      "
    >
      {/* LOGGED OUT HEADER */}
      {!user && (
        <div className="mx-auto flex max-w-6xl w-full items-center gap-6 sm:gap-8 text-white leading-normal">
          <Link
            href="/"
            className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)] hover:scale-105 transition-transform flex-shrink-0"
          >
            BAE
          </Link>
          
          {/* Nav links - left aligned, same on all screens */}
          <nav className="flex items-center gap-3 sm:gap-8 text-xs sm:text-base font-semibold">
            <NavLink href="/explorer" label="Explorer" />
            <NavLink href="/profile" label="Profile" />
            <NavLink href="/how-bae-works" label="How BAE Works" />
          </nav>
        </div>
      )}

      {/* LOGGED IN HEADER */}
      {user && (
        <div className="mx-auto flex max-w-6xl w-full items-center gap-4 sm:gap-8 text-white leading-normal">
          {/* LOGO */}
          <Link
            href="/"
            className="
              text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 
              bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]
              hover:scale-105 transition-transform flex-shrink-0
            "
          >
            BAE
          </Link>

          {/* NAV - left aligned */}
          <nav className="flex items-center gap-3 sm:gap-8 text-xs sm:text-base font-semibold flex-1">
            <NavLink href="/explorer" label="Explorer" />
            <NavLink href="/profile" label="Profile" />
            <NavLink href="/how-bae-works" label="How BAE Works" />
          </nav>

          {/* RIGHT SIDE: NAME + SIGN OUT */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold text-white/90 truncate max-w-[100px] sm:max-w-none">
              {user.displayName || user.email}
            </span>
            <button
              onClick={doSignOut}
              disabled={busy}
              className="
                px-2 sm:px-4 py-2 rounded-full border border-white/20 text-xs sm:text-sm font-semibold
                text-white/80 hover:text-white hover:bg-white/10 hover:border-white/40
                transition-all disabled:opacity-50 whitespace-nowrap
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