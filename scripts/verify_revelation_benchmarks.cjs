const fs = require('fs');
const path = require('path');
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

const kjvData = JSON.parse(fs.readFileSync('public/data/kjv.json', 'utf8'));

const targets = [
  'public/data/interlinear/REV.json',
  'public/data/interlinear/revelation.json',
  'android/app/src/main/assets/public/data/interlinear/REV.json',
  'android/app/src/main/assets/public/data/interlinear/revelation.json'
];

console.log('======================================================================');
console.log('AUDITING REVELATION ASSET PARITY ACROSS ALL 4 FILES');
console.log('======================================================================');

const baseContent = fs.readFileSync(targets[0], 'utf8');
for (let i = 1; i < targets.length; i++) {
  const targetContent = fs.readFileSync(targets[i], 'utf8');
  if (baseContent !== targetContent) {
    console.error(`PARITY MISMATCH between ${targets[0]} and ${targets[i]}`);
    process.exit(1);
  }
}
console.log('-> 100% BYTE-FOR-BYTE PARITY VERIFIED ACROSS ALL 4 TARGET FILES!\n');

const data = JSON.parse(baseContent);

const benchmarks = [
  { ch: 1, v: 1, label: 'Revelation 1:1 (The Revelation of Jesus Christ...)' },
  { ch: 1, v: 8, label: 'Revelation 1:8 (I am Alpha and Omega...)' },
  { ch: 4, v: 8, label: 'Revelation 4:8 (Holy, holy, holy, Lord God Almighty...)' },
  { ch: 19, v: 16, label: 'Revelation 19:16 (KING OF KINGS, AND LORD OF LORDS)' },
  { ch: 21, v: 1, label: 'Revelation 21:1 (And I saw a new heaven and a new earth...)' },
  { ch: 22, v: 20, label: 'Revelation 22:20 (He which testifieth these things saith...)' }
];

console.log('======================================================================');
console.log('AUDITING REVELATION BENCHMARKS');
console.log('======================================================================\n');

for (const b of benchmarks) {
  const verse = data.chapters[String(b.ch)][String(b.v)];
  const kjvVerse = kjvData['Revelation'][b.ch - 1][b.v - 1];
  const rawTokens = parseKjvRawTokens(kjvVerse);

  console.log(`>>> [${b.label}]`);
  console.log(`KJV Text: "${kjvVerse}"`);
  console.log(`Greek Words: ${verse.words.length}`);

  const claimedTokens = new Set();
  let hasCollision = false;

  verse.words.forEach((w, idx) => {
    const k = w.k || [];
    for (const tok of k) {
      if (claimedTokens.has(tok)) hasCollision = true;
      claimedTokens.add(tok);
    }
    const tokenWords = k.map(t => rawTokens[t] ? rawTokens[t].text : '').filter(Boolean).join(' ');
    console.log(`  w${idx + 1}: ${w.w} (${w.n || 'NONE'}) -> k:[${k.join(', ')}] -> "${tokenWords}" [gloss: "${w.t || ''}"]`);
  });

  console.log(`Total Claimed Tokens: ${claimedTokens.size} | Total Tokens: ${rawTokens.length}`);
  console.log(`Collision status: ${hasCollision ? 'FAIL (COLLISION)' : 'PASS (100% DISJOINT)'}\n`);
}
