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
    const doc = await db.collection('translations').doc('ylt').collection('books').doc('I Samuel').get();
    console.log('I Samuel exists?', doc.exists);

    const doc2 = await db.collection('translations').doc('ylt').collection('books').doc('I Samuel').collection('chapters').doc('1').get();
    console.log('I Samuel chapter 1 exists?', doc2.exists);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
