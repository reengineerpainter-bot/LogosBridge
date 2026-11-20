const fs = require('fs');
const path = require('path');

const rom = JSON.parse(fs.readFileSync('public/data/interlinear/ROM.json', 'utf8'));
const kjv = JSON.parse(fs.readFileSync('public/data/kjv.json', 'utf8'));
const { parseKjvRawTokens } = require(path.resolve('node_modules/.cache/prod_engine.cjs'));

function checkVerse(ch, vs) {
  const words = rom.chapters[String(ch)][String(vs)].words;
  const vsKjv = kjv['Romans'][ch - 1][vs - 1];
  const tokens = parseKjvRawTokens(vsKjv);
  console.log(`\n============================================================`);
  console.log(`Romans ${ch}:${vs}`);
  console.log(`KJV: "${vsKjv}"`);
  console.log(`============================================================`);
  words.forEach((w, i) => {
    const matched = (w.k || []).map(idx => `${tokens[idx]?.text}(${idx})`).join(' ');
    console.log(`  w[${String(i).padStart(2)}] ${w.w.padEnd(16)} | [${(w.n || '').padEnd(6)}] -> ${matched || '(unmapped)'}`);
  });
}

checkVerse(8, 26);
checkVerse(7, 1);
checkVerse(7, 16);
checkVerse(7, 3);
checkVerse(7, 25);
checkVerse(8, 28);
checkVerse(8, 38);
checkVerse(13, 9);
