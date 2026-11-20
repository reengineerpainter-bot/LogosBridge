/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X } from 'lucide-react';
import { DecodedMorphologyResult, decodeMorphologyTag, MorphToken } from '../utils/morphologyEngine';

export type DecodedMorphology = DecodedMorphologyResult;
export { decodeMorphologyTag as decodeGrammarTag };

interface ParsingTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DecodedMorphology | null;
  theme?: 'light' | 'dark';
  onExploreStrongs?: (strongs: string, gloss: string, word: string, lang: string) => void;
}

export const ParsingTagModal: React.FC<ParsingTagModalProps> = ({
  isOpen,
  onClose,
  data,
  theme = 'light',
  onExploreStrongs
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isLight = theme === 'light';
  const isHebrew = data.language === 'Hebrew' || data.strongs.startsWith('H') || (!data.strongs.startsWith('G') && data.word && /[\u0590-\u05FF]/.test(data.word));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[2900] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
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
          onClick={(e) => e.stopPropagation()}
          className={`w-full sm:max-w-xl rounded-t-[32px] sm:rounded-3xl border border-neutral-300 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y ${
            isLight
              ? 'bg-[#ffffff] text-[#000000] border-neutral-300'
              : 'bg-[#000000] text-[#ffffff] border-neutral-700'
          }`}
        >
          {/* Top Drag Handle (Draggable to position anywhere on screen) */}
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

          {/* Header: Raw Tag, Strong's Number, Language, Original Word & Gloss (Bare & Borderless) */}
          <div
            onPointerDown={(e) => {
              if (!(e.target as HTMLElement).closest('button')) {
                dragControls.start(e);
              }
            }}
            className={`space-y-2 border-b pb-4 select-none cursor-grab active:cursor-grabbing ${
              isLight ? 'border-neutral-200' : 'border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-mono font-bold tracking-wider ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                  PARSING:
                </span>
                <span
                  className={`text-sm sm:text-base font-mono font-bold tracking-tight ${
                    isLight ? 'text-black' : 'text-white'
                  }`}
                >
                  {data.tag}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                    isLight
                      ? 'text-black bg-neutral-100 border-neutral-300'
                      : 'text-white bg-neutral-800 border-neutral-700'
                  }`}
                >
                  {data.strongs} • {data.language}
                </span>
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
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1 min-w-0">
              <span
                dir={isHebrew ? 'rtl' : 'ltr'}
                className={`text-2xl sm:text-4xl font-bold shrink-0 ${
                  isHebrew ? 'hebrew-text' : 'greek-text'
                } ${isLight ? 'text-black' : 'text-white'}`}
              >
                {data.word}
              </span>
              <span
                className={`text-sm sm:text-base font-serif italic break-words flex-1 min-w-[140px] font-medium leading-snug ${
                  isLight ? 'text-neutral-900' : 'text-neutral-100'
                }`}
              >
                {data.root !== '—' && data.root !== data.word ? `${data.root} — ` : ''}"{data.gloss}"
              </span>
            </div>

            <p className={`text-xs sm:text-sm font-serif font-semibold mt-1 ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
              {data.fullTitle}
            </p>
          </div>

          {/* Line-by-Line Zero-Omission Abbreviation Breakdown (Bare & Borderless) */}
          <div className="space-y-1">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-bold block pb-1 border-b ${
                isLight ? 'text-neutral-700 border-neutral-200' : 'text-neutral-300 border-neutral-800'
              }`}
            >
              Abbreviation Token Breakdown
            </span>

            <div className={`divide-y ${isLight ? 'divide-neutral-100' : 'divide-neutral-800'}`}>
              {data.tokens && data.tokens.length > 0 ? (
                data.tokens.map((t: MorphToken, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-start gap-4">
                    <span
                      className={`font-mono font-bold text-sm shrink-0 w-16 pt-0.5 tracking-wide ${
                        isLight ? 'text-black' : 'text-white'
                      }`}
                    >
                      {t.abbr}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`font-bold text-sm block ${
                          isLight ? 'text-neutral-900' : 'text-neutral-100'
                        }`}
                      >
                        {t.name}
                      </span>
                      <span
                        className={`text-xs sm:text-sm block mt-0.5 leading-relaxed font-medium ${
                          isLight ? 'text-neutral-750 text-slate-800' : 'text-neutral-300'
                        }`}
                      >
                        {t.meaning}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-2 text-xs font-mono text-neutral-500">
                  {data.fullTitle}
                </div>
              )}
            </div>
          </div>

          {/* Syntactic Context & Significance (Bare & Borderless) */}
          <div
            className={`space-y-1 pt-2 border-t ${
              isLight ? 'border-neutral-200' : 'border-neutral-800'
            }`}
          >
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                isLight ? 'text-neutral-700' : 'text-neutral-300'
              }`}
            >
              Syntactic &amp; Exegetical Context
            </span>
            <p
              className={`text-xs sm:text-sm leading-relaxed font-serif pt-1 font-medium ${
                isLight ? 'text-neutral-900' : 'text-neutral-100'
              }`}
            >
              {data.syntactic}
            </p>
          </div>

          {/* Footer: Open Strong's Concordance Study */}
          {onExploreStrongs && (
            <div
              className={`pt-3 border-t flex items-center justify-between ${
                isLight ? 'border-neutral-200' : 'border-neutral-800'
              }`}
            >
              <button
                onClick={() => {
                  onClose();
                  onExploreStrongs(
                    data.strongs,
                    data.gloss,
                    data.word,
                    isHebrew ? 'Hebrew' : 'Greek'
                  );
                }}
                className={`text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer underline underline-offset-4 transition-colors ${
                  isLight
                    ? 'text-black hover:text-neutral-700'
                    : 'text-white hover:text-neutral-300'
                }`}
              >
                <span>Open Strong's Concordance Word Study</span>
                <span className="text-[10px]">↗</span>
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
