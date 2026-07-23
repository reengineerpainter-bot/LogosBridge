const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const lines = content.split('\n');

const startLine = 3271; // 0-indexed is 3271 for line 3272
const endLine = 3774; // 0-indexed is 3774 for line 3775

const newBlock = `                  {/* Table rows / Paragraph blocks */}
                  {layoutMode === 'paragraph' ? (() => {
                    const versesList = paginatedVersesList;
                    const chunks: any[][] = [];
                    for (let i = 0; i < versesList.length; i += 3) {
                      chunks.push(versesList.slice(i, i + 3));
                    }

                    const isMultiCol = translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv';

                    const renderNarrativeStream = (type: 'plain' | 'pers' | 'kjv' | 'bsb', customTitle?: string) => (
                      <NarrativeStream
                        title={customTitle || (type === 'plain' ? "📖 Plain English Narrative" : type === 'pers' ? "✨ Personalised Prayer Narrative" : type === 'kjv' ? "📜 King James Version (KJV)" : "🛡️ Berean Standard Bible (BSB)")}
                        streamType={type}
                        chunks={chunks}
                        focusedVerse={focusedVerse}
                        setFocusedVerse={setFocusedVerse}
                        currentlyReadingVerse={currentlyReadingVerse}
                        theme={theme}
                        playbackSpeed={playbackSpeed}
                        setPlaybackSpeed={setPlaybackSpeed}
                        activeDraftVerse={activeDraftVerse}
                        noteDraftText={noteDraftText}
                        setNoteDraftText={setNoteDraftText}
                        handleCancelNote={handleCancelNote}
                        handleSaveNote={handleSaveNote}
                        startEditingNote={startEditingNote}
                        isVerseSaved={isVerseSaved}
                        getVerseHighlight={getVerseHighlight}
                        stopSpeaking={stopSpeaking}
                        playSingleVerse={playSingleVerse}
                        getSpeechTextForVerse={getSpeechTextForVerse}
                        toggleSaveVerse={toggleSaveVerse}
                        plainBold={plainBold}
                        plainItalic={plainItalic}
                        personalizedBold={personalizedBold}
                        personalizedItalic={personalizedItalic}
                        manuscriptBold={manuscriptBold}
                        manuscriptItalic={manuscriptItalic}
                        onOpenProjection={(verseNo) => {
                          setProjectionInitialVerseNumber(verseNo);
                          setIsProjectionStudioOpen(true);
                          playWebAudioBeep(640, 'sine', 0.08);
                        }}
                      />
                    );

                    if (isMultiCol) {
                      return (
                        <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 h-[calc(100vh-160px)]">
                          {(translationDisplayMode === 'both' || translationDisplayMode === 'plain_kjv') && (
                            <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#080d19]/40 border-cyan-955/30'} rounded-xl border p-2\`}>
                              {renderNarrativeStream('plain')}
                            </div>
                          )}

                          {(translationDisplayMode === 'both' || translationDisplayMode === 'personalized_kjv') && (
                            <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-white/50 border-slate-200' : 'bg-[#080d19]/40 border-cyan-955/30'} rounded-xl border p-2\`}>
                              {renderNarrativeStream('pers')}
                            </div>
                          )}

                          {((translationDisplayMode === 'plain_kjv' || translationDisplayMode === 'personalized_kjv') || (translationDisplayMode === 'both' && isComparisonEnabled)) && (
                            <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-amber-50/30 border-amber-200/50' : 'bg-amber-950/10 border-amber-900/30'} rounded-xl border p-2\`}>
                              {renderNarrativeStream('kjv')}
                            </div>
                          )}

                          {(translationDisplayMode === 'both' && isComparisonEnabled) && (
                            <div className={\`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full \${theme === 'light' ? 'bg-emerald-50/30 border-emerald-200/50' : 'bg-emerald-950/10 border-emerald-900/30'} rounded-xl border p-2\`}>
                              {renderNarrativeStream('bsb')}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Original Single Column view
                    const singleTransType = translationDisplayMode === 'plain' ? 'plain' : translationDisplayMode === 'personalized' ? 'pers' : translationDisplayMode === 'kjv' ? 'kjv' : 'bsb';

                    return (
                      <div className="p-5 md:p-8 space-y-6">
                        <div className={\`max-w-3xl mx-auto \${scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[16px]' : scriptureFontSizeSetting === 'base' ? 'text-[18px]' : 'text-[20px]'} \${getScriptureStyleClasses()}\`}>
                          {renderNarrativeStream(singleTransType)}
                        </div>
                        
                        {/* Micro notice representing focused verse helper */}
                        <div className={\`mt-6 text-center text-[10.5px] font-mono text-slate-400 dark:text-cyan-600/60 border-t pt-4 \${theme === 'light' ? 'border-slate-100' : 'border-cyan-950/25'}\`}>
                          💡 Double-click on any verse section above in the paragraph to activate bookmarks, voice reading, lexicons, and personal notes inside the Deep Study Panel below!
                        </div>
                      </div>
                    );
                  })() : (`;

const newLines = [...lines.slice(0, startLine), newBlock, ...lines.slice(endLine)];
fs.writeFileSync('src/App.tsx', newLines.join('\n'));
