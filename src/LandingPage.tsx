import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, MonitorPlay, Sparkles, Wand2, History, ArrowRight, ArrowDown, Layers, MessageSquare, Search, Home, Heart, Facebook, Twitter, Instagram, Youtube, Mail, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import bridgeOnBibleLogo from './assets/images/bridge_on_bible_logo.png';
import benefitImg1 from './assets/images/uploaded_image_1.png';
import benefitImg2 from './assets/images/uploaded_image_2.png';
import benefitImg3 from './assets/images/uploaded_image_3.png';
interface LandingPageProps {
  onLaunch?: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const navigateToApp = () => {
    if (onLaunch) {
      onLaunch();
    } else {
      window.location.href = '/app';
    }
  };

  const handleDownload = () => {
    window.open("https://github.com/reengineerpainter-bot/LogosBridge/releases/latest", "_blank");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden relative selection:bg-slate-200 selection:text-slate-900">
      
      <div className="relative z-10">
        
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={bridgeOnBibleLogo} alt="LogosBridge" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4">
            {Capacitor.getPlatform() === 'web' && (
              <button 
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white border border-transparent shadow-sm transition-all"
              >
                Download Desktop .exe
              </button>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-20 flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold tracking-widest uppercase mb-8"
          >
            <span>Spreading Biblical Clarity Across the Oceans</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-slate-900 mb-8 max-w-4xl"
          >
            Welcome to LogosBridge <br className="hidden md:block" />
            <span className="text-slate-500 font-serif text-2xl md:text-3xl mt-4 block leading-tight font-normal">
              A contemporary, highly readable Bible study assistant built for the global church, tailored perfectly for non-native English speakers.
            </span>
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 w-full sm:w-auto mt-4"
          >
            {Capacitor.getPlatform() !== 'web' ? (
              <div className="flex flex-col items-center gap-6 mt-4">
                <div className="flex flex-col items-center gap-2 animate-bounce">
                  <span className="text-sm font-bold tracking-widest text-slate-500 uppercase">Enter App</span>
                  <div className="w-10 h-10 rounded-full bg-slate-900 shadow-xl shadow-amber-900/20 flex items-center justify-center ring-2 ring-slate-100">
                    <ArrowDown className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 rounded-full border border-slate-200 shadow-sm mt-2">
                  <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <Home className="w-5 h-5" />
                  </button>
                  <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </button>
                  <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={navigateToApp}
                className="w-full sm:w-auto px-10 py-5 rounded-full text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 flex items-center justify-center gap-2 group"
              >
                Launch Web App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </motion.div>
        </main>

        {/* Value Proposition / Benefits Section */}
        <div className="bg-[#09090b] text-slate-100">
          <section className="py-24 md:py-32 relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />
            
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              
              <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">
                  Experience Scripture Like Never Before
                </h2>
                <p className="text-lg md:text-xl text-slate-400 font-serif leading-relaxed">
                  LogosBridge bridges the gap between ancient manuscripts and modern understanding, crafted specifically to bring absolute clarity to the Word.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
                
                {/* Benefit 1 */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7 }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => setLightboxImage(benefitImg1)}
                >
                  <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 mb-6 group-hover:border-amber-500/50 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 relative">
                    <img src={benefitImg1} alt="Profound Clarity" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> Interlinear Study</h3>
                  <p className="text-slate-400 leading-relaxed font-serif text-lg">
                    Dive deep into the scriptures with our KJV-BSB Interlinear display, unpacking original Greek and Hebrew nuances effortlessly.
                  </p>
                </motion.div>

                {/* Benefit 2 */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => setLightboxImage(benefitImg2)}
                >
                  <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 mb-6 group-hover:border-amber-500/50 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 relative">
                    <img src={benefitImg2} alt="Word Scanner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-amber-400" /> Word Scanner</h3>
                  <p className="text-slate-400 leading-relaxed font-serif text-lg">
                    Quickly scan and analyze complex biblical terminology. Instantly reveal hidden theological depths and word roots right as you read.
                  </p>
                </motion.div>

                {/* Benefit 3 */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  className="flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => setLightboxImage(benefitImg3)}
                >
                  <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 mb-6 group-hover:border-amber-500/50 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 relative">
                    <img src={benefitImg3} alt="Seamless Engagement" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-amber-400" /> Tap-to-Reveal</h3>
                  <p className="text-slate-400 leading-relaxed font-serif text-lg">
                    Experience an interactive reading journey. Tap on key verses or symbols to reveal profound insights, study notes, and cosmic reflections.
                  </p>
                </motion.div>

              </div>
              
            </div>
            
            {/* Bottom Call to Action */}
            <div className="mt-20 pt-16 border-t border-slate-800/50 flex flex-col items-center text-center max-w-3xl mx-auto px-6">
              <h2 className="text-3xl font-black mb-8">Ready to begin your study?</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                
                {Capacitor.getPlatform() !== 'web' ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-2 animate-bounce">
                      <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">Enter App</span>
                      <div className="w-10 h-10 rounded-full bg-slate-900 shadow-xl shadow-amber-900/20 flex items-center justify-center ring-2 ring-slate-700">
                        <ArrowDown className="w-5 h-5 text-amber-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-full border border-slate-800 shadow-sm mt-2">
                      <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
                        <Home className="w-5 h-5" />
                      </button>
                      <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </button>
                      <button onClick={navigateToApp} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors">
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={navigateToApp}
                      className="group relative flex flex-col items-center gap-3"
                    >
                      <div className="w-20 h-20 rounded-full bg-slate-900 shadow-xl shadow-amber-900/20 flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all duration-300 ring-2 ring-slate-700 group-hover:ring-amber-500/50">
                        <ArrowRight className="w-8 h-8 text-amber-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <span className="text-sm font-bold tracking-widest text-slate-400 uppercase group-hover:text-amber-500 transition-colors">Enter App</span>
                    </button>
                    
                    <div className="hidden sm:block w-px h-16 bg-slate-800 mx-4"></div>
                    <div className="sm:hidden w-16 h-px bg-slate-800 my-2"></div>
                    
                    <button 
                      onClick={navigateToApp}
                      className="px-8 py-4 rounded-full text-lg font-bold bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-xl flex items-center gap-2 group"
                    >
                      Open Web App
                      <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </>
                )}

              </div>
            </div>

          </section>
        </div>
        {/* Footer / Contact Us */}
        <footer className="bg-black text-slate-400 py-16 border-t border-slate-800 relative z-10">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
            
            <div className="flex flex-col items-center md:items-start gap-4">
              <img src={bridgeOnBibleLogo} alt="LogosBridge" className="h-8 w-auto opacity-80" />
              <p className="text-sm font-serif max-w-sm text-center md:text-left">
                Empowering the global church with deep, accessible, and intuitive biblical study tools.
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-4">
              <h4 className="text-slate-100 font-bold tracking-wide">Need Help, Have a Feedback or Want to seed and partner with us on this Project</h4>
              <div className="flex items-center gap-4">
                <a href="mailto:logosbridgepsb@gmail.com" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-amber-900 hover:text-amber-400 transition-colors" title="Email Us">
                  <Mail className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors" title="Facebook (Coming Soon)">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors" title="Twitter (Coming Soon)">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors" title="Instagram (Coming Soon)">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors" title="YouTube (Coming Soon)">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
              <p className="text-xs text-slate-600 mt-2">&copy; {new Date().getFullYear()} LogosBridge. All rights reserved.</p>
            </div>

          </div>
        </footer>
      </div>

      {/* Lightbox for Images */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out backdrop-blur-sm"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightboxImage}
              alt="Enlarged view"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
