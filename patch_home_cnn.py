import re
import os

filepath = 'src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Image Imports
imports_to_add = """
import openBibleTableImg from './assets/images/open_bible_table.jpg';
import benefitImg1 from './assets/images/uploaded_image_1.png';
import benefitImg2 from './assets/images/uploaded_image_2.png';
import benefitImg3 from './assets/images/uploaded_image_3.png';
import liveScreenImg from './assets/images/live_screen_1.png';
import studioPreviewImg from './assets/images/studio_preview.png';
import silhouettePrayerImg from './assets/images/silhouette_prayer.jpg';
import { ChevronRight } from 'lucide-react';
"""

# Inject imports if not already there
if 'open_bible_table.jpg' not in content:
    # find the last import
    last_import_idx = content.rfind("import ")
    end_of_last_import = content.find(";", last_import_idx) + 1
    content = content[:end_of_last_import] + "\n" + imports_to_add + content[end_of_last_import:]

# 2. Replace the mainView === 'home' block
# Find the start of the block
start_marker = "{mainView === 'home' ? ("
end_marker = ") : mainView === 'interlinear' ? (() => {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find block markers!")
    exit(1)

new_home_block = """{mainView === 'home' ? (
  <div className={`w-full pb-32 animate-fade-in-up font-serif ${theme === 'light' ? 'bg-[#fdfdfd]' : 'bg-[#0a0a0a]'}`}>
    
    {/* HERO SECTION */}
    <div className="pt-16 pb-8 px-6 md:px-12 max-w-2xl mx-auto">
      <h1 className="text-[3.2rem] md:text-[4rem] leading-[1.05] font-black tracking-tight mb-8">
        <span className={`${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Bridge the gap<br/>between </span>
        <span className="text-[#f97316]">evidence<br/>and assurance.</span>
      </h1>
    </div>

    <div className="w-full max-w-4xl mx-auto mb-16">
       <img src={openBibleTableImg} alt="Open Bible" className="w-full h-auto object-cover" />
    </div>

    {/* CORE FEATURE */}
    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16 space-y-4">
      <div className="text-[#dc2626] font-sans font-bold text-sm tracking-[0.15em] uppercase">Core Feature</div>
      <h2 className={`text-3xl md:text-4xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Read & Compare</h2>
      <p className={`text-[1.25rem] md:text-[1.35rem] leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Immerse yourself in a distraction-free, dual-stream reading experience with instantly accessible translations.
      </p>
    </div>

    {/* TOOLS - WORD SCANNER */}
    <div className="w-full max-w-2xl mx-auto mb-10 px-6">
       <img src={benefitImg2} alt="Word Scanner snippet" className="w-full h-auto object-contain" />
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16 space-y-4">
      <div className="text-[#059669] font-sans font-bold text-sm tracking-[0.15em] uppercase">Tools</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Word Scanner</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        The core study engine. It dynamically scans verses and automatically shades dictionary words.
      </p>
    </div>
    
    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16">
       <div className={`w-full h-px ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
    </div>

    {/* QUICK ACCESS - TAP TO REVEAL */}
    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-8 space-y-4">
      <div className="text-[#6d28d9] font-sans font-bold text-sm tracking-[0.15em] uppercase">Quick Access</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Tap-to-Reveal</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Bridge the gap to original languages. Tap on translated words to instantly reveal their Hebrew or Greek origins.
      </p>
    </div>

    <div className="w-full max-w-2xl mx-auto mb-20 px-6">
       <img src={benefitImg3} alt="Tap to reveal definition" className="w-full h-auto object-contain shadow-lg rounded-xl border border-slate-100" />
    </div>

    {/* ORIGINAL TEXTS - INTERLINEAR */}
    <div className="w-full max-w-2xl mx-auto mb-10 px-6">
       <img src={benefitImg1} alt="Original manuscript" className={`w-full h-auto object-contain ${theme === 'light' ? 'mix-blend-multiply' : ''}`} />
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16 space-y-4">
      <div className="text-[#2563eb] font-sans font-bold text-sm tracking-[0.15em] uppercase">Original Texts</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Interlinear Study</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Dive deep into the original texts. Break down the manuscript line by line with lexical definitions.
      </p>
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16">
       <div className={`w-full h-px ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
    </div>

    {/* PROJECTION - LIVESCREEN */}
    <div className="w-full max-w-3xl mx-auto mb-10">
       <img src={liveScreenImg} alt="LiveScreen output" className="w-full h-auto object-cover" />
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-20 space-y-4">
      <div className="text-[#d97706] font-sans font-bold text-sm tracking-[0.15em] uppercase">Projection</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>LiveScreen</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Project your study seamlessly. Push beautiful, synchronized verses to an external display.
      </p>
    </div>

    {/* CONTROL - STUDIO PREVIEW */}
    <div className="w-full max-w-3xl mx-auto px-6 mb-10">
       <img src={studioPreviewImg} alt="Studio Preview Interface" className="w-full h-auto object-contain rounded-xl shadow-lg border border-slate-200/60" />
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-16 space-y-4">
      <div className="text-[#b45309] font-sans font-bold text-sm tracking-[0.15em] uppercase">Control</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Studio Preview</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Manage and monitor your presentation with the powerful built-in studio interface.
      </p>
    </div>

    {/* SPIRITUAL - SACRED DIALOGUE */}
    <div className="w-full max-w-3xl mx-auto mb-10">
       <img src={silhouettePrayerImg} alt="Sacred Dialogue" className="w-full h-auto object-cover" />
    </div>

    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-20 space-y-4">
      <div className="text-[#9333ea] font-sans font-bold text-sm tracking-[0.15em] uppercase">Spiritual</div>
      <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${theme === 'light' ? 'text-[#0f172a]' : 'text-slate-100'}`}>Sacred Dialogue</h2>
      <p className={`text-lg md:text-xl leading-relaxed ${theme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
        Engage in a personalized conversational connection with God. Turn scriptures into prayer.
      </p>
    </div>

    {/* DAILY BREAD CARD */}
    <div className="px-6 md:px-12 max-w-2xl mx-auto mb-8">
       <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-[2rem] p-8 md:p-10 shadow-2xl border border-slate-700/50 relative overflow-hidden">
         <div className="flex items-center space-x-2 text-[#fbbf24] mb-8 font-sans">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
           <span className="font-bold tracking-[0.2em] text-[10px] uppercase">Daily Bread</span>
         </div>
         
         <p className="text-[#f8fafc] text-2xl md:text-3xl font-serif leading-snug mb-8">
           "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee."
         </p>
         
         <div className="flex items-center justify-between mb-12">
           <div>
             <div className="text-[#fbbf24] tracking-[0.2em] text-[10px] font-bold font-sans uppercase mb-1">Deuteronomy</div>
             <div className="text-[#fbbf24] text-sm font-sans font-medium">31:6</div>
           </div>
           <button 
             onClick={() => setMainView('read')}
             className="px-6 py-2 rounded-full border border-[#fbbf24]/30 text-[#fbbf24] text-xs tracking-widest font-bold uppercase hover:bg-[#fbbf24]/10 transition-colors"
           >
             Read
           </button>
         </div>

         {/* Progress Card Inside Daily Bread */}
         <div className="bg-[#0f172a] rounded-3xl p-6 border border-slate-700/50 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-300 text-[10px] font-bold tracking-[0.2em] uppercase font-sans">Study Progress</span>
              <span className="text-[#fbbf24] text-sm font-bold font-sans">42%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
              <div className="bg-[#fbbf24] h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
            <button 
              onClick={() => setMainView('read')}
              className="w-full bg-white text-[#0f172a] rounded-xl py-4 font-bold text-[15px] font-sans hover:bg-slate-100 transition-colors shadow-lg active:scale-[0.98]"
            >
              Continue Reading
            </button>
         </div>
       </div>
    </div>

    {/* CONTACT CARD */}
    <div className="px-6 md:px-12 max-w-2xl mx-auto pb-10">
       <div className="bg-[#fffbeb] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#fef3c7]">
          <h3 className="text-[#78350f] text-2xl font-bold mb-3 font-sans">Need Help,Have a feedback or want to Seed and Partner with us on this Project mission</h3>
          <p className="text-[#92400e] text-base mb-8 font-sans">
            We'd love to hear from you. Reach out to our team directly.
          </p>
          <button className="w-full bg-[#f59e0b] text-white rounded-xl py-4 font-bold text-[15px] font-sans flex items-center justify-center space-x-2 shadow-md hover:bg-[#d97706] transition-colors active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span>Contact Us</span>
          </button>
       </div>
    </div>
  </div>
"""

new_content = content[:start_idx] + new_home_block + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully replaced mainView === 'home' block in App.tsx")
