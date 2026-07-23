const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// First remove the old broken injection
const badRegex = /\\n\s*\{\/\* Floating Font Size Toolbar \*\/\}[\s\S]*?<\/div>\n/g;
code = code.replace(badRegex, '');

// Add the elegant zoom control at the bottom of the App
const zoomControl = `
      {/* Global Enterprise Zoom Control (Mobile Optimized) */}
      <div className={\`fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50 animate-fade-in-up\`}>
        <div className={\`flex items-center p-1.5 rounded-full shadow-2xl backdrop-blur-xl border \${
          theme === 'light' 
            ? 'bg-white/80 border-slate-200/60 text-slate-700 shadow-slate-200/50' 
            : 'bg-[#0a0f1c]/80 border-cyan-900/30 text-cyan-50 shadow-cyan-900/20'
        }\`}>
          <button
            onClick={() => {
              if (scriptureFontSizeSetting === 'lg') setScriptureFontSizeSetting('base');
              else if (scriptureFontSizeSetting === 'base') setScriptureFontSizeSetting('sm');
              else if (scriptureFontSizeSetting === 'sm') setScriptureFontSizeSetting('xs');
            }}
            disabled={scriptureFontSizeSetting === 'xs'}
            className={\`w-9 h-9 flex items-center justify-center rounded-full transition-all \${
              scriptureFontSizeSetting === 'xs' 
                ? 'opacity-40 cursor-not-allowed' 
                : theme === 'light' ? 'hover:bg-slate-100 active:bg-slate-200' : 'hover:bg-cyan-950/50 active:bg-cyan-900/50'
            }\`}
            title="Decrease Zoom"
          >
            <span className="text-lg font-light leading-none mb-0.5">−</span>
          </button>
          
          <div className="flex flex-col items-center justify-center w-12 px-1">
            <span className={\`text-[9px] font-mono font-bold tracking-widest uppercase opacity-60\`}>
              Zoom
            </span>
            <span className="text-[11px] font-sans font-semibold">
              {scriptureFontSizeSetting === 'xs' ? '85%' : scriptureFontSizeSetting === 'sm' ? '100%' : scriptureFontSizeSetting === 'base' ? '115%' : '130%'}
            </span>
          </div>

          <button
            onClick={() => {
              if (scriptureFontSizeSetting === 'xs') setScriptureFontSizeSetting('sm');
              else if (scriptureFontSizeSetting === 'sm') setScriptureFontSizeSetting('base');
              else if (scriptureFontSizeSetting === 'base') setScriptureFontSizeSetting('lg');
            }}
            disabled={scriptureFontSizeSetting === 'lg'}
            className={\`w-9 h-9 flex items-center justify-center rounded-full transition-all \${
              scriptureFontSizeSetting === 'lg' 
                ? 'opacity-40 cursor-not-allowed' 
                : theme === 'light' ? 'hover:bg-slate-100 active:bg-slate-200' : 'hover:bg-cyan-950/50 active:bg-cyan-900/50'
            }\`}
            title="Increase Zoom"
          >
            <span className="text-lg font-light leading-none mb-0.5">+</span>
          </button>
        </div>
      </div>
`;

code = code.replace('    </div>\n  );\n}', zoomControl + '    </div>\n  );\n}');
fs.writeFileSync('src/App.tsx', code);
console.log('Zoom control updated');
