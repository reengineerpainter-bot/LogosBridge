import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse } from '../types';
import { Volume2, VolumeX, Bookmark, X, Sliders, Copy, Play, Square, Send, Paperclip, Link2, ChevronRight, Maximize2, Minimize2, MessageSquare, Share2, Check } from 'lucide-react';
import { InlineParagraphContext } from './InlineParagraphContext';
import { InlineReflectionContext } from './InlineReflectionContext';
import { extractPlainTextFromNote } from './SamsungNotebookReflection';
import { getCrossReferencesForVerse, subscribeToCrossReferenceUpdates, getSyncVerseText, addUserCrossReference, removeUserCrossReference, isUserAddedCrossReference } from '../utils/crossReferenceEngine';
import { parseKjvRawTokens, stripSuppliedMarkup } from '../utils/wordClusteringEngine';
import { StudioDeckTheme } from './live-studio/tactileTheme';
import { triggerNativeShare } from '../utils/shareUtils';


export interface VerseHighlight {
  verseNumber: number;
  notes?: string;
  color?: string;
}

export interface NarrativeStreamProps {
  deckTheme?: StudioDeckTheme;
  title?: string;
  streamType?: string;
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
  updateVerseProfileNotes?: (verseNo: number, notes: string) => void;
  openContextualNotebook?: (verseNo: number) => void;
  playSingleVerse: (verseNo: number, text: string) => void;
  playTranslationStream?: (transType?: string) => void;
  isPlayingAudio?: boolean;
  activeAudioStream?: string | null;
  getSpeechTextForVerse: (v: Verse, overrideTransType?: string) => string;
  toggleSaveVerse: (verseNo: number) => void;
  plainBold?: boolean;
  plainItalic?: boolean;
  personalizedBold?: boolean;
  personalizedItalic?: boolean;
  manuscriptBold?: boolean;
  manuscriptItalic?: boolean;
  isScriptureItalic?: boolean;
  isHeaderHidden?: boolean;
  selectedBook?: string;
  selectedChapter?: number;
  isCrossRefOpen?: boolean;
  setIsCrossRefOpen?: (open: boolean) => void;
  crossRefInputText?: string;
  setCrossRefInputText?: (txt: string) => void;
  attachCrossRef?: (ref: string) => void;
  removeCrossRef?: (ref: string) => void;
  attachedCrossRefs?: Array<{ ref: string; text: string }>;
  commonCrossReferences?: Record<string, string[]>;
  inlineContextRef?: string | null;
  setInlineContextRef?: (ref: string | null) => void;
  onOpenInMainReader?: (book: string, chapter: number, targetVerse?: number) => void;
  onVerseSelect?: (v: Verse) => void;
  liveVerseNumber?: number | null;
  liveBook?: string | null;
  liveChapter?: number | null;
  isLowerThirdVisible?: boolean;
  onPreviewScroll?: (ratio: number) => void;
}

export const NarrativeStream: React.FC<NarrativeStreamProps> = ({
  deckTheme,
  title,
  streamType = 'kjv',
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
  updateVerseProfileNotes,
  openContextualNotebook,
  playSingleVerse,
  playTranslationStream,
  isPlayingAudio,
  activeAudioStream,
  getSpeechTextForVerse,
  toggleSaveVerse,
  manuscriptBold = false,
  manuscriptItalic = false,
  isScriptureItalic = false,
  isHeaderHidden = false,
  selectedBook,
  selectedChapter,
  isCrossRefOpen,
  setIsCrossRefOpen,
  crossRefInputText,
  setCrossRefInputText,
  attachCrossRef,
  removeCrossRef,
  attachedCrossRefs,
  commonCrossReferences,
  inlineContextRef,
  setInlineContextRef,
  onOpenInMainReader,
  onVerseSelect,
  liveVerseNumber,
  liveBook,
  liveChapter,
  isLowerThirdVisible = true,
  onPreviewScroll,
}) => {
  const [, setCrossRefUpdateTick] = React.useState(0);
  const [expandedNoteVerses, setExpandedNoteVerses] = React.useState<Record<number, boolean>>({});
  const [activeShareVerse, setActiveShareVerse] = React.useState<number | null>(null);
  const [shareFeedbackVerse, setShareFeedbackVerse] = React.useState<number | null>(null);
  const readVerseDoubleTapRef = React.useRef<{ verseNumber: number; time: number } | null>(null);
  const lastTouchDoubleTapTimeRef = React.useRef<number>(0);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);

  const handleShareSingleVerse = async (e: React.MouseEvent | React.TouchEvent, v: Verse, fallbackText?: string) => {
    e.stopPropagation();
    const refText = `${selectedBook || 'Genesis'} ${selectedChapter || 1}:${v.verseNumber}`;
    const cleanVerse = stripSuppliedMarkup(v.kjvText || (v as any).contemporary || (v as any).nonNativeEnglish || fallbackText || '');
    const sharePayload = `${refText}\n"${cleanVerse.trim()}"\n\n— Shared via LogosBridge`;

    setShareFeedbackVerse(v.verseNumber);
    const result = await triggerNativeShare({
      title: refText,
      text: sharePayload,
      dialogTitle: `Share ${refText}`,
    });
    if (result !== 'cancelled') {
      setTimeout(() => setShareFeedbackVerse(null), 2000);
    } else {
      setShareFeedbackVerse(null);
    }
  };

  const handleVerseDoubleTapAction = (verseNumber: number) => {
    setActiveShareVerse((prev) => (prev === verseNumber ? null : verseNumber));
    toggleVerseNote(verseNumber);
  };

  const toggleVerseNote = (verseNumber: number) => {
    if (activeDraftVerse === verseNumber) {
      handleCancelNote();
    } else {
      if (openContextualNotebook) openContextualNotebook(verseNumber);
      setIsCrossRefOpen?.(false);
    }
  };

  const handleVerseTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleVerseTouchEnd = (e: React.TouchEvent, verseNumber: number) => {
    if (touchStartPosRef.current && e.changedTouches.length === 1) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartPosRef.current.y);
      if (dx > 14 || dy > 14) {
        touchStartPosRef.current = null;
        return;
      }
    }
    touchStartPosRef.current = null;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 450;
    if (
      readVerseDoubleTapRef.current &&
      readVerseDoubleTapRef.current.verseNumber === verseNumber &&
      (now - readVerseDoubleTapRef.current.time) < DOUBLE_TAP_DELAY
    ) {
      lastTouchDoubleTapTimeRef.current = now;
      readVerseDoubleTapRef.current = null;
      handleVerseDoubleTapAction(verseNumber);
    } else {
      readVerseDoubleTapRef.current = { verseNumber, time: now };
    }
  };

  const handleVerseDoubleClick = (e: React.MouseEvent, verseNumber: number) => {
    e.stopPropagation();
    if (Date.now() - lastTouchDoubleTapTimeRef.current < 750) {
      return;
    }
    handleVerseDoubleTapAction(verseNumber);
  };

  React.useEffect(() => {
    return subscribeToCrossReferenceUpdates(() => {
      setCrossRefUpdateTick((prev) => prev + 1);
    });
  }, []);

  return (
    <div className="space-y-2 relative h-full flex flex-col pb-40">
      <div className={`${
        theme === 'light' ? 'text-slate-800' : 'text-slate-200'
      } space-y-3.5 text-left leading-[1.8] tracking-[0.01em] flex-1`}>
        {(Array.isArray(chunks) ? chunks : []).map((chunk, chunkIdx) => {
          if (!Array.isArray(chunk) || chunk.length === 0) return null;
          return (
            <div key={`para-${streamType}-chunk-wrapper-${chunkIdx}`} className="space-y-2.5 mb-4">
              <div className={`text-left leading-[1.8] tracking-[0.01em] ${isScriptureItalic ? 'gentle-italic' : ''}`}>
                {chunk.map((v) => {
                  if (!v || v.verseNumber === undefined || v.verseNumber === null) return null;
                  const isFocused = focusedVerse?.verseNumber === v.verseNumber;
                  const isReadingThis = currentlyReadingVerse === v.verseNumber;
                  const holdsNotes = !!getVerseHighlight(v.verseNumber)?.notes;
                  const isLiveOnAir =
                    liveVerseNumber === v.verseNumber &&
                    (!liveBook || !selectedBook || liveBook.toLowerCase() === selectedBook.toLowerCase()) &&
                    (!liveChapter || !selectedChapter || liveChapter === selectedChapter);

                  const hColor = getVerseHighlightColor?.(v.verseNumber);
                  let highlightClasses = '';
                  if (hColor === 'green') {
                    highlightClasses = theme === 'light' ? 'text-emerald-700 dark:text-emerald-400 font-medium ' : 'text-emerald-400 font-medium ';
                  } else if (hColor === 'blue') {
                    highlightClasses = deckTheme === 'stealth'
                      ? 'text-emerald-400 font-medium '
                      : deckTheme === 'crimson'
                      ? 'text-rose-400 font-medium '
                      : theme === 'light' ? 'text-cyan-700 dark:text-cyan-400 font-medium ' : 'text-cyan-400 font-medium ';
                  } else if (hColor === 'red') {
                    highlightClasses = deckTheme === 'stealth'
                      ? 'text-emerald-400 font-medium '
                      : theme === 'light' ? 'text-rose-700 dark:text-rose-400 font-medium ' : 'text-rose-400 font-medium ';
                  } else if (hColor === 'yellow') {
                    highlightClasses = deckTheme === 'stealth'
                      ? 'text-emerald-400 font-medium '
                      : deckTheme === 'crimson'
                      ? 'text-rose-400 font-medium '
                      : theme === 'light' ? 'text-amber-600 dark:text-amber-300 font-medium ' : 'text-amber-300 font-medium ';
                  } else if (hColor === 'black') {
                    highlightClasses = theme === 'light' ? 'text-zinc-600 dark:text-zinc-400 font-medium ' : 'text-zinc-400 font-medium ';
                  } else if (isFocused) {
                    highlightClasses = deckTheme === 'stealth'
                      ? 'border-b border-emerald-500/80 font-medium '
                      : deckTheme === 'crimson'
                      ? 'border-b border-rose-500/80 font-medium '
                      : 'border-b border-cyan-500/80 font-medium ';
                  } else if (holdsNotes) {
                    highlightClasses = deckTheme === 'stealth'
                      ? 'text-emerald-300 '
                      : deckTheme === 'crimson'
                      ? 'text-rose-300 '
                      : theme === 'light' ? 'text-amber-800 ' : 'text-amber-200 ';
                  } else {
                    highlightClasses = 'transition-colors duration-150 ';
                  }

                  const textContent = v.kjvText || '';
                  const rawKjvTokens = streamType === 'kjv' ? parseKjvRawTokens(textContent) : null;

                  return (
                    <span
                      key={`para-${streamType}-${v.verseNumber}`}
                      id={`narrative-verse-${streamType}-${v.verseNumber}`}
                      data-verse-number={v.verseNumber}
                      onClick={() => {
                        if (onVerseSelect) {
                          onVerseSelect(v);
                        }
                      }}
                      onDoubleClick={(e) => handleVerseDoubleClick(e, v.verseNumber)}
                      onTouchStart={handleVerseTouchStart}
                      onTouchEnd={(e) => handleVerseTouchEnd(e, v.verseNumber)}
                      className={`inline relative cursor-pointer transition-all duration-150 select-none ${highlightClasses} ${
                        isReadingThis
                          ? deckTheme === 'stealth'
                            ? 'ring-1.5 ring-emerald-500/50 animate-pulse-slow'
                            : deckTheme === 'crimson'
                            ? 'ring-1.5 ring-rose-500/50 animate-pulse-slow'
                            : 'ring-1.5 ring-cyan-500/40 animate-pulse-slow'
                          : ''
                      } mr-1`}
                      title={activeDraftVerse === v.verseNumber ? undefined : onVerseSelect ? `Click to send to Live Stream Lower-Third • Double-tap for options` : `Double-tap for options`}
                    >
                      {/* Standalone Verse Number Badge */}
                      <sup
                        onClick={(e) => {
                          e.stopPropagation();
                          if (setVerseHighlightColor) {
                            const colors = ['green', 'blue', 'red', 'yellow', 'black', 'none'];
                            const current = (hColor && colors.includes(hColor as any)) ? hColor : 'none';
                            const idx = colors.indexOf(current as any);
                            const next = colors[(idx + 1) % colors.length];
                            setVerseHighlightColor(v.verseNumber, next);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (setVerseHighlightColor) {
                            const colors = ['green', 'blue', 'red', 'yellow', 'black', 'none'];
                            const current = (hColor && colors.includes(hColor as any)) ? hColor : 'none';
                            const idx = colors.indexOf(current as any);
                            const next = colors[(idx + 1) % colors.length];
                            setVerseHighlightColor(v.verseNumber, next);
                          }
                        }}
                        className={`text-xs font-mono select-none font-black mr-1 cursor-pointer transition-all inline-flex items-center justify-center rounded px-1.5 py-0.5 ${
                          hColor === 'green'
                            ? 'bg-emerald-500 text-white font-black shadow-sm'
                            : hColor === 'blue'
                            ? (deckTheme === 'stealth' ? 'bg-emerald-500 text-white font-black shadow-sm' : deckTheme === 'crimson' ? 'bg-rose-500 text-white font-black shadow-sm' : 'bg-cyan-500 text-white font-black shadow-sm')
                            : hColor === 'red'
                            ? (deckTheme === 'stealth' ? 'bg-emerald-500 text-white font-black shadow-sm' : 'bg-rose-500 text-white font-black shadow-sm')
                            : hColor === 'yellow'
                            ? (deckTheme === 'stealth' ? 'bg-emerald-400 text-emerald-950 font-black shadow-sm' : deckTheme === 'crimson' ? 'bg-rose-500 text-white font-black shadow-sm' : 'bg-amber-400 text-amber-950 font-black shadow-sm')
                            : hColor === 'black'
                            ? (theme === 'light' ? 'bg-zinc-800 text-white font-black shadow-sm ring-1 ring-zinc-700' : 'bg-zinc-200 text-zinc-900 font-black shadow-sm ring-1 ring-zinc-300')
                            : holdsNotes
                            ? (deckTheme === 'stealth' ? 'bg-emerald-500/20 text-emerald-400 font-black' : deckTheme === 'crimson' ? 'bg-rose-500/20 text-rose-400 font-black' : 'bg-amber-500/20 text-amber-500 font-black')
                            : isReadingThis 
                            ? (deckTheme === 'stealth' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : deckTheme === 'crimson' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40')
                            : deckTheme === 'stealth'
                            ? 'bg-[#080d0a] text-emerald-300 hover:bg-[#141f18] border border-emerald-500/20'
                            : deckTheme === 'crimson'
                            ? 'bg-[#0e070a] text-rose-300 hover:bg-[#1e1017] border border-rose-500/20'
                            : theme === 'light' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#251f1b] text-[#e4ded5] hover:bg-[#2e2621] border border-[#3d322b]'
                        }`}
                        title={`Verse ${v.verseNumber} — Click to cycle highlight color`}
                      >
                        {v.verseNumber}
                      </sup>

                      {/* Send to Live button (shown in studio mode when not already live) */}
                      {onVerseSelect && !isLiveOnAir && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerseSelect(v);
                          }}
                          className={`inline-flex items-center justify-center p-0.5 mx-0.5 ${
                            deckTheme === 'stealth'
                              ? 'text-emerald-500/60 hover:text-emerald-300'
                              : deckTheme === 'crimson'
                              ? 'text-rose-500/60 hover:text-rose-300'
                              : 'text-zinc-400 hover:text-white'
                          } transition-opacity opacity-40 hover:opacity-100 cursor-pointer align-middle`}
                          title="Send to Live Lower-Third"
                        >
                          <Send className="w-2.5 h-2.5 rotate-45" />
                        </button>
                      )}

                      {/* Authentic KJV verse text with supplied words in italics */}
                      {streamType === 'kjv' && rawKjvTokens ? (
                        <span>
                          {rawKjvTokens.map((t) => (
                            <span
                              key={t.rawIdx}
                              className={t.isSupplied ? 'italic font-normal opacity-85' : ''}
                              title={t.isSupplied ? 'Supplied word (added by KJV translators, not in original manuscript)' : undefined}
                            >
                              {t.text}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span>
                          {textContent}
                        </span>
                      )}

                      {/* 3 Action Icons Wrapped in a Sleek Tactile Pill — Revealed on Double-Tap */}
                      {(activeShareVerse === v.verseNumber || activeDraftVerse === v.verseNumber) && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-1.5 align-middle select-none rounded-full border shadow-xs backdrop-blur-md transition-all duration-200 bg-neutral-100/95 dark:bg-[#28221c]/95 border-neutral-300/80 dark:border-[#44382f]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1. Share Icon */}
                          <button
                            type="button"
                            onClick={(e) => handleShareSingleVerse(e, v, textContent)}
                            className="p-1 rounded-full text-zinc-600 hover:text-black hover:bg-neutral-200/70 dark:text-[#c4b9aa] dark:hover:text-[#faf6f0] dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer"
                            title="Share Verse"
                          >
                            {shareFeedbackVerse === v.verseNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Micro Divider */}
                          <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                          {/* 2. Cross-Reference Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextOpen = !isCrossRefOpen;
                              setIsCrossRefOpen?.(nextOpen);
                              if (!nextOpen && inlineContextRef) {
                                setInlineContextRef?.(null);
                              }
                            }}
                            className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                              isCrossRefOpen
                                ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                                : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                            }`}
                            title="Cross-References"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Micro Divider */}
                          <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                          {/* 3. Open Note Icon */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedNoteVerses((prev) => ({
                                ...prev,
                                [v.verseNumber]: !prev[v.verseNumber],
                              }));
                            }}
                            className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                              expandedNoteVerses[v.verseNumber]
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                            }`}
                            title={expandedNoteVerses[v.verseNumber] ? "Close Note" : "Open Note"}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}

                      {/* Playback Speed indicator during speech */}
                      {currentlyReadingVerse === v.verseNumber && (
                        <span className={`block mt-2 mb-1 flex items-center justify-between p-1.5 rounded-lg border ${
                          deckTheme === 'stealth'
                            ? 'bg-[#0d1410] border-emerald-500/30'
                            : deckTheme === 'crimson'
                            ? 'bg-[#160c11] border-rose-500/30'
                            : 'bg-slate-100 dark:bg-slate-950 border-slate-250 dark:border-cyan-950/30'
                        }`}>
                          <span className={`text-sm font-mono flex items-center gap-1 ${
                            deckTheme === 'stealth'
                              ? 'text-emerald-400'
                              : deckTheme === 'crimson'
                              ? 'text-rose-400'
                              : 'text-slate-400 dark:text-cyan-650'
                          }`}>
                            ⚙️ Audio Speed:
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
                              className={`w-20 h-1 rounded-lg appearance-none cursor-pointer ${
                                deckTheme === 'stealth'
                                  ? 'bg-[#141f18] accent-emerald-400'
                                  : deckTheme === 'crimson'
                                  ? 'bg-[#22121b] accent-rose-500'
                                  : 'bg-slate-205 dark:bg-cyan-955 accent-cyan-500'
                              }`}
                            />
                            <span className={`text-sm font-mono font-bold ${
                              deckTheme === 'stealth'
                                ? 'text-emerald-400'
                                : deckTheme === 'crimson'
                                ? 'text-rose-400'
                                : 'text-cyan-600'
                            }`}>
                              {playbackSpeed.toFixed(1)}x
                            </span>
                          </span>
                        </span>
                      )}
                      {/* Inline Telegram / WhatsApp Style Quoted Reflection Reply Box Expanding Directly Under Verse */}
                      {activeDraftVerse === v.verseNumber && (
                        <span
                          data-reflection-box="true"
                          className="block mt-2 mb-2 w-full select-text"
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          title=""
                        >
                          {/* WhatsApp / Telegram Quoted Header Banner (Clustered Preview) & Inline Context In-Place Swap */}
                          {isCrossRefOpen && (
                            <AnimatePresence mode="wait">
                              {!inlineContextRef ? (
                                attachedCrossRefs && attachedCrossRefs.length > 0 ? (
                                  <div className="flex flex-col gap-1.5 py-0.5 px-0.5">
                                    {attachedCrossRefs.map((cr) => (
                                      <motion.span
                                        key={`narrative-quoted-preview-${cr.ref}`}
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                        className="flex flex-col"
                                      >
                                        <span key={cr.ref} className="flex items-start justify-between animate-fade-in text-left">
                                          <span className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                                            <span className={`w-1 h-6 rounded-full shrink-0 mt-0.5 ${theme === 'light' ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
                                            <span className="min-w-0 flex-1 flex flex-col">
                                              <span className="flex items-center gap-1.5 mb-0.5">
                                                <span className={`text-xs sm:text-[13px] font-bold font-serif tracking-tight select-none ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                                  {cr.ref}
                                                </span>
                                                <span className="text-[8.5px] font-mono uppercase px-1 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                                                  Cross-Reference
                                                </span>
                                              </span>
                                              {/* Full scripture text capture without truncation — Aligned with Read View Typography & Tone */}
                                              <span className={`text-[13px] sm:text-sm leading-[1.85] tracking-[0.01em] font-serif not-italic font-medium max-h-36 overflow-y-auto pr-1.5 ${theme === 'light' ? 'text-slate-950' : 'text-slate-50'}`}>
                                                {cr.text}
                                              </span>
                                            </span>
                                          </span>

                                          <span className="flex items-center gap-1 shrink-0 mt-0.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setInlineContextRef?.(inlineContextRef === cr.ref ? null : cr.ref);
                                              }}
                                              className={`p-1 rounded-full transition-colors cursor-pointer ${
                                                inlineContextRef === cr.ref
                                                  ? (theme === 'light' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white')
                                                  : (theme === 'light' ? 'hover:bg-zinc-200 text-zinc-900' : 'hover:bg-zinc-800 text-zinc-100')
                                              }`}
                                              title="Read paragraph context"
                                            >
                                              <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 ${inlineContextRef === cr.ref ? 'rotate-90' : ''}`} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeCrossRef?.(cr.ref);
                                              }}
                                              className="p-1 rounded-full text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                              title="Remove cross-reference"
                                            >
                                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                          </span>
                                        </span>
                                      </motion.span>
                                    ))}
                                  </div>
                                ) : null
                              ) : (
                                <motion.span
                                  key={`narrative-inline-context-${inlineContextRef}`}
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                  className="block"
                                >
                                  <InlineParagraphContext
                                    reference={inlineContextRef}
                                    theme={theme}
                                    onCollapse={() => setInlineContextRef?.(null)}
                                    onScroll={onPreviewScroll}
                                    onOpenInMainReader={(b, c, v) => {
                                      setInlineContextRef?.(null);
                                      onOpenInMainReader?.(b, c, v);
                                    }}
                                  />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          )}

                          {/* Material 3 Compact Cross-Reference Attachment Popover */}
                          {isCrossRefOpen && (
                            <span className={`block p-2.5 border-b animate-fade-in text-left ${
                              theme === 'light' ? 'bg-zinc-100/90 border-zinc-200' : 'bg-zinc-900/90 border-zinc-800'
                            }`}>
                              <span className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-800 dark:text-zinc-200">
                                  Cross-Reference
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsCrossRefOpen?.(false)}
                                  className="p-1 rounded-full text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white transition cursor-pointer"
                                  title="Close"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </span>

                              {/* Contextual Suggestion Pills (Persistent Switcher Line & User Attached Verses) */}
                              {(() => {
                                const suggestions = getCrossReferencesForVerse(
                                  selectedBook || 'Genesis',
                                  selectedChapter || 1,
                                  v.verseNumber,
                                  stripSuppliedMarkup(v.kjvText || textContent)
                                );
                                // Merge suggestions with any currently attached references to ensure immediate visibility on the card
                                const allPills = Array.from(new Set([
                                  ...suggestions,
                                  ...(attachedCrossRefs || []).map((cr) => cr.ref)
                                ]));

                                return (
                                  <span className="flex flex-wrap gap-1 mb-2">
                                    {allPills.map((ref) => {
                                      const isCurrentlyPreviewed = attachedCrossRefs?.some((item) => item.ref === ref);
                                      const isUserAdded = isUserAddedCrossReference(
                                        selectedBook || 'Genesis',
                                        selectedChapter || 1,
                                        v.verseNumber,
                                        ref
                                      );
                                      return (
                                        <span
                                          key={ref}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all active:scale-95 ${
                                            isCurrentlyPreviewed
                                              ? (theme === 'light' ? 'bg-black text-white border-black shadow-xs' : 'bg-[#342b25] text-[#faf6f0] border-[#483a30] shadow-xs')
                                              : (theme === 'light' ? 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300/80 shadow-2xs' : 'bg-[#241e1a] hover:bg-[#2e2621] text-[#dcd3c6] border-[#382e27] shadow-2xs')
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => (attachCrossRef as any)?.(ref, true)}
                                            className="cursor-pointer"
                                          >
                                            + {ref}
                                          </button>
                                          {isUserAdded && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeUserCrossReference(
                                                  selectedBook || 'Genesis',
                                                  selectedChapter || 1,
                                                  v.verseNumber,
                                                  ref
                                                );
                                                removeCrossRef?.(ref);
                                              }}
                                              className="ml-0.5 p-0.5 rounded-full hover:text-rose-500 cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                                              title="Delete added cross-reference from card"
                                            >
                                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                                            </button>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </span>
                                );
                              })()}

                              {/* Quick Search / Reference Input */}
                              <span className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={crossRefInputText || ''}
                                  onChange={(e) => setCrossRefInputText?.(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && crossRefInputText?.trim()) {
                                      e.preventDefault();
                                      const cleanRef = crossRefInputText.trim();
                                      addUserCrossReference(
                                        selectedBook || 'Genesis',
                                        selectedChapter || 1,
                                        v.verseNumber,
                                        cleanRef
                                      );
                                      (attachCrossRef as any)?.(cleanRef, true);
                                    }
                                  }}
                                  placeholder="Enter reference..."
                                  className={`flex-1 text-xs px-2 py-1 rounded-lg border focus:outline-none ${
                                    theme === 'light'
                                      ? 'bg-white border-zinc-300 text-black placeholder:text-zinc-400'
                                      : 'bg-[#241e1a] border-[#382e27] text-[#faf6f0] placeholder:text-[#b5a99a]'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (crossRefInputText?.trim()) {
                                      const cleanRef = crossRefInputText.trim();
                                      addUserCrossReference(
                                        selectedBook || 'Genesis',
                                        selectedChapter || 1,
                                        v.verseNumber,
                                        cleanRef
                                      );
                                      (attachCrossRef as any)?.(cleanRef, true);
                                    }
                                  }}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                                    theme === 'light'
                                      ? 'bg-black text-white hover:bg-zinc-800'
                                      : 'bg-[#342b25] text-[#faf6f0] hover:bg-[#483d34] border border-[#483a30]'
                                  }`}
                                >
                                  Attach
                                </button>
                              </span>
                            </span>
                          )}



                          {/* Expanded Note Box (Only shown when user taps note icon; hidden on return) */}
                          {expandedNoteVerses[v.verseNumber] && (
                            <InlineReflectionContext
                              verseNumber={v.verseNumber}
                              reference={`${selectedBook || 'Genesis'} ${selectedChapter || 1}:${v.verseNumber}`}
                              verseText={stripSuppliedMarkup(v.kjvText || textContent)}
                              initialNote={getVerseHighlight ? (getVerseHighlight(v.verseNumber)?.notes || noteDraftText || '') : noteDraftText}
                              onSave={(savedNote) => {
                                setNoteDraftText(savedNote);
                                updateVerseProfileNotes?.(v.verseNumber, savedNote);
                                if (setVerseHighlightColor) {
                                  const currentHighlight = getVerseHighlight ? getVerseHighlight(v.verseNumber) : null;
                                  if (!currentHighlight?.color || currentHighlight.color === 'none') {
                                    setVerseHighlightColor(v.verseNumber, 'amber');
                                  }
                                }
                              }}
                              onCollapse={() => setExpandedNoteVerses(prev => ({ ...prev, [v.verseNumber]: false }))}
                              theme={theme}
                            />
                          )}
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
