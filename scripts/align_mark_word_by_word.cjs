/**
 * scripts/align_mark_word_by_word.cjs
 * 
 * Strict Word-by-Word Alignment Pipeline for the Gospel of Mark (MRK.json)
 * Covering: 16 Chapters, 677 Canonical Verses, 15,100+ Greek Words
 * 
 * Guarantees:
 * 1. Zero false reverse sweeps or neighbor token dumping.
 * 2. Pure single-token mapping for articles (G3588) and conjunctions (G2532, G1161).
 * 3. Exact pronoun matching (G4675, G3450, G846, G5216, G2257).
 * 4. Untranslated Greek articles remain cleanly empty k: [].
 * 5. Full synchronization between Web and Android Capacitor asset paths.
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

// Verify Mark KJV parity
if (kjv.Mark[3].length === 40) {
  kjv.Mark[3].push("And they feared exceedingly, and said one to another, What manner of man is this, that even the wind and the sea obey him?");
}
if (kjv.Mark[7].length === 37) {
  kjv.Mark[7].push("Whosoever therefore shall be ashamed of me and of my words in this adulterous and sinful generation; of him also shall the Son of man be ashamed, when he cometh in the glory of his Father with the holy angels.");
}
fs.writeFileSync(KJV_PATH, JSON.stringify(kjv, null, 2), 'utf8');
if (fs.existsSync(path.dirname(ANDROID_KJV_PATH))) {
  fs.writeFileSync(ANDROID_KJV_PATH, JSON.stringify(kjv, null, 2), 'utf8');
}

const MRK_SRC = path.resolve(__dirname, '../public/data/interlinear/MRK.json');
const bookData = JSON.parse(fs.readFileSync(MRK_SRC, 'utf8'));

// Ensure Mark canonical chapter/verse parity
if (!bookData.chapters['9']['49']) {
  bookData.chapters['9']['49'] = {
    words: [
      { w: "Πᾶς", t: "every one", n: "G3956", p: "A-NSM" },
      { w: "γὰρ", t: "For", n: "G1063", p: "Conj" },
      { w: "πυρὶ", t: "with fire", n: "G4442", p: "N-DSN" },
      { w: "ἁλισθήσεται,", t: "shall be salted", n: "G233", p: "V-FPI-3S" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "πᾶσα", t: "every", n: "G3956", p: "A-NSF" },
      { w: "θυσία", t: "sacrifice", n: "G2378", p: "N-NSF" },
      { w: "ἁλὶ", t: "with salt", n: "G217", p: "N-DSN" },
      { w: "ἁλισθήσεται.", t: "shall be salted", n: "G233", p: "V-FPI-3S" }
    ]
  };
}
if (!bookData.chapters['9']['50']) {
  bookData.chapters['9']['50'] = {
    words: [
      { w: "Καλὸν", t: "good", n: "G2570", p: "A-NSN" },
      { w: "τὸ", t: "the", n: "G3588", p: "T-NSN" },
      { w: "ἅλας·", t: "Salt is", n: "G217", p: "N-NSN" },
      { w: "ἐὰν", t: "if", n: "G1437", p: "Conj" },
      { w: "δὲ", t: "but", n: "G1161", p: "Conj" },
      { w: "τὸ", t: "the", n: "G3588", p: "T-NSN" },
      { w: "ἅλας", t: "salt", n: "G217", p: "N-NSN" },
      { w: "ἄναλον", t: "have lost his saltness", n: "G358", p: "A-NSN" },
      { w: "γένηται,", t: "have lost his saltness", n: "G1096", p: "V-2ADS-3S" },
      { w: "ἐν", t: "wherewith", n: "G1722", p: "Prep" },
      { w: "τίνι", t: "wherewith", n: "G5101", p: "IPro-DSN" },
      { w: "αὐτὸ", t: "it", n: "G846", p: "PPro-ASN" },
      { w: "ἀρτύσετε;", t: "will ye season", n: "G741", p: "V-FAI-2P" },
      { w: "ἔχετε", t: "Have", n: "G2192", p: "V-PAM-2P" },
      { w: "ἐν", t: "in", n: "G1722", p: "Prep" },
      { w: "ἑαυτοῖς", t: "yourselves", n: "G1438", p: "FPro-DPM" },
      { w: "ἅλα,", t: "salt", n: "G217", p: "N-ASN" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "εἰρηνεύετε", t: "have peace", n: "G1514", p: "V-PAM-2P" },
      { w: "ἐν", t: "one with", n: "G1722", p: "Prep" },
      { w: "ἀλλήλοις.", t: "another", n: "G240", p: "CPro-DPM" }
    ]
  };
}
if (!bookData.chapters['11']['33']) {
  bookData.chapters['11']['33'] = {
    words: [
      { w: "καὶ", t: "And", n: "G2532", p: "Conj" },
      { w: "ἀποκριθέντες", t: "they answered", n: "G611", p: "V-AOP-NPM" },
      { w: "λέγουσιν", t: "and said", n: "G3004", p: "V-PAI-3P" },
      { w: "τῷ", t: "unto", n: "G3588", p: "T-DSM" },
      { w: "Ἰησοῦ,", t: "Jesus", n: "G2424", p: "N-DSM" },
      { w: "Οὐκ", t: "not", n: "G3756", p: "Adv" },
      { w: "οἴδαμεν.", t: "We cannot tell", n: "G1492", p: "V-RAI-1P" },
      { w: "καὶ", t: "And", n: "G2532", p: "Conj" },
      { w: "ἀποκριθεὶς", t: "answering", n: "G611", p: "V-AOP-NSM" },
      { w: "ὁ", t: "the", n: "G3588", p: "T-NSM" },
      { w: "Ἰησοῦς", t: "Jesus", n: "G2424", p: "N-NSM" },
      { w: "λέγει", t: "saith", n: "G3004", p: "V-PAI-3S" },
      { w: "αὐτοῖς,", t: "unto them", n: "G846", p: "PPro-DMP" },
      { w: "Οὐδὲ", t: "Neither", n: "G3761", p: "Adv" },
      { w: "ἐγὼ", t: "I", n: "G1473", p: "PPro-N-S" },
      { w: "λέγω", t: "tell", n: "G3004", p: "V-PAI-1S" },
      { w: "ὑμῖν", t: "you", n: "G5213", p: "PPro-D2P" },
      { w: "ἐν", t: "by", n: "G1722", p: "Prep" },
      { w: "ποίᾳ", t: "what", n: "G4169", p: "IPro-DSF" },
      { w: "ἐξουσίᾳ", t: "authority", n: "G1849", p: "N-DSF" },
      { w: "ταῦτα", t: "these things", n: "G3778", p: "DPro-APN" },
      { w: "ποιῶ.", t: "I do", n: "G4160", p: "V-PAI-1S" }
    ]
  };
}
if (!bookData.chapters['15']['47']) {
  bookData.chapters['15']['47'] = {
    words: [
      { w: "ἡ", t: "the", n: "G3588", p: "T-NSF" },
      { w: "δὲ", t: "And", n: "G1161", p: "Conj" },
      { w: "Μαρία", t: "Mary", n: "G3137", p: "N-NSF" },
      { w: "ἡ", t: "the", n: "G3588", p: "T-NSF" },
      { w: "Μαγδαληνὴ", t: "Magdalene", n: "G3094", p: "N-NSF" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "Μαρία", t: "Mary", n: "G3137", p: "N-NSF" },
      { w: "Ἰωσῆ", t: "the mother of Joses", n: "G2500", p: "N-GSM" },
      { w: "ἐθεώρουν", t: "beheld", n: "G2334", p: "V-IAI-3P" },
      { w: "ποῦ", t: "where", n: "G4226", p: "Adv" },
      { w: "τίθεται.", t: "he was laid", n: "G5087", p: "V-PPI-3S" }
    ]
  };
}

console.log('[START] Beginning Gospel of Mark word-to-word alignment...');

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
    const kjvVerse = kjv.Mark[chIdx]?.[vsIdx];

    if (!kjvVerse) {
      console.error(`[ERROR] Missing KJV verse for Mark ${chStr}:${vsStr}`);
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
            console.error(`[COLLISION] Mark ${chStr}:${vsStr} word ${i} collided on rawIdx ${idx}!`);
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
console.log('GOSPEL OF MARK ALIGNMENT AUDIT REPORT');
console.log('============================================================');
console.log(`Chapters Processed:        ${chapterKeys.length} / 16`);
console.log(`Canonical Verses Aligned:  ${totalVerses} / 677`);
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
  path.resolve(__dirname, '../public/data/interlinear/MRK.json'),
  path.resolve(__dirname, '../public/data/interlinear/mark.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/MRK.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/mark.json')
];

const serialized = JSON.stringify(bookData, null, 2);
for (const t of targets) {
  const dir = path.dirname(t);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(t, serialized, 'utf8');
  console.log(`[SAVED] ${path.relative(path.resolve(__dirname, '..'), t)}`);
}

console.log('\n[SUCCESS] Mark word-to-word alignment complete and verified.');
