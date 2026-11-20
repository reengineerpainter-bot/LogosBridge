const fs = require('fs');
const path = require('path');

const interlinearDir = 'c:/Users/PEEDEE/Downloads/LogosBridge-main/LogosBridge-main/public/data/interlinear';
const outputFile = 'c:/Users/PEEDEE/Downloads/LogosBridge-main/LogosBridge-main/lexicon_queue.json';

console.log('Scanning all 66 canonical books in', interlinearDir, '...');
const files = fs.readdirSync(interlinearDir).filter(f => f.endsWith('.json'));

const queueMap = new Map();

for (const file of files) {
  const fullPath = path.join(interlinearDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const bookName = data.book;
  const lang = data.language; // "Hebrew" | "Greek"

  for (const [chNum, chObj] of Object.entries(data.chapters || {})) {
    for (const [vNum, vObj] of Object.entries(chObj || {})) {
      const ref = `${bookName} ${chNum}:${vNum}`;
      for (const w of vObj.words || []) {
        const num = w.n;
        if (!num) continue;

        if (!queueMap.has(num)) {
          queueMap.set(num, {
            strongs: num,
            language: lang,
            w: w.w || '',
            t: w.t || '',
            parsingTags: new Set(),
            firstOccurrence: ref,
            occurrences: 0,
            scripts: new Map(),
            glosses: new Map()
          });
        }

        const entry = queueMap.get(num);
        entry.occurrences++;
        if (w.p) entry.parsingTags.add(w.p);

        // Count most frequent lemma representation
        if (w.w) {
          entry.scripts.set(w.w, (entry.scripts.get(w.w) || 0) + 1);
        }
        if (w.t) {
          entry.glosses.set(w.t, (entry.glosses.get(w.t) || 0) + 1);
        }
      }
    }
  }
}

console.log(`Aggregated ${queueMap.size} unique Strong's entries.`);

// Finalize queue items
const finalizedQueue = [];
for (const [strongs, data] of queueMap.entries()) {
  // Determine top script
  let bestScript = data.w;
  let maxScriptCount = 0;
  for (const [s, count] of data.scripts.entries()) {
    if (count > maxScriptCount) {
      maxScriptCount = count;
      bestScript = s;
    }
  }

  // Determine top gloss
  let bestGloss = data.t;
  let maxGlossCount = 0;
  for (const [g, count] of data.glosses.entries()) {
    if (count > maxGlossCount) {
      maxGlossCount = count;
      bestGloss = g;
    }
  }

  finalizedQueue.push({
    strongs: data.strongs,
    language: data.language,
    w: bestScript,
    t: bestGloss,
    firstOccurrence: data.firstOccurrence,
    occurrences: data.occurrences,
    parsingTags: Array.from(data.parsingTags).slice(0, 5)
  });
}

// Sort Hebrew then Greek, numerically
finalizedQueue.sort((a, b) => {
  const prefixA = a.strongs.charAt(0);
  const prefixB = b.strongs.charAt(0);
  if (prefixA !== prefixB) {
    return prefixA === 'H' ? -1 : 1;
  }
  const numA = parseInt(a.strongs.slice(1), 10) || 0;
  const numB = parseInt(b.strongs.slice(1), 10) || 0;
  return numA - numB;
});

fs.writeFileSync(outputFile, JSON.stringify(finalizedQueue, null, 2));

const hebrewCount = finalizedQueue.filter(q => q.strongs.startsWith('H')).length;
const greekCount = finalizedQueue.filter(q => q.strongs.startsWith('G')).length;

console.log(`Saved queue to ${outputFile}`);
console.log(`Total: ${finalizedQueue.length} (Hebrew H: ${hebrewCount}, Greek G: ${greekCount})`);
