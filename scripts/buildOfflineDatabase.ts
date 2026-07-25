import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Books abbreviations mapping
const bookAbbreviations: Record<string, string> = {
  "gn": "Genesis", "ex": "Exodus", "lv": "Leviticus", "nm": "Numbers", "dt": "Deuteronomy",
  "js": "Joshua", "jz": "Judges", "rt": "Ruth", "1sm": "1 Samuel", "2sm": "2 Samuel",
  "1rs": "1 Kings", "2rs": "2 Kings", "1cr": "1 Chronicles", "2cr": "2 Chronicles",
  "ed": "Ezra", "ne": "Nehemiah", "et": "Esther", "job": "Job", "sl": "Psalms",
  "pv": "Proverbs", "ec": "Ecclesiastes", "ct": "Song of Solomon", "is": "Isaiah",
  "jr": "Jeremiah", "lm": "Lamentations", "ez": "Ezekiel", "dn": "Daniel", "os": "Hosea",
  "jl": "Joel", "am": "Amos", "ob": "Obadiah", "jn": "Jonah", "mq": "Micah", "na": "Nahum",
  "hc": "Habakkuk", "sf": "Zephaniah", "ag": "Haggai", "zc": "Zechariah", "ml": "Malachi",
  "mt": "Matthew", "mc": "Mark", "lc": "Luke", "jo": "John", "at": "Acts", "rm": "Romans",
  "1co": "1 Corinthians", "2co": "2 Corinthians", "gl": "Galatians", "ef": "Ephesians",
  "fp": "Philippians", "cl": "Colossians", "1ts": "1 Thessalonians", "2ts": "2 Thessalonians",
  "1tm": "1 Timothy", "2tm": "2 Timothy", "tt": "Titus", "fm": "Philemon", "hb": "Hebrews",
  "tg": "James", "1pe": "1 Peter", "2pe": "2 Peter", "1jo": "1 John", "2jo": "2 John",
  "3jo": "3 John", "jd": "Jude", "ap": "Revelation"
};

async function buildDatabase() {
  console.log("Initializing Firebase Admin...");
  let sa;
  try {
    sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
  } catch (e) {
    console.warn("Could not load serviceAccountKey.json");
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      credential: sa ? admin.credential.cert(sa) : undefined
    });
  }

  const db = new admin.firestore.Firestore({
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    credentials: sa ? {
      client_email: sa.client_email,
      private_key: sa.private_key
    } : undefined
  });

  const kjvPath = path.resolve(process.cwd(), 'node_modules', '.cache', 'temp_kjv.json');
  const bsbPath = path.resolve(process.cwd(), 'node_modules', '.cache', 'temp_bsb.json');

  if (!fs.existsSync(kjvPath) || !fs.existsSync(bsbPath)) {
    console.error("Missing local JSON files for KJV or BSB in node_modules/.cache/");
    process.exit(1);
  }

  console.log("Loading KJV and BSB JSON files...");
  const kjvData = JSON.parse(fs.readFileSync(kjvPath, 'utf8').replace(/^\uFEFF/, ''));
  const bsbData = JSON.parse(fs.readFileSync(bsbPath, 'utf8').replace(/^\uFEFF/, ''));

  let batch = db.batch();
  let operationCount = 0;
  let totalChaptersUploaded = 0;

  console.log("Constructing unified chapters and pushing to Firestore...");

  for (let b = 0; b < kjvData.length; b++) {
    const bookAbbrev = kjvData[b].abbrev;
    const bookName = bookAbbreviations[bookAbbrev] || kjvData[b].name;
    const kjvChapters = kjvData[b].chapters;
    const bsbChapters = bsbData[b]?.chapters;

    if (!bsbChapters) {
      console.warn(`BSB missing book ${bookName}. Skipping...`);
      continue;
    }

    for (let c = 0; c < kjvChapters.length; c++) {
      const chapterNum = c + 1;
      const kjvVerses = kjvChapters[c];
      const bsbVerses = bsbChapters[c] || [];

      const maxVerses = Math.max(kjvVerses.length, bsbVerses.length);
      const unifiedVerses = [];

      for (let v = 0; v < maxVerses; v++) {
        unifiedVerses.push({
          verseNumber: v + 1,
          kjvText: kjvVerses[v] || "",
          bsbText: bsbVerses[v] || "",
          contemporary: "",
          nonNativeEnglish: "",
          specialWords: []
        });
      }

      const docId = `${bookName.replace(/\s+/g, '')}_${chapterNum}`;
      const docRef = db.collection('chapters').doc(docId);

      batch.set(docRef, {
        book: bookName,
        chapter: chapterNum,
        verses: unifiedVerses,
        isHighFidelity: true,
        source: 'local_database_build',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      operationCount++;
      totalChaptersUploaded++;

      // Firestore allows max 500 writes per batch
      if (operationCount === 400) {
        console.log(`Committing batch... (${totalChaptersUploaded} chapters uploaded so far)`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    console.log(`Committing final batch... (${totalChaptersUploaded} chapters total)`);
    await batch.commit();
  }

  console.log("✅ Successfully built and uploaded entire offline database!");
  process.exit(0);
}

buildDatabase().catch(console.error);
