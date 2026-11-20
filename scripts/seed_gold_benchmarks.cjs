const fs = require('fs');
const path = require('path');

const entries = {
  'G2889': {
    strongs: 'G2889',
    root_word: 'κόσμος',
    root_action: 'Harmonious World-Order',
    original: 'κόσμος',
    transliteration: 'kosmos',
    language: 'Greek',
    partOfSpeech: 'Noun Masculine',
    parsingTag: 'N-NMS',
    helpsDiscoverySummary: 'Signifies an intentionally arranged, beautiful order or cosmic system created by God, contrasting both chaotic mythological origins and humanity\'s moral alienation from its Creator.',
    wordForWord: ['world', 'order', 'adornment'],
    meaningForMeaning: [
      { domain: 'Cosmology', definition: 'The physical universe established in balanced harmony and divine wisdom.' },
      { domain: 'Anthropology & System', definition: 'The totality of human society and worldly powers estranged from God.' }
    ],
    writerIntent: {
      communicativeGoal: 'To unveil Christ as the divine Architect of the cosmos, highlighting the tragic blindness of creation failing to acknowledge its Maker.',
      covenantalPayload: 'God\'s overarching covenantal redemption does not abandon the cosmos, but reconciles the entire created order through the incarnate Logos.'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Classical Greek kosmein (to arrange, set in order, adorn); stands in stark contrast to Babylonian Enuma Elish where creation arises from violent primeval combat.',
      culturalCustoms: 'In Hellenistic philosophy from Pythagoras to Stoicism, kosmos described an intelligible, harmonious cosmic organism governed by Reason.'
    },
    diachronicEvolution: {
      stage1Etymology: 'From Indo-European *kens- (to proclaim with authority, set in order), denoting proper decoration or orderly array.',
      stage2Shift: 'Pre-Socratics extended the sense to the magnificent structure of the universe; Septuagint used it for the heavenly hosts.',
      stage3Specialization: 'The New Testament, especially Johannine literature, specializes kosmos into threefold theological tension: created order, human race, and the rebellious world-system.',
      stage4Trajectory: 'Early Church Fathers developed cosmic redemption (anakephalaiosis in Irenaeus), celebrating Christ as the Restorer and King of the cosmos.'
    },
    morphologicalApplication: {
      primaryTag: 'N-NMS',
      explanation: 'Nominative singular masculine establishes the world as an active dramatic subject, underscoring both its divine origin and its active estrangement.'
    }
  },
  'G3056': {
    strongs: 'G3056',
    root_word: 'λέγω',
    root_action: 'Expressed Divine Reason',
    original: 'λόγος',
    transliteration: 'logos',
    language: 'Greek',
    partOfSpeech: 'Noun Masculine',
    parsingTag: 'N-NMS',
    helpsDiscoverySummary: 'Represents the divine dynamic Word, both as God\'s eternal creative and revealing self-communication and as the pre-existent second person of the Trinity incarnate.',
    wordForWord: ['word', 'speech', 'divine utterance'],
    meaningForMeaning: [
      { domain: 'Communication / Revelation', definition: 'The articulated purpose, message, and command of God made intelligible.' },
      { domain: 'Christology', definition: 'The personal divine Agent through whom all things came into being and who tabernacled among humans.' }
    ],
    writerIntent: {
      communicativeGoal: 'To bridge Hebrew covenant theology (Dabar Yahweh) and Hellenistic philosophical quest for ultimate Reality in the person of Jesus Christ.',
      covenantalPayload: 'The eternal Creator Word has taken human flesh, inaugurating the New Covenant of grace and truth.'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Hebrew Dabar (the powerful creative word of the Lord, Ps 33:6; Isa 55:11); Aramaic Memra (Targumic surrogate for the divine presence).',
      culturalCustoms: 'In Stoic thought, the Logos was the impersonal cosmic mind permeating reality; Philo of Alexandria mediated it as God\'s eldest son and idea of ideas.'
    },
    diachronicEvolution: {
      stage1Etymology: 'Root leg- (to gather, collect, recount), evolving into reckoning, thought, speech, and coherent communication.',
      stage2Shift: 'Heraclitus and Stoics elevated logos into the rational principle that maintains order in the ever-changing universe.',
      stage3Specialization: 'John\'s Gospel revolutionizes both Hebrew and Greek worldviews: the Logos is neither an impersonal principle nor a secondary angel, but fully God and fully personal.',
      stage4Trajectory: 'Patristic theology formulated the hypostatic union and eternal generation of the Son based upon Johannine Logos theology.'
    },
    morphologicalApplication: {
      primaryTag: 'N-NMS',
      explanation: 'Nominative singular masculine highlights the Logos as the primary subject of eternal existence and creation.'
    }
  },
  'H1254': {
    strongs: 'H1254',
    root_word: 'ב-ר-א',
    root_action: 'Sovereign Divine Origination',
    original: 'בָּרָא',
    transliteration: 'bara',
    language: 'Hebrew',
    partOfSpeech: 'Verb',
    parsingTag: 'V-Qal-Perf-3ms',
    helpsDiscoverySummary: 'Exclusively reserved for divine creation in Scripture, denoting God bringing entirely novel reality into ordered existence without pre-existing material or human cooperation.',
    wordForWord: ['created', 'shaped', 'originated'],
    meaningForMeaning: [
      { domain: 'Cosmic Creation', definition: 'The sovereign calling into existence of heavens and earth by the uncontested divine decree.' },
      { domain: 'Transformative Renewal', definition: 'The creation of a clean heart (Ps 51:10) or a new heaven and earth (Isa 65:17).' }
    ],
    writerIntent: {
      communicativeGoal: 'To assert Yahweh\'s absolute sovereignty as the sole Originator of heaven and earth, demolishing polytheistic creation myths.',
      covenantalPayload: 'The God who enters covenant with Abraham and Israel is none other than the almighty Architect of the cosmos.'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Ugaritic br\' (to shape, create); Phoenician and Epigraphic South Arabian cognates denoting origination.',
      culturalCustoms: 'Contrasts with Mesopotamian (Atrahasis, Enuma Elish) and Egyptian (Memphite theology) myths where creation requires matter, tears, blood, or struggle.'
    },
    diachronicEvolution: {
      stage1Etymology: 'Related to Semitic roots for cutting, carving, and separating, rapidly specialized into unique divine production.',
      stage2Shift: 'Throughout the pre-exilic narrative, bara appears with God exclusively as its grammatical subject, with no mention of material instrument.',
      stage3Specialization: 'Exilic and post-exilic prophecy (Deutero-Isaiah) employs bara 20+ times to guarantee historical and eschatological new creation.',
      stage4Trajectory: 'Intertestamental and Hellenistic Jewish literature (2 Maccabees 7:28) solidified creatio ex nihilo directly from Genesis 1:1 bara.'
    },
    morphologicalApplication: {
      primaryTag: 'V-Qal-Perf-3ms',
      explanation: 'Qal perfect 3rd person masculine singular establishes a completed, decisive historical act of sovereign origination.'
    }
  },
  'H2617': {
    strongs: 'H2617',
    root_word: 'ח-ס-ד',
    root_action: 'Unbreakable Covenant-Fidelity',
    original: 'חֶסֶד',
    transliteration: 'chesed',
    language: 'Hebrew',
    partOfSpeech: 'Noun Masculine',
    parsingTag: 'N-ms',
    helpsDiscoverySummary: 'Captures God\'s enduring covenant-love, unwavering steadfast loyalty, and lavish merciful kindness that cannot be dissolved by human failure.',
    wordForWord: ['mercy', 'steadfast love', 'kindness'],
    meaningForMeaning: [
      { domain: 'Covenant Loyalty', definition: 'The solemn, binding commitment that upholds covenant promises despite circumstantial trials.' },
      { domain: 'Lavish Grace', definition: 'Superabundant lovingkindness extended freely to the needy and penitent.' }
    ],
    writerIntent: {
      communicativeGoal: 'To ground Israel\'s assurance and devotion in Yahweh\'s immutable character as a keeper of covenants.',
      covenantalPayload: 'Chesed forms the bedrock of the Davidic covenant and the ultimate pledge of messianic redemption.'
    },
    aneHistoricalContext: {
      westSemiticCognates: 'Aramaic khesed; Ugaritic and Old South Arabian parallels denoting reciprocal relational loyalty.',
      culturalCustoms: 'In ANE suzerain-vassal treaties, loyalty was strictly conditional; Yahweh\'s chesed transcends reciprocal duty to become unconditional divine commitment.'
    },
    diachronicEvolution: {
      stage1Etymology: 'Originally rooted in interpersonal devotion and familial loyalty within nomadic clan structures.',
      stage2Shift: 'Covenantal theology at Sinai and Davidic dynasty embedded chesed as the hallmark of divine-human relationship (Exod 34:6).',
      stage3Specialization: 'In the Psalms and Prophets, chesed is paired with emeth (faithfulness/truth), pointing forward to the ultimate salvation of God.',
      stage4Trajectory: 'Translated as eleos in the Septuagint and charis/agape in the New Testament, reaching culmination in the cross of Christ.'
    },
    morphologicalApplication: {
      primaryTag: 'N-ms',
      explanation: 'Noun masculine singular portrays covenant loyalty as an objective, substantial reality characterizing God\'s very essence.'
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
console.log('Successfully seeded 4 golden benchmarks in both web and android assets.');
