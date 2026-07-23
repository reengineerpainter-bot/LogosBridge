import { ChapterData } from './types';
import { GENESIS_1 } from './chapters/genesis1';
import { HEBREWS_11 } from './chapters/hebrews11';
import { JOHN_1 } from './chapters/john1';
import { JOHN_2 } from './chapters/john2';
import { JOHN_3 } from './chapters/john3';
import { TWO_PETER_1 } from './chapters/twopeter1';
import { PSALMS_CHAPTERS } from './chapters/psalms';
import { CUSTOM_USER_CHAPTERS } from './chapters/customUserChapters';

// Base preloaded static chapters
const BASE_STATIC_CHAPTERS: Record<string, Record<number, ChapterData>> = {
  'Genesis': {
    1: GENESIS_1,
  },
  'Hebrews': {
    11: HEBREWS_11,
  },
  'John': {
    1: JOHN_1,
    2: JOHN_2,
    3: JOHN_3,
  },
  '2 Peter': {
    1: TWO_PETER_1,
  },
  'Psalms': PSALMS_CHAPTERS
};

// Combine base preloaded static chapters and user custom ones seamlessly
export const STATIC_CHAPTERS: Record<string, Record<number, ChapterData>> = {};

// Initialize STATIC_CHAPTERS with preloaded, then override/add user customs
const allBooks = new Set([...Object.keys(BASE_STATIC_CHAPTERS), ...Object.keys(CUSTOM_USER_CHAPTERS)]);
for (const book of allBooks) {
  STATIC_CHAPTERS[book] = {
    ...(BASE_STATIC_CHAPTERS[book] || {}),
    ...(CUSTOM_USER_CHAPTERS[book] || {})
  };
}
