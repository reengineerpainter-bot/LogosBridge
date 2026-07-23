import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not defined.');
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

interface BibleApiVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResult {
  verses: BibleApiVerse[];
}

function getIsOldTestament(book: string): boolean {
  const otBooks = [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
    '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra', 'nehemiah',
    'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon', 'isaiah', 'jeremiah',
    'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah',
    'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'
  ];
  return otBooks.includes(book.toLowerCase());
}

async function fetchFromBibleApi(book: string, chapter: number, translation: string): Promise<BibleApiVerse[]> {
  const urlBook = encodeURIComponent(book.toLowerCase());
  const url = `https://bible-api.com/${urlBook}+${chapter}?translation=${translation}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${book} ${chapter} (${translation}): ${res.statusText}`);
  }
  const data = await res.json() as BibleApiResult;
  return data.verses;
}

async function buildChapterBatches() {
  const args = process.argv.slice(2);
  let bookArg = 'John';
  let chapterArg = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      bookArg = args[i + 1];
    }
    if (args[i] === '--chapter' && args[i + 1]) {
      chapterArg = parseInt(args[i + 1], 10);
    }
  }

  console.log(`[Batch Builder] Fetching ${bookArg} Chapter ${chapterArg}...`);
  const kjvVerses = await fetchFromBibleApi(bookArg, chapterArg, 'kjv');
  const webVerses = await fetchFromBibleApi(bookArg, chapterArg, 'web');

  const maxVerseNum = Math.max(...kjvVerses.map(v => v.verse), ...webVerses.map(v => v.verse));
  const alignedInput: any[] = [];

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

  console.log(`[Batch Builder] Aligned ${alignedInput.length} verses. Translating in batches of 5 to avoid timeouts card...`);

  const results: any[] = [];
  const batchSize = 5;
  const isOldTestament = getIsOldTestament(bookArg);
  const lang = isOldTestament ? 'Hebrew' : 'Greek';

  for (let i = 0; i < alignedInput.length; i += batchSize) {
    const batch = alignedInput.slice(i, i + batchSize);
    console.log(`[Batch Builder] Translating verses ${batch[0].verseNumber} to ${batch[batch.length - 1].verseNumber} of ${alignedInput.length}...`);

    const prompt = `You are an elite academic Bible translator, linguistic scholar, and theologian.
We have fetched original scripture verses for ${bookArg} chapter ${chapterArg}.
Your task is to enrich this batch of scriptures using our strict 3-Stage Cognitive Workflow:

Stage 1 (Find the Anchor): For each verse, identify 1 or 2 core theological terms and provide their original ${lang} source script, transliteration, and a simple non-native friendly explanation.
Stage 2 (Plain English Translation): Generate "contemporary" text. Simplify vocabulary, shorten sentences, remove archaic pronouns (thee, thy), replace theological jargon with active modern equivalents. Ensure extreme readability.
Stage 3 (Personalized Modern Experiential Whisper): Generate "nonNativeEnglish" text.
Turn each verse into a first-person/second-person singular prayer response. 
- Rule 1 (I/You Shift): Shift the perspective. Let the reader talk directly to God ("You are my shepherd", "Lead me close with You").
- Rule 2 (Principle to Action): Turn promises/instructions into active present-tense commitments, or active continuous requests to God.
- Rule 3 (Emotional Resonance): Weave in modern human emotions ("stressed", "anxious", "confident", "vibrantly excited", "resting in Your peaceful embrace").
- Rule 4 (The "So What?" Factor): Apply the truth practically to the reader's "Tuesday morning" daily routine.

Input aligned verses:
${JSON.stringify(batch, null, 2)}

Return a strict JSON object with a single "verses" property containing exactly these translated verses. Do NOT skip any verse.`;

    let success = false;
    let attempts = 0;
    while (!success && attempts < 5) {
      try {
        attempts++;
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are an elite Bible scholar returning valid JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
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
              required: ['verses']
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed && parsed.verses && parsed.verses.length === batch.length) {
            results.push(...parsed.verses);
            success = true;
          } else {
            console.warn(`[Batch Builder] Batch length mismatch, retrying... (Expected ${batch.length}, got ${parsed?.verses?.length || 0})`);
          }
        }
      } catch (err: any) {
        console.warn(`[Batch Builder] Attempt ${attempts} failed: ${err.message || err}. Sleeping 8s before retry.`);
        await new Promise(r => setTimeout(r, 8000));
      }
    }

    if (!success) {
      console.error(`[Batch Builder] Failed to translate batch after maximum retries.`);
      process.exit(1);
    }

    // Add a tiny sleep to be friendly to rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save the complete output
  const fileSafeName = bookArg.replace(/\s+/g, '').toLowerCase() + chapterArg;
  const varSafeName = bookArg.replace(/\s+/g, '_').toUpperCase() + '_' + chapterArg;
  const destPath = path.join(process.cwd(), 'src', 'chapters', `${fileSafeName}.ts`);

  const fullChapterData = {
    book: bookArg,
    chapter: chapterArg,
    verses: results
  };

  const tsContent = `import { ChapterData } from '../types';\n\nexport const ${varSafeName}: ChapterData = ${JSON.stringify(fullChapterData, null, 2)};\n`;
  fs.writeFileSync(destPath, tsContent, 'utf-8');
  console.log(`[Batch Builder] SUCCESS! Saved complete chapter ${bookArg} ${chapterArg} to ${destPath}`);
}

buildChapterBatches().catch(err => {
  console.error('[Batch Builder Main Error]', err);
  process.exit(1);
});
