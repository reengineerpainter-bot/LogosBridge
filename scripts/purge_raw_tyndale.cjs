const fs = require('fs');
const path = require('path');

const publicDir = path.resolve('public/data/lexicon');
const androidDir = path.resolve('android/app/src/main/assets/public/data/lexicon');
const legacyScript = path.resolve('scripts/import_tyndale_lexicon.cjs');

console.log('=== Selective Purge: Removing Raw Tyndale Baseline Files ===');

if (!fs.existsSync(publicDir)) {
  console.error(`Directory not found: ${publicDir}`);
  process.exit(1);
}

const allFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.json'));
console.log(`Total files scanned: ${allFiles.length}`);

let preservedCount = 0;
let deletedCount = 0;
const preservedList = [];

for (const file of allFiles) {
  const publicPath = path.join(publicDir, file);
  const androidPath = path.join(androidDir, file);

  try {
    const data = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
    const isGeminiEnriched = data && data.ane_historical_context && data.needs_enrichment === false;

    if (isGeminiEnriched) {
      preservedCount++;
      preservedList.push({
        strongs: data.strongs,
        lemma: data.lemma,
        transliteration: data.transliteration,
        root_action: data.root_action
      });
    } else {
      // Purge raw baseline
      if (fs.existsSync(publicPath)) {
        fs.unlinkSync(publicPath);
      }
      if (fs.existsSync(androidPath)) {
        fs.unlinkSync(androidPath);
      }
      deletedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

// Remove legacy import script
if (fs.existsSync(legacyScript)) {
  fs.unlinkSync(legacyScript);
  console.log(`Deleted legacy script: ${legacyScript}`);
} else {
  console.log(`Legacy script ${legacyScript} already removed or not found.`);
}

console.log('\n=== PURGE REPORT ===');
console.log(`Deleted Raw Baseline Files: ${deletedCount}`);
console.log(`Preserved Gemini-Enriched Files: ${preservedCount}`);

console.log('\nPreserved Enriched Entries:');
preservedList.forEach(p => {
  console.log(`  - [${p.strongs}] ${p.lemma} (${p.transliteration}): "${p.root_action}"`);
});

// Assert benchmarks exist
const benchmarks = ['G2889', 'G3004', 'H1254', 'H2617'];
console.log('\nBenchmark Standards Verification:');
for (const b of benchmarks) {
  const pExists = fs.existsSync(path.join(publicDir, `${b}.json`));
  const aExists = fs.existsSync(path.join(androidDir, `${b}.json`));
  console.log(`  - ${b}: public=${pExists ? 'OK' : 'MISSING'}, android=${aExists ? 'OK' : 'MISSING'}`);
}
