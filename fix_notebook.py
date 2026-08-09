import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update notebook trigger 1
trigger1 = """                        openContextualNotebook={(vNo) => {
                           setMainView('notebook');
                           setActiveNotebookVerse(vNo);
                        }}"""
trigger1_new = """                        openContextualNotebook={(vNo) => {
                           setMainView('notebook');
                           setActiveNotebookVerse(vNo);
                           setNoteDraftText(getVerseHighlight(vNo)?.notes || '');
                        }}"""
content = content.replace(trigger1, trigger1_new)

# 2. Update notebook trigger 2
trigger2 = """                                onClick={(e) => { e.stopPropagation(); setMainView('notebook'); setActiveNotebookVerse(v.verseNumber); }}"""
trigger2_new = """                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setMainView('notebook'); 
                                  setActiveNotebookVerse(v.verseNumber); 
                                  setNoteDraftText(getVerseHighlight(v.verseNumber)?.notes || '');
                                }}"""
content = content.replace(trigger2, trigger2_new)

# 3. Update notebook view HTML
notebook_html_old = """                            {/* Header */}
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
                               ></textarea>
                            </div>"""

notebook_html_new = """                            {/* Header */}
                            <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/50 bg-slate-900/50'}`}>
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => setMainView('read')}
                                  className={`p-2 rounded-full transition-all ${theme === 'light' ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'}`}
                                  title="Return to Read View"
                                >
                                  <ArrowLeft className="w-6 h-6" />
                                </button>
                                <div>
                                  <h2 className={`text-2xl font-serif font-black tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>Make a note to the Verse</h2>
                                  <p className={`text-sm mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Premium distraction-free study environment.</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  if (activeNotebookVerse !== null) {
                                    handleSaveNote(activeNotebookVerse);
                                    setMainView('read');
                                  }
                                }}
                                className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all ${theme === 'light' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-900 hover:bg-slate-200'}`}
                              >
                                Save Note
                              </button>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 p-8">
                               <textarea 
                                 value={noteDraftText}
                                 onChange={(e) => setNoteDraftText(e.target.value)}
                                 className={`w-full h-full resize-none font-serif text-lg leading-loose focus:outline-none bg-transparent ${theme === 'light' ? 'text-slate-700 placeholder:text-slate-300' : 'text-slate-300 placeholder:text-slate-700'}`}
                                 placeholder="Begin writing your reflections, sermon notes, or deep study thoughts here..."
                               ></textarea>
                            </div>"""

content = content.replace(notebook_html_old, notebook_html_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Notebook UI.")
