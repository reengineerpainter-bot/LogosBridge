import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Radio,
  BookOpen,
  Film,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Tv,
  Camera,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  Zap,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Cast,
  X,
  AlertCircle,
  RefreshCw,
  Folder,
  Pause,
  Play,
  Square,
  Users,
  Lock,
  Unlock,
  Shield,
  Flame,
  Heart,
  MessageSquare
} from 'lucide-react';
import { LiveStudioViewerRoom } from './LiveStudioViewerRoom';
import { FellowshipParticipant, FellowshipMessage } from '../../types/fellowship';
import { motion, AnimatePresence } from 'motion/react';
import {
  DualCanvasCompositor,
  DualCanvasCompositorRef,
  CanvasLayoutMode,
  AspectRatioMode,
  LowerThirdData,
  LowerThirdBgColor
} from './DualCanvasCompositor';
import { MediaPlayerControls } from './MediaPlayerControls';
import { BibleSelectionPanel } from './BibleSelectionPanel';
import { VoiceAIDebugPanel } from './VoiceAIDebugPanel';
import { CinematicTransitionPreview } from './CinematicTransitionPreview';
import { useVoiceAI, ParsedScripture } from '../../hooks/useVoiceAI';
import { openProjectorWindow, closeProjectorWindow, isProjectorOpen, isMobileDevice, checkExternalDisplaySupport } from '../../utils/windowManager';
import { useStudioDeckTheme, getTactileBtnClass, getTactileLedClass, playHardwareClick, StudioDeckTheme, getStudioThemeTokens } from './tactileTheme';

import { STATIC_CHAPTERS } from '../../staticChapters';
import { getOfflineChapter } from '../../utils/offlineBibleStorage';

/**
 * Fetch full verse text asynchronously from STATIC_CHAPTERS, IndexedDB, or bundled KJV
 */
async function fetchVerseText(book: string, chapter: number, startVerse?: number, endVerse?: number): Promise<string> {
  const targetStart = startVerse || 1;

  const extractFromVerses = (verses: any[]): string => {
    if (!verses || verses.length === 0) return '';
    const last = endVerse && endVerse >= targetStart ? endVerse : targetStart;
    const matched = verses.filter((v: any) => v.verseNumber >= targetStart && v.verseNumber <= last);
    if (matched.length === 0) return '';
    return matched.map((v: any) => (matched.length > 1 ? `[${v.verseNumber}] ` : '') + (v.kjvText || v.text || '')).join(' ').trim();
  };

  // 1. Check STATIC_CHAPTERS (instant memory cache)
  const bookKey = Object.keys(STATIC_CHAPTERS).find(b => b.toLowerCase() === book.toLowerCase());
  const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[chapter] : undefined;
  if (staticCh?.verses && staticCh.verses.length > 0) {
    const text = extractFromVerses(staticCh.verses);
    if (text) return text;
  }

  // 2. Check IndexedDB & bundled KJV dataset
  try {
    const offlineCh = await getOfflineChapter(book, chapter);
    if (offlineCh?.verses && offlineCh.verses.length > 0) {
      const text = extractFromVerses(offlineCh.verses);
      if (text) return text;
    }
  } catch (err) {
    console.warn('[LiveStudio] Failed to fetch verse text:', err);
  }

  return '';
}

export interface LiveStudioViewProps {
  onBackToHome?: () => void;
  onMinimize?: () => void;
  theme?: 'light' | 'dark';
  mainStudyMode?: 'read' | 'interlinear';
  scriptureTypeface?: 'untitled-serif' | 'serif' | 'sans' | 'mono';
  isScriptureBold?: boolean;
}

type StudioTab = 'bible' | 'media' | 'voice' | 'stream';

const PLATFORM_PRESETS = [

  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🔴',
    defaultRtmp: 'rtmp://a.rtmp.youtube.com/live2',
    aspectRatio: '16:9' as AspectRatioMode,
    hint: 'Optimal 16:9 1080p60 landscape stream'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    defaultRtmp: 'rtmps://live-upload.instagram.com:443/rtmp/',
    aspectRatio: '9:16' as AspectRatioMode,
    hint: 'Optimal 9:16 1080p vertical via Live Producer'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: '📹',
    defaultRtmp: 'rtmp://live.zoom.us/live/',
    aspectRatio: '16:9' as AspectRatioMode,
    hint: 'Custom Live Streaming Service for Zoom Meetings & Webinars'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    defaultRtmp: 'rtmp://live-push.tiktok.com/live/',
    aspectRatio: '9:16' as AspectRatioMode,
    hint: 'Optimal 9:16 1080p60 vertical stream'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    defaultRtmp: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    aspectRatio: '16:9' as AspectRatioMode,
    hint: 'Optimal 16:9 1080p landscape stream'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚡',
    defaultRtmp: 'rtmp://localhost/live',
    aspectRatio: '16:9' as AspectRatioMode,
    hint: 'Any RTMP / RTMPS ingestion server'
  }
];

export const LiveStudioView: React.FC<LiveStudioViewProps> = ({
  onBackToHome,
  onMinimize,
  theme = 'dark',
  mainStudyMode = 'interlinear',
  scriptureTypeface,
  isScriptureBold
}) => {
  const compositorRef = useRef<DualCanvasCompositorRef>(null);
  const mediaVideoRef = useRef<HTMLVideoElement>(null);

  // Studio State
  const [deckTheme, setDeckTheme] = useStudioDeckTheme();
  const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>('WEBCAM');
  const [activeAspectRatio, setActiveAspectRatio] = useState<AspectRatioMode>('16:9');
  const [activeTab, setActiveTab] = useState<StudioTab>('bible');
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(true); // Open by default for mobile-first controls visibility
  const [canvasScriptureMode, setCanvasScriptureMode] = useState<'lower-third' | 'full-screen'>('lower-third');
  const [isFullScreenPip, setIsFullScreenPip] = useState<boolean>(false);
  const [previewScrollRatio, setPreviewScrollRatio] = useState<number | null>(null);

  // ── Mode Switcher: Broadcast Deck ↔ Watch Live Viewer ──
  const [studioMode, setStudioMode] = useState<'broadcast' | 'viewer'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'watch' || urlParams.get('watch')) {
        return 'viewer';
      }
    } catch {}
    return 'broadcast';
  });

  // ── Fellowship Audience & Permissions State ──
  const [fellowshipRoster, setFellowshipRoster] = useState<{ viewers: FellowshipParticipant[]; viewerCount: number }>({
    viewers: [],
    viewerCount: 0
  });
  const [fellowshipMessages, setFellowshipMessages] = useState<FellowshipMessage[]>([]);
  const [isAudienceDrawerOpen, setIsAudienceDrawerOpen] = useState<boolean>(false);
  const [isChatEnabledGlobally, setIsChatEnabledGlobally] = useState<boolean>(true);
  const [isCopiedFellowshipTicket, setIsCopiedFellowshipTicket] = useState<boolean>(false);

  const handleScriptureViewModeChange = (mode: 'lower-third' | 'full-screen') => {
    setCanvasScriptureMode(mode);
    setLowerThird((prev) => (prev ? { ...prev, canvasViewMode: mode } : prev));
  };

  const [isMotionPreviewModalOpen, setIsMotionPreviewModalOpen] = useState(false);

  // Lower Third State (Dynamically initialized from user reading context)
  const [lowerThird, setLowerThird] = useState<LowerThirdData | null>(() => {
    let book = 'Genesis';
    let chapter = 1;
    try {
      const savedBook = localStorage.getItem('logosbridge_last_book');
      if (savedBook) book = savedBook;
      const savedCh = localStorage.getItem('logosbridge_last_chapter');
      if (savedCh) {
        const parsed = parseInt(savedCh, 10);
        if (!isNaN(parsed) && parsed > 0) chapter = parsed;
      }
    } catch {}

    // Lookup verse 1 from STATIC_CHAPTERS
    let text = '';
    const bookKey = Object.keys(STATIC_CHAPTERS).find((b) => b.toLowerCase() === book.toLowerCase());
    const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[chapter] : undefined;
    if (staticCh?.verses && staticCh.verses.length > 0) {
      text = staticCh.verses[0].kjvText;
    }

    return {
      book,
      chapter,
      verse: 1,
      text: text || 'In the beginning God created the heaven and the earth.',
      displayMode: 'standard',
      allVerses: staticCh?.verses
    };
  });

  // Clear relative scroll sync whenever book or chapter changes
  useEffect(() => {
    setPreviewScrollRatio(null);
  }, [lowerThird?.book, lowerThird?.chapter]);
  const [isLowerThirdVisible, setIsLowerThirdVisible] = useState<boolean>(false);
  const [lowerThirdBgColor, setLowerThirdBgColor] = useState<LowerThirdBgColor>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_lower_third_bg');
      if (
        saved === 'black' ||
        saved === 'white' ||
        saved === 'midnight' ||
        saved === 'angular-chyron' ||
        saved === 'royal-diamond'
      ) {
        return saved as LowerThirdBgColor;
      }
    } catch {}
    return 'white';
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Horizontal Inward Scroll State for L3 Card Colors
  const l3ColorScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollL3Left, setCanScrollL3Left] = useState<boolean>(false);
  const [canScrollL3Right, setCanScrollL3Right] = useState<boolean>(false);

  const checkL3Scroll = useCallback(() => {
    const el = l3ColorScrollRef.current;
    if (el) {
      setCanScrollL3Left(el.scrollLeft > 4);
      setCanScrollL3Right(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
  }, []);

  const handleScrollL3 = (direction: 'left' | 'right') => {
    const el = l3ColorScrollRef.current;
    if (el) {
      playHardwareClick(240, false);
      const scrollAmount = direction === 'left' ? -110 : 110;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isSettingsModalOpen) {
      const t = setTimeout(checkL3Scroll, 120);
      return () => clearTimeout(t);
    }
  }, [isSettingsModalOpen, checkL3Scroll]);

  const handleLowerThirdBgColorChange = useCallback((color: LowerThirdBgColor) => {
    setLowerThirdBgColor(color);
    try {
      localStorage.setItem('logosbridge_lower_third_bg', color);
    } catch {}
  }, []);

  const handleUpdateLowerThird = useCallback((data: LowerThirdData | null, show: boolean) => {
    setLowerThird(data);
    setIsLowerThirdVisible(show);
  }, []);

  const handleToggleLowerThirdVisibility = useCallback(() => {
    setIsLowerThirdVisible((prev) => !prev);
  }, []);

  // Audio & Camera mixer state
  const [isWebcamEnabled, setIsWebcamEnabled] = useState<boolean>(true);
  const [micVolume, setMicVolume] = useState<number>(1);
  const [mediaVolume, setMediaVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Cinematic Motion Graphics Speed Multiplier (0.25x Slow-Mo default, 0.5x, 1.0x, 0.1x)
  const [motionSpeedMultiplier, setMotionSpeedMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('logosbridge_motion_speed');
      return saved ? parseFloat(saved) || 0.25 : 0.25;
    } catch {
      return 0.25;
    }
  });

  const handleSetMotionSpeed = (speed: number) => {
    setMotionSpeedMultiplier(speed);
    try {
      localStorage.setItem('logosbridge_motion_speed', String(speed));
    } catch {}
  };

  // RTMP Streaming configuration
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [rtmpUrl, setRtmpUrl] = useState<string>('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState<string>(() => {
    try {
      return localStorage.getItem('logosbridge_stream_key') || '';
    } catch {
      return '';
    }
  });

  const handleStreamKeyChange = (val: string) => {
    setStreamKey(val);
    try {
      localStorage.setItem('logosbridge_stream_key', val);
    } catch {}
  };

  const [bridgeHost, setBridgeHost] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('logosbridge_bridge_host');
      if (stored && stored !== '10.79.158.1') return stored;
      return '10.103.48.1';
    } catch {
      return '10.103.48.1';
    }
  });

  const handleBridgeHostChange = (val: string) => {
    setBridgeHost(val);
    try {
      localStorage.setItem('logosbridge_bridge_host', val.trim());
    } catch {}
  };
  const [streamState, setStreamState] = useState<'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const [streamMessage, setStreamMessage] = useState<string>('Standby');
  const [isBroadcastToggling, setIsBroadcastToggling] = useState<boolean>(false);
  const [isProjectorActive, setIsProjectorActive] = useState<boolean>(false);
  const [projectorPromptModal, setProjectorPromptModal] = useState<{
    isOpen: boolean;
    type: 'error' | 'cast_prompt';
    message?: string;
  }>({ isOpen: false, type: 'error' });

  // Synchronize projector active status with Electron native window events
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onProjectorStatusChange) {
      return (window as any).electronAPI.onProjectorStatusChange((isOpen: boolean) => {
        setIsProjectorActive(isOpen);
      });
    }
  }, []);

  const [liveSeconds, setLiveSeconds] = useState<number>(0);
  useEffect(() => {
    let timer: any = null;
    if (streamState === 'LIVE') {
      timer = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setLiveSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [streamState]);

  const formatLiveTimer = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };


  // Voice AI auto-apply state & ref (Default true for instant live scripture picking)
  const [isVoiceAutoApply, setIsVoiceAutoApply] = useState<boolean>(true);
  const isVoiceAutoApplyRef = useRef<boolean>(true);
  useEffect(() => {
    isVoiceAutoApplyRef.current = isVoiceAutoApply;
  }, [isVoiceAutoApply]);

  // Apply detected scripture: fetch full verse text from KJV Bible storage and show lower-third
  const handleApplyScripture = useCallback(async (parsed: ParsedScripture) => {
    const targetVerse = parsed.verse || 1;
    const fullText = await fetchVerseText(parsed.book, parsed.chapter, targetVerse, parsed.endVerse);
    setLowerThird({
      book: parsed.book,
      chapter: parsed.chapter,
      verse: targetVerse,
      text: fullText || undefined
    });
    setIsLowerThirdVisible(true);
  }, []);

  // Voice AI Listener: auto-applies live scripture
  const handleScriptureDetected = useCallback((parsed: ParsedScripture) => {
    if (isVoiceAutoApplyRef.current) {
      handleApplyScripture(parsed);
    }
  }, [handleApplyScripture]);

  const voiceAI = useVoiceAI(handleScriptureDetected);

  // Smooth voice-activated ducking: ONLY dip media volume when user is actively speaking (isAudioActive)
  // When user is silent or Voice AI is on standby, media plays at full configured mediaVolume cleanly.
  const effectiveMediaVolume = voiceAI.isAudioActive ? Math.min(mediaVolume, 0.25) : mediaVolume;

  useEffect(() => {
    if (mediaVideoRef.current) {
      mediaVideoRef.current.volume = Math.max(0, Math.min(1, effectiveMediaVolume));
      mediaVideoRef.current.muted = false;
    }
  }, [effectiveMediaVolume]);

  // Select platform preset
  const handleSelectPlatform = (preset: typeof PLATFORM_PRESETS[0]) => {
    setSelectedPlatform(preset.id);
    setRtmpUrl(preset.defaultRtmp);
    setActiveAspectRatio(preset.aspectRatio);
  };

  // Toggle Broadcast
  const handleToggleBroadcast = async () => {
    if (isBroadcastToggling) return;
    if (streamState === 'LIVE' || streamState === 'CONNECTING') {
      setIsBroadcastToggling(true);
      compositorRef.current?.stopBroadcast();
      setTimeout(() => setIsBroadcastToggling(false), 1200);
    } else {
      if (selectedPlatform === 'youtube' && activeAspectRatio !== '16:9') {
        setActiveAspectRatio('16:9');
      }
      if (!rtmpUrl.trim()) {
        alert('Please enter an RTMP destination URL.');
        return;
      }
      if (['youtube', 'facebook', 'tiktok'].includes(selectedPlatform) && !streamKey.trim()) {
        setActiveTab('stream');
        setIsPanelExpanded(true);
        alert(`Stream Key is required for ${selectedPlatform.toUpperCase()}. Please paste your stream key in the Broadcast Settings panel.`);
        return;
      }
      setIsBroadcastToggling(true);
      await compositorRef.current?.startBroadcast({
        rtmpUrl: rtmpUrl.trim(),
        streamKey: streamKey.trim(),
        platform: selectedPlatform
      });
      setTimeout(() => setIsBroadcastToggling(false), 1500);
    }
  };

  // Toggle External Projector Window
  const handleToggleProjector = async () => {
    // 1. Electron Native Desktop App: Toggle native projection window directly on target display!
    if (typeof window !== 'undefined' && (window as any).electronAPI?.toggleProjector) {
      (window as any).electronAPI.toggleProjector();
      return;
    }

    if (isProjectorActive || isProjectorOpen()) {
      closeProjectorWindow();
      setIsProjectorActive(false);
      return;
    }

    // 2. Desktop & Multi-Monitor Environment: Open dedicated external projector window
    if (!isMobileDevice()) {
      const win = await openProjectorWindow('LogosBridge Sanctuary Projector Feed');
      if (win) {
        setIsProjectorActive(true);
      } else {
        // Window was blocked by browser popup blocker
        setProjectorPromptModal({
          isOpen: true,
          type: 'error',
          message: 'Projector window was blocked. Please allow popups for LogosBridge in your browser settings to open the external monitor feed.'
        });
      }
      return;
    }

    // 2. Mobile device (Android / Phone): Offer Wireless Display / Smart View / Screen Cast
    const extInfo = await checkExternalDisplaySupport();
    if (!extInfo.supported || (!extInfo.connected && extInfo.type !== 'android-bridge' && extInfo.type !== 'presentation')) {
      setProjectorPromptModal({
        isOpen: true,
        type: 'error',
        message: 'No supported external screen or wireless display detected.'
      });
      return;
    }

    setProjectorPromptModal({
      isOpen: true,
      type: 'cast_prompt'
    });
  };

  // Take quick snapshot photo
  const handleSnapshot = () => {
    const dataUrl = compositorRef.current?.takeSnapshot();
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `logosbridge-studio-${Date.now()}.png`;
      a.click();
    }
  };

  // Minimize studio while keeping background media playback & streaming alive
  const handleMinimizeStudio = () => {
    if (onMinimize) onMinimize();
  };

  const handleBackStudio = () => {
    if (onBackToHome) onBackToHome();
  };

  // Sermon Recording State (ARMED / READY -> RECORDING -> PAUSED -> STOPPED & SAVED)
  const [sermonState, setSermonState] = useState<'IDLE' | 'ARMED' | 'RECORDING' | 'PAUSED'>('IDLE');
  const [sermonRecordSeconds, setSermonRecordSeconds] = useState<number>(0);
  const [armedTargetFolder, setArmedTargetFolder] = useState<any>(null);
  const [savedDirectoryHandle, setSavedDirectoryHandle] = useState<any>(null);
  const [savedDirectoryName, setSavedDirectoryName] = useState<string>(() => {
    try {
      return localStorage.getItem('logosbridge_sermon_folder_name') || '';
    } catch {
      return '';
    }
  });
  const [savedRecordingNotice, setSavedRecordingNotice] = useState<{
    isOpen: boolean;
    filename: string;
    sizeFormatted: string;
    folderName: string;
    fileUrl?: string;
  } | null>(null);
  const sermonTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const handlePromptFolderSelection = useCallback(async (): Promise<{ type: 'android_saf'; uri: string; name: string } | { type: 'desktop_fs'; handle: any; name: string } | null> => {
    // 1. Mobile Android Storage Access Framework (SAF)
    const bridge = (window as any).BridgeAndroid;
    if (bridge && typeof bridge.pickFolder === 'function') {
      return new Promise((resolve) => {
        (window as any).onAndroidFolderSelected = (data: { uri: string; name: string }) => {
          setSavedDirectoryName(data.name || 'Selected Folder');
          try {
            localStorage.setItem('logosbridge_sermon_folder_name', data.name || 'Selected Folder');
          } catch {}
          resolve({ type: 'android_saf', uri: data.uri, name: data.name });
        };
        (window as any).onAndroidFolderCanceled = () => {
          resolve(null);
        };
        bridge.pickFolder();
      });
    }

    // 2. Desktop Chrome / Edge File System Access API
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'videos'
        });
        if (dirHandle && dirHandle.name) {
          setSavedDirectoryHandle(dirHandle);
          setSavedDirectoryName(dirHandle.name);
          try {
            localStorage.setItem('logosbridge_sermon_folder_name', dirHandle.name);
          } catch {}
          return { type: 'desktop_fs', handle: dirHandle, name: dirHandle.name };
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[LiveStudio] Directory pick error:', err);
        }
        return null;
      }
      return null;
    }

    // 3. Fallback for mobile web browsers without native SAF or showDirectoryPicker
    const fallbackName = 'Downloads / Device Storage';
    setSavedDirectoryName(fallbackName);
    try {
      localStorage.setItem('logosbridge_sermon_folder_name', fallbackName);
    } catch {}
    return { type: 'desktop_fs', handle: null, name: fallbackName };
  }, []);

  // 1. ARM Action - Prompts user to select destination folder on phone drive or computer, then transitions to ARMED (does NOT auto-start)
  const handleArmRecordingFolder = useCallback(async () => {
    const targetFolder = await handlePromptFolderSelection();
    if (!targetFolder) {
      // User canceled the folder picker dialog - return cleanly
      return;
    }
    setArmedTargetFolder(targetFolder);
    setSermonState('ARMED');
  }, [handlePromptFolderSelection]);

  // 2. START Action - User explicitly triggers recording when ready
  const handleBeginActualRecording = useCallback(async () => {
    let folderToUse = armedTargetFolder;
    if (!folderToUse) {
      folderToUse = await handlePromptFolderSelection();
      if (!folderToUse) return;
      setArmedTargetFolder(folderToUse);
    }

    if (folderToUse?.type === 'desktop_fs' && folderToUse.handle && typeof folderToUse.handle.queryPermission === 'function') {
      try {
        const perm = await folderToUse.handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await folderToUse.handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            return;
          }
        }
      } catch {}
    }

    const res = await compositorRef.current?.startSermonRecording(folderToUse);
    if (res?.success) {
      setSermonState('RECORDING');
      setSermonRecordSeconds(0);
      if (sermonTimerRef.current) clearInterval(sermonTimerRef.current);
      sermonTimerRef.current = setInterval(() => {
        setSermonRecordSeconds((s) => s + 1);
      }, 1000);
    } else if (res?.error) {
      alert(`Could not start sermon recording: ${res.error}`);
    }
  }, [armedTargetFolder, handlePromptFolderSelection]);

  const handleCancelArmed = useCallback(() => {
    setSermonState('IDLE');
    setArmedTargetFolder(null);
  }, []);

  // PAUSE Action
  const handlePauseSermonRecording = useCallback(() => {
    const ok = compositorRef.current?.pauseSermonRecording();
    if (ok) {
      setSermonState('PAUSED');
      if (sermonTimerRef.current) {
        clearInterval(sermonTimerRef.current);
        sermonTimerRef.current = null;
      }
    }
  }, []);

  // RESUME Action
  const handleResumeSermonRecording = useCallback(() => {
    const ok = compositorRef.current?.resumeSermonRecording();
    if (ok) {
      setSermonState('RECORDING');
      if (sermonTimerRef.current) clearInterval(sermonTimerRef.current);
      sermonTimerRef.current = setInterval(() => {
        setSermonRecordSeconds((s) => s + 1);
      }, 1000);
    }
  }, []);

  // 3. STOP Action - Stops recording, saves file, and displays save notification with folder/view action
  const handleStopSermonRecording = useCallback(async () => {
    if (sermonTimerRef.current) {
      clearInterval(sermonTimerRef.current);
      sermonTimerRef.current = null;
    }
    setSermonState('IDLE');
    setArmedTargetFolder(null);
    const res = await compositorRef.current?.stopSermonRecording();
    if (res?.success && res.result) {
      const { filename, sizeBytes, url } = res.result;
      const sizeFormatted = formatFileSize(sizeBytes);
      const folderName = savedDirectoryName || 'Selected Folder';

      setSavedRecordingNotice({
        isOpen: true,
        filename,
        sizeFormatted,
        folderName,
        fileUrl: url
      });
    }
  }, [savedDirectoryName]);

  useEffect(() => {
    try {
      (window as any).BridgeAndroid?.hideSystemBars?.();
    } catch {}
    return () => {
      if (sermonTimerRef.current) clearInterval(sermonTimerRef.current);
    };
  }, []);

  const themeTokens = getStudioThemeTokens(deckTheme);
  const chassisBg = themeTokens.chassisBg;
  const containerBg = themeTokens.containerBg;
  const stripBg = themeTokens.stripBg;

  return (
    <AnimatePresence mode="wait">
      {studioMode === 'viewer' ? (
        <motion.div
          key="viewer-stage"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full min-h-screen"
        >
          <LiveStudioViewerRoom
            onSwitchToBroadcast={() => setStudioMode('broadcast')}
            onBackToHome={handleBackStudio}
            wsUrl={bridgeHost?.trim() ? (typeof window !== 'undefined' && window.location.protocol === 'https:' && !window.location.hostname.includes('localhost') ? `wss://${bridgeHost.trim()}:8443` : `ws://${bridgeHost.trim()}:8080`) : undefined}
            deckTheme={deckTheme}
          />
        </motion.div>
      ) : (
        <motion.div
          key="broadcast-stage"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full min-h-screen ${chassisBg.split(' ')[0]} text-[#faf6f0] flex flex-col font-sans pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))] no-scrollbar`}
        >
      {/* Active in-viewport media video element positioned to maintain hardware decoding without occlusion throttling */}
      <video
        ref={mediaVideoRef}
        playsInline
        preload="auto"
        className="fixed bottom-0 right-0 w-8 h-8 pointer-events-none opacity-20 z-0 overflow-hidden"
      />

      {/* Top Global Live Studio Switcher (Option A: Minimalist 2-Pill Switcher) */}
      <div className="w-full max-w-7xl mx-auto px-2 pt-2 pb-0 flex items-center justify-start z-20">
        {/* Broadcast ↔ Watch Live Tactile Switcher */}
        <div className={`flex items-center p-1 rounded-xl border ${stripBg} shadow-inner`}>
          <button
            type="button"
            className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${getTactileBtnClass(deckTheme, true, 'amber')}`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="text-amber-200">Broadcast</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playHardwareClick(280, false);
              setStudioMode('viewer');
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${getTactileBtnClass(deckTheme, false, 'default')}`}
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span>Watch Live</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body (Mobile-First Stacking -> Desktop Side-by-Side) */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-1.5 sm:p-2.5 md:p-3 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))] flex flex-col lg:grid lg:grid-cols-12 gap-2.5 lg:gap-4 min-h-0">

        {/* ── Left / Top: UNIFIED ZERO-GAP STUDIO DECK CONSOLE ── */}
        <div className="lg:col-span-7 flex flex-col">
          <div className={`w-full flex flex-col ${containerBg} rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden`}>
            {/* 1. Live Video Canvas Feed */}
            <div className="w-full">
              <DualCanvasCompositor
                ref={compositorRef}
                onBackToHome={handleBackStudio}
                onMinimize={onMinimize ? handleMinimizeStudio : undefined}
                onToggleProjector={handleToggleProjector}
                isProjectorActive={isProjectorActive}
                onSnapshot={handleSnapshot}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
                activeAspectRatio={activeAspectRatio}
                lowerThird={lowerThird}
                isLowerThirdVisible={isLowerThirdVisible}
                lowerThirdBgColor={lowerThirdBgColor}
                canvasScriptureMode={canvasScriptureMode}
                isFullScreenPip={isFullScreenPip}
                onToggleFullScreenPip={setIsFullScreenPip}
                previewScrollRatio={previewScrollRatio}
                theme={theme}
                scriptureTypeface={scriptureTypeface}
                isScriptureBold={isScriptureBold}
                mediaVideoRef={mediaVideoRef}
                isWebcamEnabled={isWebcamEnabled}
                micVolume={micVolume}
                mediaVolume={effectiveMediaVolume}
                isMuted={isMuted}
                rtmpUrl={rtmpUrl}
                streamKey={streamKey}
                platform={selectedPlatform}
                wsUrl={bridgeHost?.trim() ? (typeof window !== 'undefined' && window.location.protocol === 'https:' && !window.location.hostname.includes('localhost') ? `wss://${bridgeHost.trim()}:8443` : `ws://${bridgeHost.trim()}:8080`) : undefined}
                motionSpeedMultiplier={motionSpeedMultiplier}
                onStreamStateChange={(state, msg) => {
                  setStreamState(state);
                  if (msg) setStreamMessage(msg);
                }}
                onFellowshipRosterChange={(data) => {
                  setFellowshipRoster(prev => ({
                    viewers: data.viewers && data.viewers.length > 0 ? data.viewers : prev.viewers,
                    viewerCount: data.viewerCount !== undefined ? data.viewerCount : prev.viewerCount
                  }));
                }}
                onFellowshipMessage={(msg) => {
                  setFellowshipMessages(prev => [...prev.slice(-100), msg]);
                }}
              />
            </div>

            {/* 2. Integrated Deck Control Strip (Flush directly under the screen feed without any gap) */}
            <div className={`w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 ${stripBg} border-t select-none`}>
              {/* Left Tools: Aspect Ratio + Cam + Mic + Recording */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Aspect Ratio Switcher */}
                <div className={`flex items-center gap-1 p-1 ${themeTokens.stripBg} rounded-xl border`}>
                  <button
                    type="button"
                    onClick={() => {
                      playHardwareClick(280, activeAspectRatio === '16:9');
                      setActiveAspectRatio('16:9');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold font-mono min-h-[38px] flex items-center justify-center ${getTactileBtnClass(deckTheme, activeAspectRatio === '16:9', 'default')}`}
                  >
                    16:9
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playHardwareClick(280, activeAspectRatio === '9:16');
                      setActiveAspectRatio('9:16');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold font-mono min-h-[38px] flex items-center justify-center ${getTactileBtnClass(deckTheme, activeAspectRatio === '9:16', 'default')}`}
                  >
                    9:16
                  </button>
                </div>

                {/* Single Compact Motion Speed Pill (0.25x Slow-Mo default, click cycles: 0.25x -> 0.5x -> 1.0x -> 0.1x) */}
                <button
                  type="button"
                  onClick={() => {
                    const speeds = [0.25, 0.5, 1.0, 0.1];
                    const curIdx = speeds.indexOf(motionSpeedMultiplier);
                    const nextSpeed = speeds[(curIdx + 1) % speeds.length];
                    playHardwareClick(320, true);
                    handleSetMotionSpeed(nextSpeed);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono min-h-[38px] flex items-center gap-1.5 cursor-pointer ${getTactileBtnClass(deckTheme, motionSpeedMultiplier !== 1.0, 'default')} ${
                    motionSpeedMultiplier === 0.25
                      ? 'text-amber-400 border-amber-500/40'
                      : motionSpeedMultiplier === 0.1
                      ? 'text-rose-400 border-rose-500/40'
                      : 'text-white/80'
                  }`}
                  title={`Motion Speed: ${motionSpeedMultiplier}x (Click to cycle: 0.25x -> 0.5x -> 1.0x -> 0.1x)`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>{motionSpeedMultiplier}x</span>
                </button>

                {/* Camera & Mic Quick Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playHardwareClick(isWebcamEnabled ? 260 : 360, !isWebcamEnabled);
                      setIsWebcamEnabled(!isWebcamEnabled);
                    }}
                    className={`p-2.5 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer ${getTactileBtnClass(deckTheme, isWebcamEnabled, 'default')}`}
                    title={isWebcamEnabled ? 'Turn Camera Off (Standby)' : 'Turn Camera On'}
                  >
                    <div className={`absolute top-1.5 right-1.5 ${getTactileLedClass(deckTheme, isWebcamEnabled, 'default')}`} />
                    {isWebcamEnabled ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playHardwareClick(!isMuted ? 300 : 400, isMuted);
                      setIsMuted(!isMuted);
                    }}
                    className={`p-2.5 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer ${getTactileBtnClass(deckTheme, !isMuted, 'emerald')}`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    <div className={`absolute top-1.5 right-1.5 ${getTactileLedClass(deckTheme, !isMuted, 'emerald')}`} />
                    {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* 4-State Sermon Recording Deck Controller */}
                <div className="flex items-center gap-1.5">
                  {sermonState === 'IDLE' && (
                    <button
                      type="button"
                      onClick={() => {
                        playHardwareClick(250, false);
                        handleArmRecordingFolder();
                      }}
                      className={`p-2 sm:px-2.5 sm:py-2 min-h-[40px] rounded-xl flex items-center gap-1.5 cursor-pointer ${getTactileBtnClass(deckTheme, false)}`}
                      title="Select Destination Folder to Arm Sermon Recording"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-inner`} />
                      <span className="text-xs font-mono font-bold">Record</span>
                    </button>
                  )}

                  {sermonState === 'ARMED' && (
                    <div className={`flex items-center gap-1 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      deckTheme === 'stealth' ? 'border-emerald-500/50' : deckTheme === 'crimson' ? 'border-rose-500/50' : 'border-amber-500/50'
                    }`}>
                      <div
                        className={`flex items-center gap-1 px-1.5 py-1 text-[11px] font-mono max-w-[100px] sm:max-w-[140px] truncate ${
                          deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-300'
                        }`}
                        title={savedDirectoryName || 'Destination folder'}
                      >
                        <Folder className={`w-3 h-3 shrink-0 ${
                          deckTheme === 'stealth' ? 'text-emerald-400' : deckTheme === 'crimson' ? 'text-rose-400' : 'text-amber-400'
                        }`} />
                        <span className="truncate">{savedDirectoryName || 'Ready'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(380, true);
                          handleBeginActualRecording();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')}`}
                        title="Start Recording Now"
                      >
                        <span className={`w-2 h-2 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'} animate-ping`} />
                        <span>Start</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(200, false);
                          handleCancelArmed();
                        }}
                        className={`p-1.5 rounded-lg text-[#a89a8c] hover:text-[#faf6f0] cursor-pointer ${getTactileBtnClass(deckTheme, false)}`}
                        title="Cancel Armed State"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {sermonState === 'RECORDING' && (
                    <div className={`flex items-center gap-1 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      deckTheme === 'stealth' ? 'border-emerald-500/40' : 'border-rose-500/40'
                    }`}>
                      {/* Active Live Elapsed Pill */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-bold ${
                        deckTheme === 'stealth' ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'
                        } animate-ping`} />
                        <span>{formatLiveTimer(sermonRecordSeconds)}</span>
                      </div>

                      {/* 2. Pause Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(300, true);
                          handlePauseSermonRecording();
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${getTactileBtnClass(deckTheme, false)}`}
                        title="Pause Recording without closing file"
                      >
                        <Pause className={`w-3.5 h-3.5 ${
                          deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-300'
                        }`} />
                        <span className={`hidden sm:inline ${
                          deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-300'
                        }`}>Pause</span>
                      </button>

                      {/* 3. Stop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(200, false);
                          handleStopSermonRecording();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')}`}
                        title="Stop & Save Recording"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    </div>
                  )}

                  {sermonState === 'PAUSED' && (
                    <div className={`flex items-center gap-1 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      deckTheme === 'stealth' ? 'border-emerald-500/40' : deckTheme === 'crimson' ? 'border-rose-500/40' : 'border-amber-500/40'
                    }`}>
                      {/* Paused Indicator */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-bold ${
                        deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          deckTheme === 'stealth' ? 'bg-emerald-400' : deckTheme === 'crimson' ? 'bg-rose-400' : 'bg-amber-400'
                        }`} />
                        <span>PAUSED {formatLiveTimer(sermonRecordSeconds)}</span>
                      </div>

                      {/* Resume Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(380, true);
                          handleResumeSermonRecording();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${getTactileBtnClass(deckTheme, true, 'emerald')}`}
                        title="Resume Recording"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">Resume</span>
                      </button>

                      {/* Stop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playHardwareClick(200, false);
                          handleStopSermonRecording();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')}`}
                        title="Stop & Save Recording"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Tools: Studio Navigation Tabs + Tiny Chevron Indicator */}
              <div className="flex items-center gap-1.5">
                <div className={`flex-1 grid grid-cols-4 gap-1 p-1 ${themeTokens.stripBg} rounded-xl border`}>
                  {(
                    [
                      { id: 'bible', label: 'Bible', icon: BookOpen },
                      { id: 'media', label: 'Media', icon: Film },
                      { id: 'voice', label: 'Voice AI', icon: Mic },
                      { id: 'stream', label: 'Destinations', icon: Radio }
                    ] as const
                  ).map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playHardwareClick(isActive ? 320 : 420, isActive);
                          setActiveTab(id);
                          if (!isPanelExpanded) {
                            setIsPanelExpanded(true);
                          }
                        }}
                        className={`py-2 sm:py-2.5 px-2 min-h-[42px] rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${getTactileBtnClass(deckTheme, isActive && isPanelExpanded, 'default')}`}
                        title={`${label} Panel`}
                      >
                        <div className={getTactileLedClass(deckTheme, isActive && isPanelExpanded, 'default')} />
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate text-xs sm:text-sm">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Chevron Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    playHardwareClick(280, !isPanelExpanded);
                    setIsPanelExpanded(!isPanelExpanded);
                  }}
                  className={`p-2 sm:p-2.5 min-w-[40px] min-h-[40px] rounded-xl shrink-0 flex items-center justify-center ${getTactileBtnClass(deckTheme, isPanelExpanded, 'default')}`}
                  title={isPanelExpanded ? 'Collapse Control Panel' : 'Expand Control Panel'}
                >
                  {isPanelExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#faf6f0]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#dcd3c6]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right / Bottom: Collapsible Control Panels (Bible, Media, Voice AI, Stream Setup) ── */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Master Broadcast Pill — Floating in the center of the open space when tabs are collapsed */}
          <AnimatePresence initial={false}>
            {!isPanelExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 w-full flex flex-col items-center justify-center py-6 sm:py-10 px-4 min-h-[140px]"
              >
                <div className="flex flex-col items-center gap-3 max-w-sm w-full text-center">
                  <button
                    type="button"
                    onClick={() => {
                      playHardwareClick(streamState === 'LIVE' ? 220 : 420, streamState !== 'LIVE');
                      handleToggleBroadcast();
                    }}
                    disabled={isBroadcastToggling}
                    className={`w-full max-w-[280px] px-6 py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all select-none cursor-pointer ${
                      streamState === 'LIVE'
                        ? getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')
                        : streamState === 'CONNECTING'
                        ? getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : deckTheme === 'crimson' ? 'rose' : 'amber')
                        : getTactileBtnClass(deckTheme, false)
                    }`}
                  >
                    <div
                      className={
                        streamState === 'LIVE'
                          ? (deckTheme === 'stealth'
                              ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                              : 'w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse')
                          : streamState === 'CONNECTING'
                          ? (deckTheme === 'stealth'
                              ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-ping'
                              : deckTheme === 'crimson'
                              ? 'w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_#f43f5e] animate-ping'
                              : 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24] animate-ping')
                          : (deckTheme === 'stealth'
                              ? 'w-2.5 h-2.5 rounded-full bg-emerald-950 shadow-inner'
                              : deckTheme === 'crimson'
                              ? 'w-2.5 h-2.5 rounded-full bg-rose-950 shadow-inner'
                              : 'w-2.5 h-2.5 rounded-full bg-slate-700 shadow-inner')
                      }
                    />
                    {streamState === 'LIVE' ? (
                      <>
                        <StopCircle className={`w-4 h-4 ${deckTheme === 'stealth' ? 'text-emerald-300' : 'text-[#fca5a5]'}`} />
                        <span>End Broadcast</span>
                      </>
                    ) : streamState === 'CONNECTING' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#dcd3c6] border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Start Broadcast</span>
                      </>
                    )}
                  </button>

                  {/* Live Timer or Status Subtext */}
                  {streamState === 'LIVE' ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#faf6f0] font-bold tracking-widest">
                      <span className={`w-2 h-2 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`} />
                      <span>LIVE {formatLiveTimer(liveSeconds)}</span>
                    </div>
                  ) : streamState === 'CONNECTING' ? (
                    <p className="text-[11px] font-mono text-[#a89a8c] animate-pulse">
                      Connecting to RTMP Bridge...
                    </p>
                  ) : streamState === 'ERROR' ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Bridge Offline • Verify Wi-Fi IP in Settings</span>
                    </div>
                  ) : (
                    <p className="text-[11px] font-mono text-[#8e8275]">
                      Ready to stream • Tap to go live
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Panel Drawer */}
          <AnimatePresence initial={false}>
            {isPanelExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full"
              >
                {/* Mini Live Status Banner (visible across all tabs while streaming so user can see timer & stop anytime) */}
                {streamState === 'LIVE' && activeTab !== 'stream' && (
                  <div className={`w-full mb-2 px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                    deckTheme === 'stealth' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className={`w-2 h-2 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`} />
                      <span>LIVE {formatLiveTimer(liveSeconds)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playHardwareClick(220, false);
                        handleToggleBroadcast();
                      }}
                      disabled={isBroadcastToggling}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer ${
                        getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')
                      }`}
                    >
                      <StopCircle className="w-3.5 h-3.5 fill-current" />
                      <span>End Live</span>
                    </button>
                  </div>
                )}
                <div className="w-full">
                  <div className={activeTab === 'bible' ? 'w-full' : 'hidden'}>
                    <BibleSelectionPanel
                      currentLowerThird={lowerThird}
                      isVisible={isLowerThirdVisible}
                      scriptureViewMode={canvasScriptureMode}
                      onScriptureViewModeChange={handleScriptureViewModeChange}
                      isFullScreenPip={isFullScreenPip}
                      onToggleFullScreenPip={setIsFullScreenPip}
                      onPreviewScroll={setPreviewScrollRatio}
                      lowerThirdBgColor={lowerThirdBgColor}
                      onLowerThirdBgColorChange={handleLowerThirdBgColorChange}
                      theme={theme}
                      scriptureTypeface={scriptureTypeface}
                      isScriptureBold={isScriptureBold}
                      onUpdateLowerThird={handleUpdateLowerThird}
                      onToggleVisibility={handleToggleLowerThirdVisibility}
                    />
                  </div>

                  {/* Always mounted — CSS hidden preserves state (fileName, isPlaying, currentTime) across tab switches */}
                  <div className={activeTab === 'media' ? 'w-full' : 'hidden'}>
                    <MediaPlayerControls
                      mediaVideoRef={mediaVideoRef}
                      compositorRef={compositorRef}
                      layoutMode={layoutMode}
                      onLayoutModeChange={setLayoutMode}
                      mediaVolume={mediaVolume}
                      onMediaVolumeChange={setMediaVolume}
                    />
                  </div>

                  <div className={activeTab === 'voice' ? 'w-full' : 'hidden'}>
                    <VoiceAIDebugPanel
                      voiceAI={voiceAI}
                      isAutoApply={isVoiceAutoApply}
                      onToggleAutoApply={() => setIsVoiceAutoApply(!isVoiceAutoApply)}
                      onApplyScripture={handleApplyScripture}
                    />
                  </div>

                  <div className={activeTab === 'stream' ? 'w-full' : 'hidden'}>
                    <div className={`w-full flex flex-col gap-3.5 ${containerBg} p-3 sm:p-4 pb-6 sm:pb-7 rounded-2xl shadow-xl border`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${themeTokens.pillBg} ${themeTokens.accentText}`}>
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm sm:text-base text-[#faf6f0]">Broadcast Destination</div>
                        </div>
                      </div>

                      {/* Platform Preset Chips — 2 rows × 3 columns */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {PLATFORM_PRESETS.map((preset) => {
                          const isSelected = selectedPlatform === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                playHardwareClick(320, isSelected);
                                handleSelectPlatform(preset);
                              }}
                              className={`py-2 px-2.5 rounded-xl flex items-center gap-1.5 text-left ${getTactileBtnClass(deckTheme, isSelected, 'default')}`}
                            >
                              <div className={getTactileLedClass(deckTheme, isSelected, 'default')} />
                              <span className="text-sm leading-none shrink-0">{preset.icon}</span>
                              <span className="truncate font-bold text-[11px] sm:text-xs">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* RTMP Server URL Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-mono text-[#dcd3c6] uppercase font-bold tracking-wider">RTMP Server URL</label>
                        <input
                          type="text"
                          value={rtmpUrl}
                          onChange={(e) => setRtmpUrl(e.target.value)}
                          placeholder="e.g. rtmp://a.rtmp.youtube.com/live2"
                          className={`w-full py-2.5 px-3 ${themeTokens.inputBg} rounded-xl text-xs sm:text-sm font-mono focus:outline-none select-text`}
                        />
                      </div>

                      {/* Stream Key Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-mono text-[#dcd3c6] uppercase font-bold tracking-wider">Stream Key</label>
                        <input
                          type="text"
                          value={streamKey}
                          onChange={(e) => handleStreamKeyChange(e.target.value)}
                          placeholder="Enter platform stream key..."
                          className={`w-full py-2.5 px-3 ${themeTokens.inputBg} rounded-xl text-xs sm:text-sm font-mono focus:outline-none select-text`}
                        />
                      </div>

                      {/* Master Broadcast Action Button */}
                      <div className="flex justify-center w-full pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            playHardwareClick(streamState === 'LIVE' ? 220 : 420, streamState !== 'LIVE');
                            handleToggleBroadcast();
                          }}
                          disabled={isBroadcastToggling}
                          className={`px-6 py-2.5 rounded-2xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 min-h-[42px] ${
                            streamState === 'LIVE'
                              ? getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : 'rose')
                              : streamState === 'CONNECTING'
                              ? getTactileBtnClass(deckTheme, true, deckTheme === 'stealth' ? 'emerald' : deckTheme === 'crimson' ? 'rose' : 'amber')
                              : getTactileBtnClass(deckTheme, false)
                          }`}
                        >
                          <div
                            className={
                              streamState === 'LIVE'
                                ? (deckTheme === 'stealth'
                                    ? 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse'
                                    : 'w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse')
                                : streamState === 'CONNECTING'
                                ? (deckTheme === 'stealth'
                                    ? 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-ping'
                                    : deckTheme === 'crimson'
                                    ? 'w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e] animate-ping'
                                    : 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-ping')
                                : (deckTheme === 'stealth'
                                    ? 'w-2 h-2 rounded-full bg-emerald-950 shadow-inner'
                                    : deckTheme === 'crimson'
                                    ? 'w-2 h-2 rounded-full bg-rose-950 shadow-inner'
                                    : 'w-2 h-2 rounded-full bg-slate-700 shadow-inner')
                            }
                          />
                          {streamState === 'LIVE' ? (
                            <>
                              <StopCircle className={`w-3.5 h-3.5 ${deckTheme === 'stealth' ? 'text-emerald-300' : 'text-[#fca5a5]'}`} />
                              <span>End Broadcast</span>
                            </>
                          ) : streamState === 'CONNECTING' ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-[#dcd3c6] border-t-transparent rounded-full animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Start Broadcast</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Live Elapsed Timer Badge */}
                      {streamState === 'LIVE' && (
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#faf6f0] font-bold tracking-widest py-1">
                          <span className={`w-2 h-2 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`} />
                          <span>LIVE {formatLiveTimer(liveSeconds)}</span>
                        </div>
                      )}
                      {streamState === 'ERROR' && (
                        <div className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 text-left animate-fadeIn ${
                          deckTheme === 'stealth'
                            ? 'bg-[#0a180e] border-emerald-900/60'
                            : 'bg-[#2e1d1d] border-rose-900/50'
                        }`}>
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              deckTheme === 'stealth'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold ${
                                deckTheme === 'stealth' ? 'text-emerald-300' : 'text-rose-300'
                              }`}>Connection Failed</div>
                              <div className={`text-[12px] font-mono leading-relaxed mt-0.5 break-words ${
                                deckTheme === 'stealth' ? 'text-emerald-200/90' : 'text-[#fca5a5]'
                              }`}>
                                {streamMessage || 'Destination rejected the stream. Verify your RTMP URL and stream key.'}
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center justify-end gap-2 pt-1 border-t ${
                            deckTheme === 'stealth' ? 'border-emerald-900/40' : 'border-rose-900/30'
                          }`}>
                            <button
                              type="button"
                              onClick={() => {
                                setStreamState('IDLE');
                                setStreamMessage('');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-[#dcd3c6] ${
                                deckTheme === 'stealth' ? 'hover:bg-[#142319]' : 'hover:bg-[#3d2424]'
                              } transition-all`}
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleBroadcast}
                              disabled={isBroadcastToggling}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                deckTheme === 'stealth'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-black'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white'
                              } flex items-center gap-1.5 transition-all active:scale-95`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Host Fellowship Communion & Connected Viewers Card */}
                      <div className={`p-3 rounded-2xl border ${themeTokens.stripBg} flex items-center justify-between gap-3 mt-1`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#faf6f0]">Fellowship Communion</span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {fellowshipRoster.viewerCount} connected viewer{fellowshipRoster.viewerCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAudienceDrawerOpen(true)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${getTactileBtnClass(deckTheme, false, 'default')}`}
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile External Projector / Smart View Dialog */}
          <AnimatePresence>
            {projectorPromptModal.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setProjectorPromptModal({ isOpen: false, type: 'error' })}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className={`w-full max-w-sm ${containerBg} border rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 select-none`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    projectorPromptModal.type === 'error'
                      ? (deckTheme === 'stealth' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30')
                      : (deckTheme === 'stealth' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : deckTheme === 'crimson' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20')
                  }`}>
                    {projectorPromptModal.type === 'error' ? (
                      <Tv className="w-7 h-7" />
                    ) : (
                      <Cast className="w-7 h-7" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-serif font-bold text-[#faf6f0]">
                      {projectorPromptModal.type === 'error' ? 'External Projector' : 'Smart View / Screen Cast'}
                    </h3>
                    <p className="text-sm text-[#dcd3c6]/80 leading-relaxed">
                      {projectorPromptModal.type === 'error'
                        ? (projectorPromptModal.message || 'No supported external input or screen')
                        : 'Connect your mobile device to Smart View, Screen Cast, or an external display adapter to mirror and project the sanctuary feed.'}
                    </p>
                  </div>

                  <div className="w-full flex flex-col gap-2 pt-2">
                    {projectorPromptModal.type === 'cast_prompt' && (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            (window as any).BridgeAndroid?.openCastSettings?.();
                          } catch (ignored) {}
                          setProjectorPromptModal({ isOpen: false, type: 'error' });
                        }}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
                          deckTheme === 'stealth'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-600/30'
                            : deckTheme === 'crimson'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                        }`}
                      >
                        <Cast className="w-4 h-4" />
                        <span>Open Cast / Smart View Settings</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setProjectorPromptModal({ isOpen: false, type: 'error' })}
                      className={`w-full py-3.5 px-4 rounded-xl ${themeTokens.stripBg} hover:${themeTokens.hoverItemBg} ${themeTokens.subtleText} hover:${themeTokens.highlightText} border ${themeTokens.cardBorder} font-semibold text-sm active:scale-95 transition-all cursor-pointer`}
                    >
                      {projectorPromptModal.type === 'error' ? 'OK' : 'Dismiss'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved Recording Notification Modal */}
          <AnimatePresence>
            {savedRecordingNotice?.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setSavedRecordingNotice(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className={`w-full max-w-sm ${containerBg} border rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 select-none`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`flex items-center justify-between border-b ${themeTokens.cardBorder} pb-3`}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#faf6f0]">Recording Saved</h3>
                        <p className={`text-[11px] ${themeTokens.mutedText} font-mono`}>Sermon Video Exported</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSavedRecordingNotice(null)}
                      className={`p-2 rounded-xl ${themeTokens.stripBg} ${themeTokens.subtleText} hover:${themeTokens.highlightText} border ${themeTokens.cardBorder} transition-all cursor-pointer`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex flex-col gap-2 ${themeTokens.stripBg} p-3 rounded-2xl border ${themeTokens.cardBorder}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${themeTokens.mutedText} font-mono`}>File:</span>
                      <span className="text-[#faf6f0] font-mono font-medium truncate max-w-[200px]" title={savedRecordingNotice.filename}>
                        {savedRecordingNotice.filename}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${themeTokens.mutedText} font-mono`}>Size:</span>
                      <span className="text-[#faf6f0] font-mono font-medium">
                        {savedRecordingNotice.sizeFormatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${themeTokens.mutedText} font-mono`}>Folder:</span>
                      <span className={`${themeTokens.highlightText} font-mono font-medium truncate max-w-[200px]`} title={savedRecordingNotice.folderName}>
                        {savedRecordingNotice.folderName}
                      </span>
                    </div>
                  </div>

                  <div className={`flex flex-col gap-2 pt-2 border-t ${themeTokens.cardBorder}`}>
                    {savedRecordingNotice.fileUrl && (
                      <a
                        href={savedRecordingNotice.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full py-2.5 rounded-xl ${themeTokens.stripBg} hover:${themeTokens.hoverItemBg} ${themeTokens.highlightText} border ${themeTokens.cardBorder} font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play / View Video</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSavedRecordingNotice(null)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md text-center ${
                        deckTheme === 'stealth'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                          : deckTheme === 'crimson'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-white hover:bg-zinc-200 text-black'
                      }`}
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Studio Settings Slide-Down View from Top */}
          <AnimatePresence>
            {isSettingsModalOpen && (
              <div className="fixed inset-0 z-[1500] pointer-events-none flex flex-col items-center">
                {/* Subtle backdrop tap to dismiss */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 pointer-events-auto cursor-pointer"
                  onClick={() => setIsSettingsModalOpen(false)}
                />

                {/* Compact Slide-Down Sheet restricted above canvas */}
                <motion.div
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`pointer-events-auto relative w-full max-w-xl mx-auto ${themeTokens.modalBg} border-b border-x rounded-b-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl flex flex-col gap-2 select-none z-10`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Row */}
                  <div className={`flex items-center justify-between border-b ${themeTokens.cardBorder} pb-1.5`}>
                    <div className="flex items-center gap-1.5">
                      <Settings className={`w-3.5 h-3.5 ${themeTokens.accentText}`} />
                      <span className="text-xs font-bold text-[#faf6f0]">Studio Settings</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(false)}
                      className={`p-1 rounded-lg ${themeTokens.stripBg} ${themeTokens.subtleText} hover:${themeTokens.highlightText} border ${themeTokens.cardBorder} transition-all cursor-pointer`}
                      title="Close Settings"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Settings Rows: Micro-Pills */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    {/* 1. Deck Hardware Style */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-[#b5a99a] uppercase font-bold tracking-wider shrink-0">
                        Theme:
                      </span>
                      <div className="flex items-center gap-1 flex-1">
                        {[
                          { id: 'obsidian' as const, label: 'Obsidian', led: 'bg-blue-400' },
                          { id: 'stealth' as const, label: 'Stealth', led: 'bg-emerald-400' },
                          { id: 'crimson' as const, label: 'Crimson', led: 'bg-rose-500' }
                        ].map((opt) => {
                          const isSelected = deckTheme === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                playHardwareClick(300, true);
                                setDeckTheme(opt.id);
                              }}
                              className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? (opt.id === 'stealth' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' : opt.id === 'crimson' ? 'bg-rose-500/20 text-rose-300 border-rose-400/50' : 'bg-blue-500/20 text-blue-300 border-blue-400/50')
                                  : `${themeTokens.stripBg} ${themeTokens.mutedText} border-transparent hover:text-white`
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${opt.led} ${isSelected ? 'animate-pulse' : 'opacity-60'} shrink-0`} />
                              <span className="truncate">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Lower Third Background Colors with Horizontal Inward Scroll */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-[#b5a99a] uppercase font-bold tracking-wider shrink-0">
                        L3 Color:
                      </span>

                      {/* Left Scroll Inward Button */}
                      <button
                        type="button"
                        onClick={() => handleScrollL3('left')}
                        disabled={!canScrollL3Left}
                        className={`p-1 rounded-lg shrink-0 transition-all cursor-pointer border ${
                          canScrollL3Left
                            ? `${themeTokens.stripBg} text-amber-300 border-amber-500/40 hover:bg-amber-500/20 active:scale-95`
                            : 'opacity-20 text-zinc-600 border-transparent cursor-default pointer-events-none'
                        }`}
                        title="Scroll colors left"
                        aria-label="Scroll colors left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Horizontal Inward Scroll Track */}
                      <div
                        ref={l3ColorScrollRef}
                        onScroll={checkL3Scroll}
                        className="flex items-center gap-1.5 flex-1 overflow-x-auto scroll-smooth no-scrollbar py-0.5 px-0.5 overscroll-x-contain touch-pan-x"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        {[
                          { id: 'black' as LowerThirdBgColor, label: 'Black', bg: '#050505', text: '#ffffff' },
                          { id: 'white' as LowerThirdBgColor, label: 'White', bg: '#ffffff', text: '#09090b' },
                          { id: 'midnight' as LowerThirdBgColor, label: 'Midnight', bg: '#0b1329', text: '#f1f5f9' },
                          { id: 'angular-chyron' as LowerThirdBgColor, label: 'Chyron', bg: '#d97706', text: '#ffffff' },
                          { id: 'royal-diamond' as LowerThirdBgColor, label: 'Royal', bg: '#7e22ce', text: '#ffffff' }
                        ].map((opt) => {
                          const isSelected = lowerThirdBgColor === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                handleLowerThirdBgColorChange(opt.id);
                                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                              }}
                              className={`shrink-0 min-w-[72px] sm:min-w-[78px] py-1 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer border whitespace-nowrap shadow-sm ${
                                isSelected
                                  ? 'ring-1 ring-[#faf6f0] border-transparent font-bold scale-[1.02]'
                                  : 'opacity-80 hover:opacity-100 border-white/10 hover:border-white/30'
                              }`}
                              style={{ backgroundColor: opt.bg, color: opt.text }}
                            >
                              {isSelected ? (
                                <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
                              )}
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Scroll Inward Button */}
                      <button
                        type="button"
                        onClick={() => handleScrollL3('right')}
                        disabled={!canScrollL3Right}
                        className={`p-1 rounded-lg shrink-0 transition-all cursor-pointer border ${
                          canScrollL3Right
                            ? `${themeTokens.stripBg} text-amber-300 border-amber-500/40 hover:bg-amber-500/20 active:scale-95`
                            : 'opacity-20 text-zinc-600 border-transparent cursor-default pointer-events-none'
                        }`}
                        title="Scroll colors right"
                        aria-label="Scroll colors right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Standalone Cinematic Motion Graphics Preview Studio Modal */}
      {isMotionPreviewModalOpen && (
        <CinematicTransitionPreview onClose={() => setIsMotionPreviewModalOpen(false)} />
      )}

      {/* ── Host Fellowship Audience & Permission Management Drawer ── */}
      <AnimatePresence>
        {isAudienceDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setIsAudienceDrawerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-3xl border ${containerBg} shadow-2xl flex flex-col overflow-hidden text-[#faf6f0]`}
            >
              {/* Drawer Header */}
              <div className={`p-3.5 border-b ${stripBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">Fellowship Audience</h3>
                    <p className="text-[11px] text-zinc-400">Live Participants & Permissions</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAudienceDrawerOpen(false)}
                  className="p-1.5 rounded-lg border border-zinc-700/60 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Room Ticket Sharing Card */}
              <div className="p-3 border-b border-zinc-800/80 bg-black/30 space-y-2">
                <span className="text-[11px] font-mono text-zinc-400 block">Room Ticket / Key</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-zinc-700 font-mono text-xs text-amber-300 font-bold truncate">
                    {compositorRef.current?.getFellowshipRoomKey?.() || 'fellowship-sanctuary'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const key = compositorRef.current?.getFellowshipRoomKey?.() || 'fellowship-sanctuary';
                      navigator.clipboard?.writeText(key);
                      setIsCopiedFellowshipTicket(true);
                      setTimeout(() => setIsCopiedFellowshipTicket(false), 2000);
                    }}
                    className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                    title="Copy Ticket"
                  >
                    {isCopiedFellowshipTicket ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Host Global Moderation Controls */}
              <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">Allow Viewer Comments</span>
                  <span className="text-[10px] text-zinc-400">Prayer Band & Word Confessions</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isChatEnabledGlobally;
                    setIsChatEnabledGlobally(next);
                    compositorRef.current?.toggleFellowshipChat?.(next);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold font-mono transition-all ${
                    isChatEnabledGlobally
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  {isChatEnabledGlobally ? 'Enabled' : 'Paused'}
                </button>
              </div>

              {/* Audience Roster List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2 no-scrollbar min-h-[160px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Connected Viewers ({fellowshipRoster.viewers.length})
                  </span>
                </div>

                {fellowshipRoster.viewers.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    <p>No viewers connected yet.</p>
                    <p className="text-[11px] text-zinc-600 mt-1">Share your Room Ticket for viewers to watch and pray with you.</p>
                  </div>
                ) : (
                  fellowshipRoster.viewers.map((viewer) => (
                    <div
                      key={viewer.userId}
                      className="p-2.5 rounded-xl border border-zinc-800 bg-black/40 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-[#faf6f0]">{viewer.displayName}</span>
                        <span className="font-mono text-[10px] text-amber-300/80">{viewer.userId}</span>
                      </div>

                      {/* Permit Recording Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !viewer.canRecord;
                          compositorRef.current?.permitViewerRecording?.(viewer.userId, next);
                          setFellowshipRoster(prev => ({
                            ...prev,
                            viewers: prev.viewers.map(v => v.userId === viewer.userId ? { ...v, canRecord: next } : v)
                          }));
                        }}
                        className={`py-1 px-2.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
                          viewer.canRecord
                            ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                            : 'bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                        title={viewer.canRecord ? 'Click to revoke recording permission' : 'Click to grant recording permission'}
                      >
                        {viewer.canRecord ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3" />}
                        <span>{viewer.canRecord ? 'Can Record' : 'Permit Save'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Live Chat & Prayer Feed Preview for Host */}
              <div className="p-3 border-t border-zinc-800/80 bg-black/30 max-h-44 overflow-y-auto no-scrollbar space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Live Fellowship Feed
                </span>
                {fellowshipMessages.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">Incoming prayer agreements and confessions will appear here.</p>
                ) : (
                  fellowshipMessages.slice(-5).map((m) => (
                    <div key={m.id} className="p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px]">
                      <span className="font-bold text-amber-300">{m.senderName}: </span>
                      <span className="text-zinc-200">{m.text}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
