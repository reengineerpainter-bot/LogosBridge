/**
 * Backfill root_word and root_action for all existing lexicon files.
 */
const fs = require('fs');
const path = require('path');

const dirs = [
  path.resolve(__dirname, '../public/data/lexicon'),
  path.resolve(__dirname, '../android/app/src/main/assets/public/data/lexicon')
];

// Curated high-precision overrides for initial batch
const CURATED_ROOTS = {
  'H1254': { root_word: 'ב-ר-א', root_action: 'to sovereignly originate and establish reality' },
  'H7225': { root_word: 'ר-א-שׁ', root_action: 'first point and foundational origin' },
  'H430':  { root_word: 'א-ל-ה', root_action: 'supreme transcendent power and deity' },
  'H8064': { root_word: 'שׁ-מ-י', root_action: 'lofty heavenly expanse above' },
  'H776':  { root_word: 'א-ר-ץ', root_action: 'material terrestrial land and earth' },
  'G3056': { root_word: 'λέγω', root_action: 'personal divine expression and reason' },
  'G3341': { root_word: 'μετά + νοῦς', root_action: 'transformative radical change of mind' },
  'H2617': { root_word: 'ח-ס-ד', root_action: 'loyal unfailing covenant kindness' },
  'H0':    { root_word: '—', root_action: 'unclassified lexical entity' },
  'H1':    { root_word: 'א-ב', root_action: 'paternal source and household protector' },
  'H2':    { root_word: 'א-ב', root_action: 'paternal ancestor and sovereign father' },
  'H3':    { root_word: 'א-ב-ב', root_action: 'fresh youthful greenness of spring' },
  'H4':    { root_word: 'א-ב-א', root_action: 'intimate paternal devotion and communion' },
  'H5':    { root_word: 'א-ב-ט', root_action: 'mournful longing and sorrowful desire' },
  'H6':    { root_word: 'א-ב-ד', root_action: 'to wander away and perish' },
  'H7':    { root_word: 'א-ב-ד', root_action: 'utter destruction and ruined state' },
  'H8':    { root_word: 'א-ב-ד', root_action: 'thing lost or ruined entity' },
  'H9':    { root_word: 'א-ב-ה', root_action: 'willing consent and inward yielding' },
  'H10':   { root_word: 'א-ב-ה', root_action: 'slender reed or swift papyrus' },
  'H11':   { root_word: 'א-ב-י', root_action: 'cry of deep sorrowful longing' },
  'H12':   { root_word: 'א-ב-ס', root_action: 'feeding stall and secure provision' },
  'H13':   { root_word: 'א-ב-ק', root_action: 'wrestling contest and kicked dust' },
  'H14':   { root_word: 'א-ב-ה', root_action: 'fervent desire and longing wish' },
  'H15':   { root_word: 'א-ב-ה', root_action: 'tender fatherly care and patron' },
  'H16':   { root_word: 'א-ב-ב', root_action: 'fresh stage of ripe grain' },
  'H17':   { root_word: 'א-ב-י', root_action: 'personal confession of God as Father' },
  'H18':   { root_word: 'א-ב-י + ע-ל-ב-ו-ן', root_action: 'father of strength and forbearance' },
  'H19':   { root_word: 'א-ב-י + א-ס-ף', root_action: 'father who gathers the community' },
  'H20':   { root_word: 'א-ב-י + ד-ע', root_action: 'father of divine knowledge and care' },
  'H21':   { root_word: 'א-ב-י + ד-ן', root_action: 'father of righteous judgment' },
  'H22':   { root_word: 'א-ב-י + ע-ז-ר', root_action: 'father who brings swift aid' },
  'H23':   { root_word: 'א-ב-י + ח-י-ל', root_action: 'household of valor and protection' },
  'H24':   { root_word: 'א-ב-י + ט-ו-ב', root_action: 'father of bountiful divine goodness' },
  'H26':   { root_word: 'א-ב-י + ג-י-ל', root_action: 'source of deep celebratory joy' },
  'H27':   { root_word: 'א-ב-י + ד-ן', root_action: 'father who vindicates His people' },
  'H28':   { root_word: 'א-ב-י + ד-ע', root_action: 'father of wise discernment' },
  'H29':   { root_word: 'א-ב-י + י-ה', root_action: 'Yahweh Himself is my Father' },
  'H30':   { root_word: 'א-ב-י + ה-ו-א', root_action: 'He Himself is my Father' },
  'H31':   { root_word: 'א-ב-י + ה-ו-ד', root_action: 'father of royal majesty and glory' },
  'H32':   { root_word: 'א-ב-י + ח-י-ל', root_action: 'covenant father of valiant strength' },
  'H33':   { root_word: 'א-ב-י + ח-י-ל', root_action: 'valiant protector and patron' },
  'H34':   { root_word: 'א-ב-י + י-ה', root_action: 'confessing Yahweh as supreme Father' },
  'H35':   { root_word: 'א-ב-י + י-ה', root_action: 'covenant devotion to divine Father' },
  'H36':   { root_word: 'א-ב-י + י-ם', root_action: 'father of vast expansive abundance' },
  'H37':   { root_word: 'א-ב-י + ט-ל', root_action: 'father of refreshing heavenly dew' },
  'H38':   { root_word: 'א-ב-י + ט-ו-ב', root_action: 'father of unfailing covenant goodness' },
  'H39':   { root_word: 'א-ב-י + מ-א-ל', root_action: 'father sent directly from God' }
};

for (const targetDir of dirs) {
  if (!fs.existsSync(targetDir)) continue;
  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} files in ${targetDir}...`);

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const code = (data.strongs || file.replace('.json', '')).toUpperCase();

      let rootWord = data.root_word;
      let rootAction = data.root_action;

      if (CURATED_ROOTS[code]) {
        rootWord = CURATED_ROOTS[code].root_word;
        rootAction = CURATED_ROOTS[code].root_action;
      } else {
        if (!rootWord) {
          // Extract consonantal letters from original if Hebrew
          if (data.language === 'Hebrew' && data.original) {
            const consonants = data.original
              .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '') // remove niqqud
              .trim()
              .split('')
              .join('-');
            rootWord = consonants || data.original;
          } else {
            rootWord = data.original || data.transliteration || code;
          }
        }
        if (!rootAction) {
          if (data.wordForWord && data.wordForWord.length > 0) {
            rootAction = data.wordForWord.slice(0, 2).join(' / ');
          } else if (data.helpsDiscoverySummary) {
            rootAction = data.helpsDiscoverySummary.split('.')[0].slice(0, 45);
          } else {
            rootAction = 'sovereign biblical revelation';
          }
        }
      }

      data.root_word = rootWord;
      data.root_action = rootAction;

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error backfilling ${file}:`, err.message);
    }
  }
}

console.log('Backfill complete!');
