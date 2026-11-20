/**
 * Normalizes en_kjv.json to have a 'name' field matching the standard
 * book names used by the app (same as en_asv.json format).
 */
const fs = require('fs');
const path = require('path');

// Maps short abbrev → full book name (matching BIBLE_BOOKS in bibleMetadata)
const ABBREV_TO_NAME = {
  'gn':'Genesis','ex':'Exodus','lv':'Leviticus','nm':'Numbers','dt':'Deuteronomy',
  'js':'Joshua','jud':'Judges','rt':'Ruth','1sm':'1 Samuel','2sm':'2 Samuel',
  '1kgs':'1 Kings','2kgs':'2 Kings','1ch':'1 Chronicles','2ch':'2 Chronicles',
  'ezr':'Ezra','ne':'Nehemiah','et':'Esther','job':'Job','ps':'Psalms',
  'prv':'Proverbs','ec':'Ecclesiastes','so':'Song of Solomon','is':'Isaiah',
  'jr':'Jeremiah','lm':'Lamentations','ez':'Ezekiel','dn':'Daniel',
  'ho':'Hosea','jl':'Joel','am':'Amos','ob':'Obadiah','jn':'Jonah',
  'mi':'Micah','na':'Nahum','hk':'Habakkuk','zp':'Zephaniah','hg':'Haggai',
  'zc':'Zechariah','ml':'Malachi','mt':'Matthew','mk':'Mark','lk':'Luke',
  'jo':'John','act':'Acts','rm':'Romans','1co':'1 Corinthians',
  '2co':'2 Corinthians','gl':'Galatians','eph':'Ephesians','ph':'Philippians',
  'cl':'Colossians','1ts':'1 Thessalonians','2ts':'2 Thessalonians',
  '1tm':'1 Timothy','2tm':'2 Timothy','tt':'Titus','phm':'Philemon',
  'hb':'Hebrews','jm':'James','1pe':'1 Peter','2pe':'2 Peter',
  '1jo':'1 John','2jo':'2 John','3jo':'3 John','jd':'Jude','re':'Revelation'
};

const kjvPath = path.join(__dirname, '..', 'data', 'en_kjv.json');
const data = JSON.parse(fs.readFileSync(kjvPath, 'utf-8'));

let fixed = 0;
for (const book of data) {
  if (!book.name && book.abbrev) {
    const name = ABBREV_TO_NAME[book.abbrev.toLowerCase()];
    if (name) {
      book.name = name;
      fixed++;
    } else {
      console.warn(`Unknown abbrev: ${book.abbrev}`);
    }
  }
}

fs.writeFileSync(kjvPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Done. Added 'name' to ${fixed} books.`);
