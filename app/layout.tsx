'use client';

import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation'; // <-- IMPORTANT: Import usePathname

export default function RootLayout({ children }: { children: ReactNode }) {
  // 1. Get the current URL path
  const pathname = usePathname();

  // 2. Check if we are on a route starting with /auth (e.g., /auth or /auth/login)
  const isAuthPage = pathname.startsWith('/auth');

  return (
    <html lang="en">
      <body className="min-h-screen">
        
        {/* 3. CONDITIONAL HEADER: Hide the header on the auth page */}
        {!isAuthPage && <Header />}

        {/* 4. CONDITIONAL MAIN WRAPPER STYLES */}
        <main
          className={
            isAuthPage
              // If it's the auth page, only give it minimum height, no background or padding
              ? 'min-h-screen' 
              // Otherwise, apply the global light theme gradient and top padding (for the header)
              : 'min-h-screen bg-gradient-to-br from-pink-50 via-fuchsia-50 to-indigo-100 text-purple-900 pt-16'
          }
        >
          {children}
        </main>
      </body>
    </html>
  );
}