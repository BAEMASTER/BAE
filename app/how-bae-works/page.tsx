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
              <p>BAE is built around what you're genuinely interested in. Fun to use. Simple by design. Authentic by nature.</p>
              <p>When you connect on BAE, your shared interests <strong className="text-yellow-300">glow</strong> between you. You see them at the same time.</p>
              <p>That shared glow answers a simple question:</p>
              <p className="text-2xl font-bold text-white text-center py-4">"What do we talk about?"</p>
              <p>And conversation starts from there.</p>
            </div>

            {/* Visual Example: Glowing Interests */}
            <div className="mt-8 bg-black/30 rounded-2xl p-6 border border-white/10">
              <p className="text-sm text-white/60 mb-4 text-center">Example: Shared interests glow gold</p>
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
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Your Interests</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>Your profile grows as you explore and add new things.</p>
              <p>Add anything you love—things you're really into, things you like casually, or things you've always enjoyed but forgot about.</p>
              <p className="text-white/90 font-semibold">Physics. Indian cooking. Architecture. Jazz. Meditation. Venture capital. Museums. Sneakers. Poetry. Gaming.</p>
              <p>There's no perfect list. Interests don't have to explain you or fit together. They just give people a way to meet you where you are.</p>
              <p>As you explore BAE, you'll naturally add new interests and remember old favorites. Your profile grows with you.</p>
            </div>
          </div>
        </motion.section>

        {/* Connecting on BAE Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Connecting on BAE</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>When you meet someone, your shared interests <strong className="text-yellow-300">glow beautifully</strong>.</p>
              <p>That little spark makes it easy to start talking. Connection feels natural, light, and sweet—just two people noticing the same things together.</p>
            </div>
          </div>
        </motion.section>

        {/* Growing Your Interests Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Growing Your Interests</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>As you spend time on BAE, you'll see new interests through other people.</p>
              <p>Sometimes you'll see something and get curious. Sometimes you'll see an interest and think, <strong className="text-white">"I forgot how much I love that."</strong></p>
              <p>You can add interests as you go. Over time, your profile becomes richer—not just for others, but for you.</p>
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
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Interest Explorer</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed mb-8">
              <p>Interest Explorer is a fun, purposeful way to see what others care about—one person at a time.</p>
              <p>You'll see their name, where they are, and what they're interested in. Shared interests <strong className="text-yellow-300">glow</strong>, so it's easy to notice what you have in common.</p>
              <p>You can add interests as you explore, follow what catches your attention, or just enjoy seeing the wide range of what people love.</p>
              <p>It's a playful way to meet people with <strong className="text-white">no pressure</strong>.</p>
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
              <p className="text-xs text-white/60 mb-3">Their interests:</p>
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
              <p className="text-xs text-white/50 mt-4 text-center">Gold = shared interests with you | Tap + to add to your profile</p>
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
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Beyond Matching</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>BAE isn't just about matching or chatting.</p>
              <p>Over time, it will let people share experiences together—watching, listening, exploring ideas, or just spending time in the same space. Even immersive ones will be part of the future.</p>
              <p>The goal is simple: help people connect in ways that feel <strong className="text-white">natural, fun, and personal</strong>.</p>
            </div>

            {/* Coming Soon Cards */}
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
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
                  Collaborate with AI in real-time. Learn together, explore ideas as a team.
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
                <h3 className="text-xl font-bold text-white mb-2">Watch Videos Together</h3>
                <p className="text-sm text-white/70">
                  Share videos, watch them synced. React together, laugh together.
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
                <h3 className="text-xl font-bold text-white mb-2">Listen to Music Together</h3>
                <p className="text-sm text-white/70">
                  Share songs, discover music, vibe together in real-time.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Why BAE Works Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Why BAE Works</h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>People connect best when there's something they care about in common.</p>
              <p>When shared interests <strong className="text-yellow-300">glow</strong>, conversation starts naturally. BAE makes it easier for connections to happen—and makes them feel <strong className="text-white">fun, sweet, and real</strong>.</p>
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