const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const kjvSup = `<sup className={\`text-[9.5px] font-mono leading-none select-none font-black mr-0.5 \${
                                                isReadingThis ? 'text-cyan-500 animate-bounce' : theme === 'light' ? 'text-slate-400' : 'text-cyan-600/70'
                                              }\`}>
                                                {v.verseNumber}
                                              </sup>`;
                                              
const bsbSup = kjvSup; // It's exactly the same text

if (content.includes(kjvSup)) {
  // It occurs twice: one for KJV, one for BSB
  content = content.split(kjvSup).join('');
  fs.writeFileSync('src/App.tsx', content);
  console.log('Paragraph mode references sup tags removed.');
} else {
  console.log('Could not find sup tag.');
}
