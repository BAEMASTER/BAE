'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useAgeGate } from '@/lib/hooks/useAgeGate';
import { Loader2 } from 'lucide-react';

/**
 * Wrap any page/route that requires 18+ age verification
 * Usage: <AgeGateWrapper><YourPage /></AgeGateWrapper>
 */
export default function AgeGateWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdult, loading } = useAgeGate(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  // If not adult, the hook redirects them automatically
  // So this should only render if isAdult is true
  if (!isAdult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-black text-white mb-4">Age Verification Required</h2>
          <p className="text-lg text-white/70 mb-6">
            You must be 18+ to use BAE. Please update your birthdate in your profile.
          </p>
        </div>
      </div>
    );
  }

  // User is adult - render the protected content
  return <>{children}</>;
}