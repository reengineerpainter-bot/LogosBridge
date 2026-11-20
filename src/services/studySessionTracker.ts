/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserStudyState } from '../types/discipleship';

export const USER_STUDY_STATE_STORAGE_KEY = 'logosbridge_user_study_state';

export const DEFAULT_USER_STUDY_STATE: UserStudyState = {
  lastStudiedVerse: 'Genesis 1:1',
  lastStudiedTimestamp: '',
  consecutiveDays: 1,
  recentStrongNumbers: ['H1254', 'H7225', 'H430'],
  recentKeyWords: ['bārā’', 'rē’šît', '’ĕlōhîm'],
};

/**
 * Retrieves the current persisted UserStudyState from localStorage,
 * falling back to default values if not yet set or invalid.
 */
export function getUserStudyState(): UserStudyState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_USER_STUDY_STATE };
  }

  try {
    const raw = window.localStorage.getItem(USER_STUDY_STATE_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_USER_STUDY_STATE };
    }
    const parsed = JSON.parse(raw);
    const parsedVerse = typeof parsed.lastStudiedVerse === 'string' && parsed.lastStudiedVerse
      ? (parsed.lastStudiedVerse === 'Genesis 1:6' && parsed.recentKeyWords?.[0] === 'bārā’'
          ? 'Genesis 1:1'
          : parsed.lastStudiedVerse)
      : DEFAULT_USER_STUDY_STATE.lastStudiedVerse;

    return {
      lastStudiedVerse: parsedVerse,
      lastStudiedTimestamp: typeof parsed.lastStudiedTimestamp === 'string'
        ? parsed.lastStudiedTimestamp
        : '',
      consecutiveDays: typeof parsed.consecutiveDays === 'number' && parsed.consecutiveDays > 0
        ? parsed.consecutiveDays
        : 1,
      recentStrongNumbers: Array.isArray(parsed.recentStrongNumbers)
        ? parsed.recentStrongNumbers
        : [...DEFAULT_USER_STUDY_STATE.recentStrongNumbers],
      recentKeyWords: Array.isArray(parsed.recentKeyWords)
        ? parsed.recentKeyWords
        : [...DEFAULT_USER_STUDY_STATE.recentKeyWords],
    };
  } catch (err) {
    console.warn('Failed to parse user study state from localStorage:', err);
    return { ...DEFAULT_USER_STUDY_STATE };
  }
}

/**
 * Persists the UserStudyState to localStorage.
 */
export function saveUserStudyState(state: UserStudyState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(USER_STUDY_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist user study state to localStorage:', err);
  }
}

/**
 * Evaluates whether the daily discipleship pulse check-in modal should appear.
 * Returns true if more than 20 hours have passed since lastStudiedTimestamp (or if no record exists),
 * and false if the user is in an active session (< 20 hours).
 */
export function shouldShowDailyPulse(): boolean {
  const state = getUserStudyState();
  // Brand new users without prior study records will not see the pulse check-in until they revisit after studying
  if (!state.lastStudiedTimestamp) {
    return false;
  }

  const lastTime = Date.parse(state.lastStudiedTimestamp);
  if (isNaN(lastTime)) {
    return false;
  }

  const elapsedMs = Date.now() - lastTime;
  const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;

  return elapsedMs >= TWENTY_HOURS_MS;
}

/**
 * Updates the user's study session state whenever a verse audit is completed:
 * - Updates lastStudiedVerse and records ISO lastStudiedTimestamp.
 * - Updates consecutiveDays based on 24–48 hour streak window:
 *   - Increments if between 24 and 48 hours since previous visit.
 *   - Preserves streak if within 24 hours.
 *   - Resets to 1 if > 48 hours have elapsed.
 * - Deduplicates and appends recent Strong's IDs and transliterated keywords (capping at latest 5).
 */
export function recordVerseCompleted(
  verseRef: string,
  strongsList: string[] = [],
  keywords: string[] = []
): UserStudyState {
  const current = getUserStudyState();
  const now = new Date();
  const nowIso = now.toISOString();

  let updatedStreak = current.consecutiveDays;

  if (current.lastStudiedTimestamp) {
    const prevTime = Date.parse(current.lastStudiedTimestamp);
    if (!isNaN(prevTime)) {
      const elapsedHours = (now.getTime() - prevTime) / (1000 * 60 * 60);
      if (elapsedHours >= 24 && elapsedHours <= 48) {
        updatedStreak += 1;
      } else if (elapsedHours > 48) {
        updatedStreak = 1;
      }
      // If elapsedHours < 24: preserve streak
    } else {
      updatedStreak = 1;
    }
  } else {
    updatedStreak = 1;
  }

  // Deduplicate and retain recent 3-5 Strong's IDs (newest first, capped at 5)
  const cleanStrongs = (strongsList || []).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const mergedStrongs = Array.from(new Set([...cleanStrongs, ...current.recentStrongNumbers])).slice(0, 5);

  // Deduplicate and retain recent keywords (newest first, capped at 5)
  const cleanKeywords = (keywords || []).map((k) => k.trim()).filter(Boolean);
  const mergedKeywords = Array.from(new Set([...cleanKeywords, ...current.recentKeyWords])).slice(0, 5);

  const updatedState: UserStudyState = {
    lastStudiedVerse: verseRef.trim() || current.lastStudiedVerse,
    lastStudiedTimestamp: nowIso,
    consecutiveDays: updatedStreak,
    recentStrongNumbers: mergedStrongs,
    recentKeyWords: mergedKeywords,
  };

  saveUserStudyState(updatedState);
  return updatedState;
}
