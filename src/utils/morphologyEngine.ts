/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-precision Morphological Parsing and Lexical Engine for Biblical Hebrew and Greek.
 * Provides authentic grammatical parsing tags (e.g. N-NMS, V-qal-3ms, Prep, Conj)
 * and accurate contextual glosses for Strong's numbers across the Old and New Testaments.
 */

export interface WordMorphology {
  strongs: string;
  parsingTag: string; // e.g., 'N-fs-a', 'V-qal-3ms', 'Prep', 'Conj', 'N-NMS', 'V-AAI-3S'
  parsingDescription: string; // e.g., 'Noun Feminine Singular Absolute'
  partOfSpeech: 'Noun' | 'Verb' | 'Preposition' | 'Conjunction' | 'Article' | 'Adjective' | 'Pronoun' | 'Adverb' | 'Particle' | 'Interjection';
  language: 'Hebrew' | 'Greek';
  root?: string;
}

export interface MorphToken {
  abbr: string;
  name: string;
  meaning: string;
}

export interface DecodedMorphologyResult {
  tag: string;
  strongs: string;
  word: string;
  gloss: string;
  root: string;
  language: 'Hebrew' | 'Greek';
  fullTitle: string;
  tokens: MorphToken[];
  syntactic: string;
  pos: string;
  stem: string;
  tense: string;
  person: string;
  gender: string;
  number: string;
  state: string;
}

// Curated lookup table for frequent Biblical Hebrew grammatical constructs
const HEBREW_GRAMMAR_MAP: Record<string, { tag: string; desc: string; pos: WordMorphology['partOfSpeech'] }> = {
  // Common prefixes / functional words
  'H853': { tag: 'Particle-Acc', desc: 'Direct Object Marker (את)', pos: 'Particle' },
  'H9001': { tag: 'Prep-l', desc: 'Preposition: to, for (לְ)', pos: 'Preposition' },
  'H9002': { tag: 'Prep-b', desc: 'Preposition: in, with (בְּ)', pos: 'Preposition' },
  'H9003': { tag: 'Prep-k', desc: 'Preposition: as, like (כְּ)', pos: 'Preposition' },
  'H9004': { tag: 'Prep-m', desc: 'Preposition: from, of (מִ)', pos: 'Preposition' },
  'H9005': { tag: 'Conj-w', desc: 'Conjunction: and, but (וְ)', pos: 'Conjunction' },
  'H9006': { tag: 'Art-h', desc: 'Definite Article: the (הַ)', pos: 'Article' },

  // Key Theological Lexemes - Genesis / Law / Prophets
  'H7225': { tag: 'HR/Ncfsa', desc: 'Noun Feminine Singular Absolute (Beginning / Chief)', pos: 'Noun' },
  'H1254': { tag: 'V-Qal-Perf-3ms', desc: 'Verb Qal Perfect 3ms (Created out of nothing)', pos: 'Verb' },
  'H430': { tag: 'N-mp', desc: 'Noun Masculine Plural (God / Elohim)', pos: 'Noun' },
  'H8064': { tag: 'HT/N-md', desc: 'Noun Masculine Dual/Plural (Heavens / Sky)', pos: 'Noun' },
  'H776': { tag: 'HT/N-fs', desc: 'Noun Feminine Singular (Earth / Land)', pos: 'Noun' },
  'H1961': { tag: 'V-Qal-Perf-3fs', desc: 'Verb Qal Perfect (To be / became / was)', pos: 'Verb' },
  'H8414': { tag: 'N-ms', desc: 'Noun Masculine Singular (Formlessness / Chaos)', pos: 'Noun' },
  'H922': { tag: 'HC/N-ms', desc: 'Noun Masculine Singular (Void / Emptiness)', pos: 'Noun' },
  'H2822': { tag: 'HC/N-ms', desc: 'Noun Masculine Singular (Darkness)', pos: 'Noun' },
  'H5921': { tag: 'HR/N-c', desc: 'Preposition (Upon / Above / Over)', pos: 'Preposition' },
  'H6440': { tag: 'HR/N-c', desc: 'Noun Common Dual/Plural (Face / Surface / Presence)', pos: 'Noun' },
  'H8415': { tag: 'N-f', desc: 'Noun Feminine Singular (Deep / Abyss)', pos: 'Noun' },
  'H7307': { tag: 'HC/N-f', desc: 'Noun Feminine Singular (Spirit / Wind / Breath)', pos: 'Noun' },
  'H7363': { tag: 'V-Piel-Ptcp-fs', desc: 'Verb Piel Participle fs (Hovering / Vibrating / Brooding)', pos: 'Verb' },
  'H4325': { tag: 'HT/N-md', desc: 'Noun Masculine Plural (Waters)', pos: 'Noun' },
  'H559': { tag: 'HC/V-Qal-Impf-3ms', desc: 'Verb Qal Imperfect 3ms (Said / Commanded)', pos: 'Verb' },
  'H216': { tag: 'N-ms', desc: 'Noun Masculine Singular (Light / Illumination)', pos: 'Noun' },
  'H7200': { tag: 'V-Qal-Impf-3ms', desc: 'Verb Qal Imperfect 3ms (Saw / Perceived)', pos: 'Verb' },
  'H3588': { tag: 'Conj', desc: 'Conjunction (That / Because / For)', pos: 'Conjunction' },
  'H2896': { tag: 'Adj-ms', desc: 'Adjective Masculine Singular (Good / Pleasant / Beneficial)', pos: 'Adjective' },
  'H914': { tag: 'V-Hifil-Impf-3ms', desc: 'Verb Hifil Imperfect 3ms (Divided / Separated)', pos: 'Verb' },
  'H996': { tag: 'Prep', desc: 'Preposition (Between / Distinct)', pos: 'Preposition' },
  'H7121': { tag: 'V-Qal-Impf-3ms', desc: 'Verb Qal Imperfect 3ms (Called / Proclaimed)', pos: 'Verb' },
  'H3117': { tag: 'N-ms', desc: 'Noun Masculine Singular (Day / Time)', pos: 'Noun' },
  'H3915': { tag: 'N-ms', desc: 'Noun Masculine Singular (Night)', pos: 'Noun' },
  'H6153': { tag: 'N-ms', desc: 'Noun Masculine Singular (Evening / Dusk)', pos: 'Noun' },
  'H1242': { tag: 'N-ms', desc: 'Noun Masculine Singular (Morning / Dawn)', pos: 'Noun' },
  'H259': { tag: 'Num-ms', desc: 'Numeral Cardinal Masculine Singular (One / First)', pos: 'Adjective' },
  'H7549': { tag: 'N-ms', desc: 'Noun Masculine Singular (Expanse / Firmament / Vault)', pos: 'Noun' },
  'H6213': { tag: 'V-Qal-Impf-3ms', desc: 'Verb Qal Imperfect (Made / Fashioned)', pos: 'Verb' },
  'H3068': { tag: 'N-prop', desc: 'Proper Name (Yahweh / LORD / The Eternal Covenant Name)', pos: 'Noun' },
  'H120': { tag: 'N-ms', desc: 'Noun Masculine Singular (Man / Humanity / Adam)', pos: 'Noun' },
  'H6754': { tag: 'N-ms', desc: 'Noun Masculine Singular (Image / Representation)', pos: 'Noun' },
  'H1823': { tag: 'N-fs', desc: 'Noun Feminine Singular (Likeness / Resemblance)', pos: 'Noun' },
  'H7287': { tag: 'V-Qal-Impf-3mp', desc: 'Verb Qal Imperfect 3mp (Have dominion / Rule)', pos: 'Verb' },
  'H1288': { tag: 'V-Piel-Impf-3ms', desc: 'Verb Piel Imperfect 3ms (Blessed / Imparted favor)', pos: 'Verb' },
  'H6509': { tag: 'V-Qal-Imperat-mp', desc: 'Verb Qal Imperative mp (Be fruitful)', pos: 'Verb' },
  'H7235': { tag: 'V-Qal-Imperat-mp', desc: 'Verb Qal Imperative mp (Multiply / Increase)', pos: 'Verb' },
  'H4390': { tag: 'V-Qal-Imperat-mp', desc: 'Verb Qal Imperative mp (Fill / Replenish)', pos: 'Verb' },
  'H3533': { tag: 'V-Qal-Imperat-mp', desc: 'Verb Qal Imperative mp (Subdue / Bring into order)', pos: 'Verb' },
  'H7673': { tag: 'V-Qal-Perf-3ms', desc: 'Verb Qal Perfect 3ms (Rested / Ceased from labor)', pos: 'Verb' },
  'H6942': { tag: 'V-Piel-Impf-3ms', desc: 'Verb Piel Imperfect 3ms (Sanctified / Set apart)', pos: 'Verb' },
  'H5315': { tag: 'N-fs', desc: 'Noun Feminine Singular (Soul / Living Being / Breath of Life)', pos: 'Noun' },
  'H2416': { tag: 'Adj-fs', desc: 'Adjective Feminine Singular (Living / Alive)', pos: 'Adjective' },
  'H3966': { tag: 'Adv', desc: 'Adverb (Exceedingly / Very)', pos: 'Adverb' },
  'H2009': { tag: 'Interj', desc: 'Interjection (Behold / Lo / Look)', pos: 'Interjection' },
  'H834': { tag: 'Pron-rel', desc: 'Relative Pronoun (Which / Who / That)', pos: 'Pronoun' }
};

// Curated lookup table for frequent Biblical Greek grammatical constructs
const GREEK_GRAMMAR_MAP: Record<string, { tag: string; desc: string; pos: WordMorphology['partOfSpeech'] }> = {
  // Function words & particles
  'G1722': { tag: 'Prep-D', desc: 'Preposition with Dative (In / Within / By)', pos: 'Preposition' },
  'G746': { tag: 'N-DFS', desc: 'Noun Dative Feminine Singular (Beginning / Origin / Ruler)', pos: 'Noun' },
  'G2258': { tag: 'V-IAI-3S', desc: 'Verb Imperfect Active Indicative 3s (Was / Continuous Existence)', pos: 'Verb' },
  'G3588': { tag: 'Art-NMS', desc: 'Definite Article Nom Masc Sing (The)', pos: 'Article' },
  'G3056': { tag: 'N-NMS', desc: 'Noun Nominative Masculine Singular (The Word / Logos / Expression)', pos: 'Noun' },
  'G2532': { tag: 'Conj', desc: 'Conjunction (And / Also / Even)', pos: 'Conjunction' },
  'G4314': { tag: 'Prep-A', desc: 'Preposition with Accusative (Toward / With / Face to Face)', pos: 'Preposition' },
  'G2316': { tag: 'N-AMS', desc: 'Noun Accusative Masculine Singular (God / Theos)', pos: 'Noun' },
  'G3778': { tag: 'DPro-NMS', desc: 'Demonstrative Pronoun Nom Masc Sing (This One / He)', pos: 'Pronoun' },
  'G3956': { tag: 'Adj-NNP', desc: 'Adjective Nominative Plural Neuter (All things / Every)', pos: 'Adjective' },
  'G1223': { tag: 'Prep-G', desc: 'Preposition with Genitive (Through / By means of)', pos: 'Preposition' },
  'G846': { tag: 'PPro-GM3S', desc: 'Personal Pronoun Genitive Masc Sing (Of Him / His)', pos: 'Pronoun' },
  'G1096': { tag: 'V-AIM-3S', desc: 'Verb Aorist Indicative Middle 3s (Came into being / Made)', pos: 'Verb' },
  'G5565': { tag: 'Adv', desc: 'Preposition / Adverb (Apart from / Without)', pos: 'Preposition' },
  'G3761': { tag: 'Adv-Neg', desc: 'Negative Adverb (Not even / Neither)', pos: 'Adverb' },
  'G1520': { tag: 'Adj-NNS', desc: 'Adjective Nominative Singular Neuter (One / Single)', pos: 'Adjective' },
  'G3739': { tag: 'RelPro-NNS', desc: 'Relative Pronoun Nom Sing Neuter (Which / That which)', pos: 'Pronoun' },
  'G2222': { tag: 'N-NSF', desc: 'Noun Nominative Feminine Singular (Life / Zoe / Divine Vitality)', pos: 'Noun' },
  'G5457': { tag: 'N-NSN', desc: 'Noun Nominative Neuter Singular (Light / Phos)', pos: 'Noun' },
  'G444': { tag: 'N-GPM', desc: 'Noun Genitive Plural Masculine (Of men / Humanity)', pos: 'Noun' },
  'G5316': { tag: 'V-PAI-3S', desc: 'Verb Present Active Indicative 3s (Shines / Radiates)', pos: 'Verb' },
  'G4653': { tag: 'N-DSF', desc: 'Noun Dative Feminine Singular (Darkness / Obscurity)', pos: 'Noun' },
  'G2638': { tag: 'V-AAI-3S', desc: 'Verb Aorist Active Indicative 3s (Overcame / Comprehended)', pos: 'Verb' },
  'G3756': { tag: 'Adv-Neg', desc: 'Negative Particle (Not)', pos: 'Particle' },
  'G4561': { tag: 'N-NFS', desc: 'Noun Nominative Feminine Singular (Flesh / Humanity)', pos: 'Noun' },
  'G4637': { tag: 'V-AAI-3S', desc: 'Verb Aorist Active Indicative 3s (Tabernacled / Dwelt)', pos: 'Verb' },
  'G2300': { tag: 'V-ADI-1P', desc: 'Verb Aorist Deponent Indicative 1p (Beheld / Contemplated)', pos: 'Verb' },
  'G1391': { tag: 'N-ASF', desc: 'Noun Accusative Feminine Singular (Glory / Radiance / Doxa)', pos: 'Noun' },
  'G3439': { tag: 'Adj-GSM', desc: 'Adjective Genitive Masculine Singular (Only Begotten / Unique / Monogenes)', pos: 'Adjective' },
  'G3844': { tag: 'Prep-G', desc: 'Preposition with Genitive (From / Beside)', pos: 'Preposition' },
  'G3962': { tag: 'N-GSM', desc: 'Noun Genitive Masculine Singular (Father)', pos: 'Noun' },
  'G4134': { tag: 'Adj-GSM', desc: 'Adjective Genitive Singular (Full of / Abundant)', pos: 'Adjective' },
  'G5485': { tag: 'N-GSF', desc: 'Noun Genitive Feminine Singular (Grace / Unmerited Favor / Charis)', pos: 'Noun' },
  'G225': { tag: 'N-GSF', desc: 'Noun Genitive Feminine Singular (Truth / Reality / Aletheia)', pos: 'Noun' },
  'G4102': { tag: 'N-NSF', desc: 'Noun Nominative Feminine Singular (Faith / Trust / Pistis)', pos: 'Noun' },
  'G26': { tag: 'N-NSF', desc: 'Noun Nominative Feminine Singular (Love / Divine Affection / Agape)', pos: 'Noun' },
  'G4151': { tag: 'N-NSN', desc: 'Noun Nominative Neuter Singular (Spirit / Breath / Pneuma)', pos: 'Noun' },
  'G40': { tag: 'Adj-NSN', desc: 'Adjective Nominative Neuter Singular (Holy / Set apart / Hagios)', pos: 'Adjective' },
  'G2424': { tag: 'N-NMS', desc: 'Proper Noun (Jesus / Yeshua / Savior)', pos: 'Noun' },
  'G5547': { tag: 'N-NMS', desc: 'Proper Noun / Title (Christ / Anointed One / Messiah)', pos: 'Noun' },
  'G2962': { tag: 'N-NMS', desc: 'Noun Nominative Masculine Singular (Lord / Master / Kyrios)', pos: 'Noun' },
  'G3004': { tag: 'V-PAI-1S', desc: 'Verb Present Active Indicative 1s (I say / Speak)', pos: 'Verb' },
  'G2071': { tag: 'V-FDI-3S', desc: 'Verb Future Deponent Indicative 3s (Shall be / Shall have)', pos: 'Verb' }
};

/**
 * Derives the optimal parsing tag and description for any Hebrew or Greek Strong's number.
 */
export function getWordMorphology(strongs: string, originalWord?: string, defaultLang?: 'Hebrew' | 'Greek'): WordMorphology {
  const normStrongs = (strongs || '').toUpperCase().trim();
  const isHebrew = normStrongs.startsWith('H') || defaultLang === 'Hebrew';

  if (isHebrew) {
    const entry = HEBREW_GRAMMAR_MAP[normStrongs];
    if (entry) {
      return {
        strongs: normStrongs,
        parsingTag: entry.tag,
        parsingDescription: entry.desc,
        partOfSpeech: entry.pos,
        language: 'Hebrew'
      };
    }

    // Algorithmic morphology heuristics for Hebrew
    let tag = 'N-ms';
    let desc = 'Noun Masculine';
    let pos: WordMorphology['partOfSpeech'] = 'Noun';

    const num = parseInt(normStrongs.replace('H', ''), 10);
    if (!isNaN(num)) {
      if (num >= 853 && num <= 859) {
        tag = 'Particle-Acc';
        desc = 'Particle / Preposition';
        pos = 'Particle';
      } else if (num >= 1000 && num <= 2500) {
        tag = 'V-Qal-Perf-3ms';
        desc = 'Verb Qal Stem';
        pos = 'Verb';
      } else if (num >= 8000) {
        tag = 'N-fs';
        desc = 'Noun Feminine';
        pos = 'Noun';
      }
    }

    // Inspect word prefixes/suffixes
    if (originalWord) {
      if (originalWord.startsWith('וְ') || originalWord.startsWith('וַ') || originalWord.startsWith('וּ')) {
        tag = `HC/${tag}`;
      } else if (originalWord.startsWith('הַ') || originalWord.startsWith('הָ')) {
        tag = `HT/${tag}`;
      } else if (originalWord.startsWith('בְּ') || originalWord.startsWith('בַּ')) {
        tag = `HR/${tag}`;
      } else if (originalWord.startsWith('לְ') || originalWord.startsWith('לַ')) {
        tag = `HR/${tag}`;
      } else if (originalWord.endsWith('ִים') || originalWord.endsWith('ִים׃')) {
        tag = tag.replace('-ms', '-mp').replace('-fs', '-mp');
      } else if (originalWord.endsWith('וֹת') || originalWord.endsWith('וֹת׃')) {
        tag = tag.replace('-ms', '-fp').replace('-fs', '-fp');
      }
    }

    return {
      strongs: normStrongs,
      parsingTag: tag,
      parsingDescription: desc,
      partOfSpeech: pos,
      language: 'Hebrew'
    };
  }

  // Greek morphology lookup
  const entry = GREEK_GRAMMAR_MAP[normStrongs];
  if (entry) {
    return {
      strongs: normStrongs,
      parsingTag: entry.tag,
      parsingDescription: entry.desc,
      partOfSpeech: entry.pos,
      language: 'Greek'
    };
  }

  // Algorithmic heuristics for Greek
  let tag = 'N-NMS';
  let desc = 'Noun Nom Masc Sing';
  let pos: WordMorphology['partOfSpeech'] = 'Noun';

  const num = parseInt(normStrongs.replace('G', ''), 10);
  if (!isNaN(num)) {
    if ([1722, 1519, 1537, 4314, 1223, 3844, 4862, 5259].includes(num)) {
      tag = 'Prep';
      desc = 'Preposition';
      pos = 'Preposition';
    } else if ([2532, 1161, 3754, 3778, 1063, 2228, 3767, 3756].includes(num)) {
      tag = 'Conj';
      desc = 'Conjunction / Particle';
      pos = 'Conjunction';
    } else if ((num >= 2000 && num <= 3000) || num === 3004 || num === 2071) {
      tag = num === 3004 ? 'V-PAI-1S' : (num === 2071 ? 'V-FDI-3S' : 'V-PAI-3S');
      desc = num === 3004 ? 'Verb Present Active Indicative 1s (I say)' : (num === 2071 ? 'Verb Future Deponent Indicative 3s (Shall be / have)' : 'Verb Present Active Indicative');
      pos = 'Verb';
    }
  }

  if (originalWord) {
    if (originalWord.endsWith('ος') || originalWord.endsWith('ός') || originalWord.endsWith('ης')) {
      tag = 'N-NMS';
    } else if (originalWord.endsWith('ου') || originalWord.endsWith('οῦ')) {
      tag = 'N-GSM';
    } else if (originalWord.endsWith('ῳ') || originalWord.endsWith('ῷ')) {
      tag = 'N-DMS';
    } else if (originalWord.endsWith('ον') || originalWord.endsWith('όν')) {
      tag = 'N-AMS';
    } else if (originalWord.endsWith('ων') || originalWord.endsWith('ῶν')) {
      tag = 'N-GPM';
    } else if (originalWord.endsWith('α') || originalWord.endsWith('η')) {
      tag = 'N-NFS';
    } else if (originalWord.endsWith('ας') || originalWord.endsWith('ης')) {
      tag = 'N-GFS';
    } else if (originalWord.endsWith('αις') || originalWord.endsWith('οις')) {
      tag = 'N-DMP';
    }
  }

  return {
    strongs: normStrongs,
    parsingTag: tag,
    parsingDescription: desc,
    partOfSpeech: pos,
    language: 'Greek'
  };
}

// Comprehensive dictionary mapping grammatical abbreviations to full academic titles and clear meanings
const TOKEN_DEFINITIONS: Record<string, { name: string; meaning: string }> = {
  // Part of speech
  'V': { name: 'Verb', meaning: 'Part of speech denoting action, occurrence, or state of being.' },
  'N': { name: 'Noun', meaning: 'Substantive part of speech denoting a person, place, thing, or concept.' },
  'Adj': { name: 'Adjective', meaning: 'Modifier qualifying the nature, scope, or attributes of a noun.' },
  'A': { name: 'Adjective', meaning: 'Modifier qualifying the nature, scope, or attributes of a noun.' },
  'Prep': { name: 'Preposition', meaning: 'Relational particle expressing direction, sphere, time, or cause.' },
  'Conj': { name: 'Conjunction', meaning: 'Connective joining words, clauses, or sequential sentences.' },
  'Art': { name: 'Definite Article', meaning: 'Specific grammatical marker denoting definite identity.' },
  'T': { name: 'Definite Article', meaning: 'Specific grammatical marker denoting definite identity.' },
  'Pron': { name: 'Pronoun', meaning: 'Substantive word referring to or replacing a noun.' },
  'PPro': { name: 'Personal Pronoun', meaning: 'Pronoun referring directly to a specific person or divine subject.' },
  'DPro': { name: 'Demonstrative Pronoun', meaning: 'Pronoun pointing out a specific person or object (\'this one / that one\').' },
  'RelPro': { name: 'Relative Pronoun', meaning: 'Pronoun introducing a relative modifying clause (\'who / which / that\').' },
  'Adv': { name: 'Adverb', meaning: 'Modifier expressing manner, degree, time, or spatial relation.' },
  'Adv-Neg': { name: 'Negative Adverb / Particle', meaning: 'Emphatic particle of negation (\'not / not even / neither\').' },
  'Particle': { name: 'Grammatical Particle', meaning: 'Uninflected functional word serving a syntactic relation.' },
  'Acc': { name: 'Accusative / Direct Object Sign', meaning: 'Grammatically marks the definite direct object in the clause.' },
  'Particle-Acc': { name: 'Particle Accusative', meaning: 'Direct object sign pointing to the definite direct object.' },
  'Interj': { name: 'Interjection', meaning: 'Exclamatory word expressing sudden emotion, focus, or call to attention (\'behold!\').' },

  // Hebrew Prefixes
  'HR': { name: 'Preposition Prefix (Hebrew)', meaning: 'Preposition attached directly as a prefix (bə- \'in/with\', lə- \'to/for\', kə- \'as\', mi- \'from\').' },
  'HC': { name: 'Conjunction Prefix (Waw)', meaning: 'The letter Waw attached as a direct prefix meaning \'and / then / but\'.' },
  'HT': { name: 'Definite Article Prefix', meaning: 'The letter He attached as a prefix meaning \'the\'.' },
  'Hd': { name: 'Demonstrative Prefix', meaning: 'Demonstrative particle pointing to a specific focus.' },
  'Hq': { name: 'Interrogative Prefix', meaning: 'Interrogative particle introducing an inquiry (\'whether / ?\').' },

  // Hebrew Stems (Binyanim)
  'Qal': { name: 'Qal Stem (Simple Active)', meaning: 'Primary Hebrew verbal stem expressing direct, unaugmented active voice by the subject.' },
  'Niph': { name: 'Niphal Stem (Simple Passive/Reflexive)', meaning: 'Verbal stem expressing simple passive reception or self-directed reflexive action.' },
  'Niphal': { name: 'Niphal Stem (Simple Passive/Reflexive)', meaning: 'Verbal stem expressing simple passive reception or self-directed reflexive action.' },
  'Piel': { name: 'Piel Stem (Intensive Active)', meaning: 'Intensive/iterative verbal stem expressing vibrant, cherishing, or factitive action.' },
  'Pual': { name: 'Pual Stem (Intensive Passive)', meaning: 'Passive counterpart of the Piel stem expressing intensive reception of an action.' },
  'Hif': { name: 'Hiphil Stem (Causative Active)', meaning: 'Causative stem denoting that the subject causes another entity or reality to act.' },
  'Hifil': { name: 'Hiphil Stem (Causative Active)', meaning: 'Causative stem denoting that the subject causes another entity or reality to act.' },
  'Hiph': { name: 'Hiphil Stem (Causative Active)', meaning: 'Causative stem denoting that the subject causes another entity or reality to act.' },
  'Hiphil': { name: 'Hiphil Stem (Causative Active)', meaning: 'Causative stem denoting that the subject causes another entity or reality to act.' },
  'Hoph': { name: 'Hophal Stem (Causative Passive)', meaning: 'Passive counterpart of the Hiphil causative stem.' },
  'Hophal': { name: 'Hophal Stem (Causative Passive)', meaning: 'Passive counterpart of the Hiphil causative stem.' },
  'Hith': { name: 'Hithpael Stem (Intensive Reflexive)', meaning: 'Intensive reflexive or reciprocal verbal stem.' },
  'Hithp': { name: 'Hithpael Stem (Intensive Reflexive)', meaning: 'Intensive reflexive or reciprocal verbal stem.' },
  'Hithpael': { name: 'Hithpael Stem (Intensive Reflexive)', meaning: 'Intensive reflexive or reciprocal verbal stem.' },

  // Hebrew Conjugations / Aspects / Moods
  'Perf': { name: 'Perfect Aspect (Suffix Conjugation)', meaning: 'Completed action viewed in its entirety as an accomplished, unified historical certainty.' },
  'Impf': { name: 'Imperfect Aspect (Prefix Conjugation)', meaning: 'Continuous, progressive, or developing action viewed from within its process.' },
  'Wayy': { name: 'Waw-Consecutive (Wayyiqtol)', meaning: 'Sequential narrative imperfect driving historical events forward in chronological order.' },
  'Ptcp': { name: 'Participle Active', meaning: 'Continuous verbal adjective denoting ongoing active agency or state.' },
  'Ptcp-Pass': { name: 'Participle Passive', meaning: 'Verbal adjective denoting an ongoing state of receiving the action.' },
  'Part': { name: 'Participle / Particle', meaning: 'Verbal adjective or uninflected functional particle.' },
  'Juss': { name: 'Jussive Mood (Divine Command)', meaning: 'Volitional mood expressing divine fiat or authoritative decree (\'Let there be!\').' },
  'Coh': { name: 'Cohortative Mood (Volitional Resolve)', meaning: 'First-person volitional declaration expressing resolve or mutual exhortation (\'Let us!\').' },
  'Imperat': { name: 'Imperative Mood', meaning: 'Direct volitional command addressed to second-person subjects.' },
  'Inf-C': { name: 'Infinitive Construct', meaning: 'Verbal noun functioning in close syntactic connection with prepositions or objects.' },
  'Inf-A': { name: 'Infinitive Absolute', meaning: 'Independent verbal noun used for dramatic emphasis or adverbial reinforcement.' },

  // Greek Robinson Tenses
  'Pres': { name: 'Present Tense', meaning: 'Continuous, progressive action actively occurring in current time.' },
  'Impf-Grk': { name: 'Imperfect Tense', meaning: 'Sustained duration or ongoing continual existence in past time.' },
  'Aor': { name: 'Aorist Tense', meaning: 'Snapshot point-action occurring in past historical time, viewed as an integrated whole without focusing on internal duration.' },
  'Fut': { name: 'Future Tense', meaning: 'Action anticipated to occur subsequent to the speaker\'s present.' },
  'Perf-Grk': { name: 'Perfect Tense', meaning: 'Completed past action establishing an enduring, permanent state of results continuing into the present.' },
  'Plup': { name: 'Pluperfect Tense', meaning: 'Completed past action with results existing at a past reference point.' },

  // Greek Robinson Voices
  'Act': { name: 'Active Voice', meaning: 'The grammatical subject actively initiates and performs the action of the verb.' },
  'Mid': { name: 'Middle Voice', meaning: 'The subject participates intimately in the action or acts in its own personal interest.' },
  'Pass': { name: 'Passive Voice', meaning: 'The subject receives the action performed by an external divine or human agent.' },
  'MidPass': { name: 'Middle or Passive Voice', meaning: 'Deponent or middle-passive voice indicating self-involvement or reception.' },

  // Greek Robinson Moods
  'Indic': { name: 'Indicative Mood', meaning: 'The mood of objective reality, historical actuality, and factuality.' },
  'Subj': { name: 'Subjunctive Mood', meaning: 'The mood of contingency, purpose, probability, or spiritual expectation.' },
  'Opt': { name: 'Optative Mood', meaning: 'The mood of prayerful wish, potentiality, or yearning.' },
  'Imperat-Grk': { name: 'Imperative Mood', meaning: 'The mood of direct command, solemn instruction, or urgent entreaty.' },
  'Inf': { name: 'Infinitive', meaning: 'Verbal noun expressing purpose, result, or indirect discourse.' },
  'Ptcp-Grk': { name: 'Participle', meaning: 'Verbal adjective qualifying substantive actors or accompanying circumstances.' },

  // Greek Cases
  'Nom': { name: 'Nominative Case', meaning: 'The case of the grammatical subject or predicate nominative expressing identity or nature.' },
  'Voc': { name: 'Vocative Case', meaning: 'The case of direct personal address.' },
  'Gen': { name: 'Genitive Case', meaning: 'The case of source, origin, possession, or relational agency (\'of / from\').' },
  'Dat': { name: 'Dative Case', meaning: 'The case of personal interest, location, sphere, instrument, or vital union (\'in / to / for\').' },
  'AccCase': { name: 'Accusative Case', meaning: 'The case of the direct object, extent, or face-to-face destination.' },

  // Persons, Genders, Numbers & States
  '1s': { name: '1st Person Singular', meaning: 'Subject is the speaker (\'I\').' },
  '1p': { name: '1st Person Plural', meaning: 'Subject is the speaker and others (\'We\').' },
  '2s': { name: '2nd Person Singular', meaning: 'Subject is the person addressed (\'Thou / You\').' },
  '2p': { name: '2nd Person Plural', meaning: 'Subject is the group addressed (\'Ye / You all\').' },
  '3s': { name: '3rd Person Singular', meaning: 'Subject is an external single person or entity (\'He / She / It\').' },
  '3p': { name: '3rd Person Plural', meaning: 'Subject is external multiple persons or entities (\'They\').' },
  '3ms': { name: '3rd Person Masculine Singular', meaning: 'Grammatical subject is a single masculine entity (\'He\' / God).' },
  '3fs': { name: '3rd Person Feminine Singular', meaning: 'Grammatical subject is a single feminine entity (\'She / It\').' },
  '3mp': { name: '3rd Person Masculine Plural', meaning: 'Grammatical subject is multiple masculine entities (\'They\').' },
  '3fp': { name: '3rd Person Feminine Plural', meaning: 'Grammatical subject is multiple feminine entities (\'They\').' },
  'ms': { name: 'Masculine Singular', meaning: 'Grammatical masculine gender, singular number.' },
  'fs': { name: 'Feminine Singular', meaning: 'Grammatical feminine gender, singular number.' },
  'mp': { name: 'Masculine Plural', meaning: 'Grammatical masculine gender, plural number.' },
  'fp': { name: 'Feminine Plural', meaning: 'Grammatical feminine gender, plural number.' },
  'md': { name: 'Masculine Dual', meaning: 'Dual number indicating paired entities or expansive expanse.' },
  'fd': { name: 'Feminine Dual', meaning: 'Dual number indicating paired feminine entities.' },
  'cb': { name: 'Common Gender', meaning: 'Gender common to both masculine and feminine nouns.' },
  'prop': { name: 'Proper Noun', meaning: 'Unique personal name or sacred divine title.' },
  'rel': { name: 'Relative Marker', meaning: 'Connective particle introducing dependent descriptive clauses.' },
  '3S': { name: '3rd Person Singular', meaning: 'Subject is an external single person or entity (\'He / She / It\').' },
  '2S': { name: '2nd Person Singular', meaning: 'Subject is the person addressed (\'You\').' },
  '1S': { name: '1st Person Singular', meaning: 'Subject is the speaker (\'I\').' },
  '3P': { name: '3rd Person Plural', meaning: 'Subject is external multiple entities (\'They\').' },
  '2P': { name: '2nd Person Plural', meaning: 'Subject is the group addressed (\'You all\').' },
  '1P': { name: '1st Person Plural', meaning: 'Subject is the speaker and others (\'We\').' }
};

/**
 * Decode Greek Robinson composite 3-letter verbal code (e.g. AAI, PAI, IAI, RAI, APP, etc.)
 */
function decodeGreekVerbCode(code: string): MorphToken[] {
  const c = code.toUpperCase();
  const tokens: MorphToken[] = [];
  if (c.length < 3) return tokens;

  // 1. Tense
  let tenseChar = c[0];
  let voiceChar = c[1];
  let moodChar = c[2];

  if (c.startsWith('2A')) {
    tenseChar = '2A';
    voiceChar = c[2];
    moodChar = c[3];
  } else if (c.startsWith('2R') || c.startsWith('2P') || c.startsWith('2F')) {
    tenseChar = c.slice(0, 2);
    voiceChar = c[2];
    moodChar = c[3];
  }

  // Tense Token
  if (tenseChar === 'P') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Present Tense', meaning: 'Continuous, progressive action actively occurring in current time.' });
  } else if (tenseChar === 'I') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Imperfect Tense', meaning: 'Sustained past duration or ongoing continual existence without focus on inception or culmination.' });
  } else if (tenseChar === 'F' || tenseChar === '2F') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Future Tense', meaning: 'Action anticipated to occur subsequent to the speaker\'s present time.' });
  } else if (tenseChar === 'A' || tenseChar === '2A') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Aorist Tense', meaning: 'Snapshot point-action occurring in past historical time, viewed as an integrated whole without focusing on internal duration.' });
  } else if (tenseChar === 'R' || tenseChar === '2R' || tenseChar === 'X') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Perfect Tense', meaning: 'Completed past action establishing an enduring, permanent state of results continuing into the present.' });
  } else if (tenseChar === 'L' || tenseChar === '2L' || tenseChar === 'Y') {
    tokens.push({ abbr: `${tenseChar} (Tense)`, name: 'Pluperfect Tense', meaning: 'Completed past action with results existing at a past reference point.' });
  }

  // Voice Token
  if (voiceChar === 'A') {
    tokens.push({ abbr: `${voiceChar} (Voice)`, name: 'Active Voice', meaning: 'The grammatical subject actively initiates and performs the action of the verb.' });
  } else if (voiceChar === 'M') {
    tokens.push({ abbr: `${voiceChar} (Voice)`, name: 'Middle Voice', meaning: 'The subject participates intimately in the action or acts in its own personal interest.' });
  } else if (voiceChar === 'P') {
    tokens.push({ abbr: `${voiceChar} (Voice)`, name: 'Passive Voice', meaning: 'The subject receives the action performed by an external divine or human agent.' });
  } else if (voiceChar === 'E' || voiceChar === 'D' || voiceChar === 'N') {
    tokens.push({ abbr: `${voiceChar} (Voice)`, name: 'Middle/Passive (Deponent)', meaning: 'Middle or passive form carrying active meaning, signifying personal engagement.' });
  } else if (voiceChar === 'O') {
    tokens.push({ abbr: `${voiceChar} (Voice)`, name: 'Passive Deponent', meaning: 'Passive form carrying active meaning, highlighting divine or personal agency.' });
  }

  // Mood Token
  if (moodChar === 'I') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Indicative Mood', meaning: 'The mood of objective reality, historical actuality, and factuality.' });
  } else if (moodChar === 'S') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Subjunctive Mood', meaning: 'The mood of contingency, purpose, probability, or spiritual expectation.' });
  } else if (moodChar === 'O') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Optative Mood', meaning: 'The mood of prayerful wish, potentiality, or yearning.' });
  } else if (moodChar === 'M' || moodChar === 'D') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Imperative Mood', meaning: 'The mood of direct command, solemn instruction, or urgent entreaty.' });
  } else if (moodChar === 'N') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Infinitive', meaning: 'Verbal noun expressing purpose, result, or indirect discourse.' });
  } else if (moodChar === 'P') {
    tokens.push({ abbr: `${moodChar} (Mood)`, name: 'Participle', meaning: 'Verbal adjective qualifying substantive actors or accompanying circumstances.' });
  }

  return tokens;
}

/**
 * Decode Greek Robinson composite 3-letter noun/adjective code (e.g. NMS, GSM, DMS, AMS, NSF, etc.)
 */
function decodeGreekNominalCode(code: string): MorphToken[] {
  const c = code.toUpperCase();
  const tokens: MorphToken[] = [];
  if (c.length < 3) return tokens;

  // Case
  const caseChar = c[0];
  if (caseChar === 'N') {
    tokens.push({ abbr: 'N (Case)', name: 'Nominative Case', meaning: 'The case of the grammatical subject or predicate nominative expressing identity or nature.' });
  } else if (caseChar === 'V') {
    tokens.push({ abbr: 'V (Case)', name: 'Vocative Case', meaning: 'The case of direct personal address.' });
  } else if (caseChar === 'G') {
    tokens.push({ abbr: 'G (Case)', name: 'Genitive Case', meaning: 'The case of source, origin, possession, or relational agency (\'of / from\').' });
  } else if (caseChar === 'D') {
    tokens.push({ abbr: 'D (Case)', name: 'Dative Case', meaning: 'The case of personal interest, location, sphere, instrument, or vital union (\'in / to / for\').' });
  } else if (caseChar === 'A') {
    tokens.push({ abbr: 'A (Case)', name: 'Accusative Case', meaning: 'The case of the direct object, extent, or face-to-face destination.' });
  }

  // Gender & Number
  let genderChar = c[1];
  let numberChar = c[2];
  // In some Robinson variations, e.g. N-NSM vs N-NMS
  if (['S', 'P', 'D'].includes(genderChar) && ['M', 'F', 'N'].includes(numberChar)) {
    const tmp = genderChar;
    genderChar = numberChar;
    numberChar = tmp;
  }

  if (genderChar === 'M') {
    tokens.push({ abbr: 'M (Gender)', name: 'Masculine Gender', meaning: 'Grammatical masculine gender.' });
  } else if (genderChar === 'F') {
    tokens.push({ abbr: 'F (Gender)', name: 'Feminine Gender', meaning: 'Grammatical feminine gender.' });
  } else if (genderChar === 'N') {
    tokens.push({ abbr: 'N (Gender)', name: 'Neuter Gender', meaning: 'Grammatical neuter gender.' });
  }

  if (numberChar === 'S') {
    tokens.push({ abbr: 'S (Number)', name: 'Singular Number', meaning: 'Designates a single entity or subject.' });
  } else if (numberChar === 'P') {
    tokens.push({ abbr: 'P (Number)', name: 'Plural Number', meaning: 'Designates multiple entities or subjects.' });
  }

  return tokens;
}

/**
 * Decode Hebrew OSHB compact nominal code (e.g. Ncfsa, Ncmsa, Ncmpc, etc.)
 */
function decodeHebrewOSHBCode(code: string): MorphToken[] {
  const c = code.trim();
  const tokens: MorphToken[] = [];
  if (c.length < 4) return tokens;

  // 1. Part of speech (e.g. N = Noun, A = Adjective)
  const posChar = c[0];
  if (posChar === 'N') {
    tokens.push({ abbr: 'N', name: 'Noun', meaning: 'Substantive denoting a person, place, thing, or concept.' });
  } else if (posChar === 'A') {
    tokens.push({ abbr: 'A', name: 'Adjective', meaning: 'Modifier qualifying the nature, scope, or attributes of a noun.' });
  }

  // 2. Type (c = common, p = proper)
  const typeChar = c[1];
  if (typeChar === 'c') {
    tokens.push({ abbr: 'c', name: 'Common Noun', meaning: 'Standard noun designating a general class or entity rather than a unique proper name.' });
  } else if (typeChar === 'p') {
    tokens.push({ abbr: 'p', name: 'Proper Noun', meaning: 'Unique personal name or sacred divine title.' });
  } else if (typeChar === 'g') {
    tokens.push({ abbr: 'g', name: 'Gentilic', meaning: 'Adjective/noun designating tribal or geographic origin.' });
  }

  // 3. Gender (m = masc, f = fem, b = both)
  const genderChar = c[2];
  if (genderChar === 'm') {
    tokens.push({ abbr: 'm', name: 'Masculine Gender', meaning: 'Grammatical masculine gender.' });
  } else if (genderChar === 'f') {
    tokens.push({ abbr: 'f', name: 'Feminine Gender', meaning: 'Grammatical feminine gender.' });
  } else if (genderChar === 'b') {
    tokens.push({ abbr: 'b', name: 'Common / Dual Gender', meaning: 'Grammatical gender common to both masculine and feminine.' });
  }

  // 4. Number (s = sing, p = plur, d = dual)
  const numChar = c[3];
  if (numChar === 's') {
    tokens.push({ abbr: 's', name: 'Singular Number', meaning: 'Designates a single entity or foundational point.' });
  } else if (numChar === 'p') {
    tokens.push({ abbr: 'p', name: 'Plural Number', meaning: 'Designates multiple entities.' });
  } else if (numChar === 'd') {
    tokens.push({ abbr: 'd', name: 'Dual Number', meaning: 'Paired entities or expansive expanse.' });
  }

  // 5. State (a = absolute, c = construct, d = determined)
  if (c.length >= 5) {
    const stateChar = c[4];
    if (stateChar === 'a') {
      tokens.push({ abbr: 'a', name: 'Absolute State', meaning: 'Independent, unlinked state (not bound in a construct genitive relation).' });
    } else if (stateChar === 'c') {
      tokens.push({ abbr: 'c', name: 'Construct State', meaning: 'Bound state forming a close genitive relationship with the following noun (\'X of Y\').' });
    } else if (stateChar === 'd') {
      tokens.push({ abbr: 'd', name: 'Determined / Definite State', meaning: 'Marked with definite determination.' });
    }
  }

  return tokens;
}

/**
 * Produce an authentic, precision 1-sentence exegetical explanation of what that grammatical tense/stem/state actually conveys in biblical discourse.
 */
function buildExegeticalDiscourseSignificance(
  isHebrew: boolean,
  pos: string,
  stem: string,
  tense: string,
  person: string,
  gender: string,
  number: string,
  state: string,
  normTag: string
): string {
  const upper = normTag.toUpperCase();

  if (isHebrew) {
    // Hebrew Verbs
    if (pos === 'Verb' || upper.startsWith('V')) {
      if (stem.includes('Qal')) {
        if (tense.includes('Perf') || upper.includes('PERF')) {
          return 'The Qal Perfect portrays the action as a completed, sovereign historical certainty viewed in its totality, performed actively by a singular subject.';
        }
        if (tense.includes('Wayy') || upper.includes('WAYY') || upper.includes('WC')) {
          return 'The Waw-Consecutive Imperfect drives the historical narrative forward with sequential certainty, detailing the immediate next milestone of the divine drama.';
        }
        if (tense.includes('Impf') || upper.includes('IMPF')) {
          return 'The Qal Imperfect views the action as ongoing, developing, or in process, highlighting unfolding divine agency in the narrative.';
        }
        if (tense.includes('Imperat') || upper.includes('IMPERAT')) {
          return 'The Qal Imperative conveys an immediate, direct volitional command addressed to the listener with sovereign urgency.';
        }
        if (tense.includes('Juss') || upper.includes('JUSS')) {
          return 'The Jussive Mood expresses divine fiat or sovereign decree (\'Let there be!\'), establishing reality through authoritative declaration.';
        }
        if (tense.includes('Coh') || upper.includes('COH')) {
          return 'The Cohortative Mood expresses first-person volitional resolve, intention, or divine counsel (\'Let us!\').';
        }
        if (tense.includes('Ptcp') || upper.includes('PTCP')) {
          return 'The Active Participle depicts continuous, uninterrupted divine agency or cherishing oversight.';
        }
        return 'The Qal Stem expresses the direct, baseline active voice in biblical Hebrew, establishing factual historical agency.';
      }

      if (stem.includes('Piel') || upper.includes('PIEL')) {
        return 'The Piel Stem conveys intensive, iterative, or cherishing action, emphasizing the thorough intentionality and depth with which the act is carried out.';
      }
      if (stem.includes('Pual') || upper.includes('PUAL')) {
        return 'The Pual Stem expresses the intensive reception of an action, emphasizing the thorough transformation experienced by the recipient.';
      }
      if (stem.includes('Hiph') || stem.includes('Hif') || upper.includes('HIPH') || upper.includes('HIF')) {
        return 'The Hiphil Stem expresses sovereign causation, denoting that the subject directly causes the realization of the resulting action.';
      }
      if (stem.includes('Hoph') || upper.includes('HOPH')) {
        return 'The Hophal Stem conveys causative passive reception, where the subject is sovereignly caused to receive the action.';
      }
      if (stem.includes('Niph') || upper.includes('NIPH')) {
        return 'The Niphal Stem expresses reflexive or passive realization, where the subject participates in or receives the effect of the divine purpose.';
      }
      if (stem.includes('Hith') || upper.includes('HITH')) {
        return 'The Hithpael Stem conveys intensive personal reflexive engagement or ongoing relational reciprocity.';
      }
      return 'The Hebrew verbal construction establishes exact aspectual viewpoint and theological agency in Old Testament discourse.';
    }

    // Hebrew Nominals
    if (upper.includes('HR/') || upper.startsWith('HR')) {
      return 'Combines a relational preposition prefix denoting sphere or location with a noun in the absolute state, establishing the foundational temporal or covenantal setting of the narrative.';
    }
    if (upper.includes('HC/') || upper.startsWith('HC')) {
      return 'Connects the substantive to the unfolding narrative sequence via the Waw copulative, maintaining continuous thematic progression.';
    }
    if (state.includes('Construct') || upper.includes('CFSC') || upper.includes('CMSC')) {
      return 'The Construct State binds two nouns into an inseparable genitive unit (\'X of Y\'), designating vital covenantal possession, origin, or source.';
    }
    return 'Establishes substantive covenantal identity and grammatical focus within biblical Hebrew discourse.';
  }

  // Greek Verbs (Robinson)
  if (pos === 'Verb' || upper.startsWith('V-') || upper.startsWith('V')) {
    if (upper.includes('AAI')) {
      return 'The Aorist Active Indicative presents a snapshot of point-action occurring in historical past time as an objective, verified reality without specifying progressive duration.';
    }
    if (upper.includes('PAI')) {
      return 'The Present Active Indicative expresses continuous, progressive action actively taking place in real time as an ongoing state of affairs.';
    }
    if (upper.includes('IAI')) {
      return 'The Imperfect Active Indicative conveys sustained past duration or ongoing continual existence without focus on its beginning or culmination.';
    }
    if (upper.includes('RAI') || upper.includes('RIA') || upper.includes('XAI')) {
      return 'The Perfect Active Indicative emphasizes a completed historical act that establishes an enduring, permanent state of results continuing into the present.';
    }
    if (upper.includes('F') && upper.includes('I')) {
      return 'The Future Indicative anticipates confident future realization with absolute certainty in biblical promise.';
    }
    if (upper.includes('API') || upper.includes('APP')) {
      return 'The Aorist Passive captures a definitive historical occurrence where the subject is the recipient of sovereign divine action (the \'divine passive\').';
    }
    if (upper.includes('PAS') || upper.includes('AAS') || upper.includes('SUBJ')) {
      return 'The Subjunctive Mood expresses purposeful intention, vital spiritual contingency, or faith expectation.';
    }
    if (upper.includes('PAM') || upper.includes('AAM') || upper.includes('IMPERAT')) {
      return 'The Imperative Mood conveys solemn apostolic command or direct pastoral charge.';
    }
    if (upper.includes('PAN') || upper.includes('AAN') || upper.includes('INF')) {
      return 'The Infinitive functions as a verbal noun expressing primary communicative purpose or resultant theological reality.';
    }
    if (upper.includes('PAP') || upper.includes('AAP') || upper.includes('PTCP')) {
      return 'The Participle acts as a verbal adjective, enriching the main clause with concurrent action, theological rationale, or essential character.';
    }
    return 'The Greek verbal inflections establish precise aspect, voice, and temporal framework in New Testament revelation.';
  }

  // Greek Nominals
  if (upper.includes('NMS') || upper.includes('NSM')) {
    return 'The Nominative Masculine Singular designates the primary grammatical subject or essence in the clause, anchoring core theological identity.';
  }
  if (upper.includes('GSM') || upper.includes('GMS') || upper.includes('GEN')) {
    return 'The Genitive Case establishes origin, essential relationship, or divine source (\'of / from\') linking key theological realities.';
  }
  if (upper.includes('DMS') || upper.includes('DSM') || upper.includes('DAT')) {
    return 'The Dative Case designates the sphere of intimate union, personal interest, or divine destination (\'in / to / for\').';
  }
  if (upper.includes('AMS') || upper.includes('ASM') || upper.includes('ACC')) {
    return 'The Accusative Case marks the direct recipient or sovereign destination of the verbal action.';
  }

  return 'Establishes precise syntactic and relational connections in Koine Greek biblical revelation.';
}

/**
 * High-accuracy zero-omission parser decoder that expands every abbreviation token line-by-line.
 */
export function decodeMorphologyTag(
  rawTag: string,
  word?: string,
  root?: string,
  gloss?: string,
  strongs?: string
): DecodedMorphologyResult {
  const normTag = (rawTag || '').trim();
  const strongsNorm = (strongs || '').toUpperCase().trim();
  const isHebrew = strongsNorm.startsWith('H') || (!strongsNorm.startsWith('G') && word && /[\u0590-\u05FF]/.test(word));

  const tokens: MorphToken[] = [];
  const upper = normTag.toUpperCase();

  // 1. Detect Greek Robinson verb (e.g. V-AAI-3S, V-PAI-3S, V-IAI-3S, V-2AAI-3S, V-AAP-NMS)
  const isGreekVerbRobinson = !isHebrew && /^V-([12]?[A-Z]{3})-?([123]?[A-Z]{1,3})?$/i.test(normTag);
  // 2. Detect Greek Robinson nominal (e.g. N-NMS, A-GSM, T-NSM, R-DMS)
  const isGreekNominalRobinson = !isHebrew && /^[NATRPCDI]-([NVGDA][SMFNP]{2,3})$/i.test(normTag);

  if (isGreekVerbRobinson) {
    const match = normTag.match(/^V-([12]?[A-Z]{3})-?([123]?[A-Z]{1,3})?$/i);
    if (match) {
      tokens.push({ abbr: 'V', name: 'Verb', meaning: 'Part of speech denoting action, occurrence, or state of being.' });
      const verbCode = match[1];
      const personOrCase = match[2];
      tokens.push(...decodeGreekVerbCode(verbCode));
      if (personOrCase) {
        if (/^[123][SP]$/i.test(personOrCase)) {
          const p = personOrCase[0];
          const n = personOrCase[1].toUpperCase() === 'S' ? 'Singular' : 'Plural';
          tokens.push({
            abbr: personOrCase,
            name: `${p}${p === '1' ? 'st' : p === '2' ? 'nd' : 'rd'} Person ${n}`,
            meaning: `Subject is ${p === '1' ? 'the speaker (I/We)' : p === '2' ? 'the person addressed (You/You all)' : 'an external entity (He/She/It/They)'}.`
          });
        } else {
          tokens.push(...decodeGreekNominalCode(personOrCase));
        }
      }
    }
  } else if (isGreekNominalRobinson) {
    const match = normTag.match(/^([NATRPCDI])-([NVGDA][SMFNP]{2,3})$/i);
    if (match) {
      const posChar = match[1].toUpperCase();
      const nominalCode = match[2];
      const posDef = TOKEN_DEFINITIONS[posChar] || { name: 'Nominal', meaning: 'Substantive or modifier part of speech.' };
      tokens.push({ abbr: posChar, ...posDef });
      tokens.push(...decodeGreekNominalCode(nominalCode));
    }
  } else {
    // General token parsing for Hebrew OSHB codes (e.g., V-Qal-Perf-3ms, HR/Ncfsa, HC/Vqp3ms)
    const segments = normTag.split(/[/+-]/).filter(Boolean);

    for (const seg of segments) {
      // Check exact token definition
      if (TOKEN_DEFINITIONS[seg]) {
        tokens.push({ abbr: seg, ...TOKEN_DEFINITIONS[seg] });
        continue;
      }

      // Check case-insensitive match
      const matchedKey = Object.keys(TOKEN_DEFINITIONS).find(k => k.toLowerCase() === seg.toLowerCase());
      if (matchedKey) {
        tokens.push({ abbr: seg, ...TOKEN_DEFINITIONS[matchedKey] });
        continue;
      }

      // Check OSHB compact nominals (e.g., Ncfsa, Ncmsa, Ncmpc)
      if (/^N[cpg][mfb][spd][acd]?$/i.test(seg) || /^A[cpg][mfb][spd][acd]?$/i.test(seg)) {
        tokens.push(...decodeHebrewOSHBCode(seg));
        continue;
      }

      // Check Greek 3-letter verb code (e.g. AAI, PAI, IAI)
      if (/^[12]?[A-Z]{3}$/i.test(seg) && !isHebrew) {
        tokens.push(...decodeGreekVerbCode(seg));
        continue;
      }

      // Check Greek 3-letter case code (e.g. NMS, GSM, DMS, AMS)
      if (/^[NVGDA][SMFNP]{2}$/i.test(seg) && !isHebrew) {
        tokens.push(...decodeGreekNominalCode(seg));
        continue;
      }

      // Check Hebrew person/gender/number compound (e.g. 3ms, 3fs, 3mp, 1cs, 2ms)
      if (/^\d[mfncs][sp]$/i.test(seg)) {
        const p = seg[0];
        const gChar = seg[1].toLowerCase();
        const g = gChar === 'm' ? 'Masculine' : gChar === 'f' ? 'Feminine' : 'Common';
        const n = seg[2].toLowerCase() === 's' ? 'Singular' : 'Plural';
        tokens.push({
          abbr: seg,
          name: `${p}${p === '1' ? 'st' : p === '2' ? 'nd' : 'rd'} Person ${g} ${n}`,
          meaning: `Person = ${p} | Gender = ${g} | Number = ${n} (\'${p === '1' ? (n === 'Singular' ? 'I' : 'We') : p === '2' ? (n === 'Singular' ? 'You' : 'You all') : (n === 'Singular' ? (g === 'Feminine' ? 'She' : 'He') : 'They')}\').`
        });
        continue;
      }

      // Fallback description
      tokens.push({
        abbr: seg,
        name: `${seg} (Grammatical Component)`,
        meaning: `Grammatical element in the manuscript construction: ${seg}`
      });
    }
  }

  // Derive pos, stem, tense, person, gender, number, state
  let pos = 'Noun';
  let stem = '—';
  let tense = '—';
  let person = '—';
  let gender = '—';
  let number = 'Singular';
  let state = 'Absolute State';

  // Extract base tag by stripping common Hebrew grammatical prefixes (HC/, HR/, HT/, Hd/, Hq/)
  const hasConjPrefix = upper.startsWith('HC/') || upper.includes('/HC');
  const hasPrepPrefix = upper.startsWith('HR/') || upper.includes('/HR');
  const hasArtPrefix = upper.startsWith('HT/') || upper.includes('/HT');

  let baseTag = upper;
  if (baseTag.startsWith('HC/') || baseTag.startsWith('HR/') || baseTag.startsWith('HT/') || baseTag.startsWith('HD/') || baseTag.startsWith('HQ/')) {
    const parts = baseTag.split('/');
    baseTag = parts[parts.length - 1] || baseTag;
  }

  // Check curated grammar entry first if available
  const curatedPos = (isHebrew ? HEBREW_GRAMMAR_MAP[strongsNorm]?.pos : GREEK_GRAMMAR_MAP[strongsNorm]?.pos);
  if (curatedPos) {
    pos = curatedPos;
  } else if (baseTag.startsWith('V') || baseTag.includes('VERB') || upper.includes('V-QAL') || upper.includes('V-PIEL') || upper.includes('V-HIPH') || upper.includes('V-NIPH')) {
    pos = 'Verb';
  } else if (baseTag.startsWith('N') || baseTag.startsWith('T/N') || /^N[CPG][MFB]/i.test(baseTag) || baseTag.includes('NOUN')) {
    pos = 'Noun';
  } else if (baseTag.startsWith('ADJ') || baseTag.startsWith('A-') || /^A[CPG][MFB]/i.test(baseTag)) {
    pos = 'Adjective';
  } else if (baseTag.startsWith('PRON') || baseTag.startsWith('PPRO') || baseTag.startsWith('DPRO') || baseTag.startsWith('RELPRO')) {
    pos = 'Pronoun';
  } else if (baseTag.startsWith('ADV')) {
    pos = 'Adverb';
  } else if (baseTag.startsWith('PART') || baseTag.includes('DIR-OBJ') || strongsNorm === 'H853') {
    pos = 'Particle';
  } else if (baseTag.startsWith('PREP') || (!hasPrepPrefix && upper.startsWith('PREP'))) {
    pos = 'Preposition';
  } else if (baseTag.startsWith('CONJ') || (!hasConjPrefix && (upper === 'CONJ' || upper.startsWith('CONJ-') || strongsNorm === 'H9005' || strongsNorm === 'G2532'))) {
    pos = 'Conjunction';
  } else if (baseTag.startsWith('ART') || (!hasArtPrefix && upper.startsWith('ART'))) {
    pos = 'Definite Article';
  } else if (hasConjPrefix) {
    pos = 'Conjunction';
  } else if (hasPrepPrefix) {
    pos = 'Preposition';
  } else if (hasArtPrefix) {
    pos = 'Definite Article';
  }

  // Stems (Hebrew)
  if (upper.includes('QAL') || upper.includes('VQP') || upper.includes('VQI')) stem = 'Qal (Simple Active)';
  else if (upper.includes('NIPH') || upper.includes('VNP')) stem = 'Niphal (Simple Passive/Reflexive)';
  else if (upper.includes('PIEL') || upper.includes('VPP')) stem = 'Piel (Intensive Active)';
  else if (upper.includes('PUAL') || upper.includes('VPU')) stem = 'Pual (Intensive Passive)';
  else if (upper.includes('HIPH') || upper.includes('HIF') || upper.includes('VHP')) stem = 'Hiphil (Causative Active)';
  else if (upper.includes('HOPH') || upper.includes('VHO')) stem = 'Hophal (Causative Passive)';
  else if (upper.includes('HITH') || upper.includes('VTP')) stem = 'Hithpael (Intensive Reflexive)';

  // Tenses / Aspects
  if (upper.includes('PERF') || upper.includes('-P-')) tense = 'Perfect Aspect';
  else if (upper.includes('WAYY') || upper.includes('WAW-CONSEC')) tense = 'Waw-Consecutive Imperfect';
  else if (upper.includes('IMPF') || upper.includes('-I-')) tense = 'Imperfect Aspect';
  else if (upper.includes('PTCP') || upper.includes('PART')) tense = 'Participle';
  else if (upper.includes('JUSS')) tense = 'Jussive Mood (Divine Fiat)';
  else if (upper.includes('COH')) tense = 'Cohortative Mood';
  else if (upper.includes('IMPERAT')) tense = 'Imperative Mood';
  else if (upper.includes('AOR') || upper.includes('-AA') || upper.includes('-AM') || upper.includes('-AP')) tense = 'Aorist Tense';
  else if (upper.includes('PRES') || upper.includes('-PA') || upper.includes('-PM') || upper.includes('-PP')) tense = 'Present Tense';
  else if (upper.includes('FUT') || upper.includes('-FA') || upper.includes('-FM') || upper.includes('-FP')) tense = 'Future Tense';
  else if (upper.includes('PLUP')) tense = 'Pluperfect Tense';

  // Person
  if (upper.includes('3MS') || upper.includes('3FS') || upper.includes('3MP') || upper.includes('3FP') || upper.includes('-3S') || upper.includes('-3P')) person = '3rd Person';
  else if (upper.includes('2MS') || upper.includes('2FS') || upper.includes('2MP') || upper.includes('2FP') || upper.includes('-2S') || upper.includes('-2P')) person = '2nd Person';
  else if (upper.includes('1CS') || upper.includes('1CP') || upper.includes('-1S') || upper.includes('-1P')) person = '1st Person';

  // Gender
  if (upper.includes('MS') || upper.includes('MP') || upper.includes('NMS') || upper.includes('AMS') || upper.includes('GSM') || upper.includes('DMS') || upper.includes('NCMSA') || upper.includes('NCMPA')) gender = 'Masculine';
  else if (upper.includes('FS') || upper.includes('FP') || upper.includes('NFS') || upper.includes('AFS') || upper.includes('GSF') || upper.includes('DSF') || upper.includes('NCFSA') || upper.includes('NCFSC')) gender = 'Feminine';
  else if (upper.includes('NS') || upper.includes('NP') || upper.includes('NSN') || upper.includes('NNP') || upper.includes('NNS') || upper.includes('GPN')) gender = 'Neuter';

  // Number
  if (upper.includes('MP') || upper.includes('FP') || upper.includes('NP') || upper.includes('3MP') || upper.includes('3FP') || upper.includes('1P') || upper.includes('2P') || upper.includes('-3P') || upper.includes('-2P') || upper.includes('-1P') || upper.includes('NCMP')) number = 'Plural';
  else if (upper.includes('MD') || upper.includes('FD') || upper.includes('DUAL')) number = 'Dual';

  // State (Hebrew)
  if (upper.endsWith('C') || upper.includes('CONST') || upper.includes('CFSC') || upper.includes('CMSC')) state = 'Construct State';

  // Compose clean fullTitle
  let displayPos = pos;
  if (hasConjPrefix && pos !== 'Conjunction') {
    displayPos = `${pos} (with Conjunction Prefix וְ)`;
  } else if (hasPrepPrefix && pos !== 'Preposition') {
    displayPos = `${pos} (with Preposition Prefix)`;
  } else if (hasArtPrefix && pos !== 'Definite Article') {
    displayPos = `${pos} (with Definite Article הַ)`;
  }
  const titleParts: string[] = [displayPos];
  if (stem !== '—') titleParts.push(stem);
  if (tense !== '—') titleParts.push(tense);
  if (person !== '—' && gender !== '—') titleParts.push(`${person} ${gender} ${number}`);
  else if (person !== '—') titleParts.push(`${person} ${number}`);
  else if (gender !== '—') titleParts.push(`${gender} ${number}`);
  else titleParts.push(number);
  if (isHebrew && state !== 'Absolute State') titleParts.push(state);

  const fullTitle = titleParts.join(' • ');

  // Authentic 1-sentence exegetical explanation
  const syntactic = buildExegeticalDiscourseSignificance(
    isHebrew,
    pos,
    stem,
    tense,
    person,
    gender,
    number,
    state,
    normTag
  );

  return {
    tag: normTag,
    strongs: strongsNorm,
    word: word || '—',
    gloss: gloss || '—',
    root: root || word || '—',
    language: isHebrew ? 'Hebrew' : 'Greek',
    fullTitle,
    tokens,
    syntactic,
    pos,
    stem,
    tense,
    person,
    gender,
    number,
    state
  };
}

// =========================================================================
// MASTER CONTEXTUAL LEMMA ACTION DICTIONARY (PURGED FOR REBUILD)
// =========================================================================
export const CONTEXTUAL_LEMMA_ACTIONS: Record<string, string> = {};

/**
 * Helper to ensure a term is pure English and contains zero Hebrew/Greek script or diacritic transliterations.
 */
function cleanEnglishWord(term?: string, fallback: string = 'action'): string {
  if (!term) return fallback;
  // If term contains Hebrew or Greek script, return fallback
  if (/[\u0590-\u05FF\u0370-\u03FF\u1F00-\u1FFF]/.test(term)) {
    return fallback;
  }
  // Remove transliteration diacritics / special characters
  const ascii = term
    .replace(/[’‘'`ʻʿʾ]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s-]/g, '')
    .trim()
    .toLowerCase();

  // If the result is an empty string or foreign placeholder, return fallback
  if (!ascii || ascii === 'reshith' || ascii === 'bara' || ascii === 'elohim' || ascii === 'logos' || ascii === 'arche' || ascii === 'en') {
    return fallback;
  }
  return ascii.split(' ')[0] || fallback;
}

/**
 * High-accuracy synthesizer that produces a clean English lemma action for ANY word.
 * Guarantees ZERO foreign Hebrew/Greek words or transliterations in the resulting phrase.
 */
export function getContextualLemmaAction(
  strongs: string,
  originalWord?: string,
  englishGlossOrRoot?: string,
  morphTag?: string,
  language?: 'Hebrew' | 'Greek' | string
): string {
  const normStrongs = (strongs || '').toUpperCase().trim();

  // 1. Check curated master table first
  if (CONTEXTUAL_LEMMA_ACTIONS[normStrongs]) {
    return CONTEXTUAL_LEMMA_ACTIONS[normStrongs];
  }

  if (englishGlossOrRoot) {
    const clean = cleanEnglishWord(englishGlossOrRoot, '');
    if (clean) return clean;
  }
  return '';
}

// =========================================================================
// INFLECTED STRONG'S TO ROOT LEMMA RESOLUTION MAP
// =========================================================================
export interface ParentLemmaInfo {
  parentStrongs: string;
  rootWord: string;
  rootTranslit: string;
  rootAction: string;
  language: 'Hebrew' | 'Greek';
}

export const PARENT_LEMMA_MAP: Record<string, ParentLemmaInfo> = {
  // G1510 εἰμί (eimi) inflected forms
  'G2071': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἔσται (estai) - shall be
  'G2258': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἦν (ēn) - was
  'G2076': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἐστί (esti) - is
  'G1511': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // εἶναι (einai) - to be
  'G5607': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ὤν (ōn) - being
  'G2075': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἐστέ (este) - you are
  'G1526': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // εἰσί (eisi) - they are
  'G2252': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἤμην (ēmēn) - I was
  'G2277': { parentStrongs: 'G1510', rootWord: 'εἰμί', rootTranslit: 'eimi', rootAction: 'Eternal Self-Existent Being', language: 'Greek' }, // ἴτω / ἔστω - let it be

  // G3004 λέγω (legō) / G2036 εἶπον (eipon)
  'G2036': { parentStrongs: 'G3004', rootWord: 'λέγω', rootTranslit: 'legō', rootAction: 'Expressed Divine Reason', language: 'Greek' },
  'G2046': { parentStrongs: 'G3004', rootWord: 'λέγω', rootTranslit: 'legō', rootAction: 'Expressed Divine Reason', language: 'Greek' },

  // G3708 ὁράω (horaō) / G1492 εἴδω (eidō)
  'G1492': { parentStrongs: 'G3708', rootWord: 'ὁράω', rootTranslit: 'horaō', rootAction: 'Spiritual Perception / Seeing', language: 'Greek' },
  
  // G2064 ἔρχομαι (erchomai) / G565
  'G565': { parentStrongs: 'G2064', rootWord: 'ἔρχομαι', rootTranslit: 'erchomai', rootAction: 'Covenant Arrival / Coming', language: 'Greek' },

  // Hebrew H1961 הָיָה (hayah) inflections
  'H1933': { parentStrongs: 'H1961', rootWord: 'הָיָה', rootTranslit: 'hayah', rootAction: 'Dynamic Sovereign Becoming', language: 'Hebrew' },
};

export function getParentLemma(strongs: string): ParentLemmaInfo | null {
  const clean = (strongs || '').toUpperCase().trim();
  return PARENT_LEMMA_MAP[clean] || null;
}


