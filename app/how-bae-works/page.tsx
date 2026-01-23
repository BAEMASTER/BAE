'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Brain, Youtube, Music, ArrowRight } from 'lucide-react';

export default function GuidePage() {
  const router = useRouter();

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
              <p>BAE connects people through shared interests. Fun. Simple. Authentic.</p>
              <p>When you match with someone, your shared interests <strong className="text-yellow-300">light up gold</strong> on both sides at the same time. You see them together.</p>
              <p>That moment answers the question: <strong className="text-white">"What do we both care about?"</strong></p>
              <p>And that's how conversations start.</p>
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
                  ⭐ Physics ⭐
                </motion.span>
                <motion.span 
                  animate={{ 
                    boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  className="px-6 py-3 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200"
                >
                  ⭐ Rock Climbing ⭐
                </motion.span>
                <motion.span 
                  animate={{ 
                    boxShadow: ['0 0 10px rgba(253,224,71,0.5)', '0 0 20px rgba(253,224,71,0.8)', '0 0 10px rgba(253,224,71,0.5)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className="px-6 py-3 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200"
                >
                  ⭐ Jazz ⭐
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
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>Add anything you actually like. Big passions. Small hobbies. Forgotten favorites.</p>
              <p className="text-white/90 font-semibold">Physics. Indian cooking. Architecture. Jazz. Meditation. Museums. Sneakers. Poetry. Gaming.</p>
              <p>There's no "perfect" list. Your interests don't have to match or make sense together. They just tell people what matters to you.</p>
              <p>As you explore BAE, you'll discover new things to add and remember things you'd forgotten about.</p>
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
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Explore Others</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>Browse profiles one at a time. See their name, where they're from, and what they love.</p>
              <p>Shared interests light up in gold. Non-shared ones are there too—tap to add them if something catches your eye.</p>
              <p>No pressure. Just explore and see what people are into.</p>
            </div>

            {/* Visual Example: Interest Explorer Preview */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
                  M
                </div>
                <div>
                  <div className="text-2xl font-black text-white">Maya S</div>
                  <div className="text-sm text-white/70">San Francisco</div>
                </div>
              </div>
              <p className="text-xs text-white/60 mb-3">Her interests:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.6)]">
                  ⭐ Venture capital
                </span>
                <span className="px-4 py-2 bg-yellow-300 text-black font-bold rounded-full text-sm border-2 border-yellow-200 shadow-[0_0_15px_rgba(253,224,71,0.6)]">
                  ⭐ Mindfulness
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Matcha + 👆
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Tech conferences + 👆
                </span>
                <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm border border-white/20">
                  Gardening + 👆
                </span>
              </div>
              <p className="text-xs text-white/50 mt-4 text-center">Gold = you both like it | Tap + to add to yours</p>
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
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>Get matched with someone who shares your interests. Then hop on video and chat.</p>
              <p>Your shared interests stay highlighted the whole time. If you discover new ones during the call, add them on the spot.</p>
              <p>No swiping. No texting first. Just real people, real interests, real conversations.</p>
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
            onClick={() => router.push('/')}
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