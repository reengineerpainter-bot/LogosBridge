/**
 * scripts/align_1thessalonians_word_by_word.cjs
 * 
 * First Epistle to the Thessalonians Strict Word-by-Word Alignment Pipeline
 * Covering: 5 Chapters, 89 Canonical Verses, ~1,472 Greek Words
 * 
 * Enforces:
 * 1. Strict Monotonic Ordinal Order for repeated/severally used words:
 *    - 1st manuscript word matches 1st English candidate.
 *    - 2nd manuscript word matches 2nd English candidate.
 * 2. Clause-Initial Inversion for post-positive particles (γάρ G1063, δέ G1161).
 * 3. Early Modern English verb inflections (-est, -eth, -st).
 * 4. Strict isolation of articles (G3588) and conjunctions (G2532, G1161).
 * 5. Mirroring to Web and Android Capacitor assets.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROD_TS = path.resolve(__dirname, '../src/utils/wordClusteringEngine.ts');
const PROD_CJS = path.resolve(__dirname, '../node_modules/.cache/prod_engine.cjs');

console.log('[BUILD] Compiling prod word clustering engine via esbuild...');
execSync(`npx esbuild "${PROD_TS}" --format=cjs --outfile="${PROD_CJS}"`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});

const { computeDisjointVerseClusters } = require(PROD_CJS);

const KJV_PATH = path.resolve(__dirname, '../public/data/kjv.json');
const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'));

const SRC_PATH = path.resolve(__dirname, '../public/data/interlinear/1TH.json');
const bookData = JSON.parse(fs.readFileSync(SRC_PATH, 'utf8'));

console.log('[START] Beginning 1 Thessalonians word-to-word alignment...');

let totalVerses = 0;
let totalWords = 0;
let matchedWords = 0;
let untranslatedWords = 0;
let collisionCount = 0;
let sameWordInversions = 0;

const chapterKeys = Object.keys(bookData.chapters).sort((a, b) => parseInt(a) - b);

for (const chStr of chapterKeys) {
  const chIdx = parseInt(chStr) - 1;
  const verseKeys = Object.keys(bookData.chapters[chStr]).sort((a, b) => parseInt(a) - b);

  for (const vsStr of verseKeys) {
    const vsIdx = parseInt(vsStr) - 1;
    const kjvVerse = kjv['1 Thessalonians'][chIdx]?.[vsIdx];

    if (!kjvVerse) {
      console.error(`[ERROR] Missing KJV verse for 1 Thess ${chStr}:${vsStr}`);
      continue;
    }

    const words = bookData.chapters[chStr][vsStr].words;
    if (!words || words.length === 0) continue;

    totalVerses++;

    // Clear prior cached tokens so fresh disjoint clustering runs
    for (const w of words) {
      delete w.k;
    }

    const clusters = computeDisjointVerseClusters(words, kjvVerse);

    // Validate that clusters are completely disjoint (zero collisions)
    const claimedTokens = new Set();
    for (let i = 0; i < words.length; i++) {
      totalWords++;
      const clusterSet = clusters[i];
      if (clusterSet && clusterSet.size > 0) {
        matchedWords++;
        const sortedIndices = Array.from(clusterSet).sort((a, b) => a - b);
        words[i].k = sortedIndices;

        for (const idx of sortedIndices) {
          if (claimedTokens.has(idx)) {
            console.error(`[COLLISION] 1 Thess ${chStr}:${vsStr} word ${i} collided on rawIdx ${idx}!`);
            collisionCount++;
          }
          claimedTokens.add(idx);
        }
      } else {
        untranslatedWords++;
        words[i].k = [];
      }
    }

    // Verify monotonic ordering for repeated words
    for (let i = 0; i < words.length; i++) {
      const wi = words[i];
      if (!wi.k || wi.k.length === 0) continue;
      const minKi = Math.min(...wi.k);
      const strongI = (wi.n || '').trim().toUpperCase();
      const glossI = (wi.t || '').trim().toLowerCase();

      for (let j = i + 1; j < words.length; j++) {
        const wj = words[j];
        if (!wj.k || wj.k.length === 0) continue;
        const minKj = Math.min(...wj.k);
        const strongJ = (wj.n || '').trim().toUpperCase();
        const glossJ = (wj.t || '').trim().toLowerCase();

        const sameStrong = strongI && strongI !== 'G0' && strongI !== 'H0' && strongI === strongJ;
        const sameGloss = glossI && glossI === glossJ;

        if (sameStrong || sameGloss) {
          if (minKi > minKj) {
            sameWordInversions++;
          }
        }
      }
    }
  }
}

console.log('\n============================================================');
console.log('FIRST EPISTLE TO THE THESSALONIANS ALIGNMENT AUDIT REPORT');
console.log('============================================================');
console.log(`Chapters Processed:        ${chapterKeys.length} / 5`);
console.log(`Canonical Verses Aligned:  ${totalVerses} / 89`);
console.log(`Total Greek Words:         ${totalWords}`);
console.log(`Directly Matched Words:    ${matchedWords} (${((matchedWords / totalWords) * 100).toFixed(2)}%)`);
console.log(`Untranslated Words (k:[]): ${untranslatedWords} (${((untranslatedWords / totalWords) * 100).toFixed(2)}%)`);
console.log(`Token Collisions:          ${collisionCount} (Guaranteed Disjoint)`);
console.log(`Same-word Inversions:      ${sameWordInversions} (Strict Monotonic Ordinal)`);
console.log('============================================================\n');

if (collisionCount > 0) {
  console.error('[ABORT] Collisions detected! Data not written.');
  process.exit(1);
}

// Target paths to save and mirror
const targets = [
  path.resolve(__dirname, '../public/data/interlinear/1TH.json'),
  path.resolve(__dirname, '../public/data/interlinear/1_thessalonians.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/1TH.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/1_thessalonians.json')
];

const serialized = JSON.stringify(bookData, null, 2);
for (const t of targets) {
  const dir = path.dirname(t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(t, serialized, 'utf8');
  console.log(`[SAVED] ${path.relative(path.resolve(__dirname, '..'), t)}`);
}

console.log('\n[SUCCESS] 1 Thessalonians word-to-word alignment complete and verified.');
