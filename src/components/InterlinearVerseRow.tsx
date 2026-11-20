import React, { useMemo } from 'react';
import { InterlinearWordToken, parseKjvRawTokens, getMatchedKjvTokenIndices } from '../utils/wordClusteringEngine';
import { getWordTransliteration } from '../utils/transliterationEngine';
import { getWordMorphology } from '../utils/morphologyEngine';
import { getUserLexiconMeaning } from '../utils/userLexiconEngine';

export interface InterlinearVerseRowProps {
  verseNumber: number;
  words: InterlinearWordToken[];
  kjvText: string;
  manuscriptTextFallback?: string;
  isHebrew: boolean;
  textDisplayMode: 'script' | 'translit';
  theme: string;
  scriptureZoom: number;
  isScriptureItalic: boolean;
  textHighlightClass: string;
  activeWordId: string | null;
  getStudyAccentClass: () => string;
  getScriptureStyleClasses: () => string;
  onSelectWord: (wordObj: InterlinearWordToken, wordKey: string) => void;
  onClearWord: () => void;
  onDoubleClickVerse: (e: React.MouseEvent) => void;
  onTouchStartVerse: (e: React.TouchEvent) => void;
  onTouchEndVerse: (e: React.TouchEvent) => void;
  actionPillNode?: React.ReactNode;
  children?: React.ReactNode;
}

export const InterlinearVerseRow: React.FC<InterlinearVerseRowProps> = ({
  verseNumber,
  words,
  kjvText,
  manuscriptTextFallback,
  isHebrew,
  textDisplayMode,
  theme,
  scriptureZoom,
  isScriptureItalic,
  textHighlightClass,
  activeWordId,
  getStudyAccentClass,
  getScriptureStyleClasses,
  onSelectWord,
  onClearWord,
  onDoubleClickVerse,
  onTouchStartVerse,
  onTouchEndVerse,
  actionPillNode,
  children
}) => {
  // Compute deterministic bi-directional alignment map for this verse
  const { tokens, tokenIdxToAlignmentId } = useMemo(() => {
    const rawTokens = parseKjvRawTokens(kjvText);
    const mapping = new Map<number, string>();

    if (!words || words.length === 0 || !kjvText) {
      return { tokens: rawTokens, tokenIdxToAlignmentId: mapping };
    }

    // Map each manuscript word to its corresponding KJV token indices (1-to-many support)
    words.forEach((_, wIdx) => {
      const alignmentId = `inter-${verseNumber}-${wIdx}`;
      const matched = getMatchedKjvTokenIndices(words, wIdx, kjvText);
      matched.forEach((kIdx) => {
        mapping.set(kIdx, alignmentId);
      });
    });

    return { tokens: rawTokens, tokenIdxToAlignmentId: mapping };
  }, [verseNumber, words, kjvText]);

  return (
    <>
      {/* 1. Flowing Manuscript Words Container (Transliteration or Original Script) */}
      {words && words.length > 0 ? (
        <div
          dir={textDisplayMode === 'translit' ? 'ltr' : isHebrew ? 'rtl' : 'ltr'}
          className={`font-bold leading-snug tracking-wide flex flex-wrap gap-x-2 sm:gap-x-2.5 gap-y-1 pt-0.5 ${
            textDisplayMode === 'translit'
              ? 'translit-text font-serif text-xl sm:text-2xl text-left'
              : isHebrew
                ? 'hebrew-text text-2xl sm:text-3xl text-right'
                : 'greek-text text-2xl sm:text-3xl text-left'
          } ${theme === 'light' ? 'text-black' : 'text-white'}`}
        >
          {words.map((wordObj, wIdx) => {
            if (!wordObj.w) return null;
            const alignmentId = `inter-${verseNumber}-${wIdx}`;
            const isWordActive = activeWordId === alignmentId;
            const morph = getWordMorphology(wordObj.n, wordObj.w, isHebrew ? 'Hebrew' : 'Greek');
            const parsingTag = wordObj.p || morph.parsingTag;
            const displayWord =
              textDisplayMode === 'translit'
                ? getWordTransliteration(wordObj.w, isHebrew ? 'Hebrew' : 'Greek')
                : wordObj.w;

            return (
              <span
                key={wIdx}
                data-alignment-id={alignmentId}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWordActive) {
                    onClearWord();
                  } else {
                    onSelectWord(wordObj, alignmentId);
                  }
                }}
                className={`cursor-pointer select-none transition-colors active:scale-95 ${
                  isWordActive
                    ? `${getStudyAccentClass()} font-bold drop-shadow-xs`
                    : theme === 'light'
                      ? 'hover:text-black text-neutral-900'
                      : 'hover:text-white text-neutral-100'
                }`}
                title={`Strong's ${wordObj.n || '—'} • ${parsingTag} (${morph.parsingDescription}): ${wordObj.t || wordObj.w}`}
              >
                {displayWord}
              </span>
            );
          })}
        </div>
      ) : (
        <div
          dir={isHebrew ? 'rtl' : 'ltr'}
          className={`font-serif text-base sm:text-lg leading-relaxed mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}
        >
          {manuscriptTextFallback || (
            <span className="italic opacity-50 text-xs font-sans">[Original Manuscript Not Available]</span>
          )}
        </div>
      )}

      {/* 2. Contextual English (KJV) Translation with Shared Alignment Highlighting */}
      {kjvText && (
        <div className="pt-2.5 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <div
            onDoubleClick={onDoubleClickVerse}
            onTouchStart={onTouchStartVerse}
            onTouchEnd={onTouchEndVerse}
            className={`group/kjv ${getScriptureStyleClasses()} tracking-[0.01em] cursor-default rounded-lg p-1.5 -mx-1.5 transition-colors select-none ${
              theme === 'light'
                ? 'text-neutral-900 hover:bg-neutral-100/70'
                : 'text-neutral-100 hover:bg-neutral-900/70'
            }`}
            style={{ fontSize: `${Math.round(18 * (scriptureZoom || 1.6))}px`, lineHeight: 1.8 }}
            title="Double-tap for options"
          >
            <div className={`inline ${isScriptureItalic ? 'gentle-italic' : ''}`}>
              "
              {tokens.map((tokenObj) => {
                const tokenAlignmentId = tokenIdxToAlignmentId.get(tokenObj.rawIdx);
                const isMatched = !!tokenAlignmentId && activeWordId === tokenAlignmentId;
                const isSupplied = tokenObj.isSupplied;
                const targetIdx = tokenAlignmentId ? parseInt(tokenAlignmentId.split('-')[2], 10) : -1;
                const targetWord = targetIdx >= 0 && words ? words[targetIdx] : undefined;
                const hasCustomMeaning = targetWord?.n ? !!getUserLexiconMeaning(targetWord.n) : false;

                return (
                  <span
                    key={tokenObj.rawIdx}
                    data-alignment-id={tokenAlignmentId || 'unaligned'}
                    onClick={(e) => {
                      if (tokenAlignmentId) {
                        e.stopPropagation();
                        if (activeWordId === tokenAlignmentId) {
                          onClearWord();
                        } else {
                          if (targetWord) {
                            onSelectWord(targetWord, tokenAlignmentId);
                          }
                        }
                      }
                    }}
                    className={`kjv-study-token transition-colors duration-150 relative ${
                      tokenAlignmentId ? 'cursor-pointer' : ''
                    } ${
                      isMatched
                        ? `${getStudyAccentClass()} font-bold bg-blue-500/10 dark:bg-blue-400/15 rounded px-0.5`
                        : textHighlightClass
                          ? textHighlightClass
                          : isSupplied
                            ? 'italic font-normal opacity-85 text-neutral-800 dark:text-neutral-200'
                            : ''
                    }`}
                    title={isSupplied ? 'Supplied word (added by KJV translators, not in original manuscript)' : hasCustomMeaning ? 'Has personal lexical meaning attached' : undefined}
                  >
                    {tokenObj.text}
                    {hasCustomMeaning && (
                      <span className="inline-block w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-300 ml-0.5 align-top opacity-85" />
                    )}
                  </span>
                );
              })}
              "
              {actionPillNode}
            </div>
          </div>
          {children}
        </div>
      )}
    </>
  );
};
