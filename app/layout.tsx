'use client';
import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { usePresence } from '@/lib/hooks/usePresence';
import { useIncomingCalls } from '@/lib/hooks/useIncomingCalls';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import { AnimatePresence } from 'framer-motion';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const isMatchPage = pathname.startsWith('/match');

  // Track online/offline presence for all authenticated users
  usePresence();

  // Listen for incoming direct calls (not on match page — already in a call)
  const incomingCall = useIncomingCalls();
  
  return (
    <html lang="en">
      <body className="min-h-screen">
        {!isAuthPage && !isMatchPage && <Header />}
        {/* Incoming call overlay — show on all pages except match */}
        <AnimatePresence>
          {incomingCall && !isMatchPage && (
            <IncomingCallOverlay call={incomingCall} />
          )}
        </AnimatePresence>
        {isMatchPage ? (
          children
        ) : (
          <main
            className={
              isAuthPage
                ? "min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100"
                : "min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 pt-[72px]"
            }
          >
            {children}
          </main>
        )}
      </body>
    </html>
  );
}