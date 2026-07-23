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
