const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'public', 'data');

const LEXICON_PATH = path.join(SRC_DATA_DIR, 'lexicon_db.json');
const EXEGESIS_PATH = path.join(SRC_DATA_DIR, 'verse_exegesis_db.json');
const ANATOMY_PATH = path.join(SRC_DATA_DIR, 'verse_anatomy.json');
const OUTPUT_PATH = path.join(PUBLIC_DATA_DIR, 'strongs_study_db.json');
const ANDROID_OUTPUT_PATH = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'assets', 'public', 'data', 'strongs_study_db.json');

console.log('--- Compiling Strongs Study Database ---');

if (!fs.existsSync(LEXICON_PATH)) {
  console.error(`Error: Lexicon source file not found at ${LEXICON_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(EXEGESIS_PATH)) {
  console.error(`Error: Verse exegesis source file not found at ${EXEGESIS_PATH}`);
  process.exit(1);
}

const lexiconDb = JSON.parse(fs.readFileSync(LEXICON_PATH, 'utf8'));
const exegesisDbRaw = JSON.parse(fs.readFileSync(EXEGESIS_PATH, 'utf8'));

// Support both array or object with exegesis property
const exegesisList = Array.isArray(exegesisDbRaw) 
  ? exegesisDbRaw 
  : (exegesisDbRaw.wordStudies || exegesisDbRaw.exegesis || []);

// Load verse anatomy if available
let verseAnatomy = [];
if (fs.existsSync(ANATOMY_PATH)) {
  verseAnatomy = JSON.parse(fs.readFileSync(ANATOMY_PATH, 'utf8'));
} else if (exegesisDbRaw.verseAnatomy && Array.isArray(exegesisDbRaw.verseAnatomy)) {
  verseAnatomy = exegesisDbRaw.verseAnatomy;
}

const compiledWordStudies = [];

for (const entry of exegesisList) {
  const strongs = entry.strongsNumber ? entry.strongsNumber.trim().toUpperCase() : '';
  const lex = lexiconDb[strongs] || {};

  const cleanRef = (entry.verseReference || '').replace(/[\s:]+/g, '-');
  const id = entry.id || `${cleanRef}-${strongs}`;

  const compiledEntry = {
    id,
    verseReference: entry.verseReference || '',
    strongsNumber: strongs,
    originalWord: entry.originalWord || lex.originalWord || '',
    coreMeaning: entry.coreMeaning || lex.coreMeaning || '',
    wordHistory: entry.wordHistory || lex.wordHistory || '',
    ancientWorldview: entry.ancientWorldview || lex.ancientWorldview || '',
    writersIntent: entry.writersIntent || '',
    spiritualAndCovenantReality: entry.spiritualAndCovenantReality || entry.theTrueAnchor || '',
    theTrueAnchor: entry.theTrueAnchor || entry.spiritualAndCovenantReality || ''
  };

  compiledWordStudies.push(compiledEntry);
}

// Also ensure all lexical entries from lexicon_db are present in wordStudies for global Strong's lookup
const coveredStrongs = new Set(compiledWordStudies.map(w => w.strongsNumber));
for (const [strongs, lex] of Object.entries(lexiconDb)) {
  if (!coveredStrongs.has(strongs)) {
    compiledWordStudies.push({
      id: `Lexicon-${strongs}`,
      verseReference: '',
      strongsNumber: strongs,
      originalWord: lex.originalWord || '',
      coreMeaning: lex.coreMeaning || '',
      wordHistory: lex.wordHistory || '',
      ancientWorldview: lex.ancientWorldview || '',
      writersIntent: '',
      spiritualAndCovenantReality: '',
      theTrueAnchor: ''
    });
    coveredStrongs.add(strongs);
  }
}

const outputDb = {
  verseAnatomy,
  wordStudies: compiledWordStudies
};

if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputDb, null, 2), 'utf8');
console.log(`Successfully compiled ${compiledWordStudies.length} word studies & ${verseAnatomy.length} verse anatomy records to:`);
console.log(`  -> ${OUTPUT_PATH}`);

// Also update Android asset copy if the folder exists
if (fs.existsSync(path.dirname(ANDROID_OUTPUT_PATH))) {
  try {
    fs.writeFileSync(ANDROID_OUTPUT_PATH, JSON.stringify(outputDb, null, 2), 'utf8');
    console.log(`  -> Synced to Android assets: ${ANDROID_OUTPUT_PATH}`);
  } catch (err) {
    console.warn(`  Warning: Could not sync to Android assets: ${err.message}`);
  }
}

console.log('--- Strongs Study Database Compilation Complete ---');
