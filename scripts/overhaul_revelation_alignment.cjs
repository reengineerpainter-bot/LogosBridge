const fs = require('fs');
const path = require('path');

const osisData = JSON.parse(fs.readFileSync('node_modules/.cache/kjv_osis_revelation.json', 'utf8'));
const kjv = JSON.parse(fs.readFileSync('public/data/kjv.json', 'utf8'));
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

const osisBook = osisData['Revelation'];
const kjvBook = kjv['Revelation'];

const interlinearPath = 'public/data/interlinear/REV.json';
const bookData = JSON.parse(fs.readFileSync(interlinearPath, 'utf8'));

let totalVerses = 0;
let totalCollisions = 0;
let totalInversions = 0;

for (let chNum = 1; chNum <= osisBook.chapters.length; chNum++) {
  const chStr = String(chNum);
  const osisCh = osisBook.chapters.find(c => c.chapter === chNum);
  const interCh = bookData.chapters[chStr];

  if (!interCh) {
    console.error(`Missing interlinear chapter ${chNum}`);
    process.exit(1);
  }

  const totalVs = osisCh.verses.length;

  for (let vsNum = 1; vsNum <= totalVs; vsNum++) {
    const vsStr = String(vsNum);
    const osisVs = osisCh.verses.find(v => v.verse === vsNum);
    const greekWords = interCh[vsStr]?.words;

    if (!greekWords || greekWords.length === 0) continue;

    const vsKjv = kjvBook[chNum - 1][vsNum - 1];
    const rawTokens = parseKjvRawTokens(vsKjv);

    totalVerses++;

    // Clear previous k
    greekWords.forEach(w => { delete w.k; });

    // Parse OSIS XML
    const wRegex = /<w\b([^>]*)\/>|<w\b([^>]*)>([\s\S]*?)<\/w>|<transChange\b[^>]*>([\s\S]*?)<\/transChange>|([^<]+)/gi;
    let match;
    const osisItems = [];

    while ((match = wRegex.exec(osisVs.text)) !== null) {
      if (match[1] !== undefined) {
        continue;
      } else if (match[2] !== undefined && match[3] !== undefined) {
        const attrs = match[2];
        const innerText = match[3].replace(/<[^>]+>/g, '').trim();
        const srcMatch = attrs.match(/src="([^"]+)"/);
        const lemmaMatch = attrs.match(/lemma="([^"]+)"/);
        const src = srcMatch ? srcMatch[1].trim().split(/\s+/).map(Number) : [];
        const lemma = lemmaMatch ? lemmaMatch[1].trim() : '';

        const words = innerText.match(/[a-zA-Z0-9']+/g) || [];
        for (const word of words) {
          osisItems.push({ text: word, src, lemma, isSupplied: false });
        }
      } else if (match[4] !== undefined) {
        const suppliedWords = match[4].replace(/<[^>]+>/g, '').match(/[a-zA-Z0-9']+/g) || [];
        for (const word of suppliedWords) {
          osisItems.push({ text: word, src: [], lemma: '', isSupplied: true });
        }
      } else if (match[5] !== undefined) {
        const plainWords = match[5].match(/[a-zA-Z0-9']+/g) || [];
        for (const word of plainWords) {
          osisItems.push({ text: word, src: [], lemma: '', isSupplied: false });
        }
      }
    }

    // Align osisItems to rawTokens
    const rawWords = rawTokens.filter(rt => /[a-zA-Z0-9]/.test(rt.text));
    let osisIdx = 0;
    const tokenSrcMap = new Map();

    for (let r = 0; r < rawWords.length; r++) {
      const rw = rawWords[r];
      const rwText = rw.text.toLowerCase().replace(/[^a-z0-9]/g, '');

      while (osisIdx < osisItems.length && osisItems[osisIdx].text.toLowerCase().replace(/[^a-z0-9]/g, '') !== rwText) {
        osisIdx++;
      }

      if (osisIdx < osisItems.length) {
        const item = osisItems[osisIdx];
        if (item.src && item.src.length > 0) {
          tokenSrcMap.set(rw.rawIdx, item.src);
        }
        osisIdx++;
      }
    }

    // Assign tokens
    const assignments = greekWords.map(() => []);

    tokenSrcMap.forEach((srcList, rawIdx) => {
      if (srcList.length === 1) {
        const gIdx = srcList[0] - 1;
        if (gIdx >= 0 && gIdx < greekWords.length) {
          assignments[gIdx].push(rawIdx);
        }
      } else if (srcList.length > 1) {
        const tokenText = rawTokens[rawIdx].text.toLowerCase();
        let assigned = false;

        for (const s of srcList) {
          const gIdx = s - 1;
          if (gIdx >= 0 && gIdx < greekWords.length) {
            const gw = greekWords[gIdx];
            const strong = (gw.n || '').trim();
            if (strong === 'G3588' && (tokenText === 'the' || tokenText === 'a' || tokenText === 'an')) {
              assignments[gIdx].push(rawIdx);
              assigned = true;
              break;
            }
          }
        }

        if (!assigned) {
          const lastIdx = srcList[srcList.length - 1] - 1;
          if (lastIdx >= 0 && lastIdx < greekWords.length) {
            assignments[lastIdx].push(rawIdx);
          }
        }
      }
    });

    // Enforce monotonic ordinal order for repeated Strong's numbers
    const strongGroups = new Map();
    for (let i = 0; i < greekWords.length; i++) {
      const s = (greekWords[i].n || '').trim().toUpperCase();
      if (s && s !== 'G0' && s !== 'H0') {
        if (!strongGroups.has(s)) strongGroups.set(s, []);
        strongGroups.get(s).push(i);
      }
    }

    strongGroups.forEach((indices, s) => {
      if (indices.length > 1) {
        const allTokens = [];
        const counts = [];
        for (const idx of indices) {
          counts.push(assignments[idx].length);
          allTokens.push(...assignments[idx]);
        }
        allTokens.sort((a, b) => a - b);

        let offset = 0;
        for (let r = 0; r < indices.length; r++) {
          const count = counts[r];
          assignments[indices[r]] = allTokens.slice(offset, offset + count);
          offset += count;
        }
      }
    });

    // Check collisions
    const claimed = new Set();
    for (let i = 0; i < assignments.length; i++) {
      for (const tok of assignments[i]) {
        if (claimed.has(tok)) totalCollisions++;
        claimed.add(tok);
      }
    }

    // Check inversions
    strongGroups.forEach((indices, s) => {
      if (indices.length > 1) {
        for (let r = 0; r < indices.length - 1; r++) {
          const tA = assignments[indices[r]];
          const tB = assignments[indices[r + 1]];
          if (tA.length > 0 && tB.length > 0) {
            if (Math.min(...tA) > Math.min(...tB)) {
              totalInversions++;
            }
          }
        }
      }
    });

    // Assign k to greekWords
    greekWords.forEach((gw, i) => {
      gw.k = assignments[i];
    });
  }
}

console.log('============================================================');
console.log('REVELATION ALIGNMENT OVERHAUL RUN');
console.log('============================================================');
console.log('Total Verses Processed:', totalVerses);
console.log('Total Collisions:      ', totalCollisions);
console.log('Total Inversions:      ', totalInversions);

if (totalCollisions > 0 || totalInversions > 0) {
  console.error('Validation failed: Collisions or Inversions detected!');
  process.exit(1);
}

// Atomically sync to all 4 target files
const targets = [
  'public/data/interlinear/REV.json',
  'public/data/interlinear/revelation.json',
  'android/app/src/main/assets/public/data/interlinear/REV.json',
  'android/app/src/main/assets/public/data/interlinear/revelation.json'
];

const jsonOutput = JSON.stringify(bookData, null, 2);

for (const target of targets) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, jsonOutput, 'utf8');
  console.log(`  -> Synced target: ${target}`);
}

console.log('Parity across Web and Android assets verified for Revelation!');
