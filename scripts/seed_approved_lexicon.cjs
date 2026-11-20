const fs = require('fs');
const path = require('path');

const targetDirs = [
  'c:/Users/PEEDEE/Downloads/LogosBridge-main/LogosBridge-main/public/data/lexicon',
  'c:/Users/PEEDEE/Downloads/LogosBridge-main/LogosBridge-main/android/app/src/main/assets/public/data/lexicon'
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const entries = {
  "H2617": {
    "strongs": "H2617",
    "original": "חֶסֶד",
    "transliteration": "ḥesed (Chesed)",
    "language": "Hebrew",
    "partOfSpeech": "Noun Masculine Singular",
    "parsingTag": "N-ms",
    "helpsDiscoverySummary": "God's unfailing, self-binding covenant loyalty—an enduring, active posture of grace, mercy, and relational fidelity that exceeds mere legal obligation and never abandons the covenant partner. In personal discipleship, it assures the believer that God's commitment to His people is anchored in His unchanging character rather than human performance.",
    "wordForWord": ["steadfast love", "lovingkindness", "covenant loyalty", "mercy", "faithfulness", "kindness"],
    "meaningForMeaning": [
      {
        "domain": "Covenantal Obligation / Relational Fidelity",
        "definition": "Mutual assistance and unswerving dependability pledged between covenant partners (e.g., Jonathan and David, 1 Sam 20:8, 14–15; Yahweh and the Davidic line, Ps 89:28 [MT 29])."
      },
      {
        "domain": "Sovereign Beneficence & Mercy",
        "definition": "Unmerited divine intervention to deliver, rescue, and preserve the helpless or wayward (Exod 34:6; Lam 3:22; Mic 7:18)."
      },
      {
        "domain": "Kinship Duty & Social Solidarity",
        "definition": "Tangible acts of compassion, loyalty, and protection rendered toward family, guests, or vulnerable members of the community (Ruth 1:8, 2:20, 3:10; Gen 24:12)."
      }
    ],
    "writerIntent": {
      "communicativeGoal": "The biblical authors invoke חֶסֶד to ground the hearer’s ultimate security in the immovable character of Yahweh, especially in contexts of catastrophic exile, national apostasy, or acute personal distress (e.g., Psalm 136 with its 26-fold antiphonal refrain). It is fundamentally an action word: Yahweh does not merely feel affection; He performs ḥesed.",
      "covenantalPayload": "Ḥesed serves as Yahweh’s definitive self-revelation at Mount Sinai (Exod 34:6: רַב־חֶסֶד וֶאֱמֶת, raḇ-ḥesed we’ĕmet). In the eighth-century prophets, it unmasks hollow ceremonialism (Hosea 6:6: 'I desire ḥesed and not sacrifice'), demonstrating that genuine covenant status requires vertical reception of divine mercy to be translated into horizontal social righteousness."
    },
    "aneHistoricalContext": {
      "westSemiticCognates": "Ugaritic ḥsd ('goodness', 'devotion'); Akkadian hasāsu ('to be mindful of', 'remember with care'); Aramaic/Syriac ḥasdā ('grace', 'clemency').",
      "culturalCustoms": "In ancient Near Eastern vassal treaties (Hittite, Neo-Assyrian adê oaths), royal benefactors demanded absolute loyalty under penalty of severe curses. Unlike pagan treaties where human failure triggered immediate obliteration by the gods, biblical ḥesed operates within a covenant framework where the Divine Suzerain unilaterally absorbs the consequences of the partner's breach and provides atonement (Jer 31:3; Isa 54:10)."
    },
    "diachronicEvolution": {
      "stage1Etymology": "Proto-Semitic root *ḥ-s-d, conveying intense relational solidarity, binding devotion, and purposeful attachment.",
      "stage2Shift": "Pre-exilic & classical monarchy: Firmly institutionalized in the Davidic Covenant (2 Sam 7:15; Ps 89:33), paired formulaically with אֱמֶת (’ĕmet, truth/firmness) to denote God's pledged reliability.",
      "stage3Specialization": "Canonical specialization & Septuagint: Rendered in the LXX primarily as ἔλεος (eleos, active mercy/compassion) and occasionally as δικαιοσύνη (dikaiosynē), linking ḥesed directly to New Testament theology of divine mercy incarnate in the Messiah (Luke 1:50, 54, 72; Eph 2:4–7).",
      "stage4Trajectory": "Post-biblical & Rabbinic: In Second Temple literature and Rabbinic Judaism, ḥesed evolved into the supreme theological pillar of practical ethics (Gemilut Chasadim—deeds of lovingkindness), codified in Pirkei Avot 1:2 as one of the three foundations upon which the world exists."
    },
    "morphologicalApplication": {
      "primaryTag": "N-ms",
      "explanation": "When occurring in construct chains (e.g., חֶסֶד יְהוָה, ḥesed YHWH, Ps 103:17; חַסְדֵּי דָוִד, ḥasdê Dāwîd, Isa 55:3), the singular noun identifies the divine covenant nature in concentrated force. In the plural form (ḥăsādîm, e.g., Lam 3:22), it serves as a plural of extension or historical manifestation, designating the concrete, cumulative historical acts of deliverance and mercy that God has poured out across redemptive history."
    }
  },
  "G3341": {
    "strongs": "G3341",
    "original": "μετάνοια",
    "transliteration": "metanoia",
    "language": "Greek",
    "partOfSpeech": "Noun Feminine Singular",
    "parsingTag": "N-NFS",
    "helpsDiscoverySummary": "A profound, total transformation of mind, perspective, and spiritual allegiance—an inward reorientation wrought by divine grace where an individual turns from moral autonomy and self-deception to embrace God's reality and truth. In everyday Bible study, it is not merely emotional remorse or penance, but a fundamental change of worldview that bears visible, fruit-bearing obedience.",
    "wordForWord": ["change of mind", "reorientation of thinking", "repentance", "inward conversion"],
    "meaningForMeaning": [
      {
        "domain": "Cognitive Reorientation / Worldview Shift",
        "definition": "Abandoning corrupted human presuppositions and viewing reality, sin, and redemption through the prism of divine revelation (Rom 12:2; 2 Tim 2:25)."
      },
      {
        "domain": "Volitional & Ethical Conversion",
        "definition": "A decisive abandonment of dead religious rituals, idolatry, and rebellion in favor of wholehearted commitment to the living God (Acts 26:20; Heb 6:1; 1 Thess 1:9)."
      },
      {
        "domain": "Eschatological Realignment",
        "definition": "Welcoming the arrival of God’s Kingdom by forsaking self-justification (Matt 3:2; Mark 1:15; Luke 13:3)."
      }
    ],
    "writerIntent": {
      "communicativeGoal": "The apostolic writers and Jesus used μετάνοια (metanoia) as an urgent call to action that shattered religious pride, nationalistic self-righteousness, and moral complacency. The term confronts the hearer with the cosmic reality of God's present reign, demanding an unconditional surrender of the autonomous will.",
      "covenantalPayload": "It represents the primary entrance into the New Covenant. Paul explicitly distinguishes metanoia from mere emotional remorse or worldly sorrow (2 Cor 7:9–10: 'Godly grief produces a metanoia that leads to salvation without regret, whereas worldly grief produces death'). Crucially, the New Testament does not present metanoia as a meritorious human work that earns divine favor, but as a sovereign gift granted by God (Acts 5:31; 11:18)."
    },
    "aneHistoricalContext": {
      "westSemiticCognates": "Classical Attic background: Compound of μετά and νοῦς; in secular Greek it often meant an afterthought or tactical regret.",
      "culturalCustoms": "In Classical Greek (Thucydides, Xenophon), metanoia was often viewed with suspicion as philosophical instability. However, Jewish translators of the Septuagint and Second Temple texts fused metanoia with the Hebrew covenantal concept of תְּשׁוּבָה (təšûḇâ, whole-person moral return to Yahweh), transforming it into a sacred term for spiritual regeneration."
    },
    "diachronicEvolution": {
      "stage1Etymology": "Classical Attic foundation: Compound of μετά (denoting change/transition) and νοῦς (mind, intellect, perception)—literally 'a subsequent change of mind.'",
      "stage2Shift": "LXX & Second Temple Hebraization: Commandeered to express the prophetic mandate of shuv (turning from rebellion to covenant obedience).",
      "stage3Specialization": "Apostolic & Canonical specialization: In Gospels and Epistles, metanoia became an indispensable technical term for the spiritual crisis and regeneration of the soul required by the Gospel (Luke 24:47; Acts 20:21).",
      "stage4Trajectory": "Patristic to Latin Vulgate: Early Fathers (Tertullian) rendered it resipiscentia. Jerome's Vulgate translation poenitentiam agite ('do penance') unfortunately narrowed the term in Western medieval thought to external sacramental rituals, until restored by sixteenth-century philological scholarship."
    },
    "morphologicalApplication": {
      "primaryTag": "N-NFS",
      "explanation": "In passages like Rom 2:4 (εἰς μετάνοιάν σε ἄγει) and 2 Cor 7:10 (μετάνοιαν... ἐργάζεται), the noun in the accusative feminine singular functions as the terminal objective (telos) of divine action. Repentance is not portrayed as the catalyst that motivates God to be gracious; rather, divine grace and kindness are the active agents that draw the human heart into the state of metanoia."
    }
  },
  "H1254": {
    "strongs": "H1254",
    "original": "בָּרָ֣א",
    "transliteration": "bārā’ (Bara)",
    "language": "Hebrew",
    "partOfSpeech": "Verb Qal Perfect 3rd Person Masculine Singular",
    "parsingTag": "V-Qal-Perf-3ms",
    "helpsDiscoverySummary": "An exclusively divine, sovereign act of originating, shaping, and establishing reality out of nothing into magnificent order, beauty, and life. In personal faith, it reveals that God's power is never limited by pre-existing human raw materials or broken circumstances—He speaks life, destiny, and new creation into being solely by His sovereign decree.",
    "wordForWord": ["created", "fashioned by divine prerogative", "brought into being", "originated"],
    "meaningForMeaning": [
      {
        "domain": "Cosmic Origination (Creatio Ex Nihilo)",
        "definition": "Bringing the fabric of space, time, matter, and the cosmic order into existence where previously nothing existed except God (Gen 1:1; Isa 40:26; 45:18)."
      },
      {
        "domain": "Sovereign Anthropological Origin",
        "definition": "The intentional, direct creation of humanity as the divine image-bearer (Gen 1:27; 5:1–2; 6:7)."
      },
      {
        "domain": "Redemptive & Eschatological Renewal",
        "definition": "The miraculous inward transformation of the human heart and the future cosmic inauguration of the New Heavens and New Earth (Ps 51:10 [MT 12]; Isa 65:17; 2 Cor 5:17)."
      }
    ],
    "writerIntent": {
      "communicativeGoal": "The author of Genesis and Isaiah 40–55 employ בָּרָא as an uncompromising theological polemic against pagan mythologies. In Genesis 1:1, it deliberately strips cosmic origin of mythological warfare, sexual theogony, or struggle against chaos: Yahweh brings the universe into reality effortlessly, unchallenged, and supreme.",
      "covenantalPayload": "In Biblical Hebrew, God is exclusively the subject of bārā’ in the Qal stem across all 48 canonical occurrences; never does a human or angel create with bārā’. Furthermore, it never takes an accusative of pre-existing material, establishing Yahweh's total, uncompromised sovereignty over all created reality."
    },
    "aneHistoricalContext": {
      "westSemiticCognates": "Ugaritic br’/bry ('to shape', 'build', 'beget'); Akkadian barû/banû ('to inspect', 'build'); Sabaic br’ ('to construct', 'erect a foundation'); Phoenician br’ ('creator').",
      "culturalCustoms": "In the Babylonian Enuma Elish, creation proceeds through violent warfare (Marduk butchering Tiamat). In Egyptian theology, creation proceeds through bodily emanations of Atum. In stark contrast, Hebrew bārā’ in Genesis 1:1 stands solitary: the cosmos is the authoritative product of divine will and spoken word."
    },
    "diachronicEvolution": {
      "stage1Etymology": "Proto-Semitic root *b-r-’, originally associated with cutting, separating, or clearing out (cognate with the Piel stem in Joshua 17:15, 18).",
      "stage2Shift": "Pre-exilic canonical segregation: The biblical theological lexicon strictly separated the Qal stem from ordinary artisanal craftsmanship, reserving it exclusively for transcendent divine activity (Exod 34:10; Num 16:30).",
      "stage3Specialization": "Exilic expansion: In Isaiah 40–66, bārā’ appeared over 20 times to assure despairing exiles that the Creator God is creating their historical redemption and return (Isa 43:1, 15).",
      "stage4Trajectory": "Septuagintal & New Creation: Translated in LXX by κτίζω. Second Temple literature (2 Macc 7:28) solidified creatio ex nihilo, paving the way for the apostolic doctrine of the New Creation in Christ (2 Cor 5:17: καινὴ κτίσις; Col 1:16; Rev 21:1)."
    },
    "morphologicalApplication": {
      "primaryTag": "V-Qal-Perf-3ms",
      "explanation": "The Qal (simple active) stem conveys direct, unaugmented action. The Perfect aspect in the opening clause (בְּרֵאשִׁית בָּרָא אֱלֹהִים) presents the entire cosmic origination as a completed, unified, historical fact. Grammatically, bārā’ is singular (3ms) with plural subject ’Ělōhîm, reflecting the majestic plurality of God acting in indivisible monotheistic unity."
    }
  }
};

for (const [strongs, data] of Object.entries(entries)) {
  for (const dir of targetDirs) {
    const file = path.join(dir, `${strongs}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Seeded ${strongs} to ${file}`);
  }
}
