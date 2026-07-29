const fs = require('fs');

const raw = {
  "book": "John",
  "chapter": 6,
  "translation_style": "Plain English",
  "formatting": "Words of Jesus in red using HTML span tags",
  "verses": [
    {
      "verse": 1,
      "text": "After these things Jesus went over the sea of Galilee, which is the sea of Tiberias."
    },
    {
      "verse": 2,
      "text": "And a great multitude followed Him, because they continually observed His attesting signs which He did on those who were diseased."
    },
    {
      "verse": 3,
      "text": "And Jesus went up into the hill country, and there He sat with His disciples."
    },
    {
      "verse": 4,
      "text": "And the Passover, a feast of the Jews, was near."
    },
    {
      "verse": 5,
      "text": "When Jesus then lifted up His eyes, and saw a massive throng come to Him, He said to Philip, <span style='color:red;'>\"Where shall we buy bread, that these may eat?\"</span>"
    },
    {
      "verse": 6,
      "text": "And this He said to test him: for He Himself knew what He would do."
    },
    {
      "verse": 7,
      "text": "Philip answered Him, \"Two hundred days' wages worth of bread is not sufficient for them, that every one of them may take a little.\""
    },
    {
      "verse": 8,
      "text": "One of His disciples, Andrew, Simon Peter's brother, said to Him,"
    },
    {
      "verse": 9,
      "text": "\"There is a lad here, who has five barley loaves, and two small fishes: but what are they among so many?\""
    },
    {
      "verse": 10,
      "text": "And Jesus said, <span style='color:red;'>\"Make the men sit down.\"</span> Now there was much grass in the place. So the men sat down, in number about five thousand."
    },
    {
      "verse": 11,
      "text": "And Jesus took the loaves; and when He had offered a prayer of gratitude, He distributed to the disciples, and the disciples to those who were seated; and likewise of the fishes as much as they desired."
    },
    {
      "verse": 12,
      "text": "When they were fully satiated, He said to His disciples, <span style='color:red;'>\"Gather up the fragments that remain, that nothing be lost.\"</span>"
    },
    {
      "verse": 13,
      "text": "Therefore they gathered them together, and filled twelve baskets with the fragments of the five barley loaves, which remained over and above to those who had eaten."
    },
    {
      "verse": 14,
      "text": "Then those men, when they had seen the divine sign that Jesus did, said, \"This is truthfully that prophet who should come into the world.\""
    },
    {
      "verse": 15,
      "text": "When Jesus therefore experientially realized that they would come and violently seize Him, to make Him a king, He departed again into a mountain Himself alone."
    },
    {
      "verse": 16,
      "text": "And when late evening twilight was now come, His disciples went down to the sea,"
    },
    {
      "verse": 17,
      "text": "And entered into a ship, and went over the sea toward Capernaum. And it was now deep darkness, and Jesus had not come to them."
    },
    {
      "verse": 18,
      "text": "And the sea arose by reason of a great wind that blew."
    },
    {
      "verse": 19,
      "text": "So when they had rowed about three to four miles, they see Jesus walking on the sea, and drawing near to the ship: and they were afraid."
    },
    {
      "verse": 20,
      "text": "But He said to them, <span style='color:red;'>\"I AM; be not afraid.\"</span>"
    },
    {
      "verse": 21,
      "text": "Then they eagerly received Him into the ship: and immediately the ship was at the land where they went."
    },
    {
      "verse": 22,
      "text": "The next day, when the people who stood on the other side of the sea realized that there was no other boat there, except that one into which His disciples had entered, and that Jesus went not with His disciples into the boat, but that His disciples had sailed away alone;"
    },
    {
      "verse": 23,
      "text": "(However there came other boats from Tiberias near to the place where they ate bread, after the Lord had given thanks:)"
    },
    {
      "verse": 24,
      "text": "When the people therefore saw that Jesus was not there, neither His disciples, they also took shipping, and came to Capernaum, seeking Jesus."
    },
    {
      "verse": 25,
      "text": "And when they had found Him on the other side of the sea, they said to Him, \"Rabbi, when did you come here?\""
    },
    {
      "verse": 26,
      "text": "Jesus answered them and said, <span style='color:red;'>\"Truly, truly, I say to you, You seek me, not because you spiritually perceived the signs, but because you ate of the loaves, and were fattened.</span>"
    },
    {
      "verse": 27,
      "text": "<span style='color:red;'>Do not direct your life's pursuit for the sustenance which perishes, but for that sustenance which endures to everlasting life, which the Son of Man will give to you: for Him God the Father has stamped with His seal of approval.\"</span>"
    },
    {
      "verse": 28,
      "text": "Then they said to Him, \"What shall we execute, that we might trade our labor for the works of God?\""
    },
    {
      "verse": 29,
      "text": "Jesus answered and said to them, <span style='color:red;'>\"This is the singular requirement of God, that you believe on Him whom He has sent.\"</span>"
    },
    {
      "verse": 30,
      "text": "They said therefore to Him, \"What sign do you show then, that we may see, and believe you? what do you work?"
    },
    {
      "verse": 31,
      "text": "Our fathers ate manna in the desert; as it is written, He gave them bread from heaven to eat.\""
    },
    {
      "verse": 32,
      "text": "Then Jesus said to them, <span style='color:red;'>\"Truly, truly, I say to you, Moses gave you not that bread from heaven; but my Father gives you the genuine reality of bread from heaven.</span>"
    },
    {
      "verse": 33,
      "text": "<span style='color:red;'>For the bread of God is He who comes down from heaven, and gives life to the world.\"</span>"
    },
    {
      "verse": 34,
      "text": "Then they said to Him, \"Lord, evermore give us this bread.\""
    },
    {
      "verse": 35,
      "text": "And Jesus said to them, <span style='color:red;'>\"I am the bread of life: he that comes to me shall absolutely never hunger; and he that believes on me shall never thirst.</span>"
    },
    {
      "verse": 36,
      "text": "<span style='color:red;'>But I said to you, That you also have seen me, and believe not.</span>"
    },
    {
      "verse": 37,
      "text": "<span style='color:red;'>All that the Father gives me shall come to me; and him that comes to me I will in no wise violently expel.</span>"
    },
    {
      "verse": 38,
      "text": "<span style='color:red;'>For I came down from heaven, not to do my own will, but the will of Him who sent me.</span>"
    },
    {
      "verse": 39,
      "text": "<span style='color:red;'>And this is the Father's will who has sent me, that of all which He has given me I should allow nothing to perish, but should raise it up again at the last day.</span>"
    },
    {
      "verse": 40,
      "text": "<span style='color:red;'>And this is the will of Him who sent me, that every one who sees the Son, and believes on Him, may have everlasting life: and I will raise him up at the last day.\"</span>"
    },
    {
      "verse": 41,
      "text": "The Jews then murmured at Him, because He said, <span style='color:red;'>\"I am the bread which came down from heaven.\"</span>"
    },
    {
      "verse": 42,
      "text": "And they said, \"Is not this Jesus, the son of Joseph, whose father and mother we know? how is it then that He says, I came down from heaven?\""
    },
    {
      "verse": 43,
      "text": "Jesus therefore answered and said to them, <span style='color:red;'>\"Do not murmur among yourselves.</span>"
    },
    {
      "verse": 44,
      "text": "<span style='color:red;'>No man can come to me, except the Father who has sent me forcefully draw him: and I will raise him up at the last day.</span>"
    },
    {
      "verse": 45,
      "text": "<span style='color:red;'>It is written in the prophets, And they shall be all taught of God. Every man therefore that has heard, and has learned of the Father, comes to me.</span>"
    },
    {
      "verse": 46,
      "text": "<span style='color:red;'>Not that any man has seen the Father, except He who is from God, He has seen the Father.</span>"
    },
    {
      "verse": 47,
      "text": "<span style='color:red;'>Truly, truly, I say to you, He that believes on me has everlasting life.</span>"
    },
    {
      "verse": 48,
      "text": "<span style='color:red;'>I am that bread of life.</span>"
    },
    {
      "verse": 49,
      "text": "<span style='color:red;'>Your fathers ate manna in the wilderness, and are dead.</span>"
    },
    {
      "verse": 50,
      "text": "<span style='color:red;'>This is the bread which comes down from heaven, that a man may eat of it, and not die.</span>"
    },
    {
      "verse": 51,
      "text": "<span style='color:red;'>I am the vibrantly living bread which came down from heaven: if any man eat of this bread, he shall live for ever: and the bread that I will give is my flesh, which I will give for the life of the world.\"</span>"
    },
    {
      "verse": 52,
      "text": "The Jews therefore strove among themselves, saying, \"How can this man give us His flesh simply to ingest?\""
    },
    {
      "verse": 53,
      "text": "Then Jesus said to them, <span style='color:red;'>\"Truly, truly, I say to you, Except you eat the flesh of the Son of Man, and drink His blood, you have no life in you.</span>"
    },
    {
      "verse": 54,
      "text": "<span style='color:red;'>Whoever actively feeds upon my flesh, and drinks my blood, has eternal life; and I will raise him up at the last day.</span>"
    },
    {
      "verse": 55,
      "text": "<span style='color:red;'>For my flesh is true food indeed, and my blood is drink indeed.</span>"
    },
    {
      "verse": 56,
      "text": "<span style='color:red;'>He that continuously feeds upon my flesh, and drinks my blood, remains permanently connected in me, and I in him.</span>"
    },
    {
      "verse": 57,
      "text": "<span style='color:red;'>As the living Father has sent me, and I live by the Father: so he that eats me, even he shall live by me.</span>"
    },
    {
      "verse": 58,
      "text": "<span style='color:red;'>This is that bread which came down from heaven: not as your fathers ate manna, and are dead: he that eats of this bread shall live for ever.\"</span>"
    },
    {
      "verse": 59,
      "text": "These things He said in the synagogue, as He taught in Capernaum."
    },
    {
      "verse": 60,
      "text": "Many therefore of His disciples, when they had heard this, said, \"This is a stiff, harsh, and intolerable saying; who can hear it?\""
    },
    {
      "verse": 61,
      "text": "When Jesus intuitively perceived within Himself that His disciples murmured at it, He said to them, <span style='color:red;'>\"Does this act as a snare to trip you?</span>"
    },
    {
      "verse": 62,
      "text": "<span style='color:red;'>What if you shall see the Son of Man ascend up where He was before?</span>"
    },
    {
      "verse": 63,
      "text": "<span style='color:red;'>It is the spirit that acts as the life-giving force; the flesh profits nothing: the words that I speak to you, they are spirit, and they are life.</span>"
    },
    {
      "verse": 64,
      "text": "<span style='color:red;'>But there are some of you that believe not.\"</span> For Jesus knew from the beginning who they were that believed not, and who should betray Him."
    },
    {
      "verse": 65,
      "text": "And He said, <span style='color:red;'>\"Therefore I said to you, that no man can come to me, except it were given to him of my Father.\"</span>"
    },
    {
      "verse": 66,
      "text": "From that time many of His disciples retreated to the things they had left behind, and walked no more with Him."
    },
    {
      "verse": 67,
      "text": "Then said Jesus to the twelve, <span style='color:red;'>\"Will you also go away?\"</span>"
    },
    {
      "verse": 68,
      "text": "Then Simon Peter answered Him, \"Lord, to whom shall we go? You have the words of eternal life."
    },
    {
      "verse": 69,
      "text": "And we believe and have come to know experientially and permanently that you are the Christ, the Son of the living God.\""
    },
    {
      "verse": 70,
      "text": "Jesus answered them, <span style='color:red;'>\"Have not I chosen you twelve, and one of you is a devil?\"</span>"
    },
    {
      "verse": 71,
      "text": "He spoke of Judas Iscariot the son of Simon: for it was he that should betray Him, being one of the twelve."
    }
  ]
};

const ts = `import { ChapterData } from '../types.js';

export const JOHN_6: ChapterData = {
  book: "John",
  chapter: 6,
  verses: [
${raw.verses.map(v => `    {
      verseNumber: ${v.verse},
      kjvText: "",
      bsbText: "",
      contemporary: ${JSON.stringify(v.text)},
      nonNativeEnglish: ${JSON.stringify(v.text)},
      specialWords: []
    }`).join(',\n')}
  ]
};
`;

fs.writeFileSync('src/chapters/john6.ts', ts);
console.log('Done writing src/chapters/john6.ts');
