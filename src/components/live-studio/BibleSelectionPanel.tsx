import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LowerThirdData, LowerThirdBgColor, getCssScriptureFontClass } from './DualCanvasCompositor';
import { useStudioDeckTheme, getTactileBtnClass, getTactileLedClass, playHardwareClick, getStudioThemeTokens } from './tactileTheme';
import { BIBLE_BOOKS } from '../../bibleMetadata';
import { STATIC_CHAPTERS } from '../../staticChapters';
import { getOfflineChapter, getBundledKjvChapter } from '../../utils/offlineBibleStorage';
import {
  getOfflineManuscriptChapter,
  getBookLanguage,
  InterlinearVerse,
  InterlinearWord
} from '../../utils/offlineManuscriptStorage';
import { getWordMorphology, getContextualLemmaAction, getParentLemma } from '../../utils/morphologyEngine';
import { getWordTransliteration } from '../../utils/transliterationEngine';
import { groupVersesByStory } from '../../utils/pericopeChunker';
import {
  stripSuppliedMarkup,
  parseKjvRawTokens,
  getMatchedKjvTokenIndices
} from '../../utils/wordClusteringEngine';
import { NarrativeStream } from '../NarrativeStream';
import { InlineParagraphContext } from '../InlineParagraphContext';
import {
  getCrossReferencesForVerse,
  getSyncVerseText,
  getVerseTextByReference,
  subscribeToCrossReferenceUpdates,
  addUserCrossReference,
  removeUserCrossReference
} from '../../utils/crossReferenceEngine';
import { Verse } from '../../types';

export interface BibleSelectionPanelProps {
  currentLowerThird: LowerThirdData | null;
  isVisible: boolean;
  onUpdateLowerThird: (data: LowerThirdData | null, show: boolean) => void;
  onToggleVisibility: () => void;
  scriptureViewMode?: 'lower-third' | 'full-screen';
  onScriptureViewModeChange?: (mode: 'lower-third' | 'full-screen') => void;
  isFullScreenPip?: boolean;
  onToggleFullScreenPip?: (enabled: boolean) => void;
  theme?: 'light' | 'dark';
  lowerThirdBgColor?: LowerThirdBgColor;
  onLowerThirdBgColorChange?: (color: LowerThirdBgColor) => void;
  onPreviewScroll?: (ratio: number) => void;
  scriptureTypeface?: 'untitled-serif' | 'serif' | 'sans' | 'mono';
  isScriptureBold?: boolean;
}

type StudyMode = 'standard' | 'interlinear';

// Global Strong's Study Database cache matching App.tsx and StrongsWordStudyModal
let globalStrongsDbCache: any = null;
let globalStrongsDbPromise: Promise<any> | null = null;

async function getLoadedStrongsDb(): Promise<any> {
  if (globalStrongsDbCache) return globalStrongsDbCache;
  if (globalStrongsDbPromise) return globalStrongsDbPromise;

  const t = Date.now();
  const candidateUrls = [
    `/data/strongs_study_db.json?t=${t}`,
    `./data/strongs_study_db.json?t=${t}`,
    `data/strongs_study_db.json?t=${t}`,
    ...(typeof window !== 'undefined' && window.location?.origin
      ? [`${window.location.origin}/data/strongs_study_db.json?t=${t}`]
      : [])
  ];

  globalStrongsDbPromise = (async () => {
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.verseAnatomy || data.wordStudies)) {
            globalStrongsDbCache = data;
            return data;
          }
        }
      } catch {}
    }
    return null;
  })();

  return globalStrongsDbPromise;
}

/**
 * Universal Root Action Resolution Pipeline (Mirrors App.tsx Main Study View)
 * 1. Special particles (H853 Accusative Marker)
 * 2. strongs_study_db.json wordStudies lookup (coreMeaning)
 * 3. Parent Lemma Mapping (PARENT_LEMMA_MAP)
 * 4. Grammar Map Gloss Extraction (parenthesized nuance)
 * 5. Contextual Interlinear gloss or fallback
 */
function resolveAuthenticRootAction(
  wordObj?: InterlinearWord | null,
  verseRef?: string,
  language?: 'Hebrew' | 'Greek',
  studyDb?: any
): string {
  if (!wordObj) return '';
  const cleanCode = (wordObj.n || '').trim().toUpperCase();

  // Tier 1: Special Biblical Grammatical Particles
  if (cleanCode === 'H853') {
    return 'Accusative Marker (Direct Object Particle • Untranslated in KJV)';
  }

  const normRef = (verseRef || '').trim().toLowerCase();
  const cleanRefId = normRef.replace(/[\s:]+/g, '-');

  // Tier 2: Comprehensive Strong's Study Database Lookup
  const activeDb = studyDb || globalStrongsDbCache;
  if (activeDb && Array.isArray(activeDb.wordStudies) && cleanCode) {
    const found = activeDb.wordStudies.find((w: any) => {
      const idMatch = cleanRefId && w.id?.toLowerCase() === `${cleanRefId}-${cleanCode}`.toLowerCase();
      const refMatch = normRef && w.verseReference?.trim().toLowerCase() === normRef && w.strongsNumber?.toUpperCase() === cleanCode;
      return idMatch || refMatch;
    }) || activeDb.wordStudies.find((w: any) => w.strongsNumber?.toUpperCase() === cleanCode);

    if (found?.coreMeaning) {
      return found.coreMeaning;
    }
  }

  // Tier 3: Parent Lemma Mapping (for irregular verbs & inflections)
  const parentLemma = cleanCode ? getParentLemma(cleanCode) : null;
  if (parentLemma?.rootAction) {
    return parentLemma.rootAction;
  }

  // Tier 4: Morphology Grammatical Map Gloss Extraction (nuances in parentheses)
  const morph = getWordMorphology(cleanCode, wordObj.w, language);
  if (morph?.parsingDescription) {
    const match = morph.parsingDescription.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Tier 5: Contextual Interlinear Word Gloss / Parsing Description
  if (wordObj.t && wordObj.t !== wordObj.w) {
    return wordObj.t;
  }

  return morph?.parsingDescription || '';
}

interface CylinderRollerOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  ledColor?: 'green' | 'blue' | 'amber';
}

interface Cylinder3DRollerProps {
  options: CylinderRollerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
  minWidthClass?: string;
  deckTheme: any;
}

const Cylinder3DRoller: React.FC<Cylinder3DRollerProps> = ({
  options,
  selectedId,
  onSelect,
  title,
  minWidthClass,
  deckTheme,
}) => {
  const currentIndex = useMemo(() => {
    if (options.length === 0) return 0;
    const idx = options.findIndex((opt) => opt.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [options, selectedId]);

  const anglePerItem = 60;
  const radius = 18; // 18px drum depth radius for compact strip slot

  const [currentAngle, setCurrentAngle] = useState(() => currentIndex * anglePerItem);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartAngle = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const isGestureDecided = useRef(false);
  const isVerticalDrag = useRef(false);
  const angleRef = useRef(currentAngle);
  angleRef.current = currentAngle;

  useEffect(() => {
    setCurrentAngle(currentIndex * anglePerItem);
  }, [currentIndex, anglePerItem]);

  const rollTo = useCallback((targetIndex: number) => {
    if (options.length <= 1) return;
    const normalizedIdx = ((targetIndex % options.length) + options.length) % options.length;
    playHardwareClick(240 + normalizedIdx * 20, true);
    setCurrentAngle(targetIndex * anglePerItem);
    onSelect(options[normalizedIdx].id);
  }, [options, anglePerItem, onSelect]);

  const rollNext = useCallback(() => {
    const currentSlot = Math.round(angleRef.current / anglePerItem);
    rollTo(currentSlot + 1);
  }, [rollTo, anglePerItem]);

  const rollPrev = useCallback(() => {
    const currentSlot = Math.round(angleRef.current / anglePerItem);
    rollTo(currentSlot - 1);
  }, [rollTo, anglePerItem]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Record start coordinates without immediately capturing pointer,
    // allowing native horizontal swiping on the parent container (touch-action: pan-x).
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    lastY.current = e.clientY;
    dragStartAngle.current = angleRef.current;
    lastTime.current = performance.now();
    velocity.current = 0;
    isGestureDecided.current = false;
    isVerticalDrag.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const diffX = Math.abs(e.clientX - dragStartX.current);
    const diffY = Math.abs(e.clientY - dragStartY.current);

    if (!isGestureDecided.current) {
      if (diffY >= 5 && diffY > diffX) {
        // Vertical gesture confirmed: lock into drum rolling mode!
        isGestureDecided.current = true;
        isVerticalDrag.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        setIsDragging(true);
        lastY.current = e.clientY;
        lastTime.current = performance.now();
      } else if (diffX >= 7 && diffX >= diffY) {
        // Horizontal gesture confirmed: let parent container swipe naturally!
        isGestureDecided.current = true;
        isVerticalDrag.current = false;
        return;
      } else {
        return;
      }
    }

    if (!isVerticalDrag.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastTime.current);
    const dy = dragStartY.current - e.clientY;
    const deltaY = lastY.current - e.clientY;

    velocity.current = (deltaY / dt) * 15;
    lastY.current = e.clientY;
    lastTime.current = now;

    setCurrentAngle(dragStartAngle.current + dy * 0.55);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isVerticalDrag.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
      isVerticalDrag.current = false;
      isGestureDecided.current = false;

      const projectedAngle = angleRef.current + velocity.current * 3;
      const snapIndex = Math.round(projectedAngle / anglePerItem);
      const normalizedIdx = ((snapIndex % options.length) + options.length) % options.length;

      playHardwareClick(260 + normalizedIdx * 20, true);
      setCurrentAngle(snapIndex * anglePerItem);
      if (options[normalizedIdx]) {
        onSelect(options[normalizedIdx].id);
      }
    } else {
      isGestureDecided.current = false;
      isVerticalDrag.current = false;
      setIsDragging(false);
    }
  };

  return (
    <div
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY > 0) rollNext();
        else rollPrev();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative ${minWidthClass || 'min-w-[95px] sm:min-w-[115px]'} h-[30px] sm:h-[32px] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing select-none group border transition-all ${getTactileBtnClass(deckTheme, false)}`}
      title={`${title} (Swipe, spin wheel, or tap arrows to rotate)`}
      style={{ perspective: '400px', touchAction: 'pan-x' }}
    >
      {/* 3D Cylindrical Curved Shadows & Specular Lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white/20 via-white/5 to-transparent z-10" />

      {/* Knurled metallic side accents */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-r from-white/10 to-transparent z-10" />
      <div className="pointer-events-none absolute right-[21px] top-0 bottom-0 w-0.5 bg-gradient-to-l from-white/10 to-transparent z-10" />

      {/* 3D Rotating Drum Facet Pivot */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateZ(-${radius}px) rotateX(${-currentAngle}deg)`,
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform'
        }}
      >
        {options.map((opt, idx) => {
          const facetAngle = idx * anglePerItem;
          let diff = ((facetAngle - currentAngle) % 360);
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          const absDiff = Math.abs(diff);
          const isVisible = absDiff <= 85;
          const norm = Math.max(0.1, 1 - absDiff / 85);

          return (
            <div
              key={opt.id}
              className="absolute inset-0 h-[30px] sm:h-[32px] flex items-center px-2 pr-6 gap-1.5 backface-hidden"
              style={{
                transform: `rotateX(${facetAngle}deg) translateZ(${radius}px)`,
                opacity: isVisible ? norm : 0,
                filter: isVisible ? `brightness(${(0.45 + 0.55 * norm).toFixed(2)})` : 'brightness(0.45)',
                pointerEvents: absDiff < 30 ? 'auto' : 'none'
              }}
            >
              {opt.icon && <span className="opacity-80 shrink-0">{opt.icon}</span>}
              {opt.ledColor && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.ledColor === 'green' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : opt.ledColor === 'amber' ? 'bg-amber-400' : 'bg-blue-400'}`} />
              )}
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight truncate text-[#faf6f0]">
                {opt.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cylinder Stepper Roller Dial (Micro Chevrons) */}
      {options.length > 1 && (
        <div className="absolute right-0 top-0 bottom-0 w-[20px] flex flex-col items-center justify-center bg-black/40 border-l border-white/10 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              rollPrev();
            }}
            className="w-full h-1/2 flex items-center justify-center text-zinc-400 hover:text-white active:scale-75 transition-transform cursor-pointer"
            title="Roll Previous"
          >
            <ChevronUp className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              rollNext();
            }}
            className="w-full h-1/2 flex items-center justify-center text-zinc-400 hover:text-white active:scale-75 transition-transform cursor-pointer"
            title="Roll Next"
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const BibleSelectionPanel: React.FC<BibleSelectionPanelProps> = React.memo(({
  currentLowerThird,
  isVisible,
  onUpdateLowerThird,
  onToggleVisibility,
  scriptureViewMode = 'lower-third',
  onScriptureViewModeChange,
  isFullScreenPip = false,
  onToggleFullScreenPip,
  theme = 'dark',
  lowerThirdBgColor = 'white',
  onLowerThirdBgColorChange,
  onPreviewScroll,
  scriptureTypeface,
  isScriptureBold
}) => {
  const [deckTheme] = useStudioDeckTheme();
  const themeTokens = getStudioThemeTokens(deckTheme);

  // Typography State synced with Settings & Main Reading View
  const [activeTypeface, setActiveTypeface] = useState<string>(() => {
    try {
      return scriptureTypeface || localStorage.getItem('logosbridge_scripture_typeface') || 'untitled-serif';
    } catch {
      return scriptureTypeface || 'untitled-serif';
    }
  });
  const [activeIsBold, setActiveIsBold] = useState<boolean>(() => {
    try {
      if (typeof isScriptureBold === 'boolean') return isScriptureBold;
      return localStorage.getItem('logosbridge_scripture_bold') === 'true';
    } catch {
      return isScriptureBold || false;
    }
  });

  useEffect(() => {
    if (scriptureTypeface) setActiveTypeface(scriptureTypeface);
  }, [scriptureTypeface]);

  useEffect(() => {
    if (typeof isScriptureBold === 'boolean') setActiveIsBold(isScriptureBold);
  }, [isScriptureBold]);

  useEffect(() => {
    const handleTypeface = (e: any) => {
      const next = e?.detail?.typeface || localStorage.getItem('logosbridge_scripture_typeface') || 'untitled-serif';
      setActiveTypeface(next);
    };
    const handleBold = (e: any) => {
      const next = typeof e?.detail?.isBold === 'boolean'
        ? e.detail.isBold
        : localStorage.getItem('logosbridge_scripture_bold') === 'true';
      setActiveIsBold(next);
    };
    window.addEventListener('logosbridge_typeface_changed', handleTypeface);
    window.addEventListener('logosbridge_bold_changed', handleBold);
    window.addEventListener('storage', handleTypeface);
    return () => {
      window.removeEventListener('logosbridge_typeface_changed', handleTypeface);
      window.removeEventListener('logosbridge_bold_changed', handleBold);
      window.removeEventListener('storage', handleTypeface);
    };
  }, []);

  const fontClass = getCssScriptureFontClass(activeTypeface);

  const [selectedBook, setSelectedBook] = useState<string>(() => {
    return currentLowerThird?.book || localStorage.getItem('logosbridge_last_book') || 'Genesis';
  });
  const [selectedChapter, setSelectedChapter] = useState<number>(() => {
    if (currentLowerThird?.chapter) return currentLowerThird.chapter;
    const saved = localStorage.getItem('logosbridge_last_chapter');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  });
  const [selectedVerse, setSelectedVerse] = useState<number | null>(currentLowerThird?.verse || 1);
  const [loadedVerses, setLoadedVerses] = useState<Verse[]>(() => {
    if (currentLowerThird?.allVerses && currentLowerThird.allVerses.length > 0) {
      return currentLowerThird.allVerses;
    }
    const book = currentLowerThird?.book || localStorage.getItem('logosbridge_last_book') || 'Genesis';
    const ch = currentLowerThird?.chapter || parseInt(localStorage.getItem('logosbridge_last_chapter') || '1', 10) || 1;
    const bookKey = Object.keys(STATIC_CHAPTERS).find(
      (b) => b.toLowerCase() === book.toLowerCase()
    );
    const bookChapters = bookKey ? STATIC_CHAPTERS[bookKey] : undefined;
    const staticCh = bookChapters ? bookChapters[ch] : undefined;
    return staticCh?.verses || [];
  });
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<StudyMode>(
    currentLowerThird?.displayMode === 'interlinear' ? 'interlinear' : 'standard'
  );

  useEffect(() => {
    if (currentLowerThird?.displayMode) {
      setStudyMode(currentLowerThird.displayMode);
    }
  }, [currentLowerThird?.displayMode]);

  // Strong's Study Database State
  const [strongsDb, setStrongsDb] = useState<any>(() => globalStrongsDbCache);

  useEffect(() => {
    if (!strongsDb) {
      getLoadedStrongsDb().then((db) => {
        if (db) setStrongsDb(db);
      });
    }
  }, [strongsDb]);

  // Interlinear Dataset for current Book & Chapter
  const [interlinearData, setInterlinearData] = useState<{
    language: 'Hebrew' | 'Greek';
    verses: Record<number, InterlinearVerse>;
  } | null>(null);
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null);
  const bookLanguage = useMemo(() => getBookLanguage(selectedBook), [selectedBook]);

  // M3 Navigation Drawer Bottom Sheet State (Mirrors Read View)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(selectedBook);

  // 3D Drum Roller Options & Handlers for Canvas Display View & Scripture Study Mode
  const canvasViewOptions: CylinderRollerOption[] = useMemo(() => [
    { id: 'lower-third', label: 'Lower 3rd' },
    { id: 'full-screen', label: 'Full Screen' },
    { id: 'full-screen-pip', label: 'Full + PIP', ledColor: 'green' }
  ], []);

  const currentCanvasViewId = useMemo(() => {
    if (scriptureViewMode === 'full-screen') {
      return isFullScreenPip ? 'full-screen-pip' : 'full-screen';
    }
    return 'lower-third';
  }, [scriptureViewMode, isFullScreenPip]);

  const handleSelectCanvasView = useCallback((id: string) => {
    if (id === 'lower-third') {
      onScriptureViewModeChange?.('lower-third');
      onToggleFullScreenPip?.(false);
      if (currentLowerThird) {
        onUpdateLowerThird({
          ...currentLowerThird,
          canvasViewMode: 'lower-third',
          isFullScreenPip: false,
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
          theme
        }, isVisible);
      }
    } else if (id === 'full-screen') {
      onScriptureViewModeChange?.('full-screen');
      onToggleFullScreenPip?.(false);
      if (currentLowerThird) {
        onUpdateLowerThird({
          ...currentLowerThird,
          displayMode: studyMode,
          canvasViewMode: 'full-screen',
          isFullScreenPip: false,
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
          theme
        }, isVisible);
      }
    } else if (id === 'full-screen-pip') {
      onScriptureViewModeChange?.('full-screen');
      onToggleFullScreenPip?.(true);
      if (currentLowerThird) {
        onUpdateLowerThird({
          ...currentLowerThird,
          displayMode: studyMode,
          canvasViewMode: 'full-screen',
          isFullScreenPip: true,
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
          theme
        }, isVisible);
      }
    }
  }, [onScriptureViewModeChange, onToggleFullScreenPip, onUpdateLowerThird, currentLowerThird, loadedVerses, interlinearData?.verses, theme, isVisible, studyMode]);

  const scriptureTextOptions: CylinderRollerOption[] = useMemo(() => [
    { id: 'standard', label: 'KJV' },
    { id: 'interlinear', label: 'Interlinear' }
  ], []);

  const handleSelectScriptureTextMode = useCallback((id: string) => {
    if (id === 'standard') {
      setStudyMode('standard');
      if (currentLowerThird) {
        onUpdateLowerThird({
          ...currentLowerThird,
          displayMode: 'standard',
          selectedWord: null,
          canvasViewMode: scriptureViewMode || 'lower-third',
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
          theme
        }, isVisible);
      }
    } else if (id === 'interlinear') {
      setStudyMode('interlinear');
      if (currentLowerThird) {
        const interVerse = interlinearData?.verses?.[currentLowerThird.verse || 1];
        const msWords = interVerse?.words || [];
        const translitLine = msWords.length > 0
          ? msWords.map((w) => w.tr || getWordTransliteration(w.w, bookLanguage)).join(' ')
          : (interVerse?.manuscriptText || '');
        onUpdateLowerThird({
          ...currentLowerThird,
          displayMode: 'interlinear',
          manuscriptText: translitLine,
          interlinearWords: msWords,
          language: bookLanguage,
          canvasViewMode: scriptureViewMode || 'lower-third',
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
          theme
        }, isVisible);
      }
    }
  }, [setStudyMode, currentLowerThird, onUpdateLowerThird, scriptureViewMode, loadedVerses, interlinearData?.verses, theme, isVisible, bookLanguage]);

  // Study View & Highlights
  const [savedVerses, setSavedVerses] = useState<Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>>(() => {
    try {
      const saved = localStorage.getItem('saved_bible_study_verses');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((sv) => sv && typeof sv === 'object' && typeof sv.book === 'string')
        : [];
    } catch {
      return [];
    }
  });

  const [focusedVerse, setFocusedVerse] = useState<Verse | null>(null);

  // Audio Playback (TTS) State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_playback_speed');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [currentlyReadingVerse, setCurrentlyReadingVerse] = useState<number | null>(null);
  const audioSessionRef = useRef<number>(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const currentChapterKey = `${selectedBook}-${selectedChapter}`;
  const prevChapterKeyRef = useRef(currentChapterKey);

  useEffect(() => {
    if (prevChapterKeyRef.current !== currentChapterKey) {
      prevChapterKeyRef.current = currentChapterKey;
      setSelectedVerse(1);
      setSelectedWordKey(null);
      if (previewContainerRef.current) {
        previewContainerRef.current.scrollTop = 0;
      }
      onPreviewScroll?.(0);
    }
  }, [currentChapterKey, onPreviewScroll]);

  // Book metadata & index for stepping
  const currentBookIndex = useMemo(() => {
    return BIBLE_BOOKS.findIndex((b) => b.name.toLowerCase() === selectedBook.toLowerCase());
  }, [selectedBook]);

  const bookMeta = useMemo(() => {
    return BIBLE_BOOKS[currentBookIndex] || BIBLE_BOOKS[0];
  }, [currentBookIndex]);

  // Cross Reference State (Mirrors Main Reading View)
  const [attachedCrossRefs, setAttachedCrossRefs] = useState<Array<{ ref: string; text: string }>>(() => {
    return currentLowerThird?.attachedCrossRefs || [];
  });
  const [isCrossRefOpen, setIsCrossRefOpen] = useState<boolean>(false);
  const [crossRefInputText, setCrossRefInputText] = useState<string>('');
  const [activeDraftVerse, setActiveDraftVerse] = useState<number | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');
  const [inlineContextRef, setInlineContextRef] = useState<string | null>(null);
  const [, setCrossRefUpdateTick] = useState(0);

  // Double-tap & double-click tracking for Theological Study mode in BibleSelectionPanel
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const interDoubleTapRef = useRef<{ verseNumber: number; time: number } | null>(null);
  const lastTouchDoubleTapTimeRef = useRef<number>(0);

  const handleToggleCrossRefOpen = (open: boolean) => {
    setIsCrossRefOpen(open);
    if (!open) {
      setAttachedCrossRefs([]);
      if (inlineContextRef) setInlineContextRef(null);
      if (currentLowerThird) {
        onUpdateLowerThird(
          {
            ...currentLowerThird,
            isCrossRefOpen: false,
            attachedCrossRefs: [],
            inlineContextRef: null
          },
          isVisible
        );
      }
    } else {
      if (currentLowerThird) {
        onUpdateLowerThird(
          {
            ...currentLowerThird,
            isCrossRefOpen: true
          },
          isVisible
        );
      }
    }
  };

  const toggleVerseCrossRef = (vNo: number) => {
    if (activeDraftVerse === vNo) {
      handleCancelNote();
    } else {
      setActiveDraftVerse(vNo);
      handleToggleCrossRefOpen(false);
    }
  };

  const handleVerseTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleVerseTouchEnd = (e: React.TouchEvent, vNo: number) => {
    if (touchStartPosRef.current && e.changedTouches && e.changedTouches.length > 0) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartPosRef.current.y);
      if (dx > 14 || dy > 14) {
        touchStartPosRef.current = null;
        return;
      }
    }
    touchStartPosRef.current = null;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 450;
    if (
      interDoubleTapRef.current &&
      interDoubleTapRef.current.verseNumber === vNo &&
      (now - interDoubleTapRef.current.time) < DOUBLE_TAP_DELAY
    ) {
      lastTouchDoubleTapTimeRef.current = now;
      interDoubleTapRef.current = null;
      toggleVerseCrossRef(vNo);
    } else {
      interDoubleTapRef.current = { verseNumber: vNo, time: now };
    }
  };

  const handleVerseDoubleClick = (e: React.MouseEvent, vNo: number) => {
    e.stopPropagation();
    if (Date.now() - lastTouchDoubleTapTimeRef.current < 750) {
      return;
    }
    toggleVerseCrossRef(vNo);
  };

  useEffect(() => {
    return subscribeToCrossReferenceUpdates(() => {
      setCrossRefUpdateTick((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    if (currentLowerThird?.attachedCrossRefs !== undefined) {
      setAttachedCrossRefs(currentLowerThird.attachedCrossRefs || []);
    }
  }, [currentLowerThird?.attachedCrossRefs]);

  const attachCrossRef = (refStr: string, keepOpen: boolean = true) => {
    if (!refStr) return;
    const trimmed = refStr.trim();

    const isAlreadyActive = attachedCrossRefs.some((item) => item.ref === trimmed);
    let newCrossRefs: Array<{ ref: string; text: string }> = [];
    if (isAlreadyActive) {
      newCrossRefs = attachedCrossRefs.filter((item) => item.ref !== trimmed);
      setAttachedCrossRefs(newCrossRefs);
      if (inlineContextRef === trimmed) setInlineContextRef(null);
    } else {
      const syncText = getSyncVerseText(trimmed) || 'Scripture cross-reference linked.';
      const newEntry = { ref: trimmed, text: syncText };
      newCrossRefs = [...attachedCrossRefs, newEntry];
      setAttachedCrossRefs(newCrossRefs);
      if (inlineContextRef) setInlineContextRef(null);
      addUserCrossReference(selectedBook, selectedChapter, activeDraftVerse || selectedVerse, trimmed);

      getVerseTextByReference(trimmed).then((fullText) => {
        if (fullText && fullText !== 'Scripture cross-reference linked.') {
          setAttachedCrossRefs((prev) => {
            const updated = prev.map((item) => (item.ref === trimmed ? { ...item, text: fullText } : item));
            if (currentLowerThird) {
              onUpdateLowerThird(
                {
                  ...currentLowerThird,
                  attachedCrossRefs: updated
                },
                isVisible
              );
            }
            return updated;
          });
        }
      });
    }

    if (!keepOpen) {
      setIsCrossRefOpen(false);
    }
    setCrossRefInputText('');

    if (currentLowerThird) {
      onUpdateLowerThird(
        {
          ...currentLowerThird,
          isCrossRefOpen: true,
          attachedCrossRefs: newCrossRefs
        },
        isVisible
      );
    }
  };

  const handleInlineContextChange = (ref: string | null) => {
    setInlineContextRef(ref);
    if (currentLowerThird) {
      onUpdateLowerThird(
        {
          ...currentLowerThird,
          inlineContextRef: ref
        },
        isVisible
      );
    }
  };

  const removeCrossRef = (refStr: string) => {
    removeUserCrossReference(selectedBook, selectedChapter, activeDraftVerse || selectedVerse, refStr);
    const updated = attachedCrossRefs.filter((item) => item.ref !== refStr);
    setAttachedCrossRefs(updated);
    const newInlineRef = inlineContextRef === refStr ? null : inlineContextRef;
    if (inlineContextRef === refStr) setInlineContextRef(null);
    if (currentLowerThird) {
      onUpdateLowerThird(
        {
          ...currentLowerThird,
          attachedCrossRefs: updated,
          inlineContextRef: newInlineRef
        },
        isVisible
      );
    }
  };

  const handleCancelNote = () => {
    setActiveDraftVerse(null);
    handleToggleCrossRefOpen(false);
  };


  // Load verses whenever Book or Chapter changes
  useEffect(() => {
    let isCancelled = false;

    // 1. Instant Frame-0 Check from STATIC_CHAPTERS cache (Zero loading delay)
    const bookKey = Object.keys(STATIC_CHAPTERS).find(
      (b) => b.toLowerCase() === selectedBook.toLowerCase()
    );
    const bookChapters = bookKey ? STATIC_CHAPTERS[bookKey] : undefined;
    const staticCh = bookChapters ? bookChapters[selectedChapter] : undefined;

    if (staticCh && staticCh.verses && staticCh.verses.length > 0) {
      setLoadedVerses(staticCh.verses);
      setIsLoadingVerses(false);

      // Asynchronously backfill if bundled KJV has additional verses
      getBundledKjvChapter(selectedBook, selectedChapter).then((bundled) => {
        if (!isCancelled && bundled && bundled.verses && bundled.verses.length > staticCh.verses.length) {
          setLoadedVerses(bundled.verses);
        }
      }).catch((e) => console.warn('Live studio verse backfill error:', e));
      return;
    }

    setIsLoadingVerses(true);

    async function loadChapterVerses() {

      // 2. Check IndexedDB Offline Bible Storage
      try {
        const offlineData = await getOfflineChapter(selectedBook, selectedChapter);
        if (!isCancelled && offlineData && offlineData.verses && offlineData.verses.length > 0) {
          setLoadedVerses(offlineData.verses);
          setIsLoadingVerses(false);
          return;
        }
      } catch (err) {
        console.warn('Failed reading offline chapter:', err);
      }

      // 3. Fallback bundled dataset
      try {
        const bundled = await getBundledKjvChapter(selectedBook, selectedChapter);
        if (!isCancelled && bundled && bundled.verses && bundled.verses.length > 0) {
          setLoadedVerses(bundled.verses);
          setIsLoadingVerses(false);
          return;
        }
      } catch (err) {
        console.warn('Failed reading bundled chapter:', err);
      }

      // 4. Default empty placeholder count
      if (!isCancelled) {
        const fallbackCount = selectedBook.toLowerCase() === 'psalms' && selectedChapter === 119 ? 176 : 35;
        const defaultVerses: Verse[] = Array.from({ length: fallbackCount }, (_, i) => ({
          verseNumber: i + 1,
          kjvText: '',
          bsbText: '',
          contemporary: '',
          nonNativeEnglish: '',
          specialWords: []
        }));
        setLoadedVerses(defaultVerses);
        setIsLoadingVerses(false);
      }
    }

    loadChapterVerses();

    return () => {
      isCancelled = true;
    };
  }, [selectedBook, selectedChapter]);

  // Load offline interlinear manuscript dataset for current chapter
  useEffect(() => {
    let isCancelled = false;
    getOfflineManuscriptChapter(selectedBook, selectedChapter)
      .then((data) => {
        if (!isCancelled) {
          setInterlinearData(data);
        }
      })
      .catch((e) => {
        console.warn('Failed to load interlinear chapter:', e);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBook, selectedChapter]);

  // Automatically synchronize loaded chapter verses & interlinear data to currentLowerThird for canvas rendering
  useEffect(() => {
    if (loadedVerses.length > 0 && currentLowerThird) {
      const isNewBookOrChapter =
        currentLowerThird.book !== selectedBook ||
        currentLowerThird.chapter !== selectedChapter;

      const needsSync =
        !currentLowerThird.allVerses ||
        currentLowerThird.allVerses.length !== loadedVerses.length ||
        isNewBookOrChapter ||
        (!currentLowerThird.allInterlinearVerses && !!interlinearData?.verses);

      if (needsSync) {
        // When book or chapter changes, always start cleanly from verse 1
        const cleanVerse = isNewBookOrChapter ? 1 : (selectedVerse || currentLowerThird.verse || 1);
        const found = loadedVerses.find((v) => v.verseNumber === cleanVerse) || loadedVerses[0];
        const cleanText = found?.kjvText ? stripSuppliedMarkup(found.kjvText).trim() : currentLowerThird.text;

        onUpdateLowerThird({
          ...currentLowerThird,
          book: selectedBook,
          chapter: selectedChapter,
          verse: cleanVerse,
          text: cleanText,
          allVerses: loadedVerses,
          allInterlinearVerses: interlinearData?.verses,
        }, isVisible);
      }
    }
  }, [loadedVerses, interlinearData?.verses, selectedBook, selectedChapter]);

  // Pericope story chunks calculation (identically mirrors NarrativeStream)
  const storyChunks = useMemo(() => {
    return groupVersesByStory(loadedVerses, selectedBook, selectedChapter);
  }, [loadedVerses, selectedBook, selectedChapter]);

  // Verse Highlight Helpers
  const getVerseHighlight = (verseNum: number) => {
    if (!Array.isArray(savedVerses)) return undefined;
    const vNum = Number(verseNum);
    const chNum = Number(selectedChapter);
    const bName = (selectedBook || '').trim().toLowerCase();
    return savedVerses.find(
      (sv) =>
        sv &&
        typeof sv === 'object' &&
        typeof sv.book === 'string' &&
        sv.book.trim().toLowerCase() === bName &&
        Number(sv.chapter) === chNum &&
        Number(sv.verse) === vNum
    );
  };

  const setVerseHighlightColor = (verseNum: number, color: string) => {
    const vNum = Number(verseNum);
    const chNum = Number(selectedChapter);
    const bName = (selectedBook || '').trim();
    const bNameLower = bName.toLowerCase();

    setSavedVerses((prev) => {
      const safePrev = (Array.isArray(prev) ? prev : []).filter(
        (sv) => sv && typeof sv === 'object' && typeof sv.book === 'string'
      );
      const exists = safePrev.some(
        (sv) => sv.book.trim().toLowerCase() === bNameLower && Number(sv.chapter) === chNum && Number(sv.verse) === vNum
      );
      let updated;
      if (exists) {
        updated = safePrev.map((sv) =>
          sv.book.trim().toLowerCase() === bNameLower && Number(sv.chapter) === chNum && Number(sv.verse) === vNum
            ? { ...sv, color: color === 'none' ? undefined : color }
            : sv
        );
      } else {
        updated = [...safePrev, { book: bName, chapter: chNum, verse: vNum, color: color === 'none' ? undefined : color }];
      }
      try {
        localStorage.setItem('saved_bible_study_verses', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save highlight:', e);
      }
      return updated;
    });
  };

  const isVerseSaved = (verseNum: number) => {
    return !!getVerseHighlight(verseNum)?.color || !!getVerseHighlight(verseNum)?.notes;
  };

  const toggleSaveVerse = (verseNum: number) => {
    const current = getVerseHighlight(verseNum)?.color;
    setVerseHighlightColor(verseNum, current ? 'none' : 'yellow');
  };

  // Audio Playback
  const stopSpeaking = () => {
    audioSessionRef.current = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setCurrentlyReadingVerse(null);
  };

  const playSingleVerse = (verseNo: number, text: string) => {
    stopSpeaking();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const clean = stripSuppliedMarkup(text);
    const utterance = new SpeechSynthesisUtterance(`Verse ${verseNo}, ${clean}`);
    utterance.rate = playbackSpeed;
    setCurrentlyReadingVerse(verseNo);
    setIsPlayingAudio(true);

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setCurrentlyReadingVerse(null);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setCurrentlyReadingVerse(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const playTranslationStream = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      return;
    }
    if (!loadedVerses || loadedVerses.length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const sessionId = Date.now();
    audioSessionRef.current = sessionId;
    setIsPlayingAudio(true);

    let idx = 0;
    const playNext = () => {
      if (audioSessionRef.current !== sessionId || idx >= loadedVerses.length) {
        setIsPlayingAudio(false);
        setCurrentlyReadingVerse(null);
        return;
      }
      const v = loadedVerses[idx];
      setCurrentlyReadingVerse(v.verseNumber);

      const raw = v.kjvText || '';
      const clean = stripSuppliedMarkup(raw);
      const utterance = new SpeechSynthesisUtterance(`Verse ${v.verseNumber}, ${clean}`);
      utterance.rate = playbackSpeed;

      utterance.onend = () => {
        if (audioSessionRef.current === sessionId) {
          idx++;
          playNext();
        }
      };
      utterance.onerror = () => {
        if (audioSessionRef.current === sessionId) {
          idx++;
          playNext();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    playNext();
  };

  // Instant Live Broadcast Projection from Narrative Stream (Standard Mode)
  const handleVerseSelect = (v: Verse) => {
    setSelectedVerse(v.verseNumber);
    setSelectedWordKey(null);
    const clean = stripSuppliedMarkup(v.kjvText || '').trim();
    const interVerse = interlinearData?.verses?.[v.verseNumber];
    const msWords = interVerse?.words || v.interlinearWords || [];
    const translitLine = msWords.length > 0
      ? msWords.map((w) => w.tr || getWordTransliteration(w.w, bookLanguage)).join(' ')
      : (interVerse?.manuscriptText || v.manuscriptText || '');

    onUpdateLowerThird(
      {
        book: selectedBook,
        chapter: selectedChapter,
        verse: v.verseNumber,
        text: clean,
        displayMode: studyMode,
        canvasViewMode: scriptureViewMode || 'lower-third',
        manuscriptText: studyMode === 'interlinear' ? translitLine : undefined,
        interlinearWords: msWords,
        language: bookLanguage,
        selectedWord: null,
        allVerses: loadedVerses,
        allInterlinearVerses: interlinearData?.verses,
        theme,
        attachedCrossRefs
      },
      isVisible
    );
  };

  // Instant Live Root Action Projection (When user clicks a manuscript word in Interlinear mode)
  const handleSelectManuscriptWord = (
    v: Verse,
    wordObj: InterlinearWord,
    wordIdx: number
  ) => {
    setSelectedVerse(v.verseNumber);
    const key = `w-${v.verseNumber}-${wordIdx}`;
    setSelectedWordKey(key);

    const clean = stripSuppliedMarkup(v.kjvText || '').trim();
    const interVerse = interlinearData?.verses?.[v.verseNumber];
    const msWords = interVerse?.words || v.interlinearWords || [];
    const translitLine = msWords.length > 0
      ? msWords.map((w) => w.tr || getWordTransliteration(w.w, bookLanguage)).join(' ')
      : (interVerse?.manuscriptText || v.manuscriptText || '');

    const currentVerseRef = `${selectedBook} ${selectedChapter}:${v.verseNumber}`;
    const morph = getWordMorphology(wordObj.n, wordObj.w, bookLanguage);
    const rootMeaning = resolveAuthenticRootAction(wordObj, currentVerseRef, bookLanguage, strongsDb);
    const wordTranslit = (wordObj as any).tr || getWordTransliteration(wordObj.w, bookLanguage);

    onUpdateLowerThird(
      {
        book: selectedBook,
        chapter: selectedChapter,
        verse: v.verseNumber,
        text: clean,
        displayMode: 'interlinear',
        canvasViewMode: scriptureViewMode || 'lower-third',
        manuscriptText: translitLine,
        interlinearWords: msWords,
        language: bookLanguage,
        selectedWord: {
          word: wordObj.t || wordObj.w,
          originalValue: wordTranslit,
          language: bookLanguage,
          strongsNumber: wordObj.n,
          parsingTag: wordObj.p || morph.parsingTag,
          parsingDescription: morph.parsingDescription,
          rootMeaning: rootMeaning,
          explanation: `Strong's ${wordObj.n || 'N/A'} [${wordObj.p || morph.parsingTag}]: ${rootMeaning}`
        },
        allVerses: loadedVerses,
        allInterlinearVerses: interlinearData?.verses,
        theme,
        attachedCrossRefs
      },
      isVisible
    );
  };

  // Instant Clear of Root Action Banner (returns lower third to full verse display)
  const handleClearRootAction = () => {
    setSelectedWordKey(null);
    if (currentLowerThird) {
      onUpdateLowerThird(
        {
          ...currentLowerThird,
          selectedWord: null
        },
        isVisible
      );
    }
  };

  // Steppers for Reader Pill Capsule
  const handlePrevChapter = () => {
    stopSpeaking();
    setSelectedWordKey(null);
    let newCh = selectedChapter;
    let newBk = selectedBook;
    if (selectedChapter > 1) {
      newCh = selectedChapter - 1;
    } else if (currentBookIndex > 0) {
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      newBk = prevBook.name;
      newCh = prevBook.chapters;
    } else {
      return;
    }
    setSelectedBook(newBk);
    setSelectedChapter(newCh);
    setSelectedVerse(1);
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
    }
    if (currentLowerThird) {
      onUpdateLowerThird({
        ...currentLowerThird,
        book: newBk,
        chapter: newCh,
        verse: 1,
        selectedWord: null,
        inlineContextRef: null
      }, isVisible);
    }
  };

  const handleNextChapter = () => {
    stopSpeaking();
    setSelectedWordKey(null);
    let newCh = selectedChapter;
    let newBk = selectedBook;
    if (selectedChapter < bookMeta.chapters) {
      newCh = selectedChapter + 1;
    } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      newBk = nextBook.name;
      newCh = 1;
    } else {
      return;
    }
    setSelectedBook(newBk);
    setSelectedChapter(newCh);
    setSelectedVerse(1);
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
    }
    if (currentLowerThird) {
      onUpdateLowerThird({
        ...currentLowerThird,
        book: newBk,
        chapter: newCh,
        verse: 1,
        selectedWord: null,
        inlineContextRef: null
      }, isVisible);
    }
  };

  const applyVerseSelection = (verseNum: number, autoClose = true) => {
    setSelectedVerse(verseNum);
    setSelectedWordKey(null);
    const found = loadedVerses.find((v) => v.verseNumber === verseNum);
    const verseText = found && found.kjvText ? stripSuppliedMarkup(found.kjvText).trim() : '';
    const interVerse = interlinearData?.verses?.[verseNum];
    const msWords = interVerse?.words || found?.interlinearWords || [];
    const translitLine = msWords.length > 0
      ? msWords.map((w) => w.tr || getWordTransliteration(w.w, bookLanguage)).join(' ')
      : (interVerse?.manuscriptText || found?.manuscriptText || '');

    onUpdateLowerThird(
      {
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum,
        text: verseText || undefined,
        displayMode: studyMode,
        canvasViewMode: scriptureViewMode || 'lower-third',
        manuscriptText: studyMode === 'interlinear' ? translitLine : undefined,
        interlinearWords: msWords,
        language: bookLanguage,
        selectedWord: null,
        allVerses: loadedVerses,
        allInterlinearVerses: interlinearData?.verses,
        theme
      },
      isVisible
    );

    if (autoClose) {
      setIsBottomSheetOpen(false);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${themeTokens.containerBg} text-[#faf6f0] p-2 sm:p-3 pb-2 sm:pb-2.5 rounded-2xl border shadow-xl select-none`}>

      {/* ── 1. Unified Compact Broadcast Control Strip ── */}
      <div
        className={`flex items-center gap-1.5 p-1 sm:p-1.5 ${themeTokens.stripBg} rounded-xl border shadow-inner select-none flex-nowrap overflow-x-auto no-scrollbar touch-pan-x relative z-20 overscroll-x-contain pr-4 sm:pr-3`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
      >
        {/* Left: Lower-Third Book Icon + Stepper */}
        <div className="flex items-center gap-1 shrink-0">
          <div className={`p-1 rounded-lg ${themeTokens.pillBg} ${themeTokens.subtleText} border ${themeTokens.cardBorder} hidden xs:flex items-center justify-center shrink-0`} title="Scripture Control">
            <BookOpen className="w-3.5 h-3.5" />
          </div>

          <div className={`flex items-center ${themeTokens.stripBg} rounded-lg p-0.5 border shrink-0 gap-0.5`}>
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                handlePrevChapter();
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center cursor-pointer touch-manipulation ${getTactileBtnClass(deckTheme, { color: 'default', size: 'sm', active: false })}`}
              title="Previous Chapter"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playHardwareClick();
                setExpandedBook(selectedBook);
                setIsBottomSheetOpen(true);
              }}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 cursor-pointer touch-manipulation rounded-md ${getTactileBtnClass(deckTheme, { color: 'default', size: 'sm', active: isBottomSheetOpen })}`}
              title="Select Book and Chapter"
            >
              <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap">
                {selectedBook} {selectedChapter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                handleNextChapter();
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center cursor-pointer touch-manipulation ${getTactileBtnClass(deckTheme, { color: 'default', size: 'sm', active: false })}`}
              title="Next Chapter"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Section: [ 3D Canvas View Roller ] + [ 3D Text Mode Roller ] + Audio + Live */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0 ml-1 sm:ml-auto">
          {/* Canvas Display View 3D Cylinder Drum Roller */}
          <Cylinder3DRoller
            options={canvasViewOptions}
            selectedId={currentCanvasViewId}
            onSelect={handleSelectCanvasView}
            title="Canvas Display View Mode"
            minWidthClass="min-w-[105px] sm:min-w-[125px]"
            deckTheme={deckTheme}
          />

          {/* Scripture Text Mode 3D Cylinder Drum Roller */}
          <Cylinder3DRoller
            options={scriptureTextOptions}
            selectedId={studyMode}
            onSelect={handleSelectScriptureTextMode}
            title="Scripture Text Mode"
            minWidthClass="min-w-[88px] sm:min-w-[110px]"
            deckTheme={deckTheme}
          />

          {/* Live / Hidden Stream Toggle */}
          <button
            type="button"
            onClick={() => {
              playHardwareClick();
              onToggleVisibility();
            }}
            className={`h-7 sm:h-7.5 px-2 sm:px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 touch-manipulation ${getTactileBtnClass(deckTheme, { color: isVisible ? 'success' : 'default', size: 'sm', active: isVisible })}`}
            title={isVisible ? 'Hide from live stream' : 'Show on live stream'}
          >
            {isVisible ? (
              <>
                <span className={getTactileLedClass(true, 'green')} />
                <span className="text-[10px] sm:text-[11px] font-bold">Live</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 opacity-70" />
                <span className="text-[10px] sm:text-[11px]">Hidden</span>
              </>
            )}
          </button>
        </div>
      </div>



      {/* ── Main Scripture Container (Clamped for Zero-Scroll Viewport Fit) ── */}
      <div
        ref={previewContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const maxScroll = el.scrollHeight - el.clientHeight;
          if (maxScroll > 0) {
            onPreviewScroll?.(el.scrollTop / maxScroll);
          }
        }}
        className={`relative rounded-xl border ${themeTokens.cardBorder} ${themeTokens.cardBg} p-2.5 sm:p-3.5 min-h-[240px] max-h-[280px] sm:min-h-[280px] sm:max-h-[330px] overflow-y-auto no-scrollbar ${fontClass} ${activeIsBold ? 'font-bold' : ''}`}
      >
        {isLoadingVerses ? (
          <div className={`py-8 flex flex-col items-center justify-center gap-2 ${themeTokens.mutedText} text-xs font-mono`}>
            <Loader2 className={`w-5 h-5 animate-spin ${themeTokens.accentText}`} />
            <span>Loading scripture chapter...</span>
          </div>
        ) : studyMode === 'interlinear' ? (() => {
          const isFullScreenMode = scriptureViewMode === 'full-screen' || currentLowerThird?.canvasViewMode === 'full-screen';
          return (
          /* ── INTERLINEAR STUDY MODE: Mirroring Main Study View Typography Scale & Word Clustering ── */
          <div className="flex flex-col divide-y divide-white/5">
            {loadedVerses.map((v) => {
              const vNo = v.verseNumber;
              const isLiveVerse = isVisible && currentLowerThird?.verse === vNo && currentLowerThird?.book === selectedBook && currentLowerThird?.chapter === selectedChapter;
              const isVerseSelected = selectedVerse === vNo || (currentLowerThird?.verse === vNo && currentLowerThird?.book === selectedBook && currentLowerThird?.chapter === selectedChapter);
              const interVerse = interlinearData?.verses?.[vNo];
              const words = interVerse?.words || v.interlinearWords || [];
              const thirdLineText = v.kjvText || '';

              // Deterministic Active Word Tracking matching Main Study Tab
              let activeWordIdx = -1;
              if (isVerseSelected && selectedWordKey && selectedWordKey.startsWith(`w-${vNo}-`)) {
                const parts = selectedWordKey.split('-');
                const parsedIdx = parseInt(parts[2], 10);
                if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < words.length) {
                  activeWordIdx = parsedIdx;
                }
              }
              if (isVerseSelected && activeWordIdx === -1 && words.length > 0) {
                if (currentLowerThird?.selectedWord?.strongsNumber) {
                  const foundIdx = words.findIndex((w) => w.n === currentLowerThird.selectedWord?.strongsNumber);
                  activeWordIdx = foundIdx >= 0 ? foundIdx : 0;
                } else {
                  activeWordIdx = 0;
                }
              }

              const activeWordObj = isVerseSelected && activeWordIdx >= 0 && words[activeWordIdx] ? words[activeWordIdx] : null;
              const matchedIndices = isVerseSelected && activeWordIdx >= 0 && thirdLineText
                ? getMatchedKjvTokenIndices(words, activeWordIdx, thirdLineText)
                : new Set<number>();
              const tokens = thirdLineText ? parseKjvRawTokens(thirdLineText) : [];

              const currentVerseRef = `${selectedBook} ${selectedChapter}:${vNo}`;
              const activeMorph = activeWordObj ? getWordMorphology(activeWordObj.n, activeWordObj.w, bookLanguage) : null;
              const activeRootAction = activeWordObj ? resolveAuthenticRootAction(activeWordObj, currentVerseRef, bookLanguage, strongsDb) : '';
              const activeParsingTag = activeWordObj?.p || activeMorph?.parsingTag || 'Morph';

              return (
                <div
                  key={`inter-verse-${vNo}`}
                  onTouchStart={handleVerseTouchStart}
                  onTouchEnd={(e) => handleVerseTouchEnd(e, vNo)}
                  onDoubleClick={(e) => handleVerseDoubleClick(e, vNo)}
                  onClick={() => handleVerseSelect(v)}
                  className={`py-3 sm:py-3.5 space-y-1.5 transition-colors select-none cursor-pointer -mx-1 px-1.5 rounded-lg ${
                    isVerseSelected
                      ? themeTokens.activeItemBg
                      : themeTokens.hoverItemBg
                  }`}
                  title={`Click to project ${selectedBook} ${selectedChapter}:${vNo} to canvas • Double-tap to open cross-reference`}
                >
                  {/* Top First Line: Stationary Verse Indicator + Single Unified Pill + Parsing Tag */}
                  <div className="flex items-center justify-between gap-2 min-h-[28px]">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {/* Stationary Verse Badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerseSelect(v);
                        }}
                        className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center font-mono select-none shrink-0 cursor-pointer ${
                          isVerseSelected
                            ? getTactileBtnClass(deckTheme, true, 'accent')
                            : getTactileBtnClass(deckTheme, false)
                        }`}
                        title={`Verse ${vNo} • Click to project verse to canvas`}
                      >
                        {vNo}
                      </button>

                      {/* Clickable Strong's Code + Theological Root Action (Borderless Typography) */}
                      {isVerseSelected && activeWordObj && (
                        <div className="inline-flex items-center gap-2 max-w-[320px] sm:max-w-[480px] md:max-w-[540px] py-0.5 transition-all overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const wIdx = words.indexOf(activeWordObj);
                              handleSelectManuscriptWord(v, activeWordObj, wIdx >= 0 ? wIdx : 0);
                            }}
                            className={`font-mono font-black text-xs sm:text-[13px] tracking-tight shrink-0 flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 ${themeTokens.highlightText} hover:underline underline-offset-2`}
                            title={`Strong's ${activeWordObj.n || '—'}`}
                          >
                            <span>{activeWordObj.n || '—'}</span>
                            <span className="text-[10px] opacity-75">↗</span>
                          </button>

                          <span className="text-zinc-600 select-none text-[11px] shrink-0">•</span>

                          <div
                            onScroll={(e) => {
                              const el = e.currentTarget;
                              const maxScroll = el.scrollWidth - el.clientWidth;
                              const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxScroll)) : 0;
                              if (currentLowerThird && currentLowerThird.selectedWord) {
                                onUpdateLowerThird(
                                  {
                                    ...currentLowerThird,
                                    selectedWord: {
                                      ...currentLowerThird.selectedWord,
                                      scrollRatio: ratio
                                    }
                                  },
                                  isVisible
                                );
                              }
                            }}
                            onMouseDown={(e) => {
                              const el = e.currentTarget;
                              const startX = e.pageX - el.offsetLeft;
                              const scrollLeft = el.scrollLeft;

                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const x = moveEvent.pageX - el.offsetLeft;
                                const walk = (x - startX) * 1.5;
                                if (Math.abs(walk) > 4) {
                                  (el as any)._hasDragged = true;
                                }
                                el.scrollLeft = scrollLeft - walk;
                              };

                              const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                                setTimeout(() => {
                                  (el as any)._hasDragged = false;
                                }, 120);
                              };

                              window.addEventListener('mousemove', onMouseMove);
                              window.addEventListener('mouseup', onMouseUp);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if ((e.currentTarget as any)._hasDragged) return;
                              if (currentLowerThird && currentLowerThird.selectedWord) {
                                onUpdateLowerThird(
                                  {
                                    ...currentLowerThird,
                                    selectedWord: {
                                      ...currentLowerThird.selectedWord,
                                      isExpanded: !currentLowerThird.selectedWord.isExpanded
                                    }
                                  },
                                  isVisible
                                );
                              }
                            }}
                            className={`flex items-center gap-1.5 text-[13.5px] sm:text-[14.5px] select-none flex-1 min-w-0 overflow-x-auto whitespace-nowrap ${themeTokens.highlightText} font-bold cursor-grab active:cursor-grabbing touch-pan-x no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-transform antialiased`}
                            title={`${activeRootAction} • Drag or scroll horizontally to pan for audience; tap to toggle 9:16 overlay`}
                          >
                            {activeRootAction && activeRootAction.includes('•') ? (
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
                                {activeRootAction.split('•').map((item: string, i: number) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <span className={`${themeTokens.mutedText} font-bold mx-0.5 text-xs select-none`}>•</span>}
                                    <span className={`${fontClass} font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${themeTokens.highlightText}`}>
                                      {item.trim()}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : (
                              <span className={`${fontClass} font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${themeTokens.highlightText}`}>
                                {activeRootAction || '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side: Grammatical Parsing Tag Badge (Active whether stream is Live or Hidden) */}
                    {isVerseSelected && activeWordObj && (
                      <span
                        className={`font-mono text-xs sm:text-[12.5px] font-black px-2.5 py-0.5 rounded border shrink-0 flex items-center gap-1 shadow-xs ${themeTokens.pillBg}`}
                        title={`Parsing: ${activeParsingTag}`}
                      >
                        <span>{activeParsingTag}</span>
                        <span className="text-[10px] opacity-75">↗</span>
                      </span>
                    )}
                  </div>

                  {/* Second Line: Flowing Manuscript Transliteration Words */}
                  {words && words.length > 0 ? (
                    <div
                      dir="ltr"
                      className={`${fontClass} text-xl sm:text-2xl ${activeIsBold ? 'font-black' : 'font-bold'} leading-normal tracking-wide flex flex-wrap gap-x-2.5 sm:gap-x-3 gap-y-1.5 pt-0.5 text-[#faf6f0] select-none text-left`}
                    >
                      {words.map((w, wIdx) => {
                        const wordKey = `w-${vNo}-${wIdx}`;
                        const isWordActive = isVerseSelected && activeWordIdx === wIdx;
                        const morph = getWordMorphology(w.n, w.w, bookLanguage);
                        const parsingTag = w.p || morph.parsingTag;
                        const displayWord = w.tr || getWordTransliteration(w.w, bookLanguage);

                        return (
                          <span
                            key={wordKey}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectManuscriptWord(v, w, wIdx);
                            }}
                            className={`cursor-pointer select-none transition-colors active:scale-95 ${
                              isWordActive
                                ? `${themeTokens.highlightText} font-black`
                                : 'hover:text-white text-[#faf6f0]'
                            }`}
                            title={`Strong's ${w.n || '—'} • ${parsingTag} (${morph.parsingDescription})`}
                          >
                            {displayWord}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      dir="ltr"
                      className={`${fontClass} ${activeIsBold ? 'font-bold' : ''} text-lg sm:text-xl leading-relaxed text-[#faf6f0] pt-0.5`}
                    >
                      {interVerse?.manuscriptText || v.manuscriptText || (
                        <span className="italic opacity-50 text-xs font-sans text-[#b5a99a]">
                          [Loading manuscript text...]
                        </span>
                      )}
                    </div>
                  )}

                  {/* Third Line: Contextual English (KJV) Translation with Synchronized Word Clustering */}
                  {thirdLineText && tokens.length > 0 && (
                    <div className={`pt-2.5 border-t border-white/10 ${fontClass} ${activeIsBold ? 'font-bold' : ''} text-base sm:text-lg leading-relaxed text-[#dcd3c6] select-none`}>
                      "{tokens.map((tokenObj) => {
                        const isMatched = matchedIndices.has(tokenObj.rawIdx);
                        const isSupplied = tokenObj.isSupplied;

                        return (
                          <span
                            key={tokenObj.rawIdx}
                            className={`transition-colors duration-150 ${
                              isMatched
                                ? `${themeTokens.highlightText} font-bold`
                                : isSupplied
                                  ? 'italic font-normal opacity-75 text-[#a89b8c]'
                                  : ''
                            }`}
                            title={isSupplied ? 'Supplied word (added by translators)' : undefined}
                          >
                            {tokenObj.text}
                          </span>
                        );
                      })}"
                    </div>
                  )}

                  {/* Attached Cross-Reference Card if present on active verse in Theological Study Mode */}
                  {isVerseSelected && isCrossRefOpen && attachedCrossRefs.length > 0 && (
                    <div className="pt-2 pb-1 flex flex-col gap-1.5 animate-fade-in text-left">
                      {attachedCrossRefs.map((cr) => (
                        <div key={cr.ref} className="flex flex-col gap-1.5">
                          {inlineContextRef === cr.ref ? (
                            <InlineParagraphContext
                              reference={inlineContextRef}
                              theme="dark"
                              onCollapse={() => handleInlineContextChange(null)}
                              onScroll={onPreviewScroll}
                              onOpenInMainReader={(b, c, v) => {
                                handleInlineContextChange(null);
                                setActiveDraftVerse(null);
                                setIsCrossRefOpen(false);
                                setAttachedCrossRefs([]);
                                setSelectedBook(b);
                                setSelectedChapter(c);
                                const targetV = v || 1;
                                setSelectedVerse(targetV);
                                if (currentLowerThird) {
                                  onUpdateLowerThird({
                                    ...currentLowerThird,
                                    book: b,
                                    chapter: c,
                                    verse: targetV,
                                    inlineContextRef: null,
                                    attachedCrossRefs: []
                                  }, isVisible);
                                }
                              }}
                            />
                          ) : (
                            <div
                              className={`p-2.5 rounded-lg border flex items-start gap-2.5 shadow-sm ${themeTokens.cardBg} ${themeTokens.cardBorder} text-[#faf6f0]`}
                            >
                              <div className={`w-1 self-stretch rounded-full shrink-0 ${deckTheme === 'stealth' ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`} />
                              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-[13px] font-bold font-serif tracking-tight">
                                    {cr.ref}
                                  </span>
                                  <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded font-bold tracking-wider ${themeTokens.pillBg} ${themeTokens.subtleText}`}>
                                    Cross-Reference
                                  </span>
                                </div>
                                <div className="font-serif text-xs sm:text-sm leading-relaxed opacity-95">
                                  "{cr.text}"
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInlineContextChange(inlineContextRef === cr.ref ? null : cr.ref);
                                  }}
                                  className={`p-1 rounded-full ${themeTokens.mutedText} hover:${themeTokens.highlightText} transition-colors cursor-pointer`}
                                  title="Read paragraph context"
                                >
                                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCrossRef(cr.ref);
                                  }}
                                  className={`p-1 rounded-full ${themeTokens.mutedText} ${deckTheme === 'stealth' ? 'hover:text-emerald-400' : 'hover:text-rose-400'} transition-colors cursor-pointer`}
                                  title="Remove cross-reference"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })() : (
          /* ── STANDARD KJV PERICOPE STORY MODE ── */
          <NarrativeStream
            key={`${selectedBook}-${selectedChapter}`}
            deckTheme={deckTheme}
            title="King James Version (KJV)"
            streamType="kjv"
            chunks={storyChunks}
            focusedVerse={focusedVerse}
            setFocusedVerse={setFocusedVerse}
            currentlyReadingVerse={currentlyReadingVerse}
            theme="dark"
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            activeDraftVerse={activeDraftVerse}
            noteDraftText={noteDraftText}
            setNoteDraftText={setNoteDraftText}
            handleCancelNote={handleCancelNote}
            handleSaveNote={() => {}}
            startEditingNote={(vNo) => {
              setActiveDraftVerse(vNo);
              setIsCrossRefOpen(false);
            }}
            openContextualNotebook={(vNo) => {
              setActiveDraftVerse(vNo);
              setIsCrossRefOpen(false);
            }}
            isVerseSaved={isVerseSaved}
            getVerseHighlight={getVerseHighlight}
            getVerseHighlightColor={(vNo) => getVerseHighlight(vNo)?.color}
            setVerseHighlightColor={setVerseHighlightColor}
            toggleSaveVerse={toggleSaveVerse}
            stopSpeaking={stopSpeaking}
            playSingleVerse={playSingleVerse}
            playTranslationStream={playTranslationStream}
            isPlayingAudio={isPlayingAudio}
            activeAudioStream={isPlayingAudio ? 'kjv' : null}
            getSpeechTextForVerse={(v) => stripSuppliedMarkup(v.kjvText || '')}
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            isCrossRefOpen={isCrossRefOpen}
            setIsCrossRefOpen={handleToggleCrossRefOpen}
            crossRefInputText={crossRefInputText}
            setCrossRefInputText={setCrossRefInputText}
            attachCrossRef={attachCrossRef}
            removeCrossRef={removeCrossRef}
            attachedCrossRefs={attachedCrossRefs}
            inlineContextRef={inlineContextRef}
            setInlineContextRef={handleInlineContextChange}
            onOpenInMainReader={(b, c, v) => {
              handleInlineContextChange(null);
              setActiveDraftVerse(null);
              setIsCrossRefOpen(false);
              setAttachedCrossRefs([]);
              setSelectedBook(b);
              setSelectedChapter(c);
              const targetV = v || 1;
              setSelectedVerse(targetV);
              if (currentLowerThird) {
                onUpdateLowerThird({
                  ...currentLowerThird,
                  book: b,
                  chapter: c,
                  verse: targetV,
                  inlineContextRef: null,
                  attachedCrossRefs: []
                }, isVisible);
              }
            }}
            onVerseSelect={handleVerseSelect}
            liveVerseNumber={isVisible && (scriptureViewMode !== 'full-screen' && currentLowerThird?.canvasViewMode !== 'full-screen') ? currentLowerThird?.verse : undefined}
            liveBook={(scriptureViewMode !== 'full-screen' && currentLowerThird?.canvasViewMode !== 'full-screen') ? currentLowerThird?.book : undefined}
            liveChapter={(scriptureViewMode !== 'full-screen' && currentLowerThird?.canvasViewMode !== 'full-screen') ? currentLowerThird?.chapter : undefined}
            isLowerThirdVisible={isVisible && (scriptureViewMode !== 'full-screen' && currentLowerThird?.canvasViewMode !== 'full-screen')}
            onPreviewScroll={onPreviewScroll}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MATERIAL 3 BIBLE NAVIGATION MODAL (Exact mirror of Read View modal)
      ═══════════════════════════════════════════════════════════════════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isBottomSheetOpen && (
            <div className="fixed inset-0 z-[99990] flex flex-col justify-end pointer-events-none">
              {/* Tap-dismiss transparent zone covering canvas/upper screen (keeps canvas 100% visible & un-dimmed) */}
              <div
                className="flex-1 w-full pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBottomSheetOpen(false);
                }}
                title="Tap canvas to close book selector"
              />

              {/* Slide-Up Bottom Drawer Sheet: Clamped strictly below the live canvas preview window */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative z-10 w-full max-w-2xl mx-auto ${themeTokens.modalBg} border-t border-x rounded-t-[24px] sm:rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col h-[48vh] max-h-[50vh] sm:h-[400px] sm:max-h-[420px] overflow-hidden pointer-events-auto`}
              >
              {/* Premium Material 3 Top App Bar (Mirrors Read View) */}
              <div className={`shrink-0 px-4 sm:px-6 py-3.5 border-b flex items-center justify-between ${themeTokens.stripBg} backdrop-blur-xl`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#faf6f0]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h1 className="text-sm sm:text-base font-sans font-black tracking-[-0.02em] leading-tight text-[#faf6f0]">
                    THE 66 BIBLE BOOKS
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBottomSheetOpen(false)}
                  className={`p-1.5 rounded-md flex items-center justify-center ${themeTokens.subtleText} hover:${themeTokens.highlightText} ${themeTokens.hoverItemBg} transition-all active:scale-95 cursor-pointer touch-manipulation`}
                  title="Close"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Unified M3 Book Grid with Inline Slide-down Chapters (Mirrors Read View) */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {BIBLE_BOOKS.map((book) => {
                    const isExpanded = expandedBook === book.name;
                    const isCurrentBook = selectedBook.toLowerCase() === book.name.toLowerCase();

                    return (
                      <div key={book.name} id={`book-section-${book.name}`} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setExpandedBook(isExpanded ? null : book.name)}
                          className={`text-left py-2.5 px-3 rounded-xl font-sans flex items-center justify-between touch-manipulation select-none cursor-pointer active:opacity-60 transition-colors duration-75 ${
                            isExpanded
                              ? themeTokens.activeItemBg
                              : themeTokens.hoverItemBg
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm sm:text-base tracking-tight ${
                              isCurrentBook ? 'text-white font-black' : 'text-[#dcd3c6] font-medium'
                            }`}>
                              {book.name}
                            </span>
                          </div>
                          <span className="text-[11px] opacity-40 font-mono text-[#b5a99a]">{book.chapters} ch</span>
                        </button>

                        {/* Pure M3 Chapter Numbers Grid (Mirrors Read View) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-wrap gap-2 py-2 px-1">
                                {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => {
                                  const isSelected = isCurrentBook && selectedChapter === ch;

                                  return (
                                    <button
                                      type="button"
                                      key={ch}
                                      onClick={() => {
                                        const targetBk = book.name;
                                        const targetCh = ch;
                                        setSelectedBook(targetBk);
                                        setSelectedChapter(targetCh);
                                        setSelectedVerse(1);
                                        setSelectedWordKey(null);
                                        setIsBottomSheetOpen(false);
                                        if (previewContainerRef.current) {
                                          previewContainerRef.current.scrollTop = 0;
                                        }
                                        if (currentLowerThird) {
                                          onUpdateLowerThird({
                                            ...currentLowerThird,
                                            book: targetBk,
                                            chapter: targetCh,
                                            verse: 1,
                                            selectedWord: null,
                                            inlineContextRef: null
                                          }, isVisible);
                                        }
                                      }}
                                      className={`w-9 h-9 sm:w-10 sm:h-10 aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold font-sans select-none cursor-pointer ${
                                        isSelected
                                          ? getTactileBtnClass(deckTheme, true, 'accent')
                                          : getTactileBtnClass(deckTheme, false)
                                      }`}
                                    >
                                      {ch}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

    </div>
  );
});
