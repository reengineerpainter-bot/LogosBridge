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
  interlinearWords?: { w: string; t: string; n: string; p?: string }[];
  language?: 'Greek' | 'Hebrew' | 'Aramaic' | 'Other';
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

// ---------------------------------------------------------
// Macro / Micro Relational Strong's Concordance Study Types
// ---------------------------------------------------------

// MACRO DATA (Generated once per verse)
export interface VerseAnatomy {
  verseReference: string; // e.g., "Mark 11:22"
  subject: string;
  action: string;
  object: string;
  qualitiesAndConditions: string;
  legalLinksAndBoundaries: string;
}

// MICRO DATA (Generated for each specific Strong's number tapped)
export interface StrongsWordStudy {
  id: string; // Unique ID (e.g., "Mark-11-22-G2192")
  verseReference: string; // Foreign key linking to VerseAnatomy
  strongsNumber: string; // e.g., "G2192"
  originalWord: string; // Transliteration & Pronunciation
  coreMeaning: string;
  
  // STATIC DATA (Consistent across verses for this Strong's number)
  wordHistory: string;
  ancientWorldview: string;
  
  // DYNAMIC DATA (Specific to how the word is used in this exact verse)
  writersIntent: string;
  spiritualAndCovenantReality?: string;
  theTrueAnchor?: string;
}

export interface StrongsStudyDatabase {
  verseAnatomy: VerseAnatomy[];
  wordStudies: StrongsWordStudy[];
}
