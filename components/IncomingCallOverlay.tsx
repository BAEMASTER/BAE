'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import type { IncomingCall } from '@/lib/hooks/useIncomingCalls';

export default function IncomingCallOverlay({ call }: { call: IncomingCall }) {
  const router = useRouter();
  const [handling, setHandling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleAnswer = async () => {
    if (handling) return;
    setHandling(true);

    try {
      const res = await fetch('/api/direct-call', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: call.callId, action: 'accept' }),
      });
      const data = await res.json();
      if (data.roomUrl) {
        router.push(`/match?directCall=true&roomUrl=${encodeURIComponent(data.roomUrl)}&partnerId=${encodeURIComponent(call.visitorUid)}`);
      }
    } catch (e) {
      console.error('Failed to answer call', e);
      setHandling(false);
    }
  };

  const handleDecline = async () => {
    if (handling) return;
    setHandling(true);
    setDismissed(true);

    try {
      await fetch('/api/direct-call', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: call.callId, action: 'decline' }),
      });
    } catch (e) {
      console.error('Failed to decline call', e);
    }
    setHandling(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="max-w-sm w-full bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] rounded-3xl border border-violet-400/30 p-8 text-center shadow-[0_0_60px_rgba(139,92,246,0.3)]"
      >
        {/* Pulsing ring indicator */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-green-400/20"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.6, 0.1, 0.6],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute inset-0 rounded-full bg-green-400/20"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-500/30 border border-green-400/30 flex items-center justify-center">
            <Phone className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          {call.visitorName}
        </h2>
        <p className="text-white/50 text-sm mb-5">wants to BAE with you</p>

        {/* Visitor interests */}
        {call.visitorInterests.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {call.visitorInterests.map(interest => (
              <span key={interest} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white/60">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          <motion.button
            onClick={handleDecline}
            disabled={handling}
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/20 font-bold text-white/60 flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            Not now
          </motion.button>
          <motion.button
            onClick={handleAnswer}
            disabled={handling}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(74,222,128,0.3)',
                '0 0 40px rgba(74,222,128,0.5)',
                '0 0 20px rgba(74,222,128,0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 font-bold text-white flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            {handling ? 'Connecting...' : 'Answer'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
