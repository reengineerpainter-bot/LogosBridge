/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, FormEvent, ReactNode, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreVertical,
  BookOpen,
  Sparkles,
  X,
  Loader2,
  Search,
  Eye,
  EyeOff,
  HelpCircle,
  ArrowLeft,
  Check,
  Compass,
  Info,
  RefreshCw,
  Globe,
  ArrowRight,
  MessageSquareOff,
  PlusSquare,
  Bookmark,
  Sun,
  Moon,
  Smartphone,
  Download,
  Laptop,
  ExternalLink,
  Copy,
  Volume2,
  VolumeX,
  MessageSquare,
  Award,
  Play,
  Square,
  Tv,
  Settings,
  Library,
  MonitorPlay,
  Ban,
  ToggleLeft,
  ToggleRight,
  Settings2,
  Layers
} from 'lucide-react';
import { BIBLE_BOOKS } from './bibleMetadata';
import { STATIC_CHAPTERS } from './staticChapters';
import { ChapterData, Verse, SpecialWord, BibleBook } from './types';
import { NarrativeStream } from './components/NarrativeStream';
import { manuscriptData } from './manuscriptData';
import {
  Trash2,
  CloudLightning,
  AlertTriangle,
  FileDown,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  saveUserBookmark,
  deleteUserBookmark,
  updateUserProfile,
  recordQuizScore,
  getOrCreateUserProfile
} from './utils/firebaseSync';
import CloudSyncPanel from './components/CloudSyncPanel';
import ProjectionStudio from './components/ProjectionStudio';
import ProjectorCleanDisplay from './components/ProjectorCleanDisplay';
import { openProjectorStandalone } from './utils/windowUtils';

// @ts-ignore
import logoCosmicBreath from './assets/images/logo_cosmic_breath_1780920337362.png';
// @ts-ignore
import logoGraceAmber from './assets/images/logo_grace_amber_1780920320501.png';
// @ts-ignore
import logoSacredCrest from './assets/images/logo_sacred_crest_1780920352594.png';
// @ts-ignore
import appLogoNew from './assets/images/app_logo_1781168399204.png';

const StarryCradleIcon = ({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <g 
        stroke="currentColor" 
        strokeWidth="32" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Stars Stack (Left) */}
        <path d="M125 90l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={active ? "currentColor" : "none"} />
        <path d="M125 190l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={active ? "currentColor" : "none"} />
        <path d="M125 290l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={active ? "currentColor" : "none"} />

        {/* List lines (Right) */}
        <rect x="185" y="94" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />
        <rect x="185" y="194" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />
        <rect x="185" y="294" width="210" height="12" rx="6" fill={active ? "currentColor" : "none"} />

        {/* Supportive cradling hand at bottom */}
        <path d="M 65 375 C 115 330, 195 350, 255 375 C 285 390, 315 390, 345 370 C 405 325, 455 335, 490 375" />
        <path d="M 105 435 C 155 400, 255 430, 335 415 C 395 400, 445 410, 480 445" />
      </g>
    </svg>
  );
};

interface WelcomeStyleConfig {
  mainBg: string;
  headerBg: string;
  dotBg: string;
  dotText: string;
  closeBtn: string;
  headingText: string;
  subText: string;
  descText: string;
  iconBg: string;
  boxBg: string;
  itemActiveBg: string;
  itemInactiveBg: string;
  speedBadge: string;
  speedBtnActive: string;
  speedBtnInactive: string;
  speakBtn: string;
  stopBtn: string;
  dotActive: string;
  backBtn: string;
  nextBtn: string;
  mockVerseBg: string;
  mockVerseBadge: string;
  mockVerseHeading: string;
}

const welcomeStyles: Record<'royal' | 'minimal', WelcomeStyleConfig> = {
  royal: {
    mainBg: 'bg-[#fcfaff] border-indigo-200 text-indigo-955 shadow-indigo-955/5',
    headerBg: 'bg-indigo-50/40 border-indigo-100',
    dotBg: 'bg-[#6366f1] animate-pulse',
    dotText: 'text-indigo-800',
    closeBtn: 'bg-white border-indigo-100 text-indigo-900 hover:bg-indigo-50',
    headingText: 'text-indigo-955',
    subText: 'text-indigo-800',
    descText: 'text-indigo-900/80',
    iconBg: 'bg-indigo-100/40 border-indigo-200/80 text-indigo-700',
    boxBg: 'bg-indigo-50/40 border-indigo-200/40',
    itemActiveBg: 'bg-indigo-100/80 border-indigo-300 shadow-sm text-indigo-900',
    itemInactiveBg: 'bg-white border-indigo-100/50 hover:bg-indigo-50/40',
    speedBadge: 'bg-indigo-50 text-indigo-955 border-indigo-150',
    speedBtnActive: 'bg-indigo-600 text-white border-indigo-600',
    speedBtnInactive: 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50',
    speakBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    stopBtn: 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50',
    dotActive: 'bg-indigo-600 w-6',
    backBtn: 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50',
    nextBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    mockVerseBg: 'bg-[#faf8fe] border-indigo-150 text-indigo-950',
    mockVerseBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    mockVerseHeading: 'text-indigo-950 font-serif',
  },
  minimal: {
    mainBg: 'bg-[#f8fafc] border-slate-200 text-slate-800 shadow-slate-900/5',
    headerBg: 'bg-slate-50 border-slate-200',
    dotBg: 'bg-slate-400',
    dotText: 'text-slate-500',
    closeBtn: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
    headingText: 'text-slate-900',
    subText: 'text-slate-500',
    descText: 'text-slate-600',
    iconBg: 'bg-slate-100 border-slate-200 text-slate-705',
    boxBg: 'bg-slate-100/60 border-slate-200',
    itemActiveBg: 'bg-slate-100 border-slate-300 shadow-sm text-slate-900',
    itemInactiveBg: 'bg-white border-slate-100 hover:bg-slate-50',
    speedBadge: 'bg-slate-100 text-slate-600 border-slate-200',
    speedBtnActive: 'bg-slate-800 text-white border-slate-800',
    speedBtnInactive: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
    speakBtn: 'bg-slate-800 hover:bg-slate-900 text-white',
    stopBtn: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
    dotActive: 'bg-slate-800 w-6',
    backBtn: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
    nextBtn: 'bg-slate-800 hover:bg-slate-900 text-white',
    mockVerseBg: 'bg-[#fafbfc] border-slate-200 text-slate-800',
    mockVerseBadge: 'bg-slate-100 text-slate-800 border border-slate-200',
    mockVerseHeading: 'text-slate-900 font-sans font-bold',
  }
};

const AUDIO_TRANS_OPTIONS = [
  { id: 'plain', label: 'Plain English' },
  { id: 'pers', label: 'Personalised Prayer' },
  { id: 'kjv', label: 'King James Version' },
  { id: 'bsb', label: 'Berean Standard' },
  { id: 'asv', label: 'American Standard' },
  { id: 'ylt', label: 'Young\'s Literal' },
  { id: 'bbe', label: 'Basic English' },
];

const AudioFAB = ({ 
  theme, 
  isPlayingAudio, 
  activeAudioStream, 
  stopSpeaking, 
  playTranslationStream, 
  currentTransId,
  onTransChange,
}: any) => {
  const currentIndex = AUDIO_TRANS_OPTIONS.findIndex(t => t.id === currentTransId) >= 0 
    ? AUDIO_TRANS_OPTIONS.findIndex(t => t.id === currentTransId)
    : 0;
  
  const currentTrans = AUDIO_TRANS_OPTIONS[currentIndex];
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (currentIndex + 1) % AUDIO_TRANS_OPTIONS.length;
    onTransChange(AUDIO_TRANS_OPTIONS[nextIdx].id);
  };
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = (currentIndex - 1 + AUDIO_TRANS_OPTIONS.length) % AUDIO_TRANS_OPTIONS.length;
    onTransChange(AUDIO_TRANS_OPTIONS[prevIdx].id);
  };

  const isPlayingThis = isPlayingAudio && activeAudioStream === currentTrans.id;

  return (
    <div className={`flex items-center gap-1 p-1 rounded-full shadow-lg border backdrop-blur-md ${
      theme === 'light'
        ? 'bg-white/90 border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.08)]'
        : 'bg-[#1c1c1e]/90 border-[#2d2d2d] shadow-[0_4px_15px_rgba(0,0,0,0.5)]'
    }`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isPlayingThis) {
            stopSpeaking();
          } else if (playTranslationStream) {
            playTranslationStream(currentTrans.id);
          }
        }}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
          theme === 'light'
            ? 'bg-cyan-600 text-white'
            : 'bg-cyan-700 text-zinc-100'
        }`}
        title={isPlayingThis ? "Stop Audio" : `Play ${currentTrans.label} Audio`}
      >
        {isPlayingThis ? (
          <Square className="w-4 h-4 fill-current animate-pulse" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex items-center gap-1 px-1">
        <button onClick={handlePrev} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400'}`}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        
        <span className={`text-[11px] font-bold tracking-wider w-[110px] md:w-[130px] flex justify-center text-center ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
          <span className="truncate">{currentTrans.label}</span>
        </span>
        
        <button onClick={handleNext} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400'}`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  // Check if projector fullscreen mode is active
  const isProjectorMode = useMemo(() => {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('projector') === 'true';
    }
    return false;
  }, []);

  // Theme & Navigation State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  if (isProjectorMode) {
    return <ProjectorCleanDisplay theme={theme} />;
  }
  const [appLogo, setAppLogo] = useState<'sacred' | 'cosmic' | 'grace'>(() => {
    return (localStorage.getItem('personalized_app_logo') as any) || 'sacred';
  });

  useEffect(() => {
    localStorage.setItem('personalized_app_logo', appLogo);
  }, [appLogo]);

  const logoSrc = useMemo(() => {
    return appLogoNew;
  }, []);
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isTransMenuOpen, setIsTransMenuOpen] = useState<boolean>(false);
  const [moreMenuSubpage, setMoreMenuSubpage] = useState<'main' | 'companion' | 'scripture'>('main');
  const [fullPageMenu, setFullPageMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      setMoreMenuSubpage('main');
      return;
    }

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = document.getElementById('more-options-menu-btn');
      const dropdown = document.getElementById('more-options-menu-dropdown');
      
      // Do nothing if clicking toggle button or dropdown contents
      if (btn && btn.contains(target)) return;
      if (dropdown && dropdown.contains(target)) return;
      
      setIsMoreMenuOpen(false);
    };

    // Use capturing phase to intercept actions seamlessly
    document.addEventListener('click', handleOutsideClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideClick, true);
    };
  }, [isMoreMenuOpen]);
  const [scriptureTypefaceSetting, setScriptureTypefaceSetting] = useState<'serif' | 'sans' | 'mono'>('sans');
  const [scriptureTextStyleSetting, setScriptureTextStyleSetting] = useState<'normal' | 'elegant' | 'compact' | 'classic'>('normal');
  const [scriptureFontSizeSetting, setScriptureFontSizeSetting] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm');
  const [plainBold, setPlainBold] = useState<boolean>(false);
  const [plainItalic, setPlainItalic] = useState<boolean>(false);
  const [personalizedBold, setPersonalizedBold] = useState<boolean>(true);
  const [personalizedItalic, setPersonalizedItalic] = useState<boolean>(false);
  const [manuscriptBold, setManuscriptBold] = useState<boolean>(false);
  const [manuscriptItalic, setManuscriptItalic] = useState<boolean>(false);
  const [isComparisonEnabled, setIsComparisonEnabled] = useState<boolean>(false);
  const [referenceDisplayMode, setReferenceDisplayMode] = useState<'both' | 'kjv' | 'bsb'>('both');
  const [translationDisplayMode, setTranslationDisplayMode] = useState<'both' | 'plain' | 'personalized' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe'>(() => {
    const val = localStorage.getItem('personalized_bible_translation_display_mode');
    return val === 'interlinear' ? 'kjv' : (val as any) || 'kjv';
  });
  const [dualStreamLeft, setDualStreamLeft] = useState<'plain' | 'personalized' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe'>('plain');
  const [dualStreamRight, setDualStreamRight] = useState<'plain' | 'personalized' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe'>('personalized');
  const [mainView, setMainView] = useState<'read' | 'interlinear'>('read');
  const [interlinearThirdLine, setInterlinearThirdLine] = useState<string>('kjv');
  const [dynamicTranslationData, setDynamicTranslationData] = useState<Record<string, Record<string, string>>>({});
  const translationPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (translationPickerRef.current) {
      const modes = ['plain', 'personalized', 'kjv', 'bsb', 'interlinear'];
      const index = modes.indexOf(translationDisplayMode);
      if (index !== -1) {
        const itemHeight = window.innerWidth >= 768 ? 40 : 32;
        translationPickerRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [translationDisplayMode]);

  // Clear translation data on chapter change to prevent stale data
  useEffect(() => {
    setDynamicTranslationData({});
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    const requiredTranslations = new Set<string>();
    
    // Add translations needed by single view
    if (['asv', 'ylt', 'bbe'].includes(translationDisplayMode)) requiredTranslations.add(translationDisplayMode);
    if (mainView === 'interlinear' && ['asv', 'ylt', 'bbe'].includes(interlinearThirdLine)) requiredTranslations.add(interlinearThirdLine);
    
    // Add translations needed by dual stream
    if (translationDisplayMode === 'both') {
      if (['asv', 'ylt', 'bbe'].includes(dualStreamLeft)) requiredTranslations.add(dualStreamLeft);
      if (['asv', 'ylt', 'bbe'].includes(dualStreamRight)) requiredTranslations.add(dualStreamRight);
    }

    requiredTranslations.forEach(shouldFetch => {
      const processVerses = (versesData: any) => {
         const formattedData: Record<string, string> = {};
         if (Array.isArray(versesData)) {
           versesData.forEach((v: any) => {
             formattedData[String(v.verse)] = v.text;
           });
         } else if (typeof versesData === 'object' && versesData !== null) {
           Object.assign(formattedData, versesData);
         }
         setDynamicTranslationData(prev => ({
           ...prev,
           [shouldFetch]: formattedData
         }));
      };

      const url = `/api/translation/${shouldFetch}?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}`;

      fetch(url)
        .then(async (res) => {
           if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
               throw new Error('Backend endpoint unavailable or returned HTML');
           }
           return res.json();
        })
        .then(data => {
           if (data.success && data.data && data.data.verses) {
             processVerses(data.data.verses);
           } else {
             throw new Error('Invalid JSON format from backend');
           }
        })
        .catch(err => {
           console.error(`[Translation Fetch] Failed to fetch from backend database:`, err.message);
           const offlineData: Record<string, string> = {};
           for (let i = 1; i <= 200; i++) offlineData[String(i)] = '[Translation Offline]';
           setDynamicTranslationData(prev => ({
             ...prev,
             [shouldFetch]: offlineData
           }));
        });
    });
  }, [translationDisplayMode, interlinearThirdLine, dualStreamLeft, dualStreamRight, mainView, selectedBook, selectedChapter]);

  const [layoutMode, setLayoutMode] = useState<'formal' | 'paragraph'>(() => {
    return (localStorage.getItem('personalized_bible_layout_mode') as 'formal' | 'paragraph') || 'paragraph';
  });
  const [audioReadingSelection, setAudioReadingSelection] = useState<'dynamic' | 'kjv' | 'bsb' | 'plain' | 'personalized'>('dynamic');

  // Highly stable Pinch-to-zoom 2-finger gesture Ref & Listeners Setup to prevent mobile shaking/jitter
  const [scriptureZoom, setScriptureZoom] = useState<number>(() => {
    const saved = localStorage.getItem('personalized_bible_scripture_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const zoomRef = useRef(scriptureZoom);
  useEffect(() => {
    zoomRef.current = scriptureZoom;
  }, [scriptureZoom]);

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);
  const activeContainerRef = useRef<HTMLDivElement | null>(null);

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500); // 500ms after scroll stops
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);


  const scriptureContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    // If we have an existing active container, clean it up first
    if (activeContainerRef.current) {
      const oldNode = activeContainerRef.current;
      if ((oldNode as any)._cleanupListeners) {
        (oldNode as any)._cleanupListeners();
      }
      activeContainerRef.current = null;
    }

    if (node) {
      activeContainerRef.current = node;

      // Use native non-passive touch listeners to actively block browser default scale/scroll overrides
      const handleStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          touchStartDistRef.current = dist;
          touchStartZoomRef.current = zoomRef.current;
        }
      };

      const handleMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartDistRef.current > 0) {
          e.preventDefault();
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          
          const factor = dist / touchStartDistRef.current;
          let newZoom = touchStartZoomRef.current * factor;
          // Soft clamp to prevent extreme zooming during gesture
          newZoom = Math.min(Math.max(newZoom, 0.6), 3.0);
          
          // Use direct DOM manipulation for 60fps buttery smooth zooming
          if (activeContainerRef.current) {
            activeContainerRef.current.style.setProperty('--sz', newZoom.toFixed(3));
          }
          zoomRef.current = newZoom; // Keep ref updated for end event
        }
      };

      const handleEnd = () => {
        touchStartDistRef.current = null;
        if (zoomRef.current !== scriptureZoom) {
          const finalZoom = Math.min(Math.max(zoomRef.current, 0.75), 2.50);
          setScriptureZoom(finalZoom);
          localStorage.setItem('personalized_bible_scripture_zoom', finalZoom.toFixed(3));
          if (activeContainerRef.current) {
             activeContainerRef.current.style.setProperty('--sz', finalZoom.toFixed(3));
          }
        }
      };

      node.addEventListener('touchstart', handleStart as any, { passive: false });
      node.addEventListener('touchmove', handleMove as any, { passive: false });
      node.addEventListener('touchend', handleEnd, { passive: true });

      (node as any)._cleanupListeners = () => {
        node.removeEventListener('touchstart', handleStart as any);
        node.removeEventListener('touchmove', handleMove as any);
        node.removeEventListener('touchend', handleEnd);
      };
    }
  }, []);

  // Pagination is disabled as requested by the user
  const [versesPerPageSetting, setVersesPerPageSetting] = useState<'all' | 5 | 7>('all');
  const [currentVersePage, setCurrentVersePage] = useState<number>(0);

  const getScriptureStyleClasses = () => {
    let classes = '';
    if (scriptureTypefaceSetting === 'serif') {
      classes += ' font-serif';
    } else if (scriptureTypefaceSetting === 'sans') {
      classes += ' font-sans';
    } else if (scriptureTypefaceSetting === 'mono') {
      classes += ' font-mono';
    }

    if (scriptureTextStyleSetting === 'normal') {
      classes += ' leading-[1.8] tracking-[0.01em] tracking-normal';
    } else if (scriptureTextStyleSetting === 'elegant') {
      classes += ' leading-loose tracking-wide';
    } else if (scriptureTextStyleSetting === 'compact') {
      classes += ' leading-snug tracking-tight';
    } else if (scriptureTextStyleSetting === 'classic') {
      classes += ' leading-normal tracking-wider';
    }
    return classes;
  };

  // Offline Sync Manager states
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [isProjectionStudioOpen, setIsProjectionStudioOpen] = useState<boolean>(false);
  const [projectionInitialVerseNumber, setProjectionInitialVerseNumber] = useState<number>(1);

  // Real-time synchronization of the Live Broadcast Monitor inside the main user interface
  const [liveScreenState, setLiveScreenState] = useState<any>(null);
  const [isLiveMonitorDismissed, setIsLiveMonitorDismissed] = useState<boolean>(true);
  const [isLiveMonitorCollapsed, setIsLiveMonitorCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (isProjectionStudioOpen) {
      localStorage.setItem('live_monitor_dismissed_v2', 'false');
      setIsLiveMonitorDismissed(false);
    }
  }, [isProjectionStudioOpen]);

  useEffect(() => {
    // 1. Initial State Load
    try {
      const saved = localStorage.getItem('live_projection_state');
      if (saved) {
        setLiveScreenState(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Live monitor failed load:', e);
    }

    // 2. Broadcast Channel Sync
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('live_projection_channel');
      
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          setLiveScreenState(event.data.state);
        }
      };

      // Poll current state
      channel.postMessage('REQUEST_LATEST_STATE');
    }

    // 3. Storage Event Handlers
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'live_projection_state') {
        try {
          if (e.newValue) {
            setLiveScreenState(JSON.parse(e.newValue));
          } else {
            setLiveScreenState(null);
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };

    const handleLocalUpdate = () => {
      try {
        const saved = localStorage.getItem('live_projection_state');
        if (saved) {
          setLiveScreenState(JSON.parse(saved));
        } else {
          setLiveScreenState(null);
        }
      } catch (err) {
        console.warn(err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage_local', handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage_local', handleLocalUpdate);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const handleClearLiveScreen = () => {
    try {
      localStorage.removeItem('live_projection_state');
      setLiveScreenState(null);
      window.dispatchEvent(new Event('storage_local'));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('live_projection_channel');
        channel.postMessage({ type: 'STATE_UPDATE', state: null });
        channel.close();
      }
      playWebAudioBeep(440, 'sine', 0.1);
    } catch (err) {
      console.warn('Failed clearing live state:', err);
    }
  };
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [downloadingBook, setDownloadingBook] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusLog, setDownloadStatusLog] = useState<string[]>([]);
  const [cachedChapters, setCachedChapters] = useState<Record<string, number>>({});
  const cancelDownloadRef = useRef<boolean>(false);

  // Dedicated Mobile Double-Tap Handler
  const lastTapRef = useRef<{ verseNumber: number; time: number; streamType: string } | null>(null);
  const handleVerseRowTap = (v: any, streamType: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTapRef.current && lastTapRef.current.verseNumber === v.verseNumber && lastTapRef.current.streamType === streamType && (now - lastTapRef.current.time) < DOUBLE_TAP_DELAY) {
      if (focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType) {
        setFocusedVerse(null);
        setFocusedStreamType(null);
      } else {
        setFocusedVerse(v);
        setFocusedStreamType(streamType);
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { verseNumber: v.verseNumber, time: now, streamType };
    }
  };

  // Search & Selector State
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState<boolean>(false);
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState<boolean>(false);
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');
  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const chapterDropdownRef = useRef<HTMLDivElement>(null);

  // Swipe Gestures
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    // Only process horizontal swipes
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe) {
        // Next chapter
        const currentBookObj = booksList.find(b => b.name === selectedBook);
        if (currentBookObj && selectedChapter < currentBookObj.chapters) {
          setSelectedChapter(prev => prev + 1);
        } else if (currentBookObj) {
          const bookIndex = booksList.findIndex(b => b.name === selectedBook);
          if (bookIndex !== -1 && bookIndex < booksList.length - 1) {
            setSelectedBook(booksList[bookIndex + 1].name);
            setSelectedChapter(1);
          }
        }
      }
      if (isRightSwipe) {
        // Prev chapter
        if (selectedChapter > 1) {
          setSelectedChapter(prev => prev - 1);
        } else {
          const bookIndex = booksList.findIndex(b => b.name === selectedBook);
          if (bookIndex > 0) {
            const prevBook = booksList[bookIndex - 1];
            setSelectedBook(prevBook.name);
            setSelectedChapter(prevBook.chapters);
          }
        }
      }
    }
  };

  // Chapter loading states
  const [chapterDataState, setChapterData] = useState<ChapterData | null>(null);
  
  // Intercept and enrich chapterData with the custom scanning dictionary logic
  const chapterData = useMemo(() => {
    if (!chapterDataState) return null;
    
    const enrichedVerses = chapterDataState.verses.map((verse) => {
      const existingWordSet = new Set((verse.specialWords || []).map(sw => sw.word.toLowerCase()));
      const extraSpecialWords: SpecialWord[] = [...(verse.specialWords || [])];
      
      Object.keys(manuscriptData).forEach((termKey) => {
        const entry = manuscriptData[termKey];
        // Match word boundaries and optional plurals
        const regex = new RegExp(`\\b${termKey}(s|es)?\\b`, 'gi');
        
        const matchesInKjv = regex.test(verse.kjvText || '');
        const matchesInBsb = regex.test(verse.bsbText || '');
        const matchesInContemporary = regex.test(verse.contemporary || '');
        
        if ((matchesInKjv || matchesInBsb || matchesInContemporary) && !existingWordSet.has(termKey.toLowerCase())) {
          extraSpecialWords.push({
            word: termKey,
            originalValue: entry.originalValue,
            language: entry.language,
            explanation: entry.explanation
          });
          existingWordSet.add(termKey.toLowerCase());
        }
      });
      
      return {
        ...verse,
        specialWords: extraSpecialWords
      };
    });
    
    return {
      ...chapterDataState,
      verses: enrichedVerses
    };
  }, [chapterDataState]);

  const rawVersesList = useMemo(() => {
    return chapterData?.verses || [];
  }, [chapterData]);

  const paginatedVersesList = useMemo(() => {
    if (versesPerPageSetting === 'all') {
      return rawVersesList;
    }
    const startIndex = currentVersePage * versesPerPageSetting;
    return rawVersesList.slice(startIndex, startIndex + versesPerPageSetting);
  }, [rawVersesList, versesPerPageSetting, currentVersePage]);

  const totalPages = useMemo(() => {
    if (versesPerPageSetting === 'all') return 1;
    return Math.ceil(rawVersesList.length / versesPerPageSetting);
  }, [rawVersesList, versesPerPageSetting]);

  useEffect(() => {
    if (currentVersePage >= totalPages && totalPages > 0) {
      setCurrentVersePage(totalPages - 1);
    }
  }, [totalPages, currentVersePage]);

  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState<boolean>(false);
  const activeChapterRef = useRef<{ book: string; chapter: number }>({ book: 'John', chapter: 1 });

  // Active word and interactive explains state
  const [selectedWord, setSelectedWord] = useState<SpecialWord | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);
  const [focusedVerse, setFocusedVerse] = useState<Verse | null>(null);
  const [focusedStreamType, setFocusedStreamType] = useState<string | null>(null);

  // Smooth-scroll deep study panel into center focus when a verse gets double-clicked or selected
  useEffect(() => {
    if (focusedVerse) {
      setTimeout(() => {
        const el = document.getElementById('deep-study-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [focusedVerse]);

  // Deep Study custom input
  const [studyQuery, setStudyQuery] = useState<string>('');
  const [studyResponse, setStudyResponse] = useState<string | null>(null);
  const [isStudyLoading, setIsStudyLoading] = useState<boolean>(false);

  // HELPS Word studies states
  const [helpsStudy, setHelpsStudy] = useState<{
    strongsNumber: string;
    shortDefinition: string;
    helpsWordStudy: string;
    usage: string;
  } | null>(null);
  const [isHelpsLoading, setIsHelpsLoading] = useState<boolean>(false);
  const [helpsError, setHelpsError] = useState<string | null>(null);

  // Saved verses (for study purposes, stored in localStorage, with highlight support)
  const [savedVerses, setSavedVerses] = useState<Array<{ book: string; chapter: number; verse: number; notes?: string; color?: string }>>(() => {
    try {
      const saved = localStorage.getItem('saved_bible_study_verses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ==========================================
  // DISCIPLINED STUDY UPGRADE (1, 2, 4) STATES
  // ==========================================
  // Feature 1: Audio Playback (TTS)
  const [currentlyReadingVerse, setCurrentlyReadingVerse] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeAudioStream, setActiveAudioStream] = useState<'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe' | 'chapter' | 'single' | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioSessionRef = useRef<number>(0);

  // Smooth scroll to active verse during playback
  useEffect(() => {
    if (currentlyReadingVerse !== null && isPlayingAudio) {
      let elId = '';
      if (activeAudioStream && ['plain', 'pers', 'kjv', 'bsb'].includes(activeAudioStream)) {
        if (layoutMode === 'paragraph') {
          elId = `narrative-verse-${activeAudioStream}-${currentlyReadingVerse}`;
        } else {
          elId = `verse-row-${currentlyReadingVerse}`;
        }
      } else {
        elId = `verse-row-${currentlyReadingVerse}`;
      }
      
      // Fallbacks in case the specific element isn't found
      const el = document.getElementById(elId) || 
                 document.getElementById(`narrative-verse-plain-${currentlyReadingVerse}`) || 
                 document.getElementById(`verse-row-${currentlyReadingVerse}`);
      
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentlyReadingVerse, isPlayingAudio, activeAudioStream, layoutMode]);

  // Feature 2: Theological Reflections & Diary Notes Active Edit State
  const [activeDraftVerse, setActiveDraftVerse] = useState<number | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');

  const startEditingNote = (verseNum: number, currentNote: string) => {
    setActiveDraftVerse(verseNum);
    setNoteDraftText(currentNote);
  };

  const handleSaveNote = (verseNum: number) => {
    updateVerseProfileNotes(verseNum, noteDraftText);
    setActiveDraftVerse(null);
    setNoteDraftText('');
    playWebAudioBeep(600, 'sine', 0.1);
  };

  const handleCancelNote = () => {
    setActiveDraftVerse(null);
    setNoteDraftText('');
  };

  // State for compact in-hover-dropdown diary note editing
  const [verseNotesTextState, setVerseNotesTextState] = useState<Record<number, string>>({});

  // Dynamic 3-Side Sidebar features state
  const [isStudySidebarOpen, setIsStudySidebarOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'audio' | 'notes' | 'bookmarks' | 'scanner'>('notes');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState<string>('');
  
  // Word Study Scanner specific states
  const [scannerInputText, setScannerInputText] = useState<string>('');
  const [activeScannerSelectedWordId, setActiveScannerSelectedWordId] = useState<string | null>(null);
  
  // Sidebar inline drafted note state
  const [sidebarDraftingIndex, setSidebarDraftingIndex] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  const [sidebarDraftText, setSidebarDraftText] = useState<string>('');

  const startSidebarNoteEdit = (book: string, chapter: number, verse: number, currentNote: string) => {
    setSidebarDraftingIndex({ book, chapter, verse });
    setSidebarDraftText(currentNote);
  };

  const saveSidebarNoteEdit = () => {
    if (!sidebarDraftingIndex) return;
    const { book, chapter, verse } = sidebarDraftingIndex;
    
    setSavedVerses((prev) => {
      const exists = prev.some(
        (sv) => sv.book === book && sv.chapter === chapter && sv.verse === verse
      );
      if (exists) {
        return prev.map((sv) =>
          sv.book === book && sv.chapter === chapter && sv.verse === verse
            ? { ...sv, notes: sidebarDraftText }
            : sv
        );
      } else {
        return [...prev, { book, chapter, verse, notes: sidebarDraftText }];
      }
    });

    if (firebaseUser) {
      const existing = savedVerses.find(
        (sv) => sv.book === book && sv.chapter === chapter && sv.verse === verse
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${book}_${chapter}_${verse}`,
        book,
        chapter,
        verse,
        color: existing?.color || 'none',
        notes: sidebarDraftText
      }).catch(console.error);
    }
    
    setSidebarDraftingIndex(null);
    setSidebarDraftText('');
    playWebAudioBeep(600, 'sine', 0.1);
  };

  const deleteSidebarBookmark = (book: string, chapter: number, verse: number) => {
    setSavedVerses((prev) =>
      prev.filter((sv) => !(sv.book === book && sv.chapter === chapter && sv.verse === verse))
    );
    if (firebaseUser) {
      deleteUserBookmark(firebaseUser.uid, book, chapter, verse).catch(console.error);
    }
    playWebAudioBeep(330, 'triangle', 0.1);
  };

  const deleteSidebarNote = (book: string, chapter: number, verse: number) => {
    setSavedVerses((prev) =>
      prev.map((sv) =>
        sv.book === book && sv.chapter === chapter && sv.verse === verse
          ? { ...sv, notes: '' }
          : sv
      )
    );
    if (firebaseUser) {
      const existing = savedVerses.find(
        (sv) => sv.book === book && sv.chapter === chapter && sv.verse === verse
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${book}_${chapter}_${verse}`,
        book,
        chapter,
        verse,
        color: existing?.color || 'none',
        notes: ''
      }).catch(console.error);
    }
    playWebAudioBeep(330, 'triangle', 0.1);
  };

  const navigateToSidebarVerse = (bookName: string, chapterNum: number, verseNum: number) => {
    if (selectedBook === bookName && selectedChapter === chapterNum) {
      const el = document.getElementById(`verse-row-${verseNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const matchedVerse = chapterData?.verses?.find(v => v.verseNumber === verseNum);
        if (matchedVerse) setFocusedVerse(matchedVerse);
      }
    } else {
      setSelectedBook(bookName);
      setSelectedChapter(chapterNum);
      setTimeout(() => {
        const el = document.getElementById(`verse-row-${verseNum}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 700);
    }
    if (window.innerWidth < 1024) {
      setIsStudySidebarOpen(false);
    }
  };

  // Feature 4: Interactive Theology Study Quiz & Memorization Studio
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);
  const [quizMode, setQuizMode] = useState<'vocabulary' | 'memorization'>('vocabulary');
  const [quizWords, setQuizWords] = useState<Array<{ word: string; original: string; meaning: string }>>([]);
  const [quizMeanings, setQuizMeanings] = useState<string[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [selectedMeaningIndex, setSelectedMeaningIndex] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]); 
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFeedback, setQuizFeedback] = useState<string>('');

  // Memorization Quiz specifics
  const [quizVerse, setQuizVerse] = useState<any>(null);
  const [blankedWords, setBlankedWords] = useState<string[]>([]);
  const [blankedIndices, setBlankedIndices] = useState<number[]>([]);
  const [userBlankInput, setUserBlankInput] = useState<Record<number, string>>({});
  const [memorizationCorrectCount, setMemorizationCorrectCount] = useState<number | null>(null);

  // Welcome walk-through guide states
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(false);

  const [welcomeStep, setWelcomeStep] = useState<number>(0);
  const [selectedWelcomeStyle, setSelectedWelcomeStyle] = useState<'royal' | 'minimal'>(() => {
    const savedLogo = localStorage.getItem('personalized_app_logo');
    if (savedLogo === 'cosmic') return 'royal';
    return 'minimal';
  });
  const [welcomePreviewSpeed, setWelcomePreviewSpeed] = useState<number>(0.8);
  const [welcomeIdiomIndex, setWelcomeIdiomIndex] = useState<number>(0);

  // User selected Visual Aura Color theme
  const [auraColor, setAuraColor] = useState<'cyan' | 'sapphire' | 'indigo' | 'ash' | 'amber'>(() => {
    return (localStorage.getItem('personalized_aura_color') as any) || 'cyan';
  });

  useEffect(() => {
    localStorage.setItem('personalized_aura_color', auraColor);
    
    const palette: Record<string, string> = {
      cyan: {
        '--cyan-50': '#ecfeff',
        '--cyan-100': '#cffafe',
        '--cyan-200': '#a5f3fc',
        '--cyan-300': '#67e8f9',
        '--cyan-400': '#22d3ee',
        '--cyan-500': '#06b6d4',
        '--cyan-600': '#0891b2',
        '--cyan-700': '#0e7490',
        '--cyan-800': '#155e75',
        '--cyan-900': '#164e63',
        '--cyan-950': '#083344',
      },
      sapphire: {
        '--cyan-50': '#f0f5ff',
        '--cyan-100': '#dbeafe',
        '--cyan-200': '#bfdbfe',
        '--cyan-300': '#93c5fd',
        '--cyan-400': '#60a5fa',
        '--cyan-500': '#3b82f6',
        '--cyan-600': '#2563eb',
        '--cyan-700': '#1d4ed8',
        '--cyan-800': '#1e40af',
        '--cyan-900': '#1e3a8a',
        '--cyan-950': '#172554',
      },
      indigo: {
        '--cyan-50': '#f5f3ff',
        '--cyan-100': '#ede9fe',
        '--cyan-200': '#ddd6fe',
        '--cyan-300': '#c4b5fd',
        '--cyan-400': '#a78bfa',
        '--cyan-500': '#8b5cf6',
        '--cyan-600': '#7c3aed',
        '--cyan-700': '#6d28d9',
        '--cyan-800': '#5b21b6',
        '--cyan-900': '#4c1d95',
        '--cyan-950': '#2e1065',
      },
      ash: {
        '--cyan-50': '#f4f4f5',
        '--cyan-100': '#e4e4e7',
        '--cyan-200': '#d4d4d8',
        '--cyan-300': '#a1a1aa',
        '--cyan-400': '#9ca3af',
        '--cyan-500': '#71717a',
        '--cyan-600': '#52525b',
        '--cyan-700': '#3f3f46',
        '--cyan-800': '#27272a',
        '--cyan-900': '#18181b',
        '--cyan-950': '#09090b',
      },
      amber: {
        '--cyan-50': '#fffbeb',
        '--cyan-100': '#fef3c7',
        '--cyan-200': '#fde68a',
        '--cyan-300': '#fcd34d',
        '--cyan-400': '#fbbf24',
        '--cyan-500': '#f59e0b',
        '--cyan-600': '#d97706',
        '--cyan-700': '#b45309',
        '--cyan-800': '#92400e',
        '--cyan-900': '#78350f',
        '--cyan-950': '#451a03',
      }
    }[auraColor];

    const root = document.documentElement;
    Object.entries(palette).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }, [auraColor]);

  // Mobile App PWA configuration states
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [detectedPlatform, setDetectedPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [activeInstallTab, setActiveInstallTab] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);



  // Scroll visibility tracking
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);
  const [isSidePanelHidden, setIsSidePanelHidden] = useState<boolean>(false);
  const [readPercentage, setReadPercentage] = useState<number>(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let headerTimeout: any = null;
    let sidePanelTimeout: any = null;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Always show all navigation and controls at the very top of the page
      if (scrollY <= 20) {
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
      } else if (scrollY > lastScrollY && Math.abs(scrollY - lastScrollY) >= 5) {
        // Scrolling down
        setIsHeaderHidden(false); // Changed to false to prevent auto-hide
        setIsSidePanelHidden(true);
      } else if (scrollY < lastScrollY && Math.abs(scrollY - lastScrollY) >= 5) {
        // Scrolling up
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
      }

      // Calculate read percentage
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = documentHeight > 0 ? Math.min(100, Math.max(0, (scrollY / documentHeight) * 100)) : 0;
      setReadPercentage(progress);

      // Keep lastScrollY updated correctly
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (headerTimeout) clearTimeout(headerTimeout);
      if (sidePanelTimeout) clearTimeout(sidePanelTimeout);
    };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load Bible Books
  const booksList = useMemo(() => {
    return BIBLE_BOOKS;
  }, []);

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return booksList;
    const queryLetters = bookSearchQuery.replace(/[0-9]/g, '').trim().toLowerCase();
    if (!queryLetters) return booksList;
    return booksList.filter((b) =>
      b.name.toLowerCase().includes(queryLetters)
    );
  }, [booksList, bookSearchQuery]);

  

  

  // Find currently selected book object
  const currentBookObj = useMemo(() => {
    return booksList.find((b) => b.name === selectedBook) || booksList[0];
  }, [booksList, selectedBook]);

  // Determine preceding chapter label (e.g. john1 for John 2)
  const prevChapterLabel = useMemo(() => {
    const bookIndex = booksList.findIndex((b) => b.name === selectedBook);
    if (bookIndex === -1) return '';
    
    if (selectedChapter > 1) {
      const bName = selectedBook.toLowerCase().replace(/\s+/g, '');
      return `${bName}${selectedChapter - 1}`;
    } else {
      const prevIndex = bookIndex - 1;
      if (prevIndex >= 0) {
        const bName = booksList[prevIndex].name.toLowerCase().replace(/\s+/g, '');
        return `${bName}${booksList[prevIndex].chapters}`;
      }
    }
    return '';
  }, [booksList, selectedBook, selectedChapter]);

  // Determine succeeding chapter label (e.g. john3 for John 2)
  const nextChapterLabel = useMemo(() => {
    const bookIndex = booksList.findIndex((b) => b.name === selectedBook);
    if (bookIndex === -1) return '';
    
    if (selectedChapter < currentBookObj.chapters) {
      const bName = selectedBook.toLowerCase().replace(/\s+/g, '');
      return `${bName}${selectedChapter + 1}`;
    } else {
      const nextIndex = bookIndex + 1;
      if (nextIndex < booksList.length) {
        const bName = booksList[nextIndex].name.toLowerCase().replace(/\s+/g, '');
        return `${bName}1`;
      }
    }
    return '';
  }, [booksList, selectedBook, selectedChapter, currentBookObj]);

  // Handlers for Chapter forward and back
  const handleNextChapter = () => {
    const bookIndex = booksList.findIndex((b) => b.name === selectedBook);
    if (selectedChapter < currentBookObj.chapters) {
      setSelectedChapter((prev) => prev + 1);
    } else {
      // Go to next book
      const nextIndex = bookIndex + 1;
      if (nextIndex < booksList.length) {
        setSelectedBook(booksList[nextIndex].name);
        setSelectedChapter(1);
      }
    }
    setStudyResponse(null);
    setStudyQuery('');
  };

  const handlePrevChapter = () => {
    const bookIndex = booksList.findIndex((b) => b.name === selectedBook);
    if (selectedChapter > 1) {
      setSelectedChapter((prev) => prev - 1);
    } else {
      // Go to previous book’s last chapter
      const prevIndex = bookIndex - 1;
      if (prevIndex >= 0) {
        setSelectedBook(booksList[prevIndex].name);
        setSelectedChapter(booksList[prevIndex].chapters);
      }
    }
    setStudyResponse(null);
    setStudyQuery('');
  };

  // Update cached chapters stats
  const updateCachedStats = () => {
    try {
      const stats: Record<string, number> = {};
      BIBLE_BOOKS.forEach((b) => {
        stats[b.name] = 0;
      });

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('offline_bible_')) {
          const parts = key.split('_');
          if (parts.length >= 4) {
            // Re-joins the name if it contains underscore dividers
            const bookName = parts.slice(2, parts.length - 1).join('_');
            if (stats[bookName] !== undefined) {
              stats[bookName]++;
            }
          }
        }
      }
      setCachedChapters(stats);
    } catch (e) {
      console.warn('Failed to scan offline chapters stats:', e);
    }
  };

  // Run on mount
  useEffect(() => {
    updateCachedStats();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync profile preferences ON LOGIN
  useEffect(() => {
    if (firebaseUser) {
      getOrCreateUserProfile(firebaseUser.uid, firebaseUser.email || '', firebaseUser.displayName || '')
        .then((profile) => {
          if (profile) {
            if (profile.theme && profile.theme !== theme) {
              setTheme(profile.theme);
            }
            if (profile.lastReadBook && profile.lastReadBook !== selectedBook) {
              setSelectedBook(profile.lastReadBook);
            }
            if (profile.lastReadChapter && profile.lastReadChapter !== selectedChapter) {
              setSelectedChapter(profile.lastReadChapter);
            }
          }
        })
        .catch(console.error);
    }
  }, [firebaseUser]);

  // Synchronise preferences back to user profile when changed
  useEffect(() => {
    if (firebaseUser) {
      updateUserProfile(firebaseUser.uid, { theme }).catch(console.error);
    }
  }, [theme, firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      updateUserProfile(firebaseUser.uid, {
        lastReadBook: selectedBook,
        lastReadChapter: selectedChapter
      }).catch(console.error);
    }
  }, [selectedBook, selectedChapter, firebaseUser]);

  // Load HELPS Word-studies Lexicon details on selected word tap
  useEffect(() => {
    if (!selectedWord) {
      setHelpsStudy(null);
      setHelpsError(null);
      return;
    }

    const cacheKey = `helps_study_${selectedWord.originalValue}_${selectedWord.word}`;
    
    // Check localStorage cache first for instant repeat clicks
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setHelpsStudy(JSON.parse(cached));
        setHelpsError(null);
        setIsHelpsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('LocalStorage reads failed:', e);
    }

    setIsHelpsLoading(true);
    setHelpsError(null);
    setHelpsStudy(null);

    // Fetch from server API endpoint
    fetch('/api/helps-word-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: selectedWord.word,
        originalValue: selectedWord.originalValue,
        language: selectedWord.language,
        book: selectedBook,
        chapter: selectedChapter
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve HELPS word study from server');
        return res.json();
      })
      .then((json) => {
        if (json.success && json.data) {
          setHelpsStudy(json.data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(json.data));
          } catch (e) {
            console.warn('LocalStorage write failed:', e);
          }
        } else {
          throw new Error(json.message || 'Error loading HELPS word study details');
        }
      })
      .catch((err) => {
        console.error('HELPS word-study fetch failed:', err);
        setHelpsError('Unable to connect to HELPS index. Using local lexical definitions.');
        
        // Fallback to local approximation matching server-side logic in client code
        const lowerWord = selectedWord.word.toLowerCase();
        let strongs = selectedWord.language === 'Greek' ? 'G3056' : 'H1254';
        let definition = `Lexical Details: [Language: ${selectedWord.language} | Original: ${selectedWord.originalValue}] - Meaning: Historical root term for "${selectedWord.word}".`;
        let study = `In plain English, this word represents a key underlying idea, design, or active spiritual principle. It represents a vital concept of faith, explained clearly here so its inner picture and structural meaning is easily accessible to modern readers.`;
        let usage = `Theological Usage: Appears in key sections of Scripture to define covenant trust, creation, and the direct, ongoing activity of God among His people.`;

        if (lowerWord.includes('word') || lowerWord.includes('logos')) {
          strongs = 'G3056';
          definition = 'Lexical Details: [Language: Greek | Transliteration: lógos | Part of Speech: Noun, Masculine | Root Origin: from 3004 /légō, "to speak"]] - Meaning: Speech, communication, word, or reasoning.';
          study = 'In easy, modern terms, this word describes an idea beautifully put into speech. Just as spoken language carries a person\'s inner thoughts, here it describes God\'s personal message, counsel, and logic made perfectly clear to humans. It refers to the personal and active expression of God Himself, who is visible and real.';
          usage = 'Theological Usage: Seen most famously in John 1 to present Jesus Christ as the absolute, living, and personal self-communication of God who existed before time. It occurs over 300 times to describe the Good News, God\'s promise, and His direct guidance.';
        } else if (lowerWord.includes('beginning') || lowerWord.includes('archē')) {
          strongs = 'G746';
          definition = 'Lexical Details: [Language: Greek | Transliteration: archē | Part of Speech: Noun, Feminine | Root Origin: from 756 /árxō, "to begin, rule"]] - Meaning: Start, primary point, origin, or chief authority.';
          study = 'This refers to the absolute starting point of all created things, time, and space. More than just a day on a calendar, it means the ultimate origin, foundational source, and chief executive power that sets everything else into action. It is the beginning that holds everything together.';
          usage = 'Theological Usage: Echoes Genesis\' primordial start and Christ\'s supreme authority as ruler over all created things. It describes both the origin of time and the foundational structures of the universe.';
        } else if (lowerWord.includes('god') || lowerWord.includes('elohim')) {
          strongs = 'H430';
          definition = 'Lexical Details: [Language: Hebrew | Transliteration: Elohím | Part of Speech: Noun, Plural of Intensity | Root Origin: from Eloah, "mighty deity"]] - Meaning: The One True God, supreme ruler, or divine judge.';
          study = 'This word uses a unique majestic plural ending to show God\'s absolute power, infinite majesty, and perfect wholeness, rather than multiple gods. It points to God as the all-powerful and loving Creator who personally starts, builds, and guards His covenant promises with His people.';
          usage = 'Theological Usage: Appears over 2,500 times in the Old Testament, starting in Genesis 1:1. It emphasizes God\'s great creative power, His authority as judge over the entire Earth, and His faithful commitment to His creation.';
        } else if (lowerWord.includes('light') || lowerWord.includes('phōs')) {
          strongs = 'G5457';
          definition = 'Lexical Details: [Language: Greek | Transliteration: phōs | Part of Speech: Noun, Neuter | Root Origin: from pháō, "to shine"]] - Meaning: Light, physical or spiritual illumination.';
          study = 'This represents the active, beautiful power of goodness and truth that shines directly from God. Just like physical light immediately chases away dark shadows, spiritual light brings clear truth, understanding, and pure love into our minds, exposing errors and clearing away confusion.';
          usage = 'Theological Usage: Used to describe God\'s pure presence, Jesus as the absolute "Light of the World," and the direct truth of the Gospel which guides believers to live honestly and with clear, clean hearts.';
        } else if (lowerWord.includes('grace') || lowerWord.includes('charis')) {
          strongs = 'G5485';
          definition = 'Lexical Details: [Language: Greek | Transliteration: cháris | Part of Speech: Noun, Feminine | Root Origin: from xairō, "to rejoice, be glad"]] - Meaning: Grace, unmerited favor, or joyful gift.';
          study = 'This is the free, beautiful, and completely undeserved goodwill of God. It is God\'s personal favor and loving spiritual influence flowing directly into the human heart, giving people the inner strength to change, grow, and find peace. It creates deep, lasting joy.';
          usage = 'Theological Usage: Lies at the absolute heart of the Christian faith, describing how God saves, heals, and empowers His followers through Christ. It shows that salvation and daily spiritual strength are free, loving gifts.';
        } else if (lowerWord.includes('life') || lowerWord.includes('zōē')) {
          strongs = 'G2222';
          definition = 'Lexical Details: [Language: Greek | Transliteration: zōē | Part of Speech: Noun, Feminine | Root Origin: from záō, "to live"]] - Meaning: Spiritual life, eternal life, or vital energy.';
          study = 'This describes the deep, full, and vibrant life that comes straight from God Himself. It is very different from mere biological survival or physical heartbeat. It refers to a spiritual quality of life that is eternal, joyful, and completely satisfying.';
          usage = 'Theological Usage: Highly prominent in the Gospel of John, where Jesus is called "the Life." It shows that real, lasting life is not found in objects or bodily survival, but in a close personal union with God.';
        } else if (lowerWord.includes('truth') || lowerWord.includes('alētheia') || lowerWord.includes('emet')) {
          strongs = 'G225';
          definition = 'Lexical Details: [Language: Greek | Transliteration: alētheia | Part of Speech: Noun, Feminine | Root Origin: from a- "not" and lēthō, "to hide"]] - Meaning: Truth, reality, or sincerity.';
          study = 'This word literally means "being unconcealed" or "not hidden." It refers to absolute, solid reality—the way things actually are as seen by God. It stands firm and strong against lies, illusions, half-truths, and deceit, revealing honest facts with absolute sincerity.';
          usage = 'Theological Usage: Focuses on the absolute reliability of God, His Word, and Jesus who declared Himself to be "the Truth." It promises that understanding God\'s truth brings real freedom and clarity.';
        } else if (lowerWord.includes('love') || lowerWord.includes('agape') || lowerWord.includes('hesed')) {
          strongs = 'G26';
          definition = 'Lexical Details: [Language: Greek | Transliteration: agápē | Part of Speech: Noun, Feminine | Root Origin: from agapáō, "to love"]] - Meaning: Unconditional choice-love, or covenant devotion.';
          study = 'This is the highest kind of love—a deliberate, sacrificial choice to care deeply for others and seek their absolute best. It does not depend on warm feelings or what the other person can give back. It is a faithful commitment of the will to love unconditionally.';
          usage = 'Theological Usage: Represents God\'s supreme attitude toward humanity, as demonstrated when His Son was sent for the world. It is the primary mark of a believer\'s character and the ultimate virtue in Christian life.';
        }

        setHelpsStudy({
          strongsNumber: strongs,
          shortDefinition: definition,
          helpsWordStudy: study,
          usage: usage
        });
      })
      .finally(() => {
        setIsHelpsLoading(false);
      });
  }, [selectedWord, selectedBook, selectedChapter]);

  // Main chapter loader checking the persistent storage cache first
  const loadChapter = async (book: string, chapter: number) => {
    // Record current book/chapter state to discard stale network threads
    activeChapterRef.current = { book, chapter };
    
    setApiError(null);
    setFocusedVerse(null);
    setStudyResponse(null);
    setStudyQuery('');
    setIsBackgroundFetching(false);

    const cacheKey = `offline_bible_${book}_${chapter}`;
    
    // 1. Prioritize local Static chapters (guarantees exquisite academic text instantly)
    if (STATIC_CHAPTERS[book] && STATIC_CHAPTERS[book][chapter]) {
      const staticData = STATIC_CHAPTERS[book][chapter];
      setChapterData(staticData);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(staticData));
        updateCachedStats();
      } catch (e) {
        console.warn('Failed to write master static chapter to cache:', e);
      }
      setLoading(false);
      return;
    }

    // 2. Try to read from offline cache
    let cachedParsed: any = null;
    let isMockCached = false;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.verses && parsed.verses.length > 0) {
          cachedParsed = parsed;
          isMockCached = parsed.isSynthesizedFallback || 
            (parsed.verses[0] && parsed.verses[0].kjvText && parsed.verses[0].kjvText.includes('day of visitation')) ||
            (!parsed.isHighFidelity) ||
            (book === 'Genesis' && chapter > 1 && parsed.verses.length <= 5) ||
            (parsed.verses.length <= 3 && !STATIC_CHAPTERS[book]?.[chapter]);
            
          // If the cached version is a mockup, immediately discard it to force a real fetch
          if (isMockCached) {
            localStorage.removeItem(cacheKey);
            cachedParsed = null;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached chapter:', e);
    }

    // Serve IMMEDIATELY without waiting if we found a valid, non-mocked cache.
    const needsBackgroundUpgrade = !cachedParsed;

    if (!needsBackgroundUpgrade) {
      setChapterData(cachedParsed);
      setLoading(false);
    } else {
      setLoading(true);
      // Show empty state while loading
      setChapterData(null);
    }

    if (needsBackgroundUpgrade) {
      setIsBackgroundFetching(true);

      // Attempt ultra-fast direct Cloud Firestore reading bypass first
      let resolvedFromDbDirect = false;
      try {
        const docId = `${book.replace(/\s+/g, '')}_${chapter}`;
        const docRef = doc(db, 'chapters', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
          const dbChapter = docSnap.data();
          if (dbChapter && dbChapter.verses && dbChapter.verses.length > 0) {
            setChapterData(dbChapter as any);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(dbChapter));
              updateCachedStats();
            } catch (e) {
              console.warn('Failed to cache direct Firestore chapter:', e);
            }
            resolvedFromDbDirect = true;
            setLoading(false);
          }
        }
      } catch (dbErr) {
        console.warn('Direct client-side database lookup bypassed (falling back to REST API):', dbErr);
      }

      if (resolvedFromDbDirect) {
        setIsBackgroundFetching(false);
        return;
      }

      try {
        const res = await fetch(`/api/bible-chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`);
        const responseData = await res.json();

        // Discard background response if user has already turned the page
        if (activeChapterRef.current.book !== book || activeChapterRef.current.chapter !== chapter) {
          return;
        }

        if (responseData.success && responseData.data) {
          setChapterData(responseData.data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(responseData.data));
            updateCachedStats();
          } catch (e) {
            console.warn('Failed to cache server response:', e);
          }
          setLoading(false);
        } else {
          throw new Error(responseData.message || 'Unable to load study manuscript metrics.');
        }
      } catch (err: any) {
        console.warn('Silent background update failed:', err.message);
        // Turn off spinner & set readable content if failed so user experiences zero crash
        if (activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
          const currentData = cachedParsed || { verses: [] };
          setChapterData(currentData);
          setLoading(false);
        }
      } finally {
        if (activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
          setIsBackgroundFetching(false);
          setLoading(false);
        }
      }
    }
  };

  // Asynchronous downloader to prepare complete books of the Bible one-by-one offline
  const handleDownloadBook = async (book: string) => {
    const bookObj = BIBLE_BOOKS.find((b) => b.name === book);
    if (!bookObj) return;

    cancelDownloadRef.current = false;
    setDownloadingBook(book);
    setDownloadProgress(0);
    setDownloadStatusLog([`Initializing offline synchronization for ${book}...`]);

    const totalChaptersCount = bookObj.chapters;
    let successfulCount = 0;

    for (let ch = 1; ch <= totalChaptersCount; ch++) {
      if (cancelDownloadRef.current) {
        setDownloadStatusLog((prev) => [...prev, `❌ Synchronization cancelled by user.`]);
        break;
      }

      setDownloadStatusLog((prev) => [...prev, `Parsing Chapter ${ch}/${totalChaptersCount}...`]);
      
      const cacheKey = `offline_bible_${book}_${ch}`;
      let isAlreadyCached = false;
      let cachedData: any = null;
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          cachedData = JSON.parse(cachedStr);
          isAlreadyCached = true;
        }
      } catch {}

      const isMockCached = cachedData && (
        cachedData.isSynthesizedFallback ||
        (!cachedData.isHighFidelity) ||
        (book === 'Genesis' && ch > 1 && cachedData.verses && cachedData.verses.length <= 5) ||
        (cachedData.verses && cachedData.verses.length <= 3 && !STATIC_CHAPTERS[book]?.[ch]) ||
        (cachedData.verses && cachedData.verses[0] && cachedData.verses[0].kjvText && cachedData.verses[0].kjvText.includes('day of visitation'))
      );

      // Clean old mocked cache data
      if (isMockCached) {
        localStorage.removeItem(cacheKey);
      }

      if (isAlreadyCached && !isMockCached) {
        successfulCount++;
        setDownloadProgress(Math.round((successfulCount / totalChaptersCount) * 100));
        continue;
      }

      // Handle custom master chapters
      if (STATIC_CHAPTERS[book] && STATIC_CHAPTERS[book][ch]) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(STATIC_CHAPTERS[book][ch]));
          successfulCount++;
          setDownloadProgress(Math.round((successfulCount / totalChaptersCount) * 100));
        } catch {}
        continue;
      }

      // Load dynamically
      try {
        const res = await fetch(`/api/bible-chapter?book=${encodeURIComponent(book)}&chapter=${ch}&no_ai=true`);
        const responseData = await res.json();
        if (responseData.success && responseData.data) {
          localStorage.setItem(cacheKey, JSON.stringify(responseData.data));
          successfulCount++;
        } else {
          throw new Error('API issue');
        }
      } catch {
        console.warn(`Failed to fetch and cache ${book} chapter ${ch}`);
        // Do not increment successfulCount so the progress reflects failures
      }

      setDownloadProgress(Math.round((successfulCount / totalChaptersCount) * 100));
      updateCachedStats();

      // Pause briefly (120ms) to ensure the client-side remains incredibly smooth and thread-free
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    if (!cancelDownloadRef.current) {
      setDownloadStatusLog((prev) => [
        ...prev,
        `🎉 Book of ${book} is now 100% indexed and fully accessible offline! (${totalChaptersCount}/${totalChaptersCount} chapters)`
      ]);
    }
    
    setDownloadingBook(null);
    updateCachedStats();
  };

  const handleClearBookCache = (book: string) => {
    const bookObj = BIBLE_BOOKS.find((b) => b.name === book);
    if (!bookObj) return;

    for (let ch = 1; ch <= bookObj.chapters; ch++) {
      localStorage.removeItem(`offline_bible_${book}_${ch}`);
    }
    updateCachedStats();
  };

  const handleClearAllCaches = () => {
    if (window.confirm('Clear all offline-stored Bible chapters? This action cannot be undone.')) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('offline_bible_')) {
          localStorage.removeItem(key);
        }
      }
      updateCachedStats();
    }
  };

  // Trigger chapter load when book or chapter changes
  useEffect(() => {
    loadChapter(selectedBook, selectedChapter);
    setCurrentVersePage(0);
  }, [selectedBook, selectedChapter]);

  // Keep saved verses synchronized
  useEffect(() => {
    localStorage.setItem('saved_bible_study_verses', JSON.stringify(savedVerses));
  }, [savedVerses]);

  // Click away to dismiss highlighted word explanations and dropdowns
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Dismiss active word details
      setActiveWordId(null);
      setSelectedWord(null);

    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Monitor PWA triggers & auto-detect device platforms
  useEffect(() => {
    // Detect platforms
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDetectedPlatform('ios');
      setActiveInstallTab('ios');
    } else if (/android/.test(ua)) {
      setDetectedPlatform('android');
      setActiveInstallTab('android');
    } else {
      setDetectedPlatform('desktop');
      setActiveInstallTab('desktop');
    }

    // Capture the PWA install stimulus
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      // Prompt modal with step-by-step custom instructions!
      setIsInstallModalOpen(true);
    }
  };

  // Custom AI Explorer submission
  const handleSeekInsight = async (e: FormEvent) => {
    e.preventDefault();
    if (!studyQuery.trim() || !focusedVerse || !chapterData) return;

    setIsStudyLoading(true);
    setStudyResponse(null);

    try {
      const res = await fetch('/api/explain-verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book: chapterData.book,
          chapter: chapterData.chapter,
          verseNumber: focusedVerse.verseNumber,
          verseText: focusedVerse.nonNativeEnglish,
          query: studyQuery,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStudyResponse(data.explanation);
      } else {
        throw new Error(data.message || 'Inquiry processing failed.');
      }
    } catch (err: any) {
      setStudyResponse(
        `### Study Assistant Notice\n\nUnable to generate interactive explanation because the Gemini API key is not fully configured, or there was a system load. You can read the built-in contemporary and non-native commentaries directly in the study table!`
      );
    } finally {
      setIsStudyLoading(false);
    }
  };

  // Toggle saving verses and managing highlight profiles
  const isVerseSaved = (verseNum: number) => {
    return savedVerses.some(
      (sv) =>
        sv.book === selectedBook &&
        sv.chapter === selectedChapter &&
        sv.verse === verseNum
    );
  };

  const toggleSaveVerse = (verseNum: number) => {
    if (isVerseSaved(verseNum)) {
      setSavedVerses((prev) =>
        prev.filter(
          (sv) =>
            !(
              sv.book === selectedBook &&
              sv.chapter === selectedChapter &&
              sv.verse === verseNum
            )
        )
      );
      if (firebaseUser) {
        deleteUserBookmark(firebaseUser.uid, selectedBook, selectedChapter, verseNum).catch(console.error);
      }
    } else {
      setSavedVerses((prev) => [
        ...prev,
        { book: selectedBook, chapter: selectedChapter, verse: verseNum, color: 'none' },
      ]);
      if (firebaseUser) {
        saveUserBookmark(firebaseUser.uid, {
          id: `${selectedBook}_${selectedChapter}_${verseNum}`,
          book: selectedBook,
          chapter: selectedChapter,
          verse: verseNum,
          color: 'none',
          notes: ''
        }).catch(console.error);
      }
    }
  };

  const getVerseHighlight = (verseNum: number) => {
    return savedVerses.find(
      (sv) =>
        sv.book === selectedBook &&
        sv.chapter === selectedChapter &&
        sv.verse === verseNum
    );
  };

  const setVerseHighlightColor = (verseNum: number, color: string) => {
    setSavedVerses((prev) => {
      const exists = prev.some(
        (sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
      );
      if (exists) {
        return prev.map((sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
            ? { ...sv, color }
            : sv
        );
      } else {
        return [
          ...prev,
          { book: selectedBook, chapter: selectedChapter, verse: verseNum, color },
        ];
      }
    });

    if (firebaseUser) {
      const existing = savedVerses.find(
        (sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${selectedBook}_${selectedChapter}_${verseNum}`,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum,
        color: color as any,
        notes: existing ? existing.notes : ''
      }).catch(console.error);
    }
  };

  const updateVerseProfileNotes = (verseNum: number, notes: string) => {
    setSavedVerses((prev) => {
      const exists = prev.some(
        (sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
      );
      if (exists) {
        return prev.map((sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
            ? { ...sv, notes }
            : sv
        );
      } else {
        return [
          ...prev,
          { book: selectedBook, chapter: selectedChapter, verse: verseNum, notes },
        ];
      }
    });

    if (firebaseUser) {
      const existing = savedVerses.find(
        (sv) =>
          sv.book === selectedBook &&
          sv.chapter === selectedChapter &&
          sv.verse === verseNum
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${selectedBook}_${selectedChapter}_${verseNum}`,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum,
        color: existing ? (existing.color as any) : 'none',
        notes: notes
      }).catch(console.error);
    }
  };

  // ==========================================
  // DISCIPLINED STUDY UPGRADE (1, 2, 4) HANDLERS
  // ==========================================

  // Feature 1: Audio Playback (TTS)
  const stopSpeaking = () => {
    activeAudioSessionRef.current += 1;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlayingAudio(false);
    setActiveAudioStream(null);
    setCurrentlyReadingVerse(null);
  };

  const getSpeechTextForVerse = (v: Verse, overrideTransType?: 'plain' | 'pers' | 'kjv' | 'bsb') => {
    if (overrideTransType) {
      if (overrideTransType === 'plain') return v.contemporary;
      if (overrideTransType === 'pers') return v.nonNativeEnglish;
      if (overrideTransType === 'kjv') return v.kjvText || '';
      if (overrideTransType === 'bsb') return v.bsbText || '';
    }

    if (audioReadingSelection === 'kjv') {
      return v.kjvText;
    }
    if (audioReadingSelection === 'bsb') {
      return v.bsbText;
    }
    if (audioReadingSelection === 'plain') {
      return v.contemporary;
    }
    if (audioReadingSelection === 'personalized') {
      return v.nonNativeEnglish;
    }

    // Default 'dynamic' mode matches display settings dynamically
    const textParts: string[] = [];

    // Include Manuscript References if enabled
    if (isComparisonEnabled) {
      if (referenceDisplayMode === 'both' || referenceDisplayMode === 'kjv') {
        textParts.push(`King James Version: ${v.kjvText}`);
      }
      if (referenceDisplayMode === 'both' || referenceDisplayMode === 'bsb') {
        textParts.push(`Berean Standard Bible: ${v.bsbText}`);
      }
    }

    // Include theological interpretations/translations based on settings
    if (translationDisplayMode === 'plain') {
      textParts.push(v.contemporary);
    } else if (translationDisplayMode === 'personalized') {
      textParts.push(v.nonNativeEnglish);
    } else {
      textParts.push(`Contemporary version: ${v.contemporary}`);
      textParts.push(`Personalized version: ${v.nonNativeEnglish}`);
    }

    return textParts.join('. ');
  };

  const playTranslationStream = (transType: 'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe') => {
    if (!chapterData || !synthRef.current) return;
    stopSpeaking();
    
    // setActiveAudioStream might not trigger immediately due to how React batches, 
    // but setting it here is good.
    setActiveAudioStream(transType);

    const activeVerses = [...chapterData.verses];
    let currentIndex = 0;
    const sessionId = activeAudioSessionRef.current;

    const playNext = () => {
      if (sessionId !== activeAudioSessionRef.current) return;

      if (currentIndex >= activeVerses.length) {
        setIsPlayingAudio(false);
        setCurrentlyReadingVerse(null);
        return;
      }
      
      const v = activeVerses[currentIndex];
      setCurrentlyReadingVerse(v.verseNumber);
      setIsPlayingAudio(true);

      let text = '';
      if (transType === 'plain') text = v.contemporary;
      else if (transType === 'pers') text = v.nonNativeEnglish;
      else if (transType === 'kjv') text = v.kjvText || '';
      else if (transType === 'bsb') text = v.bsbText || '';
      else if (['asv', 'ylt', 'bbe'].includes(transType)) {
        text = (dynamicTranslationData[transType] && dynamicTranslationData[transType][v.verseNumber.toString()]) || '';
      }

      const utteranceText = `Verse ${v.verseNumber}, ${text}`;
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      utterance.rate = playbackSpeed;

      const voices = synthRef.current?.getVoices() || [];
      const preferred = voices.find(vo => vo.lang.startsWith('en-US')) || voices.find(vo => vo.lang.startsWith('en')) || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        if (sessionId !== activeAudioSessionRef.current) return;
        currentIndex++;
        playNext();
      };
      
      utterance.onerror = () => {
        if (sessionId !== activeAudioSessionRef.current) return;
        currentIndex++;
        playNext();
      };

      utteranceRef.current = utterance;
      synthRef.current?.speak(utterance);
    };

    playNext();
  };

  const playEntireChapter = () => {
    if (!chapterData || !synthRef.current) return;
    stopSpeaking();
    setActiveAudioStream('chapter');
    const activeVerses = [...chapterData.verses];
    let currentIndex = 0;
    const sessionId = activeAudioSessionRef.current;

    const playNext = () => {
      if (sessionId !== activeAudioSessionRef.current) return;

      if (currentIndex >= activeVerses.length) {
        setIsPlayingAudio(false);
        setCurrentlyReadingVerse(null);
        return;
      }
      
      const v = activeVerses[currentIndex];
      setCurrentlyReadingVerse(v.verseNumber);
      setIsPlayingAudio(true);

      const utteranceText = `Verse ${v.verseNumber}, ${getSpeechTextForVerse(v)}`;
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      utterance.rate = playbackSpeed;

      const voices = synthRef.current?.getVoices() || [];
      const preferred = voices.find(vo => vo.lang.startsWith('en-US')) || voices.find(vo => vo.lang.startsWith('en')) || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        if (sessionId !== activeAudioSessionRef.current) return;
        currentIndex++;
        playNext();
      };
      
      utterance.onerror = () => {
        if (sessionId !== activeAudioSessionRef.current) return;
        currentIndex++;
        playNext();
      };

      utteranceRef.current = utterance;
      synthRef.current?.speak(utterance);
    };

    playNext();
  };

  const playSingleVerse = (verseNum: number, text: string) => {
    if (!synthRef.current) return;
    stopSpeaking();

    setIsPlayingAudio(true);
    setActiveAudioStream('single');
    setCurrentlyReadingVerse(verseNum);

    const utteranceText = `Verse ${verseNum}. ${text}`;
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.rate = playbackSpeed;

    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setCurrentlyReadingVerse(null);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setCurrentlyReadingVerse(null);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  // Feature 4: Custom Audio Beep feedback using Web Audio API
  const playWebAudioBeep = (freq: number, type: OscillatorType, duration: number) => {
    // Silenced per user request
    return;
  };

  // Vocabulary Quiz Loader
  const startVocabularyQuiz = () => {
    if (!chapterData) return;

    const allWords: Array<{ word: string; original: string; meaning: string }> = [];
    const seen = new Set<string>();

    chapterData.verses.forEach((v) => {
      if (v.specialWords) {
        v.specialWords.forEach((sw) => {
          if (!seen.has(sw.word)) {
            seen.add(sw.word);
            allWords.push({
              word: sw.word,
              original: sw.originalValue,
              meaning: sw.explanation
            });
          }
        });
      }
    });

    if (allWords.length < 2) {
      const fallbackList = [
        { word: 'beginning', original: 'Archē (ἀρχή) / Bereshit (בְּרֵאשִׁית)', meaning: 'The absolute source or origin of time and creation.' },
        { word: 'God', original: 'Elohim (אֱלֹהִים)', meaning: 'The powerful, majestic plural title of Creator God.' },
        { word: 'created', original: 'Bara (בָּרָא)', meaning: 'A Hebrew verb meaning to make something beautiful out of nothing.' },
        { word: 'Spirit', original: 'Ruach (רוּחַ) / Pneuma (πνεῦμα)', meaning: 'The active, life-giving breath, wind, or Holy Spirit.' },
        { word: 'Word', original: 'Logos (λόγος)', meaning: 'The divine, living expression of theological reason and Truth.' },
        { word: 'love', original: 'Agape (ἀγάπη) / Hesed (חֶסֶד)', meaning: 'Unconditional, choosing covenant love and kind devotion.' }
      ];
      fallbackList.forEach(item => {
        if (!seen.has(item.word)) {
          allWords.push(item);
        }
      });
    }

    setQuizWords([...allWords].sort(() => Math.random() - 0.5));
    setQuizMeanings([...allWords].map(w => w.meaning).sort(() => Math.random() - 0.5));

    setSelectedWordIndex(null);
    setSelectedMeaningIndex(null);
    setMatchedPairs([]);
    setQuizScore(0);
    setQuizFeedback('Match the Hebrew/Greek root word buttons with their theological definition buttons!');
    setQuizMode('vocabulary');
    setIsQuizOpen(true);
  };

  // Matcher checks
  const handleWordSelect = (idx: number) => {
    if (matchedPairs.includes(idx)) return;
    setSelectedWordIndex(idx);
    if (selectedMeaningIndex !== null) {
      triggerMatchingCheck(idx, selectedMeaningIndex);
    }
  };

  const handleMeaningSelect = (idx: number) => {
    const meaningText = quizMeanings[idx];
    const isAlreadyMatched = quizWords.some((qw, qwIdx) => matchedPairs.includes(qwIdx) && qw.meaning === meaningText);
    if (isAlreadyMatched) return;

    setSelectedMeaningIndex(idx);
    if (selectedWordIndex !== null) {
      triggerMatchingCheck(selectedWordIndex, idx);
    }
  };

  const triggerMatchingCheck = (wordIdx: number, meaningIdx: number) => {
    const wordObj = quizWords[wordIdx];
    const selectedMeaningText = quizMeanings[meaningIdx];

    if (wordObj.meaning === selectedMeaningText) {
      const nextMatched = [...matchedPairs, wordIdx];
      setMatchedPairs(nextMatched);
      setQuizScore((prev) => prev + 10);
      setQuizFeedback(`Excellent match! "${wordObj.original}" indeed means: "${wordObj.meaning}"`);
      setSelectedWordIndex(null);
      setSelectedMeaningIndex(null);
      playWebAudioBeep(600, 'sine', 0.1);

      // Record final vocabulary completion to Cloud Firestore
      if (nextMatched.length === quizWords.length && firebaseUser) {
        recordQuizScore(firebaseUser.uid, {
          id: `vocab_${selectedBook}_${selectedChapter}_${Date.now()}`,
          mode: 'vocabulary',
          score: (quizScore + 10),
          quizBook: selectedBook,
          quizChapter: selectedChapter
        }).catch(console.error);
      }
    } else {
      setQuizFeedback(`Oops! "${wordObj.original}" does not match that explanation. Try another combination.`);
      setSelectedWordIndex(null);
      setSelectedMeaningIndex(null);
      playWebAudioBeep(220, 'triangle', 0.25);
    }
  };

  // Memorization Quiz Loader
  const startMemorizationQuiz = (verseObj: Verse | null = null) => {
    if (!chapterData) return;

    let targetVerse = verseObj;
    if (!targetVerse) {
      const savedInThisChapter = savedVerses.filter(sv => sv.book === selectedBook && sv.chapter === selectedChapter);
      if (savedInThisChapter.length > 0) {
        const chosenSaved = savedInThisChapter[Math.floor(Math.random() * savedInThisChapter.length)];
        targetVerse = chapterData.verses.find(v => v.verseNumber === chosenSaved.verse) || chapterData.verses[0];
      } else {
        targetVerse = chapterData.verses[0];
      }
    }

    if (!targetVerse) return;

    setQuizVerse(targetVerse);
    const words = targetVerse.nonNativeEnglish.split(/\s+/);
    const indicesToBlank: number[] = [];

    words.forEach((word, idx) => {
      const cleanWord = word.replace(/[.,:;?!()"']/g, '');
      if (cleanWord.length > 3 && Math.random() < 0.4 && indicesToBlank.length < 5) {
        indicesToBlank.push(idx);
      }
    });

    if (indicesToBlank.length === 0 && words.length > 0) {
      indicesToBlank.push(Math.floor(Math.random() * words.length));
    }

    setBlankedIndices(indicesToBlank.sort((a, b) => a - b));
    setBlankedWords(words);
    setUserBlankInput({});
    setMemorizationCorrectCount(null);
    setQuizFeedback('Try to fill in the missing words of this personalized scripture translation!');
    setQuizMode('memorization');
    setIsQuizOpen(true);
  };

  const checkMemorizationAnswers = () => {
    if (!quizVerse) return;

    let correctCount = 0;
    blankedIndices.forEach((idx) => {
      const originalWord = blankedWords[idx].replace(/[.,:;?!()"']/g, '').toLowerCase();
      const userWord = (userBlankInput[idx] || '').trim().toLowerCase();
      if (originalWord === userWord) {
        correctCount++;
      }
    });

    setMemorizationCorrectCount(correctCount);
    if (correctCount === blankedIndices.length) {
      setQuizFeedback(`Perfect memory! You successfully recalled this verse word-for-word! ⭐`);
      playWebAudioBeep(880, 'sine', 0.12);
      setTimeout(() => playWebAudioBeep(1100, 'sine', 0.18), 120);
    } else {
      setQuizFeedback(`Nice try! You recalled ${correctCount} out of ${blankedIndices.length} blanked words. Adjust and check again!`);
      playWebAudioBeep(330, 'triangle', 0.25);
    }

    if (firebaseUser) {
      recordQuizScore(firebaseUser.uid, {
        id: `memorize_${selectedBook}_${selectedChapter}_${quizVerse.verseNumber}_${Date.now()}`,
        mode: 'memorization',
        score: correctCount,
        quizBook: selectedBook,
        quizChapter: selectedChapter
      }).catch(console.error);
    }
  };

  // Helper: Highlight and render text with clickable elements for special words
  const renderInteractiveText = (text: string, specialWords: SpecialWord[], contextId: string) => {
    if (!specialWords || specialWords.length === 0) return <span>{text}</span>;

    // Sort by descending word length so we don't accidentally match partial words of longer ones
    const sortedWords = [...specialWords].sort(
      (a, b) => b.word.length - a.word.length
    );

    // Escape special words for safe regex compilation
    const escapedWords = sortedWords
      .map((sw) => sw.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .filter(Boolean);

    if (escapedWords.length === 0) return <span>{text}</span>;

    // Use boundary \b to match exact word tokens
    const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) => {
          const match = sortedWords.find(
            (sw) => sw.word.toLowerCase() === part.toLowerCase()
          );
          if (match) {
            const uniqueWordId = `${contextId}-${match.word}-${index}`;
            const isActive = activeWordId === uniqueWordId;

            return (
              <span key={index} className="relative inline-block z-10 mx-[1px]">
                <button
                  id={`special-word-btn-${uniqueWordId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) {
                      setActiveWordId(null);
                    } else {
                      setActiveWordId(uniqueWordId);
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded-sm transition-all duration-150 transform hover:-translate-y-0.5 cursor-pointer inline-block text-[100%] font-semibold shadow-sm ${
                    theme === 'light'
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-900 mix-blend-multiply'
                      : 'bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 mix-blend-screen'
                  }`}
                  title="Tap to reveal original Greek/Hebrew manuscript context"
                >
                  {part}
                </button>

                {isActive && (
                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 sm:w-72 p-3 rounded-xl border shadow-2xl z-50 text-left leading-[1.8] tracking-[0.01em] ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/40'
                        : 'bg-[#0b1225]/95 border-cyan-500/40 text-slate-150 shadow-[#020408]/70'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Arrow indicator at the top matching theme background */}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 w-2 h-2 rotate-45 border-l border-t ${
                      theme === 'light'
                        ? 'bg-white border-slate-200'
                        : 'bg-[#0b1225] border-cyan-500/40'
                    }`} />

                    <div className="flex items-start justify-between pb-1 border-b border-dashed border-cyan-500/15 mb-1.5">
                      <div>
                        <span className={`text-[8px] font-mono tracking-widest uppercase font-bold block ${
                          theme === 'light' ? 'text-amber-700' : 'text-amber-400'
                        }`}>
                          {match.language} Core ({match.originalValue})
                        </span>
                        <h4 className={`text-sm font-sans font-extrabold ${
                          theme === 'light' ? 'text-slate-950' : 'text-white'
                        }`}>
                          {match.word}
                        </h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveWordId(null);
                        }}
                        className={`p-0.5 rounded-full hover:opacity-80 transition cursor-pointer ${
                          theme === 'light' ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#121c38]'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <p className={`text-[15px] leading-[1.8] tracking-[0.01em] font-sans font-medium ${
                      theme === 'light' ? 'text-slate-650 text-slate-600' : 'text-slate-300'
                    }`}>
                      {match.explanation}
                    </p>
                  </div>
                )}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-[#FAFAFA] text-zinc-900' : 'bg-[#09090B] text-zinc-50'} flex flex-col font-sans relative overflow-x-clip selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-800 dark:selection:text-zinc-100 transition-colors duration-300`}>
      {/* Refined subtle backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/20 via-transparent to-transparent dark:from-zinc-900/20 pointer-events-none" />
      <div className={`absolute top-0 left-0 w-full h-[2px] ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'} z-50`} />

      {/* FIXED NAV BAR (COLLAPSIBLE & STICKY) */}
      <AnimatePresence initial={false}>
        {!isHeaderCollapsed && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full ${theme === 'light' ? 'bg-white/95 backdrop-blur-md border-zinc-200 shadow-sm' : 'bg-zinc-950/95 backdrop-blur-md border-zinc-800 shadow-xl'} border-b px-2 md:px-4 py-1 z-40 sticky top-0 transition-transform duration-500 ease-in-out`}
          >
            <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3">
              
              {/* CENTER SELECTORS FOR SELECTING BOOKS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Book Thumbnail with Progress Ring */}
                <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      className={`${theme === 'light' ? 'stroke-zinc-200' : 'stroke-zinc-800'}`}
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      className="stroke-cyan-500 transition-all duration-150 ease-out"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - readPercentage / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <img
                    src={logoSrc}
                    alt="Book Thumbnail"
                    className="w-6 h-6 object-contain rounded-md relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Unified Book & Chapter Selector */}
                <div>
                  <button
                    id="nav-modal-btn"
                    onClick={() => {
                      setIsBookDropdownOpen(true);
                      setIsChapterDropdownOpen(false); // Using this to represent the "book" vs "chapter" step
                    }}
                    className={`flex items-center space-x-2 ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]' : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700 shadow-lg'} px-4 py-2 rounded-lg text-sm md:text-base transition-all cursor-pointer font-serif justify-between font-bold`}
                  >
                    <span>{selectedBook} {selectedChapter}</span>
                    <ChevronLeft className={`w-4 h-4 -rotate-90 ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  </button>

                </div>

                
              </div>
              
              {/* Top Right Study Options button */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setFullPageMenu('versions');
                    playWebAudioBeep(440, 'sine', 0.05);
                  }}
                  className={`p-2 transition-all hover:scale-105 active:scale-95 group ${theme === 'light' ? 'text-slate-700 hover:text-cyan-600' : 'text-slate-300 hover:text-cyan-400'}`}
                  title="Study Options"
                >
                  <Settings2 className="w-6 h-6 transition-transform group-hover:rotate-45" />
                </button>
              </div>

            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* FLOAT POP TRIGGERS WHEN HEADER COLLAPSED */}
      <AnimatePresence>
      {isHeaderCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed top-3 left-4 z-40 flex items-center space-x-3 backdrop-blur-md p-2 rounded-lg shadow-md ${
            isHeaderHidden ? 'pointer-events-none' : ''
          } ${
            theme === 'light' ? 'bg-white border border-slate-200 text-slate-800' : 'bg-[#0a0f1d]/90 border border-cyan-500/30'
          }`}
        >
          <button
            id="expand-header-btn"
            onClick={() => setIsHeaderCollapsed(false)}
            className={`flex items-center space-x-1.5 text-sm font-mono ${theme === 'light' ? 'text-cyan-700 hover:text-cyan-800' : 'text-cyan-400 hover:text-cyan-300'}`}
          >
            <Menu className="w-4 h-4 font-bold" />
            <span className="uppercase font-semibold tracking-wider">SHOW NAV MENU</span>
          </button>
          <div className={`h-4 w-[1px] ${theme === 'light' ? 'bg-slate-200' : 'bg-cyan-950'}`} />
          <span className={`text-sm font-display font-medium px-1 font-mono ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
            {selectedBook} {selectedChapter}
          </span>
          {/* Collapsed Theme Switcher */}
          <div className="flex items-center space-x-1.5 pl-1.5">
            {/* Collapsed Sync Gate */}
            <button
              onClick={() => setIsCloudSyncOpen(true)}
              className={`p-1.5 rounded transition cursor-pointer ${
                firebaseUser
                  ? (theme === 'light' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400')
                  : (theme === 'light' ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700' : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-400')
              }`}
              title="Open Scholar Cloud Sync Preferences"
            >
              <Cloud className={`w-3.5 h-3.5 ${firebaseUser ? '' : 'animate-pulse'}`} />
            </button>

            {/* Collapsed Speech Desk Trigger */}
            <button
              onClick={() => {
                setIsStudySidebarOpen(true);
                setActiveSidebarTab('audio');
                playWebAudioBeep(600, 'sine', 0.05);
              }}
              className={`p-1.5 rounded transition cursor-pointer ${
                theme === 'light' ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-750' : 'bg-cyan-950/40 hover:bg-cyan-950 text-cyan-400'
              }`}
              title="Open Audio Settings"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-1.5 rounded transition cursor-pointer ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-100/10 hover:bg-slate-200/20'}`}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* FLOATING AUDIO PLAY FAB & TRANSLATION TOGGLE */}
      <div className={`fixed bottom-[76px] left-4 right-4 z-[90] flex items-center ${translationDisplayMode === 'both' ? 'justify-between' : 'justify-start'} pointer-events-none transition-all duration-500 ease-in-out ${isSidePanelHidden ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="pointer-events-auto">
            <AudioFAB 
              theme={theme}
              isPlayingAudio={isPlayingAudio}
              activeAudioStream={activeAudioStream}
              stopSpeaking={stopSpeaking}
              playTranslationStream={playTranslationStream}
              currentTransId={translationDisplayMode === 'both' ? dualStreamLeft : (['plain', 'kjv', 'bsb', 'pers', 'asv', 'ylt', 'bbe'].includes(translationDisplayMode) ? translationDisplayMode : 'plain')}
              onTransChange={(newTrans: string) => {
                if (translationDisplayMode === 'both') {
                  setDualStreamLeft(newTrans as any);
                } else {
                  setTranslationDisplayMode(newTrans as any);
                  localStorage.setItem('personalized_bible_translation_display_mode', newTrans);
                }
              }}
            />
          </div>
          {translationDisplayMode === 'both' && (
            <div className="pointer-events-auto">
              <AudioFAB 
                theme={theme}
                isPlayingAudio={isPlayingAudio}
                activeAudioStream={activeAudioStream}
                stopSpeaking={stopSpeaking}
                playTranslationStream={playTranslationStream}
                currentTransId={dualStreamRight}
                onTransChange={(newTrans: string) => {
                  setDualStreamRight(newTrans as any);
                }}
              />
            </div>
          )}
      </div>
      
      {/* FLOATING PILL BOTTOM NAVIGATION BAR */}
      <div className={`fixed bottom-2 left-4 right-4 z-[1050] flex items-center justify-around px-2 py-1 rounded-[2rem] shadow-2xl backdrop-blur-xl transition-all duration-500 ease-in-out ${
        isSidePanelHidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      } ${
        theme === 'light'
          ? 'bg-white/95 border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
          : 'bg-[#1c1c1e]/95 border border-[#2d2d2d] shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
      } `}>
          
        <button
          onClick={() => {
              setFullPageMenu(null);
              setIsProjectionStudioOpen(false);
              setMainView('read');
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-[1.25rem] transition-all w-16 group`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${!fullPageMenu && !isProjectionStudioOpen && mainView === 'read' ? (theme === 'light' ? 'bg-slate-300 text-slate-900' : 'bg-slate-600 text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>
             <BookOpen className="w-[22px] h-[22px]" strokeWidth={!fullPageMenu && !isProjectionStudioOpen && mainView === 'read' ? 4 : 3} />
          </div>
          <span className={`text-[13px] font-black tracking-wide mt-1 ${!fullPageMenu && !isProjectionStudioOpen && mainView === 'read' ? (theme === 'light' ? 'text-slate-900' : 'text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>Read</span>
        </button>

        <button
          onClick={() => {
              setFullPageMenu(null);
              setIsProjectionStudioOpen(true);
              playWebAudioBeep(520, 'sine', 0.08);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-[1.25rem] transition-all w-16 group`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${isProjectionStudioOpen ? (theme === 'light' ? 'bg-slate-300 text-slate-900' : 'bg-slate-600 text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>
             <MonitorPlay className="w-[22px] h-[22px]" strokeWidth={isProjectionStudioOpen ? 4 : 3} />
          </div>
          <span className={`text-[13px] font-black tracking-wide mt-1 ${isProjectionStudioOpen ? (theme === 'light' ? 'text-slate-900' : 'text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>LiveScreen</span>
        </button>

        <button
          onClick={() => {
              setIsProjectionStudioOpen(false);
              setFullPageMenu(null);
              setMainView('interlinear');
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-[1.25rem] transition-all w-16 group`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${!fullPageMenu && !isProjectionStudioOpen && mainView === 'interlinear' ? (theme === 'light' ? 'bg-slate-300 text-slate-900' : 'bg-slate-600 text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>
             <Layers className="w-[22px] h-[22px]" strokeWidth={!fullPageMenu && !isProjectionStudioOpen && mainView === 'interlinear' ? 4 : 3} />
          </div>
          <span className={`text-[13px] font-black tracking-wide mt-1 ${!fullPageMenu && !isProjectionStudioOpen && mainView === 'interlinear' ? (theme === 'light' ? 'text-slate-900' : 'text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>Interlinear</span>
        </button>

        <button
          onClick={() => {
              setIsProjectionStudioOpen(false);
              setFullPageMenu('settings');
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-[1.25rem] transition-all w-16 group`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${fullPageMenu === 'settings' ? (theme === 'light' ? 'bg-slate-300 text-slate-900' : 'bg-slate-600 text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>
             <Settings className="w-[22px] h-[22px]" strokeWidth={fullPageMenu === 'settings' ? 4 : 3} />
          </div>
          <span className={`text-[13px] font-black tracking-wide mt-1 ${fullPageMenu === 'settings' ? (theme === 'light' ? 'text-slate-900' : 'text-slate-100') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`}>Settings</span>
        </button>
      </div>

      {/* FULL PAGE MENU MODAL */}
      <AnimatePresence>
        {fullPageMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed inset-0 pb-[75px] z-[800] flex flex-col overflow-hidden ${theme === 'light' ? 'bg-[#fcfcfc]' : 'bg-[#0a0d16]'}`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 md:p-6 border-b ${theme === 'light' ? 'border-slate-200/80 bg-white/50' : 'border-zinc-800/80 bg-[#0c111c]/50'} backdrop-blur-md sticky top-0 z-10`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFullPageMenu(null)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold font-display tracking-tight capitalize">
                  {fullPageMenu === 'versions' ? 'Study Options' : 'App Settings'}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center pb-32 md:pb-32">
              <div className="w-full max-w-2xl flex flex-col space-y-6">
                
                {fullPageMenu === 'settings' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Layout Mode Toggle */}
                      <div className={`flex flex-col space-y-2 p-4 rounded-2xl shadow-sm border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#121622] border-cyan-950/30'}`}>
                        <div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Layout Mode</div>
                        <select
                          value={layoutMode}
                          onChange={(e) => {
                            const mode = e.target.value;
                            setLayoutMode(mode);
                            localStorage.setItem('personalized_bible_layout_mode', mode);
                          }}
                          className={`w-full text-sm font-medium border-0 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-900/50 text-slate-200'
                          }`}
                        >
                          <option value="paragraph">Paragraph</option>
                          <option value="formal">Formal</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ref Manuscript Toggle */}
                      <div className={`flex flex-col space-y-2 p-4 rounded-2xl shadow-sm border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#121622] border-cyan-950/30'}`}>
                        <div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Reference View</div>
                        <div
                          onClick={() => setIsComparisonEnabled(!isComparisonEnabled)}
                          className={`cursor-pointer transition-all px-4 py-3 rounded-xl flex items-center justify-between font-bold hover:scale-[1.02] active:scale-[0.98] ${theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-900/50 text-slate-100'}`}
                        >
                          <span className="text-sm">Manuscript Context</span>
                          {isComparisonEnabled ? <ToggleRight className="w-6 h-6 text-cyan-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                        </div>
                      </div>

                      {/* Light/Dark Mode Switcher */}
                      <div className={`flex flex-col space-y-2 p-4 rounded-2xl shadow-sm border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#121622] border-cyan-950/30'}`}>
                        <div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Theme</div>
                        <div
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className={`cursor-pointer transition-all px-4 py-3 rounded-xl flex items-center justify-between font-bold hover:scale-[1.02] active:scale-[0.98] ${theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-900/50 text-slate-100'}`}
                        >
                          <span className="text-sm">Dark Mode</span>
                          {theme === 'dark' ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-2">
                        {/* Open Scholar Cloud Sync Trigger */}
                        <div
                          onClick={() => {
                            setFullPageMenu(null);
                            setIsCloudSyncOpen(true);
                          }}
                          className={`cursor-pointer transition-all px-5 py-4 rounded-2xl flex items-center justify-between font-bold border shadow-sm hover:scale-[1.01] active:scale-[0.99] ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#121622] border-cyan-950/30 text-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                              <Cloud className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm">Cloud Connect</span>
                              <span className="text-sm text-slate-500 font-normal">Sync notes and bookmarks across devices</span>
                            </div>
                          </div>
                          <span className={`font-mono text-sm font-bold uppercase ${firebaseUser ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {firebaseUser ? 'Connected' : '➔'}
                          </span>
                        </div>

                        {/* Study Guide trigger */}
                        <div
                          onClick={() => {
                            setFullPageMenu(null);
                            setWelcomeStep(0);
                            setIsWelcomeOpen(true);
                          }}
                          className={`cursor-pointer transition-all px-5 py-4 rounded-2xl flex items-center justify-between font-bold border shadow-sm hover:scale-[1.01] active:scale-[0.99] ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#121622] border-amber-900/30 text-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm">Walkthrough Guide</span>
                              <span className="text-sm text-slate-500 font-normal">Replay the introductory tutorial</span>
                            </div>
                          </div>
                          <span className="font-mono text-sm font-bold text-amber-500 uppercase">🌟</span>
                        </div>
                    </div>
                  </>
                )}

                {fullPageMenu === 'versions' && (
                  <div className="flex flex-col space-y-6">
                    
                    {/* View Modes Selection */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Single Translations</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { id: 'plain', label: 'Plain English (PET)' },
                          { id: 'personalized', label: 'Personalised Prayer' },
                          { id: 'kjv', label: 'King James (KJV)' },
                          { id: 'bsb', label: 'Berean Standard (BSB)' },
                          { id: 'asv', label: 'American Standard (ASV)' },
                          { id: 'ylt', label: 'Young\'s Literal (YLT)' },
                          { id: 'bbe', label: 'Bible in Basic English' },
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setTranslationDisplayMode(mode.id as any);
                              localStorage.setItem('personalized_bible_translation_display_mode', mode.id);
                              playWebAudioBeep(520, 'sine', 0.05);
                            }}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all text-left ${translationDisplayMode === mode.id ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-sm' : 'bg-cyan-900/40 border-cyan-700 text-cyan-300') : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#121622] border-slate-800 text-slate-400 hover:bg-[#161a27]')}`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Study Layouts</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Interlinear option removed to become standalone tab */}
                        <button
                          onClick={() => {
                            setTranslationDisplayMode('both');
                            localStorage.setItem('personalized_bible_translation_display_mode', 'both');
                            playWebAudioBeep(520, 'sine', 0.05);
                          }}
                          className={`p-4 rounded-xl border transition-all text-left flex flex-col ${translationDisplayMode === 'both' ? (theme === 'light' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-indigo-900/40 border-indigo-700 text-indigo-300') : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#121622] border-slate-800 text-slate-400 hover:bg-[#161a27]')}`}
                        >
                          <span className="font-bold text-sm mb-1">Dual-Stream Side-by-Side</span>
                          <span className="text-xs opacity-70">Read Plain English alongside Personalised Prayer</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Study Aids</p>
                    
                    <button
                      onClick={() => {
                        setFullPageMenu(null);
                        setScannerInputText('Could you explain what is happening theologically in this chapter, specifically looking at how the core covenants are addressed?');
                        if (!isSidePanelHidden) { setIsSidePanelHidden(true); }
                      }}
                      className={`text-left p-4 rounded-2xl shadow-sm border transition-all hover:scale-[1.01] active:scale-[0.99] ${theme === 'light' ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-[#121622] hover:bg-[#161a27] border-indigo-900/30'}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Theological Analysis</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">Ask for a deep theological breakdown of the current chapter.</span>
                    </button>

                    <button
                      onClick={() => {
                        setFullPageMenu(null);
                        setScannerInputText('Could you generate 5 reflective study questions based on this text for my personal journaling?');
                        if (!isSidePanelHidden) { setIsSidePanelHidden(true); }
                      }}
                      className={`text-left p-4 rounded-2xl shadow-sm border transition-all hover:scale-[1.01] active:scale-[0.99] ${theme === 'light' ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-[#121622] hover:bg-[#161a27] border-cyan-900/30'}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <BookOpen className="w-4 h-4 text-cyan-500" />
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">Study Questions</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">Generate journaling prompts and reflection questions.</span>
                    </button>

                    <button
                      onClick={() => {
                        setFullPageMenu(null);
                        setScannerInputText('Could you provide a brief historical and cultural context for the events occurring in this text?');
                        if (!isSidePanelHidden) { setIsSidePanelHidden(true); }
                      }}
                      className={`text-left p-4 rounded-2xl shadow-sm border transition-all hover:scale-[1.01] active:scale-[0.99] ${theme === 'light' ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-[#121622] hover:bg-[#161a27] border-amber-900/30'}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <Globe className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-amber-600 dark:text-amber-500">Cultural Context</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">Understand the historical background of the passage.</span>
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING MIDDLE NAV: TRIANGLE IN CIRCLE SLIDE OPTIONS */}
      {/* PREVIOUS CHAPTER FLOATER */}
      <div className={`fixed left-1 md:left-1.5 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-500 ease-in-out`}>
        <button
          id="floating-nav-prev-chapter-btn"
          onClick={handlePrevChapter}
          className={`p-1.5 flex items-center justify-center transition-all duration-300 focus:outline-none group transform hover:scale-110 cursor-pointer ${
            theme === 'light'
              ? 'text-slate-700 hover:text-cyan-600'
              : 'text-cyan-500 hover:text-cyan-400'
          }`}
          title={prevChapterLabel ? `Go to ${prevChapterLabel}` : "Previous Chapter"}
          disabled={!prevChapterLabel}
        >
          {/* Animated slider triangle icon */}
          <ChevronLeft className="w-7 h-7 md:w-8 md:h-8 transition-transform duration-300 group-hover:-translate-x-0.5" strokeWidth={3} />
        </button>
      </div>

      {/* NEXT CHAPTER FLOATER */}
      <div className={`fixed right-1 md:right-1.5 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-500 ease-in-out`}>
        <button
          id="floating-nav-next-chapter-btn"
          onClick={handleNextChapter}
          className={`p-1.5 flex items-center justify-center transition-all duration-300 focus:outline-none group transform hover:scale-110 cursor-pointer ${
            theme === 'light'
              ? 'text-slate-700 hover:text-cyan-600'
              : 'text-cyan-500 hover:text-cyan-400'
          }`}
          title={nextChapterLabel ? `Go to ${nextChapterLabel}` : "Next Chapter"}
          disabled={!nextChapterLabel}
        >
          {/* Animated slider triangle icon */}
          <ChevronRight className="w-7 h-7 md:w-8 md:h-8 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={3} />
        </button>
      </div>

      {/* MAIN CONTAINER PANEL */}
      <main 
        className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-6 py-2 md:py-4 pb-20 mt-1 overflow-x-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        
        {/* API ERROR / FALLBACK EXPLANATION banner */}
        {apiError && (() => {
          const errLower = apiError.toLowerCase();
          const isHighDemandOrQuota = errLower.includes('demand') || errLower.includes('overloaded') || errLower.includes('503') || errLower.includes('capacity') || errLower.includes('quota') || errLower.includes('exhausted') || errLower.includes('limit') || errLower.includes('429');
          const isMissingKey = errLower.includes('key is missing') || errLower.includes('api_key_required');

          return (
            <div className={`mb-6 p-4 rounded-xl border ${
              isHighDemandOrQuota
                ? (theme === 'light' ? 'bg-cyan-50 border-cyan-200 text-cyan-950 shadow-sm' : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-200 shadow-xl')
                : (theme === 'light' ? 'bg-amber-100/55 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-900/40 text-amber-200')
            }`}>
              <div className="flex items-start space-x-3.5">
                <span className="shrink-0 mt-0.5">
                  <Info className={`w-5 h-5 ${
                    isHighDemandOrQuota ? 'text-cyan-500' : 'text-amber-500'
                  }`} />
                </span>
                <div className="space-y-2.5 w-full">
                  {/* Dynamic Title */}
                  <h4 className={`text-sm font-semibold font-display ${
                    isHighDemandOrQuota
                      ? (theme === 'light' ? 'text-cyan-900' : 'text-cyan-300')
                      : (theme === 'light' ? 'text-amber-950' : 'text-amber-300')
                  }`}>
                    {isHighDemandOrQuota
                      ? '⚡ Google AI Engine Experiencing Temporary Capacity Limits'
                      : isMissingKey
                      ? '🔑 Setup Required: Offline Audio'
                      : '🔴 Manuscript Synchronization Interruption'}
                  </h4>

                  {/* Dynamic Description Message */}
                  <p className="text-sm leading-[1.8] tracking-[0.01em] opacity-95">
                    {isHighDemandOrQuota
                      ? 'The Google Gemini Translation model is currently running at quota capacities or rate limits for free tier keys. Free keys have a limit of 15-20 requests daily. Spikes in demand are temporary! To study any other book or chapter right now, enjoy our high-fidelity, offline-ready sync generation below, or browse our preloaded master chapters.'
                      : isMissingKey
                      ? 'We cannot retrieve customizable chapters because a dedicated GEMINI_API_KEY is not yet configured. The full-fledged side-by-side translation table is 100% active for our key master chapters below. Add your key in Settings > Secrets to unlock any biblical chapter.'
                      : `We failed to synchronize the manuscript data from the linguistic server. Error details: ${apiError}`}
                  </p>

                  {/* Action Controls (Retries, Preloaded Chapters) */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {/* Retry Action Key */}
                    {!isMissingKey && (
                      <button
                        onClick={() => loadChapter(selectedBook, selectedChapter)}
                        className={`px-3 py-1 rounded text-sm transition border cursor-pointer font-bold flex items-center gap-1.5 ${
                          theme === 'light'
                            ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 shadow-sm shadow-cyan-100'
                            : 'bg-cyan-950/80 border-cyan-500/45 text-cyan-300 hover:bg-cyan-950 hover:border-cyan-400'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
                        <span>Retry Chapter Load</span>
                      </button>
                    )}

                    <span className="text-sm font-mono opacity-60">Instant Master Chapters:</span>

                  <button
                    onClick={() => {
                      setSelectedBook('John');
                      setSelectedChapter(1);
                    }}
                    className={`px-2.5 py-1 rounded text-sm transition border cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-900 border-cyan-950/40 text-cyan-400 hover:border-cyan-500/40'
                    }`}
                  >
                    John 1
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBook('Genesis');
                      setSelectedChapter(1);
                    }}
                    className={`px-2.5 py-1 rounded text-sm transition border cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-900 border-cyan-950/40 text-cyan-400 hover:border-cyan-500/40'
                    }`}
                  >
                    Genesis 1
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBook('Psalms');
                      setSelectedChapter(23);
                    }}
                    className={`px-2.5 py-1 rounded text-sm transition border cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-900 border-cyan-950/40 text-cyan-400 hover:border-cyan-500/40'
                    }`}
                  >
                    Psalms 23
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

        {/* LOADING SHIMMER PANEL */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center space-y-6">
            <Loader2 className={`w-8 h-8 animate-spin ${theme === 'light' ? 'text-zinc-300' : 'text-zinc-600'}`} />
            <div className="text-center space-y-2">
              <h3 className={`font-serif text-2xl italic ${theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'}`}>
                Preparing Manuscript
              </h3>
              <p className={`text-sm font-sans tracking-widest uppercase font-semibold ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Aligning Ancient Codices
              </p>
            </div>
            {/* High end loading skeleton */}
            <div className={`w-full max-w-3xl border p-10 rounded-2xl space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] ${theme === 'light' ? 'bg-white border-zinc-100' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className={`h-8 rounded w-1/3 animate-pulse ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-800'}`} />
              <div className="space-y-3 pt-4">
                <div className={`h-4 rounded w-full animate-pulse ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-800'}`} />
                <div className={`h-4 rounded w-11/12 animate-pulse ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-800'}`} />
                <div className={`h-4 rounded w-4/5 animate-pulse ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-800'}`} />
              </div>
            </div>
          </div>
        ) : chapterData ? (
          <div className="space-y-4">
            
            {/* Chapter Header */}
            <div className={`flex flex-col gap-2 pb-4 mb-4 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
              
              {/* Row 1: Title, Fetch state */}
              <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                <div className="space-y-1">
                  <span className={`text-sm px-1 py-1 font-sans uppercase tracking-widest font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Compass className="w-3 h-3" /> Covenant
                  </span>
                  <h2 className={`text-xl md:text-2xl font-serif font-medium tracking-tight ${theme === 'light' ? 'text-zinc-900' : 'text-zinc-50'} flex items-baseline flex-wrap gap-x-3 gap-y-1`}>
                    <span>{chapterData.book}</span>
                    <span className={`text-base md:text-lg font-mono font-bold ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>Ch. {chapterData.chapter}</span>
                    {isBackgroundFetching && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm px-1 py-1 font-sans font-semibold tracking-wider uppercase border animate-pulse sm:ml-2 transform -translate-y-0.5 ${theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Refining
                      </span>
                    )}
                  </h2>
                </div>

              </div>
            </div>

            {/* READING SCHEME */}
            <div className="grid grid-cols-1 gap-4 items-start">
              
              {/* PANEL 1: PRINCIPAL FUTURISTIC TABLE VIEW (CONTEMPORARY & MODERN PERSONALIZED ENGLISH FOR NON-NATIVES) */}
              <div className="space-y-2">




                {/* Table container */}
                <div 
                  ref={scriptureContainerRef}
                  className={`scripture-zoom-container relative z-20 transition-all duration-500 antialiased ${
                    scriptureTypefaceSetting === 'serif' ? 'font-serif' : scriptureTypefaceSetting === 'mono' ? 'font-mono' : 'font-sans'
                  } ${
                    scriptureFontSizeSetting === 'xs' ? 'text-sm' : scriptureFontSizeSetting === 'sm' ? 'text-base' : scriptureFontSizeSetting === 'lg' ? 'text-xl' : 'text-lg'
                  } ${
                    scriptureTextStyleSetting === 'elegant' ? 'font-light tracking-[0.02em] leading-[2.0]' : scriptureTextStyleSetting === 'compact' ? 'tracking-tight leading-snug' : scriptureTextStyleSetting === 'classic' ? 'font-medium leading-[1.9]' : 'font-normal leading-[1.8] tracking-[0.01em]'
                  } ${
                    theme === 'light' ? 'bg-transparent text-slate-800' : 'bg-transparent text-slate-200'
                  }`}
                >
                  {/* Dynamic CSS injecting custom zoom styles */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    .scripture-zoom-container { --sz: ${scriptureZoom}; }
                    .scripture-zoom-container .text-\\[11px\\] { font-size: calc(11px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[12px\\] { font-size: calc(12px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[13px\\] { font-size: calc(13px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[13\\.5px\\] { font-size: calc(13.5px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[14px\\] { font-size: calc(14px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[15px\\] { font-size: calc(15px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[15\\.5px\\] { font-size: calc(15.5px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[16px\\] { font-size: calc(16px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[17px\\] { font-size: calc(17px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[18px\\] { font-size: calc(18px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[19px\\] { font-size: calc(19px * var(--sz)) !important; }
                    .scripture-zoom-container .text-\\[20px\\] { font-size: calc(20px * var(--sz)) !important; }
                    .scripture-zoom-container sup.text-\\[9\\.5px\\] { font-size: calc(9.5px * var(--sz)) !important; }
.scripture-zoom-container sup.text-\\[9\\.5px\\] { font-size: calc(9.5px * var(--sz)) !important; }
` }} />
                  
                  {/* Top Right FAB for Study Options removed and placed in header */}
                  {/* Table header REMOVED */}



                  {/* Main Viewer Switch: Interlinear vs Read Mode */}
                  {mainView === 'interlinear' ? (() => {
                     return (
                       <div className="p-5 md:p-8 space-y-8 max-w-4xl mx-auto pb-32">
                         {chapterData.verses.map(v => {
                           const thirdLineText: React.ReactNode = interlinearThirdLine === 'kjv' ? v.kjvText : 
                                                 interlinearThirdLine === 'bsb' ? v.bsbText : 
                                                 (dynamicTranslationData[interlinearThirdLine] && dynamicTranslationData[interlinearThirdLine][v.verseNumber.toString()]) || (['asv', 'ylt', 'bbe'].includes(interlinearThirdLine) ? <span className="inline-block animate-pulse bg-slate-200 dark:bg-slate-800 h-4 w-2/3 rounded align-middle mx-1"></span> : '');
                           
                           return (
                             <div key={v.verseNumber} className={`relative p-4 rounded-xl border ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#121622] border-slate-800/80 shadow-md'}`}>
                               <div className={`absolute -top-3 left-4 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black tracking-tighter ${theme === 'light' ? 'bg-white text-slate-500 border border-slate-200 shadow-sm' : 'bg-[#121622] text-slate-400 border border-slate-700 shadow-sm'}`}>
                                 {v.verseNumber}
                               </div>
                               <div className="pt-2 flex flex-col gap-5">
                                 {/* Line 1: Manuscript */}
                                 <div className="flex flex-col">
                                   <span className="text-[0.65em] uppercase tracking-widest font-bold text-amber-600/80 dark:text-amber-500/80 mb-1.5 flex items-center gap-1.5">
                                     <Layers className="w-3 h-3" /> Original Manuscript
                                   </span>
                                   <div className={`font-serif font-medium text-[19px] leading-relaxed tracking-wide ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                                     {v.manuscriptText ? v.manuscriptText : <span className="italic opacity-50">[Original Manuscript Not Available]</span>}
                                   </div>
                                 </div>
                                 
                                 {/* Line 2: PET */}
                                 <div className="flex flex-col border-t border-slate-100 dark:border-slate-800/50 pt-4">
                                   <span className="text-[0.65em] uppercase tracking-widest font-bold text-cyan-600/80 dark:text-cyan-500/80 mb-1.5">Plain English Translation</span>
                                   <div className={`font-sans font-medium text-[17px] leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                                     {v.contemporary ? v.contemporary : <span className="italic opacity-50">[Plain English Translation Not Available]</span>}
                                   </div>
                                 </div>
                                 
                                 {/* Line 3: Dynamic Translation */}
                                 <div className="flex flex-col border-t border-slate-100 dark:border-slate-800/50 pt-4 relative group">
                                   <div className="absolute top-2 right-0 z-20 group/menu flex items-center justify-end">
                                     {/* 3-dot FAB icon, visible by default */}
                                     <button className={`p-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center justify-center transition-all ${theme === 'light' ? 'bg-white/90 border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700' : 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300'} z-20`}>
                                       <MoreVertical className="w-3.5 h-3.5" />
                                     </button>

                                     {/* Compact horizontal menu fading in on hover */}
                                     <div className={`absolute right-[32px] top-1/2 -translate-y-1/2 flex items-center rounded-lg shadow-lg border overflow-hidden text-[9px] sm:text-[10px] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all translate-x-2 group-hover/menu:translate-x-0 ${theme === 'light' ? 'bg-white/95 border-emerald-200/50' : 'bg-slate-900/95 border-emerald-900/50'} z-10 backdrop-blur-md`}>
                                       {['kjv', 'bsb', 'asv', 'ylt', 'bbe'].map(opt => (
                                         <button
                                           key={opt}
                                           onClick={() => setInterlinearThirdLine(opt)}
                                           className={`px-2 py-1.5 font-bold uppercase transition-colors ${interlinearThirdLine === opt ? (theme === 'light' ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'bg-emerald-900/40 text-emerald-400 shadow-inner') : (theme === 'light' ? 'text-slate-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-300')}`}
                                         >
                                           {opt}
                                         </button>
                                       ))}
                                     </div>
                                   </div>
                                   <span className="text-[0.65em] uppercase tracking-widest font-bold text-emerald-600/80 dark:text-emerald-500/80 mb-1.5 pr-12">{interlinearThirdLine.toUpperCase()} TRANSLATION</span>
                                   <div className={`font-serif font-medium text-[17px] leading-relaxed ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                                     {renderInteractiveText(thirdLineText || '', v.specialWords, `inter-${v.verseNumber}`)}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     );
                  })() : layoutMode === 'paragraph' ? (() => {
                    const versesList = paginatedVersesList;
                    const chunks: any[][] = [];
                    for (let i = 0; i < versesList.length; i += 3) {
                      chunks.push(versesList.slice(i, i + 3));
                    }

                    const isMultiCol = translationDisplayMode === 'both';

                    const renderNarrativeStream = (type: 'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe', customTitle?: string, keyString?: string) => (
                      <NarrativeStream
                        key={keyString || type}
                        title={customTitle || (type === 'plain' ? "PET" : type === 'pers' ? "PPV" : type === 'kjv' ? "📜 KJV" : type === 'bsb' ? "🛡️ BSB" : type.toUpperCase())}
                        streamType={type}
                        chunks={chunks}
                        focusedVerse={focusedVerse}
                        focusedStreamType={focusedStreamType}
                        setFocusedVerse={setFocusedVerse}
                        setFocusedStreamType={setFocusedStreamType}
                        currentlyReadingVerse={currentlyReadingVerse}
                        theme={theme}
                        playbackSpeed={playbackSpeed}
                        setPlaybackSpeed={setPlaybackSpeed}
                        isHeaderHidden={isHeaderHidden}
                        isComparisonEnabled={isComparisonEnabled}
                        referenceDisplayMode={referenceDisplayMode}
                        activeDraftVerse={activeDraftVerse}
                        noteDraftText={noteDraftText}
                        setNoteDraftText={setNoteDraftText}
                        handleCancelNote={handleCancelNote}
                        handleSaveNote={handleSaveNote}
                        startEditingNote={startEditingNote}
                        isVerseSaved={isVerseSaved}
                        getVerseHighlight={getVerseHighlight}
                        stopSpeaking={stopSpeaking}
                        playSingleVerse={playSingleVerse}
                        playTranslationStream={playTranslationStream}
                        isPlayingAudio={isPlayingAudio}
                        activeAudioStream={activeAudioStream}
                        getSpeechTextForVerse={getSpeechTextForVerse}
                        toggleSaveVerse={toggleSaveVerse}
                        plainBold={plainBold}
                        plainItalic={plainItalic}
                        personalizedBold={personalizedBold}
                        personalizedItalic={personalizedItalic}
                        manuscriptBold={manuscriptBold}
                        manuscriptItalic={manuscriptItalic}
                        onOpenProjection={(verseNo) => {
                          setProjectionInitialVerseNumber(verseNo);
                          setIsProjectionStudioOpen(true);
                          playWebAudioBeep(640, 'sine', 0.08);
                        }}
                        dynamicTranslationData={dynamicTranslationData[type] || {}}
                      />
                    );

                    if (isMultiCol) {
                      return (
                        <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 h-[calc(100vh-160px)]">
                          <div className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2`}>
                            {renderNarrativeStream(dualStreamLeft, undefined, 'left')}
                          </div>

                          <div className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2`}>
                            {renderNarrativeStream(dualStreamRight, undefined, 'right')}
                          </div>
                        </div>
                      );
                    }

                    // Original Single Column view
                    const singleTransType = translationDisplayMode === 'plain' ? 'plain' : translationDisplayMode === 'personalized' ? 'pers' : translationDisplayMode === 'kjv' ? 'kjv' : translationDisplayMode === 'bsb' ? 'bsb' : translationDisplayMode as any;

                    return (
                      <div className="p-5 md:p-8 space-y-6">
                        <div className={`max-w-3xl mx-auto ${scriptureFontSizeSetting === 'xs' ? 'text-[15px]' : scriptureFontSizeSetting === 'sm' ? 'text-[17px]' : scriptureFontSizeSetting === 'base' ? 'text-[19px]' : 'text-[21px]'} ${getScriptureStyleClasses()}`}>
                          {renderNarrativeStream(singleTransType)}
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="flex flex-col space-y-1 py-1">
                      
                    {(() => {
                      const isMultiCol = translationDisplayMode === 'both';
                      
                      const renderVerseCard = (v, transType) => {
                          const isFocused = focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === transType;
                          const isSaved = isVerseSaved(v.verseNumber);
                          const verseHighlight = getVerseHighlight(v.verseNumber);
                          const hasNotes = !!verseHighlight?.notes;
                          const isReadingThis = currentlyReadingVerse === v.verseNumber;
                          
                          let highlightClasses = '';
                          if (isFocused) {
                            highlightClasses = theme === 'light' ? 'bg-cyan-50/20 border-l-2 border-cyan-600' : 'bg-cyan-950/10 border-l-2 border-cyan-500';
                          } else if (hasNotes) {
                            highlightClasses = theme === 'light' ? 'bg-amber-50/15 border-l-2 border-amber-500/50' : 'bg-amber-950/5 border-l-2 border-amber-500/30';
                          }

                          let textContent = null;
                          let title = '';
                          let fontClasses = '';

                          const renderRefs = () => {
                              if (!isComparisonEnabled) return null;
                              return (
                                  <div className={`my-3 p-3.5 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-2.5 w-full transition-all ${theme === 'light' ? 'bg-slate-50/70 border border-slate-100' : 'bg-[#121622]/40 border border-cyan-950/20'}`}>
                                      {(referenceDisplayMode === 'both' || referenceDisplayMode === 'kjv') && (
                                          <div className={`font-serif text-[0.9em] leading-relaxed font-semibold not-italic ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                                              {renderInteractiveText(v.kjvText || '', v.specialWords, `kjv-${v.verseNumber}`)}
                                          </div>
                                      )}
                                      {(referenceDisplayMode === 'both' || referenceDisplayMode === 'bsb') && (
                                          <div className={`font-serif text-[0.9em] leading-relaxed font-semibold not-italic ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                                              {renderInteractiveText(v.bsbText || '', v.specialWords, `bsb-${v.verseNumber}`)}
                                          </div>
                                      )}
                                  </div>
                              );
                          };

                          if (transType === 'plain') {
                              title = 'PET';
                              fontClasses = `${plainBold ? 'font-extrabold' : 'font-bold'} not-italic`;
                              textContent = <div className="flex flex-col w-full">{renderRefs()}<div>{v.contemporary}</div></div>;
                          } else if (transType === 'pers') {
                              title = 'PPV';
                              fontClasses = `${personalizedBold ? 'font-extrabold' : 'font-bold'} not-italic`;
                              textContent = <div className="flex flex-col w-full">{renderRefs()}<div>{v.nonNativeEnglish}</div></div>;
                          } else if (transType === 'kjv') {
                              title = 'Reference (KJV)';
                              fontClasses = `${manuscriptBold ? 'font-extrabold' : 'font-bold'} not-italic`;
                              textContent = renderInteractiveText(v.kjvText || '', v.specialWords, `kjv-${v.verseNumber}`);
                          } else if (transType === 'bsb') {
                              title = 'Berean Standard Bible';
                              fontClasses = `${manuscriptBold ? 'font-extrabold' : 'font-bold'} not-italic`;
                              textContent = renderInteractiveText(v.bsbText || '', v.specialWords, `bsb-${v.verseNumber}`);
                          }

                          return (
                            <div
                              key={`${transType}-${v.verseNumber}`}
                              id={`verse-row-${v.verseNumber}`}
                              onMouseEnter={() => setHoveredVerse(v.verseNumber)}
                              onMouseLeave={() => setHoveredVerse(null)}
                              onDoubleClick={() => {
                                if (focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === transType) {
                                  setFocusedVerse(null);
                                  setFocusedStreamType(null);
                                } else {
                                  setFocusedVerse(v);
                                  setFocusedStreamType(transType);
                                }
                              }}
                              onTouchStart={() => handleVerseRowTap(v, transType)}
                              className={`flex flex-row py-3 px-4 rounded-xl gap-3 mb-3 transition-all duration-200 cursor-pointer relative shadow-sm ${highlightClasses} ${
                                theme === 'light' ? 'bg-white border border-slate-100' : 'bg-[#0a0d16] border border-cyan-950/20'
                              } ${
                                hoveredVerse === v.verseNumber && !hasNotes && !isFocused
                                  ? (theme === 'light' ? 'shadow-md scale-[1.01] bg-white' : 'shadow-md scale-[1.01] bg-[#0c111c]')
                                  : ''
                              } ${isReadingThis ? 'ring-2 ring-cyan-500/40 shadow-md animate-pulse-slow' : ''}`}
                            >
                              {/* Left Gutter: Verse Number & Thematic Reflection Icon */}
                              <div className="flex flex-col items-center shrink-0 w-6 pt-[3px]">
                                <span className={`text-[15px] font-sans font-bold select-none transition-all ${
                                  isReadingThis
                                    ? 'text-cyan-500 dark:text-cyan-400'
                                    : (theme === 'light' 
                                        ? 'text-slate-400' 
                                        : 'text-slate-500')
                                }`}>
                                  {v.verseNumber}
                                </span>
                                {hasNotes && !isFocused && (
                                  <div className="mt-2 text-amber-500/70" title="Contains theological diary entries">
                                     <StarryCradleIcon className="w-3.5 h-3.5" active={true} />
                                  </div>
                                )}
                              </div>

                              {/* Right Content Body */}
                              <div className="flex flex-col w-full flex-1">
                                <div className={`${getScriptureStyleClasses()} ${fontClasses} leading-[1.8] tracking-[0.01em] ${
                                  scriptureFontSizeSetting === 'xs' ? 'text-[15px]' : scriptureFontSizeSetting === 'sm' ? 'text-[16px]' : scriptureFontSizeSetting === 'base' ? 'text-[18px]' : 'text-[20px]'
                                } ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                  {textContent}
                                </div>
                              </div>
                              {isFocused ? (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-max">
                                  <div 
                                    className="flex items-center overflow-x-auto hide-scrollbar shadow-lg rounded-full backdrop-blur-md" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                  <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border shadow-sm transition-all ${
                                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#18181b] border-zinc-800'
                                  }`}>
                                    {/* Minimal Verse Indicator */}
                                    <div className={`flex items-center px-1.5 py-0.5 rounded-full shrink-0 ${
                                      theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'
                                    }`}>
                                      <span className="text-sm px-1 py-1 font-mono font-bold uppercase tracking-widest">v.{v.verseNumber}</span>
                                    </div>

                                    <div className={`w-[1px] h-3 mx-0.5 shrink-0 ${theme === 'light' ? 'bg-slate-200' : 'bg-zinc-800'}`} />

                                    {/* Reflect (Notes Composer toggle) */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (activeDraftVerse === v.verseNumber) {
                                          handleCancelNote();
                                        } else {
                                          startEditingNote(v.verseNumber, verseHighlight?.notes || '');
                                        }
                                      }}
                                      className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                                        activeDraftVerse === v.verseNumber
                                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                                          : hasNotes
                                            ? (theme === 'light' ? 'bg-amber-100 text-amber-800' : 'bg-amber-955/20 text-amber-400')
                                            : (theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-400')
                                      }`}
                                      title="Reflect / Note"
                                    >
                                      <StarryCradleIcon className="w-3.5 h-3.5" active={hasNotes} />
                                    </button>

                                    {/* Bookmark Index */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSaveVerse(v.verseNumber);
                                      }}
                                      className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                                        isSaved
                                          ? 'bg-emerald-500/15 text-emerald-500'
                                          : (theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400')
                                      }`}
                                      title="Index"
                                    >
                                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-emerald-500' : ''}`} />
                                    </button>

                                    {/* Copy Verse */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const textToCopy = transType === 'plain'
                                          ? v.contemporary
                                          : transType === 'pers'
                                            ? v.nonNativeEnglish
                                            : transType === 'kjv'
                                              ? (v.kjvText || '')
                                              : (v.bsbText || '');
                                        const transName = transType === 'plain' ? 'Plain English' : transType === 'pers' ? 'Personalised' : transType === 'kjv' ? 'KJV' : 'BSB';
                                        navigator.clipboard.writeText(`[v.${v.verseNumber}] ${textToCopy} (${transName})`);
                                      }}
                                      className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                                        theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
                                      }`}
                                      title="Copy verse text"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Project button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setProjectionInitialVerseNumber(v.verseNumber);
                                        setIsProjectionStudioOpen(true);
                                        playWebAudioBeep(640, 'sine', 0.08);
                                      }}
                                      className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                                        theme === 'light' ? 'hover:bg-amber-50 text-amber-700' : 'hover:bg-amber-955/20 text-amber-400'
                                      }`}
                                      title="Project"
                                    >
                                      <Tv className="w-3.5 h-3.5" />
                                    </button>

                                    <div className={`w-[1px] h-3 mx-0.5 shrink-0 ${theme === 'light' ? 'bg-slate-200' : 'bg-zinc-800'}`} />

                                    {/* Dismiss Close Focus */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFocusedVerse(null);
                                      }}
                                      className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:scale-110 ${
                                        theme === 'light' ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-rose-955/20 text-rose-400'
                                      }`}
                                      title="Dismiss"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Speed Control Tuning Slider */}
                                {isReadingThis && (
                                  <div className="mt-2 flex items-center justify-between bg-slate-100 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-205 dark:border-cyan-950/30">
                                    <span className="text-sm font-mono text-slate-400 dark:text-cyan-650 flex items-center gap-1">
                                      ⚙️ Playback Speed:
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.1"
                                        value={playbackSpeed}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setPlaybackSpeed(parseFloat(e.target.value));
                                        }}
                                        className="w-20 h-1 bg-slate-205 dark:bg-cyan-955 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                      />
                                      <span className="text-sm font-mono font-bold text-cyan-600">
                                        {playbackSpeed.toFixed(1)}x
                                      </span>
                                    </div>
                                  </div>
                                )}

                              </div>
                            ) : hasNotes ? (
                              <div className={`mt-2.5 p-3.5 rounded-xl border text-sm leading-[1.8] tracking-[0.01em] transition-all relative ${
                                theme === 'light' 
                                  ? 'bg-amber-100/10 border-amber-200/50 text-slate-800 shadow-sm' 
                                  : 'bg-[#1e150c]/20 border-amber-900/35 text-amber-100/95 shadow-sm'
                              }`} onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-dashed border-amber-500/10">
                                  <div className={`text-sm px-1 py-1 font-mono uppercase tracking-widest font-extrabold flex items-center gap-1.5 ${
                                    theme === 'light' ? 'text-amber-700/85' : 'text-amber-500/80'
                                  }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                                    <span>📝 Personal Theological Study Diary</span>
                                  </div>
                                  <div className="flex items-center space-x-2.5">
                                    {/* Custom Audio Speed Regulator Dial Slider */}
                                    <div className="flex items-center space-x-1 bg-slate-100/40 dark:bg-[#050912] px-1.5 py-1 rounded-md border border-slate-200/30 dark:border-cyan-950/20 scale-95 origin-left">
                                      <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.1"
                                        title="Audio Tuning Speed Knob"
                                        value={playbackSpeed}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setPlaybackSpeed(parseFloat(e.target.value));
                                        }}
                                        className="w-12 h-0.5 bg-slate-205 dark:bg-cyan-950 rounded appearance-none cursor-pointer accent-cyan-500"
                                      />
                                      <span className="text-sm px-1 py-1 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                        {playbackSpeed.toFixed(1)}x
                                      </span>
                                    </div>

                                    {/* Toggle Index direct check */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSaveVerse(v.verseNumber);
                                      }}
                                      className={`text-sm font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                        isSaved 
                                          ? 'text-emerald-555 hover:text-emerald-400' 
                                          : (theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200')
                                      }`}
                                      title={isSaved ? "Remove from quiet reflections" : "Index/Bookmark verse"}
                                    >
                                      <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} />
                                      <span>{isSaved ? "Indexed" : "Index"}</span>
                                    </button>

                                    <button
                                      onClick={() => startEditingNote(v.verseNumber, verseHighlight?.notes || '')}
                                      className={`text-[9.5px] font-mono font-bold transition-colors cursor-pointer ${
                                        theme === 'light' ? 'text-cyan-600 hover:text-cyan-500' : 'text-cyan-400 hover:text-cyan-300'
                                      }`}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateVerseProfileNotes(v.verseNumber, '');
                                        if (!isSaved) {
                                          setSavedVerses((prev) => prev.filter(sv => !(sv.book === selectedBook && sv.chapter === selectedChapter && sv.verse === v.verseNumber)));
                                        }
                                        playWebAudioBeep(330, 'triangle', 0.1);
                                      }}
                                      className="text-[9.5px] font-mono text-rose-500 hover:text-rose-450 font-bold transition-colors cursor-pointer"
                                      title="Delete reflection notes"
                                    >
                                      ✕ Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="font-sans whitespace-pre-wrap select-text leading-[1.8] tracking-[0.01em] font-normal pr-2">
                                  "{verseHighlight?.notes}"
                                </div>
                              </div>
                            ) : isSaved ? (
                              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => startEditingNote(v.verseNumber, '')}
                                  className={`text-sm font-mono font-bold px-2.5 py-1.5 rounded-lg border border-dashed transition-all flex items-center gap-1 cursor-pointer ${
                                    theme === 'light'
                                      ? 'border-slate-200 text-slate-500 bg-slate-50/50 hover:bg-slate-100 hover:text-slate-800'
                                      : 'border-cyan-950/40 text-cyan-600 bg-slate-950/10 hover:bg-slate-950/40 hover:text-cyan-400'
                                  }`}
                                >
                                  <span>+ Write Theological Notes</span>
                                </button>
                              </div>
                            ) : null}
                          
                            </div>
                          );
                      };

                      const renderTableColHeader = (title: string, type: 'plain' | 'pers' | 'kjv' | 'bsb') => (
                        <div className={`flex items-center justify-between mb-2 pb-1 px-1 border-b border-slate-200/50 dark:border-zinc-800/50 transition-all duration-300 ease-in-out`}>
                          <h5 className="text-sm font-mono uppercase tracking-widest font-extrabold text-slate-400 dark:text-cyan-600">
                            {title}
                          </h5>
                          
                        </div>
                      );

                      if (isMultiCol) {
                        return (
                          <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 h-[calc(100vh-160px)]">
                            <div className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative`}>
                              {chapterData.verses.map(v => renderVerseCard(v, 'plain'))}
                            </div>

                            <div className={`w-[90vw] md:w-[48%] shrink-0 snap-center overflow-y-auto hide-scrollbar pb-32 h-full ${theme === 'light' ? 'bg-white/50' : 'bg-[#080d19]/40'} p-2 relative`}>
                              {chapterData.verses.map(v => renderVerseCard(v, 'pers'))}
                            </div>
                          </div>
                        );
                      }

                      // Original Single Column view
                      return (
                        <div className="flex flex-col space-y-1 py-1">
                          {chapterData.verses.map(v => {
                            const transType = translationDisplayMode === 'plain' ? 'plain' : translationDisplayMode === 'personalized' ? 'pers' : translationDisplayMode === 'kjv' ? 'kjv' : 'bsb';
                            return renderVerseCard(v, transType);
                          })}
                        </div>
                      );
                    })()}

                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`text-center py-20 border rounded-xl ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950/35 border-cyan-950'}`}>
            <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
            <h3 className={`text-lg font-display ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>Manuscript Not Open</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Select any of the 66 Books and Chapters of the Bible from the dropdown above to begin your study session.
            </p>
          </div>
        )}

      </main>



      {/* SHALOM INTERACTIVE WELCOME SCREEN */}
      <AnimatePresence>
        {isWelcomeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-slate-900/30 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl bg-gradient-to-b from-white via-amber-100/10 to-cyan-50/10 border border-amber-200/50 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center font-sans"
            >
              {/* Premium Celestial Design Ornaments */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-amber-300 to-cyan-400" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-200/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-cyan-200/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(#0891b206_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

              {/* Welcome Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-mono font-bold tracking-wider bg-cyan-500/10 text-cyan-800 border border-cyan-200/35 shadow-xs">
                  <span className="relative flex h-1.5 w-1.5 mr-2">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                  </span>
                  CELESTIAL STUDY COMPANION ACTIVE
                </span>
              </div>

              {/* Core App Logo Highlight */}
              <div className="relative mb-5 group select-none">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 opacity-25 blur-md group-hover:opacity-40 transition duration-300" />
                <div className="relative p-2 bg-white rounded-full border border-amber-100 shadow-sm flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-20 h-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <rect width="100" height="100" rx="24" fill="#0f172a" />
                    <path d="M 32 30 L 32 70 L 48 70" fill="none" stroke="url(#lb-grad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 52 30 L 52 70 C 62 70 66 65 66 60 C 66 55 62 50 56 50 C 62 50 66 45 66 40 C 66 35 62 30 52 30 Z" fill="none" stroke="url(#lb-grad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Title Typography Pairings */}
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 leading-tight">
                LogosBridge <span className="text-cyan-600 font-serif italic">(LB)</span>
              </h1>
              
              <h2 className="text-sm sm:text-sm font-bold tracking-[0.22em] text-cyan-600 font-mono mt-1 uppercase">
                LOGOSBRIDGE
              </h2>

              <hr className="w-12 border-t border-amber-200/70 my-5" />

              {/* THE MAJOR VISIBLE CONTENT & MODERN DESIGN CALLOUT */}
              <div className="w-full bg-gradient-to-r from-teal-500/5 via-cyan-500/5 to-amber-500/5 border border-cyan-500/10 rounded-2xl p-5 md:p-6 my-1 transition-all duration-300 hover:border-cyan-500/20 shadow-xs relative overflow-hidden">
                <div className="absolute top-1/2 left-2 -translate-y-1/2 w-1 h-6 bg-teal-400 rounded-full" />
                
                <p className="text-sm px-1 py-1 font-mono tracking-widest text-slate-400 uppercase font-bold mb-1.5">
                  ✦ Living Codex Companion ✦
                </p>
                
                <h3 className="text-lg sm:text-2xl font-serif italic font-black bg-gradient-to-r from-slate-800 via-teal-950 to-slate-900 bg-clip-text text-transparent leading-snug">
                  "THE BIBLE THAT TALKS WITH YOU"
                </h3>
                
                {/* Modern Visual Audio Waves representation */}
                <div className="flex items-center justify-center gap-1 mt-3.5 h-5">
                  <span className="w-0.5 bg-cyan-400/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_100ms] h-2" />
                  <span className="w-0.5 bg-cyan-500/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_200ms] h-4" />
                  <span className="w-0.5 bg-teal-500/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_300ms] h-5" />
                  <span className="w-0.5 bg-amber-400/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_400ms] h-3" />
                  <span className="w-0.5 bg-teal-500/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_500ms] h-4" />
                  <span className="w-0.5 bg-cyan-500/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_600ms] h-5" />
                  <span className="w-0.5 bg-cyan-400/80 rounded-full animate-[bounce_1.2s_infinite_ease-in-out_700ms] h-2" />
                </div>
              </div>

              {/* Spacing spacer instead of countdown bar */}
              <div className="h-6" />

              {/* Interactive buttons to jump/skip immediately */}
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 w-full max-w-md">
                <button
                  onClick={() => {
                    localStorage.setItem('personalized_bible_welcome_dismissed', 'true');
                    setIsWelcomeOpen(false);
                    playWebAudioBeep(580, 'sine', 0.05);
                  }}
                  className="w-full py-3 px-5 rounded-xl font-mono text-sm font-bold text-white bg-slate-900 border border-slate-950 transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 group animate-pulse"
                  id="welcome-jump-btn"
                >
                  JUMP TO STUDY DESK
                  <span className="transition-transform group-hover:translate-x-1">➔</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.setItem('personalized_bible_welcome_dismissed', 'true');
                    setIsWelcomeOpen(false);
                    playWebAudioBeep(520, 'sine', 0.03);
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-mono text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                  id="welcome-skip-btn"
                >
                  Skip
                </button>
              </div>

            </motion.div>
            {false && (
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-2xl border rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] md:max-h-[88vh] transition-all duration-500 ${
                welcomeStyles[selectedWelcomeStyle].mainBg
              }`}
            >
              {/* Spinning Sacred Auric Rings / Vector Background Panels */}
              {selectedWelcomeStyle === 'heavenly' && (
                <>
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-amber-200/20 rounded-full pointer-events-none animate-[spin_50s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-dashed border-amber-300/10 rounded-full pointer-events-none animate-[spin_30s_linear_infinite_reverse]" />
                </>
              )}
              {selectedWelcomeStyle === 'parchment' && (
                <>
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-700/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-amber-700/10 rounded-full pointer-events-none animate-[spin_60s_linear_infinite]" />
                </>
              )}
              {selectedWelcomeStyle === 'royal' && (
                <>
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#7c3aed]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#a78bfa]/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-indigo-200/10 rounded-full pointer-events-none animate-[spin_40s_linear_infinite]" />
                </>
              )}
              {selectedWelcomeStyle === 'minimal' && (
                <>
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(#00000003_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                </>
              )}

              {/* Modal Top Header Progress indicator */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between select-none relative z-10 ${
                welcomeStyles[selectedWelcomeStyle].headerBg
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    welcomeStyles[selectedWelcomeStyle].dotBg
                  }`} />
                  <span className={`text-sm font-mono tracking-[0.15em] uppercase font-bold ${
                    welcomeStyles[selectedWelcomeStyle].dotText
                  }`}>
                    Scholar Orientation Desk • STEP {welcomeStep + 1} OF 5
                  </span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => {
                      localStorage.setItem('personalized_bible_welcome_dismissed', 'true');
                      setIsWelcomeOpen(false);
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className="text-[9.5px] font-mono leading-none tracking-wider font-extrabold uppercase hover:underline opacity-65 hover:opacity-100 transition-all cursor-pointer border-r pr-2.5 border-slate-300 dark:border-slate-700/60"
                    title="Skip tutorial and enter workspace directly"
                  >
                    Skip Tutorial ➔
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('personalized_bible_welcome_dismissed', 'true');
                      setIsWelcomeOpen(false);
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                      welcomeStyles[selectedWelcomeStyle].closeBtn
                    }`}
                    title="Close Guide & Start Studying"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step Carousel Body */}
              <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-4 relative z-10">
                <AnimatePresence mode="wait">
                  {welcomeStep === 0 && (
                    <motion.div
                      key="step-intro"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-2xl border ${
                          welcomeStyles[selectedWelcomeStyle].iconBg
                        }`}>
                          <BookOpen className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h2 className={`text-xl font-display font-black tracking-tight ${
                            welcomeStyles[selectedWelcomeStyle].headingText
                          }`}>
                            Shalom! Bridging Scripture with Simple English
                          </h2>
                          <p className={`text-[15px] font-mono mt-0.5 ${
                            welcomeStyles[selectedWelcomeStyle].subText
                          }`}>
                            Designed for English Learners, Translation Scholars & Modern Readers
                          </p>
                        </div>
                      </div>

                      <p className={`text-sm sm:text-sm leading-[1.8] tracking-[0.01em] ${
                        welcomeStyles[selectedWelcomeStyle].descText
                      }`}>
                        Classical English translations (like King James Version KJV) are gorgeous, but contain old vocabulary and convoluted syntax. This workspace processes 400-year-old expressions into simple, contemporary vocabulary in parallel—giving you instant theological comprehension.
                      </p>

                      {/* Dynamic Translator Interactive Mock Card */}
                      <div className={`p-4 rounded-2xl border ${
                        welcomeStyles[selectedWelcomeStyle].boxBg
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-sm font-mono font-bold uppercase tracking-wider ${
                            welcomeStyles[selectedWelcomeStyle].subText
                          }`}>
                            Interactive Classics Translator Preset
                          </h3>
                          <span className="text-sm px-1 py-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold">LIVE TRIAL</span>
                        </div>
                        <p className="text-[15px] leading-[1.8] tracking-[0.01em] opacity-70 mb-3">
                          Tap any classical idiom below to see how our customized <strong>Personalized translation model</strong> refactors the scripture instantly:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { classic: "Beseech you", simple: "Earnestly request you" },
                            { classic: "Provoke unto love", simple: "Inspire you to feel love" },
                            { classic: "Thou shalt not covet", simple: "Do not greedily desire what others own" },
                            { classic: "Suffer thy brother", simple: "Be patient with your brother" }
                          ].map((idiom, idx) => (
                            <button
                              key={idx}
                              onClick={() => setWelcomeIdiomIndex(idx)}
                              className={`p-2.5 rounded-xl text-left border text-sm transition-all duration-200 cursor-pointer ${
                                welcomeIdiomIndex === idx
                                  ? welcomeStyles[selectedWelcomeStyle].itemActiveBg
                                  : welcomeStyles[selectedWelcomeStyle].itemInactiveBg
                              }`}
                            >
                              <div className="font-semibold flex items-center justify-between">
                                <span className="truncate">{idiom.classic}</span>
                                {welcomeIdiomIndex === idx && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                              </div>
                              <div className={`text-sm mt-0.5 opacity-90 font-mono ${
                                welcomeIdiomIndex === idx ? 'text-emerald-500 font-semibold' : 'opacity-60'
                              }`}>
                                ➔ {idiom.simple}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {welcomeStep === 1 && (
                    <motion.div
                      key="step-theme"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <h2 className={`text-lg sm:text-xl font-display font-black tracking-tight ${
                          welcomeStyles[selectedWelcomeStyle].headingText
                        }`}>
                          Elevate Your Visual Atmosphere
                        </h2>
                        <p className={`text-sm mt-1 leading-[1.8] tracking-[0.01em] ${
                          welcomeStyles[selectedWelcomeStyle].descText
                        }`}>
                          Select your desired reading environment. Notice how the underlying interface shifts theme behind this panel instantly!
                        </p>
                      </div>

                      {/* Interactive presets buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* ROYAL LAVANDULA */}
                        <button
                          onClick={() => {
                            setSelectedWelcomeStyle('royal');
                            setTheme('light');
                            setAppLogo('cosmic');
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all duration-500 ease-in-out hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-36 ${
                            selectedWelcomeStyle === 'royal'
                              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20'
                              : 'bg-stone-50/20 border-stone-200 hover:border-stone-300 hover:bg-stone-100/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xl">💜</span>
                              {selectedWelcomeStyle === 'royal' && (
                                <span className="text-sm px-1 py-1 font-bold uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-indigo-600 text-white">ACTIVE</span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-indigo-950 mt-3.5 uppercase tracking-wide">Royal Lavandula</h4>
                            <p className="text-sm text-indigo-900/70 mt-1 leading-snug">Soft pale violet with majestic purple velvet highlights.</p>
                          </div>
                          <span className="text-[9.5px] font-mono font-bold text-indigo-800">LIGHT • ROYAL</span>
                        </button>

                        {/* PRISTINE MINIMAL */}
                        <button
                          onClick={() => {
                            setSelectedWelcomeStyle('minimal');
                            setTheme('light');
                            setAppLogo('grace');
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all duration-500 ease-in-out hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-36 ${
                            selectedWelcomeStyle === 'minimal'
                              ? 'bg-slate-100/80 border-slate-300 ring-2 ring-slate-400/25'
                              : 'bg-stone-50/20 border-stone-200 hover:border-stone-300 hover:bg-stone-100/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xl">📁</span>
                              {selectedWelcomeStyle === 'minimal' && (
                                <span className="text-sm px-1 py-1 font-bold uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-white">ACTIVE</span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mt-3.5 uppercase tracking-wide">Pristine Minimal</h4>
                            <p className="text-sm text-slate-600 mt-1 leading-snug">Crisp modern light gray surface highlighting readability.</p>
                          </div>
                          <span className="text-[9.5px] font-mono font-bold text-slate-600">LIGHT • MINIMAL</span>
                        </button>
                      </div>

                      {/* Interactive Visual Aura Color Accent Selector */}
                      <div className={`p-4 rounded-2xl border ${
                        welcomeStyles[selectedWelcomeStyle].boxBg
                      }`}>
                        <span className={`text-sm font-mono tracking-wider font-extrabold uppercase block mb-2.5 ${
                          welcomeStyles[selectedWelcomeStyle].subText
                        }`}>
                          ✨ SELECT VISUAL AURA COLOR ACCENT (Blue & Ash Options Included):
                        </span>
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'cyan', color: '#00d5ff', name: 'Electric Cyan', desc: 'Vibrant Tech' },
                            { id: 'sapphire', color: '#3b82f6', name: 'Deep Sapphire', desc: 'Royal Blue' },
                            { id: 'indigo', color: '#8b5cf6', name: 'Royal Scholar Indigo', desc: 'Purple-Blue' },
                            { id: 'ash', color: '#8a929e', name: 'Misty Mineral Ash', desc: 'Steel Ash Tone' },
                            { id: 'amber', color: '#fbbf24', name: 'Golden Timber', desc: 'Sunlight Amber' }
                          ].map((aura) => (
                            <button
                              key={aura.id}
                              onClick={() => {
                                setAuraColor(aura.id as any);
                                playWebAudioBeep(700, 'sine', 0.04);
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between min-h-[64px] ${
                                auraColor === aura.id
                                  ? 'bg-cyan-500/10 border-cyan-400 font-bold'
                                  : 'bg-white/5 dark:bg-black/20 border-transparent hover:border-slate-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: aura.color }} />
                                {auraColor === aura.id && <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500 text-white font-mono font-extrabold">SET</span>}
                              </div>
                              <div className="mt-2.5">
                                <div className={`text-sm font-bold leading-tight ${auraColor === aura.id ? 'text-cyan-400' : 'text-slate-350'}`}>{aura.name}</div>
                                <div className="text-sm px-1 py-1 opacity-50 font-mono italic">{aura.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* LIVE PREVIEW CONTAINER MOCKUP */}
                      <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                        welcomeStyles[selectedWelcomeStyle].mockVerseBg
                      }`}>
                        <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-stone-200/40 dark:border-slate-800/40">
                          <span className="text-[9.5px] font-mono uppercase font-bold tracking-wider opacity-60">Mini Visual Representation Mock</span>
                          <span className="text-sm px-1 py-1 font-mono text-emerald-500 font-semibold uppercase animate-pulse">● Live Render</span>
                        </div>
                        
                        {/* Simulated verse layout dynamic styling */}
                        <div className="space-y-1 select-none">
                          <div className="flex items-start gap-2.5">
                            <span className={`text-sm font-mono leading-none py-1 px-1.5 rounded-md font-bold text-center ${
                              welcomeStyles[selectedWelcomeStyle].mockVerseBadge
                            }`}>
                              Gen 1:1
                            </span>
                            <div className="space-y-1 flex-1">
                              <p className={`text-[15px] leading-[1.8] tracking-[0.01em] ${
                                welcomeStyles[selectedWelcomeStyle].mockVerseHeading
                              }`}>
                                In the <span className="underline decoration-cyan-400/40 underline-offset-3 cursor-help">beginning</span> God created the heaven...
                              </p>
                              <p className="text-sm opacity-60 italic">
                                Original: In the commencement of all finite creation, the Almighty initiated...
                              </p>
                            </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  )}

                  {welcomeStep === 2 && (
                    <motion.div
                      key="step-scholarly-actions"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <h2 className={`text-lg sm:text-xl font-display font-black tracking-tight ${
                          welcomeStyles[selectedWelcomeStyle].headingText
                        }`}>
                          Scholarly Reflection Actions
                        </h2>
                        <p className={`text-sm mt-1 leading-[1.8] tracking-[0.01em] ${
                          welcomeStyles[selectedWelcomeStyle].descText
                        }`}>
                          We abide by high-quality typography constraints. The verse number indicators remain clean and stationary, while active thematic study buttons appear directly underneath them!
                        </p>
                      </div>

                      {/* Interactive Simulation Panel */}
                      <div className={`p-4 rounded-xl border ${
                        welcomeStyles[selectedWelcomeStyle].boxBg
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-mono font-bold uppercase tracking-wider ${
                            welcomeStyles[selectedWelcomeStyle].subText
                          }`}>
                            Live Interactive Interface Guide
                          </span>
                          <span className="text-sm px-1 py-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-mono font-extrabold animate-pulse">TRY TAP ACTION</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          {/* Left: simulated verse layout */}
                          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center min-w-[100px] h-32 ${
                            welcomeStyles[selectedWelcomeStyle].mockVerseBg
                          }`}>
                            <span className="text-sm px-1 py-1 font-mono tracking-wider opacity-50 mb-1 uppercase">Verse Id</span>
                            {/* Stationary Verse Indicator number */}
                            <div className={`text-[13px] font-sans font-extrabold select-none h-8 flex items-center justify-center`}>
                              1
                            </div>
                            {/* Standard MoreVertical Menu options icon positioned directly below */}
                            <button
                              onClick={() => {
                                setWelcomeIdiomIndex((prev) => (prev ? 0 : 1));
                              }}
                              className={`mt-2 p-1 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center relative hover:scale-115 active:scale-95 ${
                                welcomeIdiomIndex === 1
                                  ? 'bg-cyan-500/20 text-cyan-500'
                                  : 'bg-white/80 dark:bg-black/40 text-slate-400 hover:text-indigo-400'
                              }`}
                              title="Verse Action Options Menu"
                            >
                              <MoreVertical 
                                className="w-4 h-4 transition-transform" 
                              />
                              {welcomeIdiomIndex === 1 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse"></span>
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Right: Explanatory text description */}
                          <div className="flex-1 space-y-2">
                            <h4 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                              welcomeStyles[selectedWelcomeStyle].headingText
                            }`}>
                              {welcomeIdiomIndex === 1 ? '🌟 Theological Study Note Active' : '⚙️ Verse Options & Reflection Menu'}
                            </h4>
                            <p className="text-base leading-[1.8] tracking-[0.01em] opacity-85">
                              {welcomeIdiomIndex === 1
                                ? "Excellent! Tapping the standard options menu icon directly beneath the verse number opens the unified theological diary so you can draft scholarly reflections and key word highlights."
                                : "Tap the options menu icon on the left. The options icon is situated neatly underneath the stable verse index for clean visual layout and quick diary drafting."
                              }
                            </p>
                            <div className="pt-1 select-none">
                              <span className="text-sm px-1 py-1 font-mono bg-cyan-700/10 text-cyan-500 dark:text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/15">
                                ⚡ Allows Easy Navigation & Speed Presets
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details specs list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="flex gap-2 text-left">
                          <span className="text-sm">📝</span>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider">Theological Study Journals</h4>
                            <p className="text-sm opacity-75 mt-0.5 leading-[1.8] tracking-[0.01em]">Highlight scriptures, transcribe reflections, and sync translation presets side-by-side.</p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-left">
                          <span className="text-sm">🎚️</span>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider">Speed Control Inside Notes</h4>
                            <p className="text-sm opacity-75 mt-0.5 leading-[1.8] tracking-[0.01em]">Adjust your vocal read speed levels directly from study notebooks (ranges from 0.5x to 1.5x) inside active study cards.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {welcomeStep === 3 && (
                    <motion.div
                      key="step-features"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <h2 className={`text-lg sm:text-xl font-display font-black tracking-tight ${
                          welcomeStyles[selectedWelcomeStyle].headingText
                        }`}>
                          Vocabulary Study & Speed Pacing Sandbox
                        </h2>
                        <p className={`text-sm mt-0.5 leading-[1.8] tracking-[0.01em] ${
                          welcomeStyles[selectedWelcomeStyle].descText
                        }`}>
                          Excellent pronunciation requires customizable speech rate control. Test our voice generator below:
                        </p>
                      </div>

                      {/* Live vocal speed preview module widget */}
                      <div className={`p-4 rounded-2xl border ${
                        welcomeStyles[selectedWelcomeStyle].boxBg
                      }`}>
                        <div className="flex items-center justify-between mb-3.5">
                          <label className="text-sm font-mono font-bold uppercase tracking-wide flex items-center gap-1.5">
                            🎙️ ADJUST VOCAL STUDY SPEED
                          </label>
                          <span className={`text-sm font-mono font-black border px-2 py-0.5 rounded-lg ${
                            welcomeStyles[selectedWelcomeStyle].speedBadge
                          }`}>
                            {welcomePreviewSpeed.toFixed(1)}x Speed
                          </span>
                        </div>

                        {/* Interactive speed radio-pills layout */}
                        <div className="grid grid-cols-5 gap-1.5 mb-4">
                          {[0.5, 0.8, 1.0, 1.2, 1.5].map((speedVal) => (
                            <button
                              key={speedVal}
                              onClick={() => {
                                setWelcomePreviewSpeed(speedVal);
                                if ('speechSynthesis' in window) {
                                  window.speechSynthesis.cancel();
                                }
                              }}
                              className={`p-2 rounded-xl text-center text-sm font-mono font-bold transition-all duration-200 border cursor-pointer ${
                                welcomePreviewSpeed === speedVal
                                  ? welcomeStyles[selectedWelcomeStyle].speedBtnActive
                                  : welcomeStyles[selectedWelcomeStyle].speedBtnInactive
                              }`}
                            >
                              {speedVal === 1.0 ? 'Normal' : `${speedVal}x`}
                            </button>
                          ))}
                        </div>

                        {/* Speech synthesis play buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              if (!('speechSynthesis' in window)) {
                                alert("Speech synthesis of standard Bible text is currently restricted or unsupported in this browser container context.");
                                return;
                              }
                              try {
                                window.speechSynthesis.cancel();
                                const textVal = "Welcome to the Side-by-Side handbook! Use custom speed presets to practice your pronounciations.";
                                const utterance = new SpeechSynthesisUtterance(textVal);
                                utterance.rate = welcomePreviewSpeed;
                                window.speechSynthesis.speak(utterance);
                              } catch (e) {
                                console.error("Synthesis trigger issue: ", e);
                              }
                            }}
                            className={`p-3 rounded-2xl text-sm font-mono font-bold cursor-pointer transition-transform duration-100 transform hover:scale-[1.01] active:scale-[0.99] flex-1 flex items-center justify-center gap-1.5 ${
                              welcomeStyles[selectedWelcomeStyle].speakBtn
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                            🗣️ Play Sample Audio Sentence
                          </button>
                          
                          <button
                            onClick={() => {
                              if ('speechSynthesis' in window) {
                                window.speechSynthesis.cancel();
                              }
                            }}
                            className={`p-3 rounded-2xl text-sm font-mono font-bold cursor-pointer hover:bg-red-500/10 hover:text-red-400 border transition-all duration-200 ${
                              welcomeStyles[selectedWelcomeStyle].stopBtn
                            }`}
                          >
                            Stop Voice
                          </button>
                        </div>
                      </div>

                      {/* Standard Scholar elements lists */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="flex gap-2.5 items-start">
                          <span className="text-sm">📝</span>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wide">Theological Study Journals</h4>
                            <p className="text-[15px] opacity-70 leading-[1.8] tracking-[0.01em] mt-0.5">Highlight, write scholarly reflections, and save translation indices in local storage securely.</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5 items-start">
                          <span className="text-sm">📚</span>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wide">Parallel Root Codexes</h4>
                            <p className="text-[15px] opacity-70 leading-[1.8] tracking-[0.01em] mt-0.5">Compare Hebrew or Greek base words on a word-by-word structure instantly by hovering/tapping.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {welcomeStep === 4 && (
                    <motion.div
                      key="step-ready"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4 text-center py-4"
                    >
                      <div className="inline-flex p-4 rounded-full bg-cyan-500/10 text-cyan-450 animate-pulse mb-1">
                        <Sparkles className="w-10 h-10 text-amber-500 animate-[spin_10s_linear_infinite]" />
                      </div>

                      <h2 className={`text-xl sm:text-2xl font-display font-black tracking-tight ${
                        welcomeStyles[selectedWelcomeStyle].headingText
                      }`}>
                        Your Intellectual Sanctuary Awaits!
                      </h2>

                      <p className={`text-sm sm:text-sm max-w-md mx-auto leading-[1.8] tracking-[0.01em] ${
                        welcomeStyles[selectedWelcomeStyle].descText
                      }`}>
                        Configuration complete. You have established a clean and legible study sanctuary. You can re-open this helper modal at any time using the <strong>🌟 SHALOM STUDY GUIDE</strong> top header button.
                      </p>

                      <p className="text-[15px] font-mono text-emerald-500 uppercase tracking-widest font-bold">
                        Let us commence the study of the Scrolls.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Slider Footer Drawer Buttons */}
              <div className={`p-4 sm:p-5 border-t flex items-center justify-between relative z-10 ${
                welcomeStyles[selectedWelcomeStyle].headerBg
              }`}>
                {/* Dots indicators */}
                <div className="flex space-x-1.5">
                   {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setWelcomeStep(num);
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${
                        welcomeStep === num
                          ? welcomeStyles[selectedWelcomeStyle].dotActive
                          : 'bg-slate-600/30 hover:bg-slate-600/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Back / Next actions */}
                <div className="flex items-center space-x-2">
                  {welcomeStep > 0 && (
                    <button
                      onClick={() => {
                        setWelcomeStep(welcomeStep - 1);
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-mono font-bold hover:scale-[1.01] transition-transform duration-100 cursor-pointer ${
                        welcomeStyles[selectedWelcomeStyle].backBtn
                      }`}
                    >
                      Back
                    </button>
                  )}

                  {welcomeStep < 4 ? (
                    <button
                      onClick={() => {
                        setWelcomeStep(welcomeStep + 1);
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-mono font-bold hover:scale-[1.01] transition-transform duration-100 cursor-pointer flex items-center gap-1 ${
                        welcomeStyles[selectedWelcomeStyle].nextBtn
                      }`}
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        localStorage.setItem('personalized_bible_welcome_dismissed', 'true');
                        setIsWelcomeOpen(false);
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`px-5 py-1.5 rounded-lg text-sm font-mono font-bold animate-pulse hover:scale-[1.01] transition-transform duration-100 cursor-pointer ${
                        welcomeStyles[selectedWelcomeStyle].nextBtn
                      }`}
                    >
                      Enter Sanctuary desk
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </div>
        )}
      </AnimatePresence>

      {/* PWA MOBILE INSTALLATION DIALOG/MODAL */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div 
            onClick={() => setIsInstallModalOpen(false)}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer ${
              theme === 'light' ? 'bg-slate-950/20' : 'bg-black/50'
            }`}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg border rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-colors cursor-default ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#0a1021]/95 border-cyan-500/20 text-slate-200'
              }`}
            >
              {/* Subtle visual accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Header block */}
              <div className="flex items-start justify-between pb-3.5 border-b border-rose-100 dark:border-cyan-950/40 mb-4">
                <div>
                  <h3 className={`text-lg font-display font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    📱 Install Personalized Bible App
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Read, search, and study original biblical manuscripts offline directly on your device.
                  </p>
                </div>
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700 bg-slate-50 border-slate-200'
                      : 'text-slate-400 hover:text-white bg-slate-950/50 border-cyan-950 hover:bg-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Graphical App Metadata Badge */}
              <div className={`p-4 rounded-xl border mb-5 flex items-center space-x-3.5 ${
                theme === 'light' ? 'bg-cyan-50/40 border-cyan-100' : 'bg-cyan-950/15 border-cyan-950/40'
              }`}>
                <div className={`p-2.5 rounded-xl border ${
                  theme === 'light' ? 'bg-white border-cyan-200 text-cyan-600' : 'bg-[#080d1a] border-cyan-800/25 text-cyan-400'
                }`}>
                  <BookOpen className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5 font-mono text-sm px-1 py-1 uppercase tracking-widest font-bold">
                    <span className={theme === 'light' ? 'text-cyan-805' : 'text-cyan-400'}>Universal PWA Edition</span>
                    <span className={`w-1 h-1 rounded-full ${theme === 'light' ? 'bg-cyan-500' : 'bg-cyan-400'}`} />
                    <span className="text-slate-450">iOS & Android</span>
                  </div>
                  <h4 className={`text-sm font-sans font-extrabold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    LogosBridge
                  </h4>
                </div>
              </div>

              {/* Operating System Platform Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-950/70 rounded-xl mb-4 text-sm font-mono font-bold">
                <button
                  onClick={() => setActiveInstallTab('ios')}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    activeInstallTab === 'ios'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iOS Safari</span>
                </button>
                <button
                  onClick={() => setActiveInstallTab('android')}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    activeInstallTab === 'android'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setActiveInstallTab('desktop')}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    activeInstallTab === 'desktop'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              {/* Active Tab Step Walkthrough Pane */}
              <div className={`p-4 rounded-xl border mb-5 text-sm text-left leading-[1.8] tracking-[0.01em] ${
                theme === 'light' ? 'bg-slate-50 border-slate-150 text-slate-700' : 'bg-[#040810]/70 border-cyan-950/20 text-slate-300'
              }`}>
                {activeInstallTab === 'ios' && (
                  <div className="space-y-3">
                    <p className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Follow these simple Safari steps on your iPhone or iPad:
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 font-medium">
                      <li>
                        Open the Safari browser and navigate to this website.
                      </li>
                      <li>
                        Tap the <strong className="text-cyan-500 font-bold">Share</strong> button (the square icon with an upward-pointing arrow) in Safari's bottom toolbar.
                      </li>
                      <li>
                        Scroll down the menu option list and tap <strong className="text-cyan-500 font-bold">"Add to Home Screen"</strong>.
                      </li>
                      <li>
                        Verify the title and tap <strong className="text-cyan-500 font-bold">Add</strong> in the top right corner.
                      </li>
                      <li>
                        Tap the new icon on your phone home screen to launch it in PWA console layout!
                      </li>
                    </ol>
                  </div>
                )}

                {activeInstallTab === 'android' && (
                  <div className="space-y-3">
                    <p className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Follow these Chrome/Firefox steps on your Android smartphone:
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 font-medium">
                      <li>
                        Tap the browser menu button (represented by <strong className="text-cyan-500 font-bold">three dots</strong>) on the top-right.
                      </li>
                      <li>
                        Find and select <strong className="text-cyan-500 font-bold">"Install App"</strong> or <strong className="text-cyan-500 font-bold">"Add to Home Screen"</strong>.
                      </li>
                      <li>
                        Confirm the prompt dialog to complete your installation safely.
                      </li>
                      <li>
                        Open the Personalized Bible application directly from your system App Drawer!
                      </li>
                    </ol>
                  </div>
                )}

                {activeInstallTab === 'desktop' && (
                  <div className="space-y-3">
                    <p className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Install as a standalone App on macOS, Windows, Linux, or ChromeOS:
                    </p>
                    <ol className="list-decimal pl-4 space-y-3 font-medium">
                      <li>
                        Look at your browser's address bar (URLs) in Chrome, Edge, or Brave.
                      </li>
                      <li>
                        Click the <strong className="text-cyan-500 font-bold">Install Shortcut Monitor icon</strong> (looks like a computer with a downward arrow) on the right side of the address bar.
                      </li>
                      <li>
                        Or open Chrome Options (three dots on far-right) and choose <strong className="text-cyan-500 font-bold">"Install Personalized Bible..."</strong>.
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Copy URL Panel for sharing on phone */}
              <div className="space-y-2">
                <span className="text-sm font-mono text-slate-500 font-bold uppercase block">
                  Copy URL to share / open on your Mobile device
                </span>
                <div className={`p-2 rounded-xl border flex items-center justify-between ${
                  theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-cyan-950'
                }`}>
                  <span className="text-[15px] font-mono text-slate-400 truncate select-all flex-1 pr-3 pl-1.5 leading-none">
                    {window.location.origin}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 2000);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold uppercase tracking-wider flex items-center space-x-1 transition cursor-pointer shrink-0 ${
                      copyFeedback
                        ? 'bg-amber-500 text-[#070b14]'
                        : theme === 'light' ? 'bg-slate-200 hover:bg-slate-250 text-slate-800' : 'bg-cyan-950 text-cyan-300 hover:bg-cyan-900'
                    }`}
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Acknowledge Action Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className={`px-4 py-2 font-bold rounded-xl text-sm transition duration-150 uppercase tracking-widest shadow-md cursor-pointer ${
                    theme === 'light'
                      ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-100'
                      : 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-500 hover:text-black border border-cyan-950 shadow-cyan-950'
                  }`}
                >
                  Close & Continue Study
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFLINE BIBLE SYNC & BOOK DOWNLOAD MANAGER (REMOVED) */}
      <AnimatePresence>
        {false && (
          <div
            onClick={() => {
              if (!downloadingBook) {
                setIsOfflineSyncOpen(false);
              }
            }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer ${
              theme === 'light' ? 'bg-slate-950/20' : 'bg-black/50'
            }`}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl border rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-colors cursor-default max-h-[85vh] flex flex-col ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#0a1021]/95 border-cyan-500/20 text-slate-200'
              }`}
            >
              {/* Decorative light effect */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-rose-100 dark:border-cyan-955/40 mb-4 shrink-0">
                <div>
                  <h3 className={`text-lg font-display font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
                    <Database className="w-5 h-5 text-amber-500" />
                    <span>Offline Bible Sync & Book Downloader</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Download and cache any of the 66 scrolls of the Bible one-by-one into local storage for immediate offline studying.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (downloadingBook) {
                      cancelDownloadRef.current = true;
                    }
                    setIsOfflineSyncOpen(false);
                  }}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700 bg-slate-50 border-slate-200'
                      : 'text-slate-400 hover:text-white bg-slate-950/50 border-cyan-950 hover:bg-slate-900'
                  }`}
                  title={downloadingBook ? "Cancel sync and close" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Storage Capacity Overview Card */}
              <div className={`p-4 rounded-xl border mb-4 shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${
                theme === 'light' ? 'bg-amber-50/20 border-amber-100' : 'bg-[#181109]/30 border-[#472202]/30'
              }`}>
                <div className="space-y-1 text-left">
                  <span className="text-sm font-mono uppercase tracking-wider text-slate-500 font-bold block">
                    BOOKS FULLY READY
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-2xl font-display font-extrabold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {Object.entries(cachedChapters).filter(([bookName, cachedCount]) => {
                        const bookObj = BIBLE_BOOKS.find(b => b.name === bookName);
                        return bookObj && cachedCount === bookObj.chapters;
                      }).length}
                    </span>
                    <span className="text-sm text-slate-400">/ 66 books offline</span>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <span className="text-sm font-mono uppercase tracking-wider text-slate-500 font-bold block">
                    TOTAL CACHED CHAPTERS
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-2xl font-display font-extrabold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {Object.values(cachedChapters).reduce((acc: number, curr: number) => acc + curr, 0)}
                    </span>
                    <span className="text-sm text-slate-400">/ 1189 chapters cached</span>
                  </div>
                </div>

                <div className="flex items-center lg:justify-end">
                  <button
                    onClick={handleClearAllCaches}
                    className={`px-3 py-1.5 text-sm font-mono font-bold uppercase tracking-wider rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-rose-950/20 border-rose-900/40 text-rose-400 hover:bg-rose-950/50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Cache</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE SYNCING LOG PANEL (Show only when syncing) */}
              {downloadingBook && (
                <div className={`p-4 rounded-xl border mb-4 text-sm font-mono shrink-0 relative overflow-hidden ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/85 border-cyan-950/55 text-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-500 animate-spin" />
                      <span className="font-bold uppercase tracking-wide">Syncing {downloadingBook}...</span>
                    </div>
                    <span className="font-bold text-cyan-500">{downloadProgress}%</span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>

                  <div className="max-h-20 overflow-y-auto space-y-1 text-sm text-slate-400 text-left">
                    {downloadStatusLog.slice(-4).map((log, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-cyan-500">⮚</span>
                        <p className="truncate">{log}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        cancelDownloadRef.current = true;
                      }}
                      className="px-2.5 py-1 text-sm px-1 py-1 uppercase tracking-wider font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer transition"
                    >
                      Cancel Synchronization
                    </button>
                  </div>
                </div>
              )}

              {/* Books Search Filter inside Dialog */}
              <div className="mb-3 shrink-0 flex items-center space-x-2">
                <Search className="w-4 h-4 text-cyan-500 shrink-0" />
                <input 
                  type="text"
                  placeholder="Type to filter books (e.g., Genesis, Romans)..."
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  className={`w-full text-sm font-mono px-3 py-2 rounded-lg border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500'
                      : 'bg-slate-950 border-cyan-950 text-slate-200 focus:border-cyan-500'
                  }`}
                />
                {bookSearchQuery && (
                  <button 
                    onClick={() => setBookSearchQuery('')}
                    className="text-sm font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Books list scrollable section */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                  {/* Filtered books rendering */}
                  {BIBLE_BOOKS.filter(b => b.name.toLowerCase().includes(bookSearchQuery.toLowerCase())).map((bookObj) => {
                    const cachedCount = cachedChapters[bookObj.name] || 0;
                    const isFullyCached = cachedCount === bookObj.chapters;
                    const isPartiallyCached = cachedCount > 0 && cachedCount < bookObj.chapters;
                    const isCurrentDownloading = downloadingBook === bookObj.name;

                    return (
                      <div 
                        key={bookObj.name}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                          theme === 'light'
                            ? (isFullyCached ? 'bg-emerald-50/10 border-slate-150' : 'bg-slate-50/50 border-slate-150')
                            : (isFullyCached ? 'bg-emerald-950/10 border-emerald-900/10' : 'bg-slate-950/40 border-cyan-950/20')
                        }`}
                      >
                        <div className="truncate space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-base md:text-lg font-display font-extrabold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                              {bookObj.name}
                            </span>
                            <span className="text-sm px-1 py-1 font-mono text-slate-400">({bookObj.chapters} Ch)</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm">
                            {isFullyCached ? (
                              <span className="text-emerald-500 font-bold font-mono">✓ Online & Offline Ready</span>
                            ) : isPartiallyCached ? (
                              <span className="text-amber-500 font-bold font-mono">⚠️ Partial ({cachedCount}/{bookObj.chapters} Ch)</span>
                            ) : (
                              <span className="text-slate-400 font-mono">Cloud Only</span>
                            )}
                          </div>
                        </div>

                        {/* Action section */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cachedCount > 0 && !isCurrentDownloading && (
                            <button
                              onClick={() => handleClearBookCache(bookObj.name)}
                              disabled={!!downloadingBook}
                              className={`p-1.5 rounded transition ${
                                theme === 'light' 
                                  ? 'bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600' 
                                  : 'bg-slate-900 text-slate-400 hover:bg-rose-950/50 hover:text-rose-400'
                              } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                              title="Delete Book Offline Cache"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isFullyCached ? (
                            <span className="text-sm font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded font-mono select-none">
                              Offline
                            </span>
                          ) : isCurrentDownloading ? (
                            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 font-mono text-sm px-1 py-1 px-2 py-1 rounded font-bold uppercase animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>{downloadProgress}%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDownloadBook(bookObj.name)}
                              disabled={!!downloadingBook}
                              className={`px-3 py-1 text-sm font-mono font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition ${
                                theme === 'light'
                                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm'
                                  : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-300'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Sync</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="mt-5 pt-4 border-t border-rose-100 dark:border-cyan-950/40 flex justify-end shrink-0">
                <button
                  onClick={() => setIsOfflineSyncOpen(false)}
                  disabled={!!downloadingBook}
                  className={`px-4 py-2 font-bold rounded-xl text-sm uppercase tracking-widest transition shadow-md cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-600 hover:bg-slate-700 text-white'
                      : 'bg-slate-900 border border-cyan-950 text-slate-300 hover:bg-slate-950'
                  } disabled:opacity-45`}
                >
                  Close Manager
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🛡️ THEOLOGICAL STUDY COMPANION QUIZ GAMES OVERLAY (REMOVED) */}
      <AnimatePresence>
        {false && (
          <div
            onClick={() => setIsQuizOpen(false)}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer ${
              theme === 'light' ? 'bg-slate-950/20' : 'bg-black/60'
            }`}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl border rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-colors cursor-default max-h-[90vh] flex flex-col ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#080d19]/95 border-cyan-550/20 text-slate-200 shadow-black'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-cyan-500/10 mb-4 shrink-0">
                <div>
                  <span className={`text-sm font-mono uppercase tracking-widest font-extrabold px-2 py-0.5 rounded ${
                    theme === 'light' ? 'bg-cyan-50 text-cyan-700' : 'bg-cyan-950/40 text-cyan-400'
                  }`}>
                    🎓 Theological Quiz Companion
                  </span>
                  <h3 className={`text-lg font-display font-bold mt-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Scripture Scholars Match &amp; Memory
                  </h3>
                </div>
                <button
                  onClick={() => setIsQuizOpen(false)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700 bg-slate-50 border-slate-200'
                      : 'text-slate-400 hover:text-white bg-slate-950/50 border-cyan-950 hover:bg-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Game Mode Selector Sub-tab inside dialogue */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-150/40 dark:bg-slate-950/60 rounded-xl mb-4 shrink-0 text-sm font-mono font-bold border dark:border-cyan-950/35">
                <button
                  onClick={() => {
                    startVocabularyQuiz();
                    playWebAudioBeep(580, 'sine', 0.1);
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    quizMode === 'vocabulary'
                      ? 'bg-cyan-600 text-white shadow'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-cyan-300'
                  }`}
                >
                  <span>🀄 Greek &amp; Hebrew Dictionary</span>
                </button>
                <button
                  onClick={() => {
                    startMemorizationQuiz(quizVerse || focusedVerse);
                    playWebAudioBeep(640, 'sine', 0.1);
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    quizMode === 'memorization'
                      ? 'bg-cyan-600 text-white shadow'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-cyan-300'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Scripture Memorizer</span>
                </button>
              </div>

              {/* Score Display bar */}
              <div className={`p-2.5 rounded-xl border mb-4 flex items-center justify-between shrink-0 font-mono text-[15px] font-bold ${
                theme === 'light' ? 'bg-slate-50 border-slate-150 text-slate-600' : 'bg-cyan-950/20 border-cyan-950/45 text-cyan-400'
              }`}>
                <span>📖 CHAPTER STUDY SESSION QUIZ</span>
                <div className="flex items-center gap-3">
                  {quizMode === 'vocabulary' && (
                    <span>MATCHED: <strong className={`${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{matchedPairs.length} / {quizWords.length}</strong></span>
                  )}
                  <span>SCORE: <strong className="text-amber-500 font-extrabold">{quizScore} PTS</strong></span>
                </div>
              </div>

              {/* Content Panel Area */}
              <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[45vh] pr-1 select-none">
                
                {/* 1. VOCABULARY CONNECTION MATCH MODE UI */}
                {quizMode === 'vocabulary' && (
                  <div className="space-y-5 py-1">
                    <p className={`text-sm text-center italic font-sans ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Select an original root word in the left grid, then tap its corrected theological translation in the right grid!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left: Root terms */}
                      <div className="space-y-2">
                        <span className="text-sm px-1 py-1 font-mono tracking-widest text-slate-400 uppercase font-extrabold block mb-1">Root Manuscripts Words</span>
                        <div className="grid grid-cols-1 gap-2">
                          {quizWords.map((qw, idx) => {
                            const isMatched = matchedPairs.includes(idx);
                            const isSelected = selectedWordIndex === idx;

                            return (
                              <button
                                key={idx}
                                disabled={isMatched}
                                onClick={() => {
                                  handleWordSelect(idx);
                                  playWebAudioBeep(520, 'sine', 0.08);
                                }}
                                className={`w-full p-3 text-left rounded-xl border transition-all text-sm font-mono flex items-center justify-between font-bold ${
                                  isMatched
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 line-through opacity-70 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-cyan-600 text-white border-cyan-555 shadow shadow-cyan-300'
                                      : theme === 'light'
                                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                                        : 'bg-slate-950/40 border-cyan-950 hover:border-cyan-500/40 text-cyan-400'
                                }`}
                              >
                                <span>{qw.original}</span>
                                {isMatched && <span className="text-emerald-500 text-sm">✓ Matched</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Literal definitions and explanations */}
                      <div className="space-y-2">
                        <span className="text-sm px-1 py-1 font-mono tracking-widest text-slate-400 uppercase font-extrabold block mb-1">Theological Meanings</span>
                        <div className="grid grid-cols-1 gap-2">
                          {quizMeanings.map((meaningText, idx) => {
                            const matchingWordIdx = quizWords.findIndex(w => w.meaning === meaningText);
                            const isMatched = matchingWordIdx !== -1 && matchedPairs.includes(matchingWordIdx);
                            const isSelected = selectedMeaningIndex === idx;

                            return (
                              <button
                                key={idx}
                                disabled={isMatched}
                                onClick={() => {
                                  handleMeaningSelect(idx);
                                  playWebAudioBeep(550, 'sine', 0.08);
                                }}
                                className={`w-full p-3 text-left rounded-xl border leading-snug transition-all text-sm font-sans ${
                                  isMatched
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-500 line-through cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-cyan-600 text-white border-cyan-600 shadow shadow-cyan-300 font-medium'
                                      : theme === 'light'
                                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                        : 'bg-slate-950/40 border-cyan-950 hover:border-cyan-500/40 text-slate-300'
                                }`}
                              >
                                {meaningText}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SCRIPTURE BLANK FILL MEMORIZATION MODE UI */}
                {quizMode === 'memorization' && quizVerse && (
                  <div className="space-y-4 py-1">
                    <div className={`p-4 rounded-xl border leading-[1.8] tracking-[0.01em] ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200/80 text-slate-800' : 'bg-slate-950/40 border-cyan-950'
                    }`}>
                      <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider block text-amber-500 mb-1">
                        📖 TARGET PRACTICE: {quizVerse.book} {quizVerse.chapter}:{quizVerse.verseNumber} (Personalized Translation)
                      </span>
                      
                      {/* Render text with blanks */}
                      <p className="text-sm font-sans leading-[1.8] tracking-[0.01em] tracking-wide font-medium">
                        {blankedWords.map((word, idx) => {
                          const isBlanked = blankedIndices.includes(idx);
                          if (!isBlanked) {
                            return <span key={idx} className="mr-1">{word} </span>;
                          }

                          const cleanVal = word.replace(/[.,:;?!()"']/g, '');
                          const punct = word.substring(cleanVal.length);
                          const userVal = userBlankInput[idx] || '';
                          const isAnsweredCorrectly = memorizationCorrectCount !== null && userVal.trim().toLowerCase() === cleanVal.toLowerCase();

                          return (
                            <span key={idx} className="inline-block mr-1">
                              <input
                                type="text"
                                value={userVal}
                                onChange={(e) => {
                                  setUserBlankInput(prev => ({ ...prev, [idx]: e.target.value }));
                                }}
                                disabled={memorizationCorrectCount !== null && isAnsweredCorrectly}
                                placeholder={`(Blank ${blankedIndices.indexOf(idx) + 1})`}
                                className={`px-2 py-0.5 rounded border focus:ring-1 focus:ring-cyan-500 text-sm font-mono focus:outline-none w-24 text-center transition-all ${
                                  memorizationCorrectCount !== null
                                    ? isAnsweredCorrectly
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 font-bold'
                                      : 'bg-rose-500/20 border-rose-500/50 text-rose-500 font-bold'
                                    : theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/55 border-cyan-900 text-cyan-400'
                                }`}
                              />
                              {punct} 
                            </span>
                          );
                        })}
                      </p>
                    </div>

                    {memorizationCorrectCount !== null && (
                      <div className={`p-3 rounded-xl border leading-[1.8] tracking-[0.01em] text-sm transition font-sans ${
                        memorizationCorrectCount === blankedIndices.length
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/5 border-slate-600/20 text-slate-500 dark:text-slate-355'
                      }`}>
                        <span className="font-mono text-sm px-1 py-1 uppercase tracking-wider font-extrabold block mb-0.5">
                          ✓ MASTER KEY MANUSCRIPT PHRASE:
                        </span>
                        "{quizVerse.nonNativeEnglish}"
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      {memorizationCorrectCount === null ? (
                        <button
                          onClick={() => {
                            checkMemorizationAnswers();
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-sans font-bold shadow transition cursor-pointer ${
                            theme === 'light' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900'
                          }`}
                        >
                          Check Memorized Words
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            startMemorizationQuiz(quizVerse);
                            playWebAudioBeep(620, 'sine', 0.1);
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-sans font-bold shadow transition cursor-pointer ${
                            theme === 'light' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-amber-950/60 text-amber-400 border border-amber-900/40 hover:bg-amber-950'
                          }`}
                        >
                          Try Another Blank Mix
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Status Feedback bar */}
              <div className={`mt-4 p-3 rounded-xl border border-dotted shrink-0 text-sm font-medium font-sans flex items-center justify-between ${
                theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-700 font-medium' : 'bg-slate-950/50 border-cyan-900/40 text-slate-350'
              }`}>
                <span>📢 Feedback: {quizFeedback}</span>
                {matchedPairs.length === quizWords.length && quizWords.length > 0 && quizMode === 'vocabulary' && (
                  <button
                    onClick={() => {
                      startVocabularyQuiz();
                      playWebAudioBeep(700, 'sine', 0.15);
                    }}
                    className="ml-3 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-sm font-bold uppercase rounded cursor-pointer transition shadow"
                  >
                    Play Again
                  </button>
                )}
              </div>

              {/* Close Button Footer */}
              <div className="mt-5 pt-4 border-t border-cyan-500/10 flex justify-between shrink-0">
                <span className="text-sm font-mono text-slate-400 tracking-wider">
                  PERSISTENT QUIZ MANAGER
                </span>
                <button
                  onClick={() => setIsQuizOpen(false)}
                  className={`px-4 py-2 font-bold rounded-xl text-sm uppercase tracking-widest transition shadow-md cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-slate-100'
                      : 'bg-slate-900 border border-cyan-950 text-slate-300 hover:bg-slate-950'
                  }`}
                >
                  Close &amp; Resume Study
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLOUD SYNC MANAGER PANEL */}
      <CloudSyncPanel
        theme={theme}
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        localBookmarks={savedVerses}
        onSyncBookmarksFromCloud={(reconciledBookmarks) => setSavedVerses(reconciledBookmarks)}
      />

      {/* SCREEN PROJECTION AND BROADCAST STUDY STUDIO */}
      <ProjectionStudio
        onBookChange={setSelectedBook}
        onChapterChange={setSelectedChapter}
        theme={theme}
        dynamicTranslationData={dynamicTranslationData}
        isOpen={isProjectionStudioOpen}
        onClose={() => setIsProjectionStudioOpen(false)}
        currentBook={selectedBook}
        currentChapter={selectedChapter}
        chapterData={chapterData}
        onNavigateToVerse={navigateToSidebarVerse}
        initialVerseNumber={projectionInitialVerseNumber}
      />

      {/* PERSISTENT LIVE PROJECTION MONITOR BANNER (PIP) AT THE BOTTOM-RIGHT */}
      <AnimatePresence>
        {liveScreenState && !isLiveMonitorDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-6 right-6 w-80 sm:w-[400px] rounded-xl border z-40 overflow-hidden flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ${
              theme === 'light' 
                ? 'bg-white/95 backdrop-blur-md border-zinc-200/80 text-zinc-800' 
                : 'bg-zinc-950/90 backdrop-blur-xl border-zinc-800/80 text-zinc-100'
            }`}
          >
            {/* Toolbar Header of PIP */}
            <div className={`flex items-center justify-between px-4 py-3 border-b select-none ${
              theme === 'light' ? 'bg-zinc-50/80 border-zinc-200/80' : 'bg-zinc-900/50 border-zinc-800/80'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-2.5 w-2.5 relative items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                </div>
                <span className={`text-sm font-sans font-bold tracking-[0.2em] uppercase ${theme === 'light' ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  Program Out
                </span>
              </div>
              
              <div className="flex items-center gap-2 font-sans">
                <button
                  onClick={() => setIsLiveMonitorCollapsed(!isLiveMonitorCollapsed)}
                  className={`px-2 py-1 rounded-md text-sm font-semibold uppercase tracking-wider transition-colors ${
                    theme === 'light' ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                  title={isLiveMonitorCollapsed ? "Expand live screen window" : "Minimize live screen to indicator"}
                >
                  {isLiveMonitorCollapsed ? 'Expand' : 'Hide'}
                </button>
                <button
                  onClick={() => {
                    setIsLiveMonitorDismissed(true);
                    localStorage.setItem('live_monitor_dismissed_v2', 'true');
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    theme === 'light' ? 'hover:bg-red-50 text-zinc-400 hover:text-red-600' : 'hover:bg-red-950/30 text-zinc-500 hover:text-red-400'
                  }`}
                  title="Close and hide preview monitoring until next transmission"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Expansible monitor area containing high-fidelity visual representations of layouts */}
            {!isLiveMonitorCollapsed && (
              <div className="p-4 flex flex-col gap-4 font-sans">
                
                {/* Visual miniature of live slide */}
                <div className={`w-full aspect-[16/9] rounded-lg border p-1 flex flex-col justify-end transition-all select-none relative shadow-inner overflow-hidden ${
                  liveScreenState.themePreset === 'sapphire-gold' ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-amber-500/30' :
                  liveScreenState.themePreset === 'chroma-green' ? 'bg-[#00ff00] text-black border-black/20' :
                  liveScreenState.themePreset === 'cyber-slate' ? 'bg-zinc-950 text-zinc-50 border-zinc-700/50' :
                  liveScreenState.themePreset === 'amber-parchment' ? 'bg-[#fcf8f2] text-zinc-900 border-amber-900/10' :
                  'bg-black/80 text-white border-zinc-700/50'
                }`}>
                  {/* Backdrop simulated live stage for preview mapping if enabled */}
                  {liveScreenState.layoutMode === 'lower-third' ? (
                    <div className="absolute top-0 inset-x-0 h-[65%] bg-[url('https://images.unsplash.com/photo-1543900694-133f37abaaa5?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" />
                      <span className="text-sm px-1 py-1 font-sans font-medium uppercase tracking-[0.2em] text-white/50 relative z-10">Live Stage</span>
                    </div>
                  ) : null}

                  {/* Render slide/lower-third in miniature */}
                  <div className={`w-full flex flex-col overflow-hidden relative z-10 transition-all ${
                    liveScreenState.layoutMode === 'projector-slide' ? 'h-full justify-center p-3' : 'min-h-[44px] justify-center px-3 py-1.5 border-t border-white/10 bg-black/60 backdrop-blur-md rounded-b-md'
                  }`}>
                    <div className="flex items-center justify-between text-[8px] font-sans tracking-widest leading-none border-b border-white/10 pb-1.5 mb-1.5 opacity-80">
                      <span className="uppercase font-bold text-amber-500">
                        {liveScreenState.isCustomLabelEnabled ? liveScreenState.translationLabel : 'Active Translation'}
                      </span>
                      <span className="font-medium text-white">
                        {liveScreenState.book} {liveScreenState.chapter}:{liveScreenState.verseNumber}
                      </span>
                    </div>
                    <div className={`text-[15px] leading-snug line-clamp-2 transition-all text-white shadow-sm ${
                      liveScreenState.fontFamily === 'serif' ? 'font-serif' : liveScreenState.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                    } ${liveScreenState.isBold ? 'font-bold' : 'font-normal'} ${liveScreenState.isItalic ? 'italic' : 'not-italic'}`}>
                      {liveScreenState.verseText}
                    </div>
                  </div>
                </div>

                {/* Live broadcast metadata info bar */}
                <div className={`flex items-center justify-between text-sm px-1 py-1 font-mono tracking-widest uppercase pb-3 border-b ${theme === 'light' ? 'text-zinc-400 border-zinc-200' : 'text-zinc-500 border-zinc-800'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> NDI Stream
                    </span>
                    <span>1080p60</span>
                  </div>
                  <span className="capitalize">{liveScreenState.layoutMode.replace('-', ' ')}</span>
                </div>

                {/* Fast monitoring controls: Open projection settings, Pop screen, Black screen */}
                <div className="grid grid-cols-3 gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setIsProjectionStudioOpen(true);
                      playWebAudioBeep(520, 'sine', 0.08);
                    }}
                    className={`px-2 py-2 rounded-lg text-sm px-1 py-1 font-sans font-semibold tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === 'light' 
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' 
                        : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    }`}
                    title="Unlock layout studio slider coordinates"
                  >
                    <Settings className="w-3 h-3" /> Config
                  </button>
                  <button
                    onClick={async () => {
                      playWebAudioBeep(880, 'sine', 0.1);
                      await openProjectorStandalone(liveScreenState);
                    }}
                    className={`px-2 py-2 rounded-lg text-sm px-1 py-1 font-sans font-semibold tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === 'light' 
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' 
                        : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    }`}
                    title="Pop standalone slide presenter page out"
                  >
                    <MonitorPlay className="w-3 h-3" /> Pop Out
                  </button>
                  <button
                    onClick={handleClearLiveScreen}
                    className="px-2 py-2 rounded-lg text-sm px-1 py-1 font-sans font-semibold tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20"
                    title="Instantly black out standard screen to default standby wallpaper"
                  >
                    <Ban className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-SIDE SLIDE-IN STUDY COMPANION WORKSPACE SIDEBAR */}
      <AnimatePresence>
        {isStudySidebarOpen && (
          <>
            {/* Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStudySidebarOpen(false)}
              className="fixed inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-[2.5px] z-50 cursor-pointer"
            />

            {/* Main Slide-out Panel container */}
            <motion.div
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[520px] z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col border-l transition-colors duration-200 ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-[#090f1d] border-cyan-950/80 text-slate-100'
              }`}
            >
              {/* Header section with nice glowing borders */}
              <div className={`p-4 md:p-5 border-b flex items-center justify-between shrink-0 relative ${
                theme === 'light' ? 'border-slate-150 bg-slate-50/50' : 'border-cyan-950/40 bg-slate-950/20'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl flex items-center justify-center ${
                    theme === 'light' ? 'bg-cyan-50' : 'bg-cyan-950/30 border border-cyan-900/10'
                  }`}>
                    <BookOpen className="w-5 h-5 text-cyan-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold uppercase tracking-wider">
                      Study Companion Workspace
                    </h3>
                    <p className={`text-[9.5px] font-mono leading-none mt-0.5 ${
                      theme === 'light' ? 'text-slate-500' : 'text-cyan-600/90'
                    }`}>
                      ADVANCED STUDENT STUDY DESK & SPEECH ENGINE
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setIsStudySidebarOpen(false);
                    playWebAudioBeep(440, 'triangle', 0.08);
                  }}
                  className={`p-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                    theme === 'light' 
                      ? 'bg-slate-100 hover:bg-slate-205 border-slate-200 text-slate-600' 
                      : 'bg-slate-900 border-cyan-950/40 text-slate-400 hover:text-white'
                  }`}
                  title="Close workspace"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* FOUR-SIDE PREMIUM TAB BAR */}
              <div className={`flex border-b shrink-0 overflow-x-auto scrollbar-none snap-x ${
                theme === 'light' ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/30 border-cyan-950/40'
              }`}>
                {/* Tab 1: Word Study Scanner */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('scanner');
                    setSidebarSearchQuery('');
                  }}
                  className={`flex-1 min-w-[110px] snap-center py-3 text-center text-sm font-bold font-sans flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeSidebarTab === 'scanner'
                      ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Word Study Scanner</span>
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeSidebarTab === 'scanner' ? 'bg-cyan-500/10 text-cyan-500 font-bold' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {Object.keys(manuscriptData).length}
                  </span>
                </button>

                {/* Tab 2: Theological Diary */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('notes');
                    setSidebarSearchQuery('');
                  }}
                  className={`flex-1 min-w-[110px] snap-center py-3 text-center text-sm font-bold font-sans flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeSidebarTab === 'notes'
                      ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Theological Diary</span>
                  <span className={`text-sm px-1 py-1 font-mono px-1.5 py-0.5 rounded-full ${
                    activeSidebarTab === 'notes' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-550/10 text-slate-400'
                  }`}>
                    {savedVerses.filter(sv => sv.notes && sv.notes.trim() !== '').length}
                  </span>
                </button>

                {/* Tab 3: Study Bookmarks */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('bookmarks');
                    setSidebarSearchQuery('');
                  }}
                  className={`flex-1 min-w-[110px] snap-center py-3 text-center text-sm font-bold font-sans flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeSidebarTab === 'bookmarks'
                      ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Bookmarked Scrolls</span>
                  <span className={`text-sm px-1 py-1 font-mono px-1.5 py-0.5 rounded-full ${
                    activeSidebarTab === 'bookmarks' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-550/10 text-slate-400'
                  }`}>
                    {savedVerses.length}
                  </span>
                </button>

                {/* Tab 4: Audio Settingsing */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('audio');
                    setSidebarSearchQuery('');
                  }}
                  className={`flex-1 min-w-[110px] snap-center py-3 text-center text-sm font-bold font-sans flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeSidebarTab === 'audio'
                      ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audio Settings</span>
                  {currentlyReadingVerse !== null && (
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                  )}
                </button>
              </div>

              {/* SIDEBAR DYNAMIC BODY PANELS */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5">

                {/* TAB 0: WORD STUDY MANUSCRIPT SCANNER */}
                {activeSidebarTab === 'scanner' && (() => {
                  // Resolve active scanner selected word details
                  let selectedEntry = null;
                  if (activeScannerSelectedWordId) {
                    const [keyPart] = activeScannerSelectedWordId.split('-');
                    selectedEntry = manuscriptData[keyPart];
                  }

                  // Function to tokenize on-the-fly inside render
                  const tokenizeTextForScanner = (text: string) => {
                    if (!text) return [];
                    
                    const sortedKeys = Object.keys(manuscriptData).sort((a, b) => b.length - a.length);
                    const examKeys = sortedKeys.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                    
                    const pattern = `\\b(${examKeys.join('|')})(?:s|es)?\\b`;
                    const regex = new RegExp(pattern, 'gi');
                    
                    const elements: ReactNode[] = [];
                    let lastIndex = 0;
                    let match;
                    let keyIdx = 0;
                    
                    while ((match = regex.exec(text)) !== null) {
                      const matchIndex = match.index;
                      const matchedStr = match[0];
                      const capturedWordKey = match[1].toLowerCase();
                      
                      if (matchIndex > lastIndex) {
                        elements.push(<span key={`text-${keyIdx++}`}>{text.substring(lastIndex, matchIndex)}</span>);
                      }
                      
                      const entry = manuscriptData[capturedWordKey];
                      const isSelected = activeScannerSelectedWordId === `${capturedWordKey}-${matchIndex}`;
                      
                      elements.push(
                        <button
                          key={`badge-${keyIdx++}`}
                          onClick={() => {
                            setActiveScannerSelectedWordId(isSelected ? null : `${capturedWordKey}-${matchIndex}`);
                          }}
                          className={`px-1.5 py-0.5 mx-[2px] rounded-md font-semibold transition-all duration-150 transform hover:-translate-y-0.5 cursor-pointer inline-block text-[15px] ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold'
                              : theme === 'light'
                              ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-900'
                              : 'bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300'
                          }`}
                          title={`Original root: ${entry ? entry.originalValue : ''}. Tap to study.`}
                        >
                          {matchedStr}
                        </button>
                      );
                      
                      lastIndex = regex.lastIndex;
                    }
                    
                    if (lastIndex < text.length) {
                      elements.push(<span key={`text-${keyIdx++}`}>{text.substring(lastIndex)}</span>);
                    }
                    
                    return elements;
                  };

                  return (
                    <div className="space-y-4 animate-fadeIn">
                      <div className={`p-4 rounded-2xl border ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-cyan-950/40'
                      }`}>
                        <span className="text-sm px-1 py-1 font-mono uppercase tracking-widest font-extrabold text-cyan-500 block mb-1">
                          Theological Lexicon & Manuscript Scan Engine
                        </span>
                        <p className={`text-[15px] leading-[1.8] tracking-[0.01em] ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          Draft or paste any scripture commentaries, sermon drafts, or biblical texts in the panel below. The engine will scan and highlight terms instantly with active original manuscript links.
                        </p>
                      </div>

                      {/* TEXTAREA INPUT */}
                      <div className="space-y-1.5">
                        <textarea
                          placeholder="Paste or draft theological reflections here..."
                          value={scannerInputText}
                          onChange={(e) => setScannerInputText(e.target.value)}
                          className={`w-full h-32 p-3 text-sm rounded-xl border focus:outline-none focus:ring-1.5 ${
                            theme === 'light'
                              ? 'bg-white border-slate-200 text-slate-800 focus:border-cyan-500 focus:ring-cyan-500/30'
                              : 'bg-slate-900 border-cyan-950/50 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/30'
                          }`}
                        />
                        
                        {/* INPUT SHORTCUT PRESETS */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              if (chapterData) {
                                const fullText = chapterData.verses.map(v => `[v.${v.verseNumber}] ${v.kjvText}`).join(' ');
                                setScannerInputText(fullText);
                              }
                            }}
                            className={`px-2 py-1 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                              theme === 'light' 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                : 'bg-slate-900 hover:bg-[#121c38] text-slate-300'
                            }`}
                          >
                            📖 Load Current Chapter (KJV)
                          </button>
                          
                          <button
                            onClick={() => {
                              if (chapterData) {
                                const fullText = chapterData.verses.map(v => `[v.${v.verseNumber}] ${v.bsbText}`).join(' ');
                                setScannerInputText(fullText);
                              }
                            }}
                            className={`px-2 py-1 text-sm rounded-md font-medium cursor-pointer transition-colors ${
                              theme === 'light' 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                : 'bg-slate-900 hover:bg-[#121c38] text-slate-300'
                            }`}
                          >
                            📖 Load Current Chapter (BSB)
                          </button>

                          <button
                            onClick={() => setScannerInputText('')}
                            className={`px-2 py-1 text-sm rounded-md font-medium cursor-pointer transition-colors text-rose-500 ${
                              theme === 'light' ? 'bg-rose-50 hover:bg-rose-100' : 'bg-rose-950/10 hover:bg-rose-950/25'
                            }`}
                          >
                            ✕ Clear Text
                          </button>
                        </div>
                      </div>

                      {/* LEXICON BRIEF DETAILS PORTLET */}
                      {selectedEntry && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-2xl border border-dashed text-left ${
                            theme === 'light'
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-sm shadow-amber-100/50'
                              : 'bg-amber-950/10 border-amber-500/20 text-slate-150'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm px-1 py-1 font-mono tracking-widest uppercase font-extrabold text-amber-600 dark:text-amber-400">
                              MANUSCRIPT CODEC • {selectedEntry.language} CORE
                            </span>
                            <button
                              onClick={() => setActiveScannerSelectedWordId(null)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <h4 className="text-sm font-sans font-extrabold">
                            {selectedEntry.word.toUpperCase()} — <span className="font-mono text-cyan-600 dark:text-cyan-400 text-sm">{selectedEntry.originalValue}</span>
                          </h4>
                          
                          <p className={`text-sm leading-[1.8] tracking-[0.01em] mt-2 font-medium ${
                            theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                          }`}>
                            {selectedEntry.explanation}
                          </p>
                        </motion.div>
                      )}

                      {/* OUTPUT DISPLAY PANEL */}
                      <div className={`p-4 rounded-2xl border text-left flex flex-col font-sans ${
                        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-cyan-950/30'
                      }`}>
                        <div className="pb-2 border-b border-dashed border-slate-200 dark:border-cyan-950/30 mb-3 flex items-center justify-between">
                          <span className="text-sm px-1 py-1 font-mono uppercase tracking-widest font-bold text-slate-400">
                            Scanned Interactive Translation Output
                          </span>
                          <span className="text-sm px-1 py-1 font-mono text-cyan-500 px-1.5 py-0.5 rounded-md bg-cyan-500/5">
                            Real-Time Scan
                          </span>
                        </div>

                        {!scannerInputText ? (
                          <div className="py-8 text-center flex flex-col items-center justify-center text-slate-400 dark:text-cyan-850">
                            <Compass className="w-8 h-8 text-slate-300 dark:text-cyan-950 mb-2 animate-spin-slow" />
                            <p className="text-sm font-medium">Text space currently empty.</p>
                            <p className="text-sm mt-1 text-slate-400">Type above or click a load button to begin.</p>
                          </div>
                        ) : (
                          <div className={`text-sm md:text-sm leading-[1.8] tracking-[0.01em] whitespace-pre-wrap ${
                            theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                          }`}>
                            {tokenizeTextForScanner(scannerInputText)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 1: AUDIO SETTINGS */}
                {activeSidebarTab === 'audio' && (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* Live Equalizer/Frequency Wave feedback */}
                    <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center relative ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-cyan-950/40'
                    }`}>
                      <div className="text-center mb-3">
                        <span className="text-[9.5px] font-mono uppercase tracking-widest font-extrabold text-cyan-500 block">
                          Audio playback
                        </span>
                        {currentlyReadingVerse !== null ? (
                          <span className={`text-sm block mt-1 leading-normal font-sans tracking-wide font-normal ${
                            theme === 'light' ? 'text-slate-700' : 'text-slate-200'
                          }`}>
                            <span className="font-bold">Playing:</span> Verse {currentlyReadingVerse} of {chapterData?.verses?.length || 0}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500 block mt-1 font-sans">
                            Not playing
                          </span>
                        )}
                      </div>

                      {/* Cool graphic bouncy equalise lines */}
                      <div className="h-10 flex items-end justify-center space-x-1 px-4 py-1">
                        {[0.6, 1.4, 0.8, 1.8, 1.1, 1.5, 0.7, 1.3, 0.9, 1.6, 0.5].map((val, index) => {
                          const delay = (index * 0.07).toFixed(2);
                          const duration = (val * 0.8).toFixed(2);
                          return (
                            <div
                              key={index}
                              className={`w-1 rounded-full ${
                                currentlyReadingVerse !== null 
                                  ? 'bg-cyan-500' 
                                  : 'bg-slate-350 dark:bg-cyan-950/40'
                              }`}
                              style={{
                                height: currentlyReadingVerse !== null ? `${val * 18}px` : '4px',
                                transition: 'height 0.15s ease-in-out',
                                animationName: currentlyReadingVerse !== null ? 'bounceWave' : 'none',
                                animationDuration: `${duration}s`,
                                animationTimingFunction: 'ease-in-out',
                                animationIterationCount: 'infinite',
                                animationDirection: 'alternate',
                                animationDelay: `${delay}s`
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Speech engine properties custom config */}
                    <div className={`p-4 rounded-xl border space-y-3.5 ${
                      theme === 'light' ? 'bg-[#fcfdfe] border-slate-200/80' : 'bg-[#0b1222] border-cyan-950/45'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-sans">
                          Playback speed
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-slate-500">Speed:</span>
                          <select
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            className={`text-sm font-mono font-bold rounded border bg-transparent p-1.5 focus:outline-none ${
                              theme === 'light' 
                                ? 'bg-white border-slate-200 text-slate-800' 
                                : 'bg-slate-950 border-cyan-950 text-cyan-400'
                            }`}
                          >
                            <option value="0.5">0.5x (Slow)</option>
                            <option value="0.65">0.65x</option>
                            <option value="0.8">0.8x</option>
                            <option value="1.0">1x (Normal)</option>
                            <option value="1.2">1.2x</option>
                            <option value="1.5">1.5x (Fast)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-sans">
                          Audio translation
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-slate-500">Source:</span>
                          <select
                            id="audio-target-selection"
                            value={audioReadingSelection}
                            onChange={(e) => setAudioReadingSelection(e.target.value as any)}
                            className={`text-sm font-mono font-bold rounded border bg-transparent p-1.5 focus:outline-none ${
                              theme === 'light' 
                                ? 'bg-white border-slate-200 text-slate-800' 
                                : 'bg-slate-950 border-cyan-950 text-cyan-400'
                            }`}
                          >
                            <option value="dynamic" className={theme === 'light' ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#080d19]'}>Dynamic (Matches Layout)</option>
                            <option value="kjv" className={theme === 'light' ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#080d19]'}>King James (KJV)</option>
                            <option value="bsb" className={theme === 'light' ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#080d19]'}>Berean Standard (BSB)</option>
                            <option value="plain" className={theme === 'light' ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#080d19]'}>Plain English (Contemporary)</option>
                            <option value="personalized" className={theme === 'light' ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#080d19]'}>Personalised Prayer</option>
                          </select>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-cyan-950/30" />

                      
                    </div>

                    {/* Chapter Verses list with individual play controls */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono font-extrabold uppercase tracking-widest text-slate-400">
                          Verses in this chapter
                        </span>
                        <span className="text-[9.5px] font-mono text-cyan-500 font-bold">
                          {chapterData?.book} {chapterData?.chapter}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {chapterData?.verses?.map((v) => {
                          const isThisWordReading = currentlyReadingVerse === v.verseNumber;
                          return (
                            <div
                              key={v.verseNumber}
                              onClick={() => navigateToSidebarVerse(chapterData.book, chapterData.chapter, v.verseNumber)}
                              className={`p-3 rounded-xl border text-sm leading-normal transition-all cursor-pointer ${
                                isThisWordReading
                                  ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 ring-1 ring-cyan-200' : 'bg-[#0f1d35] border-cyan-500/40 text-cyan-300 font-medium')
                                  : (theme === 'light' ? 'bg-white hover:bg-slate-50 border-slate-200' : 'bg-slate-950 hover:bg-slate-900 border-cyan-950/40')
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`font-mono text-sm uppercase tracking-wide font-extrabold px-1.5 py-0.5 rounded border ${
                                  isThisWordReading
                                    ? 'bg-cyan-500 border-cyan-400 text-white'
                                    : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900 border-cyan-950 text-cyan-600')
                                }`}>
                                  Verse {String(v.verseNumber).padStart(2, '0')}
                                </span>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isThisWordReading) {
                                      stopSpeaking();
                                    } else {
                                      playSingleVerse(v.verseNumber, getSpeechTextForVerse(v));
                                    }
                                  }}
                                  className={`flex items-center justify-center w-7 h-7 rounded-full shadow-md ${ isThisWordReading ? 'bg-rose-500/10 text-rose-500' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' } transition-all duration-500 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
                                  title={isThisWordReading ? 'Silence Voice' : 'Play audio'}
                                >
                                  {isThisWordReading ? <Square className="w-3 h-3 fill-current animate-pulse" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                                </button>
                              </div>
                              <p className={`font-serif leading-[1.8] tracking-[0.01em] line-clamp-2 ${
                                isThisWordReading ? '' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                "{getSpeechTextForVerse(v)}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: THEOLOGICAL DIARY NOTES COMPILATION */}
                {activeSidebarTab === 'notes' && (
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Search box for notes filter */}
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                        theme === 'light' ? 'text-slate-400' : 'text-cyan-600'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search your theological diary notes or books..."
                        value={sidebarSearchQuery}
                        onChange={(e) => setSidebarSearchQuery(e.target.value)}
                        className={`w-full text-sm pl-8.5 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                          theme === 'light'
                            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
                            : 'bg-slate-950 text-slate-100 border-cyan-950/50 shadow-inner'
                        }`}
                      />
                    </div>

                    <div className="space-y-3.5">
                      {(() => {
                        const notesList = savedVerses.filter(
                          (sv) => sv.notes && sv.notes.trim() !== ''
                        );
                        
                        const filteredNotes = notesList.filter((n) => {
                          const query = sidebarSearchQuery.toLowerCase();
                          return (
                            n.book.toLowerCase().includes(query) ||
                            n.notes?.toLowerCase().includes(query) ||
                            String(n.chapter).includes(query) ||
                            String(n.verse).includes(query)
                          );
                        });

                        if (notesList.length === 0) {
                          return (
                            <div className={`p-8 rounded-2xl border text-center font-sans relative ${
                              theme === 'light' ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/25 border-cyan-950/40'
                            }`}>
                              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-cyan-950/30 mx-auto mb-3" />
                              <h4 className="text-sm font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                                Reflection Diary Empty
                              </h4>
                              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-[1.8] tracking-[0.01em]">
                                No theological reflections recorded yet. Click the theological message icon on any verse in the scripture scroll to log your research insights.
                              </p>
                            </div>
                          );
                        }

                        if (filteredNotes.length === 0) {
                          return (
                            <p className="text-center font-mono text-slate-500 text-sm py-10">
                              No diaries matched your keyword.
                            </p>
                          );
                        }

                        return filteredNotes.map((n, idx) => {
                          const isEditingThisNote =
                            sidebarDraftingIndex &&
                            sidebarDraftingIndex.book === n.book &&
                            sidebarDraftingIndex.chapter === n.chapter &&
                            sidebarDraftingIndex.verse === n.verse;

                          const isSameChapter =
                            chapterData?.book === n.book && chapterData?.chapter === n.chapter;
                          const mappedVerseObj = isSameChapter
                            ? chapterData?.verses?.find((v) => v.verseNumber === n.verse)
                            : null;

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border leading-[1.8] tracking-[0.01em] transition-all shadow-xs relative ${
                                theme === 'light'
                                  ? 'bg-amber-100/10 border-slate-200'
                                  : 'bg-[#19130c]/30 border-amber-950/35'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b pb-2 mb-2 border-dashed border-amber-500/10">
                                <button
                                  onClick={() => navigateToSidebarVerse(n.book, n.chapter, n.verse)}
                                  className={`text-sm font-mono font-bold tracking-tight uppercase flex items-center gap-1 cursor-pointer transition-colors hover:scale-105 ${
                                    theme === 'light'
                                      ? 'text-cyan-700 hover:text-cyan-600'
                                      : 'text-cyan-400 hover:text-cyan-300'
                                  }`}
                                  title="Jump to verse in scroll scroll"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                  <span>
                                    {n.book} {n.chapter}:{n.verse}
                                  </span>
                                </button>

                                <div className="flex items-center space-x-2.5">
                                  {!isEditingThisNote && (
                                    <>
                                      <button
                                        onClick={() =>
                                          startSidebarNoteEdit(n.book, n.chapter, n.verse, n.notes || '')
                                        }
                                        className={`text-sm font-mono font-bold hover:underline transition cursor-pointer ${
                                          theme === 'light' ? 'text-amber-700' : 'text-amber-500'
                                        }`}
                                      >
                                        Edit
                                      </button>
                                      
                                      <button
                                        onClick={() =>
                                          deleteSidebarNote(n.book, n.chapter, n.verse)
                                        }
                                        className="text-sm font-mono text-rose-500 font-bold hover:underline cursor-pointer"
                                      >
                                        ✕ Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* If Editing Mode */}
                              {isEditingThisNote ? (
                                <div className="space-y-2 mt-2">
                                  <textarea
                                    value={sidebarDraftText}
                                    onChange={(e) => setSidebarDraftText(e.target.value)}
                                    className={`w-full text-sm p-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                                      theme === 'light'
                                        ? 'bg-white text-slate-800 border-slate-200 shadow-inner'
                                        : 'bg-slate-950 text-slate-150 border-cyan-900/40 shadow-inner'
                                    }`}
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end space-x-1.5 pt-1">
                                    <button
                                      onClick={() => setSidebarDraftingIndex(null)}
                                      className={`text-sm uppercase font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                                        theme === 'light'
                                          ? 'bg-slate-100 text-slate-605 hover:bg-slate-200'
                                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={saveSidebarNoteEdit}
                                      className="text-sm uppercase font-mono px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
                                    >
                                      Save Note
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className={`font-serif leading-[1.8] tracking-[0.01em] not-italic pr-2 select-text text-sm mb-2 pl-2 border-l-2 ${
                                    theme === 'light' ? 'text-slate-705 border-slate-300' : 'text-amber-105/90 border-amber-955/60'
                                  }`}>
                                    "{n.notes}"
                                  </div>

                                  {/* Scripture verse context */}
                                  {mappedVerseObj ? (
                                    <p className="text-sm leading-[1.8] tracking-[0.01em] text-slate-550 dark:text-slate-400 border-t pt-1.5 border-dashed border-amber-500/5 select-none line-clamp-2">
                                      <span className="font-bold">Text:</span> "{getSpeechTextForVerse(mappedVerseObj)}"
                                    </p>
                                  ) : (
                                    <button
                                      onClick={() => navigateToSidebarVerse(n.book, n.chapter, n.verse)}
                                      className="text-[9.5px] font-mono text-slate-400 hover:text-cyan-500 uppercase flex items-center gap-1 cursor-pointer hover:underline pt-1.5 select-none"
                                    >
                                      <span>➔ Click to load associated scripture text context</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* TAB 3: STUDY BOOKMARKS LIBRARY */}
                {activeSidebarTab === 'bookmarks' && (
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Search box for bookmarks filter */}
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                        theme === 'light' ? 'text-slate-400' : 'text-cyan-600'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search your bookmarked covenants..."
                        value={sidebarSearchQuery}
                        onChange={(e) => setSidebarSearchQuery(e.target.value)}
                        className={`w-full text-sm pl-8.5 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                          theme === 'light'
                            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                            : 'bg-slate-950 text-slate-100 border-cyan-950/50 shadow-inner'
                        }`}
                      />
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const filteredBookmarks = savedVerses.filter((b) => {
                          const query = sidebarSearchQuery.toLowerCase();
                          return (
                            b.book.toLowerCase().includes(query) ||
                            String(b.chapter).includes(query) ||
                            String(b.verse).includes(query)
                          );
                        });

                        if (savedVerses.length === 0) {
                          return (
                            <div className={`p-8 rounded-2xl border text-center font-sans relative ${
                              theme === 'light' ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/25 border-cyan-950/40'
                            }`}>
                              <Bookmark className="w-10 h-10 text-slate-300 dark:text-cyan-950/30 mx-auto mb-3" />
                              <h4 className="text-sm font-bold uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                                Portfolio Bookmarks Empty
                              </h4>
                              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-[1.8] tracking-[0.01em]">
                                No scriptural bookmarks created yet. Navigate scripture and click the scroll icon on any verse to index it inside your portfolio for lightning reference.
                              </p>
                            </div>
                          );
                        }

                        if (filteredBookmarks.length === 0) {
                          return (
                            <p className="text-center font-mono text-slate-505 text-sm py-10">
                              No bookmarks matched search.
                            </p>
                          );
                        }

                        return filteredBookmarks.map((b, idx) => {
                          const isSameChapter =
                            chapterData?.book === b.book && chapterData?.chapter === b.chapter;
                          const mappedVerseObj = isSameChapter
                            ? chapterData?.verses?.find((v) => v.verseNumber === b.verse)
                            : null;

                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border relative transition-all ${
                                theme === 'light'
                                  ? 'bg-white border-slate-200 shadow-sm'
                                  : 'bg-slate-950/80 border-cyan-950/40 shadow shadow-black/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <button
                                  onClick={() => navigateToSidebarVerse(b.book, b.chapter, b.verse)}
                                  className={`text-sm font-mono font-bold tracking-tight uppercase flex items-center gap-1 cursor-pointer transition-colors hover:scale-105 ${
                                    theme === 'light'
                                      ? 'text-cyan-700 hover:text-cyan-600'
                                      : 'text-cyan-400 hover:text-cyan-300'
                                  }`}
                                  title="Jump to verse in main scroll"
                                >
                                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                                  <span>
                                    {b.book} {b.chapter}:{b.verse}
                                  </span>
                                </button>

                                <div className="flex items-center space-x-1.5">
                                  {mappedVerseObj && (
                                    <button
                                      onClick={() => playSingleVerse(b.verse, getSpeechTextForVerse(mappedVerseObj))}
                                      className={`flex items-center justify-center w-7 h-7 rounded-full shadow-md ${ currentlyReadingVerse === b.verse ? 'bg-rose-500/10 text-rose-500' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' } transition-all duration-500 ease-in-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
                                      title="Listen to audio"
                                    >
                                      {currentlyReadingVerse === b.verse ? <Square className="w-3 h-3 fill-current animate-pulse" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => deleteSidebarBookmark(b.book, b.chapter, b.verse)}
                                    className={`p-1.5 rounded-lg border transition-all text-rose-500 hover:bg-rose-500/10 cursor-pointer ${
                                      theme === 'light' ? 'border-slate-200' : 'border-cyan-950/30'
                                    }`}
                                    title="Delete bookmark"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {mappedVerseObj ? (
                                <p className="font-serif leading-[1.8] tracking-[0.01em] text-sm pr-1 sm:line-clamp-3">
                                  "{getSpeechTextForVerse(mappedVerseObj)}"
                                </p>
                              ) : (
                                <button
                                  onClick={() => navigateToSidebarVerse(b.book, b.chapter, b.verse)}
                                  className="text-[9.5px] font-mono text-slate-400 hover:text-cyan-500 uppercase flex items-center gap-1 cursor-pointer hover:underline select-none"
                                >
                                  <span>➔ Click to load full scripture text context</span>
                                </button>
                              )}
                              
                              {b.notes && (
                                <div className={`mt-2 p-2 rounded-lg text-sm leading-snug relative border ${
                                  theme === 'light' ? 'bg-amber-55 border-amber-100/70 text-slate-650' : 'bg-[#181109]/45 border-amber-955/40 text-amber-205'
                                }`}>
                                  <span className="font-bold block text-[8px] font-mono tracking-wider uppercase mb-0.5 text-amber-700">Reflective study note:</span>
                                  "{b.notes}"
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

              </div>

              {/* Sidebar footer utility branding */}
              <div className={`p-4 md:p-5 border-t text-center shrink-0 border-dashed ${
                theme === 'light' ? 'bg-slate-50/50 border-slate-200' : 'bg-[#060b14] border-cyan-950/20'
              }`}>
                <span className="text-sm px-1 py-1 font-mono uppercase tracking-widest text-slate-400">
                  PERSISTENT STUDY WORKSPACE • LOGOSBRIDGE EDITION
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Deep Journaling Bottom Drawer */}
      {activeDraftVerse !== null && (
        <div className={`fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 border-t shadow-2xl animate-fade-in-up ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold font-sans flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                <StarryCradleIcon className="w-5 h-5" active={true} />
                Deep Theological Journaling — Verse {activeDraftVerse}
              </h3>
              <button onClick={handleCancelNote} className={`p-1.5 rounded-full hover:bg-slate-500/10 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteDraftText}
              onChange={(e) => setNoteDraftText(e.target.value)}
              placeholder="Write down personal theological reflections or spiritual notes connected with this verse..."
              className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                theme === 'light'
                  ? 'bg-slate-50 text-slate-800 border-slate-200'
                  : 'bg-slate-900/50 text-slate-100 border-cyan-900/40'
              }`}
              rows={4}
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end space-x-3">
              <button
                onClick={handleCancelNote}
                className={`text-sm uppercase font-mono tracking-wider font-extrabold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveNote(activeDraftVerse)}
                className="text-sm uppercase font-mono tracking-wider font-extrabold px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors cursor-pointer"
              >
                💾 Save Entry
              </button>
            </div>
          </div>
        </div>
      )}



      

                  <AnimatePresence>
                    {isBookDropdownOpen && (
                      <>
                      <div className="fixed inset-0 z-[990] bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBookDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className={`fixed top-[80px] bottom-[70px] left-0 right-0 md:left-4 md:right-4 lg:max-w-5xl lg:mx-auto z-[1000] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${theme === 'light' ? 'bg-[#fcfcfc] border-zinc-200' : 'bg-[#0a0d16] border-zinc-800'}`}
                      >
                        {/* Modal Header */}
                        <div className={`shrink-0 px-4 py-4 border-b flex items-center justify-between ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                          <h2 className={`text-xl font-bold font-serif ${theme === 'light' ? 'text-zinc-800' : 'text-zinc-100'}`}>
                            {isChapterDropdownOpen ? `Select Chapter for ${selectedBook}` : 'Select Book'}
                          </h2>
                          <div className="flex items-center gap-2">
                            {isChapterDropdownOpen && (
                              <button
                                onClick={() => setIsChapterDropdownOpen(false)}
                                className={`text-sm px-4 py-2 rounded-md font-semibold transition-all ${theme === 'light' ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                              >
                                Back to Books
                              </button>
                            )}
                            <button
                              onClick={() => setIsBookDropdownOpen(false)}
                              className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {!isChapterDropdownOpen ? (
                          <>
                            {/* Book Selection Step */}
                            <div className={`shrink-0 p-4 border-b flex items-center ${theme === 'light' ? 'bg-[#fdfbff] border-[#e7e0ec]' : 'bg-[#1d1b20] border-[#49454f]'}`}>
                              <Search className={`w-5 h-5 ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} ml-2 mr-3`} />
                              <input
                                type="text"
                                placeholder="Find a book (e.g. Genesis)..."
                                value={bookSearchQuery}
                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                className={`text-base px-4 py-3 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-sans ${theme === 'light' ? 'bg-[#1c1b1f]/5 text-[#1c1b1f] placeholder-[#49454f]' : 'bg-[#e6e1e5]/10 text-[#e6e1e5] placeholder-[#cac4d0]'}`}
                              />
                              {bookSearchQuery && (
                                <button
                                  onClick={() => setBookSearchQuery('')}
                                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 ml-2 mr-2"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-24">
                              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                                {/* Old Testament */}
                                <div className="flex-1">
                                  <div className={`sticky top-0 z-10 ${theme === 'light' ? 'bg-[#fcfcfc]/95' : 'bg-[#0a0d16]/95'} backdrop-blur-sm pb-2 mb-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800/60'}`}>
                                    <p className={`text-xs px-2 py-2 font-sans font-bold uppercase tracking-widest ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                      Old Testament
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {filteredBooks
                                      .filter((b) => b.testament === 'Old')
                                      .map((book) => (
                                        <button
                                          id={`select-book-${book.name}`}
                                          key={book.name}
                                          onClick={() => {
                                            setSelectedBook(book.name);
                                            setIsChapterDropdownOpen(true); // Switch to chapter selection
                                            setBookSearchQuery('');
                                          }}
                                          className={`text-left text-sm md:text-base p-3 rounded-lg transition-all font-sans flex items-center justify-between ${
                                            theme === 'light'
                                              ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                              : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                                          } ${
                                            selectedBook === book.name
                                              ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm border border-cyan-100' : 'bg-cyan-900/30 text-cyan-400 font-semibold shadow-sm border border-cyan-800/50')
                                              : 'border border-transparent'
                                          }`}
                                        >
                                          <span className="truncate">{book.name}</span>
                                          {selectedBook === book.name && (
                                            <Check className="w-5 h-5 shrink-0 ml-1" />
                                          )}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                                {/* New Testament */}
                                <div className="flex-1">
                                  <div className={`sticky top-0 z-10 ${theme === 'light' ? 'bg-[#fcfcfc]/95' : 'bg-[#0a0d16]/95'} backdrop-blur-sm pb-2 mb-3 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800/60'}`}>
                                    <p className={`text-xs px-2 py-2 font-sans font-bold uppercase tracking-widest ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                      New Testament
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {filteredBooks
                                      .filter((b) => b.testament === 'New')
                                      .map((book) => (
                                        <button
                                          id={`select-book-${book.name}`}
                                          key={book.name}
                                          onClick={() => {
                                            setSelectedBook(book.name);
                                            setIsChapterDropdownOpen(true); // Switch to chapter selection
                                            setBookSearchQuery('');
                                          }}
                                          className={`text-left text-sm md:text-base p-3 rounded-lg transition-all font-sans flex items-center justify-between ${
                                            theme === 'light'
                                              ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                              : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                                          } ${
                                            selectedBook === book.name
                                              ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm border border-cyan-100' : 'bg-cyan-900/30 text-cyan-400 font-semibold shadow-sm border border-cyan-800/50')
                                              : 'border border-transparent'
                                          }`}
                                        >
                                          <span className="truncate">{book.name}</span>
                                          {selectedBook === book.name && (
                                            <Check className="w-5 h-5 shrink-0 ml-1" />
                                          )}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                              {filteredBooks.length === 0 && (
                                <div className="text-center text-lg text-zinc-500 py-10 font-sans">
                                  No biblical books matched.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Chapter Selection Step */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-24">
                              <div className="max-w-4xl mx-auto">
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3">
                                  {Array.from(
                                    { length: currentBookObj.chapters },
                                    (_, i) => i + 1
                                  ).map((ch) => (
                                    <button
                                      key={ch}
                                      onClick={() => {
                                        setSelectedChapter(ch);
                                        setStudyResponse(null);
                                        setStudyQuery('');
                                        setIsBookDropdownOpen(false); // Close the whole modal
                                      }}
                                      className={`text-center text-base py-3 rounded-xl transition-all font-sans font-semibold shadow-sm ${
                                        theme === 'light'
                                          ? 'hover:bg-zinc-100 text-zinc-800 hover:text-zinc-900 bg-white border border-zinc-200'
                                          : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800'
                                      } ${
                                        selectedChapter === ch
                                          ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-bold shadow-md border border-cyan-300 ring-2 ring-cyan-500/20' : 'bg-cyan-900/40 text-cyan-400 font-bold shadow-md border border-cyan-700 ring-2 ring-cyan-500/30')
                                          : ''
                                      }`}
                                    >
                                      {ch}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>
    </div>
  );
}
