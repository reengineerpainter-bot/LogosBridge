import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let sa;
try {
  sa = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
} catch (e) {}

const db = new admin.firestore.Firestore({
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  credentials: sa ? {
    client_email: sa.client_email,
    private_key: sa.private_key
  } : undefined
});

async function run() {
    const translations = ['bbe', 'ylt', 'asv'];
    
    for (const trans of translations) {
        console.log(`\n--- TRANSLATION: ${trans} ---`);
        const booksRef = db.collection('translations').doc(trans).collection('books');
        const docs = await booksRef.listDocuments();
        const availableAbbrevs = docs.map(d => d.id);
        
        console.log(`Available abbrevs: ${availableAbbrevs.join(', ')}`);
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
