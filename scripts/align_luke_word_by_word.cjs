/**
 * scripts/align_luke_word_by_word.cjs
 * 
 * Gospel of Luke Strict Word-by-Word Alignment Pipeline
 * Covering: 24 Chapters, 1,151 Canonical Verses, 19,954 Greek Words
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

const { computeDisjointVerseClusters, parseKjvRawTokens } = require(PROD_CJS);

const KJV_PATH = path.resolve(__dirname, '../public/data/kjv.json');
const ANDROID_KJV_PATH = path.resolve(__dirname, '../android/app/src/main/assets/public/data/kjv.json');
const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'));

const LUK_SRC = path.resolve(__dirname, '../public/data/interlinear/LUK.json');
const bookData = JSON.parse(fs.readFileSync(LUK_SRC, 'utf8'));

console.log('[START] Beginning Gospel of Luke word-to-word alignment...');

let totalVerses = 0;
let totalWords = 0;
let matchedWords = 0;
let untranslatedWords = 0;
let collisionCount = 0;

const chapterKeys = Object.keys(bookData.chapters).sort((a, b) => parseInt(a) - b);

for (const chStr of chapterKeys) {
  const chIdx = parseInt(chStr) - 1;
  const verseKeys = Object.keys(bookData.chapters[chStr]).sort((a, b) => parseInt(a) - b);

  for (const vsStr of verseKeys) {
    const vsIdx = parseInt(vsStr) - 1;
    const kjvVerse = kjv.Luke[chIdx]?.[vsIdx];

    if (!kjvVerse) {
      console.error(`[ERROR] Missing KJV verse for Luke ${chStr}:${vsStr}`);
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
            console.error(`[COLLISION] Luke ${chStr}:${vsStr} word ${i} collided on rawIdx ${idx}!`);
            collisionCount++;
          }
          claimedTokens.add(idx);
        }
      } else {
        // Untranslated particles remain cleanly empty []
        untranslatedWords++;
        words[i].k = [];
      }
    }
  }
}

console.log('\n============================================================');
console.log('GOSPEL OF LUKE ALIGNMENT AUDIT REPORT');
console.log('============================================================');
console.log(`Chapters Processed:        ${chapterKeys.length} / 24`);
console.log(`Canonical Verses Aligned:  ${totalVerses} / 1151`);
console.log(`Total Greek Words:         ${totalWords}`);
console.log(`Directly Matched Words:    ${matchedWords} (${((matchedWords / totalWords) * 100).toFixed(2)}%)`);
console.log(`Untranslated Words (k:[]): ${untranslatedWords} (${((untranslatedWords / totalWords) * 100).toFixed(2)}%)`);
console.log(`Token Collisions:          ${collisionCount} (Guaranteed Disjoint)`);
console.log('============================================================\n');

if (collisionCount > 0) {
  console.error('[ABORT] Collisions detected! Data not written.');
  process.exit(1);
}

// Target paths to save and mirror
const targets = [
  path.resolve(__dirname, '../public/data/interlinear/LUK.json'),
  path.resolve(__dirname, '../public/data/interlinear/luke.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/LUK.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/luke.json')
];

const serialized = JSON.stringify(bookData, null, 2);
for (const t of targets) {
  const dir = path.dirname(t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(t, serialized, 'utf8');
  console.log(`[SAVED] ${path.relative(path.resolve(__dirname, '..'), t)}`);
}

console.log('\n[SUCCESS] Luke word-to-word alignment complete and verified.');
