import re
import os

app_path = r'c:\Users\PEEDEE\Downloads\LogosBridge-main\LogosBridge-main\src\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
import_replacement = """import appLogoNew from './assets/images/app_logo_1781168399204.png';
import benefitImg1 from './assets/images/uploaded_image_1.png';
import benefitImg2 from './assets/images/uploaded_image_2.png';
import benefitImg3 from './assets/images/uploaded_image_3.png';"""
content = content.replace("import appLogoNew from './assets/images/app_logo_1781168399204.png';", import_replacement)

# 2. Lightbox state
state_replacement = """  const [mainView, setMainView] = useState<'home' | 'read' | 'interlinear' | 'prayer'>('home');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);"""
content = content.replace("  const [mainView, setMainView] = useState<'home' | 'read' | 'interlinear' | 'prayer'>('home');", state_replacement)

# 3. Lightbox rendering
lightbox_ui = """      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="Expanded View" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-fade-in-up" />
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main Container */}
"""
content = content.replace("      {/* Main Container */}\n", lightbox_ui)

# 4. Replace the 3 cards
cards_regex = r'<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">.*?</p>\s*</div>\s*</div>'
cards_replacement = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {/* Interlinear Card */}
                        <div 
                          onClick={() => setLightboxImage(benefitImg1)}
                          className={`relative overflow-hidden rounded-3xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 shadow-lg border border-emerald-500/20 group`}
                        >
                          <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
                            <img src={benefitImg1} alt="Interlinear Study" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          </div>
                          <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>Interlinear Study</h3>
                          <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                            Dive deep into the scriptures with our KJV-BSB Interlinear display, unpacking original Greek and Hebrew nuances effortlessly.
                          </p>
                        </div>

                        {/* Word Scanner Card */}
                        <div 
                          onClick={() => setLightboxImage(benefitImg2)}
                          className={`relative overflow-hidden rounded-3xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 shadow-lg border border-amber-500/20 group`}
                        >
                          <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
                            <img src={benefitImg2} alt="Word Scanner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          </div>
                          <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>Word Scanner</h3>
                          <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                            Quickly scan and analyze complex biblical terminology. Instantly reveal hidden theological depths and word roots.
                          </p>
                        </div>

                        {/* Tap-to-Reveal Card */}
                        <div 
                          onClick={() => setLightboxImage(benefitImg3)}
                          className={`relative overflow-hidden rounded-3xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 shadow-lg border border-blue-500/20 group`}
                        >
                          <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
                            <img src={benefitImg3} alt="Tap-to-Reveal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          </div>
                          <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>Tap-to-Reveal</h3>
                          <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                            Experience an interactive reading journey. Tap on key verses to reveal profound insights and study notes.
                          </p>
                        </div>
                      </div>"""
content = re.sub(cards_regex, cards_replacement, content, flags=re.DOTALL)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)
