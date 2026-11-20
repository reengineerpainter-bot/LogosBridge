/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { VerseAnatomy, StrongsWordStudy, StrongsStudyDatabase } from '../types';
import macroAnatomyData from '../data/macro_anatomy.json';
import {
  getUserLexiconMeaning,
  saveUserLexiconMeaning,
  removeUserLexiconMeaning,
  subscribeToUserLexiconUpdates
} from '../utils/userLexiconEngine';

export type { VerseAnatomy, StrongsWordStudy, StrongsStudyDatabase };

interface StrongsWordStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strongsNumber: string;
  word?: string;
  originalValue?: string;
  language?: 'Hebrew' | 'Greek' | string;
  theme?: 'light' | 'dark';
  verseReference?: string;
  initialDb?: StrongsStudyDatabase | null;
}

let moduleStrongsDbCache: StrongsStudyDatabase | null = null;

export function queryWordStudy(
  db: StrongsStudyDatabase | null,
  cleanCode: string,
  normRef: string
): { foundMicro: StrongsWordStudy | null; foundMacro: VerseAnatomy | null } {
  if (!db) return { foundMicro: null, foundMacro: null };

  const cleanRefId = normRef ? normRef.toLowerCase().replace(/[\s:]+/g, '-') : '';

  let foundMicro: StrongsWordStudy | null = null;
  if (cleanCode) {
    foundMicro = db.wordStudies?.find((w) => {
      const idMatch = cleanRefId && w.id?.toLowerCase() === `${cleanRefId}-${cleanCode}`.toLowerCase();
      const refMatch = normRef && w.verseReference?.trim().toLowerCase() === normRef.toLowerCase() && w.strongsNumber?.toUpperCase() === cleanCode;
      return idMatch || refMatch;
    }) || db.wordStudies?.find((w) => w.strongsNumber?.toUpperCase() === cleanCode) || null;
  }

  const targetRef = normRef || (foundMicro?.verseReference ? foundMicro.verseReference.trim() : '');
  let foundMacro: VerseAnatomy | null = null;
  if (targetRef) {
    const targetNorm = targetRef.toLowerCase().replace(/\s+/g, ' ');
    foundMacro = db.verseAnatomy?.find((v) => {
      const vRefNorm = (v.verseReference || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return vRefNorm === targetNorm || vRefNorm.includes(targetNorm) || targetNorm.includes(vRefNorm);
    }) || null;
  }

  return { foundMicro, foundMacro };
}

export const StrongsWordStudyModal: React.FC<StrongsWordStudyModalProps> = ({
  isOpen,
  onClose,
  strongsNumber,
  word,
  originalValue,
  theme = 'light',
  verseReference,
  initialDb
}) => {
  const activeDb = initialDb || moduleStrongsDbCache;
  if (initialDb && !moduleStrongsDbCache) {
    moduleStrongsDbCache = initialDb;
  }

  const cleanCode = (strongsNumber || '').trim().toUpperCase();
  const normRef = (verseReference || '').trim();

  // Synchronous immediate match on the very first frame to eliminate any mid-animation layout shifting
  const syncMatch = queryWordStudy(activeDb, cleanCode, normRef);

  const [verseAnatomyData, setVerseAnatomyData] = useState<VerseAnatomy | null>(() => syncMatch.foundMacro);
  const [selectedWordData, setSelectedWordData] = useState<StrongsWordStudy | null>(() => syncMatch.foundMicro);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userMeaning, setUserMeaning] = useState<string | null>(() => getUserLexiconMeaning(cleanCode));
  const [isEditingUserMeaning, setIsEditingUserMeaning] = useState<boolean>(false);
  const [draftUserMeaning, setDraftUserMeaning] = useState<string>('');

  useEffect(() => {
    setUserMeaning(getUserLexiconMeaning(cleanCode));
    setIsEditingUserMeaning(false);
    return subscribeToUserLexiconUpdates(() => {
      setUserMeaning(getUserLexiconMeaning(cleanCode));
    });
  }, [cleanCode, isOpen]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Check current in-memory cache first
      const currentDb = initialDb || moduleStrongsDbCache;
      const currentMatch = queryWordStudy(currentDb, cleanCode, normRef);
      if (currentMatch.foundMicro || currentMatch.foundMacro) {
        setVerseAnatomyData(currentMatch.foundMacro);
        setSelectedWordData(currentMatch.foundMicro);
        setIsLoading(false);
        return () => {
          document.body.style.overflow = originalOverflow;
        };
      }

      if (cleanCode || normRef) {
        setIsLoading(true);

        const t = Date.now();
        const candidateUrls = [
          `/data/strongs_study_db.json?t=${t}`,
          `./data/strongs_study_db.json?t=${t}`,
          `data/strongs_study_db.json?t=${t}`,
          ...(typeof window !== 'undefined' && window.location?.origin
            ? [`${window.location.origin}/data/strongs_study_db.json?t=${t}`]
            : [])
        ];

        (async () => {
          let db: StrongsStudyDatabase | null = null;
          for (const url of candidateUrls) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                db = await res.json();
                if (db && (db.verseAnatomy || db.wordStudies)) {
                  moduleStrongsDbCache = db;
                  break;
                }
              }
            } catch {}
          }
          return db;
        })()
          .then((db: StrongsStudyDatabase | null) => {
            const match = queryWordStudy(db, cleanCode, normRef);
            setVerseAnatomyData(match.foundMacro);
            setSelectedWordData(match.foundMicro);
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn('Error reading strongs_study_db.json:', err);
            setIsLoading(false);
          });
      }

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, cleanCode, normRef, initialDb]);

  const isLight = theme === 'light';
  const targetRef = (verseReference || selectedWordData?.verseReference || '').trim();
  const macroDict = (macroAnatomyData as Record<string, string>) || {};
  const dynamicMacroParagraph = targetRef ? (macroDict[targetRef] || null) : null;
  const hasStudyData = Boolean(verseAnatomyData || selectedWordData || dynamicMacroParagraph);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={sheetRef}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.52, ease: [0.25, 1, 0.5, 1] }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight - 80 : 700 }}
            dragElastic={{ top: 0.05, bottom: 0.15 }}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              if (!sheetRef.current) return;
              const rect = sheetRef.current.getBoundingClientRect();
              const visibleHeight = window.innerHeight - rect.top;
              const totalHeight = sheetRef.current.offsetHeight || 500;
              const isAtVeryBottom = visibleHeight < 130 || visibleHeight < totalHeight * 0.20;
              const isFastFlickDown = info.velocity.y > 650 && info.offset.y > 40;

              if (isAtVeryBottom || isFastFlickDown) {
                onClose();
              }
            }}
            className={`w-full max-w-2xl min-h-[480px] sm:min-h-[560px] max-h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 overflow-y-auto shadow-2xl border touch-pan-y flex flex-col ${
              isLight
                ? 'bg-white text-black border-neutral-200'
                : 'bg-[#111622] text-white border-neutral-800'
            }`}
          >
          {/* Mobile Handle Bar */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex justify-center -mt-2 mb-2 cursor-grab active:cursor-grabbing py-2 touch-none select-none" 
            title="Drag to position anywhere on screen"
          >
            <div 
              className={`w-14 h-1.5 rounded-full transition-colors ${
                isLight ? 'bg-neutral-300 hover:bg-neutral-500' : 'bg-neutral-600 hover:bg-neutral-400'
              }`} 
            />
          </div>

          {/* Top Bar: Close Button & Basic Context Pill */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                isLight 
                  ? 'text-black bg-neutral-100 border-neutral-300' 
                  : 'text-white bg-neutral-800 border-neutral-700'
              }`}>
                {strongsNumber?.toUpperCase() || '—'}
              </span>
              {verseReference && (
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {verseReference}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* BARE WAITING STATE: If neither Macro nor Micro data exists */}
          {!hasStudyData ? (
            <div className="py-16 text-center select-none flex flex-col items-center justify-center space-y-3">
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400 dark:text-neutral-500" />
                  <p className="text-xs font-mono tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                    Loading Study Data...
                  </p>
                </>
              ) : (
                <p className="text-sm font-mono tracking-wide text-neutral-400 dark:text-neutral-500">
                  Awaiting Study Data...
                </p>
              )}
            </div>
          ) : (
            /* POPULATED STATE: When Macro/Micro data is present */
            <div className="space-y-6 pt-4">
              {/* Header Details (Micro Word) */}
              {selectedWordData && (
                <div className="space-y-1 pb-1">
                  <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight">
                    {selectedWordData.originalWord}
                  </h2>
                  {selectedWordData.coreMeaning && (
                    <p className="text-sm sm:text-base font-serif italic text-neutral-700 dark:text-neutral-300">
                      "{selectedWordData.coreMeaning}"
                    </p>
                  )}
                </div>
              )}

              {/* DUAL-TRACK SIDE-BY-SIDE LEXICAL COMPARISON BOX */}
              <div className={`p-3 rounded-2xl border transition-colors ${
                isLight ? 'bg-amber-50/60 border-amber-200/80' : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider pb-1.5 border-b border-amber-500/20 font-bold">
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <span>⚖️</span> Dual-Track Lexical Comparison
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-500 normal-case font-normal text-[10px]">Side-by-Side</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                  {/* Left Track: System Concordance / Core Root */}
                  <div className={`p-2.5 rounded-xl border space-y-1 ${
                    isLight ? 'bg-white border-neutral-200 shadow-2xs' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <span>🏛️</span> System Core
                    </span>
                    <p className={`text-xs font-serif italic font-medium leading-snug ${
                      isLight ? 'text-neutral-800' : 'text-neutral-200'
                    }`}>
                      {selectedWordData?.coreMeaning ? `"${selectedWordData.coreMeaning}"` : 'Authoritative Concordance Root'}
                    </p>
                  </div>

                  {/* Right Track: User Attached Meaning */}
                  <div className={`p-2.5 rounded-xl border space-y-1 ${
                    isLight 
                      ? 'bg-amber-100/40 border-amber-300/80 shadow-2xs' 
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <span>✦</span> My Gloss
                      </span>
                      {userMeaning && !isEditingUserMeaning && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftUserMeaning(userMeaning);
                              setIsEditingUserMeaning(true);
                            }}
                            className="p-0.5 rounded text-neutral-500 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-300 cursor-pointer active:scale-90"
                            title="Edit personal gloss"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeUserLexiconMeaning(cleanCode);
                              setUserMeaning(null);
                            }}
                            className="p-0.5 rounded text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 cursor-pointer active:scale-90"
                            title="Remove personal gloss"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingUserMeaning ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={draftUserMeaning}
                          onChange={(e) => setDraftUserMeaning(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveUserLexiconMeaning(cleanCode, draftUserMeaning);
                              setUserMeaning(draftUserMeaning.trim() || null);
                              setIsEditingUserMeaning(false);
                            }
                          }}
                          placeholder="Type your personal meaning..."
                          className={`w-full text-xs px-2 py-1 rounded-lg border font-serif italic focus:outline-none ${
                            isLight 
                              ? 'bg-white border-amber-400 text-neutral-900' 
                              : 'bg-slate-950 border-amber-500/50 text-amber-200'
                          }`}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsEditingUserMeaning(false)}
                            className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              saveUserLexiconMeaning(cleanCode, draftUserMeaning);
                              setUserMeaning(draftUserMeaning.trim() || null);
                              setIsEditingUserMeaning(false);
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : userMeaning ? (
                      <p className={`text-xs font-serif italic font-bold leading-snug ${
                        isLight ? 'text-amber-900' : 'text-amber-200'
                      }`}>
                        "{userMeaning}"
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftUserMeaning('');
                          setIsEditingUserMeaning(true);
                        }}
                        className="text-[11px] font-sans text-neutral-500 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer py-0.5"
                      >
                        <span>+ Attach My Meaning</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* MACRO DATA: Dynamic Macro Anatomy Paragraph from Verse Metadata (Elevated Legibility on Mobile) */}
              {(dynamicMacroParagraph || verseAnatomyData) && (
                <div className={`space-y-2 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                  isLight
                    ? 'bg-neutral-50/90 border-neutral-200/90 shadow-2xs'
                    : 'bg-[#151b2a] border-neutral-800 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      isLight ? 'text-neutral-900' : 'text-neutral-100'
                    }`}>
                      Macro Anatomy
                    </h3>
                    {(targetRef || verseAnatomyData?.verseReference) && (
                      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        isLight ? 'text-neutral-700 bg-neutral-200/60' : 'text-neutral-300 bg-neutral-800'
                      }`}>
                        {targetRef || verseAnatomyData?.verseReference}
                      </span>
                    )}
                  </div>

                  {dynamicMacroParagraph ? (
                    <p className={`text-xs sm:text-[13.5px] leading-relaxed font-sans font-medium ${
                      isLight ? 'text-neutral-850 text-slate-800' : 'text-neutral-200'
                    }`}>
                      {dynamicMacroParagraph}
                    </p>
                  ) : verseAnatomyData ? (
                    <p className={`text-xs sm:text-[13.5px] leading-relaxed font-sans font-medium ${
                      isLight ? 'text-neutral-850 text-slate-800' : 'text-neutral-200'
                    }`}>
                      {verseAnatomyData.subject && (
                        <>
                          <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>Subject: </span>
                          {verseAnatomyData.subject}{' '}
                        </>
                      )}
                      {verseAnatomyData.action && (
                        <>
                          <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>Action: </span>
                          {verseAnatomyData.action}{' '}
                        </>
                      )}
                      {verseAnatomyData.object && (
                        <>
                          <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>Object: </span>
                          {verseAnatomyData.object}{' '}
                        </>
                      )}
                      {verseAnatomyData.qualitiesAndConditions && (
                        <>
                          <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>Qualities: </span>
                          {verseAnatomyData.qualitiesAndConditions}{' '}
                        </>
                      )}
                      {verseAnatomyData.legalLinksAndBoundaries && (
                        <>
                          <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>Boundaries: </span>
                          {verseAnatomyData.legalLinksAndBoundaries}
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              )}

              {/* MICRO DATA: Scaled Up History and Context (Primary Visual Focus) */}
              {selectedWordData && (
                <div className="space-y-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="space-y-4">
                    <h3 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-neutral-900 dark:text-white">
                      History and Context
                    </h3>

                    {/* Core Meaning */}
                    {selectedWordData.coreMeaning && (
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                          Core Meaning
                        </h4>
                        <p className="text-base sm:text-lg font-serif leading-relaxed text-neutral-900 dark:text-neutral-100 font-medium">
                          "{selectedWordData.coreMeaning}"
                        </p>
                      </div>
                    )}

                    {/* Word History */}
                    {selectedWordData.wordHistory && (
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-mono font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          Word History
                        </h4>
                        <p className="text-sm sm:text-base font-serif leading-relaxed text-neutral-850 dark:text-neutral-150">
                          {selectedWordData.wordHistory}
                        </p>
                      </div>
                    )}

                    {/* Ancient Worldview */}
                    {selectedWordData.ancientWorldview && (
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-mono font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          Ancient Worldview
                        </h4>
                        <p className="text-sm sm:text-base font-serif leading-relaxed text-neutral-850 dark:text-neutral-150">
                          {selectedWordData.ancientWorldview}
                        </p>
                      </div>
                    )}

                    {/* Writer's Intent */}
                    {selectedWordData.writersIntent && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          Writer's Intent
                        </h4>
                        <p className="text-sm sm:text-base font-serif leading-relaxed text-neutral-850 dark:text-neutral-150">
                          {selectedWordData.writersIntent}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* The True Anchor */}
                  {(selectedWordData.theTrueAnchor || selectedWordData.spiritualAndCovenantReality) && (
                    <div className="space-y-1.5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <h3 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-neutral-900 dark:text-white">
                        The True Anchor
                      </h3>
                      <p className="text-sm sm:text-base font-serif leading-relaxed text-neutral-850 dark:text-neutral-150">
                        {selectedWordData.theTrueAnchor || selectedWordData.spiritualAndCovenantReality}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
};
