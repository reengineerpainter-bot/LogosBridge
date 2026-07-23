import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BIBLE_BOOKS } from '../bibleMetadata';
import {
  X,
  Play,
  Square,
  Volume2,
  VolumeX,
  Monitor,
  Tv,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sliders,
  Type,
  Layout,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { ChapterData, Verse } from '../types';

interface ProjectionStudioProps {
  theme: 'light' | 'dark';
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
  chapterData: ChapterData | null;
  onNavigateToVerse?: (book: string, chapter: number, verse: number) => void;
  initialVerseNumber?: number;
}

type ThemePreset = 'sapphire-gold' | 'chroma-green' | 'cyber-slate' | 'amber-parchment' | 'glass-minimal';
type LayoutMode = 'lower-third' | 'projector-slide';

interface LiveProjectionState {
  book: string;
  chapter: number;
  verseText: string;
  verseNumber: number;
  themePreset: ThemePreset;
  layoutMode: LayoutMode;
  fontSize: number;
  alignment: 'left' | 'center' | 'right';
  isBold: boolean;
  isItalic: boolean;
  fontFamily: 'serif' | 'sans' | 'mono';
  translationLabel: string;
  isCustomLabelEnabled: boolean;
  liveTranslation?: string;
}

const buildBibleRegexAndMap = () => {
  const aliases: string[] = [];
  const aliasToBookName: Record<string, string> = {};

  for (const book of BIBLE_BOOKS) {
    const bookName = book.name.toLowerCase();
    
    // Add primary book name
    aliases.push(bookName.replace(/\s+/g, "\\s*"));
    aliasToBookName[bookName] = book.name;

    // Handle number prefixes (e.g. 1 Samuel -> 1 sam, 1st sam, first sam, etc)
    let numbersList: string[] = [];
    if (bookName.startsWith('1 ')) {
      const core = bookName.slice(2);
      numbersList = ['1', '1st', 'first', 'one'];
      numbersList.forEach(num => {
        const alias = `${num}\\s*${core}`;
        aliases.push(alias);
        aliasToBookName[alias.replace(/\\s\*/g, " ").replace(/\\s\+/g, " ")] = book.name;
      });
    } else if (bookName.startsWith('2 ')) {
      const core = bookName.slice(2);
      numbersList = ['2', '2nd', 'second', 'two'];
      numbersList.forEach(num => {
        const alias = `${num}\\s*${core}`;
        aliases.push(alias);
        aliasToBookName[alias.replace(/\\s\*/g, " ").replace(/\\s\+/g, " ")] = book.name;
      });
    } else if (bookName.startsWith('3 ')) {
      const core = bookName.slice(2);
      numbersList = ['3', '3rd', 'third', 'three'];
      numbersList.forEach(num => {
        const alias = `${num}\\s*${core}`;
        aliases.push(alias);
        aliasToBookName[alias.replace(/\\s\*/g, " ").replace(/\\s\+/g, " ")] = book.name;
      });
    }

    // Add standard abbreviations
    let abbrevs: string[] = [];
    if (bookName === 'genesis') abbrevs = ['gen'];
    else if (bookName === 'exodus') abbrevs = ['ex'];
    else if (bookName === 'leviticus') abbrevs = ['lev'];
    else if (bookName === 'numbers') abbrevs = ['num'];
    else if (bookName === 'deuteronomy') abbrevs = ['deut'];
    else if (bookName === 'joshua') abbrevs = ['josh'];
    else if (bookName === 'judges') abbrevs = ['judg'];
    else if (bookName === '1 samuel') abbrevs = ['1\\s*sam', '1st\\s*sam', 'first\\s*sam'];
    else if (bookName === '2 samuel') abbrevs = ['2\\s*sam', '2nd\\s*sam', 'second\\s*sam'];
    else if (bookName === '1 kings') abbrevs = ['1\\s*ki', '1st\\s*ki', 'first\\s*ki'];
    else if (bookName === '2 kings') abbrevs = ['2\\s*ki', '2nd\\s*ki', 'second\\s*ki'];
    else if (bookName === '1 chronicles') abbrevs = ['1\\s*chron', '1\\s*chr', '1st\\s*chron'];
    else if (bookName === '2 chronicles') abbrevs = ['2\\s*chron', '2\\s*chr', '2nd\\s*chron'];
    else if (bookName === 'nehemiah') abbrevs = ['neh'];
    else if (bookName === 'esther') abbrevs = ['esth'];
    else if (bookName === 'psalms') abbrevs = ['ps', 'psalm'];
    else if (bookName === 'proverbs') abbrevs = ['prov'];
    else if (bookName === 'ecclesiastes') abbrevs = ['eccl', 'ecc'];
    else if (bookName === 'song of solomon') abbrevs = ['song', 'canticles', 'song\\s*of\\s*songs'];
    else if (bookName === 'isaiah') abbrevs = ['isa'];
    else if (bookName === 'jeremiah') abbrevs = ['jer'];
    else if (bookName === 'lamentations') abbrevs = ['lam'];
    else if (bookName === 'ezekiel') abbrevs = ['ezek', 'eze'];
    else if (bookName === 'daniel') abbrevs = ['dan'];
    else if (bookName === 'hosea') abbrevs = ['hos'];
    else if (bookName === 'obadiah') abbrevs = ['obad', 'oba'];
    else if (bookName === 'habakkuk') abbrevs = ['hab'];
    else if (bookName === 'zechariah') abbrevs = ['zech', 'zec'];
    else if (bookName === 'malachi') abbrevs = ['mal'];
    else if (bookName === 'matthew') abbrevs = ['matt', 'mat'];
    else if (bookName === 'romans') abbrevs = ['rom'];
    else if (bookName === '1 corinthians') abbrevs = ['1\\s*cor', '1st\\s*cor', 'first\\s*cor'];
    else if (bookName === '2 corinthians') abbrevs = ['2\\s*cor', '2nd\\s*cor', 'second\\s*cor'];
    else if (bookName === 'galatians') abbrevs = ['gal'];
    else if (bookName === 'ephesians') abbrevs = ['eph'];
    else if (bookName === 'philippians') abbrevs = ['phil', 'phi'];
    else if (bookName === 'colossians') abbrevs = ['col'];
    else if (bookName === '1 thessalonians') abbrevs = ['1\\s*thess', '1\\s*thes', '1st\\s*thess'];
    else if (bookName === '2 thessalonians') abbrevs = ['2\\s*thess', '2\\s*thes', '2nd\\s*thess'];
    else if (bookName === '1 timothy') abbrevs = ['1\\s*tim', '1st\\s*tim', 'first\\s*tim'];
    else if (bookName === '2 timothy') abbrevs = ['2\\s*tim', '2nd\\s*tim', 'second\\s*tim'];
    else if (bookName === 'titus') abbrevs = ['tit'];
    else if (bookName === 'philemon') abbrevs = ['philem', 'phlm'];
    else if (bookName === 'hebrews') abbrevs = ['heb'];
    else if (bookName === '1 peter') abbrevs = ['1\\s*pet', '1st\\s*pet', 'first\\s*pet'];
    else if (bookName === '2 peter') abbrevs = ['2\\s*pet', '2nd\\s*pet', 'second\\s*pet'];
    else if (bookName === '1 john') abbrevs = ['1\\s*jn', '1\\s*joh', '1st\\s*john', 'first\\s*john'];
    else if (bookName === '2 john') abbrevs = ['2\\s*jn', '2\\s*joh', '2nd\\s*john', 'second\\s*john'];
    else if (bookName === '3 john') abbrevs = ['3\\s*jn', '3\\s*joh', '3rd\\s*john', 'third\\s*john'];
    else if (bookName === 'revelation') abbrevs = ['rev', 'revs'];

    abbrevs.forEach(abbrev => {
      aliases.push(abbrev);
      aliasToBookName[abbrev.replace(/\\s\*/g, " ").replace(/\\s\+/g, " ")] = book.name;
    });
  }

  aliases.sort((a, b) => b.length - a.length);
  const patternStr = `\\b(${aliases.join('|')})\\b\\s*(?:chapter\\s+)?(\\d+)\\s*(?::|verse\\s+|v\\s+)?\\s*(\\d+)?`;
  const regex = new RegExp(patternStr, 'i');

  return { regex, aliasToBookName };
};

const BIBLE_REGEX_DATA = buildBibleRegexAndMap();

const mapTranslationShorthandToFullName = (shortName: string | undefined): string => {
  if (!shortName) return 'KING JAMES VERSION';
  const name = shortName.toLowerCase();
  if (name === 'kjv') return 'KING JAMES VERSION';
  if (name === 'bsb') return 'BEREAN STANDARD BIBLE';
  if (name === 'plain') return 'PLAIN ENGLISH TRANSLATION';
  if (name === 'personalized') return 'PERSONALISED PRAYER VERSION';
  return shortName.toUpperCase();
};

export default function ProjectionStudio({
  theme,
  isOpen,
  onClose,
  currentBook,
  currentChapter,
  chapterData,
  onNavigateToVerse,
  initialVerseNumber = 0
}: ProjectionStudioProps) {
  // Active state for projected verse details
  const [activeVerseIndex, setActiveVerseIndex] = useState<number>(0);
  const [activeTranslation, setActiveTranslation] = useState<'kjv' | 'bsb' | 'plain' | 'personalized'>('kjv');
  const [customTranslationLabel, setCustomTranslationLabel] = useState<string>('Personal Study Bible');
  const [isCustomLabelEnabled, setIsCustomLabelEnabled] = useState<boolean>(true);

  // ==========================================
  // AI VOICE SCRIPTURE SYNC FEATURE IMPLEMENTATION
  // ==========================================
  const [isVoiceSyncActive, setIsVoiceSyncActive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [detectedRef, setDetectedRef] = useState<{ book: string; chapter: number; verse?: number } | null>(null);
  const [isAutoProjectEnabled, setIsAutoProjectEnabled] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [transcriptLog, setTranscriptLog] = useState<Array<{ text: string; type: 'info' | 'success' | 'error' }>>([]);
  const [activeQueueLabel, setActiveQueueLabel] = useState<string>('');
  const [nextQueueLabel, setNextQueueLabel] = useState<string>('');

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const lastTriggeredRef = useRef<string>('');
  const isVoiceSyncActiveRef = useRef<boolean>(false);
  const pendingProjectionRef = useRef<{ book: string; chapter: number; verse: number } | null>(null);
  const watchdogRef = useRef<any>(null);

  useEffect(() => {
    isVoiceSyncActiveRef.current = isVoiceSyncActive;
  }, [isVoiceSyncActive]);

  // Spoken numbers to digits translation helper
  const convertSpokenNumbersToDigits = (srcText: string): string => {
    const numMap: Record<string, number> = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
      twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
    };

    const words = srcText.toLowerCase().replace(/\band\b/g, "").split(/\s+/);
    const processed: string[] = [];
    let i = 0;
    
    while (i < words.length) {
      const word = words[i];
      if (numMap[word] !== undefined) {
        let value = numMap[word];
        if (i + 1 < words.length && words[i + 1] === 'hundred') {
          value = value * 100;
          i++;
        }
        if (i + 1 < words.length && numMap[words[i + 1]] !== undefined) {
          const nextVal = numMap[words[i + 1]];
          if (nextVal < 100) {
            value += nextVal;
            i++;
          }
        }
        processed.push(value.toString());
      } else if (word === 'hundred') {
        processed.push('100');
      } else {
        processed.push(word);
      }
      i++;
    }
    return processed.join(' ');
  };

  // Regex scripture reference match engine
  const parseScriptureReference = (text: string): { book: string; chapter: number; verse?: number } | null => {
    let processedText = text.toLowerCase();

    // 1. Homophones for preceding book numbers (1, 2, 3)
    const PREFIX_HOMOPHONES: Record<string, number> = {
      one: 1, won: 1, wan: 1, first: 1, '1st': 1,
      two: 2, to: 2, too: 2, second: 2, '2nd': 2,
      three: 3, tree: 3, free: 3, third: 3, '3rd': 3
    };

    const MULTI_BOOK_KEYWORDS = [
      'kings', 'king', 'chronicles', 'chronicle', 'chron', 'corinthians', 'corinthian', 'cor',
      'peter', 'pet', 'john', 'jn', 'joh', 'samuel', 'sam', 'timothy', 'tim', 'thessalonians', 'thess'
    ];

    const prefixKeys = Object.keys(PREFIX_HOMOPHONES).join('|');
    const multiBookKeys = MULTI_BOOK_KEYWORDS.join('|');
    const precedingRegex = new RegExp(`\\b(${prefixKeys})\\b\\s*(${multiBookKeys})\\b`, 'gi');

    processedText = processedText.replace(precedingRegex, (match, prefixWord, bookKeyword) => {
      const digit = PREFIX_HOMOPHONES[prefixWord.toLowerCase()];
      return `${digit} ${bookKeyword}`;
    });

    // 2. Homophones for chapter numbers immediately following a book
    const HOMOPHONE_MAP: Record<string, number> = {
      one: 1, won: 1, wan: 1,
      two: 2, to: 2, too: 2,
      three: 3, tree: 3, free: 3,
      four: 4, for: 4, fore: 4, fur: 4,
      five: 5, fife: 5,
      six: 6, sex: 6,
      seven: 7,
      eight: 8, ate: 8,
      nine: 9,
      ten: 10, tin: 10
    };

    // Match any book alias followed by a chapter homophone word
    const aliases = Object.keys(BIBLE_REGEX_DATA.aliasToBookName);
    const homophoneKeys = Object.keys(HOMOPHONE_MAP).join('|');
    const homophoneRegex = new RegExp(`\\b(${aliases.join('|')})\\b\\s*(?:chapter\\s+)?(${homophoneKeys})\\b`, 'gi');

    processedText = processedText.replace(homophoneRegex, (match, bookAlias, homophoneWord) => {
      const digit = HOMOPHONE_MAP[homophoneWord.toLowerCase()];
      return `${bookAlias} ${digit}`;
    });

    const convertedText = convertSpokenNumbersToDigits(processedText);
    const normalized = convertedText.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const match = normalized.match(BIBLE_REGEX_DATA.regex);
    if (match) {
      const matchedAlias = match[1].toLowerCase().replace(/\s+/g, " ");
      let bookName = BIBLE_REGEX_DATA.aliasToBookName[matchedAlias];
      if (!bookName) {
        const flatAlias = matchedAlias.replace(/\s+/g, "");
        const key = Object.keys(BIBLE_REGEX_DATA.aliasToBookName).find(k => k.replace(/\s+/g, "") === flatAlias);
        if (key) {
          bookName = BIBLE_REGEX_DATA.aliasToBookName[key];
        }
      }

      if (bookName) {
        let chapter = parseInt(match[2], 10);
        let verse = match[3] ? parseInt(match[3], 10) : undefined;

        // Smart split combined chapter-verse strings (e.g. "316" -> chapter 3, verse 16 for Proverbs)
        const bookMeta = BIBLE_BOOKS.find(b => b.name.toLowerCase() === bookName!.toLowerCase());
        if (bookMeta && chapter > bookMeta.chapters && verse === undefined) {
          const numStr = match[2];
          const candidates: Array<{ chap: number; v: number; verseLength: number }> = [];
          for (let i = 1; i < numStr.length; i++) {
            const chapPrefix = parseInt(numStr.substring(0, i), 10);
            const verseSuffix = parseInt(numStr.substring(i), 10);
            if (chapPrefix <= bookMeta.chapters && verseSuffix > 0) {
              candidates.push({ chap: chapPrefix, v: verseSuffix, verseLength: numStr.substring(i).length });
            }
          }
          if (candidates.length > 0) {
            candidates.sort((a, b) => b.verseLength - a.verseLength);
            chapter = candidates[0].chap;
            verse = candidates[0].v;
          }
        }

        return { book: bookName, chapter, verse };
      }
    }
    return null;
  };

  const startSpeechRecognition = () => {
    if (!SpeechRecognition) {
      setTranscriptLog(prev => [{ text: 'Error: Speech API not supported in this browser.', type: 'error' }, ...prev]);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setTranscriptLog(prev => [{ text: '[Speech analysis active. Speak scripture references...]', type: 'info' }, ...prev]);
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText.trim()) {
        setCurrentTranscript(activeText);
        const ref = parseScriptureReference(activeText);
        if (ref) {
          handleDetectedReference(ref);
        }
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        setTranscriptLog(prev => [{ text: 'Error: Microphone permission denied.', type: 'error' }, ...prev]);
        stopVoiceSync();
      } else if (e.error === 'network' || e.error === 'service-not-allowed') {
        setTranscriptLog(prev => [{ 
          text: `Error: Speech recognition service unavailable (${e.error === 'network' ? 'network error or unsupported in Electron' : 'service not allowed'}).`, 
          type: 'error' 
        }, ...prev]);
        stopVoiceSync();
      } else if (e.error === 'audio-capture') {
        setTranscriptLog(prev => [{ text: 'Error: Microphone capture failed. Check connection.', type: 'error' }, ...prev]);
        stopVoiceSync();
      }
    };

    rec.onend = () => {
      if (isVoiceSyncActiveRef.current) {
        setTimeout(() => {
          if (isVoiceSyncActiveRef.current) {
            startSpeechRecognition();
          }
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    rec.start();

    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
    }
    watchdogRef.current = setInterval(() => {
      if (isVoiceSyncActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.warn('Watchdog refresh failed:', e);
        }
      }
    }, 45000);
  };

  const handleDetectedReference = (ref: { book: string; chapter: number; verse?: number }) => {
    const refKey = `${ref.book}-${ref.chapter}-${ref.verse || 1}`;
    if (lastTriggeredRef.current === refKey) return;
    lastTriggeredRef.current = refKey;

    const targetVerse = ref.verse || 1;
    const refString = `${ref.book} ${ref.chapter}:${targetVerse}`;

    if (isAutoProjectEnabled) {
      setActiveQueueLabel(refString);
      setNextQueueLabel('');
      pendingProjectionRef.current = { book: ref.book, chapter: ref.chapter, verse: targetVerse };
      setDetectedRef(null);
    } else {
      setDetectedRef(ref);
      setNextQueueLabel(refString);
      playLocalBeep(660, 'sine', 0.12);
    }

    setTranscriptLog(prev => [
      { text: `Detected: ${refString}`, type: 'success' },
      ...prev
    ]);

    // Always immediately navigate the studio interface to this book, chapter, and verse
    // so that the operator's queue grid loads the correct verses for manual trigger.
    if (onNavigateToVerse) {
      onNavigateToVerse(ref.book, ref.chapter, targetVerse);
    }
  };

  const applyReference = (ref: { book: string; chapter: number; verse?: number }) => {
    const targetVerse = ref.verse || 1;
    const refString = `${ref.book} ${ref.chapter}:${targetVerse}`;
    
    setActiveQueueLabel(refString);
    setNextQueueLabel('');

    pendingProjectionRef.current = { book: ref.book, chapter: ref.chapter, verse: targetVerse };
    if (onNavigateToVerse) {
      onNavigateToVerse(ref.book, ref.chapter, targetVerse);
    }
    setDetectedRef(null);
  };

  const startVoiceSync = async () => {
    try {
      setIsVoiceSyncActive(true);
      isVoiceSyncActiveRef.current = true;
      setTranscriptLog([{ text: 'Initializing microphone input...', type: 'info' }]);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volumePercent = Math.min(100, Math.round((average / 65) * 100));
        setMicLevel(volumePercent);
        rafRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      startSpeechRecognition();

    } catch (err: any) {
      console.warn('Microphone activation failed:', err);
      setTranscriptLog([{ text: `Error: ${err.message || 'Microphone activation failed'}`, type: 'error' }]);
      setIsVoiceSyncActive(false);
      isVoiceSyncActiveRef.current = false;
      setMicLevel(0);
    }
  };

  const stopVoiceSync = () => {
    setIsVoiceSyncActive(false);
    isVoiceSyncActiveRef.current = false;
    setIsListening(false);
    setCurrentTranscript('');
    setDetectedRef(null);
    setMicLevel(0);
    lastTriggeredRef.current = '';

    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) {}
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (err) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };

  const toggleVoiceSync = () => {
    if (isVoiceSyncActive) {
      stopVoiceSync();
      playLocalBeep(440, 'sine', 0.1);
    } else {
      startVoiceSync();
      playLocalBeep(880, 'sine', 0.1);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e){}
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Live broadcast / Operator lock states
  const [liveState, setLiveState] = useState<LiveProjectionState | null>(null);
  const [isLiveAutoSync, setIsLiveAutoSync] = useState<boolean>(true);
  const [activeMonitorTab, setActiveMonitorTab] = useState<'preview' | 'live'>('preview');

  // Styling and configuration preferences
  const [themePreset, setThemePreset] = useState<ThemePreset>('sapphire-gold');
  const [previousThemePreset, setPreviousThemePreset] = useState<ThemePreset>('sapphire-gold');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('lower-third');

  const handleSelectPreset = (preset: ThemePreset) => {
    if (preset === 'glass-minimal') {
      if (themePreset === 'glass-minimal') {
        // Toggle OFF to the previous non-glass theme preset
        setThemePreset(previousThemePreset);
      } else {
        // Toggle ON: save current preset as previous first
        setPreviousThemePreset(themePreset);
        setThemePreset('glass-minimal');
      }
    } else {
      setThemePreset(preset);
      setPreviousThemePreset(preset);
    }
  };
  const [fontSize, setFontSize] = useState<number>(32); // in pixels
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [isBold, setIsBold] = useState<boolean>(true);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('sans');

  // Simulated live preview options
  const [showStageBackground, setShowStageBackground] = useState<boolean>(true);
  const [isPresentationOnly, setIsPresentationOnly] = useState<boolean>(false);

  // Audio vocal controls
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Copy feedback
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Sync active verse index when chapter data or selection starts
  useEffect(() => {
    if (initialVerseNumber > 0 && chapterData?.verses && initialVerseNumber <= chapterData.verses.length) {
      setActiveVerseIndex(initialVerseNumber - 1);
    } else {
      setActiveVerseIndex(0);
    }
  }, [currentBook, currentChapter, chapterData, initialVerseNumber]);

  const verses = chapterData?.verses || [];
  const currentVerse = verses[activeVerseIndex];

  // Retrieve current verse text based on selected translation
  const getVerseText = (verse: Verse | undefined): string => {
    if (!verse) return '';
    switch (activeTranslation) {
      case 'kjv':
        return verse.kjvText || '';
      case 'bsb':
        return verse.bsbText || '';
      case 'plain':
        return verse.contemporary || '';
      case 'personalized':
        return verse.nonNativeEnglish || '';
      default:
        return verse.kjvText || '';
    }
  };

  const activeVerseText = getVerseText(currentVerse);

  const getDetectedVerseText = (): string => {
    if (!detectedRef || !chapterData || chapterData.book !== detectedRef.book || chapterData.chapter !== detectedRef.chapter) {
      return '';
    }
    const verseIndex = (detectedRef.verse || 1) - 1;
    const v = chapterData.verses && chapterData.verses[verseIndex];
    if (!v) return '';
    return getVerseText(v);
  };

  // playLocalBeep audio feedback helper
  const playLocalBeep = (freq = 600, type: OscillatorType = 'sine', duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio block issues
    }
  };

  // Synchronize Live State when Auto-Sync is ON or Force Project is requested
  useEffect(() => {
    let shouldProject = isLiveAutoSync;

    if (pendingProjectionRef.current) {
      const pending = pendingProjectionRef.current;
      if (
        chapterData?.book === pending.book &&
        chapterData?.chapter === pending.chapter &&
        (currentVerse?.verseNumber || 1) === pending.verse
      ) {
        shouldProject = true;
        pendingProjectionRef.current = null; // Clear it since we are projecting it now
      }
    }

    if (shouldProject) {
      setLiveState({
        book: currentBook,
        chapter: currentChapter,
        verseText: activeVerseText,
        verseNumber: currentVerse?.verseNumber || 1,
        themePreset,
        layoutMode,
        fontSize,
        alignment,
        isBold,
        isItalic,
        fontFamily,
        translationLabel: customTranslationLabel,
        isCustomLabelEnabled,
        liveTranslation: activeTranslation,
      });
    }
  }, [
    isLiveAutoSync,
    chapterData,
    currentBook,
    currentChapter,
    activeVerseText,
    currentVerse,
    themePreset,
    layoutMode,
    fontSize,
    alignment,
    isBold,
    isItalic,
    fontFamily,
    customTranslationLabel,
    isCustomLabelEnabled,
    activeTranslation
  ]);

  // Create broadcast channel for real-time tab messaging
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('live_projection_channel');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data === 'REQUEST_LATEST_STATE' && liveState) {
          channel.postMessage({ type: 'STATE_UPDATE', state: liveState });
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [liveState]);

  // Sync state to localStorage whenever liveState changes (enabling standalone projector window)
  useEffect(() => {
    if (liveState) {
      try {
        localStorage.setItem('live_projection_state', JSON.stringify(liveState));
        // Dispatch custom event for same-window context changes
        window.dispatchEvent(new Event('storage_local'));

        // Broadcast over channel to newly opened windows
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'STATE_UPDATE', state: liveState });
        }

        // Direct-push to tracked popup windows (bypasses iframe sandboxing/partitioning)
        const popups = (window as any).__OPENED_PROJECTOR_WINDOWS__;
        if (Array.isArray(popups)) {
          popups.forEach((pop) => {
            try {
              if (pop && !pop.closed) {
                pop.postMessage({ type: 'STATE_UPDATE', state: liveState }, '*');
              }
            } catch (err) {
              // Ignore standard window handle errors
            }
          });
        }
      } catch (e) {
        console.warn('Failed to save to live_projection_state in localStorage:', e);
      }
    }
  }, [liveState]);

  // Register window postMessage listener to handle requests from child tabs
  useEffect(() => {
    const handleMessageFromChild = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REQUEST_LATEST_STATE') {
        const sourceWin = event.source as Window | null;
        if (sourceWin) {
          // Register this child window in our tracking array for future updates
          if (!(window as any).__OPENED_PROJECTOR_WINDOWS__) {
            (window as any).__OPENED_PROJECTOR_WINDOWS__ = [];
          }
          const list = (window as any).__OPENED_PROJECTOR_WINDOWS__;
          if (!list.includes(sourceWin)) {
            list.push(sourceWin);
          }
          // Respond with the latest state
          if (liveState) {
            try {
              sourceWin.postMessage({ type: 'STATE_UPDATE', state: liveState }, '*');
            } catch (err) {
              console.warn('Error replying to child message:', err);
            }
          }
        }
      }
    };
    window.addEventListener('message', handleMessageFromChild);
    return () => {
      window.removeEventListener('message', handleMessageFromChild);
    };
  }, [liveState]);

  // Action: Trigger Send Live
  const handleSendLive = () => {
    setLiveState({
      book: currentBook,
      chapter: currentChapter,
      verseText: activeVerseText,
      verseNumber: currentVerse?.verseNumber || 1,
      themePreset,
      layoutMode,
      fontSize,
      alignment,
      isBold,
      isItalic,
      fontFamily,
      translationLabel: customTranslationLabel,
      isCustomLabelEnabled,
      liveTranslation: activeTranslation,
    });
    playLocalBeep(880, 'sine', 0.12);
    // Auto switch to show the published "live" tab momentarily
    setActiveMonitorTab('live');
  };

  // Active variables for rendering the monitor view depending on the selected tab (Preview vs Live)
  const isViewingLiveMonitor = activeMonitorTab === 'live' && !isLiveAutoSync;
  
  const displayThemePreset = isViewingLiveMonitor && liveState ? liveState.themePreset : themePreset;
  const displayLayoutMode = isViewingLiveMonitor && liveState ? liveState.layoutMode : layoutMode;
  const displayFontSize = isViewingLiveMonitor && liveState ? liveState.fontSize : fontSize;
  const displayAlignment = isViewingLiveMonitor && liveState ? liveState.alignment : alignment;
  const displayIsBold = isViewingLiveMonitor && liveState ? liveState.isBold : isBold;
  const displayIsItalic = isViewingLiveMonitor && liveState ? liveState.isItalic : isItalic;
  const displayFontFamily = isViewingLiveMonitor && liveState ? liveState.fontFamily : fontFamily;
  const displayTranslationLabel = isViewingLiveMonitor && liveState ? liveState.translationLabel : customTranslationLabel;
  const displayIsCustomLabelEnabled = isViewingLiveMonitor && liveState ? liveState.isCustomLabelEnabled : isCustomLabelEnabled;
  const displayBook = isViewingLiveMonitor && liveState ? liveState.book : currentBook;
  const displayChapter = isViewingLiveMonitor && liveState ? liveState.chapter : currentChapter;
  const displayVerseNumber = isViewingLiveMonitor && liveState ? liveState.verseNumber : (currentVerse?.verseNumber || 1);
  const displayVerseText = isViewingLiveMonitor && liveState ? liveState.verseText : activeVerseText;
  const displayTranslationText = isViewingLiveMonitor && liveState ? mapTranslationShorthandToFullName(liveState.liveTranslation) : mapTranslationShorthandToFullName(activeTranslation);

  // Speech speaking function
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    if (!activeVerseText) return;

    // Prep speak text
    const textToSpeak = `${currentBook} chapter ${currentChapter} verse ${currentVerse?.verseNumber || 1}. ${activeVerseText}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speechRate;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Copy active text to clipboard
  const handleCopyText = () => {
    if (!activeVerseText) return;
    const refText = `${currentBook} ${currentChapter}:${currentVerse?.verseNumber || 1}`;
    const fullText = `"${activeVerseText}" (${isCustomLabelEnabled ? customTranslationLabel : mapTranslationShorthandToFullName(activeTranslation)} - ${refText})`;
    
    navigator.clipboard.writeText(fullText).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // Get active style classes based on selection
  const getThemeStyles = () => {
    const isLowerThird = displayLayoutMode === 'lower-third';
    switch (displayThemePreset) {
      case 'sapphire-gold':
        return {
          container: `bg-gradient-to-r from-blue-950 via-[#0a1e3f] to-[#122854] text-white ${
            isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-y-4 rounded-none'
          } border-amber-400 shadow-amber-400/25`,
          label: 'text-amber-400 font-bold',
          ref: 'text-amber-300 font-extrabold',
          accentBorder: 'border-t-2 border-b border-amber-300/40'
        };
      case 'chroma-green':
        return {
          container: `bg-[#00ff00] text-black ${
            isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-4'
          } border-black font-semibold`,
          label: 'text-black font-extrabold tracking-tight',
          ref: 'text-black font-black',
          accentBorder: 'border-y border-black/30'
        };
      case 'cyber-slate':
        return {
          container: `bg-[#090f1e]/95 text-slate-100 ${
            isLowerThird ? 'border-t-2 border-b-0 border-x-0 rounded-none' : 'border-y-2'
          } border-cyan-500 shadow-cyan-500/10 backdrop-blur-md`,
          label: 'text-cyan-400 font-mono tracking-wider',
          ref: 'text-cyan-300 font-bold',
          accentBorder: 'border-t border-cyan-500/20'
        };
      case 'amber-parchment':
        return {
          container: `bg-[#fffcf7] text-slate-900 ${
            isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-y-4'
          } border-amber-700 shadow-amber-900/15`,
          label: 'text-amber-800 font-serif font-black italic',
          ref: 'text-amber-900 font-bold',
          accentBorder: 'border-y border-amber-700/20'
        };
      case 'glass-minimal':
        return {
          container: `bg-slate-950/75 text-white backdrop-blur-lg ${
            isLowerThird ? 'border-t border-b-0 border-x-0 rounded-none' : 'border border-slate-700/50 rounded-2xl'
          } shadow-2xl`,
          label: 'text-slate-300 tracking-wider font-medium',
          ref: 'text-white font-black',
          accentBorder: 'border-t border-slate-700/50'
        };
    }
  };

  const themeStyle = getThemeStyles();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md bg-slate-950/85 overflow-hidden animate-fadeIn">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className={`w-full max-w-6xl h-[92vh] md:h-[85vh] rounded-[28px] border flex flex-col overflow-hidden shadow-2xl relative transition-all duration-300 ${
            theme === 'light' ? 'bg-[#f7f2fa] border-slate-200/60 shadow-slate-200/50' : 'bg-[#1c1b1f] border-zinc-800/80 shadow-black/40'
          }`}
        >
          {/* TOP STATUS BAR */}
          <div className={`p-4 border-b flex items-center justify-between select-none relative z-10 shrink-0 ${
            theme === 'light' ? 'bg-[#f3edf7] border-slate-200/60' : 'bg-[#25232a] border-zinc-800/80'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl transition-colors ${
                themePreset === 'sapphire-gold' ? 'bg-amber-400/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-400'
              }`}>
                <Tv className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className={`text-base font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'} leading-none`}>
                  SCREEN PROJECTION STUDIO
                </h2>
                <p className="text-[9px] font-mono tracking-widest text-amber-500 uppercase mt-1.5 font-bold">
                  CHURCH LOWER-THIRD & PROJECTION CONTROLLER
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPresentationOnly(!isPresentationOnly)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-bold transition-all border cursor-pointer ${
                  isPresentationOnly
                    ? 'bg-amber-500 border-amber-600 text-slate-950'
                    : (theme === 'light' ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-350')
                }`}
                title={isPresentationOnly ? 'Show Studio Controls' : 'Show Screen Presentation Only'}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isPresentationOnly ? 'Interactive Studio' : 'Full Screen Slide'}</span>
              </button>

              <button
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  onClose();
                }}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Exit Screen Projection Studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* STUDIO CONTENT PANELS */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* LEFT / CONTROL BOARD PANEL */}
            <AnimatePresence>
              {!isPresentationOnly && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={`w-full md:w-[350px] lg:w-[380px] h-full max-h-full min-h-0 p-4 overflow-y-auto shrink-0 border-r flex flex-col space-y-4 relative select-none transition-all duration-300 ${
                    theme === 'light' ? 'bg-[#f7f2fa] border-slate-200/60' : 'bg-[#141218] border-zinc-900/60'
                  }`}
                >
                  {/* CARD 3: VOICE & AUDIO ENGINE */}
                  <div className={`p-4 rounded-2xl border space-y-4 select-none ${
                    theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                  }`}>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800/20">
                      <Volume2 className="w-4 h-4 text-amber-500" />
                      <h3 className={`text-xs font-sans font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-zinc-200'}`}>
                        Voice & Audio Engine
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <span className={`text-[10px] font-sans font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'} flex items-center gap-1`}>
                        🔊 Vocal Speech Engine
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSpeak}
                          className={`px-3 py-2 rounded-full text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer flex-1 transition-all ${
                            isSpeaking
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isSpeaking ? 'Stop Speak' : 'Vocal Read Out'}</span>
                        </button>

                        <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-850'
                        }`}>
                          <span className="text-[9px] font-mono text-zinc-400 lowercase leading-none">Rate:</span>
                          <span className="text-[10px] font-mono text-amber-500 font-extrabold leading-none">{speechRate.toFixed(1)}x</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            className="w-12 h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI VOICE SCRIPTURE SYNC */}
                    <div className="space-y-3 pt-1">
                      <span className={`text-[10px] font-sans font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'} flex items-center justify-between`}>
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            {isListening ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500"></span>
                            )}
                          </span>
                          AI Voice Scripture Sync
                        </span>
                        {isListening && (
                          <span className="text-[9px] text-red-455 animate-pulse font-mono tracking-wider font-extrabold uppercase">
                            Listening
                          </span>
                        )}
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={toggleVoiceSync}
                          className={`flex-1 px-4 py-2.5 rounded-full text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                            isVoiceSyncActive
                              ? 'bg-red-650 hover:bg-red-750 border-red-500 text-white shadow-md'
                              : (theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800/80 text-cyan-400')
                          }`}
                        >
                          <span>{isVoiceSyncActive ? 'Deactivate Mic' : 'Activate Mic Sync'}</span>
                        </button>
                      </div>

                      {/* Inline Error Alert when sync is inactive but an error occurred */}
                      {!isVoiceSyncActive && transcriptLog.find(log => log.type === 'error') && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] flex flex-col gap-2 animate-fadeIn">
                          <div className="flex items-start gap-1.5 font-mono">
                            <span className="font-bold text-red-500 shrink-0">⚠️</span>
                            <span>{transcriptLog.find(log => log.type === 'error')?.text}</span>
                          </div>
                          {window.navigator.userAgent.indexOf('Electron') >= 0 && (
                            <div className="mt-1 pt-1.5 border-t border-red-500/20 flex flex-col gap-1.5">
                              <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                                💡 Google Speech APIs are restricted inside native Electron builds. To use AI Voice Sync, simply open this app in Google Chrome:
                              </p>
                              <div className="flex items-center gap-1">
                                <span className={`flex-1 px-2 py-1 rounded font-mono text-[9.5px] select-all truncate ${
                                  theme === 'light' ? 'bg-slate-200/60 text-slate-800' : 'bg-zinc-900 text-zinc-300'
                                }`}>
                                  http://localhost:3000
                                </span>
                                <button
                                  onClick={() => {
                                    if ((window as any).electronAPI?.writeClipboard) {
                                      (window as any).electronAPI.writeClipboard('http://localhost:3000');
                                    } else {
                                      navigator.clipboard.writeText('http://localhost:3000');
                                    }
                                    alert('Copied to clipboard! Paste this link into Google Chrome browser.');
                                  }}
                                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black text-[9.5px] font-sans font-bold transition-all cursor-pointer"
                                >
                                  Copy Link
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isVoiceSyncActive && (
                        <div className={`space-y-3 p-3 rounded-xl border ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-955 border-zinc-900/60'
                        }`}>
                          {/* Microphone level bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-sans text-zinc-400 font-bold uppercase">
                              <span>Mic Signal Level:</span>
                              <span className={micLevel > 50 ? 'text-red-400' : micLevel > 15 ? 'text-emerald-450' : 'text-zinc-500'}>
                                {micLevel}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-75"
                                style={{ width: `${micLevel}%` }}
                              />
                            </div>
                          </div>

                          {/* Auto-Project Settings checkbox */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="auto-project-checkbox"
                              checked={isAutoProjectEnabled}
                              onChange={(e) => setIsAutoProjectEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                            />
                            <label
                              htmlFor="auto-project-checkbox"
                              className={`text-[10px] font-sans cursor-pointer uppercase font-bold select-none ${
                                theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-450 hover:text-white'
                              }`}
                            >
                              Auto-Project Instantly
                            </label>
                          </div>

                          {/* Queue Status Panel */}
                          <div className="grid grid-cols-2 gap-1.5 text-center select-none pt-0.5 font-sans">
                            <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                              activeQueueLabel 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : (theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-850')
                            }`}>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Active Queue</span>
                              <span className={`text-[10px] font-bold uppercase truncate max-w-full ${
                                activeQueueLabel ? 'text-emerald-450 font-extrabold' : 'text-zinc-500'
                              }`}>
                                {activeQueueLabel || 'None'}
                              </span>
                            </div>
                            <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                              nextQueueLabel 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : (theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-850')
                            }`}>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Next Queue</span>
                              <span className={`text-[10px] font-bold uppercase truncate max-w-full ${
                                nextQueueLabel ? 'text-amber-500 font-extrabold' : 'text-zinc-500'
                              }`}>
                                {nextQueueLabel || 'None'}
                              </span>
                            </div>
                          </div>

                          {/* Live Transcript Stream */}
                          <div className="space-y-1">
                            <div className="text-[9px] font-sans font-bold text-zinc-400 uppercase">Live Speech Transcript:</div>
                            <div className={`h-11 rounded-xl p-2 text-[10px] font-sans overflow-y-auto leading-tight italic break-words border ${
                              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-900/90 border-zinc-850 text-zinc-300'
                            }`}>
                              {currentTranscript || <span className="text-zinc-500 font-medium">[Say a verse like 'John 3:16'...]</span>}
                            </div>
                          </div>

                          {/* Trigger History Logs */}
                          {transcriptLog.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-sans font-bold text-zinc-400 uppercase">Detection History:</div>
                              <div className={`h-16 rounded-xl p-1.5 text-[9.5px] font-mono overflow-y-auto space-y-1 border ${
                                theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-650' : 'bg-zinc-900/90 border-zinc-850 text-zinc-400'
                              }`}>
                                {transcriptLog.map((log, idx) => (
                                  <div
                                    key={idx}
                                    className={`truncate ${
                                      log.type === 'success'
                                        ? 'text-emerald-450 font-bold border-l-2 border-emerald-500 pl-1'
                                        : log.type === 'error'
                                        ? 'text-red-400 border-l-2 border-red-500 pl-1'
                                        : 'text-zinc-500 pl-1'
                                    }`}
                                  >
                                    {log.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 1: LAYOUT CONFIGURATOR */}
                  <div className={`p-4 rounded-2xl border space-y-4 select-none ${
                    theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                  }`}>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800/20">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <h3 className={`text-xs font-sans font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-zinc-200'}`}>
                        Layout Configurator
                      </h3>
                    </div>

                    {/* SELECT DISPLAY STYLE */}
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-sans uppercase tracking-wider font-extrabold flex items-center justify-between col-span-2 ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
                        <span>Theme/Wallpaper Preset</span>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleSelectPreset('sapphire-gold')}
                          className={`p-2 rounded-xl text-left text-[11px] font-sans border transition-all flex flex-col justify-between h-[52px] cursor-pointer ${
                            themePreset === 'sapphire-gold'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          <span className="font-bold">Sapphire Gold</span>
                          <span className="text-[8px] opacity-75">Royal Blue & Gold</span>
                        </button>
                        <button
                          onClick={() => handleSelectPreset('chroma-green')}
                          className={`p-2 rounded-xl text-left text-[11px] font-sans border transition-all flex flex-col justify-between h-[52px] cursor-pointer ${
                            themePreset === 'chroma-green'
                              ? 'border-green-500 bg-green-500/10 text-green-455 font-extrabold'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          <span className="font-bold">Chroma OBS</span>
                          <span className="text-[8px] opacity-75">OBS Green screen</span>
                        </button>
                        <button
                          onClick={() => handleSelectPreset('cyber-slate')}
                          className={`p-2 rounded-xl text-left text-[11px] font-sans border transition-all flex flex-col justify-between h-[52px] cursor-pointer ${
                            themePreset === 'cyber-slate'
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          <span className="font-bold">Slate & Cyan</span>
                          <span className="text-[8px] opacity-75">Futuristic Minimalist</span>
                        </button>
                        <button
                          onClick={() => handleSelectPreset('amber-parchment')}
                          className={`p-2 rounded-xl text-left text-[11px] font-sans border transition-all flex flex-col justify-between h-[52px] cursor-pointer ${
                            themePreset === 'amber-parchment'
                              ? 'border-amber-700 bg-amber-700/10 text-amber-600 font-bold'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          <span className="font-bold">Aura Parchment</span>
                          <span className="text-[8px] opacity-75">Warm Cathedral Light</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleSelectPreset('glass-minimal')}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          if (themePreset === 'glass-minimal') {
                            setThemePreset(previousThemePreset);
                          }
                        }}
                        className={`w-full mt-1.5 p-2 rounded-xl text-center text-xs font-sans font-semibold border transition-all select-none cursor-pointer ${
                          themePreset === 'glass-minimal'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                            : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                        }`}
                        title="Click to toggle, double-click to turn off explicitly"
                      >
                        Transparent Broadcast Glass
                      </button>
                    </div>

                    {/* SELECT DISPLAY TARGET ASPECT */}
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-sans uppercase tracking-wider font-extrabold flex items-center justify-between ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
                        <span>Display Type</span>
                        <Layout className="w-3.5 h-3.5 text-amber-500" />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setLayoutMode('lower-third')}
                          className={`p-2 rounded-full text-center text-xs font-sans border transition-all font-bold cursor-pointer ${
                            layoutMode === 'lower-third'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          Lower Third Overlay
                        </button>
                        <button
                          onClick={() => setLayoutMode('projector-slide')}
                          className={`p-2 rounded-full text-center text-xs font-sans border transition-all font-bold cursor-pointer ${
                            layoutMode === 'projector-slide'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                              : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850')
                          }`}
                        >
                          Centered Slide
                        </button>
                      </div>
                    </div>

                    {/* OVERRIDE TRANSLATION LABEL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-[10px] font-sans uppercase tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Translation Label Display
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="custom-label-check"
                            checked={isCustomLabelEnabled}
                            onChange={(e) => setIsCustomLabelEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                          />
                          <label htmlFor="custom-label-check" className={`text-[9.5px] font-sans font-bold uppercase cursor-pointer ${theme === 'light' ? 'text-slate-600' : 'text-zinc-300'} hover:text-white`}>
                            Custom Label
                          </label>
                        </div>
                      </div>
                      
                      {isCustomLabelEnabled ? (
                        <input
                          type="text"
                          value={customTranslationLabel}
                          onChange={(e) => setCustomTranslationLabel(e.target.value)}
                          placeholder="e.g. Authorized King James Version"
                          className={`w-full border rounded-xl p-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                            theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                          }`}
                        />
                      ) : (
                        <div className="text-xs text-slate-400 font-sans italic">
                          Will display default name: {mapTranslationShorthandToFullName(activeTranslation)}
                        </div>
                      )}
                    </div>

                    {/* SELECT ACTIVE TRANSLATION SOURCE */}
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-sans uppercase tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Active Verse Text Source
                      </label>
                      <select
                        value={activeTranslation}
                        onChange={(e) => setActiveTranslation(e.target.value as any)}
                        className={`w-full border rounded-xl p-2.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <option value="kjv">Authorized King James Version (KJV)</option>
                        <option value="bsb">Berean Standard Bible (BSB)</option>
                        <option value="plain">Plain English Translation (Contemporary)</option>
                        <option value="personalized">Personalised Prayer Version</option>
                      </select>
                    </div>
                  </div>

                  {/* CARD 2: TYPOGRAPHY SETTINGS */}
                  <div className={`p-4 rounded-2xl border space-y-4 select-none ${
                    theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                  }`}>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800/20">
                      <Type className="w-4 h-4 text-amber-500" />
                      <h3 className={`text-xs font-sans font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-zinc-200'}`}>
                        Typography Settings
                      </h3>
                    </div>
                    
                    {/* Family */}
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className={`${theme === 'light' ? 'text-slate-600' : 'text-zinc-350'} font-semibold`}>Font Family</span>
                      <div className="flex gap-1">
                        {(['serif', 'sans', 'mono'] as const).map((fam) => (
                          <button
                            key={fam}
                            onClick={() => setFontFamily(fam)}
                            className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase transition-all cursor-pointer ${
                              fontFamily === fam
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : (theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-800')
                            }`}
                          >
                            {fam}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alignments */}
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className={`${theme === 'light' ? 'text-slate-600' : 'text-zinc-350'} font-semibold`}>Alignment</span>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((alg) => (
                          <button
                            key={alg}
                            onClick={() => setAlignment(alg)}
                            className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase transition-all cursor-pointer ${
                              alignment === alg
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : (theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-800')
                            }`}
                          >
                            {alg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className={`${theme === 'light' ? 'text-slate-600' : 'text-zinc-350'} font-semibold`}>Screen Text Font Size</span>
                        <span className="font-mono font-extrabold text-amber-550">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="18"
                        max="54"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Bold / Italic check selectors */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setIsBold(!isBold)}
                        className={`flex-1 p-2 rounded-full border text-center transition-all cursor-pointer font-sans text-xs font-bold ${
                          isBold 
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                            : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-450 hover:text-zinc-200')
                        }`}
                      >
                        BOLD
                      </button>
                      <button
                        onClick={() => setIsItalic(!isItalic)}
                        className={`flex-1 p-2 rounded-full border text-center transition-all italic cursor-pointer font-sans text-xs font-bold ${
                          isItalic 
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                            : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 bg-zinc-900 text-zinc-450 hover:text-zinc-200')
                        }`}
                      >
                        ITALIC
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: VOICE & AUDIO ENGINE */}
                  <div className={`p-4 rounded-2xl border space-y-4 select-none ${
                    theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                  }`}>
                    <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800/20">
                      <Volume2 className="w-4 h-4 text-amber-500" />
                      <h3 className={`text-xs font-sans font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-zinc-200'}`}>
                        Voice & Audio Engine
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <span className={`text-[10px] font-sans font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'} flex items-center gap-1`}>
                        🔊 Vocal Speech Engine
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSpeak}
                          className={`px-3 py-2 rounded-full text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer flex-1 transition-all ${
                            isSpeaking
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isSpeaking ? 'Stop Speak' : 'Vocal Read Out'}</span>
                        </button>

                        <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-850'
                        }`}>
                          <span className="text-[9px] font-mono text-zinc-400 lowercase leading-none">Rate:</span>
                          <span className="text-[10px] font-mono text-amber-500 font-extrabold leading-none">{speechRate.toFixed(1)}x</span>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            className="w-12 h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI VOICE SCRIPTURE SYNC */}
                    <div className="space-y-3 pt-1">
                      <span className={`text-[10px] font-sans font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'} flex items-center justify-between`}>
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            {isListening ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500"></span>
                            )}
                          </span>
                          AI Voice Scripture Sync
                        </span>
                        {isListening && (
                          <span className="text-[9px] text-red-455 animate-pulse font-mono tracking-wider font-extrabold uppercase">
                            Listening
                          </span>
                        )}
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={toggleVoiceSync}
                          className={`flex-1 px-4 py-2.5 rounded-full text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                            isVoiceSyncActive
                              ? 'bg-red-650 hover:bg-red-750 border-red-500 text-white shadow-md'
                              : (theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800/80 text-cyan-400')
                          }`}
                        >
                          <span>{isVoiceSyncActive ? 'Deactivate Mic' : 'Activate Mic Sync'}</span>
                        </button>
                      </div>

                      {/* Inline Error Alert when sync is inactive but an error occurred */}
                      {!isVoiceSyncActive && transcriptLog.find(log => log.type === 'error') && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] font-mono flex items-start gap-1.5 animate-fadeIn">
                          <span className="font-bold text-red-500 shrink-0">⚠️</span>
                          <span>{transcriptLog.find(log => log.type === 'error')?.text}</span>
                        </div>
                      )}

                      {isVoiceSyncActive && (
                        <div className={`space-y-3 p-3 rounded-xl border ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-955 border-zinc-900/60'
                        }`}>
                          {/* Microphone level bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-sans text-zinc-400 font-bold uppercase">
                              <span>Mic Signal Level:</span>
                              <span className={micLevel > 50 ? 'text-red-400' : micLevel > 15 ? 'text-emerald-450' : 'text-zinc-500'}>
                                {micLevel}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-75"
                                style={{ width: `${micLevel}%` }}
                              />
                            </div>
                          </div>

                          {/* Auto-Project Settings checkbox */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="auto-project-checkbox"
                              checked={isAutoProjectEnabled}
                              onChange={(e) => setIsAutoProjectEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                            />
                            <label
                              htmlFor="auto-project-checkbox"
                              className={`text-[10px] font-sans cursor-pointer uppercase font-bold select-none ${
                                theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-450 hover:text-white'
                              }`}
                            >
                              Auto-Project Instantly
                            </label>
                          </div>

                          {/* Queue Status Panel */}
                          <div className="grid grid-cols-2 gap-1.5 text-center select-none pt-0.5 font-sans">
                            <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                              activeQueueLabel 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : (theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-850')
                            }`}>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Active Queue</span>
                              <span className={`text-[10px] font-bold uppercase truncate max-w-full ${
                                activeQueueLabel ? 'text-emerald-450 font-extrabold' : 'text-zinc-500'
                              }`}>
                                {activeQueueLabel || 'None'}
                              </span>
                            </div>
                            <div className={`p-2 rounded-xl border flex flex-col items-center justify-center ${
                              nextQueueLabel 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : (theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-850')
                            }`}>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Next Queue</span>
                              <span className={`text-[10px] font-bold uppercase truncate max-w-full ${
                                nextQueueLabel ? 'text-amber-500 font-extrabold' : 'text-zinc-500'
                              }`}>
                                {nextQueueLabel || 'None'}
                              </span>
                            </div>
                          </div>

                          {/* Live Transcript Stream */}
                          <div className="space-y-1">
                            <div className="text-[9px] font-sans font-bold text-zinc-400 uppercase">Live Speech Transcript:</div>
                            <div className={`h-11 rounded-xl p-2 text-[10px] font-sans overflow-y-auto leading-tight italic break-words border ${
                              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-900/90 border-zinc-850 text-zinc-300'
                            }`}>
                              {currentTranscript || <span className="text-zinc-500 font-medium">[Say a verse like 'John 3:16'...]</span>}
                            </div>
                          </div>

                          {/* Trigger History Logs */}
                          {transcriptLog.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-sans font-bold text-zinc-400 uppercase">Detection History:</div>
                              <div className={`h-16 rounded-xl p-1.5 text-[9.5px] font-mono overflow-y-auto space-y-1 border ${
                                theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-650' : 'bg-zinc-900/90 border-zinc-850 text-zinc-400'
                              }`}>
                                {transcriptLog.map((log, idx) => (
                                  <div
                                    key={idx}
                                    className={`truncate ${
                                      log.type === 'success'
                                        ? 'text-emerald-450 font-bold border-l-2 border-emerald-500 pl-1'
                                        : log.type === 'error'
                                        ? 'text-red-400 border-l-2 border-red-500 pl-1'
                                        : 'text-zinc-500 pl-1'
                                    }`}
                                  >
                                    {log.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RIGHT DISPLAY STAGE & CONTROLLER PANEL */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
              
              {/* Voice Sync Pending Notification Banner */}
              <AnimatePresence>
                {detectedRef && !isAutoProjectEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#2a241c] border-2 border-amber-500/40 rounded-[20px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl z-20 select-none relative overflow-hidden"
                  >
                    {/* Glowing Accent Border line inside */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex h-3 w-3 mt-1 relative items-center justify-center shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <div className="space-y-1">
                        <div className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-amber-400">🎙️ Voice Scripture Detected</div>
                        <div className="text-[13px] font-sans font-bold text-slate-100">
                          Spoken Scripture: <span className="text-amber-300 underline underline-offset-4 decoration-amber-500/50">{detectedRef.book} {detectedRef.chapter}:{detectedRef.verse || 1}</span>
                        </div>
                        {getDetectedVerseText() && (
                          <div className="text-[11.5px] font-serif leading-relaxed italic text-slate-300 bg-black/30 p-2.5 rounded-xl border border-zinc-800/40 mt-1 max-w-2xl">
                            "{getDetectedVerseText().length > 180 ? getDetectedVerseText().substring(0, 180) + '...' : getDetectedVerseText()}"
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2.5 shrink-0 justify-end mt-2 md:mt-0 font-sans">
                      <button
                        onClick={() => {
                          setDetectedRef(null);
                          setNextQueueLabel('');
                        }}
                        className="px-4 py-2 text-xs font-bold bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 rounded-full cursor-pointer transition-all active:scale-95 duration-150"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => applyReference(detectedRef)}
                        className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full cursor-pointer transition-all active:scale-95 duration-150 shadow-[0_4px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)]"
                      >
                        Project Now
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* STAGE WALLPAPER PREVIEW CONTAINER */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5 select-none">
                    <Monitor className="w-4 h-4 text-cyan-500" /> Live TV Screen Out
                  </span>
                  {!isPresentationOnly && (
                    <div className="flex items-center space-x-4 text-xs select-none">
                      <button
                        onClick={() => setShowStageBackground(!showStageBackground)}
                        className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors ${
                          showStageBackground ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Simulate preacher stage in backdrop"
                      >
                        {showStageBackground ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>Preacher Stage ({showStageBackground ? 'ON' : 'OFF'})</span>
                      </button>

                      <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                        title="Copy slide scripture text"
                      >
                        {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Slide</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* OPERATOR BROADCAST CONTROL PANEL (DECOUPLED PREVIEW / TRANSITIONS) */}
                {!isPresentationOnly && (
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                  }`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sync Toggle Button */}
                      <button
                        onClick={() => {
                          setIsLiveAutoSync(!isLiveAutoSync);
                          playLocalBeep(640, 'sine', 0.05);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-sans font-bold leading-none rounded-full border transition-all cursor-pointer ${
                          isLiveAutoSync
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-450 animate-pulse'
                        }`}
                        title={isLiveAutoSync ? "Auto-Sync updates the live screen instantly" : "Operator Mode: locked screen, stage your changes quietly"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLiveAutoSync ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                        <span>{isLiveAutoSync ? 'LIVE AUTO-SYNC ON' : 'OPERATOR MANUAL MODE'}</span>
                      </button>

                      {/* Monitor Switcher Tabs */}
                      {!isLiveAutoSync && (
                        <div className={`flex gap-1 p-1 rounded-full border z-10 select-none ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-900'
                        }`}>
                          <button
                            onClick={() => {
                              setActiveMonitorTab('preview');
                              playLocalBeep(580, 'sine', 0.03);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-sans font-bold leading-none rounded-full transition-all cursor-pointer ${
                              activeMonitorTab === 'preview'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-zinc-450 hover:text-zinc-200'
                            }`}
                          >
                            Draft Preview ({displayBook} {displayChapter}:{displayVerseNumber})
                          </button>
                          <button
                            onClick={() => {
                              setActiveMonitorTab('live');
                              playLocalBeep(580, 'sine', 0.03);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-sans font-bold leading-none rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                              activeMonitorTab === 'live'
                                ? 'bg-red-600 text-white shadow-sm font-black'
                                : 'text-zinc-455 hover:text-zinc-250'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            Live Projector ({liveState?.book || 'None'} {liveState?.chapter || ''}:{liveState?.verseNumber || ''})
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Explicit Transitions Push to Live */}
                      {!isLiveAutoSync && (
                        <button
                          onClick={handleSendLive}
                          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-sans font-bold leading-none bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-550 hover:to-amber-500 text-white rounded-full border-0 shadow-md shadow-red-500/15 cursor-pointer transition-all active:scale-95 duration-200"
                          title="Transition the currently staged slide layout to the congregation's projector!"
                        >
                          <span>📡 SEND LIVE</span>
                        </button>
                      )}

                      {/* POP-OUT STANDALONE SCREEN ACTION */}
                      <button
                        onClick={() => {
                          playLocalBeep(880, 'sine', 0.1);
                          const win = window.open(window.location.origin + window.location.pathname + '?projector=true', '_blank');
                          if (win) {
                            if (!(window as any).__OPENED_PROJECTOR_WINDOWS__) {
                              (window as any).__OPENED_PROJECTOR_WINDOWS__ = [];
                            }
                            (window as any).__OPENED_PROJECTOR_WINDOWS__.push(win);
                            
                            // Immediately push initial state once the page loads
                            setTimeout(() => {
                              if (liveState && !win.closed) {
                                win.postMessage({ type: 'STATE_UPDATE', state: liveState }, '*');
                              }
                            }, 600);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-sans font-bold leading-none border transition-all cursor-pointer rounded-full ${
                          theme === 'light'
                            ? 'bg-white hover:bg-slate-100 border-slate-250 text-slate-700 shadow-sm'
                            : 'bg-zinc-950 hover:bg-zinc-900 text-cyan-400 hover:text-cyan-350 border-zinc-800'
                        }`}
                        title="Spawn a clean presentation projection tab. Slide this to your secondary output screen or projector and maximize it!"
                      >
                        <span>📺 POP SCREEN</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* THE SIMULATED WIDESCREEN DISPLAY FRAME */}
                <div 
                  className={`w-full aspect-[16/10] rounded-2xl overflow-hidden relative shadow-2xl border transition-all ${
                    isPresentationOnly ? 'h-[70vh]' : ''
                  } ${
                    theme === 'light' ? 'border-slate-300' : 'border-cyan-950/20'
                  }`}
                  id="live-projection-monitor-frame"
                >
                  {/* Simulate a Live Stage Sanctuary Backdrop if enabled */}
                  {showStageBackground ? (
                    <div className="absolute inset-0 bg-[#02050e] pointer-events-none select-none z-0">
                      {/* Artistic SVG simulated cathedral pulpit sanctuary, with lights, preacher and congregation */}
                      <svg viewBox="0 0 800 500" className="w-full h-full object-cover opacity-60">
                        <defs>
                          <radialGradient id="stageGlow" cx="50%" cy="40%" r="50%">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="60%" stopColor="#020617" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="preacherLight" cx="50%" cy="30%" r="30%">
                            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        {/* Background stage structure */}
                        <rect width="800" height="500" fill="#030712" />
                        
                        {/* Cathedral arches and architectural pillars */}
                        <path d="M 50 500 L 50 150 C 50 80, 150 80, 150 150 L 150 500" fill="#0f172a" opacity="0.3" />
                        <path d="M 650 500 L 650 150 C 650 80, 750 80, 750 150 L 750 500" fill="#0f172a" opacity="0.3" />
                        <path d="M 180 500 L 180 80 C 180 20, 300 20, 300 80 L 300 500" fill="#0f172a" opacity="0.4" />
                        <path d="M 500 500 L 500 80 C 500 20, 620 20, 620 80 L 620 500" fill="#0f172a" opacity="0.4" />

                        {/* Back-wall glowing screen panel */}
                        <rect x="250" y="80" width="300" height="200" rx="30" fill="#1d4ed8" opacity="0.15" />
                        <ellipse cx="400" cy="180" rx="150" ry="80" fill="url(#stageGlow)" />

                        {/* Spotlight beams from rafters */}
                        <polygon points="100,-10 250,510 50,511" fill="#3b82f6" opacity="0.1" />
                        <polygon points="700,-10 750,510 550,511" fill="#c084fc" opacity="0.08" />
                        <polygon points="400,-10 480,260 320,260" fill="#fef08a" opacity="0.15" />

                        {/* Pulpit / Lectern */}
                        <rect x="360" y="270" width="80" height="8" rx="4" fill="#a1a1aa" opacity="0.4" />
                        <path d="M 370 278 L 385 360 L 415 360 L 430 278 Z" fill="#27272a" opacity="0.8" />
                        <circle cx="400" cy="245" r="30" fill="url(#preacherLight)" />

                        {/* Preacher silhouette outline */}
                        <path d="M 390 260 C 390 240, 410 240, 410 260" stroke="#fef08a" strokeWidth="2" fill="none" opacity="0.6" />
                        <circle cx="400" cy="225" r="12" fill="#e4e4e7" />
                        <path d="M375 290 Q400 242 425 290" fill="#090d16" />

                        {/* Stage flora / palms at edge */}
                        <path d="M 10 500 Q 120 400 240 500 M 10 500 Q 80 340 180 500" stroke="#15803d" strokeWidth="6" strokeLinecap="round" opacity="0.25" fill="none" />
                        <path d="M 790 500 Q 680 400 560 500 M 790 500 Q 720 340 620 500" stroke="#15803d" strokeWidth="6" strokeLinecap="round" opacity="0.25" fill="none" />
                        
                        {/* Interactive UI live feedback hint */}
                        <text x="400" y="40" fill="#a1a1aa" fontSize="11" fontFamily="monospace" textAnchor="middle" letterSpacing="3" opacity="0.5">
                          SIMULATED BROADCAST LIVE STREAM
                        </text>
                      </svg>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[#05070e] pointer-events-none z-0" />
                  )}

                  {/* ACTIVE PRESENTING BOX RENDERED PRECISELY */}
                  <div className={`absolute inset-0 flex flex-col justify-end z-10 pointer-events-none ${
                    displayLayoutMode === 'projector-slide' ? 'p-5 sm:p-8 md:p-12' : 'p-0'
                  }`}>
                    
                    {/* Centered presentation slide handles layout shift */}
                    <div className={`w-full transition-all duration-300 ${
                      displayLayoutMode === 'projector-slide' 
                        ? 'h-full flex flex-col justify-center items-center' 
                        : 'h-full flex flex-col justify-end'
                    }`}>
                      
                      {/* Active Presentation Container */}
                      <div className={`w-full transition-all duration-350 flex flex-col overflow-hidden ${themeStyle?.container} ${
                        displayLayoutMode === 'projector-slide' 
                          ? 'max-w-4xl py-12 rounded-3xl p-6 sm:p-8 md:relative' 
                          : 'rounded-none border-x-0 h-1/4 min-h-[82px] max-h-[125px] justify-center px-8 py-2 md:py-2 sm:px-12 md:px-14'
                      }`}
                        id="projection-slide"
                      >
                        {/* Upper Header: Translation detail on Left & Bible index on Right */}
                        <div className={`flex items-center justify-between font-sans select-none leading-none w-full ${
                          displayLayoutMode === 'lower-third' 
                            ? 'text-[10px] sm:text-xs mb-1.5 pb-1.5 border-b border-white/10' 
                            : 'text-xs sm:text-sm mb-3 pb-2.5 border-b border-white/10'
                        }`}>
                          <span className={`uppercase font-bold tracking-wider ${themeStyle?.label}`}>
                            {displayIsCustomLabelEnabled ? displayTranslationLabel : displayTranslationText}
                          </span>
                          <span className={`text-[12px] sm:text-[13px] tracking-wide ${themeStyle?.ref}`}>
                            {displayBook} {displayChapter}:{displayVerseNumber}
                          </span>
                        </div>
 
                        {/* Middle Text: Main large translation text body */}
                        <div 
                          className={`w-full whitespace-pre-wrap transition-all leading-normal ${
                            displayFontFamily === 'serif' ? 'font-serif' : displayFontFamily === 'mono' ? 'font-mono' : 'font-sans'
                          } ${
                            displayIsBold ? 'font-bold' : 'font-normal'
                          } ${
                            displayIsItalic ? 'italic' : 'not-italic'
                          }`}
                          style={{ 
                            fontSize: `${displayLayoutMode === 'lower-third' ? Math.max(11, Math.min(displayFontSize - 15, 16)) : displayFontSize}px`, 
                            textAlign: displayAlignment as any,
                            lineHeight: '1.25'
                          }}
                        >
                          {displayVerseText || (
                            <span className="opacity-40 italic">
                              [No scripture select. Choose a verse index below to display]
                            </span>
                          )}
                        </div>
 
                        {/* Subtle bottom visual border/bars mimics professional church streaming look */}
                        {displayThemePreset === 'sapphire-gold' && (
                          <div className={`w-full flex items-center justify-between h-1.5 ${
                            displayLayoutMode === 'lower-third' ? 'mt-2' : 'mt-4'
                          }`}>
                            <span className="w-1/4 h-[2px] bg-gradient-to-r from-amber-400 to-transparent" />
                            <div className="flex gap-1.5 justify-center items-center">
                              <span className="w-1 h-1 bg-amber-400 rounded-full" />
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full rotate-45" />
                              <span className="w-1 h-1 bg-amber-400 rounded-full" />
                            </div>
                            <span className="w-1/4 h-[2px] bg-gradient-to-l from-amber-400 to-transparent" />
                          </div>
                        )}
                        {displayThemePreset === 'cyber-slate' && (
                          <div className={`w-full h-[1px] bg-cyan-500/20 ${
                            displayLayoutMode === 'lower-third' ? 'mt-2' : 'mt-4'
                          }`} />
                        )}
                      </div>
 
                    </div>
                  </div>

                </div>
              </div>

              {/* QUICK SWITCHAR VERSES TRIGGER COLUMN - MEDIA DESK OPERATOR VIEW */}
              <div className="space-y-3 flex-1 select-none flex flex-col justify-end">
                {/* QUICK MANUAL NAVIGATION CONTROLS */}
                <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                  theme === 'light' ? 'bg-white border-slate-200/60 shadow-sm' : 'bg-[#211f26] border-zinc-800/80'
                }`}>
                  <div className="flex items-center gap-2 select-none">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span className={`text-[11px] font-sans font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-zinc-200'}`}>
                      Quick Scripture Navigate
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={currentBook}
                      onChange={(e) => {
                        const bookName = e.target.value;
                        if (onNavigateToVerse) {
                          onNavigateToVerse(bookName, 1, 1);
                        }
                      }}
                      className={`flex-1 sm:flex-initial min-w-[130px] border rounded-full px-3 py-1.5 text-xs font-sans font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
                        theme === 'light' ? 'bg-slate-50 border-slate-250 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      {BIBLE_BOOKS.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={currentChapter}
                      onChange={(e) => {
                        const chapNum = parseInt(e.target.value, 10);
                        if (onNavigateToVerse) {
                          onNavigateToVerse(currentBook, chapNum, 1);
                        }
                      }}
                      className={`w-24 border rounded-full px-3 py-1.5 text-xs font-sans font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${
                        theme === 'light' ? 'bg-slate-50 border-slate-250 text-slate-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      {Array.from(
                        { length: BIBLE_BOOKS.find((b) => b.name === currentBook)?.chapters || 1 },
                        (_, i) => i + 1
                      ).map((c) => (
                        <option key={c} value={c}>
                          Chapter {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-cyan-500/10 pt-4">
                  <div>
                    <h4 className={`text-xs font-mono font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-400'}`}>
                      Active Chapter Queue
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                      TAP/CLICK VERSE TO FLY LIGHT-THIRD OVER-PREFERENCE INSTANTLY
                    </p>
                  </div>

                  {/* NAV / STEPS */}
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={activeVerseIndex <= 0}
                      onClick={() => {
                        setActiveVerseIndex(prev => Math.max(0, prev - 1));
                        lastTriggeredRef.current = '';
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        activeVerseIndex <= 0
                          ? 'opacity-40 cursor-not-allowed text-slate-600 border-slate-850'
                          : 'cursor-pointer hover:bg-slate-800 text-cyan-400 border-cyan-500/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {activeVerseIndex + 1} / {verses.length || 1}
                    </span>
                    <button
                      disabled={activeVerseIndex >= verses.length - 1}
                      onClick={() => {
                        setActiveVerseIndex(prev => Math.min(verses.length - 1, prev + 1));
                        lastTriggeredRef.current = '';
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        activeVerseIndex >= verses.length - 1
                          ? 'opacity-40 cursor-not-allowed text-slate-600 border-slate-850'
                          : 'cursor-pointer hover:bg-slate-800 text-cyan-400 border-cyan-500/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* VERSE BUTTON MATRIX GRID */}
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {verses.map((v, index) => {
                    const isActive = activeVerseIndex === index;
                    return (
                      <button
                        key={v.verseNumber}
                        onClick={() => {
                          setActiveVerseIndex(index);
                          lastTriggeredRef.current = '';
                          if ('speechSynthesis' in window) {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                          }
                        }}
                        className={`p-2.5 rounded-lg font-sans font-black text-xs transition-all relative cursor-pointer flex flex-col items-center justify-center ${
                          isActive
                            ? 'bg-amber-450 border-amber-500 text-slate-950 font-black scale-105 shadow-md shadow-amber-500/10'
                            : (theme === 'light'
                                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                : 'bg-[#0f172a] hover:bg-[#12203e] border-slate-800 text-slate-300')
                        } border`}
                        title={`Select verse ${v.verseNumber}`}
                      >
                        <span>{v.verseNumber}</span>
                        {isActive && (
                          <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-slate-950 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
