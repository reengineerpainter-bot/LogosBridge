const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Find the sticky headers in the formal mode isMultiCol block
app = app.replace(/<div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-slate-100 dark:border-cyan-950\/30">\s*<div className=\{`text-\[10px\] font-sans \$\{theme === 'light' \? 'text-cyan-700\/80' : 'text-cyan-400\/80'\} uppercase tracking-widest font-extrabold`\}>Plain English Translation<\/div>\s*<\/div>/g, '');

app = app.replace(/<div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-slate-100 dark:border-cyan-950\/30">\s*<div className=\{`text-\[10px\] font-sans \$\{theme === 'light' \? 'text-cyan-700\/80' : 'text-cyan-400\/80'\} uppercase tracking-widest font-extrabold`\}>Personalised Version<\/div>\s*<\/div>/g, '');

app = app.replace(/<div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-amber-100 dark:border-amber-900\/30">\s*<div className=\{`text-\[10px\] font-sans \$\{theme === 'light' \? 'text-amber-700\/80' : 'text-amber-500\/80'\} uppercase tracking-widest font-extrabold`\}>Reference \(KJV\)<\/div>\s*<\/div>/g, '');

app = app.replace(/<div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-emerald-100 dark:border-emerald-900\/30">\s*<div className=\{`text-\[10px\] font-sans \$\{theme === 'light' \? 'text-emerald-700\/80' : 'text-emerald-500\/80'\} uppercase tracking-widest font-extrabold`\}>Berean Standard Bible<\/div>\s*<\/div>/g, '');

fs.writeFileSync('src/App.tsx', app);
