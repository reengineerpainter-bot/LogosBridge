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
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfileData {
  userId: string;
  email: string;
  displayName?: string;
  theme?: 'light' | 'dark';
  lastReadBook?: string;
  lastReadChapter?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkData {
  id: string; // usually book_chapter_verse
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  color: 'none' | 'yellow' | 'cyan' | 'green' | 'red';
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
 * Get or Create User Profile in Firestore
 */
export async function getOrCreateUserProfile(userId: string, email: string, displayName: string): Promise<UserProfileData | null> {
  const userDocRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        theme: data.theme,
        lastReadBook: data.lastReadBook,
        lastReadChapter: data.lastReadChapter,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    } else {
      const now = new Date();
      const newProfile: UserProfileData = {
        userId,
        email,
        displayName,
        theme: 'light',
        lastReadBook: 'John',
        lastReadChapter: 1,
        createdAt: now,
        updatedAt: now,
      };
      
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update User Profile
 */
export async function updateUserProfile(userId: string, updates: Partial<Omit<UserProfileData, 'userId' | 'email' | 'createdAt'>>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  
  try {
    await updateDoc(userDocRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
        id: data.id,
        userId: data.userId,
        book: data.book,
        chapter: Number(data.chapter),
        verse: Number(data.verse),
        color: data.color || 'none',
        notes: data.notes || '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
      });
    });
    return bookmarks;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save user bookmark to Firestore
 */
export async function saveUserBookmark(userId: string, bookmark: Omit<BookmarkData, 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const docId = bookmark.id || `${bookmark.book}_${bookmark.chapter}_${bookmark.verse}`;
  const bookmarkDocRef = doc(db, 'users', userId, 'bookmarks', docId);
  const path = `users/${userId}/bookmarks/${docId}`;
  
  try {
    const docSnap = await getDoc(bookmarkDocRef);
    const now = new Date();
    if (docSnap.exists()) {
      await updateDoc(bookmarkDocRef, {
        color: bookmark.color,
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
        color: bookmark.color,
        notes: bookmark.notes || '',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete bookmark from Firestore
 */
export async function deleteUserBookmark(userId: string, book: string, chapter: number, verse: number): Promise<void> {
  const docId = `${book}_${chapter}_${verse}`;
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
