'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const PILLS = ['Italian Food', 'Art Museums', 'Running', 'AI', 'Physics', 'Standup Comedy'];

export default function HomePage() {
  const router = useRouter();
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen gap-10 sm:gap-14">
        {/* Interest pills */}
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 max-w-3xl">
          {PILLS.map((p, i) => (
            <motion.div key={p} animate={{ boxShadow: ['0 0 8px rgba(253,224,71,0.3)', '0 0 22px rgba(253,224,71,0.6)', '0 0 8px rgba(253,224,71,0.3)'] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }} className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-bold text-yellow-100 bg-yellow-400/15 border border-yellow-300/30">
              {p}
            </motion.div>
          ))}
          <div className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-semibold text-white/30 border border-white/10 italic">+ and more</div>
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[1.05] drop-shadow-[0_0_60px_rgba(255,180,255,0.4)]">
          Be Yourself on{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">BAE</span>
        </h1>

        {/* CTA */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => router.push('/talk')} animate={{ boxShadow: ['0 0 30px rgba(245,158,11,0.3)', '0 0 50px rgba(245,158,11,0.5)', '0 0 30px rgba(245,158,11,0.3)'] }} transition={{ duration: 2, repeat: Infinity }} className="px-16 sm:px-24 py-6 sm:py-7 rounded-full font-black text-xl sm:text-2xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-wide">
          Start Talking
        </motion.button>
      </section>
    </main>
  );
}
