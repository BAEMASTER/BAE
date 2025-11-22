'use client';

import './globals.css';
import Header from '@/components/Header';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-pink-50 via-fuchsia-50 to-indigo-100 text-purple-900">
        
        {/* Always show header */}
        <Header />

        {/* Main content wrapper with header offset */}
        <main className="min-h-screen pt-16">
          {children}
        </main>

      </body>
    </html>
  );
}
