'use client';

import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  return (
    <html lang="en">
      <body className="min-h-screen">

        {/* Header visible everywhere except auth */}
        {!isAuthPage && <Header />}

        <main
          className={
            isAuthPage
              ? "min-h-screen pt-[72px]" /* FIXED: remove white gap on auth */
              : "min-h-screen pt-[72px] bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-purple-900"
          }
        >
          {children}
        </main>

      </body>
    </html>
  );
}
