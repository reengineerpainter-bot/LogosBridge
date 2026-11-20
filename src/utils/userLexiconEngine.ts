/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Offline-First User Lexicon Engine
 * Allows users to attach, edit, and cross-examine personal lexical meanings
 * alongside official Strong's definitions and root actions.
 */

const USER_LEXICON_STORAGE_KEY = 'logos_user_attached_lexicon';

let userLexiconCache: Record<string, string> | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[userLexiconEngine] Error in update listener:', e);
    }
  });
}

function loadFromStorage(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = localStorage.getItem(USER_LEXICON_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[userLexiconEngine] Failed to parse stored user lexicon:', e);
  }
  return {};
}

function persistToStorage(data: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(USER_LEXICON_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[userLexiconEngine] Failed to save user lexicon to localStorage:', e);
  }
}

/**
 * Returns the entire map of user-attached lexical meanings { [strongsNumber]: customMeaning }
 */
export function getUserLexiconMap(): Record<string, string> {
  if (!userLexiconCache) {
    userLexiconCache = loadFromStorage();
  }
  return { ...userLexiconCache };
}

/**
 * Returns the user's custom lexical meaning for a specific Strong's number, or null if none attached.
 */
export function getUserLexiconMeaning(strongsNumber: string | undefined | null): string | null {
  if (!strongsNumber) return null;
  const cleanCode = strongsNumber.trim().toUpperCase();
  const map = getUserLexiconMap();
  return map[cleanCode] || null;
}

/**
 * Attaches or updates a user's personal lexical meaning for a Strong's number.
 */
export function saveUserLexiconMeaning(strongsNumber: string, customMeaning: string): void {
  if (!strongsNumber) return;
  const cleanCode = strongsNumber.trim().toUpperCase();
  const trimmedMeaning = customMeaning.trim();

  const current = getUserLexiconMap();
  if (trimmedMeaning) {
    current[cleanCode] = trimmedMeaning;
  } else {
    delete current[cleanCode];
  }

  userLexiconCache = current;
  persistToStorage(current);
  notifyListeners();
}

/**
 * Removes a user's personal lexical meaning for a Strong's number.
 */
export function removeUserLexiconMeaning(strongsNumber: string): void {
  if (!strongsNumber) return;
  const cleanCode = strongsNumber.trim().toUpperCase();

  const current = getUserLexiconMap();
  if (current[cleanCode]) {
    delete current[cleanCode];
    userLexiconCache = current;
    persistToStorage(current);
    notifyListeners();
  }
}

/**
 * Subscribes to real-time updates when user meanings are saved or deleted.
 */
export function subscribeToUserLexiconUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

