const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldBrandHTML = `<h1 className={\`text-lg md:text-xl font-display font-semibold tracking-tight \${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-center gap-1.5\`}>
                      Personalised <span className="font-serif italic font-medium text-cyan-600 dark:text-cyan-400">Bible</span>
                    </h1>
                    <p className={\`text-[10px] md:text-[11px] font-medium \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} tracking-wider uppercase\`}>
                      Modern Scholar
                    </p>`;

const newBrandHTML = `<h1 className={\`text-lg md:text-xl font-display font-bold tracking-tight \${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-center gap-1.5\`}>
                      LogosBridge
                    </h1>
                    <p className={\`text-[10px] md:text-[11px] font-medium \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} tracking-wider uppercase\`}>
                      The Personalised Study Bible
                    </p>`;

if (content.includes(oldBrandHTML)) {
  content = content.replace(oldBrandHTML, newBrandHTML);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Brand name updated.');
} else {
  console.log('Could not find old brand HTML to replace.');
}
