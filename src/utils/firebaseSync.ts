/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

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
 * Get or Create User Profile document on authentication
 */
export async function getOrCreateUserProfile(userId: string, email: string, displayName?: string, photoURL?: string): Promise<UserProfileData> {
  const userDocRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  
  try {
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.notebookSettings) {
        try {
          localStorage.setItem('logosbridge_notebook_settings', JSON.stringify(data.notebookSettings));
        } catch {}
      }
      return {
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || photoURL,
        theme: data.theme,
        lastReadBook: data.lastReadBook,
        lastReadChapter: data.lastReadChapter,
        lastReadTab: data.lastReadTab,
        scriptureTypeface: data.scriptureTypeface,
        scriptureStyle: data.scriptureStyle,
        scriptureZoom: data.scriptureZoom,
        playbackSpeed: data.playbackSpeed,
        isScriptureBold: data.isScriptureBold,
        isScriptureItalic: data.isScriptureItalic,
        capsuleLastDismissedAt: data.capsuleLastDismissedAt?.toDate ? data.capsuleLastDismissedAt.toDate() : data.capsuleLastDismissedAt,
        currentCapsuleText: data.currentCapsuleText,
        currentCapsuleGeneratedAt: data.currentCapsuleGeneratedAt?.toDate ? data.currentCapsuleGeneratedAt.toDate() : data.currentCapsuleGeneratedAt,
        notebookSettings: data.notebookSettings,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      };
    } else {
      const activeTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('logosbridge_theme') as 'light' | 'dark' : null) || 'light';
      const newProfile: UserProfileData = {
        userId,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || undefined,
        theme: activeTheme,
        lastReadBook: 'John',
        lastReadChapter: 1,
        lastReadTab: 'read',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return newProfile;
    }
  } catch (error) {
    console.warn(`Firestore getOrCreateUserProfile notice on ${path}:`, error);
    const activeTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('logosbridge_theme') as 'light' | 'dark' : null) || 'light';
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
export async function updateUserProfile(userId: string, updates: Partial<Omit<UserProfileData, 'userId' | 'email' | 'createdAt'>>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  
  // Persist locally so avatar or preferences are always available even offline
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
  } catch (e) {
    // ignore
  }

  try {
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        userId,
        email: auth.currentUser?.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...updates,
      });
    } else {
      await updateDoc(userDocRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn(`Firestore updateUserProfile notice on ${path}:`, error);
  }
}

/**
 * Fetch all user bookmarks
 */
export async function getUserBookmarks(userId: string): Promise<BookmarkData[]> {
  const bookmarksColRef = collection(db, 'users', userId, 'bookmarks');
  const path = `users/${userId}/bookmarks`;
  
  try {
    const querySnap = await getDocs(bookmarksColRef);
    const bookmarks: BookmarkData[] = [];
    querySnap.forEach((doc) => {
      const data = doc.data();
      bookmarks.push({
        id: doc.id,
        userId: data.userId,
        book: data.book,
        chapter: Number(data.chapter),
        verse: Number(data.verse),
        color: data.color || 'none',
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      });
    });
    return bookmarks;
  } catch (error) {
    console.warn(`Firestore getUserBookmarks notice on ${path}:`, error);
    return [];
  }
}

/**
 * Save user bookmark to Firestore
 */
export async function saveUserBookmark(userId: string, bookmark: Omit<BookmarkData, 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const rawId = bookmark.id || `${bookmark.book}_${bookmark.chapter}_${bookmark.verse}`;
  const docId = sanitizeBookmarkId(rawId);
  const bookmarkDocRef = doc(db, 'users', userId, 'bookmarks', docId);
  const path = `users/${userId}/bookmarks/${docId}`;
  
  try {
    const docSnap = await getDoc(bookmarkDocRef);
    const now = new Date();
    if (docSnap.exists()) {
      await updateDoc(bookmarkDocRef, {
        color: bookmark.color || 'none',
        notes: bookmark.notes || '',
        updatedAt: Timestamp.fromDate(now),
      });
    } else {
      await setDoc(bookmarkDocRef, {
        id: docId,
        userId,
        book: bookmark.book,
        chapter: Number(bookmark.chapter),
        verse: Number(bookmark.verse),
        color: bookmark.color || 'none',
        notes: bookmark.notes || '',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    }
  } catch (error) {
    console.warn(`Firestore saveUserBookmark notice on ${path}:`, error);
  }
}

/**
 * Delete bookmark from Firestore
 */
export async function deleteUserBookmark(userId: string, book: string, chapter: number, verse: number): Promise<void> {
  const docId = sanitizeBookmarkId(`${book}_${chapter}_${verse}`);
  const bookmarkDocRef = doc(db, 'users', userId, 'bookmarks', docId);
  const path = `users/${userId}/bookmarks/${docId}`;
  
  try {
    await deleteDoc(bookmarkDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sync Local bookmarks with Cloud Firestore (Two-way batch reconciler)
 */
export async function syncBookmarks(
  userId: string,
  localBookmarks: Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>
): Promise<BookmarkData[]> {
  const path = `users/${userId}/bookmarks`;
  try {
    // 1. Get Cloud Bookmarks
    const cloudBookmarks = await getUserBookmarks(userId);
    const cloudMap = new Map<string, BookmarkData>();
    cloudBookmarks.forEach(cb => cloudMap.set(cb.id, cb));

    const batch = writeBatch(db);
    let hasWrites = false;
    const now = new Date();

    // 2. Identify missing or stale items on cloud
    const localMap = new Map<string, typeof localBookmarks[0]>();
    localBookmarks.forEach((lb) => {
      const id = `${lb.book}_${lb.chapter}_${lb.verse}`;
      localMap.set(id, lb);

      const cloudItem = cloudMap.get(id);
      if (!cloudItem) {
        // Create in cloud
        const ref = doc(db, 'users', userId, 'bookmarks', id);
        batch.set(ref, {
          id,
          userId,
          book: lb.book,
          chapter: Number(lb.chapter),
          verse: Number(lb.verse),
          color: lb.color || 'none',
          notes: lb.notes || '',
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        });
        hasWrites = true;
      } else if (lb.color !== cloudItem.color || lb.notes !== cloudItem.notes) {
        // Simple resolving - choose whichever has notes or highlights or newer logic
        // For bidirectional safety, let's update cloud to reflect local changes
        const ref = doc(db, 'users', userId, 'bookmarks', id);
        batch.update(ref, {
          color: lb.color || 'none',
          notes: lb.notes || '',
          updatedAt: Timestamp.fromDate(now),
        });
        hasWrites = true;
      }
    });

    if (hasWrites) {
      await batch.commit();
    }

    // Return the reconciled list (local + cloud merge)
    const updatedCloudBookmarks = await getUserBookmarks(userId);
    return updatedCloudBookmarks;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch user historic theological quiz scores
 */
export async function getUserQuizScores(userId: string): Promise<QuizScoreData[]> {
  const quizzesColRef = collection(db, 'users', userId, 'quizzes');
  const path = `users/${userId}/quizzes`;
  
  try {
    const qSnap = await getDocs(query(quizzesColRef, orderBy('createdAt', 'desc')));
    const scores: QuizScoreData[] = [];
    qSnap.forEach((doc) => {
      const data = doc.data();
      scores.push({
        id: data.id,
        userId: data.userId,
        mode: data.mode,
        score: Number(data.score),
        quizBook: data.quizBook,
        quizChapter: data.quizChapter ? Number(data.quizChapter) : undefined,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      });
    });
    return scores;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Record a new Quiz Score in Cloud
 */
export async function recordQuizScore(userId: string, score: Omit<QuizScoreData, 'userId' | 'createdAt'>): Promise<void> {
  const quizDocRef = doc(db, 'users', userId, 'quizzes', score.id);
  const path = `users/${userId}/quizzes/${score.id}`;
  
  try {
    await setDoc(quizDocRef, {
      id: score.id,
      userId,
      mode: score.mode,
      score: Number(score.score),
      quizBook: score.quizBook || '',
      quizChapter: score.quizChapter || 1,
      createdAt: Timestamp.fromDate(new Date()),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


export async function saveUserNote(userId: string, verseNote: { book: string; chapter: number; verse: number; notes: string }): Promise<void> {
  const docId = `${verseNote.book}_${verseNote.chapter}_${verseNote.verse}`;
  const noteDocRef = doc(db, 'users', userId, 'notes', docId);
  const now = new Date();
  
  if (!verseNote.notes || verseNote.notes.trim() === '') {
    try {
      const docSnap = await getDoc(noteDocRef);
      if (docSnap.exists()) {
        await deleteDoc(noteDocRef);
      }
    } catch (e) {
      console.error(e);
    }
    return;
  }

  try {
    const docSnap = await getDoc(noteDocRef);
    if (docSnap.exists()) {
      await updateDoc(noteDocRef, {
        content: verseNote.notes,
        updatedAt: Timestamp.fromDate(now),
      });
    } else {
      await setDoc(noteDocRef, {
        id: docId,
        userId,
        book: verseNote.book,
        chapter: Number(verseNote.chapter),
        verse: Number(verseNote.verse),
        content: verseNote.notes,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/notes/${docId}`);
    throw err;
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
 * Lightweight, universal activity logger for Core Study Tools.
 * Can be called with:
 *   1) logUserActivity('highlighted_verse', 'Genesis 1:1', 'Emerald', 2)
 *   2) logUserActivity({ actionType: 'STRONGS_LOOKUP', reference: 'Gen 1:1', ... })
 *   3) logUserActivity(userId, { actionType: '...', ... })
 */
export async function logUserActivity(
  actionOrUserIdOrObj: string | Partial<UserActivityLog>,
  referenceOrActivity?: string | Partial<UserActivityLog>,
  details?: string,
  weight?: number
): Promise<void> {
  let activeUserId = auth?.currentUser?.uid || 'guest_user';
  let entry: Partial<UserActivityLog> = {};

  if (typeof actionOrUserIdOrObj === 'object' && actionOrUserIdOrObj !== null) {
    // Called as logUserActivity({ actionType: '...', ... })
    entry = { ...actionOrUserIdOrObj };
    if (entry.userId) activeUserId = entry.userId;
  } else if (typeof actionOrUserIdOrObj === 'string' && typeof referenceOrActivity === 'object' && referenceOrActivity !== null) {
    // Called as logUserActivity(userId, { actionType: '...', ... })
    activeUserId = actionOrUserIdOrObj;
    entry = { ...referenceOrActivity };
  } else if (typeof actionOrUserIdOrObj === 'string') {
    // Called as logUserActivity(action, reference, details, weight)
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

  // 2. Cloud Firestore persistence
  if (activeUserId && !activeUserId.startsWith('guest_')) {
    try {
      const activityColRef = collection(db, 'users', activeUserId, 'activity_logs');
      await setDoc(doc(activityColRef), {
        ...logEntry,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not persist activity log to Firestore:', err);
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

  if (userId && !userId.startsWith('guest_')) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        capsuleLastDismissedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not update capsule dismissal on Firestore:', err);
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
 * Sync user's custom attached cross-references to Firestore
 */
export async function syncUserCrossReferencesToCloud(userId: string, references: Record<string, string[]>): Promise<void> {
  if (!userId || userId.startsWith('guest')) return;
  const docRef = doc(db, 'users', userId, 'userData', 'crossReferences');
  try {
    await setDoc(docRef, {
      references,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore syncUserCrossReferencesToCloud notice:', error);
  }
}

/**
 * Fetch user's custom attached cross-references from Firestore
 */
export async function fetchUserCrossReferencesFromCloud(userId: string): Promise<Record<string, string[]> | null> {
  if (!userId || userId.startsWith('guest')) return null;
  const docRef = doc(db, 'users', userId, 'userData', 'crossReferences');
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.references as Record<string, string[]>) || {};
    }
  } catch (error) {
    console.warn('Firestore fetchUserCrossReferencesFromCloud notice:', error);
  }
  return null;
}


