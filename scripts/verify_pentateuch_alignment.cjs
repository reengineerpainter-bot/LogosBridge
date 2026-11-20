/**
 * scripts/verify_pentateuch_alignment.cjs
 * 
 * Comprehensive Test Suite for Batch 1 (Pentateuch) Manuscript-to-KJV Alignment
 * Verifies core milestone verses across Genesis, Exodus, Leviticus, Numbers, and Deuteronomy.
 */

const fs = require('fs');
const path = require('path');
// Ensure latest engine bundle is available
const { execSync } = require('child_process');
const bundlePath = path.resolve(__dirname, '../node_modules/.cache/wordClusteringEngine.cjs');
if (!fs.existsSync(path.dirname(bundlePath))) {
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
}
execSync(`npx esbuild src/utils/wordClusteringEngine.ts --format=cjs --outfile="${bundlePath}"`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'ignore'
});
const { getMatchedKjvTokenIndices, parseKjvRawTokens } = require(bundlePath);

const KJV_DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/kjv.json'), 'utf8'));

const BENCHMARKS = [
  {
    book: 'Genesis',
    filename: 'genesis.json',
    chapter: 1,
    verse: 1,
    title: 'Genesis 1:1 — Creation of Heavens & Earth',
    expectedMatches: [
      { wIdx: 0, text: 'Inthebeginning' },
      { wIdx: 1, text: 'created' },
      { wIdx: 2, text: 'God' },
      { wIdx: 4, text: 'theheaven' },
      { wIdx: 5, text: 'and' },
      { wIdx: 6, text: 'theearth' }
    ]
  },
  {
    book: 'Genesis',
    filename: 'genesis.json',
    chapter: 1,
    verse: 3,
    title: 'Genesis 1:3 — "Let there be light"',
    expectedMatches: [
      { wIdx: 0, text: 'Andsaid' },
      { wIdx: 1, text: 'God' },
      { wIdx: 2, text: 'Lettherebe' },
      { wIdx: 3, text: 'light' }
    ]
  },
  {
    book: 'Genesis',
    filename: 'genesis.json',
    chapter: 2,
    verse: 18,
    title: 'Genesis 2:18 — "It is not good that the man should be alone" (twob & heywot)',
    expectedMatches: [
      { wIdx: 3, text: 'not' },
      { wIdx: 4, text: 'good' },
      { wIdx: 5, text: 'shouldbe' },
      { wIdx: 6, text: 'theman' },
      { wIdx: 7, text: 'alone' },
      { wIdx: 8, text: 'Iwillmake' },
      { wIdx: 10, text: 'anhelp' },
      { wIdx: 11, text: 'meetforhim' }
    ]
  },
  {
    book: 'Genesis',
    filename: 'genesis.json',
    chapter: 12,
    verse: 1,
    title: 'Genesis 12:1 — The Call of Abram ("Get thee out")',
    expectedMatches: [
      { wIdx: 0, text: 'said' },
      { wIdx: 1, text: 'theLORD' }
    ]
  },
  {
    book: 'Exodus',
    filename: 'exodus.json',
    chapter: 3,
    verse: 14,
    title: 'Exodus 3:14 — The Divine Name ("I AM THAT I AM")',
    expectedMatches: [
      { wIdx: 0, text: 'Andsaid' },
      { wIdx: 1, text: 'God' },
      { wIdx: 2, text: 'unto' },
      { wIdx: 3, text: 'Moses' },
      { wIdx: 4, text: 'IAM' },
      { wIdx: 5, text: 'THAT' },
      { wIdx: 6, text: 'IAM' }
    ]
  },
  {
    book: 'Exodus',
    filename: 'exodus.json',
    chapter: 20,
    verse: 13,
    title: 'Exodus 20:13 — Sixth Commandment ("Thou shalt not kill")',
    expectedMatches: [
      { wIdx: 0, text: 'not' },
      { wIdx: 1, text: 'kill' }
    ]
  },
  {
    book: 'Leviticus',
    filename: 'leviticus.json',
    chapter: 19,
    verse: 18,
    title: 'Leviticus 19:18 — The Great Commandment ("Love thy neighbour as thyself")',
    expectedMatches: [
      { wIdx: 11, text: 'theLORD' }
    ]
  },
  {
    book: 'Numbers',
    filename: 'numbers.json',
    chapter: 6,
    verse: 24,
    title: 'Numbers 6:24 — The Priestly Blessing ("The LORD bless thee")',
    expectedMatches: [
      { wIdx: 0, text: 'bless' },
      { wIdx: 1, text: 'TheLORD' }
    ]
  },
  {
    book: 'Deuteronomy',
    filename: 'deuteronomy.json',
    chapter: 6,
    verse: 4,
    title: 'Deuteronomy 6:4 — The Shema ("Hear O Israel, the LORD our God is one LORD")',
    expectedMatches: [
      { wIdx: 0, text: 'Hear' },
      { wIdx: 1, text: 'OIsrael' },
      { wIdx: 2, text: 'TheLORD' },
      { wIdx: 3, text: 'ourGod' },
      { wIdx: 4, text: 'LORD' },
      { wIdx: 5, text: 'one' }
    ]
  }
];

console.log('====================================================================');
console.log('VERIFYING PENTATEUCH BENCHMARK VERSES (BATCH 1)');
console.log('====================================================================');

let totalChecks = 0;
let passedChecks = 0;

for (const b of BENCHMARKS) {
  const filePath = path.resolve(__dirname, `../public/data/interlinear/${b.filename}`);
  const bookData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const vWords = bookData.chapters[String(b.chapter)][String(b.verse)].words;
  const kjvText = KJV_DATA[b.book][b.chapter - 1][b.verse - 1];
  const rawTokens = parseKjvRawTokens(kjvText);

  console.log(`\n📌 ${b.title}`);
  console.log(`KJV: "${kjvText}"`);

  for (const expected of b.expectedMatches) {
    totalChecks++;
    const matchedIndices = getMatchedKjvTokenIndices(vWords, expected.wIdx, kjvText);
    const matchedStr = rawTokens
      .filter((t) => matchedIndices.has(t.rawIdx))
      .map((t) => t.text)
      .join('')
      .replace(/[^a-zA-Z0-9]/g, '');

    const targetWord = vWords[expected.wIdx];
    const isPass = matchedStr.toLowerCase().includes(expected.text.toLowerCase());

    if (isPass) {
      passedChecks++;
      console.log(`  ✅ Word ${expected.wIdx} [${targetWord.w} / "${targetWord.t}"]: "${matchedStr}" (matched "${expected.text}")`);
    } else {
      console.log(`  ❌ Word ${expected.wIdx} [${targetWord.w} / "${targetWord.t}"]: got "${matchedStr}", expected to include "${expected.text}"`);
    }
  }
}

console.log('\n====================================================================');
console.log(`BENCHMARK RESULTS: ${passedChecks} / ${totalChecks} passed (${(passedChecks / totalChecks * 100).toFixed(1)}%)`);
console.log('====================================================================');

if (passedChecks < totalChecks) {
  process.exit(1);
} else {
  console.log('🎉 ALL PENTATEUCH MANUSCRIPT BENCHMARKS PASSED PERFECTLY!');
}
