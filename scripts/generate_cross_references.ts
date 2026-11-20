/**
 * Human-in-the-Loop Developer Script: Automated Strict Triad Cross-Reference Generator
 * 
 * Usage:
 *   npm run generate-refs -- "Mark 11:22"
 *   npm run generate-refs -- "Mark 11"
 *   npm run generate-refs -- "Genesis 1"
 * 
 * Flow:
 * 1. Resolves verse text from local public/data/kjv.json dataset.
 * 2. Queries /api/cross-references on http://localhost:3000.
 * 3. Enforces a mandatory 6-second delay between requests to protect against 429 Quota limits.
 * 4. Appends candidates to src/data/draft_cross_references.json for human review.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGING_DB_PATH = path.resolve(__dirname, '../src/data/draft_cross_references.json');
const KJV_DATASET_PATH = path.resolve(__dirname, '../public/data/kjv.json');
const API_URL = process.env.API_URL || 'http://localhost:3000/api/cross-references';
const RATE_LIMIT_DELAY_MS = 6000; // 6-second delay between API calls

interface VerseTarget {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const BOOK_ALIASES: Record<string, string> = {
  'gen': 'Genesis', 'genesis': 'Genesis',
  'ex': 'Exodus', 'exodus': 'Exodus',
  'lev': 'Leviticus', 'leviticus': 'Leviticus',
  'num': 'Numbers', 'numbers': 'Numbers',
  'deut': 'Deuteronomy', 'deuteronomy': 'Deuteronomy',
  'josh': 'Joshua', 'joshua': 'Joshua',
  'judg': 'Judges', 'judges': 'Judges',
  'ruth': 'Ruth',
  '1sam': '1 Samuel', '1 samuel': '1 Samuel',
  '2sam': '2 Samuel', '2 samuel': '2 Samuel',
  '1kings': '1 Kings', '1 kings': '1 Kings',
  '2kings': '2 Kings', '2 kings': '2 Kings',
  '1chron': '1 Chronicles', '1 chronicles': '1 Chronicles',
  '2chron': '2 Chronicles', '2 chronicles': '2 Chronicles',
  'ps': 'Psalms', 'psalm': 'Psalms', 'psalms': 'Psalms',
  'prov': 'Proverbs', 'proverbs': 'Proverbs',
  'eccl': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes',
  'song': 'Song of Solomon', 'song of solomon': 'Song of Solomon',
  'isa': 'Isaiah', 'isaiah': 'Isaiah',
  'jer': 'Jeremiah', 'jeremiah': 'Jeremiah',
  'lam': 'Lamentations', 'lamentations': 'Lamentations',
  'dan': 'Daniel', 'daniel': 'Daniel',
  'matt': 'Matthew', 'matthew': 'Matthew',
  'mark': 'Mark',
  'luke': 'Luke',
  'john': 'John',
  'acts': 'Acts',
  'rom': 'Romans', 'romans': 'Romans',
  '1cor': '1 Corinthians', '1 corinthians': '1 Corinthians',
  '2cor': '2 Corinthians', '2 corinthians': '2 Corinthians',
  'gal': 'Galatians', 'galatians': 'Galatians',
  'eph': 'Ephesians', 'ephesians': 'Ephesians',
  'phil': 'Philippians', 'philippians': 'Philippians',
  'col': 'Colossians', 'colossians': 'Colossians',
  '1thess': '1 Thessalonians', '1 thessalonians': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2 thessalonians': '2 Thessalonians',
  '1tim': '1 Timothy', '1 timothy': '1 Timothy',
  '2tim': '2 Timothy', '2 timothy': '2 Timothy',
  'titus': 'Titus',
  'heb': 'Hebrews', 'hebrews': 'Hebrews',
  'james': 'James',
  '1pet': '1 Peter', '1 peter': '1 Peter',
  '2pet': '2 Peter', '2 peter': '2 Peter',
  '1john': '1 John',
  '2john': '2 John',
  '3john': '3 John',
  'jude': 'Jude',
  'rev': 'Revelation', 'revelation': 'Revelation'
};

function normalizeBook(name: string): string {
  const clean = name.trim().toLowerCase().replace(/\./g, '');
  return BOOK_ALIASES[clean] || name.trim();
}

function loadKjvDataset(): Record<string, string[][]> {
  if (!fs.existsSync(KJV_DATASET_PATH)) {
    console.error(`[Error] KJV dataset file not found at ${KJV_DATASET_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(KJV_DATASET_PATH, 'utf8'));
}

function resolveTargets(inputArg: string, kjv: Record<string, string[][]>): VerseTarget[] {
  const trimmed = inputArg.trim();
  const verseMatch = trimmed.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.](\d+)$/);

  if (verseMatch) {
    const book = normalizeBook(verseMatch[1]);
    const chapter = parseInt(verseMatch[2], 10);
    const verse = parseInt(verseMatch[3], 10);

    const bookData = kjv[book];
    const text = bookData?.[chapter - 1]?.[verse - 1] || '';

    return [{
      ref: `${book} ${chapter}:${verse}`,
      book,
      chapter,
      verse,
      text: text.trim()
    }];
  }

  const chapterMatch = trimmed.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)$/);
  if (chapterMatch) {
    const book = normalizeBook(chapterMatch[1]);
    const chapter = parseInt(chapterMatch[2], 10);

    const bookData = kjv[book];
    if (!bookData || !bookData[chapter - 1]) {
      console.error(`[Error] Could not find ${book} Chapter ${chapter} in KJV dataset.`);
      return [];
    }

    const chapterVerses = bookData[chapter - 1];
    return chapterVerses.map((text, idx) => ({
      ref: `${book} ${chapter}:${idx + 1}`,
      book,
      chapter,
      verse: idx + 1,
      text: (text || '').trim()
    }));
  }

  console.error(`[Error] Invalid target format: "${inputArg}". Use "Mark 11:22" or "Mark 11".`);
  return [];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryCrossReferences(ref: string, text: string): Promise<string[] | null> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verseReference: ref,
        verseText: text
      })
    });

    if (!res.ok) {
      console.warn(`[API Warning] Received HTTP status ${res.status} for ${ref}`);
      return null;
    }

    const data = await res.json();
    if (data && Array.isArray(data.references)) {
      return data.references;
    }
    return [];
  } catch (err: any) {
    console.error(`[Connection Error] Could not reach ${API_URL}: ${err.message}`);
    return null;
  }
}

function appendToStagingDatabase(ref: string, references: string[]) {
  let stagingData: Record<string, string[]> = {};
  if (fs.existsSync(STAGING_DB_PATH)) {
    try {
      stagingData = JSON.parse(fs.readFileSync(STAGING_DB_PATH, 'utf8'));
    } catch {}
  }

  stagingData[ref] = references;
  fs.writeFileSync(STAGING_DB_PATH, JSON.stringify(stagingData, null, 2), 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Human-in-the-Loop Triad Cross-Reference Generator (Staging)     ║
╚══════════════════════════════════════════════════════════════════╝
Usage:
  npm run generate-refs -- "<Reference>"

Examples:
  npm run generate-refs -- "Mark 11:22"   (Single verse)
  npm run generate-refs -- "Mark 11"      (Full chapter, 6s delay per verse)
  npm run generate-refs -- "John 3"       (Full chapter)

Results are automatically appended to:
  src/data/draft_cross_references.json
`);
    process.exit(0);
  }

  const targetArg = args[0];
  console.log(`\n🔍 Loading KJV Bible dataset...`);
  const kjv = loadKjvDataset();

  const targets = resolveTargets(targetArg, kjv);
  if (targets.length === 0) {
    console.log(`❌ No target verses resolved for "${targetArg}".`);
    process.exit(1);
  }

  console.log(`📋 Found ${targets.length} target verse(s) for "${targetArg}".`);
  console.log(`⏱️  Enforcing mandatory ${RATE_LIMIT_DELAY_MS / 1000}s delay between requests to protect quota.\n`);

  let successCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const progress = `[${i + 1}/${targets.length}]`;
    console.log(`${progress} Scanning ${t.ref}: "${t.text.slice(0, 50)}..."`);

    const refs = await queryCrossReferences(t.ref, t.text);

    if (refs !== null) {
      appendToStagingDatabase(t.ref, refs);
      console.log(`   ✅ Staged ${t.ref} => ${JSON.stringify(refs)}`);
      successCount++;
    } else {
      console.log(`   ⚠️ Skipped ${t.ref} due to API/network issue.`);
    }

    // Only sleep if there are subsequent items
    if (i < targets.length - 1) {
      console.log(`   ⏳ Waiting ${RATE_LIMIT_DELAY_MS / 1000}s before next request (Rate limit protection)...`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log(`\n🎉 Completed! Successfully staged ${successCount} verse(s) to:`);
  console.log(`   👉 ${STAGING_DB_PATH}\n`);
  console.log(`Next Step: Review src/data/draft_cross_references.json, and copy vetted entries into src/data/triad_cross_references.json.`);
}

main();
