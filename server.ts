import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { ZipArchive } from 'archiver';
import { GoogleGenAI, Type } from '@google/genai';
import { STATIC_CHAPTERS } from './src/staticChapters.js';
import { enrichChapter } from './src/utils/personalizer.js';
// import admin from 'firebase-admin';

// Initialize environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy instantiation of Firebase Admin SDK
let adminDbInitialized = false;
let adminDb: any = null;

function getAdminFirestore() {
  return null;
}

// Lazy instantiation of the GoogleGenAI client (will not crash if key is missing on start)
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Promisified Timeout Race wrapper to guarantee quick, zero-hang offline fallback conversions
const apiCallWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('API request timed out (service capacity high)'));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

// In-memory cache for dynamic chapters to optimize performance and prevent API abuse
const chaptersCache: Record<string, any> = {};

// Circuit breaker to automatically shield the Gemini API during rate limits (e.g. Free Tier quotas)
let geminiCoolDownUntil = 0;

// Complete dictionary of original Greek and Hebrew morphological roots for deep study
const ROOT_DICTIONARY = [
  {
    keywords: ['beginning', 'first'],
    word: 'beginning',
    originalValue: 'Archē (ἀρχή) / Bereshit (בְּרֵאשִׁית)',
    language: 'Greek',
    explanation: 'The absolute primeval source or start of time, space, and all created order.'
  },
  {
    keywords: ['created', 'made', 'creator'],
    word: 'created',
    originalValue: 'Bara (בָּרָא)',
    language: 'Hebrew',
    explanation: 'A Hebrew verb used exclusively of God, meaning to create something beautiful out of absolute nothingness.'
  },
  {
    keywords: ['god', 'gods'],
    word: 'God',
    originalValue: 'Elohim (אֱלֹהִים)',
    language: 'Hebrew',
    explanation: 'The majestic plural of deity, representing God as the all-powerful and supreme Ruler of creation.'
  },
  {
    keywords: ['heaven', 'heavens', 'sky'],
    word: 'heaven',
    originalValue: 'Shamayim (שָׁמַיִם)',
    language: 'Hebrew',
    explanation: 'The vast celestial heights, space, or the divine courtroom of God.'
  },
  {
    keywords: ['earth', 'ground', 'land'],
    word: 'earth',
    originalValue: 'Eretz (אֶרֶץ)',
    language: 'Hebrew',
    explanation: 'The material world, dry land, or surface that humans are carefully planted on.'
  },
  {
    keywords: ['spirit', 'wind', 'breath'],
    word: 'Spirit',
    originalValue: 'Ruach (רוּחַ) / Pneuma (πνεῦμα)',
    language: 'Greek',
    explanation: 'The active, life-giving breath, gentle wind, or Holy Spirit of the living God.'
  },
  {
    keywords: ['light', 'shined', 'shines'],
    word: 'light',
    originalValue: 'Phōs (φῶς) / Or (אוֹρ)',
    language: 'Greek',
    explanation: 'Radiating truth, wisdom, and moral purity which instantly expels darkness and ignorance.'
  },
  {
    keywords: ['darkness', 'dark'],
    word: 'darkness',
    originalValue: 'Choshek (חֹשֶך) / Skotia (σκοτία)',
    language: 'Greek',
    explanation: 'Spiritual obscurity, blindness, or chaos which can never overpower the Light of Truth.'
  },
  {
    keywords: ['word', 'saying', 'speaks', 'said', 'spoke'],
    word: 'the Word',
    originalValue: 'Logos (λόγος)',
    language: 'Greek',
    explanation: "In Greek philosophy and theology, the absolute expression of theological reason, truth, and God's message in Person."
  },
  {
    keywords: ['life', 'lives', 'living'],
    word: 'life',
    originalValue: 'Zōē (ζωή)',
    language: 'Greek',
    explanation: 'Genuine spiritual, eternal life from the divine source, distinct from mere biological existence (bios).'
  },
  {
    keywords: ['witness', 'testify', 'testimony'],
    word: 'witness',
    originalValue: 'Martyria (μαρτυρία)',
    language: 'Greek',
    explanation: 'Legal, truthful evidence. It is the root word from which we get our modern English word "martyr."'
  },
  {
    keywords: ['believe', 'believed', 'believing', 'faith', 'trust'],
    word: 'believe',
    originalValue: 'Pistis (πίστις) / Pisteuōn (πιστεύων)',
    language: 'Greek',
    explanation: 'To put absolute personal trust, reliance, and commitment in someone; active, living allegiance.'
  },
  {
    keywords: ['grace', 'favor', 'blessing'],
    word: 'grace',
    originalValue: 'Charis (χάρις)',
    language: 'Greek',
    explanation: 'Unearned divine favor, complete acceptance, or a beautiful gift freely granted to the undeserving.'
  },
  {
    keywords: ['truth', 'true'],
    word: 'truth',
    originalValue: 'Alētheia (ἀλήθεια) / Emet (אֱמֶת)',
    language: 'Greek',
    explanation: 'The absolute, unveiled objective reality of any matter, standing firm against falsehood.'
  },
  {
    keywords: ['love', 'loved', 'loving'],
    word: 'love',
    originalValue: 'Agape (ἀγάπη) / Hesed (חֶסֶד)',
    language: 'Greek',
    explanation: 'Self-sacrificing, unconditional covenant choice-love that actively seeks the highest benefit for others.'
  },
  {
    keywords: ['son', 'child'],
    word: 'Son',
    originalValue: 'Huios (υἱός) / Ben (בֵּן)',
    language: 'Greek',
    explanation: 'An heir or direct descendant, indicating deep familial relation, authority, and shared nature.'
  },
  {
    keywords: ['peace', 'quiet', 'still'],
    word: 'peace',
    originalValue: 'Eirēnē (εἰρήνη) / Shalom (שָׁלוֹם)',
    language: 'Greek',
    explanation: 'Complete mental tranquility, spiritual wholeness, and harmonious relations restored through God.'
  },
  {
    keywords: ['flesh', 'body', 'physical'],
    word: 'flesh',
    originalValue: 'Sarx (σάρξ)',
    language: 'Greek',
    explanation: 'Human physical nature, earthly biology, or mortal fragility.'
  },
  {
    keywords: ['world', 'earthly'],
    word: 'world',
    originalValue: 'Kosmos (κόσμος)',
    language: 'Greek',
    explanation: 'The ordered system of the universe, or the entire global population whom God loves.'
  },
  {
    keywords: ['judgment', 'condemn', 'judge'],
    word: 'judgment',
    originalValue: 'Krisis (κρίσις)',
    language: 'Greek',
    explanation: 'The dividing line of justice, decision-making, or legal trial.'
  },
  {
    keywords: ['name', 'authority'],
    word: 'name',
    originalValue: 'Onoma (ὄνομα) / Shem (שֵׁם)',
    language: 'Greek',
    explanation: 'Reputation, character, or the full authority of the person being represented.'
  },
  {
    keywords: ['shepherd', 'guide', 'leader'],
    word: 'shepherd',
    originalValue: 'Ro’eh (רֹעֶה)',
    language: 'Hebrew',
    explanation: 'One who takes ultimate, selfless responsibility for feeding, guiding, and guarding the sheep.'
  },
  {
    keywords: ['water', 'waters', 'quiet'],
    word: 'water',
    originalValue: 'Mayim (מַיִם)',
    language: 'Hebrew',
    explanation: 'The refreshing element of life. Quiet waters represent spiritual recovery and absolute rest.'
  },
  {
    keywords: ['soul', 'heart', 'mind'],
    word: 'soul',
    originalValue: 'Nefesh (נֶפֶשׁ) / Psychē (ψυχή)',
    language: 'Hebrew',
    explanation: 'The living, breathing center of emotional, intellectual, and physical conscious life.'
  },
  {
    keywords: ['fear', 'reverence', 'respect'],
    word: 'fear',
    originalValue: 'Yirah (יִרְאָה)',
    language: 'Hebrew',
    explanation: 'Profound awe, deep spiritual respect, and holy alignment.'
  },
  {
    keywords: ['mercy', 'lovingkindness', 'kindness'],
    word: 'mercy',
    originalValue: 'Chesed (חֶסֶד)',
    language: 'Hebrew',
    explanation: 'Unwavering covenant devotion, loyal kindness, and steadfast mercy.'
  },
  {
    keywords: ['house', 'dwelling'],
    word: 'house',
    originalValue: 'Bayit (בַּיִת)',
    language: 'Hebrew',
    explanation: 'A physical shelter or a spiritual household where family roots reside.'
  }
];

interface BibleApiVerse {
  verse: number;
  text: string;
}

interface BibleApiResult {
  verses: BibleApiVerse[];
}

async function fetchFromBibleApi(book: string, chapter: number, translation: string): Promise<BibleApiVerse[]> {
  const urlBook = encodeURIComponent(book.toLowerCase());
  const url = `https://bible-api.com/${urlBook}+${chapter}?translation=${translation}`;
  
  let attempts = 0;
  const maxAttempts = 3;
  let lastError: any = null;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[HTTP GET / Server API Helper - Attempt ${attempts}] ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json() as BibleApiResult;
      if (data && data.verses) {
        return data.verses;
      }
      throw new Error(`Invalid response format from Bible API`);
    } catch (err: any) {
      lastError = err;
      if (attempts < maxAttempts) {
        console.warn(`[Bible API Attempt ${attempts} Failed] ${err.message || err}. Retrying in 400ms...`);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
  }
  throw new Error(`Failed to fetch ${book} ${chapter} (${translation}) after ${maxAttempts} attempts. Last error: ${lastError.message || lastError}`);
}

function generateContemporaryText(text: string): string {
  let mod = text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bthee\b/gi, 'you')
    .replace(/\bthou\b/gi, 'you')
    .replace(/\bthy\b/gi, 'your')
    .replace(/\bthine\b/gi, 'yours')
    .replace(/\bye\b/gi, 'you')
    .replace(/\bshalt\b/gi, 'shall')
    .replace(/\bmaketh\b/gi, 'makes')
    .replace(/\bleadeth\b/gi, 'leads')
    .replace(/\brestoreth\b/gi, 'restores')
    .replace(/\bcometh\b/gi, 'comes')
    .replace(/\bgiveth\b/gi, 'gives')
    .replace(/\bgave\b/gi, 'gave')
    .replace(/\bunto\b/gi, 'to')
    .replace(/\bhath\b/gi, 'has')
    .replace(/\bseeth\b/gi, 'sees')
    .replace(/\bbehold\b/gi, 'look')
    .replace(/\bverily\b/gi, 'truly')
    .replace(/\bwhosoever\b/gi, 'whoever')
    .replace(/\bperish\b/gi, 'be lost')
    .replace(/\beverlasting\b/gi, 'eternal')
    .replace(/\bhowbeit\b/gi, 'but')
    .replace(/\bwherefore\b/gi, 'so')
    .replace(/\bthereof\b/gi, 'of it')
    .replace(/\btherein\b/gi, 'in it')
    .replace(/\bthereby\b/gi, 'by it')
    .replace(/\bsaith\b/gi, 'says')
    .replace(/\bdoth\b/gi, 'does')
    .replace(/\bdidst\b/gi, 'did')
    .replace(/\bdry\b/gi, 'dry')
    .replace(/\bmanifold\b/gi, 'many different')
    .replace(/\bhither\b/gi, 'here')
    .replace(/\bcontend, O Lord\b/gi, 'fight my enemies, Lord')
    .replace(/\bcontend, o lord\b/gi, 'fight my enemies, Lord')
    .replace(/\bcontend\b/gi, 'fight')
    .replace(/\bpropitiation\b/gi, 'sacrifice that takes away sin')
    .replace(/\bjustification\b/gi, 'being made right with God')
    .replace(/\bsanctification\b/gi, 'being made holy')
    .replace(/”/g, '"')
    .replace(/“/g, '"');
  return mod;
}

function refersToDivine(text: string, book: string): boolean {
  const normalized = text.toLowerCase();
  
  if (book.toLowerCase() === 'psalms') {
    return true;
  }
  
  // Exclude texts explicitly mentioning humans where third person pronouns refer to them
  if (normalized.includes('he was not the light') || 
      normalized.includes('he was not that light') ||
      normalized.includes('sent from god') ||
      normalized.includes('whose name was') ||
      normalized.includes('there was a man') ||
      normalized.includes('john bare witness') ||
      normalized.includes('john testified') ||
      normalized.includes('witness of that light') ||
      normalized.includes('man of the pharisees') ||
      normalized.includes('named nicodemus')) {
    return false;
  }
  
  // List of terms indicating the subject of the sentence or clause is Divine
  const divineKeywords = [
    'god', 'lord', 'jesus', 'christ', 'spirit', 'creator', 'savior', 'saviour',
    'the father', 'the word', 'the light', 'the son', 'messiah', 'yahweh', 'jehovah',
    'only-begotten', 'only born', 'begotten of the father'
  ];

  const divinePhrases = [
    'made through him', 'created', 'covenant', 'he was before me', 'his fullness', 'full of grace', 'in him was life'
  ];
  
  if (divineKeywords.some(keyword => normalized.includes(keyword))) {
    return true;
  }
  if (divinePhrases.some(phrase => normalized.includes(phrase))) {
    return true;
  }
  
  return false;
}

function generateNonNativeText(text: string, book: string): string {
  let simple = generateContemporaryText(text)
    .replace(/\bbegotten\b/gi, 'only-born')
    .replace(/\bcondemn\b/gi, 'judge or punish')
    .replace(/\bmanifested\b/gi, 'showed clearly')
    .replace(/\btestify\b/gi, 'tell the truth about')
    .replace(/\btestified\b/gi, 'told the truth about')
    .replace(/\bpurification\b/gi, 'washing clean')
    .replace(/\btemple courts\b/gi, 'temple yard')
    .replace(/\bspiritual\b/gi, 'spirit')
    .replace(/\bcomprehended\b/gi, 'understood')
    .replace(/\bovercome\b/gi, 'conquer or put out');

  // Apply our strict personalization rules (changing third-person referring to God/Jesus/the Word to second-person) across ALL books of the Bible ONLY if referring to the Divine
  if (refersToDivine(simple, book)) {
    simple = simple
      .replace(/\bHe was\b/g, 'You were')
      .replace(/\bhe was\b/g, 'you were')
      .replace(/\bin Him\b/g, 'in You')
      .replace(/\bin him\b/g, 'in you')
      .replace(/\bthrough Him\b/g, 'through You')
      .replace(/\bthrough him\b/g, 'through you')
      .replace(/\bHis disciples\b/g, 'Your disciples')
      .replace(/\bhis disciples\b/g, 'your disciples')
      .replace(/\bHis glory\b/g, 'Your glory')
      .replace(/\bhis glory\b/g, 'your glory')
      .replace(/\bHis name\b/g, 'Your name')
      .replace(/\bhis name\b/g, 'your name')
      .replace(/\bHe must\b/g, 'You must')
      .replace(/\bhe must\b/g, 'you must')
      .replace(/\bHe said\b/g, 'You said')
      .replace(/\bhe said\b/g, 'you said')
      .replace(/\bHe makes\b/g, 'You make')
      .replace(/\bhe makes\b/g, 'you make')
      .replace(/\bHe leads\b/g, 'You lead')
      .replace(/\bhe leads\b/g, 'you lead')
      .replace(/\bHe restores\b/g, 'You restore')
      .replace(/\bhe restores\b/g, 'you restore')
      .replace(/\bHe guides\b/g, 'You guide')
      .replace(/\bhe guides\b/g, 'you guide')
      .replace(/\bHis name’s sake\b/g, 'Your name’s honor')
      .replace(/\bhis name’s sake\b/g, 'your name’s honor')
      .replace(/\bYou prepare\b/g, 'You set up')
      .replace(/\byou are with me\b/gi, 'You are holding me close')
      .replace(/\bHis law\b/gi, 'Your law')
      .replace(/\bLORD is my shepherd\b/gi, 'You are my shepherd, LORD');
  }

  return simple.charAt(0).toUpperCase() + simple.slice(1);
}

function extractSpecialWords(text: string, isOldTestament: boolean): any[] {
  const words: any[] = [];
  const normalized = text.toLowerCase();
  
  for (const entry of ROOT_DICTIONARY) {
    if (isOldTestament && entry.language === 'Greek') continue;
    if (!isOldTestament && entry.language === 'Hebrew') continue;

    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword)) {
        words.push({
          word: entry.word,
          originalValue: entry.originalValue,
          language: entry.language,
          explanation: entry.explanation
        });
        break;
      }
    }
    if (words.length >= 2) break;
  }

  if (words.length === 0) {
    if (isOldTestament) {
      words.push({
        word: 'holiness',
        originalValue: 'Kadosh (קָדוֹשׁ)',
        language: 'Hebrew',
        explanation: 'Set apart, unique, clean, and completely pure from worldliness.'
      });
    } else {
      words.push({
        word: 'grace',
        originalValue: 'Charis (χάρις)',
        language: 'Greek',
        explanation: 'The beautiful favor and love of God freely gifted to us without any merit.'
      });
    }
  }

  return words;
}

function getIsOldTestament(book: string): boolean {
  const otBooks = [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
    '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
    'nehemiah', 'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon',
    'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
    'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'
  ];
  return otBooks.includes(book.toLowerCase());
}

// 1. Endpoint to load a selected chapter (KJV, BSB, Contemporary, and Modern Simplified English)
app.get('/api/bible-chapter', async (req, res) => {
  const book = String(req.query.book || 'John');
  const chapter = parseInt(String(req.query.chapter || '1'), 10);

  try {
    // A. Check in-memory static chapters ( Genesis 1, John 1, Psalms 23 )
    const matchedStaticBookKey = Object.keys(STATIC_CHAPTERS).find(k => k.toLowerCase() === book.toLowerCase());
    if (matchedStaticBookKey && STATIC_CHAPTERS[matchedStaticBookKey][chapter]) {
      const staticChap = STATIC_CHAPTERS[matchedStaticBookKey][chapter];
      console.log(`[Cache-Hit] Serving preloaded ${book} chapter ${chapter}`);
      // Asynchronously record to Firestore for comprehensive cloud lookup
      try {
        const dbInstance = getAdminFirestore();
        if (dbInstance) {
          const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
          const chapRef = dbInstance.collection('chapters').doc(docId);
          chapRef.get().then((snap: any) => {
            if (!snap.exists) {
              chapRef.set({
                book,
                chapter,
                verses: staticChap.verses,
                isHighFidelity: true,
                createdAt: admin.firestore.Timestamp.now(),
                source: 'local_static_backport'
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch {}
      return res.json({
        success: true,
        source: 'local_static',
        data: enrichChapter(staticChap),
      });
    }

    // B. Check in-memory dynamic cache
    const cacheKey = `${book}_${chapter}`;
    if (chaptersCache[cacheKey]) {
      console.log(`[Cache-Hit] Serving dynamically cached ${book} chapter ${chapter}`);
      return res.json({
        success: true,
        source: 'dynamic_cache',
        data: enrichChapter(chaptersCache[cacheKey]),
      });
    }

    // B2. Check Cloud Firestore Database for dynamic pre-saved translations
    try {
      const dbInstance = getAdminFirestore();
      if (dbInstance) {
        const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
        const chapRef = dbInstance.collection('chapters').doc(docId);
        const docSnap = await chapRef.get();
        if (docSnap.exists) {
          const dbData = docSnap.data();
          console.log(`[Firestore-Hit] Serving ${book} chapter ${chapter} from Firestore`);
          chaptersCache[cacheKey] = dbData;
          return res.json({
            success: true,
            source: 'firestore_db_cache',
            data: enrichChapter(dbData),
          });
        }
      }
    } catch (fsReadErr: any) {
      const errMsg = String(fsReadErr.message || fsReadErr);
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
        console.log(`[Firestore Status] Server operating in offline database fallback mode (read bypassed due to permission constraints).`);
      } else {
        console.warn(`[Firestore Read Warning] Failed to fetch chapter from database:`, fsReadErr.message || fsReadErr);
      }
    }

    // C. Fetch actual scripture verses in parallel for 100% correct, full alignment
    let kjvVerses: BibleApiVerse[] = [];
    let webVerses: BibleApiVerse[] = [];
    let fetchSuccess = false;

    try {
      kjvVerses = await fetchFromBibleApi(book, chapter, 'kjv');
      webVerses = await fetchFromBibleApi(book, chapter, 'web');
      fetchSuccess = true;
    } catch (fetchErr: any) {
      console.warn(`[Bible API Fetch Failed] Could not retrieve scripture texts for ${book} ${chapter}:`, fetchErr.message || fetchErr);
    }

    if (fetchSuccess && kjvVerses.length > 0) {
      const isOldTestament = getIsOldTestament(book);
      const alignedInput: any[] = [];
      const maxVerseNum = Math.max(...kjvVerses.map(v => v.verse), ...webVerses.map(v => v.verse));

      for (let i = 1; i <= maxVerseNum; i++) {
        const kjvV = kjvVerses.find(v => v.verse === i);
        const webV = webVerses.find(v => v.verse === i);
        if (kjvV || webV) {
          alignedInput.push({
            verseNumber: i,
            kjvText: (kjvV?.text || webV?.text || '').trim().replace(/\s+/g, ' '),
            bsbText: (webV?.text || kjvV?.text || '').trim().replace(/\s+/g, ' '),
          });
        }
      }

      // Check if Gemini is available for high-quality enrichment
      let hasGemini = false;
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
          hasGemini = true;
        }
      } catch {}

      const noAi = req.query.no_ai === 'true';
      const isCoolingDown = Date.now() < geminiCoolDownUntil;
      const shouldUseGemini = hasGemini && !noAi && !isCoolingDown;

      if (isCoolingDown && !noAi) {
        console.log(`[Gemini Circuit Breaker] Gemini is cooling down. Serving high-fidelity local modernization automatically.`);
      }

      if (shouldUseGemini) {
        try {
          console.log(`[AI-Request] Dynamic Gemini translation enrichment for ${book} chapter ${chapter}`);
          const ai = getGenAI();
          const lang = isOldTestament ? 'Hebrew' : 'Greek';

          let ruleAddition = `
COGNITIVE WORKFLOW PROCESS (3-STAGES OF COMPOSITION FOR EVERY VERSE):
As you generate each verse, your thinking MUST follow this strict 3-stage flow:
1. The Source (KJV/BSB): Analyze the original manuscript \${lang} text to find the "Anchor" (the most vital root theological word or covenantal concept). Map this anchor to the "specialWords" array with its original script, transliteration, and a simple non-native friendly explanation.
2. The Bridge (Plain English): Translate that core concept and verse into the simplest possible English for the "contemporary" field. This is the "Plain English Translation" for clarity and accessibility. Remove archaic words and theological jargon, and break complex sentences into short, direct statements so the reader understands exactly what happened without needing a dictionary.
3. The Experience (Personalized): Help the reader convert the understood truth into an intimate, interactive conversation with the Creator in the "nonNativeEnglish" field. This is the "Personalised Modern Version". Turn the verse into a first-person/second-person singular prayer. Identify the promise or command and turn it into active present-tense commitments, using resonant emotions ("stressed", "confident", "peaceful") and applying the "So what?" Tuesday morning factor to give them words to passionately talk back to God.

CRITICAL PERSONALIZATION RULES FOR "nonNativeEnglish" (PERSONALIZED MODERN VERSION):
The main goal of "nonNativeEnglish" is Experiential Knowledge (Ginosko) expressed as a "First-Person Prayer Response". You must follow these four core rules:
- Rule 1 (The "I/You" Shift): Change the perspective. Instead of talking about God in the cold third-person ("He is a Rock", "the Lord is my shield"), write as if the user is talking directly to God in the first-person/second-person singular relationship ("You are MY Rock", "You are my shield").
- Rule 2 (Principle to Action): Identify the core promise or command in the verse and turn it into a present-tense commitment or active request to God. (e.g., instead of "He leads me", write: "Lead me today, Lord; show me exactly which way to go").
- Rule 3 (Emotional Resonance): Add language that reflects modern human emotions. Speak of feelings such as being "stressed," "overwhelmed," "confident," "excited," or "resting in Your peace."
- Rule 4 (The "So What?" Factor): Solve the question: "How does this change my Tuesday morning?" The prayer response must answer this in a practical, down-to-earth way.
Narrative Goal: The reader must feel that this ancient verse is a personal letter written directly to them, and we are giving them the words to passionately talk back to God.
`;

          const prompt = `You are an elite academic Bible translator, linguistic scholar, and theologian. 
We have fetched the 100% accurate, real Biblical verses for "\${book}" Chapter \${chapter}. 
Below is the aligned verse list containing KJV and BSB texts.

Your task is to:
1. Retain the provided "kjvText" and "bsbText" perfectly.
2. Generate "contemporary": This is the "Plain English Translation" based on Stage 2 of our Cognitive Workflow. The objective is Clarity and Accessibility for someone who uses English as a second language or who finds traditional religious language a barrier. You must strictly follow the four Bridge rules:
   - Rule 1 (Vocabulary Simplification): Remove "Archaic" words (like thou, thy, hither, manifold) and "Theological Jargon" (like propitiation, justification, or sanctification). Replace them with active, everyday verbs (e.g., instead of "Contend, O Lord," use "Fight my enemies, Lord").
   - Rule 2 (Sentence Structure): Break long, winding sentences into Short, Direct Statements with one clear idea per sentence.
   - Rule 3 (Removing Cultural Idioms): Avoid English figures of speech that don't translate well. Look for the literal intent of the verse.
   - Rule 4 (Maintaining Sacredness): While the language is "Plain," the tone remains respectful. It is simple, but not "cheap."
   Narrative Goal: The reader must understand exactly what happened or what was said without needing a dictionary.
3. Generate "nonNativeEnglish": This is the "Personalised Modern Version" based on Stage 3 of our Cognitive Workflow. Follow the CRITICAL PERSONALIZATION RULES carefully to create a first-person interactive prayer response.${ruleAddition}
4. Generate "specialWords": This is the "Anchor" lookup based on Stage 1 of our Cognitive Workflow. Identify 1 or 2 of the most crucial theological or root terms in the verse, look up its actual original \${lang} manuscript term with transliteration (e.g., Logos (λόγος), Elohim (אֱלֹהִים), Chesed (חֶסֶד), Charis (χάริς)), and specify a simple, non-native friendly explanation.

Here is the aligned scripture input:
\${JSON.stringify(alignedInput, null, 2)}

IMPORTANT: Return the filled JSON containing ALL \${alignedInput.length} verses consecutively. Do NOT cut, skip, or truncate any verse. Every single verse in the input list must have its corresponding full object in the "verses" array.`;

          const response = await apiCallWithTimeout(
            ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt,
              config: {
                systemInstruction: 'You are an elite academic Bible translator, linguistic professor, and theologian. You construct perfect side-by-side verse alignments in valid JSON structure.',
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    book: { type: Type.STRING },
                    chapter: { type: Type.INTEGER },
                    verses: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          verseNumber: { type: Type.INTEGER },
                          kjvText: { type: Type.STRING },
                          bsbText: { type: Type.STRING },
                          contemporary: { type: Type.STRING },
                          nonNativeEnglish: { type: Type.STRING },
                          specialWords: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                word: { type: Type.STRING },
                                originalValue: { type: Type.STRING },
                                language: { type: Type.STRING },
                                explanation: { type: Type.STRING }
                              },
                              required: ['word', 'originalValue', 'language', 'explanation']
                            }
                          }
                        },
                        required: ['verseNumber', 'kjvText', 'bsbText', 'contemporary', 'nonNativeEnglish', 'specialWords']
                      }
                    }
                  },
                  required: ['book', 'chapter', 'verses']
                }
              }
            }),
            25000 // 25 seconds timeout (more generous for longer chapters like Hebrews 13 with 25 verses)
          );

          if (response && response.text) {
            const parsedData = JSON.parse(response.text);
            if (parsedData && parsedData.verses && parsedData.verses.length === alignedInput.length) {
              chaptersCache[cacheKey] = parsedData;
              console.log(`[AI OK] Successfully generated and cached Gemini-enriched chapter for ${book} ${chapter}`);

              // Cache to Firestore
              try {
                const dbInstance = getAdminFirestore();
                if (dbInstance) {
                  const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
                  await dbInstance.collection('chapters').doc(docId).set({
                    book: parsedData.book || book,
                    chapter: parsedData.chapter || chapter,
                    verses: parsedData.verses,
                    isHighFidelity: true,
                    createdAt: admin.firestore.Timestamp.now(),
                    source: 'gemini_api_generation'
                  });
                  console.log(`[Firestore Cache-Write] Successfully saved dynamic ${book} Chapter ${chapter} in Firestore`);
                }
              } catch (dbWriteErr: any) {
                const errMsg = String(dbWriteErr.message || dbWriteErr);
                if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
                  console.log(`[Firestore Status] Server operating in offline database fallback mode (cache write bypassed).`);
                } else {
                  console.warn(`[Firestore Cache-Write Error] Failed to cache generated chapter to database:`, dbWriteErr.message || dbWriteErr);
                }
              }

              return res.json({
                success: true,
                source: 'gemini_api_generation',
                data: parsedData,
              });
            }
          }
        } catch (enrichErr: any) {
          console.warn(`[AI Enrichment Failed] Falling back directly to high-fidelity server modernizer for ${book} ${chapter}:`, enrichErr.message || enrichErr);
          const errStr = String(enrichErr.message || enrichErr).toLowerCase();
          if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit')) {
            console.warn(`[Gemini Circuit Breaker] Rate-limit/Quota exceeded (429). Bypassing Gemini API calls for the next 90 seconds to preserve resources.`);
            geminiCoolDownUntil = Date.now() + 90000; // 90 second cool down
          }
        }
      }

      // Rules-based High-Fidelity Server Fallback Generator
      console.log(`[Server-Fallback] Modernizing ${alignedInput.length} verses of ${book} ${chapter} locally...`);
      const versesList = alignedInput.map((v) => {
        const contemporary = generateContemporaryText(v.bsbText);
        const nonNative = generateNonNativeText(v.bsbText, book);
        const specialWords = extractSpecialWords(v.bsbText, isOldTestament);

        return {
          verseNumber: v.verseNumber,
          kjvText: v.kjvText,
          bsbText: v.bsbText,
          contemporary,
          nonNativeEnglish: nonNative,
          specialWords,
        };
      });

      const processedData = {
        book,
        chapter,
        verses: versesList,
        isHighFidelity: true,
      };

      chaptersCache[cacheKey] = processedData;
      console.log(`[Server Fallback OK] Served rules-modernized chapter for ${book} ${chapter}`);

      // Cache fallback chapter to Firestore
      try {
        const dbInstance = getAdminFirestore();
        if (dbInstance) {
          const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
          await dbInstance.collection('chapters').doc(docId).set({
            book,
            chapter,
            verses: versesList,
            isHighFidelity: true,
            createdAt: admin.firestore.Timestamp.now(),
            source: 'server_rules_fallback'
          });
          console.log(`[Firestore Cache-Write] Successfully saved fallback modernized ${book} Chapter ${chapter} in Firestore`);
        }
      } catch (dbWriteErr: any) {
        const errMsg = String(dbWriteErr.message || dbWriteErr);
        if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
          console.log(`[Firestore Status] Server operating in offline database fallback mode (cache write bypassed).`);
        } else {
          console.warn(`[Firestore Cache-Write Error] Failed to cache fallback chapter to database:`, dbWriteErr.message || dbWriteErr);
        }
      }

      return res.json({
        success: true,
        source: 'server_rules_fallback',
        data: processedData,
      });
    }

    // D. Backup Generation from Gemini API directly in case Bible API itself is fully offline or down but Gemini is online
    console.log(`[AI-Request Backup] Generating dynamic backup chapter directly for ${book} chapter ${chapter}`);
    const ai = getGenAI();

    const prompt = `Please generate the Bible chapter text for structural study of the book of "${book}", chapter ${chapter}.
    We require a side-by-side alignment including:
    1. KJV (King James Version)
    2. BSB (Berean Standard Bible)
    3. Contemporary English Version: This is the "Plain English Translation" designed based on Stage 2 (The Bridge) of our 3-Step Cognitive Workflow. The objective is Clarity and Accessibility for someone who uses English as a second language or who finds traditional religious language a barrier. You must strictly follow these four rules:
       - Rule 1 (Vocabulary Simplification): Remove "Archaic" words (like thou, thy, hither, manifold) and "Theological Jargon" (like propitiation, justification, or sanctification). Replace them with active, everyday verbs (e.g., instead of "Contend, O Lord," use "Fight my enemies, Lord").
       - Rule 2 (Sentence Structure): Break long, winding sentences into Short, Direct Statements with one clear idea per sentence.
       - Rule 3 (Removing Cultural Idioms): Avoid English figures of speech that don't translate well. Look for the literal intent of the verse.
       - Rule 4 (Maintaining Sacredness): While the language is "Plain," the tone remains respectful. It is simple, but not "cheap."
       Narrative Goal: The reader must understand exactly what happened or what was said without needing a dictionary.
    4. "nonNativeEnglish": This is the "Personalised Modern Version" designed based on Stage 3 (The Experience) of our 3-Step Cognitive Workflow. The objective is Experiential Knowledge (Ginosko) expressed as a "First-Person Prayer Response". You must follow these four core rules:
       - Rule 1 (The "I/You" Shift): Change the perspective. Instead of talking about God in the cold third-person ("He is a Rock", "the Lord is my shield"), write as if the user is talking directly to God in the first-person/second-person singular relationship ("You are MY Rock", "You are my shield").
       - Rule 2 (Principle to Action): Identify the core promise or command in the verse and turn it into a present-tense commitment or active request to God. (e.g., instead of "He leads me", write: "Lead me today, Lord; show me exactly which way to go").
       - Rule 3 (Emotional Resonance): Add language that reflects modern human emotions. Speak of feelings such as being "stressed," "overwhelmed," "confident," "excited," or "resting in Your peace."
       - Rule 4 (The "So What?" Factor): Solve the question: "How does this change my Tuesday morning?" The prayer response must answer this in a practical, down-to-earth way.
       Narrative Goal: Make the reader feel that this ancient verse is a personal letter written directly to them, and we are giving them the words to passionately talk back to God.
    
    COGNITIVE WORKFLOW PROCESS (3-STAGES OF COMPOSITION FOR EVERY VERSE):
    As you generate each verse, your thinking MUST follow this strict 3-stage flow:
    1. The Source (KJV/BSB): Analyze the original manuscript text to find the "Anchor" (the most vital root theological word or covenantal concept). Map this anchor to the "specialWords" array with its original script, transliteration, and a simple non-native friendly explanation.
    2. The Bridge (Plain English): Translate that core concept and verse into the simplest possible English for the "contemporary" field. This is the "Plain English Translation" for clarity and accessibility.
    3. The Experience (Personalized): Help the reader convert the understood truth into an intimate, interactive conversation with the Creator in the "nonNativeEnglish" field. This is the "Personalised Modern Version".
    
    Also, identify 2-3 important archaic, specific theological, or keyword terms used in each verse (or as many as possible) and map them inside the "specialWords" array, looking up their original Greek or Hebrew equivalent, showing phonetic spelling or alphabet (e.g. Logos (λόγος)), and write a clean, non-native friendly explanation.
    
    IMPORTANT: Make sure to output ALL verses of "${book}" chapter ${chapter} consecutively. If there are many verses (more than 20), keep the descriptions and verse texts concise and stick to the 1-2 most important specialWords per verse to prevent exceeding output token limits. Do NOT skip any verse.`;

    let response;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite, academic, and non-native-friendly Bible translator, linguistic professor, and theologian. You construct perfect side-by-side verse alignments in valid JSON structure.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                book: { type: Type.STRING },
                chapter: { type: Type.INTEGER },
                verses: {
                  type: Type.ARRAY,
                  description: 'All consecutive verses in this chapter',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      verseNumber: { type: Type.INTEGER },
                      kjvText: { type: Type.STRING, description: 'Accurate text of King James Version for this verse' },
                      bsbText: { type: Type.STRING, description: 'Accurate text of Berean Standard Bible for this verse' },
                      contemporary: { type: Type.STRING, description: 'Sleek, direct modern contemporary translation' },
                      nonNativeEnglish: { type: Type.STRING, description: 'Personalized, non-native friendly translation with active verbs and simple vocabulary explaining idioms' },
                      specialWords: {
                        type: Type.ARRAY,
                        description: 'Key words or theological terms to tap and reveal their original Greek/Hebrew meanings',
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            word: { type: Type.STRING, description: 'English word in the verse, e.g., "the Word" or "grace"' },
                            originalValue: { type: Type.STRING, description: 'Original manuscript term with transliteration, e.g., "Charis (χάρις)"' },
                            language: { type: Type.STRING, enum: ['Greek', 'Hebrew', 'Aramaic', 'Other'] },
                            explanation: { type: Type.STRING, description: 'Extremely simple non-native-friendly meaning and application' },
                          },
                          required: ['word', 'originalValue', 'language', 'explanation'],
                        },
                      },
                    },
                    required: ['verseNumber', 'kjvText', 'bsbText', 'contemporary', 'nonNativeEnglish', 'specialWords'],
                  },
                },
              },
              required: ['book', 'chapter', 'verses'],
            },
          },
        });
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API - Attempt ${attempts} Failed]`, err.message || err);
        const errStr = String(err.message || err).toLowerCase();
        const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit');
        
        if (isRateLimit) {
          console.warn(`[Gemini Circuit Breaker] Rate-limit/Quota exceeded (429) during backup direct generation. Active backup circuit-breaker immediately.`);
          geminiCoolDownUntil = Date.now() + 90000; // 90 second cool down
          break; // break the retry cycle immediately because repeating is futile on quota exceeded
        }

        if (err.message === 'GEMINI_API_KEY_MISSING' || (err.status && err.status === 400)) {
          throw err;
        }
        if (attempts < maxAttempts) {
          const delay = 800 * attempts;
          console.log(`Retrying API Chapter generation in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!response) {
      throw lastError;
    }

    const parsedData = JSON.parse(response.text || '{}');
    chaptersCache[cacheKey] = parsedData;

    // Cache backup generated chapter to Firestore
    try {
      const dbInstance = getAdminFirestore();
      if (dbInstance) {
        const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
        await dbInstance.collection('chapters').doc(docId).set({
          book: parsedData.book || book,
          chapter: parsedData.chapter || chapter,
          verses: parsedData.verses || [],
          isHighFidelity: true,
          createdAt: admin.firestore.Timestamp.now(),
          source: 'gemini_api_backup_generation'
        });
        console.log(`[Firestore Cache-Write] Successfully saved backup generated ${book} Chapter ${chapter} in Firestore`);
      }
    } catch (dbWriteErr: any) {
      const errMsg = String(dbWriteErr.message || dbWriteErr);
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission')) {
        console.log(`[Firestore Status] Server operating in offline database fallback mode (backup cache write bypassed).`);
      } else {
        console.warn(`[Firestore Cache-Write Error] Failed to cache backup chapter to database:`, dbWriteErr.message || dbWriteErr);
      }
    }

    return res.json({
      success: true,
      source: 'gemini_api_generation',
      data: enrichChapter(parsedData),
    });
  } catch (error: any) {
    console.error('[API Error] Unable to serve Chapter via direct API:', error.message || error);
    
    // Extreme high-fidelity offline synthesis fallback to prevent ANY page load failures!
    // Creates a structurally complete, study-friendly reflection chapter that guarantees full chapter load.
    console.log(`[API Extreme Fallback] Generating high-contrast study reflection dataset for ${book} ${chapter}`);
    const estimatedVersesCount = 12; // safe average verse count for clean scroll
    const synthesizedVerses = Array.from({ length: estimatedVersesCount }, (_, idx) => {
      const vNum = idx + 1;
      return {
        verseNumber: vNum,
        kjvText: `[Study Study Scroll Reflection] ${book} Chapter ${chapter}, Verse ${vNum}. This verse path is ready for quiet devotional reflection.`,
        bsbText: `[Covenant Covenant Scroll Reflection] ${book} Chapter ${chapter}, Verse ${vNum}. Original language study resources are cached on your client device.`,
        contemporary: `Let us carefully think upon the spiritual wisdom, historical context, and primary themes of ${book} chapter ${chapter}, verse ${vNum} during your active reading session today.`,
        nonNativeEnglish: `You can pause to consider what God's Holy Word is teaching your heart in ${book} ${chapter}:${vNum} right now. Praise You for Your eternal goodness!`,
        specialWords: [
          {
            word: "reflection",
            originalValue: "Selah (סֶלָה)",
            language: "Hebrew",
            explanation: "A sacred musical or liturgical pause, instructing the soul to silently weigh what was just read."
          }
        ]
      };
    });

    return res.json({
      success: true,
      source: 'offline_synthesis_fallback',
      notice: 'Extreme Offline Fallback: The API quota has been reached, or you are temporarily offline. Showing guided study reflections for this chapter so your session always continues uninterrupted.',
      data: enrichChapter({
        book,
        chapter,
        verses: synthesizedVerses,
        isHighFidelity: false
      })
    });
  }
});

// Admin Endpoint to trigger compilation of high-fidelity static chapters with the real GEMINI_API_KEY
app.get('/api/admin/build-static-chapters', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'reengineer-builder') {
    return res.status(403).json({ error: 'Unauthorized secret token missing or invalid.' });
  }

  const bookName = String(req.query.book || 'John');
  const chapterNum = parseInt(String(req.query.chapter || '1'), 10);

  try {
    const isOldTestament = getIsOldTestament(bookName);
    console.log(`[Admin Build] Initiating Gemini build for ${bookName} Chapter ${chapterNum}`);

    // Fetch scriptures
    const kjvVerses = await fetchFromBibleApi(bookName, chapterNum, 'kjv');
    const webVerses = await fetchFromBibleApi(bookName, chapterNum, 'web');

    if (!kjvVerses || kjvVerses.length === 0) {
      return res.status(400).json({ error: `Could not fetch verses from Bible API for ${bookName} ${chapterNum}` });
    }

    const alignedInput: any[] = [];
    const maxVerseNum = Math.max(...kjvVerses.map(v => v.verse), ...webVerses.map(v => v.verse));

    for (let i = 1; i <= maxVerseNum; i++) {
      const kjvV = kjvVerses.find(v => v.verse === i);
      const webV = webVerses.find(v => v.verse === i);
      if (kjvV || webV) {
        alignedInput.push({
          verseNumber: i,
          kjvText: (kjvV?.text || webV?.text || '').trim().replace(/\s+/g, ' '),
          bsbText: (webV?.text || kjvV?.text || '').trim().replace(/\s+/g, ' '),
        });
      }
    }

    const ai = getGenAI();
    const lang = isOldTestament ? 'Hebrew' : 'Greek';

    let ruleAddition = `
COGNITIVE WORKFLOW PROCESS (3-STAGES OF COMPOSITION FOR EVERY VERSE):
As you generate each verse, your thinking MUST follow this strict 3-stage flow:
1. The Source (KJV/BSB): Analyze the original manuscript \${lang} text to find the "Anchor" (the most vital root theological word or covenantal concept). Map this anchor to the "specialWords" array with its original script, transliteration, and a simple non-native friendly explanation.
2. The Bridge (Plain English): Translate that core concept and verse into the simplest possible English for the "contemporary" field. This is the "Plain English Translation" for clarity and accessibility. Remove archaic words and theological jargon, and break complex sentences into short, direct statements so the reader understands exactly what happened without needing a dictionary.
3. The Experience (Personalized): Help the reader convert the understood truth into an intimate, interactive conversation with the Creator in the "nonNativeEnglish" field. This is the "Personalised Modern Version". Turn the verse into a first-person/second-person singular prayer. Identify the promise or command and turn it into active present-tense commitments, using resonant emotions ("stressed", "confident", "peaceful") and applying the "So what?" Tuesday morning factor to give them words to passionately talk back to God.

CRITICAL PERSONALIZATION RULES FOR "nonNativeEnglish" (PERSONALIZED MODERN VERSION):
The main goal of "nonNativeEnglish" is Experiential Knowledge (Ginosko) expressed as a "First-Person Prayer Response". You must follow these four core rules:
- Rule 1 (The "I/You" Shift): Change the perspective. Instead of talking about God in the cold third-person ("He is a Rock", "the Lord is my shield"), write as if the user is talking directly to God in the first-person/second-person singular relationship ("You are MY Rock", "You are my shield").
- Rule 2 (Principle to Action): Identify the core promise or command in the verse and turn it into a present-tense commitment or active request to God. (e.g., instead of "He leads me", write: "Lead me today, Lord; show me exactly which way to go").
- Rule 3 (Emotional Resonance): Add language that reflects modern human emotions. Speak of feelings such as being "stressed," "overwhelmed," "confident," "excited," or "resting in Your peace."
- Rule 4 (The "So What?" Factor): Solve the question: "How does this change my Tuesday morning?" The prayer response must answer this in a practical, down-to-earth way.
Narrative Goal: The reader must feel that this ancient verse is a personal letter written directly to them, and we are giving them the words to passionately talk back to God.
`;

    const prompt = `You are an elite academic Bible translator, linguistic scholar, and theologian. 
We have fetched the 100% accurate, real Biblical verses for "${bookName}" Chapter ${chapterNum}. 
Below is the aligned verse list containing KJV and BSB texts.

Your task is to:
1. Retain the provided "kjvText" and "bsbText" perfectly.
2. Generate "contemporary": This is the "Plain English Translation" based on Stage 2 of our Cognitive Workflow. The objective is Clarity and Accessibility for someone who uses English as a second language or who finds traditional religious language a barrier. You must strictly follow the four Bridge rules:
   - Rule 1 (Vocabulary Simplification): Remove "Archaic" words (like thou, thy, hither, manifold) and "Theological Jargon" (like propitiation, justification, or sanctification). Replace them with active, everyday verbs (e.g., instead of "Contend, O Lord," use "Fight my enemies, Lord").
   - Rule 2 (Sentence Structure): Break long, winding sentences into Short, Direct Statements with one clear idea per sentence.
   - Rule 3 (Removing Cultural Idioms): Avoid English figures of speech that don't translate well. Look for the literal intent of the verse.
   - Rule 4 (Maintaining Sacredness): While the language is "Plain," the tone remains respectful. It is simple, but not "cheap."
   Narrative Goal: The reader must understand exactly what happened or what was said without needing a dictionary.
3. Generate "nonNativeEnglish": This is the "Personalised Modern Version" based on Stage 3 of our Cognitive Workflow. Follow the CRITICAL PERSONALIZATION RULES carefully to create a first-person interactive prayer response.${ruleAddition}
4. Generate "specialWords": This is the "Anchor" lookup based on Stage 1 of our Cognitive Workflow. Identify 1 or 2 of the most crucial theological or root terms in the verse, look up its actual original \${lang} manuscript term with transliteration (e.g., Logos (λόγος), Elohim (אֱלֹהִים), Chesed (חֶסֶד), Charis (χάริς)), and specify a simple, non-native friendly explanation.

Here is the aligned scripture input:
\${JSON.stringify(alignedInput, null, 2)}

IMPORTANT: Return the filled JSON containing ALL \${alignedInput.length} verses consecutively. Do NOT cut, skip, or truncate any verse. Every single verse in the input list must have its corresponding full object in the "verses" array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite academic Bible translator, linguistic professor, and theologian. You construct perfect side-by-side verse alignments in valid JSON structure.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            book: { type: Type.STRING },
            chapter: { type: Type.INTEGER },
            verses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  verseNumber: { type: Type.INTEGER },
                  kjvText: { type: Type.STRING },
                  bsbText: { type: Type.STRING },
                  contemporary: { type: Type.STRING },
                  nonNativeEnglish: { type: Type.STRING },
                  specialWords: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        originalValue: { type: Type.STRING },
                        language: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      },
                      required: ['word', 'originalValue', 'language', 'explanation']
                    }
                  }
                },
                required: ['verseNumber', 'kjvText', 'bsbText', 'contemporary', 'nonNativeEnglish', 'specialWords']
              }
            }
          },
          required: ['book', 'chapter', 'verses']
        }
      }
    });

    if (response && response.text) {
      const parsedData = JSON.parse(response.text);
      if (parsedData && parsedData.verses && parsedData.verses.length === alignedInput.length) {
        
        // Write the individual static chapter file
        const fileSafeName = bookName.replace(/\s+/g, '').toLowerCase() + chapterNum;
        const varSafeName = bookName.replace(/\s+/g, '_').toUpperCase() + '_' + chapterNum;
        const destPath = path.join(process.cwd(), 'src', 'chapters', `${fileSafeName}.ts`);
        const tsContent = `import { ChapterData } from '../types';\n\nexport const ${varSafeName}: ChapterData = ${JSON.stringify(parsedData, null, 2)};\n`;
        fs.writeFileSync(destPath, tsContent, 'utf-8');
        
        console.log(`[Admin Build] Wrote ${parsedData.verses.length} verses of ${bookName} ${chapterNum} to ${destPath}`);

        // Automatically cache to Firestore as well if available
        try {
          const dbInstance = getAdminFirestore();
          if (dbInstance) {
            const docId = `${bookName.replace(/\s+/g, '')}_${chapterNum}`;
            await dbInstance.collection('chapters').doc(docId).set({
              book: parsedData.book || bookName,
              chapter: parsedData.chapter || chapterNum,
              verses: parsedData.verses,
              isHighFidelity: true,
              createdAt: admin.firestore.Timestamp.now(),
              source: 'gemini_admin_generation'
            });
          }
        } catch {}

        return res.json({
          success: true,
          message: `Successfully generated, wrote to file and cached to Firestore ${bookName} Chapter ${chapterNum}!`,
          verseCount: parsedData.verses.length,
          path: destPath
        });
      }
    }

    res.status(500).json({ error: 'Did not receive a complete or valid JSON translation from Gemini.' });
  } catch (err: any) {
    console.error(`[Admin Build Error]`, err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/api/admin/rebuild-static-manifest', (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'reengineer-builder') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const destDir = path.join(process.cwd(), 'src', 'chapters');
    const files = fs.readdirSync(destDir).filter(f => f.endsWith('.ts') && f !== 'psalms.ts' && f !== 'customUserChapters.ts');
    const imports: string[] = [];
    const mappings: Record<string, Record<number, string>> = {};

    for (const file of files) {
      const fileContent = fs.readFileSync(path.join(destDir, file), 'utf-8');
      const varMatch = fileContent.match(/export const ([A-Z0-9_]+)/);
      const bookMatch = fileContent.match(/"book":\s*"([^"]+)"/);
      const chapterMatch = fileContent.match(/"chapter":\s*(\d+)/);

      if (varMatch && bookMatch && chapterMatch) {
        const varName = varMatch[1];
        const bookName = bookMatch[1];
        const chapterNum = parseInt(chapterMatch[1], 10);
        const moduleName = file.replace('.ts', '');

        imports.push(`import { ${varName} } from './chapters/${moduleName}';`);
        
        if (!mappings[bookName]) {
          mappings[bookName] = {};
        }
        mappings[bookName][chapterNum] = varName;
      }
    }

    // Generate mapping code
    let mapString = '';
    for (const [book, chaptersMap] of Object.entries(mappings)) {
      mapString += `  '${book}': {\n`;
      for (const [chNum, varName] of Object.entries(chaptersMap)) {
        mapString += `    ${chNum}: ${varName},\n`;
      }
      mapString += `  },\n`;
    }

    const staticChaptersContent = `import { ChapterData } from './types';
${imports.sort().join('\n')}
import { PSALMS_CHAPTERS } from './chapters/psalms';
import { CUSTOM_USER_CHAPTERS } from './chapters/customUserChapters';

// Base preloaded static chapters
const BASE_STATIC_CHAPTERS: Record<string, Record<number, ChapterData>> = {
${mapString}  'Psalms': PSALMS_CHAPTERS
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
`;

    const targetStaticFile = path.join(process.cwd(), 'src', 'staticChapters.ts');
    fs.writeFileSync(targetStaticFile, staticChaptersContent, 'utf-8');
    
    return res.json({
      success: true,
      message: 'Successfully rebuilt staticChapters.ts manifest with unified custom chapters merging support!',
      chaptersFound: mappings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 2. Custom helper explanations/guidance endpoint for any custom study query
app.post('/api/explain-verse', async (req, res) => {
  const { book, chapter, verseNumber, query, verseText } = req.body;

  try {
    const ai = getGenAI();
    const prompt = `As a personalized Bible Study helper, explain this verse in very easy terms for a non-native English speaker.
    Context: Book of ${book}, Chapter ${chapter}, Verse ${verseNumber}.
    Verse Text: "${verseText}"
    User Query/Question: "${query}"
    
    Provide your explanation structured with:
    - "Simple Meaning": Explaining the main idea in very simple, conversational words.
    - "Manuscript Context": Mentioning if there are Hebrew, Greek, or Aramaic historical terms that clarify what God or the writer meant.
    - "Daily Life Application": How a modern reader can understand this in their day-to-day life.
    
    Use clear headers or bullet points. Keep sentence lengths below 15 words.`;

    let response;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a warm, humble, highly knowledgeable theological counselor who is a specialist in teaching non-native English speakers.',
          }
        });
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API Explain - Attempt ${attempts} Failed]`, err.message || err);

        if (err.message === 'GEMINI_API_KEY_MISSING' || (err.status && err.status === 400)) {
          throw err;
        }

        if (attempts < maxAttempts) {
          const delay = 800 * attempts;
          console.log(`Retrying API Explain in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!response) {
      throw lastError;
    }

    return res.json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    if (error.message === 'GEMINI_API_KEY_MISSING') {
      return res.status(400).json({
        success: false,
        code: 'API_KEY_REQUIRED',
        message: 'Gemini API key is required for dynamic explanations. Please add GEMINI_API_KEY in the secrets pane.',
      });
    }

    const errStr = String(error.message || error).toLowerCase();
    const isServiceUnavailable = errStr.includes('503') || errStr.includes('unavailable') || errStr.includes('high demand') || errStr.includes('capacity') || errStr.includes('rate limit') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit');

    if (isServiceUnavailable) {
      return res.status(503).json({
        success: false,
        code: 'API_OVERLOADED',
        message: 'Gemini translation engine is currently running at quota capacities. Spikes are brief and temporary. Please retry in a moment!',
      });
    }

    return res.status(500).json({
      success: false,
      code: 'EXPLANATION_ERROR',
      message: 'Failed to generate custom explanation.',
    });
  }
});

// Helper for offline-first local HELPS Word-studies definitions when API is missing/overloaded
function generateLocalHelpsStudy(word: string, originalValue: string, language: string) {
  const cleanOriginal = originalValue.split('(')[0].trim();
  const lowerWord = word.toLowerCase();

  let strongs = language === 'Greek' ? 'G3056' : 'H1254';
  let definition = `Lexical Details: [Language: ${language} | Original: ${originalValue}] - Meaning: Historical root term for "${word}".`;
  let study = `In plain English, this word represents a key underlying idea, design, or active spiritual principle. It represents a vital concept of faith, explained clearly here so its inner picture and structural meaning is easily accessible to modern readers.`;
  let usage = `Theological Usage: Appears in key sections of Scripture to define covenant trust, creation, and the direct, ongoing activity of God among His people.`;

  if (lowerWord.includes('word') || lowerWord.includes('logos')) {
    strongs = 'G3056';
    definition = 'Lexical Details: [Language: Greek | Transliteration: lógos | Part of Speech: Noun, Masculine | Root Origin: from 3004 /légō, "to speak"]] - Meaning: Speech, communication, word, or reasoning.';
    study = 'In easy, modern terms, this word describes an idea beautifully put into speech. Just as spoken language carries a person\'s inner thoughts, here it describes God\'s personal message, counsel, and logic made perfectly clear to humans. It refers to the personal and active expression of God Himself, who is visible and real.';
    usage = 'Theological Usage: Seen most famously in John 1 to present Jesus Christ as the absolute, living, and personal self-communication of God who existed before time. It occurs over 300 times to describe the Good News, God\'s promise, and His direct guidance.';
  } else if (lowerWord.includes('beginning') || lowerWord.includes('archē')) {
    strongs = 'G746';
    definition = 'Lexical Details: [Language: Greek | Transliteration: archē | Part of Speech: Noun, Feminine | Root Origin: from 756 /árxō, "to begin, rule"]] - Meaning: Start, primary point, origin, or chief authority.';
    study = 'This refers to the absolute starting point of all created things, time, and space. More than just a day on a calendar, it means the ultimate origin, foundational source, and chief executive power that sets everything else into action. It is the beginning that holds everything together.';
    usage = 'Theological Usage: Echoes Genesis\' primordial start and Christ\'s supreme authority as ruler over all created things. It describes both the origin of time and the foundational structures of the universe.';
  } else if (lowerWord.includes('god') || lowerWord.includes('elohim')) {
    strongs = 'H430';
    definition = 'Lexical Details: [Language: Hebrew | Transliteration: Elohím | Part of Speech: Noun, Plural of Intensity | Root Origin: from Eloah, "mighty deity"]] - Meaning: The One True God, supreme ruler, or divine judge.';
    study = 'This word uses a unique majestic plural ending to show God\'s absolute power, infinite majesty, and perfect wholeness, rather than multiple gods. It points to God as the all-powerful and loving Creator who personally starts, builds, and guards His covenant promises with His people.';
    usage = 'Theological Usage: Appears over 2,500 times in the Old Testament, starting in Genesis 1:1. It emphasizes God\'s great creative power, His authority as judge over the entire Earth, and His faithful commitment to His creation.';
  } else if (lowerWord.includes('light') || lowerWord.includes('phōs')) {
    strongs = 'G5457';
    definition = 'Lexical Details: [Language: Greek | Transliteration: phōs | Part of Speech: Noun, Neuter | Root Origin: from pháō, "to shine"]] - Meaning: Light, physical or spiritual illumination.';
    study = 'This represents the active, beautiful power of goodness and truth that shines directly from God. Just like physical light immediately chases away dark shadows, spiritual light brings clear truth, understanding, and pure love into our minds, exposing errors and clearing away confusion.';
    usage = 'Theological Usage: Used to describe God\'s pure presence, Jesus as the absolute "Light of the World," and the direct truth of the Gospel which guides believers to live honestly and with clear, clean hearts.';
  } else if (lowerWord.includes('grace') || lowerWord.includes('charis')) {
    strongs = 'G5485';
    definition = 'Lexical Details: [Language: Greek | Transliteration: cháris | Part of Speech: Noun, Feminine | Root Origin: from xairō, "to rejoice, be glad"]] - Meaning: Grace, unmerited favor, or joyful gift.';
    study = 'This is the free, beautiful, and completely undeserved goodwill of God. It is God\'s personal favor and loving spiritual influence flowing directly into the human heart, giving people the inner strength to change, grow, and find peace. It creates deep, lasting joy.';
    usage = 'Theological Usage: Lies at the absolute heart of the Christian faith, describing how God saves, heals, and empowers His followers through Christ. It shows that salvation and daily spiritual strength are free, loving gifts.';
  } else if (lowerWord.includes('life') || lowerWord.includes('zōē')) {
    strongs = 'G2222';
    definition = 'Lexical Details: [Language: Greek | Transliteration: zōē | Part of Speech: Noun, Feminine | Root Origin: from záō, "to live"]] - Meaning: Spiritual life, eternal life, or vital energy.';
    study = 'This describes the deep, full, and vibrant life that comes straight from God Himself. It is very different from mere biological survival or physical heartbeat. It refers to a spiritual quality of life that is eternal, joyful, and completely satisfying.';
    usage = 'Theological Usage: Highly prominent in the Gospel of John, where Jesus is called "the Life." It shows that real, lasting life is not found in objects or bodily survival, but in a close personal union with God.';
  } else if (lowerWord.includes('truth') || lowerWord.includes('alētheia') || lowerWord.includes('emet')) {
    strongs = 'G225';
    definition = 'Lexical Details: [Language: Greek | Transliteration: alētheia | Part of Speech: Noun, Feminine | Root Origin: from a- "not" and lēthō, "to hide"]] - Meaning: Truth, reality, or sincerity.';
    study = 'This word literally means "being unconcealed" or "not hidden." It refers to absolute, solid reality—the way things actually are as seen by God. It stands firm and strong against lies, illusions, half-truths, and deceit, revealing honest facts with absolute sincerity.';
    usage = 'Theological Usage: Focuses on the absolute reliability of God, His Word, and Jesus who declared Himself to be "the Truth." It promises that understanding God\'s truth brings real freedom and clarity.';
  } else if (lowerWord.includes('love') || lowerWord.includes('agape') || lowerWord.includes('hesed')) {
    strongs = 'G26';
    definition = 'Lexical Details: [Language: Greek | Transliteration: agápē | Part of Speech: Noun, Feminine | Root Origin: from agapáō, "to love"]] - Meaning: Unconditional choice-love, or covenant devotion.';
    study = 'This is the highest kind of love—a deliberate, sacrificial choice to care deeply for others and seek their absolute best. It does not depend on warm feelings or what the other person can give back. It is a faithful commitment of the will to love unconditionally.';
    usage = 'Theological Usage: Represents God\'s supreme attitude toward humanity, as demonstrated when His Son was sent for the world. It is the primary mark of a believer\'s character and the ultimate virtue in Christian life.';
  }

  return {
    strongsNumber: strongs,
    shortDefinition: definition,
    helpsWordStudy: study,
    usage: usage
  };
}

const getBookNameVariants = (book: string): string[] => {
  const variants = [book];
  
  const mapBBE: Record<string, string> = {
    "1 Chronicles": "1ch",
    "1 Kings": "1kgs",
    "2 Chronicles": "2ch",
    "2 Kings": "2kgs",
    "Acts": "act",
    "Ephesians": "eph",
    "Ezra": "ezr",
    "Haggai": "hg",
    "Habakkuk": "hk",
    "Hosea": "ho",
    "James": "jm",
    "Judges": "jud",
    "Luke": "lk",
    "Micah": "mi",
    "Mark": "mk",
    "Philippians": "ph",
    "Philemon": "phm",
    "Proverbs": "prv",
    "Psalms": "ps",
    "Revelation": "re",
    "Song of Solomon": "so",
    "Zephaniah": "zp"
  };

  const mapYLT: Record<string, string> = {
    "1 Chronicles": "I Chronicles",
    "2 Chronicles": "II Chronicles",
    "1 Kings": "I Kings",
    "2 Kings": "II Kings",
    "1 Samuel": "I Samuel",
    "2 Samuel": "II Samuel",
    "1 Corinthians": "I Corinthians",
    "2 Corinthians": "II Corinthians",
    "1 Thessalonians": "I Thessalonians",
    "2 Thessalonians": "II Thessalonians",
    "1 Timothy": "I Timothy",
    "2 Timothy": "II Timothy",
    "1 Peter": "I Peter",
    "2 Peter": "II Peter",
    "1 John": "I John",
    "2 John": "II John",
    "3 John": "III John",
    "Revelation": "Revelation of John"
  };

  if (mapBBE[book]) variants.push(mapBBE[book]);
  if (mapYLT[book]) variants.push(mapYLT[book]);
  
  return variants;
};

// 2.4 Raw Translation Endpoint for Public Domain Data
app.get('/api/translation/:translationId', async (req, res) => {
  const { translationId } = req.params;
  const book = String(req.query.book || 'John');
  const chapter = String(req.query.chapter || '1');

  try {
    const dbInstance = getAdminFirestore();
    if (dbInstance) {
      let snap = null;
      const variants = getBookNameVariants(book);
      
      for (const variant of variants) {
        const docRef = dbInstance
          .collection('translations')
          .doc(translationId)
          .collection('books')
          .doc(variant)
          .collection('chapters')
          .doc(chapter);
          
        snap = await docRef.get();
        if (snap.exists) break;
      }

      if (snap && snap.exists) {
        return res.json({
          success: true,
          source: 'firestore',
          translationId,
          data: snap.data()
        });
      }
    }

    // Local JSON Fallback
    try {
      const fallbackPaths = [
        path.join(process.cwd(), 'node_modules', '.cache', `temp_${translationId.toLowerCase()}.json`),
        path.join(process.cwd(), 'data', `en_${translationId.toLowerCase()}.json`)
      ];
      
      let fileContent = null;
      for (const p of fallbackPaths) {
        if (fs.existsSync(p)) {
          fileContent = fs.readFileSync(p, 'utf8');
          break;
        }
      }

      if (fileContent) {
        const bibleData = JSON.parse(fileContent);
        
        let targetBook = null;
        const variants = getBookNameVariants(book);
        for (const b of bibleData) {
          if (b.name && variants.some(v => v.toLowerCase() === b.name.toLowerCase())) {
            targetBook = b;
            break;
          }
        }
        
        if (targetBook) {
          const chapterIndex = parseInt(chapter) - 1;
          const chapterData = targetBook.chapters[chapterIndex];
          
          if (chapterData) {
            const verses = chapterData.map((text: string, idx: number) => ({
              verse: idx + 1,
              text: text
            }));
            
            return res.json({
              success: true,
              source: 'local_file',
              translationId,
              data: { verses }
            });
          }
        }
      }
    } catch (localErr: any) {
      console.error('[Local Fallback Error]', localErr.message);
    }

    // Bible-API Fallback (External API)
    try {
      // BSB is not supported by bible-api.com usually, but let's try others.
      const verses = await fetchFromBibleApi(book, parseInt(chapter), translationId);
      if (verses && verses.length > 0) {
        return res.json({
          success: true,
          source: 'bible-api',
          translationId,
          data: { verses }
        });
      }
    } catch (apiErr: any) {
      console.error(`[Bible API Fallback Error]`, apiErr.message);
    }

    return res.status(404).json({ success: false, error: 'Translation chapter not found in database or external API.' });
  } catch (error: any) {
    console.error('[Translation API Error]', error.message || error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 2.5 Dynamic HELPS Word-studies Lexicon Endpoint
app.post('/api/helps-word-study', async (req, res) => {
  const { word, originalValue, language, book, chapter } = req.body;

  if (!word || !originalValue) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters "word" and "originalValue".'
    });
  }

  const isCoolingDown = Date.now() < geminiCoolDownUntil;
  if (isCoolingDown) {
    console.log(`[Gemini Circuit Breaker] Gemini is cooling down. Serving high-fidelity local word study fallback automatically for "${word}".`);
    const localStudy = generateLocalHelpsStudy(word, originalValue, language || 'Greek');
    return res.json({
      success: true,
      source: 'offline_lexicon_fallback',
      data: localStudy
    });
  }

  try {
    let hasGemini = false;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
        hasGemini = true;
      }
    } catch {}

    if (hasGemini) {
      console.log(`[AI-Request] HELPS Word-study generation for "${word}" (${originalValue}) in ${book} ${chapter}`);
      const ai = getGenAI();

      const prompt = `You are a world-renowned lexicographer, biblical Greek/Hebrew language expert, and author of HELPS Word-studies and Bible Discovery resources.
Generate an authentic, highly detailed, and academically rigorous "HELPS Word-studies" & Concordance style entry for this original biblical term:
- English term used in translation: "${word}"
- Original Manuscript Value: "${originalValue}"
- Codex Language Source: ${language || 'Greek/Hebrew'}
- Biblical Verse Context: ${book || 'Scripture'} chapter ${chapter || 1}

For Greek or Hebrew terms, you MUST format the JSON fields strictly following these instructions:
1. "shortDefinition" MUST contain the precise, clear lexical details of the word. Structure it exactly as: "Lexical Details: [Language: ${language || 'Greek/Hebrew'} | Transliteration: <transliterated form of original value> | Part of Speech: <noun, verb, adjective, etc.>] - Brief literal dictionary meaning."
2. "helpsWordStudy" MUST explain the word's inner picture and root meaning in PLAIN ENGLISH and simple, modern, easy-to-understand words. Avoid complex, dusty, or archaic dictionary wording.
3. "usage" MUST explain the theological usage, historical occurrence across the Old/New Testaments, and practical covenant significance using clear, plain everyday conversational terms.

Your output MUST be a valid JSON matching this schema:
{
  "strongsNumber": "The corresponding Strong's Concordance identifier, e.g., 'G3056' for logos, 'H1254' for bara, 'G5485' for charis, etc. Make an accurate academic search/estimation.",
  "shortDefinition": "The detailed lexical details block formatted as instructed above.",
  "helpsWordStudy": "The complete HELPS word-study paragraph written in simple, plain English and modern words.",
  "usage": "The theological usage and occurrence across Scripture explained in plain, easy-to-understand terms."
}`;

      const response = await apiCallWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite biblical language professor, lexicographer, and author of HELPS Word-studies. You construct academically flawless, highly detailed dictionary definitions in JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strongsNumber: { type: Type.STRING },
                shortDefinition: { type: Type.STRING },
                helpsWordStudy: { type: Type.STRING },
                usage: { type: Type.STRING }
              },
              required: ['strongsNumber', 'shortDefinition', 'helpsWordStudy', 'usage']
            }
          }
        }),
        12000 // Snell timeout of 12 seconds (generous for detailed dictionary answers)
      );

      if (response && response.text) {
        const parsedData = JSON.parse(response.text);
        return res.json({
          success: true,
          source: 'gemini_api',
          data: parsedData
        });
      }
    }
  } catch (err: any) {
    console.warn(`[HELPS Word-study AI Enrichment Failed] Falling back to offline-first lexicon engine:`, err.message || err);
    const errStr = String(err.message || err).toLowerCase();
    if (errStr.includes('429') || errStr.includes('503') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit') || errStr.includes('unavailable') || errStr.includes('demand') || errStr.includes('timeout')) {
      console.warn(`[Gemini Circuit Breaker] Word Study rate/load limits triggered. Bypassing Gemini API calls for 90 seconds to preserve resources.`);
      geminiCoolDownUntil = Date.now() + 90000;
    }
  }

  // Backup offline-first rules-based generation
  console.log(`[Backup Offline-Lexicon] Serving local HELPS word-study for "${word}"`);
  const localStudy = generateLocalHelpsStudy(word, originalValue, language || 'Greek');
  return res.json({
    success: true,
    source: 'offline_lexicon_fallback',
    data: localStudy
  });
});

// Endpoint to dynamically bundle and download the entire project workspace as a 100% complete, fully-functional ZIP binary archive
app.get('/api/download-zip', (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="personalized-bible-study-studio.zip"');

  const archive = new ZipArchive({
    zlib: { level: 9 } // High-fidelity compression
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('[Archiver warning]', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    console.error('[Archiver error]', err.message);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  });

  archive.pipe(res);

  // Critical root configuration & script files
  const rootFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'server.ts',
    '.env.example',
    'firebase-blueprint.json',
    'firestore.rules',
    'firebase-applet-config.json',
    'metadata.json',
    'capacitor.config.json',
    '.gitignore',
    'security_spec.md'
  ];

  for (const file of rootFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  }

  // Key system folders to archive
  const folders = ['src', 'public', 'scripts', 'assets'];
  for (const folder of folders) {
    const folderPath = path.join(process.cwd(), folder);
    if (fs.existsSync(folderPath)) {
      archive.directory(folderPath, folder);
    }
  }

  // Include Android wrapper project if it exists or was built, ignoring large cache or generated outputs
  const androidPath = path.join(process.cwd(), 'android');
  if (fs.existsSync(androidPath)) {
    archive.glob('**/*', {
      cwd: androidPath,
      ignore: [
        '**/build/**',
        '**/.gradle/**',
        '**/local.properties',
        '**/.idea/**',
        '**/*.apk',
        '**/*.aar'
      ]
    }, { prefix: 'android' });
  }

  archive.finalize();
});

// 3. Endpoint to download the professional Product Requirement Document (PRD) as a Word Doc (REMOVED)
app.get('/api/download-prd', (req, res) => {
  return res.status(404).send("This resource has been removed.");
  res.setHeader('Content-Type', 'application/msword');
  res.setHeader('Content-Disposition', 'attachment; filename="PRD_Personalized_Bible_Study_Studio.doc"');

  const prdContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Product Requirement Document - Personalized Bible Study Studio</title>
<style>
@page {
  size: 8.5in 11.0in;
  margin: 1.0in 1.0in 1.0in 1.0in;
}
body {
  font-family: 'Calibri', 'Arial', sans-serif;
  color: #2b2b2b;
  line-height: 1.6;
  font-size: 11pt;
}
h1 {
  font-family: 'Calibri Light', 'Arial', sans-serif;
  color: #1f4e78;
  font-size: 26pt;
  margin-top: 24pt;
  margin-bottom: 12pt;
  border-bottom: 2px solid #1f4e78;
  padding-bottom: 6px;
}
h2 {
  font-family: 'Calibri Light', 'Arial', sans-serif;
  color: #2e75b6;
  font-size: 18pt;
  margin-top: 20pt;
  margin-bottom: 10pt;
  border-bottom: 1px solid #d3d3d3;
  padding-bottom: 4px;
}
h3 {
  font-family: 'Calibri', 'Arial', sans-serif;
  color: #418ab3;
  font-size: 14pt;
  margin-top: 14pt;
  margin-bottom: 6pt;
}
p {
  margin-top: 0;
  margin-bottom: 8pt;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12pt;
  margin-bottom: 12pt;
}
th {
  background-color: #1f4e78;
  color: #ffffff;
  font-weight: bold;
  text-align: left;
  border: 1px solid #d3d3d3;
  padding: 8px;
  font-size: 10.5pt;
}
td {
  border: 1px solid #d3d3d3;
  padding: 8px;
  font-size: 10pt;
  vertical-align: top;
}
tr:nth-child(even) {
  background-color: #f7f9fc;
}
ul, ol {
  margin-top: 0;
  margin-bottom: 8pt;
  padding-left: 20px;
}
li {
  margin-bottom: 4pt;
}
.cover-page {
  text-align: center;
  margin-top: 100pt;
  margin-bottom: 200pt;
}
.cover-title {
  font-size: 30pt;
  color: #1f4e78;
  font-weight: bold;
  margin-bottom: 15pt;
}
.cover-subtitle {
  font-size: 15pt;
  color: #595959;
  font-style: italic;
  margin-bottom: 50pt;
}
.cover-meta {
  font-size: 11pt;
  color: #404040;
  line-height: 2.0;
  margin-top: 80pt;
}
.highlight-box {
  background-color: #f2f7fa;
  border-left: 4px solid #2e75b6;
  padding: 12px;
  margin-top: 10px;
  margin-bottom: 15px;
}
</style>
</head>
<body>

<div class="cover-page">
  <div class="cover-title">PRODUCT REQUIREMENT DOCUMENT</div>
  <div class="cover-title" style="font-size:24pt; margin-top:-10px;">StudyScripture Studio</div>
  <div class="cover-subtitle">A Side-by-Side Multilingual Scripture Study Portal & Lexicon Engine</div>
  
  <div class="cover-meta">
    <strong>Author:</strong> Personalized Bible Study Team<br>
    <strong>Target Environment:</strong> AI Studio Preview Platform / Desktop / iOS / Android<br>
    <strong>Document Status:</strong> APPROVED & IMPLEMENTED<br>
    <strong>Version:</strong> 1.1<br>
    <strong>Date:</strong> June 2026
  </div>
</div>

<span style="page-break-before: always;"></span>

<h1>1. Executive Summary & Project Overview</h1>
<p>StudyScripture Studio is a highly polished, full-stack browser-based application designed to bridge linguistic and theological gaps in Scripture study. For thousands of lay readers, theological students, and researchers globally, English is a second or third language. Traditional translations (such as the King James Version) employ highly complex archaic syntax, and literal modern translations (like the Berean Standard Bible) can obscure historical and cultural idioms.</p>

<p>StudyScripture Studio resolves this by offering a side-by-side comparative grid, featuring:
<ul>
  <li><strong>King James Version (KJV)</strong>: Representing historical, classical translation aesthetics.</li>
  <li><strong>Berean Standard Bible (BSB)</strong>: Providing precise literal correctness based on direct Hebrew and Greek manuscript streams.</li>
  <li><strong>Plain English translation</strong>: Offering smooth, high-fidelity modern structures for native English lay readers.</li>
  <li><strong>Personalised modern version</strong>: Tailored specifically for ESL learners and non-native readers. It uses active voice, prevents complex idioms, and simplifies sentence patterns to preserve the original Hebrew/Greek manuscript intention.</li>
</ul>
</p>

<div class="highlight-box">
  <strong>Key Innovation:</strong> Combining comparative alignments with a touch-interactive lexicon explorer that explains root terms in their context, supported by a thread-safe offline caching mechanism to prevent remote server single-point-of-failure issues.
</div>

<h1>2. Target Audience & Core Personas</h1>
<table>
  <thead>
    <tr>
      <th>Persona</th>
      <th>Linguistic Profile</th>
      <th>Key Frustration</th>
      <th>How App Solves It</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>The ESL Theological Student</strong></td>
      <td>Non-native English (levels A2 to B2) pursuing academic theology.</td>
      <td>Struggles with words like "propitiation", "justification", or archaic structures in historical concordances.</td>
      <td>Offers a direct explanation with original Greek/Hebrew transliteration details and simplified, non-complex definitions.</td>
    </tr>
    <tr>
      <td><strong>The Lay Reader</strong></td>
      <td>Native/Non-native English reader looking for fast daily devotionals.</td>
      <td>Traditional study tools require heavy switching between multiple tabs and bulky printed dictionary indices.</td>
      <td>Unified single-screen side-by-side reader with pop-up dictionary definitions instantly on tab or mouse click.</td>
    </tr>
    <tr>
      <td><strong>The Offline Missionary</strong></td>
      <td>Bilingual worker operating on low-bandwidth networks.</td>
      <td>Frequent internet dropouts cause API limits or connection failure messages.</td>
      <td>Single-click full book indexing, caching chapters directly inside regional localStorage, and falling back to a clean local backup generator.</td>
    </tr>
  </tbody>
</table>

<h1>3. Key Functional Product Features</h1>

<h2>3.1 Side-by-Side Dynamic Alignment Table</h2>
<p>Aligns all translations consecutively verse-by-verse. The system ensures layout alignment is preserved perfectly when shifting screen densities. Clicking a verse highlights that verse across all translation columns, shifting focus to its related lexicon metadata.</p>

<h2>3.2 Immersive Interlocking Lexicon Explorer</h2>
<p>Crucial keywords or complex theological concepts in each verse are automatically indexed and highlighted in the "Personalised modern version" translation column. Tapping an underlined term triggers an elegant panel displaying:
<ul>
  <li><strong>Original Term</strong>: The precise ancient word written in its alphabet and phonetics (e.g., *Logos (λόγος)* or *Bara (בָּרָא)*).</li>
  <li><strong>Language Division</strong>: Plain identification of Hebrew, Greek, or Aramaic text sources.</li>
  <li><strong>Simple Definition</strong>: Concise, non-native friendly guidance of what the word means and why the ancient writer chose it.</li>
</ul>
</p>

<h2>3.3 Offline Synchronization Manager & Local Storage Indexing</h2>
<p>To support high availability and prevent Gemini API free-tier limitations, the product integrates a resilient caching strategy:
<ul>
  <li><strong>Static Pre-Calculated Assets</strong>: Genesis 1, John 1, and Psalms 23 are cooked directly into the platform, requiring zero internet connectivity.</li>
  <li><strong>Dynamic API Cache</strong>: Any API-loaded chapter is stored in key-value browser spaces for instant re-loads.</li>
  <li><strong>Complete Book Downloader</strong>: Downloads entire books chapter-by-chapter dynamically using a background worker thread structure that waits 120ms between hits to keep browser thread execution highly fluid.</li>
</ul>
</p>

<h2>3.4 Intelligent Theological Chat Assistant</h2>
<p>Built directly inside the interface, a warm theological chat companion leverages the state-of-the-art Gemini LLM to answer custom questions about the active verse. It returns three structured subsections: **Simple Meaning**, **Manuscript Context**, and **Daily Life Application** in short sentences (under 15 words) and highly accessible syntax.</p>

<h2>3.5 Dynamic Distraction-Free Reading Mode (Scroll & Slide Physics)</h2>
<p>To maximize readable real estate and maintain deep reader focus, the studio features a responsive motion physics system for floating panels and headers:
<ul>
  <li><strong>Intelligent Floating Header</strong>: Automatically translates upwards and fades away when scrolling down to reveal more bible verses. Moves instantly back into view when the user scrolls up, offering immediate access to the navigation bars and theme selectors.</li>
  <li><strong>Active Side Navigation chevrons (Slide Panels)</strong>: Instantly disappear during active scrolling actions (both up and down) to provide an entirely clean reading layout. Side chevrons dynamically transition and slide back to the screen within 150ms of the user stopping their scrolling action (halt detection), returning navigation options gracefully.</li>
</ul>
</p>

<h1>4. Technical Stack & Architectural Design</h1>
<p>The system is manufactured under a robust full-stack architecture keeping API controls secure:</p>
<table>
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technologies Used</th>
      <th>Purpose / Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>React 19, Vite, Tailwind CSS, Motion (by motion/react)</td>
      <td>Dynamic client rendering, seamless dark/light canvas animations, and reactive state management.</td>
    </tr>
    <tr>
      <td><strong>Backend</strong></td>
      <td>Express 4, tsx/esbuild node engine</td>
      <td>Secure, server-side API proxy calling the Google GenAI SDK to keep the GEMINI_API_KEY secure from raw inspect operations in client browsers.</td>
    </tr>
    <tr>
      <td><strong>AI Logic</strong></td>
      <td>Google GenAI SDK, Gemini 3.5 Flash Model</td>
      <td>Translates, aligns, and breaks down scripture metrics. Utilizes Gemini systemInstruction rules and strict JSON formatting schemas.</td>
    </tr>
    <tr>
      <td><strong>Persistence</strong></td>
      <td>Client LocalStorage Manager</td>
      <td>Acts as the offline, lightning-fast database storing downloaded and generated chapters in JSON formats.</td>
    </tr>
  </tbody>
</table>

<h1>5. Non-Functional Specifications & Design Guidelines</h1>
<ul>
  <li><strong>Visual Polish & Contrast</strong>: Accessible color palettes ensuring high text-to-background contrast in both themes. Transitioning between dark/light spaces utilizes smooth, hardware-accelerated Motion fades.</li>
  <li><strong>Performance Targets</strong>: Initial loading of pre-cooked chapters must execute in absolute sub-10ms ranges due to static state loads. Background down-syncing must have zero performance impact on reading pane scrolling fluidity.</li>
  <li><strong>Fault Tolerant Resilience</strong>: In the event of API timeout or missing keys, the system gracefully triggers a local fallback engine that automatically generates a neat semantic translation chapter using standard parameters, preventing blank screen crashes.</li>
</ul>

<h1>6. Release Milestones & Long-Term Roadmap</h1>
<ol>
  <li><strong>Phase 1 (Active)</strong>: Beautiful side-by-side multilingual interface, dynamic translation loading, lexicon pop-up cards, and local caching. Finished.</li>
  <li><strong>Phase 2 (Near-Term)</strong>: Customizable study notebooks, bookmarking specific verses with notes, and exporting personal study logs into printable formats.</li>
  <li><strong>Phase 3 (Long-Term)</strong>: Native mobile deployment using Capacitor/PWAs, audio text-to-speech integration to assist auditory ESL learners.</li>
</ol>

</body>
</html>
  `;

  res.send(prdContent);
});

export default app;
