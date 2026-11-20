const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'public', 'data', 'strongs_study_db.json');
const SRC_DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

const OUT_LEXICON_PATH = path.join(SRC_DATA_DIR, 'lexicon_db.json');
const OUT_EXEGESIS_PATH = path.join(SRC_DATA_DIR, 'verse_exegesis_db.json');
const OUT_ANATOMY_PATH = path.join(SRC_DATA_DIR, 'verse_anatomy.json');

if (!fs.existsSync(INPUT_PATH)) {
  console.error(`Error: Source database not found at ${INPUT_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(SRC_DATA_DIR)) {
  fs.mkdirSync(SRC_DATA_DIR, { recursive: true });
}

console.log(`Reading source data from: ${INPUT_PATH}...`);
const rawData = fs.readFileSync(INPUT_PATH, 'utf8');
const sourceDb = JSON.parse(rawData);

const wordStudies = sourceDb.wordStudies || [];
const verseAnatomy = sourceDb.verseAnatomy || [];

console.log(`Found ${wordStudies.length} word studies and ${verseAnatomy.length} verse anatomy records.`);

// 1. Build lexicon_db.json (Keyed by Strong's number, author-neutral fields)
const lexiconDb = {};
const verseExegesisList = [];

for (const entry of wordStudies) {
  const strongs = entry.strongsNumber ? entry.strongsNumber.trim().toUpperCase() : '';
  if (!strongs) continue;

  if (!lexiconDb[strongs]) {
    lexiconDb[strongs] = {
      strongsNumber: strongs,
      originalWord: entry.originalWord || '',
      partOfSpeech: entry.partOfSpeech || '',
      coreMeaning: entry.coreMeaning || '',
      wordHistory: entry.wordHistory || '',
      ancientWorldview: entry.ancientWorldview || ''
    };
  }

  // 2. Build verse_exegesis_db.json (Verse-bound commentary)
  const canonicalLexicon = lexiconDb[strongs];
  const exegesisItem = {
    id: entry.id || `${entry.verseReference ? entry.verseReference.replace(/[\s:]+/g, '-') : 'word'}-${strongs}`,
    verseReference: entry.verseReference || '',
    strongsNumber: strongs,
    writersIntent: entry.writersIntent || '',
    theTrueAnchor: entry.theTrueAnchor || entry.spiritualAndCovenantReality || '',
    spiritualAndCovenantReality: entry.spiritualAndCovenantReality || entry.theTrueAnchor || ''
  };

  // If this verse instance had inflected or variant lexical text differing from the primary lexicon entry,
  // preserve it as an override so absolutely zero data is lost.
  if (entry.originalWord && entry.originalWord !== canonicalLexicon.originalWord) {
    exegesisItem.originalWord = entry.originalWord;
  }
  if (entry.coreMeaning && entry.coreMeaning !== canonicalLexicon.coreMeaning) {
    exegesisItem.coreMeaning = entry.coreMeaning;
  }
  if (entry.wordHistory && entry.wordHistory !== canonicalLexicon.wordHistory) {
    exegesisItem.wordHistory = entry.wordHistory;
  }
  if (entry.ancientWorldview && entry.ancientWorldview !== canonicalLexicon.ancientWorldview) {
    exegesisItem.ancientWorldview = entry.ancientWorldview;
  }

  verseExegesisList.push(exegesisItem);
}

// Write files
console.log(`Writing lexicon database (${Object.keys(lexiconDb).length} unique Strong's entries) to: ${OUT_LEXICON_PATH}`);
fs.writeFileSync(OUT_LEXICON_PATH, JSON.stringify(lexiconDb, null, 2), 'utf8');

console.log(`Writing verse exegesis database (${verseExegesisList.length} commentary records) to: ${OUT_EXEGESIS_PATH}`);
fs.writeFileSync(OUT_EXEGESIS_PATH, JSON.stringify(verseExegesisList, null, 2), 'utf8');

console.log(`Writing verse anatomy database (${verseAnatomy.length} records) to: ${OUT_ANATOMY_PATH}`);
fs.writeFileSync(OUT_ANATOMY_PATH, JSON.stringify(verseAnatomy, null, 2), 'utf8');

console.log('Migration completed successfully!');
