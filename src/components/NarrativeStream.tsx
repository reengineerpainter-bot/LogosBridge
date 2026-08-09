import React from 'react';
import { Verse } from '../types';
import { Volume2, VolumeX, Bookmark, X, Sliders, Tv, Copy, Play, Square } from 'lucide-react';

export const StarryCradleIcon = ({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <g 
        stroke="currentColor" 
        strokeWidth="32" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Stars Stack (Left) */}
        <path d="M125 90l7 14 16 2-12 11 3 16-14-8-14 8 3-16-14-11 16-2z" fill={active ? "currentColor" : "none"} />
        <path d="M125 190l7 14 16 2-12 11 3 16-14-8-14 8 3-16-14-11 16-2z" fill={active ? "currentColor" : "none"} />
        <path d="M125 290l7 14 16 2-12 11 3 16-14-8-14 8 3-16-14-11 16-2z" fill={active ? "currentColor" : "none"} />

        {/* List lines (Right) */}
        <rect x="185" y="94" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />
        <rect x="185" y="194" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />
        <rect x="185" y="294" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />

        {/* Supportive cradling hand at bottom */}
        <path d="M 65 375 C 115 330, 195 350, 255 375 C 285 390, 315 390, 345 370 C 405 325, 455 335, 490 375" />
        <path d="M 105 435 C 155 400, 255 430, 335 415 C 395 400, 445 410, 480 445" />
      </g>
    </svg>
  );
};

export interface VerseHighlight {
  verseNumber: number;
  notes?: string;
  color?: string;
}

export interface NarrativeStreamProps {
  title: string;
  streamType: 'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe';
  chunks: Verse[][];
  focusedVerse: Verse | null;
  focusedStreamType?: string | null;
  setFocusedVerse: (v: Verse | null) => void;
  setFocusedStreamType?: (t: string | null) => void;
  currentlyReadingVerse: number | null;
  theme: string;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  activeDraftVerse: number | null;
  noteDraftText: string;
  setNoteDraftText: (text: string) => void;
  handleCancelNote: () => void;
  handleSaveNote: (verseNo: number) => void;
  startEditingNote: (verseNo: number, notes: string) => void;
  isVerseSaved: (verseNo: number) => boolean;
  getVerseHighlight: (verseNo: number) => VerseHighlight | undefined;
  stopSpeaking: () => void;
  getVerseHighlightColor?: (verseNo: number) => string | undefined;
  setVerseHighlightColor?: (verseNo: number, color: string) => void;
  openContextualNotebook?: (verseNo: number) => void;
  playSingleVerse: (verseNo: number, text: string) => void;
  playTranslationStream?: (transType: 'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe') => void;
  isPlayingAudio?: boolean;
  activeAudioStream?: string | null;
  getSpeechTextForVerse: (v: Verse, overrideTransType?: 'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe') => string;
  toggleSaveVerse: (verseNo: number) => void;
  plainBold: boolean;
  plainItalic: boolean;
  personalizedBold: boolean;
  personalizedItalic: boolean;
  manuscriptBold?: boolean;
  manuscriptItalic?: boolean;
  onOpenProjection?: (verseNo: number) => void;
  isHeaderHidden?: boolean;
  dynamicTranslationData?: Record<string, string>;
}

export const NarrativeStream: React.FC<NarrativeStreamProps> = ({
  title,
  streamType,
  chunks,
  focusedVerse,
  focusedStreamType,
  setFocusedVerse,
  setFocusedStreamType,
  currentlyReadingVerse,
  theme,
  playbackSpeed,
  setPlaybackSpeed,
  activeDraftVerse,
  noteDraftText,
  setNoteDraftText,
  handleCancelNote,
  handleSaveNote,
  startEditingNote,
  isVerseSaved,
  getVerseHighlight,
  stopSpeaking,
  getVerseHighlightColor,
  setVerseHighlightColor,
  openContextualNotebook,
  playSingleVerse,
  playTranslationStream,
  isPlayingAudio,
  activeAudioStream,
  getSpeechTextForVerse,
  toggleSaveVerse,
  plainBold,
  plainItalic,
  personalizedBold,
  personalizedItalic,
  manuscriptBold = false,
  manuscriptItalic = false,
  onOpenProjection,
  isHeaderHidden = false,
  dynamicTranslationData = {},
}) => {
  const isBold = streamType === 'plain' 
    ? plainBold 
    : streamType === 'pers' 
      ? personalizedBold 
      : manuscriptBold;
  const isItalic = streamType === 'plain' 
    ? plainItalic 
    : streamType === 'pers' 
      ? personalizedItalic 
      : manuscriptItalic;

  return (
    <div className="space-y-2 animate-fade-in relative h-full flex flex-col pb-40">
      <div className={`${
        theme === 'light' ? 'text-slate-800' : 'text-slate-200'
      } space-y-3.5 text-left leading-[1.8] tracking-[0.01em] flex-1`}>
        {chunks.map((chunk, chunkIdx) => {
          const containsFocused = chunk.some(v => v.verseNumber === focusedVerse?.verseNumber) && (!focusedStreamType || focusedStreamType === streamType);
          const focusedInChunk = containsFocused ? chunk.find(v => v.verseNumber === focusedVerse?.verseNumber) : null;
          const isSavedInChunk = focusedInChunk && isVerseSaved(focusedInChunk.verseNumber);
          const verseHighlight = focusedInChunk ? getVerseHighlight(focusedInChunk.verseNumber) : null;
          const hasNotes = !!verseHighlight?.notes;

          return (
            <div key={`para-${streamType}-chunk-wrapper-${chunkIdx}`} className="space-y-2.5 mb-4">
              <div className="text-left leading-[1.8] tracking-[0.01em]">
                {chunk.map((v) => {
                  const isFocused = focusedVerse?.verseNumber === v.verseNumber;
                  const isReadingThis = currentlyReadingVerse === v.verseNumber;
                  const holdsNotes = !!getVerseHighlight(v.verseNumber)?.notes;

                  const hColor = getVerseHighlightColor?.(v.verseNumber);
                  let highlightClasses = '';
                  if (hColor === 'yellow') highlightClasses += (theme === 'light' ? 'bg-yellow-100/80 ' : 'bg-yellow-900/50 ');
                  else if (hColor === 'green') highlightClasses += (theme === 'light' ? 'bg-green-100/80 ' : 'bg-green-900/50 ');
                  else if (hColor === 'blue') highlightClasses += (theme === 'light' ? 'bg-blue-100/80 ' : 'bg-blue-900/50 ');
                  else if (hColor === 'pink') highlightClasses += (theme === 'light' ? 'bg-pink-100/80 ' : 'bg-pink-900/50 ');

                  if (isFocused) {
                    highlightClasses += theme === 'light' 
                      ? 'bg-cyan-100/60 dark:bg-cyan-950/25 border-b border-cyan-500/80 text-slate-900 dark:text-white rounded-sm px-1 py-0.5 font-medium ' 
                      : 'bg-cyan-500/10 border-b border-cyan-400/50 text-white rounded-sm px-1 py-0.5 font-medium ';
                  } else if (holdsNotes) {
                    highlightClasses += theme === 'light' 
                      ? 'bg-amber-105/40 border-b border-amber-400/40 text-slate-900 rounded-sm px-1 py-0.5 ' 
                      : 'bg-amber-955/20 border-b border-amber-500/20 text-amber-200 rounded-sm px-1 py-0.5 ';
                  } else if (!hColor) {
                    highlightClasses += 'px-1 py-0.5 rounded-sm hover:bg-slate-500/5 dark:hover:bg-cyan-500/5 transition-colors duration-155 ';
                  } else {
                    highlightClasses += 'px-1 py-0.5 rounded-sm transition-colors duration-155 text-slate-900 dark:text-white ';
                  }

                  let textContent: React.ReactNode = '';
                  if (streamType === 'plain') {
                    textContent = v.contemporary;
                  } else if (streamType === 'pers') {
                    textContent = v.nonNativeEnglish;
                  } else if (streamType === 'kjv') {
                    textContent = v.kjvText || dynamicTranslationData[v.verseNumber.toString()] || '';
                  } else if (streamType === 'bsb') {
                    textContent = v.bsbText || dynamicTranslationData[v.verseNumber.toString()] || '';
                  } else if (['asv', 'ylt', 'bbe'].includes(streamType)) {
                    textContent = dynamicTranslationData[v.verseNumber.toString()] || <span className="inline-block animate-pulse bg-slate-200 dark:bg-slate-800 h-4 w-3/4 rounded align-middle mx-1"></span>;
                  }

                  return (
                    <span
                      key={`para-${streamType}-${v.verseNumber}`}
                      id={`narrative-verse-${streamType}-${v.verseNumber}`}
                      onDoubleClick={() => {
                        if (activeDraftVerse === v.verseNumber) {
                          handleCancelNote();
                        } else {
                          if (openContextualNotebook) openContextualNotebook(v.verseNumber);
                        }
                      }}
                      onClick={() => {
                        if (activeDraftVerse !== null && activeDraftVerse !== v.verseNumber) {
                          handleCancelNote();
                        }
                      }}
                      className={`inline-block relative cursor-pointer transition-all duration-150 ${highlightClasses} ${
                        isReadingThis ? 'ring-1.5 ring-cyan-500/40 animate-pulse-slow' : ''
                      } mr-1 mb-1`}
                      title={`Double-click to open notebook`}
                    >
                      {/* Verse Number Badge - tap for color palette */}
                      <sup
                        onClick={(e) => {
                          e.stopPropagation();
                          if (focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType) {
                            setFocusedVerse(null);
                            if (setFocusedStreamType) setFocusedStreamType(null);
                          } else {
                            setFocusedVerse(v);
                            if (setFocusedStreamType) setFocusedStreamType(streamType);
                          }
                        }}
                        className={`text-sm font-mono leading-none select-none font-black mr-0.5 cursor-pointer transition-all inline-flex items-center justify-center rounded-full ${
                          focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType
                            ? (theme === 'light' ? 'bg-cyan-500 text-white px-1.5 py-0.5 scale-110' : 'bg-cyan-600 text-white px-1.5 py-0.5 scale-110')
                            : isReadingThis 
                              ? 'text-cyan-500 animate-bounce' 
                              : theme === 'light' ? 'text-slate-400 hover:text-cyan-500' : 'text-cyan-600/70 hover:text-cyan-400'
                        }`}
                      >
                        {v.verseNumber}
                      </sup>

                      {/* Verse text content */}
                      {textContent}

                      {/* Color Palette Popup - appears to the right of the badge */}
                                        {currentlyReadingVerse === v.verseNumber && (
                    <span className="block mt-2 mb-1 flex items-center justify-between bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-250 dark:border-cyan-950/30">
                      <span className="text-sm font-mono text-slate-400 dark:text-cyan-650 flex items-center gap-1">
                        ⚙️ Playback Speed:
                      </span>
                      <span className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={playbackSpeed}
                          onChange={(e) => {
                            e.stopPropagation();
                            setPlaybackSpeed(parseFloat(e.target.value));
                          }}
                          className="w-20 h-1 bg-slate-205 dark:bg-cyan-955 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <span className="text-sm font-mono font-bold text-cyan-600">
                          {playbackSpeed.toFixed(1)}x
                        </span>
                      </span>
                    </span>
                      )}

                      {/* Inline Note Reply Bubble */}
                      {activeDraftVerse === v.verseNumber && (
                        <span
                          className={`block mt-2 mb-2 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up w-full ${
                            theme === 'light' 
                              ? 'bg-slate-50 border border-slate-200' 
                              : 'bg-[#0c1018] border border-slate-700'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="flex items-end gap-2 p-2">
                            <textarea
                              value={noteDraftText}
                              onChange={(e) => setNoteDraftText(e.target.value)}
                              placeholder="Write your reflection..."
                              autoFocus
                              rows={2}
                              className={`flex-1 text-sm resize-none rounded-xl px-3 py-2 focus:outline-none ${
                                theme === 'light'
                                  ? 'bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200'
                                  : 'bg-slate-800/60 text-slate-100 placeholder:text-slate-500 border border-slate-700'
                              }`}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveNote(v.verseNumber); }}
                              className="shrink-0 px-5 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md flex items-center justify-center transition-all active:scale-95"
                            >
                              Save
                            </button>
                          </span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              

            </div>
          );
        })}
      </div>
    </div>
  );
};
