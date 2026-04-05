'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Link2, Users } from 'lucide-react';

const ALL_INTERESTS = [
  ['Italian Food', 'Art Museums', 'Running', 'AI', 'Standup Comedy'],
  ['Hot Yoga', 'Photography', 'Jazz', 'Hiking', 'Podcasts'],
  ['Psychology', 'Travel', 'Meditation', 'Surfing', 'Chess'],
  ['Parenting', 'Film', 'Dancing', 'Philosophy', 'Dogs'],
  ['Sci-Fi', 'Sneakers', 'Coffee', 'Live Music', 'Anime'],
  ['Cooking', 'Vinyl Records', 'Entrepreneurship', 'Gardening', 'Yoga'],
];

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Talk with BAE',
    description: 'Have a conversation. BAE discovers what makes you interesting and builds your profile as you talk.',
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    icon: Link2,
    title: 'Get Your Room',
    description: 'Your own link — baewithme.com/you. Your interests, your vibe, your space. It\'s yours.',
    accent: 'from-amber-400 to-yellow-300',
  },
  {
    icon: Users,
    title: 'Invite Your People',
    description: 'Send your link to anyone. They tap it, they\'re in your room. Interests glow. Conversations flow.',
    accent: 'from-pink-500 to-rose-400',
  },
];

export default function LabPage() {
  const router = useRouter();
  const [setIndex, setSetIndex] = useState(0);
  const pills = ALL_INTERESTS[setIndex];

  useEffect(() => {
    const id = setInterval(() => {
      setSetIndex(prev => (prev + 1) % ALL_INTERESTS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-fuchsia-500/15 blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-indigo-500/15 blur-[150px]" />
      </div>

      {/* ===== HERO (same as homepage) ===== */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 min-h-screen gap-10 sm:gap-14 pt-[72px]">
        {/* Rotating pills */}
        <div className="flex justify-center gap-2.5 sm:gap-3">
          {pills.map((p, i) => (
            <div
              key={i}
              className={`${i < 3 ? '' : 'hidden sm:block'} px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-bold text-black bg-[#fde047] border border-yellow-200 overflow-hidden`}
              style={{ boxShadow: '0 0 24px rgba(253,224,71,0.55), 0 0 8px rgba(253,224,71,0.35)' }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={p}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="block whitespace-nowrap"
                >
                  {p}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-[1.05] drop-shadow-[0_0_60px_rgba(255,180,255,0.4)]">
          Be Yourself on{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">BAE</span>
        </h1>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.07, boxShadow: '0 0 80px rgba(253,224,71,0.6), 0 0 120px rgba(245,158,11,0.3)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          animate={{ boxShadow: ['0 0 40px rgba(253,224,71,0.35), 0 0 80px rgba(245,158,11,0.15)', '0 0 60px rgba(253,224,71,0.5), 0 0 100px rgba(245,158,11,0.25)', '0 0 40px rgba(253,224,71,0.35), 0 0 80px rgba(245,158,11,0.15)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-20 sm:px-32 py-7 sm:py-8 rounded-full font-extrabold text-xl sm:text-2xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.15em]"
        >
          Start Talking
        </motion.button>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 text-white/20 text-sm font-medium"
        >
          ↓
        </motion.div>
      </section>

      {/* ===== HOW IT WORKS — 3 STEPS ===== */}
      <section className="relative z-10 px-6 py-24 sm:py-32">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-center mb-16 sm:mb-24"
        >
          How{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">BAE</span>{' '}
          Works
        </motion.h2>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="relative group"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10 text-center hover:bg-white/8 hover:border-white/20 transition-all duration-300">
                {/* Step number */}
                <div className="text-white/20 text-sm font-bold tracking-widest uppercase mb-6">
                  Step {i + 1}
                </div>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.accent} mb-6 shadow-lg`}>
                  <step.icon size={28} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-black mb-4 text-white">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-white/50 text-base leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative z-10 px-6 py-20 sm:py-28 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-lg sm:text-xl text-white/40 font-semibold tracking-wide mb-10"
        >
          The most interesting conversations in the world are on BAE.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.07, boxShadow: '0 0 80px rgba(253,224,71,0.6), 0 0 120px rgba(245,158,11,0.3)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/talk')}
          className="px-20 sm:px-32 py-7 sm:py-8 rounded-full font-extrabold text-xl sm:text-2xl text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 tracking-[0.15em]"
          style={{ boxShadow: '0 0 50px rgba(253,224,71,0.4), 0 0 100px rgba(245,158,11,0.2)' }}
        >
          Start Talking
        </motion.button>

        {/* Room link preview */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-white/25 text-sm font-medium"
        >
          baewithme.com/<span className="text-amber-300/60">you</span>
        </motion.p>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/25 font-medium">
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
