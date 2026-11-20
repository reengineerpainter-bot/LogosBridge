/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Compass, Loader2 } from 'lucide-react';
import { loadBundledKjvDataset, normalizeBookName } from '../utils/offlineBibleStorage';

interface VerseSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
}

interface VerseSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number, verse: number) => void;
  theme?: 'light' | 'dark';
}

const QUICK_SUGGESTIONS = [
  'light darkness',
  'in the beginning',
  'born again',
  'valley shadow',
  'bread of life',
  'faith hope love',
];

export const VerseSearchModal: React.FC<VerseSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  theme = 'light',
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dataset, setDataset] = useState<Record<string, string[][]> | null>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load KJV dataset in background on modal open
  useEffect(() => {
    if (isOpen) {
      if (!dataset) {
        setIsLoadingDataset(true);
        loadBundledKjvDataset()
          .then((data) => {
            if (data) setDataset(data);
          })
          .catch((err) => console.warn('[VerseSearchModal] dataset load notice:', err))
          .finally(() => setIsLoadingDataset(false));
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Debounce input to prevent micro-stutters during rapid mobile typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 120);
    return () => clearTimeout(timer);
  }, [query]);

  // Google-style phrase & token ranking search engine
  const results = useMemo<VerseSearchResult[]>(() => {
    if (!dataset || !debouncedQuery || debouncedQuery.length < 2) return [];

    const rawLower = debouncedQuery.toLowerCase();
    const cleanPhrase = rawLower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanPhrase) return [];

    const tokens = cleanPhrase.split(' ').filter((t) => t.length > 0);
    if (tokens.length === 0) return [];

    // Check if query is a direct scripture reference (e.g., "John 3:16", "Genesis 1:1", "Rom 8:28")
    const refMatch = rawLower.match(/^((?:\d\s+)?[a-z]+(?:\s+[a-z]+)*)\s+(\d+)(?::(\d+))?$/);
    let directRefBook: string | null = null;
    let directRefChapter: number | null = null;
    let directRefVerse: number | null = null;

    if (refMatch) {
      const candidateBook = normalizeBookName(refMatch[1]);
      if (dataset[candidateBook]) {
        directRefBook = candidateBook;
        directRefChapter = parseInt(refMatch[2], 10);
        directRefVerse = refMatch[3] ? parseInt(refMatch[3], 10) : null;
      }
    }

    const matches: VerseSearchResult[] = [];

    for (const [book, chapters] of Object.entries(dataset)) {
      if (!Array.isArray(chapters)) continue;

      for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
        const chapterNum = chIdx + 1;
        const verses = chapters[chIdx];
        if (!Array.isArray(verses)) continue;

        for (let vIdx = 0; vIdx < verses.length; vIdx++) {
          const verseNum = vIdx + 1;
          const text = verses[vIdx];
          if (!text) continue;

          const textLower = text.toLowerCase();
          let score = 0;

          // Priority 1: Direct reference query pin
          if (directRefBook && directRefBook === book && directRefChapter === chapterNum) {
            if (directRefVerse === null || directRefVerse === verseNum) {
              score += 500;
            }
          }

          // Priority 2: Exact consecutive phrase match (Google phrase search)
          if (textLower.includes(cleanPhrase)) {
            score += 150;
          }

          // Priority 3: Token coverage & word boundary hits
          let matchedCount = 0;
          for (const token of tokens) {
            if (token.length <= 2) {
              // Short word: require whole word boundary to avoid false positives (e.g. "in", "to")
              const regex = new RegExp(`\\b${token}\\b`, 'i');
              if (regex.test(textLower)) {
                score += 20;
                matchedCount++;
              }
            } else {
              if (textLower.includes(token)) {
                score += 30;
                matchedCount++;
              }
            }
          }

          // Bonus if ALL query tokens are present in this verse
          if (matchedCount === tokens.length) {
            score += 80;
          }

          if (score > 0) {
            matches.push({
              book,
              chapter: chapterNum,
              verse: verseNum,
              text,
              score,
            });
          }
        }
      }
    }

    // Sort by relevance score descending
    matches.sort((a, b) => b.score - a.score);

    // Limit to top 50 results for optimal performance
    return matches.slice(0, 50);
  }, [dataset, debouncedQuery]);

  // Token highlighter helper for clean visual feedback
  const highlightTokens = (text: string, searchStr: string) => {
    if (!searchStr) return text;
    const tokens = searchStr
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (tokens.length === 0) return text;

    // Build regex pattern matching any of the tokens
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="font-bold underline decoration-amber-500/80 decoration-2 text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-xs px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[2800] flex items-start justify-center pt-2 sm:pt-14 px-2 sm:px-4 bg-black/70 backdrop-blur-md safe-top"
      >
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden max-h-[88vh] ${
            theme === 'light'
              ? 'bg-white border-zinc-200 text-zinc-900 shadow-black/20'
              : 'bg-[#181412] border-zinc-800 text-zinc-100 shadow-black/60'
          }`}
        >
          {/* Top Search Input Bar */}
          <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5">
            <Search className="w-5 h-5 text-zinc-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm sm:text-base font-sans placeholder:text-zinc-400 py-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Suggestion Pills */}
          {!query && (
            <div className="p-3 sm:px-4 sm:py-3 border-b border-black/[0.04] dark:border-white/[0.04] bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-mono text-zinc-400 shrink-0 uppercase tracking-wider mr-1">
                Examples:
              </span>
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    inputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 active:scale-95"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Results List Surface */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {isLoadingDataset && (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-mono">Indexing Holy Scriptures...</span>
              </div>
            )}

            {!isLoadingDataset && query.trim().length >= 2 && results.length === 0 && (
              <div className="py-12 text-center text-zinc-400 font-sans space-y-1">
                <p className="text-sm font-medium">No scriptural verses found matching "{query}"</p>
              </div>
            )}

            {!isLoadingDataset && !query && (
              <div className="py-12 text-center text-zinc-400 font-sans space-y-1">
                <Compass className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-sm font-medium">Search scripture verses</p>
              </div>
            )}

            {!isLoadingDataset && results.length > 0 && (
              <>
                <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  <span>Results</span>
                  <span>{results.length} verses found</span>
                </div>

                {results.map((res) => (
                  <button
                    key={`${res.book}-${res.chapter}-${res.verse}`}
                    type="button"
                    onClick={() => {
                      onNavigate(res.book, res.chapter, res.verse);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 active:scale-[0.99] group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold tracking-tight uppercase text-amber-600 dark:text-amber-400 group-hover:underline">
                        {res.book} {res.chapter}:{res.verse}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 opacity-60">KJV</span>
                    </div>
                    <p className="font-serif text-sm sm:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 line-clamp-3">
                      "{highlightTokens(res.text, debouncedQuery)}"
                    </p>
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
