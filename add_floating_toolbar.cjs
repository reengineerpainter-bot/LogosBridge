const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const toolbarCode = `
      {/* Floating Font Size Toolbar */}
      <div className={\`fixed right-4 md:right-8 top-1/3 flex flex-col gap-2 z-40 p-1.5 rounded-full border shadow-lg backdrop-blur-md \${theme === 'light' ? 'bg-white/90 border-slate-200' : 'bg-[#18181b]/90 border-zinc-800'}\`}>
        <button
          onClick={() => {
            if (scriptureFontSizeSetting === 'xs') setScriptureFontSizeSetting('sm');
            else if (scriptureFontSizeSetting === 'sm') setScriptureFontSizeSetting('base');
            else if (scriptureFontSizeSetting === 'base') setScriptureFontSizeSetting('lg');
          }}
          className={\`p-2 w-8 h-8 rounded-full transition-all flex items-center justify-center hover:scale-110 \${theme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300'} \${scriptureFontSizeSetting === 'lg' ? 'opacity-30 cursor-not-allowed' : ''}\`}
          disabled={scriptureFontSizeSetting === 'lg'}
          title="Increase Font Size"
        >
          <span className="font-serif font-bold text-[16px] leading-none">A+</span>
        </button>
        
        <div className={\`w-full h-[1px] \${theme === 'light' ? 'bg-slate-200' : 'bg-zinc-800'}\`} />
        
        <button
          onClick={() => {
            if (scriptureFontSizeSetting === 'lg') setScriptureFontSizeSetting('base');
            else if (scriptureFontSizeSetting === 'base') setScriptureFontSizeSetting('sm');
            else if (scriptureFontSizeSetting === 'sm') setScriptureFontSizeSetting('xs');
          }}
          className={\`p-2 w-8 h-8 rounded-full transition-all flex items-center justify-center hover:scale-110 \${theme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-slate-300'} \${scriptureFontSizeSetting === 'xs' ? 'opacity-30 cursor-not-allowed' : ''}\`}
          disabled={scriptureFontSizeSetting === 'xs'}
          title="Decrease Font Size"
        >
          <span className="font-serif font-bold text-[12px] leading-none">A-</span>
        </button>
      </div>
`;

code = code.replace('      </AnimatePresence>', '      </AnimatePresence>' + '\\n' + toolbarCode);
fs.writeFileSync('src/App.tsx', code);
console.log('Toolbar injected!');
