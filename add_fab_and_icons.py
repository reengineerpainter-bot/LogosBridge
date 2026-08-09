import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Library/Settings block at the top right
fixed_nav_pattern = """      {/* FLOATING PILL BOTTOM NAVIGATION BAR */}"""
library_settings_block = """      {/* FIXED TOP RIGHT NAV: LIBRARY & SETTINGS */}
      {mainView !== 'home' && mainView !== 'interlinear' && (
        <div className={`fixed top-3 right-4 z-[1050] flex items-center gap-2 p-1.5 rounded-2xl shadow-lg backdrop-blur-xl transition-all duration-500 ease-in-out ${theme === 'light' ? 'bg-white/80 border border-slate-200' : 'bg-slate-900/80 border border-slate-800'} ${isHeaderHidden ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <button
            onClick={() => {
              setFullPageMenu('versions');
              playWebAudioBeep(440, 'sine', 0.05);
            }}
            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 group ${theme === 'light' ? 'text-slate-700 hover:text-cyan-600 hover:bg-white' : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'}`}
            title="Library"
          >
            <Library className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
          <button
            onClick={() => {
              setFullPageMenu('settings');
              playWebAudioBeep(440, 'sine', 0.05);
            }}
            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 group ${theme === 'light' ? 'text-slate-700 hover:text-cyan-600 hover:bg-white' : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'}`}
            title="Settings"
          >
            <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      )}

      {/* FLOATING PILL BOTTOM NAVIGATION BAR */}"""

if fixed_nav_pattern in content:
    content = content.replace(fixed_nav_pattern, library_settings_block)
    print("Added Library/Settings icon block.")
else:
    print("Library/Settings insertion point not found.")

# 2. Add colorPickerFab next to notebookFab
notebook_fab_pattern = """                          // CONTEXTUAL NOTEBOOK FAB
                          const notebookFab = isFocused ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setMainView('notebook'); setActiveNotebookVerse(v.verseNumber); }}
                              className={`absolute -right-3 -top-3 z-50 p-2 rounded-full shadow-xl transition-all duration-300 animate-fade-in-up ${theme === 'light' ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'} ${isHeaderHidden ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
                              title="Open Theological Notebook for this verse"
                            >
                              <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            </button>
                          ) : null;"""

notebook_fab_with_color_picker = """                          // CONTEXTUAL NOTEBOOK FAB
                          const notebookFab = isFocused ? (
                            <div className={`absolute -right-3 -top-3 z-50 flex items-center gap-2 animate-fade-in-up ${isHeaderHidden ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}>
                              {/* Color Picker */}
                              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full shadow-xl transition-all duration-300 ${theme === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-800 border border-slate-700'}`}>
                                {['yellow', 'green', 'blue', 'pink'].map(color => (
                                  <button
                                    key={color}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        if (next[vId] === color) delete next[vId];
                                        else next[vId] = color;
                                        return next;
                                      });
                                    }}
                                    className={`w-5 h-5 rounded-full shadow-sm hover:scale-110 transition-transform ${
                                      color === 'yellow' ? 'bg-yellow-400 hover:bg-yellow-300' :
                                      color === 'green' ? 'bg-green-400 hover:bg-green-300' :
                                      color === 'blue' ? 'bg-blue-400 hover:bg-blue-300' :
                                      'bg-pink-400 hover:bg-pink-300'
                                    }`}
                                    title={`Highlight ${color}`}
                                  />
                                ))}
                                {highlightedVerses[`${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`] && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        delete next[vId];
                                        return next;
                                      });
                                    }}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-slate-400'}`}
                                    title="Remove Highlight"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMainView('notebook'); setActiveNotebookVerse(v.verseNumber); }}
                                className={`p-2 rounded-full shadow-xl transition-all duration-300 ${theme === 'light' ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
                                title="Open Theological Notebook for this verse"
                              >
                                <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                              </button>
                            </div>
                          ) : null;"""

if notebook_fab_pattern in content:
    content = content.replace(notebook_fab_pattern, notebook_fab_with_color_picker)
    print("Added Color Picker next to notebook FAB.")
else:
    print("Notebook FAB pattern not found.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
