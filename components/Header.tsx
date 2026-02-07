'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      setMenuOpen(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  const NavLink = ({ href, label, mobile }: { href: string; label: string; mobile?: boolean }) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className={`${mobile ? 'text-2xl font-black py-3' : 'text-base font-semibold'} transition-colors ${
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
          {!mobile && <span className="absolute inset-0 -inset-x-2 bg-gradient-to-r from-yellow-300/20 to-pink-400/20 blur-md rounded-lg"></span>}
        </>
      ) : (
        label
      )}
    </Link>
  );

  const navLinks = (
    <>
      <NavLink href="/explorer" label="Explorer" />
      <NavLink href="/profile" label="Profile" />
      <NavLink href="/how-bae-works" label="How BAE Works" />
    </>
  );

  const mobileNavLinks = (
    <>
      <NavLink href="/explorer" label="Explorer" mobile />
      <NavLink href="/profile" label="Profile" mobile />
      <NavLink href="/how-bae-works" label="How BAE Works" mobile />
    </>
  );

  return (
    <>
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

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8 text-base font-semibold">
              {navLinks}
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden ml-auto p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
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

            {/* Desktop NAV */}
            <nav className="hidden md:flex items-center gap-8 text-base font-semibold flex-1">
              {navLinks}
            </nav>

            {/* Desktop RIGHT SIDE: NAME + SIGN OUT */}
            <div className="hidden md:flex ml-auto items-center gap-3 flex-shrink-0">
              <span className="text-sm font-bold text-white/90 truncate max-w-none">
                {user.displayName || user.email}
              </span>
              <button
                onClick={doSignOut}
                disabled={busy}
                className="
                  px-4 py-2 rounded-full border border-white/20 text-sm font-semibold
                  text-white/80 hover:text-white hover:bg-white/10 hover:border-white/40
                  transition-all disabled:opacity-50 whitespace-nowrap
                "
              >
                {busy ? '…' : 'Sign out'}
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden ml-auto p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
          </div>
        )}
      </header>

      {/* MOBILE FULL-SCREEN OVERLAY MENU */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A0033] flex flex-col md:hidden">
          {/* Top bar with logo + close */}
          <div className="flex items-center justify-between px-4 h-[72px] flex-shrink-0">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent"
            >
              BAE
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col items-center gap-2 mt-12 flex-1">
            {mobileNavLinks}
          </nav>

          {/* User info + sign out at bottom */}
          {user && (
            <div className="flex flex-col items-center gap-4 pb-16 flex-shrink-0">
              <span className="text-sm font-bold text-white/90">
                {user.displayName || user.email}
              </span>
              <button
                onClick={doSignOut}
                disabled={busy}
                className="
                  px-8 py-3 rounded-full border border-white/20 text-sm font-semibold
                  text-white/80 hover:text-white hover:bg-white/10 hover:border-white/40
                  transition-all disabled:opacity-50
                "
              >
                {busy ? '…' : 'Sign out'}
              </button>
            </div>
          )}

          {/* Sign in for logged-out users */}
          {!user && (
            <div className="flex flex-col items-center gap-4 pb-16 flex-shrink-0">
              <button
                onClick={() => { setMenuOpen(false); doSignIn(); }}
                className="
                  px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-pink-500
                  text-white font-bold text-sm transition-all hover:scale-105
                "
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
