'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Heart, Zap, Globe, Brain, Youtube, Music, ArrowRight } from 'lucide-react';

export default function GuidePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#4D004D] to-[#000033] relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-500/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[120px] animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 h-20 backdrop-blur-xl bg-[#1A0033]/80 border-b border-purple-400/20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push('/')}
          className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent cursor-pointer"
        >
          BAE
        </motion.div>
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full shadow-lg"
        >
          Start Matching
        </motion.button>
      </header>

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
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-pink-400" />
              <h2 className="text-3xl sm:text-4xl font-black text-white">What is BAE?</h2>
            </div>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>
                <strong className="text-white">BAE is where interests become conversations.</strong>
              </p>
              <p>
                We believe the best connections start with what you're curious about—not your face, 
                not your photos, not your performance. What lights you up. What makes you interesting.
              </p>
              <p>
                <strong className="text-yellow-300">We match you by interests first.</strong> Then when you 
                connect on video, your shared interests literally GLOW between you. They become the bridge, 
                the conversation starter, the reason you're both here.
              </p>
              <p>
                This isn't about algorithms maximizing your screen time. This is about <strong className="text-white">scaffolding 
                for genuine human curiosity</strong>.
              </p>
            </div>
          </div>
        </motion.section>

        {/* How It Works Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              How It Works
            </h2>
            <p className="text-lg text-white/70">Four simple steps to better conversations</p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Add Your Interests</h3>
                  <p className="text-white/70 leading-relaxed mb-4">
                    Tell us what you care about. Physics? Stand-up comedy? Rock climbing? 
                    Indian cooking? The more you add, the better your matches. Start with at least 3.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm">yoga</span>
                    <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm">poetry</span>
                    <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm">AI ethics</span>
                    <span className="px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm">Museums</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-400 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-black text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Match Based on Interests</h3>
                  <p className="text-white/70 leading-relaxed">
                    Our matching finds someone who shares what you care about. Not random. Not luck. 
                    Intentional connection. You're meeting someone who actually gets you.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center text-black font-black text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Your Shared Interests GLOW ⭐</h3>
                  <p className="text-white/70 leading-relaxed mb-4">
                    When you match, your shared interests appear in GOLD between your videos. 
                    They glow. They pulse. They're your conversation starters—already built in.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
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
                      ⭐ Stand-up Comedy ⭐
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-fuchsia-400 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-xl">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Discover New Interests 👆</h3>
                  <p className="text-white/70 leading-relaxed mb-4">
                    See an interest of theirs you like? <strong className="text-yellow-300">Just tap it.</strong> It 
                    instantly adds to your profile. You're not just meeting someone—you're expanding your world.
                  </p>
                  <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">Their interests:</p>
                    <div className="flex flex-wrap gap-2">
                      <button className="px-4 py-2 bg-white/20 text-white/80 rounded-full text-sm hover:bg-white/30 transition-all cursor-pointer">
                        Rock climbing 👆
                      </button>
                      <button className="px-4 py-2 bg-white/20 text-white/80 rounded-full text-sm hover:bg-white/30 transition-all cursor-pointer">
                        Jazz 👆
                      </button>
                      <button className="px-4 py-2 bg-white/20 text-white/80 rounded-full text-sm hover:bg-white/30 transition-all cursor-pointer">
                        Pottery 👆
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Shared Experiences Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              Shared Experiences
            </h2>
            <p className="text-lg text-white/70">Do things together, not just talk</p>
          </div>

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
              <p className="text-sm text-white/70 mb-3">
                Collaborate with AI in real-time. Ask questions, learn together, solve problems as a team.
              </p>
              <span className="inline-block px-3 py-1 bg-yellow-300/20 text-yellow-300 rounded-full text-xs font-semibold">
                Coming Soon
              </span>
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
              <p className="text-sm text-white/70 mb-3">
                Share videos, watch them synced. React together. Laugh together. Connect through content.
              </p>
              <span className="inline-block px-3 py-1 bg-yellow-300/20 text-yellow-300 rounded-full text-xs font-semibold">
                Coming Soon
              </span>
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
              <p className="text-sm text-white/70 mb-3">
                Share songs, discover music, vibe together. Your playlists become conversations.
              </p>
              <span className="inline-block px-3 py-1 bg-yellow-300/20 text-yellow-300 rounded-full text-xs font-semibold">
                Coming Soon
              </span>
            </motion.div>
          </div>
        </motion.section>

        {/* The Vision Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30 backdrop-blur-lg rounded-3xl border border-purple-400/30 p-8 sm:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-8 h-8 text-indigo-400" />
              <h2 className="text-3xl sm:text-4xl font-black text-white">Where We're Going</h2>
            </div>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>
                <strong className="text-white">Today:</strong> Interest-based video chat. We're proving that 
                meaningful connections start with shared curiosity.
              </p>
              <p>
                <strong className="text-white">Tomorrow:</strong> Shared experiences. Watch videos together. 
                Listen to music together. Collaborate with AI together. Draw, play, learn—all in real-time, 
                all collaborative.
              </p>
              <p>
                <strong className="text-white">The Future:</strong> These conversations in 3D spaces. Interest 
                orbs floating around you. Shared activities becoming spatial experiences. Virtual venues you 
                explore together. Connection that feels like being in the same room.
              </p>
              <p className="text-xl text-yellow-300 font-bold">
                We're building the infrastructure for human connection in the digital age.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Philosophy Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-pink-400" />
              <h2 className="text-3xl sm:text-4xl font-black text-white">Our Philosophy</h2>
            </div>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>
                The internet should help us discover what we have in common, not just what makes us different.
              </p>
              <p>
                We believe in <strong className="text-yellow-300">connection with intention</strong>—starting 
                with what you care about, then building from there. Not random faces clicking through each other. 
                Not algorithmic manipulation. Just genuine human curiosity, scaffolded and supported.
              </p>
              <p>
                This is about <strong className="text-white">conscious connection with love and delight</strong>. 
                Not addiction. Not dopamine farming. Real discovery.
              </p>
              <p className="text-xl font-bold text-white pt-4">
                That's the BAE promise.
              </p>
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
            Start Your First Match
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="text-white/60 text-sm mt-6">
            Join the future of human connection
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