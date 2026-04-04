'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const SAMPLE_INTERESTS = [
  'Italian Food', 'Hot Yoga', 'Stand-up Comedy',
  'AI', 'Parenting', 'Vinyl Records',
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#000020]" />
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-violet-500/20 blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-indigo-500/15 blur-[200px]" />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 z-10 min-h-[calc(100vh-72px)] pt-[72px]">

        {/* Interest pills — a taste of what BAE surfaces */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-14 max-w-2xl"
        >
          {SAMPLE_INTERESTS.map((interest) => (
            <div
              key={interest}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-amber-200/80 bg-amber-400/10 border border-amber-400/20"
            >
              {interest}
            </div>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold mb-6 leading-[1.1] max-w-5xl"
        >
          <span className="text-white">Let&apos;s Talk.</span>
          <br />
          <span className="text-white">And Make it{' '}</span>
          <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
            Interesting.
          </span>
        </motion.h1>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg sm:text-xl text-white/50 mb-10 sm:mb-14 max-w-lg font-medium leading-relaxed"
        >
          Your room. Your people. Your&nbsp;experience.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          whileHover={{ scale: 1.04, boxShadow: '0 15px 50px rgba(253, 224, 71, 0.4)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          className="px-14 sm:px-20 py-5 sm:py-6 rounded-full font-black text-xl sm:text-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black shadow-[0_0_40px_rgba(253,224,71,0.3)] tracking-wide"
        >
          Get Your Room
        </motion.button>

      </section>

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 z-10">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/25 font-medium pb-5">
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
          <span className="text-white/15">|</span>
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
          <span className="text-white/15">|</span>
          <a href="/guidelines" className="hover:text-white/50 transition-colors">Community Guidelines</a>
          <span className="text-white/15">|</span>
          <a href="mailto:support@baewithme.com" className="hover:text-white/50 transition-colors">support@baewithme.com</a>
        </div>
      </footer>
    </main>
  );
}
