/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeBookName } from './offlineBibleStorage';
import { getWordMorphology } from './morphologyEngine';

export interface InterlinearWord {
  w: string; // Original manuscript word (Hebrew / Greek)
  t: string; // English translation gloss
  n: string; // Strong's concordance number (e.g., 'H7225', 'G3056')
  p?: string; // Morphological grammatical parsing tag (e.g., 'N-fs-a', 'V-qal-3ms', 'N-NMS')
  tr?: string; // Optional phonetic transliteration
}

export interface InterlinearVerse {
  manuscriptText: string;
  words: InterlinearWord[];
}

export interface InterlinearBookData {
  book: string;
  language: 'Hebrew' | 'Greek';
  chapters: Record<string, Record<string, InterlinearVerse>>;
}

// In-memory LRU cache of loaded interlinear book datasets
const inMemoryInterlinearCache = new Map<string, InterlinearBookData>();
const pendingFetches = new Map<string, Promise<InterlinearBookData | null>>();

/**
 * Converts a canonical book name into its corresponding filename in /data/interlinear/
 */
export function getInterlinearFilename(book: string): string {
  const norm = normalizeBookName(book);
  return norm.toLowerCase().replace(/\s+/g, '_') + '.json';
}

/**
 * Determines whether a book belongs to Old Testament (Hebrew) or New Testament (Greek)
 */
export function getBookLanguage(book: string): 'Hebrew' | 'Greek' {
  const norm = normalizeBookName(book);
  const NT_BOOKS = new Set([
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
    '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
    'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation'
  ]);
  return NT_BOOKS.has(norm) ? 'Greek' : 'Hebrew';
}

/**
 * Asynchronously loads the complete offline interlinear dataset for a book.
 * Operates 100% offline from local bundled assets.
 */
export async function loadOfflineBookInterlinear(book: string): Promise<InterlinearBookData | null> {
  const normBook = normalizeBookName(book);
  if (!normBook) return null;

  if (inMemoryInterlinearCache.has(normBook)) {
    return inMemoryInterlinearCache.get(normBook)!;
  }

  if (pendingFetches.has(normBook)) {
    return pendingFetches.get(normBook)!;
  }

  const filename = getInterlinearFilename(normBook);
  const candidateUrls = [
    `/data/interlinear/${filename}`,
    `./data/interlinear/${filename}`,
    `data/interlinear/${filename}`,
    ...(typeof window !== 'undefined' && window.location?.origin
      ? [`${window.location.origin}/data/interlinear/${filename}`]
      : [])
  ];

  const fetchPromise = (async () => {
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data: InterlinearBookData = await res.json();
          if (data && data.chapters) {
            const lang = data.language || getBookLanguage(normBook);
            // Enrich word tokens with parsing tags
            for (const chObj of Object.values(data.chapters)) {
              for (const vObj of Object.values(chObj)) {
                if (vObj && Array.isArray(vObj.words)) {
                  for (const word of vObj.words) {
                    if (word && !word.p) {
                      const morph = getWordMorphology(word.n, word.w, lang);
                      word.p = morph.parsingTag;
                    }
                  }
                }
              }
            }
            inMemoryInterlinearCache.set(normBook, data);
            return data;
          }
        }
      } catch {
        // Continue to next candidate URL
      }
    }
    console.warn(`[Interlinear Storage] Could not load offline manuscript for ${normBook}`);
    return null;
  })();

  pendingFetches.set(normBook, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    pendingFetches.delete(normBook);
  }
}

/**
 * Synchronously retrieves a verse if the book dataset has already been loaded into memory.
 */
export function getCachedManuscriptVerse(
  book: string,
  chapter: number,
  verse: number
): { manuscriptText: string; words: InterlinearWord[]; language: 'Hebrew' | 'Greek' } | null {
  const normBook = normalizeBookName(book);
  const cached = inMemoryInterlinearCache.get(normBook);
  if (!cached || !cached.chapters) return null;

  const chData = cached.chapters[String(chapter)];
  if (!chData) return null;

  const vData = chData[String(verse)];
  if (!vData) return null;

  return {
    manuscriptText: vData.manuscriptText || '',
    words: vData.words || [],
    language: cached.language || getBookLanguage(normBook)
  };
}

/**
 * Retrieves the genuine manuscript text and Strong's number tokens for a single verse.
 */
export async function getOfflineManuscriptVerse(
  book: string,
  chapter: number,
  verse: number
): Promise<{ manuscriptText: string; words: InterlinearWord[]; language: 'Hebrew' | 'Greek' } | null> {
  const syncCheck = getCachedManuscriptVerse(book, chapter, verse);
  if (syncCheck) return syncCheck;

  const bookData = await loadOfflineBookInterlinear(book);
  if (!bookData || !bookData.chapters) return null;

  const chData = bookData.chapters[String(chapter)];
  if (!chData) return null;

  const vData = chData[String(verse)];
  if (!vData) return null;

  return {
    manuscriptText: vData.manuscriptText || '',
    words: vData.words || [],
    language: bookData.language || getBookLanguage(book)
  };
}

/**
 * Retrieves all verses of a chapter with authentic manuscript text and Strong's word alignments.
 */
export async function getOfflineManuscriptChapter(
  book: string,
  chapter: number
): Promise<{ language: 'Hebrew' | 'Greek'; verses: Record<number, InterlinearVerse> } | null> {
  const normBook = normalizeBookName(book);
  const bookData = await loadOfflineBookInterlinear(normBook);
  if (!bookData || !bookData.chapters) return null;

  const chData = bookData.chapters[String(chapter)];
  if (!chData) return null;

  const versesMap: Record<number, InterlinearVerse> = {};
  for (const [vStr, vVal] of Object.entries(chData)) {
    const vNum = parseInt(vStr, 10);
    if (!isNaN(vNum)) {
      versesMap[vNum] = vVal;
    }
  }

  return {
    language: bookData.language || getBookLanguage(normBook),
    verses: versesMap
  };
}
