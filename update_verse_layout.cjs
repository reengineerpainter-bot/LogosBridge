const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldVerseRowStart = `                        <div
                          key={v.verseNumber}
                          id={\`verse-row-\${v.verseNumber}\`}
                          onMouseEnter={() => setHoveredVerse(v.verseNumber)}
                          onMouseLeave={() => setHoveredVerse(null)}
                          onDoubleClick={() => setFocusedVerse(focusedVerse?.verseNumber === v.verseNumber ? null : v)}
                          onTouchStart={() => handleVerseRowTap(v)}
                          className={\`grid grid-cols-12 py-1 px-3 transition-all duration-150 cursor-pointer relative gap-x-2 \${highlightClasses} \${
                            hoveredVerse === v.verseNumber && !hasNotes && !isFocused
                              ? (theme === 'light' ? 'bg-slate-50/40' : 'bg-cyan-950/5')
                              : ''
                          } \${isReadingThis ? 'ring-1.5 ring-cyan-500/40 shadow-xs animate-pulse-slow' : ''}\`}
                        >
                          {/* Col 1: Stationary Verse Indicator */}
                          <div className="col-span-1 flex flex-col items-center justify-start py-0.5 select-none relative z-21">
                            {/* Stationary Verse Indicator number */}
                            <div className={\`text-[12px] font-sans font-black select-none h-6 flex items-center justify-center transition-all \${
                              isReadingThis
                                ? 'text-cyan-600 dark:text-cyan-400 scale-105'
                                : (theme === 'light' 
                                    ? 'text-slate-400' 
                                    : 'text-slate-500')
                            }\`}>
                              {v.verseNumber}
                            </div>
                          </div>

                          {/* Col 2: Content fields with translations and studies */}
                          <div className="col-span-11 flex flex-col space-y-2">`;

const newVerseRowStart = `                        <div
                          key={v.verseNumber}
                          id={\`verse-row-\${v.verseNumber}\`}
                          onMouseEnter={() => setHoveredVerse(v.verseNumber)}
                          onMouseLeave={() => setHoveredVerse(null)}
                          onDoubleClick={() => setFocusedVerse(focusedVerse?.verseNumber === v.verseNumber ? null : v)}
                          onTouchStart={() => handleVerseRowTap(v)}
                          className={\`flex flex-col py-1.5 px-3 transition-all duration-150 cursor-pointer relative \${highlightClasses} \${
                            hoveredVerse === v.verseNumber && !hasNotes && !isFocused
                              ? (theme === 'light' ? 'bg-slate-50/40' : 'bg-cyan-950/5')
                              : ''
                          } \${isReadingThis ? 'ring-1.5 ring-cyan-500/40 shadow-xs animate-pulse-slow' : ''}\`}
                        >
                          {/* Content fields with translations and studies */}
                          <div className="flex flex-col space-y-2 w-full">`;

content = content.replace(oldVerseRowStart, newVerseRowStart);

const oldPlain = `                              {/* Contemporary interpretation */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'plain' || translationDisplayMode === 'plain_kjv') && (
                                <div className={\`space-y-1.5 shrink-0 snap-center \${(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') ? 'w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50' : 'w-full'}\`}>
                                  {(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') && (
                                    <div className={\`text-[9px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold mb-1\`}>Plain English Translation</div>
                                  )}
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    plainBold ? 'font-bold' : 'font-normal'
                                  } \${
                                    plainItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-800' : 'text-slate-150'}\`}>
                                    {v.contemporary}
                                  </div>
                                </div>
                              )}`;

const newPlain = `                              {/* Contemporary interpretation */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'plain' || translationDisplayMode === 'plain_kjv') && (
                                <div className={\`space-y-1.5 shrink-0 snap-center \${(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') ? 'w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50' : 'w-full'}\`}>
                                  {(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') && (
                                    <div className={\`text-[9px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold mb-1\`}>Plain English Translation</div>
                                  )}
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    plainBold ? 'font-bold' : 'font-normal'
                                  } \${
                                    plainItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-800' : 'text-slate-150'}\`}>
                                    <span className={\`inline-flex items-center justify-center px-1.5 rounded mr-1.5 align-middle text-[10px] font-sans font-black select-none transition-all \${
                                      isReadingThis
                                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400 scale-105'
                                        : (theme === 'light' 
                                            ? 'bg-slate-100 text-slate-500' 
                                            : 'bg-slate-800 text-slate-400')
                                    }\`}>
                                      {v.verseNumber}
                                    </span>
                                    {v.contemporary}
                                  </div>
                                </div>
                              )}`;

content = content.replace(oldPlain, newPlain);

const oldPers = `                              {/* Modern easy english personalized text block */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized' || translationDisplayMode === 'personalized_kjv') && (
                                <div className={\`space-y-1.5 shrink-0 snap-center \${
                                  (translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv')
                                    ? \`w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50\`
                                    : 'w-full'
                                }\`}>
                                  {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv') && (
                                    <div className={\`text-[9px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold mb-1\`}>Personalised Version</div>
                                  )}
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    personalizedBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    personalizedItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {v.nonNativeEnglish}
                                  </div>
                                </div>
                              )}`;

const newPers = `                              {/* Modern easy english personalized text block */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized' || translationDisplayMode === 'personalized_kjv') && (
                                <div className={\`space-y-1.5 shrink-0 snap-center \${
                                  (translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv')
                                    ? \`w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50\`
                                    : 'w-full'
                                }\`}>
                                  {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv') && (
                                    <div className={\`text-[9px] font-sans \${theme === 'light' ? 'text-cyan-700/80' : 'text-cyan-400/80'} uppercase tracking-widest font-extrabold mb-1\`}>Personalised Version</div>
                                  )}
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    personalizedBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    personalizedItalic ? 'italic' : 'not-italic'
                                  } \${
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
                                    {v.nonNativeEnglish}
                                  </div>
                                </div>
                              )}`;

content = content.replace(oldPers, newPers);
fs.writeFileSync('src/App.tsx', content);
console.log('Verse layout and badges updated.');
