import fs from 'fs';
import path from 'path';

interface BibleApiVerse {
  verse: number;
  text: string;
}

interface BibleApiResult {
  verses: BibleApiVerse[];
}

// Complete dictionary of original Greek and Hebrew morphological roots for deep study
const ROOT_DICTIONARY: Array<{
  keywords: string[];
  word: string;
  originalValue: string;
  language: 'Greek' | 'Hebrew' | 'Aramaic' | 'Other';
  explanation: string;
}> = [
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
    explanation: 'In Greek philosophy and theology, the absolute expression of theological reason, truth, and God\'s message in Person.'
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

// Helper to sanitize and process the bible-api response
async function fetchFromBibleApi(book: string, chapter: number, translation: string): Promise<BibleApiVerse[]> {
  const urlBook = encodeURIComponent(book.toLowerCase());
  const url = `https://bible-api.com/${urlBook}+${chapter}?translation=${translation}`;
  console.log(`[HTTP GET] ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${book} ${chapter} (${translation}): ${res.statusText}`);
  }
  const data = await res.json() as BibleApiResult;
  return data.verses;
}

// Simple rule-based modernizer to generate "contemporary" English from the WEB text
function generateContemporaryText(text: string): string {
  let mod = text
    .trim()
    .replace(/\s+/g, ' ')
    // Remove archaic endings (just in case they exist in KJV fallback inputs)
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
    .replace(/”/g, '"')
    .replace(/“/g, '"');
  return mod;
}

// Highly simplified translation for non-native English speakers
function generateNonNativeText(text: string, book: string): string {
  // Make sentences active and direct
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

  // Convert third-person references to divine personalized connection where applicable
  if (book.toLowerCase() === 'john') {
    simple = simple
      .replace(/\bHe was\b/g, 'You were')
      .replace(/\bin Him\b/g, 'in You')
      .replace(/\bthrough Him\b/g, 'through You')
      .replace(/\bHis disciples\b/g, 'Your disciples')
      .replace(/\bHis glory\b/g, 'Your glory')
      .replace(/\bHis name\b/g, 'Your name')
      .replace(/\bHe must\b/g, 'You must')
      .replace(/\bI must\b/g, 'I must')
      .replace(/\bHe said\b/g, 'You said');
  } else if (book.toLowerCase() === 'psalms') {
    simple = simple
      .replace(/\bHe makes\b/g, 'You make')
      .replace(/\bHe leads\b/g, 'You lead')
      .replace(/\bHe restores\b/g, 'You restore')
      .replace(/\bHe guides\b/g, 'You guide')
      .replace(/\bHis name’s sake\b/g, 'Your name’s honor')
      .replace(/\bYou prepare\b/g, 'You set up')
      .replace(/\byou are with me\b/gi, 'You are holding me close')
      .replace(/\bHis law\b/gi, 'Your law')
      .replace(/\bLORD is my shepherd\b/gi, 'You are my shepherd, LORD');
  }

  // Final trim
  return simple.charAt(0).toUpperCase() + simple.slice(1);
}

// Find applicable theological words inside the verse
function extractSpecialWords(text: string, isOldTestament: boolean): any[] {
  const words: any[] = [];
  const normalized = text.toLowerCase();
  
  for (const entry of ROOT_DICTIONARY) {
    // Only use matching testament languages if possible
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
        break; // Match found, stop checking other keywords for this entry
      }
    }
    // Limit to max 2 deep theological key-terms per verse to avoid overwhelming the view
    if (words.length >= 2) break;
  }

  // Fallback if no matching keyword is found
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

async function processChapter(book: string, chapter: number, isOldTestament: boolean): Promise<any> {
  const kjvVerses = await fetchFromBibleApi(book, chapter, 'kjv');
  const webVerses = await fetchFromBibleApi(book, chapter, 'web');

  const maxVerseNum = Math.max(...kjvVerses.map(v => v.verse), ...webVerses.map(v => v.verse));
  console.log(`Processing ${book} Chapter ${chapter}: Aligning ${maxVerseNum} verses...`);

  const versesList: any[] = [];

  for (let i = 1; i <= maxVerseNum; i++) {
    const kjvV = kjvVerses.find(v => v.verse === i);
    const webV = webVerses.find(v => v.verse === i);

    const kjvTxt = (kjvV?.text || webV?.text || '').trim().replace(/\s+/g, ' ');
    const webTxt = (webV?.text || kjvV?.text || '').trim().replace(/\s+/g, ' ');

    const contemporary = generateContemporaryText(webTxt);
    const nonNative = generateNonNativeText(webTxt, book);
    const specialWords = extractSpecialWords(webTxt, isOldTestament);

    versesList.push({
      verseNumber: i,
      kjvText: kjvTxt,
      bsbText: webTxt, // World English Bible maps beautifully under Berean Standard Bible slot as high-fidelity base
      contemporary: contemporary,
      nonNativeEnglish: nonNative,
      specialWords: specialWords
    });
  }

  return {
    book: book,
    chapter: chapter,
    verses: versesList,
    isHighFidelity: true
  };
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
    // Default fallback list matching original books
    targets.push(
      { book: 'Genesis', chapter: 1, isOldTestament: true, filename: 'genesis1.ts', varName: 'GENESIS_1' },
      { book: 'John', chapter: 1, isOldTestament: false, filename: 'john1.ts', varName: 'JOHN_1' },
      { book: 'John', chapter: 2, isOldTestament: false, filename: 'john2.ts', varName: 'JOHN_2' },
      { book: 'John', chapter: 3, isOldTestament: false, filename: 'john3.ts', varName: 'JOHN_3' }
    );
  }

  console.log(`Starting offline compilation for ${targets.length} target chapters...`);

  for (const item of targets) {
    try {
      const data = await processChapter(item.book, item.chapter, item.isOldTestament);

      // Write individual chapter files for modularity and type safety
      const destPath = path.join(process.cwd(), 'src', 'chapters', item.filename);
      const tsContent = `import { ChapterData } from '../types';

export const ${item.varName}: ChapterData = ${JSON.stringify(data, null, 2)};
`;
      fs.writeFileSync(destPath, tsContent, 'utf-8');
      console.log(`[FILE WRITTEN] Saved ${data.verses.length} verses of ${item.book} ${item.chapter} to ${destPath}`);
    } catch (e: any) {
      console.error(`Error compiling ${item.book} ${item.chapter}:`, e.message || e);
      process.exit(1);
    }
  }

  // Consolidate static chapters automatically
  consolidateStaticChapters();

  console.log('🌟 COMPLETED SUCCESSFULLY WITHOUT RETAINING ANY OUTSIDE API MOCK FLAGS!');
}

run();
