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

  return (
    <header
      className="
        fixed top-0 z-40 w-full
        bg-[#1A0033]/80 backdrop-blur-xl
        border-b border-purple-400/20 shadow-[0_1px_20px_rgba(168,85,247,0.1)]
        h-[72px] flex items-center
        px-6 transition-all duration-500
      "
    >
      {/* LOGGED OUT HEADER */}
      {!user && (
        <div className="mx-auto flex max-w-6xl w-full items-center gap-6 text-white leading-normal">
          <Link
            href="/"
            className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)] hover:scale-105 transition-transform"
          >
            BAE
          </Link>
          
          {/* All nav links for logged out users */}
          <nav className="flex-1 flex justify-center gap-8">
            <Link 
              href="/how-bae-works" 
              className={`text-base font-semibold transition-colors ${
                isActive('/how-bae-works')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/how-bae-works') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    How BAE Works
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'How BAE Works'
              )}
            </Link>
            
            <Link 
              href="/explorer" 
              className={`text-base font-semibold transition-colors ${
                isActive('/explorer')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/explorer') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    Explorer
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'Explorer'
              )}
            </Link>
            
            <Link 
              href="/profile" 
              className={`text-base font-semibold transition-colors ${
                isActive('/profile')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/profile') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    Profile
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'Profile'
              )}
            </Link>
            
            <Link 
              href="/match" 
              className={`text-base font-semibold transition-colors ${
                isActive('/match')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/match') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    Match
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'Match'
              )}
            </Link>
          </nav>

          <button
            onClick={doSignIn}
            disabled={busy}
            className="
              px-6 py-2 rounded-full text-xl font-extrabold text-white
              bg-gradient-to-r from-pink-500 to-fuchsia-600
              shadow-[0_10px_26px_rgba(236,72,153,0.40)]
              hover:brightness-110 hover:shadow-[0_10px_30px_rgba(255,100,150,0.6)]
              transition-all disabled:opacity-60
            "
          >
            {busy ? '…' : 'Sign in'}
          </button>
        </div>
      )}

      {/* LOGGED IN HEADER */}
      {user && (
        <div className="mx-auto flex max-w-6xl w-full items-center gap-6 text-white leading-normal">
          {/* LOGO */}
          <Link
            href="/"
            className="
              text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 
              bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,200,0.4)]
              hover:scale-105 transition-transform
            "
          >
            BAE
          </Link>

          {/* NAV */}
          <nav className="flex items-center gap-6 text-base font-semibold">
            <Link 
              href="/profile" 
              className={`transition-colors ${
                isActive('/profile')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/profile') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    Profile
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'Profile'
              )}
            </Link>
            
            <Link 
              href="/explorer" 
              className={`transition-colors ${
                isActive('/explorer')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/explorer') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    Explorer
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'Explorer'
              )}
            </Link>
            
            <Link 
              href="/how-bae-works" 
              className={`transition-colors ${
                isActive('/how-bae-works')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/how-bae-works') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    How BAE Works
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'How BAE Works'
              )}
            </Link>
            
            <Link 
              href="/devcheck" 
              className={`transition-colors ${
                isActive('/devcheck')
                  ? 'relative'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isActive('/devcheck') ? (
                <>
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
                    DevCheck
                  </span>
                  <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>
                </>
              ) : (
                'DevCheck'
              )}
            </Link>
          </nav>

          {/* RIGHT SIDE: NAME + SIGN OUT */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-bold text-white/90">
              {user.displayName || user.email}
            </span>
            <button
              onClick={doSignOut}
              disabled={busy}
              className="
                px-4 py-2 rounded-full border border-white/20 text-sm font-semibold
                text-white/80 hover:text-white hover:bg-white/10 hover:border-white/40
                transition-all disabled:opacity-50
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