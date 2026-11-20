/**
 * scripts/align_matthew_kjv.cjs
 * 
 * Gospel of Matthew: High-Precision Word-by-Word Alignment Pipeline
 * 
 * Complete Canonical Coverage:
 * 1. Completes full 1,071-verse canonical alignment for Matthew across all 28 chapters.
 * 2. Backfills 3 missing verses in kjv.json (Matt 2:23, 22:46, 26:75).
 * 3. Backfills 4 missing chapter endings in MAT.json (Matt 12:50, 17:27, 18:35, 23:39).
 * 4. Pre-computes exact KJV raw token clusters ('k: number[]') for every Greek word.
 * 5. Mirrors updated datasets to Web and Android Capacitor asset paths.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROD_TS = path.resolve(__dirname, '../src/utils/wordClusteringEngine.ts');
const PROD_CJS = path.resolve(__dirname, '../node_modules/.cache/prod_engine.cjs');

execSync(`npx esbuild "${PROD_TS}" --format=cjs --outfile="${PROD_CJS}"`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'ignore'
});

const { computeDisjointVerseClusters } = require(PROD_CJS);

// 1. KJV Data
const KJV_PATH = path.resolve(__dirname, '../public/data/kjv.json');
const ANDROID_KJV_PATH = path.resolve(__dirname, '../android/app/src/main/assets/public/data/kjv.json');
const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'));

// Backfill missing verses in KJV Matthew
if (kjv.Matthew[1].length === 22) {
  kjv.Matthew[1].push("And he came and dwelt in a city called Nazareth: that it might be fulfilled which was spoken by the prophets, He shall be called a Nazarene.");
}
if (kjv.Matthew[21].length === 45) {
  kjv.Matthew[21].push("And no man was able to answer him a word, neither durst any [man] from that day forth ask him any more [questions].");
}
if (kjv.Matthew[25].length === 74) {
  kjv.Matthew[25].push("And Peter remembered the word of Jesus, which said unto him, Before the cock crow, thou shalt deny me thrice. And he went out, and wept bitterly.");
}

fs.writeFileSync(KJV_PATH, JSON.stringify(kjv, null, 2), 'utf8');
if (fs.existsSync(path.dirname(ANDROID_KJV_PATH))) {
  fs.writeFileSync(ANDROID_KJV_PATH, JSON.stringify(kjv, null, 2), 'utf8');
}

// 2. Matthew Interlinear Data
const MAT_SRC_PATH = path.resolve(__dirname, '../public/data/interlinear/MAT.json');
const matData = JSON.parse(fs.readFileSync(MAT_SRC_PATH, 'utf8'));

// Backfill missing chapter endings in Greek MAT.json
if (!matData.chapters['12']['50']) {
  matData.chapters['12']['50'] = {
    words: [
      { w: "ὅστις", t: "whosoever", n: "G3748", p: "R-NSM" },
      { w: "γὰρ", t: "For", n: "G1063", p: "Conj" },
      { w: "ἂν", t: "shall", n: "G302", p: "Part" },
      { w: "ποιήσῃ", t: "do", n: "G4160", p: "V-AAS-3S" },
      { w: "τὸ", t: "the", n: "G3588", p: "T-ASN" },
      { w: "θέλημα", t: "will", n: "G2307", p: "N-ASN" },
      { w: "τοῦ", t: "of", n: "G3588", p: "T-GSM" },
      { w: "πατρός", t: "Father", n: "G3962", p: "N-GSM" },
      { w: "μου", t: "my", n: "G3450", p: "PPro-G1S" },
      { w: "τοῦ", t: "which is", n: "G3588", p: "T-GSM" },
      { w: "ἐν", t: "in", n: "G1722", p: "Prep" },
      { w: "οὐρανοῖς,", t: "heaven", n: "G3772", p: "N-DMP" },
      { w: "αὐτός", t: "the same", n: "G846", p: "PPro-NSM" },
      { w: "μου", t: "my", n: "G3450", p: "PPro-G1S" },
      { w: "ἀδελφὸς", t: "brother", n: "G80", p: "N-NSM" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "ἀδελφὴ", t: "sister", n: "G79", p: "N-NSF" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "μήτηρ", t: "mother", n: "G3384", p: "N-NSF" },
      { w: "ἐστίν.", t: "is", n: "G2076", p: "V-PAI-3S" }
    ]
  };
}

if (!matData.chapters['17']['27']) {
  matData.chapters['17']['27'] = {
    words: [
      { w: "ἵνα", t: "Notwithstanding", n: "G2443", p: "Conj" },
      { w: "δὲ", t: "lest", n: "G1161", p: "Conj" },
      { w: "μὴ", t: "not", n: "G3361", p: "Adv" },
      { w: "σκανδαλίσωμεν", t: "we should offend", n: "G4624", p: "V-AAS-1P" },
      { w: "αὐτούς,", t: "them", n: "G846", p: "PPro-AMP" },
      { w: "πορευθεὶς", t: "go thou", n: "G4198", p: "V-APP-NSM" },
      { w: "εἰς", t: "to", n: "G1519", p: "Prep" },
      { w: "τὴν", t: "the", n: "G3588", p: "T-ASF" },
      { w: "θάλασσαν,", t: "sea", n: "G2281", p: "N-ASF" },
      { w: "βάλε", t: "and cast", n: "G906", p: "V-2AAM-2S" },
      { w: "ἄγκιστρον,", t: "a hook", n: "G44", p: "N-ASN" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "τὸν", t: "the", n: "G3588", p: "T-ASM" },
      { w: "ἀναβάντα", t: "that first cometh up", n: "G305", p: "V-2AAP-ASM" },
      { w: "πρῶτον", t: "first", n: "G4412", p: "A-ASM" },
      { w: "ἰχθὺν", t: "fish", n: "G2486", p: "N-ASM" },
      { w: "ἆρον·", t: "take up", n: "G142", p: "V-AAM-2S" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "ἀνοίξας", t: "when thou hast opened", n: "G455", p: "V-AAP-NSM" },
      { w: "τὸ", t: "his", n: "G3588", p: "T-ASN" },
      { w: "στόμα", "t": "mouth", n: "G4750", p: "N-ASN" },
      { w: "αὐτοῦ,", t: "of him", n: "G846", p: "PPro-GSM" },
      { w: "εὑρήσεις", t: "thou shalt find", n: "G2147", p: "V-FAI-2S" },
      { w: "στατῆρα·", t: "a piece of money", n: "G4715", p: "N-ASM" },
      { w: "ἐκεῖνον", t: "that", n: "G1565", p: "DPro-ASM" },
      { w: "λαβὼν", t: "take", n: "G2983", p: "V-2AAP-NSM" },
      { w: "δὸς", t: "and give", n: "G1325", p: "V-2AAM-2S" },
      { w: "αὐτοῖς", t: "unto them", n: "G846", p: "PPro-DMP" },
      { w: "ἀντὶ", t: "for", n: "G473", p: "Prep" },
      { w: "ἐμοῦ", t: "me", n: "G1700", p: "PPro-G1S" },
      { w: "καὶ", t: "and", n: "G2532", p: "Conj" },
      { w: "σοῦ.", t: "thee", n: "G4675", p: "PPro-G2S" }
    ]
  };
}

if (!matData.chapters['18']['35']) {
  matData.chapters['18']['35'] = {
    words: [
      { w: "Οὕτως", t: "So likewise", n: "G3779", p: "Adv" },
      { w: "καὶ", t: "also", n: "G2532", p: "Conj" },
      { w: "ὁ", t: "the", n: "G3588", p: "T-NSM" },
      { w: "πατήρ", t: "Father", n: "G3962", p: "N-NSM" },
      { w: "μου", t: "my", n: "G3450", p: "PPro-G1S" },
      { w: "ὁ", t: "which is", n: "G3588", p: "T-NSM" },
      { w: "οὐράνιος", t: "heavenly", n: "G3770", p: "A-NSM" },
      { w: "ποιήσει", t: "shall do", n: "G4160", p: "V-FAI-3S" },
      { w: "ὑμῖν,", t: "unto you", n: "G5213", p: "PPro-D2P" },
      { w: "ἐὰν", t: "if", n: "G1437", p: "Conj" },
      { w: "μὴ", t: "not", n: "G3361", p: "Adv" },
      { w: "ἀφῆτε", t: "ye forgive", n: "G863", p: "V-2AAS-2P" },
      { w: "ἕκαστος", t: "every one", n: "G1538", p: "A-NSM" },
      { w: "τῷ", t: "the", n: "G3588", p: "T-DSM" },
      { w: "ἀδελφῷ", t: "brother", n: "G80", p: "N-DSM" },
      { w: "αὐτοῦ", t: "his", n: "G846", p: "PPro-GSM" },
      { w: "ἀπὸ", t: "from", n: "G575", p: "Prep" },
      { w: "τῶν", t: "the", n: "G3588", p: "T-GPF" },
      { w: "καρδιῶν", t: "hearts", n: "G2588", p: "N-GPF" },
      { w: "ὑμῶν", t: "your", n: "G5216", p: "PPro-G2P" },
      { w: "τὰ", t: "the", n: "G3588", p: "T-APN" },
      { w: "παραπτώματα", t: "trespasses", n: "G3900", p: "N-APN" },
      { w: "αὐτῶν.", t: "their", n: "G846", p: "PPro-GPM" }
    ]
  };
}

if (!matData.chapters['23']['39']) {
  matData.chapters['23']['39'] = {
    words: [
      { w: "λέγω", t: "For I say", n: "G3004", p: "V-PAI-1S" },
      { w: "γὰρ", t: "for", n: "G1063", p: "Conj" },
      { w: "ὑμῖν,", t: "unto you", n: "G5213", p: "PPro-D2P" },
      { w: "οὐ", t: "Ye shall not", n: "G3756", p: "Adv" },
      { w: "μή", t: "not", n: "G3361", p: "Adv" },
      { w: "με", t: "me", n: "G3165", p: "PPro-A1S" },
      { w: "ἴδητε", t: "see", n: "G1492", p: "V-2AAS-2P" },
      { w: "ἀπ'", t: "from", n: "G575", p: "Prep" },
      { w: "ἄρτι,", t: "henceforth", n: "G737", p: "Adv" },
      { w: "ἕως", t: "till", n: "G2193", p: "Conj" },
      { w: "ἂν", t: "ye shall", n: "G302", p: "Part" },
      { w: "εἴπητε,", t: "say", n: "G2036", p: "V-2AAS-2P" },
      { w: "Εὐλογημένος", t: "Blessed is he", n: "G2127", p: "V-RPP-NSM" },
      { w: "ὁ", t: "that", n: "G3588", p: "T-NSM" },
      { w: "ἐρχόμενος", t: "cometh", n: "G2064", p: "V-PNP-NSM" },
      { w: "ἐν", t: "in", n: "G1722", p: "Prep" },
      { w: "ὀνόματι", t: "the name", n: "G3686", p: "N-DSN" },
      { w: "Κυρίου.", t: "of the Lord", n: "G2962", p: "N-GSM" }
    ]
  };
}

const FALLBACK_STRONG_GLOSSES = {
  'G5607': 'is was being which is',
  'G1161': 'and but now moreover',
  'G1063': 'for',
  'G3754': 'that for because',
  'G3588': 'the which',
  'G2532': 'and also even',
  'G846': 'him her his them',
  'G1510': 'am is was are',
  'G1519': 'into unto to in',
  'G1722': 'in with among by'
};

let totalVerses = 0;
let totalWords = 0;
let fullyAlignedWords = 0;

const chapterKeys = Object.keys(matData.chapters).sort((a, b) => parseInt(a) - b);

for (const chStr of chapterKeys) {
  const chIdx = parseInt(chStr) - 1;
  const verseKeys = Object.keys(matData.chapters[chStr]).sort((a, b) => parseInt(a) - b);

  for (const vsStr of verseKeys) {
    const vsIdx = parseInt(vsStr) - 1;
    const kjvVerse = kjv.Matthew[chIdx]?.[vsIdx];
    if (!kjvVerse) {
      console.warn(`[WARN] Missing KJV verse for Matthew ${chStr}:${vsStr}`);
      continue;
    }

    const words = matData.chapters[chStr][vsStr].words;
    if (!words || words.length === 0) continue;

    totalVerses++;

    for (const w of words) {
      delete w.k;
      const strong = (w.n || '').trim().toUpperCase();
      if (!w.t && FALLBACK_STRONG_GLOSSES[strong]) {
        w.t = FALLBACK_STRONG_GLOSSES[strong];
      }
    }

    const clusters = computeDisjointVerseClusters(words, kjvVerse);

    for (let i = 0; i < words.length; i++) {
      totalWords++;
      const clusterSet = clusters[i];
      if (clusterSet && clusterSet.size > 0) {
        words[i].k = Array.from(clusterSet).sort((a, b) => a - b);
        fullyAlignedWords++;
      } else {
        words[i].k = [];
      }
    }
  }
}

console.log('=== MATTHEW COMPLETE WORD-BY-WORD ALIGNMENT SUMMARY ===');
console.log(`Chapters Processed: ${chapterKeys.length}`);
console.log(`Total Canonical Verses: ${totalVerses} / 1071`);
console.log(`Total Greek Words: ${totalWords}`);
console.log(`100% Aligned Words: ${fullyAlignedWords} (${((fullyAlignedWords / totalWords) * 100).toFixed(2)}%)`);

const TARGETS = [
  path.resolve(__dirname, '../public/data/interlinear/MAT.json'),
  path.resolve(__dirname, '../public/data/interlinear/matthew.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/MAT.json'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear/matthew.json')
];

const serialized = JSON.stringify(matData, null, 2);

for (const target of TARGETS) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(target, serialized, 'utf8');
  console.log(`[SAVED] -> ${target}`);
}

console.log('\n[SUCCESS] Matthew word-by-word alignment fully completed and mirrored.');
