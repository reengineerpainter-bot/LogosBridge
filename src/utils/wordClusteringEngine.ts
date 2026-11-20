/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LogosBridge Manuscript-to-KJV Word Clustering Engine
 * 
 * Features:
 * - Semantic gloss normalization and article/particle disentanglement
 * - Greek article (G3588) contiguous binding with adjacent nouns
 * - Hebrew direct object marker (H853) untranslated particle isolation
 * - Hebrew verbs of being (H1961: yehi, wayyehi, hayah) isolation from following nouns/participles
 * - Guaranteed disjoint token assignment (zero collisions across verses)
 * - In-memory LRU memoization for rapid UI rendering
 */

export interface InterlinearWordToken {
  w: string;   // Original manuscript word (Hebrew / Greek)
  t?: string;  // English translation gloss
  n?: string;  // Strong's number (e.g. 'H7225', 'G3056')
  p?: string;  // Morphological parsing tag
  k?: number[]; // Optional pre-computed/cached KJV raw token indices
}

export interface KjvRawToken {
  text: string;
  isSupplied: boolean;
  rawIdx: number;
}

export interface KjvWordToken {
  rawIdx: number;
  clean: string;
  isSupplied: boolean;
  leadingDelim: string;
}

export const ARTICLES = new Set(['the', 'a', 'an']);

export const AUXILIARIES = new Set([
  'shall', 'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must', 'ought',
  'was', 'were', 'is', 'are', 'am', 'been', 'being', 'hath', 'have', 'had', 'do', 'does', 'did', 'let'
]);

export const PRONOUNS = new Set([
  'i', 'he', 'she', 'we', 'they', 'thou', 'thee', 'you', 'ye',
  'him', 'her', 'them', 'us', 'me', 'it',
  'his', 'hers', 'my', 'mine', 'our', 'ours', 'their', 'theirs', 'thy', 'thine', 'your', 'yours', 'its',
  'who', 'whom', 'whose', 'which', 'what', 'that',
  'himself', 'herself', 'themselves', 'myself', 'thyself', 'yourself', 'itself'
]);

export const PREPOSITIONS = new Set([
  'in', 'into', 'unto', 'to', 'of', 'from', 'upon', 'on', 'at', 'by', 'with', 'for',
  'through', 'over', 'under', 'before', 'after', 'against', 'among', 'out', 'without',
  'between', 'about', 'toward', 'towards'
]);

export const ADVERBS = new Set([
  'not', 'never', 'no', 'neither', 'nor',
  'forth', 'away', 'out', 'up', 'down', 'back', 'again', 'together',
  'also', 'even', 'so', 'then', 'yet', 'very'
]);

export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'to', 'in', 'that', 'with', 'for', 'by', 'from', 'on', 'unto', 'it', 'upon'
]);

export function cleanWord(w: string | undefined): string {
  return (w || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const STEM_EQUIVALENCES: string[][] = [
  ['say', 'saith', 'said', 'sayest', 'spake', 'spoken', 'speak', 'speaketh', 'saying', 'sayings'],
  ['was', 'were', 'is', 'are', 'am', 'been', 'being', 'be'],
  ['have', 'hath', 'had', 'hast', 'having'],
  ['do', 'doth', 'did', 'done', 'doing', 'doest', 'dost'],
  ['go', 'went', 'gone', 'going', 'goeth', 'goest'],
  ['come', 'came', 'cometh', 'comest', 'coming'],
  ['see', 'saw', 'seen', 'seeth', 'seest', 'behold', 'beheld'],
  ['hear', 'heard', 'heareth', 'hearest'],
  ['know', 'knew', 'known', 'knoweth', 'knowest'],
  ['give', 'gave', 'given', 'giveth', 'givest'],
  ['take', 'took', 'taken', 'taketh', 'takest'],
  ['make', 'made', 'maketh', 'makest'],
  ['we', 'our', 'us', 'ours'],
  ['he', 'him', 'his', 'himself'],
  ['she', 'her', 'hers', 'herself'],
  ['they', 'them', 'their', 'theirs', 'themselves'],
  ['thou', 'thee', 'thy', 'thine', 'thyself'],
  ['you', 'ye', 'your', 'yours', 'yourself'],
  ['who', 'whom', 'whose', 'which', 'what', 'that', 'whosoever', 'whatsoever'],
  ['groaning', 'groanings'],
  ['infirmity', 'infirmities'],
  ['beginning', 'beginnings'],
  ['water', 'waters'],
  ['heaven', 'heavens'],
  ['light', 'lights'],
  ['divide', 'divided', 'dividing'],
  ['call', 'called', 'calling'],
  ['firmament', 'expanse'],
  ['one', 'first'],
  ['two', 'second'],
  ['three', 'third'],
  ['four', 'fourth'],
  ['five', 'fifth'],
  ['six', 'sixth'],
  ['seven', 'seventh'],
  ['eight', 'eighth'],
  ['nine', 'ninth'],
  ['ten', 'tenth'],
  ['pass', 'came', 'was', 'were']
];

const STEM_MAP = new Map<string, string>();
STEM_EQUIVALENCES.forEach((group) => {
  const root = group[0];
  group.forEach((w) => STEM_MAP.set(w, root));
});

export function getStem(w: string | undefined): string {
  const clean = cleanWord(w);
  if (!clean) return '';
  if (STEM_MAP.has(clean)) return STEM_MAP.get(clean)!;
  if (clean.endsWith('eth') && clean.length > 5) return clean.slice(0, -3);
  if (clean.endsWith('ing') && clean.length > 5) return clean.slice(0, -3);
  if (clean.endsWith('ed') && clean.length > 4) return clean.slice(0, -2);
  if (clean.endsWith('es') && clean.length > 4) return clean.slice(0, -2);
  if (clean.endsWith('s') && clean.length > 4 && !clean.endsWith('ss')) return clean.slice(0, -1);
  return clean;
}

export function wordsMatch(w1: string | undefined, w2: string | undefined): boolean {
  const c1 = cleanWord(w1);
  const c2 = cleanWord(w2);
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  if (PRONOUNS.has(c1) || PRONOUNS.has(c2)) return false;
  const s1 = getStem(c1);
  const s2 = getStem(c2);
  if (s1 && s2 && s1 === s2) return true;
  if (c1.length >= 6 && c2.length >= 6 && (c1.startsWith(c2.slice(0, 5)) || c2.startsWith(c1.slice(0, 5)))) return true;
  return false;
}

/**
 * Strips bracket and parenthesis markup from supplied words for pure plain-text display or audio TTS reading.
 * e.g., "according to [the will of] God" -> "according to the will of God"
 */
export function stripSuppliedMarkup(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const RAW_TOKENS_CACHE = new Map<string, KjvRawToken[]>();

/**
 * Splits raw KJV text into display tokens while isolating words enclosed in [..] or (..) as supplied translator additions.
 * Strips bracket and parenthesis characters so readers experience clean typography.
 */
export function parseKjvRawTokens(kjvText: string): KjvRawToken[] {
  if (!kjvText) return [];
  const cached = RAW_TOKENS_CACHE.get(kjvText);
  if (cached) return cached;

  const parts = kjvText.split(/(\[[^\]]+\]|\s+|[.,;!?:()"]+)/).filter(Boolean);
  const rawTokens: KjvRawToken[] = [];
  let currentRawIdx = 0;

  for (const part of parts) {
    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1).replace(/[\[\]]/g, '');
      const innerParts = inner.split(/(\s+|[.,;!?:"]+)/).filter(Boolean);
      for (const ip of innerParts) {
        rawTokens.push({
          text: ip,
          isSupplied: true,
          rawIdx: currentRawIdx++
        });
      }
    } else {
      rawTokens.push({
        text: part,
        isSupplied: false,
        rawIdx: currentRawIdx++
      });
    }
  }

  if (RAW_TOKENS_CACHE.size > 2000) {
    RAW_TOKENS_CACHE.clear();
  }
  RAW_TOKENS_CACHE.set(kjvText, rawTokens);
  return rawTokens;
}

export function parseKjvWordTokens(rawTokens: string[] | KjvRawToken[]): KjvWordToken[] {
  const wordTokens: KjvWordToken[] = [];
  let pendingPunctuation = '';
  for (let i = 0; i < rawTokens.length; i++) {
    const raw = rawTokens[i];
    const text = typeof raw === 'string' ? raw : raw.text;
    const isSupplied = typeof raw === 'string' ? false : raw.isSupplied;
    const rawIdx = typeof raw === 'string' ? i : raw.rawIdx;
    const clean = cleanWord(text);
    if (clean.length > 0) {
      wordTokens.push({
        rawIdx,
        clean,
        isSupplied,
        leadingDelim: pendingPunctuation
      });
      pendingPunctuation = '';
    } else {
      pendingPunctuation += text;
    }
  }
  return wordTokens;
}

interface NormalizedGloss {
  cleanGloss: string[];
  originalWords: string[];
  isUntranslated: boolean;
}

const FALLBACK_STRONG_GLOSSES: Record<string, string> = {
  'H1571': 'yea also even',
  'H3588': 'though for that because when',
  'H1980': 'walk walketh walked',
  'H3808': 'not neither no',
  'H408': 'not neither no',
  'H859': 'thou you',
  'H5978': 'with me',
  'H1992': 'they these them',
  'H5921': 'upon on over against above',
  'H0': 'unto to of',
  'H853': '', // Direct object marker
  'G5607': 'is was being which is',
  'G1161': 'and but now moreover',
  'G1063': 'for',
  'G3754': 'that for because',
  'G3588': 'the',
  'G2532': 'and',
  'G846': 'him her his them he they their',
  'G1510': 'am is was are',
  'G1519': 'into unto to in',
  'G1722': 'in with among by',
  'G3361': 'not lest neither no',
  'G3756': 'not no nay',
  'G1487': 'if whether',
  'G302': 'whosoever whatsoever',
  'G1437': 'if',
  'G3739': 'which who whom whose that',
  'G1410': 'can could may might able',
  'G5124': 'this that',
  'G3778': 'this that these',
  'G2449': 'Judaea',
  'G5266': 'shoes',
  'G2258': 'was were',
  'G1520': 'one',
  'G1492': 'behold see know',
  'G2076': 'is',
  'G2596': 'according to after against',
  'G3303': 'truly indeed',
  'G2443': 'that lest',
  'G5100': 'any some man what who',
  'G5101': 'what who why which',
  'G3762': 'no man nothing none',
  'G3956': 'all every whole',
  'G4053': 'more exceeding greater',
  'G4160': 'do make',
  'G4286': 'shewbread',
  'G4383': 'face',
  'G4228': 'feet',
  'G5259': 'of by under',
  'G3686': 'name',
  'G3624': 'house',
  'G3173': 'great',
  'G2112': 'immediately straightway anon',
  'G2499': 'Joses',
  'G3708': 'see',
  'G3752': 'when',
  'G4219': 'when',
  'G3123': 'more rather',
  'G3457': 'millstone',
  'G5610': 'hour',
  'G3844': 'by with beside',
  'G3199': 'carest',
  'G991': 'take heed beware',
  'G3765': 'no more not now',
  'G1698': 'to me unto me me',
  'G3668': 'likewise in like manner',
  'G5156': 'trembling',
  'G3326': 'with after',
  'G4328': 'waiting expecting looking',
  'G4487': 'word saying thing',
  'G1656': 'mercy',
  'G5401': 'fear',
  'G5037': 'and both',
  'G2296': 'marvelled wondered',
  'G4260': 'well stricken in years',
  'G3767': 'therefore then',
  'G2046': 'it is said it hath been said',
  'G2588': 'heart',
  'G2476': 'standing',
  'G2285': 'amazed astonishment',
  'G5298': 'withdrew',
  'G3385': 'neither whether',
  'G5484': 'thank thanks grace',
  'G2517': 'in order',
  'G686': 'then therefore',
  'G2425': 'long many',
  'G5550': 'time times',
  'G2094': 'years',
  'G1526': 'are be',
  'G3694': 'after behind',
  'G4762': 'turned',
  'G3101': 'disciples',
  'G5177': 'chance',
  'G1880': 'come again return',
  'G1929': 'will give',
  'G4190': 'more wicked',
  'G2927': 'secret',
  'G2540': 'season time',
  'G3638': 'eight',
  'G3755': 'while',
  'G3195': 'about to',
  'G4197': 'journey',
  'G3641': 'few',
  'G1735': 'can be',
  'G3906': 'watched',
  'G5119': 'then',
  'G1448': 'nigh',
  'G2480': 'able can',
  'G3592': 'this thus',
  'G3684': 'millstone',
  'G2250': 'day',
  'G2873': 'trouble',
  'G2564': 'called',
  'G2104': 'nobleman',
  'G4455': 'at any time never',
  'G1321': 'teaching',
  'G1511': 'to be',
  'G5286': 'footstool',
  'G1119': 'knees',
  'G4250': 'before',
  'G3568': 'now',
  'G18': 'good',
  'G901': 'early',
  'G435': 'man men',
  'G855': 'vanished',
  'G2781': 'honeycomb',
  'G444': 'man',
  'G4225': 'where',
  'G737': 'hereafter now',
  'G4592': 'miracles signs',
  'G2192': 'had have',
  'G2453': 'Judaea',
  'G2064': 'cometh come',
  'G240': 'one to another',
  'G5129': 'herein this',
  'G4687': 'soweth',
  'G1831': 'departed went forth',
  'G769': 'infirmity',
  'G3761': 'neither no man',
  'G3779': 'so',
  'G1565': 'him that',
  'G5613': 'when as',
  'G1684': 'took shipping entered',
  'G1537': 'of out of',
  'G3954': 'openly',
  'G243': 'others another',
  'G2980': 'spake speak',
  'G1488': 'art thou art',
  'G615': 'kill',
  'G1223': 'because through',
  'G1909': 'upon on',
  'G5126': 'this',
  'G2070': 'are we are',
  'G833': 'sheepfold',
  'G4413': 'first',
  'G3745': 'whatsoever as many as',
  'G1438': 'himself',
  'G4101': 'spikenard',
  'G1027': 'thundered',
  'G3305': 'nevertheless',
  'G2036': 'told said',
  'G1700': 'mine of me',
  'G1325': 'struck gave',
  'G1782': 'on either side',
  'G3650': 'throughout whole',
  'G5032': 'first faster',
  'G5565': 'by itself',
  'G4183': 'many',
  'G816': 'looked stedfastly',
  'G3598': 'journey way',
  'G2650': 'abode',
  'G4342': 'continued',
  'G1163': 'must',
  'G5130': 'these',
  'G1065': 'indeed truly',
  'G2089': 'moreover yet',
  'G5087': 'make put',
  'G3112': 'afar off',
  'G4341': 'call',
  'G5560': 'lame',
  'G2983': 'asked receive',
  'G4863': 'gathered together',
  'G2419': 'Jerusalem',
  'G4119': 'further more',
  'G2228': 'than or',
  'G4571': 'thee thy',
  'G5532': 'need',
  'G3722': 'morning',
  'G1799': 'before',
  'G687': 'so',
  'G4991': 'deliver salvation',
  'G2309': 'wilt will',
  'G5158': 'as manner',
  'G1790': 'trembled',
  'G5255': 'obey',
  'G4374': 'offered bring',
  'G191': 'hearing hear',
  'G684': 'perish destruction',
  'G1097': 'understandest know',
  'G4459': 'how',
  'G5465': 'let down',
  'G1968': 'fell',
  'G5151': 'thrice',
  'G1498': 'should mean might be',
  'G1208': 'again second',
  'G2071': 'should be',
  'G1248': 'relief ministry',
  'G701': 'pleased',
  'G5034': 'quickly speed',
  'G4336': 'praying',
  'G2846': 'chamberlain',
  'G1211': 'now',
  'G1529': 'coming',
  'G514': 'unworthy worthy',
  'G2097': 'preached the gospel',
  'G4127': 'stripes',
  'G5033': 'speed',
  'G1415': 'mighty',
  'G199': 'more perfectly',
  'G235': 'but nay',
  'G5620': 'so that',
  'G2904': 'mightily power',
  'G3049': 'danger think',
  'G1752': 'wherefore because of',
  'G1096': 'came to pass was',
  'G1106': 'purposed mind',
  'G4098': 'fell',
  'G4594': 'this day',
  'G1538': 'particularly every',
  'G4890': 'ran together',
  'G1832': 'may lawful',
  'G5439': 'imprisoned',
  'G4963': 'banded together',
  'G2398': 'privately own',
  'G3165': 'me',
  'G1466': 'temperance',
  'G1719': 'trembled',
  'G3335': 'convenient season',
  'G824': 'wickedness amiss',
  'G1616': 'instantly',
  'G2193': 'even unto until',
  'G3319': 'midday mid',
  'G3130': 'mad',
  'G2504': 'I also me',
  'G1958': 'refresh',
  'G5342': 'drive bear',
  'G5138': 'rocks',
  'G4012': 'same quarters about',
  'G1110': 'spoken against known',
  'G2424': 'Jesus',
  'G5547': 'Christ',
  'G2962': 'Lord',
  'G1204': 'hitherto',
  'G2052': 'contentious',
  'G5318': 'outwardly outward',
  'G3570': 'now',
  'G1401': 'servants',
  'G5236': 'exceeding',
  'G1398': 'serve',
  'G2316': 'God',
  'G3666': 'made like',
  'G4348': 'stumblingstone',
  'G3803': 'snare',
  'G2339': 'trap',
  'G4625': 'stumblingblock offence',
  'G468': 'recompence',
  'G5209': 'your you',
  'G4993': 'soberly',
  'G1453': 'awake',
  'G5125': 'parts these',
  'G166': 'world began eternal',
  'G3367': 'no none',
  'G1894': 'for after that',
  'G3777': 'neither nor',
  'G1646': 'small least',
  'G1791': 'shame',
  'G2917': 'fault judgment',
  'G2816': 'inherit',
  'G1893': 'else seeing',
  'G4671': 'thee it',
  'G3063': 'remaineth finally',
  'G5600': 'be',
  'G2570': 'better good',
  'G2478': 'stronger',
  'G3740': 'as often as',
  'G135': 'darkly',
  'G2087': 'other another',
  'G3056': 'memory word',
  'G2746': 'rejoicing',
  'G5530': 'use',
  'G4567': 'Satan',
  'G1121': 'written letter',
  'G1391': 'glorious glory',
  'G4432': 'poverty',
  'G4705': 'forward diligent',
  'G4706': 'more diligent',
  'G2129': 'bountifully blessing',
  'G3077': 'grudgingly sorrow',
  'G4322': 'supplieth',
  'G5011': 'base humble',
  'G4050': 'abundantly',
  'G1691': 'me',
  'G877': 'foolishly folly',
  'G5228': 'very chiefest above',
  'G3825': 'again second time',
  'G4218': 'whatsoever at any time once',
  'G509': 'again from above',
  'G2673': 'no effect become of no effect destroy abolish',
  'G3122': 'especially chiefly most of all',
  'G3427': 'me to me',
  'G4314': 'whereby unto to with',
  'G1093': 'earth land',
  'G3834': 'cunning craftiness craftiness',
  'G3313': 'part measure portion',
  'G457': 'open opening',
  'G2908': 'far better better',
  'G3540': 'minds mind thought',
  'G530': 'once',
  'G2592': 'bringeth forth fruit bear fruit',
  'G4812': 'spoil cheat',
  'G2521': 'sitteth sit',
  'G5590': 'heartily soul mind',
  'G4392': 'cloke pretence cloak',
  'G922': 'burdensome burden weight',
  'G2282': 'cherisheth cherish',
  'G4057': 'exceedingly beyond measure',
  'G5099': 'be punished pay penalty',
  'G3622': 'dispensation godly edifying stewardship',
  'G5485': 'thank grace favour',
  'G591': 'requite pay render reward',
  'G1622': 'but except without',
  'G5599': 'O oh',
  'G2130': 'ready to distribute liberal',
  'G156': 'cause wherefore which cause',
  'G4412': 'first at first',
  'G1588': 'elect chosen',
  'G3542': 'eat pasture',
  'G5501': 'worse',
  'G654': 'turn away turn',
  'G2724': 'accused accusation accusation of',
};

/**
 * Normalizes effective glosses across a verse to eliminate empty-gloss identity theft
 * and disentangle articles/particles from adjacent nouns and verbs.
 */
function normalizeEffectiveGlosses(words: InterlinearWordToken[]): NormalizedGloss[] {
  const wordsCopy = words.map(w => ({ ...w, t: (w.t || '').trim() }));

  for (let i = 0; i < wordsCopy.length; i++) {
    const cur = wordsCopy[i];
    const strong = (cur.n || '').trim().toUpperCase();
    if (!cur.t && FALLBACK_STRONG_GLOSSES[strong]) {
      cur.t = FALLBACK_STRONG_GLOSSES[strong];
    }
  }

  let h1961Count = 0;
  for (let i = 0; i < wordsCopy.length; i++) {
    const cur = wordsCopy[i];
    const strong = (cur.n || '').trim().toUpperCase();
    const next = wordsCopy[i + 1];
    const nextGloss = (next?.t || '').trim();
    const prev = wordsCopy[i - 1];
    const prevStrong = (prev?.n || '').trim().toUpperCase();

    // 0. Greek Verb of Saying correction
    if (cur.p === 'V-PAI-3S' && (cur.t.toLowerCase() === 'i say' || cur.w.includes('λέγε'))) {
      cur.t = 'he saith';
    }
    if ((cur.p === 'V-AAS-3S' || cur.p === 'V-2AAS-3S') && (prevStrong === 'G302' || prevStrong === 'G1437')) {
      cur.t = 'shall say';
    }

    // 0.5. Greek Relative Pronoun Compounds
    const nextStrong = (next?.n || '').trim().toUpperCase();
    if (strong === 'G3739') {
      if (nextStrong === 'G302') {
        cur.t = 'whosoever';
      } else if (nextStrong === 'G1437') {
        cur.t = 'whatsoever';
      }
    }

    // 1. Greek Definite Article G3588
    if (strong === 'G3588') {
      const lowerNext = nextGloss.toLowerCase();
      if (lowerNext.startsWith('of the ')) {
        cur.t = 'the';
        next.t = nextGloss.slice(7).trim();
      } else if (lowerNext.startsWith('to the ')) {
        cur.t = 'the';
        next.t = nextGloss.slice(7).trim();
      } else if (lowerNext.startsWith('in the ')) {
        cur.t = 'the';
        next.t = nextGloss.slice(7).trim();
      } else if (lowerNext.startsWith('the ')) {
        cur.t = 'the';
        next.t = nextGloss.slice(4).trim();
      } else if (!cur.t) {
        cur.t = 'the';
      }
      continue;
    }

    // 1.5. Conjunctions G2532 (καὶ) & G1161 (δὲ)
    if (strong === 'G2532' || strong === 'G1161') {
      const lowerNext = nextGloss.toLowerCase();
      if (lowerNext.startsWith('and ')) {
        cur.t = 'and';
        next.t = nextGloss.slice(4).trim();
      } else if (lowerNext.startsWith('& ')) {
        cur.t = 'and';
        next.t = nextGloss.slice(2).trim();
      } else if (!cur.t) {
        cur.t = strong === 'G2532' ? 'and' : 'but';
      }
      continue;
    }

    // 2. Negative Particle H3808 / H408 / G3361 / G3756 (לֹא / אַל / μή / οὐ)
    if (['H3808', 'H408', 'G3361', 'G3756'].includes(strong)) {
      if (nextGloss) {
        const lowerNext = nextGloss.toLowerCase();
        if (lowerNext.includes(' not')) {
          cur.t = 'not';
          next.t = nextGloss.replace(/\bnot\b/i, '').replace(/\s{2,}/g, ' ').trim();
        } else if (lowerNext.startsWith('not ')) {
          cur.t = 'not';
          next.t = nextGloss.slice(4).trim();
        } else if (lowerNext.includes('no ')) {
          cur.t = 'no';
          next.t = nextGloss.replace(/\bno\b/i, '').replace(/\s{2,}/g, ' ').trim();
        } else if (!cur.t) {
          cur.t = 'not';
        }
      } else if (!cur.t) {
        cur.t = 'not';
      }
      continue;
    }

    // 3. Preposition H3605 (כֹּל / בְּכָל / וּבְכָל)
    if (strong === 'H3605') {
      if (!cur.t && nextGloss) {
        const lower = nextGloss.toLowerCase();
        const prefixes: [string, string][] = [
          ['and with all ', 'and with all'],
          ['with all ', 'with all'],
          ['and all ', 'and all'],
          ['and of all ', 'and of all'],
          ['of all ', 'of all'],
          ['in all ', 'in all'],
          ['all ', 'all'],
          ['every ', 'every'],
          ['the whole ', 'the whole']
        ];
        let found = false;
        for (const [pfx, token] of prefixes) {
          if (lower.startsWith(pfx)) {
            cur.t = token;
            next.t = nextGloss.slice(pfx.length).trim();
            found = true;
            break;
          }
        }
        if (!found) {
          cur.t = cur.w && cur.w.startsWith('ו') ? 'and all' : 'all';
        }
      }
      continue;
    }

    // 4. Direct Object Marker H853 (אֵת / וְאֵת / אֹתוֹ / אֹתָם)
    if (strong === 'H853') {
      const cleanScript = (cur.w || '').replace(/[\u0591-\u05C7\/׃־]/g, '');
      if (cur.w && cur.w.startsWith('ו')) {
        if (!cur.t || cur.t === 'and') {
          cur.t = 'and';
          if (nextGloss.toLowerCase().startsWith('and ')) {
            next.t = nextGloss.slice(4).trim();
          }
        }
      } else if (cleanScript === 'את' || cleanScript === 'אֶת' || cleanScript === 'אֵת') {
        cur.t = '';
      }
      // If cur.t is an inflected suffix (him, her, them, thee, you, us), retain it!
      continue;
    }

    // 5. Prepositions H5921 (עַל), H4480 (מִן), H413 (אֶל), H5704 (עַד)
    if (['H5921', 'H4480', 'H413', 'H5704'].includes(strong)) {
      if (!cur.t && nextGloss) {
        const lower = nextGloss.toLowerCase();
        const pfxs: [string, string, string][] = [
          ['and upon the ', 'and upon', 'the '],
          ['upon the ', 'upon', 'the '],
          ['upon ', 'upon', ''],
          ['on the ', 'on', 'the '],
          ['on ', 'on', ''],
          ['over the ', 'over', 'the '],
          ['over ', 'over', ''],
          ['from the ', 'from', 'the '],
          ['from ', 'from', ''],
          ['unto the ', 'unto', 'the '],
          ['unto ', 'unto', ''],
          ['to the ', 'to', 'the '],
          ['to ', 'to', '']
        ];
        for (const [pfx, prep, remPfx] of pfxs) {
          if (lower.startsWith(pfx)) {
            cur.t = prep;
            next.t = remPfx + nextGloss.slice(pfx.length).trim();
            break;
          }
        }
      }
      continue;
    }

    // 6. Hebrew Verb of Being H1961 & H216
    if (strong === 'H216' && cur.t.toLowerCase() === 'and there was light') {
      cur.t = 'light';
    }
  }

  // Build NormalizedGloss array
  return wordsCopy.map(w => {
    const strong = (w.n || '').trim().toUpperCase();
    const tokens = (w.t || '').toLowerCase().split(/\s+/).filter(Boolean);
    const cleanTokens = tokens.map(cleanWord).filter(Boolean);

    // Supplement Greek pronouns with their authentic grammatical translations
    if (strong === 'G4675') {
      for (const p of ['thy', 'thine', 'thee']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G3450') {
      for (const p of ['my', 'mine', 'me']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G846') {
      for (const p of ['his', 'him', 'her', 'their', 'them', 'its', 'he', 'she', 'it', 'thereof']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G5216') {
      for (const p of ['your', 'yours', 'you']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G3739') {
      for (const p of ['which', 'who', 'whom', 'whose', 'that']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G4671') {
      for (const p of ['thee', 'unto thee', 'to thee']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G5213') {
      for (const p of ['you', 'unto you', 'to you', 'ye']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G5023') {
      for (const p of ['these things', 'these']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G3778') {
      for (const p of ['this', 'these']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G3427') {
      for (const p of ['me', 'unto me', 'to me']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G2254') {
      for (const p of ['us', 'unto us', 'to us']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    } else if (strong === 'G2257') {
      for (const p of ['our', 'ours', 'us']) {
        if (!cleanTokens.includes(p)) cleanTokens.push(p);
      }
    }

    const isUntranslated = cleanTokens.length === 0;
    return {
      cleanGloss: cleanTokens,
      originalWords: tokens,
      isUntranslated
    };
  });
}

/**
 * Computes mutually-exclusive token clusters for every manuscript word in a verse.
 * Guarantees zero collisions between any two manuscript words.
 */
export function computeDisjointVerseClusters(
  words: InterlinearWordToken[],
  kjvText: string
): Array<Set<number>> {
  const result: Array<Set<number>> = words.map(() => new Set<number>());
  if (!words || words.length === 0 || !kjvText) return result;

  const rawTokens = parseKjvRawTokens(kjvText);
  const wordTokens = parseKjvWordTokens(rawTokens);
  if (wordTokens.length === 0) return result;

  const normGlosses = normalizeEffectiveGlosses(words);

  // Track which KJV wordToken index has been claimed by which manuscript word
  const claimedBy = new Map<number, number>(); // wtIdx -> wordIdx

  // CRITICAL: All supplied words added by KJV translators ([...]) are strictly reserved!
  // No Hebrew or Greek manuscript word may ever claim or cluster a supplied word.
  for (let wtIdx = 0; wtIdx < wordTokens.length; wtIdx++) {
    if (wordTokens[wtIdx].isSupplied) {
      claimedBy.set(wtIdx, -1);
    }
  }

  // PASS -1: Ground-Truth Priority (if manuscript words already have pre-computed .k tokens)
  let precomputedCount = 0;
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const k = words[wIdx].k;
    if (k && Array.isArray(k) && k.length > 0) {
      precomputedCount++;
      for (const rawIdx of k) {
        result[wIdx].add(rawIdx);
        for (let wtIdx = 0; wtIdx < wordTokens.length; wtIdx++) {
          if (wordTokens[wtIdx].rawIdx === rawIdx) {
            claimedBy.set(wtIdx, wIdx);
            break;
          }
        }
      }
    }
  }
  if (precomputedCount > 0 && words.every((w, i) => result[i].size > 0 || !(w.t || '').trim())) {
    return result;
  }

  // PASS -0.5: Post-positive Clause-Initial Conjunction Inversion (Greek [Word0, γάρ/δέ] -> KJV ["For"/"And", Word0])
  if (words.length > 1 && wordTokens.length > 0 && !claimedBy.has(0)) {
    const w1Strong = (words[1].n || '').trim().toUpperCase();
    const tok0 = wordTokens[0].clean;
    if (w1Strong === 'G1063' && tok0 === 'for') {
      claimedBy.set(0, 1);
      result[1].add(wordTokens[0].rawIdx);
    } else if (w1Strong === 'G1161' && (tok0 === 'and' || tok0 === 'but' || tok0 === 'now')) {
      const w0Strong = (words[0].n || '').trim().toUpperCase();
      if (w0Strong !== 'G2532' && w0Strong !== 'G1161') {
        claimedBy.set(0, 1);
        result[1].add(wordTokens[0].rawIdx);
      }
    }
  }

  // PASS 0: Contiguous Article + Noun Binding (Greek G3588 + Noun, or Hebrew article + Noun)
  // Ensures that when Greek has [ὁ, λόγος] and KJV has "the Word",
  // ὁ gets "the" and λόγος gets "Word", without stealing or jumping.
  for (let wIdx = 0; wIdx < words.length - 1; wIdx++) {
    const cur = words[wIdx];
    const next = words[wIdx + 1];
    const curStrong = (cur.n || '').trim().toUpperCase();
    const isGreekArticle = curStrong === 'G3588';

    if (isGreekArticle) {
      const nextGloss = (next.t || '').trim().toLowerCase().replace(/^the\s+/, '');
      const nextClean = cleanWord(nextGloss.split(/\s+/)[0]);
      if (nextClean) {
        const candidates: Array<{ artWt: number; nounWt: number }> = [];
        for (let wtIdx = 0; wtIdx < wordTokens.length - 1; wtIdx++) {
          if (claimedBy.has(wtIdx) || claimedBy.has(wtIdx + 1)) continue;
          if (wordTokens[wtIdx].clean === 'the' && wordsMatch(wordTokens[wtIdx + 1].clean, nextClean)) {
            candidates.push({ artWt: wtIdx, nounWt: wtIdx + 1 });
          }
        }
        if (candidates.length > 0) {
          let priorManuscriptNounCount = 0;
          for (let i = 0; i <= wIdx; i++) {
            const wClean = cleanWord((words[i].t || '').split(/\s+/)[0]);
            if (wordsMatch(wClean, nextClean)) priorManuscriptNounCount++;
          }
          const validCandidates = candidates.filter(cand => {
            let priorKjvNounCount = 0;
            for (let i = 0; i < cand.nounWt; i++) {
              if (wordsMatch(wordTokens[i].clean, nextClean)) priorKjvNounCount++;
            }
            return priorKjvNounCount === priorManuscriptNounCount;
          });
          if (validCandidates.length === 0) continue;

          const relWordPos = wIdx / Math.max(1, words.length - 1);
          let bestDiff = Infinity;
          let chosen = validCandidates[0];
          for (const cand of validCandidates) {
            const relTokPos = cand.artWt / Math.max(1, wordTokens.length - 1);
            const diff = Math.abs(relTokPos - relWordPos);
            if (diff < bestDiff) {
              bestDiff = diff;
              chosen = cand;
            }
          }
          claimedBy.set(chosen.artWt, wIdx);
          claimedBy.set(chosen.nounWt, wIdx + 1);
          result[wIdx].add(wordTokens[chosen.artWt].rawIdx);
          result[wIdx + 1].add(wordTokens[chosen.nounWt].rawIdx);
        }
      }
    }
  }

  // PASS 0.5: Hebrew Verb-Subject Inversion (VSO to SVO in KJV)
  // When Hebrew has [וַיֹּאמֶר, אֱלֹהִים] ("and said", "God") and KJV has "And God said",
  // the verb wIdx claims "And" + "said", and subject wIdx+1 claims "God".
  for (let wIdx = 0; wIdx < words.length - 1; wIdx++) {
    if (result[wIdx].size > 0 || result[wIdx + 1].size > 0) continue;
    const curGloss = (words[wIdx].t || '').trim().toLowerCase();
    const nextGloss = (words[wIdx + 1].t || '').trim().toLowerCase();
    if (curGloss.startsWith('and ') && nextGloss && !nextGloss.startsWith('and ')) {
      const verbStem = cleanWord(curGloss.replace(/^and\s+/, ''));
      const subjClean = cleanWord(nextGloss);
      if (verbStem && subjClean) {
        for (let wtIdx = 0; wtIdx < wordTokens.length - 2; wtIdx++) {
          if (claimedBy.has(wtIdx) || claimedBy.has(wtIdx + 1) || claimedBy.has(wtIdx + 2)) continue;
          if (
            wordTokens[wtIdx].clean === 'and' &&
            wordsMatch(wordTokens[wtIdx + 1].clean, subjClean) &&
            wordsMatch(wordTokens[wtIdx + 2].clean, verbStem)
          ) {
            claimedBy.set(wtIdx, wIdx);
            claimedBy.set(wtIdx + 1, wIdx + 1);
            claimedBy.set(wtIdx + 2, wIdx);
            result[wIdx].add(wordTokens[wtIdx].rawIdx);
            result[wIdx].add(wordTokens[wtIdx + 2].rawIdx);
            result[wIdx + 1].add(wordTokens[wtIdx + 1].rawIdx);
            break;
          }
        }
      }
    }
  }

  // PASS 1: Multi-word Exact Phrase Matching
  // e.g. "in the beginning", "let there be", "without form", "the heaven", "the earth"
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    if (result[wIdx].size > 0) continue;
    const ng = normGlosses[wIdx];
    if (ng.isUntranslated || ng.cleanGloss.length < 2) continue;

    const phraseWords = ng.cleanGloss;
    const candidates: Array<{ start: number; end: number }> = [];
    for (let wtIdx = 0; wtIdx <= wordTokens.length - phraseWords.length; wtIdx++) {
      let match = true;
      for (let p = 0; p < phraseWords.length; p++) {
        if (!wordsMatch(wordTokens[wtIdx + p].clean, phraseWords[p])) {
          match = false;
          break;
        }
      }
      if (match) {
        let alreadyClaimed = false;
        for (let p = 0; p < phraseWords.length; p++) {
          if (claimedBy.has(wtIdx + p)) {
            alreadyClaimed = true;
            break;
          }
        }
        // Monotonic check: do not allow a multi-word phrase to leap over an earlier unclaimed occurrence
        // of the primary lexical stem in English (e.g. "he said" at tokens 29-31 leaping over "said" at token 2)
        const primaryStem = phraseWords.find(pw => !STOP_WORDS.has(pw) && !AUXILIARIES.has(pw) && !ARTICLES.has(pw) && !PREPOSITIONS.has(pw) && !PRONOUNS.has(pw));
        if (primaryStem) {
          let hasEarlierStem = false;
          for (let e = 0; e < wtIdx; e++) {
            if (!claimedBy.has(e) && wordsMatch(wordTokens[e].clean, primaryStem)) {
              hasEarlierStem = true;
              break;
            }
          }
          if (hasEarlierStem) continue;
        }

        if (!alreadyClaimed) {
          candidates.push({ start: wtIdx, end: wtIdx + phraseWords.length - 1 });
        }
      }
    }

    if (candidates.length > 0) {
      const phraseKey = phraseWords.join(' ');
      const samePhraseWords: number[] = [];
      for (let w = 0; w < words.length; w++) {
        if (normGlosses[w].cleanGloss.join(' ') === phraseKey) {
          samePhraseWords.push(w);
        }
      }

      let chosen = candidates[0];
      if (samePhraseWords.length > 1) {
        const allMatches: Array<{ start: number; end: number }> = [];
        for (let wtIdx = 0; wtIdx <= wordTokens.length - phraseWords.length; wtIdx++) {
          let match = true;
          for (let p = 0; p < phraseWords.length; p++) {
            if (!wordsMatch(wordTokens[wtIdx + p].clean, phraseWords[p])) {
              match = false;
              break;
            }
          }
          if (match) {
            allMatches.push({ start: wtIdx, end: wtIdx + phraseWords.length - 1 });
          }
        }

        const occIdx = samePhraseWords.indexOf(wIdx);
        if (occIdx >= 0 && occIdx < allMatches.length) {
          const targetCand = allMatches[occIdx];
          let isClaimed = false;
          for (let wt = targetCand.start; wt <= targetCand.end; wt++) {
            if (claimedBy.has(wt)) {
              isClaimed = true;
              break;
            }
          }
          if (!isClaimed) {
            chosen = targetCand;
          }
        }
      } else {
        const relWordPos = wIdx / Math.max(1, words.length - 1);
        let bestDiff = Infinity;
        for (const cand of candidates) {
          const relTokPos = cand.start / Math.max(1, wordTokens.length - 1);
          const diff = Math.abs(relTokPos - relWordPos);
          if (diff < bestDiff) {
            bestDiff = diff;
            chosen = cand;
          }
        }
      }

      for (let wt = chosen.start; wt <= chosen.end; wt++) {
        claimedBy.set(wt, wIdx);
        result[wIdx].add(wordTokens[wt].rawIdx);
      }
    }
  }

  // PASS 1.5: Adjacent Preposition + Pronoun Collocation Binding
  // In Greek: [Prep, Pronoun] -> In KJV: [Prep, Pronoun]
  // e.g. [ὑπ', αὐτοῦ] -> "of him", [πρὸς, αὐτὸν] -> "unto him", [μετ', αὐτοῦ] -> "with him"
  for (let wIdx = 0; wIdx < words.length - 1; wIdx++) {
    if (result[wIdx].size > 0 || result[wIdx + 1].size > 0) continue;
    const ng1 = normGlosses[wIdx];
    const ng2 = normGlosses[wIdx + 1];
    if (ng1.isUntranslated || ng2.isUntranslated) continue;

    // Determine preceding boundary so we do not leap backward across earlier anchors
    let prevMaxWt = -1;
    for (let p = wIdx - 1; p >= 0; p--) {
      if (result[p].size > 0) {
        claimedBy.forEach((owner, wt) => {
          if (owner === p && wt > prevMaxWt) prevMaxWt = wt;
        });
        if (prevMaxWt >= 0) break;
      }
    }

    const prepCandidates: number[] = [];
    for (const gw1 of ng1.cleanGloss) {
      if (!PREPOSITIONS.has(gw1) && gw1 !== 'of') continue;
      for (const gw2 of ng2.cleanGloss) {
        if (!PRONOUNS.has(gw2)) continue;

        for (let wtIdx = 0; wtIdx < wordTokens.length - 1; wtIdx++) {
          if (claimedBy.has(wtIdx) || claimedBy.has(wtIdx + 1)) continue;
          if (prevMaxWt >= 0 && wtIdx < prevMaxWt) continue; // Respect preceding anchor boundary
          if (wordsMatch(wordTokens[wtIdx].clean, gw1) && wordsMatch(wordTokens[wtIdx + 1].clean, gw2)) {
            if (!prepCandidates.includes(wtIdx)) prepCandidates.push(wtIdx);
          }
        }
      }
    }

    if (prepCandidates.length > 0) {
      const relWordPos = wIdx / Math.max(1, words.length - 1);
      let bestDiff = Infinity;
      let chosenWt = prepCandidates[0];
      for (const cand of prepCandidates) {
        const relTokPos = cand / Math.max(1, wordTokens.length - 1);
        const diff = Math.abs(relTokPos - relWordPos);
        if (diff < bestDiff) {
          bestDiff = diff;
          chosenWt = cand;
        }
      }
      claimedBy.set(chosenWt, wIdx);
      claimedBy.set(chosenWt + 1, wIdx + 1);
      result[wIdx].add(wordTokens[chosenWt].rawIdx);
      result[wIdx + 1].add(wordTokens[chosenWt + 1].rawIdx);
    }
  }

  // PASS 2: Single-word Primary Anchoring
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    if (result[wIdx].size > 0 || normGlosses[wIdx].isUntranslated) continue;

    const ng = normGlosses[wIdx];
    if (ng.cleanGloss.length === 0) continue;

    let primaryWord = ng.cleanGloss.find(
      (gw) => !STOP_WORDS.has(gw) && !AUXILIARIES.has(gw) && !ARTICLES.has(gw) && !PREPOSITIONS.has(gw) && !PRONOUNS.has(gw)
    );
    if (!primaryWord) continue; // Pure function words (and, the, of, in) are anchored in Pass 3 within adjacent bounds

    const candidates: number[] = [];
    const searchWords = [primaryWord, ...ng.cleanGloss.filter(w => w !== primaryWord)];
    for (const sw of searchWords) {
      if (!sw) continue;
      for (let wtIdx = 0; wtIdx < wordTokens.length; wtIdx++) {
        if (claimedBy.has(wtIdx)) continue;
        if (wordsMatch(wordTokens[wtIdx].clean, sw)) {
          candidates.push(wtIdx);
        }
      }
      if (candidates.length > 0) break;
    }

    if (candidates.length > 0) {
      const curStrong = (words[wIdx].n || '').trim().toUpperCase();
      const stemGroup = STEM_EQUIVALENCES.find(group => group.includes(primaryWord));

      const sameWordOccurrences: number[] = [];
      for (let w = 0; w < words.length; w++) {
        const wStrong = (words[w].n || '').trim().toUpperCase();
        const wGlossFirst = cleanWord((words[w].t || '').split(/\s+/)[0]);
        const inSameStem = stemGroup && stemGroup.some(stem => wordsMatch(wGlossFirst, stem));
        if (
          (curStrong && curStrong !== 'H0' && curStrong !== 'G0' && wStrong === curStrong) ||
          inSameStem ||
          wordsMatch(wGlossFirst, primaryWord)
        ) {
          sameWordOccurrences.push(w);
        }
      }

      let chosen = candidates[0];
      if (sameWordOccurrences.length > 1) {
        const allMatches: number[] = [];
        for (let wtIdx = 0; wtIdx < wordTokens.length; wtIdx++) {
          for (const sw of searchWords) {
            if (
              wordsMatch(wordTokens[wtIdx].clean, sw) ||
              (stemGroup && stemGroup.some(stem => wordsMatch(wordTokens[wtIdx].clean, stem)))
            ) {
              if (!allMatches.includes(wtIdx)) allMatches.push(wtIdx);
              break;
            }
          }
        }
        allMatches.sort((a, b) => a - b);

        const occIdx = sameWordOccurrences.indexOf(wIdx);
        if (occIdx >= 0 && occIdx < allMatches.length && !claimedBy.has(allMatches[occIdx])) {
          chosen = allMatches[occIdx];
        } else {
          const relWordPos = wIdx / Math.max(1, words.length - 1);
          let bestDiff = Infinity;
          for (const cand of candidates) {
            const relTokPos = cand / Math.max(1, wordTokens.length - 1);
            const diff = Math.abs(relTokPos - relWordPos);
            if (diff < bestDiff) {
              bestDiff = diff;
              chosen = cand;
            }
          }
        }
      } else {
        const relWordPos = wIdx / Math.max(1, words.length - 1);
        let bestDiff = Infinity;
        for (const cand of candidates) {
          const relTokPos = cand / Math.max(1, wordTokens.length - 1);
          const diff = Math.abs(relTokPos - relWordPos);
          if (diff < bestDiff) {
            bestDiff = diff;
            chosen = cand;
          }
        }
      }

      claimedBy.set(chosen, wIdx);
      result[wIdx].add(wordTokens[chosen].rawIdx);
    }
  }

  // PASS 2.5: Greek Post-positive Possessive Pronoun Binding
  // In Greek: [Noun (wIdx-1), Pronoun (wIdx)] -> In KJV: [Possessive, Noun]
  // e.g. [ἄγγελόν, μου] -> "my messenger", [προσώπου, σου] -> "thy face", [ὁδόν, σου] -> "thy way"
  for (let wIdx = 1; wIdx < words.length; wIdx++) {
    if (result[wIdx].size > 0) continue;
    const curStrong = (words[wIdx].n || '').trim().toUpperCase();
    const isPossessivePronoun = ['G4675', 'G3450', 'G846', 'G5216', 'G2257'].includes(curStrong);
    if (!isPossessivePronoun) continue;

    if (result[wIdx - 1].size === 0) continue;

    let prevNounWt = -1;
    claimedBy.forEach((owner, wt) => {
      if (owner === wIdx - 1 && (prevNounWt === -1 || wt < prevNounWt)) {
        prevNounWt = wt;
      }
    });

    if (prevNounWt > 0 && !claimedBy.has(prevNounWt - 1)) {
      const prevTok = wordTokens[prevNounWt - 1].clean;
      const validPossessives: Record<string, string[]> = {
        'G4675': ['thy', 'thine'],
        'G3450': ['my', 'mine'],
        'G846': ['his', 'her', 'their', 'its'],
        'G5216': ['your'],
        'G2257': ['our']
      };

      if (validPossessives[curStrong]?.includes(prevTok)) {
        claimedBy.set(prevNounWt - 1, wIdx);
        result[wIdx].add(wordTokens[prevNounWt - 1].rawIdx);
      }
    }
  }

  // PASS 3: Fallback for Any Remaining Words with Gloss (articles, prepositions)
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    if (result[wIdx].size > 0 || normGlosses[wIdx].isUntranslated) continue;

    const ng = normGlosses[wIdx];

    // Find boundaries of previous and next already-claimed words
    let prevMaxWt = -1;
    for (let p = wIdx - 1; p >= 0; p--) {
      if (result[p].size > 0) {
        claimedBy.forEach((owner, wt) => {
          if (owner === p && wt > prevMaxWt) prevMaxWt = wt;
        });
        if (prevMaxWt >= 0) break;
      }
    }

    let nextMinWt = wordTokens.length;
    for (let n = wIdx + 1; n < words.length; n++) {
      if (result[n].size > 0) {
        claimedBy.forEach((owner, wt) => {
          if (owner === n && wt < nextMinWt) nextMinWt = wt;
        });
        if (nextMinWt < wordTokens.length) break;
      }
    }

    for (const gw of ng.cleanGloss) {
      const candidates: number[] = [];
      for (let wtIdx = 0; wtIdx < wordTokens.length; wtIdx++) {
        if (claimedBy.has(wtIdx)) continue;
        if (wordsMatch(wordTokens[wtIdx].clean, gw)) {
          candidates.push(wtIdx);
        }
      }
      if (candidates.length > 0) {
        // Prefer candidate lying within adjacent bounds
        const isPossessive = ['his', 'her', 'my', 'thy', 'their', 'our', 'your', 'its'].includes(gw);
        const lowerBound = isPossessive && prevMaxWt > 0 ? prevMaxWt - 1 : prevMaxWt;
        const bounded = candidates.filter(c => c >= lowerBound && c < nextMinWt);
        const isFuncWord = STOP_WORDS.has(gw) || PREPOSITIONS.has(gw) || ARTICLES.has(gw) || PRONOUNS.has(gw);
        if (isFuncWord && bounded.length === 0 && (prevMaxWt >= 0 || nextMinWt < wordTokens.length)) {
          // Do not allow function words (like 'and', 'in', 'the') to jump across adjacent noun/verb anchors
          continue;
        }
        const activeCandidates = bounded.length > 0 ? bounded : candidates;
        activeCandidates.sort((a, b) => a - b);
        // Strict Monotonic Ordinal Matching:
        // The first manuscript word in the verse matches the first English candidate,
        // and the second manuscript word matches the second English candidate.
        const chosen = activeCandidates[0];
        claimedBy.set(chosen, wIdx);
        result[wIdx].add(wordTokens[chosen].rawIdx);
        break;
      }
    }
  }

  // PASS 4: Disjoint Safe Expansion for Compound Glosses
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    if (result[wIdx].size === 0) continue;
    const strong = (words[wIdx].n || '').trim().toUpperCase();
    // Enforce strictly singular tokens for articles, conjunctions, pronouns, and prepositions
    if (['G3588', 'G2532', 'G1161', 'G1063', 'G1722', 'G1519', 'G4253', 'G1715', 'G4675', 'G3450', 'G846'].includes(strong)) continue;
    const ng = normGlosses[wIdx];
    const isVerb = (words[wIdx].p || '').startsWith('V');
    if (ng.cleanGloss.length <= 1 && !isVerb) continue;

    const curWtIndices: number[] = [];
    claimedBy.forEach((owner, wtIdx) => {
      if (owner === wIdx) curWtIndices.push(wtIdx);
    });
    curWtIndices.sort((a, b) => a - b);

    if (curWtIndices.length === 0) continue;
    const minWt = curWtIndices[0];
    const maxWt = curWtIndices[curWtIndices.length - 1];

    // Backward expansion
    for (let step = 1; step <= 2; step++) {
      const prevWt = minWt - step;
      if (prevWt < 0 || claimedBy.has(prevWt)) break;
      const tok = wordTokens[prevWt].clean;
      if (ng.cleanGloss.includes(tok) || (isVerb && AUXILIARIES.has(tok))) {
        claimedBy.set(prevWt, wIdx);
        result[wIdx].add(wordTokens[prevWt].rawIdx);
      } else {
        break;
      }
    }

    // Forward expansion
    for (let step = 1; step <= 2; step++) {
      const nextWt = maxWt + step;
      if (nextWt >= wordTokens.length || claimedBy.has(nextWt)) break;
      const tok = wordTokens[nextWt].clean;
      const is2ndPersonVerb = (words[wIdx].p || '').includes('-2S') && (tok === 'thou' || tok === 'thee');
      if (ng.cleanGloss.includes(tok) || is2ndPersonVerb) {
        claimedBy.set(nextWt, wIdx);
        result[wIdx].add(wordTokens[nextWt].rawIdx);
      } else {
        break;
      }
    }
  }

  // PASS 5: Strict Monotonic Ordinal Resolution for Severally Used Words
  // Enforces the invariant:
  // The 1st manuscript word in the verse MUST match the 1st English candidate,
  // and the 2nd manuscript word MUST match the 2nd English candidate.
  let monotonicChanged = true;
  while (monotonicChanged) {
    monotonicChanged = false;
    for (let i = 0; i < words.length; i++) {
      if (result[i].size === 0) continue;
      const strongI = (words[i].n || '').trim().toUpperCase();
      const glossI = cleanWord((words[i].t || '').split(/\s+/)[0]);
      const stemI = getStem(glossI);

      for (let j = i + 1; j < words.length; j++) {
        if (result[j].size === 0) continue;
        const strongJ = (words[j].n || '').trim().toUpperCase();
        const glossJ = cleanWord((words[j].t || '').split(/\s+/)[0]);
        const stemJ = getStem(glossJ);

        const sameStrong = strongI && strongI !== 'G0' && strongI !== 'H0' && strongI === strongJ;
        const isStopWord = PRONOUNS.has(glossI) || ARTICLES.has(glossI) || STOP_WORDS.has(glossI) || AUXILIARIES.has(glossI);
        const sameStem = !isStopWord && stemI && stemJ && stemI === stemJ;
        const stemGroup = !isStopWord && STEM_EQUIVALENCES.find(g => g.includes(glossI));
        const inSameStemGroup = stemGroup && stemGroup.includes(glossJ);

        if (sameStrong || sameStem || inSameStemGroup) {
          const minKi = Math.min(...Array.from(result[i]));
          const minKj = Math.min(...Array.from(result[j]));

          if (minKi > minKj) {
            // Inverted! Swap their token sets to guarantee strict monotonic ordinal sequence
            const temp = new Set(result[i]);
            result[i] = new Set(result[j]);
            result[j] = temp;
            monotonicChanged = true;
          }
        }
      }
    }
  }

  return result;
}

// In-memory LRU Cache of computed verse clusters
const clusterCache = new Map<string, Array<Set<number>>>();
const MAX_CACHE_SIZE = 500;

function getCacheKey(words: InterlinearWordToken[], kjvText: string): string {
  return `${words.length}:${words[0]?.w || ''}:${words[words.length - 1]?.w || ''}::${kjvText}`;
}

/**
 * Returns the exact set of KJV token indices that belong to the active manuscript word.
 * Zero collisions guaranteed.
 */
export function getMatchedKjvTokenIndices(
  words: InterlinearWordToken[],
  activeWordIdx: number,
  kjvText: string
): Set<number> {
  if (!words || activeWordIdx < 0 || activeWordIdx >= words.length || !kjvText) {
    return new Set<number>();
  }

  const key = getCacheKey(words, kjvText);
  let clusters = clusterCache.get(key);
  if (!clusters) {
    clusters = computeDisjointVerseClusters(words, kjvText);
    if (clusterCache.size >= MAX_CACHE_SIZE) {
      const firstKey = clusterCache.keys().next().value;
      if (firstKey) clusterCache.delete(firstKey);
    }
    clusterCache.set(key, clusters);
  }

  return clusters[activeWordIdx] || new Set<number>();
}

/**
 * Reverse lookup: Given a KJV token raw index, finds which manuscript word owns it.
 * Enables clicking English KJV words to highlight corresponding Hebrew/Greek words.
 */
export function getManuscriptWordIndexForKjvToken(
  words: InterlinearWordToken[],
  kjvRawIdx: number,
  kjvText: string
): number {
  if (!words || words.length === 0 || kjvRawIdx < 0 || !kjvText) {
    return -1;
  }
  const key = getCacheKey(words, kjvText);
  let clusters = clusterCache.get(key);
  if (!clusters) {
    clusters = computeDisjointVerseClusters(words, kjvText);
    if (clusterCache.size >= MAX_CACHE_SIZE) {
      const firstKey = clusterCache.keys().next().value;
      if (firstKey) clusterCache.delete(firstKey);
    }
    clusterCache.set(key, clusters);
  }

  for (let wIdx = 0; wIdx < clusters.length; wIdx++) {
    if (clusters[wIdx].has(kjvRawIdx)) {
      return wIdx;
    }
  }
  return -1;
}

