'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { Brain, Youtube, Music, ArrowRight, Heart } from 'lucide-react';

export default function GuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (!u) {
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          setUserInterests(snap.data().interests || []);
        }
      } catch (e) {
        console.error('Load interests failed', e);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleBAEClick = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (userInterests.length < 3) {
      router.push('/profile');
      return;
    }
    router.push('/match');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] animate-pulse"></div>
      </div>


      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-12 py-16">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 flex items-center justify-center gap-4 flex-wrap drop-shadow-[0_0_30px_rgba(255,160,255,0.6)]">
            <span>How BAE</span>
            <motion.span
              animate={{ 
                boxShadow: ['0 0 15px rgba(253,224,71,0.6)', '0 0 25px rgba(253,224,71,0.9)', '0 0 15px rgba(253,224,71,0.6)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-8 py-3 bg-yellow-300 text-black font-black rounded-full border-2 border-yellow-200 text-3xl sm:text-5xl"
            >
              Works
            </motion.span>
          </h1>
        </motion.div>

        {/* What is BAE Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">What Is BAE?</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>BAE is built around what you're genuinely interested in. Fun to use. Simple by design. Authentic by nature.</p>
              <p>When you match with someone, your shared interests <strong className="text-yellow-300">glow</strong> in the middle between you both at the same time. You see them together.</p>
              <p>That moment answers the question: <strong className="text-white">"What do we both care about?"</strong></p>
              <p>And conversation starts from there.</p>
            </div>

            {/* Visual Example: Glowing Interests */}
            <div className="mt-8 bg-black/30 rounded-2xl p-6 border border-white/10">
              <p className="text-sm text-white/60 mb-4 text-center">What shared interests look like:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <motion.span 
                  animate={{ 
                    boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-6 py-3 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200"
                >
                  Physics
                </motion.span>
                <motion.span
                  animate={{
                    boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  className="px-6 py-3 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200"
                >
                  Rock Climbing
                </motion.span>
                <motion.span
                  animate={{
                    boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className="px-6 py-3 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200"
                >
                  Jazz
                </motion.span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Your Interests Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Build Your Interests</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>Add anything you actually like. Big passions. Small hobbies. Forgotten favorites.</p>
              <p className="text-white/90 font-semibold">Physics. Indian cooking. Architecture. Jazz. Meditation. Museums. Sneakers. Poetry. Gaming.</p>
              <p>There's no "perfect" list. Your interests don't have to match or make sense together. They just tell people what matters to you.</p>
              <p>As you explore BAE, you'll discover new things to add and remember things you'd forgotten about.</p>
            </div>

            {/* Visual Example: Interest Adder */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/10">
              <p className="text-sm text-white/60 mb-4 text-center">How it looks on your profile:</p>
              
              {/* Current Interests */}
              <div className="mb-6">
                <p className="text-xs text-white/50 mb-3">Your interests:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200 shadow-[0_0_10px_rgba(253,224,71,0.6)]">
                    Jazz
                  </span>
                  <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200 shadow-[0_0_10px_rgba(253,224,71,0.6)]">
                    Meditation
                  </span>
                  <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200 shadow-[0_0_10px_rgba(253,224,71,0.6)]">
                    Architecture
                  </span>
                </div>
              </div>

              {/* Add Interest Input */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Add interest..." 
                  className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-yellow-400/50 text-sm"
                  disabled
                />
                <button className="px-6 py-3 rounded-full bg-pink-500 text-white font-bold text-sm hover:bg-pink-600 transition-colors">
                  Add
                </button>
              </div>
              <p className="text-xs text-white/50 mt-3 text-center">Type anything, press Enter or click Add</p>
            </div>
          </div>
        </motion.section>

        {/* Interest Explorer Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30 backdrop-blur-lg rounded-3xl border border-purple-400/30 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">Interest Explorer</h2>
            <p className="text-sm font-semibold text-yellow-300/80 tracking-wide mb-6">THE CORE OF BAE</p>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>This is where BAE gets deep.</p>
              <p>You&apos;re not scrolling photos. You&apos;re browsing people by <strong className="text-white">what they actually care about</strong> — interests, passions, curiosities, all out in the open. No filters. No performance. Just the real stuff.</p>
              <p>See something that resonates? <strong className="text-yellow-300">Tap it.</strong> That interest transfers from their world to yours. Just like real life — a stranger introduces you to jazz, or philosophy, or a hobby you never knew you&apos;d love. Every person you encounter has the potential to expand who you are.</p>
              <p>This is how interests naturally travel between people. Your profile grows richer over time — not because you&apos;re curating an image, but because you&apos;re genuinely discovering through real human connection. People are doorways to experiences you never saw coming.</p>
              <p>Found someone whose interests fascinate you? <Heart size={14} className="inline text-pink-400 fill-pink-400 -mt-0.5" /> <strong className="text-pink-300">Heart their profile</strong> to save them — whether you discover them exploring or meet them on a video match. Your saved profiles become a map of the people who expanded your world.</p>
            </div>

            {/* Visual Example: Interest Explorer Preview */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
                  M
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-black text-white">Maya S</div>
                  <div className="text-sm text-white/70">San Francisco</div>
                </div>
                <Heart size={18} className="text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]" />
              </div>
              <p className="text-xs text-white/60 mb-3">Her interests:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.6)]">
                  Venture Capital
                </span>
                <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.6)]">
                  Mindfulness
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Matcha <span className="ml-1 text-white/30">+</span>
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Tech Conferences <span className="ml-1 text-white/30">+</span>
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Gardening <span className="ml-1 text-white/30">+</span>
                </span>
              </div>
              <p className="text-xs text-white/50 mt-4 text-center">Gold = you both share it · Tap + to add to yours · Heart to save</p>
            </div>
          </div>
        </motion.section>

        {/* Video Matching Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Video Match</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>Get matched with someone new. Hop on video. See what you both care about — your shared interests glow at the top of the screen the moment you connect.</p>
              <p>Their other interests are right there too. Tap any of them to add to your own profile in real time. The conversation deepens. Both of you grow. Meet someone amazing? <Heart size={14} className="inline text-pink-400 fill-pink-400 -mt-0.5" /> <strong className="text-pink-300">Heart them</strong> right from the call.</p>
              <p>Real connection happens when you discover new things together.</p>
            </div>

            {/* Visual Example: Video Match Preview */}
            <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
              {/* Shared interests at top — matches current design */}
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                <motion.span
                  animate={{ boxShadow: ['0 0 10px rgba(253,224,71,0.4)', '0 0 18px rgba(253,224,71,0.7)', '0 0 10px rgba(253,224,71,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-3.5 py-1.5 bg-yellow-300 text-black font-bold rounded-full text-xs border border-yellow-200/80"
                >
                  Jazz
                </motion.span>
                <motion.span
                  animate={{ boxShadow: ['0 0 10px rgba(253,224,71,0.4)', '0 0 18px rgba(253,224,71,0.7)', '0 0 10px rgba(253,224,71,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                  className="px-3.5 py-1.5 bg-yellow-300 text-black font-bold rounded-full text-xs border border-yellow-200/80"
                >
                  Meditation
                </motion.span>
                <motion.span
                  animate={{ boxShadow: ['0 0 10px rgba(253,224,71,0.4)', '0 0 18px rgba(253,224,71,0.7)', '0 0 10px rgba(253,224,71,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="px-3.5 py-1.5 bg-yellow-300 text-black font-bold rounded-full text-xs border border-yellow-200/80"
                >
                  Poetry
                </motion.span>
              </div>

              <div className="flex gap-4 items-stretch relative">
                {/* Your Video */}
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center min-h-48 mb-3">
                    <svg className="w-28 h-28 text-white/30 mb-4" viewBox="0 0 100 100" fill="currentColor">
                      <circle cx="50" cy="30" r="15" />
                      <path d="M 35 50 Q 35 45 50 45 Q 65 45 65 50 L 65 70 Q 65 75 60 75 L 40 75 Q 35 75 35 70 Z" />
                    </svg>
                    <p className="text-sm font-bold text-white">You</p>
                    <p className="text-xs text-white/60">Los Angeles</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Surfing</span>
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Photography</span>
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Hiking</span>
                  </div>
                </div>

                {/* Frosted Vibe Meter — centered between panels */}
                <div className="flex flex-col items-center justify-center px-1">
                  <div
                    className="relative w-8 h-24 rounded-full overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(252,211,77,0.12)',
                    }}
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-1.5 rounded-full bg-white/[0.06]">
                      <motion.div
                        animate={{ height: '60%' }}
                        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                        className="absolute bottom-0 w-full rounded-full"
                        style={{
                          background: 'linear-gradient(to top, #7dd3fc, #6ee7b7, #fcd34d)',
                          boxShadow: '0 0 6px rgba(252,211,77,0.3)',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="mt-2 px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-[9px] font-medium tracking-[0.15em] text-amber-300">DEEP</span>
                  </div>
                </div>

                {/* Their Video */}
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center min-h-48 mb-3">
                    <svg className="w-28 h-28 text-white/30 mb-4" viewBox="0 0 100 100" fill="currentColor">
                      <circle cx="50" cy="30" r="15" />
                      <path d="M 35 50 Q 35 45 50 45 Q 65 45 65 50 L 65 70 Q 65 75 60 75 L 40 75 Q 35 75 35 70 Z" />
                    </svg>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-white">Alex</p>
                      <Heart size={12} className="text-pink-400 fill-pink-400" />
                    </div>
                    <p className="text-xs text-white/60">New York</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Cooking</span>
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Art History</span>
                    <span className="px-2 py-1 bg-white/20 text-white/80 rounded-full text-[10px] border border-white/30">Tennis</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/50 text-center mt-4">Shared interests glow at the top · Tap any interest to add it · Heart to save</p>
            </div>
          </div>
        </motion.section>

        {/* Beyond Matching Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Coming Soon</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>Video is just the start. We're building ways to connect around what you care about—together.</p>
            </div>

            {/* Coming Soon Cards */}
            <div className="grid sm:grid-cols-3 gap-6">
              {/* AI Together */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ask AI Together</h3>
                <p className="text-sm text-white/70">
                  Brainstorm and learn side-by-side in real-time.
                </p>
              </motion.div>

              {/* YouTube Together */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Youtube className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Watch Together</h3>
                <p className="text-sm text-white/70">
                  Share videos and react in sync.
                </p>
              </motion.div>

              {/* Spotify Together */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Listen Together</h3>
                <p className="text-sm text-white/70">
                  Share songs and discover music as a pair.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBAEClick}
            className="group inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-yellow-400 via-pink-500 to-fuchsia-600 text-white font-black text-xl rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] transition-all"
          >
            BAE Someone Now
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="text-white/60 text-sm mt-6">
            Your interests make you interesting
          </p>
        </motion.div>

      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-400/20 bg-[#1A0033]/80 backdrop-blur-xl py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-white/60 text-sm">
            Built with ❤️ for humanity
          </p>
        </div>
      </footer>
    </main>
  );
}