import { useState, useEffect, useRef, useCallback } from 'react';

export interface ParsedScripture {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
  rawQuery: string;
  confidence: number;
  timestamp: number;
}

export interface UseVoiceAIReturn {
  isListening: boolean;
  isAudioActive: boolean; // true when mic is actually receiving sound input
  isMicOpen: boolean;     // true when Chrome has opened the mic stream (onaudiostart fired)
  transcript: string;
  interimTranscript: string;
  confidence: number;
  lastParsedScripture: ParsedScripture | null;
  scriptureHistory: ParsedScripture[];
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  clearHistory: () => void;
}

// Comprehensive Bible Canon Map with exact maximum chapters for all 66 books
export const BIBLE_CANON_CHAPTERS: Record<string, number> = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150,
  'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66,
  'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14,
  'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3,
  'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28, 'Romans': 16,
  '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1,
  'Jude': 1, 'Revelation': 22
};

// Pure Number Words (Avoid prepositions like "to" or "for" to prevent corrupting phrases like "turn to John")
const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, '1st': 1, 'first': 1,
  'two': 2, '2nd': 2, 'second': 2,
  'three': 3, '3rd': 3, 'third': 3,
  'four': 4, '4th': 4, 'fourth': 4,
  'five': 5, '5th': 5, 'fifth': 5,
  'six': 6, '6th': 6, 'sixth': 6,
  'seven': 7, '7th': 7, 'seventh': 7,
  'eight': 8, '8th': 8, 'eighth': 8,
  'nine': 9, '9th': 9, 'ninth': 9,
  'ten': 10, '10th': 10, 'tenth': 10,
  'eleven': 11, '11th': 11, 'twelve': 12, '12th': 12,
  'thirteen': 13, '13th': 13, 'fourteen': 14, '14th': 14,
  'fifteen': 15, '15th': 15, 'sixteen': 16, '16th': 16,
  'seventeen': 17, '17th': 17, 'eighteen': 18, '18th': 18,
  'nineteen': 19, '19th': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fourty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
};

// Acoustic speech aliases for Bible books
const BOOK_ACOUSTIC_ALIASES: Record<string, string> = {
  // Gospels & Acts
  'look': 'luke', 'lock': 'luke', 'luck': 'luke', 'luc': 'luke', 'luka': 'luke',
  'janes': 'james', 'jane': 'james', 'jame': 'james', 'gem': 'james', 'gems': 'james', 'jaymes': 'james',
  'joan': 'john', 'jan': 'john', 'jon': 'john', 'gin': 'john', 'gian': 'john', 'jhon': 'john', 'johnny': 'john',
  'mat': 'matthew', 'matt': 'matthew', 'mathew': 'matthew', 'math': 'matthew', 'matty': 'matthew',
  'marc': 'mark', 'marx': 'mark', 'mock': 'mark', 'markus': 'mark',
  'ax': 'acts', 'axe': 'acts', 'act': 'acts', 'ex': 'acts', 'acts of the apostles': 'acts',

  // Epistles
  'roaming': 'romans', 'remains': 'romans', 'roman': 'romans', 'romen': 'romans',
  'korean': 'corinthians', 'corinthian': 'corinthians', 'corinth': 'corinthians',
  'galatian': 'galatians', 'galatia': 'galatians', 'gelatin': 'galatians',
  'ephesian': 'ephesians', 'ephesus': 'ephesians',
  'philip': 'philippians', 'philippian': 'philippians', 'philipians': 'philippians', 'phillip': 'philippians',
  'colossian': 'colossians', 'colosseum': 'colossians',
  'the salonian': 'thessalonians', 'thessalonian': 'thessalonians', 'thessalonica': 'thessalonians',
  'tim': 'timothy', 'timmy': 'timothy',
  'tight us': 'titus', 'tightest': 'titus',
  'phil lemon': 'philemon', 'filemon': 'philemon',
  'he brews': 'hebrews', 'hebrew': 'hebrews',
  'pete': 'peter',
  'juda': 'jude', 'judah': 'jude',
  'revelations': 'revelation', 'rev': 'revelation', 'apocalypse': 'revelation',

  // Old Testament
  'genes': 'genesis', 'gen': 'genesis', 'jenesis': 'genesis', 'genetic': 'genesis',
  'exodux': 'exodus', 'exodo': 'exodus', 'exitus': 'exodus',
  'levit': 'leviticus', 'levitic': 'leviticus',
  'number': 'numbers',
  'deut': 'deuteronomy', 'due to ronald me': 'deuteronomy', 'due to ronomy': 'deuteronomy', 'deuteron': 'deuteronomy',
  'josh': 'joshua',
  'judge': 'judges',
  'roof': 'ruth',
  'sam': 'samuel', 'sammy': 'samuel',
  'king': 'kings',
  'chronicle': 'chronicles',
  'esra': 'ezra',
  'nehemia': 'nehemiah',
  'ester': 'esther',
  'jobe': 'job',
  'psalm': 'psalms', 'salm': 'psalms', 'sums': 'psalms', 'palm': 'psalms', 'palms': 'psalms', 'salms': 'psalms',
  'proverb': 'proverbs',
  'ecclesiast': 'ecclesiastes',
  'song of songs': 'song of solomon', 'solomon': 'song of solomon',
  'isiah': 'isaiah', 'isaia': 'isaiah',
  'jeremi': 'jeremiah', 'jeremy': 'jeremiah',
  'lamentation': 'lamentations',
  'ezekial': 'ezekiel',
  'dan': 'daniel', 'danny': 'daniel',
  'hosia': 'hosea',
  'jona': 'jonah',
  'micha': 'micah',
  'have a cook': 'habakkuk',
  'zachary': 'zechariah', 'zachariah': 'zechariah',
  'malakai': 'malachi'
};

// Canonical list of recognized book search keys
const BIBLE_BOOKS = Object.keys(BIBLE_CANON_CHAPTERS).map(b => b.toLowerCase());

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Advanced Contextual Speech & Homophone Normalizer
 */
export function cleanSpokenTranscript(text: string): string {
  let cleaned = text.toLowerCase().trim();

  // 1. Strip conversational introductory commands
  cleaned = cleaned.replace(
    /\b(book\s+of|open\s+your\s+bibles?\s+to|open\s+up\s+to|open\s+to|open|turn\s+your\s+bibles?\s+to|turn\s+to|turn|let'?s\s+turn\s+to|let\s+us\s+turn\s+to|let'?s\s+read\s+from|let\s+us\s+read\s+from|let'?s\s+read|let\s+us\s+read|reading\s+from|read\s+from|read|look\s+at|go\s+to|show\s+me|display|bring\s+up|quote|scripture\s+is|verse\s+is|passage\s+is)\b/gi,
    ' '
  );

  // 2. Replace spoken structural keywords
  cleaned = cleaned
    .replace(/\b(charter|captor|capture|chap|chapt)\b/gi, 'chapter')
    .replace(/\b(burst|bus|voice|versed|verses|vs)\b/gi, 'verse');

  // 3. Normalize numbered book prefixes (e.g. "1st samuel", "first john", "second corinthians")
  cleaned = cleaned
    .replace(/\b(first|1st|1)\s+(samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john)\b/gi, '1 $2')
    .replace(/\b(second|2nd|2)\s+(samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john)\b/gi, '2 $2')
    .replace(/\b(third|3rd|3)\s+(john)\b/gi, '3 $2');

  // 4. Replace book acoustic aliases
  Object.entries(BOOK_ACOUSTIC_ALIASES).forEach(([alias, standard]) => {
    const regex = new RegExp(`\\b${alias}\\b`, 'gi');
    cleaned = cleaned.replace(regex, standard);
  });

  // 5. Resolve multi-word compound numbers (e.g., "twenty eight" -> "28", "one hundred nineteen" -> "119")
  const tens = ['twenty', 'thirty', 'forty', 'fourty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const units = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  tens.forEach(t => {
    units.forEach(u => {
      const regex = new RegExp(`\\b${t}\\s+${u}\\b`, 'gi');
      const valTen = NUMBER_WORDS[t] || 0;
      const valUnit = NUMBER_WORDS[u] || 0;
      if (valTen && valUnit) {
        cleaned = cleaned.replace(regex, `${valTen + valUnit}`);
      }
    });
  });

  // 6. Replace clean numerical words with digits
  Object.entries(NUMBER_WORDS).forEach(([word, val]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, `${val}`);
  });

  // 7. Dynamic Levenshtein Fuzzy Matcher (distance <= 2) for recognized books
  const words = cleaned.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length >= 4 && !BIBLE_BOOKS.includes(w)) {
      for (const canonical of BIBLE_BOOKS) {
        if (levenshteinDistance(w, canonical) <= 2) {
          cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, 'gi'), canonical);
          break;
        }
      }
    }
  }

  // 8. Normalize comma/dot separated figures on mobile (e.g. "3, 16" -> "3:16", "1. 2" -> "1:2")
  cleaned = cleaned.replace(/(\d+)\s*[,.]\s*(\d+)/g, '$1:$2');

  // 9. Universal Chapter:Verse Resolver
  // e.g. "john 3 16" -> "john 3:16", "genesis 1 1" -> "genesis 1:1"
  const bookRegexStr = BIBLE_BOOKS.map(b => b.replace(' ', '\\s+')).join('|');
  const bookTwoNumbersRegex = new RegExp(`\\b(${bookRegexStr})\\s+(\\d+)(?:[:\\s]+(\\d+))?\\b`, 'gi');
  cleaned = cleaned.replace(bookTwoNumbersRegex, (_m, book, chap, v) => v ? `${book} ${chap}:${v}` : `${book} ${chap}`);

  // 10. Format standard Chapter:Verse syntaxes
  cleaned = cleaned
    .replace(/\bchapter\s+(\d+)\s+verse\s+(\d+)/gi, '$1:$2')
    .replace(/\bchapter\s+(\d+)\s+(\d+)/gi, '$1:$2')
    .replace(/\bchapter\s+(\d+)/gi, '$1')
    .replace(/\bverse\s+(\d+)/gi, ':$1')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Extract and strictly validate scripture references against canonical Bible limits
 */
export function extractScriptureFromText(rawText: string, confidenceScore: number): ParsedScripture | null {
  if (!rawText || !rawText.trim()) return null;

  const cleaned = cleanSpokenTranscript(rawText);
  const bookRegexStr = BIBLE_BOOKS.map(b => b.replace(' ', '\\s+')).join('|');
  
  // Match [Book] [Chapter]:[Verse] or [Book] [Chapter]
  const scriptureRegex = new RegExp(
    `\\b(${bookRegexStr})\\s+(\\d+)(?:[:\\s]+(\\d+)(?:-(\\d+))?)?\\b`,
    'i'
  );
  
  const match = cleaned.match(scriptureRegex);
  if (!match) return null;

  const rawBook = match[1].toLowerCase().replace(/\s+/g, ' ');
  const matchedKey = Object.keys(BIBLE_CANON_CHAPTERS).find(b => b.toLowerCase() === rawBook);
  const formattedBook = matchedKey || rawBook
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/Psalm\b/i, 'Psalms');

  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1; // Default to verse 1 if whole chapter is spoken
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

  // Canonical Bible Validation
  const maxChapters = BIBLE_CANON_CHAPTERS[formattedBook];
  if (!maxChapters || isNaN(chapter) || chapter < 1 || chapter > maxChapters) {
    return null;
  }

  // Reject impossible verse numbers (>176)
  if (verse && (isNaN(verse) || verse < 1 || verse > 176)) {
    return null;
  }

  return {
    book: formattedBook,
    chapter,
    verse,
    endVerse,
    rawQuery: match[0],
    confidence: confidenceScore || 0.9,
    timestamp: Date.now()
  };
}

const SPEECH_ERRORS: Record<string, { msg: string; fatal: boolean }> = {
  'not-allowed':         { msg: 'Microphone permission denied. Please allow mic access in your browser settings.', fatal: true },
  'audio-capture':       { msg: 'Microphone is busy or unavailable.', fatal: true },
  'service-not-allowed': { msg: 'Speech recognition service is blocked.', fatal: true },
  'network':             { msg: 'Network error — speech recognition requires an internet connection.', fatal: false },
  'no-speech':           { msg: '', fatal: false },
  'aborted':             { msg: '', fatal: false },
  'bad-grammar':         { msg: 'Recognition grammar error.', fatal: false },
};

export function useVoiceAI(onScriptureDetected?: (scripture: ParsedScripture) => void): UseVoiceAIReturn {
  const [isListening, setIsListening] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastParsedScripture, setLastParsedScripture] = useState<ParsedScripture | null>(null);
  const [scriptureHistory, setScriptureHistory] = useState<ParsedScripture[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const onScriptureDetectedRef = useRef(onScriptureDetected);
  const lastDetectedRef = useRef<string>('');
  const recentSpokenBufferRef = useRef<string>('');
  const lastSpeechTimestampRef = useRef<number>(Date.now());
  const activeAecStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    onScriptureDetectedRef.current = onScriptureDetected;
  }, [onScriptureDetected]);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (shouldListenRef.current && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    }, 60000);
  }, []);

  const isMobile = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    !!(window as any).Capacitor
  );

  const buildRecognition = useCallback((): any => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return null;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      resetSilenceTimer();
    };

    rec.onaudiostart = () => {
      setIsMicOpen(true);
    };

    rec.onaudioend = () => {
      setIsMicOpen(false);
    };

    rec.onsoundstart = () => {
      setIsAudioActive(true);
    };

    rec.onsoundend = () => {
      setIsAudioActive(false);
    };

    rec.onresult = (event: any) => {
      resetSilenceTimer();
      setIsAudioActive(true);
      let interim = '';
      let final = '';
      let avgConf = 0.9;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript + ' ';
          avgConf = r[0].confidence || 0.9;
        } else {
          interim += r[0].transcript;
        }
      }

      if (interim) setInterimTranscript(interim);

      const currentChunk = (final.trim() || interim.trim());
      const now = Date.now();
      if (now - lastSpeechTimestampRef.current > 7000) {
        recentSpokenBufferRef.current = '';
      }
      lastSpeechTimestampRef.current = now;

      // Maintain combined buffer across bursts so spoken book letters/names are not dropped when figures follow
      const combinedBuffer = (recentSpokenBufferRef.current + ' ' + currentChunk).trim();
      const textToTest = combinedBuffer || currentChunk;

      if (textToTest) {
        const detected = extractScriptureFromText(textToTest, avgConf);
        if (detected) {
          const key = `${detected.book}-${detected.chapter}-${detected.verse || 1}`;
          if (lastDetectedRef.current !== key) {
            lastDetectedRef.current = key;
            setLastParsedScripture(detected);
            setScriptureHistory(prev => [
              detected,
              ...prev.filter(p => !(p.book === detected.book && p.chapter === detected.chapter && p.verse === detected.verse))
            ].slice(0, 20));

            onScriptureDetectedRef.current?.(detected);
            recentSpokenBufferRef.current = ''; // Reset buffer once successfully consumed
          }
        }
      }

      if (final) {
        const fullFinal = final.trim();
        recentSpokenBufferRef.current = (recentSpokenBufferRef.current + ' ' + fullFinal).slice(-300);
        setTranscript(prev => (prev ? `${prev} ${fullFinal}` : fullFinal).slice(-500));
        setInterimTranscript('');
        setConfidence(avgConf);
      }
    };

    rec.onerror = (event: any) => {
      setIsAudioActive(false);
      setIsMicOpen(false);

      // 'no-speech' is a normal silence interval on mobile; do not display an error or stop listening
      if (event.error === 'no-speech') {
        return;
      }

      // If audio capture is busy or permission not granted, stop loop cleanly rather than thrashing audio driver
      if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
      }

      const entry = SPEECH_ERRORS[event.error];
      if (!entry) {
        setError(`Speech recognition error: ${event.error}`);
        return;
      }
      if (entry.msg) {
        setError(entry.msg);
      }
    };

    rec.onend = () => {
      setIsAudioActive(false);
      setIsMicOpen(false);
      if (shouldListenRef.current) {
        // Space out reconnection gracefully so natural pauses in speech do not cause rapid chime loops on mobile
        setTimeout(() => {
          if (shouldListenRef.current) {
            try {
              const fresh = buildRecognition();
              if (fresh) {
                recognitionRef.current = fresh;
                fresh.start();
              }
            } catch (restartErr) {
              console.warn('[Voice AI] Reconnect notice:', restartErr);
            }
          }
        }, 1200);
      } else {
        setIsListening(false);
      }
    };

    return rec;
  }, [isSupported, resetSilenceTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    setError(null);
    shouldListenRef.current = true;
    lastDetectedRef.current = '';

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const rec = buildRecognition();
    if (rec) {
      recognitionRef.current = rec;
      try {
        // Native Android Bridge to silence Google Speech Recognizer earcon startup chime
        if (typeof window !== 'undefined' && (window as any).BridgeAudioControl?.muteStartBeep) {
          (window as any).BridgeAudioControl.muteStartBeep();
        }
        rec.start();
      } catch (err: any) {
        setError(err.message || 'Could not start speech recognition.');
        shouldListenRef.current = false;
        setIsListening(false);
      }
    }
  }, [buildRecognition, isSupported]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsAudioActive(false);
    setIsMicOpen(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    recentSpokenBufferRef.current = '';
  }, []);

  const clearHistory = useCallback(() => {
    setScriptureHistory([]);
    setLastParsedScripture(null);
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return {
    isListening,
    isAudioActive,
    isMicOpen,
    transcript,
    interimTranscript,
    confidence,
    lastParsedScripture,
    scriptureHistory,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
    clearHistory
  };
}
