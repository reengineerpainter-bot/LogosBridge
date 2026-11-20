const fs = require('fs');
const path = require('path');
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

const kjvData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/kjv.json'), 'utf8'));

const benchmarks = [
  { bookKey: 'Hebrews', book: 'HEB', ch: 11, v: 1, label: 'Hebrews 11:1 (Now faith is the substance...)' },
  { bookKey: 'James', book: 'JAS', ch: 1, v: 2, label: 'James 1:2 (My brethren, count it all joy...)' },
  { bookKey: '1 Peter', book: '1PE', ch: 1, v: 3, label: '1 Peter 1:3 (Blessed be the God and Father...)' },
  { bookKey: '2 Peter', book: '2PE', ch: 1, v: 4, label: '2 Peter 1:4 (Whereby are given unto us...)' },
  { bookKey: '1 John', book: '1JN', ch: 1, v: 1, label: '1 John 1:1 (That which was from the beginning...)' },
  { bookKey: '1 John', book: '1JN', ch: 5, v: 7, label: '1 John 5:7 (For there are three that bear record...)' },
  { bookKey: 'Jude', book: 'JUD', ch: 1, v: 24, label: 'Jude 1:24 (Now unto him that is able to keep you from falling...)' }
];

console.log('======================================================================');
console.log('AUDITING GENERAL EPISTLES BENCHMARKS FROM PUBLIC INTERLINEAR ASSETS');
console.log('======================================================================\n');

for (const b of benchmarks) {
  const filePath = path.join(__dirname, '../public/data/interlinear', `${b.book}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const verse = data.chapters[String(b.ch)][String(b.v)];
  const kjvVerse = kjvData[b.bookKey][b.ch - 1][b.v - 1];
  const rawTokens = parseKjvRawTokens(kjvVerse);
  
  console.log(`>>> [${b.label}]`);
  console.log(`KJV Text: "${kjvVerse}"`);
  console.log(`Greek Words: ${verse.words.length}`);
  
  // Verify disjointness
  const claimedTokens = new Set();
  let hasCollision = false;
  
  verse.words.forEach((w, idx) => {
    const k = w.k || [];
    for (const tok of k) {
      if (claimedTokens.has(tok)) {
        hasCollision = true;
      }
      claimedTokens.add(tok);
    }
    const tokenWords = k.map(t => rawTokens[t] ? rawTokens[t].text : '').filter(Boolean).join(' ');
    console.log(`  w${idx + 1}: ${w.w} (${w.n || 'NONE'}) -> k:[${k.join(', ')}] -> "${tokenWords}" [gloss: "${w.t || ''}"]`);
  });
  
  console.log(`Total Claimed Tokens: ${claimedTokens.size} | Total Tokens: ${rawTokens.length}`);
  console.log(`Collision status: ${hasCollision ? 'FAIL (COLLISION)' : 'PASS (100% DISJOINT)'}\n`);
}
