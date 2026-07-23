const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const drawerCode = `
      {/* Deep Journaling Bottom Drawer */}
      {activeDraftVerse !== null && (
        <div className={\`fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 border-t shadow-2xl animate-fade-in-up \${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}\`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className={\`text-sm font-bold font-sans flex items-center gap-2 \${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}\`}>
                <StarryCradleIcon className="w-5 h-5" active={true} />
                Deep Theological Journaling — Verse {activeDraftVerse}
              </h3>
              <button onClick={handleCancelNote} className={\`p-1.5 rounded-full hover:bg-slate-500/10 \${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}\`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteDraftText}
              onChange={(e) => setNoteDraftText(e.target.value)}
              placeholder="Write down personal theological reflections or spiritual notes connected with this verse..."
              className={\`w-full text-sm p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 \${
                theme === 'light'
                  ? 'bg-slate-50 text-slate-800 border-slate-200'
                  : 'bg-slate-900/50 text-slate-100 border-cyan-900/40'
              }\`}
              rows={4}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end space-x-3">
              <button
                onClick={handleCancelNote}
                className={\`text-xs uppercase font-mono tracking-wider font-extrabold px-4 py-2 rounded-lg transition-colors cursor-pointer \${
                  theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }\`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveNote(activeDraftVerse)}
                className="text-xs uppercase font-mono tracking-wider font-extrabold px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors cursor-pointer"
              >
                💾 Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace('    </div>\n  );\n}', drawerCode + '\n    </div>\n  );\n}');
fs.writeFileSync('src/App.tsx', code);
