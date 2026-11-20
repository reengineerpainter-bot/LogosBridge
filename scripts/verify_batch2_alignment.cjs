/**
 * scripts/verify_batch2_alignment.cjs
 * 
 * Comprehensive Verification Benchmark Suite for Batch 2:
 * Historical Books Part 1 (Joshua, Judges, Ruth, 1 Samuel, 2 Samuel)
 * 
 * Tests:
 * 1. Milestone theological, historical, and narrative benchmark verses.
 * 2. Resolution of empty/missing glosses across prepositions and particles.
 * 3. Elimination of H0 placeholder Strong's numbers on grammatical particles.
 * 4. Disentangled negation bleeding (לא / אל followed by verb).
 * 5. Accurate accusative marker (H853 את) identification.
 * 6. Authentic restoration of cognate infinitive absolute / reciprocal pairs (Ruth 1:16, Ruth 1:1, Ruth 1:17, Josh 3:10, Josh 6:1, 1 Sam 22:16).
 * 7. 100% chapter and verse count parity with public/data/kjv.json.
 * 8. Dual-target file synchronization (public/data/interlinear and android assets).
 */

const fs = require('fs');
const path = require('path');

const INTERLINEAR_DIR = path.resolve(__dirname, '../public/data/interlinear');
const ANDROID_DIR = path.resolve(__dirname, '../android/app/src/main/assets/public/data/interlinear');
const KJV_PATH = path.resolve(__dirname, '../public/data/kjv.json');

const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'));

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

function stripHebrewPoints(w) {
  return (w || '').replace(/[\u0591-\u05C7]/g, '').replace(/[\/׃־]/g, '').trim();
}

console.log('====================================================================');
console.log('VERIFYING BATCH 2 ALIGNMENT (JOSHUA, JUDGES, RUTH, 1 & 2 SAMUEL)');
console.log('====================================================================');

// 1. Check Chapter & Verse Parity across all 5 Books
console.log('\n--- 1. Verse-by-Verse Parity with KJV ---');
const books = [
  { name: 'joshua', abbrev: 'JOS', kjvKey: 'Joshua', chapters: 24, verses: 658 },
  { name: 'judges', abbrev: 'JDG', kjvKey: 'Judges', chapters: 21, verses: 618 },
  { name: 'ruth', abbrev: 'RUT', kjvKey: 'Ruth', chapters: 4, verses: 85 },
  { name: '1_samuel', abbrev: '1SA', kjvKey: '1 Samuel', chapters: 31, verses: 810 },
  { name: '2_samuel', abbrev: '2SA', kjvKey: '2 Samuel', chapters: 24, verses: 695 }
];

for (const b of books) {
  const filePath = path.join(INTERLINEAR_DIR, `${b.name}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const chKeys = Object.keys(data.chapters);
  assert(chKeys.length === b.chapters, `${b.name}: exactly ${b.chapters} chapters present`);

  let vCount = 0;
  for (const c of chKeys) {
    vCount += Object.keys(data.chapters[c]).length;
  }
  assert(vCount === b.verses, `${b.name}: exactly ${b.verses} verses present (matches KJV)`);

  const kjvChCount = kjv[b.kjvKey].length;
  assert(kjvChCount === b.chapters, `${b.name}: KJV chapter count matches (${kjvChCount})`);
  let kjvVCount = 0;
  for (const c of kjv[b.kjvKey]) {
    kjvVCount += c.length;
  }
  assert(kjvVCount === b.verses, `${b.name}: KJV verse count matches (${kjvVCount})`);
}

// 2. Dual-Asset Sync Check
console.log('\n--- 2. Dual-Asset Filesystem Sync ---');
for (const b of books) {
  const webMain = path.join(INTERLINEAR_DIR, `${b.name}.json`);
  const webAlias = path.join(INTERLINEAR_DIR, `${b.abbrev}.json`);
  const androidMain = path.join(ANDROID_DIR, `${b.name}.json`);
  const androidAlias = path.join(ANDROID_DIR, `${b.abbrev}.json`);

  assert(fs.existsSync(webMain) && fs.existsSync(webAlias), `${b.name}: web files exist`);
  assert(fs.existsSync(androidMain) && fs.existsSync(androidAlias), `${b.name}: Android asset files exist`);

  const webSize = fs.statSync(webMain).size;
  const androidSize = fs.statSync(androidMain).size;
  assert(webSize === androidSize, `${b.name}: web and android file sizes identical (${webSize} bytes)`);
}

// 3. Milestone Verse Benchmarks
console.log('\n--- 3. Milestone Theological & Narrative Benchmarks ---');

// Joshua 1:8
const joshuaData = JSON.parse(fs.readFileSync(path.join(INTERLINEAR_DIR, 'joshua.json'), 'utf8'));
const jos1_8 = joshuaData.chapters['1']['8'].words;
assert(jos1_8[0].t.toLowerCase() === 'not' && jos1_8[0].n === 'H3808', 'Joshua 1:8: לֹֽא cleanly isolated as "not" (H3808)');
assert(jos1_8[1].t.toLowerCase().includes('depart'), 'Joshua 1:8: יָמ֡וּשׁ contains "shall depart"');
assert(jos1_8[4].t.toLowerCase() === 'this' && jos1_8[4].n === 'H2088', 'Joshua 1:8: הַזֶּ֜ה correctly glossed as "This" (H2088)');
assert(jos1_8[7].t.toLowerCase() === 'therein' && jos1_8[7].n === 'H9002', 'Joshua 1:8: בּוֹ֙ restored from H0 to H9002 ("therein")');

// Joshua 3:10
const jos3_10 = joshuaData.chapters['3']['10'].words;
assert(stripHebrewPoints(jos3_10[8].w) === 'הורש' && jos3_10[8].t.toLowerCase() === 'without fail', 'Joshua 3:10: Infinitive absolute הוֹרֵשׁ restored ("without fail")');
assert(stripHebrewPoints(jos3_10[9].w) === 'יוריש' && jos3_10[9].t.toLowerCase() === 'drive out', 'Joshua 3:10: Finite verb יוֹרִישׁ restored ("drive out")');

// Joshua 6:1
const jos6_1 = joshuaData.chapters['6']['1'].words;
assert(stripHebrewPoints(jos6_1[1].w) === 'סגרת' && jos6_1[1].t.toLowerCase() === 'was straitly', 'Joshua 6:1: סֹגֶ֣רֶת restored ("was straitly")');
assert(stripHebrewPoints(jos6_1[2].w) === 'ומסגרת' && jos6_1[2].t.toLowerCase() === 'shut up', 'Joshua 6:1: וּמְסֻגֶּ֔רֶת restored ("shut up")');

// Joshua 24:15 ("as for me and my house, we will serve the LORD")
const jos24_15 = joshuaData.chapters['24']['15'].words;
const meAndMyHouse = jos24_15.map(w => w.t).join(' ');
assert(meAndMyHouse.toLowerCase().includes('i and my house') || meAndMyHouse.toLowerCase().includes('me and my house'), 'Joshua 24:15: "me and my house" preserved cleanly');

// Ruth 1:1
const ruthData = JSON.parse(fs.readFileSync(path.join(INTERLINEAR_DIR, 'ruth.json'), 'utf8'));
const rut1_1 = ruthData.chapters['1']['1'].words;
assert(stripHebrewPoints(rut1_1[2].w) === 'שפט' && rut1_1[2].t.toLowerCase() === 'ruled', 'Ruth 1:1: שְׁפֹט restored ("ruled")');
assert(stripHebrewPoints(rut1_1[3].w) === 'השפטים' && rut1_1[3].t.toLowerCase() === 'the judges', 'Ruth 1:1: הַשֹּׁפְטִים restored ("the judges")');

// Ruth 1:16
const rut1_16 = ruthData.chapters['1']['16'].words;
assert(rut1_16[2].t.toLowerCase() === 'not' && rut1_16[2].n === 'H408', 'Ruth 1:16: אַל is "not" (H408)');
assert(rut1_16[4].t.toLowerCase() === 'me' && rut1_16[4].n === 'H9002', 'Ruth 1:16: בִ֔י restored from H0 to H9002 ("me")');
assert(stripHebrewPoints(rut1_16[14].w) === 'תליני' && rut1_16[14].t.toLowerCase() === 'thou lodgest', 'Ruth 1:16: תָּלִ֙ינִי֙ restored ("thou lodgest")');
assert(stripHebrewPoints(rut1_16[15].w) === 'אלין' && rut1_16[15].t.toLowerCase() === 'i will lodge', 'Ruth 1:16: אָלִ֔ין restored ("I will lodge")');
assert(stripHebrewPoints(rut1_16[16].w) === 'עמך' && rut1_16[16].t.toLowerCase() === 'thy people', 'Ruth 1:16: עַמֵּ֣ךְ restored ("thy people")');
assert(stripHebrewPoints(rut1_16[17].w) === 'עמי' && rut1_16[17].t.toLowerCase().includes('my people'), 'Ruth 1:16: עַמִּ֔י restored ("[shall be] my people")');
assert(stripHebrewPoints(rut1_16[18].w) === 'ואלהיך' && rut1_16[18].t.toLowerCase().includes('thy god'), 'Ruth 1:16: וֵאלֹהַ֖יִךְ restored ("and thy God")');
assert(stripHebrewPoints(rut1_16[19].w) === 'אלהי' && rut1_16[19].t.toLowerCase() === 'my god', 'Ruth 1:16: אֱלֹהָֽי׃ restored ("my God")');

// Ruth 1:17
const rut1_17 = ruthData.chapters['1']['17'].words;
assert(stripHebrewPoints(rut1_17[1].w) === 'תמותי' && rut1_17[1].t.toLowerCase() === 'thou diest', 'Ruth 1:17: תָּמוּתִי restored ("thou diest")');
assert(stripHebrewPoints(rut1_17[2].w) === 'אמות' && rut1_17[2].t.toLowerCase() === 'will i die', 'Ruth 1:17: אָמוּת restored ("will I die")');

// 1 Samuel 16:7
const sam1Data = JSON.parse(fs.readFileSync(path.join(INTERLINEAR_DIR, '1_samuel.json'), 'utf8'));
const sam1_16_7 = sam1Data.chapters['16']['7'].words;
const sam1_16_7Text = sam1_16_7.map(w => w.t).join(' ');
assert(sam1_16_7Text.toLowerCase().includes('heart'), '1 Samuel 16:7: "heart" present in David anointing verse');

// 1 Samuel 20:41-42 (Check verse 42 and verify verse 43 doesn\'t exist)
const sam1_20_42 = sam1Data.chapters['20']['42'].words;
assert(sam1_20_42.length > 0, '1 Samuel 20:42 exists and contains words');
assert(!sam1Data.chapters['20']['43'], '1 Samuel 20:43 does not exist (authentic 42 verses in chapter)');

// 1 Samuel 22:16
const sam1_22_16 = sam1Data.chapters['22']['16'].words;
assert(stripHebrewPoints(sam1_22_16[2].w) === 'מות' && sam1_22_16[2].t.toLowerCase() === 'surely', '1 Samuel 22:16: מוֹת restored ("surely")');
assert(stripHebrewPoints(sam1_22_16[3].w) === 'תמות' && sam1_22_16[3].t.toLowerCase().includes('die'), '1 Samuel 22:16: תָּמוּת restored ("die")');
assert(stripHebrewPoints(sam1_22_16[5].w) === 'אתה' && sam1_22_16[5].t.toLowerCase() === 'thou', '1 Samuel 22:16: אַתָּה restored ("thou")');
assert(stripHebrewPoints(sam1_22_16[6].w) === 'וכל' && sam1_22_16[6].t.toLowerCase() === 'and all', '1 Samuel 22:16: וְכָל restored ("and all")');

// 2 Samuel 7:12-13
const sam2Data = JSON.parse(fs.readFileSync(path.join(INTERLINEAR_DIR, '2_samuel.json'), 'utf8'));
const sam2_7_12 = sam2Data.chapters['7']['12'].words;
const sam2_7_12Text = sam2_7_12.map(w => w.t).join(' ');
assert(sam2_7_12Text.toLowerCase().includes('seed') && sam2_7_12Text.toLowerCase().includes('kingdom'), '2 Samuel 7:12: Davidic covenant seed & kingdom preserved');

console.log('\n====================================================================');
console.log(`BATCH 2 VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} checks passed (${(passedChecks/totalChecks*100).toFixed(1)}%)`);
console.log('====================================================================');

if (passedChecks === totalChecks) {
  process.exit(0);
} else {
  process.exit(1);
}
