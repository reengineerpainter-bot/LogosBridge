const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const originalTranslations = `                            <div className={
                              (translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv')
                                ? "grid grid-cols-1 md:grid-cols-2 gap-0 text-base leading-relaxed"
                                : "grid grid-cols-1 gap-2 text-base leading-relaxed"
                            }>
                              {/* REF Manuscript Toggle for Both Mode (2-View) */}
                              {(translationDisplayMode === 'both' && isComparisonEnabled) && (
                                <>
                                  {/* Left Reference (KJV) */}
                                  <div className={\`space-y-1 pr-4 md:pr-6 pb-2.5 mb-2.5 border-b \${theme === 'light' ? 'border-zinc-200/80' : 'border-cyan-950/30'}\`}>
                                    <div className={\`text-[9px] font-sans text-amber-600/80 uppercase tracking-widest font-extrabold mb-1\`}>Reference (KJV)</div>
                                    <div className={\`\${getScriptureStyleClasses()} \${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'} \${scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'} \${theme === 'light' ? 'text-zinc-500' : 'text-cyan-600/70'}\`}>
                                      {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-ref-\${v.verseNumber}\`)}
                                    </div>
                                  </div>
                                  {/* Right Reference (BSB) */}
                                  <div className={\`space-y-1 pl-4 md:pl-6 pb-2.5 mb-2.5 border-b border-l \${theme === 'light' ? 'border-zinc-200/80' : 'border-cyan-950/30'}\`}>
                                    <div className={\`text-[9px] font-sans text-emerald-600/80 uppercase tracking-widest font-extrabold mb-1\`}>Reference (BSB)</div>
                                    <div className={\`\${getScriptureStyleClasses()} \${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'} \${scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'} \${theme === 'light' ? 'text-zinc-500' : 'text-cyan-600/70'}\`}>
                                      {renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-ref-\${v.verseNumber}\`)}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Contemporary interpretation */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'plain' || translationDisplayMode === 'plain_kjv') && (
                                <div className={\`space-y-0.5 \${(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') ? 'pr-4 md:pr-6' : ''}\`}>
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
                              )}

                              {/* Modern easy english personalized text block */}
                              {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized' || translationDisplayMode === 'personalized_kjv') && (
                                <div className={\`space-y-0.5 \${
                                  (translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv')
                                    ? \`pl-4 md:pl-6 border-l \${theme === 'light' ? 'border-slate-200' : 'border-cyan-950/20'}\`
                                    : ''
                                }\`}>
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
                              )}

                              {/* King James Version hybrid option */}
                              {(translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv') && (
                                <div className={\`space-y-0.5 pl-4 md:pl-6 border-l \${theme === 'light' ? 'border-slate-200' : 'border-cyan-950/20'}\`}>
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}

                              {/* King James Version option */}
                              {translationDisplayMode === 'kjv' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}

                              {/* Berean Standard Bible option */}
                              {translationDisplayMode === 'bsb' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}
                            </div>`;

const newTranslations = `                            <div className={
                              (translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv')
                                ? "flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pb-3 pt-1 text-base leading-relaxed"
                                : "grid grid-cols-1 gap-2 text-base leading-relaxed"
                            }>
                              
                              {/* Contemporary interpretation */}
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
                              )}

                              {/* Modern easy english personalized text block */}
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
                              )}
                              
                              {/* King James Version hybrid option */}
                              {(translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv') && (
                                <div className={\`space-y-1.5 shrink-0 snap-center w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50\`}>
                                  <div className={\`text-[9px] font-sans \${theme === 'light' ? 'text-amber-600/80' : 'text-amber-500/80'} uppercase tracking-widest font-extrabold mb-1\`}>Reference (KJV)</div>
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}

                              {/* REF Manuscript Toggle for Both Mode (2-View) */}
                              {(translationDisplayMode === 'both' && isComparisonEnabled) && (
                                <>
                                  {/* Left Reference (KJV) */}
                                  <div className={\`space-y-1.5 shrink-0 snap-center w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50\`}>
                                    <div className={\`text-[9px] font-sans text-amber-600/80 uppercase tracking-widest font-extrabold mb-1\`}>Reference (KJV)</div>
                                    <div className={\`\${getScriptureStyleClasses()} \${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'} \${scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'} \${theme === 'light' ? 'text-zinc-500' : 'text-cyan-600/70'}\`}>
                                      {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-ref-\${v.verseNumber}\`)}
                                    </div>
                                  </div>
                                  {/* Right Reference (BSB) */}
                                  <div className={\`space-y-1.5 shrink-0 snap-center w-[85vw] md:w-[48%] bg-white/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50\`}>
                                    <div className={\`text-[9px] font-sans text-emerald-600/80 uppercase tracking-widest font-extrabold mb-1\`}>Reference (BSB)</div>
                                    <div className={\`\${getScriptureStyleClasses()} \${manuscriptBold ? 'font-bold' : 'font-semibold'} \${manuscriptItalic ? 'italic' : 'not-italic'} \${scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'} \${theme === 'light' ? 'text-zinc-500' : 'text-cyan-600/70'}\`}>
                                      {renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-ref-\${v.verseNumber}\`)}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* King James Version option (Single View) */}
                              {translationDisplayMode === 'kjv' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}

                              {/* Berean Standard Bible option (Single View) */}
                              {translationDisplayMode === 'bsb' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    {renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}
                            </div>`;

content = content.replace(originalTranslations, newTranslations);
fs.writeFileSync('src/App.tsx', content);
console.log('Version table logic updated.');
