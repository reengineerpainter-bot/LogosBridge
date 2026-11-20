/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback, FormEvent, ReactNode, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Settings, X, Volume2, VolumeX, Play, Pause, Maximize2, Minimize2, CheckCircle2, Languages, BookOpen, Search, BookOpenCheck, ChevronDown, Info, MoreVertical, Layers, ChevronRight, ChevronLeft, Sparkles, Loader2, Eye, EyeOff, HelpCircle, ArrowLeft, Check, Compass, RefreshCw, Globe, ArrowRight, MessageSquareOff, PlusSquare, Bookmark, Sun, Moon, Smartphone, Download, Laptop, ExternalLink, Copy, MessageSquare, Award, Square, Tv, Library, Ban, ToggleLeft, ToggleRight, HeartHandshake, Database, Home, Edit3, Radio, User, Send, Paperclip, Link2, History, CloudLightning, Trash2, GripVertical, FileText, Share2, Highlighter, Clock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

import { BIBLE_BOOKS } from './bibleMetadata';
import { STATIC_CHAPTERS } from './staticChapters';
import { ChapterData, Verse, SpecialWord, BibleBook } from './types';
import { NarrativeStream } from './components/NarrativeStream';
import { InlineParagraphContext } from './components/InlineParagraphContext';
import { InlineReflectionContext } from './components/InlineReflectionContext';
import { extractPlainTextFromNote } from './components/SamsungNotebookReflection';
import { groupVersesByStory } from './utils/pericopeChunker';
import AuthView from './components/AuthView';
import { VerseSearchModal } from './components/VerseSearchModal';

import { LiveStudioView } from './components/live-studio/LiveStudioView';
import { RemotePhoneCameraView } from './components/live-studio/RemotePhoneCameraView';
import { TactileDeckPreview } from './components/live-studio/TactileDeckPreview';
import { CinematicTransitionPreview } from './components/live-studio/CinematicTransitionPreview';
import { useStudioDeckTheme, getStudioThemeTokens } from './components/live-studio/tactileTheme';
import { DiscipleshipModal } from './components/discipleship/DiscipleshipModal';
import { StartupExperience } from './components/StartupExperience';
import { ActivityCapsule } from './components/ActivityCapsule';
import { StudyAssistantModal } from './components/StudyAssistantModal';
import {
  generateDynamicActivityBriefing,
  isVerseInStudyLater,
  toggleVerseStudyLater,
  markVerseStudyCompleted,
} from './utils/activityBriefingEngine';
import { shouldShowDailyPulse } from './services/studySessionTracker';
import { DiscipleshipDiagnosisPayload } from './types/discipleship';
import { supabase } from './supabase';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import {
  saveUserBookmark,
  deleteUserBookmark,
  updateUserProfile,
  recordQuizScore,
  getOrCreateUserProfile,
  getUserBookmarks,
  subscribeToUserBookmarks,
  logUserActivity,
  dismissCapsule,
  fetchUserCrossReferencesFromCloud
} from './utils/supabaseSync';
import {
  getOfflineChapter,
  saveOfflineChapter,
  getBundledKjvChapter,
  loadBundledKjvDataset,
  saveOfflineBibleBulk,
  normalizeBookName,
  stripSuppliedMarkup,
  getCanonicalKjvVerse
} from './utils/offlineBibleStorage';
import {
  getOfflineManuscriptChapter,
  getOfflineManuscriptVerse,
  getCachedManuscriptVerse,
  getBookLanguage,
  InterlinearVerse,
  InterlinearWord
} from './utils/offlineManuscriptStorage';
import {
  getCrossReferencesForVerse,
  getVerseTextByReference,
  getSyncVerseText,
  subscribeToCrossReferenceUpdates,
  addUserCrossReference,
  removeUserCrossReference,
  isUserAddedCrossReference,
  setActiveUserForCrossReferences,
  mergeCloudCrossReferences
} from './utils/crossReferenceEngine';
import { getWordMorphology, getContextualLemmaAction, getParentLemma } from './utils/morphologyEngine';
import { StrongsWordStudyModal, queryWordStudy } from './components/StrongsWordStudyModal';
import { getEnhancedStrongsEntry } from './utils/strongsLexiconEngine';
import {
  getUserLexiconMeaning,
  saveUserLexiconMeaning,
  removeUserLexiconMeaning,
  subscribeToUserLexiconUpdates
} from './utils/userLexiconEngine';
import { ParsingTagModal, DecodedMorphology, decodeGrammarTag } from './components/ParsingTagModal';
import { InterlinearVerseRow } from './components/InterlinearVerseRow';
import { UnifiedReaderDock } from './components/navigation/UnifiedReaderDock';
import { getWordTransliteration } from './utils/transliterationEngine';
import { cleanWord, getMatchedKjvTokenIndices, parseKjvRawTokens } from './utils/wordClusteringEngine';
import { triggerNativeShare } from './utils/shareUtils';
import appLogoNew from './assets/images/logo_logosbridge.png';
import dualStreamAltarImg from './assets/images/dual_stream_altar.jpg';
import dualStreamHealingImg from './assets/images/dual_stream_healing.jpg';
import dualStreamRhapsodyImg from './assets/images/dual_stream_rhapsody.jpg';
import dualStreamArenaStageImg from './assets/images/dual_stream_arena_stage.jpg';
import dualStreamArenaMinisterImg from './assets/images/dual_stream_arena_minister.jpg';

interface DualStreamScene {
  id: string;
  img: string;
  title: string;
  tag: string;
  category: string;
}

const DUAL_STREAM_SCENES: DualStreamScene[] = [
  {
    id: 'altar',
    img: dualStreamAltarImg,
    title: 'Dual-Stream Live',
    tag: '1080p • RTMP',
    category: 'C1'
  },
  {
    id: 'healing',
    img: dualStreamHealingImg,
    title: 'Dual-Stream Live',
    tag: '1080p • LIVE',
    category: 'C1'
  },
  {
    id: 'rhapsody',
    img: dualStreamRhapsodyImg,
    title: 'Dual-Stream Live',
    tag: '1080p • BROADCAST',
    category: 'C1'
  },
  {
    id: 'arena-stage',
    img: dualStreamArenaStageImg,
    title: 'Dual-Stream Live',
    tag: '4K • ARENA',
    category: 'C1'
  },
  {
    id: 'arena-minister',
    img: dualStreamArenaMinisterImg,
    title: 'Dual-Stream Live',
    tag: '4K • PULPIT',
    category: 'C1'
  }
];

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('offline_bible_v5_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, value);
    } catch {}
  }
}

const DualStreamBentoCard = ({
  theme,
  accentTextClass,
  onGoLive,
}: {
  theme: string;
  accentTextClass: string;
  onGoLive: () => void;
}) => {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const [activeIdx, setActiveIdx] = useState<number>(dayIndex % DUAL_STREAM_SCENES.length);
  const currentScene = DUAL_STREAM_SCENES[((activeIdx % DUAL_STREAM_SCENES.length) + DUAL_STREAM_SCENES.length) % DUAL_STREAM_SCENES.length];

  return (
    <div 
      id="home-section-livestudio"
      className="md:col-span-1 py-4 pb-6 sm:pb-8 relative border-b border-slate-200/60 dark:border-white/[0.05] flex flex-col justify-between transition-all"
    >
      <div>
        {/* Header: Dual-Streaming */}
        <div className="mb-3 pb-2.5 border-b border-slate-200/60 dark:border-[#382e27]">
          <div className="flex items-center justify-between">
            <span className={`section-notch-label inline-flex items-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-t-xl text-[12px] sm:text-[13px] font-bold font-sans uppercase tracking-[0.08em] ${
              theme === 'light' ? 'bg-[#0b111e] text-white' : 'bg-[#2a221d] text-[#faf6f0] border-t border-x border-[#483a30]'
            }`}>Dual-Streaming</span>

            {/* Subtle 24-Hour Cycle Selector Dots */}
            <div className="flex items-center gap-1.5">
              {DUAL_STREAM_SCENES.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIdx === idx
                      ? 'w-4 bg-rose-500'
                      : `w-2 ${theme === 'light' ? 'bg-slate-300 hover:bg-slate-400' : 'bg-[#483a30] hover:bg-[#685344]'}`
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Studio Preview Canvas Mockup */}
        <div 
          onClick={onGoLive}
          className={`relative group cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 active:scale-[0.99] shadow-sm hover:shadow-md ${
            theme === 'light' 
              ? 'border-slate-200 bg-slate-900/5' 
              : 'border-[#382e27] bg-[#1a1410]'
          }`}
        >
          <img 
            src={currentScene.img} 
            alt={currentScene.title} 
            key={currentScene.id}
            className="w-full h-auto object-cover aspect-square transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3">
            <span className="text-[11px] font-mono font-bold text-white tracking-wider flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              LAUNCH STUDIO
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button 
          id="home-docked-golive-btn"
          type="button"
          onClick={onGoLive}
          className={`-mr-3.5 sm:-mr-6 md:-mr-6 h-[32px] sm:h-[34px] min-w-[80px] pl-3.5 pr-2.5 rounded-l-xl rounded-r-none flex items-center gap-1.5 text-xs sm:text-sm font-bold font-sans shadow-xs transition-all duration-200 cursor-pointer border-y border-l shrink-0 active:scale-95 group hover:pl-4.5 ${
            theme === 'light'
              ? 'border-black/10 bg-white text-[#0b111e]'
              : 'border-[#483d34] bg-[#2d2520] text-[#faf6f0] hover:bg-[#382e28]'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span>Go-LIVE</span>
          <span className="font-mono font-bold text-xs transition-transform duration-200 group-hover:translate-x-0.5">↗</span>
        </button>
      </div>

      <div className={`mt-4 sm:mt-6 pt-3 sm:pt-4 border-t flex items-center justify-between ${theme === 'light' ? 'border-slate-900/[0.04]' : 'border-[#382e27]'}`}>
        <div className="flex -space-x-1.5">
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center font-mono text-[9.5px] sm:text-[10px] font-bold ${
            theme === 'light' ? 'bg-[#0b111e] text-white border-[#0b111e]' : 'bg-[#342b25] text-[#faf6f0] border-[#483a30]'
          }`}>C1</div>
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center font-mono text-[9.5px] sm:text-[10px] font-bold ${
            theme === 'light' ? 'bg-white text-[#0b111e] border-slate-900/[0.05]' : 'bg-[#28211c] text-[#faf6f0] border-[#382e27]'
          }`}>C2</div>
        </div>
        <span className={`text-xs font-mono font-bold ${accentTextClass}`}>{currentScene.tag}</span>
      </div>
    </div>
  );
};




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

const AUDIO_TRANS_OPTIONS = [
  { id: 'kjv', label: 'King James Version (KJV)' },
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
        <button onClick={handlePrev} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-900/30 text-emerald-400'}`}>
          <Play className="w-3 h-3 fill-current rotate-180" />
        </button>
        
        <span className={`text-[11px] font-bold tracking-wider w-[110px] md:w-[130px] flex justify-center text-center ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
          <span className="truncate">{currentTrans.label}</span>
        </span>
        
        <button onClick={handleNext} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-900/30 text-emerald-400'}`}>
          <Play className="w-3 h-3 fill-current" />
        </button>
      </div>
    </div>
  );
};

// Word clustering logic has been extracted to ./utils/wordClusteringEngine


interface LiveTypingPillProps {
  strong: string;
  gloss: string;
  morph: string;
  morphDesc?: string;
  theme?: 'light' | 'dark';
  onExplore?: () => void;
  onOpenParsing?: () => void;
}

const LiveTypingPill: React.FC<LiveTypingPillProps> = ({
  strong,
  gloss,
  morph,
  morphDesc,
  theme = 'light',
  onExplore,
  onOpenParsing
}) => {
  const isLight = theme === 'light';
  const morphStr = morphDesc ? `${morph} • ${morphDesc}` : morph;

  return (
    <div className={`px-2.5 py-1 sm:py-1.5 rounded-xl flex items-center justify-between gap-2 shadow-sm text-xs min-h-[32px] sm:min-h-[34px] animate-fade-in-up border transition-colors ${
      isLight 
        ? 'bg-neutral-100 border-neutral-200 text-neutral-900' 
        : 'bg-neutral-900 border-neutral-800 text-neutral-100'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExplore?.();
          }}
          title="Explore Strong's Concordance, ANE Origin & Prophetic Purpose"
          className={`font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded select-none flex items-center gap-1 shrink-0 transition-all ${
            onExplore ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
          } ${
            isLight 
              ? 'text-white bg-black border border-black' 
              : 'text-black bg-white border border-white'
          }`}
        >
          <span>{strong}</span>
          {onExplore && <span className="text-[8px] opacity-75">↗</span>}
        </button>

        {gloss && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onExplore?.();
            }}
            className="flex items-center gap-1.5 min-w-0 truncate cursor-pointer hover:opacity-80"
            title="Explore root word and theological nuance"
          >
            {gloss.includes('•') ? (
              <div className="flex items-center gap-1 truncate">
                {gloss.split('•').map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-[9px] opacity-40 font-mono">•</span>}
                    <span className={`text-[11px] font-serif italic truncate ${
                      isLight ? 'text-neutral-800' : 'text-neutral-200'
                    }`}>
                      {item.trim()}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <span className={`text-[11px] font-serif italic truncate ${
                isLight ? 'text-neutral-700' : 'text-neutral-300'
              }`}>
                {gloss}
              </span>
            )}
          </div>
        )}
      </div>
      {morph && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenParsing?.();
          }}
          title={morphDesc ? `${morph} • ${morphDesc}` : "View Full Grammatical Parsing Breakdown"}
          className={`font-mono text-[8.5px] sm:text-[9.5px] font-bold uppercase px-2 py-0.5 rounded tracking-tight flex items-center gap-1 shrink-0 transition-all ${
            onOpenParsing ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
          } ${
            isLight 
              ? 'text-neutral-800 bg-neutral-200/80 hover:bg-neutral-200 border border-neutral-300' 
              : 'text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700'
          }`}
        >
          <span>{morph}</span>
          {onOpenParsing && <span className="text-[8px] opacity-75">↗</span>}
        </button>
      )}
    </div>
  );
};

interface DailyStudyWord {
  text: string;
  target?: boolean;
  strongs?: string;
  rootMeaning?: string;
  parsingTag?: string;
  parsingTitle?: string;
  parsingItems?: { label: string; val: string }[];
  kjvMatch?: string;
  wordStudyTitle?: string;
  coreMeaning?: string;
  wordStudyDimensions?: {
    wordHistory?: string;
    ancientWorldview?: string;
    writersIntent?: string;
    theTrueAnchor?: string;
    lex?: string;
    ane?: string;
    mood?: string;
    prophetic?: string;
  };
}

interface DailyStudyItem {
  book: string;
  chapter: number;
  verse: number;
  language: 'Hebrew' | 'Greek';
  refHeader: string;
  natureImage?: string;
  words: DailyStudyWord[];
  strongs: string;
  rootMeaning: string;
  parsingTag: string;
  parsingTitle: string;
  parsingItems: { label: string; val: string }[];
  kjvPrefix: string;
  kjvTarget: string;
  kjvSuffix: string;
  wordStudyTitle: string;
  coreMeaning?: string;
  wordStudyDimensions: {
    wordHistory?: string;
    ancientWorldview?: string;
    writersIntent?: string;
    theTrueAnchor?: string;
    lex?: string;
    ane?: string;
    mood?: string;
    prophetic?: string;
  };
  dialogueVerseRef: string;
  dialogueQuotedText: string;
  chip1Text: string;
  chip2Text: string;
  attached1Ref: string;
  attached1Text: string;
  attached2Ref: string;
  attached2Text: string;
  contextTitle: string;
}

const DAILY_STUDY_SCHEDULE: DailyStudyItem[] = [
  {
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    language: 'Hebrew',
    refHeader: 'Genesis 1:1 • Hebrew',
    natureImage: '/nature.jpg',
    words: [
      {
        text: 'bərē’šît',
        target: false,
        strongs: 'H7225',
        rootMeaning: 'Head, chief, firstfruit • Primordial inception',
        parsingTag: 'HR/Ncfsa',
        parsingTitle: 'Grammatical Breakdown • HR/Ncfsa',
        parsingItems: [
          { label: '1. Prefix:', val: 'Bə- (Preposition "In")' },
          { label: '2. Noun Root:', val: 'Rē’šît (Head, beginning, chief origin)' },
          { label: '3. Form:', val: 'Feminine Singular Absolute' }
        ],
        kjvMatch: 'In the beginning',
        wordStudyTitle: 'rē’šît (Head / Primordial Origin)',
        wordStudyDimensions: {
          lex: '"Derived from rō’š (head). Signifies the first point in chronological time, foundational priority, and the initial beginning of all created order."',
          ane: '"Contrasts with Enuma Elish where time begins amidst primordial chaos; Genesis rē’šît anchors absolute origin in the sovereign stillness of God alone."',
          mood: '"Inspires profound reverence, cosmic stillness, and contemplative wonder before any earthly clock began ticking."',
          prophetic: '"Anticipates Christ as the firstborn of all creation (Colossians 1:15) and the Beginning and the End (Revelation 22:13)."'
        }
      },
      {
        text: 'bārā’*',
        target: true,
        strongs: 'H1254',
        rootMeaning: 'To shape, fashion, create out of nothing • Divine initiative',
        parsingTag: 'V-QAL-PERF-3MS',
        parsingTitle: 'Grammatical Breakdown • V-QAL-PERF-3MS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Verb (Action word)' },
          { label: '2. Stem:', val: 'Qal (Simple active voice, direct divine operation)' },
          { label: '3. Aspect:', val: 'Perfect (Completed sovereign decree)' },
          { label: '4. Person:', val: '3rd Person Masculine Singular ("He")' }
        ],
        kjvMatch: 'created',
        wordStudyTitle: 'bārā’',
        coreMeaning: 'To create, bring into existence out of nothing, shape by sovereign decree, cut out, fashion.',
        wordStudyDimensions: {
          wordHistory: "A primary root verb. In the standard grammatical stem (Qal), God is the exclusive subject throughout the Old Testament. Humans can fashion, make, or build ('asah', 'yatsar', 'banah') using existing matter; only God can 'bara'—bring forth entirely new reality out of absolute nothingness.",
          ancientWorldview: "Ancient Near Eastern creation myths described creation as the bloody aftermath of warring gods carving up monster carcasses. Scripture uses 'bara' to declare that creation required no struggle, no combat, and no pre-existing materials—only the effortless, unchallenged command of the Creator.",
          writersIntent: "Moses deliberately selects 'bara' to teach Israel that the God who redeemed them out of Egypt does not need pre-existing materials or favorable conditions to work. He brings forth light, life, and breakthrough out of absolute nothingness simply by the power of His voice.",
          theTrueAnchor: "God does not need natural resources, human connections, or favorable circumstances to change your situation. When you have nothing left to offer, His creative power (*bara*) specializes in speaking wholeness and abundance out of empty space.",
          lex: 'Primarily used of divine creation ex nihilo. God alone is ever the grammatical subject of bārā’, indicating absolute sovereign prerogative.',
          ane: 'Contrasts vividly with Enuma Elish and Atrahasis myths where creation stems from divine conflict; biblical bārā’ reveals effortless creation by spoken word.',
          mood: 'Carries profound reverence and cosmic wonder across the Hebrew psalter, establishing Yahweh’s covenant authority as sole Creator.',
          prophetic: 'Anticipates the ’new heavens and new earth’ (Isaiah 65:17) and the spiritual new creation in Christ (2 Corinthians 5:17).'
        }
      },
      {
        text: '’ĕlōhîm',
        target: false,
        strongs: 'H430',
        rootMeaning: 'Supreme God, mighty sovereign, divine judge • Plural of majesty',
        parsingTag: 'N-MP',
        parsingTitle: 'Grammatical Breakdown • N-MP',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun (Divine title)' },
          { label: '2. Number/Gender:', val: 'Masculine Plural (Plural of Majesty)' },
          { label: '3. Syntax:', val: 'Governs singular verb bārā’ (One God in fullness)' }
        ],
        kjvMatch: 'God',
        wordStudyTitle: '’ĕlōhîm (The Sovereign God)',
        wordStudyDimensions: {
          lex: '"Plural form expressing transcendent majesty, exhaustive supreme power, and absolute authority, uniquely paired with singular verbs."',
          ane: '"Unlike pagan pantheons where gods vied for supremacy, ’ĕlōhîm acts with unified, undivided cosmic majesty and effortless decree."',
          mood: '"Awakens holy trembling, unquestioned trust, and reverent awe before the unoriginated Ruler of heaven and earth."',
          prophetic: '"Subtly foreshadows the mystery of the triune Godhead active in creation: Father, Son (Logos), and the hovering Spirit."'
        }
      },
      {
        text: '’ēt',
        target: false,
        strongs: 'H853',
        rootMeaning: 'Direct object marker • Untranslated grammatical pointer',
        parsingTag: 'PART-ACC',
        parsingTitle: 'Grammatical Breakdown • PART-ACC',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Accusative Particle (Definite Direct Object Sign)' },
          { label: '2. Letters:', val: 'Aleph (First) to Tav (Last)' }
        ],
        kjvMatch: 'the heaven',
        wordStudyTitle: '’ēt (Aleph-Tav / Direct Object Sign)',
        wordStudyDimensions: {
          lex: '"Unvocalized particle indicating the definite direct object. Links creative fiat directly to its concrete cosmic outcome."',
          ane: '"Ancient Semitic syntactic precision emphasizing the distinct, intentional reality of everything brought into existence."',
          mood: '"Subtle grammatical sign that Jewish rabbinic tradition revered as holding the totality of language and creation."',
          prophetic: '"Anticipates Jesus’ declaration as ’the Alpha and the Omega’ (Rev 22:13), the First and the Last."'
        }
      },
      {
        text: 'haššāmayim',
        target: false,
        strongs: 'H8064',
        rootMeaning: 'The celestial realm, starry expanse, sky • Cosmic heights',
        parsingTag: 'HT/N-MP',
        parsingTitle: 'Grammatical Breakdown • HT/N-MP',
        parsingItems: [
          { label: '1. Article:', val: 'Ha- (Definite Article "The")' },
          { label: '2. Noun Root:', val: 'Šāmayim (Heavens / Celestial Spheres)' },
          { label: '3. Number:', val: 'Dual/Plural' }
        ],
        kjvMatch: 'the heaven',
        wordStudyTitle: 'šāmayim (The Celestial Expanse)',
        wordStudyDimensions: {
          lex: '"Dual/plural form denoting celestial heights, cosmic spheres, and the dwelling place of God’s unapproachable glory."',
          ane: '"ANE religions deified stars and sky; Genesis firmly demythologizes them as creaturely artifacts called forth by God."',
          mood: '"Stirs elevated contemplation, expansive cosmic perspective, and awe at the boundless celestial cathedral."',
          prophetic: '"Points forward to the cosmic reconciliation of all things in heaven and earth under Christ (Ephesians 1:10)."'
        }
      },
      {
        text: 'wə’ēt',
        target: false,
        strongs: 'H853',
        rootMeaning: 'Conjunction & object pointer • Binding celestial and terrestrial',
        parsingTag: 'HC/PART-ACC',
        parsingTitle: 'Grammatical Breakdown • HC/PART-ACC',
        parsingItems: [
          { label: '1. Conjunction:', val: 'Wə- (And / Connecting link)' },
          { label: '2. Particle:', val: '’Ēt (Direct Object Sign)' }
        ],
        kjvMatch: 'and the',
        wordStudyTitle: 'wə’ēt (Covenant Nexus)',
        wordStudyDimensions: {
          lex: '"Waw conjunction prefixed to the direct object marker, binding heaven and earth as God’s unified theater of creation."',
          ane: '"Connective syntax establishing complete cosmic sovereignty over both celestial and terrestrial spheres."',
          mood: '"Harmonious continuity uniting the cosmic whole under one divine architect."',
          prophetic: '"Prefigures the unification of heaven and earth when the dwelling of God is with men (Revelation 21:3)."'
        }
      },
      {
        text: 'hā’āreṣ',
        target: false,
        strongs: 'H776',
        rootMeaning: 'The earth, dry land, material world • Human habitation',
        parsingTag: 'HT/N-FS',
        parsingTitle: 'Grammatical Breakdown • HT/N-FS',
        parsingItems: [
          { label: '1. Article:', val: 'Hā- (Definite Article "The")' },
          { label: '2. Noun Root:', val: '’Ereṣ (Earth / Land / Habitation)' },
          { label: '3. Gender/Number:', val: 'Feminine Singular' }
        ],
        kjvMatch: 'earth',
        wordStudyTitle: '’ereṣ (The Created Habitat)',
        wordStudyDimensions: {
          lex: '"Signifies the material earth, ground, territory, and arena of human covenant history."',
          ane: '"Contrasts with chaotic mythological worldviews; biblical ’ereṣ is fashioned deliberately as habitable and good."',
          mood: '"Grounded warmth, covenant hospitality, and fertile expectation."',
          prophetic: '"Awaits final redemption from bondage to decay into glorious liberty for the sons of God (Romans 8:21)."'
        }
      }
    ],
    strongs: 'H1254',
    rootMeaning: 'To shape, fashion, create out of nothing • Divine initiative',
    parsingTag: 'V-QAL-PERF-3MS',
    parsingTitle: 'Grammatical Breakdown • V-QAL-PERF-3MS',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Verb (Action word)' },
      { label: '2. Stem:', val: 'Qal (Simple active voice, direct divine operation)' },
      { label: '3. Aspect:', val: 'Perfect (Completed sovereign decree)' },
      { label: '4. Person:', val: '3rd Person Masculine Singular ("He")' }
    ],
    kjvPrefix: 'In the beginning God ',
    kjvTarget: 'created',
    kjvSuffix: ' the heaven and the earth.',
    wordStudyTitle: 'bārā’',
    coreMeaning: 'To create, bring into existence out of nothing, shape by sovereign decree, cut out, fashion.',
    wordStudyDimensions: {
      wordHistory: "A primary root verb. In the standard grammatical stem (Qal), God is the exclusive subject throughout the Old Testament. Humans can fashion, make, or build ('asah', 'yatsar', 'banah') using existing matter; only God can 'bara'—bring forth entirely new reality out of absolute nothingness.",
      ancientWorldview: "Ancient Near Eastern creation myths described creation as the bloody aftermath of warring gods carving up monster carcasses. Scripture uses 'bara' to declare that creation required no struggle, no combat, and no pre-existing materials—only the effortless, unchallenged command of the Creator.",
      writersIntent: "Moses deliberately selects 'bara' to teach Israel that the God who redeemed them out of Egypt does not need pre-existing materials or favorable conditions to work. He brings forth light, life, and breakthrough out of absolute nothingness simply by the power of His voice.",
      theTrueAnchor: "God does not need natural resources, human connections, or favorable circumstances to change your situation. When you have nothing left to offer, His creative power (*bara*) specializes in speaking wholeness and abundance out of empty space.",
      lex: 'Primarily used of divine creation ex nihilo. God alone is ever the grammatical subject of bārā’, indicating absolute sovereign prerogative.',
      ane: 'Contrasts vividly with Enuma Elish and Atrahasis myths where creation stems from divine conflict; biblical bārā’ reveals effortless creation by spoken word.',
      mood: 'Carries profound reverence and cosmic wonder across the Hebrew psalter, establishing Yahweh’s covenant authority as sole Creator.',
      prophetic: 'Anticipates the ’new heavens and new earth’ (Isaiah 65:17) and the spiritual new creation in Christ (2 Corinthians 5:17).'
    },
    dialogueVerseRef: 'Genesis 1:1',
    dialogueQuotedText: '"In the beginning God created the heaven and the earth."',
    chip1Text: 'Ex Nihilo Origin',
    chip2Text: 'Sovereign Purpose',
    attached1Ref: 'Colossians 1:16',
    attached1Text: '"For by him were all things created, that are in heaven, and that are in earth..."',
    attached2Ref: 'Hebrews 11:3',
    attached2Text: '"Through faith we understand that the worlds were framed by the word of God..."',
    contextTitle: 'Genesis 1 Contextual Redemptive Stream'
  },
  {
    book: 'John',
    chapter: 1,
    verse: 1,
    language: 'Greek',
    refHeader: 'John 1:1 • Greek',
    natureImage: '/nature_mountain_dawn.jpg',
    words: [
      {
        text: 'En',
        target: false,
        strongs: 'G1722',
        rootMeaning: 'Positional sphere, intimate enclosure • Eternal existence',
        parsingTag: 'PREP-D',
        parsingTitle: 'Grammatical Breakdown • PREP-D',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Preposition with Dative' },
          { label: '2. Sphere:', val: 'Eternal dwelling in, within, among' }
        ],
        kjvMatch: 'In',
        wordStudyTitle: 'en (Sphere of Eternity)',
        wordStudyDimensions: {
          lex: '"Preposition expressing internal location, sphere of activity, or abiding state."',
          ane: '"Points to timeless pre-existence before the cosmic sphere was framed."',
          mood: '"Infinite depth, sacred rest, and peaceful stability."',
          prophetic: '"Anticipates being ’in Christ’ as the believer’s eternal spiritual home (Ephesians 1:3)."'
        }
      },
      {
        text: 'archē',
        target: false,
        strongs: 'G746',
        rootMeaning: 'Beginning, primordial origin, supreme rule • Eternal inception',
        parsingTag: 'N-DFS',
        parsingTitle: 'Grammatical Breakdown • N-DFS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun Feminine Singular' },
          { label: '2. Case:', val: 'Dative (Temporal Sphere)' }
        ],
        kjvMatch: 'the beginning',
        wordStudyTitle: 'archē (The Primordial Origin)',
        wordStudyDimensions: {
          lex: '"Signifies the absolute starting point, origin, or ultimate first principle."',
          ane: '"Philosophers searched for the archē in fire or water; John reveals the archē is a Person."',
          mood: '"Reverent stillness before time was born."',
          prophetic: '"Christ identifies as the Beginning and the Sovereign Ruler (Colossians 1:18, Revelation 3:14)."'
        }
      },
      {
        text: 'ēn',
        target: false,
        strongs: 'G2258',
        rootMeaning: 'Continuous eternal existence • Uncreated being',
        parsingTag: 'V-IAI-3S',
        parsingTitle: 'Grammatical Breakdown • V-IAI-3S',
        parsingItems: [
          { label: '1. Verb Root:', val: 'Eimi (To be / exist)' },
          { label: '2. Tense:', val: 'Imperfect Active Indicative (Continuous duration in eternity)' }
        ],
        kjvMatch: 'was',
        wordStudyTitle: 'ēn (Continuous Eternal Being)',
        wordStudyDimensions: {
          lex: '"Imperfect tense denoting ongoing, uninterrupted existence without temporal beginning."',
          ane: '"Unlike created beings that ’became’ (egeneto), the Word simply ’was’ (ēn)."',
          mood: '"Unshakable permanence, timeless rest, and majestic quietude."',
          prophetic: '"Reflects the self-existent ’I AM’ revealed at the burning bush (Exodus 3:14)."'
        }
      },
      {
        text: 'ho',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'Definite article • Designating absolute personhood',
        parsingTag: 'ART-NMS',
        parsingTitle: 'Grammatical Breakdown • ART-NMS',
        parsingItems: [
          { label: '1. Article:', val: 'Definite Article Nominative Masculine Singular' }
        ],
        kjvMatch: 'the',
        wordStudyTitle: 'ho (The Definite Title)',
        wordStudyDimensions: {
          lex: '"The definite article identifying the specific, unique, unrepeatable subject."',
          ane: '"Marks divine identity distinguishing the Word as supreme."',
          mood: '"Certainty, uniqueness, and focus."',
          prophetic: '"Sets apart the Messiah as The Prophet, The Priest, and The King."'
        }
      },
      {
        text: 'lógos*',
        target: true,
        strongs: 'G3056',
        rootMeaning: 'The Word, essential discourse, divine expression • Christological focus',
        parsingTag: 'N-NMS',
        parsingTitle: 'Grammatical Breakdown • N-NMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun (Divine title)' },
          { label: '2. Case:', val: 'Nominative (Subject of absolute eternal being)' },
          { label: '3. Gender:', val: 'Masculine' },
          { label: '4. Number:', val: 'Singular (The unrepeated Word)' }
        ],
        kjvMatch: 'Word',
        wordStudyTitle: 'lógos (The Incarnate Word)',
        wordStudyDimensions: {
          lex: '"Signifies not merely spoken discourse, but divine reason, personal communication, and the embodiment of Yahweh’s wisdom incarnated."',
          ane: '"Transcends Philo’s abstract philosophical logos; John declares the Logos became flesh and pitched His tent among humanity (John 1:14)."',
          mood: '"Awakens deep contemplative stillness; establishes the divinity, pre-existence, and intimacy of the Son with the Father before eternity."',
          prophetic: '"Identifies Christ as the Alpha and Omega (Rev 19:13), the ultimate culmination and fulfillment of all Old Testament speech."'
        }
      },
      {
        text: 'kaì',
        target: false,
        strongs: 'G2532',
        rootMeaning: 'Conjunction • Copulative bond uniting persons',
        parsingTag: 'CONJ',
        parsingTitle: 'Grammatical Breakdown • CONJ',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Coordinating Conjunction' }
        ],
        kjvMatch: 'and',
        wordStudyTitle: 'kaì (Relational Conjunction)',
        wordStudyDimensions: {
          lex: '"Connecting particle linking equal and intimate clauses."',
          ane: '"Builds rhythmic poetic progression in Johannine prologue."',
          mood: '"Steady, majestic, unbreakable chain of truth."',
          prophetic: '"Unites the disclosure of divine mystery step by step."'
        }
      },
      {
        text: 'ho',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'Definite article • Reiterating the Word',
        parsingTag: 'ART-NMS',
        parsingTitle: 'Grammatical Breakdown • ART-NMS',
        parsingItems: [
          { label: '1. Article:', val: 'Definite Article' }
        ],
        kjvMatch: 'the',
        wordStudyTitle: 'ho (The Specific Article)',
        wordStudyDimensions: {
          lex: '"Repeated article sustaining grammatical focus on the same subject."',
          ane: '"Reflects high scribal precision in apostolic Greek."',
          mood: '"Steadfast consistency."',
          prophetic: '"Emphasizes the unchanging identity of the Christ."'
        }
      },
      {
        text: 'lógos',
        target: false,
        strongs: 'G3056',
        rootMeaning: 'The Word, divine self-communication • Christ the Son',
        parsingTag: 'N-NMS',
        parsingTitle: 'Grammatical Breakdown • N-NMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun Nominative Masculine Singular' }
        ],
        kjvMatch: 'Word',
        wordStudyTitle: 'lógos (The Transcendent Word)',
        wordStudyDimensions: {
          lex: '"The personal divine Word in relationship with the Father."',
          ane: '"Contrasts with Gnostic eons; the Logos is personal and accessible."',
          mood: '"Holy wonder and warmth."',
          prophetic: '"The living Word through whom all things hold together (Col 1:17)."'
        }
      },
      {
        text: 'ēn',
        target: false,
        strongs: 'G2258',
        rootMeaning: 'Continuous eternal being • In communion with God',
        parsingTag: 'V-IAI-3S',
        parsingTitle: 'Grammatical Breakdown • V-IAI-3S',
        parsingItems: [
          { label: '1. Verb:', val: 'Imperfect Active Indicative' }
        ],
        kjvMatch: 'was',
        wordStudyTitle: 'ēn (Eternal Fellowship)',
        wordStudyDimensions: {
          lex: '"Imperfect of eternal continuity in relationship."',
          ane: '"No start date to the fellowship between Father and Son."',
          mood: '"Infinite intimacy and reciprocal love."',
          prophetic: '"The glory which He had with the Father before the world was (John 17:5)."'
        }
      },
      {
        text: 'prós',
        target: false,
        strongs: 'G4314',
        rootMeaning: 'Face-to-face communion, intimate orientation toward • Triune intimacy',
        parsingTag: 'PREP-A',
        parsingTitle: 'Grammatical Breakdown • PREP-A',
        parsingItems: [
          { label: '1. Preposition:', val: 'With Accusative (Orientation / Toward / Face to Face)' }
        ],
        kjvMatch: 'with',
        wordStudyTitle: 'prós (Face-to-Face Communion)',
        wordStudyDimensions: {
          lex: '"Indicates directional motion and mutual orientation: face-to-face equality and intimate converse."',
          ane: '"Replaces distant pagan deities with eternal, intimate fellowship in the Godhead."',
          mood: '"Warm, pulsating divine love and personal communion."',
          prophetic: '"Opened up for all believers to behold the glory of the Son (John 17:24)."'
        }
      },
      {
        text: 'tòn',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'Definite article • The specific Person of the Father',
        parsingTag: 'T-AMS',
        parsingTitle: 'Grammatical Breakdown • T-AMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Definite Article' },
          { label: '2. Case:', val: 'Accusative Masculine Singular' }
        ],
        kjvMatch: '',
        wordStudyTitle: 'tòn (The Definite Object)',
        wordStudyDimensions: {
          lex: '"Accusative masculine singular article identifying God the Father as the direct orientation of the Word."',
          ane: '"Grammatical precision marking absolute personal distinction between Father and Son."',
          mood: '"Clarity and directional focus."',
          prophetic: '"The distinct personhood of the Father whom the Son reveals."'
        }
      },
      {
        text: 'theón',
        target: false,
        strongs: 'G2316',
        rootMeaning: 'God the Father • Supreme deity in eternal glory',
        parsingTag: 'N-AMS',
        parsingTitle: 'Grammatical Breakdown • N-AMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun Accusative Masculine Singular' }
        ],
        kjvMatch: 'God',
        wordStudyTitle: 'theós (God the Father)',
        wordStudyDimensions: {
          lex: '"With definite article (ton theon), designates God the Father in the Johannine prologue."',
          ane: '"The personal Father who loves the Son from before foundation of the world."',
          mood: '"Transcendent sovereign love."',
          prophetic: '"Revealed to humanity exclusively through the incarnate Son (John 1:18)."'
        }
      },
      {
        text: 'kaì',
        target: false,
        strongs: 'G2532',
        rootMeaning: 'Conjunction • Culminating divine declaration',
        parsingTag: 'CONJ',
        parsingTitle: 'Grammatical Breakdown • CONJ',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Coordinating Conjunction' }
        ],
        kjvMatch: 'and the Word was God',
        wordStudyTitle: 'kaì (Culminating Bond)',
        wordStudyDimensions: {
          lex: '"Conjunction introducing the climax of the prologue’s theological affirmation."',
          ane: '"Unites the relational equality of the Word directly to His divine essence."',
          mood: '"Triumphant, definitive certainty."',
          prophetic: '"The seal of Messiah’s full deity."'
        }
      },
      {
        text: 'theòs',
        target: false,
        strongs: 'G2316',
        rootMeaning: 'Deity, divine nature, true God • Absolute deity of the Word',
        parsingTag: 'N-NMS',
        parsingTitle: 'Grammatical Breakdown • N-NMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun (Predicate Nominative without article)' },
          { label: '2. Significance:', val: 'Colwell’s Rule: Qualitative and definite nature of deity' }
        ],
        kjvMatch: 'God',
        wordStudyTitle: 'theòs (Essential Deity)',
        wordStudyDimensions: {
          lex: '"Anarthrous predicate nominative preceding the verb, expressing that what God was, the Word was in nature and essence."',
          ane: '"Refutes polytheism and modalism alike: distinct in person, identical in divine nature."',
          mood: '"Awe-inspiring cosmic majesty and ultimate revelation."',
          prophetic: '"Fulfills Isaiah 9:6: The Mighty God, The Everlasting Father, The Prince of Peace."'
        }
      },
      {
        text: 'ēn',
        target: false,
        strongs: 'G2258',
        rootMeaning: 'Continuous eternal being • Uncreated divine reality',
        parsingTag: 'V-IAI-3S',
        parsingTitle: 'Grammatical Breakdown • V-IAI-3S',
        parsingItems: [
          { label: '1. Verb:', val: 'Imperfect Active Indicative 3rd Person Singular' }
        ],
        kjvMatch: 'was',
        wordStudyTitle: 'ēn (Eternal Divine Essence)',
        wordStudyDimensions: {
          lex: '"Continues the timeless imperfect: the Word has always been God by eternal nature."',
          ane: '"Eternal pre-existence rather than becoming or origin."',
          mood: '"Sublime changeless truth."',
          prophetic: '"Jesus Christ the same yesterday, and to day, and for ever (Hebrews 13:8)."'
        }
      },
      {
        text: 'ho',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'Definite article • The grammatical subject',
        parsingTag: 'T-NMS',
        parsingTitle: 'Grammatical Breakdown • T-NMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Definite Article Nominative Masculine Singular' }
        ],
        kjvMatch: 'the',
        wordStudyTitle: 'ho (The Sovereign Subject)',
        wordStudyDimensions: {
          lex: '"Marks \'the Word\' as the grammatical subject of the clause."',
          ane: '"Syntax points to the specific person of the Logos as possessing full deity."',
          mood: '"Unambiguous theological clarity."',
          prophetic: '"Points to the Person of the Son."'
        }
      },
      {
        text: 'lógos',
        target: false,
        strongs: 'G3056',
        rootMeaning: 'The Word, divine expression • The sovereign Christ',
        parsingTag: 'N-NMS',
        parsingTitle: 'Grammatical Breakdown • N-NMS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Noun Nominative Masculine Singular' }
        ],
        kjvMatch: 'Word',
        wordStudyTitle: 'lógos (The Word who is God)',
        wordStudyDimensions: {
          lex: '"Closes the grand threefold cadence: In the beginning was the Word, the Word was with God, and the Word was God."',
          ane: '"The eternal culmination of divine self-revelation in Christ."',
          mood: '"Total reverence, doxology, and worship."',
          prophetic: '"And His name is called The Word of God (Revelation 19:13)."'
        }
      }
    ],
    strongs: 'G3056',
    rootMeaning: 'The Word, essential discourse, divine expression of God • Christological focus',
    parsingTag: 'N-NMS',
    parsingTitle: 'Grammatical Breakdown • N-NMS',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Noun (Divine title)' },
      { label: '2. Case:', val: 'Nominative (Subject of absolute eternal being)' },
      { label: '3. Gender:', val: 'Masculine' },
      { label: '4. Number:', val: 'Singular (The unrepeated Word)' }
    ],
    kjvPrefix: 'In the beginning was the ',
    kjvTarget: 'Word',
    kjvSuffix: ', and the Word was with God, and the Word was God.',
    wordStudyTitle: 'lógos (The Incarnate Word)',
    wordStudyDimensions: {
      lex: '"Signifies not merely spoken discourse, but divine reason, personal communication, and the embodiment of Yahweh’s wisdom incarnated."',
      ane: '"Transcends Philo’s abstract philosophical logos; John declares the Logos became flesh and pitched His tent among humanity (John 1:14)."',
      mood: '"Awakens deep contemplative stillness; establishes the divinity, pre-existence, and intimacy of the Son with the Father before eternity."',
      prophetic: '"Identifies Christ as the Alpha and Omega (Rev 19:13), the ultimate culmination and fulfillment of all Old Testament speech."'
    },
    dialogueVerseRef: 'John 1:1',
    dialogueQuotedText: '"In the beginning was the Word, and the Word was with God, and the Word was God."',
    chip1Text: 'Eternal Pre-existence',
    chip2Text: 'Word Made Flesh',
    attached1Ref: 'Philippians 2:6',
    attached1Text: '"Who, being in the form of God, thought it not robbery to be equal with God..."',
    attached2Ref: '1 John 1:1',
    attached2Text: '"That which was from the beginning, which we have heard, which we have seen with our eyes..."',
    contextTitle: 'John 1 Johannine Prologue Stream'
  },
  {
    book: 'Psalms',
    chapter: 23,
    verse: 1,
    language: 'Hebrew',
    refHeader: 'Psalm 23:1 • Hebrew',
    natureImage: '/nature_serene_waters.jpg',
    words: [
      {
        text: 'yahweh',
        target: false,
        strongs: 'H3068',
        rootMeaning: 'The Self-Existent Eternal Covenant LORD • The Great I AM',
        parsingTag: 'HNp',
        parsingTitle: 'Grammatical Breakdown • Proper Noun',
        parsingItems: [
          { label: '1. Proper Divine Name:', val: 'The Tetragrammaton (YHWH)' },
          { label: '2. Meaning:', val: 'He Who Is / The Covenant Keeping Lord' }
        ],
        kjvMatch: 'The LORD',
        wordStudyTitle: 'yahweh (The Eternal Covenant Name)',
        wordStudyDimensions: {
          lex: '"The sacred personal name of Israel’s God, expressing self-existence and unfailing covenant fidelity."',
          ane: '"Contrasts with capricious territorial idols; Yahweh is faithful to all generations."',
          mood: '"Deep reassurance, steadfast rock, and personal salvation."',
          prophetic: '"Revealed in the name of Yeshua (Jesus): Yahweh is Salvation."'
        }
      },
      {
        text: 'rō‘î*',
        target: true,
        strongs: 'H7462',
        rootMeaning: 'To pasture, tend, graze, feed flock • Relational intimacy',
        parsingTag: 'V-QAL-PART-MS',
        parsingTitle: 'Grammatical Breakdown • V-QAL-PART-MS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Verb / Participle (Active continuous role)' },
          { label: '2. Stem:', val: 'Qal (Direct shepherd relationship)' },
          { label: '3. Suffix:', val: '1st Person Singular ("My Shepherd")' },
          { label: '4. State:', val: 'Continuous present pastoral care' }
        ],
        kjvMatch: 'is my shepherd',
        wordStudyTitle: 'rā‘āh (Shepherd Covenant)',
        wordStudyDimensions: {
          lex: '"Expresses personal pastoral companionship, active defense against predators, and sovereign guidance into quiet resting waters."',
          ane: '"While ancient Near Eastern kings styled themselves distant shepherds of captive nations, David confesses God as personal companion."',
          mood: '"Infuses unwavering peace and quiet assurance amidst valleys of deepest shadow; casts out all anxiety through divine sufficiency."',
          prophetic: '"Directly foretells Jesus as the Good Shepherd (John 10:11) who lays down His life for the sheep and leads them to living fountains."'
        }
      },
      {
        text: 'lō’',
        target: false,
        strongs: 'H3808',
        rootMeaning: 'Absolute negative particle • Total impossibility of lack',
        parsingTag: 'PART-NEG',
        parsingTitle: 'Grammatical Breakdown • PART-NEG',
        parsingItems: [
          { label: '1. Particle:', val: 'Negative adverb (Absolute negation)' }
        ],
        kjvMatch: 'not',
        wordStudyTitle: 'lō’ (Absolute Negation)',
        wordStudyDimensions: {
          lex: '"Categorical negation excluding any possibility of abandonment or neglect."',
          ane: '"A complete legal and covenant guarantee of full divine provision."',
          mood: '"Absolute security, quiet confidence, and fearless trust."',
          prophetic: '"No good thing will He withhold from them that walk uprightly (Psalm 84:11)."'
        }
      },
      {
        text: '’eḥsār',
        target: false,
        strongs: 'H2637',
        rootMeaning: 'To lack, diminish, fail • Divine all-sufficiency',
        parsingTag: 'V-QAL-IMPF-1CS',
        parsingTitle: 'Grammatical Breakdown • V-QAL-IMPF-1CS',
        parsingItems: [
          { label: '1. Verb Root:', val: 'Ḥāsēr (To lack, want, decrease)' },
          { label: '2. Tense/Person:', val: 'Imperfect 1st Person Singular ("I shall not want")' }
        ],
        kjvMatch: 'shall not want',
        wordStudyTitle: 'ḥāsēr (Total Sufficiency)',
        wordStudyDimensions: {
          lex: '"Verb describing deprivation or insufficiency, completely negated by the Shepherd’s care."',
          ane: '"In harsh Judean wilderness, water and pasture were precarious; with Yahweh, abundance is guaranteed."',
          mood: '"Quiet, overflowing contentment and peaceful satisfaction."',
          prophetic: '"My God shall supply all your need according to his riches in glory by Christ Jesus (Phil 4:19)."'
        }
      }
    ],
    strongs: 'H7462',
    rootMeaning: 'To pasture, tend, graze, feed flock • Relational intimacy',
    parsingTag: 'V-QAL-PART-MS',
    parsingTitle: 'Grammatical Breakdown • V-QAL-PART-MS',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Verb / Participle (Active continuous role)' },
      { label: '2. Stem:', val: 'Qal (Direct shepherd relationship)' },
      { label: '3. Suffix:', val: '1st Person Singular ("My Shepherd")' },
      { label: '4. State:', val: 'Continuous present pastoral care' }
    ],
    kjvPrefix: 'The LORD is my ',
    kjvTarget: 'shepherd',
    kjvSuffix: '; I shall not want.',
    wordStudyTitle: 'rā‘āh (Shepherd Covenant)',
    wordStudyDimensions: {
      lex: '"Expresses personal pastoral companionship, active defense against predators, and sovereign guidance into quiet resting waters."',
      ane: '"While ancient Near Eastern kings styled themselves distant shepherds of captive nations, David confesses God as personal companion."',
      mood: '"Infuses unwavering peace and quiet assurance amidst valleys of deepest shadow; casts out all anxiety through divine sufficiency."',
      prophetic: '"Directly foretells Jesus as the Good Shepherd (John 10:11) who lays down His life for the sheep and leads them to living fountains."'
    },
    dialogueVerseRef: 'Psalm 23:1',
    dialogueQuotedText: '"The LORD is my shepherd; I shall not want."',
    chip1Text: 'Pastoral Provision',
    chip2Text: 'Total Sufficiency',
    attached1Ref: 'John 10:11',
    attached1Text: '"I am the good shepherd: the good shepherd giveth his life for the sheep."',
    attached2Ref: 'Ezekiel 34:15',
    attached2Text: '"I will feed my flock, and I will cause them to lie down, saith the Lord GOD."',
    contextTitle: 'Psalm 23 Pastoral Redemptive Stream'
  },
  {
    book: 'Proverbs',
    chapter: 3,
    verse: 5,
    language: 'Hebrew',
    refHeader: 'Proverbs 3:5 • Hebrew',
    natureImage: '/nature_golden_valley.jpg',
    words: [
      {
        text: 'bəṭaḥ*',
        target: true,
        strongs: 'H982',
        rootMeaning: 'To place unreserved trust, feel secure, lean full weight • Complete confidence',
        parsingTag: 'V-QAL-IMP-MS',
        parsingTitle: 'Grammatical Breakdown • V-QAL-IMP-MS',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Verb (Imperative commandment)' },
          { label: '2. Stem:', val: 'Qal (Simple wholehearted commitment)' },
          { label: '3. Mood:', val: 'Imperative (Urgent moral instruction)' },
          { label: '4. Target:', val: 'Unto Yahweh exclusively' }
        ],
        kjvMatch: 'Trust',
        wordStudyTitle: 'bāṭaḥ (Unreserved Trust)',
        wordStudyDimensions: {
          lex: '"Describes casting oneself wholly upon another, relinquishing defensive self-reliance in absolute reliance upon God’s covenant character."',
          ane: '"Contrasts with reliance on chariots, fortresses, or human alliances commonly celebrated in Bronze and Iron Age treaties."',
          mood: '"Exudes profound rest and surrender; anchors the heart in God’s unerring wisdom when life’s path appears hidden or uncertain."',
          prophetic: '"Echoes the righteousness that comes by unwavering faith in Romans 4:3 and the call to fix our eyes upon Jesus in Hebrews 12:2."'
        }
      },
      {
        text: '’el',
        target: false,
        strongs: 'H413',
        rootMeaning: 'Directional preposition • Unto, toward, in',
        parsingTag: 'HR',
        parsingTitle: 'Grammatical Breakdown • Preposition',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Preposition (Directional motion)' }
        ],
        kjvMatch: 'in',
        wordStudyTitle: '’el (Directional Focus)',
        wordStudyDimensions: {
          lex: '"Preposition expressing motion toward or contact with an object."',
          ane: '"Directs the heart\'s orientation away from self and exclusively toward God."',
          mood: '"Intentionality and purposeful direction."',
          prophetic: '"Orienting faith directly upon Christ."'
        }
      },
      {
        text: 'yəhwāh',
        target: false,
        strongs: 'H3068',
        rootMeaning: 'The Self-Existent Eternal Covenant LORD • The Great I AM',
        parsingTag: 'HNp',
        parsingTitle: 'Grammatical Breakdown • Proper Noun',
        parsingItems: [
          { label: '1. Proper Divine Name:', val: 'The Tetragrammaton (YHWH)' },
          { label: '2. Meaning:', val: 'He Who Is / The Covenant Keeping Lord' }
        ],
        kjvMatch: 'the LORD',
        wordStudyTitle: 'yahweh (The Eternal Covenant Name)',
        wordStudyDimensions: {
          lex: '"The sacred personal name of Israel’s God, expressing self-existence and unfailing covenant fidelity."',
          ane: '"Contrasts with capricious territorial idols; Yahweh is faithful to all generations."',
          mood: '"Deep reassurance, steadfast rock, and personal salvation."',
          prophetic: '"Revealed in the name of Yeshua (Jesus): Yahweh is Salvation."'
        }
      },
      {
        text: 'bəḵol',
        target: false,
        strongs: 'H3605',
        rootMeaning: 'With all, the entirety, totality • Wholeheartedness',
        parsingTag: 'HR/N-MSC',
        parsingTitle: 'Grammatical Breakdown • HR/N-MSC',
        parsingItems: [
          { label: '1. Prefix:', val: 'Bə- (Preposition "With / In")' },
          { label: '2. Noun Root:', val: 'Kōl (All / Whole / Entirety)' }
        ],
        kjvMatch: 'with all',
        wordStudyTitle: 'kōl (Totality of Being)',
        wordStudyDimensions: {
          lex: '"Denotes the whole, totality, every part without reservation."',
          ane: '"Demands undivided total allegiance rather than partitioned loyalty."',
          mood: '"Wholehearted passion and radical surrender."',
          prophetic: '"Love the Lord thy God with all thy heart (Matthew 22:37)."'
        }
      },
      {
        text: 'libbəkā',
        target: false,
        strongs: 'H3820',
        rootMeaning: 'Thine heart • Seat of inner life, will, and affection',
        parsingTag: 'HN-MSC/Sp-2ms',
        parsingTitle: 'Grammatical Breakdown • HN-MSC/Sp-2ms',
        parsingItems: [
          { label: '1. Noun Root:', val: 'Lēḇ (Heart / Seat of volition and conscience)' },
          { label: '2. Suffix:', val: '-kā (2nd Person Masculine Singular "Thy / Thine")' }
        ],
        kjvMatch: 'thine heart',
        wordStudyTitle: 'lēḇ (The Undivided Heart)',
        wordStudyDimensions: {
          lex: '"The heart in biblical Hebrew encompasses mind, emotion, volition, and moral conscience."',
          ane: '"The core throne room of human decision and devotion."',
          mood: '"Warm devotion and sincere integrity."',
          prophetic: '"A new heart also will I give you (Ezekiel 36:26)."'
        }
      },
      {
        text: 'wə’el',
        target: false,
        strongs: 'H413',
        rootMeaning: 'And unto, and toward • Connecting negative contrast',
        parsingTag: 'HC/HR',
        parsingTitle: 'Grammatical Breakdown • HC/HR',
        parsingItems: [
          { label: '1. Conjunction:', val: 'Wə- (And)' },
          { label: '2. Preposition:', val: '’El (Unto / Toward)' }
        ],
        kjvMatch: 'and unto',
        wordStudyTitle: 'wə’el (Contrastive Link)',
        wordStudyDimensions: {
          lex: '"Conjunction and preposition introducing the false alternative that must be rejected."',
          ane: '"Contrasts trusting the Creator with leaning on creaturely wisdom."',
          mood: '"Sober caution and discernment."',
          prophetic: '"Cease ye from man, whose breath is in his nostrils (Isaiah 2:22)."'
        }
      },
      {
        text: 'bînātəkā',
        target: false,
        strongs: 'H998',
        rootMeaning: 'Thine own understanding • Human insight and perception',
        parsingTag: 'HN-FSC/Sp-2ms',
        parsingTitle: 'Grammatical Breakdown • HN-FSC/Sp-2ms',
        parsingItems: [
          { label: '1. Noun Root:', val: 'Bînāh (Understanding / Insight / Discernment)' },
          { label: '2. Suffix:', val: '-kā (2nd Person Masculine Singular "Thine own")' }
        ],
        kjvMatch: 'thine own understanding',
        wordStudyTitle: 'bînāh (Human Understanding)',
        wordStudyDimensions: {
          lex: '"Cognitive discernment and analytical reasoning, which must remain subordinate to divine revelation."',
          ane: '"Exposes the folly of human hubris that trusts in its own limited foresight."',
          mood: '"Humble self-awareness and submission to higher wisdom."',
          prophetic: '"For the wisdom of this world is foolishness with God (1 Corinthians 3:19)."'
        }
      },
      {
        text: '’al',
        target: false,
        strongs: 'H408',
        rootMeaning: 'Negative particle • Urgent prohibitive warning',
        parsingTag: 'HTn',
        parsingTitle: 'Grammatical Breakdown • Negative Adverb',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Negative Particle (Do not / Not)' }
        ],
        kjvMatch: 'lean not',
        wordStudyTitle: '’al (Prohibitive Admonition)',
        wordStudyDimensions: {
          lex: '"Prohibitive particle used with the imperfect to issue urgent moral warning."',
          ane: '"A fatherly warning against hazardous self-reliance."',
          mood: '"Protective urgency."',
          prophetic: '"Warning against walking in the counsel of the ungodly."'
        }
      },
      {
        text: 'tiššā‘ēn',
        target: false,
        strongs: 'H8172',
        rootMeaning: 'To lean, support oneself on • Relinquishing false crutches',
        parsingTag: 'V-NIPH-IMPF-2MS',
        parsingTitle: 'Grammatical Breakdown • V-NIPH-IMPF-2MS',
        parsingItems: [
          { label: '1. Verb Root:', val: 'Šā‘an (To lean, rest weight upon)' },
          { label: '2. Stem/Person:', val: 'Niphal (Reflexive) 2nd Person Masculine Singular' }
        ],
        kjvMatch: 'lean',
        wordStudyTitle: 'šā‘an (Relinquishing False Props)',
        wordStudyDimensions: {
          lex: '"Vivid physical metaphor: leaning one’s full physical weight on a staff or pillar."',
          ane: '"Warns against leaning on broken reeds like Egypt’s military promises (Isaiah 36:6)."',
          mood: '"Liberating release of self-reliance into the everlasting arms."',
          prophetic: '"Underneath are the everlasting arms (Deuteronomy 33:27)."'
        }
      }
    ],
    strongs: 'H982',
    rootMeaning: 'To place unreserved trust, feel secure, lean full weight • Complete confidence',
    parsingTag: 'V-QAL-IMP-MS',
    parsingTitle: 'Grammatical Breakdown • V-QAL-IMP-MS',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Verb (Imperative commandment)' },
      { label: '2. Stem:', val: 'Qal (Simple wholehearted commitment)' },
      { label: '3. Mood:', val: 'Imperative (Urgent moral instruction)' },
      { label: '4. Target:', val: 'Unto Yahweh exclusively' }
    ],
    kjvPrefix: '',
    kjvTarget: 'Trust',
    kjvSuffix: ' in the LORD with all thine heart; and lean not unto thine own understanding.',
    wordStudyTitle: 'bāṭaḥ (Unreserved Trust)',
    wordStudyDimensions: {
      lex: '"Describes casting oneself wholly upon another, relinquishing defensive self-reliance in absolute reliance upon God’s covenant character."',
      ane: '"Contrasts with reliance on chariots, fortresses, or human alliances commonly celebrated in Bronze and Iron Age treaties."',
      mood: '"Exudes profound rest and surrender; anchors the heart in God’s unerring wisdom when life’s path appears hidden or uncertain."',
      prophetic: '"Echoes the righteousness that comes by unwavering faith in Romans 4:3 and the call to fix our eyes upon Jesus in Hebrews 12:2."'
    },
    dialogueVerseRef: 'Proverbs 3:5',
    dialogueQuotedText: '"Trust in the LORD with all thine heart; and lean not unto thine own understanding."',
    chip1Text: 'Wholehearted Faith',
    chip2Text: 'Divine Guidance',
    attached1Ref: 'Jeremiah 17:7',
    attached1Text: '"Blessed is the man that trusteth in the LORD, and whose hope the LORD is."',
    attached2Ref: 'Romans 8:28',
    attached2Text: '"And we know that all things work together for good to them that love God..."',
        contextTitle: 'Proverbs 3 Wisdom & Redemptive Stream'
  },
  {
    book: 'Isaiah',
    chapter: 40,
    verse: 31,
    language: 'Hebrew',
    refHeader: 'Isaiah 40:31 • Hebrew',
    natureImage: '/nature_eagle_canyon.jpg',
    words: [
      {
        text: 'wəqôyê*',
        target: true,
        strongs: 'H6960',
        rootMeaning: 'To wait eagerly, entwine, bind together with God • Hopeful endurance',
        parsingTag: 'V-QAL-ACT-PTCP-MP',
        parsingTitle: 'Grammatical Breakdown • V-QAL-ACT-PTCP-MP',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Active Participle (Continuing habit)' },
          { label: '2. Root:', val: 'Qāwāh (To twist, bind, wait with expectation)' }
        ],
        kjvMatch: 'wait upon',
        wordStudyTitle: 'qāwāh (Expectant Waiting)',
        wordStudyDimensions: {
          wordHistory: 'Root refers to twisting strands together to make an unbreakable cord; waiting on God braids human weakness into His divine power.',
          ancientWorldview: 'Spoken to exhausted exiles in Babylon who feared God had forgotten them; Isaiah proclaims the Creator never grows faint.',
          writersIntent: 'To re-orient human dependence from fleeting human strength to God’s inexhaustible stamina.',
          theTrueAnchor: 'Christ says: My grace is sufficient for thee: for my strength is made perfect in weakness (2 Corinthians 12:9).'
        }
      },
      {
        text: 'yəhwāh',
        target: false,
        strongs: 'H3068',
        rootMeaning: 'The Self-Existent Eternal Covenant LORD',
        parsingTag: 'HNp',
        parsingTitle: 'Grammatical Breakdown • Proper Noun',
        parsingItems: [
          { label: '1. Divine Name:', val: 'The Tetragrammaton (YHWH)' }
        ],
        kjvMatch: 'the LORD'
      },
      {
        text: 'yaḥălîp̄û',
        target: false,
        strongs: 'H2498',
        rootMeaning: 'Shall renew, exchange, cause to sprout anew',
        parsingTag: 'V-HIF-IMPF-3MP',
        parsingTitle: 'Grammatical Breakdown • Hifil Imperfect',
        parsingItems: [
          { label: '1. Stem:', val: 'Hifil (Causative action)' }
        ],
        kjvMatch: 'shall renew'
      },
      {
        text: 'kōaḥ',
        target: false,
        strongs: 'H3581',
        rootMeaning: 'Strength, vigor, capacity, power',
        parsingTag: 'HN-MSA',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [
          { label: '1. Gender/Number:', val: 'Masculine Singular' }
        ],
        kjvMatch: 'strength'
      },
      {
        text: 'ya‘ălû',
        target: false,
        strongs: 'H5927',
        rootMeaning: 'Shall ascend, mount up, soar aloft',
        parsingTag: 'V-QAL-IMPF-3MP',
        parsingTitle: 'Grammatical Breakdown • Qal Imperfect',
        parsingItems: [
          { label: '1. Meaning:', val: 'To ascend like an eagle on thermals' }
        ],
        kjvMatch: 'they shall mount up'
      },
      {
        text: '’ēḇer',
        target: false,
        strongs: 'H83',
        rootMeaning: 'Pinion, wing, plumage of flight',
        parsingTag: 'HN-MSA',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [
          { label: '1. Meaning:', val: 'Mighty wings of soaring birds' }
        ],
        kjvMatch: 'with wings'
      },
      {
        text: 'kanəšārîm',
        target: false,
        strongs: 'H5404',
        rootMeaning: 'As eagles • Majestic soaring birds of high crags',
        parsingTag: 'HR/N-MPA',
        parsingTitle: 'Grammatical Breakdown • HR/N-MPA',
        parsingItems: [
          { label: '1. Prefix:', val: 'Kə- (Preposition "As / Like")' }
        ],
        kjvMatch: 'as eagles'
      }
    ],
    strongs: 'H6960',
    rootMeaning: 'To wait eagerly, entwine, bind together with God • Hopeful endurance',
    parsingTag: 'V-QAL-ACT-PTCP-MP',
    parsingTitle: 'Grammatical Breakdown • V-QAL-ACT-PTCP-MP',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Active Participle (Ongoing lifestyle of waiting)' },
      { label: '2. Stem:', val: 'Qal (Simple intensive action)' },
      { label: '3. Meaning:', val: 'Braiding one’s life into God’s eternal life' }
    ],
    kjvPrefix: 'They that ',
    kjvTarget: 'wait upon the LORD',
    kjvSuffix: ' shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    wordStudyTitle: 'qāwāh (Expectant Waiting)',
    coreMeaning: 'To bind together by twisting, wait patiently, look eagerly for divine intervention.',
    wordStudyDimensions: {
      wordHistory: 'Root refers to twisting strands together to make an unbreakable cord; waiting on God braids human weakness into His divine power.',
      ancientWorldview: 'Spoken to exhausted exiles in Babylon who feared God had forgotten them; Isaiah proclaims the Creator never grows faint.',
      writersIntent: 'To re-orient human dependence from fleeting human strength to God’s inexhaustible stamina.',
      theTrueAnchor: 'Christ says: My grace is sufficient for thee: for my strength is made perfect in weakness (2 Corinthians 12:9).',
      lex: 'To bind together by twisting, wait patiently, look eagerly for divine intervention.',
      ane: 'Contrasts with reliance on mortal Babylonian kings or human armies.',
      mood: 'Triumphant reassurance and sovereign elevation.',
      prophetic: 'Points to resurrection power that overcomes mortal exhaustion.'
    },
    dialogueVerseRef: 'Isaiah 40:31',
    dialogueQuotedText: '"They that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."',
    chip1Text: 'Renewed Strength',
    chip2Text: 'Soaring Faith',
    attached1Ref: 'Psalm 27:14',
    attached1Text: '"Wait on the LORD: be of good courage, and he shall strengthen thine heart..."',
    attached2Ref: '2 Corinthians 12:9',
    attached2Text: '"And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness."',
    contextTitle: 'Isaiah 40 Comfort & Everlasting Power'
  },
  {
    book: 'Romans',
    chapter: 8,
    verse: 28,
    language: 'Greek',
    refHeader: 'Romans 8:28 • Greek',
    natureImage: '/nature_forest_light.jpg',
    words: [
      {
        text: 'Oidamen',
        target: false,
        strongs: 'G1492',
        rootMeaning: 'We know with intuitive certainty',
        parsingTag: 'V-RAI-1P',
        parsingTitle: 'Grammatical Breakdown • Perfect Active',
        parsingItems: [{ label: '1. Meaning:', val: 'Settled conviction' }],
        kjvMatch: 'And we know'
      },
      {
        text: 'de',
        target: false,
        strongs: 'G1161',
        rootMeaning: 'Now, and, moreover',
        parsingTag: 'CONJ',
        parsingTitle: 'Grammatical Breakdown • Conjunction',
        parsingItems: [{ label: '1. Meaning:', val: 'Transitional conjunction' }],
        kjvMatch: ''
      },
      {
        text: 'hoti',
        target: false,
        strongs: 'G3754',
        rootMeaning: 'That, because',
        parsingTag: 'CONJ',
        parsingTitle: 'Grammatical Breakdown • Conjunction',
        parsingItems: [{ label: '1. Meaning:', val: 'Content clause marker' }],
        kjvMatch: 'that'
      },
      {
        text: 'tois',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'To those, for the ones',
        parsingTag: 'T-DPM',
        parsingTitle: 'Grammatical Breakdown • Article',
        parsingItems: [{ label: '1. Case:', val: 'Dative Plural Masculine' }],
        kjvMatch: 'to them that'
      },
      {
        text: 'agapōsin',
        target: false,
        strongs: 'G25',
        rootMeaning: 'Loving with unconditional devotion',
        parsingTag: 'V-PAP-DPM',
        parsingTitle: 'Grammatical Breakdown • Present Active Participle',
        parsingItems: [{ label: '1. Meaning:', val: 'Agape love' }],
        kjvMatch: 'love'
      },
      {
        text: 'ton',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'The',
        parsingTag: 'T-ASM',
        parsingTitle: 'Grammatical Breakdown • Article',
        parsingItems: [{ label: '1. Case:', val: 'Accusative Singular Masculine' }],
        kjvMatch: ''
      },
      {
        text: 'Theon',
        target: false,
        strongs: 'G2316',
        rootMeaning: 'God the Father',
        parsingTag: 'N-ASM',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [{ label: '1. Case:', val: 'Accusative Singular Masculine' }],
        kjvMatch: 'God'
      },
      {
        text: 'panta',
        target: false,
        strongs: 'G3956',
        rootMeaning: 'All things, the totality of circumstances',
        parsingTag: 'A-NPN',
        parsingTitle: 'Grammatical Breakdown • Adjective',
        parsingItems: [{ label: '1. Case:', val: 'Nominative/Accusative Neuter Plural' }],
        kjvMatch: 'all things'
      },
      {
        text: 'synergei*',
        target: true,
        strongs: 'G4903',
        rootMeaning: 'To work together, cooperate, harmoniously orchestrate • Divine synergy',
        parsingTag: 'V-PAI-3S',
        parsingTitle: 'Grammatical Breakdown • V-PAI-3S',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Verb (Present Active Indicative)' },
          { label: '2. Compound:', val: 'Syn (Together) + Ergon (Work)' },
          { label: '3. Meaning:', val: 'Sovereign orchestration of every event' }
        ],
        kjvMatch: 'work together',
        wordStudyTitle: 'synergéō (Sovereign Orchestration)',
        wordStudyDimensions: {
          wordHistory: 'Compound of syn (together) and ergon (work). Origin of English “synergy”, where the unified whole transcends individual parts.',
          ancientWorldview: 'Paul writes into Roman imperial oppression and suffering, declaring that hardship is not sovereign—God is.',
          writersIntent: 'To ground Christian fortitude in the unbreakable golden chain of divine calling, justification, and glory.',
          theTrueAnchor: 'Even betrayal and the cross were woven into redemption: What man meant for evil, God meant for good (Genesis 50:20).'
        }
      },
      {
        text: 'eis',
        target: false,
        strongs: 'G1519',
        rootMeaning: 'Unto, toward, resulting in',
        parsingTag: 'PREP',
        parsingTitle: 'Grammatical Breakdown • Preposition',
        parsingItems: [{ label: '1. Meaning:', val: 'Directional goal' }],
        kjvMatch: 'for'
      },
      {
        text: 'agathon',
        target: false,
        strongs: 'G18',
        rootMeaning: 'Ultimate good, benevolent redemptive fruition',
        parsingTag: 'A-ASN',
        parsingTitle: 'Grammatical Breakdown • Adjective',
        parsingItems: [{ label: '1. Meaning:', val: 'Moral, spiritual, and eternal good' }],
        kjvMatch: 'good'
      }
    ],
    strongs: 'G4903',
    rootMeaning: 'To work together, cooperate, harmoniously orchestrate • Divine synergy',
    parsingTag: 'V-PAI-3S',
    parsingTitle: 'Grammatical Breakdown • V-PAI-3S',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Verb (Present Active Indicative)' },
      { label: '2. Meaning:', val: 'God continuously causes all things to work together' }
    ],
    kjvPrefix: 'And we know that all things ',
    kjvTarget: 'work together for good',
    kjvSuffix: ' to them that love God, to them who are the called according to his purpose.',
    wordStudyTitle: 'synergéō (Sovereign Orchestration)',
    coreMeaning: 'To act together with, cooperate in harmony, interweave events toward an overarching divine objective.',
    wordStudyDimensions: {
      wordHistory: 'Compound of syn (together) and ergon (work). Origin of English “synergy”, where the unified whole transcends individual parts.',
      ancientWorldview: 'Paul writes into Roman imperial oppression and suffering, declaring that hardship is not sovereign—God is.',
      writersIntent: 'To ground Christian fortitude in the unbreakable golden chain of divine calling, justification, and glory.',
      theTrueAnchor: 'Even betrayal and the cross were woven into redemption: What man meant for evil, God meant for good (Genesis 50:20).',
      lex: 'To act together with, cooperate in harmony, interweave events toward an overarching divine objective.',
      ane: 'Contrasts with blind Stoic fate or capricious Greek gods.',
      mood: 'Unshakable comfort and deep peace in suffering.',
      prophetic: 'Christ’s suffering and resurrection as the supreme archetype of sovereign good.'
    },
    dialogueVerseRef: 'Romans 8:28',
    dialogueQuotedText: '"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."',
    chip1Text: 'Sovereign Purpose',
    chip2Text: 'Divine Harmony',
    attached1Ref: 'Genesis 50:20',
    attached1Text: '"But as for you, ye thought evil against me; but God meant it unto good..."',
    attached2Ref: 'Ephesians 1:11',
    attached2Text: '"In whom also we have obtained an inheritance, being predestinated according to the purpose of him who worketh all things after the counsel of his own will..."',
    contextTitle: 'Romans 8 Sovereign Redemptive Harmony'
  },
  {
    book: 'Matthew',
    chapter: 6,
    verse: 28,
    language: 'Greek',
    refHeader: 'Matthew 6:28 • Greek',
    natureImage: '/nature_wildflower_meadow.jpg',
    words: [
      {
        text: 'kai',
        target: false,
        strongs: 'G2532',
        rootMeaning: 'And, also',
        parsingTag: 'CONJ',
        parsingTitle: 'Grammatical Breakdown • Conjunction',
        parsingItems: [{ label: '1. Meaning:', val: 'Connective' }],
        kjvMatch: 'And'
      },
      {
        text: 'peri',
        target: false,
        strongs: 'G4012',
        rootMeaning: 'Concerning, about',
        parsingTag: 'PREP',
        parsingTitle: 'Grammatical Breakdown • Preposition',
        parsingItems: [{ label: '1. Meaning:', val: 'Concerning' }],
        kjvMatch: 'why take ye thought for'
      },
      {
        text: 'endymeros',
        target: false,
        strongs: 'G1742',
        rootMeaning: 'Clothing, raiment',
        parsingTag: 'N-GSN',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [{ label: '1. Meaning:', val: 'Garment or vesture' }],
        kjvMatch: 'raiment'
      },
      {
        text: 'ti',
        target: false,
        strongs: 'G5101',
        rootMeaning: 'Why, what',
        parsingTag: 'I-ASN',
        parsingTitle: 'Grammatical Breakdown • Pronoun',
        parsingItems: [{ label: '1. Meaning:', val: 'Interrogative' }],
        kjvMatch: 'why'
      },
      {
        text: 'merimnate',
        target: false,
        strongs: 'G3309',
        rootMeaning: 'Are you anxious, distractingly worried',
        parsingTag: 'V-PAI-2P',
        parsingTitle: 'Grammatical Breakdown • Verb',
        parsingItems: [{ label: '1. Meaning:', val: 'Divided mind from anxious care' }],
        kjvMatch: 'take ye thought'
      },
      {
        text: 'katamáthete*',
        target: true,
        strongs: 'G2648',
        rootMeaning: 'Observe with keen insight, examine thoroughly, consider deeply • Contemplative learning',
        parsingTag: 'V-AAM-2P',
        parsingTitle: 'Grammatical Breakdown • V-AAM-2P',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Verb (Aorist Active Imperative)' },
          { label: '2. Compound:', val: 'Kata (Down/Thoroughly) + Manthanō (Learn)' },
          { label: '3. Meaning:', val: 'Observe carefully to discern spiritual truth' }
        ],
        kjvMatch: 'Consider',
        wordStudyTitle: 'katamanthánō (Contemplative Observation)',
        wordStudyDimensions: {
          wordHistory: 'Intensive form of manthanō (to learn). Implies taking time to bend down, inspect closely, and absorb spiritual reality.',
          ancientWorldview: 'Jesus contrasts the anxious striving of the Gentiles with child-like trust in the heavenly Father who clothes wildflowers.',
          writersIntent: 'To liberate the human soul from the paralyzing anxiety of consumerism and scarcity by directing eyes to creation.',
          theTrueAnchor: 'Seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you (Matthew 6:33).'
        }
      },
      {
        text: 'ta',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'The',
        parsingTag: 'T-APN',
        parsingTitle: 'Grammatical Breakdown • Article',
        parsingItems: [{ label: '1. Case:', val: 'Accusative Plural Neuter' }],
        kjvMatch: 'the'
      },
      {
        text: 'krina',
        target: false,
        strongs: 'G2918',
        rootMeaning: 'Lilies, wild anemones of Galilee',
        parsingTag: 'N-APN',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [{ label: '1. Meaning:', val: 'Galilean wildflowers' }],
        kjvMatch: 'lilies'
      },
      {
        text: 'tou',
        target: false,
        strongs: 'G3588',
        rootMeaning: 'Of the',
        parsingTag: 'T-GSM',
        parsingTitle: 'Grammatical Breakdown • Article',
        parsingItems: [{ label: '1. Case:', val: 'Genitive Singular Masculine' }],
        kjvMatch: 'of the'
      },
      {
        text: 'agrou',
        target: false,
        strongs: 'G68',
        rootMeaning: 'Field, open countryside',
        parsingTag: 'N-GSM',
        parsingTitle: 'Grammatical Breakdown • Noun',
        parsingItems: [{ label: '1. Meaning:', val: 'Wild uncultivated ground' }],
        kjvMatch: 'field'
      },
      {
        text: 'pōs',
        target: false,
        strongs: 'G4459',
        rootMeaning: 'How, in what manner',
        parsingTag: 'ADV',
        parsingTitle: 'Grammatical Breakdown • Adverb',
        parsingItems: [{ label: '1. Meaning:', val: 'How' }],
        kjvMatch: 'how'
      },
      {
        text: 'auxanousin',
        target: false,
        strongs: 'G837',
        rootMeaning: 'They grow, increase, flourish',
        parsingTag: 'V-PAI-3P',
        parsingTitle: 'Grammatical Breakdown • Verb',
        parsingItems: [{ label: '1. Meaning:', val: 'Continuous effortless growth' }],
        kjvMatch: 'they grow'
      }
    ],
    strongs: 'G2648',
    rootMeaning: 'Observe with keen insight, examine thoroughly, consider deeply • Contemplative learning',
    parsingTag: 'V-AAM-2P',
    parsingTitle: 'Grammatical Breakdown • V-AAM-2P',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Verb (Aorist Active Imperative 2nd Plural)' },
      { label: '2. Root:', val: 'Kata + Manthanō (Deep learning)' }
    ],
    kjvPrefix: '',
    kjvTarget: 'Consider the lilies of the field',
    kjvSuffix: ', how they grow; they toil not, neither do they spin: and yet I say unto you, That even Solomon in all his glory was not arrayed like one of these.',
    wordStudyTitle: 'katamanthánō (Contemplative Observation)',
    coreMeaning: 'To note accurately, observe with keen attention, learn deeply from created reality.',
    wordStudyDimensions: {
      wordHistory: 'Intensive form of manthanō (to learn). Implies taking time to bend down, inspect closely, and absorb spiritual reality.',
      ancientWorldview: 'Jesus contrasts the anxious striving of the Gentiles with child-like trust in the heavenly Father who clothes wildflowers.',
      writersIntent: 'To liberate the human soul from the paralyzing anxiety of consumerism and scarcity by directing eyes to creation.',
      theTrueAnchor: 'Seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you (Matthew 6:33).',
      lex: 'To note accurately, observe with keen attention, learn deeply from created reality.',
      ane: 'Reflects pastoral Galilean hillside teaching amidst vibrant spring wildflowers.',
      mood: 'Gentle, liberating freedom from anxiety.',
      prophetic: 'Reveals God’s tender paternal care for His children.'
    },
    dialogueVerseRef: 'Matthew 6:28',
    dialogueQuotedText: '"Consider the lilies of the field, how they grow; they toil not, neither do they spin: and yet I say unto you, That even Solomon in all his glory was not arrayed like one of these."',
    chip1Text: 'Freedom from Worry',
    chip2Text: 'Fatherly Care',
    attached1Ref: 'Philippians 4:6',
    attached1Text: '"Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God."',
    attached2Ref: '1 Peter 5:7',
    attached2Text: '"Casting all your care upon him; for he careth for you."',
    contextTitle: 'Matthew 6 Freedom From Anxiety'
  },
  {
    book: 'Psalms',
    chapter: 19,
    verse: 1,
    language: 'Hebrew',
    refHeader: 'Psalm 19:1 • Hebrew',
    natureImage: '/nature_starlit_sea.jpg',
    words: [
      {
        text: 'haššāmayim',
        target: false,
        strongs: 'H8064',
        rootMeaning: 'The heavens, skies, celestial expanse',
        parsingTag: 'HTd/N-MP',
        parsingTitle: 'Grammatical Breakdown • HTd/N-MP',
        parsingItems: [{ label: '1. Meaning:', val: 'The boundless celestial heavens' }],
        kjvMatch: 'The heavens'
      },
      {
        text: 'məsappərîm*',
        target: true,
        strongs: 'H5608',
        rootMeaning: 'To count, recount, declare loudly, proclaim like an open scroll • Cosmic broadcast',
        parsingTag: 'V-PIEL-ACT-PTCP-MP',
        parsingTitle: 'Grammatical Breakdown • V-PIEL-ACT-PTCP-MP',
        parsingItems: [
          { label: '1. Part of Speech:', val: 'Participle (Piel Intensive Active)' },
          { label: '2. Root:', val: 'Sāp̄ar (To count, recount, celebrate)' },
          { label: '3. Meaning:', val: 'Continuous exuberant proclamation' }
        ],
        kjvMatch: 'declare',
        wordStudyTitle: 'sāp̄ar (Cosmic Proclamation)',
        wordStudyDimensions: {
          wordHistory: 'Piel intensive participle denotes an unceasing, exuberant broadcast. The cosmos is an active preacher of divine splendor.',
          ancientWorldview: 'Rejects pagan astrology where stars are capricious deities; stars are silent witnesses recounting the majesty of their Maker.',
          writersIntent: 'David links natural revelation (the cosmos speaking day to day) with special revelation (the perfect law of Yahweh in verses 7-11).',
          theTrueAnchor: 'For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made (Romans 1:20).'
        }
      },
      {
        text: 'kəḇôd',
        target: false,
        strongs: 'H3519',
        rootMeaning: 'Glory, weightiness, splendor, majesty',
        parsingTag: 'HN-MSC',
        parsingTitle: 'Grammatical Breakdown • Noun Construct',
        parsingItems: [{ label: '1. Meaning:', val: 'The weighty magnificence of God' }],
        kjvMatch: 'the glory of'
      },
      {
        text: '’ēl',
        target: false,
        strongs: 'H410',
        rootMeaning: 'God, Mighty One',
        parsingTag: 'HN-MSA',
        parsingTitle: 'Grammatical Breakdown • Proper Noun',
        parsingItems: [{ label: '1. Meaning:', val: 'The Omnipotent God' }],
        kjvMatch: 'God'
      },
      {
        text: 'ûma‘ăśēh',
        target: false,
        strongs: 'H4639',
        rootMeaning: 'And work of, crafting of',
        parsingTag: 'HC/N-MSC',
        parsingTitle: 'Grammatical Breakdown • Conjunction + Noun',
        parsingItems: [{ label: '1. Meaning:', val: 'Creative handiwork' }],
        kjvMatch: 'and the firmament sheweth his handywork'
      },
      {
        text: 'yādāyw',
        target: false,
        strongs: 'H3027',
        rootMeaning: 'His hands, His artistic craft',
        parsingTag: 'HN-FDC/Sp3ms',
        parsingTitle: 'Grammatical Breakdown • Dual Noun with Suffix',
        parsingItems: [{ label: '1. Meaning:', val: 'His divine fingers' }],
        kjvMatch: 'handywork'
      },
      {
        text: 'maggîḏ',
        target: false,
        strongs: 'H5046',
        rootMeaning: 'Declaring, making conspicuously known',
        parsingTag: 'V-HIF-PTCP-MSA',
        parsingTitle: 'Grammatical Breakdown • Hifil Participle',
        parsingItems: [{ label: '1. Stem:', val: 'Hifil (Causative declaration)' }],
        kjvMatch: 'sheweth'
      },
      {
        text: 'hārāqîa‘',
        target: false,
        strongs: 'H7549',
        rootMeaning: 'The firmament, expansive celestial dome',
        parsingTag: 'HTd/N-MSA',
        parsingTitle: 'Grammatical Breakdown • Noun with Article',
        parsingItems: [{ label: '1. Meaning:', val: 'The vast atmospheric expanse' }],
        kjvMatch: 'firmament'
      }
    ],
    strongs: 'H5608',
    rootMeaning: 'To count, recount, declare loudly, proclaim like an open scroll • Cosmic broadcast',
    parsingTag: 'V-PIEL-ACT-PTCP-MP',
    parsingTitle: 'Grammatical Breakdown • V-PIEL-ACT-PTCP-MP',
    parsingItems: [
      { label: '1. Part of Speech:', val: 'Participle (Piel Intensive Active)' },
      { label: '2. Meaning:', val: 'Unceasing narration of divine glory' }
    ],
    kjvPrefix: 'The heavens ',
    kjvTarget: 'declare the glory of God',
    kjvSuffix: '; and the firmament sheweth his handywork. Day unto day uttereth speech, and night unto night sheweth knowledge.',
    wordStudyTitle: 'sāp̄ar (Cosmic Proclamation)',
    coreMeaning: 'To count, recount, proclaim loudly, celebrate in written or oral record.',
    wordStudyDimensions: {
      wordHistory: 'Piel intensive participle denotes an unceasing, exuberant broadcast. The cosmos is an active preacher of divine splendor.',
      ancientWorldview: 'Rejects pagan astrology where stars are capricious deities; stars are silent witnesses recounting the majesty of their Maker.',
      writersIntent: 'David links natural revelation (the cosmos speaking day to day) with special revelation (the perfect law of Yahweh in verses 7-11).',
      theTrueAnchor: 'For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made (Romans 1:20).',
      lex: 'To count, recount, proclaim loudly, celebrate in written or oral record.',
      ane: 'Contrasts with Babylonian worship of planetary astral bodies.',
      mood: 'Majestic awe and cosmic wonder.',
      prophetic: 'Anticipates the Gospel spreading into all the earth (Romans 10:18).'
    },
    dialogueVerseRef: 'Psalm 19:1',
    dialogueQuotedText: '"The heavens declare the glory of God; and the firmament sheweth his handywork."',
    chip1Text: 'Cosmic Glory',
    chip2Text: 'Creation Preaching',
    attached1Ref: 'Romans 1:20',
    attached1Text: '"For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made..."',
    attached2Ref: 'Psalm 8:3-4',
    attached2Text: '"When I consider thy heavens, the work of thy fingers, the moon and the stars, which thou hast ordained; What is man, that thou art mindful of him?"',
    contextTitle: 'Psalm 19 Cosmic Symphony'
  }
];

export default function App() {
  // Check URL parameters for standalone Wireless Remote Phone Camera Mode (scanned via QR code)
  const isRemoteCamMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'remote-cam' || params.has('remote_cam');
  }, []);

  const remoteCamRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || params.get('remote_cam') || 'main-studio';
  }, []);

  if (isRemoteCamMode) {
    return <RemotePhoneCameraView roomId={remoteCamRoomId} />;
  }

  // Check URL parameters for standalone Tactile Deck Hardware Preview
  const isTactilePreviewMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'tactile' || params.get('mode') === 'tactile-preview';
  }, []);

  if (isTactilePreviewMode) {
    return <TactileDeckPreview onClose={() => { window.location.href = window.location.pathname; }} />;
  }

  // Check URL parameters for standalone Cinematic Motion Graphics Studio Preview
  const isMotionPreviewMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'motion' || params.get('preview') === 'cinematic' || params.get('mode') === 'motion-preview';
  }, []);

  if (isMotionPreviewMode) {
    return <CinematicTransitionPreview onClose={() => { window.location.href = window.location.pathname; }} />;
  }

  // Dynamic Cross-Reference Reactive Listener
  const [, setCrossRefTick] = useState(0);
  useEffect(() => {
    return subscribeToCrossReferenceUpdates(() => {
      setCrossRefTick((prev) => prev + 1);
    });
  }, []);

  // Theme & Navigation State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_theme');
      return (saved as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('logosbridge_theme', theme);
      const isDark = theme === 'dark';
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const bg = isDark ? '#191512' : '#ffffff';
      if ((window as any).BridgeAndroid?.setBackgroundColor) {
        (window as any).BridgeAndroid.setBackgroundColor(bg);
      }
    } catch (e) {
      console.warn('Failed to sync theme to localStorage:', e);
    }
  }, [theme]);

  const [appLogo, setAppLogo] = useState<'sacred' | 'cosmic' | 'grace'>(() => {
    return (localStorage.getItem('personalized_app_logo') as any) || 'sacred';
  });

  useEffect(() => {
    localStorage.setItem('personalized_app_logo', appLogo);
  }, [appLogo]);

  const logoSrc = useMemo(() => {
    return appLogoNew;
  }, []);
  const [selectedBook, setSelectedBook] = useState<string>(() => {
    try {
      return localStorage.getItem('logosbridge_last_book') || 'Genesis';
    } catch {
      return 'Genesis';
    }
  });
  const [activeNotebookVerse, setActiveNotebookVerse] = useState<number | null>(null);
  const [highlightedVerses, setHighlightedVerses] = useState<number[]>([]);

  const [selectedChapter, setSelectedChapter] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_last_chapter');
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch {
      return 1;
    }
  });
  const [selectedBookRight, setSelectedBookRight] = useState<string>('John');
  const [selectedChapterRight, setSelectedChapterRight] = useState<number>(1);
  const [chapterDataRight, setChapterDataRight] = useState<any>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward' | 'none'>('none');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isTransMenuOpen, setIsTransMenuOpen] = useState<boolean>(false);
  const [moreMenuSubpage, setMoreMenuSubpage] = useState<'main' | 'companion' | 'scripture'>('main');
  const [fullPageMenu, setFullPageMenu] = useState<string | null>(null);

  // Auto-persist Book and Chapter selections across close/minimize
  useEffect(() => {
    try {
      localStorage.setItem('logosbridge_last_book', selectedBook);
    } catch {}
  }, [selectedBook]);

  useEffect(() => {
    try {
      localStorage.setItem('logosbridge_last_chapter', String(selectedChapter));
    } catch {}
  }, [selectedChapter]);

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

  const [scriptureTypefaceSetting, setScriptureTypefaceSetting] = useState<'untitled-serif' | 'serif' | 'sans' | 'mono'>(() => {
    const saved = localStorage.getItem('logosbridge_scripture_typeface');
    return (saved as any) || 'untitled-serif';
  });
  const [isScriptureBold, setIsScriptureBold] = useState<boolean>(() => {
    return localStorage.getItem('logosbridge_scripture_bold') === 'true';
  });
  const [isScriptureItalic, setIsScriptureItalic] = useState<boolean>(() => {
    return localStorage.getItem('logosbridge_scripture_italic') === 'true';
  });
  const [scriptureTextStyleSetting, setScriptureTextStyleSetting] = useState<'normal' | 'elegant' | 'compact' | 'classic'>(() => {
    try {
      return (localStorage.getItem('logosbridge_scripture_text_style') as any) || 'normal';
    } catch {
      return 'normal';
    }
  });
  const [plainBold, setPlainBold] = useState<boolean>(false);
  const [plainItalic, setPlainItalic] = useState<boolean>(false);
  const [personalizedBold, setPersonalizedBold] = useState<boolean>(true);
  const [personalizedItalic, setPersonalizedItalic] = useState<boolean>(false);
  const [manuscriptBold, setManuscriptBold] = useState<boolean>(false);
  const [manuscriptItalic, setManuscriptItalic] = useState<boolean>(false);
  const [translationSearchText, setTranslationSearchText] = useState<string>('');

  const [translationDisplayMode, setTranslationDisplayMode] = useState<'kjv'>('kjv');
  const [mainView, setMainView] = useState<'home' | 'read' | 'interlinear' | 'live'>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_last_tab');
      if (saved && ['home', 'read', 'interlinear'].includes(saved)) {
        return saved as any;
      }
      return 'home';
    } catch {
      return 'home';
    }
  });
  const [previousMainView, setPreviousMainView] = useState<'home' | 'read' | 'interlinear'>('home');
  const lastActiveTabRef = useRef<'home' | 'read' | 'interlinear'>('home');
  const [lastVisitedTab, setLastVisitedTab] = useState<'read' | 'interlinear'>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_last_visited_tab');
      if (saved && ['read', 'interlinear'].includes(saved)) {
        return saved as any;
      }
      return 'read';
    } catch {
      return 'read';
    }
  });

  // Current authenticated Firebase user state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // Docked notch bottom icon cycling on homepage: 0 = Read (BookOpen), 1 = Study (Layers), 2 = Live (Radio)
  const [dockedNotchIndex, setDockedNotchIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDockedNotchIndex((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // =========================================================
  // Activity Capsule Context Engine State & Handlers
  // =========================================================
  // Dynamic Activity Capsule State (sourced client-side from real past user activity logs)
  const shouldShowActivityPill = (): boolean => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const firstVisit = localStorage.getItem('logosbridge_first_visit_timestamp');
      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

      // 1. First-time user session: record initial timestamp and keep disabled until subsequent revisit
      if (!firstVisit) {
        localStorage.setItem('logosbridge_first_visit_timestamp', new Date().toISOString());
        sessionStorage.setItem('logosbridge_is_first_session', 'true');
        return false;
      }

      // If still within the initial first-time user session, do not display capsule until revisit
      if (sessionStorage.getItem('logosbridge_is_first_session') === 'true') {
        return false;
      }

      // 2. Check if 24 hours have elapsed since first visit
      const elapsedSinceFirstVisit = now - Date.parse(firstVisit);
      if (isNaN(elapsedSinceFirstVisit) || elapsedSinceFirstVisit < TWENTY_FOUR_HOURS_MS) {
        return false; // Under 24 hours: remain disabled
      }

      // 3. Check if user dismissed capsule within the last 24 hours
      const dismissed = localStorage.getItem('logosbridge_capsule_last_dismissed_at');
      if (dismissed) {
        const elapsedSinceDismiss = now - Date.parse(dismissed);
        if (!isNaN(elapsedSinceDismiss) && elapsedSinceDismiss < TWENTY_FOUR_HOURS_MS) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const [activityBriefingData, setActivityBriefingData] = useState(() => generateDynamicActivityBriefing());
  const [showActivityCapsule, setShowActivityCapsule] = useState<boolean>(() => shouldShowActivityPill());
  const [activityCapsuleNarrative, setActivityCapsuleNarrative] = useState<string>(
    () => activityBriefingData.narrative
  );

  // Sync dynamic Activity Capsule narrative from local past activity logs
  useEffect(() => {
    const refreshBriefing = () => {
      const briefing = generateDynamicActivityBriefing();
      setActivityBriefingData(briefing);
      setActivityCapsuleNarrative(briefing.narrative);
      setShowActivityCapsule(shouldShowActivityPill());
    };
    refreshBriefing();

    // Re-sync whenever window regains focus or storage updates
    window.addEventListener('focus', refreshBriefing);
    window.addEventListener('storage', refreshBriefing);
    return () => {
      window.removeEventListener('focus', refreshBriefing);
      window.removeEventListener('storage', refreshBriefing);
    };
  }, []);

  const handleResumeActivityCapsule = () => {
    setShowActivityCapsule(false);
    dismissCapsule(firebaseUser?.uid);
    const targetBook = activityBriefingData.book || selectedBook || 'Genesis';
    const targetChapter = activityBriefingData.chapter || selectedChapter || 1;
    setSelectedBook(targetBook);
    setSelectedChapter(targetChapter);
    setMainView(activityBriefingData.hasPendingStudy ? 'interlinear' : 'read');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activityBriefingData.verse) {
      setTimeout(() => {
        const verseElem = document.getElementById(`verse-${activityBriefingData.verse}`) || document.getElementById(`study-verse-${activityBriefingData.verse}`);
        if (verseElem) verseElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  };

  const handleDismissActivityCapsule = () => {
    setShowActivityCapsule(false);
    dismissCapsule(firebaseUser?.uid);
  };

  const [isStudyAssistantModalOpen, setIsStudyAssistantModalOpen] = useState<boolean>(false);
  const [, setStudyAssistantTick] = useState<number>(0);

  const handleToggleStudyLater = (verseNum: number, snippetText?: string) => {
    const isAdded = toggleVerseStudyLater(selectedBook, selectedChapter, verseNum, snippetText);
    logUserActivity(
      'study_later_queued',
      `${selectedBook} ${selectedChapter}:${verseNum}`,
      isAdded ? 'Added verse to Daily Study Later docket' : 'Removed verse from Daily Study Later docket',
      1
    );
    const briefing = generateDynamicActivityBriefing();
    setActivityBriefingData(briefing);
    setActivityCapsuleNarrative(briefing.narrative);
    setStudyAssistantTick((prev) => prev + 1);
  };

  const handleQuickCompleteStudyReminder = () => {
    if (activityBriefingData.topPendingVerse) {
      markVerseStudyCompleted(activityBriefingData.topPendingVerse.id);
      const briefing = generateDynamicActivityBriefing();
      setActivityBriefingData(briefing);
      setActivityCapsuleNarrative(briefing.narrative);
      setStudyAssistantTick((prev) => prev + 1);
    }
  };

  const touchBottomStartY = useRef<number | null>(null);

  const navigateToPreviousTab = () => {
    // Docked notch at the bottom of the home page navigates straight to the Main Scripture Reader or Study view
    const target = lastVisitedTab || 'read';
    setMainView(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBottomTouchStart = (e: React.TouchEvent) => {
    touchBottomStartY.current = e.touches[0].clientY;
  };

  const handleBottomTouchEnd = (e: React.TouchEvent) => {
    if (touchBottomStartY.current !== null) {
      const deltaY = touchBottomStartY.current - e.changedTouches[0].clientY;
      if (deltaY > 50) {
        navigateToPreviousTab();
      }
    }
    touchBottomStartY.current = null;
  };

  const [homeAccentSetting, setHomeAccentSetting] = useState<'grey' | 'blue'>(() => {
    try {
      return (localStorage.getItem('logosbridge_home_accent') as 'grey' | 'blue') || 'grey';
    } catch {
      return 'grey';
    }
  });

  // Persistent homepage background scope: 'hero' (Hero & Daily Bread only, default standard)
  const [homeBgScope, setHomeBgScope] = useState<'hero' | 'full'>('hero');
  const [home4dTab, setHome4dTab] = useState<'history' | 'worldview' | 'intent' | 'anchor'>('history');
  const [isHeroCinemaOpen, setIsHeroCinemaOpen] = useState<boolean>(false);
  const [heroHeadlineStep, setHeroHeadlineStep] = useState<number>(0);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('logosbridge_last_tab', mainView);
    } catch {}
    // Reset reader scroll down state on tab navigation so bottom dock is never stuck translated off-screen
    setIsReaderScrolledDown(false);
    setIsHeaderHidden(false);
    setIsSidePanelHidden(false);
    if (mainView === 'read' || mainView === 'interlinear') {
      setLastVisitedTab(mainView);
      try {
        localStorage.setItem('logosbridge_last_visited_tab', mainView);
      } catch {}
      if (mainView === 'interlinear') {
        logUserActivity('viewed_interlinear', `${selectedBook} ${selectedChapter}`, `Studying Interlinear Manuscript of ${selectedBook} ${selectedChapter}`, 2);
      }
    }
    if (mainView === 'home' || mainView === 'read' || mainView === 'interlinear') {
      lastActiveTabRef.current = mainView;
      setPreviousMainView(mainView);
    }
    if (mainView === 'home') {
      setHeroHeadlineStep(0);
    }
  }, [mainView]);

  const [studioDeckTheme] = useStudioDeckTheme();

  // Dynamically sync document.body & documentElement background to prevent white borders on mobile safe areas & overscroll
  useEffect(() => {
    const bg = mainView === 'live'
      ? (studioDeckTheme === 'crimson' ? '#0e070a' : studioDeckTheme === 'stealth' ? '#080d0a' : '#090d16')
      : mainView === 'home'
      ? (theme === 'light' ? (homeBgScope === 'full' ? '#18201a' : '#FFFAFA') : '#191512')
      : mainView === 'interlinear'
      ? (theme === 'light' ? '#ffffff' : '#191512')
      : (theme === 'light' ? '#ffffff' : '#191512');
    document.body.style.backgroundColor = bg;
    document.documentElement.style.backgroundColor = bg;
  }, [mainView, theme, homeBgScope, studioDeckTheme]);

  const [isLiveStudioActive, setIsLiveStudioActive] = useState<boolean>(false);
  const [isLiveStudioMinimized, setIsLiveStudioMinimized] = useState<boolean>(false);
  const miniStudioBoundsRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [interlinearThirdLine, setInterlinearThirdLine] = useState<string>('kjv');
  const [openInterlinearMenuId, setOpenInterlinearMenuId] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [hasCompletedStartup, setHasCompletedStartup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('logosbridge_startup_seen') === 'true';
    } catch {
      return false;
    }
  });
  const [isDiscipleshipModalOpen, setIsDiscipleshipModalOpen] = useState<boolean>(false);

  // Persistent preference for launching Shepherd Pulse on app startup (explicit opt-in)
  const [autoLaunchPulse, setAutoLaunchPulse] = useState<boolean>(() => {
    try {
      return localStorage.getItem('logosbridge_auto_launch_pulse') === 'true';
    } catch {
      return false;
    }
  });

  // Persistent preference for study highlight & clustering accent color ('auto' | 'blue' | 'red')
  const [studyAccentColorSetting, setStudyAccentColorSetting] = useState<'auto' | 'blue' | 'red'>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_study_accent_color');
      if (saved === 'blue' || saved === 'red' || saved === 'auto') return saved;
    } catch {}
    return 'auto';
  });

  const getStudyAccentClass = useCallback(() => {
    if (studyAccentColorSetting === 'blue') return theme === 'light' ? 'text-[#1e40af]' : 'text-[#60a5fa]';
    if (studyAccentColorSetting === 'red') return theme === 'light' ? 'text-[#b91c1c]' : 'text-[#f87171]';
    return theme === 'light' ? 'text-[#1e40af]' : 'text-[#f87171]';
  }, [studyAccentColorSetting, theme]);

  const getStudyAccentBadgeClass = useCallback(() => {
    const isBlue = studyAccentColorSetting === 'blue' || (studyAccentColorSetting === 'auto' && theme === 'light');
    if (isBlue) {
      return theme === 'light'
        ? 'bg-blue-50/90 text-blue-900 border-blue-200 hover:bg-blue-100'
        : 'bg-blue-950/40 text-blue-300 border-blue-800/80 hover:bg-blue-900/50';
    } else {
      return theme === 'light'
        ? 'bg-rose-50/90 text-rose-900 border-rose-200 hover:bg-rose-100'
        : 'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/50';
    }
  }, [studyAccentColorSetting, theme]);

  const getStudyAccentSolidBgClass = useCallback(() => {
    const isBlue = studyAccentColorSetting === 'blue' || (studyAccentColorSetting === 'auto' && theme === 'light');
    if (isBlue) {
      return theme === 'light'
        ? 'bg-[#1e40af] text-white shadow-xs'
        : 'bg-[#2563eb] text-white shadow-xs';
    } else {
      return theme === 'light'
        ? 'bg-[#b91c1c] text-white shadow-xs'
        : 'bg-[#dc2626] text-white shadow-xs';
    }
  }, [studyAccentColorSetting, theme]);

  const handleStartupComplete = () => {
    setHasCompletedStartup(true);
    try {
      localStorage.setItem('logosbridge_startup_seen', 'true');
    } catch {}
    // Transition to Shepherd Pulse only if auto-launch preference is explicitly enabled and not in first-time session
    let shouldAutoLaunch = false;
    try {
      shouldAutoLaunch = localStorage.getItem('logosbridge_auto_launch_pulse') === 'true';
      if (sessionStorage.getItem('logosbridge_is_first_session') === 'true') {
        shouldAutoLaunch = false;
      }
    } catch {
      shouldAutoLaunch = false;
    }

    if (shouldAutoLaunch) {
      setIsDiscipleshipModalOpen(true);
    }
  };
  const [activeDiscipleshipPayload, setActiveDiscipleshipPayload] = useState<DiscipleshipDiagnosisPayload | null>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_active_discipleship_payload');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleDiscipleshipPayloadUpdate = (payload: DiscipleshipDiagnosisPayload | null) => {
    setActiveDiscipleshipPayload(payload);
    try {
      if (payload) {
        localStorage.setItem('logosbridge_active_discipleship_payload', JSON.stringify(payload));
      } else {
        localStorage.removeItem('logosbridge_active_discipleship_payload');
      }
    } catch (e) {
      console.warn('Could not persist discipleship payload:', e);
    }
  };

  const handleNavigateFromDiscipleship = (verseRef: string) => {
    const match = verseRef.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (match) {
      const [, book, chap] = match;
      setSelectedBook(book.trim());
      setSelectedChapter(parseInt(chap, 10) || 1);
    }
    setMainView('read');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [isEmailCopied, setIsEmailCopied] = useState<boolean>(false);
  const [isStrongsModalOpen, setIsStrongsModalOpen] = useState<boolean>(false);
  const [activeStrongsData, setActiveStrongsData] = useState<{
    strongs: string;
    word?: string;
    originalValue?: string;
    language?: 'Hebrew' | 'Greek';
    verseReference?: string;
  } | null>(null);
  const [isParsingModalOpen, setIsParsingModalOpen] = useState<boolean>(false);
  const [activeParsingData, setActiveParsingData] = useState<DecodedMorphology | null>(null);
  const [textDisplayMode, setTextDisplayMode] = useState<'script' | 'translit'>('translit');
  const [homeFeaturedStrongs, setHomeFeaturedStrongs] = useState<string>('H1254');
  const [heroActiveCrossRef, setHeroActiveCrossRef] = useState<string>('John 1:1-3');

  const handleOpenStrongsWordStudy = (
    strongs: string,
    word?: string,
    originalValue?: string,
    language?: 'Hebrew' | 'Greek',
    verseReference?: string
  ) => {
    setActiveStrongsData({
      strongs,
      word,
      originalValue,
      language,
      verseReference
    });
    setIsStrongsModalOpen(true);

    // Track user study action for Context Engine
    logUserActivity(firebaseUser?.uid, {
      actionType: 'STRONGS_LOOKUP',
      reference: verseReference || `${selectedBook} ${selectedChapter}`,
      strongsNumber: strongs,
      originalWord: originalValue || word,
      details: `Studied Strong's ${strongs} (${originalValue || word || ''}) in ${verseReference || `${selectedBook} ${selectedChapter}`}`,
      weight: 3,
    });
  };

  const handleOpenParsingModal = (
    tag: string,
    word?: string,
    root?: string,
    gloss?: string,
    strongs?: string
  ) => {
    const decoded = decodeGrammarTag(tag, word, root, gloss, strongs);
    setActiveParsingData(decoded);
    setIsParsingModalOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openInterlinearMenuId !== null) {
        const target = e.target as HTMLElement;
        if (!target.closest('.interlinear-menu-trigger') && !target.closest('.interlinear-menu-content')) {
          setOpenInterlinearMenuId(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openInterlinearMenuId]);

  const [layoutMode, setLayoutMode] = useState<'paragraph'>(() => {
    return 'paragraph';
  });
  const [audioReadingSelection, setAudioReadingSelection] = useState<'kjv'>('kjv');

  // Highly stable Pinch-to-zoom 2-finger gesture Ref & Listeners Setup to prevent mobile shaking/jitter
  const [scriptureZoom, setScriptureZoom] = useState<number>(() => {
    const saved = localStorage.getItem('personalized_bible_scripture_zoom');
    if (!saved || saved === '1.4') {
      return 1.6;
    }
    return parseFloat(saved);
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
        try {
          const verseElements = document.querySelectorAll('[data-verse-number]');
          let bestVerse = 1;
          let minDistance = Infinity;
          const headerOffset = 90;
          verseElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.bottom > headerOffset && rect.top < window.innerHeight) {
              const dist = Math.abs(rect.top - headerOffset);
              if (dist < minDistance) {
                minDistance = dist;
                const vNum = parseInt(el.getAttribute('data-verse-number') || '', 10);
                if (!isNaN(vNum) && vNum > 0) {
                  bestVerse = vNum;
                }
              }
            }
          });
          if (bestVerse > 0) {
            localStorage.setItem('logosbridge_last_verse', String(bestVerse));
          }
        } catch {}
      }, 500); // 500ms after scroll stops
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);


  const scriptureContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    activeContainerRef.current = node;
    if (node) {
      // Set initial zoom property without attaching two-finger pinch zoom listeners
      node.style.setProperty('--sz', (zoomRef.current || 1.0).toFixed(3));
    }
  }, []);

  // Pagination is disabled as requested by the user
  const [versesPerPageSetting, setVersesPerPageSetting] = useState<'all' | 5 | 7>('all');
  const [currentVersePage, setCurrentVersePage] = useState<number>(0);

  const getScriptureStyleClasses = () => {
    let classes = '';
    if (scriptureTypefaceSetting === 'untitled-serif') {
      classes += ' font-untitled';
    } else if (scriptureTypefaceSetting === 'serif') {
      classes += ' font-serif';
    } else if (scriptureTypefaceSetting === 'sans') {
      classes += ' font-sans';
    } else if (scriptureTypefaceSetting === 'mono') {
      classes += ' font-mono';
    }

    if (isScriptureBold) {
      classes += ' font-bold';
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

  // Offline download state for Library
  const [isDownloadingKjv, setIsDownloadingKjv] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isKjvOffline, setIsKjvOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem('offline_kjv') === 'true';
    } catch {
      return true;
    }
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem('logosbridge_active_avatar') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (firebaseUser) {
      const uid = firebaseUser.uid;
      const cached = localStorage.getItem('logosbridge_active_avatar') 
        || (uid && localStorage.getItem(`logosbridge_avatar_${uid}`));
      if (cached) {
        setUserAvatar(cached);
      } else if (firebaseUser.photoURL) {
        setUserAvatar(firebaseUser.photoURL);
      }
    } else {
      setUserAvatar(null);
    }
  }, [firebaseUser]);
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
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');
  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const chapterDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-expand and scroll to active book when Bible Books modal opens
  useEffect(() => {
    if (isBookDropdownOpen) {
      setExpandedBook(selectedBook);
      const timer = setTimeout(() => {
        const el = document.getElementById(`book-section-${selectedBook}`) || document.getElementById(`select-book-${selectedBook}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isBookDropdownOpen, selectedBook]);

  // Swipe Gestures
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const touchEndRef = useRef<{x: number, y: number} | null>(null);
  
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    if (e.targetTouches.length > 0) {
      touchStartRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches.length > 0) {
      touchEndRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    }
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    // Strictly isolate horizontal chapter navigation swipes to Scripture Read View only
    if (mainView !== 'read') return;
    const distanceX = touchStartRef.current.x - touchEndRef.current.x;
    const distanceY = touchStartRef.current.y - touchEndRef.current.y;
    touchStartRef.current = null;
    touchEndRef.current = null;
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
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
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
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  // Track initial chapter load to distinguish app resume vs explicit chapter change
  const isInitialChapterLoadRef = useRef<boolean>(true);

  // Chapter loading states (synchronously initialized to eliminate startup flash)
  const [chapterDataState, setChapterData] = useState<ChapterData | null>(() => {
    try {
      const lastBook = localStorage.getItem('logosbridge_last_book') || 'Genesis';
      const lastChapter = parseInt(localStorage.getItem('logosbridge_last_chapter') || '1', 10) || 1;
      const norm = normalizeBookName(lastBook);
      if (STATIC_CHAPTERS[norm] && STATIC_CHAPTERS[norm][lastChapter]) {
        return STATIC_CHAPTERS[norm][lastChapter];
      }
      const cached = localStorage.getItem(`offline_bible_v5_${norm}_${lastChapter}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.verses && parsed.verses.length > 0) return parsed;
      }
    } catch {}
    return STATIC_CHAPTERS['Genesis']?.[1] || null;
  });
  const [kjvDatasetLoaded, setKjvDatasetLoaded] = useState<boolean>(false);

  // Interlinear chapter data for Study view
  const [interlinearChapterData, setInterlinearChapterData] = useState<{
    language: 'Hebrew' | 'Greek';
    verses: Record<number, InterlinearVerse>;
  } | null>(null);

  // Home study showcase card states
  const [homeStudyReference, setHomeStudyReference] = useState<{ book: string; chapter: number; verse: number }>({ book: 'Genesis', chapter: 1, verse: 1 });
  const [homeInterlinearVerse, setHomeInterlinearVerse] = useState<InterlinearVerse | null>(null);
  const [homeKjvVerseText, setHomeKjvVerseText] = useState<string>('');

  // Strong's Macro/Micro study DB state
  const [strongsStudyDb, setStrongsStudyDb] = useState<any>(globalStrongsDbCache);

  // Persistent layout mode: 'cards' (elevated M3 boxes, default unbare) vs 'bare' (borderless editorial)
  const [homeShowcaseLayout, setHomeShowcaseLayout] = useState<'bare' | 'cards'>('cards');

  // Clean up legacy demo pointer preference from storage
  useEffect(() => {
    try {
      localStorage.removeItem('logosbridge_show_demo_pointer');
    } catch {}
  }, []);

  // Tracks active word in Home Interlinear Manuscript showcase
  const [homeActiveWordIdx, setHomeActiveWordIdx] = useState<number | null>(null);

  // Home Dialogue cross-reference panel state (self-contained, no navigation)
  const [homeCrossRefOpen, setHomeCrossRefOpen] = useState<boolean>(false);

  // 24-hour dynamic study cycle calculation
  const currentDailyStudy = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_STUDY_SCHEDULE.length;
    return DAILY_STUDY_SCHEDULE[dayIndex];
  }, []);

  // Active word in Home Interlinear Manuscript showcase
  const activeHomeWord = useMemo(() => {
    if (homeActiveWordIdx !== null && currentDailyStudy.words[homeActiveWordIdx]) {
      return currentDailyStudy.words[homeActiveWordIdx];
    }
    return null;
  }, [homeActiveWordIdx, currentDailyStudy]);

  // Active word for Word Studies showcase
  const activeWordForWordStudies = useMemo(() => {
    if (homeActiveWordIdx !== null && currentDailyStudy.words[homeActiveWordIdx]) {
      return currentDailyStudy.words[homeActiveWordIdx];
    }
    return currentDailyStudy.words.find(w => w.target) || currentDailyStudy.words[0];
  }, [homeActiveWordIdx, currentDailyStudy]);

  const activeStrongsForWordStudies = useMemo(() => {
    return (activeWordForWordStudies.strongs || currentDailyStudy.strongs || '').trim().toUpperCase();
  }, [activeWordForWordStudies, currentDailyStudy]);

  const activeRefForWordStudies = useMemo(() => {
    return `${currentDailyStudy.book} ${currentDailyStudy.chapter}:${currentDailyStudy.verse}`;
  }, [currentDailyStudy]);

  // Synchronously and reactively match the rich study data (matching Strong's Word Study modal)
  const activeWordStudyData = useMemo(() => {
    const db = strongsStudyDb || globalStrongsDbCache;
    if (!db) return null;
    const match = queryWordStudy(db, activeStrongsForWordStudies, activeRefForWordStudies);
    return match.foundMicro;
  }, [strongsStudyDb, activeStrongsForWordStudies, activeRefForWordStudies]);

  useEffect(() => {
    let isCancelled = false;
    const { book, chapter, verse } = homeStudyReference;
    getOfflineManuscriptVerse(book, chapter, verse).then((iv) => {
      if (!isCancelled && iv) {
        setHomeInterlinearVerse({
          ...iv,
          language: getBookLanguage(book)
        } as any);
      }
    });

    getVerseTextByReference(`${book} ${chapter}:${verse}`).then((text) => {
      if (!isCancelled && text) {
        setHomeKjvVerseText(text);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [homeStudyReference]);

  // Enrich chapterData with interlinear manuscript data
  const chapterData = useMemo(() => {
    if (!chapterDataState) return null;
    
    const enrichedVerses = chapterDataState.verses.map((verse) => {
      const interVerse = interlinearChapterData?.verses?.[verse.verseNumber];
      const canonicalKjv = getCanonicalKjvVerse(chapterDataState.book, chapterDataState.chapter, verse.verseNumber);
      return {
        ...verse,
        kjvText: canonicalKjv || verse.kjvText,
        manuscriptText: interVerse?.manuscriptText || verse.manuscriptText,
        interlinearWords: interVerse?.words || verse.interlinearWords,
        language: interlinearChapterData?.language || (verse as any).language || getBookLanguage(chapterDataState.book),
        specialWords: verse.specialWords || []
      };
    });
    
    return {
      ...chapterDataState,
      verses: enrichedVerses
    };
  }, [chapterDataState, interlinearChapterData, kjvDatasetLoaded]);

  const rawVersesList = useMemo(() => {
    return chapterData?.verses || [];
  }, [chapterData]);

  const paginatedVersesListRight = useMemo(() => {
    if (!chapterDataRight || !chapterDataRight.verses) return [];
    return chapterDataRight.verses.slice(0, versesPerPageSetting === 'all' ? chapterDataRight.verses.length : versesPerPageSetting);
  }, [chapterDataRight, versesPerPageSetting]);

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

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState<boolean>(false);
  const activeChapterRef = useRef<{ book: string; chapter: number }>({ book: 'John', chapter: 1 });

  // Active word and interactive explains state
  const [selectedWord, setSelectedWord] = useState<SpecialWord | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);
  const [focusedVerse, setFocusedVerse] = useState<Verse | null>(null);
  const [focusedStreamType, setFocusedStreamType] = useState<string | null>(null);

  // User attached personal lexical meaning states
  const [activeQuickEditStrongs, setActiveQuickEditStrongs] = useState<string | null>(null);
  const [activeQuickEditText, setActiveQuickEditText] = useState<string>('');
  const [userLexiconTick, setUserLexiconTick] = useState<number>(0);

  useEffect(() => {
    return subscribeToUserLexiconUpdates(() => {
      setUserLexiconTick((prev) => prev + 1);
    });
  }, []);

  const handleToggleQuickEditUserLexicon = (strongsNumber: string) => {
    if (activeQuickEditStrongs === strongsNumber) {
      setActiveQuickEditStrongs(null);
      setActiveQuickEditText('');
    } else {
      setActiveQuickEditStrongs(strongsNumber);
      setActiveQuickEditText(getUserLexiconMeaning(strongsNumber) || '');
    }
  };

  const handleSaveQuickEditUserLexicon = (strongsNumber: string) => {
    saveUserLexiconMeaning(strongsNumber, activeQuickEditText);
    setActiveQuickEditStrongs(null);
    setActiveQuickEditText('');
  };

  // Lexicon root words & theological actions cache (fetched on word click)
  const [lexiconCache, setLexiconCache] = useState<Record<string, { root_word?: string; root_action?: string }>>({});
  const [lexiconLoading, setLexiconLoading] = useState<Record<string, boolean>>({});
  const [lexiconChecked, setLexiconChecked] = useState<Record<string, boolean>>({});

  const fetchLexiconRoot = useCallback((strongsCode: string, verseRef?: string) => {
    const clean = (strongsCode || '').trim().toUpperCase();
    if (!clean) return;

    const normRef = (verseRef || '').trim().toLowerCase();
    const cleanRefId = normRef ? normRef.replace(/[\s:]+/g, '-') : '';
    const verseKey = normRef ? `${normRef}_${clean}` : clean;

    const checkAndCache = (db: any) => {
      if (db && Array.isArray(db.wordStudies)) {
        const found = db.wordStudies.find((w: any) => {
          const idMatch = cleanRefId && w.id?.toLowerCase() === `${cleanRefId}-${clean}`.toLowerCase();
          const refMatch = normRef && w.verseReference?.trim().toLowerCase() === normRef && w.strongsNumber?.toUpperCase() === clean;
          return idMatch || refMatch;
        }) || db.wordStudies.find((w: any) => w.strongsNumber?.toUpperCase() === clean);

        if (found && found.coreMeaning) {
          setLexiconCache((p) => ({
            ...p,
            [clean]: { root_word: found.originalWord, root_action: found.coreMeaning },
            [verseKey]: { root_word: found.originalWord, root_action: found.coreMeaning }
          }));
          return true;
        }
      }
      return false;
    };

    // Fast synchronous check if already cached in memory
    if (checkAndCache(strongsStudyDb || globalStrongsDbCache)) {
      return;
    }

    setLexiconLoading((prev) => ({ ...prev, [clean]: true }));

    getLoadedStrongsDb()
      .then((db: any) => {
        if (db) {
          setStrongsStudyDb(db);
          if (checkAndCache(db)) return;
        }

        // Fallback to parent lemma if available
        const parentLemma = getParentLemma(clean);
        if (parentLemma) {
          setLexiconCache((p) => ({
            ...p,
            [clean]: { root_word: parentLemma.rootWord, root_action: parentLemma.rootAction },
            [verseKey]: { root_word: parentLemma.rootWord, root_action: parentLemma.rootAction }
          }));
        }
      })
      .catch(() => {
        const parentLemma = getParentLemma(clean);
        if (parentLemma) {
          setLexiconCache((p) => ({
            ...p,
            [clean]: { root_word: parentLemma.rootWord, root_action: parentLemma.rootAction },
            [verseKey]: { root_word: parentLemma.rootWord, root_action: parentLemma.rootAction }
          }));
        }
      })
      .finally(() => {
        setLexiconLoading((prev) => ({ ...prev, [clean]: false }));
      });
  }, [strongsStudyDb]);

  // Automatically fetch lexicon entry for active word
  useEffect(() => {
    if (!activeWordId) return;
    if (activeWordId.startsWith('inter-')) {
      const parts = activeWordId.split('-');
      if (parts.length === 3) {
        const vNum = parseInt(parts[1], 10);
        const wIdx = parseInt(parts[2], 10);
        const verseInter = interlinearChapterData?.verses?.[vNum];
        const vObj = chapterData?.verses?.find((v) => v.verseNumber === vNum);
        const words = verseInter?.words || vObj?.interlinearWords || [];
        const w = words[wIdx];
        if (w?.n) {
          const verseRef = `${selectedBook} ${selectedChapter}:${vNum}`;
          fetchLexiconRoot(w.n, verseRef);
        }
      }
    } else if (activeWordId.startsWith('home-inter-')) {
      const parts = activeWordId.split('-');
      if (parts.length === 3) {
        const wIdx = parseInt(parts[2], 10);
        const words = homeInterlinearVerse?.words || [];
        const w = words[wIdx];
        if (w?.n) {
          const verseRef = `${homeStudyReference.book} ${homeStudyReference.chapter}:${homeStudyReference.verse}`;
          fetchLexiconRoot(w.n, verseRef);
        }
      }
    }
  }, [activeWordId, interlinearChapterData, chapterData, homeInterlinearVerse, fetchLexiconRoot, selectedBook, selectedChapter, homeStudyReference]);

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
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((sv) => sv && typeof sv === 'object' && typeof sv.book === 'string')
        : [];
    } catch {
      return [];
    }
  });

  const [isSyncingNotes, setIsSyncingNotes] = useState<boolean>(false);

  const refreshCloudBookmarks = useCallback((userId?: string) => {
    const targetUid = userId || firebaseUser?.uid;
    if (!targetUid || typeof targetUid !== 'string' || targetUid.startsWith('guest')) return;

    setIsSyncingNotes(true);
    getUserBookmarks(targetUid)
      .then((cloudBookmarks) => {
        if (cloudBookmarks && cloudBookmarks.length > 0) {
          setSavedVerses((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const merged = [...safePrev];
            cloudBookmarks.forEach((bm) => {
              const idx = merged.findIndex(
                (sv) =>
                  sv &&
                  (sv.book || '').trim().toLowerCase() === (bm.book || '').trim().toLowerCase() &&
                  Number(sv.chapter) === Number(bm.chapter) &&
                  Number(sv.verse) === Number(bm.verse)
              );
              const cloudNoteHasText = typeof bm.notes === 'string' && bm.notes.trim() !== '';
              if (idx !== -1) {
                const localNoteHasText = typeof merged[idx].notes === 'string' && merged[idx].notes.trim() !== '';
                merged[idx] = { 
                  ...merged[idx], 
                  color: bm.color || merged[idx].color, 
                  notes: cloudNoteHasText 
                    ? bm.notes 
                    : (localNoteHasText ? merged[idx].notes : (bm.notes || '')) 
                };
              } else {
                merged.push({
                  book: bm.book,
                  chapter: Number(bm.chapter),
                  verse: Number(bm.verse),
                  color: bm.color,
                  notes: bm.notes
                });
              }
            });
            try {
              localStorage.setItem('saved_bible_study_verses', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn('Cloud bookmarks refresh notice:', err))
      .finally(() => {
        setTimeout(() => setIsSyncingNotes(false), 500);
      });
  }, [firebaseUser?.uid]);

  // ==========================================
  // DISCIPLINED STUDY UPGRADE (1, 2, 4) STATES
  // ==========================================
  // Feature 1: Audio Playback (TTS)
  const [currentlyReadingVerse, setCurrentlyReadingVerse] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeAudioStream, setActiveAudioStream] = useState<'plain' | 'pers' | 'kjv' | 'bsb' | 'asv' | 'ylt' | 'bbe' | 'chapter' | 'single' | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_playback_speed');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('logosbridge_playback_speed', String(playbackSpeed));
    } catch (e) {
      console.warn('Failed to sync playbackSpeed to localStorage:', e);
    }
  }, [playbackSpeed]);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioSessionRef = useRef<number | null>(0);

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

  const [, setCrossRefUpdateTick] = useState(0);
  useEffect(() => {
    return subscribeToCrossReferenceUpdates(() => {
      setCrossRefUpdateTick((prev) => prev + 1);
    });
  }, []);

  // Feature 2: Theological Reflections & Diary Notes Active Edit State
  const [expandedNoteVerses, setExpandedNoteVerses] = useState<Record<number, boolean>>({});
  const [activeDraftVerse, setActiveDraftVerse] = useState<number | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');
  const [activeDraftVerseSnippet, setActiveDraftVerseSnippet] = useState<string>('');
  const [isCrossRefOpen, setIsCrossRefOpen] = useState<boolean>(false);
  const [crossRefInputText, setCrossRefInputText] = useState<string>('');
  const [attachedCrossRefs, setAttachedCrossRefs] = useState<Array<{ ref: string; text: string }>>([]);
  const [inlineContextRef, setInlineContextRef] = useState<string | null>(null);

  const CROSS_REF_TEXT_LOOKUP: Record<string, string> = {
    'John 1:1': 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    'Col 1:16': 'For by him were all things created, that are in heaven, and that are in earth, visible and invisible, whether they be thrones, or dominions, or principalities, or powers: all things were created by him, and for him:',
    'Colossians 1:16': 'For by him were all things created, that are in heaven, and that are in earth, visible and invisible, whether they be thrones, or dominions, or principalities, or powers: all things were created by him, and for him:',
    'Heb 11:3': 'Through faith we understand that the worlds were framed by the word of God, so that things which are seen were not made of things which do appear.',
    'Hebrews 11:3': 'Through faith we understand that the worlds were framed by the word of God, so that things which are seen were not made of things which do appear.',
    'Ps 33:6': 'By the word of the LORD were the heavens made; and all the host of them by the breath of his mouth.',
    'Psalm 33:6': 'By the word of the LORD were the heavens made; and all the host of them by the breath of his mouth.',
    'Ps 104:30': 'Thou sendest forth thy spirit, they are created: and thou renewest the face of the earth.',
    'Psalm 104:30': 'Thou sendest forth thy spirit, they are created: and thou renewest the face of the earth.',
    'Jer 4:23': 'I beheld the earth, and, lo, it was without form, and void; and the heavens, and they had no light.',
    'Jeremiah 4:23': 'I beheld the earth, and, lo, it was without form, and void; and the heavens, and they had no light.',
    '2 Cor 4:6': 'For God, who commanded the light to shine out of darkness, hath shined in our hearts, to give the light of the knowledge of the glory of God in the face of Jesus Christ.',
    '2 Corinthians 4:6': 'For God, who commanded the light to shine out of darkness, hath shined in our hearts, to give the light of the knowledge of the glory of God in the face of Jesus Christ.',
    'Ps 33:9': 'For he spake, and it was done; he commanded, and it stood fast.',
    'Psalm 33:9': 'For he spake, and it was done; he commanded, and it stood fast.',
    'Col 3:10': 'And have put on the new man, which is renewed in knowledge after the image of him that created him:',
    'Colossians 3:10': 'And have put on the new man, which is renewed in knowledge after the image of him that created him:',
    'Jas 3:9': 'Therewith bless we God, even the Father; and therewith curse we men, which are made after the similitude of God.',
    'James 3:9': 'Therewith bless we God, even the Father; and therewith curse we men, which are made after the similitude of God.',
    'Gen 9:6': 'Whoso sheddeth man\'s blood, by man shall his blood be shed: for in the image of God made he man.',
    'Genesis 9:6': 'Whoso sheddeth man\'s blood, by man shall his blood be shed: for in the image of God made he man.',
    'Matt 19:4': 'And he answered and said unto them, Have ye not read, that he which made them at the beginning made them male and female,',
    'Matthew 19:4': 'And he answered and said unto them, Have ye not read, that he which made them at the beginning made them male and female,',
    'Mark 10:6': 'But from the beginning of the creation God made them male and female.',
    'Gen 1:1': 'In the beginning God created the heaven and the earth.',
    'Genesis 1:1': 'In the beginning God created the heaven and the earth.',
    '1 John 1:1': 'That which was from the beginning, which we have heard, which we have seen with our eyes, which we have looked upon, and our hands have handled, of the Word of life;',
    'Rev 19:13': 'And he was clothed with a vesture dipped in blood: and his name is called The Word of God.',
    'Revelation 19:13': 'And he was clothed with a vesture dipped in blood: and his name is called The Word of God.',
    '1 John 4:2': 'Hereby know ye the Spirit of God: Every spirit that confesseth that Jesus Christ is come in the flesh is of God:',
    'Heb 2:14': 'Forasmuch then as the children are partakers of flesh and blood, he also himself likewise took part of the same; that through death he might destroy him that had the power of death, that is, the devil;',
    'Hebrews 2:14': 'Forasmuch then as the children are partakers of flesh and blood, he also himself likewise took part of the same; that through death he might destroy him that had the power of death, that is, the devil;',
    '1 Tim 3:16': 'And without controversy great is the mystery of godliness: God was manifest in the flesh, justified in the Spirit, seen of angels, preached unto the Gentiles, believed on in the world, received up into glory.',
    '1 Timothy 3:16': 'And without controversy great is the mystery of godliness: God was manifest in the flesh, justified in the Spirit, seen of angels, preached unto the Gentiles, believed on in the world, received up into glory.',
    'Ex 16:4': 'Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.',
    'Exodus 16:4': 'Then said the LORD unto Moses, Behold, I will rain bread from heaven for you; and the people shall go out and gather a certain rate every day, that I may prove them, whether they will walk in my law, or no.',
    'Ps 78:24': 'And had rained down manna upon them to eat, and had given them of the corn of heaven.',
    'Psalm 78:24': 'And had rained down manna upon them to eat, and had given them of the corn of heaven.',
    'Isa 55:1': 'Ho, every one that thirsteth, come ye to the waters, and he that hath no money; come ye, buy, and eat; yea, come, buy wine and milk without money and without price.',
    'Isaiah 55:1': 'Ho, every one that thirsteth, come ye to the waters, and he that hath no money; come ye, buy, and eat; yea, come, buy wine and milk without money and without price.',
    'Rom 8:24': 'For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for?',
    'Romans 8:24': 'For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for?',
    '2 Cor 4:18': 'While we look not at the things which are seen, but at the things which are not seen: for the things which are seen are temporal; but the things which are not seen are eternal.',
    '2 Corinthians 4:18': 'While we look not at the things which are seen, but at the things which are not seen: for the things which are seen are temporal; but the things which are not seen are eternal.',
    'Rom 1:17': 'For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.',
    'Romans 1:17': 'For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.',
    'John 1:3': 'All things were made by him; and without him was not any thing made that was made.',
    'Eph 1:3': 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ:',
    'Ephesians 1:3': 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ:',
    'Rom 8:32': 'He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?',
    'Romans 8:32': 'He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?',
    '1 Tim 6:17': 'Charge them that are rich in this world, that they be not highminded, nor trust in uncertain riches, but in the living God, who giveth us richly all things to enjoy;',
    '1 Timothy 6:17': 'Charge them that are rich in this world, that they be not highminded, nor trust in uncertain riches, but in the living God, who giveth us richly all things to enjoy;',
    'Rom 8:28': 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    'Romans 8:28': 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    'John 3:16': 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    'Heb 11:1': 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    'Hebrews 11:1': 'Now faith is the substance of things hoped for, the evidence of things not seen.',
  };

  const COMMON_CROSS_REFERENCES: Record<string, string[]> = {
    'Genesis 1:1': ['John 1:1', 'Col 1:16', 'Heb 11:3', 'Ps 33:6'],
    'Genesis 1:2': ['Ps 104:30', 'Jer 4:23'],
    'Genesis 1:3': ['2 Cor 4:6', 'Ps 33:9'],
    'Genesis 1:26': ['Col 3:10', 'Jas 3:9', 'Gen 9:6'],
    'Genesis 1:27': ['Matt 19:4', 'Mark 10:6'],
    'John 1:1': ['Gen 1:1', '1 John 1:1', 'Rev 19:13'],
    'John 1:14': ['1 John 4:2', 'Heb 2:14', '1 Tim 3:16'],
    'John 6:35': ['Ex 16:4', 'Ps 78:24', 'Isa 55:1'],
    'Hebrews 11:1': ['Rom 8:24', '2 Cor 4:18', 'Rom 1:17'],
    'Hebrews 11:3': ['Gen 1:1', 'Ps 33:6', 'John 1:3'],
    '2 Peter 1:3': ['Eph 1:3', 'Rom 8:32', '1 Tim 6:17'],
  };

  const attachCrossRef = (refStr: string, keepOpen: boolean = true) => {
    if (!refStr) return;
    const trimmed = refStr.trim();

    // Check if the clicked reference is already active; if so, toggle it off
    const isAlreadyActive = attachedCrossRefs.some((item) => item.ref === trimmed);
    if (isAlreadyActive) {
      setAttachedCrossRefs((prev) => prev.filter((item) => item.ref !== trimmed));
      if (inlineContextRef === trimmed) setInlineContextRef(null);
      playWebAudioBeep(440, 'sine', 0.05);
      return;
    }

    // Append newly selected reference to attached list
    const syncText = getSyncVerseText(trimmed) || CROSS_REF_TEXT_LOOKUP[trimmed] || 'Scripture cross-reference linked.';
    const newEntry = { ref: trimmed, text: syncText };
    setAttachedCrossRefs((prev) => [...prev, newEntry]);
    if (inlineContextRef) setInlineContextRef(null);
    if (activeDraftVerse) {
      addUserCrossReference(selectedBook, selectedChapter, activeDraftVerse, trimmed);
    }

    // Asynchronously resolve authentic verse text if not in fast memory cache
    getVerseTextByReference(trimmed).then((fullText) => {
      if (fullText && fullText !== 'Scripture cross-reference linked.') {
        setAttachedCrossRefs((prev) =>
          prev.map((item) => (item.ref === trimmed ? { ...item, text: fullText } : item))
        );
      }
    });

    if (!keepOpen) {
      setIsCrossRefOpen(false);
    }
    setCrossRefInputText('');
    playWebAudioBeep(520, 'sine', 0.08);

    // Activity Telemetry Tracking: Cross-referencing
    const currentVerseRef = activeDraftVerse ? `${selectedBook} ${selectedChapter}:${activeDraftVerse}` : `${selectedBook} ${selectedChapter}`;
    logUserActivity('explored_cross_reference', `${currentVerseRef} -> ${trimmed}`, `Cross-referenced with ${trimmed}`, 2);
  };

  const removeCrossRef = (refStr?: string) => {
    if (refStr) {
      if (activeDraftVerse) {
        removeUserCrossReference(selectedBook, selectedChapter, activeDraftVerse, refStr);
      }
      setAttachedCrossRefs((prev) => prev.filter((item) => item.ref !== refStr));
      if (inlineContextRef === refStr) setInlineContextRef(null);
    } else {
      setAttachedCrossRefs([]);
      if (inlineContextRef) setInlineContextRef(null);
    }
  };

  const startEditingNote = (verseNum: number, currentNote: string, snippet?: string, openCrossRef: boolean = false) => {
    setActiveDraftVerse(verseNum);
    setNoteDraftText(currentNote);
    setIsCrossRefOpen(openCrossRef);
    setCrossRefInputText('');
    setAttachedCrossRefs([]);
    const matches = Array.from(currentNote.matchAll(/\[cf\.\s*([^\]]+)\]/g));
    if (matches.length > 0) {
      const initialCrossRefs = matches.map((m) => {
        const r = m[1].trim();
        const sText = getSyncVerseText(r) || CROSS_REF_TEXT_LOOKUP[r] || 'Scripture cross-reference linked.';
        return { ref: r, text: sText };
      });
      setAttachedCrossRefs(initialCrossRefs);
      matches.forEach((m) => {
        const r = m[1].trim();
        getVerseTextByReference(r).then((fullText) => {
          if (fullText && fullText !== 'Scripture cross-reference linked.') {
            setAttachedCrossRefs((prev) =>
              prev.map((item) => (item.ref === r ? { ...item, text: fullText } : item))
            );
          }
        });
      });
    }
    if (snippet) {
      setActiveDraftVerseSnippet(snippet);
    } else {
      const vObj = chapterData?.verses?.find((v: any) => v.verseNumber === verseNum);
      setActiveDraftVerseSnippet(vObj?.kjvText || '');
    }
  };

  const handleSaveNote = (verseNum: number) => {
    updateVerseProfileNotes(verseNum, noteDraftText);
    const currentHighlight = getVerseHighlight(verseNum);
    if (!currentHighlight?.color || currentHighlight.color === 'none') {
      setVerseHighlightColor(verseNum, 'amber');
    }
    const savedLength = noteDraftText.length;
    setActiveDraftVerse(null);
    setNoteDraftText('');
    setActiveDraftVerseSnippet('');
    setIsCrossRefOpen(false);
    setCrossRefInputText('');
    setAttachedCrossRefs([]);
    setExpandedNoteVerses({});
    playWebAudioBeep(600, 'sine', 0.1);

    // Activity Telemetry Tracking: Note-taking / Theological Reflection
    logUserActivity('saved_note', `${selectedBook} ${selectedChapter}:${verseNum}`, `Saved reflection (${savedLength} chars)`, 3);
  };

  const handleCancelNote = () => {
    setActiveDraftVerse(null);
    setNoteDraftText('');
    setActiveDraftVerseSnippet('');
    setIsCrossRefOpen(false);
    setCrossRefInputText('');
    setAttachedCrossRefs([]);
    setInlineContextRef(null);
    setExpandedNoteVerses({});
  };


  const [studyShareFeedbackVerse, setStudyShareFeedbackVerse] = useState<number | null>(null);

  const handleStudyShareVerse = async (e: React.MouseEvent | React.TouchEvent, verseNum: number, rawText: string) => {
    e.stopPropagation();
    const refText = `${selectedBook} ${selectedChapter}:${verseNum}`;
    const cleanVerse = stripSuppliedMarkup(rawText);
    const sharePayload = `${refText}\n"${cleanVerse.trim()}"\n\n— Shared via LogosBridge`;

    setStudyShareFeedbackVerse(verseNum);
    const result = await triggerNativeShare({
      title: refText,
      text: sharePayload,
      dialogTitle: `Share ${refText}`,
    });
    if (result !== 'cancelled') {
      setTimeout(() => setStudyShareFeedbackVerse(null), 2000);
    } else {
      setStudyShareFeedbackVerse(null);
    }
  };

  const [activeStudyActionVerse, setActiveStudyActionVerse] = useState<number | null>(null);
  const kjvDoubleTapRef = useRef<{ verseNumber: number; time: number } | null>(null);
  const lastTouchDoubleTapTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const toggleStudyVerseNote = (verseNum: number, notes: string, text: string) => {
    if (activeDraftVerse === verseNum) {
      handleCancelNote();
      setExpandedNoteVerses((prev) => ({ ...prev, [verseNum]: false }));
    } else {
      startEditingNote(verseNum, notes, text, false);
      setExpandedNoteVerses((prev) => ({ ...prev, [verseNum]: true }));
      setIsCrossRefOpen(false);
      logUserActivity('opened_cross_references', `${selectedBook} ${selectedChapter}:${verseNum}`, 'Opened cross-reference exploration panel', 1);
    }
  };

  const handleStudyVerseDoubleTapAction = (verseNum: number) => {
    setActiveStudyActionVerse((prev) => (prev === verseNum ? null : verseNum));
  };

  const handleStudyVerseTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleStudyVerseTouchEnd = (e: React.TouchEvent, verseNum: number, notes: string, text: string) => {
    // Guard: ignore taps on buttons, inputs or reflection box
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, [data-reflection-box="true"]')) {
      touchStartPosRef.current = null;
      return;
    }

    if (touchStartPosRef.current && e.changedTouches.length === 1) {
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
      kjvDoubleTapRef.current &&
      kjvDoubleTapRef.current.verseNumber === verseNum &&
      (now - kjvDoubleTapRef.current.time) < DOUBLE_TAP_DELAY
    ) {
      lastTouchDoubleTapTimeRef.current = now;
      kjvDoubleTapRef.current = null;
      handleStudyVerseDoubleTapAction(verseNum);
    } else {
      kjvDoubleTapRef.current = { verseNumber: verseNum, time: now };
    }
  };

  const handleStudyVerseDoubleClick = (e: React.MouseEvent, verseNum: number, notes: string, text: string) => {
    e.stopPropagation();
    // Guard: ignore double-clicks on buttons or inputs
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, [data-reflection-box="true"]')) {
      return;
    }

    // Ignore synthetic dblclick emitted by touch-enabled mobile browsers following a touch double-tap
    if (Date.now() - lastTouchDoubleTapTimeRef.current < 750) {
      return;
    }
    handleStudyVerseDoubleTapAction(verseNum);
  };

  const VERSE_COLOR_PALETTE = ['green', 'blue', 'red', 'yellow', 'black', 'none'] as const;
  const cycleVerseColor = (verseNum: number | null) => {
    if (!verseNum) return;
    const current = getVerseHighlight(verseNum)?.color || 'none';
    const idx = VERSE_COLOR_PALETTE.indexOf(current as any);
    const next = idx === -1 ? 'green' : VERSE_COLOR_PALETTE[(idx + 1) % VERSE_COLOR_PALETTE.length];
    setVerseHighlightColor(verseNum, next);
  };

  // State for compact in-hover-dropdown diary note editing
  const [verseNotesTextState, setVerseNotesTextState] = useState<Record<number, string>>({});

  // Dynamic 3-Side Sidebar features state
  const [isStudySidebarOpen, setIsStudySidebarOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'audio' | 'notes' | 'bookmarks'>('notes');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState<string>('');



  const [cardActiveShareVerse, setCardActiveShareVerse] = useState<number | null>(null);
  const [cardShareFeedbackVerse, setCardShareFeedbackVerse] = useState<number | null>(null);
  const cardVerseDoubleTapRef = useRef<{ verseNumber: number; time: number } | null>(null);
  const cardTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleShareCardVerse = async (e: React.MouseEvent | React.TouchEvent, v: any) => {
    e.stopPropagation();
    const refText = `${selectedBook || 'Genesis'} ${selectedChapter || 1}:${v.verseNumber}`;
    const cleanVerse = stripSuppliedMarkup(v.kjvText || v.contemporary || v.nonNativeEnglish || '');
    const sharePayload = `${refText}\n"${cleanVerse.trim()}"\n\n— Shared via LogosBridge`;

    setCardShareFeedbackVerse(v.verseNumber);
    const result = await triggerNativeShare({
      title: refText,
      text: sharePayload,
      dialogTitle: `Share ${refText}`,
    });
    if (result !== 'cancelled') {
      setTimeout(() => setCardShareFeedbackVerse(null), 2000);
    } else {
      setCardShareFeedbackVerse(null);
    }
  };

  const handleCardVerseDoubleTap = (v: any) => {
    setCardActiveShareVerse((prev) => (prev === v.verseNumber ? null : v.verseNumber));
    if (activeDraftVerse === v.verseNumber) {
      handleCancelNote();
    } else {
      startEditingNote(v.verseNumber, getVerseHighlight(v.verseNumber)?.notes || '', stripSuppliedMarkup(v.kjvText || v.contemporary || v.nonNativeEnglish || ''));
      setIsCrossRefOpen(false);
    }
  };

  const handleCardVerseTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      cardTouchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleCardVerseTouchEnd = (e: React.TouchEvent, v: any) => {
    if (cardTouchStartPosRef.current && e.changedTouches.length === 1) {
      const dx = Math.abs(e.changedTouches[0].clientX - cardTouchStartPosRef.current.x);
      const dy = Math.abs(e.changedTouches[0].clientY - cardTouchStartPosRef.current.y);
      if (dx > 14 || dy > 14) {
        cardTouchStartPosRef.current = null;
        return;
      }
    }
    cardTouchStartPosRef.current = null;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 450;
    if (
      cardVerseDoubleTapRef.current &&
      cardVerseDoubleTapRef.current.verseNumber === v.verseNumber &&
      (now - cardVerseDoubleTapRef.current.time) < DOUBLE_TAP_DELAY
    ) {
      cardVerseDoubleTapRef.current = null;
      handleCardVerseDoubleTap(v);
    } else {
      cardVerseDoubleTapRef.current = { verseNumber: v.verseNumber, time: now };
    }
  };
  
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

    // Activity Telemetry Tracking: Theological Diary edit
    logUserActivity('saved_note', `${book} ${chapter}:${verse}`, `Edited reflection in Diary (${sidebarDraftText.length} chars)`, 3);
    
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

  // Google-Style Scripture Verse Search State
  const [isVerseSearchOpen, setIsVerseSearchOpen] = useState<boolean>(false);

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



  // Real-time keyboard detection (disables Reader Pill & bottom nav dock while typing)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    // 1. Android native bridge callback
    (window as any).onAndroidKeyboardState = (visible: boolean) => {
      setIsKeyboardOpen(Boolean(visible));
    };

    // 2. Immediate input focus listener (capture phase: catches event before any child stopPropagation)
    const handleFocusIn = (e: Event) => {
      const target = (e.target || e.currentTarget) as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardOpen(true);
      }
    };

    // 3. Input blur listener
    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.isContentEditable)) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    // 4. Visual viewport resize listener (fallback for soft keyboard)
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const active = document.activeElement as HTMLElement;
        const isInputFocused = Boolean(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable));
        const diff = window.innerHeight - window.visualViewport.height;
        // Soft keyboard takes significant screen height (at least 150px and > 20% of screen height) while an input is actively focused
        const isKeyboardShrunk = isInputFocused && diff > Math.max(150, window.innerHeight * 0.2);
        setIsKeyboardOpen(isKeyboardShrunk);
      }
    };

    window.addEventListener('focus', handleFocusIn, true);
    window.addEventListener('blur', handleFocusOut, true);
    window.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('focusout', handleFocusOut, true);
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      delete (window as any).onAndroidKeyboardState;
      window.removeEventListener('focus', handleFocusIn, true);
      window.removeEventListener('blur', handleFocusOut, true);
      window.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('focusout', handleFocusOut, true);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  // Scroll visibility tracking
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);
  const [isSidePanelHidden, setIsSidePanelHidden] = useState<boolean>(false);
  const [isReaderScrolledDown, setIsReaderScrolledDown] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(false);
  const [readPercentage, setReadPercentage] = useState<number>(0);
  const keepNavHiddenFromPillRef = useRef<boolean>(false);
  const syncScrollHiddenStateRef = useRef<(hidden: boolean) => void>(() => {});

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let accumulatedDelta = 0;
    // Track current hidden/bottom state via local vars to avoid calling setState redundantly
    let currentlyHidden = false;
    let currentlyAtBottom = false;
    // Cooldown: after hiding, ignore small scroll-up for this many ms
    let lastHideTimestamp = 0;
    const HIDE_COOLDOWN_MS = 350;
    let lastProgress = -1;
    let touchStartY = 0;

    syncScrollHiddenStateRef.current = (hidden: boolean) => {
      currentlyHidden = hidden;
      lastScrollY = window.scrollY > 0 ? window.scrollY : 0;
      accumulatedDelta = 0;
    };

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-reader-dock="true"], .fixed')) return;
      if (e.deltaY < -4) {
        keepNavHiddenFromPillRef.current = false;
        if (currentlyHidden) {
          currentlyHidden = false;
          setIsHeaderHidden(false);
          setIsSidePanelHidden(false);
          setIsReaderScrolledDown(false);
        }
      }
    };

    const onTouchStartWindow = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-reader-dock="true"], .fixed')) return;
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        // Tapping near the top status bar (top 60px) immediately restores the navbar
        if (touchStartY < 60 && currentlyHidden) {
          currentlyHidden = false;
          keepNavHiddenFromPillRef.current = false;
          setIsHeaderHidden(false);
          setIsSidePanelHidden(false);
          setIsReaderScrolledDown(false);
        }
      }
    };

    const onTouchMoveWindow = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-reader-dock="true"], .fixed')) return;
      if (e.touches.length > 0) {
        const deltaY = e.touches[0].clientY - touchStartY;
        // Finger dragging downward = user scrolling UP (easy restore)
        if (deltaY > 6) {
          keepNavHiddenFromPillRef.current = false;
          if (currentlyHidden) {
            currentlyHidden = false;
            setIsHeaderHidden(false);
            setIsSidePanelHidden(false);
            setIsReaderScrolledDown(false);
          }
        }
      }
    };

    // Single tap on reader text immediately reveals navigation if hidden (standard Kindle / reader pattern)
    const onTapWindow = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('button, a, input, textarea, select, [data-reader-dock="true"], [role="dialog"], .fixed')) return;

      if (currentlyHidden) {
        currentlyHidden = false;
        keepNavHiddenFromPillRef.current = false;
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
        setIsReaderScrolledDown(false);
      }
    };

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      const delta = scrollY - lastScrollY;

      // Reset accumulated delta if direction changes
      if ((delta > 0 && accumulatedDelta < 0) || (delta < 0 && accumulatedDelta > 0)) {
        accumulatedDelta = 0;
      }
      accumulatedDelta += delta;

      const now = Date.now();

      // Always show all navigation at very top
      if (scrollY <= 25) {
        currentlyHidden = false;
        keepNavHiddenFromPillRef.current = false;
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
        setIsReaderScrolledDown(false);
        accumulatedDelta = 0;
      } else if (!currentlyHidden && (accumulatedDelta >= 80 || delta >= 45)) {
        // Scrolling down -> smoothly slide out navigation bar & reader pill
        if (now - lastHideTimestamp > HIDE_COOLDOWN_MS) {
          currentlyHidden = true;
          lastHideTimestamp = now;
          setIsHeaderHidden(true);
          setIsSidePanelHidden(true);
          setIsReaderScrolledDown(true);
        }
        accumulatedDelta = 0;
      } else if (currentlyHidden && (accumulatedDelta <= -16 || delta <= -10)) {
        // Scrolling up → show (gentle upward touch restores navigation immediately)
        if (now - lastHideTimestamp > 100) {
          currentlyHidden = false;
          keepNavHiddenFromPillRef.current = false;
          setIsHeaderHidden(false);
          setIsSidePanelHidden(false);
          setIsReaderScrolledDown(false);
        }
        accumulatedDelta = 0;
      }

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
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStartWindow, { passive: true });
    window.addEventListener("touchmove", onTouchMoveWindow, { passive: true });
    window.addEventListener("click", onTapWindow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStartWindow);
      window.removeEventListener("touchmove", onTouchMoveWindow);
      window.removeEventListener("click", onTapWindow);
    };
  }, []);

  // Ensure header is always visible when switching main views
  useEffect(() => {
    keepNavHiddenFromPillRef.current = false;
    syncScrollHiddenStateRef.current(false);
    setIsHeaderHidden(false);
    setIsSidePanelHidden(false);
  }, [mainView]);

  const bottomNavRef = useRef<HTMLDivElement>(null);
  const [bottomNavHeight, setBottomNavHeight] = useState<number>(74);

  useEffect(() => {
    if (!bottomNavRef.current) return;
    const updateNavHeight = () => {
      if (bottomNavRef.current) {
        const height = Math.ceil(bottomNavRef.current.getBoundingClientRect().height);
        const lastH = (bottomNavRef.current as any).__lastH ?? 0;
        // Only update when height differs by more than 1px to prevent sub-pixel jitter
        if (height > 0 && Math.abs(height - lastH) > 1) {
          (bottomNavRef.current as any).__lastH = height;
          setBottomNavHeight(height);
        }
      }
    };
    updateNavHeight();
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(bottomNavRef.current);
    return () => observer.disconnect();
  }, [mainView]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track last scroll position for dual-stream columns
  const columnLastScrollRef = useRef<number>(0);
  const columnAccumulatedDeltaRef = useRef<number>(0);
  const columnHiddenRef = useRef<boolean>(false);
  const columnAtBottomRef = useRef<boolean>(false);
  const columnLastHideRef = useRef<number>(0);
  const handleColumnScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const lastScroll = columnLastScrollRef.current;

    keepNavHiddenFromPillRef.current = false;

    const delta = scrollTop - lastScroll;
    if ((delta > 0 && columnAccumulatedDeltaRef.current < 0) || (delta < 0 && columnAccumulatedDeltaRef.current > 0)) {
      columnAccumulatedDeltaRef.current = 0;
    }
    columnAccumulatedDeltaRef.current += delta;

    const now = Date.now();

    if (scrollTop <= 20) {
      if (columnHiddenRef.current) {
        columnHiddenRef.current = false;
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
        setIsReaderScrolledDown(false);
      }
      columnAccumulatedDeltaRef.current = 0;
    } else if (!columnHiddenRef.current && (columnAccumulatedDeltaRef.current >= 60 || delta >= 35)) {
      if (now - columnLastHideRef.current > 300) {
        columnHiddenRef.current = true;
        columnLastHideRef.current = now;
        setIsHeaderHidden(true);
        setIsSidePanelHidden(true);
        setIsReaderScrolledDown(true);
      }
      columnAccumulatedDeltaRef.current = 0;
    } else if (columnHiddenRef.current && (columnAccumulatedDeltaRef.current <= -16 || delta <= -10)) {
      if (now - columnLastHideRef.current > 100) {
        columnHiddenRef.current = false;
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
        setIsReaderScrolledDown(false);
      }
      columnAccumulatedDeltaRef.current = 0;
    }
    columnLastScrollRef.current = scrollTop > 0 ? scrollTop : 0;
  };

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
  const handlePrevChapterRight = () => {
    const currentBookObj = booksList.find(b => b.name === selectedBookRight);
    if (!currentBookObj) return;
    if (selectedChapterRight > 1) {
      setSelectedChapterRight(selectedChapterRight - 1);
    } else {
      const bookIndex = booksList.findIndex(b => b.name === selectedBookRight);
      if (bookIndex > 0) {
        const prevBook = booksList[bookIndex - 1];
        setSelectedBookRight(prevBook.name);
        setSelectedChapterRight(prevBook.chapters);
      }
    }
  };
  const handleNextChapterRight = () => {
    const currentBookObj = booksList.find(b => b.name === selectedBookRight);
    if (!currentBookObj) return;
    if (selectedChapterRight < currentBookObj.chapters) {
      setSelectedChapterRight(selectedChapterRight + 1);
    } else {
      const bookIndex = booksList.findIndex(b => b.name === selectedBookRight);
      if (bookIndex < booksList.length - 1) {
        const nextBook = booksList[bookIndex + 1];
        setSelectedBookRight(nextBook.name);
        setSelectedChapterRight(1);
      }
    }
  };
  const handleNextChapter = () => {
    setSlideDirection('forward');
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  const handlePrevChapter = () => {
    setSlideDirection('backward');
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  // Listen to Auth State
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide().catch(() => {});
    }

    const mapSupabaseUser = (sbUser: any) => {
      if (!sbUser) return null;
      return {
        uid: sbUser.id,
        id: sbUser.id,
        email: sbUser.email,
        displayName: sbUser.user_metadata?.display_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0],
        photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
        user_metadata: sbUser.user_metadata,
      };
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = mapSupabaseUser(session?.user);
      setFirebaseUser(user);
      setActiveUserForCrossReferences(user ? user.uid : null);
      if (user) {
        setIsAuthModalOpen(false);
      } else {
        // Only pop out ONCE on initial launch for a brand new user, never on every refresh
        let hasPrompted = false;
        try {
          hasPrompted = localStorage.getItem('logosbridge_auth_prompted_once') === 'true';
        } catch {}

        if (!hasPrompted) {
          setIsAuthModalOpen(true);
          try {
            localStorage.setItem('logosbridge_auth_prompted_once', 'true');
          } catch {}
        } else {
          setIsAuthModalOpen(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = mapSupabaseUser(session?.user);
      setFirebaseUser(user);
      setActiveUserForCrossReferences(user ? user.uid : null);
      if (user) {
        setIsAuthModalOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync profile preferences & saved bookmarks/notes ON LOGIN
  useEffect(() => {
    if (firebaseUser) {
      // Fetch private user-scoped cross-references from cloud
      fetchUserCrossReferencesFromCloud(firebaseUser.uid).then((cloudRefs) => {
        if (cloudRefs) {
          mergeCloudCrossReferences(cloudRefs);
        }
      }).catch(() => {});

      getOrCreateUserProfile(
        firebaseUser.uid, 
        firebaseUser.email || '', 
        firebaseUser.displayName || '',
        firebaseUser.photoURL || undefined
      )
        .then((profile) => {
          if (profile) {
            const localSavedTheme = localStorage.getItem('logosbridge_theme') as 'light' | 'dark' | null;
            if (!localSavedTheme && profile.theme && profile.theme !== theme) {
              setTheme(profile.theme);
            }
            if (profile.scriptureTypeface && ['untitled-serif', 'serif', 'sans', 'mono'].includes(profile.scriptureTypeface)) {
              setScriptureTypefaceSetting(profile.scriptureTypeface as any);
            }
            if (profile.scriptureStyle && ['normal', 'elegant', 'compact', 'classic'].includes(profile.scriptureStyle)) {
              setScriptureTextStyleSetting(profile.scriptureStyle as any);
            }
            if (typeof profile.scriptureZoom === 'number' && profile.scriptureZoom >= 0.5 && profile.scriptureZoom <= 2.5) {
              setScriptureZoom(profile.scriptureZoom);
            }
            if (typeof profile.playbackSpeed === 'number' && profile.playbackSpeed >= 0.5 && profile.playbackSpeed <= 2.0) {
              setPlaybackSpeed(profile.playbackSpeed);
            }
            // Only adopt Firestore cloud position if there is no local session or if Firestore has an initial seed
            const localSavedBook = localStorage.getItem('logosbridge_last_book');
            const localSavedChapter = localStorage.getItem('logosbridge_last_chapter');
            if (!localSavedBook && profile.lastReadBook) {
              setSelectedBook(profile.lastReadBook);
            }
            if (!localSavedChapter && profile.lastReadChapter) {
              setSelectedChapter(profile.lastReadChapter);
            }
            if (profile.lastReadTab && !localStorage.getItem('logosbridge_last_tab')) {
              setMainView(profile.lastReadTab as any);
            }
            if (profile.notebookSettings) {
              try {
                localStorage.setItem('logosbridge_notebook_settings', JSON.stringify(profile.notebookSettings));
              } catch {}
            }
          }
        })
        .catch(console.error);

      refreshCloudBookmarks(firebaseUser.uid);
    }
  }, [firebaseUser, refreshCloudBookmarks]);

  // Realtime subscription for cross-device reflection notes & bookmarks
  useEffect(() => {
    if (!firebaseUser?.uid || firebaseUser.uid.startsWith('guest')) return;

    const unsubscribe = subscribeToUserBookmarks(firebaseUser.uid, (cloudBookmarks) => {
      if (cloudBookmarks && cloudBookmarks.length >= 0) {
        setSavedVerses((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const merged = [...safePrev];
          cloudBookmarks.forEach((bm) => {
            const idx = merged.findIndex(
              (sv) =>
                sv &&
                (sv.book || '').trim().toLowerCase() === (bm.book || '').trim().toLowerCase() &&
                Number(sv.chapter) === Number(bm.chapter) &&
                Number(sv.verse) === Number(bm.verse)
            );
            const cloudNoteHasText = typeof bm.notes === 'string' && bm.notes.trim() !== '';
            if (idx !== -1) {
              const localNoteHasText = typeof merged[idx].notes === 'string' && merged[idx].notes.trim() !== '';
              merged[idx] = { 
                ...merged[idx], 
                color: bm.color || merged[idx].color, 
                notes: cloudNoteHasText 
                  ? bm.notes 
                  : (localNoteHasText ? merged[idx].notes : (bm.notes || '')) 
              };
            } else {
              merged.push({
                book: bm.book,
                chapter: Number(bm.chapter),
                verse: Number(bm.verse),
                color: bm.color,
                notes: bm.notes
              });
            }
          });
          try {
            localStorage.setItem('saved_bible_study_verses', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [firebaseUser?.uid]);

  // Re-sync bookmarks on chapter or book transitions
  useEffect(() => {
    if (firebaseUser?.uid && !firebaseUser.uid.startsWith('guest')) {
      refreshCloudBookmarks(firebaseUser.uid);
    }
  }, [selectedBook, selectedChapter, firebaseUser?.uid, refreshCloudBookmarks]);

  // Synchronise preferences back to user profile when changed
  useEffect(() => {
    if (firebaseUser) {
      updateUserProfile(firebaseUser.uid, { 
        theme,
        scriptureTypeface: scriptureTypefaceSetting,
        scriptureStyle: scriptureTextStyleSetting,
        scriptureZoom,
        playbackSpeed
      }).catch(console.error);
    }
  }, [theme, scriptureTypefaceSetting, scriptureTextStyleSetting, scriptureZoom, playbackSpeed, firebaseUser]);

  useEffect(() => {
    if (firebaseUser) {
      updateUserProfile(firebaseUser.uid, {
        lastReadBook: selectedBook,
        lastReadChapter: selectedChapter,
        lastReadTab: mainView
      }).catch(console.error);
    }
  }, [selectedBook, selectedChapter, mainView, firebaseUser]);

  // Native app lifecycle listeners to guarantee state is saved on cold close or switch
  useEffect(() => {
    const getVisibleVerseNumber = (): number => {
      if (activeDraftVerse) return activeDraftVerse;
      const verseElements = document.querySelectorAll('[data-verse-number]');
      let bestVerse = 1;
      let minDistance = Infinity;
      const headerOffset = 90;

      verseElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > headerOffset && rect.top < window.innerHeight) {
          const dist = Math.abs(rect.top - headerOffset);
          if (dist < minDistance) {
            minDistance = dist;
            const vNum = parseInt(el.getAttribute('data-verse-number') || '', 10);
            if (!isNaN(vNum) && vNum > 0) {
              bestVerse = vNum;
            }
          }
        }
      });
      return bestVerse;
    };

    const handleSaveState = () => {
      try {
        localStorage.setItem('logosbridge_last_book', selectedBook);
        localStorage.setItem('logosbridge_last_chapter', String(selectedChapter));
        localStorage.setItem('logosbridge_last_tab', mainView);
        const vNum = getVisibleVerseNumber();
        if (vNum > 0) {
          localStorage.setItem('logosbridge_last_verse', String(vNum));
        }
      } catch {}
    };

    const restoreSavedVerse = () => {
      try {
        const savedVerse = parseInt(localStorage.getItem('logosbridge_last_verse') || '1', 10);
        if (savedVerse > 1 && (mainView === 'read' || mainView === 'interlinear')) {
          const el = document.getElementById(`narrative-verse-kjv-${savedVerse}`) ||
                     document.getElementById(`narrative-verse-plain-${savedVerse}`) ||
                     document.getElementById(`verse-row-${savedVerse}`) ||
                     document.querySelector(`[data-verse-number="${savedVerse}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        }
      } catch {}
    };

    window.addEventListener('pagehide', handleSaveState);
    window.addEventListener('beforeunload', handleSaveState);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveState();
      } else if (document.visibilityState === 'visible') {
        restoreSavedVerse();
        refreshCloudBookmarks();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleFocus = () => refreshCloudBookmarks();
    const handleOnline = () => refreshCloudBookmarks();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    let capListener: any = null;
    import('@capacitor/app').then(({ App }) => {
      capListener = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          handleSaveState();
        } else {
          restoreSavedVerse();
          refreshCloudBookmarks();
        }
      });
    }).catch(() => {});

    return () => {
      window.removeEventListener('pagehide', handleSaveState);
      window.removeEventListener('beforeunload', handleSaveState);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      if (capListener && capListener.remove) capListener.remove();
    };
  }, [selectedBook, selectedChapter, mainView, activeDraftVerse, refreshCloudBookmarks]);

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
        const strongsMatch = selectedWord.explanation?.match(/Strong['’]s\s*([HhGg]\d+)/i);
        if (strongsMatch) {
          strongs = strongsMatch[1].toUpperCase();
        }
        let definition = `Lexical Details: [Language: ${selectedWord.language} | Strong's: ${strongs} | Original: ${selectedWord.originalValue}] - Meaning: Original manuscript root for "${selectedWord.word}".`;
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

  // Main chapter loader checking local offline sources before network
  const loadChapter = async (book: string, chapter: number, targetCol: 'left'|'right' = 'left') => {
    // Record current book/chapter state to discard stale network threads
    activeChapterRef.current = { book, chapter };
    
    setApiError(null);
    setFocusedVerse(null);
    setStudyResponse(null);
    setStudyQuery('');
    setIsBackgroundFetching(false);

    const normBook = normalizeBookName(book);
    const cacheKey = `offline_bible_v5_${normBook}_${chapter}`;
    
    // 1. Prioritize curated static academic chapters
    if (STATIC_CHAPTERS[normBook] && STATIC_CHAPTERS[normBook][chapter]) {
      let staticData = STATIC_CHAPTERS[normBook][chapter];
      try {
        const bundled = await getBundledKjvChapter(normBook, chapter);
        if (bundled && bundled.verses) {
          staticData = {
            ...staticData,
            verses: staticData.verses.map((sv, idx) => ({
              ...sv,
              kjvText: bundled.verses[idx]?.kjvText || sv.kjvText
            }))
          };
          if (bundled.verses.length > staticData.verses.length) {
            const missingVerses = bundled.verses.slice(staticData.verses.length);
            staticData.verses.push(...missingVerses);
          }
        }
      } catch (e) {
        console.warn('Bundled backfill check:', e);
      }

      (targetCol === 'left' ? setChapterData : setChapterDataRight)(staticData);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(staticData));
      } catch (e) {
        console.warn('Failed to write master static chapter to cache:', e);
      }
      setLoading(false);
      return;
    }

    // 2. Check IndexedDB offline cache & bundled dataset
    try {
      const offlineData = await getOfflineChapter(normBook, chapter);
      if (offlineData && offlineData.verses && offlineData.verses.length > 0) {
        (targetCol === 'left' ? setChapterData : setChapterDataRight)(offlineData);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Offline storage read fallback:', e);
    }

    // 3. Try to read from localStorage cache
    let cachedParsed: any = null;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.verses && parsed.verses.length > 0) {
          cachedParsed = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached chapter:', e);
    }

    // If cached version exists, serve immediately
    if (cachedParsed) {
      (targetCol === 'left' ? setChapterData : setChapterDataRight)(cachedParsed);
      setLoading(false);
      return;
    }

    // 4. Background network fetch fallback if online
    setIsBackgroundFetching(true);
    if (!chapterData) {
      setLoading(true);
    }



    try {
      // 4b. Local Dev / Backend REST API
      const res = await fetch(`/api/bible-chapter?book=${encodeURIComponent(normBook)}&chapter=${chapter}`);
      if (res.ok) {
        const responseData = await res.json();
        if (activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
          if (responseData.success && responseData.data) {
            (targetCol === 'left' ? setChapterData : setChapterDataRight)(responseData.data);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(responseData.data));
              await saveOfflineChapter(normBook, chapter, responseData.data);
            } catch (e) {}
            setLoading(false);
            return;
          }
        }
      }
    } catch (apiErr) {
      console.warn('REST API fetch bypassed, querying direct bundled/CDN fallback:', apiErr);
    }

    // 4c. Direct Bundled Dataset final guarantee
    try {
      const bundledFallback = await getBundledKjvChapter(normBook, chapter);
      if (bundledFallback && bundledFallback.verses && bundledFallback.verses.length > 0) {
        if (activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
          (targetCol === 'left' ? setChapterData : setChapterDataRight)(bundledFallback);
          await saveOfflineChapter(normBook, chapter, bundledFallback);
          setLoading(false);
          return;
        }
      }
    } catch (bundledErr) {
      console.warn('Bundled KJV final fallback failed:', bundledErr);
    }

    // 4d. If all failed, ensure non-crashing empty array state
    if (activeChapterRef.current.book === book && activeChapterRef.current.chapter === chapter) {
      const fallbackData = cachedParsed || { book: normBook, chapter, verses: [], isHighFidelity: false };
      (targetCol === 'left' ? setChapterData : setChapterDataRight)(fallbackData);
      setLoading(false);
      setIsBackgroundFetching(false);
    }
  };

  // Ultra-fast Bulk Downloader for full translation (Complete 66 books, 1,189 chapters)
  const handleDownloadTranslation = async (transId: string = 'kjv') => {
    if (isDownloadingKjv || isKjvOffline) return;
    setIsDownloadingKjv(true);
    setDownloadProgress(20);

    try {
      // 1. Fetch bundled translation dataset (~50ms)
      const dataset = await loadBundledKjvDataset();
      setDownloadProgress(75);

      // 2. Mark offline and persist immediately so UI instantly transitions to Downloaded
      localStorage.setItem('offline_kjv', 'true');
      setIsKjvOffline(true);
      setDownloadProgress(100);

      // 3. Persist bulk chapters into IndexedDB in background
      if (dataset && Object.keys(dataset).length > 0) {
        saveOfflineBibleBulk(dataset).catch((err) => {
          console.warn('[Offline Sync] Background save notice:', err);
        });
      }
    } catch (err) {
      console.warn('Bulk offline download fallback notice:', err);
      localStorage.setItem('offline_kjv', 'true');
      setIsKjvOffline(true);
    } finally {
      setIsDownloadingKjv(false);
      setDownloadProgress(0);
    }
  };

  // Preload complete offline KJV dataset & Strong's Macro/Micro study DB in background (deferred for instant startup)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBundledKjvDataset()
        .then((data) => {
          if (data && Object.keys(data).length > 0) {
            setKjvDatasetLoaded(true);
            setIsKjvOffline(true);
            try {
              localStorage.setItem('offline_kjv', 'true');
            } catch (e) {
              console.warn('LocalStorage save failed:', e);
            }
          }
        })
        .catch(() => {});
      getLoadedStrongsDb()
        .then((db) => {
          if (db) setStrongsStudyDb(db);
        })
        .catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Trigger chapter load when book or chapter changes
  useEffect(() => {
    loadChapter(selectedBook, selectedChapter);
    setCurrentVersePage(0);

    if (isInitialChapterLoadRef.current) {
      isInitialChapterLoadRef.current = false;
      const savedVerse = parseInt(localStorage.getItem('logosbridge_last_verse') || '1', 10);
      if (savedVerse > 1) {
        const tryScroll = (attempts = 0) => {
          const el = document.getElementById(`narrative-verse-kjv-${savedVerse}`) ||
                     document.getElementById(`narrative-verse-plain-${savedVerse}`) ||
                     document.getElementById(`verse-row-${savedVerse}`) ||
                     document.querySelector(`[data-verse-number="${savedVerse}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          } else if (attempts < 6) {
            setTimeout(() => tryScroll(attempts + 1), 100);
          }
        };
        setTimeout(() => tryScroll(0), 50);
        return;
      }
    }

    // User explicitly navigated to a different chapter/book
    safeLocalStorageSet('logosbridge_last_verse', '1');
    // Instant viewport reset to top of chapter (verse 1)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedBook, selectedChapter]);

  // Preload interlinear chapter data whenever selectedBook or selectedChapter changes
  useEffect(() => {
    let cancelled = false;
    getOfflineManuscriptChapter(selectedBook, selectedChapter)
      .then((data) => {
        if (!cancelled && data) {
          setInterlinearChapterData(data);
        }
      })
      .catch(console.warn);

    // Keep home study card aligned with active scripture
    setHomeStudyReference({ book: selectedBook, chapter: selectedChapter, verse: 1 });

    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter]);

  // Load home study card manuscript verse and KJV text
  useEffect(() => {
    let cancelled = false;
    getOfflineManuscriptVerse(homeStudyReference.book, homeStudyReference.chapter, homeStudyReference.verse)
      .then((res) => {
        if (!cancelled && res) {
          setHomeInterlinearVerse(res);
        }
      })
      .catch(console.warn);

    getVerseTextByReference(`${homeStudyReference.book} ${homeStudyReference.chapter}:${homeStudyReference.verse}`)
      .then((txt) => {
        if (!cancelled && txt) {
          setHomeKjvVerseText(txt);
        }
      })
      .catch(console.warn);

    return () => {
      cancelled = true;
    };
  }, [homeStudyReference]);

  // Keep saved verses synchronized safely
  useEffect(() => {
    try {
      localStorage.setItem('saved_bible_study_verses', JSON.stringify(savedVerses));
    } catch (e) {
      console.warn('LocalStorage save bypassed (quota exceeded):', e);
    }
  }, [savedVerses]);

  // Click away to dismiss highlighted word explanations and dropdowns
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Dismiss active word details
      setActiveWordId(null);
      setSelectedWord(null);
      // Dismiss focused verse popups when clicking empty space
      setFocusedVerse(null);
      setFocusedStreamType(null);
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
      logUserActivity('saved_verse', `${selectedBook} ${selectedChapter}:${verseNum}`, 'Bookmarked verse in Scripture scroll', 1);
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
        (sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
      );
      if (exists) {
        return safePrev.map((sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
            ? { ...sv, color }
            : sv
        );
      } else {
        return [
          ...safePrev,
          { book: bName, chapter: chNum, verse: vNum, color },
        ];
      }
    });

    // Activity Telemetry Tracking: Verse Highlighting
    logUserActivity('highlighted_verse', `${bName} ${chNum}:${vNum}`, `Highlight color: ${color}`, 2);

    if (firebaseUser) {
      const safeList = (Array.isArray(savedVerses) ? savedVerses : []).filter(
        (sv) => sv && typeof sv === 'object' && typeof sv.book === 'string'
      );
      const existing = safeList.find(
        (sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${bName}_${chNum}_${vNum}`,
        book: bName,
        chapter: chNum,
        verse: vNum,
        color: color as any,
        notes: existing ? existing.notes : ''
      }).catch((err) => console.warn('Firebase bookmark save bypassed:', err));
    }
  };

  const updateVerseProfileNotes = (verseNum: number, notes: string) => {
    const vNum = Number(verseNum);
    const chNum = Number(selectedChapter);
    const bName = (selectedBook || '').trim();
    const bNameLower = bName.toLowerCase();

    setSavedVerses((prev) => {
      const safePrev = (Array.isArray(prev) ? prev : []).filter(
        (sv) => sv && typeof sv === 'object' && typeof sv.book === 'string'
      );
      const exists = safePrev.some(
        (sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
      );
      if (exists) {
        return safePrev.map((sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
            ? { ...sv, notes }
            : sv
        );
      } else {
        return [
          ...safePrev,
          { book: bName, chapter: chNum, verse: vNum, notes },
        ];
      }
    });

    if (firebaseUser) {
      const safeList = (Array.isArray(savedVerses) ? savedVerses : []).filter(
        (sv) => sv && typeof sv === 'object' && typeof sv.book === 'string'
      );
      const existing = safeList.find(
        (sv) =>
          sv.book.trim().toLowerCase() === bNameLower &&
          Number(sv.chapter) === chNum &&
          Number(sv.verse) === vNum
      );
      saveUserBookmark(firebaseUser.uid, {
        id: `${bName}_${chNum}_${vNum}`,
        book: bName,
        chapter: chNum,
        verse: vNum,
        color: (existing?.color as any) || 'amber',
        notes: notes
      }).catch((err) => console.warn('Firebase bookmark note save bypassed:', err));
    }
  };

  // ==========================================
  // DISCIPLINED STUDY UPGRADE (1, 2, 4) HANDLERS
  // ==========================================

  // Feature 1: Audio Playback (TTS)
  const stopSpeaking = async () => {
    activeAudioSessionRef.current = null;
    setIsPlayingAudio(false);
    setActiveAudioStream(null);
    setCurrentlyReadingVerse(null);
    
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      try {
        await TextToSpeech.stop();
      } catch (e) {
        console.warn('Native TTS stop failed:', e);
      }
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
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



    return v.kjvText || '';
  };

  const playTranslationStream = (transType: string = 'kjv') => {
    if (!chapterData) return;
    stopSpeaking();
    
    const activeVerses = [...chapterData.verses];
    let currentIndex = 0;
    activeAudioSessionRef.current = Date.now();
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
      setActiveAudioStream(transType);

      const text = v.kjvText || '';
      const utteranceText = `Verse ${v.verseNumber}, ${text}`;

      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        TextToSpeech.speak({
          text: utteranceText,
          lang: 'en-US',
          rate: playbackSpeed,
          pitch: 1.0,
          category: 'playback'
        }).then(() => {
          if (sessionId !== activeAudioSessionRef.current) return;
          currentIndex++;
          playNext();
        }).catch((e) => {
          console.warn('Native TTS speak failed:', e);
          if (sessionId !== activeAudioSessionRef.current) return;
          currentIndex++;
          playNext();
        });
      } else {
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

        if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
          window.speechSynthesis.resume();
        }
        synthRef.current?.speak(utterance);
      }
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

  const isBottomControlsHidden = Boolean(
    mainView === 'home' ||
    mainView === 'live' ||
    !!fullPageMenu ||
    isStrongsModalOpen ||
    isParsingModalOpen ||
    isKeyboardOpen ||
    activeDraftVerse !== null
  );

  return (
    <div className={`min-h-screen ${
      mainView === 'home'
        ? (theme === 'light' ? 'bg-[#e6ebf0] text-[#0b111e]' : 'bg-[#191512] text-[#faf6f0]')
        : mainView === 'interlinear'
        ? (theme === 'light' ? 'bg-[#ffffff] text-[#1e293b]' : 'bg-[#191512] text-[#faf6f0]')
        : (theme === 'light' ? 'bg-[#ffffff] text-zinc-900' : 'bg-[#191512] text-[#faf6f0]')
    } flex flex-col font-sans relative overflow-x-clip selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-[#342b25] dark:selection:text-[#faf6f0] transition-colors duration-300`}>
      {/* Refined subtle backdrop */}
      {mainView !== 'home' && !(mainView === 'read' && theme === 'light') && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent dark:from-zinc-900/20 pointer-events-none" />
      )}
      {mainView !== 'live' && mainView !== 'home' && !(mainView === 'read' && theme === 'light') && (
        <div className={`absolute top-0 left-0 w-full h-[2px] ${theme === 'light' ? 'bg-zinc-200' : 'bg-[#382e27]'} z-50`} />
      )}

      {/* FIXED NAV BAR (COLLAPSIBLE & STICKY) */}
      <AnimatePresence initial={false}>
        {mainView !== 'home' && mainView !== 'live' && !isHeaderCollapsed && !fullPageMenu && (
          <motion.header
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full ${
              mainView === 'interlinear'
                ? (theme === 'light' ? 'bg-white/95 backdrop-blur-md border-zinc-200/80 shadow-xs' : 'bg-[#1e1916]/95 backdrop-blur-md border-[#382e27] shadow-xs')
                : (theme === 'light' ? 'bg-white/95 backdrop-blur-md border-zinc-200/80 shadow-xs' : 'bg-[#1e1916]/95 backdrop-blur-md border-[#382e27] shadow-xs')
            } border-b px-3.5 pt-1 sm:pt-1.5 pb-0 z-40 sticky top-0 transition-[transform,opacity] duration-250 ease-out ${isHeaderHidden ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
          >
            <div className="max-w-7xl mx-auto flex flex-row items-end justify-between">
              
              {/* TOP LEFT: Book & Chapter Header - stationary, compact, sitting directly on bottom border */}
              <div 
                className={`text-sm sm:text-base font-serif font-bold tracking-tight px-0.5 select-none leading-none pb-0.5 ${theme === 'light' ? 'text-zinc-800' : 'text-[#faf6f0]'}`}
              >
                {selectedBook} {selectedChapter}
              </div>
              
              {/* TOP RIGHT: Library & Settings Controls - sitting directly on bottom border */}
              <div className="flex items-end gap-1 pb-0">
                <button
                  onClick={() => {
                    setFullPageMenu('versions');
                    playWebAudioBeep(440, 'sine', 0.05);
                  }}
                  className={`pt-1.5 px-1.5 pb-0.5 rounded-t-lg transition-all hover:scale-105 active:scale-95 group flex items-center justify-center cursor-pointer ${theme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'}`}
                  title="Library (Highlight Colors)"
                >
                  {/* Compact 4-Color Verse Highlighting Library Icon (Amber Gold, Blue, Red, Green) */}
                  <svg className="w-4.5 h-4.5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none">
                    {/* Book 1 - Amber Gold (#f59e0b) - high contrast against blue */}
                    <path d="M4 19.5v-14A1.5 1.5 0 0 1 5.5 4H7v15.5H5.5A1.5 1.5 0 0 0 4 19.5z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
                    {/* Book 2 - Azure Blue (#2563eb) */}
                    <path d="M8 19.5v-15A1.5 1.5 0 0 1 9.5 3H11v16.5H9.5A1.5 1.5 0 0 0 8 19.5z" fill="#2563eb" stroke="#2563eb" strokeWidth="1.2" strokeLinejoin="round" />
                    {/* Book 3 - Crimson Red (#ef4444) */}
                    <path d="M12 19.5v-14A1.5 1.5 0 0 1 13.5 4H15v15.5h-1.5A1.5 1.5 0 0 0 12 19.5z" fill="#ef4444" stroke="#ef4444" strokeWidth="1.2" strokeLinejoin="round" />
                    {/* Book 4 - Vibrant Leaf Green (#16a34a) slightly leaned */}
                    <path d="M16 19.5l2-13.5A1.5 1.5 0 0 1 19.5 4.5l1.5.2-2 14.8h-1.5A1.5 1.5 0 0 0 16 19.5z" fill="#16a34a" stroke="#16a34a" strokeWidth="1.2" strokeLinejoin="round" />
                    {/* Base Shelf Line */}
                    <line x1="3" y1="21.5" x2="21" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400 dark:text-slate-500" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setIsVerseSearchOpen(true);
                    playWebAudioBeep(520, 'sine', 0.05);
                  }}
                  className={`pt-1.5 px-1.5 pb-0.5 rounded-t-lg transition-all hover:scale-105 active:scale-95 group flex items-center justify-center cursor-pointer ${
                    theme === 'light' ? 'text-black hover:bg-zinc-100' : 'text-white hover:bg-zinc-800'
                  }`}
                  title="Search Scripture"
                >
                  <Search className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${theme === 'light' ? 'text-black' : 'text-white'}`} />
                </button>
                <button
                  onClick={() => {
                    setFullPageMenu('settings');
                    playWebAudioBeep(440, 'sine', 0.05);
                  }}
                  className={`pt-1.5 px-1.5 pb-0.5 rounded-t-lg transition-all hover:scale-105 active:scale-95 group flex items-center justify-center cursor-pointer ${
                    theme === 'light' ? 'text-black hover:bg-zinc-100' : 'text-white hover:bg-zinc-800'
                  }`}
                  title="Settings"
                >
                  <Settings className={`w-4.5 h-4.5 transition-transform group-hover:rotate-90 ${theme === 'light' ? 'text-black' : 'text-white'}`} />
                </button>
              </div>

            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 🛡️ PERMANENT FROZEN ARCHITECTURE COMPONENT: UnifiedReaderDock */}
      <UnifiedReaderDock
        theme={theme}
        mainView={mainView}
        isReaderScrolledDown={isReaderScrolledDown}
        isKeyboardOpen={isKeyboardOpen}
        activeDraftVerse={activeDraftVerse}
        isBottomControlsHidden={isBottomControlsHidden}
        bottomNavHeight={bottomNavHeight}
        bottomNavRef={bottomNavRef}
        selectedBook={selectedBook}
        selectedChapter={selectedChapter}
        isPlayingAudio={isPlayingAudio}
        fullPageMenu={fullPageMenu}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onOpenBookPicker={() => {
          setExpandedBook(selectedBook);
          setIsBookDropdownOpen(true);
          setIsChapterDropdownOpen(false);
        }}
        onToggleAudio={() => {
          if (isPlayingAudio) {
            stopSpeaking();
          } else {
            playTranslationStream(mainView === 'interlinear' ? (interlinearThirdLine as any || 'kjv') : 'kjv');
          }
        }}
        onOpenTranslationPicker={() => setFullPageMenu('versions')}
        onSelectTab={(tab) => {
          setFullPageMenu(null);
          setIsReaderScrolledDown(false);
          if (tab === 'home') {
            lastActiveTabRef.current = 'home';
            setPreviousMainView('home');
            setMainView('home');
          } else if (tab === 'read') {
            lastActiveTabRef.current = 'read';
            setPreviousMainView('read');
            setMainView('read');
          } else if (tab === 'interlinear') {
            lastActiveTabRef.current = 'interlinear';
            setPreviousMainView('interlinear');
            setMainView('interlinear');
          } else if (tab === 'live') {
            if (mainView !== 'live') {
              lastActiveTabRef.current = mainView;
              setPreviousMainView(mainView);
            }
            setIsLiveStudioActive(true);
            setIsLiveStudioMinimized(false);
            setMainView('live');
          }
        }}
      />



      {/* Invisible Viewport Bounds Container for Drag Constraints */}
      <div ref={miniStudioBoundsRef} className="fixed inset-3 pointer-events-none z-[1099]" />

      {/* FLOATING LIVE STUDIO MINI-PLAYER PIP WIDGET (When Minimized) */}
      {isLiveStudioActive && isLiveStudioMinimized && mainView !== 'live' && (
        <motion.div
          drag
          dragConstraints={miniStudioBoundsRef}
          dragElastic={0.08}
          dragMomentum={false}
          whileDrag={{ scale: 1.05, boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.7)' }}
          className="fixed bottom-24 right-4 z-[1100] flex items-center gap-2 py-2 px-3.5 bg-[#241e1a]/95 backdrop-blur-2xl border border-[#483a30] rounded-full shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none"
          title="Drag to position anywhere on screen"
        >
          <GripVertical className="w-3.5 h-3.5 text-[#a89a8c] opacity-60 flex-shrink-0" />
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs font-bold text-[#faf6f0] font-mono tracking-wider select-none pr-1">LIVE STUDIO</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLiveStudioMinimized(false);
              setMainView('live');
            }}
            className="p-1.5 rounded-full bg-[#342b25] text-[#faf6f0] hover:bg-[#3f342d] border border-[#483a30] active:scale-95 transition-all shadow-sm cursor-pointer ml-0.5"
            title="Restore Full Live Studio"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* FULL PAGE MENU MODAL */}
      <AnimatePresence>
        {fullPageMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
            className={`fixed inset-0 z-[800] flex flex-col overflow-hidden ${theme === 'light' ? 'bg-[#fafafa] text-zinc-900' : 'bg-[#191512] text-[#faf6f0]'}`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-3 sm:p-4 border-b ${theme === 'light' ? 'border-zinc-200 bg-white/80' : 'border-[#382e27] bg-[#1e1916]/90'} backdrop-blur-md sticky top-0 z-10`}>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setFullPageMenu(null)}
                  className={`flex items-center justify-center w-8.5 h-8.5 rounded-xl transition-all ${theme === 'light' ? 'bg-zinc-100 hover:bg-zinc-200 text-black' : 'bg-[#28211c] hover:bg-[#342b25] text-[#faf6f0]'}`}
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>
                {fullPageMenu === 'versions' && (
                  <h2 className={`text-base sm:text-lg font-bold font-display tracking-tight capitalize ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                    Library
                  </h2>
                )}

              </div>
            </div>

            {/* Modal Body - Premium Compact Layout */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex justify-center pb-24">
              <div className="w-full max-w-lg flex flex-col space-y-3.5">
                
                {fullPageMenu === 'settings' && (
                  <div className="flex flex-col space-y-3">
                    {/* User Account Showcase - Repositioned to Top-Center with Synced label directly beneath avatar */}
                    <div 
                      onClick={() => setIsAuthModalOpen(true)}
                      className={`cursor-pointer py-4 px-2 flex flex-col items-center justify-center text-center transition-all border-b ${theme === 'light' ? 'border-zinc-200/80' : 'border-[#382e27]'}`}
                    >
                      {/* Profile Picture at Top Center */}
                      <div className="relative mb-1.5">
                        {userAvatar ? (
                          <img src={userAvatar} alt="Avatar" className={`w-16 h-16 rounded-2xl object-cover border-2 shadow-xs ${theme === 'light' ? 'border-black' : 'border-[#faf6f0]'}`} />
                        ) : firebaseUser ? (
                          <div className={`w-16 h-16 rounded-2xl font-black text-xl flex items-center justify-center shadow-xs ${theme === 'light' ? 'bg-black text-white' : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30]'}`}>
                            {(firebaseUser.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                          </div>
                        ) : (
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold ${theme === 'light' ? 'bg-zinc-100 text-zinc-800 border border-zinc-300' : 'bg-[#241e1a] text-[#dcd3c6] border border-[#382e27]'}`}>
                            <User className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      {/* Synced Label directly beneath profile picture */}
                      {firebaseUser && (
                        <div className={`mb-1.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold tracking-wide ${theme === 'light' ? 'bg-zinc-100 text-zinc-700 border border-zinc-300' : 'bg-[#28211c] text-[#dcd3c6] border border-[#382e27]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-black' : 'bg-[#faf6f0]'}`} />
                          <span>Synced</span>
                        </div>
                      )}

                      {/* User Name & Email */}
                      <div className="flex flex-col items-center">
                        <span className={`text-sm sm:text-base font-bold ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          {firebaseUser ? (firebaseUser.displayName || 'LogosBridge Reader') : 'Sign In / Create Account'}
                        </span>
                        {firebaseUser?.email && (
                          <span className={`text-xs mt-0.5 ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`}>
                            {firebaseUser.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Font Section - Pure Monochrome & Sleek Warm-Brown */}
                    <div className={`flex flex-col space-y-2.5 px-1 border-b pb-3 ${theme === 'light' ? 'border-zinc-200/80' : 'border-[#382e27]'}`}>
                      <div className="flex items-center justify-between pb-0.5">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          Font
                        </h3>
                        <span className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          {Math.round((scriptureZoom || 1.6) * 100)}%
                        </span>
                      </div>

                      {/* Boxed Scripture Preview - Warm Obsidian Container */}
                      <div className={`p-3 rounded-xl border transition-all duration-200 ${theme === 'light' ? 'border-zinc-200 bg-zinc-50/70' : 'border-[#382e27] bg-[#241e1a]'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`}>
                            Scripture Preview
                          </span>
                          <span className={`text-[10.5px] font-semibold capitalize ${theme === 'light' ? 'text-zinc-600' : 'text-[#dcd3c6]'}`}>
                            {String(scriptureTypefaceSetting || 'untitled-serif').replace(/-/g, ' ')} {isScriptureBold ? '• Bold' : ''} {isScriptureItalic ? '• Italic' : ''}
                          </span>
                        </div>
                        <p 
                          className={`transition-all duration-200 leading-snug ${
                            scriptureTypefaceSetting === 'untitled-serif'
                              ? 'font-untitled'
                              : scriptureTypefaceSetting === 'serif'
                              ? 'font-serif'
                              : scriptureTypefaceSetting === 'mono'
                              ? 'font-mono'
                              : 'font-sans'
                          } ${
                            isScriptureBold ? 'font-bold' : 'font-normal'
                          } ${
                            isScriptureItalic ? 'gentle-italic' : 'not-italic'
                          } ${
                            theme === 'light' ? 'text-black' : 'text-[#faf6f0]'
                          }`}
                          style={{ fontSize: `${Math.round(16 * (scriptureZoom || 1.6))}px`, lineHeight: 1.5 }}
                        >
                          In the beginning God created the heaven and the earth.
                        </p>
                      </div>

                      {/* Compact Font Style Selector - High Contrast */}
                      <div className="space-y-0.5 pt-0.5">
                        <div className={`text-[10.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`}>
                          Font Style
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                          {[
                            { id: 'untitled-serif', label: 'Untitled Serif', fontClass: 'font-untitled' },
                            { id: 'serif', label: 'Serif', fontClass: 'font-serif' },
                            { id: 'sans', label: 'Sans', fontClass: 'font-sans' },
                            { id: 'mono', label: 'Mono', fontClass: 'font-mono' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setScriptureTypefaceSetting(item.id as any);
                                localStorage.setItem('logosbridge_scripture_typeface', item.id);
                                window.dispatchEvent(new CustomEvent('logosbridge_typeface_changed', { detail: item.id }));
                              }}
                              className={`py-1 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                scriptureTypefaceSetting === item.id
                                  ? (theme === 'light' ? 'text-black font-black underline underline-offset-4 decoration-2' : 'text-[#faf6f0] font-black underline underline-offset-4 decoration-2')
                                  : (theme === 'light' ? 'text-zinc-500 hover:text-black' : 'text-[#dcd3c6] hover:text-[#faf6f0]')
                              }`}
                            >
                              <span className={`text-sm ${item.fontClass}`}>Aa</span>
                              <span className="truncate text-[10px] sm:text-[11px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Compact Bold Switch Row */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isScriptureBold;
                          setIsScriptureBold(next);
                          try {
                            localStorage.setItem('logosbridge_scripture_bold', String(next));
                            window.dispatchEvent(new CustomEvent('logosbridge_bold_changed', { detail: next }));
                          } catch (err) {
                            console.warn('Bold localStorage save failed:', err);
                          }
                        }}
                        className="cursor-pointer py-1.5 flex items-center justify-between transition-all"
                      >
                        <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          Bold
                        </span>
                        {/* Compact Material 3 Sphere Toggle Indicator */}
                        <div className="flex-shrink-0">
                          <div className={`w-9 h-5 rounded-full p-0.5 transition-colors border flex items-center ${
                            isScriptureBold 
                              ? (theme === 'light' ? 'bg-black border-black justify-end' : 'bg-[#faf6f0] border-[#faf6f0] justify-end')
                              : (theme === 'light' ? 'bg-zinc-200 border-zinc-300 justify-start' : 'bg-[#28211c] border-[#483d34] justify-start')
                          }`}>
                            <div className={`w-4 h-4 rounded-full shadow-xs transition-transform ${isScriptureBold ? (theme === 'light' ? 'bg-white' : 'bg-[#191512]') : 'bg-white'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Compact Italic Switch Row */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isScriptureItalic;
                          setIsScriptureItalic(next);
                          try {
                            localStorage.setItem('logosbridge_scripture_italic', String(next));
                          } catch (err) {
                            console.warn('Italic localStorage save failed:', err);
                          }
                        }}
                        className="cursor-pointer py-1.5 flex items-center justify-between transition-all"
                      >
                        <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          Italic
                        </span>
                        {/* Compact Material 3 Sphere Toggle Indicator */}
                        <div className="flex-shrink-0">
                          <div className={`w-9 h-5 rounded-full p-0.5 transition-colors border flex items-center ${
                            isScriptureItalic 
                              ? (theme === 'light' ? 'bg-black border-black justify-end' : 'bg-[#faf6f0] border-[#faf6f0] justify-end')
                              : (theme === 'light' ? 'bg-zinc-200 border-zinc-300 justify-start' : 'bg-[#28211c] border-[#483d34] justify-start')
                          }`}>
                            <div className={`w-4 h-4 rounded-full shadow-xs transition-transform ${isScriptureItalic ? (theme === 'light' ? 'bg-white' : 'bg-[#191512]') : 'bg-white'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Compact Font Size Slider - Accessible & Clear Labels */}
                      <div className="space-y-0.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10.5px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`}>
                            Font Size
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(0.75, parseFloat((scriptureZoom - 0.1).toFixed(2)));
                                setScriptureZoom(next);
                                localStorage.setItem('personalized_bible_scripture_zoom', String(next));
                              }}
                              className={`text-xs font-bold px-2 py-1 cursor-pointer rounded ${theme === 'light' ? 'text-zinc-600 hover:text-black hover:bg-zinc-100' : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]'}`}
                              title="Decrease font size"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setScriptureZoom(1.6);
                                localStorage.setItem('personalized_bible_scripture_zoom', '1.6');
                              }}
                              className={`text-[10px] font-bold px-2 py-1 cursor-pointer rounded ${theme === 'light' ? 'text-zinc-500 hover:text-black hover:bg-zinc-100' : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]'}`}
                              title="Reset to default (160%)"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.min(2.0, parseFloat((scriptureZoom + 0.1).toFixed(2)));
                                setScriptureZoom(next);
                                localStorage.setItem('personalized_bible_scripture_zoom', String(next));
                              }}
                              className={`text-xs font-bold px-2 py-1 cursor-pointer rounded ${theme === 'light' ? 'text-zinc-600 hover:text-black hover:bg-zinc-100' : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]'}`}
                              title="Increase font size"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Compact Slider Bar */}
                        <div className="flex items-center gap-2.5 py-1">
                          <span className={`text-[11px] font-bold select-none ${theme === 'light' ? 'text-zinc-400' : 'text-[#b5a99a]'}`}>
                            A
                          </span>
                          <div className="flex-1 relative flex items-center">
                            <input
                              type="range"
                              min="0.75"
                              max="2.0"
                              step="0.05"
                              value={scriptureZoom}
                              onChange={(e) => {
                                const z = parseFloat(e.target.value);
                                setScriptureZoom(z);
                                localStorage.setItem('personalized_bible_scripture_zoom', String(z));
                              }}
                              className={`w-full cursor-pointer h-1.5 rounded-sm ${theme === 'light' ? 'accent-black bg-zinc-200' : 'accent-[#faf6f0] bg-[#342b25]'}`}
                            />
                          </div>
                          <span className={`text-base font-black select-none ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                            A
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Study Accent Color Section */}
                    <div className={`flex flex-col space-y-2 px-1 border-b pb-3 ${theme === 'light' ? 'border-zinc-200/80' : 'border-[#382e27]'}`}>
                      <div className="flex items-center justify-between pb-0.5">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                          Study Accent Color
                        </h3>
                        <span className={`text-[11px] font-mono font-bold capitalize ${theme === 'light' ? 'text-zinc-600' : 'text-[#dcd3c6]'}`}>
                          {studyAccentColorSetting}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        {[
                          { id: 'auto', label: 'Auto (Adaptive)', dotClass: theme === 'light' ? 'bg-[#1e40af]' : 'bg-[#f87171]' },
                          { id: 'blue', label: 'Sapphire Blue', dotClass: 'bg-[#1e40af]' },
                          { id: 'red', label: 'Crimson Red', dotClass: 'bg-[#ef4444]' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setStudyAccentColorSetting(item.id as any);
                              try {
                                localStorage.setItem('logosbridge_study_accent_color', item.id);
                              } catch {}
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                              studyAccentColorSetting === item.id
                                ? (theme === 'light'
                                    ? 'bg-black text-white border-black shadow-xs'
                                    : 'bg-[#342b25] text-[#faf6f0] border-[#483a30] shadow-xs')
                                : (theme === 'light'
                                    ? 'hover:bg-zinc-100 text-zinc-600 border-zinc-200/80'
                                    : 'hover:bg-[#28211c] text-[#dcd3c6] border-[#382e27]')
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                            <span className="truncate text-[11px]">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>


                    {/* Dark Mode Switcher Row */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(theme === 'light' ? 'dark' : 'light');
                      }}
                      className={`cursor-pointer py-2.5 px-1 flex items-center justify-between font-bold transition-all border-b ${theme === 'light' ? 'border-zinc-200/80' : 'border-[#382e27]'}`}
                    >
                      <span className={`text-xs sm:text-sm font-bold ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                        Dark Mode
                      </span>
                      {/* Compact Material 3 Sphere Toggle Indicator */}
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors border flex items-center ${
                        theme === 'dark' 
                          ? (theme === 'light' ? 'bg-black border-black justify-end' : 'bg-[#faf6f0] border-[#faf6f0] justify-end')
                          : (theme === 'light' ? 'bg-zinc-200 border-zinc-300 justify-start' : 'bg-[#28211c] border-[#483d34] justify-start')
                      }`}>
                        <div className={`w-4 h-4 rounded-full shadow-xs transition-transform ${theme === 'dark' ? (theme === 'light' ? 'bg-white' : 'bg-[#191512]') : 'bg-white'}`} />
                      </div>
                    </div>

                    {/* Shepherd Pulse Launch Row */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullPageMenu(null);
                        setIsDiscipleshipModalOpen(true);
                      }}
                      className={`cursor-pointer py-2.5 px-1 flex items-center justify-between font-bold transition-all border-b ${theme === 'light' ? 'border-zinc-200/80' : 'border-[#382e27]'}`}
                    >
                      <span className={`text-xs sm:text-sm font-bold ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                        Shepherd Pulse
                      </span>
                      <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-zinc-400' : 'text-[#dcd3c6]'}`} />
                    </div>

                    {/* Shepherd Pulse Auto-Launch on Startup Toggle Row */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !autoLaunchPulse;
                        setAutoLaunchPulse(next);
                        try {
                          localStorage.setItem('logosbridge_auto_launch_pulse', next ? 'true' : 'false');
                        } catch (err) {
                          console.warn('Failed to persist auto_launch_pulse:', err);
                        }
                      }}
                      className="cursor-pointer py-2.5 px-1 flex items-center justify-between font-bold transition-all"
                    >
                      <span className={`text-xs sm:text-sm font-bold ${theme === 'light' ? 'text-black' : 'text-[#faf6f0]'}`}>
                        Auto-launch on Startup
                      </span>
                      {/* Compact Material 3 Sphere Toggle Indicator */}
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors border flex items-center ${
                        autoLaunchPulse 
                          ? (theme === 'light' ? 'bg-black border-black justify-end' : 'bg-[#faf6f0] border-[#faf6f0] justify-end')
                          : (theme === 'light' ? 'bg-zinc-200 border-zinc-300 justify-start' : 'bg-[#28211c] border-[#483d34] justify-start')
                      }`}>
                        <div className={`w-4 h-4 rounded-full shadow-xs transition-transform ${autoLaunchPulse ? (theme === 'light' ? 'bg-white' : 'bg-[#191512]') : 'bg-white'}`} />
                      </div>
                    </div>
                  </div>
                )}

                {fullPageMenu === 'versions' && (
                  <div className="flex flex-col space-y-3">
                    <h3 className={`text-xs font-bold uppercase tracking-wider px-1 pb-1 border-b ${theme === 'light' ? 'text-zinc-500 border-slate-200/50' : 'text-[#b5a99a] border-[#382e27]'}`}>
                      Translation
                    </h3>
                    <div className="flex flex-col">
                      <div className={`flex items-center justify-between py-3 px-1 border-b ${theme === 'light' ? 'border-slate-200/50' : 'border-[#382e27]'}`}>
                        <div 
                          className="flex-1 cursor-pointer pr-2"
                          onClick={() => {
                            setMainView('read');
                            setTimeout(() => setFullPageMenu(null), 150);
                          }}
                        >
                          <span className={`text-sm sm:text-base font-bold ${theme === 'light' ? 'text-black hover:text-slate-700' : 'text-[#faf6f0] hover:text-[#dcd3c6]'} transition-colors`}>
                            King James Version (KJV)
                          </span>

                        </div>
                        <div className="flex items-center gap-2">
                          {isDownloadingKjv ? (
                            <div className="p-1.5 px-2.5 flex items-center gap-1.5 text-xs text-emerald-500 font-mono font-bold select-none">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-[11px]">{downloadProgress > 0 ? `${downloadProgress}%` : '...'}</span>
                            </div>
                          ) : isKjvOffline ? (
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center select-none transition-all cursor-default ${
                                theme === 'light'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                              }`}
                              title="King James Version (KJV) is fully downloaded and available offline"
                              aria-label="Downloaded"
                            >
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadTranslation('kjv');
                              }}
                              className={`p-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                theme === 'light'
                                  ? 'text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80'
                                  : 'text-emerald-300 hover:text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40'
                              }`}
                              title="Download King James Version (KJV) for offline reading"
                            >
                              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* MAIN CONTAINER PANEL */}
      <main 
        className={`flex-1 w-full ${
          mainView === 'home' || mainView === 'interlinear'
            ? 'p-0 m-0 max-w-none' 
            : `max-w-7xl mx-auto px-2 md:px-6 pt-1 md:pt-1.5 pb-40 mt-0 ${theme === 'light' ? 'bg-[#ffffff]' : ''}`
        } overflow-x-hidden touch-pan-y`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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
        ` }} />

        {/* Main Viewer Switch: Home vs Interlinear vs Read Mode */}
        {mainView === 'home' ? (() => {
          const isGrey = homeAccentSetting === 'grey';
          const accentBadgeClass = isGrey
            ? (theme === 'light'
                ? 'bg-slate-200/90 border-slate-300 text-slate-900'
                : 'bg-[#2e2621] border-[#483a30] text-[#faf6f0]')
            : (theme === 'light'
                ? 'bg-sky-100/90 border-sky-300 text-sky-800'
                : 'bg-sky-950/60 border-sky-700 text-sky-300');
          const accentHighlightClass = isGrey
            ? (theme === 'light'
                ? 'bg-slate-200/90 text-slate-900'
                : 'bg-[#342b25] text-[#faf6f0]')
            : (theme === 'light'
                ? 'bg-sky-100 text-sky-900'
                : 'bg-sky-900/60 text-sky-200');
          const accentOutlineClass = isGrey
            ? (theme === 'light' ? 'outline-slate-300' : 'outline-[#483a30]')
            : 'outline-sky-300';
          const accentBarClass = isGrey
            ? (theme === 'light' ? 'bg-slate-500' : 'bg-[#faf6f0]')
            : 'bg-sky-500';
          const accentTextClass = isGrey
            ? (theme === 'light' ? 'text-slate-900' : 'text-[#faf6f0]')
            : (theme === 'light' ? 'text-sky-600' : 'text-sky-300');

          return (
            <div 
              className={`w-full min-h-screen pb-0 animate-fade-in-up font-sans flex flex-col justify-between transition-colors duration-300 ${
                homeBgScope === 'full'
                  ? 'text-white'
                  : theme === 'light' ? 'bg-[#FFFAFA] text-[#0b111e]' : 'bg-[#191512] text-[#faf6f0]'
              }`}
              style={homeBgScope === 'full' ? {
                backgroundImage: "url('/bg_sanctuary.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
              } : undefined}
            >
              
              {/* 1. CINEMATIC HERO & DAILY BREAD (Flat Edge-to-Edge, Zero Card Box, Zero Rounded Corners, Zero Shadows) */}
              <div 
                id="home-section-dailybread" 
                className={`w-full relative min-h-[440px] sm:min-h-[500px] flex flex-col justify-between overflow-hidden pb-3 sm:pb-5 ${
                  homeBgScope === 'full' ? 'bg-transparent' : ''
                }`}
                style={homeBgScope === 'hero' ? {
                  maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
                } : undefined}
              >
                {/* Flush Top & Side Activity Capsule (Sits right at the very top line of the screen) */}
                {showActivityCapsule && (
                  <div className="relative z-30 w-full pt-0 px-0 animate-fade-in-up">
                    <ActivityCapsule
                      theme={theme}
                      narrativeBrief={activityCapsuleNarrative}
                      studyReminderBrief={activityBriefingData.studyReminderBrief}
                      pastActivityBrief={activityBriefingData.pastActivityBrief}
                      onResume={handleResumeActivityCapsule}
                      onDismiss={handleDismissActivityCapsule}
                      onQuickComplete={handleQuickCompleteStudyReminder}
                      onOpenDossier={() => setIsStudyAssistantModalOpen(true)}
                    />
                  </div>
                )}

                {/* Background Image Layer: Nature */}
                {homeBgScope === 'hero' && (
                  <div 
                    onClick={() => setIsHeroCinemaOpen(true)}
                    className="absolute inset-0 w-full h-full overflow-hidden cursor-pointer group"
                    title="Tap to enter cinema view"
                  >
                    <img
                      src={currentDailyStudy.natureImage || "/nature.jpg"}
                      alt="Nature"
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                  </div>
                )}

                {/* Atmospheric Legibility Vignette */}
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25 pointer-events-none" 
                  style={homeBgScope === 'hero' ? {
                    maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
                  } : undefined}
                />

                {/* Soft Atmospheric Wash to seamlessly blend into canvas */}
                {homeBgScope === 'hero' && (
                  <div className="absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-b from-transparent via-white/40 to-white dark:via-[#191512]/40 dark:to-[#191512] pointer-events-none z-10" />
                )}

                {/* Upper Content: Clear space showcasing the nature landscape */}
                <div 
                  onClick={() => setIsHeroCinemaOpen(true)}
                  className="relative z-10 flex-1 w-full min-h-[160px] sm:min-h-[200px] cursor-pointer"
                  title="Tap to enter cinema view"
                />

                {/* Lower Content: Daily Bread (Bare) */}
                <div className="relative z-10 w-full border-t border-white/20 backdrop-blur-xs bg-black/15">
                  <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-2">
                    <span className={`section-notch-label inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-t-xl text-[10.5px] sm:text-[11.5px] font-bold font-sans uppercase tracking-[0.08em] ${
                      theme === 'light' ? 'bg-white text-[#0b111e]' : 'bg-[#2a221d] text-[#faf6f0] border-t border-x border-[#483a30]'
                    }`}>
                      Daily Bread
                      <span className={`font-normal opacity-75 text-[9px] sm:text-[10px] tracking-normal normal-case ${theme === 'light' ? 'text-slate-600' : 'text-[#dcd3c6]'}`}>• {currentDailyStudy.book} {currentDailyStudy.chapter}:{currentDailyStudy.verse}</span>
                    </span>
                    {(() => {
                      const fullKjvVerse = `${currentDailyStudy.kjvPrefix}${currentDailyStudy.kjvTarget}${currentDailyStudy.kjvSuffix}`;
                      const activeWordIdx = homeActiveWordIdx !== null
                        ? homeActiveWordIdx
                        : currentDailyStudy.words.findIndex(w => w.target);

                      const tokens = parseKjvRawTokens(fullKjvVerse);
                      const matchedIndices = new Set<number>();

                      if (activeWordIdx >= 0 && activeWordIdx < currentDailyStudy.words.length) {
                        const activeWord = currentDailyStudy.words[activeWordIdx];
                        const interlinearTokens = currentDailyStudy.words.map(w => ({
                          w: w.text,
                          t: w.kjvMatch || (w.target ? currentDailyStudy.kjvTarget : '') || '',
                          n: w.strongs || '',
                          p: w.parsingTag || ''
                        }));
                        const clusteredMatches = getMatchedKjvTokenIndices(interlinearTokens, activeWordIdx, fullKjvVerse);
                        clusteredMatches.forEach(idx => matchedIndices.add(idx));

                        if (matchedIndices.size === 0) {
                          const targetPhrase = activeWord.kjvMatch || (activeWord.target ? currentDailyStudy.kjvTarget : '');
                          if (targetPhrase) {
                            const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const matchWords = targetPhrase.toLowerCase().split(/\s+/).map(clean).filter(Boolean);
                            tokens.forEach(tok => {
                              const cTok = clean(tok.text);
                              if (cTok && matchWords.includes(cTok)) {
                                matchedIndices.add(tok.rawIdx);
                              }
                            });
                          }
                        }
                      }

                      return (
                        <p className="text-base sm:text-lg md:text-xl font-serif leading-relaxed text-white drop-shadow-sm font-medium">
                          "{tokens.map((tokenObj) => {
                            const isMatched = matchedIndices.has(tokenObj.rawIdx);
                            return (
                              <span
                                key={tokenObj.rawIdx}
                                className={`transition-colors duration-200 ${
                                  isMatched
                                    ? `${getStudyAccentClass()} font-bold drop-shadow-md`
                                    : ''
                                }`}
                              >
                                {tokenObj.text}
                              </span>
                            );
                          })}"
                        </p>
                      );
                    })()}
                    <div className="flex justify-end mt-2">
                      <button 
                        id="home-docked-read-btn"
                        type="button"
                        onClick={() => {
                          setSelectedBook(currentDailyStudy.book);
                          setSelectedChapter(currentDailyStudy.chapter);
                          setMainView('read');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`-mr-4 sm:-mr-8 h-[32px] sm:h-[34px] min-w-[80px] pl-3.5 pr-2.5 rounded-l-xl rounded-r-none flex items-center gap-1.5 text-[11px] sm:text-xs font-bold font-sans shadow-xs transition-all duration-200 cursor-pointer border-y border-l shrink-0 active:scale-95 group hover:pl-4.5 ${
                          theme === 'light'
                            ? 'border-white/20 bg-white text-[#0b111e]'
                            : 'border-[#483d34] bg-[#2d2520] text-[#faf6f0] hover:bg-[#382e28]'
                        }`}
                      >
                        <span>Read</span>
                        <span className="font-mono font-bold text-[11px] transition-transform duration-200 group-hover:translate-x-0.5">↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6 md:space-y-8 flex-1 flex flex-col justify-between">

                {/* ========================================= */}
                {/* 2. M3 BENTO BOX GRID                      */}
                {/* ========================================= */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">

                  {/* CARD 1: Unified Study & Reflection Hub (2 columns) */}
                  <div 
                    id="home-unified-study-card"
                    className="md:col-span-2 pt-1 sm:pt-1.5 pb-6 sm:pb-8 relative border-b border-slate-200/60 dark:border-white/[0.05] transition-all flex flex-col justify-between"
                  >
                    {/* Card 1 Header: Scripture Reference (Clean Unboxed Typography) */}
                    <div className={`mb-2 sm:mb-2.5 pb-1.5 sm:pb-2 border-b ${theme === 'light' ? 'border-slate-900/[0.04]' : 'border-white/[0.04]'}`}>
                      <h3 className={`text-[12px] sm:text-[13px] font-mono font-bold tracking-wider uppercase select-none ${
                        theme === 'light' ? 'text-slate-900' : 'text-[#faf6f0]'
                      }`}>
                        {currentDailyStudy.refHeader}
                      </h3>
                    </div>
                    
                    {/* Live Interlinear Container (Study Tab Structure) */}
                    <div className={`p-3 sm:p-4 rounded-xl border space-y-3 sm:space-y-3.5 ${
                      theme === 'light'
                        ? 'bg-white border-slate-900/[0.04] shadow-xs'
                        : 'bg-[#231d19] border-[#382e27]'
                    }`}>
                      
                      {/* TOP LINE: Interactive Study Tools Row — shown when a word is active or demo is triggered */}
                      {activeHomeWord !== null && (
                      <div className={`flex items-center justify-between gap-1.5 sm:gap-2 pb-2 sm:pb-2.5 border-b ${theme === 'light' ? 'border-slate-900/[0.04]' : 'border-white/[0.04]'}`}>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          {/* Stationary Verse Indicator */}
                          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md font-bold text-xs sm:text-sm flex items-center justify-center font-mono select-none shrink-0 border ${
                            theme === 'light'
                              ? 'bg-white border-slate-900/[0.05] text-[#0b111e]'
                              : 'bg-[#28211c] border-[#382e27] text-white'
                          }`}>
                            {currentDailyStudy.verse}
                          </span>

                          {/* Strong's Code + Theological Root Action (Borderless Typography) */}
                          <div 
                            className="inline-flex items-center gap-2 max-w-[280px] sm:max-w-[400px] md:max-w-[500px] py-0.5 transition-all overflow-hidden"
                          >
                            {/* Strong's Code Segment */}
                            <button 
                              id="home-target-strongs-badge"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStrongsWordStudy(
                                  activeHomeWord.strongs || currentDailyStudy.strongs,
                                  activeHomeWord.text.replace('*', ''),
                                  activeHomeWord.text.replace('*', ''),
                                  currentDailyStudy.language,
                                  `${currentDailyStudy.book} ${currentDailyStudy.chapter}:${currentDailyStudy.verse}`
                                );
                              }}
                              className={`font-mono font-bold text-xs sm:text-[12.5px] tracking-tight shrink-0 flex items-center gap-0.5 cursor-pointer select-none hover:underline underline-offset-2 transition-colors ${getStudyAccentClass()}`}
                              title={`Strong's ${activeHomeWord.strongs || currentDailyStudy.strongs} (Click to open Concordance Modal)`}
                            >
                              <span>{activeHomeWord.strongs || currentDailyStudy.strongs}</span>
                              <span className="text-[10px] opacity-75">↗</span>
                            </button>

                            {/* Dot separator */}
                            <span className="text-zinc-300 dark:text-zinc-700 select-none text-[11px] shrink-0">•</span>

                            {/* Root Action Nuance Segment (Contained, horizontal drag/scroll, modal trigger disabled) */}
                            <div 
                              id="home-target-root-box"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 text-[14px] sm:text-base select-none flex-1 min-w-0 overflow-x-auto whitespace-nowrap touch-pan-x cursor-grab active:cursor-grabbing no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden antialiased"
                              title="Theological root action (scroll or drag horizontally to read)"
                            >
                              <span className={`font-serif italic text-[14px] sm:text-base whitespace-nowrap font-bold antialiased ${getStudyAccentClass()}`}>
                                {(() => {
                                  const db = strongsStudyDb || globalStrongsDbCache;
                                  const code = (activeHomeWord.strongs || currentDailyStudy.strongs || '').trim().toUpperCase();
                                  const ref = `${currentDailyStudy.book} ${currentDailyStudy.chapter}:${currentDailyStudy.verse}`;
                                  const match = db && code ? queryWordStudy(db, code, ref) : null;
                                  return match?.foundMicro?.coreMeaning || activeHomeWord.rootMeaning || '—';
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Grammatical Parsing Badge — Tappable to open contextual ParsingTagModal */}
                        <button 
                          id="home-target-parsing-badge"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenParsingModal(
                              activeHomeWord.parsingTag || currentDailyStudy.parsingTag,
                              activeHomeWord.text.replace('*', ''),
                              activeHomeWord.text.replace('*', ''),
                              activeHomeWord.rootMeaning || currentDailyStudy.rootMeaning,
                              activeHomeWord.strongs || currentDailyStudy.strongs
                            );
                          }}
                          className={`font-mono text-[11px] sm:text-[12px] font-bold px-1.5 sm:px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95 ${getStudyAccentBadgeClass()}`}
                          title="Tap to view contextual grammatical parsing breakdown"
                        >
                          <span>{activeHomeWord.parsingTag || currentDailyStudy.parsingTag}</span>
                          <span className={`text-[10px] ${theme === 'light' ? 'text-black' : 'text-white'}`}>↗</span>
                        </button>
                      </div>
                      )}

                      {/* Bare Flowing Transliterated Script (Clean borderless typography matching Study View) */}
                      <div className="text-xl sm:text-2xl md:text-[26px] font-serif leading-relaxed tracking-wide flex flex-wrap gap-x-2.5 sm:gap-x-3.5 gap-y-1 sm:gap-y-1.5 pt-0.5">
                        {currentDailyStudy.words.map((w, idx) => {
                          const isSelected = homeActiveWordIdx === idx;
                          const isDefaultTarget = homeActiveWordIdx === null && !!w.target;
                          const isHighlighted = isSelected || isDefaultTarget;

                          return (
                            <span
                              key={idx}
                              id={w.target ? "home-target-study-word" : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (homeActiveWordIdx === idx) {
                                  setHomeActiveWordIdx(null);
                                } else {
                                  setHomeActiveWordIdx(idx);
                                }
                              }}
                              className={`cursor-pointer select-none transition-colors duration-150 active:scale-95 ${
                                isHighlighted
                                  ? `${getStudyAccentClass()} font-bold`
                                  : (theme === 'light'
                                      ? 'hover:text-black text-slate-950 font-medium'
                                      : 'hover:text-white text-white font-medium')
                              }`}
                              title={`Tap to view Strong's ${w.strongs || ''} • ${w.rootMeaning || ''}`}
                            >
                              {w.text}
                            </span>
                          );
                        })}
                      </div>

                      {/* 2. WORD STUDY SECTION (Directly beneath manuscript words) */}
                      <div className={`pt-3.5 sm:pt-4 border-t ${theme === 'light' ? 'border-slate-900/[0.05]' : 'border-white/[0.05]'}`}>
                        {(() => {
                          const rawTitle = activeWordForWordStudies.wordStudyTitle || activeWordForWordStudies.text.replace('*', '');
                          const cleanWordTitle = rawTitle.replace(/\s*\([^)]*\)/g, '').trim();
                          const coreMeaning = activeWordStudyData?.coreMeaning || activeWordForWordStudies.coreMeaning || '';

                          const dimensionText = (() => {
                            if (home4dTab === 'history') {
                              return activeWordStudyData?.wordHistory ||
                                activeWordForWordStudies.wordStudyDimensions?.wordHistory ||
                                activeWordForWordStudies.wordStudyDimensions?.lex || '';
                            }
                            if (home4dTab === 'worldview') {
                              return activeWordStudyData?.ancientWorldview ||
                                activeWordForWordStudies.wordStudyDimensions?.ancientWorldview ||
                                activeWordForWordStudies.wordStudyDimensions?.ane || '';
                            }
                            if (home4dTab === 'intent') {
                              return activeWordStudyData?.writersIntent ||
                                activeWordForWordStudies.wordStudyDimensions?.writersIntent ||
                                activeWordForWordStudies.wordStudyDimensions?.mood || '';
                            }
                            if (home4dTab === 'anchor') {
                              return activeWordStudyData?.theTrueAnchor ||
                                activeWordStudyData?.spiritualAndCovenantReality ||
                                activeWordForWordStudies.wordStudyDimensions?.theTrueAnchor ||
                                activeWordForWordStudies.wordStudyDimensions?.prophetic || '';
                            }
                            return '';
                          })();
                          const cleanDimensionContent = dimensionText.replace(/^["']|["']$/g, '');

                          return (
                            <>
                              {/* Word Study Label on Top of Strong's Number & Transliterated Word */}
                              <div className="mb-2">
                                <span className={`section-notch-label inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-lg text-[11px] sm:text-[12px] font-bold font-sans uppercase tracking-[0.08em] ${
                                  theme === 'light' ? 'bg-[#0b111e] text-white' : 'bg-[#2a221d] text-[#faf6f0] border-t border-x border-[#483a30]'
                                }`}>Word Study</span>
                              </div>

                              {/* Active Word Header — Clean transliterated title without redundant Strong's pill or root action words */}
                              {cleanWordTitle && (
                                <div className="mb-2 sm:mb-2.5">
                                  <span className={`text-sm sm:text-base font-bold font-sans tracking-tight ${theme === 'light' ? 'text-slate-950' : 'text-[#faf6f0]'}`}>
                                    {cleanWordTitle}
                                  </span>
                                </div>
                              )}

                              {/* 4-Dimension Context Tabs — Crisp & Legible (No Dark Background Pill) */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2.5 sm:mb-3">
                                {[
                                  { id: 'history', label: 'Word History' },
                                  { id: 'worldview', label: 'ANE' },
                                  { id: 'intent', label: "Writer's Intent" },
                                  { id: 'anchor', label: 'The True Anchor' },
                                ].map((dim) => (
                                  <button
                                    key={dim.id}
                                    id={`home-4d-tab-${dim.id}`}
                                    type="button"
                                    onClick={() => setHome4dTab(dim.id as any)}
                                    className={`py-1 text-xs sm:text-[13px] font-sans font-bold tracking-tight transition-all cursor-pointer select-none ${
                                      home4dTab === dim.id
                                        ? (theme === 'light'
                                            ? 'text-slate-950 border-b-2 border-slate-900 font-extrabold pb-0.5'
                                            : 'text-[#faf6f0] border-b-2 border-[#faf6f0] font-extrabold pb-0.5')
                                        : (theme === 'light'
                                            ? 'text-slate-500 hover:text-slate-900 pb-0.5'
                                            : 'text-[#b5a99a] hover:text-[#faf6f0] pb-0.5')
                                    }`}
                                  >
                                    {dim.label}
                                  </button>
                                ))}
                              </div>

                              {/* Dynamic Content Area — Crisp, Crystal Clear Typography */}
                              <div className={`text-base sm:text-lg md:text-xl font-serif leading-[1.8] sm:leading-[1.85] font-normal sm:font-medium antialiased min-h-[55px] ${theme === 'light' ? 'text-slate-950' : 'text-[#fbf8f3]'}`}>
                                {cleanDimensionContent ? (
                                  <p className="antialiased">
                                    {cleanDimensionContent}
                                  </p>
                                ) : (
                                  <p className="text-xs font-mono opacity-40 py-2 text-center select-none not-italic">
                                    —
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* 3. DIALOGUE & REFLECTION SECTION (Beneath Word Study) */}
                      <div className={`pt-3.5 sm:pt-4 border-t space-y-3 sm:space-y-3.5 ${theme === 'light' ? 'border-slate-900/[0.05]' : 'border-white/[0.05]'}`}>

                        {/* Attached Cross-Reference Verses — Stack of Preview Boxes */}
                        {attachedCrossRefs && attachedCrossRefs.length > 0 && (
                          <AnimatePresence mode="wait">
                            {!inlineContextRef ? (
                              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
                                {attachedCrossRefs.map((cr) => (
                                  <motion.div
                                    key={`home-cr-${cr.ref}`}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="space-y-0"
                                  >
                                    <div className="flex items-start justify-between animate-fade-in text-left">
                                      <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                                        <div className={`w-1 h-6 rounded-full shrink-0 mt-0.5 ${theme === 'light' ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <Link2 className={`w-3 h-3 ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`} />
                                            <span className={`text-xs sm:text-[13px] font-bold font-serif tracking-tight select-none ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
                                              {cr.ref}
                                            </span>
                                            <span className={`text-[8.5px] font-mono uppercase px-1 rounded font-semibold ${theme === 'light' ? 'bg-zinc-200/80 text-zinc-600' : 'bg-[#2e2621] text-[#b5a99a]'}`}>
                                              Cross-Reference
                                            </span>
                                          </div>
                                          <div className={`text-base sm:text-lg md:text-[19px] leading-[1.85] sm:leading-[1.9] tracking-[0.01em] font-serif not-italic font-medium max-h-48 overflow-y-auto pr-1.5 ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
                                            {cr.text}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setInlineContextRef(inlineContextRef === cr.ref ? null : cr.ref);
                                          }}
                                          className={`p-1 rounded-full transition-colors cursor-pointer ${
                                            inlineContextRef === cr.ref
                                              ? (theme === 'light' ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-900/40 text-cyan-300')
                                              : (theme === 'light' ? 'hover:bg-zinc-200 text-zinc-800' : 'hover:bg-[#342b25] text-[#faf6f0]')
                                          }`}
                                          title="Read paragraph context"
                                        >
                                          <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 ${inlineContextRef === cr.ref ? 'rotate-90 text-cyan-600 dark:text-cyan-400' : ''}`} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); removeCrossRef(cr.ref); }}
                                          className={`p-1 rounded-full transition-colors cursor-pointer ${
                                            theme === 'light' ? 'hover:bg-zinc-300 text-zinc-400 hover:text-rose-500' : 'hover:bg-zinc-700 text-zinc-500 hover:text-rose-400'
                                          }`}
                                          title="Detach Cross-Reference"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <motion.div
                                key={`home-inline-context-card-${inlineContextRef}`}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                              >
                                <InlineParagraphContext
                                  reference={inlineContextRef}
                                  theme={theme}
                                  onCollapse={() => setInlineContextRef(null)}
                                  onOpenInMainReader={(b, c, vNo) => {
                                    handleCancelNote();
                                    setAttachedCrossRefs([]);
                                    setMainView('read');
                                    setInlineContextRef(null);
                                    setSelectedBook(b);
                                    setSelectedChapter(c);
                                    if (vNo) {
                                      setTimeout(() => {
                                        const el = document.getElementById(`verse-row-${vNo}`) || document.querySelector(`[id$="-${vNo}"]`);
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }, 250);
                                    }
                                  }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}

                        {/* Material 3 Compact Cross-Reference Attachment Popover */}
                        {homeCrossRefOpen && (
                          <div className={`p-2.5 border-b animate-fade-in text-left rounded-xl ${
                            theme === 'light' ? 'bg-zinc-100/90 border-zinc-200' : 'bg-[#241e1a] border-[#382e27]'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <Link2 className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`} />
                                <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${theme === 'light' ? 'text-zinc-600' : 'text-[#dcd3c6]'}`}>
                                  Cross-Reference
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setHomeCrossRefOpen(false); }}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                  theme === 'light' ? 'hover:bg-zinc-200 text-zinc-400 hover:text-black' : 'hover:bg-[#342b25] text-[#b5a99a] hover:text-[#faf6f0]'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 mb-2.5">
                              <input
                                type="text"
                                value={crossRefInputText}
                                onChange={(e) => setCrossRefInputText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    attachCrossRef(crossRefInputText);
                                  }
                                }}
                                placeholder="Enter reference..."
                                className={`flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                  theme === 'light'
                                    ? 'bg-white border-zinc-300 text-black placeholder:text-zinc-400'
                                    : 'bg-[#241e1a] border-[#382e27] text-[#faf6f0] placeholder:text-[#b5a99a]'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); attachCrossRef(crossRefInputText); }}
                                disabled={!crossRefInputText.trim()}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                  theme === 'light'
                                    ? 'bg-black text-white hover:bg-zinc-800'
                                    : 'bg-[#342b25] text-[#faf6f0] hover:bg-[#483d34] border border-[#483a30]'
                                }`}
                              >
                                Attach
                              </button>
                            </div>

                            <div className="space-y-1">
                              <div className={`text-[9.5px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`}>
                                Suggested References
                              </div>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar py-0.5">
                                {getCrossReferencesForVerse(
                                  currentDailyStudy.book,
                                  currentDailyStudy.chapter,
                                  currentDailyStudy.verse,
                                  currentDailyStudy.dialogueQuotedText
                                ).map((ref) => (
                                  <button
                                    key={ref}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      attachCrossRef(ref);
                                    }}
                                    className={`px-2 py-0.5 text-[10.5px] font-mono rounded-md border transition-all cursor-pointer ${
                                      attachedCrossRefs.some((cr) => cr.ref === ref)
                                        ? (theme === 'light' ? 'bg-zinc-200 border-zinc-400 text-black font-bold' : 'bg-[#342b25] border-[#483a30] text-[#faf6f0] font-bold')
                                        : (theme === 'light' ? 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700' : 'bg-[#241e1a] border-[#382e27] hover:bg-[#2e2621] text-[#dcd3c6]')
                                    }`}
                                  >
                                    + {ref}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Telegram / WhatsApp Compact Reply Composer Bar */}
                        <div className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl border ${
                          theme === 'light' ? 'bg-white border-slate-900/[0.04]' : 'bg-[#241e1a] border-[#382e27]'
                        }`}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setHomeCrossRefOpen(!homeCrossRefOpen); }}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                              homeCrossRefOpen
                                ? (theme === 'light' ? 'bg-zinc-300 text-black' : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30]')
                                : (theme === 'light' ? 'text-zinc-500 hover:text-black hover:bg-zinc-200' : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]')
                            }`}
                            title="Cross-Reference"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMainView('read');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                              theme === 'light' ? 'text-zinc-500 hover:text-black hover:bg-zinc-200' : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]'
                            }`}
                            title="Write a reflection or study note"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <input
                            type="text"
                            placeholder="Reflect on this scripture or turn into prayer..."
                            readOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              setMainView('read');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`flex-1 min-w-0 text-xs sm:text-sm bg-transparent border-none focus:outline-none px-1.5 py-1 cursor-pointer ${
                              theme === 'light' ? 'text-slate-800 placeholder:text-zinc-400' : 'text-white placeholder:text-[#b5a99a]'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMainView('read');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`p-2 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer shrink-0 ${
                              theme === 'light'
                                ? 'bg-black hover:bg-zinc-800 text-white shadow-black/20'
                                : 'bg-[#342b25] hover:bg-[#483d34] text-white border border-[#483a30] shadow-white/10'
                            }`}
                            title="Send"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unified Docked Action Buttons Bar */}
                    <div className="flex justify-end mt-3">
                      <button 
                        id="home-docked-compose-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainView('read');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`-mr-3.5 sm:-mr-6 lg:-mr-8 h-[32px] sm:h-[34px] min-w-[80px] pl-3.5 pr-2.5 rounded-l-xl rounded-r-none flex items-center gap-1.5 text-xs sm:text-sm font-bold font-sans shadow-xs transition-all duration-200 cursor-pointer border-y border-l shrink-0 active:scale-95 group hover:pl-4.5 ${
                          theme === 'light'
                            ? 'border-black/10 bg-white text-slate-900'
                            : 'border-[#483d34] bg-[#2d2520] text-white hover:bg-[#382e28]'
                        }`}
                      >
                        <span>Compose</span>
                        <span className="font-mono font-bold text-xs transition-transform duration-200 group-hover:translate-x-0.5">↗</span>
                      </button>
                    </div>
                  </div>

                  {/* BENTO ITEM 2: Dual-Stream Broadcast Room (1 column) */}
                  <DualStreamBentoCard
                    theme={theme}
                    accentTextClass={accentTextClass}
                    onGoLive={() => {
                      setIsLiveStudioActive(true);
                      setIsLiveStudioMinimized(false);
                      setMainView('live');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />


                </div>
              </div>

              {/* 3. PARTNER WITH OUR MISSION - CINEMATIC SANCTUARY FOOTER (From Compose Button to Screen Bottom) */}
              <div 
                id="home-section-partner-mission"
                className="w-full relative mt-6 sm:mt-10 pt-16 sm:pt-22 pb-12 sm:pb-16 text-center overflow-hidden bg-[#0c0a09]"
                style={homeBgScope === 'hero' ? {
                  backgroundImage: "url('/nature.jpg')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 35%',
                  backgroundRepeat: 'no-repeat'
                } : undefined}
              >
                {/* Seamless Top Feather Blend from Canvas into Clear Image */}
                {homeBgScope === 'hero' && (
                  <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-white via-white/70 to-transparent dark:from-[#191512] dark:via-[#191512]/70 pointer-events-none z-10" />
                )}

                {/* Atmospheric Dark Vignette for Premium Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/25 pointer-events-none" />

                {/* Content Container Aligned to Page Grid */}
                <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 flex flex-col items-center">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-tight mb-1.5 text-white drop-shadow-md">
                    Partner With Our Mission
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 mb-5 max-w-md mx-auto drop-shadow-xs font-medium">
                    Have questions, feedback, or feel inspired to seed and partner?
                  </p>
                  
                  {/* Button Row: Centered Contact Us + Docked Notch Aligned to Right Edge */}
                  <div className="relative w-full flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const email = 'logosbridgepsb@gmail.com';
                        const subject = encodeURIComponent('LogosBridge Inquiry & Feedback');
                        const body = encodeURIComponent('Hello LogosBridge Team,\n\n');
                        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

                        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.location.href = mailtoUrl;
                        } else {
                          const win = window.open(gmailUrl, '_blank');
                          if (!win) {
                            window.location.href = mailtoUrl;
                          }
                        }
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className={`mx-auto rounded-xl px-6 py-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg ${
                        theme === 'light'
                          ? 'bg-white text-[#0b111e] hover:bg-slate-100'
                          : 'bg-[#2d2520] text-[#faf6f0] border border-[#483d34] hover:bg-[#382e28]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Contact Us
                    </button>

                    {/* Edge-Docked Right Notch Aligned with Contact Us Pill-Box (Cycles Read, Study, Live icons every 2s) */}
                    <div className="absolute -right-4 sm:-right-8 top-1/2 -translate-y-1/2 z-40">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dockedNotchIndex === 0) {
                            setMainView('read');
                          } else if (dockedNotchIndex === 1) {
                            setMainView('interlinear');
                          } else {
                            setIsLiveStudioActive(true);
                            setIsLiveStudioMinimized(false);
                            setMainView('live');
                          }
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        title={
                          dockedNotchIndex === 0 
                            ? 'Open Scripture Read View' 
                            : dockedNotchIndex === 1 
                            ? 'Open Theological Study View' 
                            : 'Open Live Studio'
                        }
                        className={`h-[38px] pl-3 pr-2.5 rounded-l-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:pl-4 border-y border-l active:scale-95 group ${
                          theme === 'light'
                            ? 'bg-white text-[#0b111e] border-white/20'
                            : 'bg-[#2d2520] text-[#faf6f0] border-[#483d34]'
                        }`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center relative overflow-hidden">
                          {dockedNotchIndex === 0 && (
                            <BookOpen className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 animate-slide-right-left" />
                          )}
                          {dockedNotchIndex === 1 && (
                            <Layers className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 animate-slide-right-left" />
                          )}
                          {dockedNotchIndex === 2 && (
                            <Radio className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 animate-slide-right-left" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })() : mainView === 'interlinear' ? (() => {
  if (!chapterData || !chapterData.verses || chapterData.verses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className={`p-4 rounded-full mb-4 ${theme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-amber-950/40 text-amber-400'}`}>
          <CloudLightning className="w-10 h-10" />
        </div>
        <h3 className={`text-lg font-bold mb-2 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
          Study Data Unavailable
        </h3>
        <p className={`text-sm max-w-sm mb-6 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
          Could not load interlinear study metrics for {selectedBook} {selectedChapter}.
        </p>
        <button
          onClick={() => loadChapter(selectedBook, selectedChapter)}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Retry Loading
        </button>
      </div>
    );
  }
  return (
    <div className={`w-full max-w-4xl mx-auto px-3 sm:px-5 md:px-6 py-3 sm:py-5 pb-44 transition-colors duration-300 min-h-screen ${
      theme === 'light' ? 'bg-white text-neutral-900' : 'bg-[#060913] text-neutral-100'
    }`}>
      {/* Smart Assistant Brief Reminder Capsule on Study Tab */}
      {showActivityCapsule && (
        <div className="relative z-30 w-full mb-3 animate-fade-in-up">
          <ActivityCapsule
            theme={theme}
            narrativeBrief={activityCapsuleNarrative}
            studyReminderBrief={activityBriefingData.studyReminderBrief}
            pastActivityBrief={activityBriefingData.pastActivityBrief}
            onResume={handleResumeActivityCapsule}
            onDismiss={handleDismissActivityCapsule}
            onQuickComplete={handleQuickCompleteStudyReminder}
            onOpenDossier={() => setIsStudyAssistantModalOpen(true)}
          />
        </div>
      )}

      {/* Minimal unboxed Script vs Transliteration switcher (zero pill housing, zero duplicate book/chapter header) */}
      <div className="flex items-center justify-end mb-3 px-1">
        <div className={`inline-flex items-center p-0.5 rounded-lg border font-mono text-xs ${
          theme === 'light' ? 'bg-neutral-100/90 border-neutral-300' : 'bg-neutral-800/80 border-neutral-700'
        }`}>
          {/* Script Button */}
          <button
            type="button"
            onClick={() => {
              setTextDisplayMode('script');
              logUserActivity('toggled_manuscript_mode', `${selectedBook} ${selectedChapter}`, 'Switched manuscript view to original script', 1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
              textDisplayMode === 'script'
                ? getStudyAccentSolidBgClass()
                : (theme === 'light' ? 'text-neutral-700 hover:text-black font-medium' : 'text-neutral-300 hover:text-white font-medium')
            }`}
          >
            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border transition-colors ${
              textDisplayMode === 'script'
                ? 'bg-white/20 text-white border-white/30'
                : getStudyAccentBadgeClass()
            }`}>
              א/Ω
            </span>
            <span>Script</span>
          </button>

          {/* Translit Button */}
          <button
            type="button"
            onClick={() => {
              setTextDisplayMode('translit');
              logUserActivity('toggled_manuscript_mode', `${selectedBook} ${selectedChapter}`, 'Switched manuscript view to transliteration', 1);
            }}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
              textDisplayMode === 'translit'
                ? getStudyAccentSolidBgClass()
                : (theme === 'light' ? 'text-neutral-700 hover:text-black font-medium' : 'text-neutral-300 hover:text-white font-medium')
            }`}
          >
            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border transition-colors ${
              textDisplayMode === 'translit'
                ? 'bg-white/20 text-white border-white/30'
                : getStudyAccentBadgeClass()
            }`}>
              ᴀb
            </span>
            <span>Translit</span>
          </button>
        </div>
      </div>

      {/* Verses List - Borderless Codex Layout with Hairline Separator */}
      <div className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
        {chapterData.verses.map(v => {
          const thirdLineText = v.kjvText || '';
          const cleanVerseNoteText = stripSuppliedMarkup(thirdLineText);
          const verseHighlight = getVerseHighlight(v.verseNumber);
          const hColor = verseHighlight?.color;
          const hasNotes = !!verseHighlight?.notes;
          const isDrafting = activeDraftVerse === v.verseNumber;

          let textHighlightClass = '';
          if (hColor === 'green') {
            textHighlightClass = theme === 'light' ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-emerald-400 font-medium';
          } else if (hColor === 'blue') {
            textHighlightClass = theme === 'light' ? 'text-cyan-700 dark:text-cyan-400 font-medium' : 'text-cyan-400 font-medium';
          } else if (hColor === 'red') {
            textHighlightClass = theme === 'light' ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-rose-400 font-medium';
          } else if (hColor === 'yellow') {
            textHighlightClass = theme === 'light' ? 'text-amber-600 dark:text-amber-300 font-medium' : 'text-amber-300 font-medium';
          } else if (hColor === 'black') {
            textHighlightClass = theme === 'light' ? 'text-zinc-600 dark:text-zinc-400 font-medium' : 'text-zinc-400 font-medium';
          } else if (hasNotes || hColor === 'amber') {
            textHighlightClass = theme === 'light' ? 'text-amber-800 dark:text-amber-200' : 'text-amber-200';
          }

          const verseInter = interlinearChapterData?.verses?.[v.verseNumber];
          const words = verseInter?.words || v.interlinearWords || [];
          const isHebrew = (interlinearChapterData?.language === 'Hebrew') || (getBookLanguage(selectedBook) === 'Hebrew');

          // Strict integer verse number check to prevent prefix collisions
          const activeParts = activeWordId && activeWordId.startsWith('inter-') ? activeWordId.split('-') : [];
          const activeVerseNum = activeParts.length === 3 ? parseInt(activeParts[1], 10) : -1;
          const activeWordIdx = activeVerseNum === v.verseNumber ? parseInt(activeParts[2], 10) : -1;
          const isVerseActive = activeVerseNum === v.verseNumber && activeWordIdx >= 0;
          const activeWordObj = isVerseActive ? words[activeWordIdx] : null;
          const activeMorph = activeWordObj ? getWordMorphology(activeWordObj.n, activeWordObj.w, isHebrew ? 'Hebrew' : 'Greek') : null;
          const activeParsingTag = activeWordObj?.p || activeMorph?.parsingTag;
          const activeLexEntry = activeWordObj
            ? getEnhancedStrongsEntry(
                activeWordObj.n,
                activeWordObj.w,
                activeWordObj.t,
                isHebrew ? 'Hebrew' : 'Greek'
              )
            : null;

          // Check lexicon cache for root_word and root_action
          const cleanStrongsCode = (activeWordObj?.n || '').trim().toUpperCase();
          const currentVerseRef = `${selectedBook} ${selectedChapter}:${v.verseNumber}`;
          const currentVerseKey = `${currentVerseRef.trim().toLowerCase()}_${cleanStrongsCode}`;
          const cachedLexicon = cleanStrongsCode 
            ? (lexiconCache[currentVerseKey] || lexiconCache[cleanStrongsCode]) 
            : null;

          // Direct synchronous lookup from study database if available
          let synchronousCoreMeaning: string | null = null;
          let synchronousRootWord: string | null = null;
          const activeStudyDb = strongsStudyDb || globalStrongsDbCache;
          if (activeStudyDb && cleanStrongsCode) {
            const normRef = currentVerseRef.trim().toLowerCase();
            const cleanRefId = normRef.replace(/[\s:]+/g, '-');
            const foundInDb = activeStudyDb.wordStudies?.find((w: any) => {
              const idMatch = cleanRefId && w.id?.toLowerCase() === `${cleanRefId}-${cleanStrongsCode}`.toLowerCase();
              const refMatch = normRef && w.verseReference?.trim().toLowerCase() === normRef && w.strongsNumber?.toUpperCase() === cleanStrongsCode;
              return idMatch || refMatch;
            }) || activeStudyDb.wordStudies?.find((w: any) => w.strongsNumber?.toUpperCase() === cleanStrongsCode);
            if (foundInDb?.coreMeaning) {
              synchronousCoreMeaning = foundInDb.coreMeaning;
              synchronousRootWord = foundInDb.originalWord;
            }
          }

          // Resolve genuine parent lemma root transliteration & rich theological nuance
          let rootLabel = '';
          if (synchronousRootWord) {
            rootLabel = synchronousRootWord;
          } else if (cachedLexicon?.root_word) {
            rootLabel = cachedLexicon.root_word;
          } else if (activeLexEntry?.transliteration) {
            rootLabel = activeLexEntry.transliteration.split('(')[0].trim().replace(/'/g, '’');
          } else if (activeMorph?.root) {
            rootLabel = getWordTransliteration(activeMorph.root, isHebrew ? 'Hebrew' : 'Greek');
          } else if (activeWordObj) {
            rootLabel = getWordTransliteration(activeWordObj.w, isHebrew ? 'Hebrew' : 'Greek');
          }

          const contextualAction = activeWordObj
            ? getContextualLemmaAction(
                activeWordObj.n,
                activeWordObj.t || '',
                activeWordObj.t || '',
                activeParsingTag,
                isHebrew ? 'Hebrew' : 'Greek'
              )
            : '';

          const cleanCode = (activeWordObj?.n || '').trim().toUpperCase();
          const parentLemma = cleanCode ? getParentLemma(cleanCode) : null;
          const isLexiconLoading = cleanCode ? !!lexiconLoading[cleanCode] : false;
          const isChecked = cleanCode ? !!lexiconChecked[cleanCode] : false;
          const isUntranslatedParticle = cleanCode === 'H853' && activeWordObj?.w && !activeWordObj.w.startsWith('ו');
          const lemmaRootAction = 
            isUntranslatedParticle
              ? 'Accusative Marker (Direct Object Particle • Untranslated in KJV)'
              : (synchronousCoreMeaning || 
                 cachedLexicon?.root_action || 
                 parentLemma?.rootAction || 
                 null);

          return (
            <div 
              key={v.verseNumber} 
              id={`verse-row-${v.verseNumber}`}
              data-verse-number={v.verseNumber}
              className="py-4 space-y-2.5 transition-colors"
            >
              {/* Top First Line: Stationary Verse Indicator + In-Line Active Lemma Nuance & Parsing Tag */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-2 min-h-[30px]"
              >
                {/* Left Side: Verse Number + Clickable Strong's Code + Pure Lemma Root & Theological Nuance */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {/* Stationary Verse Badge with Highlight & Cycle Support */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleVerseColor(v.verseNumber);
                    }}
                    className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center font-mono select-none shrink-0 transition-all active:scale-95 cursor-pointer ${
                      hColor === 'green'
                        ? 'bg-emerald-500 text-white shadow-xs font-black'
                        : hColor === 'blue'
                        ? 'bg-cyan-500 text-white shadow-xs font-black'
                        : hColor === 'red'
                        ? 'bg-rose-500 text-white shadow-xs font-black'
                        : hColor === 'yellow'
                        ? 'bg-amber-400 text-amber-950 shadow-xs font-black'
                        : hColor === 'black'
                        ? (theme === 'light' ? 'bg-zinc-800 text-white shadow-xs ring-1 ring-zinc-700' : 'bg-zinc-200 text-zinc-900 shadow-xs ring-1 ring-zinc-300')
                        : (hasNotes || hColor === 'amber')
                        ? (theme === 'light' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950/40 text-amber-300 border border-amber-600/50')
                        : theme === 'light' 
                          ? 'bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200' 
                          : 'bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700'
                    }`}
                    title={`Verse ${v.verseNumber} — Click to cycle highlight color`}
                  >
                    {v.verseNumber}
                  </button>

                  {/* Clickable Strong's Code + Pure Lemma Root & Theological Nuance (Borderless Typography) */}
                  {isVerseActive && activeWordObj && (
                    <div 
                      className="inline-flex items-center gap-2 max-w-[320px] sm:max-w-[460px] md:max-w-[540px] py-0.5 transition-all overflow-hidden"
                    >
                      {/* Clickable Strong's Code (Text Color Highlight) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStrongsWordStudy(
                            activeWordObj.n || (parentLemma ? parentLemma.parentStrongs : 'H1254'),
                            lemmaRootAction || '',
                            activeWordObj.w,
                            isHebrew ? 'Hebrew' : 'Greek',
                            currentVerseRef
                          );
                        }}
                        className={`font-mono font-bold text-xs sm:text-[12px] tracking-tight shrink-0 flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 hover:underline underline-offset-2 ${getStudyAccentClass()}`}
                        title={parentLemma ? `Strong's ${activeWordObj.n} (Inflected) → Parent Root ${parentLemma.parentStrongs}` : "Click to open Strong's 4-Tier Concordance Modal"}
                      >
                        <span>{activeWordObj.n || '—'}</span>
                        <span className="text-[10px] opacity-75">↗</span>
                      </button>

                      {/* Dot separator */}
                      <span className="text-zinc-300 dark:text-zinc-700 select-none text-[11px] shrink-0">•</span>

                      {/* Theological Root Action (Flowing Typography, horizontal drag/scroll) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-[13.5px] sm:text-[14.5px] select-none flex-1 min-w-0 overflow-x-auto whitespace-nowrap touch-pan-x cursor-grab active:cursor-grabbing scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden antialiased tracking-[0.01em]"
                        title="Theological root action (scroll or drag horizontally to read)"
                      >
                        {isLexiconLoading && !lemmaRootAction ? (
                          <span className={`font-serif italic opacity-75 animate-pulse whitespace-nowrap font-medium text-[13px] sm:text-[14px] ${getStudyAccentClass()}`}>
                            Loading action...
                          </span>
                        ) : lemmaRootAction ? (
                          lemmaRootAction.includes('•') ? (
                            <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
                              {lemmaRootAction.split('•').map((item, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <span className="text-zinc-400 dark:text-zinc-500 font-bold mx-0.5 text-xs select-none">•</span>}
                                  <span className={`font-serif italic font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${getStudyAccentClass()}`}>
                                    {item.trim()}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className={`font-serif italic font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${getStudyAccentClass()}`}>
                              {lemmaRootAction}
                            </span>
                          )
                        ) : (
                          <span className="font-serif italic text-xs opacity-50 select-none">
                            —
                          </span>
                        )}
                      </div>

                      {/* Vertical Micro Separator */}
                      <span className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 shrink-0 select-none mx-0.5" />

                      {/* Personal Lexical Meaning Side-by-Side Pill */}
                      {(() => {
                        const customMeaning = getUserLexiconMeaning(activeWordObj.n);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleQuickEditUserLexicon(activeWordObj.n);
                            }}
                            className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-serif italic transition-all cursor-pointer active:scale-95 ${
                              customMeaning
                                ? 'bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-200 hover:bg-amber-500/25'
                                : 'border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/40'
                            }`}
                            title={customMeaning ? `Personal gloss: "${customMeaning}" (Tap to edit)` : "Attach your personal meaning to this word"}
                          >
                            <span className="font-mono text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase not-italic tracking-wider flex items-center gap-0.5">
                              <span>✦</span> Mine:
                            </span>
                            <span className="truncate max-w-[110px] sm:max-w-[160px] font-semibold">
                              {customMeaning ? `"${customMeaning}"` : '+ Add'}
                            </span>
                            <span className="text-[10px] opacity-70 not-italic">✎</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Right Side: Clickable Grammatical Parsing Badge on top first line */}
                {isVerseActive && activeWordObj && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenParsingModal(
                        activeParsingTag || '',
                        activeWordObj.w,
                        parentLemma ? `${parentLemma.rootWord} (${parentLemma.rootTranslit})` : (activeMorph?.root || activeWordObj.w),
                        lemmaRootAction || '',
                        parentLemma ? `${activeWordObj.n} (Root: ${parentLemma.parentStrongs})` : activeWordObj.n
                      );
                    }}
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95 ${getStudyAccentBadgeClass()}`}
                    title="Click to open Grammatical Parsing Breakdown Modal"
                  >
                    <span>{activeParsingTag || 'Morph'}</span>
                    <span className="text-[9px] opacity-75">↗</span>
                  </button>
                )}
              </div>

              {/* Inline Quick-Edit for User Attached Meaning */}
              {isVerseActive && activeWordObj && activeQuickEditStrongs === activeWordObj.n && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all bg-amber-500/10 border-amber-500/30 text-xs shadow-xs"
                >
                  <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase shrink-0">
                    ✦ {activeWordObj.n}:
                  </span>
                  <input
                    type="text"
                    value={activeQuickEditText}
                    onChange={(e) => setActiveQuickEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveQuickEditUserLexicon(activeWordObj.n);
                      }
                    }}
                    placeholder={`My personal meaning for ${activeWordObj.t || activeWordObj.w}...`}
                    className={`flex-1 text-xs px-2.5 py-1 rounded-lg border font-serif italic focus:outline-none ${
                      theme === 'light'
                        ? 'bg-white border-amber-400 text-neutral-900 placeholder:text-neutral-400'
                        : 'bg-slate-950 border-amber-500/50 text-amber-200 placeholder:text-neutral-600'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveQuickEditUserLexicon(activeWordObj.n)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveQuickEditStrongs(null)}
                    className="p-1 text-xs rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Flowing Manuscript Words Container & KJV English Text via InterlinearVerseRow */}
              <InterlinearVerseRow
                verseNumber={v.verseNumber}
                words={words}
                kjvText={thirdLineText}
                manuscriptTextFallback={verseInter?.manuscriptText || v.manuscriptText}
                isHebrew={isHebrew}
                textDisplayMode={textDisplayMode}
                theme={theme}
                scriptureZoom={scriptureZoom}
                isScriptureItalic={isScriptureItalic}
                textHighlightClass={textHighlightClass}
                activeWordId={activeWordId}
                getStudyAccentClass={getStudyAccentClass}
                getScriptureStyleClasses={getScriptureStyleClasses}
                onSelectWord={(wordObj, alignmentId) => {
                  if (wordObj.n) {
                    fetchLexiconRoot(wordObj.n, currentVerseRef);
                  }
                  const morph = getWordMorphology(wordObj.n, wordObj.w, isHebrew ? 'Hebrew' : 'Greek');
                  const parsingTag = wordObj.p || morph.parsingTag;
                  setSelectedWord({
                    word: wordObj.t || wordObj.w,
                    originalValue: wordObj.w,
                    language: isHebrew ? 'Hebrew' : 'Greek',
                    explanation: `Strong's ${wordObj.n || 'N/A'} [${parsingTag} - ${morph.parsingDescription}]: ${wordObj.t || 'Root'}`
                  });
                  setActiveWordId(alignmentId);
                }}
                onClearWord={() => {
                  setActiveWordId(null);
                  setSelectedWord(null);
                }}
                onDoubleClickVerse={(e) => {
                  handleStudyVerseDoubleClick(e, v.verseNumber, verseHighlight?.notes || '', cleanVerseNoteText);
                }}
                onTouchStartVerse={handleStudyVerseTouchStart}
                onTouchEndVerse={(e) => {
                  handleStudyVerseTouchEnd(e, v.verseNumber, verseHighlight?.notes || '', cleanVerseNoteText);
                }}
                actionPillNode={(activeStudyActionVerse === v.verseNumber || isDrafting) && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-1.5 align-middle select-none rounded-full border shadow-xs backdrop-blur-md transition-all duration-200 bg-neutral-100/95 dark:bg-[#28221c]/95 border-neutral-300/80 dark:border-[#44382f]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 1. Share Icon */}
                    <button
                      type="button"
                      onClick={(e) => handleStudyShareVerse(e, v.verseNumber, thirdLineText)}
                      className="p-1 rounded-full text-zinc-600 hover:text-black hover:bg-neutral-200/70 dark:text-[#c4b9aa] dark:hover:text-[#faf6f0] dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer"
                      title="Share Verse"
                    >
                      {studyShareFeedbackVerse === v.verseNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Micro Divider */}
                    <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                    {/* 2. Highlight Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleVerseColor(v.verseNumber);
                      }}
                      className={`p-1 rounded-full transition-all active:scale-90 cursor-pointer ${
                        hColor === 'green'
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : hColor === 'blue'
                          ? 'text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                          : hColor === 'red'
                          ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : hColor === 'yellow'
                          ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : hColor === 'black'
                          ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          : 'text-zinc-600 hover:text-black hover:bg-neutral-200/70 dark:text-[#c4b9aa] dark:hover:text-[#faf6f0] dark:hover:bg-[#382e27]'
                      }`}
                      title={hColor && hColor !== 'none' ? `Highlight: ${hColor} (Tap to cycle)` : "Highlight Verse"}
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>

                    {/* Micro Divider */}
                    <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                    {/* 3. Cross-Reference Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDrafting) {
                          toggleStudyVerseNote(v.verseNumber, verseHighlight?.notes || '', cleanVerseNoteText);
                          setIsCrossRefOpen(true);
                        } else {
                          const nextOpen = !isCrossRefOpen;
                          setIsCrossRefOpen(nextOpen);
                          if (!nextOpen && inlineContextRef) {
                            setInlineContextRef(null);
                          }
                        }
                      }}
                      className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                        isDrafting && isCrossRefOpen
                          ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                          : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                      }`}
                      title="Cross-References"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Micro Divider */}
                    <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                    {/* 4. Open Note Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStudyVerseNote(v.verseNumber, verseHighlight?.notes || '', cleanVerseNoteText);
                      }}
                      className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                        hasNotes || isDrafting
                          ? 'text-amber-600 dark:text-amber-400 font-bold'
                          : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                      }`}
                      title={isDrafting ? "Close Note" : "Open Note"}
                    >
                      <MessageSquare className="w-3.5 h-3.5" fill={hasNotes ? "currentColor" : "none"} />
                    </button>

                    {/* Micro Divider */}
                    <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                    {/* 5. Smart Office Assistant: Study Later Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStudyLater(v.verseNumber, thirdLineText);
                      }}
                      className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                        isVerseInStudyLater(selectedBook, selectedChapter, v.verseNumber)
                          ? 'text-amber-500 bg-amber-500/20 font-bold'
                          : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                      }`}
                      title={
                        isVerseInStudyLater(selectedBook, selectedChapter, v.verseNumber)
                          ? "Remove from Daily Study Later Docket"
                          : "Remind Me Daily: Study Later"
                      }
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              >

                    {/* Inline Telegram / WhatsApp Style Quoted Reflection Reply Box Expanding Directly Under Verse — Exact Read-View (NarrativeStream) Typography & Layout */}
                    {isDrafting && (
                      <div
                        data-reflection-box="true"
                        className="mt-2 mb-2 w-full select-text"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title=""
                      >
                        {/* WhatsApp / Telegram Quoted Header Banner (Clustered Preview) & Inline Context In-Place Swap */}
                        <AnimatePresence mode="wait">
                          {isCrossRefOpen && (!inlineContextRef ? (
                            attachedCrossRefs && attachedCrossRefs.length > 0 ? (
                              <div className="flex flex-col gap-1.5 py-0.5 px-0.5">
                                {attachedCrossRefs.map((cr) => (
                                  <motion.div
                                    key={`study-quoted-header-preview-${cr.ref}`}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-col"
                                  >
                                    <div key={cr.ref} className="flex items-start justify-between animate-fade-in text-left">
                                      <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                                        {/* Accent indicator matching the cluster */}
                                        <div className={`w-1 h-6 rounded-full shrink-0 mt-0.5 ${theme === 'light' ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
                                        <div className="min-w-0 flex-1 flex flex-col">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`text-xs sm:text-[13px] font-bold font-serif tracking-tight select-none ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                              {cr.ref}
                                            </span>
                                            <span className="text-[8.5px] font-mono uppercase px-1 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                                              Cross-Reference
                                            </span>
                                          </div>
                                          {/* Full unabbreviated scripture text capture without truncation — Aligned with Read View Typography & Tone */}
                                          <div className={`text-[13px] sm:text-sm leading-[1.85] tracking-[0.01em] font-serif not-italic font-medium max-h-36 overflow-y-auto pr-1.5 ${theme === 'light' ? 'text-slate-950' : 'text-slate-50'}`}>
                                            {cr.text}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Buttons: Read Paragraph Context (ChevronRight) & Remove (X) */}
                                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setInlineContextRef(inlineContextRef === cr.ref ? null : cr.ref);
                                          }}
                                          className={`p-1 rounded-full transition-colors cursor-pointer ${
                                            inlineContextRef === cr.ref
                                              ? (theme === 'light' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white')
                                              : (theme === 'light' ? 'hover:bg-zinc-200 text-zinc-900' : 'hover:bg-zinc-800 text-zinc-100')
                                          }`}
                                          title="Read paragraph context"
                                        >
                                          <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 ${inlineContextRef === cr.ref ? 'rotate-90' : ''}`} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeCrossRef(cr.ref);
                                          }}
                                          className="p-1 rounded-full text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                          title="Remove cross-reference"
                                        >
                                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            ) : null
                          ) : (
                            <motion.div
                              key={`study-inline-context-card-${inlineContextRef}`}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 12 }}
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <InlineParagraphContext
                                reference={inlineContextRef}
                                theme={theme}
                                onCollapse={() => setInlineContextRef(null)}
                                onOpenInMainReader={(b, c, vNo) => {
                                  handleCancelNote();
                                  setInlineContextRef(null);
                                  setCurrentlyReadingVerse(null);
                                  setMainView('read');
                                  setSelectedBook(b);
                                  setSelectedChapter(c);
                                  if (vNo) {
                                    setTimeout(() => {
                                      const el = document.getElementById(`verse-row-${vNo}`) || document.querySelector(`[id$="-${vNo}"]`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 250);
                                  }
                                }}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Material 3 Compact Cross-Reference Attachment Popover */}
                        {isCrossRefOpen && (
                          <div className={`p-2.5 border-b animate-fade-in text-left ${
                            theme === 'light' ? 'bg-zinc-100/90 border-zinc-200' : 'bg-zinc-900/90 border-zinc-800'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-800 dark:text-zinc-200">
                                Cross-Reference
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsCrossRefOpen(false)}
                                className="p-1 rounded-full text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white transition cursor-pointer"
                                title="Close"
                              >
                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>

                            {/* Contextual Suggestion Pills */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(() => {
                                const suggestions = getCrossReferencesForVerse(
                                  selectedBook,
                                  selectedChapter,
                                  v.verseNumber,
                                  thirdLineText
                                );
                                const allPills = Array.from(new Set([
                                  ...suggestions,
                                  ...(attachedCrossRefs || []).map((cr) => cr.ref)
                                ]));
                                return allPills.map((ref) => {
                                  const isCurrentlyPreviewed = attachedCrossRefs.some((cr) => cr.ref === ref);
                                  const isUserAdded = isUserAddedCrossReference(
                                    selectedBook,
                                    selectedChapter,
                                    v.verseNumber,
                                    ref
                                  );
                                  return (
                                    <span
                                      key={ref}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all active:scale-95 ${
                                        isCurrentlyPreviewed
                                          ? (theme === 'light' ? 'bg-black text-white border-black shadow-xs' : 'bg-[#342b25] text-[#faf6f0] border-[#483a30] shadow-xs')
                                          : (theme === 'light' ? 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300/80 shadow-2xs' : 'bg-[#241e1a] hover:bg-[#2e2621] text-[#dcd3c6] border-[#382e27] shadow-2xs')
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          attachCrossRef(ref, true);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        + {ref}
                                      </button>
                                      {isUserAdded && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeUserCrossReference(
                                              selectedBook,
                                              selectedChapter,
                                              v.verseNumber,
                                              ref
                                            );
                                            removeCrossRef(ref);
                                          }}
                                          className="ml-0.5 p-0.5 rounded-full hover:text-rose-500 cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                                          title="Delete added cross-reference from card"
                                        >
                                          <X className="w-2.5 h-2.5 stroke-[2.5]" />
                                        </button>
                                      )}
                                    </span>
                                  );
                                });
                              })()}
                            </div>

                            {/* Direct reference input */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={crossRefInputText}
                                onChange={(e) => setCrossRefInputText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && crossRefInputText.trim()) {
                                    e.preventDefault();
                                    const cleanRef = crossRefInputText.trim();
                                    addUserCrossReference(
                                      selectedBook,
                                      selectedChapter,
                                      v.verseNumber,
                                      cleanRef
                                    );
                                    attachCrossRef(cleanRef, true);
                                  }
                                }}
                                placeholder="Enter reference..."
                                className={`flex-1 text-xs px-2 py-1 rounded-lg border focus:outline-none ${
                                  theme === 'light'
                                    ? 'bg-white border-zinc-300 text-black placeholder:text-zinc-400'
                                    : 'bg-[#241e1a] border-[#382e27] text-[#faf6f0] placeholder:text-[#b5a99a]'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (crossRefInputText.trim()) {
                                    const cleanRef = crossRefInputText.trim();
                                    addUserCrossReference(
                                      selectedBook,
                                      selectedChapter,
                                      v.verseNumber,
                                      cleanRef
                                    );
                                    attachCrossRef(cleanRef, true);
                                  }
                                }}
                                disabled={!crossRefInputText.trim()}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                  theme === 'light'
                                    ? 'bg-black text-white hover:bg-zinc-800'
                                    : 'bg-[#342b25] text-[#faf6f0] hover:bg-[#483d34] border border-[#483a30]'
                                }`}
                              >
                                Attach
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Reflection Note Box (Opens directly when user taps Note in the pill) */}
                        <InlineReflectionContext
                          verseNumber={v.verseNumber}
                          reference={`${selectedBook} ${selectedChapter}:${v.verseNumber}`}
                          verseText={thirdLineText || ''}
                          initialNote={getVerseHighlight(v.verseNumber)?.notes || noteDraftText || ''}
                          onSave={(savedNote) => {
                            setNoteDraftText(savedNote);
                            updateVerseProfileNotes(v.verseNumber, savedNote);
                            const currentHighlight = getVerseHighlight(v.verseNumber);
                            if (!currentHighlight?.color || currentHighlight.color === 'none') {
                              setVerseHighlightColor(v.verseNumber, 'amber');
                            }
                          }}
                          onCollapse={() => {
                            setExpandedNoteVerses((prev) => ({ ...prev, [v.verseNumber]: false }));
                            handleCancelNote();
                          }}
                          theme={theme}
                        />
                      </div>
                    )}
              </InterlinearVerseRow>
            </div>
          );
        })}
      </div>
    </div>
  );
})() : (
  <>
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

    {/* SCRIPTURE CHAPTER VIEW */}
    {chapterData ? (
      <AnimatePresence mode="wait">
        <motion.div 
          key={`${selectedBook}-${selectedChapter}`}
          initial={{ x: slideDirection === 'forward' ? '100%' : slideDirection === 'backward' ? '-100%' : 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: slideDirection === 'forward' ? '-100%' : slideDirection === 'backward' ? '100%' : 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="space-y-1.5"
          onAnimationComplete={() => setSlideDirection('none')}
        >
        {/* READING SCHEME */}
        <div className="grid grid-cols-1 gap-1.5 items-start">
          <div className="space-y-1">
            {/* Table container */}
            <div 
              ref={scriptureContainerRef}
              className={`scripture-zoom-container relative z-20 transition-all duration-500 antialiased ${
                scriptureTypefaceSetting === 'untitled-serif'
                  ? 'font-untitled'
                  : scriptureTypefaceSetting === 'serif'
                  ? 'font-serif'
                  : scriptureTypefaceSetting === 'mono'
                  ? 'font-mono'
                  : 'font-sans'
              } ${
                isScriptureBold ? 'font-bold' : ''
              } ${
                'text-[18px]'
              } ${
                scriptureTextStyleSetting === 'elegant' ? 'font-light tracking-[0.02em] leading-[2.0]' : scriptureTextStyleSetting === 'compact' ? 'tracking-tight leading-snug' : scriptureTextStyleSetting === 'classic' ? 'font-medium leading-[1.9]' : 'font-normal leading-[1.8] tracking-[0.01em]'
              } ${
                theme === 'light' ? 'bg-transparent text-slate-800' : 'bg-transparent text-slate-200'
              }`}
            >
              {layoutMode === 'paragraph' ? (() => {
                    const versesList = paginatedVersesList;
                    const chunks: any[][] = groupVersesByStory(versesList, selectedBook, selectedChapter);

                    const renderNarrativeStream = () => (
                      <NarrativeStream
                        key="kjv"
                        title="King James Version (KJV)"
                        streamType="kjv"
                        chunks={chunks}
                        focusedVerse={focusedVerse}
                        focusedStreamType={focusedStreamType}
                        setFocusedVerse={setFocusedVerse}
                        setFocusedStreamType={setFocusedStreamType}
                        currentlyReadingVerse={currentlyReadingVerse}
                        getVerseHighlightColor={(vNo) => getVerseHighlight(vNo)?.color}
                        setVerseHighlightColor={(vNo, color) => {
                          setVerseHighlightColor(vNo, color);
                        }}
                        openContextualNotebook={(vNo) => {
                           const snippet = chapterData?.verses?.find((v: any) => v.verseNumber === vNo)?.kjvText || '';
                           startEditingNote(vNo, getVerseHighlight(vNo)?.notes || '', snippet);
                        }}
                        theme={theme}
                        playbackSpeed={playbackSpeed}
                        setPlaybackSpeed={setPlaybackSpeed}
                        isHeaderHidden={isHeaderHidden}

                        activeDraftVerse={activeDraftVerse}
                        noteDraftText={noteDraftText}
                        setNoteDraftText={setNoteDraftText}
                        handleCancelNote={handleCancelNote}
                        handleSaveNote={handleSaveNote}
                        updateVerseProfileNotes={updateVerseProfileNotes}
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
                        manuscriptBold={manuscriptBold}
                        manuscriptItalic={manuscriptItalic}
                        isScriptureItalic={isScriptureItalic}
                        selectedBook={selectedBook}
                        selectedChapter={selectedChapter}
                        isCrossRefOpen={isCrossRefOpen}
                        setIsCrossRefOpen={setIsCrossRefOpen}
                        crossRefInputText={crossRefInputText}
                        setCrossRefInputText={setCrossRefInputText}
                        attachCrossRef={attachCrossRef}
                        removeCrossRef={removeCrossRef}
                        attachedCrossRefs={attachedCrossRefs}
                        commonCrossReferences={COMMON_CROSS_REFERENCES}
                        inlineContextRef={inlineContextRef}
                        setInlineContextRef={setInlineContextRef}
                        onOpenInMainReader={(b, c, v) => {
                          handleCancelNote();
                          setInlineContextRef(null);
                          setCurrentlyReadingVerse(null);
                          setSelectedBook(b);
                          setSelectedChapter(c);
                          if (v) {
                            setTimeout(() => {
                              const el = document.getElementById(`verse-row-${v}`) || document.querySelector(`[id$="-${v}"]`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 250);
                          }
                        }}
                      />
                    );

                    return (
                      <div className="p-5 md:p-8 space-y-6">
                        <div 
                          className={`max-w-3xl mx-auto ${getScriptureStyleClasses()}`}
                          style={{ fontSize: `${Math.round(18 * (scriptureZoom || 1.6))}px`, lineHeight: 1.8 }}
                        >
                          {renderNarrativeStream()}
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
                          const hColor = verseHighlight?.color || (hasNotes ? 'amber' : 'none');
                          
                          let verseTextColorClass = '';
                          if (hColor === 'green') {
                            verseTextColorClass = theme === 'light' ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-emerald-400 font-medium';
                          } else if (hColor === 'blue') {
                            verseTextColorClass = theme === 'light' ? 'text-cyan-700 dark:text-cyan-400 font-medium' : 'text-cyan-400 font-medium';
                          } else if (hColor === 'red') {
                            verseTextColorClass = theme === 'light' ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-rose-400 font-medium';
                          } else if (hColor === 'yellow') {
                            verseTextColorClass = theme === 'light' ? 'text-amber-600 dark:text-amber-300 font-medium' : 'text-amber-300 font-medium';
                          } else if (hColor === 'black') {
                            verseTextColorClass = theme === 'light' ? 'text-zinc-600 dark:text-zinc-400 font-medium' : 'text-zinc-400 font-medium';
                          } else {
                            verseTextColorClass = theme === 'light' ? 'text-slate-900' : 'text-white';
                          }
                          const cardFocusClass = isFocused ? (theme === 'light' ? 'ring-2 ring-cyan-500/50' : 'ring-2 ring-cyan-400/50') : '';

                          const getBadgeColorClass = () => {
                            if (isFocused) return 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400';
                            if (isReadingThis) return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse';
                            if (hColor === 'green') return 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400';
                            if (hColor === 'blue') return 'bg-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400';
                            if (hColor === 'red') return 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/30 ring-1 ring-rose-400';
                            if (hColor === 'yellow') return 'bg-amber-400 text-amber-950 font-black shadow-md shadow-amber-400/30 ring-1 ring-amber-400';
                            if (hColor === 'black') return theme === 'light' ? 'bg-zinc-800 text-white font-black shadow-sm ring-1 ring-zinc-700' : 'bg-zinc-200 text-zinc-900 font-black shadow-sm ring-1 ring-zinc-300';
                            if (hColor === 'amber' || hasNotes) return 'bg-amber-500/20 text-amber-500 border border-amber-500/40 font-black';
                            return theme === 'light'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                              : 'bg-[#251f1b] hover:bg-[#2e2621] text-[#e4ded5] border border-[#3d322b]';
                          };

                          let textContent = null;
                          let title = '';
                          let fontClasses = '';

                          if (transType === 'plain') {
                              title = 'PET';
                              fontClasses = `${plainBold ? 'font-extrabold' : 'font-bold'} ${isScriptureItalic ? 'gentle-italic' : 'not-italic'}`;
                              textContent = <div className="flex flex-col w-full"><div>{v.contemporary}</div></div>;
                          } else if (transType === 'pers') {
                              title = 'PPV';
                              fontClasses = `${personalizedBold ? 'font-extrabold' : 'font-bold'} ${isScriptureItalic ? 'gentle-italic' : 'not-italic'}`;
                              textContent = <div className="flex flex-col w-full"><div>{v.nonNativeEnglish}</div></div>;
                          } else if (transType === 'kjv') {
                              title = 'Reference (KJV)';
                              fontClasses = `${manuscriptBold ? 'font-extrabold' : 'font-bold'} ${isScriptureItalic ? 'gentle-italic' : 'not-italic'}`;
                              const rawKjvTokens = parseKjvRawTokens(v.kjvText || '');
                              textContent = (
                                <span>
                                  {rawKjvTokens.map((t) => (
                                    <span
                                      key={t.rawIdx}
                                      className={t.isSupplied ? 'italic font-normal opacity-85' : ''}
                                      title={t.isSupplied ? 'Supplied word (added by KJV translators, not in original manuscript)' : undefined}
                                    >
                                      {t.text}
                                    </span>
                                  ))}
                                </span>
                              );
                          } else if (transType === 'bsb') {
                              title = 'Berean Standard Bible';
                              fontClasses = `${manuscriptBold ? 'font-extrabold' : 'font-bold'} ${isScriptureItalic ? 'gentle-italic' : 'not-italic'}`;
                              textContent = <span>{v.bsbText || ''}</span>;
                          }

                          return (
                            <div
                              key={`${transType}-${v.verseNumber}`}
                              id={`verse-row-${v.verseNumber}`}
                              data-verse-number={v.verseNumber}
                              className="flex flex-row items-start gap-2.5 mb-3 group"
                            >
                              {/* Standalone Compact Bold Number Badge (Click cycles highlight colors) */}
                              <div className="flex flex-col items-center shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleVerseColor(v.verseNumber);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    cycleVerseColor(v.verseNumber);
                                  }}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm select-none transition-all active:scale-95 touch-manipulation ${getBadgeColorClass()}`}
                                  title={`Verse ${v.verseNumber} — Click to cycle highlight color`}
                                >
                                  {v.verseNumber}
                                </button>

                                {/* Dedicated 1-Tap Thematic Reflection / Study Icon Button directly under verse indicator */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingNote(v.verseNumber, getVerseHighlight(v.verseNumber)?.notes || '', stripSuppliedMarkup(v.kjvText || v.contemporary || v.nonNativeEnglish || ''));
                                  }}
                                  className={`mt-1.5 p-1 rounded-md transition-all active:scale-95 cursor-pointer ${
                                    hasNotes
                                      ? (theme === 'light' ? 'text-black' : 'text-white')
                                      : (theme === 'light' ? 'text-zinc-400 hover:text-black' : 'text-zinc-400 hover:text-white')
                                  }`}
                                  title="Add or edit study reflection"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" fill={hasNotes ? "currentColor" : "none"} />
                                </button>
                              </div>

                              {/* Scripture Text Container (Double-Click opens Study Note Box) */}
                              <div
                                onMouseEnter={() => {
                                  if (activeDraftVerse !== v.verseNumber) {
                                    setHoveredVerse(v.verseNumber);
                                  }
                                }}
                                onMouseLeave={() => setHoveredVerse(null)}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleCardVerseDoubleTap(v);
                                }}
                                onTouchStart={handleCardVerseTouchStart}
                                onTouchEnd={(e) => handleCardVerseTouchEnd(e, v)}
                                  className={`flex-1 flex flex-col py-2.5 px-3.5 rounded-xl transition-all duration-200 cursor-pointer relative shadow-sm ${cardFocusClass} ${
                                    theme === 'light' ? 'bg-white border border-slate-100' : 'bg-[#0a0d16] border border-cyan-950/20'
                                  } ${
                                    hoveredVerse === v.verseNumber && !hasNotes && !isFocused
                                      ? (theme === 'light' ? 'shadow-md scale-[1.005] bg-white' : 'shadow-md scale-[1.005] bg-[#0c111c]')
                                      : ''
                                  } ${isReadingThis ? 'ring-2 ring-cyan-500/40 shadow-md animate-pulse-slow' : ''}`}
                              >
                                <div 
                                  className={`${getScriptureStyleClasses()} ${fontClasses} tracking-[0.01em] ${verseTextColorClass}`}
                                  style={{ fontSize: `${Math.round(18 * (scriptureZoom || 1.6))}px`, lineHeight: 1.8 }}
                                >
                                  {textContent}
                                  {(cardActiveShareVerse === v.verseNumber || activeDraftVerse === v.verseNumber) && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-1.5 align-middle select-none rounded-full border shadow-xs backdrop-blur-md transition-all duration-200 bg-neutral-100/95 dark:bg-[#28221c]/95 border-neutral-300/80 dark:border-[#44382f]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* 1. Share Icon */}
                                      <button
                                        type="button"
                                        onClick={(e) => handleShareCardVerse(e, v)}
                                        className="p-1 rounded-full text-zinc-600 hover:text-black hover:bg-neutral-200/70 dark:text-[#c4b9aa] dark:hover:text-[#faf6f0] dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer"
                                        title="Share Verse"
                                      >
                                        {cardShareFeedbackVerse === v.verseNumber ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                          <Share2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>

                                      {/* Micro Divider */}
                                      <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                                      {/* 2. Cross-Reference Icon */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCrossRefOpen(!isCrossRefOpen);
                                        }}
                                        className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                                          isCrossRefOpen
                                            ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                                            : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                                        }`}
                                        title="Cross-References"
                                      >
                                        <Link2 className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Micro Divider */}
                                      <span className="w-px h-3 bg-neutral-300 dark:bg-[#44382f]" />

                                      {/* 3. Open Note Icon */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedNoteVerses((prev) => ({
                                            ...prev,
                                            [v.verseNumber]: !prev[v.verseNumber],
                                          }));
                                        }}
                                        className={`p-1 rounded-full hover:bg-neutral-200/70 dark:hover:bg-[#382e27] transition-all active:scale-90 cursor-pointer ${
                                          expandedNoteVerses[v.verseNumber]
                                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                                            : 'text-zinc-600 hover:text-black dark:text-[#c4b9aa] dark:hover:text-[#faf6f0]'
                                        }`}
                                        title={expandedNoteVerses[v.verseNumber] ? "Close Note" : "Open Note"}
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </button>
                                    </span>
                                  )}
                                </div>

                                {/* Inline Telegram / WhatsApp Style Quoted Reflection Reply Box Expanding Directly Under Verse */}
                                {activeDraftVerse === v.verseNumber && (
                                  <div
                                    data-reflection-box="true"
                                    className="mt-2 mb-2 w-full select-text"
                                    onClick={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title=""
                                  >
                                     {/* WhatsApp / Telegram Quoted Header Banner (Clustered Preview) & Inline Context In-Place Swap */}
                                     <AnimatePresence mode="wait">
                                       {isCrossRefOpen && (!inlineContextRef ? (
                                          attachedCrossRefs && attachedCrossRefs.length > 0 ? (
                                            <div className="flex flex-col gap-1.5 py-0.5 px-0.5">
                                              {attachedCrossRefs.map((cr) => (
                                                <motion.div
                                                  key={`pericope-quoted-preview-${cr.ref}`}
                                                  initial={{ opacity: 0, x: -12 }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  exit={{ opacity: 0, x: -12 }}
                                                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                                  className="flex flex-col"
                                                >
                                                  <div key={cr.ref} className="flex items-start justify-between animate-fade-in text-left">
                                                    <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                                                      {/* Accent indicator matching the cluster */}
                                                      <div className={`w-1 h-6 rounded-full shrink-0 mt-0.5 ${theme === 'light' ? 'bg-zinc-400' : 'bg-zinc-600'}`} />
                                                      <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                          <Link2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                                                          <span className={`text-[11.5px] sm:text-xs font-bold font-serif tracking-tight select-none ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                                                            {cr.ref}
                                                          </span>
                                                          <span className="text-[8.5px] font-mono uppercase px-1 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                                                            Cross-Reference
                                                          </span>
                                                        </div>
                                                        {/* Full unabbreviated scripture text capture without truncation */}
                                                        <div className={`text-[11px] sm:text-[11.5px] leading-relaxed font-untitled italic font-normal max-h-28 overflow-y-auto pr-1 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
                                                          {cr.text}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Action Buttons: Read Paragraph Context (ChevronRight) & Detach */}
                                                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setInlineContextRef(inlineContextRef === cr.ref ? null : cr.ref);
                                                        }}
                                                        className={`p-1 rounded-full transition-colors cursor-pointer ${
                                                          inlineContextRef === cr.ref
                                                            ? (theme === "light" ? "bg-cyan-100 text-cyan-800" : "bg-cyan-900/40 text-cyan-300")
                                                            : (theme === "light" ? "hover:bg-zinc-200 text-zinc-800" : "hover:bg-[#342b25] text-[#faf6f0]")
                                                        }`}
                                                        title="Read paragraph context"
                                                      >
                                                        <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 ${inlineContextRef === cr.ref ? "rotate-90 text-cyan-600 dark:text-cyan-400" : ""}`} />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          removeCrossRef(cr.ref);
                                                        }}
                                                        className="p-1 rounded-full text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                        title="Remove cross-reference"
                                                      >
                                                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </motion.div>
                                              ))}
                                            </div>
                                          ) : null
                                       ) : (
                                         <motion.div
                                           key={`inline-context-card-${inlineContextRef}`}
                                            initial={{ opacity: 0, x: 12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12 }}
                                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                         >
                                           <InlineParagraphContext
                                             reference={inlineContextRef}
                                             theme={theme}
                                             onCollapse={() => setInlineContextRef(null)}
                                             onOpenInMainReader={(b, c, vNo) => {
                                               handleCancelNote();
                                               setInlineContextRef(null);
                                               setCurrentlyReadingVerse(null);
                                               setSelectedBook(b);
                                               setSelectedChapter(c);
                                               if (vNo) {
                                                 setTimeout(() => {
                                                   const el = document.getElementById(`verse-row-${vNo}`) || document.querySelector(`[id$="-${vNo}"]`);
                                                   if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                 }, 250);
                                               }
                                             }}
                                           />
                                         </motion.div>
                                       ))}
                                     </AnimatePresence>
                                    {/* Material 3 Compact Cross-Reference Attachment Popover */}
                                    {isCrossRefOpen && (
                                      <div className={`p-2.5 border-b animate-fade-in text-left rounded-xl ${
                                        theme === 'light' ? 'bg-zinc-100/90 border-zinc-200' : 'bg-[#241e1a] border-[#382e27]'
                                      }`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-1.5">
                                            <Link2 className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-zinc-500' : 'text-[#b5a99a]'}`} />
                                            <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${theme === 'light' ? 'text-zinc-600' : 'text-[#dcd3c6]'}`}>
                                              Cross-Reference
                                            </span>
                                          </div>

                                        </div>

                                        {/* Direct reference input */}
                                        <div className="flex items-center gap-1.5 mb-2.5">
                                          <input
                                            type="text"
                                            value={crossRefInputText}
                                            onChange={(e) => setCrossRefInputText(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                attachCrossRef(crossRefInputText);
                                              }
                                            }}
                                            placeholder="Enter reference..."
                                            className={`flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                              theme === 'light'
                                                ? 'bg-white border-zinc-300 text-black placeholder:text-zinc-400'
                                                : 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); attachCrossRef(crossRefInputText); }}
                                            disabled={!crossRefInputText.trim()}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                              theme === 'light'
                                                ? 'bg-black text-white hover:bg-zinc-800'
                                                : 'bg-white text-black hover:bg-zinc-200'
                                            }`}
                                          >
                                            Attach
                                          </button>
                                        </div>

                                        {/* Common Cross References Quick Chips */}
                                        <div className="space-y-1">
                                          <div className="text-[9.5px] uppercase font-bold tracking-wider text-zinc-500">
                                            Suggested References
                                          </div>
                                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar py-0.5">
                                            {getCrossReferencesForVerse(
                                              selectedBook,
                                              selectedChapter,
                                              v.verseNumber,
                                              v.kjvText || v.contemporary || v.nonNativeEnglish
                                            ).map((ref) => (
                                              <button
                                                key={ref}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  attachCrossRef(ref);
                                                }}
                                                className={`px-2 py-0.5 text-[10.5px] font-mono rounded-md border transition-all cursor-pointer ${
                                                  attachedCrossRefs.some((cr) => cr.ref === ref)
                                                    ? (theme === 'light' ? 'bg-zinc-200 border-zinc-400 text-black font-bold' : 'bg-zinc-700 border-zinc-500 text-white font-bold')
                                                    : (theme === 'light' ? 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-300')
                                                }`}
                                              >
                                                + {ref}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}



                                    {/* Reflection Note sheet automatically open directly below composer */}
                                    {expandedNoteVerses[v.verseNumber] && (
                                      <InlineReflectionContext
                                        verseNumber={v.verseNumber}
                                        reference={`${selectedBook} ${selectedChapter}:${v.verseNumber}`}
                                        verseText={v.text}
                                        initialNote={getVerseHighlight(v.verseNumber)?.notes || noteDraftText || ''}
                                        onSave={(savedNote) => {
                                          setNoteDraftText(savedNote);
                                          updateVerseProfileNotes(v.verseNumber, savedNote);
                                        }}
                                        onCollapse={() => setExpandedNoteVerses(prev => ({ ...prev, [v.verseNumber]: false }))}
                                        theme={theme}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                      };

                      return (
                        <div className="flex flex-col space-y-1 py-1">
                          {chapterData.verses.map(v => renderVerseCard(v, 'kjv'))}
                        </div>
                      );
                    })()}

                    </div>
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>
      ) : loading ? (
        <div className="w-full py-16 flex items-center justify-center">
          <Loader2 className={`w-6 h-6 animate-spin ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`} />
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
    </>
  )}
</main>



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
                    📱 Install LogosBridge App
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md shrink-0 flex items-center justify-center bg-white border border-slate-200/90 dark:border-slate-800">
                  <img src={appLogoNew} alt="LogosBridge" className="w-full h-full object-cover" />
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
                        Open the LogosBridge application directly from your system App Drawer!
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
                        Or open Chrome Options (three dots on far-right) and choose <strong className="text-cyan-500 font-bold">"Install LogosBridge..."</strong>.
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
              <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[45vh] pr-1">
                
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
                  : 'bg-[#1e1916] border-[#382e27] text-[#faf6f0]'
              }`}
            >
              {/* Header section with nice glowing borders */}
              <div className={`p-4 md:p-5 border-b flex items-center justify-between shrink-0 relative ${
                theme === 'light' ? 'border-slate-150 bg-slate-50/50' : 'border-[#382e27] bg-[#241e1a]'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl flex items-center justify-center ${
                    theme === 'light' ? 'bg-cyan-50' : 'bg-cyan-950/30 border border-cyan-900/10'
                  }`}>
                    <BookOpen className="w-5 h-5 text-cyan-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold uppercase tracking-wider text-black dark:text-[#faf6f0]">
                      Study Companion Workspace
                    </h3>
                    <p className={`text-[9.5px] font-mono leading-none mt-0.5 ${
                      theme === 'light' ? 'text-slate-500' : 'text-amber-500/90 dark:text-amber-300'
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
                      : 'bg-[#28211c] border-[#382e27] text-[#dcd3c6] hover:text-[#faf6f0]'
                  }`}
                  title="Close workspace"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* THREE-SIDE PREMIUM TAB BAR */}
              <div className={`flex border-b shrink-0 overflow-x-auto scrollbar-none snap-x ${
                theme === 'light' ? 'bg-slate-50 border-slate-150' : 'bg-[#241e1a] border-[#382e27]'
              }`}>
                {/* Tab 1: Theological Diary */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('notes');
                    setSidebarSearchQuery('');
                  }}
                  className={`flex-1 min-w-[110px] snap-center py-3 text-center text-sm font-bold font-sans flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    activeSidebarTab === 'notes'
                      ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:text-[#b5a99a] dark:hover:text-[#faf6f0]'
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
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:text-[#b5a99a] dark:hover:text-[#faf6f0]'
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
                      : 'border-transparent text-slate-400 hover:text-slate-500 dark:text-[#b5a99a] dark:hover:text-[#faf6f0]'
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
                    
                    {/* Search box and Sync button for notes filter */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
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
                      {firebaseUser && (
                        <button
                          type="button"
                          onClick={() => refreshCloudBookmarks()}
                          disabled={isSyncingNotes}
                          title="Sync Notes with Cloud"
                          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                            isSyncingNotes ? 'opacity-80' : 'hover:scale-105 active:scale-95'
                          } ${
                            theme === 'light'
                              ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                              : 'bg-slate-900 text-cyan-400 border-cyan-900/50 hover:bg-slate-800 shadow-inner'
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncingNotes ? 'animate-spin text-cyan-500' : ''}`} />
                        </button>
                      )}
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
                                    "{extractPlainTextFromNote(n.notes)}"
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




      

                  <AnimatePresence>
                    {isBookDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`fixed inset-0 z-[2000] w-full h-full flex flex-col overflow-hidden ${
                          theme === 'light' ? 'bg-[#fafafa] text-zinc-900' : 'bg-[#070a13] text-zinc-100'
                        }`}
                      >
                        {/* Premium Material 3 Top App Bar */}
                        <div className={`shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between backdrop-blur-xl ${
                          theme === 'light' ? 'bg-white/95 border-zinc-200/80 shadow-xs' : 'bg-[#0a0e1a]/95 border-zinc-800/70 shadow-xs'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                              theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'
                            }`}>
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <h1 className={`text-xl sm:text-2xl font-sans font-black tracking-[-0.02em] leading-tight ${
                                theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'
                              }`}>
                                THE 66 BIBLE BOOKS
                              </h1>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsBookDropdownOpen(false)}
                            className={`p-1.5 rounded-md flex items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation ${
                              theme === 'light' ? 'text-zinc-700 hover:text-black hover:bg-zinc-100' : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                            }`}
                            title="Close"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Unified M3 Book Grid with Inline Slide-down Chapters */}
                        <div className={`flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-24 ${
                          theme === 'light' ? 'bg-[#fafafa]' : 'bg-[#070a13]'
                        }`}>
                          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                            {BIBLE_BOOKS.map((book) => (
                              <div key={book.name} id={`book-section-${book.name}`} className="flex flex-col">
                                <button
                                  type="button"
                                  id={`select-book-${book.name}`}
                                  onClick={() => {
                                    setExpandedBook(expandedBook === book.name ? null : book.name);
                                  }}
                                  className={`text-left py-3 px-3 rounded-xl font-sans flex items-center justify-between touch-manipulation select-none cursor-pointer active:opacity-60 transition-colors duration-75 ${
                                    expandedBook === book.name
                                      ? (theme === 'light' ? 'bg-zinc-100/70' : 'bg-zinc-900/60')
                                      : (theme === 'light' ? 'hover:bg-zinc-100/50' : 'hover:bg-zinc-900/40')
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`text-base tracking-tight ${
                                      selectedBook === book.name
                                        ? (theme === 'light' ? 'text-black font-black' : 'text-white font-black')
                                        : (theme === 'light' ? 'text-zinc-800 font-medium' : 'text-zinc-200 font-medium')
                                    }`}>
                                      {book.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] opacity-40 font-mono">{book.chapters} ch</span>
                                </button>

                                {/* Pure M3 Chapter Numbers Grid */}
                                <AnimatePresence>
                                  {expandedBook === book.name && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15, ease: "easeOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="flex flex-wrap gap-2 sm:gap-2.5 py-2.5 px-1">
                                        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
                                          <button
                                            type="button"
                                            key={ch}
                                            onClick={() => {
                                              setSelectedBook(book.name);
                                              setSelectedChapter(ch);
                                              setStudyResponse(null);
                                              setStudyQuery('');
                                              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                              document.documentElement.scrollTop = 0;
                                              document.body.scrollTop = 0;
                                              setIsHeaderHidden(false);
                                              setIsSidePanelHidden(false);
                                              setIsBookDropdownOpen(false); // Return directly to reader view
                                            }}
                                            className={`w-9 h-9 sm:w-10 sm:h-10 aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold font-sans touch-manipulation select-none cursor-pointer active:opacity-60 transition-colors duration-75 ${
                                              selectedBook === book.name && selectedChapter === ch
                                                ? (theme === 'light'
                                                    ? 'bg-black text-white shadow-xs'
                                                    : 'bg-white text-black shadow-xs')
                                                : (theme === 'light'
                                                    ? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200'
                                                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60')
                                            }`}
                                          >
                                            {ch}
                                          </button>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

      {/* MATERIAL 3 SLIDE-UP PROFILE / AUTHENTICATION BOTTOM SHEET */}
      {/* AUTHENTICATION GATE & USER PROFILE MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          !firebaseUser ? (
            /* FULL DEDICATED SCREEN FOR SIGN IN / CREATE ACCOUNT (CANNOT BE SLID DOWN OR BYPASSED) */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[3000] w-full min-h-screen bg-slate-100 dark:bg-[#121314] overflow-y-auto flex flex-col justify-center items-center p-3 sm:p-6"
            >
              <div className="w-full max-w-md my-auto">
                <AuthView 
                  currentUser={null}
                  onAvatarChange={(newAvatar) => {
                    setUserAvatar(newAvatar);
                    try {
                      localStorage.setItem('logosbridge_active_avatar', newAvatar);
                    } catch (e) {
                      console.warn('Storage warning:', e);
                    }
                  }}
                  onSuccess={() => {
                    try {
                      localStorage.setItem('logosbridge_auth_prompted_once', 'true');
                    } catch {}
                    setIsAuthModalOpen(false);
                    setMainView('home');
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  onClose={() => {
                    try {
                      localStorage.setItem('logosbridge_auth_prompted_once', 'true');
                    } catch {}
                    setIsAuthModalOpen(false);
                    setMainView('home');
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                />
              </div>
            </motion.div>
          ) : (
            /* AUTHENTICATED PROFILE & ACCOUNT MANAGEMENT (DISMISSIBLE VIA BOTTOM SHEET OR CONTINUE BUTTON) */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2500] flex flex-col justify-end bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAuthModalOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.7 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 300) {
                    setIsAuthModalOpen(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg mx-auto bg-white dark:bg-[#1e1f20] rounded-t-[28px] sm:rounded-t-[32px] shadow-2xl border-t border-slate-200/80 dark:border-zinc-800 overflow-hidden max-h-[88vh] flex flex-col touch-pan-y"
              >
                {/* Top Handle Bar for Bottom Sheet Dismissal */}
                <div 
                  className="pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none" 
                  onClick={() => setIsAuthModalOpen(false)}
                  title="Drag down or tap to dismiss"
                >
                  <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                </div>

                <div className="overflow-y-auto p-2 sm:p-4">
                  <AuthView 
                    currentUser={firebaseUser}
                    onAvatarChange={(newAvatar) => {
                      setUserAvatar(newAvatar);
                      try {
                        localStorage.setItem('logosbridge_active_avatar', newAvatar);
                        if (firebaseUser?.uid) {
                          localStorage.setItem(`logosbridge_avatar_${firebaseUser.uid}`, newAvatar);
                        }
                      } catch (e) {
                        console.warn('Storage warning:', e);
                      }
                    }}
                    onSuccess={() => {}}
                    onClose={() => setIsAuthModalOpen(false)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* 4D STRONG'S CONCORDANCE & ANE WORD STUDY MODAL */}
      <StrongsWordStudyModal
        isOpen={isStrongsModalOpen}
        onClose={() => setIsStrongsModalOpen(false)}
        strongsNumber={activeStrongsData?.strongs || 'H1254'}
        word={activeStrongsData?.word}
        originalValue={activeStrongsData?.originalValue}
        language={activeStrongsData?.language || 'Hebrew'}
        theme={theme}
        verseReference={activeStrongsData?.verseReference}
        initialDb={strongsStudyDb || globalStrongsDbCache}
      />

      {/* FULL GRAMMATICAL PARSING & MORPHOLOGY BREAKDOWN MODAL */}
      <ParsingTagModal
        isOpen={isParsingModalOpen}
        onClose={() => setIsParsingModalOpen(false)}
        data={activeParsingData}
        theme={theme}
        onExploreStrongs={(strongs, gloss, word, lang) => {
          setIsParsingModalOpen(false);
          handleOpenStrongsWordStudy(
            strongs,
            gloss,
            word,
            (lang === 'Hebrew' || lang === 'Greek') ? lang : 'Hebrew',
            activeStrongsData?.verseReference
          );
        }}
      />

      {/* DAILY SPIRITUAL PULSE & DISCIPLESHIP CALIBRATION MODAL */}
      <DiscipleshipModal
        isOpen={isDiscipleshipModalOpen}
        onClose={() => setIsDiscipleshipModalOpen(false)}
        onNavigateToVerse={handleNavigateFromDiscipleship}
        theme={theme}
        activePayload={activeDiscipleshipPayload}
        onPayloadUpdate={handleDiscipleshipPayloadUpdate}
      />

      {/* GOOGLE-STYLE SCRIPTURE VERSE SEARCH ENGINE MODAL */}
      <VerseSearchModal
        isOpen={isVerseSearchOpen}
        onClose={() => setIsVerseSearchOpen(false)}
        onNavigate={navigateToSidebarVerse}
        theme={theme}
      />

      {/* APP STARTUP CINEMATIC SEQUENCE: Screen 1 Logo (>= 3.5s) -> Screen 2 Media Clip (Let there be light) */}
      {!hasCompletedStartup && (
        <StartupExperience onComplete={handleStartupComplete} />
      )}

      {/* PERSISTENT FULL-SCREEN / BACKGROUND LIVE STUDIO (Stays mounted during minimize so streaming continues uninterrupted) */}
      {isLiveStudioActive && (
        <div
          className={`fixed inset-0 z-[1200] w-full h-full ${getStudioThemeTokens(studioDeckTheme).chassisBg.split(' ')[0]} overflow-y-auto no-scrollbar transition-all duration-200 ${
            mainView === 'live' ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
          }`}
        >
          <LiveStudioView
            theme={theme}
            scriptureTypeface={scriptureTypefaceSetting}
            isScriptureBold={isScriptureBold}
            mainStudyMode={lastVisitedTab || (mainView === 'interlinear' ? 'interlinear' : 'read')}
            onBackToHome={() => {
              setIsLiveStudioMinimized(false);
              setIsLiveStudioActive(false);
              setMainView('read');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onMinimize={() => {
              setIsLiveStudioMinimized(true);
              setMainView('read');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* DEDICATED FULL-PAGE CINEMA VIEW FOR HERO VIDEO */}
      <AnimatePresence>
        {isHeroCinemaOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[2700] w-full h-full bg-black flex flex-col justify-between overflow-hidden"
          >
            {/* Fullscreen Nature Background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img
                src="/nature.jpg"
                alt="Nature"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Cinematic Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/60 pointer-events-none" />

            {/* Top Navigation Bar: ONLY Chevron Back button, NO text labels, NO badges */}
            <div className="relative z-10 w-full px-4 sm:px-8 py-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsHeroCinemaOpen(false)}
                className="w-10 h-10 rounded-full text-white bg-black/60 hover:bg-black/85 active:scale-95 backdrop-blur-md border border-white/20 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6 -ml-0.5" />
              </button>
            </div>

            {/* Middle Empty Area - Headline is NOT displayed */}
            <div className="flex-1 pointer-events-none" />

            {/* Bottom Daily Bread Section */}
            <div className="relative z-10 w-full border-t border-white/20 backdrop-blur-md bg-black/50 pb-6 sm:pb-8 safe-bottom">
              <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className={`section-notch-label inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-[11px] font-bold font-sans uppercase tracking-[0.08em] ${
                    theme === 'light' ? 'bg-white text-[#0b111e]' : 'bg-[#2a221d] text-[#faf6f0] border-t border-x border-[#483a30]'
                  }`}>
                    Daily Bread
                    <span className={`font-normal opacity-70 text-[10px] tracking-normal normal-case ${theme === 'light' ? 'text-slate-600' : 'text-[#dcd3c6]'}`}>• {currentDailyStudy.book} {currentDailyStudy.chapter}:{currentDailyStudy.verse}</span>
                  </span>
                  <span className="text-xs font-mono text-white/70">King James Version</span>
                </div>
                <p className="text-lg sm:text-2xl md:text-3xl font-serif leading-relaxed text-white drop-shadow-md font-medium">
                  "{currentDailyStudy.kjvPrefix}{currentDailyStudy.kjvTarget}{currentDailyStudy.kjvSuffix}"
                </p>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-white/60 font-sans hidden sm:block">
                    Tap Read to enter verse exegesis and Strong's concordance breakdown.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeroCinemaOpen(false);
                      setSelectedBook(currentDailyStudy.book);
                      setSelectedChapter(currentDailyStudy.chapter);
                      setMainView('read');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`h-[36px] px-4 rounded-xl flex items-center gap-2 text-xs font-bold font-sans shadow-md transition-all cursor-pointer active:scale-95 ml-auto sm:ml-0 ${
                      theme === 'light'
                        ? 'bg-white text-[#0b111e] hover:bg-slate-100'
                        : 'bg-[#2d2520] text-[#faf6f0] border border-[#483d34] hover:bg-[#382e28]'
                    }`}
                  >
                    <span>Read Verse</span>
                    <span className="font-mono font-bold text-[11px]">↗</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Office Personal Assistant: Daily Study Later Dossier Modal */}
      <StudyAssistantModal
        isOpen={isStudyAssistantModalOpen}
        onClose={() => setIsStudyAssistantModalOpen(false)}
        theme={theme}
        onNavigateToVerse={(book, chapter, verse) => {
          setSelectedBook(book);
          setSelectedChapter(chapter);
          setMainView('interlinear');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (verse) {
            setTimeout(() => {
              const verseEl = document.getElementById(`study-verse-${verse}`) || document.getElementById(`verse-${verse}`);
              if (verseEl) verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
        }}
      />
    </div>
  );
}
