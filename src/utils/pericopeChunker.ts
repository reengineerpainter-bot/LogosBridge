import { Verse } from '../types';

/**
 * Standard Biblical Pericope / Paragraph Start Verse Mappings
 * Keyed by: `${normalizedBook}_${chapter}` -> Array of verse numbers where a new story/scene/paragraph begins.
 */
const KNOWN_PERICOPE_STARTS: Record<string, number[]> = {
  // Genesis
  'genesis_1': [1, 6, 9, 14, 20, 24, 26], // Creation Days 1-6
  'genesis_2': [1, 4, 8, 15, 18, 21], // Sabbath, Garden of Eden, Creation of Woman
  'genesis_3': [1, 8, 14, 20, 22], // The Fall, God Confronts, The Promise & Expulsion
  'genesis_12': [1, 4, 10], // Call of Abram, Journey to Egypt
  'genesis_22': [1, 9, 15], // Sacrifice of Isaac, God's Covenant Renewal

  // Psalms
  'psalms_1': [1, 4], // The Blessed & The Ungodly
  'psalms_23': [1, 4, 5], // Shepherd, Valley, Prepared Table & House
  'psalms_91': [1, 9, 14], // Secret Place, Refuge, God's Deliverance
  'psalms_121': [1, 3, 5, 7], // Hills, Keeper, Sun & Moon, Preserving

  // Matthew
  'matthew_1': [1, 18], // Genealogy, Birth of Christ
  'matthew_2': [1, 13, 19], // The Magi, Escape to Egypt, Return to Nazareth
  'matthew_5': [1, 13, 17, 21, 27, 31, 33, 38, 43], // Sermon on the Mount: Beatitudes, Salt/Light, Law, Anger, Adultery, Oaths, Love Enemies
  'matthew_6': [1, 5, 16, 19, 25], // Giving, Prayer/Lord's Prayer, Fasting, Treasures, Worry
  'matthew_7': [1, 7, 13, 15, 24], // Judging, Ask/Seek/Knock, Narrow Gate, Tree & Fruit, House on Rock
  'matthew_28': [1, 11, 16], // Resurrection, Guards' Report, Great Commission

  // Luke
  'luke_1': [1, 5, 26, 39, 46, 57, 67], // Dedication, Zacharias, Annunciation, Mary visits Elizabeth, Magnificat, Birth of John, Zechariah's Prophecy
  'luke_2': [1, 8, 21, 25, 36, 41], // Birth of Jesus, Shepherds, Circumcision, Simeon, Anna, Jesus in Temple
  'luke_15': [1, 8, 11], // Lost Sheep, Lost Coin, Prodigal Son
  'luke_24': [1, 13, 36, 50], // Resurrection, Road to Emmaus, Appears to Disciples, Ascension

  // John
  'john_1': [1, 6, 14, 19, 29, 35, 43], // Word in Beginning, Witness of John, Incarnation, Testimony to Priests, Lamb of God, First Disciples, Philip & Nathanael
  'john_2': [1, 13, 23], // Wedding at Cana, Cleansing the Temple, Jesus Knows All Men
  'john_3': [1, 9, 16, 22, 31], // Nicodemus, New Birth, For God So Loved, John's Testimony, He from Above
  'john_4': [1, 27, 39, 43], // Samaritan Woman at Well, Disciples Return, Samaritans Believe, Healing Official's Son
  'john_5': [1, 16, 19, 31], // Healing at Bethesda, Sabbath Controversy, Authority of Son, Witnesses to Jesus
  'john_6': [1, 15, 22, 35, 41, 52, 60, 66], // Feeding 5,000, Walking on Water, Seeking Jesus, Bread of Life, Murmuring, Flesh & Blood, Disciples Stumble, Peter's Confession
  'john_14': [1, 8, 15, 25], // Way Truth Life, Showing the Father, Holy Spirit Promised, Peace I Leave
  'john_15': [1, 9, 18], // True Vine, Abiding in Love, World Hates You
  'john_17': [1, 6, 20], // High Priestly Prayer: For Himself, For Disciples, For All Believers
  'john_20': [1, 11, 19, 24, 30], // Empty Tomb, Mary Magdalene, Appears to Disciples, Thomas, Purpose of Book
  'john_21': [1, 15, 20], // Breakfast by the Sea, Peter Restored, The Beloved Disciple

  // Romans
  'romans_1': [1, 8, 16, 18, 24], // Greeting, Desire to Visit, Power of Gospel, Wrath of God, Idolatry
  'romans_8': [1, 9, 18, 26, 31], // No Condemnation, Life in the Spirit, Future Glory, Spirit Helps, More than Conquerors
  'romans_12': [1, 3, 9], // Living Sacrifice, Gifts in the Body, Marks of True Christian

  // 1 Corinthians
  '1 corinthians_13': [1, 4, 8, 13], // Without Love, Characteristics of Love, Love Never Fails, Greatest is Love
  '1 corinthians_15': [1, 12, 20, 35, 50], // Resurrection Fact, If No Resurrection, Christ the Firstfruits, Resurrection Body, Victory Over Death

  // Hebrews
  'hebrews_11': [1, 4, 8, 13, 17, 23, 29, 32], // Faith Defined, Abel/Enoch/Noah, Abraham & Sarah, Heavenly Country, Abraham's Trial, Moses, Red Sea/Jericho, Great Cloud of Witnesses
  'hebrews_12': [1, 4, 14, 18, 25], // Race of Faith, Father's Discipline, Warning against Refusing, Mount Sinai vs Zion, Unshakable Kingdom

  // 2 Peter
  '2 peter_1': [1, 3, 12, 16], // Greeting, Partakers of Divine Nature, Reminder, Eyewitnesses & Prophecy
  '2 peter_3': [1, 8, 14], // Scoffers, Day of the Lord, Call to Holiness
};

/**
 * Common Narrative & Transition Starters
 * Words or phrases indicating a fresh scene, speech, or thematic transition in Biblical prose.
 */
const SCENE_TRANSITION_PREFIXES = [
  // Temporal & Scene Starters
  /^and it came to pass/i,
  /^now it came to pass/i,
  /^after these things/i,
  /^the next day/i,
  /^on the morrow/i,
  /^and the third day/i,
  /^in those days/i,
  /^now when/i,
  /^and when/i,
  /^then came/i,
  /^then departed/i,
  /^and as jesus/i,
  /^and as they/i,
  /^while he yet/i,
  /^and immediately/i,
  /^and straightway/i,
  /^behold, /i,
  /^and behold, /i,
  
  // Divine & Major Speech Shifts
  /^and god said/i,
  /^and the lord said/i,
  /^then the lord/i,
  /^then spake/i,
  /^jesus answered and said/i,
  /^and he said unto them/i,
  /^and he began to teach/i,
  /^verily, verily, i say/i,
  /^for god so loved/i,
  /^finally, my brethren/i,
  /^moreover, brethren/i,
  /^therefore being justified/i,
  /^wherefore seeing we/i
];

/**
 * Groups verses into completed story, scene, or message paragraphs.
 * 
 * @param verses The raw array of verses in the current chapter
 * @param book The book name (e.g. 'Genesis', 'John')
 * @param chapter The chapter number (e.g. 1)
 * @returns An array of verse groups (paragraphs) representing complete narrative units
 */
export function groupVersesByStory(verses: Verse[], book: string, chapter: number): Verse[][] {
  if (!verses || verses.length === 0) return [];

  const normBook = (book || '').trim().toLowerCase();
  const pericopeKey = `${normBook}_${Number(chapter)}`;
  const knownStarts = KNOWN_PERICOPE_STARTS[pericopeKey];

  // 1. If explicit scholarly pericope breakdown exists, use it!
  if (knownStarts && knownStarts.length > 0) {
    const startSet = new Set(knownStarts);
    const groups: Verse[][] = [];
    let currentGroup: Verse[] = [];

    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      const vNo = Number(v.verseNumber);

      // Start new paragraph if this verse is a marked pericope start (and currentGroup is not empty)
      if (startSet.has(vNo) && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(v);
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }

  // 2. Dynamic Semantic & Pilcrow (¶) Narrative Resolver
  const groups: Verse[][] = [];
  let currentGroup: Verse[] = [];

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const rawText = (v.kjvText || v.contemporary || '').trim();
    const cleanText = rawText.replace(/^[¶§\s]+/, '');

    // Check if the verse has explicit KJV pilcrow '¶' marker
    const hasPilcrow = rawText.startsWith('¶') || rawText.includes('¶');

    // Check if the verse begins with a scene/narrative transition
    const isSceneTransition = SCENE_TRANSITION_PREFIXES.some((rx) => rx.test(cleanText));

    // Check if the previous verse ended with a terminal sentence (. ! ?) and we have at least 3 verses
    const prevVerse = currentGroup[currentGroup.length - 1];
    const prevText = prevVerse ? (prevVerse.kjvText || prevVerse.contemporary || '').trim() : '';
    const prevEndedSentence = /[.!?]["']?$/.test(prevText);

    const shouldBreak =
      currentGroup.length > 0 &&
      (
        hasPilcrow ||
        (isSceneTransition && currentGroup.length >= 2 && prevEndedSentence) ||
        (currentGroup.length >= 5 && prevEndedSentence) // natural paragraph length clamp (5-7 verses)
      );

    if (shouldBreak) {
      groups.push(currentGroup);
      currentGroup = [];
    }

    currentGroup.push(v);
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
