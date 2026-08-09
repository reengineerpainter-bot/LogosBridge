export interface SpecialWord {
  word: string;
  originalValue: string;
  language: 'Greek' | 'Hebrew' | 'Aramaic' | 'Other';
  explanation: string;
}

export interface Verse {
  verseNumber: number;
  kjvText: string;
  bsbText: string;
  contemporary: string;
  nonNativeEnglish: string;
  manuscriptText?: string;
  specialWords: SpecialWord[];
}

export interface ChapterData {
  book: string;
  chapter: number;
  verses: Verse[];
  isHighFidelity?: boolean;
  isSynthesizedFallback?: boolean;
}

export interface BibleBook {
  name: string;
  chapters: number;
  testament: 'Old' | 'New';
}

// ---------------------------------------------------------
// Backend Types (Firebase)
// ---------------------------------------------------------

export interface ReadingHistory {
  book: string;
  chapter: number;
  readAt: number; // timestamp
}

export interface UserHighlight {
  id: string; // `${book}-${chapter}-${verse}`
  book: string;
  chapter: number;
  verse: number;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface VerseNote {
  id: string; // `${book}-${chapter}-${verse}`
  book: string;
  chapter: number;
  verse: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}
