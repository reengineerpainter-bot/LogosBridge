/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../supabase';

export function sanitizeBookmarkId(rawId: string): string {
  return rawId.toLowerCase().trim().replace(/[^a-z0-9_\-]/g, '_');
}

export interface NotebookUserSettings {
  template?: 'blank' | 'ruled' | 'grid';
  fontSize?: number;
  style?: 'h1' | 'h2' | 'h3' | 'b1' | 'b2';
  textColor?: string;
  highlightColor?: string;
  penInstrument?: 'fountain' | 'ballpoint' | 'calligraphy' | 'pencil';
  penStroke?: number;
  penColor?: string;
  surfaceHeight?: number;
}

export interface UserProfileData {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  theme?: 'light' | 'dark';
  lastReadBook?: string;
  lastReadChapter?: number;
  lastReadTab?: string;
  scriptureTypeface?: string;
  scriptureStyle?: string;
  scriptureZoom?: number;
  playbackSpeed?: number;
  isScriptureBold?: boolean;
  isScriptureItalic?: boolean;
  capsuleLastDismissedAt?: Date | string;
  currentCapsuleText?: string;
  currentCapsuleGeneratedAt?: Date | string;
  notebookSettings?: NotebookUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkData {
  id: string;
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  color?: 'none' | 'yellow' | 'cyan' | 'green' | 'red' | 'amber' | 'blue';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizScoreData {
  id: string;
  userId: string;
  mode: 'vocabulary' | 'memorization';
  score: number;
  quizBook?: string;
  quizChapter?: number;
  createdAt: Date;
}

/**
 * Get or Create User Profile row on Supabase authentication
 */
export async function getOrCreateUserProfile(
  userId: string, 
  email: string, 
  displayName?: string, 
  photoURL?: string
): Promise<UserProfileData> {
  const activeTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('logosbridge_theme') as 'light' | 'dark' : null) || 'light';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getOrCreateUserProfile select error:', error.message);
    }

    if (data) {
      return {
        userId: data.id,
        email: data.email || email,
        displayName: data.display_name || displayName || email.split('@')[0],
        photoURL: data.avatar_url || photoURL,
        theme: (data.theme as 'light' | 'dark') || activeTheme,
        lastReadBook: data.last_read_book || 'John',
        lastReadChapter: data.last_read_chapter || 1,
        lastReadTab: data.last_read_tab || 'read',
        scriptureTypeface: data.scripture_typeface,
        scriptureStyle: data.scripture_style,
        scriptureZoom: data.scripture_zoom,
        playbackSpeed: data.playback_speed,
        isScriptureBold: data.is_scripture_bold,
        isScriptureItalic: data.is_scripture_italic,
        capsuleLastDismissedAt: data.capsule_last_dismissed_at ? new Date(data.capsule_last_dismissed_at) : undefined,
        currentCapsuleText: data.current_capsule_text,
        currentCapsuleGeneratedAt: data.current_capsule_generated_at ? new Date(data.current_capsule_generated_at) : undefined,
        notebookSettings: (() => {
          if (data.notebook_settings) {
            try {
              const parsed = typeof data.notebook_settings === 'string' ? JSON.parse(data.notebook_settings) : data.notebook_settings;
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('logosbridge_notebook_settings', JSON.stringify(parsed));
              }
              return parsed;
            } catch {
              return undefined;
            }
          }
          return undefined;
        })(),
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };
    } else {
      // Upsert profile
      const newProfile = {
        id: userId,
        email: email,
        display_name: displayName || email.split('@')[0],
        avatar_url: photoURL || null,
        theme: activeTheme,
        last_read_book: 'John',
        last_read_chapter: 1,
        last_read_tab: 'read',
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(newProfile);

      if (upsertErr) {
        console.warn('Supabase profile upsert notice:', upsertErr.message);
      }

      return {
        userId,
        email,
        displayName: newProfile.display_name,
        photoURL: photoURL || undefined,
        theme: activeTheme,
        lastReadBook: 'John',
        lastReadChapter: 1,
        lastReadTab: 'read',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch (err) {
    console.warn('Supabase getOrCreateUserProfile fallback:', err);
    return {
      userId,
      email,
      displayName: displayName || email.split('@')[0],
      theme: activeTheme,
      lastReadBook: 'John',
      lastReadChapter: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Update User Profile
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Omit<UserProfileData, 'userId' | 'email' | 'createdAt'>>
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;

  // Persist locally for immediate offline responsiveness
  try {
    if (updates.photoURL) {
      localStorage.setItem(`logosbridge_avatar_${userId}`, updates.photoURL);
    }
    if (updates.displayName) {
      localStorage.setItem(`logosbridge_display_name_${userId}`, updates.displayName);
    }
    if (updates.notebookSettings) {
      localStorage.setItem('logosbridge_notebook_settings', JSON.stringify(updates.notebookSettings));
    }
  } catch {
    // ignore
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.notebookSettings !== undefined) payload.notebook_settings = updates.notebookSettings;
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.photoURL !== undefined) payload.avatar_url = updates.photoURL;
  if (updates.theme !== undefined) payload.theme = updates.theme;
  if (updates.lastReadBook !== undefined) payload.last_read_book = updates.lastReadBook;
  if (updates.lastReadChapter !== undefined) payload.last_read_chapter = updates.lastReadChapter;
  if (updates.lastReadTab !== undefined) payload.last_read_tab = updates.lastReadTab;
  if (updates.scriptureTypeface !== undefined) payload.scripture_typeface = updates.scriptureTypeface;
  if (updates.scriptureStyle !== undefined) payload.scripture_style = updates.scriptureStyle;
  if (updates.scriptureZoom !== undefined) payload.scripture_zoom = updates.scriptureZoom;
  if (updates.playbackSpeed !== undefined) payload.playback_speed = updates.playbackSpeed;
  if (updates.isScriptureBold !== undefined) payload.is_scripture_bold = updates.isScriptureBold;
  if (updates.isScriptureItalic !== undefined) payload.is_scripture_italic = updates.isScriptureItalic;
  if (updates.capsuleLastDismissedAt !== undefined) {
    payload.capsule_last_dismissed_at = updates.capsuleLastDismissedAt instanceof Date 
      ? updates.capsuleLastDismissedAt.toISOString() 
      : updates.capsuleLastDismissedAt;
  }
  if (updates.currentCapsuleText !== undefined) payload.current_capsule_text = updates.currentCapsuleText;
  if (updates.currentCapsuleGeneratedAt !== undefined) {
    payload.current_capsule_generated_at = updates.currentCapsuleGeneratedAt instanceof Date 
      ? updates.currentCapsuleGeneratedAt.toISOString() 
      : updates.currentCapsuleGeneratedAt;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) {
      console.warn('Supabase updateUserProfile error:', error.message);
    }
  } catch (error) {
    console.warn('Supabase updateUserProfile notice:', error);
  }
}

/**
 * Fetch all user bookmarks
 */
export async function getUserBookmarks(userId: string): Promise<BookmarkData[]> {
  if (!userId || userId.startsWith('guest')) return [];

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase getUserBookmarks error:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      book: row.book,
      chapter: Number(row.chapter),
      verse: Number(row.verse),
      color: row.color || 'none',
      notes: row.notes || '',
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    }));
  } catch (error) {
    console.warn('Supabase getUserBookmarks catch notice:', error);
    return [];
  }
}

/**
 * Save user bookmark to Supabase
 */
export async function saveUserBookmark(
  userId: string, 
  bookmark: Omit<BookmarkData, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;

  const rawId = bookmark.id || `${bookmark.book}_${bookmark.chapter}_${bookmark.verse}`;
  const docId = sanitizeBookmarkId(rawId);
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('bookmarks')
      .upsert({
        id: docId,
        user_id: userId,
        book: bookmark.book,
        chapter: Number(bookmark.chapter),
        verse: Number(bookmark.verse),
        color: bookmark.color || 'none',
        notes: bookmark.notes || '',
        updated_at: now,
      }, { onConflict: 'user_id,id' });

    if (error) {
      console.warn('Supabase saveUserBookmark error:', error.message);
    }
  } catch (error) {
    console.warn('Supabase saveUserBookmark catch notice:', error);
  }
}

/**
 * Delete bookmark from Supabase
 */
export async function deleteUserBookmark(
  userId: string, 
  book: string, 
  chapter: number, 
  verse: number
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;
  const docId = sanitizeBookmarkId(`${book}_${chapter}_${verse}`);

  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase deleteUserBookmark error:', error.message);
    }
  } catch (error) {
    console.warn('Supabase deleteUserBookmark catch notice:', error);
  }
}

/**
 * Sync Local bookmarks with Supabase
 */
export async function syncBookmarks(
  userId: string,
  localBookmarks: Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>
): Promise<BookmarkData[]> {
  if (!userId || userId.startsWith('guest')) return [];

  try {
    const cloudBookmarks = await getUserBookmarks(userId);
    const cloudMap = new Map<string, BookmarkData>();
    cloudBookmarks.forEach(cb => cloudMap.set(cb.id, cb));

    const upsertList: any[] = [];
    const now = new Date().toISOString();

    localBookmarks.forEach((lb) => {
      const id = sanitizeBookmarkId(`${lb.book}_${lb.chapter}_${lb.verse}`);
      const cloudItem = cloudMap.get(id);

      if (!cloudItem || lb.color !== cloudItem.color || lb.notes !== cloudItem.notes) {
        upsertList.push({
          id,
          user_id: userId,
          book: lb.book,
          chapter: Number(lb.chapter),
          verse: Number(lb.verse),
          color: lb.color || 'none',
          notes: lb.notes || '',
          updated_at: now,
        });
      }
    });

    if (upsertList.length > 0) {
      await supabase.from('bookmarks').upsert(upsertList, { onConflict: 'user_id,id' });
    }

    return await getUserBookmarks(userId);
  } catch (error) {
    console.warn('Supabase syncBookmarks notice:', error);
    return [];
  }
}

/**
 * Subscribe to realtime bookmark and reflection note updates
 */
export function subscribeToUserBookmarks(
  userId: string,
  onUpdate: (cloudBookmarks: BookmarkData[]) => void
): () => void {
  if (!userId || userId.startsWith('guest')) return () => {};

  const channel = supabase
    .channel(`bookmarks-realtime-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookmarks',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        try {
          const fresh = await getUserBookmarks(userId);
          if (fresh && fresh.length >= 0) {
            onUpdate(fresh);
          }
        } catch (e) {
          console.warn('Realtime bookmark fetch notice:', e);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch user historic theological quiz scores
 */
export async function getUserQuizScores(userId: string): Promise<QuizScoreData[]> {
  if (!userId || userId.startsWith('guest')) return [];

  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getUserQuizScores error:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      score: Number(row.score),
      quizBook: row.quiz_book,
      quizChapter: row.quiz_chapter ? Number(row.quiz_chapter) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  } catch (error) {
    console.warn('Supabase getUserQuizScores notice:', error);
    return [];
  }
}

/**
 * Record a new Quiz Score in Supabase
 */
export async function recordQuizScore(
  userId: string, 
  score: Omit<QuizScoreData, 'userId' | 'createdAt'>
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;

  try {
    const { error } = await supabase
      .from('quizzes')
      .upsert({
        id: score.id,
        user_id: userId,
        mode: score.mode,
        score: Number(score.score),
        quiz_book: score.quizBook || '',
        quiz_chapter: score.quizChapter || 1,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('Supabase recordQuizScore error:', error.message);
    }
  } catch (error) {
    console.warn('Supabase recordQuizScore notice:', error);
  }
}

/**
 * Save user note on a verse
 */
export async function saveUserNote(
  userId: string, 
  verseNote: { book: string; chapter: number; verse: number; notes: string }
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;
  const docId = sanitizeBookmarkId(`${verseNote.book}_${verseNote.chapter}_${verseNote.verse}`);

  try {
    if (!verseNote.notes || verseNote.notes.trim() === '') {
      await supabase
        .from('bookmarks')
        .update({ notes: '', updated_at: new Date().toISOString() })
        .eq('id', docId)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('bookmarks')
        .upsert({
          id: docId,
          user_id: userId,
          book: verseNote.book,
          chapter: Number(verseNote.chapter),
          verse: Number(verseNote.verse),
          notes: verseNote.notes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,id' });
    }
  } catch (err) {
    console.warn('Supabase saveUserNote notice:', err);
  }
}

export type ActivityActionType =
  | 'READ_CHAPTER'
  | 'STRONGS_LOOKUP'
  | 'INTERLINEAR_VIEW'
  | 'VERSE_STUDIED'
  | 'HIGHLIGHT_VERSE'
  | 'NOTE_COMPOSED'
  | 'viewed_interlinear'
  | 'highlighted_verse'
  | 'read_chapter'
  | 'explored_cross_reference'
  | 'opened_cross_references'
  | 'saved_note'
  | 'toggled_manuscript_mode'
  | (string & {});

export interface UserActivityLog {
  id?: string;
  userId?: string;
  actionType: ActivityActionType;
  reference?: string;
  strongsNumber?: string;
  originalWord?: string;
  details?: string;
  timestamp: string;
  weight?: number;
}

/**
 * Universal activity logger for Core Study Tools.
 */
export async function logUserActivity(
  actionOrUserIdOrObj: string | Partial<UserActivityLog>,
  referenceOrActivity?: string | Partial<UserActivityLog>,
  details?: string,
  weight?: number
): Promise<void> {
  let activeUserId = 'guest_user';
  try {
    const sessionRes = await supabase.auth.getSession();
    if (sessionRes?.data?.session?.user?.id) {
      activeUserId = sessionRes.data.session.user.id;
    }
  } catch {
    // fallback
  }

  let entry: Partial<UserActivityLog> = {};

  if (typeof actionOrUserIdOrObj === 'object' && actionOrUserIdOrObj !== null) {
    entry = { ...actionOrUserIdOrObj };
    if (entry.userId) activeUserId = entry.userId;
  } else if (typeof actionOrUserIdOrObj === 'string' && typeof referenceOrActivity === 'object' && referenceOrActivity !== null) {
    activeUserId = actionOrUserIdOrObj;
    entry = { ...referenceOrActivity };
  } else if (typeof actionOrUserIdOrObj === 'string') {
    entry = {
      actionType: actionOrUserIdOrObj,
      reference: typeof referenceOrActivity === 'string' ? referenceOrActivity : undefined,
      details: details,
      weight: weight ?? 1,
    };
  }

  if (!entry.actionType) return;

  const now = new Date().toISOString();
  const logEntry: UserActivityLog = {
    actionType: entry.actionType,
    reference: entry.reference || '',
    strongsNumber: entry.strongsNumber,
    originalWord: entry.originalWord,
    details: entry.details || `${entry.actionType} on ${entry.reference || 'Scripture'}`,
    timestamp: entry.timestamp || now,
    weight: entry.weight ?? 1,
    userId: activeUserId,
  };

  // 1. Immediate local storage persistence
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = JSON.parse(window.localStorage.getItem('logosbridge_activity_logs') || '[]');
      existing.unshift(logEntry);
      window.localStorage.setItem('logosbridge_activity_logs', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.warn('Could not cache activity log locally:', e);
    }
  }

  // 2. Supabase persistence
  if (activeUserId && !activeUserId.startsWith('guest')) {
    try {
      await supabase.from('reading_activity').insert({
        user_id: activeUserId,
        action_type: logEntry.actionType,
        reference: logEntry.reference,
        strongs_number: logEntry.strongsNumber || null,
        original_word: logEntry.originalWord || null,
        details: logEntry.details,
        weight: logEntry.weight ?? 1,
      });
    } catch (err) {
      console.warn('Could not persist activity log to Supabase:', err);
    }
  }

  // 3. Dispatch to backend endpoint for in-memory Context Engine cache
  try {
    fetch('/api/user/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        action_type: logEntry.actionType,
        reference: logEntry.reference,
        details: logEntry.details,
        timestamp: logEntry.timestamp,
        weight: logEntry.weight,
        strongsNumber: logEntry.strongsNumber,
        originalWord: logEntry.originalWord,
      }),
    }).catch(() => {});
  } catch {
    // Non-blocking fire-and-forget
  }
}

/**
 * Dismisses the Activity Capsule and records the timestamp to enforce the 24-hour cooldown
 */
export async function dismissCapsule(userId?: string): Promise<void> {
  const nowIso = new Date().toISOString();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('logosbridge_capsule_last_dismissed_at', nowIso);
  }

  if (userId && !userId.startsWith('guest')) {
    try {
      await supabase
        .from('profiles')
        .update({ capsule_last_dismissed_at: nowIso })
        .eq('id', userId);
    } catch (err) {
      console.warn('Could not update capsule dismissal on Supabase:', err);
    }
  }

  try {
    await fetch('/api/user/capsule-dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {
    // offline graceful ignore
  }
}

/**
 * Sync user's custom attached cross-references to Supabase
 */
export async function syncUserCrossReferencesToCloud(
  userId: string, 
  references: Record<string, string[]>
): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;

  try {
    await supabase
      .from('cross_references')
      .upsert({
        id: userId,
        user_id: userId,
        references_json: references,
        updated_at: new Date().toISOString(),
      });
  } catch (error) {
    console.warn('Supabase syncUserCrossReferencesToCloud notice:', error);
  }
}

/**
 * Fetch user's custom attached cross-references from Supabase
 */
export async function fetchUserCrossReferencesFromCloud(
  userId: string
): Promise<Record<string, string[]> | null> {
  if (!userId || userId.startsWith('guest')) return null;

  try {
    const { data, error } = await supabase
      .from('cross_references')
      .select('references_json')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchUserCrossReferencesFromCloud error:', error.message);
      return null;
    }

    if (data && data.references_json) {
      return data.references_json as Record<string, string[]>;
    }
  } catch (error) {
    console.warn('Supabase fetchUserCrossReferencesFromCloud notice:', error);
  }
  return null;
}
