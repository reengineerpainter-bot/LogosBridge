"""
Patch: Inline Notebook & Highlight Palette Redesign
1. Center color palette above verse
2. Change notebook icon to inline editing (not full page)
3. Add inline reply bubble below verse text
4. Remove full-page notebook view
5. Remove bottom drawer
"""

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

changes = 0

# ============================================================
# 1. CENTER THE COLOR PALETTE
# Change from absolute -right-3 -top-3 to centered above
# ============================================================
old_palette_pos = '<div className={`absolute -right-3 -top-3 z-50 flex items-center gap-2 animate-fade-in-up ${isHeaderHidden ? \'opacity-0 scale-75 pointer-events-none\' : \'opacity-100 scale-100\'}`}>'
new_palette_pos = '<div className={`absolute left-1/2 -translate-x-1/2 -top-8 z-50 flex items-center gap-2 animate-fade-in-up ${isHeaderHidden ? \'opacity-0 scale-75 pointer-events-none\' : \'opacity-100 scale-100\'}`}>'
if old_palette_pos in code:
    code = code.replace(old_palette_pos, new_palette_pos)
    changes += 1
    print("1. Centered color palette above verse")
else:
    print("WARNING: Could not find palette position")

# ============================================================
# 2. CHANGE NOTEBOOK FAB CLICK — Stay on read view, use inline editing
# ============================================================
old_notebook_click = """onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setMainView('notebook'); 
                                  setActiveNotebookVerse(v.verseNumber); 
                                  setNoteDraftText(getVerseHighlight(v.verseNumber)?.notes || '');
                                }}"""
new_notebook_click = """onClick={(e) => { 
                                  e.stopPropagation(); 
                                  startEditingNote(v.verseNumber, getVerseHighlight(v.verseNumber)?.notes || '');
                                  // Auto-close the focus palette
                                  setFocusedVerse(null);
                                  setFocusedStreamType(null);
                                }}"""
if old_notebook_click in code:
    code = code.replace(old_notebook_click, new_notebook_click)
    changes += 1
    print("2. Changed notebook FAB to inline editing")
else:
    print("WARNING: Could not find notebook FAB click handler")

# ============================================================
# 3. ADD INLINE REPLY BUBBLE below the verse text content
# Insert it after the Right Content Body div, before the verse card closing </div>
# ============================================================
old_verse_body_end = """                              {/* Right Content Body */}
                              <div className="flex flex-col w-full flex-1">
                                <div className={`${getScriptureStyleClasses()} ${fontClasses} leading-[1.8] tracking-[0.01em] ${
                                  'text-[18px]'
                                } ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                  {textContent}
                                </div>
                              </div>
                              
                          
                            </div>"""
new_verse_body_end = """                              {/* Right Content Body */}
                              <div className="flex flex-col w-full flex-1">
                                <div className={`${getScriptureStyleClasses()} ${fontClasses} leading-[1.8] tracking-[0.01em] ${
                                  'text-[18px]'
                                } ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                  {textContent}
                                </div>

                                {/* Inline Note Reply Bubble */}
                                {activeDraftVerse === v.verseNumber && (
                                  <div className={`mt-3 rounded-2xl border shadow-lg overflow-hidden animate-fade-in-up ${
                                    theme === 'light' 
                                      ? 'bg-white border-slate-200' 
                                      : 'bg-[#0f1420] border-slate-700'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Note Header */}
                                    <div className={`flex items-center justify-between px-3 py-2 ${
                                      theme === 'light' ? 'bg-gradient-to-r from-emerald-50 to-cyan-50 border-b border-slate-100' : 'bg-gradient-to-r from-emerald-950/40 to-cyan-950/30 border-b border-slate-700/50'
                                    }`}>
                                      <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                        📝 Verse {v.verseNumber} — Note
                                      </span>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCancelNote(); }}
                                        className={`p-1 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-700 text-slate-400'}`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {/* Note Input Area */}
                                    <div className="px-3 py-2">
                                      <textarea
                                        value={noteDraftText}
                                        onChange={(e) => setNoteDraftText(e.target.value)}
                                        placeholder="Write your reflection..."
                                        autoFocus
                                        rows={2}
                                        className={`w-full text-sm resize-none rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${
                                          theme === 'light'
                                            ? 'bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-emerald-400 border border-slate-200'
                                            : 'bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:ring-emerald-500/50 border border-slate-700'
                                        }`}
                                      />
                                    </div>
                                    {/* Note Actions */}
                                    <div className={`flex items-center justify-between px-3 py-2 ${
                                      theme === 'light' ? 'border-t border-slate-100' : 'border-t border-slate-700/50'
                                    }`}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleCancelNote(); }}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                          theme === 'light' ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-700'
                                        }`}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveNote(v.verseNumber); }}
                                        className="text-xs font-bold px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                                      >
                                        💾 Save
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                          
                            </div>"""
if old_verse_body_end in code:
    code = code.replace(old_verse_body_end, new_verse_body_end)
    changes += 1
    print("3. Added inline reply bubble below verse text")
else:
    print("WARNING: Could not find verse body end pattern")

# ============================================================
# 4. REMOVE FULL-PAGE NOTEBOOK VIEW
# The notebook view is a ternary branch: mainView === 'notebook' ? (...)
# Replace it to skip directly to the layout modes
# ============================================================
old_notebook_view = """})() : mainView === 'notebook' ? (() => {
                     return (
                       <div className="p-6 md:p-10 max-w-4xl mx-auto pb-32 h-[80vh] flex flex-col animate-fade-in-up">
                         <div className={`flex-1 rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0c111c] border-slate-800'}`}>
                            
                            {/* Header */}
                            <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/50 bg-slate-900/50'}`}>
                              <div>
                                <h2 className={`text-2xl font-serif font-black tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>Theological Notebook</h2>
                                <p className={`text-sm mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Premium distraction-free study environment.</p>
                              </div>
                              <button className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all ${theme === 'light' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-900 hover:bg-slate-200'}`}>
                                Save Note
                              </button>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 p-8">
                               <textarea 
                                 className={`w-full h-full resize-none font-serif text-lg leading-loose focus:outline-none bg-transparent ${theme === 'light' ? 'text-slate-700 placeholder:text-slate-300' : 'text-slate-300 placeholder:text-slate-700'}`}
                                 placeholder="Begin writing your reflections, sermon notes, or deep study thoughts here..."
                               />
                            </div>
                         </div>
                       </div>
                     );
                  })() : layoutMode === 'paragraph'"""
new_notebook_view = """})() : layoutMode === 'paragraph'"""
if old_notebook_view in code:
    code = code.replace(old_notebook_view, new_notebook_view)
    changes += 1
    print("4. Removed full-page notebook view")
else:
    print("WARNING: Could not find full-page notebook view")

# ============================================================
# 5. REMOVE BOTTOM DRAWER
# ============================================================
old_bottom_drawer = """      {/* Deep Journaling Bottom Drawer */}
      {activeDraftVerse !== null && (
        <div className={`fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 border-t shadow-2xl animate-fade-in-up ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold font-sans flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                <StarryCradleIcon className="w-5 h-5" active={true} />
                Deep Theological Journaling — Verse {activeDraftVerse}
              </h3>
              <button onClick={handleCancelNote} className={`p-1.5 rounded-full hover:bg-slate-500/10 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteDraftText}
              onChange={(e) => setNoteDraftText(e.target.value)}
              placeholder="Write down personal theological reflections or spiritual notes connected with this verse..."
              className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                theme === 'light'
                  ? 'bg-slate-50 text-slate-800 border-slate-200'
                  : 'bg-slate-900/50 text-slate-100 border-cyan-900/40'
              }`}
              rows={4}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end space-x-3">
              <button
                onClick={handleCancelNote}
                className={`text-sm uppercase font-mono tracking-wider font-extrabold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveNote(activeDraftVerse)}
                className="text-sm uppercase font-mono tracking-wider font-extrabold px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors cursor-pointer"
              >
                💾 Save Entry
              </button>
            </div>
          </div>
        </div>
      )}"""
if old_bottom_drawer in code:
    code = code.replace(old_bottom_drawer, "")
    changes += 1
    print("5. Removed bottom drawer")
else:
    print("WARNING: Could not find bottom drawer")

# ============================================================
# 6. Also update NarrativeStream's openContextualNotebook to use inline
# ============================================================
old_narrative_notebook = """openContextualNotebook={(vNo) => {
                           setMainView('notebook');
                           setActiveNotebookVerse(vNo);
                           setNoteDraftText(getVerseHighlight(vNo)?.notes || '');
                        }}"""
new_narrative_notebook = """openContextualNotebook={(vNo) => {
                           startEditingNote(vNo, getVerseHighlight(vNo)?.notes || '');
                        }}"""
if old_narrative_notebook in code:
    code = code.replace(old_narrative_notebook, new_narrative_notebook)
    changes += 1
    print("6. Updated NarrativeStream openContextualNotebook to inline")
else:
    print("WARNING: Could not find NarrativeStream openContextualNotebook")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print(f"\nDone! Applied {changes} changes.")
