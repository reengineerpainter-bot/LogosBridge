const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldKjvSingle = `                              {/* King James Version option (Single View) */}
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
                              )}`;

const newKjvSingle = `                              {/* King James Version option (Single View) */}
                              {translationDisplayMode === 'kjv' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    <span className={\`inline-flex items-center justify-center px-1.5 rounded mr-1.5 align-middle text-[10px] font-sans font-black select-none transition-all \${
                                      isReadingThis
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 scale-105'
                                        : (theme === 'light' 
                                            ? 'bg-slate-100 text-slate-500' 
                                            : 'bg-slate-800 text-slate-400')
                                    }\`}>
                                      {v.verseNumber}
                                    </span>
                                    {renderInteractiveText(v.kjvText || '', v.specialWords, \`kjv-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}`;

const oldBsbSingle = `                              {/* Berean Standard Bible option (Single View) */}
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
                              )}`;

const newBsbSingle = `                              {/* Berean Standard Bible option (Single View) */}
                              {translationDisplayMode === 'bsb' && (
                                <div className="space-y-0.5">
                                  <div className={\`\${getScriptureStyleClasses()} \${
                                    manuscriptBold ? 'font-bold' : 'font-semibold'
                                  } \${
                                    manuscriptItalic ? 'italic' : 'not-italic'
                                  } \${
                                    scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'
                                  } \${theme === 'light' ? 'text-slate-900' : 'text-white'}\`}>
                                    <span className={\`inline-flex items-center justify-center px-1.5 rounded mr-1.5 align-middle text-[10px] font-sans font-black select-none transition-all \${
                                      isReadingThis
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 scale-105'
                                        : (theme === 'light' 
                                            ? 'bg-slate-100 text-slate-500' 
                                            : 'bg-slate-800 text-slate-400')
                                    }\`}>
                                      {v.verseNumber}
                                    </span>
                                    {renderInteractiveText(v.bsbText || '', v.specialWords, \`bsb-\${v.verseNumber}\`)}
                                  </div>
                                </div>
                              )}`;

content = content.replace(oldKjvSingle, newKjvSingle);
content = content.replace(oldBsbSingle, newBsbSingle);
fs.writeFileSync('src/App.tsx', content);
console.log('Single view badges added.');
