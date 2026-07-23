import { ChapterData, Verse, SpecialWord } from '../types';
import { BIBLE_BOOKS } from '../bibleMetadata';
import { STATIC_CHAPTERS } from '../staticChapters';
import { enrichChapter } from './personalizer';

// High-fidelity Greek theological roots for the New Testament
const GREEK_TERMS: Omit<SpecialWord, 'word'>[] = [
  { originalValue: 'Logos (λόγος)', language: 'Greek', explanation: 'Ancient Greek term meaning "divine reason", "logical discourse", or the personified "Word" of God.' },
  { originalValue: 'Agape (ἀγάπη)', language: 'Greek', explanation: 'Selfless, sacrificial, unconditional love originating from God\'s nature.' },
  { originalValue: 'Charis (χάρις)', language: 'Greek', explanation: 'Divine grace, favor, or a beautiful gift freely granted to those who do not deserve it.' },
  { originalValue: 'Pneuma (πνεῦμα)', language: 'Greek', explanation: 'Breath, wind, or the Holy Spirit of God that gives life and guides believers.' },
  { originalValue: 'Zoe (ζωή)', language: 'Greek', explanation: 'True spiritual life, eternal life, or life from the divine source.' },
  { originalValue: 'Phos (φῶς)', language: 'Greek', explanation: 'Radiating light, spiritual awareness, and holiness that dispels moral darkness.' },
  { originalValue: 'Eirene (εἰρήνη)', language: 'Greek', explanation: 'Spiritual peace, mental tranquility, and total wholeness in relationship with Christ.' },
  { originalValue: 'Koinonia (κοινωνία)', language: 'Greek', explanation: 'Deep community fellowship, close collaboration, and mutual share-holding.' },
  { originalValue: 'Metanoia (μετάνοια)', language: 'Greek', explanation: 'A beautiful transformation of mind, changing one\'s thinking, or sincere repentance.' },
  { originalValue: 'Doxa (δόξα)', language: 'Greek', explanation: 'Unrivaled glory, splendor, brilliance, dignity, and honorable reputation.' },
  { originalValue: 'Pistis (πίστις)', language: 'Greek', explanation: 'Faith, deep trust, unwavering belief, and active obedience in God.' },
  { originalValue: 'Alētheia (ἀλήθεια)', language: 'Greek', explanation: 'Truth, absolute reality, and objective sincerity opposite to falsehood.' }
];

// High-fidelity Hebrew theological roots for the Old Testament
const HEBREW_TERMS: Omit<SpecialWord, 'word'>[] = [
  { originalValue: 'Shalom (שָׁלוֹם)', language: 'Hebrew', explanation: 'Completeness, peace, safe well-being, health, and absolute harmony with God.' },
  { originalValue: 'Chesed (חֶסֶד)', language: 'Hebrew', explanation: 'Loyal love, covenant mercy, steadfast kindness, and faithful devotion.' },
  { originalValue: 'Elohim (אֱלֹהִים)', language: 'Hebrew', explanation: 'The majestic creator God plural of majesty. Emphasizes power and creation.' },
  { originalValue: 'Yahweh (יְהוָה)', language: 'Hebrew', explanation: 'The covenant personal name of God, meaning "He Who is" or "The Self-Existent One".' },
  { originalValue: 'Ruach (רוּחַ)', language: 'Hebrew', explanation: 'The spiritual breath, divine wind, or creative Spirit of the living God.' },
  { originalValue: 'Shema (שְׁמַע)', language: 'Hebrew', explanation: 'To listen, absorb, take heed, and immediately move into loving obedience.' },
  { originalValue: 'Torah (תּוֹרָה)', language: 'Hebrew', explanation: 'Divine guidance, instruction, ancestral law, or life-giving teachings.' },
  { originalValue: 'Kadosh (קָדוֹשׁ)', language: 'Hebrew', explanation: 'Holy, set apart, completely unique, clean, and pure from worldly stain.' },
  { originalValue: 'Tzedakah (צְדָקָה)', language: 'Hebrew', explanation: 'Righteousness, justice, moral goodness, and social charitable equity.' },
  { originalValue: 'Emet (אֱמֶת)', language: 'Hebrew', explanation: 'Absolute truth, reliability, moral faithfulness, and constant stability.' },
  { originalValue: 'Chayyim (חַיִּים)', language: 'Hebrew', explanation: 'Vibrant physical and spiritual life given directly by the Creator.' },
  { originalValue: 'Baruch (בָּרוּךְ)', language: 'Hebrew', explanation: 'Blessed, kneeled down, praised, or endued with divine growth and favor.' }
];

// Theme generators based on bible books
const GET_BOOK_THEME_VERBS = (book: string) => {
  const b = book.toLowerCase();
  if (b.includes('gen')) return { noun: 'creation', verb: 'blessed', hope: 'God made everything good, speaking light into existence.' };
  if (b.includes('exod')) return { noun: 'deliverance', verb: 'rescued', hope: 'The Lord guided His people out of bondage with strong arms.' };
  if (b.includes('psal')) return { noun: 'worship', verb: 'praised', hope: 'The Shepherd leads His sheep beside calm waters of peace.' };
  if (b.includes('prov')) return { noun: 'wisdom', verb: 'guided', hope: 'Acquiring understanding is better than choice silver or fine gold.' };
  if (b.includes('isai')) return { noun: 'prophecy', verb: 'called', hope: 'Arise and shine, for your light has arrived in glory.' };
  if (b.includes('john')) return { noun: 'eternal life', verb: 'believed', hope: 'The radiant light shines in darkness, and is never conquered.' };
  if (b.includes('rom')) return { noun: 'righteousness', verb: 'justified', hope: 'Nothing can separate us from the loyal, steadfast love of God.' };
  if (b.includes('rev')) return { noun: 'triumph', verb: 'restored', hope: 'He will wipe away every single tear; making all things beautiful and new.' };
  return { noun: 'faithfulness', verb: 'blessed', hope: 'The Lord remains committed to guiding and sustaining His beloved children.' };
};

export const generateOfflineChapter = (book: string, chapter: number): ChapterData => {
  // Check if static chapter exists case-insensitively to serve high-fidelity real chapters immediately
  const normalizedBook = book.toLowerCase();
  const matchedKey = Object.keys(STATIC_CHAPTERS).find(k => k.toLowerCase() === normalizedBook);
  if (matchedKey && STATIC_CHAPTERS[matchedKey][chapter]) {
    return enrichChapter(STATIC_CHAPTERS[matchedKey][chapter]);
  }

  const metadata = BIBLE_BOOKS.find(b => b.name.toLowerCase() === book.toLowerCase()) || { name: book, chapters: 20, testament: 'New' };
  const isOldTestament = metadata.testament === 'Old';
  const termsList = isOldTestament ? HEBREW_TERMS : GREEK_TERMS;
  const theme = GET_BOOK_THEME_VERBS(book);

  // Check if it is the Book of Genesis to provide high-fidelity real chapters and avoid "different text entirely"
  if (book.toLowerCase() === 'genesis') {
    let verses: Verse[] = [];
    
    switch (chapter) {
      case 1:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'In the beginning God created the heaven and the earth.',
            bsbText: 'In the beginning God created the heavens and the earth.',
            contemporary: 'In the very beginning, God created the universe—both the heavens above and the earth below.',
            nonNativeEnglish: 'In the absolute beginning, God created the sky, the space above us, and the earth we live on.',
            specialWords: [
              { word: 'created', originalValue: 'Bara (בָּרָא)', language: 'Hebrew', explanation: 'A Hebrew word used only of God. It means creating something completely new out of nothing (divine creation).' },
              { word: 'God', originalValue: 'Elohim (אֱלֹהִים)', language: 'Hebrew', explanation: 'The majestic creator God, showing His supreme power and authority over all.' }
            ]
          },
          {
            verseNumber: 2,
            kjvText: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
            bsbText: 'Now the earth was formless and empty, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters.',
            contemporary: 'The earth was completely empty of shape and life, covered in deep darkness. But the Spirit of God hovered over the waters, caring for the future creation.',
            nonNativeEnglish: 'The earth was empty and had no shape. It was dark over the deep water. But God\'s Holy Spirit was moving above the waters, ready to create.',
            specialWords: [
              { word: 'Spirit', originalValue: 'Ruach (רוּחַ)', language: 'Hebrew', explanation: 'The creative breath, wind, or Spirit of the living God.' }
            ]
          },
          {
            verseNumber: 3,
            kjvText: 'And God said, Let there be light: and there was light.',
            bsbText: 'And God said, "Let there be light," and there was light.',
            contemporary: 'God spoke the command, "Let light appear!" and light immediately burst forth.',
            nonNativeEnglish: 'And God commanded, "Let there be light!" And right away, light began to shine.',
            specialWords: []
          },
          {
            verseNumber: 4,
            kjvText: 'And God saw the light, that it was good: and God divided the light from the darkness.',
            bsbText: 'God saw that the light was good, and He separated the light from the darkness.',
            contemporary: 'God looked upon the light and declared it beautiful and good; then He drew a boundary between light and darkness.',
            nonNativeEnglish: 'God saw that the light was beautiful and good. Then God separated the bright light from the dark.',
            specialWords: []
          },
          {
            verseNumber: 5,
            kjvText: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.',
            bsbText: 'God called the light "day," and the darkness He called "night." And there was evening, and there was morning—the first day.',
            contemporary: 'God named the bright span "Day" and the darkness "Night." The cycle of sunset and sunrise marked the first complete day.',
            nonNativeEnglish: 'God gave names to them: He called the light "Day" and the dark "Night." Night passed and morning came, completing the first day.',
            specialWords: []
          }
        ];
        break;

      case 2:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'Thus the heavens and the earth were finished, and all the host of them.',
            bsbText: 'Thus the heavens and the earth were completed in all their vast array.',
            contemporary: 'With that, the creation of the universe and everything living in it was completely finished.',
            nonNativeEnglish: 'So the skies, the earth, and everything in them were completed and completely finished.',
            specialWords: [
              { word: 'finished', originalValue: 'Vaychulu (וַיְכֻלּוּ)', language: 'Hebrew', explanation: 'Brought to absolute completeness, perfected, and fully formed.' }
            ]
          },
          {
            verseNumber: 2,
            kjvText: 'And on the seventh day God ended his work which he had made; and he rested on the seventh day from all his work.',
            bsbText: 'By the seventh day God had finished the work He had been doing; so on the seventh day He rested from all His work.',
            contemporary: 'On the seventh day, having perfected His majestic work, God ceased from His creative labors to rest.',
            nonNativeEnglish: 'On the seventh day, God stopped His creative work and rested from making things.',
            specialWords: [
              { word: 'rested', originalValue: 'Shabat (שָׁבַת)', language: 'Hebrew', explanation: 'To cease, desist, rest, and celebrate completion. Root of the word "Sabbath".' }
            ]
          },
          {
            verseNumber: 7,
            kjvText: 'And the LORD God formed man of the dust of the ground, and breathed into his nostrils the breath of life; and man became a living soul.',
            bsbText: 'Then the LORD God formed man from the dust of the ground and breathed into his nostrils the breath of life, and man became a living soul.',
            contemporary: 'Then the LORD God carefully sculpted man out of the earthly dust, blew the breath of divine life into his nose, and the man came alive as an immortal soul.',
            nonNativeEnglish: 'Then the LORD God made man from the dirt of the ground, and breathed life-breath into him. Thus, the man became a living person.',
            specialWords: [
              { word: 'dust', originalValue: 'Afar (עָפָר)', language: 'Hebrew', explanation: 'Soil, clay, or loose earth. Emphasizes human humility and earthly fragility.' },
              { word: 'living soul', originalValue: 'Nefesh Chayah (נֶפֶשׁ חַיָּה)', language: 'Hebrew', explanation: 'A living, breathing, conscious being with desires, emotions, and intellect.' }
            ]
          },
          {
            verseNumber: 15,
            kjvText: 'And the LORD God took the man, and put him into the garden of Eden to dress it and to keep it.',
            bsbText: 'The LORD God took the man and put him in the Garden of Eden to cultivate it and keep it.',
            contemporary: 'The LORD God placed the man into the beautiful Garden of Eden to care for it, prune it, and protect it.',
            nonNativeEnglish: 'The LORD God took the man and placed him in the beautiful Garden of Eden so that he would build it up and look after it.',
            specialWords: [
              { word: 'Eden', originalValue: 'Gan Eden (גַּן עֵדֶן)', language: 'Hebrew', explanation: 'Eden means "delight" or "pleasure." A state of perfect harmony before sin entered the world.' }
            ]
          },
          {
            verseNumber: 18,
            kjvText: 'And the LORD God said, It is not good that the man should be alone; I will make him an help meet for him.',
            bsbText: 'The LORD God also said, "It is not good for the man to be alone. I will make for him a helper fit for him."',
            contemporary: 'The LORD God observed, "It is not healthy or complete for the man to live isolated. I will create a perfect, matching companion for him."',
            nonNativeEnglish: 'Then the LORD God said, "It is not good for the man to live all by himself. I will make an equal partner who will help him."',
            specialWords: [
              { word: 'helper fit', originalValue: 'Ezer Kenegdo (עֵזֶר כְּנֶגְדּוֹ)', language: 'Hebrew', explanation: 'A helper who is his counterpart and equal partner—essential strength matching him perfectly.' }
            ]
          }
        ];
        break;

      case 3:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'Now the serpent was more subtil than any beast of the field which the LORD God had made.',
            bsbText: 'Now the serpent was more crafty than any beast of the field that the LORD God had made.',
            contemporary: 'The serpent was more cunning and highly persuasive than any other creature God had made.',
            nonNativeEnglish: 'The snake was very clever and tricky, more than any other animal the LORD God had created.',
            specialWords: [
              { word: 'crafty', originalValue: 'Arum (עָרוּם)', language: 'Hebrew', explanation: 'Shrewd, clever, sensible but here used in a cunning, deceptive way.' }
            ]
          },
          {
            verseNumber: 6,
            kjvText: 'And when the woman saw that the tree was good for food, and that it was pleasant to the eyes... she took of the fruit thereof, and did eat.',
            bsbText: 'When the woman saw that the fruit of the tree was good for food, and beautiful to the eye... she took some and ate it.',
            contemporary: 'Attracted by the beautiful appearance of the tree and believing it would give great wisdom, she plucked the fruit, took a bite, and handed it to her husband, who ate it as well.',
            nonNativeEnglish: 'The woman saw that the food looked sweet and would make her wise. So she took some fruit, ate it, and then shared it with her husband, who ate it too.',
            specialWords: [
              { word: 'saw', originalValue: 'Vatere (וַתֵּרֶא)', language: 'Hebrew', explanation: 'To look, observe carefully, and desire in the mind. The beginning of moral compromise.' }
            ]
          },
          {
            verseNumber: 9,
            kjvText: 'And the LORD God called unto Adam, and said unto him, Where art thou?',
            bsbText: 'But the LORD God called out to the man, "Where are you?"',
            contemporary: 'The LORD God walked through the garden in the cool breeze and called, "Adam, where are you hiding?"',
            nonNativeEnglish: 'The LORD God called out to the man, "Adam, where are you?"',
            specialWords: []
          },
          {
            verseNumber: 15,
            kjvText: 'And I will put enmity between thee and the woman, and between thy seed and her seed; it shall bruise thy head, and thou shalt bruise his heel.',
            bsbText: 'And I will put enmity between you and the woman, and between your seed and her seed; He will crush your head, and you will strike His heel.',
            contemporary: 'I will put an endless struggle of hostility between you and the woman, and between your offspring and her descendant. He will crush your head, and you will strike His heel.',
            nonNativeEnglish: 'I will make you and the woman enemies, and your children will be enemies of her final Child. He will smash your head, and you will only bite His foot.',
            specialWords: [
              { word: 'seed', originalValue: 'Zera (זרַע)', language: 'Hebrew', explanation: 'Seed or offspring. Interpreted as a promise of the ultimate Savior who crushes evil.' }
            ]
          },
          {
            verseNumber: 19,
            kjvText: 'In the sweat of thy face shalt thou eat bread, till thou return unto the ground; for out of it wast thou taken: for dust thou art, and unto dust shalt thou return.',
            bsbText: 'By the sweat of your brow you will eat your food until you return to the ground, since from it you were taken; for dust you are and to dust you will return.',
            contemporary: 'From now on, you will work hard and sweat to grow food, until the day you die and return to the soil. For you were sculpted from dust, and to dust your body must go.',
            nonNativeEnglish: 'You will have to work very hard and sweat to grow food to live on, until you die and go back to the ground. You were made of dust, and to dust you will return.',
            specialWords: []
          }
        ];
        break;

      case 4:
        verses = [
          {
            verseNumber: 3,
            kjvText: 'Cain brought of the fruit of the ground an offering unto the LORD.',
            bsbText: 'Cain brought an offering of the fruit of the ground to the LORD.',
            contemporary: 'When harvest time came, Cain gathered some ordinary crops he grew and presented them to the LORD.',
            nonNativeEnglish: 'Cain brought some of the common crops he harvested as a gift to the LORD.',
            specialWords: [
              { word: 'offering', originalValue: 'Minchah (מִנְחָה)', language: 'Hebrew', explanation: 'A tribute gift, present, or sacrificial offering brought to make peace or show respect.' }
            ]
          },
          {
            verseNumber: 4,
            kjvText: 'And Abel, he also brought of the firstlings of his flock and of the fat thereof. And the LORD had respect unto Abel and to his offering.',
            bsbText: 'And Abel also brought an offering—the choicest firstborn of his flock and their fat portions. And the LORD looked with favor on Abel and his offering.',
            contemporary: 'Abel brought the absolute best, firstborn lambs from his flock, sacrificing them out of deep love. The LORD looked with favor on Abel and his sincere gift.',
            nonNativeEnglish: 'Abel brought the very best of his firstborn lambs. The LORD was pleased with Abel and accepted his lovely gift.',
            specialWords: []
          },
          {
            verseNumber: 9,
            kjvText: 'And the LORD said unto Cain, Where is Abel thy brother? And he said, I know not: Am I my brother\'s keeper?',
            bsbText: 'Then the LORD said to Cain, "Where is your brother Abel?" "I do not know," Cain replied. "Am I my brother’s keeper?"',
            contemporary: 'The LORD asked Cain, "Where is your brother Abel?" Cain replied coldly, "How should I know? Is it my job to look after him all day?"',
            nonNativeEnglish: 'Then the LORD asked Cain, "Where is your brother Abel?" Cain lied and said, "I have no idea. Is it my duty to guard my brother?"',
            specialWords: [
              { word: 'keeper', originalValue: 'Shomer (שֹׁמֵר)', language: 'Hebrew', explanation: 'A warden, watchman, or shepherd who guards and protects. Yes, we are called to be our brother\'s keeper!' }
            ]
          }
        ];
        break;

      case 6:
        verses = [
          {
            verseNumber: 5,
            kjvText: 'And GOD saw that the wickedness of man was great in the earth, and that every imagination of the thoughts of his heart was only evil continually.',
            bsbText: 'The LORD saw how great man’s wickedness on the earth had become, and that every inclination of the thoughts of his heart was only evil all the time.',
            contemporary: 'The LORD looked down and saw how rotten humanity had become; every single desire, thought, and scheme was pure evil, day after day.',
            nonNativeEnglish: 'The LORD saw that people on earth were acting very wickedly, and that their minds were full of bad thoughts all day long.',
            specialWords: [
              { word: 'wickedness', originalValue: 'Ra\'ah (רָעָה)', language: 'Hebrew', explanation: 'Moral decay, injury, badness, or violent injustice.' }
            ]
          },
          {
            verseNumber: 8,
            kjvText: 'But Noah found grace in the eyes of the LORD.',
            bsbText: 'But Noah found favor in the eyes of the LORD.',
            contemporary: 'But Noah lived differently; he found favour and divine grace in the eyes of the LORD.',
            nonNativeEnglish: 'But the LORD was pleased with Noah and showed him great kindness.',
            specialWords: [
              { word: 'grace/favor', originalValue: 'Chen (חֵן)', language: 'Hebrew', explanation: 'Grace, charm, acceptance, or unmerited favor shown by a superior.' }
            ]
          },
          {
            verseNumber: 14,
            kjvText: 'Make thee an ark of gopher wood; rooms shalt thou make in the ark, and shalt pitch it within and without with pitch.',
            bsbText: 'Make yourself an ark of gopher wood; make rooms in the ark, and coat it with pitch inside and out.',
            contemporary: 'God commanded Noah, "Build a massive floating ark out of strong cypress wood. Construct separate compartments inside, and seal it completely with tar inside and out."',
            nonNativeEnglish: 'God said to Noah, "Build a huge wooden ship from gopher wood. Make rooms inside it, and cover it with tar inside and out to keep the water out."',
            specialWords: [
              { word: 'ark', originalValue: 'Tevah (תֵּבָה)', language: 'Hebrew', explanation: 'A chest, box, or vessel that floats. Same word used for Moses\' basket.' }
            ]
          }
        ];
        break;

      case 7:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'And the LORD said unto Noah, Come thou and all thy house into the ark.',
            bsbText: 'Then the LORD said to Noah, "Go into the ark, you and all your household."',
            contemporary: 'Then the LORD told Noah, "Gather your wife, your sons, and their wives, and go inside the ark now."',
            nonNativeEnglish: 'Then the LORD said to Noah, "Go inside the big ship with your entire family."',
            specialWords: []
          },
          {
            verseNumber: 11,
            kjvText: 'In the six hundredth year of Noah\'s life... were all the fountains of the great deep broken up, and the windows of heaven were opened.',
            bsbText: 'In the six hundredth year of Noah’s life... all the springs of the great deep burst forth, and the floodgates of the heavens were opened.',
            contemporary: 'When Noah was exactly six hundred years old, the great underground waters surged upward, and the sky opened up in torrential downpours.',
            nonNativeEnglish: 'When Noah was six hundred years old, water burst up from underground and poured down in sheets from the sky.',
            specialWords: []
          }
        ];
        break;

      case 8:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'And God remembered Noah, and every living thing... and God made a wind to pass over the earth, and the waters assuaged.',
            bsbText: 'But God remembered Noah and all the livestock... and He sent a wind over the earth, and the waters receded.',
            contemporary: 'But God did not forget Noah and the animals inside the vessel; He sent a powerful dry wind across the globe, and the floodwaters began to drain away.',
            nonNativeEnglish: 'But God remembered Noah and the animals. He sent a strong wind across the earth, and the huge waters began to go down.',
            specialWords: [
              { word: 'remembered', originalValue: 'Yizkor (יִזְכֹּר)', language: 'Hebrew', explanation: 'To act on behalf of someone based on a previous promise; not just a mental recall.' }
            ]
          },
          {
            verseNumber: 11,
            kjvText: 'And the dove came in to him in the evening; and, lo, in her mouth was an olive leaf pluckt off: so Noah knew that the waters were abated.',
            bsbText: 'When the dove returned to him in the evening, there in its beak was a freshly plucked olive leaf! So Noah knew that the waters had receded.',
            contemporary: 'In the quiet of the evening, the peace-dove flew back, and there in its beak was a fresh green olive leaf! Noah rejoiced, knowing that dry ground had finally reappeared.',
            nonNativeEnglish: 'In the evening, the dove flew back to the ship, and in its mouth was a fresh green leaf from an olive tree! Noah knew the water was gone.',
            specialWords: []
          }
        ];
        break;

      case 9:
        verses = [
          {
            verseNumber: 11,
            kjvText: 'And I will establish my covenant with you; neither shall all flesh be cut off any more by the waters of a flood.',
            bsbText: 'I establish My covenant with you: Never again will all life be cut off by the waters of a flood.',
            contemporary: 'I make this binding vow with you and your offspring: I will never again destroy the earth and wipe out humanity with a global flood.',
            nonNativeEnglish: 'I make a solemn promise to you: I will never use a huge flood to destroy all living things on the earth again.',
            specialWords: [
              { word: 'covenant', originalValue: 'Berit (בְּרִית)', language: 'Hebrew', explanation: 'A lifetime contract of friendship and absolute loyalty established by God.' }
            ]
          },
          {
            verseNumber: 13,
            kjvText: 'I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.',
            bsbText: 'I have set My rainbow in the clouds, and it will be a sign of the covenant between Me and the earth.',
            contemporary: 'I have placed My colorful rainbow in the clouds. It will serve as a permanent visual sign of My everlasting promise to the earth.',
            nonNativeEnglish: 'I have put my rainbow in the clouds. This rainbow will be the sign of the contract between Me and the world.',
            specialWords: [
              { word: 'bow', originalValue: 'Keshet (קֶשֶׁת)', language: 'Hebrew', explanation: 'Literally "battle bow." God hangs His weapon of judgment in the sky, pointing away from the earth as a peace symbol.' }
            ]
          }
        ];
        break;

      case 11:
        verses = [
          {
            verseNumber: 4,
            kjvText: 'And they said, Go to, let us build us a city and a tower, whose top may reach unto heaven; and let us make us a name, lest we be scattered.',
            bsbText: 'Then they said, "Come, let us build ourselves a city, with a tower that reaches to the heavens, so that we may make a name for ourselves and not be scattered..."',
            contemporary: 'The people said, "Let us build a soaring capital city and a tower that reaches right up into the heavens! This will make us famous and keep us united in one spot."',
            nonNativeEnglish: 'The people said, "Let us build a great city with an extremely tall tower that reaches the sky, so we will be famous and stay together forever."',
            specialWords: [
              { word: 'make a name', originalValue: 'Na\'aseh Shem (נַעֲשֶׂה שֵּׁם)', language: 'Hebrew', explanation: 'An expression of supreme pride, empty fame, and independence from God.' }
            ]
          },
          {
            verseNumber: 9,
            kjvText: 'Therefore is the name of it called Babel; because the LORD did there confound the language of all the earth.',
            bsbText: 'That is why it was called Babel—because there the LORD confused the language of the whole world.',
            contemporary: 'That is why the site was named Babel—because there, the LORD confused their speech and scattered them across the face of the earth.',
            nonNativeEnglish: 'They named the city Babel, because there the LORD mixed up their speech and made them speak many different languages.',
            specialWords: [
              { word: 'Babel', originalValue: 'Bavel (בָּבֶל)', language: 'Hebrew', explanation: 'Means "confusion" in Hebrew. God humbles the proud by scrambling their words.' }
            ]
          }
        ];
        break;

      case 12:
        verses = [
          {
            verseNumber: 1,
            kjvText: 'Now the LORD had said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father\'s house, unto a land that I will shew thee.',
            bsbText: 'Now the LORD had said to Abram, "Leave your country, your kindred, and your father\'s house, and go to the land I will show you."',
            contemporary: 'The LORD commanded Abram, "Pack up, leave your homeland, leave your relatives and your father’s inheritance behind, and set out for a new land that I will show you."',
            nonNativeEnglish: 'The LORD said to Abram, "Go away from your home, leave your relatives behind, and travel to a new land that I will guide you to."',
            specialWords: [
              { word: 'Abram', originalValue: 'Avram (אַבְרָם)', language: 'Hebrew', explanation: 'Means "Exalted Father." Later changed to Abraham, "Father of a Multitude."' }
            ]
          },
          {
            verseNumber: 2,
            kjvText: 'And I will make of thee a great nation, and I will bless thee, and make thy name great; and thou shalt be a blessing.',
            bsbText: 'I will make you into a great nation, and I will bless you; I will make your name great, and you will be a blessing.',
            contemporary: 'I will build your descendants into a massive nation, shower you with blessings, make your name highly honored, and guide you to be a blessing to others.',
            nonNativeEnglish: 'I will make your family into a great nation, bless you, and make your name famous so you can help other people.',
            specialWords: [
              { word: 'bless', originalValue: 'Avarechecha (אֲבָרֶכְךָ)', language: 'Hebrew', explanation: 'To grant abundance, favor, life-promoting success, and fruitfulness.' }
            ]
          }
        ];
        break;

      case 15:
        verses = [
          {
            verseNumber: 5,
            kjvText: 'And he brought him forth abroad, and said, Look now toward heaven, and tell the stars, if thou be able to number them... So shall thy seed be.',
            bsbText: 'He took him outside and said, "Look up at the heavens and count the stars, if indeed you can number them." Then He said to him, "So shall your offspring be."',
            contemporary: 'God led Abram out into the dark night air and said, "Look up at the midnight sky. Count the stars if you possibly can. That is how countless your children will be."',
            nonNativeEnglish: 'Then God took him outside and said, "Look up at the sky and try to count the stars. Your children will be as many as those stars!"',
            specialWords: []
          },
          {
            verseNumber: 6,
            kjvText: 'And he believed in the LORD; and he counted it to him for righteousness.',
            bsbText: 'Abram believed the LORD, and He credited it to him as righteousness.',
            contemporary: 'Abram put his absolute trust in the LORD\'s word, and God counted his faith as perfect righteousness before Him.',
            nonNativeEnglish: 'Abram put his complete trust in the LORD, and because of this faith, the LORD accepted him as a good and right man.',
            specialWords: [
              { word: 'believed', originalValue: 'He\'emin (הֶאֱמִן)', language: 'Hebrew', explanation: 'To say "Amen" to God. Root of belief, solid trust, resting secure on God\'s truth.' },
              { word: 'righteousness', originalValue: 'Tzedakah (צְדָקָה)', language: 'Hebrew', explanation: 'Being in perfect, clean alignment with God\'s moral and relational standards.' }
            ]
          }
        ];
        break;

      case 22:
        verses = [
          {
            verseNumber: 2,
            kjvText: 'And he said, Take now thy son, thine only son Isaac, whom thou lovest, and get thee into the land of Moriah; and offer him there for a burnt offering.',
            bsbText: 'And He said, "Take your son, your only son Isaac, whom you love, and go to the land of Moriah, and offer him there as a burnt offering on one of the mountains."',
            contemporary: 'God said, "Take your son Isaac—the boy you love so deeply, your only heir—and travel to the mountainous land of Moriah. Dedicate him there to me on the mountain."',
            nonNativeEnglish: 'God said, "Take your son Isaac, whom you love very much, and go to the hills of Moriah. Offer him to Me on a mountain I will show you."',
            specialWords: [
              { word: 'Isaac', originalValue: 'Yitzchak (יִצְחָק)', language: 'Hebrew', explanation: 'Means "He laughs," referring to Sarah\'s laughter of doubt turned into laughter of joy.' }
            ]
          },
          {
            verseNumber: 13,
            kjvText: 'And Abraham lifted up his eyes, and looked, and behold behind him a ram caught in a thicket by his horns: and Abraham offered him up... in the stead of his son.',
            bsbText: 'Abraham lifted up his eyes and looked, and there behind him was a ram caught by its horns in a thicket! So Abraham took the ram and offered it up... in place of his son.',
            contemporary: 'Abraham looked up and saw a male sheep caught by its twisting horns in a thorny bush! He went over, took the ram, and sacrificed it in place of his beloved son.',
            nonNativeEnglish: 'Abraham looked up and saw a male sheep caught by its horns in a bush. He took the sheep and offered it as a gift to God instead of his son Isaac.',
            specialWords: []
          }
        ];
        break;

      case 28:
        verses = [
          {
            verseNumber: 12,
            kjvText: 'And he dreamed, and behold a ladder set up on the earth, and the top of it reached to heaven: and behold the angels of God ascending and descending on it.',
            bsbText: 'And he had a dream: He saw a stairway resting on the earth, with its top reaching to heaven, and the angels of God were ascending and descending on it.',
            contemporary: 'As Jacob slept, he had a marvelous dream: a glorious stone stairway connected earth directly to heaven, and messengers of God were climbing up and down on it.',
            nonNativeEnglish: 'Jacob had a beautiful dream. He saw a great staircase going from the ground up to heaven. God\'s angels were climbing up and down on it.',
            specialWords: [
              { word: 'ladder', originalValue: 'Sulam (סֻלָּם)', language: 'Hebrew', explanation: 'Staircase or flight of stone steps. Prefigures Jesus as the bridge between God and humanity.' }
            ]
          },
          {
            verseNumber: 16,
            kjvText: 'And Jacob awaked out of his sleep, and he said, Surely the LORD is in this place; and I knew it not.',
            bsbText: 'When Jacob awoke from his sleep, he said, "Surely the LORD is in this place, and I was not aware of it!"',
            contemporary: 'Jacob woke up in the quiet dark, shivering with awe, and said, "The LORD is truly active and present in this very spot, and I didn\'t even realize it!"',
            nonNativeEnglish: 'When Jacob woke up, he said, "The LORD is really here in this spot, and I did not even know it!"',
            specialWords: []
          }
        ];
        break;

      case 32:
        verses = [
          {
            verseNumber: 24,
            kjvText: 'And Jacob was left alone; and there wrestled a man with him until the breaking of the day.',
            bsbText: 'So Jacob was left alone, and a man wrestled with him till daybreak.',
            contemporary: 'Jacob was left completely alone by the dark river, and some mysterious Man grappled and wrestled with him until the first light of dawn.',
            nonNativeEnglish: 'So Jacob stayed alone. Then, a mysterious Man came and wrestled with him until the sun started to rise.',
            specialWords: [
              { word: 'wrestled', originalValue: 'Vaye’avak (וַיֵּאָבֵק)', language: 'Hebrew', explanation: 'To wrestle or roll in the dust. A physical struggle symbolizing intense spiritual dependency on God.' }
            ]
          },
          {
            verseNumber: 28,
            kjvText: 'And he said, Thy name shall be called no more Jacob, but Israel: for as a prince hast thou power with God and with men, and hast prevailed.',
            bsbText: 'Then the man said, "Your name will no longer be Jacob, but Israel, because you have struggled with God and with men, and have overcome."',
            contemporary: 'The Man said, "You will no longer be named Jacob (the schemer), but Israel (struggler with God), because you have held on tight, struggled faithfully with God and men, and won."',
            nonNativeEnglish: 'The Man said, "Your name will not be Jacob anymore. Now you are Israel, because you struggled with God and with men, and you did not give up."',
            specialWords: [
              { word: 'Israel', originalValue: 'Yisrael (יִשְׂרָאֵל)', language: 'Hebrew', explanation: 'Struggles with God, or Ruler with God. This became the name of the entire covenant nation.' }
            ]
          }
        ];
        break;

      case 37:
        verses = [
          {
            verseNumber: 3,
            kjvText: 'Now Israel loved Joseph more than all his children, because he was the son of his old age: and he made him a coat of many colours.',
            bsbText: 'Now Israel loved Joseph more than all his other sons, because he had been born to him in his old age; and he made him a richly ornamented robe.',
            contemporary: 'Old Jacob loved young Joseph far more than his other sons, since Joseph was born in his latter years. He had his weavers craft Joseph a beautiful, royal robe of vibrant colors.',
            nonNativeEnglish: 'Israel loved Joseph more than all his other sons. So Israel gave Joseph a beautiful, colorful coat as a special gift.',
            specialWords: [
              { word: 'coat of colors', originalValue: 'Ketonet Passim (כְּתֹנֶת פַּסִּים)', language: 'Hebrew', explanation: 'A long-sleeved ornamental tunic worn by nobility. It showed Joseph was chosen for family leadership, causing sibling rivalry.' }
            ]
          },
          {
            verseNumber: 28,
            kjvText: 'Then there passed by Midianites merchantmen; and they drew and lifted up Joseph out of the pit, and sold Joseph... for twenty pieces of silver.',
            bsbText: 'So when the Midianite merchants passed by, Joseph’s brothers pulled him out of the cistern and sold him for twenty pieces of silver to the Ishmaelites...',
            contemporary: 'When some traveling merchant herds passed by, the brothers dragged Joseph out of the deep, empty well and sold him to the Ishmaelites for twenty silver coins, who hauled him away to Egypt.',
            nonNativeEnglish: 'When some merchants passed by, the brothers pulled Joseph out of the empty well and sold him for twenty pieces of silver. The buyers took Joseph to Egypt.',
            specialWords: []
          }
        ];
        break;

      case 50:
        verses = [
          {
            verseNumber: 20,
            kjvText: 'But as for you, ye thought evil against me; but God meant it unto good... to save much people alive.',
            bsbText: 'As for you, you meant evil against me, but God meant it for good, to bring about the present result—the survival of many people.',
            contemporary: 'It is true that you plotted ruin and evil against me, but God turned that very evil into beautiful goodness. He used it to put me in power so I could feed and save many lives.',
            nonNativeEnglish: 'You wanted to hurt me, but God took your bad plans and turned them into good plans, so that many families could be saved from the famine.',
            specialWords: [
              { word: 'meant it for good', originalValue: 'Chashavah le-Tovah (חֲשָׁבָהּ לְטֹבָה)', language: 'Hebrew', explanation: 'God weaves human mistakes and intentional evils into His sovereign plan of grace and redemption.' }
            ]
          },
          {
            verseNumber: 26,
            kjvText: 'So Joseph died, being an hundred and ten years old: and they embalmed him, and he was put in a coffin in Egypt.',
            bsbText: 'So Joseph died at the age of 110. And they embalmed him and placed him in a coffin in Egypt.',
            contemporary: 'Joseph passed away peacefully at the age of one hundred and ten. His body was embalmed and placed in a wooden coffin in Egypt, waiting for the day of rescue.',
            nonNativeEnglish: 'So Joseph died when he was 110 years old. They embalmed his body and placed it in a coffin in the land of Egypt.',
            specialWords: []
          }
        ];
        break;

      default:
        // High-fidelity generated narrative summary of historical Genesis events for any of the 50 chapters
        const genesisNarratives: Record<number, { title: string, event: string, expectation: string }> = {
          5: { title: 'Generations of Adam and Enoch', event: 'The listing of the descendants from Adam leading down to Noah, highlighting Enoch who walked so closely with God that he was taken.', expectation: 'Showing that even in a decaying world, close companionship with God is fully possible.' },
          10: { title: 'The Table of Nations', event: 'The descendants of Noah\'s sons, Shem, Ham, and Japheth, spreading out on the mountains and shores to seed the nations of the earth.', expectation: 'God sets up boundaries and maintains watch care over all global tribal expansions.' },
          13: { title: 'Separation of Abraham and Lot', event: 'Abraham generously lets Lot choose his preferred pastures. Lot chooses the green plains of Jordan near Sodom, while Abraham stays in Canaan.', expectation: 'God crowns Abraham\'s peaceful generosity with an expansion of his land covenant.' },
          14: { title: 'Rescue of Lot and Melchizedek\'s Blessing', event: 'Abraham wages a strategic war to rescue captured Lot, and on return is met by Melchizedek, the mysterious King of Salem, with bread and wine.', expectation: 'A beautiful visual prototype of the eternal High Priest and King of Righteousness.' },
          16: { title: 'Hagar and Ishmael in the Desert', event: 'Fleeing Sarah\'s harshness, Hagar is met by the Angel of the LORD in the dry wilderness, who comforts her, naming God "The One Who Sees Me."', expectation: 'We see that God hears the cries of the suffering outcasts and is deeply interested in them.' },
          17: { title: 'Covenant of Circumcision and Name Changes', event: 'God enters a deep contract with Abraham, changing names and promising that Sarah will bear Isaac in her elderly age.', expectation: 'All of God\'s promises are signed with a physical reminder of His absolute loyalty.' },
          18: { title: 'The Three Visitors at Mamre', event: 'Abraham hosts three heavenly messengers in his tent. Sarah laughs in doubt, hearing that she will bear a son next year.', expectation: 'Asking the world-defining question: "Is anything too hard or difficult for the LORD?"' },
          19: { title: 'Sodom\'s Demise and Lot\'s Deliverance', event: 'Lot is dragged safely out of Sodom by angelic hands as fire rains down, and his Wife is crystallized into a pillar of salt.', expectation: 'God provides paths of redemption for the righteous before administering justice.' },
          20: { title: 'Abraham and Abimelech', event: 'Abimelech is warned by God in a dream concerning Sarah, showing God\'s dynamic watchfulness over the covenant seed.', expectation: 'God protects His plan even when His chosen family falters under stress.' },
          21: { title: 'The Birth of Isaac and Hagar\'s Well', event: 'Sarah rejoices with laughter at Isaac\'s birth. In the wild desert, God saves crying Ishmael by uncovering a hidden freshwater well.', expectation: 'God turns human laughter of cynicism into clean laughter of pure spiritual joy.' },
          23: { title: 'Death and Burial of Sarah', event: 'Sarah dies, and Abraham purchases the cave of Machpelah from the Hittites for shekels of silver, establishing a physical grave.', expectation: 'A physical stake of ownership in the promised land, secured in hope of resurrection.' },
          24: { title: 'Rebekah Chosen at the Well', event: 'Abraham\'s servant prays for a sign at the well; beautiful Rebekah waters his thirst and camels, leaving her home to marry Isaac.', expectation: 'A match designed and guided by God\'s quiet, loving orchestration.' },
          25: { title: 'The Red Pottage and Esau\'s Birthright', event: 'Twins Jacob and Esau are born. When older, weary Esau sells his sacred birthright as firstborn to Jacob for a single plate of red lentil soup.', expectation: 'Showing the spiritual cost of prioritizing immediate physical relief over permanent blessings.' },
          26: { title: 'Isaac Digs His Father\'s Wells', event: 'In Gerar, Isaac experiences famine, but God blesses him. He re-opens the historical wells of Abraham despite surrounding disputes.', expectation: 'Patience and peaceful dialogue overcome local hostilities by God\'s guidance.' },
          27: { title: 'Jacob Gains Isaac\'s Blessing', event: 'Jacob puts on Esau\'s clothes and cooks savory meat for blind Isaac, securing the ultimate paternal covenant blessing.', expectation: 'God uses even broken human setups to advance His sovereign plans.' },
          29: { title: 'Jacob in Haran and Marriage', event: 'Jacob meets Rachel at the stone well, serves Laban seven years, but is given Leah, and then Rachel as wives.', expectation: 'Learning patience, faithfulness, and the value of enduring love through heavy labor.' },
          30: { title: 'Jacob\'s Wages and Flocks Increase', event: 'Jacob uses peeled branches in the water channels to breed healthy spotted and speckled goats, building his financial independence.', expectation: 'God secures and multiplies Jacob\'s assets against Laban\'s attempts to exploit him.' },
          31: { title: 'Flight from Laban and Mizpah Pillar', event: 'Jacob flees with his family. Laban pursues but is warned in a night dream, leading to a border covenant of peace at Mizpah.', expectation: 'God establishes boundaries to protect his sheep from being stolen from.' },
          33: { title: 'Jacob and Esau Reunited', event: 'Jacob bows low with worry, but Esau runs, runs to embrace his long-lost brother, throwing his arms around his neck and crying.', expectation: 'God repairs relationships we thought were broken beyond repair.' },
          34: { title: 'Tragedy in Shechem', event: 'A dark, violent record of Dina\'s abuse and the fierce, deceptive revenge conducted by Simeon and Levi against the town of Shechem.', expectation: 'The heavy structural consequence of responding to evil with unguided tribal violence.' },
          35: { title: 'Jacob Returns to Bethel', event: 'God calls Jacob back to Bethel. Rachel passes away giving birth to Benjamin, and Isaac dies at a ripe old age.', expectation: 'God cleanses the family of idols and establishes the permanent covenant name Israel.' },
          36: { title: 'The Generations of Esau', event: 'The detailed lineage of Esau\'s descendants and the kings who ruled Edom in the rugged highlands of Mount Seir.', expectation: 'God is faithful to His word, building Esau into a robust and powerful nation.' },
          38: { title: 'History of Judah and Tamar', event: 'Judah departs from his brothers. The narrative pivots to Tamar, whose righteousness and birth of twins Pérez and Zérah secure the lineage.', expectation: 'A testament that God uses even broken histories to preserve the family line of the Messiah.' },
          39: { title: 'Joseph\'s Integrity in Egypt', event: 'Joseph is elevated as manager in Potiphar\'s house but flees moral temptation. Potiphar\'s wife falsely accuses him, throwing him into prison.', expectation: 'The LORD remains present with Joseph in the dark prison, showing him mercy.' },
          40: { title: 'Joseph Interprets Prison Dreams', event: 'Joseph listens and interprets the separate prophetic dreams of Pharaoh\'s troubled butler (cupbearer) and baker.', expectation: 'God keeps Joseph\'s prophetic gift active and sharp even in isolation.' },
          41: { title: 'Joseph Appointed Ruler of Egypt', event: 'Pharaoh dreams of skeletal cows eating fat cows. Joseph is summoned, predicts the seven years of famine, and is made Lord of Egypt.', expectation: 'Humility and spiritual wisdom lifted from the dungeon to the throne in a day.' },
          42: { title: 'Joseph\'s Brothers Journey for Grain', event: 'Famine strikes Canaan. Jacob\'s sons travel to Egypt to buy grain and bow low before Joseph, completely failing to recognize him.', expectation: 'Joseph\'s early dreams are fulfilled, and he begins to test their hearts.' },
          43: { title: 'The Second Journey with Benjamin', event: 'Simeon is bound in Egypt. The brothers must bring Benjamin to obtain food. Judah guarantees Benjamin\'s life, and they feast at Joseph\'s table.', expectation: 'A tense dinner of hope where Joseph is deeply moved by the sight of his mother\'s son.' },
          44: { title: 'The Silver Cup Test in Benjamin\'s Sack', event: 'Joseph hides his silver beaker in Benjamin\'s bag. When discovered, Judah steps forward, pleading to take Benjamin\'s place as a lifelong slave.', expectation: 'Judah shows a perfect, beautiful heart change of self-sacrifice.' },
          45: { title: 'Joseph Reveals His Identity', event: 'Joseph breaks down in tears: "I am Joseph! Is my father alive?" He forgives his brothers, telling them that God sent him ahead to preserve lives.', expectation: 'Sovereign redemptive design: What was meant for evil, God weaves into beautiful grace.' },
          46: { title: 'Jacob\'s Migration to Egypt', event: 'Jacob receives the news. God encourages him in Beersheba: "Do not fear to go down to Egypt." He journeys and embraces Joseph.', expectation: 'Love reunited across distance and decades under the hand of Providence.' },
          47: { title: 'Jacob Blesses Pharaoh and Settles in Goshen', event: 'Jacob meets Pharaoh and blesses him. Joseph manages the national grain stores, keeping Egypt and Canaan fed through the final famine years.', expectation: 'The strangers of the covenant become dispensers of life and bless worldly rulers.' },
          48: { title: 'Jacob Blesses Ephraim and Manasseh', event: 'Jacob, nearing death, adopts and blesses Joseph\'s boys. He crosses his hands to place the younger Ephraim before Manasseh.', expectation: 'God\'s grace behaves outside the lines of normal human rules of seniority.' },
          49: { title: 'Jacob\'s Dying Prophecies to His Sons', event: 'Jacob summons all twelve sons and details the future character and geographical tribal boundaries of Israel.', expectation: 'Foretelling that the ultimate Ruler, Shiloh, will rise from the tribe of Judah.' },
        };

        const chapterSummary = genesisNarratives[chapter] || {
          title: `Genesis Chapter ${chapter}`,
          event: `The ongoing narrative of God\'s covenant promise moving through the family of Abraham, Isaac, and Jacob as they lived as strangers in Canaan.`,
          expectation: `God remains completely steady, developing the lineage of faith that will eventually bless all the families of the earth.`
        };

        verses = [
          {
            verseNumber: 1,
            kjvText: `And it came to pass in the book of Genesis, even in chapter ${chapter}, that the LORD commanded His covenant to stand fast on behalf of Israel.`,
            bsbText: `Now in Genesis ${chapter}, the LORD made His promise active once again, ensuring His covenant stood firm.`,
            contemporary: `This chapter covers the historical event of "${chapterSummary.title}": ${chapterSummary.event}`,
            nonNativeEnglish: `In this chapter, we read about "${chapterSummary.title}": how ${chapterSummary.event.toLowerCase()} ${chapterSummary.expectation}`,
            specialWords: [
              { word: 'Israel', originalValue: 'Yisrael (יִשְׂרָאֵל)', language: 'Hebrew', explanation: 'One who struggles with God and overcomes. Jacob\'s name of blessing.' }
            ]
          },
          {
            verseNumber: 2,
            kjvText: `They journeyed from place to place according to the voice of God, pitching their tents and building stone altars to call upon His name.`,
            bsbText: `The family traveled onward as directed, pitching their tents and building altars to call upon the name of the LORD.`,
            contemporary: `As they traveled, the family set up altars to pray and remember how God had guided them step by step.`,
            nonNativeEnglish: `As they traveled from place to place, they built altars (stone tables for gifts to God) to worship the LORD and thank Him for His safety.`,
            specialWords: [
              { word: 'altar', originalValue: 'Mizbe’ach (מִזְבֵּחַ)', language: 'Hebrew', explanation: 'A place of sacrifice and dedicated prayer where humans meet God.' }
            ]
          },
          {
            verseNumber: 3,
            kjvText: `For His lovingkindness is everlasting, and He is faithful to remember His promise made unto Abraham His beloved servant.`,
            bsbText: `For His lovingkindness is everlasting, and He is faithful to remember His promise to His beloved servant Abraham.`,
            contemporary: `God remained fully committed to His word, ensuring that the starlight promise made to Abraham was honored in every generation.`,
            nonNativeEnglish: `This is because God never breaks His contracts or promises. He remembered everything He promised to Abraham.`,
            specialWords: [
              { word: 'covenant', originalValue: 'Berit (בְּרִית)', language: 'Hebrew', explanation: 'A secure, binding relationship of love and loyalty initiated by God.' }
            ]
          }
        ];
        break;
    }

    return {
      book: 'Genesis',
      chapter,
      verses,
      isSynthesizedFallback: true
    };
  }

  // Number of verses is determined deterministically based on book length or a default
  const verseCount = Math.max(10, (chapter * 7) % 25 + 8);
  const verses: Verse[] = [];

  for (let i = 1; i <= verseCount; i++) {
    // Generate deterministic elements
    const term1 = termsList[(i * 3) % termsList.length];
    const term2 = termsList[(i * 7 + 2) % termsList.length];

    let word1Target = 'Lord';
    let word2Target = 'peace';
    
    if (isOldTestament) {
      word1Target = i % 2 === 0 ? 'God' : 'the Lord';
      word2Target = i % 3 === 0 ? 'peace' : i % 3 === 1 ? 'righteousness' : 'mercy';
    } else {
      word1Target = i % 2 === 0 ? 'grace' : 'the Word';
      word2Target = i % 3 === 0 ? 'faith' : i % 3 === 1 ? 'love' : 'wisdom';
    }

    const kjvText = `For the ${word1Target} shall bring forth ${word2Target} unto the faithful in chapter ${chapter}, verse ${i}, of the book of ${book}.`;
    const bsbText = `For the ${word1Target} will bring forth ${word2Target} to those who have faith in ${book} ${chapter}:${i}.`;
    
    const contemporary = `Indeed, ${word1Target === 'the Lord' ? 'the Sovereign Lord' : word1Target} is going to bring absolute ${word2Target} to everyone who trustingly follows Him right here.`;
    
    let nonNativeEnglish = '';
    if (word2Target === 'peace') {
      nonNativeEnglish = `This means You promise to give quietness of mind, complete safety, and peaceful living to all children who trust in You completely.`;
    } else if (word2Target === 'righteousness') {
      nonNativeEnglish = `It explains that You will make everything right, and treat Your faithful ones with great fairness and perfect justice.`;
    } else {
      nonNativeEnglish = `We see that You show amazing favor and continuous kindness to Your servants, helping them understand Your divine purpose.`;
    }

    // Connect vocabulary
    const specialWords: SpecialWord[] = [
      {
        word: word1Target,
        originalValue: term1.originalValue,
        language: term1.language,
        explanation: term1.explanation
      },
      {
        word: word2Target,
        originalValue: term2.originalValue,
        language: term2.language,
        explanation: term2.explanation
      }
    ];

    verses.push({
      verseNumber: i,
      kjvText,
      bsbText,
      contemporary,
      nonNativeEnglish,
      specialWords
    });
  }

  // Inject a signature verse as verse 1 to provide a lovely theological context summary
  verses[0] = {
    verseNumber: 1,
    kjvText: `In the day of visitation, the LORD shall establish His covenant with ${book}, even in chapter ${chapter} for He is faithful.`,
    bsbText: `In the day of visitation, the LORD will establish His covenant with ${book} in chapter ${chapter}, for He is faithful.`,
    contemporary: `When God intervenes, He will establish His everlasting covenant of love with us here in ${book} chapter ${chapter}.`,
    nonNativeEnglish: `This first verse highlights how You step into human history to make a strong, unbreakable agreement of love and guidance. ${theme.hope.replace(/\bHe\b/gi, 'You').replace(/\bHis\b/gi, 'Your').replace(/\bGod\b/gi, 'You').replace(/\bhim\b/gi, 'you').replace(/\bhimself\b/gi, 'yourself').replace(/\bstands\b/gi, 'stand')}`,
    specialWords: [
      {
        word: 'covenant',
        originalValue: isOldTestament ? 'Berit (בְּרִית)' : 'Diatheke (διαθήκη)',
        language: isOldTestament ? 'Hebrew' : 'Greek',
        explanation: 'A sacred binding contract or promise of absolute loyalty between God and His people, which God never breaks.'
      },
      {
        word: 'faithful',
        originalValue: isOldTestament ? 'Aman (אָמַן)' : 'Pistos (πιστός)',
        language: isOldTestament ? 'Hebrew' : 'Greek',
        explanation: 'Completely steady, thoroughly reliable, and true to promises made.'
      }
    ]
  };

  return enrichChapter({
    book,
    chapter,
    verses,
    isSynthesizedFallback: true
  });
};
