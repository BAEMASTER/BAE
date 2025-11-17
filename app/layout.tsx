'use client'; 

import './globals.css';
import Header from '@/components/Header'; // Use the standard import path
import { ReactNode } from 'react'; 
// Next.js metadata is usually defined outside the component, but we will keep 
// the existing structure and make sure the component is clean.

// We need to assume the Header component is located at '@/components/Header'
// The user provided 'Header from ../components/Header', which works, but 
// standard practice is to use the alias: '@/components/Header'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/*
          CHANGE 1: Removed the unnecessary bgColor prop since the actual Header component doesn't use it.
        */}
        <Header />
        
        {/* CHANGE 2: Applying the light, bright gradient to the main content area 
          This ensures a light background on the homepage and other non-auth pages.
        */}
        <main className="min-h-screen 
            bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 
            text-purple-900 
            pt-16" // Added padding top to account for the sticky header
        >
          {children}
        </main>
      </body>
    </html>
  );
}