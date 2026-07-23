const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Patch the opening of the dropdown
const oldOpen = `<motion.div
                        id="more-options-menu-dropdown"
                        initial={{ opacity: 0, x: 40, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 40, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 220 }}
                        className={\`absolute right-0 mt-2 top-full w-72 md:w-80 max-h-[260px] overflow-y-auto \${
                          theme === 'light' 
                            ? 'bg-white border-zinc-200 text-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.08)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-md'
                        } border rounded-xl p-4 z-50 flex flex-col space-y-3 font-sans\`}
                      >`;

const newOpen = `<>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(false); }}
                          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                        />
                        <motion.div
                          id="more-options-menu-dropdown"
                          initial={{ opacity: 0, x: '100%' }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: '100%' }}
                          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                          className={\`fixed right-0 top-0 h-[100dvh] w-80 max-w-[85vw] overflow-y-auto \${
                            theme === 'light' 
                              ? 'bg-[#fcfdfe] border-l border-zinc-200 text-zinc-800 shadow-2xl' 
                              : 'bg-zinc-950 border-l border-zinc-800 text-zinc-100 shadow-2xl'
                          } p-6 z-[100] flex flex-col space-y-5 font-sans\`}
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="font-sans font-bold text-sm tracking-wide">Menu</span>
                            <button onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(false); }} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              <X className="w-5 h-5" />
                            </button>
                          </div>`;

content = content.replace(oldOpen, newOpen);

// 2. Patch the end of the dropdown
const oldEnd = `                      </motion.div>
                    )}
                  </AnimatePresence>`;

const newEnd = `                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>`;

content = content.replace(oldEnd, newEnd);


// 3. Add the view mode selector right before Light/Dark Mode Switcher
const targetAnchor = `{/* Light/Dark Mode Switcher */}`;

const viewModeBlock = `{/* Translation Display Mode */}
                                <div className="space-y-2 pb-2">
                                  <div className={\`text-[10px] font-sans font-bold uppercase \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}\`}>View Mode</div>
                                  <select
                                    value={translationDisplayMode}
                                    onChange={(e) => {
                                      const val = e.target.value as any;
                                      setTranslationDisplayMode(val);
                                      localStorage.setItem('personalized_bible_translation_display_mode', val);
                                      playWebAudioBeep(480, 'sine', 0.04);
                                    }}
                                    className={\`w-full text-xs font-sans font-semibold border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 \${
                                      theme === 'light' 
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                    }\`}
                                  >
                                    <option value="both">Both Streams Side-by-Side</option>
                                    <option value="plain">Plain English Narrative</option>
                                    <option value="personalized">Personalised Prayer</option>
                                    <option value="plain_kjv">Plain English / KJV Side-by-Side</option>
                                    <option value="personalized_kjv">Personalised Prayer / KJV Side-by-Side</option>
                                    <option value="kjv">King James (KJV) Only</option>
                                    <option value="bsb">Berean Standard (BSB) Only</option>
                                  </select>
                                </div>
                                
                                {/* Ref Manuscript Toggle */}
                                <div className="space-y-2 pb-2">
                                  <div className={\`text-[10px] font-sans font-bold uppercase \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}\`}>REF Manuscripts</div>
                                  <div
                                    onClick={() => {
                                      setIsComparisonEnabled(!isComparisonEnabled);
                                    }}
                                    className={\`cursor-pointer transition-colors py-2 px-3 border rounded-lg flex items-center justify-between \${theme === 'light' ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'}\`}
                                  >
                                    <span className="text-xs font-semibold">Toggle REF Manuscripts</span>
                                    <span className={\`font-sans text-[10px] font-bold uppercase \${isComparisonEnabled ? (theme === 'light' ? 'text-zinc-800' : 'text-zinc-200') : (theme === 'light' ? 'text-zinc-400' : 'text-zinc-500')}\`}>
                                      {isComparisonEnabled ? 'ON' : 'OFF'}
                                    </span>
                                  </div>
                                </div>

                                `;

// Also remove the old REF Manuscript toggle
const oldRefToggle = `                                {/* REF Manuscript Toggle */}
                                <div
                                  onClick={() => {
                                    setIsComparisonEnabled(!isComparisonEnabled);
                                  }}
                                  className={\`cursor-pointer transition-colors py-1 flex items-center justify-between \${theme === 'light' ? 'hover:text-zinc-600' : 'hover:text-zinc-300'}\`}
                                >
                                  <span>Toggle REF Manuscripts</span>
                                  <span className={\`font-sans text-[10px] font-bold uppercase \${isComparisonEnabled ? (theme === 'light' ? 'text-zinc-800' : 'text-zinc-200') : (theme === 'light' ? 'text-zinc-400' : 'text-zinc-500')}\`}>
                                    {isComparisonEnabled ? 'ON' : 'OFF'}
                                  </span>
                                </div>`;

content = content.replace(targetAnchor, viewModeBlock + targetAnchor);
content = content.replace(oldRefToggle, '');

fs.writeFileSync('src/App.tsx', content);

console.log("Patched successfully.");

