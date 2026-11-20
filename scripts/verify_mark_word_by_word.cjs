/**
 * scripts/verify_mark_word_by_word.cjs
 * 
 * Verifies Word-to-Word Alignment Across Key Mark Benchmark Verses:
 * - Mark 1:1-5 (Opening narrative, prophecy citations, and baptism)
 * - Mark 4:39-41 (Calming the storm)
 * - Mark 8:34-38 (Taking up the cross)
 * - Mark 11:22-24 (Faith moving mountains)
 * - Mark 14:36 (Abba, Father)
 * - Mark 16:15-16 (The Great Commission)
 */

const fs = require('fs');
const path = require('path');
const { parseKjvRawTokens } = require(path.resolve(__dirname, '../node_modules/.cache/prod_engine.cjs'));

const mrk = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/interlinear/MRK.json'), 'utf8'));
const kjv = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/kjv.json'), 'utf8'));

const testVerses = [
  { ref: 'Mark 1:1', ch: '1', vs: '1' },
  { ref: 'Mark 1:2', ch: '1', vs: '2' },
  { ref: 'Mark 1:3', ch: '1', vs: '3' },
  { ref: 'Mark 1:4', ch: '1', vs: '4' },
  { ref: 'Mark 1:5', ch: '1', vs: '5' },
  { ref: 'Mark 4:41', ch: '4', vs: '41' },
  { ref: 'Mark 8:38', ch: '8', vs: '38' },
  { ref: 'Mark 11:23', ch: '11', vs: '23' },
  { ref: 'Mark 14:36', ch: '14', vs: '36' },
  { ref: 'Mark 16:15', ch: '16', vs: '15' }
];

let totalWordsChecked = 0;
let articleBleedCount = 0;
let conjBleedCount = 0;
let collisionCount = 0;

for (const t of testVerses) {
  const chIdx = parseInt(t.ch) - 1;
  const vsIdx = parseInt(t.vs) - 1;
  const verseText = kjv.Mark[chIdx][vsIdx];
  const rawTokens = parseKjvRawTokens(verseText);
  const words = mrk.chapters[t.ch][t.vs].words;

  console.log(`\n============================================================`);
  console.log(`[VERIFY] ${t.ref}`);
  console.log(`KJV: "${verseText}"`);
  console.log(`============================================================`);

  const claimed = new Set();

  words.forEach((w, i) => {
    totalWordsChecked++;
    const k = w.k || [];
    const matchedTokens = k.map(idx => rawTokens[idx]?.text || '').filter(Boolean);
    const matchedStr = matchedTokens.join(' ');
    const strong = (w.n || '').trim().toUpperCase();

    // Check collision
    for (const idx of k) {
      if (claimed.has(idx)) {
        collisionCount++;
        console.error(`  [COLLISION] Word ${i} (${w.w}) collided on token ${idx}!`);
      }
      claimed.add(idx);
    }

    // Check article bleed: G3588 must not claim more than 1 word or claim nouns
    if (strong === 'G3588' && k.length > 1) {
      articleBleedCount++;
      console.warn(`  [WARN] Article ${w.w} claimed multi-word: "${matchedStr}"`);
    }

    // Check conjunction bleed: G2532 / G1161 must not claim multi-word
    if ((strong === 'G2532' || strong === 'G1161') && k.length > 1) {
      conjBleedCount++;
      console.warn(`  [WARN] Conjunction ${w.w} claimed multi-word: "${matchedStr}"`);
    }

    console.log(`  [${String(i).padStart(2)}] ${w.w.padEnd(16)} | Strong: ${strong.padEnd(6)} | Gloss: "${(w.t || '').padEnd(18)}" | KJV [${k.join(',')}]: "${matchedStr}"`);
  });
}

console.log('\n============================================================');
console.log('BENCHMARK VERIFICATION RESULTS');
console.log('============================================================');
console.log(`Benchmark Words Audited: ${totalWordsChecked}`);
console.log(`Collisions:              ${collisionCount}`);
console.log(`Article Bleeds:          ${articleBleedCount}`);
console.log(`Conjunction Bleeds:      ${conjBleedCount}`);
console.log('============================================================\n');
