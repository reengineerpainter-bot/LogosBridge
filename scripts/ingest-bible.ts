import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Books abbreviations to Full Names mapping based on thiagobodruk/bible format
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

async function run() {
  const args = process.argv.slice(2);
  const translationId = args[0]; // e.g. "KJV"
  const jsonPath = args[1]; // e.g. "en_kjv.json"

  if (!translationId || !jsonPath) {
    console.error("Usage: ts-node ingest-bible.ts <TranslationID> <PathToJson>");
    process.exit(1);
  }

  if (admin.apps.length === 0) {
    let credential;
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.warn("Error reading serviceAccountKey.json:", e);
      console.warn("Falling back to application default credentials...");
    }

    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      credential: credential
    });
  }

  let sa;
  try {
    sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
  } catch (e) {
  }

  const db = new admin.firestore.Firestore({
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    credentials: sa ? {
      client_email: sa.client_email,
      private_key: sa.private_key
    } : undefined
  });

  const fullPath = path.resolve(jsonPath);
  console.log(`Reading JSON from: ${fullPath}`);
  const rawData = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
  const bibleData = JSON.parse(rawData);

  console.log(`Starting ingest for Translation: ${translationId}...`);

  let batch = db.batch();
  let operationCount = 0;
  let totalChapters = 0;

  for (const book of bibleData) {
    const bookName = bookAbbreviations[book.abbrev] || book.abbrev;
    
    for (let chapterIndex = 0; chapterIndex < book.chapters.length; chapterIndex++) {
      const chapterNumber = chapterIndex + 1;
      const versesArray = book.chapters[chapterIndex];
      
      const versesObj: Record<string, string> = {};
      for (let verseIndex = 0; verseIndex < versesArray.length; verseIndex++) {
        versesObj[(verseIndex + 1).toString()] = versesArray[verseIndex];
      }

      const chapterRef = db.collection('translations')
                           .doc(translationId)
                           .collection('books')
                           .doc(bookName)
                           .collection('chapters')
                           .doc(chapterNumber.toString());

      batch.set(chapterRef, {
        bookName: bookName,
        chapterNumber: chapterNumber,
        verses: versesObj
      });

      operationCount++;
      totalChapters++;

      // Commit the batch every 400 operations (Firestore limit is 500)
      if (operationCount >= 400) {
        console.log(`Committing batch... (${totalChapters} chapters queued)`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Successfully ingested ${totalChapters} chapters for ${translationId}!`);
}

run().catch(console.error);
