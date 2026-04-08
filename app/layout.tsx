'use client';
import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { usePresence } from '@/lib/hooks/usePresence';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const isMatchPage = pathname.startsWith('/match');
  const isHomePage = pathname === '/';
  const isWelcomePage = pathname === '/welcome';

  // Track online/offline presence for all authenticated users
  usePresence();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {!isAuthPage && !isMatchPage && !isHomePage && !isWelcomePage && <Header />}
        {isMatchPage || isHomePage || isWelcomePage ? (
          children
        ) : (
          <main
            className={
              isAuthPage
                ? "min-h-screen bg-[#1A0033]"
                : "min-h-screen bg-[#1A0033] pt-[72px]"
            }
          >
            {children}
          </main>
        )}
      </body>
    </html>
  );
}