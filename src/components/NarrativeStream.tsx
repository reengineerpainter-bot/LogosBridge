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
  streamType: 'plain' | 'pers' | 'kjv' | 'bsb';
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
  playSingleVerse: (verseNo: number, text: string) => void;
  playTranslationStream?: (transType: 'plain' | 'pers' | 'kjv' | 'bsb') => void;
  isPlayingAudio?: boolean;
  activeAudioStream?: string | null;
  getSpeechTextForVerse: (v: Verse, overrideTransType?: 'plain' | 'pers' | 'kjv' | 'bsb') => string;
  toggleSaveVerse: (verseNo: number) => void;
  plainBold: boolean;
  plainItalic: boolean;
  personalizedBold: boolean;
  personalizedItalic: boolean;
  manuscriptBold?: boolean;
  manuscriptItalic?: boolean;
  onOpenProjection?: (verseNo: number) => void;
  isHeaderHidden?: boolean;
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
    <div className="space-y-2 animate-fade-in relative">
      <div className={`flex items-center justify-between mb-1 pb-1 border-b border-slate-200/50 dark:border-zinc-800/50 transition-all duration-300 ease-in-out`}>
        <h5 className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400 dark:text-cyan-600">
          {title}
        </h5>
        {playTranslationStream && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isPlayingAudio && activeAudioStream === streamType) {
                stopSpeaking();
              } else {
                playTranslationStream(streamType);
              }
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${
              (isPlayingAudio && activeAudioStream === streamType) 
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-500/20' 
                : theme === 'light' 
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:from-cyan-400 hover:to-blue-500 ring-2 ring-cyan-500/20' 
                  : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-cyan-900/50 hover:shadow-cyan-600/50 hover:from-cyan-500 hover:to-blue-600 ring-2 ring-cyan-500/30'
            } transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
            title={(isPlayingAudio && activeAudioStream === streamType) ? "Stop Audio" : "Play Audio"}
          >
            {(isPlayingAudio && activeAudioStream === streamType) ? <Square className="w-3.5 h-3.5 fill-current animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        )}
      </div>
      <div className={`${
        theme === 'light' ? 'text-slate-800' : 'text-slate-200'
      } space-y-3.5 text-justify leading-[1.8] tracking-[0.01em]`}>
        {chunks.map((chunk, chunkIdx) => {
          const containsFocused = chunk.some(v => v.verseNumber === focusedVerse?.verseNumber) && (!focusedStreamType || focusedStreamType === streamType);
          const focusedInChunk = containsFocused ? chunk.find(v => v.verseNumber === focusedVerse?.verseNumber) : null;
          const isSavedInChunk = focusedInChunk && isVerseSaved(focusedInChunk.verseNumber);
          const verseHighlight = focusedInChunk ? getVerseHighlight(focusedInChunk.verseNumber) : null;
          const hasNotes = !!verseHighlight?.notes;

          return (
            <div key={`para-${streamType}-chunk-wrapper-${chunkIdx}`} className="space-y-2.5 mb-4">
              <div className="text-justify leading-[1.8] tracking-[0.01em]">
                {chunk.map((v) => {
                  const isFocused = focusedVerse?.verseNumber === v.verseNumber;
                  const isReadingThis = currentlyReadingVerse === v.verseNumber;
                  const holdsNotes = !!getVerseHighlight(v.verseNumber)?.notes;

                  let highlightClasses = '';
                  if (isFocused) {
                    highlightClasses = theme === 'light' 
                      ? 'bg-cyan-100/60 dark:bg-cyan-950/25 border-b border-cyan-500/80 text-slate-900 dark:text-white rounded-sm px-1 py-0.5 font-medium' 
                      : 'bg-cyan-500/10 border-b border-cyan-400/50 text-white rounded-sm px-1 py-0.5 font-medium';
                  } else if (holdsNotes) {
                    highlightClasses = theme === 'light' 
                      ? 'bg-amber-105/40 border-b border-amber-400/40 text-slate-900 rounded-sm px-1 py-0.5' 
                      : 'bg-amber-955/20 border-b border-amber-500/20 text-amber-200 rounded-sm px-1 py-0.5';
                  } else {
                    highlightClasses = 'px-1 py-0.5 rounded-sm hover:bg-slate-500/5 dark:hover:bg-cyan-500/5 transition-colors duration-155';
                  }

                  const textVal = streamType === 'plain' 
                    ? v.contemporary 
                    : streamType === 'pers' 
                      ? v.nonNativeEnglish 
                      : streamType === 'kjv' 
                        ? (v.kjvText || '') 
                        : (v.bsbText || '');

                  return (
                    <span
                      key={`para-${streamType}-${v.verseNumber}`}
                      id={`narrative-verse-${streamType}-${v.verseNumber}`}
                      onDoubleClick={() => {
                        if (focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType) {
                          setFocusedVerse(null);
                          if (setFocusedStreamType) setFocusedStreamType(null);
                        } else {
                          setFocusedVerse(v);
                          if (setFocusedStreamType) setFocusedStreamType(streamType);
                        }
                      }}
                      className={`inline relative cursor-pointer leading-[1.8] tracking-[0.01em] transition-all duration-150 ${highlightClasses} ${
                        isReadingThis ? 'ring-1.5 ring-cyan-500/40 animate-pulse-slow' : ''
                      } mr-1`}
                      title={`Double-click to focus study on Verse ${v.verseNumber}`}
                    >
                      <sup className={`text-[9px] font-mono leading-none select-none font-black mr-0.5 ${
                        isReadingThis 
                          ? 'text-cyan-500 animate-bounce' 
                          : theme === 'light' ? 'text-slate-400' : 'text-cyan-600/70'
                      }`}>
                        {v.verseNumber}
                      </sup>
                      <span className={isBold ? 'font-bold' : isItalic ? 'italic' : ''}>
                        {textVal}
                      </span>
{focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-max">
                  <div 
                    className="flex items-center overflow-x-auto hide-scrollbar shadow-lg rounded-full backdrop-blur-md" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border shadow-sm transition-all ${
                      theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-zinc-800'
                    }`}>
                      {/* Minimal Verse Indicator */}
                      <div className={`flex items-center px-1.5 py-0.5 rounded-full shrink-0 ${
                        theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'
                      }`}>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">v.{v.verseNumber}</span>
                      </div>

                      <div className={`w-[1px] h-3 mx-0.5 shrink-0 ${theme === 'light' ? 'bg-slate-200' : 'bg-zinc-800'}`} />

                      {/* Theological Note Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeDraftVerse === v.verseNumber) {
                            handleCancelNote();
                          } else {
                            startEditingNote(v.verseNumber, verseHighlight?.notes || '');
                          }
                        }}
                        className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                          activeDraftVerse === v.verseNumber
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                            : hasNotes
                              ? (theme === 'light' ? 'bg-amber-100 text-amber-800' : 'bg-amber-955/20 text-amber-400')
                              : (theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-400')
                        }`}
                        title="Write or edit theological note reflection"
                      >
                        <StarryCradleIcon className="w-3.5 h-3.5" active={hasNotes} />
                      </button>

                      {/* Bookmark Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveVerse(v.verseNumber);
                        }}
                        className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                          isSavedInChunk
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : (theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400')
                        }`}
                        title="Bookmark verse"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSavedInChunk ? 'fill-current text-emerald-500' : ''}`} />
                      </button>

                      {/* Copy Verse */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const textToCopy = streamType === 'plain'
                            ? v.contemporary
                            : streamType === 'pers'
                              ? v.nonNativeEnglish
                              : streamType === 'kjv'
                                ? (v.kjvText || '')
                                : (v.bsbText || '');
                          const transName = streamType === 'plain' ? 'Plain English' : streamType === 'pers' ? 'Personalised' : streamType === 'kjv' ? 'KJV' : 'BSB';
                          navigator.clipboard.writeText(`[v.${v.verseNumber}] ${textToCopy} (${transName})`);
                        }}
                        className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                          theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
                        }`}
                        title="Copy verse text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Direct Project indicator button */}
                      {onOpenProjection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProjection(v.verseNumber);
                          }}
                          className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                            theme === 'light' ? 'hover:bg-amber-50 text-amber-700' : 'hover:bg-amber-955/20 text-amber-400'
                          }`}
                          title={`Project verse ${v.verseNumber}`}
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className={`w-[1px] h-3 mx-0.5 shrink-0 ${theme === 'light' ? 'bg-slate-200' : 'bg-zinc-800'}`} />

                      {/* Close Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedVerse(null);
                          if (setFocusedStreamType) setFocusedStreamType(null);
                        }}
                        className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                          theme === 'light' ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-rose-955/20 text-rose-400'
                        }`}
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {currentlyReadingVerse === v.verseNumber && (
                    <div className="mt-2 flex items-center justify-between bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-250 dark:border-cyan-950/30">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-cyan-650 flex items-center gap-1">
                        ⚙️ Playback Speed:
                      </span>
                      <div className="flex items-center space-x-2">
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
                        <span className="text-[10.5px] font-mono font-bold text-cyan-600">
                          {playbackSpeed.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  )}
                  </div>)}

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
