/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudyLaterVerse {
  id: string; // e.g. "Romans_8_28"
  book: string;
  chapter: number;
  verse: number;
  snippetText?: string;
  studyGoal?: string;
  addedAt: string; // ISO timestamp
  lastRemindedDate?: string;
  daysPending: number;
  status: 'pending' | 'completed';
  completedAt?: string;
  priority?: 'normal' | 'high';
}

export interface PastActivityFourAreas {
  notesDrafted: { total: number; latestSnippet?: string; latestRef?: string };
  strongsAnalyzed: { total: number; latestStrongs?: string; latestWord?: string; latestRef?: string };
  versesHighlighted: { total: number; latestColor?: string; latestRef?: string };
  readingStreak: { streakDays: number; active: boolean };
}

export interface DynamicActivityBriefing {
  narrative: string;
  book: string;
  chapter: number;
  verse?: number;
  studyReminderBrief?: string;
  pastActivityBrief?: string;
  hasPendingStudy?: boolean;
  pendingStudyCount?: number;
  topPendingVerse?: StudyLaterVerse;
  studyStreakDays?: number;
  fourAreas?: PastActivityFourAreas;
}

export interface LatestUserActivity {
  actionType: string;
  reference: string;
  details?: string;
  strongsNumber?: string;
  originalWord?: string;
  timestamp?: string;
  noteSnippet?: string;
}

export interface UserStudySummaryStats {
  totalChaptersViewed: number;
  totalUniqueBooks: number;
  totalStrongsAnalyzed: number;
  totalNotesRecorded: number;
  totalHighlightsSaved: number;
  streakDays: number;
  targetBook: string;
  targetChapter: number;
  targetVerse?: number;
  latestActivity?: LatestUserActivity;
}

export function extractPlainTextSnippet(noteContent: string, maxLen = 45): string {
  if (!noteContent) return '';
  const trimmed = noteContent.trim();
  let text = trimmed;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        text = parsed.pages
          .map((p: any) => p.text || p.html || '')
          .filter(Boolean)
          .join(' ');
      }
    } catch {}
  }
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length > maxLen) {
    return clean.slice(0, maxLen).trim() + '…';
  }
  return clean;
}

/**
 * Parses a reference string like "Genesis 1:1", "1 John 4:8", or "Romans 8"
 * into structured book, chapter, and optional verse components.
 */
export function parseScriptureReference(rawRef: string): {
  book: string;
  chapter: number;
  verse?: number;
} {
  const fallback = { book: 'Genesis', chapter: 1 };
  if (!rawRef || typeof rawRef !== 'string') return fallback;

  const trimmed = rawRef.trim();
  // Handle range or cross-reference notation like "Rom 8:28 -> Jer 17:7"
  const primaryRef = trimmed.split('->')[0].trim();

  // Match book name (with optional leading number and multiple words) and chapter:verse
  // Examples: "Genesis 1:1", "1 Corinthians 13:4", "Song of Solomon 2:1", "Psalm 23"
  const match = primaryRef.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+))?/);
  if (!match) return fallback;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10) || 1;
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  return { book, chapter, verse };
}

/**
 * Aggregates cumulative study statistics from localStorage across all
 * reading history, activity logs, theological diary notes, and highlights.
 */
export function getUserStudySummaryStats(): UserStudySummaryStats {
  const fallbackBook = 'Genesis';
  const fallbackChapter = 1;

  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      totalChaptersViewed: 1,
      totalUniqueBooks: 1,
      totalStrongsAnalyzed: 0,
      totalNotesRecorded: 0,
      totalHighlightsSaved: 0,
      streakDays: 1,
      targetBook: fallbackBook,
      targetChapter: fallbackChapter,
      targetVerse: 1,
    };
  }

  try {
    const chaptersSet = new Set<string>();
    const booksSet = new Set<string>();
    const strongsSet = new Set<string>();

    // 1. Reading history
    const rawReading = window.localStorage.getItem('logosbridge_reading_history');
    if (rawReading) {
      try {
        const readingMap = JSON.parse(rawReading);
        if (readingMap && typeof readingMap === 'object') {
          for (const key of Object.keys(readingMap)) {
            const item = readingMap[key];
            if (item && item.book && item.chapter) {
              chaptersSet.add(`${item.book}_${item.chapter}`);
              booksSet.add(item.book);
            }
          }
        }
      } catch (e) {
        console.warn('[ActivityBriefingEngine] Error parsing reading history:', e);
      }
    }

    // 2. Activity logs
    const rawLogs = window.localStorage.getItem('logosbridge_activity_logs');
    let logNotesCount = 0;
    let logHighlightsCount = 0;
    let topTargetRef: { book: string; chapter: number; verse?: number } | null = null;

    let latestActivity: LatestUserActivity | undefined = undefined;

    if (rawLogs) {
      try {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs) && logs.length > 0) {
          const first = logs[0];
          if (first && typeof first === 'object') {
            latestActivity = {
              actionType: first.actionType || '',
              reference: first.reference || '',
              details: first.details,
              strongsNumber: first.strongsNumber,
              originalWord: first.originalWord,
              timestamp: first.timestamp,
            };
          }

          logs.forEach((log, index) => {
            if (!log || typeof log !== 'object') return;

            // Capture top target reference from the most recent action
            if (index === 0 && (log.reference || log.details)) {
              topTargetRef = parseScriptureReference(log.reference || log.details || '');
            }

            // Record chapter/book if reference exists
            if (log.reference) {
              const parsed = parseScriptureReference(log.reference);
              if (parsed && parsed.book && parsed.chapter) {
                chaptersSet.add(`${parsed.book}_${parsed.chapter}`);
                booksSet.add(parsed.book);
              }
            }

            // Count Strong's inquiries
            if (log.actionType === 'STRONGS_LOOKUP' || log.strongsNumber) {
              if (log.strongsNumber) {
                strongsSet.add(String(log.strongsNumber).trim().toUpperCase());
              }
            }

            // Count notes and highlights
            if (log.actionType === 'saved_note') {
              logNotesCount++;
            } else if (log.actionType === 'highlighted_verse' || log.actionType === 'saved_verse') {
              logHighlightsCount++;
            }
          });
        }
      } catch (e) {
        console.warn('[ActivityBriefingEngine] Error parsing activity logs:', e);
      }
    }

    // 3. Saved study verses (theological notes & highlights)
    let savedNotesCount = 0;
    let savedHighlightsCount = 0;
    let latestSavedVerseWithNote: { book: string; chapter: number; verse: number; notes: string } | null = null;
    const rawSavedVerses = window.localStorage.getItem('saved_bible_study_verses');
    if (rawSavedVerses) {
      try {
        const saved = JSON.parse(rawSavedVerses);
        if (Array.isArray(saved)) {
          for (const sv of saved) {
            if (sv && typeof sv === 'object' && sv.book) {
              if (sv.chapter) {
                chaptersSet.add(`${sv.book}_${sv.chapter}`);
              }
              booksSet.add(sv.book);
              if (typeof sv.notes === 'string' && sv.notes.trim().length > 0) {
                savedNotesCount++;
                if (!latestSavedVerseWithNote) {
                  latestSavedVerseWithNote = {
                    book: sv.book,
                    chapter: Number(sv.chapter),
                    verse: Number(sv.verse),
                    notes: sv.notes,
                  };
                }
              }
              if (sv.color) {
                savedHighlightsCount++;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ActivityBriefingEngine] Error parsing saved verses:', e);
      }
    }

    // Attach note snippet to latestActivity if applicable
    if (latestActivity) {
      if (latestSavedVerseWithNote && latestActivity.actionType === 'saved_note') {
        latestActivity.noteSnippet = extractPlainTextSnippet(latestSavedVerseWithNote.notes);
      }
    } else if (latestSavedVerseWithNote) {
      latestActivity = {
        actionType: 'saved_note',
        reference: `${latestSavedVerseWithNote.book} ${latestSavedVerseWithNote.chapter}:${latestSavedVerseWithNote.verse}`,
        noteSnippet: extractPlainTextSnippet(latestSavedVerseWithNote.notes),
      };
      if (!topTargetRef) {
        topTargetRef = {
          book: latestSavedVerseWithNote.book,
          chapter: latestSavedVerseWithNote.chapter,
          verse: latestSavedVerseWithNote.verse,
        };
      }
    }

    // 4. Discipleship study state (streak and keywords)
    let streakDays = 1;
    let stateLastVerse: string | null = null;
    const rawState = window.localStorage.getItem('logosbridge_user_study_state');
    if (rawState) {
      try {
        const state = JSON.parse(rawState);
        if (state && typeof state === 'object') {
          if (typeof state.consecutiveDays === 'number' && state.consecutiveDays > 0) {
            streakDays = state.consecutiveDays;
          }
          if (typeof state.lastStudiedVerse === 'string' && state.lastStudiedVerse) {
            stateLastVerse = state.lastStudiedVerse;
          }
          if (Array.isArray(state.recentStrongNumbers)) {
            state.recentStrongNumbers.forEach((s: string) => {
              if (s && typeof s === 'string') strongsSet.add(s.trim().toUpperCase());
            });
          }
        }
      } catch (e) {
        console.warn('[ActivityBriefingEngine] Error parsing user study state:', e);
      }
    }

    // 5. Determine active continuation book and chapter
    const lastStoredBook =
      window.localStorage.getItem('logosbridge_last_book') ||
      window.localStorage.getItem('logosbridge_last_read_book') ||
      fallbackBook;
    const lastStoredChapter =
      parseInt(
        window.localStorage.getItem('logosbridge_last_chapter') ||
        window.localStorage.getItem('logosbridge_last_read_chapter') ||
        '1',
        10
      ) || fallbackChapter;

    let targetBook = lastStoredBook;
    let targetChapter = lastStoredChapter;
    let targetVerse: number | undefined = undefined;

    if (topTargetRef && topTargetRef.book) {
      targetBook = topTargetRef.book;
      targetChapter = topTargetRef.chapter;
      targetVerse = topTargetRef.verse;
    } else if (stateLastVerse) {
      const parsedState = parseScriptureReference(stateLastVerse);
      if (parsedState.book) {
        targetBook = parsedState.book;
        targetChapter = parsedState.chapter;
        targetVerse = parsedState.verse;
      }
    }

    // Ensure at least target book and chapter are counted
    chaptersSet.add(`${targetBook}_${targetChapter}`);
    booksSet.add(targetBook);

    const totalNotes = Math.max(savedNotesCount, logNotesCount);
    const totalHighlights = Math.max(savedHighlightsCount, logHighlightsCount);

    return {
      totalChaptersViewed: Math.max(1, chaptersSet.size),
      totalUniqueBooks: Math.max(1, booksSet.size),
      totalStrongsAnalyzed: strongsSet.size,
      totalNotesRecorded: totalNotes,
      totalHighlightsSaved: totalHighlights,
      streakDays,
      targetBook,
      targetChapter,
      targetVerse,
      latestActivity,
    };
  } catch (err) {
    console.warn('[ActivityBriefingEngine] Error aggregating study stats:', err);
    return {
      totalChaptersViewed: 1,
      totalUniqueBooks: 1,
      totalStrongsAnalyzed: 0,
      totalNotesRecorded: 0,
      totalHighlightsSaved: 0,
      streakDays: 1,
      targetBook: fallbackBook,
      targetChapter: fallbackChapter,
      targetVerse: 1,
    };
  }
}

// =========================================================
// SMART OFFICE PERSONAL ASSISTANT: STUDY LATER QUEUE ENGINE
// =========================================================

const STUDY_LATER_STORAGE_KEY = 'logosbridge_study_later_queue';

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStudyLaterQueue(): StudyLaterVerse[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STUDY_LATER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return parsed.map((item: any) => {
      const addedTime = item.addedAt ? new Date(item.addedAt).getTime() : now;
      const daysPending = Math.max(0, Math.floor((now - addedTime) / (1000 * 60 * 60 * 24)));
      return {
        ...item,
        daysPending,
      };
    });
  } catch (err) {
    console.warn('[ActivityBriefingEngine] Error parsing study later queue:', err);
    return [];
  }
}

export function saveStudyLaterQueue(queue: StudyLaterVerse[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STUDY_LATER_STORAGE_KEY, JSON.stringify(queue));
    // Trigger storage event so listening views immediately refresh
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('[ActivityBriefingEngine] Error saving study later queue:', err);
  }
}

export function isVerseInStudyLater(book: string, chapter: number, verse: number): boolean {
  const queue = getStudyLaterQueue();
  const b = (book || '').trim().toLowerCase();
  return queue.some(
    (item) =>
      item.status === 'pending' &&
      item.book.trim().toLowerCase() === b &&
      Number(item.chapter) === Number(chapter) &&
      Number(item.verse) === Number(verse)
  );
}

export function addVerseToStudyLater(
  book: string,
  chapter: number,
  verse: number,
  snippetText?: string,
  studyGoal?: string
): StudyLaterVerse {
  const queue = getStudyLaterQueue();
  const id = `${book}_${chapter}_${verse}`;
  const nowIso = new Date().toISOString();

  // Check if already in queue
  const existingIndex = queue.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    // Re-activate if completed
    const existing = queue[existingIndex];
    existing.status = 'pending';
    existing.snippetText = snippetText || existing.snippetText;
    existing.studyGoal = studyGoal || existing.studyGoal;
    existing.addedAt = nowIso;
    saveStudyLaterQueue(queue);
    return existing;
  }

  const newItem: StudyLaterVerse = {
    id,
    book: book.trim(),
    chapter: Number(chapter),
    verse: Number(verse),
    snippetText: snippetText ? snippetText.slice(0, 160) : undefined,
    studyGoal: studyGoal || `In-depth lexical reflection on ${book} ${chapter}:${verse}`,
    addedAt: nowIso,
    daysPending: 0,
    status: 'pending',
    priority: 'normal',
  };

  queue.unshift(newItem);
  saveStudyLaterQueue(queue);
  return newItem;
}

export function removeVerseFromStudyLater(book: string, chapter: number, verse: number): void {
  const queue = getStudyLaterQueue();
  const id = `${book}_${chapter}_${verse}`;
  const filtered = queue.filter((item) => item.id !== id);
  saveStudyLaterQueue(filtered);
}

export function toggleVerseStudyLater(
  book: string,
  chapter: number,
  verse: number,
  snippetText?: string,
  studyGoal?: string
): boolean {
  if (isVerseInStudyLater(book, chapter, verse)) {
    removeVerseFromStudyLater(book, chapter, verse);
    return false; // Removed
  } else {
    addVerseToStudyLater(book, chapter, verse, snippetText, studyGoal);
    return true; // Added
  }
}

export function markVerseStudyCompleted(id: string): void {
  const queue = getStudyLaterQueue();
  const item = queue.find((q) => q.id === id);
  if (item) {
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    saveStudyLaterQueue(queue);
  }
}

export function snoozeVerseStudyReminder(id: string): void {
  const queue = getStudyLaterQueue();
  const item = queue.find((q) => q.id === id);
  if (item) {
    item.lastRemindedDate = getTodayDateString();
    saveStudyLaterQueue(queue);
  }
}

export function getTopPendingStudyReminder(): {
  verse: StudyLaterVerse;
  briefReminder: string;
  daysPending: number;
} | null {
  const queue = getStudyLaterQueue();
  const today = getTodayDateString();
  const pending = queue.filter((item) => item.status === 'pending');

  if (pending.length === 0) return null;

  // Prioritize active (not snoozed for today), then overdue items
  const unsnoozed = pending.filter((item) => item.lastRemindedDate !== today);
  const top = unsnoozed.length > 0 ? unsnoozed[0] : pending[0];

  const daysText = top.daysPending === 0 ? 'Queued Today' : `Pending ${top.daysPending}d`;
  const briefReminder = `${top.book} ${top.chapter}:${top.verse} (${daysText})${top.studyGoal ? ` • "${top.studyGoal}"` : ''}`;

  return {
    verse: top,
    briefReminder,
    daysPending: top.daysPending,
  };
}

// =========================================================
// COMPREHENSIVE 4-AREA PAST ACTIVITY AGGREGATOR
// 1. Notes drafted
// 2. Strong's words analyzed
// 3. Verses highlighted
// 4. Reading streak
// =========================================================

export function getPastActivityFourAreas(): PastActivityFourAreas {
  const stats = getUserStudySummaryStats();
  let latestNoteSnippet = '';
  let latestNoteRef = '';
  let latestStrongsNum = '';
  let latestStrongsWord = '';
  let latestStrongsRef = '';
  let latestHighlightColor = '';
  let latestHighlightRef = '';

  // 1. Extract from Activity logs
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawLogs = window.localStorage.getItem('logosbridge_activity_logs');
      if (rawLogs) {
        const logs = JSON.parse(rawLogs);
        if (Array.isArray(logs)) {
          for (const l of logs) {
            if (!latestStrongsNum && (l.actionType === 'STRONGS_LOOKUP' || l.strongsNumber)) {
              latestStrongsNum = l.strongsNumber || '';
              latestStrongsWord = l.originalWord || '';
              latestStrongsRef = l.reference || '';
            }
            if (!latestNoteSnippet && l.actionType === 'saved_note') {
              latestNoteRef = l.reference || '';
              latestNoteSnippet = extractPlainTextSnippet(l.details || '');
            }
            if (!latestHighlightRef && (l.actionType === 'highlighted_verse' || l.actionType === 'saved_verse')) {
              latestHighlightRef = l.reference || '';
            }
          }
        }
      }

      // 2. Extract from saved bible study verses
      const rawSaved = window.localStorage.getItem('saved_bible_study_verses');
      if (rawSaved) {
        const saved = JSON.parse(rawSaved);
        if (Array.isArray(saved)) {
          for (const sv of saved) {
            if (!latestNoteSnippet && sv.notes && sv.notes.trim()) {
              latestNoteRef = `${sv.book} ${sv.chapter}:${sv.verse}`;
              latestNoteSnippet = extractPlainTextSnippet(sv.notes);
            }
            if (!latestHighlightRef && sv.color && sv.color !== 'none') {
              latestHighlightRef = `${sv.book} ${sv.chapter}:${sv.verse}`;
              latestHighlightColor = sv.color;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ActivityBriefingEngine] Error parsing four areas:', e);
    }
  }

  return {
    notesDrafted: {
      total: stats.totalNotesRecorded,
      latestSnippet: latestNoteSnippet || undefined,
      latestRef: latestNoteRef || undefined,
    },
    strongsAnalyzed: {
      total: stats.totalStrongsAnalyzed,
      latestStrongs: latestStrongsNum || undefined,
      latestWord: latestStrongsWord || undefined,
      latestRef: latestStrongsRef || undefined,
    },
    versesHighlighted: {
      total: stats.totalHighlightsSaved,
      latestColor: latestHighlightColor || undefined,
      latestRef: latestHighlightRef || undefined,
    },
    readingStreak: {
      streakDays: stats.streakDays,
      active: stats.streakDays > 0,
    },
  };
}

export function generateComprehensivePastActivityBrief(): string {
  const four = getPastActivityFourAreas();
  const segments: string[] = [];

  // Area 1: Strong's word analyzed
  if (four.strongsAnalyzed.latestStrongs) {
    const wordPart = four.strongsAnalyzed.latestWord ? ` (${four.strongsAnalyzed.latestWord})` : '';
    const refPart = four.strongsAnalyzed.latestRef ? ` in ${four.strongsAnalyzed.latestRef}` : '';
    segments.push(`Analyzed root ${four.strongsAnalyzed.latestStrongs}${wordPart}${refPart}`);
  } else if (four.strongsAnalyzed.total > 0) {
    segments.push(`${four.strongsAnalyzed.total} Strong's roots analyzed`);
  }

  // Area 2: Notes drafted
  if (four.notesDrafted.latestRef) {
    const snippetPart = four.notesDrafted.latestSnippet ? `: "${four.notesDrafted.latestSnippet}"` : '';
    segments.push(`Drafted reflection note on ${four.notesDrafted.latestRef}${snippetPart}`);
  } else if (four.notesDrafted.total > 0) {
    segments.push(`${four.notesDrafted.total} study notes recorded`);
  }

  // Area 3: Verses highlighted
  if (four.versesHighlighted.latestRef) {
    segments.push(`Illuminated ${four.versesHighlighted.latestRef} in Scripture`);
  } else if (four.versesHighlighted.total > 0) {
    segments.push(`${four.versesHighlighted.total} highlighted covenant verses`);
  }

  // Area 4: Reading streak
  const streakText = `${Math.max(1, four.readingStreak.streakDays)}-Day Study Streak 🔥`;
  segments.push(streakText);

  // Take top 2-3 segments to maintain compact, readable elegance
  return segments.slice(0, 3).join(' • ');
}

/**
 * Generates an accurate, memory-recall activity briefing narrative
 * integrating both Daily Study Reminders and the 4-area Past Activity Briefing.
 */
export function generateDynamicActivityBriefing(): DynamicActivityBriefing {
  const stats = getUserStudySummaryStats();
  const fourAreas = getPastActivityFourAreas();
  const topReminder = getTopPendingStudyReminder();
  const pastActivityBrief = generateComprehensivePastActivityBrief();

  let targetBook = stats.targetBook;
  let targetChapter = stats.targetChapter;
  let targetVerse = stats.targetVerse;

  let studyReminderBrief: string | undefined = undefined;
  if (topReminder) {
    studyReminderBrief = topReminder.briefReminder;
    // If a study reminder is active, target verse points to that reminder
    targetBook = topReminder.verse.book;
    targetChapter = topReminder.verse.chapter;
    targetVerse = topReminder.verse.verse;
  }

  // Combined marquee narrative
  let narrative = '';
  if (studyReminderBrief && pastActivityBrief) {
    narrative = `Study Reminder: ${studyReminderBrief} • Recent: ${pastActivityBrief}`;
  } else if (studyReminderBrief) {
    narrative = `Study Reminder: ${studyReminderBrief} • Tap to begin study`;
  } else {
    narrative = pastActivityBrief;
  }

  const pendingQueue = getStudyLaterQueue().filter((q) => q.status === 'pending');

  return {
    narrative,
    book: targetBook,
    chapter: targetChapter,
    verse: targetVerse,
    studyReminderBrief,
    pastActivityBrief,
    hasPendingStudy: pendingQueue.length > 0,
    pendingStudyCount: pendingQueue.length,
    topPendingVerse: topReminder?.verse,
    studyStreakDays: fourAreas.readingStreak.streakDays,
    fourAreas,
  };
}
