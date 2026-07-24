import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  MonitorPlay, 
  CloudLightning, 
  Sparkles,
  ArrowRight,
  Download
} from 'lucide-react';

export default function LandingPage() {
  const navigateToApp = () => {
    window.location.href = '/app';
  };

  const handleDownload = () => {
    // Redirects the user to the GitHub Releases page where they can download the .exe
    window.open("https://github.com/reengineerpainter-bot/LogosBridge/releases/latest", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-100 font-sans overflow-x-hidden relative">
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-blue-700/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <div className="relative z-10">
        
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">LogosBridge</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={navigateToApp}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Open Web App
            </button>
            <button 
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-full text-sm font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all shadow-xl hover:shadow-cyan-500/20"
            >
              Download
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-32 flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold tracking-widest uppercase mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Next Generation Scripture Tool</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-8"
          >
            The Bridge between traditional evidence <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              and Personal Assurance
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="max-w-2xl text-lg md:text-xl text-slate-400 mb-12 leading-relaxed"
          >
            A powerfully beautiful cross-platform application for reading, studying, and projecting scripture. Built for modern ministries, pastors, and theology enthusiasts.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button 
              onClick={navigateToApp}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_-10px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2 group"
            >
              Launch Web App
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={handleDownload}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Get Windows App
            </button>
          </motion.div>

        </main>

        {/* Features Grid */}
        <section className="border-t border-white/10 bg-black/20 backdrop-blur-3xl py-24">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <MonitorPlay className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Projection Studio</h3>
              <p className="text-slate-400 leading-relaxed">
                Control a secondary monitor effortlessly. Push verses to the big screen with beautiful, animated transitions and customizable lower-thirds.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Deep Study AI</h3>
              <p className="text-slate-400 leading-relaxed">
                Dive deeper into the context of the scriptures with an integrated AI study assistant that explains historical nuances and theological concepts.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                <CloudLightning className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Cloud Synchronization</h3>
              <p className="text-slate-400 leading-relaxed">
                Your bookmarks, study notes, and projection themes sync across all your devices via Firebase. Seamlessly transition from desktop to web.
              </p>
            </motion.div>

          </div>
        </section>

      </div>
    </div>
  );
}
