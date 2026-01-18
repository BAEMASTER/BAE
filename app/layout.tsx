'use client';
import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const isMatchPage = pathname.startsWith('/match');
  
  return (
    <html lang="en">
      <body className="min-h-screen">
        {!isAuthPage && <Header />}
        <main
          className={
            isAuthPage || isMatchPage
              ? "min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100"
              : "min-h-screen bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 pt-[72px]"
          }
        >
          {children}
        </main>
      </body>
    </html>
  );
}