/**
 * Developer Script: Batch Generator for Triad Cross-References Database
 * 
 * Usage:
 *   node scripts/generate_triad_cross_references.cjs "Mark 11:22" "And Jesus answering saith unto them, Have faith in God."
 *   node scripts/generate_triad_cross_references.cjs --file verses.txt
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../src/data/triad_cross_references.json');
const PUBLIC_DB_PATH = path.resolve(__dirname, '../public/data/triad_cross_references.json');
const API_URL = process.env.API_URL || 'http://localhost:3000/api/cross-references';

async function scanVerse(verseReference, verseText = '', subject = '', action = '', object = '') {
  console.log(`[Developer Scanner] Querying strict triad matches for: ${verseReference}...`);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseReference, verseText, subject, action, object })
    });

    if (!res.ok) {
      console.error(`[Error] HTTP ${res.status} from API endpoint`);
      return null;
    }

    const data = await res.json();
    const refs = Array.isArray(data.references) ? data.references : [];
    console.log(`[Result] ${verseReference} => ${JSON.stringify(refs)}`);
    return refs;
  } catch (err) {
    console.error(`[Error] Failed to connect to ${API_URL}:`, err.message);
    return null;
  }
}

function updateDatabase(verseReference, references) {
  let db = {};
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {}
  }

  db[verseReference] = references;
  const formatted = JSON.stringify(db, null, 2);

  fs.writeFileSync(DB_PATH, formatted, 'utf8');
  console.log(`[Saved] Updated ${DB_PATH}`);

  if (fs.existsSync(path.dirname(PUBLIC_DB_PATH))) {
    fs.writeFileSync(PUBLIC_DB_PATH, formatted, 'utf8');
    console.log(`[Saved] Synchronized ${PUBLIC_DB_PATH}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/generate_triad_cross_references.cjs "<Reference>" "<Verse Text>"');
    console.log('Example: node scripts/generate_triad_cross_references.cjs "Mark 11:22" "Have faith in God."');
    process.exit(0);
  }

  const verseRef = args[0];
  const verseText = args[1] || '';

  const refs = await scanVerse(verseRef, verseText);
  if (refs !== null) {
    updateDatabase(verseRef, refs);
  }
}

main();
