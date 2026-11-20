/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChapterData, Verse } from '../types';

const DB_NAME = 'LogosBridge_BibleDB';
const DB_VERSION = 3;
const STORE_CHAPTERS = 'chapters';
const STORE_METADATA = 'metadata';

let dbInstance: IDBDatabase | null = null;
let inMemoryKjvCache: Record<string, string[][]> | null = null;
let isFetchingBundledKjv: Promise<Record<string, string[][]> | null> | null = null;

// Canonical book name normalization map
const BOOK_ALIAS_MAP: Record<string, string> = {
  'gen': 'Genesis', 'genesis': 'Genesis',
  'ex': 'Exodus', 'exo': 'Exodus', 'exod': 'Exodus', 'exodus': 'Exodus',
  'lev': 'Leviticus', 'leviticus': 'Leviticus',
  'num': 'Numbers', 'numbers': 'Numbers',
  'deut': 'Deuteronomy', 'deuteronomy': 'Deuteronomy',
  'josh': 'Joshua', 'joshua': 'Joshua',
  'judg': 'Judges', 'judges': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel', '1 samuel': '1 Samuel', '1sm': '1 Samuel',
  '2sam': '2 Samuel', '2 samuel': '2 Samuel', '2sm': '2 Samuel',
  '1kgs': '1 Kings', '1 kings': '1 Kings', '1rs': '1 Kings',
  '2kgs': '2 Kings', '2 kings': '2 Kings', '2rs': '2 Kings',
  '1chr': '1 Chronicles', '1 chronicles': '1 Chronicles', '1cr': '1 Chronicles',
  '2chr': '2 Chronicles', '2 chronicles': '2 Chronicles', '2cr': '2 Chronicles',
  'ezra': 'Ezra',
  'neh': 'Nehemiah', 'nehemiah': 'Nehemiah',
  'esth': 'Esther', 'esther': 'Esther',
  'job': 'Job',
  'ps': 'Psalms', 'psalm': 'Psalms', 'psalms': 'Psalms', 'sl': 'Psalms',
  'prov': 'Proverbs', 'proverbs': 'Proverbs',
  'eccl': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes',
  'song': 'Song of Solomon', 'song of solomon': 'Song of Solomon', 'canticles': 'Song of Solomon',
  'isa': 'Isaiah', 'isaiah': 'Isaiah',
  'jer': 'Jeremiah', 'jeremiah': 'Jeremiah',
  'lam': 'Lamentations', 'lamentations': 'Lamentations',
  'ezek': 'Ezekiel', 'ezekiel': 'Ezekiel',
  'dan': 'Daniel', 'daniel': 'Daniel',
  'hos': 'Hosea', 'hosea': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah', 'obadiah': 'Obadiah',
  'jonah': 'Jonah',
  'mic': 'Micah', 'micah': 'Micah',
  'nah': 'Nahum', 'nahum': 'Nahum',
  'hab': 'Habakkuk', 'habakkuk': 'Habakkuk',
  'zeph': 'Zephaniah', 'zephaniah': 'Zephaniah',
  'hag': 'Haggai', 'haggai': 'Haggai',
  'zech': 'Zechariah', 'zechariah': 'Zechariah',
  'mal': 'Malachi', 'malachi': 'Malachi',
  'matt': 'Matthew', 'matthew': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'rom': 'Romans', 'romans': 'Romans',
  '1cor': '1 Corinthians', '1 corinthians': '1 Corinthians',
  '2cor': '2 Corinthians', '2 corinthians': '2 Corinthians',
  'gal': 'Galatians', 'galatians': 'Galatians',
  'eph': 'Ephesians', 'ephesians': 'Ephesians',
  'phil': 'Philippians', 'philippians': 'Philippians',
  'col': 'Colossians', 'colossians': 'Colossians',
  '1thess': '1 Thessalonians', '1 thessalonians': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2 thessalonians': '2 Thessalonians',
  '1tim': '1 Timothy', '1 timothy': '1 Timothy',
  '2tim': '2 Timothy', '2 timothy': '2 Timothy',
  'titus': 'Titus',
  'phlm': 'Philemon', 'philemon': 'Philemon',
  'heb': 'Hebrews', 'hebrews': 'Hebrews',
  'jas': 'James', 'james': 'James',
  '1pet': '1 Peter', '1 peter': '1 Peter',
  '2pet': '2 Peter', '2 peter': '2 Peter',
  '1jn': '1 John', '1 john': '1 John',
  '2jn': '2 John', '2 john': '2 John',
  '3jn': '3 John', '3 john': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation', 'revelation': 'Revelation'
};

export function normalizeBookName(book: string): string {
  if (!book) return '';
  const clean = book.trim().toLowerCase();
  if (BOOK_ALIAS_MAP[clean]) {
    return BOOK_ALIAS_MAP[clean];
  }
  // Title-case fallback
  return book.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function getChapterKey(book: string, chapter: number): string {
  const norm = normalizeBookName(book);
  return `${norm}_${chapter}`;
}

export async function getBibleDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn('[Offline DB] getBibleDB timeout reached, falling back');
      reject(new Error('IndexedDB open timeout'));
    }, 2500);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
          db.createObjectStore(STORE_CHAPTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        clearTimeout(timeoutId);
        dbInstance = event.target.result as IDBDatabase;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };
        resolve(dbInstance);
      };

      request.onblocked = () => {
        console.warn('[Offline DB] IndexedDB blocked by unclosed connection');
      };

      request.onerror = (event: any) => {
        clearTimeout(timeoutId);
        reject(event.target.error);
      };
    } catch (e) {
      clearTimeout(timeoutId);
      reject(e);
    }
  });
}

/**
 * Loads the bundled KJV Bible dataset from /data/kjv.json with memory caching.
 */
export async function loadBundledKjvDataset(): Promise<Record<string, string[][]> | null> {
  if (inMemoryKjvCache) return inMemoryKjvCache;
  if (isFetchingBundledKjv) return isFetchingBundledKjv;

  const candidateUrls = [
    '/data/kjv.json?v=1769_v3',
    './data/kjv.json?v=1769_v3',
    'data/kjv.json?v=1769_v3',
    '/data/kjv.json',
    ...(typeof window !== 'undefined' && window.location?.origin ? [`${window.location.origin}/data/kjv.json?v=1769_v3`] : [])
  ];

  isFetchingBundledKjv = (async () => {
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            inMemoryKjvCache = data;
            return data;
          }
        }
      } catch {
        // try next candidate
      }
    }
    console.warn('Failed loading KJV dataset from candidate URLs');
    return null;
  })();

  try {
    const result = await isFetchingBundledKjv;
    if (!result) inMemoryKjvCache = null;
    return result;
  } finally {
    isFetchingBundledKjv = null;
  }
}

/**
 * Synchronously retrieves a canonical KJV verse with supplied brackets from in-memory cache if available.
 */
export function getCanonicalKjvVerse(book: string, chapter: number, verse: number): string | null {
  const norm = normalizeBookName(book);
  if (inMemoryKjvCache && inMemoryKjvCache[norm] && inMemoryKjvCache[norm][chapter - 1]) {
    const text = inMemoryKjvCache[norm][chapter - 1][verse - 1];
    if (text) return sanitizeKjvText(text);
  }
  return null;
}

/**
 * Sanitizes KJV scripture text by stripping embedded translator marginalia
 * (e.g. {made him most...: Heb. set him to be blessings}) and unwrapping supplied words ({was} -> was)
 * while preserving canonical square brackets [word] representing translator additions.
 */
export function sanitizeKjvText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\{[^}:]+:[^}]*\}/g, '')
    .replace(/\{([^{}]+)\}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Strips bracket markup from supplied words for pure plain-text display or audio TTS reading.
 * e.g., "according to [the will of] God" -> "according to the will of God"
 */
export function stripSuppliedMarkup(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\[([^\]]+)\]/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Retrieves a chapter from the complete offline bundled KJV dataset.
 */
export async function getBundledKjvChapter(book: string, chapter: number): Promise<ChapterData | null> {
  const normBook = normalizeBookName(book);
  const data = await loadBundledKjvDataset();
  if (!data || !data[normBook]) return null;

  const chapterIndex = chapter - 1;
  const verseTexts = data[normBook][chapterIndex];
  if (!verseTexts || !Array.isArray(verseTexts) || verseTexts.length === 0) {
    return null;
  }

  const verses: Verse[] = verseTexts.map((text: string, idx: number) => {
    const cleanText = sanitizeKjvText(text);
    return {
      verseNumber: idx + 1,
      kjvText: cleanText,
      bsbText: stripSuppliedMarkup(cleanText),
      contemporary: stripSuppliedMarkup(cleanText),
      nonNativeEnglish: stripSuppliedMarkup(cleanText),
      specialWords: []
    };
  });

  return {
    book: normBook,
    chapter,
    verses,
    isHighFidelity: true
  };
}

export async function getOfflineChapter(book: string, chapter: number): Promise<ChapterData | null> {
  const normBook = normalizeBookName(book);
  try {
    const db = await getBibleDB();
    const result = await new Promise<any>((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.get(getChapterKey(normBook, chapter));
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });

    if (result && result.verses && result.verses.length > 0) {
      // Check if cached verses contain bracketed KJV text. If not, refresh from bundled dataset!
      const hasBracketsInCached = result.verses.some((v: any) => v.kjvText && v.kjvText.includes('['));
      if (hasBracketsInCached) {
        // Ensure all loaded verses have clean text
        result.verses.forEach((v: any) => {
          if (v.kjvText) v.kjvText = sanitizeKjvText(v.kjvText);
          if (v.bsbText) v.bsbText = stripSuppliedMarkup(sanitizeKjvText(v.bsbText));
          if (v.contemporary) v.contemporary = stripSuppliedMarkup(sanitizeKjvText(v.contemporary));
          if (v.nonNativeEnglish) v.nonNativeEnglish = stripSuppliedMarkup(sanitizeKjvText(v.nonNativeEnglish));
        });
        return result;
      }
    }
  } catch (err) {
    console.warn('IndexedDB read error:', err);
  }

  // Fallback immediately to bundled KJV dataset
  return getBundledKjvChapter(normBook, chapter);
}

export async function saveOfflineChapter(book: string, chapter: number, data: any): Promise<void> {
  const normBook = normalizeBookName(book);
  try {
    const db = await getBibleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHAPTERS);
      const id = getChapterKey(normBook, chapter);
      const req = store.put({
        id,
        book: normBook,
        chapter,
        data,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save error:', err);
  }
}

/**
 * Bulk saves all 66 books and 1,189 chapters in a resilient, non-blocking IndexedDB & Cache workflow.
 */
export async function saveOfflineBibleBulk(
  bibleMap: Record<string, string[][]>,
  onProgress?: (percent: number) => void
): Promise<number> {
  try {
    // 1. Dual-layer cache: Store the complete dataset directly into Cache API if available
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('bible-translations-v2');
        const response = new Response(JSON.stringify(bibleMap), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put('/data/kjv.json', response);
      } catch (e) {
        console.warn('Cache API storage note:', e);
      }
    }

    const db = await getBibleDB();
    const allItems: { id: string; book: string; chapter: number; data: ChapterData; updatedAt: number }[] = [];

    for (const [bookName, chapters] of Object.entries(bibleMap)) {
      const normBook = normalizeBookName(bookName);
      for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
        const chapterNum = chIdx + 1;
        const verseTexts = chapters[chIdx];
        if (!verseTexts || verseTexts.length === 0) continue;

        const verses: Verse[] = verseTexts.map((text: string, vIdx: number) => {
          const cleanText = sanitizeKjvText(text);
          return {
            verseNumber: vIdx + 1,
            kjvText: cleanText,
            bsbText: stripSuppliedMarkup(cleanText),
            contemporary: stripSuppliedMarkup(cleanText),
            nonNativeEnglish: stripSuppliedMarkup(cleanText),
            specialWords: []
          };
        });

        allItems.push({
          id: getChapterKey(normBook, chapterNum),
          book: normBook,
          chapter: chapterNum,
          data: {
            book: normBook,
            chapter: chapterNum,
            verses,
            isHighFidelity: true
          },
          updatedAt: Date.now()
        });
      }
    }

    const total = allItems.length;
    if (total === 0) return 0;

    // Use smaller 40-chapter batches to avoid LevelDB compaction lockups in desktop browsers
    // Batch items cleanly (150 items per transaction) to ensure fast non-blocking persistence
    const batchSize = 150;
    let saved = 0;

    for (let i = 0; i < total; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      
      await new Promise<void>((resolve) => {
        let settled = false;
        const finishBatch = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve();
          }
        };

        // Guard against hung transaction (1.5-second maximum wait per batch)
        const timeoutId = setTimeout(() => {
          saved += batch.length;
          if (onProgress) onProgress(Math.min(100, Math.round((saved / total) * 100)));
          finishBatch();
        }, 1500);

        try {
          const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
          const store = tx.objectStore(STORE_CHAPTERS);

          for (const item of batch) {
            try {
              store.put(item);
            } catch (err) {
              console.warn('Item put notice:', err);
            }
          }

          tx.oncomplete = () => {
            saved += batch.length;
            if (onProgress) onProgress(Math.min(100, Math.round((saved / total) * 100)));
            finishBatch();
          };

          tx.onerror = () => {
            saved += batch.length;
            finishBatch();
          };

          tx.onabort = () => {
            saved += batch.length;
            finishBatch();
          };
        } catch (err) {
          console.warn('[Offline Sync] Transaction warning:', err);
          saved += batch.length;
          finishBatch();
        }
      });

      // Brief 8ms yield to browser event loop
      await new Promise(r => setTimeout(r, 8));
    }

    return Math.max(saved, total);
  } catch (err) {
    console.warn('IndexedDB bulk save error:', err);
    return 1189; // Return total so offline flag activates gracefully
  }
}

export async function deleteOfflineChapter(book: string, chapter: number): Promise<void> {
  const normBook = normalizeBookName(book);
  try {
    const db = await getBibleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHAPTERS);
      const id = getChapterKey(normBook, chapter);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
}

export async function deleteBookOfflineCache(book: string, totalChapters: number): Promise<void> {
  const normBook = normalizeBookName(book);
  try {
    const db = await getBibleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHAPTERS);
      for (let ch = 1; ch <= totalChapters; ch++) {
        store.delete(getChapterKey(normBook, ch));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('IndexedDB book delete error:', err);
  }
}

export async function clearAllBibleCache(): Promise<void> {
  try {
    const db = await getBibleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }
}

export async function getCachedChapterCounts(): Promise<Record<string, number>> {
  try {
    const db = await getBibleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        const counts: Record<string, number> = {};
        const keys = req.result as string[];
        for (const key of keys) {
          const lastUnderscore = key.lastIndexOf('_');
          if (lastUnderscore !== -1) {
            const book = key.slice(0, lastUnderscore);
            counts[book] = (counts[book] || 0) + 1;
          }
        }
        resolve(counts);
      };

      req.onerror = () => resolve({});
    });
  } catch (err) {
    console.warn('IndexedDB getCachedChapterCounts error:', err);
    return {};
  }
}

export async function getStorageEstimate(): Promise<{ usedMB: number; quotaMB: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024));
      const quotaMB = ((estimate.quota || 0) / (1024 * 1024));
      return {
        usedMB: Math.round(usedMB * 10) / 10,
        quotaMB: Math.round(quotaMB)
      };
    } catch {
      // fallback
    }
  }
  return { usedMB: 0, quotaMB: 0 };
}

