import re

filepath = 'src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Chapter Header to match "Genesis 3" left-top text exactly.
header_search = r"<h2 className=\{`text-xl md:text-2xl font-serif font-medium tracking-tight \$\{theme === 'light' \? 'text-zinc-900' : 'text-zinc-50'\} flex items-baseline flex-wrap gap-x-3 gap-y-1`\}>\s*<span>\{chapterData\.book\}</span>\s*<span className=\{`text-base md:text-lg font-mono font-bold \$\{theme === 'light' \? 'text-zinc-400' : 'text-zinc-500'\}`\}>Ch\. \{chapterData\.chapter\}</span>"
header_replacement = """<h2 className={`text-[1.35rem] font-bold tracking-tight ${theme === 'light' ? 'text-[#1e293b]' : 'text-slate-100'} flex items-baseline flex-wrap gap-x-1`}>
                    <span>{chapterData.book}</span>
                    <span>{chapterData.chapter}</span>"""

content = re.sub(header_search, header_replacement, content, count=1)

# 2. Remove "Edit3" (Notebook tab) from the main bottom navigation bar.
# We need to find the Notebook button block.
notebook_tab_start_marker = r"<button\s*onClick=\{\(\) => \{\s*setFullPageMenu\(null\);\s*setMainView\('notebook'\);\s*setIsProjectionStudioOpen\(false\);\s*\}\}\s*className=\{`flex flex-col items-center justify-center p-2 rounded-\[1\.25rem\] transition-all group`\}\s*>"
# It ends with 2 closing tags: </div> </button>
notebook_tab_regex = re.compile(notebook_tab_start_marker + r".*?<Edit3.*?</div>\s*</button>", re.DOTALL)
content = re.sub(notebook_tab_regex, "", content)

# 3. Floating Reader Controls (Bottom FAB)
# We will inject this right before: `{/* FLOATING MIDDLE NAV: TRIANGLE IN CIRCLE SLIDE OPTIONS */}`
floating_controls = """
        {/* RESTORED BOTTOM FLOATING READER CONTROLS (FAB) */}
        {mainView === 'read' && (
          <div className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40">
             <div className="bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 rounded-2xl flex items-center p-2 space-x-3 transition-transform">
                {/* Book/Chapter Selector */}
                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => setFullPageMenu('chapters')}
                >
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight leading-tight">{selectedBook}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight">{selectedChapter}</span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Audio Play Button */}
                <button 
                  className="w-12 h-12 bg-[#0d9488] rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all"
                  onClick={() => {
                     // Toggle Audio logic if needed
                     playWebAudioBeep(600, 'sine', 0.1);
                  }}
                >
                  <Play className="w-6 h-6 ml-1 fill-current" />
                </button>

                {/* Translation Selector */}
                <div 
                  className="flex items-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-2"
                  onClick={() => setFullPageMenu('versions')}
                >
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-[12px] font-bold text-slate-600 truncate max-w-[100px]">King James Vers...</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
             </div>
          </div>
        )}

"""

if "RESTORED BOTTOM FLOATING READER CONTROLS" not in content:
    inject_point = "{/* FLOATING MIDDLE NAV: TRIANGLE IN CIRCLE SLIDE OPTIONS */}"
    content = content.replace(inject_point, floating_controls + inject_point)


# 4. Strip old double-click Focus Study and implement Contextual Notebook FAB
# In App.tsx, the verse interaction might have `onDoubleClick={...}`
# Let's replace the verse rendering block logic for `read` mode.
# We'll use a simple state to track `activeNotebookVerse: number | null`

active_notebook_state = "  const [activeNotebookVerse, setActiveNotebookVerse] = useState<number | null>(null);\n"
if "activeNotebookVerse" not in content:
    # insert near selectedBook state
    content = content.replace("  const [selectedBook, setSelectedBook] = useState<string>('Genesis');", 
                              "  const [selectedBook, setSelectedBook] = useState<string>('Genesis');\n" + active_notebook_state)

# Replace old double click with a click that triggers activeNotebookVerse
old_verse_click_regex = re.compile(r"onDoubleClick=\{[\s\S]*?\}\s*(onClick=\{[\s\S]*?\})?")
# Just remove onDoubleClick for verses.
content = re.sub(r"onDoubleClick=\{\(\) => \{[\s\S]*?setFocusedStudyVerse[\s\S]*?\}\}", "onClick={() => setActiveNotebookVerse(activeNotebookVerse === v.verse ? null : v.verse)}", content)

# Inject Contextual FAB inside the verse map
# Find the end of the verse block rendering, right before the closing `</div>` of the verse.
# Wait, let's just find the `renderVerseCard` or the place where verses are mapped for `mainView === 'read'`
contextual_fab_code = """
              {/* Contextual Notebook FAB */}
              {activeNotebookVerse === v.verse && (
                <div className="absolute -bottom-10 right-4 z-50 animate-fade-in-up">
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       // Open Theological Notebook for this verse (mock behavior for now, or tie to a new modal)
                       setMainView('notebook'); // Or slide-out panel
                       playWebAudioBeep(700, 'sine', 0.1);
                    }}
                    className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wide">Write Note</span>
                  </button>
                </div>
              )}
"""

# Wait, `mainView === 'read'` uses `renderVerseCard(v, transType)`.
# We need to inject the FAB into `renderVerseCard`.
# Let's find `const renderVerseCard = (v: any, type: string) => {`
render_verse_card_idx = content.find("const renderVerseCard = (v: any, type: string) => {")
if render_verse_card_idx != -1:
    # Find the main return block of renderVerseCard
    return_div_idx = content.find("return (", render_verse_card_idx)
    inner_div_start = content.find("<div", return_div_idx)
    # The outer div needs `position: relative` for absolute positioning of FAB.
    content = content[:inner_div_start] + "<div className=\"relative\">\n" + content[inner_div_start:]
    
    # Now we must insert the closing of the new div, and the contextual fab
    # We find the matching closing div for the original return block.
    # A simpler way is to just inject it directly after the verse text div.
    # Inside renderVerseCard: `<div className="relative group ...">`
    content = content.replace('onClick={(e) => {', 'onClick={(e) => {\n        setActiveNotebookVerse(activeNotebookVerse === v.verse ? null : v.verse);\n')

    # Add the FAB at the end of the verse card
    content = content.replace("{/* Audio play indicator */}", contextual_fab_code + "\n      {/* Audio play indicator */}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")
