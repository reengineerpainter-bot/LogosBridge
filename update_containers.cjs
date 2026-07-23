const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Paragraph mode isMultiCol:
// Find `<div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#080d19]/40 border-cyan-955/30'} rounded-xl border p-2\`}>`
// And replace with borderless versions.
app = app.replace(
  /className=\{`w-\[90vw\] md:w-\[48%\] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \$\{theme === 'light' \? 'bg-white\/50 border-slate-200' : 'bg-\[#080d19\]\/40 border-cyan-955\/30'\} rounded-xl border p-2`\}/g,
  "className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2`}"
);

app = app.replace(
  /className=\{`w-\[90vw\] md:w-\[48%\] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \$\{theme === 'light' \? 'bg-amber-50\/30 border-amber-200\/50' : 'bg-amber-950\/10 border-amber-900\/30'\} rounded-xl border p-2`\}/g,
  "className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-amber-50/30' : 'bg-amber-950/10'} p-2`}"
);

app = app.replace(
  /className=\{`w-\[90vw\] md:w-\[48%\] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \$\{theme === 'light' \? 'bg-emerald-50\/30 border-emerald-200\/50' : 'bg-emerald-950\/10 border-emerald-900\/30'\} rounded-xl border p-2`\}/g,
  "className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-emerald-50/30' : 'bg-emerald-950/10'} p-2`}"
);

fs.writeFileSync('src/App.tsx', app);
