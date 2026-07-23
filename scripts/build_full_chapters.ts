import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not defined in the environment or .env file.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Hardcoded BIBLE_BOOKS meta for standalone robustness if relative imports are weird
const BIBLE_BOOKS_META = [
  { name: 'Genesis', chapters: 50, testament: 'Old' },
  { name: 'Exodus', chapters: 40, testament: 'Old' },
  { name: 'Leviticus', chapters: 27, testament: 'Old' },
  { name: 'Numbers', chapters: 36, testament: 'Old' },
  { name: 'Deuteronomy', chapters: 34, testament: 'Old' },
  { name: 'Joshua', chapters: 24, testament: 'Old' },
  { name: 'Judges', chapters: 21, testament: 'Old' },
  { name: 'Ruth', chapters: 4, testament: 'Old' },
  { name: '1 Samuel', chapters: 31, testament: 'Old' },
  { name: '2 Samuel', chapters: 24, testament: 'Old' },
  { name: '1 Kings', chapters: 22, testament: 'Old' },
  { name: '2 Kings', chapters: 25, testament: 'Old' },
  { name: '1 Chronicles', chapters: 29, testament: 'Old' },
  { name: '2 Chronicles', chapters: 36, testament: 'Old' },
  { name: 'Ezra', chapters: 10, testament: 'Old' },
  { name: 'Nehemiah', chapters: 13, testament: 'Old' },
  { name: 'Esther', chapters: 10, testament: 'Old' },
  { name: 'Job', chapters: 42, testament: 'Old' },
  { name: 'Psalms', chapters: 150, testament: 'Old' },
  { name: 'Proverbs', chapters: 31, testament: 'Old' },
  { name: 'Ecclesiastes', chapters: 12, testament: 'Old' },
  { name: 'Song of Solomon', chapters: 8, testament: 'Old' },
  { name: 'Isaiah', chapters: 66, testament: 'Old' },
  { name: 'Jeremiah', chapters: 52, testament: 'Old' },
  { name: 'Lamentations', chapters: 5, testament: 'Old' },
  { name: 'Ezekiel', chapters: 48, testament: 'Old' },
  { name: 'Daniel', chapters: 12, testament: 'Old' },
  { name: 'Hosea', chapters: 14, testament: 'Old' },
  { name: 'Joel', chapters: 3, testament: 'Old' },
  { name: 'Amos', chapters: 9, testament: 'Old' },
  { name: 'Obadiah', chapters: 1, testament: 'Old' },
  { name: 'Jonah', chapters: 4, testament: 'Old' },
  { name: 'Micah', chapters: 7, testament: 'Old' },
  { name: 'Nahum', chapters: 3, testament: 'Old' },
  { name: 'Habakkuk', chapters: 3, testament: 'Old' },
  { name: 'Zechariah', chapters: 14, testament: 'Old' },
  { name: 'Zephaniah', chapters: 3, testament: 'Old' },
  { name: 'Haggai', chapters: 2, testament: 'Old' },
  { name: 'Malachi', chapters: 4, testament: 'Old' },
  { name: 'Matthew', chapters: 28, testament: 'New' },
  { name: 'Mark', chapters: 16, testament: 'New' },
  { name: 'Luke', chapters: 24, testament: 'New' },
  { name: 'John', chapters: 21, testament: 'New' },
  { name: 'Acts', chapters: 28, testament: 'New' },
  { name: 'Romans', chapters: 16, testament: 'New' },
  { name: '1 Corinthians', chapters: 16, testament: 'New' },
  { name: '2 Corinthians', chapters: 13, testament: 'New' },
  { name: 'Galatians', chapters: 6, testament: 'New' },
  { name: 'Ephesians', chapters: 6, testament: 'New' },
  { name: 'Philippians', chapters: 4, testament: 'New' },
  { name: 'Colossians', chapters: 4, testament: 'New' },
  { name: '1 Thessalonians', chapters: 5, testament: 'New' },
  { name: '2 Thessalonians', chapters: 3, testament: 'New' },
  { name: '1 Timothy', chapters: 6, testament: 'New' },
  { name: '2 Timothy', chapters: 4, testament: 'New' },
  { name: 'Titus', chapters: 3, testament: 'New' },
  { name: 'Philemon', chapters: 1, testament: 'New' },
  { name: 'Hebrews', chapters: 13, testament: 'New' },
  { name: 'James', chapters: 5, testament: 'New' },
  { name: '1 Peter', chapters: 5, testament: 'New' },
  { name: '2 Peter', chapters: 3, testament: 'New' },
  { name: '1 John', chapters: 5, testament: 'New' },
  { name: '2 John', chapters: 1, testament: 'New' },
  { name: '3 John', chapters: 1, testament: 'New' },
  { name: 'Jude', chapters: 1, testament: 'New' },
  { name: 'Revelation', chapters: 22, testament: 'New' }
];

interface BibleApiVerse {
  verse: number;
  text: string;
}

interface BibleApiResult {
  verses: BibleApiVerse[];
}

const VERSE_SCHEMA = {
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
          word: { type: Type.STRING, description: 'The English word in the verse, e.g. "beginning" or "grace"' },
          originalValue: { type: Type.STRING, description: 'Original manuscript term with transliteration, e.g. "Logos (λόγος)" or "Chesed (חֶסֶד)"' },
          language: { type: Type.STRING, enum: ['Greek', 'Hebrew', 'Aramaic', 'Other'] },
          explanation: { type: Type.STRING, description: 'Extremely simple non-native-friendly meaning and theological application' },
        },
        required: ['word', 'originalValue', 'language', 'explanation']
      }
    }
  },
  required: ['verseNumber', 'kjvText', 'bsbText', 'contemporary', 'nonNativeEnglish', 'specialWords']
};

const CHAPTER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    book: { type: Type.STRING },
    chapter: { type: Type.INTEGER },
    verses: {
      type: Type.ARRAY,
      items: VERSE_SCHEMA
    }
  },
  required: ['book', 'chapter', 'verses']
};

async function fetchFromBibleApi(book: string, chapter: number, translation: string): Promise<BibleApiVerse[]> {
  const urlBook = encodeURIComponent(book.toLowerCase());
  const url = `https://bible-api.com/${urlBook}+${chapter}?translation=${translation}`;
  console.log(`[HTTP GET] ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${book} ${chapter} (${translation}) from Bible API: ${res.statusText}`);
  }
  const data = await res.json() as BibleApiResult;
  return data.verses;
}

async function queryGeminiWithAutoRetry(book: string, chapter: number, prompt: string, attempt = 1): Promise<any> {
  const maxAttempts = 6;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite academic Bible translator, linguistic professor, and theologian. You construct perfect side-by-side verse alignments in valid JSON structure matching the required schema.',
        responseMimeType: 'application/json',
        responseSchema: CHAPTER_SCHEMA,
      }
    });
    return response;
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
    
    if (isRateLimit && attempt < maxAttempts) {
      let sleepMs = 15000;
      const match = errorMsg.match(/retry in ([\d\.]+)s/i);
      if (match && match[1]) {
        sleepMs = (parseFloat(match[1]) + 2) * 1000;
      }
      
      console.warn(`[RATE LIMIT MATCHED] Quota exceeded. Sleeping for ${(sleepMs/1000).toFixed(1)}s (Attempt ${attempt}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, sleepMs));
      return queryGeminiWithAutoRetry(book, chapter, prompt, attempt + 1);
    }
    
    throw err;
  }
}

async function processChapter(book: string, chapter: number, isOldTestament: boolean, filename: string, varName: string) {
  console.log(`\n======================================`);
  console.log(`🚀 PROCESSING ${book.toUpperCase()} CHAPTER ${chapter}`);
  console.log(`======================================`);

  // 1. Fetch from bible-api
  const kjvVerses = await fetchFromBibleApi(book, chapter, 'kjv');
  const webVerses = await fetchFromBibleApi(book, chapter, 'web');

  // Align verses
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

  console.log(`Successfully aligned ${alignedInput.length} verses from Bible API.`);

  // 2. Query Gemini to enrich translations and special words using PRISTINE rules
  const lang = isOldTestament ? 'Hebrew' : 'Greek';
  
  const ruleAddition = `
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
We have fetched the 100% accurate, real Biblical verses for "${book}" Chapter ${chapter}. 
Below is the aligned verse list containing KJV and BSB texts.

Your task is to:
1. Retain the provided "kjvText" and "bsbText" perfectly.
2. Generate "contemporary": This is the "Plain English Translation" based on Stage 2 of our Cognitive Workflow. The objective is Clarity and Accessibility for someone who uses English as a second language or who finds traditional religious language a barrier. You must strictly follow the four Bridge rules:
   - Rule 1 (Vocabulary Simplification): Remove "Archaic" words (like thou, thy, hither, manifold) and "Theological Jargon" (like propitiation, justification, or sanctification). Replace them with active, everyday verbs (e.g., instead of "Contend, O Lord," use "Fight my enemies, Lord").
   - Rule 2 (Sentence Structure): Break long, winding sentences into Short, Direct Statements with one clear idea per sentence.
   - Rule 3 (Removing Cultural Idioms): Avoid English figures of speech that don't translate well. Look for the literal intent of the verse.
   - Rule 4 (Maintaining Sacredness): While the language is "Plain," the tone remains respectful. It is simple, but not "cheap."
   Narrative Goal: The reader must understand exactly what happened or what was said without needing a dictionary.
3. Generate "nonNativeEnglish": This is the "Personalised Modern Version" based on Stage 3 of our Cognitive Workflow. Follow the CRITICAL PERSONALIZATION RULES carefully to create a first-person interactive prayer response. ${ruleAddition}

Here is the aligned scripture input:
${JSON.stringify(alignedInput, null, 2)}

IMPORTANT: Return the filled JSON containing ALL ${alignedInput.length} verses consecutively. Do NOT cut, skip, or truncate any verse. Every single verse in the input list must have its corresponding full object in the "verses" array.`;

  console.log(`[AI REQUEST] Sending ${alignedInput.length} verses to Gemini with rate-limit retrier...`);
  
  const response = await queryGeminiWithAutoRetry(book, chapter, prompt);

  if (!response.text) {
    throw new Error(`Empty response from Gemini API for ${book} ${chapter}`);
  }

  const parsedResult = JSON.parse(response.text);
  console.log(`[AI OK] Received ${parsedResult.verses.length} verses from Gemini.`);

  // Double check integrity
  const missingVerses = [];
  for (let i = 1; i <= alignedInput.length; i++) {
    if (!parsedResult.verses.some((v: any) => v.verseNumber === i)) {
      missingVerses.push(i);
    }
  }

  if (missingVerses.length > 0) {
    throw new Error(`Integrity Failure! Missing verses in AI output: ${missingVerses.join(', ')}`);
  }

  // Wrap inside ChapterData
  const chapterData = {
    book: book,
    chapter: chapter,
    verses: parsedResult.verses,
    isHighFidelity: true
  };

  const destDir = path.join(process.cwd(), 'src', 'chapters');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destPath = path.join(destDir, filename);
  const tsContent = `import { ChapterData } from '../types';

export const ${varName}: ChapterData = ${JSON.stringify(chapterData, null, 2)};
`;

  fs.writeFileSync(destPath, tsContent, 'utf-8');
  console.log(`[FILE WRITTEN] Wrote complete ${book} ${chapter} to ${destPath}`);
}

// Consolidates files dynamically from src/chapters and generates src/staticChapters.ts
function consolidateStaticChapters() {
  console.log('\n🌟 DYNAMICALLY SUMMONING AND CONSOLIDATING STATIC BIBLE CHAPTER MODULES...');
  
  const destDir = path.join(process.cwd(), 'src', 'chapters');
  if (!fs.existsSync(destDir)) {
    console.error(`Chapters directory missing at ${destDir}!`);
    return;
  }

  const files = fs.readdirSync(destDir).filter(f => f.endsWith('.ts') && f !== 'psalms.ts');
  const imports: string[] = [];
  const mappings: Record<string, Record<number, string>> = {};

  for (const file of files) {
    try {
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
    } catch (err: any) {
      console.warn(`Could not parse module ${file}: `, err.message || err);
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

  // Create typescript code
  const staticChaptersContent = `import { ChapterData } from './types';
${imports.sort().join('\n')}
import { PSALMS_CHAPTERS } from './chapters/psalms';

export const STATIC_CHAPTERS: Record<string, Record<number, ChapterData>> = {
${mapString}  'Psalms': PSALMS_CHAPTERS
};
`;

  const targetStaticFile = path.join(process.cwd(), 'src', 'staticChapters.ts');
  fs.writeFileSync(targetStaticFile, staticChaptersContent, 'utf-8');
  console.log(`[ENTRYPOINT DEPLOYED] Automatically reconciled and re-grouped Chapters inside ${targetStaticFile}!`);
}

async function run() {
  // Parse simple inputs
  const args = process.argv.slice(2);
  let requestedBook: string | null = null;
  let requestedChapters: number[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      requestedBook = args[i + 1];
    }
    if (args[i] === '--chapters' && args[i + 1]) {
      const parts = args[i + 1].split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        for (let c = start; c <= end; c++) {
          requestedChapters.push(c);
        }
      } else {
        requestedChapters = args[i + 1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      }
    }
  }

  const targets: Array<{ book: string; chapter: number; isOldTestament: boolean; filename: string; varName: string }> = [];

  if (requestedBook) {
    const matchedBook = BIBLE_BOOKS_META.find(b => b.name.toLowerCase() === requestedBook!.toLowerCase());
    if (!matchedBook) {
      console.error(`Error: Book "${requestedBook}" is not listed in canonical metadata.`);
      process.exit(1);
    }
    
    const chaptersToProcess = requestedChapters.length > 0 ? requestedChapters : Array.from({ length: matchedBook.chapters }, (_, i) => i + 1);
    const isOT = matchedBook.testament === 'Old';

    for (const ch of chaptersToProcess) {
      if (ch < 1 || ch > matchedBook.chapters) {
        console.warn(`Chapter ${ch} is outside the range for ${matchedBook.name} (1-${matchedBook.chapters}). Skipping.`);
        continue;
      }
      
      const fileSafeName = matchedBook.name.replace(/\s+/g, '').toLowerCase() + ch;
      const varSafeName = matchedBook.name.replace(/\s+/g, '_').toUpperCase() + '_' + ch;
      targets.push({
        book: matchedBook.name,
        chapter: ch,
        isOldTestament: isOT,
        filename: `${fileSafeName}.ts`,
        varName: varSafeName
      });
    }
  } else {
    // Default Fallback matching original presets
    targets.push(
      { book: 'Genesis', chapter: 1, isOldTestament: true, filename: 'genesis1.ts', varName: 'GENESIS_1' },
      { book: 'John', chapter: 1, isOldTestament: false, filename: 'john1.ts', varName: 'JOHN_1' },
      { book: 'John', chapter: 2, isOldTestament: false, filename: 'john2.ts', varName: 'JOHN_2' },
      { book: 'John', chapter: 3, isOldTestament: false, filename: 'john3.ts', varName: 'JOHN_3' }
    );
  }

  console.log(`Starting alignment compilation for ${targets.length} target chapters...`);

  for (const target of targets) {
    try {
      await processChapter(target.book, target.chapter, target.isOldTestament, target.filename, target.varName);
      // Wait to protect API rate limit
      console.log('Sleeping 4 seconds before next operation to be rate-safe...');
      await new Promise((resolve) => setTimeout(resolve, 4000));
    } catch (err: any) {
      console.error(`Error while building target ${target.book} Chapter ${target.chapter}:`, err.message || err);
      process.exit(1);
    }
  }

  // Consolidate static chapters automatically
  consolidateStaticChapters();

  console.log('\n🌟 COMPLETED ALL BIBLE BUILDER TASKS SUCCESSFULLY!');
}

run();
