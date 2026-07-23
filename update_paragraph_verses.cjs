const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const kjvSup = `<sup className={\`text-[9.5px] font-mono leading-none select-none font-black mr-0.5 \${
                                                isReadingThis ? 'text-cyan-500 animate-bounce' : theme === 'light' ? 'text-slate-400' : 'text-cyan-600/70'
                                              }\`}>
                                                {v.verseNumber}
                                              </sup>`;
const bsbSup = `<sup className={\`text-[9.5px] font-mono leading-none select-none font-black mr-0.5 \${
                                                isReadingThis ? 'text-cyan-500 animate-bounce' : theme === 'light' ? 'text-slate-400' : 'text-cyan-600/70'
                                              }\`}>
                                                {v.verseNumber}
                                              </sup>`;

// Remove kjvSup in the file. Wait, I should do a targeted replace for paragraph mode.
