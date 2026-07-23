const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// We want to redesign the top bar to be "gold standard"
// Currently it is wrapped in:
// <motion.header className={`w-full ${theme === 'light' ? 'glass-panel bg-white/80 border-zinc-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'glass-panel bg-zinc-950/80 border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)]'} border-b px-6 py-4 z-40 sticky top-0 transition-all duration-300 transform ${isHeaderHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
//   <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">

const oldHeaderRegex = /<motion\.header[\s\S]*?className=\{`w-full \$\{theme === 'light' \? 'glass-panel bg-white\/80 border-zinc-200\/50 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]' : 'glass-panel bg-zinc-950\/80 border-zinc-800\/50 shadow-\[0_8px_30px_rgb\(0,0,0,0\.2\)\]'\} border-b px-6 py-4 z-40 sticky top-0 transition-all duration-300 transform \$\{isHeaderHidden \? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'\}[\s\S]*?max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">/;

const newHeaderStart = `<motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={\`w-full \${theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-950 border-zinc-800 shadow-xl'} border-b px-4 md:px-6 py-3 md:py-4 z-40 sticky top-0 transition-all duration-300 transform \${isHeaderHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}\`}
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">`;

content = content.replace(oldHeaderRegex, newHeaderStart);

// Clean up the left logo block:
const oldLogoRegex = /<div className="flex items-center space-x-4">[\s\S]*?<\/div>\n              <\/div>/;
const newLogo = `<div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className={\`p-1.5 rounded-xl \${theme === 'light' ? 'bg-zinc-50 border border-zinc-100 shadow-sm' : 'bg-zinc-900 border border-zinc-800 shadow-lg'} flex items-center justify-center shrink-0\`}>
                    <img
                      src={logoSrc}
                      alt="Study App Logo"
                      className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg"
                      id="app-logo-image"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h1 className={\`text-lg md:text-xl font-display font-semibold tracking-tight \${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-center gap-1.5\`}>
                      Personalised <span className="font-serif italic font-medium text-cyan-600 dark:text-cyan-400">Bible</span>
                    </h1>
                    <p className={\`text-[10px] md:text-[11px] font-medium \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} tracking-wider uppercase\`}>
                      Modern Scholar
                    </p>
                  </div>
                </div>
              </div>`;

content = content.replace(oldLogoRegex, newLogo);

fs.writeFileSync('src/App.tsx', content);
console.log('Top bar patched.');

