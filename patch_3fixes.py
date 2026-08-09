"""
Patch for 3 issues:
1. FABs not sliding in/out in dual-stream (use onScroll on column divs)
2. Dual-stream toggle can't switch back to single mode
3. Disable translation menu FAB in interlinear view
"""

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

changes = 0

# ============================================================
# FIX 1: FABs not sliding in/out in dual-stream mode
# Instead of querySelector (which has timing issues), add a 
# handleColumnScroll callback and use onScroll on the column divs
# ============================================================

# First, add a handleColumnScroll callback near the scroll listener area
# Insert it right after the scrollContainerRef line
scroll_ref_target = "const scrollContainerRef = useRef<HTMLDivElement>(null);"
scroll_ref_repl = """const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track last scroll position for dual-stream columns
  const columnLastScrollRef = useRef<number>(0);
  const handleColumnScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const lastScroll = columnLastScrollRef.current;
    if (scrollTop <= 20) {
      setIsHeaderHidden(false);
      setIsSidePanelHidden(false);
    } else if (scrollTop > lastScroll && Math.abs(scrollTop - lastScroll) >= 5) {
      setIsHeaderHidden(true);
      setIsSidePanelHidden(true);
    } else if (scrollTop < lastScroll && Math.abs(scrollTop - lastScroll) >= 5) {
      setIsHeaderHidden(false);
      setIsSidePanelHidden(false);
    }
    columnLastScrollRef.current = scrollTop > 0 ? scrollTop : 0;
  };"""
if scroll_ref_target in code:
    code = code.replace(scroll_ref_target, scroll_ref_repl)
    changes += 1
    print("FIX 1a: Added handleColumnScroll callback")
else:
    print("WARNING: Could not find scrollContainerRef for FIX 1a")

# Now add onScroll={handleColumnScroll} to all 4 dual-stream column divs
# They all have onClick={() => setActiveDualColumn('left')} or 'right'
# Paragraph layout left column
old_left_para = """<div 
                            onClick={() => setActiveDualColumn('left')}
                            className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 rounded-2xl ${activeDualColumn === 'left' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                          >
                            {renderNarrativeStream(dualStreamLeft, undefined, 'left')}"""
new_left_para = """<div 
                            onClick={() => setActiveDualColumn('left')}
                            onScroll={handleColumnScroll}
                            className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 rounded-2xl ${activeDualColumn === 'left' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                          >
                            {renderNarrativeStream(dualStreamLeft, undefined, 'left')}"""
if old_left_para in code:
    code = code.replace(old_left_para, new_left_para)
    changes += 1
    print("FIX 1b: Added onScroll to paragraph left column")

# Paragraph layout right column
old_right_para = """<div 
                            onClick={() => setActiveDualColumn('right')}
                            className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 rounded-2xl ${activeDualColumn === 'right' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                          >
                            {renderNarrativeStream(dualStreamRight, undefined, 'right')}"""
new_right_para = """<div 
                            onClick={() => setActiveDualColumn('right')}
                            onScroll={handleColumnScroll}
                            className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 rounded-2xl ${activeDualColumn === 'right' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                          >
                            {renderNarrativeStream(dualStreamRight, undefined, 'right')}"""
if old_right_para in code:
    code = code.replace(old_right_para, new_right_para)
    changes += 1
    print("FIX 1c: Added onScroll to paragraph right column")

# Verse card layout left column
old_left_card = """<div 
                              onClick={() => setActiveDualColumn('left')}
                              className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative rounded-2xl ${activeDualColumn === 'left' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                            >
                              {chapterData.verses.map(v => renderVerseCard(v, dualStreamLeft))}"""
new_left_card = """<div 
                              onClick={() => setActiveDualColumn('left')}
                              onScroll={handleColumnScroll}
                              className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative rounded-2xl ${activeDualColumn === 'left' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                            >
                              {chapterData.verses.map(v => renderVerseCard(v, dualStreamLeft))}"""
if old_left_card in code:
    code = code.replace(old_left_card, new_left_card)
    changes += 1
    print("FIX 1d: Added onScroll to verse-card left column")

# Verse card layout right column
old_right_card = """<div 
                              onClick={() => setActiveDualColumn('right')}
                              className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative rounded-2xl ${activeDualColumn === 'right' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                            >
                              {chapterData.verses.map(v => renderVerseCard(v, dualStreamRight))}"""
new_right_card = """<div 
                              onClick={() => setActiveDualColumn('right')}
                              onScroll={handleColumnScroll}
                              className={`dual-stream-column w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto pb-32 h-full scroll-smooth transition-all ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative rounded-2xl ${activeDualColumn === 'right' ? 'ring-2 ring-cyan-500/50' : 'opacity-80'}`}
                            >
                              {chapterData.verses.map(v => renderVerseCard(v, dualStreamRight))}"""
if old_right_card in code:
    code = code.replace(old_right_card, new_right_card)
    changes += 1
    print("FIX 1e: Added onScroll to verse-card right column")

# ============================================================
# FIX 2: Dual-stream toggle can't switch back to single mode
# Make the button toggle: if already 'both', switch back to 'kjv'
# ============================================================
old_toggle = """onClick={() => {
                              setTranslationDisplayMode('both');
                              localStorage.setItem('personalized_bible_translation_display_mode', 'both');
                              playWebAudioBeep(520, 'sine', 0.05);
                            }}"""
new_toggle = """onClick={() => {
                              if (translationDisplayMode === 'both') {
                                setTranslationDisplayMode(dualStreamLeft);
                                localStorage.setItem('personalized_bible_translation_display_mode', dualStreamLeft);
                              } else {
                                setTranslationDisplayMode('both');
                                localStorage.setItem('personalized_bible_translation_display_mode', 'both');
                              }
                              playWebAudioBeep(520, 'sine', 0.05);
                            }}"""
if old_toggle in code:
    code = code.replace(old_toggle, new_toggle)
    changes += 1
    print("FIX 2: Made dual-stream toggle bidirectional (on/off)")
else:
    print("WARNING: Could not find dual-stream toggle for FIX 2")

# ============================================================
# FIX 3: Disable translation menu FAB in interlinear view
# Wrap the Translation Selector div with a condition
# ============================================================
old_trans_fab = """{/* Translation Selector */}
                <div 
                  className="flex items-center px-1 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-1"
                >"""
new_trans_fab = """{/* Translation Selector - hidden in interlinear view */}
                {mainView !== 'interlinear' && (<div 
                  className="flex items-center px-1 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-1"
                >"""
if old_trans_fab in code:
    code = code.replace(old_trans_fab, new_trans_fab)
    changes += 1
    print("FIX 3a: Added interlinear guard to translation FAB opening")
else:
    print("WARNING: Could not find translation FAB for FIX 3a")

# Close the conditional - find the closing </div> of the Translation Selector
# The translation selector ends at line ~3068 with </div>
# Looking for the pattern:         </div>
#              </div>    (this is the FAB container closing)
old_trans_close = """                  <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>"""
new_trans_close = """                  <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>)}"""
if old_trans_close in code:
    code = code.replace(old_trans_close, new_trans_close)
    changes += 1
    print("FIX 3b: Closed interlinear conditional for translation FAB")
else:
    print("WARNING: Could not find translation FAB closing for FIX 3b")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print(f"\nDone! Applied {changes} changes.")
