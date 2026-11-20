const fs = require('fs');
const path = require('path');

const entries = {
  'G1510': {
    strongs: 'G1510',
    root_word: 'εἰμί',
    root_action: 'Eternal Self-Existent Being',
    original: 'εἰμί',
    transliteration: 'eimi',
    language: 'Greek',
    partOfSpeech: 'Verb',
    parsingTag: 'V-PAI-1S',
    helpsDiscoverySummary: 'The primary substantive verb of existence, conveying absolute, continuous, and essential being. In Christological contexts (e.g. John 8:58 "Before Abraham was, I AM"), it carries the profound covenantal resonance of Yahweh\'s self-revelation (Exod 3:14).',
    wordForWord: ['I am', 'to be', 'exist'],
    meaningForMeaning: [
      { domain: 'Essential Existence', definition: 'To exist intrinsically and continuously without beginning or end.' },
      { domain: 'Covenant Identification', definition: 'The divine self-predication of the uncreated Lord incarnate in Jesus Christ.' }
    ],
    writerIntent: {
      communicativeGoal: 'To unveil Jesus as the eternal, self-existent Lord whose being precedes all cosmic origination.',
      covenantalPayload: 'Connects Jesus\' identity directly with Yahweh\'s eternal name "I AM WHO I AM" (Ehyeh Asher Ehyeh).'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Parallels Hebrew hayah (H1961) and the divine tetragrammaton YHWH derived from the root of continuous being.',
      culturalCustoms: 'Contrasts with Greek philosophical flux (Heraclitus) by asserting stable, divine personal Being.'
    },
    diachronicEvolution: {
      stage1Etymology: 'From Indo-European *es- (to exist, be real), foundational to Indo-European verbal systems.',
      stage2Shift: 'Classical Greek employed eimi both as a copula and for ontological reality.',
      stage3Specialization: 'Septuagint (Exod 3:14) translated "Ehyeh" as "Ego Eimi ho On"; John\'s Gospel adopted the absolute "Ego Eimi" as Christological declarations.',
      stage4Trajectory: 'Early Church ecumenical councils utilized eimi to formulate the consubstantiality (homoousios) of the Father and Son.'
    },
    morphologicalApplication: {
      primaryTag: 'V-PAI-1S',
      explanation: 'Present active indicative 1st person singular indicates enduring, unbroken presence and timeless sovereignty.'
    }
  },
  'G2071': {
    strongs: 'G2071',
    parent_strongs: 'G1510',
    root_word: 'εἰμί',
    root_action: 'Eternal Self-Existent Being',
    original: 'ἔσται',
    transliteration: 'estai',
    language: 'Greek',
    partOfSpeech: 'Verb',
    parsingTag: 'V-FDI-3S',
    helpsDiscoverySummary: 'Future indicative 3rd person singular of G1510 (eimi), signifying certainty of continuous existence or destiny: "he/it shall be". Points back to its parent root lemma G1510 (eimi).',
    wordForWord: ['shall be', 'will be'],
    meaningForMeaning: [
      { domain: 'Future Realization', definition: 'The certain, prophetic manifestation of state of being or divine promise.' }
    ],
    writerIntent: {
      communicativeGoal: 'To guarantee the steadfast, prophetic certainty of divine purpose in future historical fulfillment.',
      covenantalPayload: 'Covenant promises guaranteed by the eternal nature of the God who shall be all in all.'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Corresponds to Hebrew imperfect forms of hayah ("yiheyeh" - it shall come to pass).',
      culturalCustoms: 'In prophetic oracle language, conveys unconditional sovereign assurance.'
    },
    diachronicEvolution: {
      stage1Etymology: 'Suppletive middle future form of eimi (esomai -> estai).',
      stage2Shift: 'Used in Septuagintal prophetic promises for covenant fulfillment.',
      stage3Specialization: 'New Testament uses estai for eschatological and kingdom assurances.',
      stage4Trajectory: 'Patristic eschatology affirmed the unshakeable certainty of the kingdom from these future verbal assurances.'
    },
    morphologicalApplication: {
      primaryTag: 'V-FDI-3S',
      explanation: 'Future deponent/middle indicative 3rd person singular establishes an assured prophetic outcome.'
    }
  }
};

const dirs = [
  path.join(__dirname, '..', 'public', 'data', 'lexicon'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'data', 'lexicon')
];

for (const [code, data] of Object.entries(entries)) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fp = path.join(dir, code + '.json');
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log('Saved', fp);
  }
}
console.log('Successfully seeded G1510 and G2071.');
