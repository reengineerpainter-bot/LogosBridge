const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const originalHeaderSection = `      {/* FIXED NAV BAR (COLLAPSIBLE) */}
      <AnimatePresence initial={false}>
        {!isHeaderCollapsed && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={\`w-full \${theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-950 border-zinc-800 shadow-xl'} border-b px-4 md:px-6 py-3 md:py-4 z-40 sticky top-0 transition-all duration-300 transform \${isHeaderHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}\`}
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              
              {/* TOP LEFT Book & Chapter Selectors */}
              <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto justify-between md:justify-start">
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
                    <h1 className={\`text-lg md:text-xl font-display font-bold tracking-tight \${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-center gap-1.5\`}>
                      LogosBridge
                    </h1>
                    <p className={\`text-[10px] md:text-[11px] font-medium \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} tracking-wider uppercase\`}>
                      The Personalised Study Bible
                    </p>
                  </div>
                </div>
              </div>

              {/* CENTER SELECTORS FOR SELECTING BOOKS */}`;

const newHeaderSection = `      {/* SCROLLING BRAND PANEL */}
      <div className="w-full px-4 md:px-6 py-6 md:py-8 z-30 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-start">
          <div className="flex items-center space-x-4">
            <div className={\`p-2 rounded-2xl \${theme === 'light' ? 'bg-white border border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border border-zinc-800 shadow-lg'} flex items-center justify-center shrink-0\`}>
              <img
                src={logoSrc}
                alt="LogosBridge Logo"
                className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-xl"
                id="app-logo-image"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <h1 className={\`text-2xl md:text-3xl font-display font-bold tracking-tight \${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-center gap-1.5\`}>
                LogosBridge
              </h1>
              <p className={\`text-xs md:text-sm font-medium \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} tracking-widest uppercase\`}>
                The Personalised Study Bible
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FIXED NAV BAR (COLLAPSIBLE & STICKY) */}
      <AnimatePresence initial={false}>
        {!isHeaderCollapsed && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={\`w-full \${theme === 'light' ? 'bg-white/95 backdrop-blur-md border-zinc-200 shadow-sm' : 'bg-zinc-950/95 backdrop-blur-md border-zinc-800 shadow-xl'} border-b px-4 md:px-6 py-2 md:py-3 z-40 sticky top-0 transition-all duration-300 transform \${isHeaderHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}\`}
          >
            <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3">
              
              {/* CENTER SELECTORS FOR SELECTING BOOKS */}`;

content = content.replace(originalHeaderSection, newHeaderSection);
fs.writeFileSync('src/App.tsx', content);
console.log('Split header successfully.');
