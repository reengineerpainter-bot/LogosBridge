import re
import os

app_file = 'src/App.tsx'
ns_file = 'src/components/NarrativeStream.tsx'

with open(ns_file, 'r', encoding='utf-8') as f:
    ns_content = f.read()

# NarrativeStream.tsx modifications
# Add props
props_pattern = """  getVerseHighlight: (verseNo: number) => VerseHighlight | undefined;
  stopSpeaking: () => void;
}"""
props_new = """  getVerseHighlight: (verseNo: number) => VerseHighlight | undefined;
  stopSpeaking: () => void;
  getVerseHighlightColor?: (verseNo: number) => string | undefined;
  setVerseHighlightColor?: (verseNo: number, color: string) => void;
  openContextualNotebook?: (verseNo: number) => void;
}"""
ns_content = ns_content.replace(props_pattern, props_new)

destruct_pattern = """  getVerseHighlight,
  stopSpeaking,
  isHeaderHidden = false,"""
destruct_new = """  getVerseHighlight,
  stopSpeaking,
  getVerseHighlightColor,
  setVerseHighlightColor,
  openContextualNotebook,
  isHeaderHidden = false,"""
ns_content = ns_content.replace(destruct_pattern, destruct_new)

# Add highlight logic
highlight_class_pattern = """                  let highlightClasses = '';
                  if (isFocused) {"""
highlight_class_new = """                  const hColor = getVerseHighlightColor?.(v.verseNumber);
                  let highlightClasses = '';
                  if (hColor === 'yellow') highlightClasses += (theme === 'light' ? 'bg-yellow-100/80 ' : 'bg-yellow-900/50 ');
                  else if (hColor === 'green') highlightClasses += (theme === 'light' ? 'bg-green-100/80 ' : 'bg-green-900/50 ');
                  else if (hColor === 'blue') highlightClasses += (theme === 'light' ? 'bg-blue-100/80 ' : 'bg-blue-900/50 ');
                  else if (hColor === 'pink') highlightClasses += (theme === 'light' ? 'bg-pink-100/80 ' : 'bg-pink-900/50 ');

                  if (isFocused) {"""
ns_content = ns_content.replace(highlight_class_pattern, highlight_class_new)

# Add the popup
popup_pattern = """{focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-max">
                  {/* Old focus study features removed */}"""
popup_new = """{focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-max">
                  {/* Restored Color Picker and Notebook FAB for single-column views */}
                  <div className="flex items-center gap-2">
                    {/* Color Picker */}
                    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full shadow-xl transition-all duration-300 ${theme === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-800 border border-slate-700'}`}>
                      {['yellow', 'green', 'blue', 'pink'].map(color => (
                        <button
                          key={color}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, color);
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
                      {getVerseHighlightColor?.(v.verseNumber) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, 'none');
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-slate-400'}`}
                          title="Remove Highlight"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    {/* Contextual Notebook FAB */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (openContextualNotebook) openContextualNotebook(v.verseNumber); 
                      }}
                      className={`p-2 rounded-full shadow-xl transition-all duration-300 ${theme === 'light' ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
                      title="Open Theological Notebook for this verse"
                    >
                      <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </div>"""
ns_content = ns_content.replace(popup_pattern, popup_new)

with open(ns_file, 'w', encoding='utf-8') as f:
    f.write(ns_content)
print("Updated NarrativeStream.tsx")

# App.tsx modifications
with open(app_file, 'r', encoding='utf-8') as f:
    app_content = f.read()

# Pass new props to NarrativeStream
ns_call_pattern = """                        setFocusedVerse={setFocusedVerse}
                        setFocusedStreamType={setFocusedStreamType}
                        currentlyReadingVerse={currentlyReadingVerse}"""
ns_call_new = """                        setFocusedVerse={setFocusedVerse}
                        setFocusedStreamType={setFocusedStreamType}
                        currentlyReadingVerse={currentlyReadingVerse}
                        getVerseHighlightColor={(vNo) => highlightedVerses[`${currentBookObj.name}-${selectedChapter}-${vNo}`]}
                        setVerseHighlightColor={(vNo, color) => {
                           const vId = `${currentBookObj.name}-${selectedChapter}-${vNo}`;
                           setHighlightedVerses(prev => {
                               const next = { ...prev };
                               if (color === 'none' || next[vId] === color) delete next[vId];
                               else next[vId] = color;
                               return next;
                           });
                        }}
                        openContextualNotebook={(vNo) => {
                           setMainView('notebook');
                           setActiveNotebookVerse(vNo);
                        }}"""
app_content = app_content.replace(ns_call_pattern, ns_call_new)

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_content)
print("Updated App.tsx")
