import { SpecialWord } from './types';

export interface ManuscriptEntry {
  word: string;
  originalValue: string;
  language: 'Greek' | 'Hebrew' | 'Aramaic' | 'Other';
  explanation: string;
}

export const manuscriptData: Record<string, ManuscriptEntry> = {
  "beginning": {
    word: "beginning",
    originalValue: "Archē (ἀρχή) / Bereshit (בְּרֵאשִׁית)",
    language: "Greek",
    explanation: "The absolute source, first cause, or the pre-existent state from which all created order emerges. In Greek, it denotes primacy, sovereignty, and the initial point of time."
  },
  "word": {
    word: "word",
    originalValue: "Logos (λόγος) / Davar (דָּבָר)",
    language: "Greek",
    explanation: "The divine statement, wisdom, and active intellect of God. In John 1, it refers to the personal incarnation of the divine mind, bridging the eternal Creator and human space."
  },
  "god": {
    word: "god",
    originalValue: "Elohim (אֱלֹהִים) / Theos (θεός)",
    language: "Hebrew",
    explanation: "The powerful ruler, standard of justice, and supreme creator. Elohim is a plural noun of majesty, emphasizing infinite authority, supreme power, and fullness of attributes."
  },
  "created": {
    word: "created",
    originalValue: "Bara (בָּרָא)",
    language: "Hebrew",
    explanation: "The act of bringing something magnificent into existence out of absolute nothingness (creatio ex nihilo). This verb is reserved exclusively in biblical texts for the creative activity of God."
  },
  "light": {
    word: "light",
    originalValue: "Or (אוֹר) / Phos (φῶς)",
    language: "Hebrew",
    explanation: "Radiant warmth, order, and absolute purity. It represents God's revealing truth, ethical goodness, and life-giving presence that dispels moral/spiritual darkness."
  },
  "peace": {
    word: "peace",
    originalValue: "Shalom (שָׁלוֹם) / Eirene (εἰρήνη)",
    language: "Hebrew",
    explanation: "Total well-being, wholeness, safety, sound health, and relational harmony. Shalom is not merely the absence of conflict, but the presence of divine order and flourishing."
  },
  "grace": {
    word: "grace",
    originalValue: "Charis (χάρις) / Chen (חֵן)",
    language: "Greek",
    explanation: "The unmerited and beautiful favor of God freely bestowed on humans. It signifies a beautiful, spontaneous gift that delights, transforms, and empowers the recipient."
  },
  "faith": {
    word: "faith",
    originalValue: "Pistis (πίστις) / Emunah (אֱמוּנָה)",
    language: "Greek",
    explanation: "Active loyalty, deep conviction, trust, and absolute reliance on God. It is an enduring stance of faithfulness that manifests in steadfast, loving action."
  },
  "love": {
    word: "love",
    originalValue: "Agape (ἀγάπη) / Chesed (חֶסֶד)",
    language: "Greek",
    explanation: "Unconditional, self-giving, sacrificial care motivated by a decision of the will. Chesed refers to God's steadfast, covenant-keeping lovingkindness and loyalty."
  },
  "spirit": {
    word: "spirit",
    originalValue: "Ruach (רוּחַ) / Pneuma (πνεῦμα)",
    language: "Hebrew",
    explanation: "Invigorating breath, heavy wind, or spiritual essence. It is the active agency of God that performs creation, gives life to humans, and dynamically inspired Old and New Testament writing."
  },
  "life": {
    word: "life",
    originalValue: "Chayyim (חַיִּים) / Zoe (ζωή)",
    language: "Hebrew",
    explanation: "Vibrant physical animation and eternal spiritual vitality. Zoe denotes the immortal divine life of God Himself, shared with believers as a spiritual reality."
  },
  "truth": {
    word: "truth",
    originalValue: "Emet (אֱמֶת) / Aletheia (ἀλήθεια)",
    language: "Hebrew",
    explanation: "Absolute reliability, stability, and faithfulness. Emet indicates what is firm, trustworthy, and conforms to reality, as opposed to deception or false illusions."
  },
  "wisdom": {
    word: "wisdom",
    originalValue: "Chokhmah (חָכְמָה) / Sophia (σοφία)",
    language: "Hebrew",
    explanation: "Practical skill, ethical discernment, and understanding of the deep underlying design of creation. It is the ability to navigate life successfully according to God's order."
  },
  "knowledge": {
    word: "knowledge",
    originalValue: "Da'at (דַּעַת) / Gnosis (γνῶσις)",
    language: "Hebrew",
    explanation: "Relational intimacy and deep experimental awareness rather than simple factual information. It signifies knowing God personally through obedience and dedication."
  },
  "salvation": {
    word: "salvation",
    originalValue: "Yeshuah (יְשׁוּעָה) / Soteria (σωτηρία)",
    language: "Hebrew",
    explanation: "Deliverance from danger, safety, liberation from oppression, and restoration of spiritual wholeness. The Hebrew name Yeshua (Jesus) is derived directly from this root word."
  },
  "righteousness": {
    word: "righteousness",
    originalValue: "Tzedakah (צְדָקָה) / Dikaiosyne (δικαιοσύνη)",
    language: "Hebrew",
    explanation: "Covenant fidelity, justice, and right relationships. It is the active expression of moral rectitude and social equity in accordance with God's loving character."
  },
  "commandment": {
    word: "commandment",
    originalValue: "Mitzvah (מִצְוָה) / Entole (ἐντολή)",
    language: "Hebrew",
    explanation: "An authoritative instruction or guideline for holy living given by God to cultivate righteous community and faithful fellowship."
  },
  "testimony": {
    word: "testimony",
    originalValue: "Edut (עֵדוּת) / Martyria (μαρτυρία)",
    language: "Hebrew",
    explanation: "Solemn affirmation of truth, legal evidence, or God's revealing covenant decrees. Martyria is the root of the word 'martyr', showing witness unto death."
  },
  "blessed": {
    word: "blessed",
    originalValue: "Baruch (בָּרוּךְ) / Makarios (μακάριος)",
    language: "Hebrew",
    explanation: "Endued with divine favor, prosperity, and peace. Makarios is self-contained spiritual joy that comes from being under God's gracious reign, independent of outer circumstance."
  }
};
