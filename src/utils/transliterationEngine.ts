/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-precision SBL-compliant Transliteration Engine for Biblical Hebrew and Biblical Greek.
 * Converts manuscript scripts into academic Latin script-to-script transliteration.
 */

// Curated high-precision lookup dictionary for common biblical words & verses
const SCRIPT_TO_TRANSLIT_MAP: Record<string, string> = {
  // Genesis 1:1-3 (Streamlined Phonetic ASCII)
  'בְּרֵאשִׁ֖ית': 'bereshit',
  'בְּרֵאשִׁית': 'bereshit',
  'בָּרָ֣א': 'bara',
  'בָּרָא': 'bara',
  'אֱלֹהִ֑ים': 'elohim',
  'אֱלֹהִ֖ים': 'elohim',
  'אֱלֹהִים': 'elohim',
  'אֵ֥ת': 'et',
  'אֵת': 'et',
  'הַשָּׁמַ֖יִם': 'hashamayim',
  'הַשָּׁמַיִם': 'hashamayim',
  'וְאֵ֥ת': "ve'et",
  'וְאֵת': "ve'et",
  'הָאָֽרֶץ׃': "ha'aretz",
  'הָאָרֶץ': "ha'aretz",
  'וְהָאָ֗רֶץ': "veha'aretz",
  'וְהָאָרֶץ': "veha'aretz",
  'הָיְתָ֥ה': 'hayetah',
  'הָיְתָה': 'hayetah',
  'תֹ֨הוּ֙': 'tohu',
  'תֹהוּ': 'tohu',
  'וָבֹ֔הוּ': 'vavohu',
  'וָבֹהוּ': 'vavohu',
  'וְחֹ֖שֶׁךְ': 'vechoshech',
  'וְחֹשֶׁךְ': 'vechoshech',
  'עַל־פְּנֵ֣י': 'al-penei',
  'עַל־פְּנֵי': 'al-penei',
  'תְה֑וֹם': 'tehom',
  'תְהוֹם': 'tehom',
  'וְר֣וּחַ': 'veruach',
  'וְרוּחַ': 'veruach',
  'מְרַחֶ֖פֶת': 'merachefet',
  'מְרַחֶפֶת': 'merachefet',
  'הַמָּֽיִם׃': 'hamayim',
  'הַמָּיִם': 'hamayim',
  'וַיֹּ֥אמֶר': 'vayomer',
  'וַיֹּאמֶר': 'vayomer',
  'יְהִ֣י': 'yehi',
  'יְהִי': 'yehi',
  'א֑וֹר': 'or',
  'א֥וֹר': 'or',
  'אוֹר': 'or',
  'וַֽיְהִי־אֽוֹר׃': 'vayehi-or',
  'וַיְהִי־אוֹר': 'vayehi-or',

  // John 1:1-3 (Streamlined Phonetic ASCII)
  'Ἐν': 'En',
  'ἐν': 'en',
  'ἀρχῇ': 'arche',
  'ἦν': 'en',
  'ὁ': 'ho',
  'λόγος': 'logos',
  'λόγον': 'logon',
  'καὶ': 'kai',
  'πρὸς': 'pros',
  'τὸν': 'ton',
  'θεόν': 'theon',
  'θεός': 'theos',
  'θεὸς': 'theos',
  'οὗτος': 'houtos',
  'πάντα': 'panta',
  'δι’': "di'",
  'αὐτοῦ': 'autou',
  'ἐγένετο': 'egeneto',
  'χωρὶς': 'choris',
  'οὐδὲ': 'oude',
  'ἕν': 'hen',
  'ὃ': 'ho',
  'γέγονεν': 'gegonen',
  'ζωὴ': 'zoe',
  'φῶς': 'phos',
  'σκοτίᾳ': 'skotia',
  'κατέλαβεν': 'katelaben'
};

const HEBREW_CONSONANTS: Record<string, string> = {
  '\u05D0': "'",  // Aleph (standard ASCII apostrophe)
  '\u05D1': 'b',  // Bet
  '\u05D2': 'g',  // Gimel
  '\u05D3': 'd',  // Dalet
  '\u05D4': 'h',  // He
  '\u05D5': 'w',  // Vav
  '\u05D6': 'z',  // Zayin
  '\u05D7': 'ch', // Het (Streamlined to ch)
  '\u05D8': 't',  // Tet (Stripped under-dot)
  '\u05D9': 'y',  // Yod
  '\u05DA': 'k',  // Final Kaf
  '\u05DB': 'k',  // Kaf
  '\u05DC': 'l',  // Lamed
  '\u05DD': 'm',  // Final Mem
  '\u05DE': 'm',  // Mem
  '\u05DF': 'n',  // Final Nun
  '\u05E0': 'n',  // Nun
  '\u05E1': 's',  // Samekh
  '\u05E2': "'",  // Ayin (standard ASCII apostrophe)
  '\u05E3': 'p',  // Final Pe
  '\u05E4': 'p',  // Pe
  '\u05E5': 'ts', // Final Tsadi (Streamlined to ts)
  '\u05E6': 'ts', // Tsadi (Streamlined to ts)
  '\u05E7': 'q',  // Qof
  '\u05E8': 'r',  // Resh
  '\u05E9': 's',  // Shin/Sin Base (defaults to 's', modifier dot adds 'h')
  '\u05EA': 't',  // Tav
};

const HEBREW_VOWELS: Record<string, string> = {
  '\u05B0': 'e',  // Sheva
  '\u05B1': 'e',  // Hataf Segol
  '\u05B2': 'a',  // Hataf Patach
  '\u05B3': 'o',  // Hataf Qamats
  '\u05B4': 'i',  // Hiriq
  '\u05B5': 'e',  // Tsere
  '\u05B6': 'e',  // Segol
  '\u05B7': 'a',  // Patach
  '\u05B8': 'a',  // Qamats
  '\u05B9': 'o',  // Holam
  '\u05BA': 'o',  // Holam Haser
  '\u05BB': 'u',  // Qubuts
  '\u05BC': '',   // Dagesh (ignored for phonetic simplicity)
  '\u05C1': 'h',  // Shin dot (combines with base 's' to make 'sh')
  '\u05C2': '',   // Sin dot (leaves base as 's')
};

const GREEK_CHAR_MAP: Record<string, string> = {
  // Lowercase Vowels (with and without breathings/accents)
  'α': 'a', 'ά': 'a', 'ὰ': 'a', 'ᾶ': 'a', 'ἀ': 'a', 'ἂ': 'a', 'ἄ': 'a', 'ἆ': 'a',
  'ἁ': 'ha', 'ἃ': 'ha', 'ἅ': 'ha', 'ἇ': 'ha',
  'ᾳ': 'a', 'ᾀ': 'a', 'ᾁ': 'ha', 'ᾂ': 'a', 'ᾃ': 'ha', 'ᾄ': 'a', 'ᾅ': 'ha', 'ᾆ': 'a', 'ᾇ': 'ha', 'ᾲ': 'a', 'ᾴ': 'a', 'ᾷ': 'a',

  'ε': 'e', 'έ': 'e', 'ὲ': 'e', 'ἐ': 'e', 'ἒ': 'e', 'ἔ': 'e',
  'ἑ': 'he', 'ἓ': 'he', 'ἕ': 'he',

  'η': 'e', 'ή': 'e', 'ὴ': 'e', 'ῆ': 'e', 'ἠ': 'e', 'ἢ': 'e', 'ἤ': 'e', 'ἦ': 'e',
  'ἡ': 'he', 'ἣ': 'he', 'ἥ': 'he', 'ἧ': 'he',
  'ῃ': 'e', 'ᾐ': 'e', 'ᾑ': 'he', 'ᾒ': 'e', 'ᾓ': 'he', 'ᾔ': 'e', 'ᾕ': 'he', 'ᾖ': 'e', 'ᾗ': 'he', 'ῂ': 'e', 'ῄ': 'e', 'ῇ': 'e',

  'ι': 'i', 'ί': 'i', 'ὶ': 'i', 'ῖ': 'i', 'ἰ': 'i', 'ἲ': 'i', 'ἴ': 'i', 'ἶ': 'i', 'ϊ': 'i', 'ΐ': 'i', 'ῒ': 'i', 'ῗ': 'i',
  'ἱ': 'hi', 'ἳ': 'hi', 'ἵ': 'hi', 'ἷ': 'hi',

  'ο': 'o', 'ό': 'o', 'ὸ': 'o', 'ὀ': 'o', 'ὂ': 'o', 'ὄ': 'o',
  'ὁ': 'ho', 'ὃ': 'ho', 'ὅ': 'ho',

  // Upsilon strictly mapped to 'u' and 'hu' (Strong's Phonetic)
  'υ': 'u', 'ύ': 'u', 'ὺ': 'u', 'ῦ': 'u', 'ὐ': 'u', 'ὒ': 'u', 'ὔ': 'u', 'ὖ': 'u', 'ϋ': 'u', 'ΰ': 'u', 'ῢ': 'u', 'ῧ': 'u',
  'ὑ': 'hu', 'ὓ': 'hu', 'ὕ': 'hu', 'ὗ': 'hu',

  'ω': 'o', 'ώ': 'o', 'ὼ': 'o', 'ῶ': 'o', 'ὠ': 'o', 'ὢ': 'o', 'ὤ': 'o', 'ὦ': 'o',
  'ὡ': 'ho', 'ὣ': 'ho', 'ὥ': 'ho', 'ὧ': 'ho',
  'ῳ': 'o', 'ᾠ': 'o', 'ᾡ': 'ho', 'ᾢ': 'o', 'ᾣ': 'ho', 'ᾤ': 'o', 'ᾥ': 'ho', 'ᾦ': 'o', 'ᾧ': 'ho', 'ῲ': 'o', 'ῴ': 'o', 'ῷ': 'o',

  // Consonants (Strict Phonetic ASCII)
  'β': 'b', 'γ': 'g', 'δ': 'd', 'ζ': 'z', 'θ': 'th', 'κ': 'k',
  'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'π': 'p', 'ρ': 'r',
  'ῤ': 'r', 'ῥ': 'rh', 'σ': 's', 'ς': 's', 'τ': 't', 'φ': 'ph',
  'χ': 'ch', 'ψ': 'ps',

  // Uppercase Vowels & Consonants
  'Α': 'A', 'Ἀ': 'A', 'Ἂ': 'A', 'Ἄ': 'A', 'Ἆ': 'A', 'Ἁ': 'Ha', 'Ἃ': 'Ha', 'Ἅ': 'Ha', 'Ἇ': 'Ha',
  'Β': 'B', 'Γ': 'G', 'Δ': 'D',
  'Ε': 'E', 'Ἐ': 'E', 'Ἒ': 'E', 'Ἔ': 'E', 'Ἑ': 'He', 'Ἓ': 'He', 'Ἕ': 'He',
  'Ζ': 'Z',
  'Η': 'E', 'Ἠ': 'E', 'Ἢ': 'E', 'Ἤ': 'E', 'Ἦ': 'E', 'Ἡ': 'He', 'Ἣ': 'He', 'Ἥ': 'He', 'Ἧ': 'He',
  'Θ': 'Th',
  'Ι': 'I', 'Ἰ': 'I', 'Ἲ': 'I', 'Ἴ': 'I', 'Ἶ': 'I', 'Ἱ': 'Hi', 'Ἳ': 'Hi', 'Ἵ': 'Hi', 'Ἷ': 'Hi',
  'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X',
  'Ο': 'O', 'Ὀ': 'O', 'Ὂ': 'O', 'Ὄ': 'O', 'Ὁ': 'Ho', 'Ὃ': 'Ho', 'Ὅ': 'Ho',
  'Π': 'P', 'Ρ': 'R', 'Ῥ': 'Rh',
  'Σ': 'S', 'Τ': 'T',
  'Υ': 'U', 'Ὑ': 'Hu', 'Ὓ': 'Hu', 'Ὕ': 'Hu', 'Ὗ': 'Hu', // Upsilon uppercase correction
  'Φ': 'Ph', 'Χ': 'Ch', 'Ψ': 'Ps',
  'Ω': 'O', 'Ὠ': 'O', 'Ὢ': 'O', 'Ὤ': 'O', 'Ὦ': 'O', 'Ὡ': 'Ho', 'Ὣ': 'Ho', 'Ὥ': 'Ho', 'Ὧ': 'Ho'
};

/**
 * Sanitizes Latin/diacritic residues into clean Grade-6 readable ASCII.
 */
export function sanitizeToCleanAscii(text: string): string {
  return text
    // 1. Decompose unicode combining marks
    .normalize('NFD')
    // 2. Strip all Unicode diacritical marks (accents, macrons, breathings, etc.)
    .replace(/[\u0300-\u036f]/g, '')
    // 3. Map any remaining accented Latin characters to pure ASCII equivalents
    .replace(/[āáàâäǎåã]/gi, (c) => (c === c.toUpperCase() ? 'A' : 'a'))
    .replace(/[ēéèêëě]/gi, (c) => (c === c.toUpperCase() ? 'E' : 'e'))
    .replace(/[īíìîïǐ]/gi, (c) => (c === c.toUpperCase() ? 'I' : 'i'))
    .replace(/[ōóòôöǒõṓṑ]/gi, (c) => (c === c.toUpperCase() ? 'O' : 'o'))
    .replace(/[ūúùûüǔ]/gi, (c) => (c === c.toUpperCase() ? 'U' : 'u'))
    .replace(/[ȳýỳŷÿ]/gi, (c) => (c === c.toUpperCase() ? 'Y' : 'y'))
    // 4. Normalize punctuation
    .replace(/·/g, ';')
    .replace(/·/g, ';')
    .replace(/[’']/g, "'")
    // 5. Final safety filter: Drop any non-printable or non-ASCII characters
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

/**
 * Transliterates a Hebrew word into Streamlined Phonetic ASCII script.
 */
export function transliterateHebrew(word: string): string {
  if (!word) return '';
  const clean = word.trim();
  if (SCRIPT_TO_TRANSLIT_MAP[clean]) {
    return sanitizeToCleanAscii(SCRIPT_TO_TRANSLIT_MAP[clean]);
  }

  let result = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (HEBREW_CONSONANTS[char]) {
      result += HEBREW_CONSONANTS[char];
    } else if (HEBREW_VOWELS[char] !== undefined) {
      result += HEBREW_VOWELS[char];
    } else if (char === '־') {
      result += '-';
    } else if (char === '׃') {
      result += '';
    } else if (/[a-zA-Z0-9\s]/.test(char)) {
      result += char;
    }
  }
  return sanitizeToCleanAscii(result || clean);
}

/**
 * Transliterates a Greek word into Streamlined Phonetic ASCII script.
 */
export function transliterateGreek(word: string): string {
  if (!word) return '';
  const clean = word.trim();
  if (SCRIPT_TO_TRANSLIT_MAP[clean]) {
    return sanitizeToCleanAscii(SCRIPT_TO_TRANSLIT_MAP[clean]);
  }

  // Pre-process diphthongs with upsilon (ou, au, eu, ui) and nasal gammas
  const preprocessed = clean
    // Nasal gammas
    .replace(/γγ/g, 'ng')
    .replace(/γκ/g, 'nk')
    .replace(/γχ/g, 'nch')
    .replace(/γξ/g, 'nx')
    .replace(/Γ[Γγ]/g, 'Ng')
    .replace(/Γ[Κκ]/g, 'Nk')
    .replace(/Γ[Χχ]/g, 'Nch')
    .replace(/Γ[Ξξ]/g, 'Nx')
    // Upsilon diphthongs (lowercase)
    .replace(/[οόὸ][υύὺῦ]/g, 'ou')
    .replace(/[αάὰ][υύὺῦ]/g, 'au')
    .replace(/[εέὲ][υύὺῦ]/g, 'eu')
    .replace(/[ηήὴ][υύὺῦ]/g, 'eu')
    .replace(/[υύὺ][ιίὶῖ]/g, 'ui')
    // Upsilon diphthongs (uppercase)
    .replace(/[Ο][υύὺῦ]/g, 'Ou')
    .replace(/[Α][υύὺῦ]/g, 'Au')
    .replace(/[Ε][υύὺῦ]/g, 'Eu');

  let result = '';
  for (let i = 0; i < preprocessed.length; i++) {
    const char = preprocessed[i];
    if (GREEK_CHAR_MAP[char] !== undefined) {
      result += GREEK_CHAR_MAP[char];
    } else if (char === '’' || char === "'") {
      result += "'";
    } else if (/[a-zA-Z0-9\s.,;·-]/.test(char)) {
      result += char;
    }
  }
  return sanitizeToCleanAscii(result || clean);
}

/**
 * Universal helper that transliterates either Hebrew or Greek word based on language or character range.
 */
export function getWordTransliteration(word: string, language?: 'Hebrew' | 'Greek' | string): string {
  if (!word) return '';
  const clean = word.trim();
  if (SCRIPT_TO_TRANSLIT_MAP[clean]) return SCRIPT_TO_TRANSLIT_MAP[clean];

  const isHeb = language === 'Hebrew' || /[\u0590-\u05FF]/.test(clean);
  if (isHeb) {
    return transliterateHebrew(clean);
  }
  return transliterateGreek(clean);
}
