const fs = require('fs');
const path = require('path');

const osisRom = JSON.parse(fs.readFileSync('node_modules/.cache/kjv_osis_romans.json', 'utf8'));
const rom = JSON.parse(fs.readFileSync('public/data/interlinear/ROM.json', 'utf8'));
const kjv = JSON.parse(fs.readFileSync('public/data/kjv.json', 'utf8'));
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

// Ensure Romans 16:27 exists in rom data
if (!rom.chapters['16']['27']) {
  rom.chapters['16']['27'] = {
    words: [
      { w: "μόνῳ", t: "only", n: "G3441", p: "A-DSM" },
      { w: "σοφῷ", t: "wise", n: "G4680", p: "A-DSM" },
      { w: "Θεῷ,", t: "To God", n: "G2316", p: "N-DSM" },
      { w: "διὰ", t: "through", n: "G1223", p: "Prep" },
      { w: "Ἰησοῦ", t: "Jesus", n: "G2424", p: "N-GSM" },
      { w: "Χριστοῦ,", t: "Christ", n: "G5547", p: "N-GSM" },
      { w: "ᾧ", t: "be", n: "G3739", p: "R-DSM" },
      { w: "ἡ", t: "the", n: "G3588", p: "T-NSF" },
      { w: "δόξα", t: "glory", n: "G1391", p: "N-NSF" },
      { w: "εἰς", t: "for", n: "G1519", p: "Prep" },
      { w: "τοὺς", t: "the", n: "G3588", p: "T-APM" },
      { w: "αἰῶνας.", t: "ever", n: "G165", p: "N-APM" },
      { w: "Ἀμήν.", t: "Amen", n: "G281", p: "Heb" }
    ]
  };
}

let totalVerses = 0;
let totalCollisions = 0;
let totalInversions = 0;

for (let chNum = 1; chNum <= 16; chNum++) {
  const chStr = String(chNum);
  const osisCh = osisRom.chapters.find(c => c.chapter === chNum);
  const totalVs = osisCh.verses.length;

  for (let vsNum = 1; vsNum <= totalVs; vsNum++) {
    const vsStr = String(vsNum);
    const osisVs = osisCh.verses.find(v => v.verse === vsNum);
    const greekWords = rom.chapters[chStr][vsStr].words;
    const vsKjv = kjv['Romans'][chNum - 1][vsNum - 1];
    const rawTokens = parseKjvRawTokens(vsKjv);

    totalVerses++;

    // Clear previous k
    greekWords.forEach(w => { delete w.k; });

    // Parse OSIS XML into words with their src attributes
    // e.g. <w ... src="17">we know</w>
    // or <transChange type="added">his</transChange>
    // or plain text
    const wRegex = /<w\b([^>]*)\/>|<w\b([^>]*)>([\s\S]*?)<\/w>|<transChange\b[^>]*>([\s\S]*?)<\/transChange>|([^<]+)/gi;
    let match;
    const osisItems = [];

    while ((match = wRegex.exec(osisVs.text)) !== null) {
      if (match[1] !== undefined) {
        // Self-closing <w .../> tag has no English text (untranslated Greek word)
        continue;
      } else if (match[2] !== undefined && match[3] !== undefined) {
        // <w ...>text</w>
        const attrs = match[2];
        const innerText = match[3].replace(/<[^>]+>/g, '').trim();
        const srcMatch = attrs.match(/src="([^"]+)"/);
        const lemmaMatch = attrs.match(/lemma="([^"]+)"/);
        const src = srcMatch ? srcMatch[1].trim().split(/\s+/).map(Number) : [];
        const lemma = lemmaMatch ? lemmaMatch[1].trim() : '';

        // Extract individual English words from innerText
        const words = innerText.match(/[a-zA-Z0-9']+/g) || [];
        for (const word of words) {
          osisItems.push({ text: word, src, lemma, isSupplied: false });
        }
      } else if (match[4] !== undefined) {
        // <transChange ...>supplied</transChange>
        const suppliedWords = match[4].replace(/<[^>]+>/g, '').match(/[a-zA-Z0-9']+/g) || [];
        for (const word of suppliedWords) {
          osisItems.push({ text: word, src: [], lemma: '', isSupplied: true });
        }
      } else if (match[5] !== undefined) {
        // Plain text outside tags
        const plainWords = match[5].match(/[a-zA-Z0-9']+/g) || [];
        for (const word of plainWords) {
          osisItems.push({ text: word, src: [], lemma: '', isSupplied: false });
        }
      }
    }

    // Align osisItems to rawTokens
    const rawWords = rawTokens.filter(rt => /[a-zA-Z0-9]/.test(rt.text));
    let osisIdx = 0;
    const tokenSrcMap = new Map(); // rawIdx -> src[]

    for (let r = 0; r < rawWords.length; r++) {
      const rw = rawWords[r];
      const rwText = rw.text.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Advance osisIdx to match
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

    // Assign tokens to Greek words based on src
    const assignments = greekWords.map(() => []);

    tokenSrcMap.forEach((srcList, rawIdx) => {
      if (srcList.length === 1) {
        const gIdx = srcList[0] - 1;
        if (gIdx >= 0 && gIdx < greekWords.length) {
          assignments[gIdx].push(rawIdx);
        }
      } else if (srcList.length > 1) {
        // For compound sources (e.g. article + noun [4, 5]), map article to 'the' / 'a' / 'an'
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
          // If not an article, give to the last content word in srcList
          const lastIdx = srcList[srcList.length - 1] - 1;
          if (lastIdx >= 0 && lastIdx < greekWords.length) {
            assignments[lastIdx].push(rawIdx);
          }
        }
      }
    });

    // Enforce strict monotonic order for repeated Strong's numbers (User Directive)
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

    // Validate disjointness
    const claimed = new Set();
    for (let i = 0; i < greekWords.length; i++) {
      const k = assignments[i].sort((a,b) => a-b);
      greekWords[i].k = k;
      for (const idx of k) {
        if (claimed.has(idx)) {
          console.error(`COLLISION in Rom ${chNum}:${vsNum} at word ${i}, idx ${idx}`);
          totalCollisions++;
        }
        claimed.add(idx);
      }
    }

    // Validate monotonicity across identical Strong's instances
    for (let i = 0; i < greekWords.length; i++) {
      const wi = greekWords[i];
      if (!wi.k || wi.k.length === 0) continue;
      const minKi = Math.min(...wi.k);
      const sI = (wi.n || '').trim().toUpperCase();

      for (let j = i + 1; j < greekWords.length; j++) {
        const wj = greekWords[j];
        if (!wj.k || wj.k.length === 0) continue;
        const minKj = Math.min(...wj.k);
        const sJ = (wj.n || '').trim().toUpperCase();

        if (sI && sI !== 'G0' && sI !== 'H0' && sI === sJ) {
          if (minKi > minKj) {
            console.error(`INVERSION in Rom ${chNum}:${vsNum}: word ${i} [${sI}] k=${minKi} vs word ${j} [${sJ}] k=${minKj}`);
            totalInversions++;
          }
        }
      }
    }
  }
}

console.log('\n============================================================');
console.log('ROMANS PRODUCTION OVERHAUL RUN SUMMARY');
console.log('============================================================');
console.log(`Verses Processed:    ${totalVerses} / 433`);
console.log(`Total Collisions:    ${totalCollisions}`);
console.log(`Total Inversions:    ${totalInversions}`);

if (totalCollisions > 0 || totalInversions > 0) {
  console.error('ABORTING WRITE: Integrity checks failed.');
  process.exit(1);
}

// Write to all 4 target files
const targetPaths = [
  'public/data/interlinear/ROM.json',
  'public/data/interlinear/romans.json',
  'android/app/src/main/assets/public/data/interlinear/ROM.json',
  'android/app/src/main/assets/public/data/interlinear/romans.json'
];

const outputStr = JSON.stringify(rom, null, 2);

targetPaths.forEach(p => {
  const fullPath = path.resolve(p);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, outputStr, 'utf8');
  console.log(`Successfully written: ${p}`);
});

console.log('\nAll 4 targets updated and verified successfully.');
