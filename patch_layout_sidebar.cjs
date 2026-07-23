const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const layoutSelector = `{/* Layout Mode Toggle */}
                                <div className="space-y-2 pb-2">
                                  <div className={\`text-[10px] font-sans font-bold uppercase \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}\`}>Layout Mode</div>
                                  <select
                                    value={layoutMode}
                                    onChange={(e) => {
                                      const mode = e.target.value as 'formal' | 'paragraph';
                                      setLayoutMode(mode);
                                      localStorage.setItem('personalized_bible_layout_mode', mode);
                                      playWebAudioBeep(520, 'sine', 0.04);
                                    }}
                                    className={\`w-full text-xs font-sans font-semibold border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 \${
                                      theme === 'light' 
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                    }\`}
                                  >
                                    <option value="paragraph">Paragraph Mode</option>
                                    <option value="formal">Formal / Verse-by-Verse Mode</option>
                                  </select>
                                </div>
                                `;

const targetAnchor = `{/* Light/Dark Mode Switcher */}`;
content = content.replace(targetAnchor, layoutSelector + '\n' + targetAnchor);

// Remove the inline selectors entirely:
const inlineStartRegex = /                      \{\/\* Translation Mode & Layout selectors \*\/\}/;
const inlineEndRegex = /                          <\/select>\n                        <\/div>\n                      <\/div>/;

const startMatch = content.match(inlineStartRegex);
const endMatch = content.match(inlineEndRegex);

if (startMatch && endMatch && endMatch.index > startMatch.index) {
    const startIdx = startMatch.index;
    const endIdx = endMatch.index + endMatch[0].length;
    const toRemove = content.substring(startIdx, endIdx);
    content = content.replace(toRemove, '');
    fs.writeFileSync('src/App.tsx', content);
    console.log("Layout added to sidebar, inline menu removed successfully.");
} else {
    console.log("Could not find inline menu bounds.");
}
