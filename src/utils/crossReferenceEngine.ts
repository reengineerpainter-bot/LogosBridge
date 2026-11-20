/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeBookName, loadBundledKjvDataset } from './offlineBibleStorage';
import triadCrossReferences from '../data/triad_cross_references.json';
import { syncUserCrossReferencesToCloud } from './supabaseSync';

export interface ParsedVerseRef {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Standardizes and parses a reference string like "John 3:16", "1 John 4:9", "Rom 8:28", "Gen 1:1"
 */
export function parseVerseReference(ref: string): ParsedVerseRef | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  const match = trimmed.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.](\d+)(?:-\d+)?$/);
  if (!match) return null;

  const rawBook = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);

  if (isNaN(chapter) || isNaN(verse)) return null;

  const normBook = normalizeBookName(rawBook);
  return {
    book: normBook,
    chapter,
    verse
  };
}

/**
 * In-memory cache of dynamically resolved strict triad cross-references
 * Keyed by canonical reference (e.g. "Mark 11:22")
 */
const DYNAMIC_TRIAD_CACHE: Record<string, string[]> = {};
const pendingFetches = new Set<string>();
const updateListeners = new Set<() => void>();

const USER_CROSS_REFS_STORAGE_PREFIX = 'logos_user_cross_references_';
let currentActiveUserId: string = 'guest';
let USER_ADDED_CROSS_REFS: Record<string, string[]> = loadUserCrossReferences(currentActiveUserId);

function getUserStorageKey(userId: string): string {
  return `${USER_CROSS_REFS_STORAGE_PREFIX}${userId || 'guest'}`;
}

function loadUserCrossReferences(userId: string): Record<string, string[]> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(getUserStorageKey(userId));
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[CrossReferenceEngine] Failed to load user cross references:', e);
  }
  return {};
}

function saveUserCrossReferences(userId: string, data: Record<string, string[]>) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(getUserStorageKey(userId), JSON.stringify(data));
    }
  } catch (e) {
    console.warn('[CrossReferenceEngine] Failed to save user cross references:', e);
  }
}

/**
 * Sets the active authenticated user ID to isolate attached cross-references per user.
 * User A only sees their own attached cross-references.
 */
export function setActiveUserForCrossReferences(userId: string | null): void {
  const nextId = userId && userId.trim() ? userId.trim() : 'guest';
  if (currentActiveUserId !== nextId) {
    currentActiveUserId = nextId;
    USER_ADDED_CROSS_REFS = loadUserCrossReferences(currentActiveUserId);
    notifyUpdateListeners();
  }
}

/**
 * Merges cloud cross-references into local user storage upon login
 */
export function mergeCloudCrossReferences(cloudRefs: Record<string, string[]>): void {
  if (!cloudRefs || typeof cloudRefs !== 'object') return;
  let hasChanges = false;
  const merged: Record<string, string[]> = { ...USER_ADDED_CROSS_REFS };
  
  Object.keys(cloudRefs).forEach((key) => {
    const remoteList = Array.isArray(cloudRefs[key]) ? cloudRefs[key] : [];
    const localList = merged[key] || [];
    const combined = Array.from(new Set([...localList, ...remoteList]));
    if (combined.length !== localList.length) {
      merged[key] = combined;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    USER_ADDED_CROSS_REFS = merged;
    saveUserCrossReferences(currentActiveUserId, USER_ADDED_CROSS_REFS);
    notifyUpdateListeners();
  }
}

export function addUserCrossReference(book: string, chapter: number, verse: number, ref: string): void {
  if (!ref) return;
  const trimmed = ref.trim();
  const normBook = normalizeBookName(book || 'Genesis');
  const key = `${normBook} ${chapter}:${verse}`;
  const existing = USER_ADDED_CROSS_REFS[key] || [];
  if (!existing.includes(trimmed)) {
    USER_ADDED_CROSS_REFS[key] = [...existing, trimmed];
    saveUserCrossReferences(currentActiveUserId, USER_ADDED_CROSS_REFS);
    notifyUpdateListeners();

    // Sync to user's private cloud account if logged in
    if (currentActiveUserId && !currentActiveUserId.startsWith('guest')) {
      syncUserCrossReferencesToCloud(currentActiveUserId, USER_ADDED_CROSS_REFS).catch(() => {});
    }
  }
}

export function removeUserCrossReference(book: string, chapter: number, verse: number, ref: string): void {
  if (!ref) return;
  const trimmed = ref.trim();
  const normBook = normalizeBookName(book || 'Genesis');
  const key = `${normBook} ${chapter}:${verse}`;
  const existing = USER_ADDED_CROSS_REFS[key] || [];
  if (existing.includes(trimmed)) {
    USER_ADDED_CROSS_REFS[key] = existing.filter((r) => r !== trimmed);
    saveUserCrossReferences(currentActiveUserId, USER_ADDED_CROSS_REFS);
    notifyUpdateListeners();

    // Sync to user's private cloud account if logged in
    if (currentActiveUserId && !currentActiveUserId.startsWith('guest')) {
      syncUserCrossReferencesToCloud(currentActiveUserId, USER_ADDED_CROSS_REFS).catch(() => {});
    }
  }
}

export function isUserAddedCrossReference(book: string, chapter: number, verse: number, ref: string): boolean {
  if (!ref) return false;
  const trimmed = ref.trim();
  const normBook = normalizeBookName(book || 'Genesis');
  const key = `${normBook} ${chapter}:${verse}`;
  return (USER_ADDED_CROSS_REFS[key] || []).includes(trimmed);
}

/**
 * Allows React components to subscribe to dynamic cross-reference updates
 * so UI re-renders smoothly when an asynchronous triad scan resolves.
 */
export function subscribeToCrossReferenceUpdates(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

function notifyUpdateListeners() {
  updateListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

/**
 * Developer utility / background fetcher for strict Subject + Action + Object triad cross-references.
 * Calls the backend /api/cross-references endpoint which enforces strict triad matching.
 */
export async function fetchDynamicTriadCrossReferences(
  verseReference: string,
  verseText?: string,
  anatomy?: { subject?: string; action?: string; object?: string }
): Promise<string[]> {
  const normRef = (verseReference || '').trim();
  if (!normRef && !verseText) return [];

  const cacheKey = normRef || (verseText ? verseText.slice(0, 40) : '');
  if (DYNAMIC_TRIAD_CACHE[cacheKey]) {
    return DYNAMIC_TRIAD_CACHE[cacheKey];
  }

  if (pendingFetches.has(cacheKey)) {
    return [];
  }

  pendingFetches.add(cacheKey);

  try {
    const res = await fetch('/api/cross-references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verseReference: normRef,
        verseText: verseText || '',
        subject: anatomy?.subject,
        action: anatomy?.action,
        object: anatomy?.object
      })
    });

    if (res.ok) {
      const data = await res.json();
      const references: string[] = Array.isArray(data.references) ? data.references : [];
      DYNAMIC_TRIAD_CACHE[cacheKey] = references;
      notifyUpdateListeners();
      return references;
    }
  } catch (err) {
    console.warn('[CrossReferenceEngine] Dynamic triad scan error:', err);
  } finally {
    pendingFetches.delete(cacheKey);
  }

  DYNAMIC_TRIAD_CACHE[cacheKey] = [];
  notifyUpdateListeners();
  return [];
}

const CANONICAL_FALLBACK_CROSS_REFS: Record<string, string[]> = {
  'Genesis 1:1': ['John 1:1', 'Colossians 1:16', 'Hebrews 11:3', 'Psalm 33:6'],
  'Genesis 1:2': ['Psalm 104:30', 'Jeremiah 4:23'],
  'Genesis 1:3': ['2 Corinthians 4:6', 'Psalm 33:9'],
  'Genesis 1:26': ['Colossians 3:10', 'James 3:9', 'Genesis 9:6'],
  'Genesis 1:27': ['Matthew 19:4', 'Mark 10:6'],
  'Deuteronomy 31:6': ['Joshua 1:5', 'Joshua 1:9', 'Hebrews 13:5'],
  'Deuteronomy 31:8': ['Joshua 1:9', 'Hebrews 13:5'],
  'Psalm 23:1': ['John 10:11', 'Philippians 4:19'],
  'Proverbs 3:5': ['Jeremiah 17:7', 'Romans 4:3', 'Hebrews 12:2'],
  'Matthew 6:33': ['Psalm 37:25', 'Romans 8:32'],
  'John 1:1': ['Genesis 1:1', '1 John 1:1', 'Revelation 19:13'],
  'John 1:14': ['1 John 4:2', 'Hebrews 2:14', '1 Timothy 3:16'],
  'John 3:16': ['Romans 5:8', '1 John 4:9', '1 John 4:10'],
  'John 6:35': ['Exodus 16:4', 'Psalm 78:24', 'Isaiah 55:1'],
  'Romans 8:26': ['Romans 8:27', 'Ephesians 6:18', 'Jude 1:20'],
  'Romans 8:27': ['1 Corinthians 2:11', '1 John 5:14', 'Romans 8:34'],
  'Romans 8:28': ['Genesis 50:20', 'Ephesians 1:11', '2 Timothy 1:9', 'Jeremiah 29:11'],
  'Philippians 4:6': ['1 Peter 5:7', 'Psalm 55:22', 'Matthew 6:25'],
  'Hebrews 11:1': ['Romans 8:24', '2 Corinthians 4:18', 'Romans 1:17'],
  'Hebrews 11:3': ['Genesis 1:1', 'Psalm 33:6', 'John 1:3'],
  'James 5:13': ['Acts 16:25', 'Psalm 50:15', 'Ephesians 5:19', 'Jonah 2:1-2'],
  'James 5:14': ['Mark 6:13', 'Acts 3:16', 'Acts 28:8', 'Exodus 15:26'],
  'James 5:15': ['Mark 2:5', 'Mark 2:11', 'Psalm 103:3', 'Matthew 9:22'],
  'James 5:16': ['1 Kings 18:41', '1 Kings 18:45', 'Proverbs 15:29', 'James 5:17'],
  'James 5:17': ['1 Kings 17:1', 'Deuteronomy 11:16', 'Luke 4:25', 'Revelation 11:6'],
  '2 Peter 1:3': ['Ephesians 1:3', 'Romans 8:32', '1 Timothy 6:17']
};

/**
 * 100% Offline-First Triad Cross-Reference Accessor.
 * Queries the bundled local static database (triad_cross_references.json).
 * If the verse exists, returns the strictly matched triad array.
 * If not mapped in primary db, gracefully checks canonical fallback database.
 */
export function getCrossReferencesForVerse(
  book: string,
  chapter: number,
  verseNumber: number,
  _verseText?: string
): string[] {
  const normBook = normalizeBookName(book || 'Genesis');
  const primaryKey = `${normBook} ${chapter}:${verseNumber}`;
  let baseList: string[] = [];

  // 1. Check in-memory runtime cache if updated dynamically
  if (DYNAMIC_TRIAD_CACHE[primaryKey]) {
    baseList = DYNAMIC_TRIAD_CACHE[primaryKey];
  } else {
    // 2. Check local static database
    const db = (triadCrossReferences as Record<string, string[]>) || {};
    if (Array.isArray(db[primaryKey])) {
      baseList = db[primaryKey];
    } else if (normBook === 'Psalms' && Array.isArray(db[`Psalm ${chapter}:${verseNumber}`])) {
      baseList = db[`Psalm ${chapter}:${verseNumber}`];
    } else if (Array.isArray(CANONICAL_FALLBACK_CROSS_REFS[primaryKey])) {
      baseList = CANONICAL_FALLBACK_CROSS_REFS[primaryKey];
    } else if (normBook === 'Psalms' && Array.isArray(CANONICAL_FALLBACK_CROSS_REFS[`Psalm ${chapter}:${verseNumber}`])) {
      baseList = CANONICAL_FALLBACK_CROSS_REFS[`Psalm ${chapter}:${verseNumber}`];
    }
  }

  // 3. Merge user added persistent references
  const userAdded = USER_ADDED_CROSS_REFS[primaryKey] || [];
  if (userAdded.length > 0) {
    return Array.from(new Set([...baseList, ...userAdded]));
  }

  return baseList;
}

/**
 * In-memory fast cache of resolved verse texts
 */
const VERSE_TEXT_CACHE: Record<string, string> = {
  'John 1:1': 'In the beginning was the Word, and the Word was with God, and the Word was God.',
  'John 3:16': 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  'John 3:36': 'He that believeth on the Son hath everlasting life: and he that believeth not the Son shall not see life; but the wrath of God abideth on him.',
  'John 6:40': 'And this is the will of him that sent me, that every one which seeth the Son, and believeth on him, may have everlasting life: and I will raise him up at the last day.',
  'John 10:28': 'And I give unto them eternal life; and they shall never perish, neither shall any man pluck them out of my hand.',
  '1 John 4:9': 'In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him.',
  '1 John 4:10': 'Herein is love, not that we loved God, but that he loved us, and sent his Son to be the propitiation for our sins.',
  'Romans 5:8': 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.',
  'Romans 8:28': 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
  'Romans 8:32': 'He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?',
  'Romans 10:9': 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.',
  'Genesis 1:1': 'In the beginning God created the heaven and the earth.',
  'Genesis 50:20': 'But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive.',
  'Psalms 23:1': 'The LORD is my shepherd; I shall not want.',
  'Psalms 46:1': 'God is our refuge and strength, a very present help in trouble.',
  'Proverbs 3:5': 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
  'Proverbs 3:6': 'In all thy ways acknowledge him, and he shall direct thy paths.',
  'Isaiah 40:11': 'He shall feed his flock like a shepherd: he shall gather the lambs with his arm, and carry them in his bosom, and shall gently lead those that are with young.',
  'Isaiah 53:5': 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.',
  'Jeremiah 29:11': 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
  'Matthew 7:7': 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:',
  'Matthew 11:28': 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
  'Ephesians 1:11': 'In whom also we have obtained an inheritance, being predestinated according to the purpose of him who worketh all things after the counsel of his own will:',
  'Ephesians 2:8': 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:',
  'Philippians 4:6': 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
  'Philippians 4:7': 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
  'Philippians 4:13': 'I can do all things through Christ which strengtheneth me.',
  'Hebrews 11:1': 'Now faith is the substance of things hoped for, the evidence of things not seen.',
  'Hebrews 11:3': 'Through faith we understand that the worlds were framed by the word of God, so that things which are seen were not made of things which do appear.'
};

/**
 * Synchronous lookup for fast rendering without layout shifts
 */
export function getSyncVerseText(ref: string): string | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  if (VERSE_TEXT_CACHE[trimmed]) return VERSE_TEXT_CACHE[trimmed];

  const parsed = parseVerseReference(trimmed);
  if (!parsed) return null;

  const standardKey = `${parsed.book} ${parsed.chapter}:${parsed.verse}`;
  return VERSE_TEXT_CACHE[standardKey] || null;
}

/**
 * Asynchronously retrieves the authentic scripture text for any reference in the entire Bible.
 * Resolves from in-memory cache first, then directly from bundled KJV Bible dataset.
 */
export async function getVerseTextByReference(ref: string): Promise<string> {
  if (!ref) return 'Scripture reference';
  const trimmed = ref.trim();

  // 1. Fast cache check
  const cached = getSyncVerseText(trimmed);
  if (cached) return cached;

  const parsed = parseVerseReference(trimmed);
  if (!parsed) {
    return 'Scripture cross-reference linked.';
  }

  // 2. Fetch from bundled KJV dataset
  try {
    const data = await loadBundledKjvDataset();
    if (data && data[parsed.book]) {
      const chapterArr = data[parsed.book][parsed.chapter - 1];
      if (chapterArr && Array.isArray(chapterArr)) {
        const verseText = chapterArr[parsed.verse - 1];
        if (verseText && typeof verseText === 'string') {
          const cleanText = verseText.trim();
          const canonicalKey = `${parsed.book} ${parsed.chapter}:${parsed.verse}`;
          VERSE_TEXT_CACHE[canonicalKey] = cleanText;
          VERSE_TEXT_CACHE[trimmed] = cleanText;
          return cleanText;
        }
      }
    }
  } catch (err) {
    console.warn('[CrossReferenceEngine] Error resolving verse text:', err);
  }

  return 'Scripture cross-reference linked.';
}
