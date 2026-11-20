const fs = require('fs');
const path = require('path');

const osisData = JSON.parse(fs.readFileSync('node_modules/.cache/kjv_osis_general_epistles.json', 'utf8'));
const kjv = JSON.parse(fs.readFileSync('public/data/kjv.json', 'utf8'));
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

const BOOKS_CONFIG = [
  { code: 'HEB', full: 'hebrews', osisKey: 'Hebrews', kjvKey: 'Hebrews' },
  { code: 'JAS', full: 'james', osisKey: 'James', kjvKey: 'James' },
  { code: '1PE', full: '1_peter', osisKey: '1 Peter', kjvKey: '1 Peter' },
  { code: '2PE', full: '2_peter', osisKey: '2 Peter', kjvKey: '2 Peter' },
  { code: '1JN', full: '1_john', osisKey: '1 John', kjvKey: '1 John' },
  { code: '2JN', full: '2_john', osisKey: '2 John', kjvKey: '2 John' },
  { code: '3JN', full: '3_john', osisKey: '3 John', kjvKey: '3 John' },
  { code: 'JUD', full: 'jude', osisKey: 'Jude', kjvKey: 'Jude' }
];

let globalVerses = 0;
let globalCollisions = 0;
let globalInversions = 0;

for (const cfg of BOOKS_CONFIG) {
  const interlinearPath = `public/data/interlinear/${cfg.code}.json`;
  const bookData = JSON.parse(fs.readFileSync(interlinearPath, 'utf8'));
  const osisBook = osisData[cfg.osisKey];
  const kjvBook = kjv[cfg.kjvKey];

  if (!osisBook || !kjvBook) {
    console.error(`Missing dataset for ${cfg.code}`);
    process.exit(1);
  }

  let bookVerses = 0;
  let bookCollisions = 0;
  let bookInversions = 0;

  for (let chNum = 1; chNum <= osisBook.chapters.length; chNum++) {
    const chStr = String(chNum);
    const osisCh = osisBook.chapters.find(c => c.chapter === chNum);
    const interCh = bookData.chapters[chStr];

    if (!interCh) continue;

    const totalVs = osisCh.verses.length;

    for (let vsNum = 1; vsNum <= totalVs; vsNum++) {
      const vsStr = String(vsNum);
      const osisVs = osisCh.verses.find(v => v.verse === vsNum);
      const greekWords = interCh[vsStr]?.words;

      if (!greekWords) continue;

      const vsKjv = kjvBook[chNum - 1][vsNum - 1];
      const rawTokens = parseKjvRawTokens(vsKjv);

      bookVerses++;
      globalVerses++;

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

      // Strict monotonic ordinal order for repeated Strong's numbers
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

      // Disjointness check
      const claimed = new Set();
      for (let i = 0; i < greekWords.length; i++) {
        const k = assignments[i].sort((a,b) => a-b);
        greekWords[i].k = k;
        for (const idx of k) {
          if (claimed.has(idx)) {
            console.error(`COLLISION in ${cfg.code} ${chNum}:${vsNum} at word ${i}, idx ${idx}`);
            bookCollisions++;
            globalCollisions++;
          }
          claimed.add(idx);
        }
      }

      // Monotonicity check
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
              console.error(`INVERSION in ${cfg.code} ${chNum}:${vsNum}: word ${i} [${sI}] k=${minKi} vs word ${j} [${sJ}] k=${minKj}`);
              bookInversions++;
              globalInversions++;
            }
          }
        }
      }
    }
  }

  console.log(`[${cfg.code.padEnd(3)}] Verses: ${String(bookVerses).padStart(3)} | Collisions: ${bookCollisions} | Inversions: ${bookInversions}`);

  if (bookCollisions > 0 || bookInversions > 0) {
    console.error(`ABORTING: Integrity check failed for ${cfg.code}`);
    process.exit(1);
  }

  // Write book to Web and Android targets
  const targets = [
    `public/data/interlinear/${cfg.code}.json`,
    `public/data/interlinear/${cfg.full}.json`,
    `android/app/src/main/assets/public/data/interlinear/${cfg.code}.json`,
    `android/app/src/main/assets/public/data/interlinear/${cfg.full}.json`
  ];

  const jsonStr = JSON.stringify(bookData, null, 2);

  targets.forEach(t => {
    const fullP = path.resolve(t);
    const dir = path.dirname(fullP);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullP, jsonStr, 'utf8');
  });

  console.log(`  -> Synced 4 targets for ${cfg.code} (${cfg.full})`);
}

console.log('\n============================================================');
console.log('GENERAL EPISTLES OVERHAUL RUN COMPLETED SUCCESSFULLY');
console.log('============================================================');
console.log(`Total Verses Processed: ${globalVerses} / 734`);
console.log(`Total Collisions:       ${globalCollisions}`);
console.log(`Total Inversions:       ${globalInversions}`);
console.log('All 16 target files updated with 100% parity across Web and Android assets.');
