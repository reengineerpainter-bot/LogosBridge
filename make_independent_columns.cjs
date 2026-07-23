const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The block we want to replace starts with:
const startMarker = '{chapterData.verses.map((v) => {';
const isFocusedMarker = 'const isFocused = focusedVerse?.verseNumber === v.verseNumber;';

const startIdx = content.indexOf(startMarker);

let openBrackets = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') openBrackets++;
    else if (content[i] === '}') {
        openBrackets--;
        if (openBrackets === 0) {
            endIdx = i + 1;
            break;
        }
    }
}

const originalMapBlock = content.substring(startIdx, endIdx);

// We need to extract the "isFocused" rendering block from originalMapBlock
// It starts at "{isFocused ? ("
const isFocusedStart = originalMapBlock.indexOf('{isFocused ? (');
const isFocusedEndStr = `                            ) : activeDraftVerse === v.verseNumber ? (`;
const isFocusedEnd = originalMapBlock.lastIndexOf('</div>\n                        </div>\n                      );\n                    })}');

let actionButtonsBlock = originalMapBlock.substring(isFocusedStart, isFocusedEnd);

// Instead of creating a complicated map, we'll rewrite the layout using 
// standard independent column mapping if isMultiCol, else single map.

// Here is the new layout logic
const newLayout = `
                    {(() => {
                      const isMultiCol = translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv';
                      
                      const renderVerseCard = (v, transType) => {
                          const isFocused = focusedVerse?.verseNumber === v.verseNumber;
                          const isSaved = isVerseSaved(v.verseNumber);
                          const verseHighlight = getVerseHighlight(v.verseNumber);
                          const hasNotes = !!verseHighlight?.notes;
                          const isReadingThis = currentlyReadingVerse === v.verseNumber;
                          
                          let highlightClasses = '';
                          if (isFocused) {
                            highlightClasses = theme === 'light' ? 'bg-cyan-50/20 border-l-2 border-cyan-600' : 'bg-cyan-950/10 border-l-2 border-cyan-500';
                          } else if (hasNotes) {
                            highlightClasses = theme === 'light' ? 'bg-amber-50/15 border-l-2 border-amber-500/50' : 'bg-amber-950/5 border-l-2 border-amber-500/30';
                          }

                          let textContent = null;
                          let title = '';
                          let fontClasses = '';

                          if (transType === 'plain') {
                              title = 'Plain English Translation';
                              fontClasses = \`\${plainBold ? 'font-bold' : 'font-normal'} \${plainItalic ? 'italic' : 'not-italic'}\`;
                              textContent = v.contemporary;
                          } else if (transType === 'pers') {
                              title = 'Personalised Version';
                              fontClasses = \`\${personalizedBold ? 'font-bold' : 'font-semibold'} \${personalizedItalic ? 'italic' : 'not-italic'}\`;
                              textContent = v.nonNativeEnglish;
                          } else if (transType === 'kjv') {
                              title = 'Reference (KJV)';
                              fontClasses = \`\${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'}\`;
                              textContent = renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`);
                          } else if (transType === 'bsb') {
                              title = 'Berean Standard Bible';
                              fontClasses = \`\${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'}\`;
                              textContent = renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-\${v.verseNumber}\`);
                          }

                          return (
                            <div
                              key={\`\${transType}-\${v.verseNumber}\`}
                              id={\`verse-row-\${v.verseNumber}\`}
                              onMouseEnter={() => setHoveredVerse(v.verseNumber)}
                              onMouseLeave={() => setHoveredVerse(null)}
                              onDoubleClick={() => setFocusedVerse(focusedVerse?.verseNumber === v.verseNumber ? null : v)}
                              onTouchStart={() => handleVerseRowTap(v)}
                              className={\`flex flex-col py-1.5 px-3 mb-1 transition-all duration-150 cursor-pointer relative \${highlightClasses} \${
                                hoveredVerse === v.verseNumber && !hasNotes && !isFocused
                                  ? (theme === 'light' ? 'bg-slate-50/40' : 'bg-cyan-950/5')
                                  : ''
                              } \${isReadingThis ? 'ring-1.5 ring-cyan-500/40 shadow-xs animate-pulse-slow' : ''}\`}
                            >
                              <div className={\`\${getScriptureStyleClasses()} \${fontClasses} \${
                                scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                              } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                <span className={\`inline-flex items-center justify-center px-1.5 rounded mr-1.5 align-middle text-[10px] font-sans font-black select-none transition-all \${
                                  isReadingThis
                                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400 scale-105'
                                    : (theme === 'light' 
                                        ? 'bg-slate-100 text-slate-500' 
                                        : 'bg-slate-800 text-slate-400')
                                }\`}>
                                  {v.verseNumber}
                                </span>
                                {textContent}
                              </div>
                              
                              ${actionButtonsBlock}
                            </div>
                          );
                      };

                      if (isMultiCol) {
                        return (
                          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 h-[calc(100vh-160px)]">
                            {(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') && (
                              <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#080d19]/40 border-cyan-955/30'} rounded-xl border p-2\`}>
                                <div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-slate-100 dark:border-cyan-950/30">
                                  <div className={\`text-[10px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold\`}>Plain English Translation</div>
                                </div>
                                {chapterData.verses.map(v => renderVerseCard(v, 'plain'))}
                              </div>
                            )}

                            {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv') && (
                              <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#080d19]/40 border-cyan-955/30'} rounded-xl border p-2\`}>
                                <div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-slate-100 dark:border-cyan-950/30">
                                  <div className={\`text-[10px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold\`}>Personalised Version</div>
                                </div>
                                {chapterData.verses.map(v => renderVerseCard(v, 'pers'))}
                              </div>
                            )}

                            {(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv') && (
                              <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-amber-50/30 border-amber-200/50' : 'bg-amber-950/10 border-amber-900/30'} rounded-xl border p-2\`}>
                                <div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-amber-100 dark:border-amber-900/30">
                                  <div className={\`text-[10px] font-sans \${theme === 'light' ? 'text-amber-700/80' : 'text-amber-500/80'} uppercase tracking-widest font-extrabold\`}>Reference (KJV)</div>
                                </div>
                                {chapterData.verses.map(v => renderVerseCard(v, 'kjv'))}
                              </div>
                            )}

                            {(translationDisplayMode === 'both' && isComparisonEnabled) && (
                              <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-emerald-50/30 border-emerald-200/50' : 'bg-emerald-950/10 border-emerald-900/30'} rounded-xl border p-2\`}>
                                <div className="sticky top-0 z-10 backdrop-blur-md pb-2 mb-2 border-b border-emerald-100 dark:border-emerald-900/30">
                                  <div className={\`text-[10px] font-sans \${theme === 'light' ? 'text-emerald-700/80' : 'text-emerald-500/80'} uppercase tracking-widest font-extrabold\`}>Berean Standard Bible</div>
                                </div>
                                {chapterData.verses.map(v => renderVerseCard(v, 'bsb'))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Original Single Column view
                      return (
                        <div className="flex flex-col space-y-1 py-1">
                          {chapterData.verses.map(v => {
                            const transType = translationDisplayMode === 'plain' ? 'plain' : translationDisplayMode === 'personalized' ? 'pers' : translationDisplayMode === 'kjv' ? 'kjv' : 'bsb';
                            return renderVerseCard(v, transType);
                          })}
                        </div>
                      );
                    })()}
`;

content = content.replace(originalMapBlock, newLayout);
fs.writeFileSync('src/App.tsx', content);
console.log('Successfully rewrote layout block.');
