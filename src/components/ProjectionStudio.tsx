import { BIBLE_BOOKS } from "../bibleMetadata";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  BookOpen,
  Mic,
  MicOff,
  Send
} from 'lucide-react';
import { ChapterData, Verse } from '../types';
import { openProjectorStandalone } from '../utils/windowUtils';

interface ProjectionStudioProps {
  theme: 'light' | 'dark';
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
  chapterData: ChapterData | null;
  onNavigateToVerse?: (book: string, chapter: number, verse: number) => void;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  initialVerseNumber?: number;
  dynamicTranslationData?: Record<string, Record<string, string>>;
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

const mapTranslationShorthandToFullName = (shortName: string | undefined): string => {
  if (!shortName) return 'KING JAMES VERSION';
  const name = shortName.toLowerCase();
  if (name === 'kjv') return 'KING JAMES VERSION';
  if (name === 'bsb') return 'BEREAN STANDARD BIBLE';
  if (name === 'plain') return 'PLAIN ENGLISH TRANSLATION';
  if (name === 'personalized') return 'PERSONALISED PRAYER VERSION';
  if (name === 'asv') return 'AMERICAN STANDARD VERSION';
  if (name === 'ylt') return 'YOUNG\'S LITERAL TRANSLATION';
  if (name === 'bbe') return 'BIBLE IN BASIC ENGLISH';
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
  initialVerseNumber = 0,
  onBookChange,
  onChapterChange,
  dynamicTranslationData = {}
}: ProjectionStudioProps) {
  // Active state for projected verse details
  const [activeVerseIndex, setActiveVerseIndex] = useState<number>(0);
  const [pendingVerseIndex, setPendingVerseIndex] = useState<number | null>(null);
  const [activeTranslation, setActiveTranslation] = useState<'kjv' | 'bsb' | 'plain' | 'personalized' | 'asv' | 'ylt' | 'bbe'>('kjv');
  const [customTranslationLabel, setCustomTranslationLabel] = useState<string>('Personal Study Bible');
  const [isCustomLabelEnabled, setIsCustomLabelEnabled] = useState<boolean>(false);

  // Live broadcast / Operator lock states
  const [liveState, setLiveState] = useState<LiveProjectionState | null>(null);
  const [isLiveAutoSync, setIsLiveAutoSync] = useState<boolean>(true);
  const [activeMonitorTab, setActiveMonitorTab] = useState<'preview' | 'live'>('preview');
  
  const [localDynamicData, setLocalDynamicData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (['asv', 'ylt', 'bbe'].includes(activeTranslation)) {
      setLocalDynamicData({});
      fetch(`/api/translation/${activeTranslation}?book=${encodeURIComponent(currentBook)}&chapter=${currentChapter}`)
        .then(res => res.json())
        .then(data => {
           if (data.success && data.data && data.data.verses) {
             const versesData = data.data.verses;
             const formattedData: Record<string, string> = {};
             if (Array.isArray(versesData)) {
               versesData.forEach((v: any) => {
                 formattedData[String(v.verse)] = v.text;
               });
             } else if (typeof versesData === 'object' && versesData !== null) {
               Object.assign(formattedData, versesData);
             }
             setLocalDynamicData(formattedData);
           }
        })
        .catch(err => {
          console.warn('Failed to fetch local dynamic translation in studio:', err);
          const offlineData: Record<string, string> = {};
          for (let i = 1; i <= 200; i++) offlineData[String(i)] = '[Translation Offline]';
          setLocalDynamicData(offlineData);
        });
    }
  }, [activeTranslation, currentBook, currentChapter]);

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

  
  
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small size for simple bars
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;
      
      const updateVolumes = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Take a few samples for our 12 bars
        const newVolumes = [];
        const step = Math.floor(dataArrayRef.current.length / 12);
        for (let i = 0; i < 12; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArrayRef.current[i * step + j];
          }
          const avg = sum / step;
          // Normalize to 0-100
          newVolumes.push(Math.min(100, Math.floor((avg / 255) * 100)));
        }
        setMicVolumes(newVolumes);
        rafRef.current = requestAnimationFrame(updateVolumes);
      };
      
      updateVolumes();
    } catch (err) {
      console.warn("Could not start audio analysis", err);
    }
  };
  
  const stopAudioAnalysis = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    setMicVolumes(Array(12).fill(0));
  };

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Auto-open projector window when studio opens if not already opened
      // If running inside Electron, bypass this since the native window is handled by main.cjs
      if (typeof window !== 'undefined' && (window as any).electronAPI) return;

      const popWindow = async () => {
         try {
           await openProjectorStandalone(liveState, true);
         } catch (e) {
           console.warn('Failed to auto-open projector', e);
         }
      };
      
      const timer = setTimeout(() => {
        if ((window as any).__OPENED_PROJECTOR_WINDOWS__ && (window as any).__OPENED_PROJECTOR_WINDOWS__.length > 0) {
           let allClosed = true;
           for (const w of (window as any).__OPENED_PROJECTOR_WINDOWS__) {
              if (!w.closed) allClosed = false;
           }
           if (allClosed) {
             popWindow();
           }
        } else {
           popWindow();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


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
      case 'asv':
      case 'ylt':
      case 'bbe':
        return localDynamicData?.[verse.verseNumber.toString()] || dynamicTranslationData?.[activeTranslation]?.[verse.verseNumber.toString()] || '';
      default:
        return verse.kjvText || '';
    }
  };

  const activeVerseText = getVerseText(currentVerse);

  // playLocalBeep audio feedback helper (Premium subtle sound)
  const playLocalBeep = (freq = 320, type: OscillatorType = 'triangle', duration = 0.1) => {
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

  // Synchronize Live State when Auto-Sync is ON
  useEffect(() => {
    if (isLiveAutoSync) {
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
          popups.forEach(w => {
            if (w && !w.closed) w.postMessage({ type: 'STATE_UPDATE', state: liveState }, '*');
          });
        }
        
        // Push state to Electron native projection window
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          (window as any).electronAPI.sendSlideUpdate(liveState);
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
    playLocalBeep();
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
  const isLowerThird = displayLayoutMode === 'lower-third';

  
  // --- AI Voice Recognition Engine ---
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedRef, setDetectedRef] = useState<{book: string, chapter: number, verse: number} | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  const [micVolumes, setMicVolumes] = useState<number[]>(Array(12).fill(0));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);


  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let result = '';
        for (let i = 0; i < event.results.length; ++i) {
          result += event.results[i][0].transcript;
        }
        
        // Homophone conversion
        const wordToDigit: Record<string, string> = {
          'first': '1', '1st': '1', 'one': '1', 'won': '1', 'once': '1',
          'second': '2', '2nd': '2', 'two': '2', 'to': '2', 'too': '2', 'sec': '2',
          'third': '3', '3rd': '3', 'three': '3', 'tree': '3',
          'fourth': '4', '4th': '4', 'four': '4', 'for': '4',
          'fifth': '5', '5th': '5', 'five': '5',
          'sixth': '6', '6th': '6', 'six': '6',
          'seventh': '7', '7th': '7', 'seven': '7',
          'eighth': '8', '8th': '8', 'eight': '8', 'ate': '8',
          'ninth': '9', '9th': '9', 'nine': '9',
          'tenth': '10', '10th': '10', 'ten': '10',
          'eleventh': '11', '11th': '11', 'eleven': '11',
          'twelfth': '12', '12th': '12', 'twelve': '12',
          'thirteenth': '13', '13th': '13', 'thirteen': '13',
          'fourteenth': '14', '14th': '14', 'fourteen': '14',
          'fifteenth': '15', '15th': '15', 'fifteen': '15',
          'sixteenth': '16', '16th': '16', 'sixteen': '16',
          'seventeenth': '17', '17th': '17', 'seventeen': '17',
          'eighteenth': '18', '18th': '18', 'eighteen': '18',
          'nineteenth': '19', '19th': '19', 'nineteen': '19',
          'twentieth': '20', '20th': '20', 'twenty': '20',
          'thirtieth': '30', '30th': '30', 'thirty': '30',
          'fortieth': '40', '40th': '40', 'forty': '40',
          'fiftieth': '50', '50th': '50', 'fifty': '50',
          'sixtieth': '60', '60th': '60', 'sixty': '60',
          'seventieth': '70', '70th': '70', 'seventy': '70',
          'eightieth': '80', '80th': '80', 'eighty': '80',
          'ninetieth': '90', '90th': '90', 'ninety': '90',
          'hundredth': '100', '100th': '100', 'hundred': '100'
        };
        
        let processedResult = result.split(/(\s+|(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)|[-.,:;!?])/).map(w => wordToDigit[w.toLowerCase()] || w).join('');
        processedResult = processedResult.replace(/(\d+)\s+(?=\d+)/g, '$1:');
        setTranscript(processedResult);
        
        // Basic detection
        const regex = /(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs?|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\s+(?:chapter\s+)?(\d+)(?:\s*(?::|verse|and|,|-|\s)\s*(\d+))?/i;
        const match = processedResult.match(regex);
        if (match) {
          let b = match[1];
          if (b.toLowerCase() === 'psalms') b = 'Psalm';
          if (b.toLowerCase() === 'proverbs') b = 'Proverb';
          
          const properBook = BIBLE_BOOKS.find(book => book.name.toLowerCase() === b.toLowerCase());
          if (properBook) {
            b = properBook.name;
          }

          setDetectedRef({
            book: b,
            chapter: parseInt(match[2], 10),
            verse: match[3] ? parseInt(match[3], 10) : 1
          });
          
          setTranscript(''); // Clear transcript
          
          // Restart recognition to clear cumulative buffer
          if (isListeningRef.current) {
            shouldRestartRef.current = true;
            try { recognition.abort(); } catch(e) {}
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'aborted') {
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioAnalysis();
        }
      };

      recognition.onend = () => {
        if (shouldRestartRef.current && isListeningRef.current) {
          shouldRestartRef.current = false;
          try { recognition.start(); } catch(e) {}
        } else {
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioAnalysis();
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  
  // Auto-start Mic on open
  const manuallyStoppedRef = useRef(false);
  
  useEffect(() => {
    if (isOpen && !manuallyStoppedRef.current && !isListeningRef.current) {
      isListeningRef.current = true;
      shouldRestartRef.current = false;
      try { recognitionRef.current?.start(); } catch(e) {}
      setIsListening(true);
      startAudioAnalysis();
    } else if (!isOpen && isListeningRef.current) {
      isListeningRef.current = false;
      shouldRestartRef.current = false;
      try { recognitionRef.current?.stop(); } catch(e) {}
      setIsListening(false);
      stopAudioAnalysis();
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      manuallyStoppedRef.current = true;
      isListeningRef.current = false;
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      stopAudioAnalysis();
    } else {
      manuallyStoppedRef.current = false;
      setTranscript('');
      setDetectedRef(null);
      isListeningRef.current = true;
      recognitionRef.current?.start();
      setIsListening(true);
      startAudioAnalysis();
    }
  };


  const handleSendToProjection = () => {
    if (detectedRef) {
      if (onNavigateToVerse) {
        onNavigateToVerse(detectedRef.book, detectedRef.chapter, detectedRef.verse);
      }
      setPendingVerseIndex(Math.max(0, detectedRef.verse - 1));
      setTranscript('');
      setDetectedRef(null);
    }
  };

  useEffect(() => {
    if (pendingVerseIndex !== null && chapterData?.verses && pendingVerseIndex < chapterData.verses.length) {
      setActiveVerseIndex(pendingVerseIndex);
      setPendingVerseIndex(null);
    }
  }, [chapterData, pendingVerseIndex]);


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 backdrop-blur-xl ${theme === 'light' ? 'bg-[#fcfcfc] md:bg-slate-900/60' : 'bg-[#0a0d16] md:bg-[#0a0a0a]/90'} overflow-hidden font-sans`}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className={`w-full max-w-[1200px] h-[100dvh] md:h-[80vh] mb-0 rounded-none md:rounded-[2rem] border-none md:border-solid md:border flex flex-col overflow-hidden shadow-2xl relative ${theme === 'light' ? 'bg-[#fcfcfc] md:bg-white md:border-slate-200' : 'bg-[#0a0d16] md:bg-[#131314] md:border-slate-800'}`}
        >
          {/* TOP STATUS BAR */}
          <div className={`p-4 border-b flex items-center justify-between select-none relative z-20 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#131314]/80 border-white/10 backdrop-blur-md'}`}>
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
                <Tv className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className={`text-xl font-black tracking-tight leading-none ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  PROJECTION STUDIO
                </h2>
                <p className={`text-xs font-bold tracking-widest uppercase mt-1 ${theme === 'light' ? 'text-amber-600' : 'text-amber-500/70'}`}>
                  Screen Presentation Mode
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button type="button"
                onClick={() => {
                  playLocalBeep();
                  if (typeof window !== 'undefined' && (window as any).electronAPI) {
                    (window as any).electronAPI.reopenProjector();
                  } else {
                    openProjectorStandalone(liveState);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${theme === 'light' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}
                title="Pop out or reopen standalone projector window"
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden md:inline">Pop Screen</span>
              </button>
              
              <button type="button"
                onClick={() => setIsPresentationOnly(!isPresentationOnly)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  isPresentationOnly
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : (theme === 'light' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/15 text-white')
                }`}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden md:inline">{isPresentationOnly ? 'Studio' : 'Focus'}</span>
              </button>
              
              <button type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  onClose();
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${theme === 'light' ? 'bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500' : 'bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN STUDIO GRID */}
          <div className="flex-1 overflow-hidden relative z-10 flex flex-col md:flex-row">
            
            {/* LEFT SIDEBAR: VERSES */}
            {!isPresentationOnly && (
              <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/40'}`}>
                <div className={`p-4 border-b space-y-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex flex-col gap-3">
                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-500'}`}>
                      <BookOpen className="w-4 h-4" /> Library Overlay
                    </h3>
                    
                    <div className="flex flex-col gap-2">
                      <select
                        value={currentBook}
                        onChange={(e) => {
                           onBookChange(e.target.value);
                           onChapterChange(1);
                        }}
                        className={`w-full text-sm rounded-lg p-2 font-medium cursor-pointer border ${
                          theme === 'light' 
                            ? 'bg-slate-100 border-slate-200 text-slate-800' 
                            : 'bg-black/50 border-white/10 text-white'
                        }`}
                      >
                        {BIBLE_BOOKS.map(b => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>

                      <select
                        value={currentChapter}
                        onChange={(e) => onChapterChange(Number(e.target.value))}
                        className={`w-full text-sm rounded-lg p-2 font-medium cursor-pointer border ${
                          theme === 'light' 
                            ? 'bg-slate-100 border-slate-200 text-slate-800' 
                            : 'bg-black/50 border-white/10 text-white'
                        }`}
                      >
                        {Array.from({ length: BIBLE_BOOKS.find(b => b.name === currentBook)?.chapters || 1 }).map((_, i) => (
                          <option key={i+1} value={i+1}>Chapter {i + 1}</option>
                        ))}
                      </select>

                      <select
                        value={activeTranslation}
                        onChange={(e) => setActiveTranslation(e.target.value as any)}
                        className={`w-full text-sm rounded-lg p-2 font-medium cursor-pointer border ${
                          theme === 'light' 
                            ? 'bg-slate-100 border-slate-200 text-slate-800' 
                            : 'bg-black/50 border-white/10 text-white'
                        }`}
                      >
                        <option value="kjv">King James Version</option>
                        <option value="bsb">Berean Standard Bible</option>
                        <option value="plain">Plain English Translation</option>
                        <option value="personalized">Personalized Promise Version</option>
                        <option value="asv">American Standard Version</option>
                        <option value="ylt">Young's Literal Translation</option>
                        <option value="bbe">Bible in Basic English</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {verses.map((verse, idx) => {
                    const isActive = idx === activeVerseIndex;
                    return (
                      <div
                        key={verse.verseNumber}
                        onClick={() => {
                          setActiveVerseIndex(idx);
                          playLocalBeep();
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-all border flex gap-3 group ${
                          isActive
                            ? (theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/40')
                            : (theme === 'light' ? 'bg-transparent border-transparent hover:bg-slate-50' : 'bg-transparent border-transparent hover:bg-white/5')
                        }`}
                      >
                        <span className={`text-xs font-black w-5 shrink-0 pt-0.5 ${isActive ? (theme === 'light' ? 'text-amber-600' : 'text-amber-500') : 'text-slate-500'}`}>
                          {verse.verseNumber}
                        </span>
                        <p className={`text-sm leading-snug ${isActive ? (theme === 'light' ? 'text-slate-900 font-medium' : 'text-white font-medium') : 'text-slate-500 font-normal'}`}>
                          {getVerseText(verse)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                {/* AI Voice Recognition UI */}
                <div className={`p-4 border-t space-y-3 shrink-0 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#131314]'}`}>
                  <div className="flex items-center justify-between">
                    
                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${theme === 'light' ? 'text-blue-600' : 'text-blue-500'}`}>
                      <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse text-red-500' : ''}`} /> Voice AI
                      
                      {isListening && (
                        <div className="flex items-end gap-[1px] h-3 ml-2">
                          {micVolumes.map((vol, i) => (
                            <div 
                              key={i} 
                              className="w-[3px] bg-red-500 rounded-t-sm transition-all duration-75"
                              style={{ height: `${Math.max(10, vol)}%` }}
                            />
                          ))}
                        </div>
                      )}
                    </h3>

                    <button
                      onClick={toggleListening}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : (theme === 'light' ? 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100' : 'bg-black/50 text-slate-400 border border-white/10 hover:bg-white/5')}`}
                    >
                      {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {transcript && (
                    <div className={`p-2 rounded-lg text-xs font-mono leading-relaxed max-h-24 overflow-y-auto ${theme === 'light' ? 'bg-white border border-slate-200 text-slate-600' : 'bg-black/50 border border-white/10 text-slate-400'}`}>
                      {transcript}
                    </div>
                  )}

                  {detectedRef && (
                    <div className={`p-2 rounded-lg border flex flex-col gap-2 ${theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                          {detectedRef.book} {detectedRef.chapter}:{detectedRef.verse}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTranscript('');
                              setDetectedRef(null);
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 border ${theme === 'light' ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-white/5 hover:text-white'}`}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              if (onNavigateToVerse) {
                                onNavigateToVerse(detectedRef.book, detectedRef.chapter, detectedRef.verse);
                                setPendingVerseIndex(detectedRef.verse - 1);
                                setTranscript('');
                                setDetectedRef(null);
                              }
                            }}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${theme === 'light' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/20'}`}
                          >
                            Send <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CENTER/MAIN: STAGE PREVIEW */}
            <div className={`flex-1 flex flex-col relative ${theme === 'light' ? 'bg-slate-50' : 'bg-[#0a0a0a]'}`}>
              
              {/* STAGE HEADER */}
              <div className={`h-12 border-b flex items-center justify-between px-4 shrink-0 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/60'}`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => setActiveMonitorTab('preview')}
                      className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                        activeMonitorTab === 'preview' 
                          ? (theme === 'light' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-slate-950')
                          : (theme === 'light' ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5')
                      }`}
                    >
                      Preview
                    </button>
                    <button type="button"
                      onClick={() => setActiveMonitorTab('live')}
                      className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                        activeMonitorTab === 'live' 
                          ? 'bg-red-500 text-white shadow-md shadow-red-500/20' 
                          : (theme === 'light' ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5')
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isLiveAutoSync ? 'bg-red-400 animate-pulse' : 'bg-slate-600'}`} />
                      Live
                    </button>
                  </div>
                  
                  <div className={`w-px h-4 ${theme === 'light' ? 'bg-slate-300' : 'bg-white/10'}`} />
                  
                  <button type="button"
                    onClick={() => setIsLiveAutoSync(!isLiveAutoSync)}
                    className="flex items-center gap-2 cursor-pointer group bg-transparent border-none p-0 focus:outline-none"
                  >
                    <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${isLiveAutoSync ? 'bg-amber-500' : 'bg-slate-300'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isLiveAutoSync ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-xs font-bold tracking-widest uppercase transition-colors ${theme === 'light' ? 'text-slate-500 group-hover:text-slate-800' : 'text-slate-400 group-hover:text-white'}`}>
                      Auto-Sync
                    </span>
                  </button>
                
                </div>
                
                <div className="flex items-center gap-2">
                  {!isLiveAutoSync && (
                    <button type="button"
                      onClick={handleSendLive}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Send to Live</span>
                    </button>
                  )}
                   <button type="button"
                     onClick={() => setLayoutMode(layoutMode === 'lower-third' ? 'projector-slide' : 'lower-third')}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
                       layoutMode === 'projector-slide'
                         ? (theme === 'light' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30')
                         : (theme === 'light' ? 'bg-white text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                     }`}
                   >
                     <Layout className="w-3.5 h-3.5" />
                     <span className="hidden md:inline">{layoutMode === 'lower-third' ? 'Lower Third' : 'Center Screen'}</span>
                   </button>
                   <button type="button"
                     onClick={() => setShowStageBackground(!showStageBackground)}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
                       showStageBackground
                         ? (theme === 'light' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30')
                         : (theme === 'light' ? 'bg-white text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10')
                     }`}
                   >
                     {showStageBackground ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                     <span className="hidden md:inline">BG Mode</span>
                   </button>
                </div>
              </div>

              {/* STAGE CANVAS */}
              <div className="flex-1 p-4 md:p-8 flex items-center justify-center overflow-hidden">
                <div className="w-full aspect-video max-w-5xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative flex flex-col bg-black transition-all">
                  
                  {/* Theme Background Injector */}
                  {showStageBackground && (
                    <div className={`absolute inset-0 z-0 ${themeStyle.container}`} />
                  )}

                  {/* Layout Engine */}
                  <div className={`relative z-10 flex-1 flex flex-col ${isLowerThird ? 'justify-end' : 'justify-center'} p-8`}>
                    <div className={`w-full transition-all ${isLowerThird ? 'max-w-4xl' : 'max-w-5xl'} mx-auto`}>
                      <div className={`${themeStyle.container} rounded-2xl ${isLowerThird ? 'p-6' : 'p-12'} backdrop-blur-xl shadow-2xl border`}>
                        <div className={`flex ${isLowerThird ? 'items-start gap-6' : 'flex-col items-center text-center gap-8'}`}>
                          
                          {/* Reference Block */}
                          <div className="shrink-0">
                            <div className={`${themeStyle.ref} inline-flex items-center gap-2 ${isLowerThird ? 'px-4 py-1.5' : 'px-6 py-2'} rounded-full ${isLowerThird ? 'mb-3' : ''}`}>
                              <BookOpen className={`${isLowerThird ? 'w-4 h-4' : 'w-6 h-6'}`} />
                              <span className={`${isLowerThird ? 'text-sm' : 'text-xl'} font-black tracking-widest uppercase`}>
                                {currentBook} {currentChapter}:{currentVerse?.verseNumber}
                              </span>
                            </div>
                          </div>

                          {/* Verse Text Block */}
                          <div className="flex-1 w-full flex flex-col justify-center overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                            <h2 
                              className={`${isBold ? 'font-black' : 'font-medium'} ${isItalic ? 'italic' : ''} font-sans ${isLowerThird ? 'text-lg md:text-xl lg:text-2xl' : 'text-2xl md:text-3xl lg:text-4xl'}`}
                              style={{ 
                                lineHeight: '1.4',
                                textAlign: isLowerThird ? 'left' : 'center',
                                width: '100%'
                              }}
                            >
                              "{activeVerseText}"
                            </h2>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* NAVIGATION CONTROLS */}
              <div className={`h-16 border-t flex items-center justify-between px-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/60'}`}>
                <button type="button"
                  onClick={() => setActiveVerseIndex(Math.max(0, activeVerseIndex - 1))}
                  disabled={activeVerseIndex === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors ${theme === 'light' ? 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600' : 'bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'}`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-black uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                    Verse {currentVerse?.verseNumber}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {activeVerseIndex + 1} of {verses.length}
                  </span>
                </div>

                <button type="button"
                  onClick={() => setActiveVerseIndex(Math.min(verses.length - 1, activeVerseIndex + 1))}
                  disabled={activeVerseIndex === verses.length - 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors ${theme === 'light' ? 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600' : 'bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'}`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
