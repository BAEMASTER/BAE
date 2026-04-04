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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-violet-500/10 blur-[200px]" />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 z-10 min-h-[calc(100vh-72px)] pt-[72px]">

        {/* Glowing interest pills */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2.5 sm:gap-3 mb-12 sm:mb-16 max-w-3xl"
        >
          {SAMPLE_INTERESTS.map((interest, i) => (
            <motion.div
              key={interest}
              animate={{
                boxShadow: [
                  '0 0 10px rgba(253,224,71,0.3)',
                  '0 0 20px rgba(253,224,71,0.6)',
                  '0 0 10px rgba(253,224,71,0.3)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
              className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-bold text-yellow-100 bg-yellow-400/15 border border-yellow-300/30 backdrop-blur-sm"
            >
              {interest}
            </motion.div>
          ))}
        </motion.div>

        {/* Headline — "Let's Talk." on line 1, "And Make it [Interesting.]" on line 2 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 leading-[1.05]"
        >
          <span className="block text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold text-white drop-shadow-[0_0_40px_rgba(255,200,255,0.4)]">
            Let&apos;s Talk.
          </span>
          <span className="block text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold mt-1 sm:mt-2">
            <span className="text-white drop-shadow-[0_0_40px_rgba(255,200,255,0.4)]">And Make it </span>
            <motion.span
              animate={{
                boxShadow: [
                  '0 0 15px rgba(253,224,71,0.5)',
                  '0 0 30px rgba(253,224,71,0.8)',
                  '0 0 15px rgba(253,224,71,0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block px-5 py-1 sm:px-8 sm:py-2 bg-yellow-300 text-black rounded-full border-2 border-yellow-200"
            >
              Interesting.
            </motion.span>
          </span>
        </motion.h1>

        {/* Sub-copy — styled with presence */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl sm:text-2xl text-white/60 mb-10 sm:mb-14 font-semibold tracking-wide"
        >
          <span className="text-white/80">Talk with BAE.</span>{' '}
          <span className="text-white/80">Build your interests.</span>{' '}
          <span className="text-white/80">Get a room (yours).</span>
        </motion.p>

        {/* Power statement */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-base sm:text-lg font-medium text-white/40 tracking-wide mb-8 sm:mb-10 max-w-xl"
        >
          The most interesting conversations in the world are on BAE.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(245, 158, 11, 0.6)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          className="px-14 sm:px-20 py-5 sm:py-7 rounded-full font-black text-xl sm:text-2xl text-white transition-all tracking-wider"
          style={{
            background: 'linear-gradient(90deg, #F59E0B, #F97316)',
            boxShadow: '0 10px 40px rgba(245, 158, 11, 0.4)',
          }}
        >
          Start Having Yours
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
