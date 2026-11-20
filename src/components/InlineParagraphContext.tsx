import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { STATIC_CHAPTERS } from '../staticChapters';
import { getBundledKjvChapter, getOfflineChapter, normalizeBookName } from '../utils/offlineBibleStorage';
import { Verse } from '../types';

interface InlineParagraphContextProps {
  reference: string;
  theme: 'light' | 'dark';
  onCollapse: () => void;
  onOpenInMainReader: (book: string, chapter: number, targetVerse?: number) => void;
  isBroadcastCanvas?: boolean;
  onScroll?: (ratio: number) => void;
  externalScrollRatio?: number | null;
}

const BOOK_ABBREVIATIONS: Record<string, string> = {
  'gen': 'Genesis',
  'genesis': 'Genesis',
  'ex': 'Exodus',
  'exo': 'Exodus',
  'exodus': 'Exodus',
  'lev': 'Leviticus',
  'num': 'Numbers',
  'deut': 'Deuteronomy',
  'josh': 'Joshua',
  'judg': 'Judges',
  'ruth': 'Ruth',
  '1 sam': '1 Samuel',
  '2 sam': '2 Samuel',
  '1 kings': '1 Kings',
  '2 kings': '2 Kings',
  '1 chron': '1 Chronicles',
  '2 chron': '2 Chronicles',
  'ezra': 'Ezra',
  'neh': 'Nehemiah',
  'est': 'Esther',
  'job': 'Job',
  'ps': 'Psalms',
  'pss': 'Psalms',
  'psa': 'Psalms',
  'psalm': 'Psalms',
  'psalms': 'Psalms',
  'prov': 'Proverbs',
  'pro': 'Proverbs',
  'eccl': 'Ecclesiastes',
  'song': 'Song of Solomon',
  'isa': 'Isaiah',
  'isai': 'Isaiah',
  'jer': 'Jeremiah',
  'lam': 'Lamentations',
  'ezek': 'Ezekiel',
  'dan': 'Daniel',
  'hos': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah',
  'jonah': 'Jonah',
  'mic': 'Micah',
  'nah': 'Nahum',
  'hab': 'Habakkuk',
  'zeph': 'Zephaniah',
  'hag': 'Haggai',
  'zech': 'Zechariah',
  'mal': 'Malachi',
  'matt': 'Matthew',
  'matthew': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'rom': 'Romans',
  'romans': 'Romans',
  '1 cor': '1 Corinthians',
  '2 cor': '2 Corinthians',
  'gal': 'Galatians',
  'eph': 'Ephesians',
  'phil': 'Philippians',
  'col': 'Colossians',
  'colossians': 'Colossians',
  '1 thess': '1 Thessalonians',
  '2 thess': '2 Thessalonians',
  '1 tim': '1 Timothy',
  '2 tim': '2 Timothy',
  'titus': 'Titus',
  'philem': 'Philemon',
  'heb': 'Hebrews',
  'hebrews': 'Hebrews',
  'jas': 'James',
  'james': 'James',
  '1 pet': '1 Peter',
  '2 pet': '2 Peter',
  '1 john': '1 John',
  '2 john': '2 John',
  '3 john': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation',
  'revelation': 'Revelation',
};

export const InlineParagraphContext: React.FC<InlineParagraphContextProps> = ({
  reference,
  theme,
  onCollapse,
  onOpenInMainReader,
  isBroadcastCanvas = false,
  onScroll,
  externalScrollRatio,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [book, setBook] = useState<string>('');
  const [chapter, setChapter] = useState<number>(1);
  const [targetVerse, setTargetVerse] = useState<number | null>(null);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const targetVerseRef = useRef<HTMLSpanElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!reference) return;

    const cleaned = reference.trim();
    const match = cleaned.match(/^(\d?\s*[a-zA-Z\s]+?)\s+(\d+)(?::(\d+))?$/);

    let parsedBook = 'Genesis';
    let parsedChapter = 1;
    let parsedVerse: number | null = null;

    if (match) {
      const rawBookKey = match[1].toLowerCase().replace(/\./g, '').trim();
      parsedBook = BOOK_ABBREVIATIONS[rawBookKey] || normalizeBookName(match[1]);
      parsedChapter = parseInt(match[2], 10) || 1;
      if (match[3]) {
        parsedVerse = parseInt(match[3], 10) || null;
      }
    } else {
      parsedBook = normalizeBookName(cleaned);
    }

    setBook(parsedBook);
    setChapter(parsedChapter);
    setTargetVerse(parsedVerse);
    setLoading(true);

    const loadChapter = async () => {
      const norm = normalizeBookName(parsedBook);
      let allVerses: Verse[] = [];

      // 1. Static curated chapters
      if (STATIC_CHAPTERS[norm] && STATIC_CHAPTERS[norm][parsedChapter]) {
        allVerses = STATIC_CHAPTERS[norm][parsedChapter].verses || [];
      } else {
        // 2. Bundled full KJV dataset
        try {
          const bundled = await getBundledKjvChapter(norm, parsedChapter);
          if (bundled && bundled.verses && bundled.verses.length > 0) {
            allVerses = bundled.verses;
          }
        } catch (e) {
          console.warn('Bundled chapter load:', e);
        }

        // 3. Offline database
        if (allVerses.length === 0) {
          try {
            const offline = await getOfflineChapter(norm, parsedChapter);
            if (offline && offline.verses && offline.verses.length > 0) {
              allVerses = offline.verses;
            }
          } catch (e) {
            console.warn('Offline chapter load:', e);
          }
        }

        // 4. API fallback
        if (allVerses.length === 0) {
          try {
            const res = await fetch(`/api/bible-chapter?book=${encodeURIComponent(norm)}&chapter=${parsedChapter}`);
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.data && json.data.verses) {
                allVerses = json.data.verses;
              }
            }
          } catch (e) {
            console.warn('Network chapter fallback:', e);
          }
        }
      }

      if (allVerses.length > 0) {
        setChapterVerses(allVerses);
        setTimeout(() => {
          if (targetVerseRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const target = targetVerseRef.current;
            const offset = target.offsetTop - container.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
            container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
          }
        }, 120);
      } else {
        setChapterVerses([]);
      }

      setLoading(false);
    };

    loadChapter();
  }, [reference]);

  useEffect(() => {
    if (externalScrollRatio !== null && externalScrollRatio !== undefined && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        container.scrollTop = externalScrollRatio * maxScroll;
      }
    }
  }, [externalScrollRatio]);

  return (
    <div
      className={isBroadcastCanvas ? (
        `rounded-2xl border my-3.5 shadow-xl overflow-hidden animate-fade-in ${
          theme === 'light'
            ? 'bg-zinc-50/95 border-zinc-300/90 text-zinc-900'
            : 'bg-[#191411]/95 border-[#3d322b] text-[#faf6f0]'
        }`
      ) : (
        `border-b overflow-hidden ${
          theme === 'light'
            ? 'bg-zinc-100/90 border-zinc-200/90'
            : 'bg-zinc-900/90 border-zinc-800/90'
        }`
      )}
    >
      {/* Top Bar: Exact Main Reader View Header (Return icon button on left, Book & Chapter in center, Open in Reader icon button on right) */}
      <div className={`flex items-center justify-between px-3.5 py-2 border-b border-zinc-200/60 dark:border-zinc-800/60 select-none ${
        theme === 'light' ? 'bg-zinc-100/90 text-zinc-900' : 'bg-[#1e1915]/90 text-[#faf6f0]'
      }`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCollapse(); }}
          className={`p-1.5 rounded-full transition-all active:scale-95 cursor-pointer ${
            theme === 'light'
              ? 'text-zinc-600 hover:text-black hover:bg-zinc-200'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Return"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <span className={`text-[13px] sm:text-sm font-bold font-serif tracking-tight select-none ${
          theme === 'light' ? 'text-black' : 'text-white'
        }`}>
          {book} {chapter}
        </span>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenInMainReader(book, chapter, targetVerse || 1); }}
          className={`p-1.5 rounded-full transition-all active:scale-95 cursor-pointer ${
            theme === 'light'
              ? 'text-zinc-600 hover:text-black hover:bg-zinc-200'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Open in Reader"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Full Chapter Body */}
      <div className={isBroadcastCanvas ? "px-4 sm:px-6 py-4 text-left" : "px-3.5 py-3 text-left"}>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">Loading full chapter...</span>
          </div>
        ) : chapterVerses.length === 0 ? (
          <div className="text-center py-4 text-zinc-400 text-xs">
            Scripture context unavailable offline.
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const max = el.scrollHeight - el.clientHeight;
              if (max > 0) onScroll?.(el.scrollTop / max);
            }}
            className={isBroadcastCanvas ? (
              `font-serif not-italic text-base sm:text-lg md:text-[19px] leading-[1.85] tracking-[0.01em] max-h-80 overflow-y-auto pr-1.5 scrollbar-thin ${
                theme === 'light' ? 'text-slate-900' : 'text-[#faf6f0]'
              }`
            ) : (
              `font-serif not-italic text-[13px] sm:text-sm font-medium leading-[1.85] tracking-[0.01em] max-h-72 overflow-y-auto pr-1.5 scrollbar-thin ${
                theme === 'light' ? 'text-slate-950' : 'text-slate-50'
              }`
            )}
          >
            {chapterVerses.map((v) => {
              const isTarget = targetVerse !== null && v.verseNumber === targetVerse;
              const text = v.kjvText || v.contemporary || v.nonNativeEnglish || '';

              if (isTarget) {
                return (
                  <span
                    key={v.verseNumber}
                    ref={targetVerseRef}
                    className={isBroadcastCanvas ? (
                      `block my-3 pl-3.5 py-2.5 border-l-4 border-cyan-500 rounded-r-xl font-medium ${
                        theme === 'light'
                          ? 'bg-cyan-50/90 text-slate-950 shadow-sm'
                          : 'bg-cyan-950/30 text-white shadow-sm'
                      }`
                    ) : (
                      `block my-2.5 pl-3 py-2 border-l-2 border-cyan-500 rounded-r-lg font-medium ${
                        theme === 'light'
                          ? 'bg-cyan-50/85 text-slate-950 shadow-xs'
                          : 'bg-cyan-950/35 text-slate-50 shadow-xs'
                      }`
                    )}
                  >
                    <sup className={`font-mono font-black not-italic mr-1.5 select-none align-super ${
                      isBroadcastCanvas ? 'text-xs text-cyan-600 dark:text-cyan-400' : 'text-[10px] text-cyan-600 dark:text-cyan-400'
                    }`}>
                      {v.verseNumber}
                    </sup>
                    {text}
                  </span>
                );
              }

              return (
                <span key={v.verseNumber} className="inline">
                  <sup className={`font-mono font-bold not-italic opacity-60 mr-1 select-none align-super ${
                    isBroadcastCanvas ? 'text-[0.65em]' : 'text-[10px]'
                  }`}>
                    {v.verseNumber}
                  </sup>
                  {text}{' '}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
