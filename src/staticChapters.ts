import { ChapterData } from './types.js';
import { GENESIS_1 } from './chapters/genesis1.js';
import { HEBREWS_11 } from './chapters/hebrews11.js';
import { JOHN_1 } from './chapters/john1.js';
import { JOHN_2 } from './chapters/john2.js';
import { JOHN_3 } from './chapters/john3.js';
import { JOHN_6 } from './chapters/john6.js';
import { TWO_PETER_1 } from './chapters/twopeter1.js';
import { PSALMS_CHAPTERS } from './chapters/psalms.js';
import { CUSTOM_USER_CHAPTERS } from './chapters/customUserChapters.js';

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
    6: JOHN_6,
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
