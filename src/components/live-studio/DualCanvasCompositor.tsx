import React, { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Radio, Mic, MicOff, Video, VideoOff, Wifi, WifiOff, Sparkles, Volume2, Maximize2, Minimize2, ZoomIn, ZoomOut, Copy, Check, Smartphone, QrCode, X, RefreshCw, ChevronDown, ChevronUp, ChevronRight, BookOpen, ShieldAlert, Camera, Film, ArrowLeft, Tv, Settings } from 'lucide-react';
import { QRCodeSVG } from './QRCodeGenerator';
import { getProjectorCanvas, isMobileDevice } from '../../utils/windowManager';
import { getMatchedKjvTokenIndices, parseKjvRawTokens, stripSuppliedMarkup } from '../../utils/wordClusteringEngine';
import { groupVersesByStory } from '../../utils/pericopeChunker';
import { getWordTransliteration } from '../../utils/transliterationEngine';
import { InlineParagraphContext } from '../InlineParagraphContext';
import { STATIC_CHAPTERS } from '../../staticChapters';
import { getOfflineChapter, getBundledKjvChapter, normalizeBookName } from '../../utils/offlineBibleStorage';
import { getOfflineManuscriptChapter } from '../../utils/offlineManuscriptStorage';
import { useStudioDeckTheme, getTactileBtnClass, getTactileLedClass, playHardwareClick, getStudioThemeTokens, StudioDeckTheme } from './tactileTheme';
import { FellowshipParticipant, FellowshipMessage } from '../../types/fellowship';

// Auto-detect human-readable device model for camera/mic labeling
function getPhoneDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Device';
  const ua = navigator.userAgent;

  // Samsung Fold / Flip
  if (/SM-F/i.test(ua)) {
    if (/SM-F946/i.test(ua)) return 'Galaxy Z Fold5';
    if (/SM-F936/i.test(ua)) return 'Galaxy Z Fold4';
    if (/SM-F926/i.test(ua)) return 'Galaxy Z Fold3';
    if (/SM-F7/i.test(ua)) return 'Galaxy Z Flip';
    return 'Galaxy Fold';
  }

  // Samsung Galaxy S-series
  if (/SM-S92/i.test(ua) || /SM-S93/i.test(ua)) return 'Galaxy S24';
  if (/SM-S91/i.test(ua)) return 'Galaxy S23';
  if (/SM-S90/i.test(ua)) return 'Galaxy S22';
  if (/SM-G/i.test(ua)) return 'Samsung Galaxy';

  // Google Pixel
  const pixelMatch = ua.match(/Pixel\s*([0-9a-zA-Z\s]+)/i);
  if (pixelMatch) return `Pixel ${pixelMatch[1].trim()}`;

  // iPhone
  if (/iPhone/i.test(ua)) return 'iPhone';

  // Android device model extraction from UA string
  const androidModel = ua.match(/Android[^;]+;\s*([^;)]+)\s*(?:Build|[;)])/i);
  if (androidModel && androidModel[1]) {
    const raw = androidModel[1].trim();
    if (raw && !/Linux|K|wv/i.test(raw)) {
      return raw;
    }
  }

  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Win/i.test(ua)) return 'PC';
  return 'Device';
}

export interface FormattedMediaDevice {
  device: MediaDeviceInfo;
  displayName: string;
}

function getDeduplicatedVideoDevices(devices: MediaDeviceInfo[], phoneName: string): FormattedMediaDevice[] {
  const result: FormattedMediaDevice[] = [];
  const seenCategories = new Set<string>();

  // Standard Front and Back Mobile Camera options
  result.push({
    device: { deviceId: 'facing-environment', kind: 'videoinput', label: 'Back Camera', groupId: '' } as MediaDeviceInfo,
    displayName: `${phoneName} Back Camera`
  });
  result.push({
    device: { deviceId: 'facing-user', kind: 'videoinput', label: 'Front Camera', groupId: '' } as MediaDeviceInfo,
    displayName: `${phoneName} Front Camera`
  });
  seenCategories.add('back');
  seenCategories.add('front');

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    const lbl = (d.label || '').toLowerCase();

    let category = '';
    let name = '';

    if (lbl.includes('ultra') || lbl.includes('wide') || lbl.includes('0.5x')) {
      category = 'ultra-wide';
      name = `${phoneName} Ultra-Wide Camera`;
    } else if (lbl.includes('tele') || lbl.includes('zoom')) {
      category = 'telephoto';
      name = `${phoneName} Telephoto Camera`;
    } else if (lbl.includes('usb') || lbl.includes('external') || lbl.includes('camlink') || lbl.includes('virtual') || lbl.includes('obs')) {
      category = `external-${d.deviceId || i}`;
      name = d.label || `External Camera ${result.length + 1}`;
    } else if (d.deviceId) {
      category = `camera-${d.deviceId}`;
      name = d.label || `Camera ${result.length + 1}`;
    } else {
      continue;
    }

    if (!seenCategories.has(category)) {
      seenCategories.add(category);
      result.push({ device: d, displayName: name });
    }
  }

  return result;
}

function getDeduplicatedAudioDevices(devices: MediaDeviceInfo[], phoneName: string): FormattedMediaDevice[] {
  const result: FormattedMediaDevice[] = [];
  let hasBuiltIn = false;

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    const lbl = (d.label || '').toLowerCase();

    if (lbl.includes('headset') || lbl.includes('bluetooth') || lbl.includes('ear') || lbl.includes('airpod')) {
      result.push({ device: d, displayName: `${phoneName} Headset Mic` });
    } else if (lbl.includes('usb') || lbl.includes('external') || lbl.includes('rode') || lbl.includes('shure')) {
      result.push({ device: d, displayName: d.label || `External Mic ${result.length + 1}` });
    } else {
      if (!hasBuiltIn) {
        hasBuiltIn = true;
        result.push({ device: d, displayName: `${phoneName} Built-in Microphone` });
      }
    }
  }

  return result;
}

export type CanvasLayoutMode = 'WEBCAM' | 'MEDIA_ONLY' | 'PIP';
export type AspectRatioMode = '16:9' | '9:16';
export type LowerThirdBgColor = 'black' | 'white' | 'midnight' | 'angular-chyron' | 'royal-diamond';

export interface LowerThirdData {
  book: string;
  chapter: number;
  verse?: number;
  text?: string;
  translation?: string;
  displayMode?: 'standard' | 'interlinear';
  canvasViewMode?: 'lower-third' | 'full-screen';
  isFullScreenPip?: boolean;
  manuscriptText?: string;
  interlinearWords?: { w: string; t: string; n: string; p?: string }[];
  language?: 'Greek' | 'Hebrew' | 'Aramaic' | 'Other';
  selectedWord?: {
    word: string;
    originalValue: string;
    language: string;
    strongsNumber?: string;
    parsingTag?: string;
    parsingDescription?: string;
    rootMeaning?: string;
    explanation?: string;
    isExpanded?: boolean;
    scrollRatio?: number;
  } | null;
  allVerses?: any[];
  allInterlinearVerses?: Record<number, any>;
  theme?: 'light' | 'dark';
  bgColor?: LowerThirdBgColor;
  attachedCrossRefs?: Array<{ ref: string; text: string }>;
  inlineContextRef?: string | null;
  isCrossRefOpen?: boolean;
}

export const getCanvasScriptureFontFamily = (typeface?: string): string => {
  switch (typeface) {
    case 'sans':
      return '"Inter", ui-sans-serif, system-ui, sans-serif';
    case 'mono':
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    case 'serif':
      return '"Literata", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    case 'untitled-serif':
    default:
      return '"Untitled Serif", "Source Serif 4", "Literata", Georgia, Cambria, "Times New Roman", serif';
  }
};

export const getCssScriptureFontClass = (typeface?: string): string => {
  switch (typeface) {
    case 'sans':
      return 'font-sans';
    case 'mono':
      return 'font-mono';
    case 'serif':
      return 'font-serif';
    case 'untitled-serif':
    default:
      return 'font-untitled';
  }
};

export interface DualCanvasCompositorProps {
  layoutMode: CanvasLayoutMode;
  activeAspectRatio: AspectRatioMode;
  lowerThird: LowerThirdData | null;
  isLowerThirdVisible: boolean;
  canvasScriptureMode?: 'lower-third' | 'full-screen';
  isFullScreenPip?: boolean;
  onToggleFullScreenPip?: (enabled: boolean) => void;
  previewScrollRatio?: number | null;
  theme?: 'light' | 'dark';
  lowerThirdBgColor?: LowerThirdBgColor;
  scriptureTypeface?: 'untitled-serif' | 'serif' | 'sans' | 'mono';
  isScriptureBold?: boolean;
  mediaVideoRef: React.RefObject<HTMLVideoElement | null>;
  isWebcamEnabled?: boolean;
  micVolume?: number; // 0 to 1
  mediaVolume?: number; // 0 to 1
  isMuted?: boolean;
  wsUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
  platform?: string;
  onTelemetry?: (data: { fps: number; bitrate: string; vuLevel: number }) => void;
  onStreamStateChange?: (state: 'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR', message?: string) => void;
  onLayoutModeChange?: (mode: CanvasLayoutMode) => void;
  onBackToHome?: () => void;
  onMinimize?: () => void;
  onToggleProjector?: () => void;
  isProjectorActive?: boolean;
  onSnapshot?: () => void;
  onOpenSettings?: () => void;
  motionSpeedMultiplier?: number;
  onFellowshipRosterChange?: (data: { viewers: FellowshipParticipant[]; viewerCount: number }) => void;
  onFellowshipMessage?: (msg: FellowshipMessage) => void;
}

export interface SermonRecordResult {
  blob: Blob;
  filename: string;
  url: string;
  file?: File;
  sizeBytes: number;
}

export interface DualCanvasCompositorRef {
  startBroadcast: (overrideConfig?: { rtmpUrl?: string; streamKey?: string; platform?: string }) => Promise<void>;
  stopBroadcast: () => void;
  getAudioContext: () => AudioContext | null;
  getMediaDestination: () => MediaStreamAudioDestinationNode | null;
  takeSnapshot: () => string | null;
  connectMediaElementToAudio: () => void;
  triggerTransition?: () => void;
  startSermonRecording: (dirHandle?: any) => Promise<{ success: boolean; error?: string }>;
  pauseSermonRecording: () => boolean;
  resumeSermonRecording: () => boolean;
  stopSermonRecording: () => Promise<{ success: boolean; result?: SermonRecordResult; error?: string }>;
  isSermonRecording: () => boolean;
  getSermonRecordingState: () => 'IDLE' | 'RECORDING' | 'PAUSED';
  permitViewerRecording?: (userId: string, canRecord: boolean) => void;
  toggleFellowshipChat?: (enabled: boolean) => void;
  sendFellowshipMessage?: (msg: FellowshipMessage) => void;
  getFellowshipRoomKey?: () => string;
}

const getIceServers = (): RTCIceServer[] => {
  try {
    // 1. Check window global override (e.g. from index.html)
    if (typeof window !== 'undefined' && Array.isArray((window as any).LOGOSBRIDGE_ICE_SERVERS)) {
      return (window as any).LOGOSBRIDGE_ICE_SERVERS;
    }
    // 2. Check localStorage (for browser-level or runtime settings)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('logosbridge_ice_servers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // 3. Check Vite environment variable from .env (e.g. VITE_ICE_SERVERS)
    const envIce = (import.meta as any).env?.VITE_ICE_SERVERS;
    if (envIce) {
      const parsed = typeof envIce === 'string' ? JSON.parse(envIce) : envIce;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[WebRTC] Error parsing custom ICE/TURN servers:', err);
  }

  // Default fallback: Google public STUN servers
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
};

interface CylinderDeviceOption {
  id: string;
  label: string;
  isPhone?: boolean;
}

interface CylinderDeviceRollerProps {
  icon: React.ReactNode;
  options: CylinderDeviceOption[];
  selectedId?: string;
  fallbackLabel: string;
  deckTheme: StudioDeckTheme;
  themeTokens: ReturnType<typeof getStudioThemeTokens>;
  onSelect: (id: string) => void;
  title: string;
}

const CylinderDeviceRoller: React.FC<CylinderDeviceRollerProps> = ({
  icon,
  options,
  selectedId,
  fallbackLabel,
  deckTheme,
  themeTokens,
  onSelect,
  title,
}) => {
  const currentIndex = useMemo(() => {
    if (options.length === 0) return 0;
    const idx = options.findIndex(opt => opt.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [options, selectedId]);

  const anglePerItem = 60;
  const radius = 22; // 22px drum depth radius for 38px height slot

  const [currentAngle, setCurrentAngle] = useState(() => currentIndex * anglePerItem);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartAngle = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const angleRef = useRef(currentAngle);
  angleRef.current = currentAngle;

  // Sync external selectedId changes
  useEffect(() => {
    const target = currentIndex * anglePerItem;
    setCurrentAngle(target);
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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartY.current = e.clientY;
    lastY.current = e.clientY;
    dragStartAngle.current = angleRef.current;
    lastTime.current = performance.now();
    velocity.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTime.current);
    const dy = dragStartY.current - e.clientY;
    const deltaY = lastY.current - e.clientY;

    velocity.current = (deltaY / dt) * 15;
    lastY.current = e.clientY;
    lastTime.current = now;

    // Continuous 1:1 rotation
    setCurrentAngle(dragStartAngle.current + dy * 0.55);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Inertial momentum projection
    const projectedAngle = angleRef.current + velocity.current * 3;
    const snapIndex = Math.round(projectedAngle / anglePerItem);
    const normalizedIdx = ((snapIndex % options.length) + options.length) % options.length;

    playHardwareClick(260 + normalizedIdx * 20, true);
    setCurrentAngle(snapIndex * anglePerItem);
    if (options[normalizedIdx]) {
      onSelect(options[normalizedIdx].id);
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
      className={`relative flex-1 min-w-[130px] sm:min-w-[160px] h-[38px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none group border transition-all ${getTactileBtnClass(deckTheme, false)}`}
      title={`${title} (Swipe, spin scroll wheel, or tap arrows to roll devices)`}
      style={{ perspective: '450px', touchAction: 'none' }}
    >
      {/* 3D Cylindrical Curved Shadows & Specular Lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2.5 bg-gradient-to-b from-black/80 via-black/35 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-white/20 via-white/5 to-transparent z-10" />

      {/* Knurled metallic side accents */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-white/10 to-transparent z-10" />
      <div className="pointer-events-none absolute right-[26px] top-0 bottom-0 w-1 bg-gradient-to-l from-white/10 to-transparent z-10" />

      {/* 3D Rotating Drum Facet Pivot */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateZ(-${radius}px) rotateX(${-currentAngle}deg)`,
          transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform'
        }}
      >
        {options.length === 0 ? (
          <div className="absolute inset-0 h-[38px] flex items-center px-2.5 gap-1.5">
            <div className="opacity-80">{icon}</div>
            <span className="text-xs font-semibold truncate text-[#faf6f0]">{fallbackLabel}</span>
          </div>
        ) : (
          options.map((opt, idx) => {
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
                className="absolute inset-0 h-[38px] flex items-center justify-between px-2.5 gap-1.5 backface-hidden"
                style={{
                  transform: `rotateX(${facetAngle}deg) translateZ(${radius}px)`,
                  opacity: isVisible ? norm : 0,
                  filter: isVisible ? `brightness(${(0.4 + 0.6 * norm).toFixed(2)})` : 'brightness(0.4)',
                  pointerEvents: absDiff < 30 ? 'auto' : 'none'
                }}
              >
                <div className="flex items-center gap-1.5 shrink-0 opacity-90">
                  {icon}
                  {opt.isPhone && (
                    <span className={`w-1.5 h-1.5 rounded-full ${deckTheme === 'crimson' ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`} />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex items-center pr-6">
                  <span className="text-xs font-semibold truncate text-[#faf6f0]">
                    {opt.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cylinder Stepper Roller Dial (Micro Chevrons) */}
      {options.length > 1 && (
        <div className="absolute right-0 top-0 bottom-0 w-[24px] flex flex-col items-center justify-center bg-black/40 border-l border-white/10 z-20">
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

// ── Cinematic Motion Graphics Transitions Math ──
function clampVal(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - clampVal(x, 0, 1), 4);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - clampVal(x, 0, 1), 3);
}

function cinematicSpring(x: number): number {
  const t = clampVal(x, 0, 1);
  if (t === 0) return 0;
  if (t === 1) return 1;
  // Natural cinematic damped harmonic spring: smooth luxurious rise, gentle crest, silky settle
  const decay = Math.exp(-5.5 * t);
  const oscillation = Math.cos(t * Math.PI * 2.1);
  return 1 - decay * oscillation;
}

export const DualCanvasCompositor = forwardRef<DualCanvasCompositorRef, DualCanvasCompositorProps>(({
  layoutMode,
  activeAspectRatio,
  lowerThird,
  isLowerThirdVisible,
  canvasScriptureMode = 'lower-third',
  isFullScreenPip,
  onToggleFullScreenPip,
  previewScrollRatio,
  theme = 'dark',
  lowerThirdBgColor = 'white',
  scriptureTypeface,
  isScriptureBold,
  mediaVideoRef,
  isWebcamEnabled = true,
  micVolume = 1,
  mediaVolume = 1,
  isMuted = false,
  wsUrl = 'ws://localhost:8080',
  rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2',
  streamKey = '',
  platform = 'youtube',
  onTelemetry,
  onStreamStateChange,
  onLayoutModeChange,
  onBackToHome,
  onMinimize,
  onToggleProjector,
  isProjectorActive = false,
  onSnapshot,
  onOpenSettings,
  motionSpeedMultiplier = 0.25,
  onFellowshipRosterChange,
  onFellowshipMessage
}, ref) => {
  const [deckTheme] = useStudioDeckTheme();
  const themeTokens = getStudioThemeTokens(deckTheme);

  // Canvas references
  const canvas169Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas916Ref = useRef<HTMLCanvasElement | null>(null);
  const hiddenWebcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const inbuiltPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const phonePreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Webcam & Audio streams
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null); // separate audio-only stream (keeps Speech API interference-free)
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const mediaGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mediaDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Full-Screen Bible PIP State
  const isFullScreenPipEffective = Boolean(isFullScreenPip ?? lowerThird?.isFullScreenPip);
  const isFullScreenPipRef = useRef<boolean>(isFullScreenPipEffective);

  useEffect(() => {
    isFullScreenPipRef.current = isFullScreenPipEffective;
  }, [isFullScreenPipEffective]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaElementSourceCreatedRef = useRef<boolean>(false);

  // Streaming state
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [streamState, setStreamState] = useState<'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const streamStateRef = useRef<'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const idleTimeoutRef = useRef<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Studio Engine Ready');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [vuMeterLevel, setVuMeterLevel] = useState<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const ndiBroadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        ndiBroadcastChannelRef.current = new BroadcastChannel('logosbridge-ndi-canvas');
      }
    } catch {}
    return () => {
      try {
        ndiBroadcastChannelRef.current?.close();
        ndiBroadcastChannelRef.current = null;
      } catch {}
    };
  }, []);

  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

  // ── M3 Device Enumeration State ──
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  // Mobile detection for optimal default camera facing mode
  const isMobileClient = useMemo(() => isMobileDevice(), []);

  const initialFacingMode: 'user' | 'environment' = useMemo(() => {
    return isMobileClient ? 'environment' : 'user';
  }, [isMobileClient]);

  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const currentFacingModeRef = useRef<'user' | 'environment'>(initialFacingMode);

  // Camera connection & decoding readiness states
  const [isCameraConnecting, setIsCameraConnecting] = useState<boolean>(true);
  const isCameraConnectingRef = useRef<boolean>(true);
  const isInitiatingCameraRef = useRef<boolean>(false);
  const isAwaitingFirstFrameRef = useRef<boolean>(false);
  const hasMountedRef = useRef<boolean>(false);

  const activeAspectRatioRef = useRef<AspectRatioMode>(activeAspectRatio);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const cameraPermissionErrorRef = useRef<string | null>(null);

  const updateCameraError = (err: string | null) => {
    setCameraPermissionError(err);
    cameraPermissionErrorRef.current = err;
  };

  useEffect(() => {
    activeAspectRatioRef.current = activeAspectRatio;
  }, [activeAspectRatio]);

  // ── Camera Lens Zoom & Mobile Fullscreen State ──
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const cameraZoomRef = useRef<number>(1.0);
  const [isZoomFabExpanded, setIsZoomFabExpanded] = useState<boolean>(false);
  const [isFineDialOpen, setIsFineDialOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const studioContainerRef = useRef<HTMLDivElement>(null);

  const phoneDeviceName = useMemo(() => getPhoneDeviceName(), []);

  const filteredVideoDevices = useMemo(() => {
    return getDeduplicatedVideoDevices(videoDevices, phoneDeviceName);
  }, [videoDevices, phoneDeviceName]);

  const filteredAudioDevices = useMemo(() => {
    return getDeduplicatedAudioDevices(audioDevices, phoneDeviceName);
  }, [audioDevices, phoneDeviceName]);

  const handleCameraZoomChange = useCallback((newZoom: number) => {
    const clamped = Math.max(0.5, Math.min(5.0, Math.round(newZoom * 10) / 10));
    setCameraZoom(clamped);
    cameraZoomRef.current = clamped;

    try {
      const track = webcamStreamRef.current?.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities ? (track.getCapabilities() as any) : null;
        if (caps && 'zoom' in caps) {
          const minHw = caps.zoom.min || 1;
          const maxHw = caps.zoom.max || 5;
          const hwZoom = Math.max(minHw, Math.min(maxHw, clamped));
          track.applyConstraints({ advanced: [{ zoom: hwZoom } as any] }).catch(() => {});
        }
      }
    } catch {}
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      studioContainerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // ── 9:16 Portrait Canvas Interactive Root Action Expand State ──
  const lastCardYRef = useRef<number>(0);
  const [isRootActionExpanded916, setIsRootActionExpanded916] = useState<boolean>(false);
  const isRootActionExpanded916Ref = useRef<boolean>(false);

  useEffect(() => {
    isRootActionExpanded916Ref.current = isRootActionExpanded916;
  }, [isRootActionExpanded916]);

  // Click-away listener to collapse expanded root action overlay on 9:16 canvas
  useEffect(() => {
    if (!isRootActionExpanded916) return;
    const handleDocClick = () => {
      setIsRootActionExpanded916(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleDocClick);
    }, 60);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleDocClick);
    };
  }, [isRootActionExpanded916]);

  const handleCanvas916Click = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasScriptureModeRef.current === 'full-screen') return;
    const canvas = canvas916Ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = e.clientY - rect.top;
    const scaleY = 1920 / rect.height;
    const canvasY = clientY * scaleY;

    const currentLT = lowerThirdRef.current;
    if (!currentLT || !currentLT.selectedWord) {
      setIsRootActionExpanded916(false);
      return;
    }

    const lastCardY = lastCardYRef.current;
    const topBarH = 96;
    const topBarY = lastCardY + 26;

    // Check if clicked in top bar area of lower third card
    if (canvasY >= topBarY - 12 && canvasY <= topBarY + topBarH + 24) {
      e.stopPropagation();
      setIsRootActionExpanded916((prev) => !prev);
    } else {
      // Clicked away on scripture text or video feed
      setIsRootActionExpanded916(false);
    }
  }, []);

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const isQrModalOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isQrModalOpenRef.current = isQrModalOpen;
  }, [isQrModalOpen]);
  const [remoteCamRoomId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('logosbridge_remote_cam_room');
      if (saved) return saved;
      const newId = `studio-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('logosbridge_remote_cam_room', newId);
      return newId;
    } catch {
      return `studio-${Math.random().toString(36).slice(2, 8)}`;
    }
  });
  const pendingPhoneCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingPhoneIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [remoteCamUrl, setRemoteCamUrl] = useState<string>('');
  const [remotePhoneStatus, setRemotePhoneStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTED'>('IDLE');
  const [remotePhoneInfo, setRemotePhoneInfo] = useState<{ deviceName: string; resolution: string; fps: number } | null>(null);
  const [isCopiedQrUrl, setIsCopiedQrUrl] = useState<boolean>(false);
  const [justConnectedPhone, setJustConnectedPhone] = useState<string | null>(null);
  const [phoneStandbyMap, setPhoneStandbyMap] = useState<Record<string, boolean>>({});
  const phoneStandbyMapRef = useRef<Record<string, boolean>>({});

  // Multi-phone camera mesh state (Supports 2-3 phones concurrently)
  const [connectedPhones, setConnectedPhones] = useState<{ phoneId: string; deviceName: string; info?: any }[]>([]);
  const phonePeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const phoneStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const phoneVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Freeze-buffer & cinematic cross-dissolve transition engine
  const freezeFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasRenderedValidFrameRef = useRef<boolean>(false);
  const transitionSnapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transitionStartTimeRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);
  const isTransitionPendingRef = useRef<boolean>(false);
  const selectedVideoIdRef = useRef<string>(selectedVideoId);

  useEffect(() => {
    selectedVideoIdRef.current = selectedVideoId;
  }, [selectedVideoId]);

  const micVolumeRef = useRef<number>(micVolume);
  useEffect(() => {
    micVolumeRef.current = micVolume;
  }, [micVolume]);

  const triggerCinematicTransition = useCallback(() => {
    // Avoid clobbering an active transition or pending snapshot
    if (isTransitionPendingRef.current || isTransitioningRef.current) return;
    const targetCanvas = activeAspectRatioRef.current === '9:16' ? canvas916Ref.current : canvas169Ref.current;
    if (targetCanvas) {
      if (!transitionSnapshotCanvasRef.current) {
        transitionSnapshotCanvasRef.current = document.createElement('canvas');
      }
      const snap = transitionSnapshotCanvasRef.current;
      if (snap.width !== targetCanvas.width || snap.height !== targetCanvas.height) {
        snap.width = targetCanvas.width;
        snap.height = targetCanvas.height;
      }
      const snapCtx = snap.getContext('2d');
      if (snapCtx) {
        snapCtx.fillStyle = '#0b0e14';
        snapCtx.fillRect(0, 0, snap.width, snap.height);
        snapCtx.drawImage(targetCanvas, 0, 0);
        isTransitionPendingRef.current = true;
        isTransitioningRef.current = false;
        transitionStartTimeRef.current = 0;
      }
    }
  }, []);

  // M3 Device Sheet State (In-flow accordion tray)
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState<'camera' | 'mic' | null>(null);
  const [isTopPanelExpanded, setIsTopPanelExpanded] = useState<boolean>(false);

  // Auto-close device dropdown when clicking outside
  useEffect(() => {
    if (!isDeviceSheetOpen) return;
    const handleOutsideClose = () => setIsDeviceSheetOpen(null);
    window.addEventListener('click', handleOutsideClose);
    return () => window.removeEventListener('click', handleOutsideClose);
  }, [isDeviceSheetOpen]);

  const activeCameraLabel = useMemo(() => {
    if (connectedPhones.length > 0) {
      const activePhone = connectedPhones.find(p => p.phoneId === selectedVideoId);
      if (activePhone) {
        return `📱 ${activePhone.deviceName || 'Wireless Phone Camera'}`;
      }
      if (selectedVideoId === 'remote-phone-cam') {
        return `📱 ${connectedPhones[0].deviceName || 'Wireless Phone Camera'}`;
      }
    }
    if (remotePhoneStatus === 'CONNECTED' && selectedVideoId === 'remote-phone-cam') {
      return `📱 ${remotePhoneInfo?.deviceName || 'Wireless Phone Camera'}`;
    }
    const match = filteredVideoDevices.find(d => d.device.deviceId === selectedVideoId);
    return match?.displayName || (filteredVideoDevices[0]?.displayName) || `${phoneDeviceName} Camera`;
  }, [selectedVideoId, filteredVideoDevices, connectedPhones, remotePhoneStatus, remotePhoneInfo, phoneDeviceName]);

  const isPhoneSelected = useMemo(() => {
    return selectedVideoId === 'remote-phone-cam' || connectedPhones.some(p => p.phoneId === selectedVideoId);
  }, [selectedVideoId, connectedPhones]);
  const isPhoneSelectedRef = useRef<boolean>(isPhoneSelected);
  useEffect(() => {
    isPhoneSelectedRef.current = isPhoneSelected;
  }, [isPhoneSelected]);

  const activeMicLabel = useMemo(() => {
    const match = filteredAudioDevices.find(d => d.device.deviceId === selectedAudioId);
    return match?.displayName || (filteredAudioDevices[0]?.displayName) || `${phoneDeviceName} Built-in Mic`;
  }, [selectedAudioId, filteredAudioDevices, phoneDeviceName]);

  // Cylindrical Multi-Dimensional Options for Camera & Microphone
  const cameraRollOptions = useMemo<CylinderDeviceOption[]>(() => {
    const list: CylinderDeviceOption[] = [];
    connectedPhones.forEach(phone => {
      list.push({
        id: phone.phoneId,
        label: `📱 ${phone.deviceName || 'Wireless Phone Camera'}`,
        isPhone: true
      });
    });
    filteredVideoDevices.forEach(({ device, displayName }) => {
      list.push({
        id: device.deviceId,
        label: displayName
      });
    });
    return list;
  }, [connectedPhones, filteredVideoDevices]);

  const micRollOptions = useMemo<CylinderDeviceOption[]>(() => {
    return filteredAudioDevices.map(({ device, displayName }) => ({
      id: device.deviceId,
      label: displayName
    }));
  }, [filteredAudioDevices]);

  const remotePhonePeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remotePhoneStreamRef = useRef<MediaStream | null>(null);
  const remotePhoneWsRef = useRef<WebSocket | null>(null);
  const switchCameraRef = useRef<((targetVideoId?: string) => Promise<void>) | null>(null);

  // Fetch local network IP for accurate Wi-Fi QR code scanning
  useEffect(() => {
    const fetchNetworkIp = async () => {
      try {
        const isPublicDomain = window.location.hostname &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1' &&
          !/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
        if (isPublicDomain) {
          const portPart = window.location.port ? `:${window.location.port}` : '';
          setRemoteCamUrl(`${window.location.protocol}//${window.location.hostname}${portPart}/?mode=remote-cam&room=${remoteCamRoomId}`);
          return;
        }

        const res = await fetch('/api/network-ip');
        if (res.ok) {
          const data = await res.json();
          const host = (data.ip && data.ip !== 'localhost') ? data.ip : window.location.hostname || 'localhost';
          const httpsPort = data.httpsPort || 3443;
          // Prefer HTTPS URL so mobile phone browsers enter a Secure Context for camera access
          setRemoteCamUrl(`https://${host}:${httpsPort}/?mode=remote-cam&room=${remoteCamRoomId}`);
        } else {
          const isHttps = window.location.protocol === 'https:';
          const port = isHttps ? 3443 : (window.location.port || 3000);
          setRemoteCamUrl(`${window.location.protocol}//${window.location.hostname}:${port}/?mode=remote-cam&room=${remoteCamRoomId}`);
        }
      } catch {
        const isHttps = window.location.protocol === 'https:';
        const port = isHttps ? 3443 : (window.location.port || 3000);
        setRemoteCamUrl(`${window.location.protocol}//${window.location.hostname}:${port}/?mode=remote-cam&room=${remoteCamRoomId}`);
      }
    };
    fetchNetworkIp();
  }, [remoteCamRoomId]);

  // Enumerate all video and audio input devices
  const enumerateMediaDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices.filter((d) => d.kind === 'videoinput');
      const aInputs = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(vInputs);
      setAudioDevices(aInputs);
    } catch (err: any) {
      console.warn('[Device Enumeration] Error listing media devices:', err.message);
    }
  }, []);

  // Listen for USB device plug / unplug events dynamically
  useEffect(() => {
    enumerateMediaDevices();

    const handleDeviceChange = () => {
      console.log('[Device Enumeration] Media devices updated (USB change detected).');
      enumerateMediaDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [enumerateMediaDevices]);

  // ── WebRTC Host Receiver Engine for Wireless Phone Cameras ──
  const isHostSignalingDisposedRef = useRef<boolean>(false);
  const hostReconnectTimerRef = useRef<any>(null);
  const connectHostSignalingRef = useRef<() => void>(() => {});

  useEffect(() => {
    isHostSignalingDisposedRef.current = false;

    let wsInstance: WebSocket | null = null;

    const connectSignaling = () => {
      if (isHostSignalingDisposedRef.current) return;
      if (remotePhoneWsRef.current && (remotePhoneWsRef.current.readyState === WebSocket.OPEN || remotePhoneWsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const wsHost = window.location.hostname || 'localhost';
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const portPart = window.location.port ? `:${window.location.port}` : (isHttps ? '' : ':8080');
      const signalingUrl = `${wsProtocol}//${wsHost}${portPart}`;

      console.log(`[Remote Phone Host] Connecting to WebRTC signaling at ${signalingUrl} (Room: ${remoteCamRoomId})`);
      const ws = new WebSocket(signalingUrl);
      wsInstance = ws;
      remotePhoneWsRef.current = ws;

      ws.onopen = () => {
        console.log(`[Remote Phone Host] Registered host for room ${remoteCamRoomId}`);
        ws.send(JSON.stringify({
          type: 'WEBRTC_JOIN',
          room: remoteCamRoomId,
          role: 'host'
        }));
      };

      ws.onclose = () => {
        console.log('[Remote Phone Host] WebSocket signaling closed, reconnecting in 2s...');
        if (!isHostSignalingDisposedRef.current) {
          clearTimeout(hostReconnectTimerRef.current);
          hostReconnectTimerRef.current = setTimeout(connectSignaling, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Remote Phone Host] WebSocket error:', err);
        try { ws.close(); } catch {}
      };

      ws.onmessage = onWsMessage;
    };

    connectHostSignalingRef.current = connectSignaling;

    const cleanupPhone = (phoneId: string) => {
      console.log(`[Remote Phone Host] Cleaning up phone ${phoneId}`);
      const pc = phonePeerConnectionsRef.current.get(phoneId);
      if (pc) {
        try { pc.close(); } catch {}
        phonePeerConnectionsRef.current.delete(phoneId);
      }
      phoneStreamsRef.current.delete(phoneId);
      phoneVideoRefs.current.delete(phoneId);
      pendingPhoneIceCandidatesRef.current.delete(phoneId);
      delete phoneStandbyMapRef.current[phoneId];
      setPhoneStandbyMap(prev => {
        const next = { ...prev };
        delete next[phoneId];
        return next;
      });

      setConnectedPhones(prev => {
        const next = prev.filter(p => p.phoneId !== phoneId);
        if (next.length === 0) {
          setRemotePhoneStatus('IDLE');
          setRemotePhoneInfo(null);
        }
        return next;
      });

      setSelectedVideoId((prev) => {
        if (prev === phoneId || (prev === 'remote-phone-cam' && phoneId === 'phone-1')) {
          const fallback = currentFacingModeRef.current === 'environment' ? 'facing-environment' : 'facing-user';
          if (webcamStreamRef.current && hiddenWebcamVideoRef.current) {
            hiddenWebcamVideoRef.current.srcObject = webcamStreamRef.current;
            hiddenWebcamVideoRef.current.play().catch(() => {});
            setIsWebcamActive(true);
            isWebcamActiveRef.current = true;
          } else {
            switchCameraRef.current?.(fallback);
          }
          return fallback;
        }
        return prev;
      });
    };

    const onWsMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const phoneId = data.phoneId || 'phone-1';

        if (data.type === 'WEBRTC_PHONE_JOINED') {
          const deviceName = data.deviceName || 'Wireless Phone Camera';
          console.log(`[Remote Phone Host] Phone joined: ${phoneId} (${deviceName})`);

          // Safeguard: Check if this phone already has an active, connected peer connection with active tracks
          const existingPc = phonePeerConnectionsRef.current.get(phoneId);
          const existingStream = phoneStreamsRef.current.get(phoneId);
          const isAlreadyLive = existingPc &&
            (existingPc.connectionState === 'connected' || existingPc.iceConnectionState === 'connected') &&
            existingStream && existingStream.getTracks().some(t => t.readyState === 'live');

          if (isAlreadyLive) {
            console.log(`[Remote Phone Host] Phone ${phoneId} (${deviceName}) is already actively streaming. Preserving connection.`);
            return;
          }

          setRemotePhoneStatus('WAITING');
          pendingPhoneIceCandidatesRef.current.delete(phoneId);

          // Clean up any stale or broken connection for this specific phoneId
          if (existingPc) {
            try { existingPc.close(); } catch {}
          }

          const pc = new RTCPeerConnection({
            iceServers: getIceServers()
          });
          phonePeerConnectionsRef.current.set(phoneId, pc);

          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });

          pc.ontrack = (trackEvent) => {
            console.log(`[Remote Phone Host] Incoming track (${phoneId}):`, trackEvent.track.kind);
            let incomingStream = phoneStreamsRef.current.get(phoneId);
            if (!incomingStream) {
              incomingStream = (trackEvent.streams && trackEvent.streams[0]) ? trackEvent.streams[0] : new MediaStream();
              phoneStreamsRef.current.set(phoneId, incomingStream);
            }
            if (!incomingStream.getTracks().includes(trackEvent.track)) {
              incomingStream.addTrack(trackEvent.track);
            }

            // Listen for native WebRTC track mute/unmute events (fires when mobile OS suspends camera on minimize)
            trackEvent.track.onmute = () => {
              console.log(`[Remote Phone Host] Track muted (phone ${phoneId} minimized or in background)`);
              phoneStandbyMapRef.current[phoneId] = true;
              setPhoneStandbyMap(prev => ({ ...prev, [phoneId]: true }));
            };
            trackEvent.track.onunmute = () => {
              console.log(`[Remote Phone Host] Track unmuted (phone ${phoneId} restored to foreground)`);
              phoneStandbyMapRef.current[phoneId] = false;
              setPhoneStandbyMap(prev => ({ ...prev, [phoneId]: false }));
            };

            // Sync legacy ref for single-phone compatibility
            remotePhoneStreamRef.current = incomingStream;

            // Update phone preview video thumbnail if registered
            const pVid = phoneVideoRefs.current.get(phoneId);
            if (pVid) {
              pVid.srcObject = incomingStream;
              pVid.play().catch(() => {});
            }
            if (phonePreviewVideoRef.current) {
              phonePreviewVideoRef.current.srcObject = incomingStream;
              phonePreviewVideoRef.current.play().catch(() => {});
            }

            // Update connectedPhones list
            setConnectedPhones(prev => {
              const exists = prev.find(p => p.phoneId === phoneId);
              if (exists) {
                return prev.map(p => p.phoneId === phoneId ? { ...p, deviceName } : p);
              }
              return [...prev, { phoneId, deviceName }];
            });

            setRemotePhoneStatus('CONNECTED');
            setJustConnectedPhone(phoneId);
            setTimeout(() => setJustConnectedPhone(null), 3000);

            // Auto-activate this phone camera on canvas when paired via QR or if no other phone is active
            const isThisPhoneActive = isQrModalOpenRef.current ||
              selectedVideoIdRef.current === phoneId ||
              selectedVideoIdRef.current === 'remote-phone-cam' ||
              !selectedVideoIdRef.current ||
              !selectedVideoIdRef.current.startsWith('phone-');

            if (isThisPhoneActive) {
              setSelectedVideoId(phoneId);
              selectedVideoIdRef.current = phoneId;
            }

            if (isThisPhoneActive && hiddenWebcamVideoRef.current) {
              const vEl = hiddenWebcamVideoRef.current;
              vEl.muted = true;
              vEl.defaultMuted = true;
              vEl.playsInline = true;
              vEl.autoplay = true;
              isAwaitingFirstFrameRef.current = false;
              isCameraConnectingRef.current = false;
              vEl.srcObject = incomingStream;

              const handlePhoneReady = () => {
                isAwaitingFirstFrameRef.current = false;
                setIsCameraConnecting(false);
                isCameraConnectingRef.current = false;
                setIsWebcamActive(true);
                isWebcamActiveRef.current = true;
              };
              vEl.onloadedmetadata = () => {
                vEl.play().catch(() => {});
                handlePhoneReady();
              };
              vEl.oncanplay = handlePhoneReady;
              vEl.onplaying = handlePhoneReady;
              vEl.ontimeupdate = () => {
                if (vEl.videoWidth > 0) handlePhoneReady();
              };
              vEl.play().then(handlePhoneReady).catch(() => {});
              setIsWebcamActive(true);
              isWebcamActiveRef.current = true;

              // Auto-dismiss QR drawer on successful connection
              if (isQrModalOpenRef.current) {
                setTimeout(() => {
                  setIsQrModalOpen(false);
                }, 1000);
              }
            }

            // Route phone microphone into master audio graph
            if (trackEvent.track.kind === 'audio' && audioContextRef.current && masterGainRef.current) {
              try {
                const phoneSource = audioContextRef.current.createMediaStreamSource(incomingStream);
                const phoneGain = audioContextRef.current.createGain();
                phoneGain.gain.value = micVolumeRef.current;
                phoneSource.connect(phoneGain);
                phoneGain.connect(masterGainRef.current);
                if (mediaDestinationRef.current) {
                  phoneGain.connect(mediaDestinationRef.current);
                }
                console.log(`[Remote Phone Host] Phone microphone (${phoneId}) routed to master audio.`);
              } catch (audioErr: any) {
                console.warn(`[Remote Phone Host] Audio routing note (${phoneId}):`, audioErr.message);
              }
            }
          };

          pc.onicecandidate = (iceEvent) => {
            if (iceEvent.candidate && remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
              remotePhoneWsRef.current.send(JSON.stringify({
                type: 'WEBRTC_ICE',
                room: remoteCamRoomId,
                phoneId,
                candidate: iceEvent.candidate
              }));
            }
          };

          pc.onconnectionstatechange = () => {
            console.log(`[Remote Phone Host] Peer connection state (${phoneId}): ${pc.connectionState}`);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              cleanupPhone(phoneId);
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
            remotePhoneWsRef.current.send(JSON.stringify({
              type: 'WEBRTC_OFFER',
              room: remoteCamRoomId,
              phoneId,
              sdp: offer
            }));
          }
        } else if (data.type === 'WEBRTC_ANSWER' && data.sdp) {
          console.log(`[Remote Phone Host] Received WebRTC Answer from ${phoneId}`);
          const pc = phonePeerConnectionsRef.current.get(phoneId) || remotePhonePeerConnectionRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            // Flush any ICE candidates that arrived before the answer was set
            const queued = pendingPhoneIceCandidatesRef.current.get(phoneId) || [];
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pendingPhoneIceCandidatesRef.current.delete(phoneId);
          }
        } else if (data.type === 'WEBRTC_ICE' && data.candidate) {
          const pc = phonePeerConnectionsRef.current.get(phoneId) || remotePhonePeerConnectionRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          } else {
            const queued = pendingPhoneIceCandidatesRef.current.get(phoneId) || [];
            queued.push(data.candidate);
            pendingPhoneIceCandidatesRef.current.set(phoneId, queued);
          }
        } else if (data.type === 'WEBRTC_PHONE_INFO' && data.info) {
          setConnectedPhones(prev => prev.map(p => p.phoneId === phoneId ? { ...p, info: data.info } : p));
          setRemotePhoneInfo(data.info);
        } else if (data.type === 'WEBRTC_PHONE_STANDBY') {
          console.log(`[Remote Phone Host] Phone standby notification (${phoneId}): isStandby=${data.isStandby}`);
          phoneStandbyMapRef.current[phoneId] = !!data.isStandby;
          setPhoneStandbyMap(prev => ({ ...prev, [phoneId]: !!data.isStandby }));
        } else if (data.type === 'WEBRTC_PHONE_DISCONNECTED') {
          console.log(`[Remote Phone Host] Phone disconnected notification: ${phoneId}`);
          cleanupPhone(phoneId);
        } else if (data.type === 'FELLOWSHIP_HOST_ROSTER_SYNC') {
          if (onFellowshipRosterChange && data.viewers) {
            onFellowshipRosterChange({ viewers: data.viewers, viewerCount: data.viewerCount || data.viewers.length });
          }
        } else if (data.type === 'FELLOWSHIP_VIEWER_JOINED') {
          console.log(`[Fellowship Host] Viewer joined: ${data.userId} (${data.displayName})`);
          if (onFellowshipRosterChange && data.viewerCount !== undefined) {
            onFellowshipRosterChange({ viewers: [], viewerCount: data.viewerCount });
          }
          try {
            const pc = new RTCPeerConnection({ iceServers: getIceServers() });
            viewerPeerConnectionsRef.current.set(data.userId, pc);

            const targetCanvas = activeAspectRatio === '16:9' ? canvas169Ref.current : canvas916Ref.current;
            if (targetCanvas) {
              try { drawFrame(); } catch {}
              const stream = targetCanvas.captureStream(24);
              stream.getVideoTracks().forEach(t => pc.addTrack(t, stream));
            }
            if (mediaDestinationRef.current?.stream) {
              mediaDestinationRef.current.stream.getAudioTracks().forEach(t => pc.addTrack(t, mediaDestinationRef.current!.stream));
            }

            pc.onicecandidate = (e) => {
              if (e.candidate && remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
                remotePhoneWsRef.current.send(JSON.stringify({
                  type: 'WEBRTC_VIEWER_ICE',
                  room: remoteCamRoomId,
                  viewerId: data.userId,
                  candidate: e.candidate
                }));
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
              remotePhoneWsRef.current.send(JSON.stringify({
                type: 'WEBRTC_VIEWER_OFFER',
                room: remoteCamRoomId,
                viewerId: data.userId,
                sdp: offer
              }));
            }
          } catch (vErr) {
            console.warn('[Fellowship Host] Viewer stream negotiation error:', vErr);
          }
        } else if (data.type === 'WEBRTC_VIEWER_ANSWER') {
          const pc = viewerPeerConnectionsRef.current.get(data.viewerId);
          if (pc && data.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(() => {});
          }
        } else if (data.type === 'WEBRTC_VIEWER_ICE') {
          const pc = viewerPeerConnectionsRef.current.get(data.viewerId);
          if (pc && data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          }
        } else if (data.type === 'FELLOWSHIP_VIEWER_LEFT') {
          const pc = viewerPeerConnectionsRef.current.get(data.userId);
          if (pc) {
            try { pc.close(); } catch {}
            viewerPeerConnectionsRef.current.delete(data.userId);
          }
          if (onFellowshipRosterChange && data.viewerCount !== undefined) {
            onFellowshipRosterChange({ viewers: [], viewerCount: data.viewerCount });
          }
        } else if (data.type === 'FELLOWSHIP_CHAT_MSG') {
          if (onFellowshipMessage && data.message) {
            onFellowshipMessage(data.message);
          }
        }
      } catch (err) {
        console.warn('[Remote Phone Host] Message handling catch:', err);
      }
    };

    connectSignaling();

    return () => {
      isHostSignalingDisposedRef.current = true;
      clearTimeout(hostReconnectTimerRef.current);
      try { remotePhoneWsRef.current?.close(); } catch {}
      phonePeerConnectionsRef.current.forEach((pc) => {
        try { pc.close(); } catch {}
      });
      phonePeerConnectionsRef.current.clear();
      viewerPeerConnectionsRef.current.forEach((pc) => {
        try { pc.close(); } catch {}
      });
      viewerPeerConnectionsRef.current.clear();
      if (remotePhonePeerConnectionRef.current) {
        try { remotePhonePeerConnectionRef.current.close(); } catch {}
      }
    };
  }, [remoteCamRoomId]);

  // Re-verify host registration when QR drawer opens (without re-joining if already connected)
  useEffect(() => {
    if (isQrModalOpen) {
      if (!remotePhoneWsRef.current || remotePhoneWsRef.current.readyState !== WebSocket.OPEN) {
        connectHostSignalingRef.current();
      }
    }
  }, [isQrModalOpen, remoteCamRoomId]);

  // ── Sync Active Phone Stream to Video Elements ──
  useEffect(() => {
    const activePhoneId = selectedVideoId === 'remote-phone-cam'
      ? (connectedPhones[0]?.phoneId || 'phone-1')
      : selectedVideoId;
    const activeStream = phoneStreamsRef.current.get(activePhoneId) || remotePhoneStreamRef.current;
    if (activeStream && hiddenWebcamVideoRef.current && (selectedVideoId.startsWith('phone-') || selectedVideoId === 'remote-phone-cam')) {
      const vEl = hiddenWebcamVideoRef.current;
      if (vEl.srcObject !== activeStream) {
        vEl.srcObject = activeStream;
      }
      isAwaitingFirstFrameRef.current = false;
      isCameraConnectingRef.current = false;
      vEl.play().then(() => {
        setIsCameraConnecting(false);
        isCameraConnectingRef.current = false;
        setIsWebcamActive(true);
        isWebcamActiveRef.current = true;
      }).catch(() => {});
    }
  }, [selectedVideoId, connectedPhones, remotePhoneStatus]);

  // Notify parent of state changes
  const updateStreamState = useCallback((state: 'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR', msg?: string) => {
    setStreamState(state);
    streamStateRef.current = state;
    if (msg) setStatusMessage(msg);
    onStreamStateChange?.(state, msg);
  }, [onStreamStateChange]);

  // Helper to connect microphone stream to current Web Audio master graph
  const connectMicToAudioGraph = useCallback((ctx: AudioContext, stream: MediaStream | null) => {
    if (!stream || stream.getAudioTracks().length === 0 || !masterGainRef.current) return;
    try {
      const micSource = ctx.createMediaStreamSource(stream);
      const micGain = ctx.createGain();
      micGain.gain.value = isMuted ? 0 : micVolume;
      micGainRef.current = micGain;
      micSource.connect(micGain);
      micGain.connect(masterGainRef.current);
      console.log('[Audio Engine] Microphone connected to master audio graph.');
    } catch (micErr: any) {
      console.warn('[Audio Engine] Mic routing:', micErr?.message);
    }
  }, [isMuted, micVolume]);

  // Ensure Audio Engine & Master Audio Graph are initialized
  const ensureAudioEngine = useCallback(() => {
    try {
      let isFresh = false;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
        mediaDestinationRef.current = null;
        masterGainRef.current = null;
        analyserRef.current = null;
        isFresh = true;
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!mediaDestinationRef.current && ctx && ctx.state !== 'closed') {
        mediaDestinationRef.current = ctx.createMediaStreamDestination();
        masterGainRef.current = ctx.createGain();
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.5;
        masterGainRef.current.connect(analyserRef.current);
        analyserRef.current.connect(mediaDestinationRef.current);
      }
      // Reconnect active mic stream if AudioContext was freshly created
      if (isFresh && ctx && micStreamRef.current) {
        connectMicToAudioGraph(ctx, micStreamRef.current);
      }
      return ctx;
    } catch (err: any) {
      console.warn('[Audio Engine] Ensure engine error:', err?.message);
      return null;
    }
  }, [connectMicToAudioGraph]);

  // ── Connect media <video> element into the Web Audio graph via captureStream ──
  const connectMediaElementToAudio = useCallback(() => {
    const ctx = ensureAudioEngine();
    const videoEl = mediaVideoRef.current;
    if (!ctx || !videoEl || mediaElementSourceCreatedRef.current) return;
    if (!masterGainRef.current) return;
    try {
      const captureFn = (videoEl as any).captureStream || (videoEl as any).mozCaptureStream;
      if (typeof captureFn === 'function') {
        const stream: MediaStream = captureFn.call(videoEl);
        if (stream && stream.getAudioTracks().length > 0) {
          const mediaSource = ctx.createMediaStreamSource(stream);
          mediaGainRef.current = ctx.createGain();
          mediaGainRef.current.gain.value = mediaVolume;
          mediaSource.connect(mediaGainRef.current);
          mediaGainRef.current.connect(masterGainRef.current);
          mediaElementSourceCreatedRef.current = true;
          console.log('[Audio Engine] Media audio stream captured and connected to broadcast graph.');
        }
      }
    } catch (mediaErr: any) {
      console.warn('[Audio Engine] Media stream capture notice:', mediaErr.message);
    }
  }, [ensureAudioEngine, mediaVideoRef, mediaVolume]);

  // Initialize Web Audio Engine
  const initAudioEngine = useCallback(async (micStream: MediaStream | null) => {
    try {
      const ctx = ensureAudioEngine();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      // Connect Microphone stream if available
      if (micStream) {
        connectMicToAudioGraph(ctx, micStream);
      }

      // Connect Media Video element to audio graph (idempotent — safe to call multiple times)
      connectMediaElementToAudio();
    } catch (err: any) {
      console.warn('[Audio Engine] Init error:', err.message);
    }
  }, [ensureAudioEngine, connectMicToAudioGraph, connectMediaElementToAudio]);

  // Audio Context unlocker for user interaction
  const ensureAudioResumed = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      ensureAudioResumed();
    };
    window.addEventListener('click', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [ensureAudioResumed]);

  // Live state refs for 60fps animation loop
  const isWebcamEnabledRef = useRef<boolean>(isWebcamEnabled);
  const isWebcamActiveRef = useRef<boolean>(isWebcamActive);
  const lowerThirdRef = useRef<LowerThirdData | null>(lowerThird);
  const isLowerThirdVisibleRef = useRef<boolean>(isLowerThirdVisible);
  const layoutModeRef = useRef<CanvasLayoutMode>(layoutMode);
  const canvasScriptureModeRef = useRef<'lower-third' | 'full-screen'>(canvasScriptureMode || lowerThird?.canvasViewMode || 'lower-third');
  const themeRef = useRef<'light' | 'dark'>(theme || lowerThird?.theme || 'dark');
  const lowerThirdBgColorRef = useRef<LowerThirdBgColor>(lowerThirdBgColor || lowerThird?.bgColor || 'white');
  const previewScrollRatioRef = useRef<number | null>(previewScrollRatio !== undefined ? previewScrollRatio : null);
  const canvasScrollOffsetRef = useRef<number>(0);
  const canvasInterlinearScrollRef = useRef<number>(0);
  const cardScrollOffsetRef = useRef<number>(0);
  const onTelemetryRef = useRef(onTelemetry);
  const cachedChapterVersesRef = useRef<any[]>([]);
  const cachedInterlinearVersesRef = useRef<Record<number, any>>({});
  const motionSpeedMultiplierRef = useRef<number>(motionSpeedMultiplier);

  useEffect(() => {
    motionSpeedMultiplierRef.current = motionSpeedMultiplier;
  }, [motionSpeedMultiplier]);

  // ── Cinematic Motion Transition State Ref ──
  const motionAnimRef = useRef<{
    visibilityProgress: number;
    verseMorphProgress: number;
    prevLowerThird: LowerThirdData | null;
    curLowerThird: LowerThirdData | null;
    specularSweepTime: number;
    lastAnimTime: number;
  }>({
    visibilityProgress: isLowerThirdVisible ? 1.0 : 0.0,
    verseMorphProgress: 1.0,
    prevLowerThird: null,
    curLowerThird: lowerThird,
    specularSweepTime: 2.0,
    lastAnimTime: performance.now(),
  });

  useEffect(() => {
    isWebcamEnabledRef.current = isWebcamEnabled;
  }, [isWebcamEnabled]);

  useEffect(() => {
    isWebcamActiveRef.current = isWebcamActive;
  }, [isWebcamActive]);

  useEffect(() => {
    const prevLT = motionAnimRef.current.curLowerThird;
    const isDifferentVerse = !prevLT ||
      prevLT.book !== lowerThird?.book ||
      prevLT.chapter !== lowerThird?.chapter ||
      prevLT.verse !== lowerThird?.verse ||
      prevLT.text !== lowerThird?.text;

    if (isDifferentVerse && lowerThird && isLowerThirdVisibleRef.current) {
      motionAnimRef.current.prevLowerThird = prevLT;
      motionAnimRef.current.curLowerThird = lowerThird;
      motionAnimRef.current.verseMorphProgress = 0.0;
      motionAnimRef.current.specularSweepTime = 0.0;
    } else {
      motionAnimRef.current.curLowerThird = lowerThird;
    }
    lowerThirdRef.current = lowerThird;
  }, [lowerThird]);

  // Background verse fetcher ensuring full chapter verses are always cached for 2D canvas output
  useEffect(() => {
    if (!lowerThird?.book || !lowerThird?.chapter) return;
    const bk = lowerThird.book;
    const ch = lowerThird.chapter;

    if (lowerThird.allVerses && lowerThird.allVerses.length > 0) {
      cachedChapterVersesRef.current = lowerThird.allVerses;
    } else {
      // Check STATIC_CHAPTERS first
      const bookKey = Object.keys(STATIC_CHAPTERS).find((b) => b.toLowerCase() === bk.toLowerCase());
      const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[ch] : undefined;
      if (staticCh?.verses && staticCh.verses.length > 0) {
        cachedChapterVersesRef.current = staticCh.verses;
      }
      // Then fetch from offline/bundled storage
      getOfflineChapter(bk, ch).then((off) => {
        if (off?.verses && off.verses.length > 0) {
          cachedChapterVersesRef.current = off.verses;
        } else {
          getBundledKjvChapter(bk, ch).then((bun) => {
            if (bun?.verses && bun.verses.length > 0) {
              cachedChapterVersesRef.current = bun.verses;
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    if (lowerThird.allInterlinearVerses) {
      cachedInterlinearVersesRef.current = lowerThird.allInterlinearVerses;
    } else {
      getOfflineManuscriptChapter(bk, ch).then((ms) => {
        if (ms?.verses) {
          cachedInterlinearVersesRef.current = ms.verses;
        }
      }).catch(() => {});
    }
    canvasScrollOffsetRef.current = 0;
    canvasInterlinearScrollRef.current = 0;
  }, [lowerThird?.book, lowerThird?.chapter, lowerThird?.allVerses, lowerThird?.allInterlinearVerses]);

  const cachedInlineContextVersesRef = useRef<{ ref: string; book: string; chapter: number; targetVerse: number | null; verses: any[] } | null>(null);

  useEffect(() => {
    cardScrollOffsetRef.current = null;
    if (!lowerThird?.inlineContextRef) {
      cachedInlineContextVersesRef.current = null;
      return;
    }
    const refStr = lowerThird.inlineContextRef.trim();
    const match = refStr.match(/^(\d?\s*[a-zA-Z\s]+?)\s+(\d+)(?::(\d+))?$/);
    let parsedBook = 'Genesis';
    let parsedChapter = 1;
    let parsedVerse: number | null = null;
    if (match) {
      parsedBook = normalizeBookName(match[1]);
      parsedChapter = parseInt(match[2], 10) || 1;
      if (match[3]) parsedVerse = parseInt(match[3], 10) || null;
    } else {
      parsedBook = normalizeBookName(refStr);
    }

    const norm = normalizeBookName(parsedBook);
    const bookKey = Object.keys(STATIC_CHAPTERS).find((b) => b.toLowerCase() === norm.toLowerCase());
    const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[parsedChapter] : undefined;
    if (staticCh?.verses && staticCh.verses.length > 0) {
      cachedInlineContextVersesRef.current = { ref: refStr, book: parsedBook, chapter: parsedChapter, targetVerse: parsedVerse, verses: staticCh.verses };
      return;
    }

    getOfflineChapter(norm, parsedChapter).then((off) => {
      if (off?.verses && off.verses.length > 0) {
        cachedInlineContextVersesRef.current = { ref: refStr, book: parsedBook, chapter: parsedChapter, targetVerse: parsedVerse, verses: off.verses };
      } else {
        getBundledKjvChapter(norm, parsedChapter).then((bun) => {
          if (bun?.verses && bun.verses.length > 0) {
            cachedInlineContextVersesRef.current = { ref: refStr, book: parsedBook, chapter: parsedChapter, targetVerse: parsedVerse, verses: bun.verses };
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [lowerThird?.inlineContextRef]);

  useEffect(() => {
    isLowerThirdVisibleRef.current = isLowerThirdVisible;
    if (isLowerThirdVisible) {
      motionAnimRef.current.specularSweepTime = 0.0;
    }
  }, [isLowerThirdVisible]);

  useEffect(() => {
    layoutModeRef.current = layoutMode;
  }, [layoutMode]);

  useEffect(() => {
    canvasScriptureModeRef.current = canvasScriptureMode || lowerThird?.canvasViewMode || 'lower-third';
  }, [canvasScriptureMode, lowerThird?.canvasViewMode]);

  useEffect(() => {
    themeRef.current = theme || lowerThird?.theme || 'dark';
  }, [theme, lowerThird?.theme]);

  useEffect(() => {
    lowerThirdBgColorRef.current = lowerThirdBgColor || lowerThird?.bgColor || 'white';
  }, [lowerThirdBgColor, lowerThird?.bgColor]);

  useEffect(() => {
    previewScrollRatioRef.current = previewScrollRatio !== undefined ? previewScrollRatio : null;
  }, [previewScrollRatio]);

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

  const scriptureTypefaceRef = useRef<'untitled-serif' | 'serif' | 'sans' | 'mono'>(
    (scriptureTypeface || activeTypeface) as any
  );
  const isScriptureBoldRef = useRef<boolean>(activeIsBold);

  useEffect(() => {
    if (scriptureTypeface) {
      setActiveTypeface(scriptureTypeface);
      scriptureTypefaceRef.current = scriptureTypeface;
    }
  }, [scriptureTypeface]);

  useEffect(() => {
    if (typeof isScriptureBold === 'boolean') {
      setActiveIsBold(isScriptureBold);
      isScriptureBoldRef.current = isScriptureBold;
    }
  }, [isScriptureBold]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'logosbridge_scripture_typeface' && e.newValue) {
        scriptureTypefaceRef.current = e.newValue as any;
        setActiveTypeface(e.newValue);
      }
      if (e.key === 'logosbridge_scripture_bold') {
        const val = e.newValue === 'true';
        isScriptureBoldRef.current = val;
        setActiveIsBold(val);
      }
    };
    const handleTypefaceCustom = (e: any) => {
      const next = e?.detail?.typeface || (typeof e?.detail === 'string' ? e.detail : localStorage.getItem('logosbridge_scripture_typeface') || 'untitled-serif');
      scriptureTypefaceRef.current = next as any;
      setActiveTypeface(next);
    };
    const handleBoldCustom = (e: any) => {
      const next = typeof e?.detail?.isBold === 'boolean'
        ? e.detail.isBold
        : e?.detail !== undefined
        ? Boolean(e.detail)
        : localStorage.getItem('logosbridge_scripture_bold') === 'true';
      isScriptureBoldRef.current = next;
      setActiveIsBold(next);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('logosbridge_typeface_changed', handleTypefaceCustom);
    window.addEventListener('logosbridge_bold_changed', handleBoldCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('logosbridge_typeface_changed', handleTypefaceCustom);
      window.removeEventListener('logosbridge_bold_changed', handleBoldCustom);
    };
  }, []);

  useEffect(() => {
    onTelemetryRef.current = onTelemetry;
  }, [onTelemetry]);

  // Adjust volume gains & hardware tracks dynamically
  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.value = isMuted ? 0 : micVolume;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [micVolume, isMuted]);

  useEffect(() => {
    if (mediaGainRef.current) {
      mediaGainRef.current.gain.value = mediaVolume;
    }
  }, [mediaVolume]);

  // ── Seamless Camera Hot-Swapping with Progressive Constraint Negotiation ──
  const switchCamera = useCallback(async (targetVideoId?: string) => {
    if (targetVideoId && (targetVideoId.startsWith('phone-') || targetVideoId === 'remote-phone-cam')) {
      return;
    }
    if (isInitiatingCameraRef.current) {
      console.log('[Camera] Camera initialization already in progress, skipping duplicate call.');
      return;
    }

    const isFacingUser = targetVideoId === 'facing-user' || targetVideoId === 'user';
    const isFacingEnv = targetVideoId === 'facing-environment' || targetVideoId === 'environment';
    const isTargetFacingCurrent = (!targetVideoId) ||
      (isFacingUser && currentFacingModeRef.current === 'user') ||
      (isFacingEnv && currentFacingModeRef.current === 'environment');

    const hasLiveWebcam = Boolean(
      webcamStreamRef.current &&
      webcamStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
    );

    // Instant Hot-Swap: If matching webcam stream is already live and already on the requested facing mode, reuse it
    if (hasLiveWebcam && isTargetFacingCurrent) {
      if (isFacingUser) {
        setCurrentFacingMode('user');
        currentFacingModeRef.current = 'user';
      } else if (isFacingEnv) {
        setCurrentFacingMode('environment');
        currentFacingModeRef.current = 'environment';
      }

      webcamStreamRef.current!.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      if (hiddenWebcamVideoRef.current) {
        const vEl = hiddenWebcamVideoRef.current;
        isAwaitingFirstFrameRef.current = true;
        isCameraConnectingRef.current = true;
        if (vEl.srcObject !== webcamStreamRef.current) {
          vEl.srcObject = webcamStreamRef.current;
        }

        const handleReuseReady = () => {
          isAwaitingFirstFrameRef.current = false;
          setIsCameraConnecting(false);
          isCameraConnectingRef.current = false;
          setIsWebcamActive(true);
          isWebcamActiveRef.current = true;
        };

        if ('requestVideoFrameCallback' in vEl) {
          (vEl as any).requestVideoFrameCallback(handleReuseReady);
        } else {
          vEl.addEventListener('playing', handleReuseReady, { once: true });
        }

        vEl.play().catch(() => {});
      }
      setIsWebcamActive(true);
      isWebcamActiveRef.current = true;
      return;
    }

    isInitiatingCameraRef.current = true;
    setIsCameraConnecting(true);
    isCameraConnectingRef.current = true;
    isAwaitingFirstFrameRef.current = true;
    if (hiddenWebcamVideoRef.current) {
      hiddenWebcamVideoRef.current.srcObject = null;
    }

    try {
      // 1. Stop existing tracks
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let videoStream: MediaStream | null = null;

        const isFacingUser = targetVideoId === 'facing-user' || targetVideoId === 'user';
        const isFacingEnv = targetVideoId === 'facing-environment' || targetVideoId === 'environment';

        let videoConstraints: MediaTrackConstraints;
        if (isFacingUser) {
          videoConstraints = isMobileClient
            ? { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } };
          setCurrentFacingMode('user');
          currentFacingModeRef.current = 'user';
        } else if (isFacingEnv) {
          videoConstraints = isMobileClient
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } };
          setCurrentFacingMode('environment');
          currentFacingModeRef.current = 'environment';
        } else if (targetVideoId) {
          videoConstraints = { deviceId: { ideal: targetVideoId }, width: { ideal: 1280 }, height: { ideal: 720 } };
        } else {
          // On desktop, find first real hardware video device if available
          const realDev = !isMobileClient ? videoDevices.find(d => d.deviceId && d.deviceId.length > 5 && d.deviceId !== 'facing-user' && d.deviceId !== 'facing-environment') : null;
          if (realDev) {
            videoConstraints = { deviceId: { ideal: realDev.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } };
          } else {
            const desiredFacing = isMobileClient ? currentFacingModeRef.current : undefined;
            videoConstraints = desiredFacing
              ? { facingMode: { ideal: desiredFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 } };
          }
        }

        // Tier 1: Try mobile-first exact / preferred facing constraints
        try {
          const tier1Constraints = (isMobileClient && isFacingUser)
            ? { facingMode: { exact: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : (isMobileClient && isFacingEnv)
            ? { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : videoConstraints;

          videoStream = await navigator.mediaDevices.getUserMedia({
            video: tier1Constraints,
            audio: false
          });
        } catch (tier1Err) {
          console.warn('[Camera] Standard constraints failed, falling back to basic:', tier1Err);
          // Tier 2: Fallback to basic constraint
          const basicConstraints = (isMobileClient && isFacingUser)
            ? { facingMode: 'user' }
            : (isMobileClient && isFacingEnv)
            ? { facingMode: 'environment' }
            : targetVideoId
            ? { deviceId: targetVideoId }
            : true;
          try {
            videoStream = await navigator.mediaDevices.getUserMedia({
              video: basicConstraints,
              audio: false
            });
          } catch (tier2Err) {
            console.warn('[Camera] Basic constraints failed, falling back to generic video: true:', tier2Err);
            // Tier 3: Absolute fallback
            videoStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }

        if (videoStream) {
          updateCameraError(null);
          webcamStreamRef.current = videoStream;

          // Feed inbuilt preview thumbnail
          if (inbuiltPreviewVideoRef.current) {
            inbuiltPreviewVideoRef.current.srcObject = videoStream;
            inbuiltPreviewVideoRef.current.play().catch(() => {});
          }

          // 2. Feed stream into video decoder element & attach direct DOM readiness listeners
          if (hiddenWebcamVideoRef.current && selectedVideoId !== 'remote-phone-cam') {
            const vEl = hiddenWebcamVideoRef.current;
            vEl.muted = true;
            vEl.defaultMuted = true;
            vEl.playsInline = true;
            vEl.autoplay = true;
            isAwaitingFirstFrameRef.current = true;
            vEl.srcObject = videoStream;

            const handlePlayReady = () => {
              isAwaitingFirstFrameRef.current = false;
              setIsCameraConnecting(false);
              isCameraConnectingRef.current = false;
              setIsWebcamActive(true);
              isWebcamActiveRef.current = true;
            };

            vEl.addEventListener('playing', handlePlayReady, { once: true });
            vEl.addEventListener('loadeddata', handlePlayReady, { once: true });
            vEl.addEventListener('timeupdate', handlePlayReady, { once: true });
            if ('requestVideoFrameCallback' in vEl) {
              try {
                (vEl as any).requestVideoFrameCallback(handlePlayReady);
              } catch {}
            }

            try {
              await vEl.play();
              if (vEl.readyState >= 2) {
                handlePlayReady();
              }
            } catch (playErr) {
              console.warn('[Camera] Autoplay trigger:', playErr);
            }
          }
          setIsWebcamActive(true);
          isWebcamActiveRef.current = true;

          // 3. Re-enumerate devices with active permission to get real device names
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const vInputs = devices.filter((d) => d.kind === 'videoinput');
            const aInputs = devices.filter((d) => d.kind === 'audioinput');
            setVideoDevices(vInputs);
            setAudioDevices(aInputs);

            const activeTrack = videoStream.getVideoTracks()[0];
            const activeSettings = activeTrack?.getSettings();
            if (activeSettings?.facingMode) {
              const fm = activeSettings.facingMode === 'user' ? 'user' : 'environment';
              setCurrentFacingMode(fm);
              currentFacingModeRef.current = fm;
            }

            if (!targetVideoId) {
              setSelectedVideoId(currentFacingModeRef.current === 'user' ? 'facing-user' : 'facing-environment');
            }
          } catch {}
        }
      }
    } catch (camErr: any) {
      console.warn('[Camera Hot-Swap] Camera switch error:', camErr.message);
      setIsWebcamActive(false);
      isWebcamActiveRef.current = false;
      setIsCameraConnecting(false);
      isCameraConnectingRef.current = false;
      const isPerm = camErr?.name === 'NotAllowedError' || camErr?.name === 'SecurityError' || camErr?.name === 'PermissionDeniedError';
      const isNotFound = camErr?.name === 'NotFoundError' || camErr?.name === 'DevicesNotFoundError';
      const isBusy = camErr?.name === 'NotReadableError' || camErr?.name === 'TrackStartError';
      if (isPerm) {
        updateCameraError('Camera access blocked. Check Windows Settings → Privacy & Security → Camera.');
        try {
          (window as any).BridgeAndroid?.requestCameraPermissions?.();
        } catch (ignored) {}
      } else if (isNotFound) {
        updateCameraError('No webcam detected on PC. Connect USB camera or use Phone Camera.');
      } else if (isBusy) {
        updateCameraError('Camera is in use by another app (Zoom, Teams, OBS). Close other app & retry.');
      } else {
        updateCameraError(camErr?.message || 'Camera input unavailable. Tap screen to retry.');
      }
    } finally {
      isInitiatingCameraRef.current = false;
    }
  }, []);

  useEffect(() => {
    switchCameraRef.current = switchCamera;
  }, [switchCamera]);

  const handleFlipCamera = useCallback(() => {
    triggerCinematicTransition();
    const isPhoneActive = connectedPhones.some(p => p.phoneId === selectedVideoId) || selectedVideoId === 'remote-phone-cam';
    if (isPhoneActive) {
      const targetPhoneId = selectedVideoId === 'remote-phone-cam'
        ? (connectedPhones[0]?.phoneId || 'phone-1')
        : selectedVideoId;
      if (remotePhoneWsRef.current && remotePhoneWsRef.current.readyState === WebSocket.OPEN) {
        remotePhoneWsRef.current.send(JSON.stringify({
          type: 'WEBRTC_FLIP_CAMERA',
          room: remoteCamRoomId,
          phoneId: targetPhoneId
        }));
      }
      return;
    }
    const nextMode = currentFacingModeRef.current === 'user' ? 'facing-environment' : 'facing-user';
    setSelectedVideoId(nextMode);
    switchCamera(nextMode);
  }, [selectedVideoId, connectedPhones, remoteCamRoomId, switchCamera, triggerCinematicTransition]);

  // ── Seamless Microphone Hot-Swapping ──
  const switchMicrophone = useCallback(async (targetAudioId?: string) => {
    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const audioConstraints: MediaTrackConstraints = targetAudioId && targetAudioId !== 'default'
          ? {
              deviceId: { exact: targetAudioId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            };

        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
          });
          micStreamRef.current = audioStream;
          await initAudioEngine(audioStream);

          // Once audio stream is established, re-enumerate devices to update device labels
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const aInputs = devices.filter((d) => d.kind === 'audioinput');
            if (aInputs.length > 0) {
              setAudioDevices(aInputs);
              if (!targetAudioId) {
                const activeTrack = audioStream.getAudioTracks()[0];
                const activeSettings = activeTrack?.getSettings();
                if (activeSettings?.deviceId) {
                  setSelectedAudioId(activeSettings.deviceId);
                }
              }
            }
          } catch {}
        } catch (gumErr: any) {
          console.warn('[Mic Hot-Swap] getUserMedia error:', gumErr.message);
          await initAudioEngine(null);
        }
      } else {
        await initAudioEngine(null);
      }
    } catch (micErr: any) {
      console.warn('[Mic Hot-Swap] Mic switch error:', micErr.message);
    }
  }, [initAudioEngine]);

  // Handle User Dropdown Changes
  const handleVideoDeviceChange = (deviceId: string) => {
    triggerCinematicTransition();
    setSelectedVideoId(deviceId);
    selectedVideoIdRef.current = deviceId;
    const phoneStream = phoneStreamsRef.current.get(deviceId) || (deviceId === 'remote-phone-cam' ? (connectedPhones[0]?.stream || remotePhoneStreamRef.current) : null);
    if (phoneStream) {
      if (hiddenWebcamVideoRef.current) {
        const vEl = hiddenWebcamVideoRef.current;
        isAwaitingFirstFrameRef.current = false;
        isCameraConnectingRef.current = false;
        vEl.srcObject = phoneStream;
        const handlePhoneReady = () => {
          isAwaitingFirstFrameRef.current = false;
          setIsCameraConnecting(false);
          isCameraConnectingRef.current = false;
          setIsWebcamActive(true);
          isWebcamActiveRef.current = true;
        };
        vEl.onloadedmetadata = () => {
          vEl.play().catch(() => {});
          handlePhoneReady();
        };
        vEl.onplaying = handlePhoneReady;
        vEl.oncanplay = handlePhoneReady;
        vEl.ontimeupdate = () => {
          if (vEl.videoWidth > 0) handlePhoneReady();
        };
        vEl.play().then(handlePhoneReady).catch(() => {});
      }
      setIsWebcamActive(true);
      isWebcamActiveRef.current = true;
    } else {
      switchCamera(deviceId);
    }
  };

  const handleSelectLens = useCallback((lens: number) => {
    // If selecting 0.5x, check if an ultra-wide physical camera is available in videoDevices
    if (lens === 0.5) {
      const ultraWideDevice = videoDevices.find(d => {
        const lbl = (d.label || '').toLowerCase();
        return lbl.includes('ultra') || lbl.includes('wide') || lbl.includes('0.5');
      });
      if (ultraWideDevice && ultraWideDevice.deviceId !== selectedVideoId) {
        handleVideoDeviceChange(ultraWideDevice.deviceId);
      }
    } else if (lens === 1) {
      // Switch back to standard main back or front camera if currently on ultra-wide
      const mainDevice = videoDevices.find(d => {
        const lbl = (d.label || '').toLowerCase();
        return !lbl.includes('ultra') && (lbl.includes('back') || lbl.includes('main') || lbl.includes('0'));
      });
      if (mainDevice && mainDevice.deviceId !== selectedVideoId) {
        handleVideoDeviceChange(mainDevice.deviceId);
      }
    }
    handleCameraZoomChange(lens);
  }, [videoDevices, selectedVideoId, handleCameraZoomChange]);

  const handleAudioDeviceChange = (deviceId: string) => {
    setSelectedAudioId(deviceId);
    switchMicrophone(deviceId);
  };

  // Reactive Camera Enable/Disable State
  useEffect(() => {
    if (!hasMountedRef.current) return;

    if (!isWebcamEnabled) {
      // Turn Camera OFF -> Immediate Standby
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      if (hiddenWebcamVideoRef.current) {
        hiddenWebcamVideoRef.current.pause();
      }
      setIsWebcamActive(false);
      isWebcamActiveRef.current = false;
      setIsCameraConnecting(false);
      isCameraConnectingRef.current = false;
    } else {
      // Turn Camera ON -> Resume or Re-acquire
      setIsWebcamActive(true);
      isWebcamActiveRef.current = true;
      if (webcamStreamRef.current && webcamStreamRef.current.getVideoTracks().some(t => t.readyState === 'live')) {
        webcamStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        if (hiddenWebcamVideoRef.current) {
          hiddenWebcamVideoRef.current.play().catch(() => {});
        }
      } else {
        const curId = selectedVideoIdRef.current;
        if (!curId || (!curId.startsWith('phone-') && curId !== 'remote-phone-cam')) {
          switchCamera(curId || undefined);
        }
      }
    }
  }, [isWebcamEnabled, switchCamera]);

  // Mount initialization: Initialize both Camera and Microphone engines
  useEffect(() => {
    hasMountedRef.current = true;
    switchCamera();
    switchMicrophone(selectedAudioId || undefined);

    const handleFocus = () => {
      if (isWebcamEnabledRef.current && !isWebcamActiveRef.current) {
        const curId = selectedVideoIdRef.current;
        if (!curId || (!curId.startsWith('phone-') && curId !== 'remote-phone-cam')) {
          switchCamera(curId || undefined);
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  // ── 30 FPS HTML5 Canvas Dual-Rendering Engine (Synced to broadcast captureStream) ──
  const drawFrame = useCallback(() => {
    // ── Background CPU & Thread-Starvation Guard ──
    // Limit frame rate to 30fps matching targetCanvas.captureStream(30) broadcast rate.
    // On 90Hz/120Hz mobile screens, running unthrottled canvas redraws while encoding video starves the CPU and locks up the UI.
    const now = performance.now();
    if (now - lastFrameTimeRef.current < 31) {
      animationFrameIdRef.current = requestAnimationFrame(drawFrame);
      return;
    }
    lastFrameTimeRef.current = now;

    if (document.hidden) {
      animationFrameIdRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const container = studioContainerRef.current;
    if (
      container &&
      (container.offsetParent === null || container.clientHeight === 0) &&
      streamStateRef.current !== 'LIVE' && streamStateRef.current !== 'CONNECTING'
    ) {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = window.setTimeout(() => {
        animationFrameIdRef.current = requestAnimationFrame(drawFrame);
      }, 250);
      return;
    }

    try {
      // Advance cinematic motion animation
      const anim = motionAnimRef.current;
      const animNow = performance.now();
      const dt = Math.min(0.08, Math.max(0.001, (animNow - anim.lastAnimTime) / 1000));
      anim.lastAnimTime = animNow;

      const speedFactor = motionSpeedMultiplierRef.current || 0.25;
      const targetVis = isLowerThirdVisibleRef.current ? 1.0 : 0.0;
      const visSpeed = (isLowerThirdVisibleRef.current ? 1.35 : 1.7) * speedFactor;
      if (anim.visibilityProgress < targetVis) {
        anim.visibilityProgress = Math.min(targetVis, anim.visibilityProgress + dt * visSpeed);
      } else if (anim.visibilityProgress > targetVis) {
        anim.visibilityProgress = Math.max(targetVis, anim.visibilityProgress - dt * visSpeed);
      }

      if (anim.verseMorphProgress < 1.0) {
        anim.verseMorphProgress = Math.min(1.0, anim.verseMorphProgress + dt * 1.35 * speedFactor);
      }

      if (anim.specularSweepTime < 2.5) {
        anim.specularSweepTime += dt * 0.9 * speedFactor;
      }

      const video = hiddenWebcamVideoRef.current;
    const media = mediaVideoRef.current;
    const canvas169 = canvas169Ref.current;
    const canvas916 = canvas916Ref.current;
    const isCamEnabled = isWebcamEnabledRef.current;
    const isCamActive = isWebcamActiveRef.current;
    const currentMode = layoutModeRef.current;

    // Helper: Draw video with aspect-fill to target canvas or standby card
    const drawVideoFit = (
      ctx: CanvasRenderingContext2D,
      source: HTMLVideoElement,
      targetW: number,
      targetH: number
    ) => {
      const isWebcamSource = source === hiddenWebcamVideoRef.current;
      const snap = transitionSnapshotCanvasRef.current;

      // If camera is explicitly disabled by user, render studio standby graphic
      if (isWebcamSource && !isCamEnabled) {
        const grad = ctx.createLinearGradient(0, 0, 0, targetH);
        grad.addColorStop(0, '#111622');
        grad.addColorStop(1, '#0b0e14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, targetW, targetH);

        // Center Studio Standby Badge in App Warm Sanctuary Palette
        ctx.save();
        ctx.fillStyle = '#faf6f0';
        ctx.font = 'bold 36px "Literata", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 14;
        ctx.fillText('CAMERA STANDBY', targetW / 2, targetH / 2 - 20);

        ctx.shadowColor = 'transparent';
        const activeErr = cameraPermissionErrorRef.current;
        if (activeErr) {
          ctx.fillStyle = '#f87171';
          ctx.font = '500 20px "Inter", sans-serif';
          ctx.fillText(activeErr, targetW / 2, targetH / 2 + 26);
        } else {
          ctx.fillStyle = '#dcd3c6';
          ctx.font = '500 18px "Inter", sans-serif';
          ctx.fillText('Audio & scripture broadcast active', targetW / 2, targetH / 2 + 26);
        }
        ctx.restore();
        return;
      }

      // Zero Black Flash: Check if incoming video source has decoded a valid frame
      const isSourceReady = Boolean(
        source &&
        source.readyState >= 2 &&
        source.videoWidth > 0 &&
        (!isAwaitingFirstFrameRef.current || (source as HTMLVideoElement).currentTime > 0 || (source as HTMLVideoElement).videoWidth > 0)
      );

      if (isSourceReady && isWebcamSource) {
        isAwaitingFirstFrameRef.current = false;
        isCameraConnectingRef.current = false;
        isWebcamActiveRef.current = true;
      }

      const activePhoneId = selectedVideoIdRef.current === 'remote-phone-cam'
        ? (connectedPhones[0]?.phoneId || 'phone-1')
        : selectedVideoIdRef.current;
      const isActivePhoneStandby = isPhoneSelectedRef.current && isWebcamSource && !!phoneStandbyMapRef.current[activePhoneId];

      if (!isSourceReady || (isWebcamSource && !isWebcamActiveRef.current) || isActivePhoneStandby) {
        // While incoming feed is negotiating, warming up, or phone is minimized in standby:
        // Hold previous snapshot or freeze frame at 100% opacity.
        // Never clear to black, completely eliminating any black flash!
        if (snap) {
          ctx.drawImage(snap, 0, 0, targetW, targetH);
        } else if (hasRenderedValidFrameRef.current && freezeFrameCanvasRef.current) {
          ctx.drawImage(freezeFrameCanvasRef.current, 0, 0, targetW, targetH);
        } else {
          // Ambient studio sanctuary gradient
          const grad = ctx.createLinearGradient(0, 0, 0, targetH);
          grad.addColorStop(0, '#131926');
          grad.addColorStop(0.5, '#0d111a');
          grad.addColorStop(1, '#080a0f');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, targetW, targetH);

          // Subtle sanctuary architectural accent border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(30, 30, targetW - 60, targetH - 60);

          ctx.save();
          if (isCameraConnectingRef.current || isAwaitingFirstFrameRef.current) {
            // Connecting indicator
            ctx.fillStyle = '#faf6f0';
            ctx.font = 'bold 32px "Literata", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 12;
            ctx.fillText('CONNECTING CAMERA FEED...', targetW / 2, targetH / 2 - 16);

            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#10b981';
            ctx.font = '600 16px "Inter", sans-serif';
            ctx.fillText('● INITIALIZING HARDWARE DECODER', targetW / 2, targetH / 2 + 28);
          } else {
            // Standby indicator with clear instructions
            ctx.fillStyle = '#faf6f0';
            ctx.font = 'bold 32px "Literata", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 12;
            ctx.fillText('STUDIO CAMERA STANDBY', targetW / 2, targetH / 2 - 20);

            ctx.shadowColor = 'transparent';
            const activeErr = cameraPermissionErrorRef.current;
            ctx.fillStyle = activeErr ? '#f87171' : '#a1a1aa';
            ctx.font = '500 16px "Inter", sans-serif';
            const statusLabel = activeErr || 'Studio Ready • Select Media, Phone Camera, or connect Webcam';
            ctx.fillText(statusLabel, targetW / 2, targetH / 2 + 24);
          }
          ctx.restore();
        }

        if (isActivePhoneStandby) {
          // Render subtle Standby overlay pill on canvas so broadcast audience/producer knows phone is in standby
          ctx.save();
          const pillText = '📱 PHONE CAMERA IN STANDBY (MINIMIZED)';
          ctx.font = 'bold 18px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textMetrics = ctx.measureText(pillText);
          const pillW = textMetrics.width + 36;
          const pillH = 38;
          const pillX = (targetW - pillW) / 2;
          const pillY = targetH - 60;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.fillText(pillText, targetW / 2, pillY + pillH / 2);
          ctx.restore();
        }
        return;
      }

      // Incoming source IS ready with valid decoded video frames!
      if (isTransitionPendingRef.current && snap) {
        // Feed just produced its first decoded frame! Start the 240ms cross-dissolve NOW
        isTransitionPendingRef.current = false;
        isTransitioningRef.current = true;
        transitionStartTimeRef.current = performance.now();
      }

      const srcW = source.videoWidth || targetW;
      const srcH = source.videoHeight || targetH;
      const baseScale = Math.max(targetW / srcW, targetH / srcH);
      const zoom = (source === hiddenWebcamVideoRef.current) ? (cameraZoomRef.current || 1.0) : 1.0;
      const scaledW = srcW * baseScale * zoom;
      const scaledH = srcH * baseScale * zoom;
      const x = (targetW - scaledW) / 2;
      const y = (targetH - scaledH) / 2;

      if (isTransitioningRef.current && snap) {
        const elapsed = performance.now() - transitionStartTimeRef.current;
        const duration = 240; // 240ms cinematic broadcast cross-dissolve
        const progress = Math.min(1.0, elapsed / duration);

        // Draw outgoing frame snapshot at base
        ctx.drawImage(snap, 0, 0, targetW, targetH);

        // Draw incoming video dissolving smoothly over it
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.drawImage(source, x, y, scaledW, scaledH);
        ctx.restore();

        if (progress >= 1.0) {
          isTransitioningRef.current = false;
          transitionSnapshotCanvasRef.current = null;
        }
      } else {
        ctx.drawImage(source, x, y, scaledW, scaledH);
      }

      // Cache this valid rendered frame into the offscreen freeze buffer only when source is genuinely ready
      if (isSourceReady) {
        if (!freezeFrameCanvasRef.current) {
          freezeFrameCanvasRef.current = document.createElement('canvas');
        }
        const freeze = freezeFrameCanvasRef.current;
        if (freeze.width !== targetW || freeze.height !== targetH) {
          freeze.width = targetW;
          freeze.height = targetH;
        }
        const fCtx = freeze.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(ctx.canvas, 0, 0, targetW, targetH);
          hasRenderedValidFrameRef.current = true;
        }
      }
    };

    // Helper: Draw High-Contrast Full-Bleed Lower-Third Scripture Banner (Ultra-Bold & Legible on Mobile)
    const drawLowerThird = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      isVertical: boolean
    ) => {
      const anim = motionAnimRef.current;
      const currentLT = lowerThirdRef.current;
      if (anim.visibilityProgress <= 0.005 || !currentLT) return;
      if (canvasScriptureModeRef.current === 'full-screen' || currentLT.canvasViewMode === 'full-screen') return;

      const motionCurveVal = cinematicSpring(anim.visibilityProgress);
      const masterAlpha = clampVal(anim.visibilityProgress, 0, 1);

      ctx.save();
      ctx.globalAlpha = masterAlpha;
      const cardW = w;
      const padX = isVertical ? 36 : 44;
      const activeBgChoice: LowerThirdBgColor = currentLT.bgColor || lowerThirdBgColorRef.current || 'white';
      const isSpecialCard = activeBgChoice === 'angular-chyron' || activeBgChoice === 'royal-diamond';
      const padTextX = activeBgChoice === 'royal-diamond'
        ? padX + (isVertical ? 120 : 140)
        : activeBgChoice === 'angular-chyron'
        ? padX + (isVertical ? 60 : 70)
        : padX;
      const safeRightPad = isSpecialCard ? (isVertical ? 48 : 72) : padX;
      const maxWidth = cardW - padTextX - safeRightPad;

      // Determine text lines first to dynamically adapt card height & font size
      const isInterlinearMode = currentLT.displayMode === 'interlinear' && !!currentLT.manuscriptText;
      const fullText = currentLT.text ? currentLT.text.trim() : '';
      const msText = currentLT.manuscriptText ? currentLT.manuscriptText.trim() : '';
      const selectedWord = currentLT.selectedWord;
      const interlinearWords = currentLT.interlinearWords || [];

      // Find active manuscript word index for live clustering
      let activeWordIdx = -1;
      if (selectedWord && interlinearWords.length > 0) {
        activeWordIdx = interlinearWords.findIndex(
          (w) => (selectedWord.strongsNumber && w.n === selectedWord.strongsNumber) ||
                 (selectedWord.originalValue && (w.w === selectedWord.originalValue || (w as any).tr === selectedWord.originalValue)) ||
                 (selectedWord.word && (w.t === selectedWord.word || w.w === selectedWord.word))
        );
        if (activeWordIdx === -1) activeWordIdx = 0;
      }

      // Synchronized KJV Clustering indices
      const matchedKjvIndices = (activeWordIdx >= 0 && fullText && interlinearWords.length > 0)
        ? getMatchedKjvTokenIndices(interlinearWords, activeWordIdx, fullText)
        : new Set<number>();
      const kjvTokens = fullText ? parseKjvRawTokens(fullText) : [];

      // Decoupled Broadcast Typography Scale for High-Legibility Mobile Rendering
      let msFontSize = 64;
      let msLineHeight = 86;
      let kjvFontSize = 70;
      let kjvLineHeight = 94;

      if (isInterlinearMode) {
        // Interlinear Mode: Manuscript Transliteration (Primary) + English Translation (Secondary)
        if (isVertical) {
          msFontSize = msText.length > 180 ? 54 : 62;
          msLineHeight = msText.length > 180 ? 74 : 84;
          kjvFontSize = fullText.length > 180 ? 42 : 48;
          kjvLineHeight = fullText.length > 180 ? 58 : 66;
        } else {
          msFontSize = msText.length > 180 ? 56 : 64;
          msLineHeight = msText.length > 180 ? 76 : 86;
          kjvFontSize = fullText.length > 180 ? 50 : 58;
          kjvLineHeight = fullText.length > 180 ? 68 : 78;
        }
      } else {
        // Standard KJV Mode: Full-Chyron Broadcast Typography
        if (isVertical) {
          if (fullText.length > 220) {
            kjvFontSize = 60;
            kjvLineHeight = 82;
          } else if (fullText.length > 140) {
            kjvFontSize = 68;
            kjvLineHeight = 92;
          } else {
            kjvFontSize = 76;
            kjvLineHeight = 102;
          }
        } else {
          if (fullText.length > 220) {
            kjvFontSize = 56;
            kjvLineHeight = 76;
          } else if (fullText.length > 140) {
            kjvFontSize = 62;
            kjvLineHeight = 84;
          } else {
            kjvFontSize = 70;
            kjvLineHeight = 94;
          }
        }
      }

      const canvasScriptureFont = getCanvasScriptureFontFamily(scriptureTypefaceRef.current);
      const isScriptureBold = isScriptureBoldRef.current;

      ctx.font = `${isScriptureBold ? '900' : 'bold'} ${msFontSize}px ${canvasScriptureFont}`;
      const msSpaceW = ctx.measureText(' ').width;

      // 1. Wrap Manuscript Transliteration Words into Lines
      const msLayoutLines: Array<Array<{ text: string; isWordActive: boolean; width: number }>> = [];
      if (isInterlinearMode) {
        ctx.font = `${isScriptureBold ? '900' : 'bold'} ${msFontSize}px ${canvasScriptureFont}`;
        const rawMsWords = interlinearWords.length > 0
          ? interlinearWords.map((w, idx) => ({
              text: (w as any).tr || getWordTransliteration(w.w, currentLT.language) || w.w,
              isWordActive: idx === activeWordIdx
            }))
          : msText.split(/\s+/).map((txt, idx) => ({
              text: txt,
              isWordActive: idx === activeWordIdx
            }));

        let curMsLine: Array<{ text: string; isWordActive: boolean; width: number }> = [];
        let curMsLineW = 0;

        for (const item of rawMsWords) {
          const itemWeight = item.isWordActive ? '900' : (isScriptureBold ? '900' : 'bold');
          ctx.font = `${itemWeight} ${msFontSize}px ${canvasScriptureFont}`;
          const w = ctx.measureText(item.text).width;
          if (curMsLineW + w > maxWidth && curMsLine.length > 0) {
            msLayoutLines.push(curMsLine);
            curMsLine = [{ ...item, width: w }];
            curMsLineW = w + msSpaceW;
          } else {
            curMsLine.push({ ...item, width: w });
            curMsLineW += w + msSpaceW;
          }
        }
        if (curMsLine.length > 0) {
          msLayoutLines.push(curMsLine);
        }
      }

      // 2. Wrap English KJV Tokens into Lines with Clustering & Supplied formatting
      const kjvLayoutLines: Array<Array<{ text: string; isMatched: boolean; isSupplied: boolean; isWhitespace: boolean; width: number }>> = [];
      if (fullText) {
        const rawTokens = kjvTokens.length > 0
          ? kjvTokens.map((t) => ({
              text: t.text,
              isMatched: matchedKjvIndices.has(t.rawIdx),
              isSupplied: t.isSupplied,
              isWhitespace: /^\s+$/.test(t.text)
            }))
          : fullText.split(/\s+/).map((txt) => ({
              text: txt,
              isMatched: false,
              isSupplied: false,
              isWhitespace: false
            }));

        let curKjvLine: Array<{ text: string; isMatched: boolean; isSupplied: boolean; isWhitespace: boolean; width: number }> = [];
        let curKjvLineW = 0;

        for (const item of rawTokens) {
          const kjvWeight = isInterlinearMode
            ? (item.isMatched ? '900' : (isScriptureBold ? '800' : '700'))
            : (isScriptureBold ? '900' : 'bold');

          ctx.font = item.isSupplied
            ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
            : `${kjvWeight} ${kjvFontSize}px ${canvasScriptureFont}`;
          const w = ctx.measureText(item.text).width;

          if (!item.isWhitespace && curKjvLineW + w > maxWidth && curKjvLine.length > 0) {
            kjvLayoutLines.push(curKjvLine);
            curKjvLine = item.isWhitespace ? [] : [{ ...item, width: w }];
            curKjvLineW = item.isWhitespace ? 0 : w;
          } else {
            curKjvLine.push({ ...item, width: w });
            curKjvLineW += w;
          }
        }
        if (curKjvLine.length > 0) {
          kjvLayoutLines.push(curKjvLine);
        }
      }

      // Dynamic Card Height: Header + Translit Lines + English Lines + clean bottom breathing space (zero artifacts)
      const headerAreaHeight = isSpecialCard ? (isVertical ? 90 : 84) : (isVertical ? 124 : 106);
      const textBlockHeight = (isInterlinearMode && msLayoutLines.length > 0 ? (msLayoutLines.length * msLineHeight) + 20 : 0) + (kjvLayoutLines.length * kjvLineHeight);
      const minCardH = Math.round(h / 3);
      const dynamicCardH = Math.max(minCardH, headerAreaHeight + textBlockHeight + (isVertical ? 36 : 28));
      const cardH = Math.min(isVertical ? 1400 : 920, dynamicCardH);
      const cardX = 0;
      const restingCardY = h - cardH;
      const hiddenY = h + 40;
      const cardY = hiddenY - (hiddenY - restingCardY) * motionCurveVal;
      if (isVertical) {
        lastCardYRef.current = cardY;
      }

      // Resolve user-selected Lower Third Background Color ('black' | 'white' | 'midnight' | 'angular-chyron' | 'royal-diamond')
      const isWhiteBg = activeBgChoice === 'white';
      const bgFill = activeBgChoice === 'white'
        ? '#ffffff'
        : activeBgChoice === 'midnight'
        ? '#0b1329'
        : '#050505';
      const primaryTextColor = isWhiteBg ? '#09090b' : '#ffffff';
      const suppliedTextColor = isWhiteBg ? '#334155' : 'rgba(255, 255, 255, 0.82)';
      const topBorderColor = isWhiteBg ? '#cbd5e1' : activeBgChoice === 'midnight' ? '#1e3a8a' : '#27272a';
      const highlightPillBg = isWhiteBg ? '#09090b' : '#ffffff';
      const highlightPillText = isWhiteBg ? '#ffffff' : '#09090b';
      const highlightPillBorder = isWhiteBg ? '#09090b' : '#ffffff';

      if (activeBgChoice === 'angular-chyron') {
        // ══════════════════════════════════════════════════════════════
        // STYLE 1: ANGULAR BROADCAST CHYRON (from desktop card 1)
        // ══════════════════════════════════════════════════════════════
        const slant = isVertical ? 36 : 52;
        const cardBodyH = cardH;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = -12;

        const bodyGrad = ctx.createLinearGradient(0, 0, cardW, 0);
        bodyGrad.addColorStop(0, '#78350f');   // deep amber
        bodyGrad.addColorStop(0.35, '#b45309'); // vibrant bronze
        bodyGrad.addColorStop(0.7, '#d97706');  // warm golden bronze
        bodyGrad.addColorStop(1, '#92400e');   // rich copper

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(slant, cardY);
        ctx.lineTo(cardW, cardY);
        ctx.lineTo(cardW, cardY + cardBodyH + 40);
        ctx.lineTo(0, cardY + cardBodyH + 40);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Layered Bottom Silver/White Bevel Trim Bar - Stretched flush to extreme right
        const bottomTrimH = 16;
        const bottomTrimGrad = ctx.createLinearGradient(0, 0, cardW, 0);
        bottomTrimGrad.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
        bottomTrimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        bottomTrimGrad.addColorStop(1, 'rgba(203, 213, 225, 0.95)');
        ctx.fillStyle = bottomTrimGrad;
        ctx.beginPath();
        ctx.moveTo(0, cardY + cardBodyH - bottomTrimH);
        ctx.lineTo(cardW, cardY + cardBodyH - bottomTrimH);
        ctx.lineTo(cardW, cardY + cardBodyH);
        ctx.lineTo(0, cardY + cardBodyH);
        ctx.closePath();
        ctx.fill();

        // Diagonal Ventilation Slit Accents on Left Flank
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        for (let i = 0; i < 3; i++) {
          const slitX = 42 + i * 22;
          ctx.beginPath();
          ctx.moveTo(slitX + 14, cardY + 28);
          ctx.lineTo(slitX + 22, cardY + 28);
          ctx.lineTo(slitX + 10, cardY + cardBodyH - bottomTrimH - 24);
          ctx.lineTo(slitX + 2, cardY + cardBodyH - bottomTrimH - 24);
          ctx.closePath();
          ctx.fill();
        }

        // Diagonal Ventilation Slit Accents on Right Bottom Flank
        for (let i = 0; i < 3; i++) {
          const rSlitX = cardW - 130 + i * 22;
          ctx.beginPath();
          ctx.moveTo(rSlitX + 12, cardY + cardBodyH - bottomTrimH - 32);
          ctx.lineTo(rSlitX + 20, cardY + cardBodyH - bottomTrimH - 32);
          ctx.lineTo(rSlitX + 10, cardY + cardBodyH - bottomTrimH - 10);
          ctx.lineTo(rSlitX + 2, cardY + cardBodyH - bottomTrimH - 10);
          ctx.closePath();
          ctx.fill();
        }

        // Top Floating Parallelogram Header Shelf (Enlarged Container)
        const shelfW = isVertical ? 520 : 660;
        const shelfH = isVertical ? 74 : 86;
        const shelfX = cardW - shelfW - 40;
        const shelfSlant = 32;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(shelfX + shelfSlant, cardY - shelfH);
        ctx.lineTo(shelfX + shelfW, cardY - shelfH);
        ctx.lineTo(shelfX + shelfW - shelfSlant, cardY);
        ctx.lineTo(shelfX, cardY);
        ctx.closePath();
        ctx.fill();

        // Large, Comfortable Reference Typography inside Top Shelf
        const refBadgeText = `${currentLT.book.toUpperCase()} ${currentLT.chapter}${currentLT.verse ? `:${currentLT.verse}` : ''}`;
        ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#78350f';
        ctx.textBaseline = 'middle';
        const refBadgeW = ctx.measureText(refBadgeText).width;
        ctx.fillText(refBadgeText, shelfX + shelfSlant + 28, cardY - shelfH / 2);

        ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• KJV', shelfX + shelfSlant + 28 + refBadgeW + 18, cardY - shelfH / 2);
        ctx.restore();

      } else if (activeBgChoice === 'royal-diamond') {
        // ══════════════════════════════════════════════════════════════
        // STYLE 2: ROYAL DIAMOND CAPSULE (from desktop card 2)
        // ══════════════════════════════════════════════════════════════
        const diamondSize = isVertical ? 100 : 120;
        const diamondX = padX + 24;
        const diamondY = cardY + cardH * 0.48;
        const capsuleStartX = diamondX + 48;
        // Stretch right edge to the extreme right of the canvas screen with NO paddle
        const capsuleW = cardW - capsuleStartX;
        const capsuleH = cardH;

        // 1. Floating Secondary Shelf above capsule (Enlarged Container)
        const shelfW = isVertical ? 540 : 680;
        const shelfH = isVertical ? 74 : 86;
        const shelfX = capsuleStartX + 64;
        const shelfSlant = 30;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.beginPath();
        ctx.moveTo(shelfX + shelfSlant, cardY - shelfH);
        ctx.lineTo(shelfX + shelfW, cardY - shelfH);
        ctx.lineTo(shelfX + shelfW - shelfSlant, cardY);
        ctx.lineTo(shelfX, cardY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Large, Comfortable Reference Typography inside Shelf
        const refBadgeText = `${currentLT.book.toUpperCase()} ${currentLT.chapter}${currentLT.verse ? `:${currentLT.verse}` : ''}`;
        ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#4c1d95';
        ctx.textBaseline = 'middle';
        const royalRefW = ctx.measureText(refBadgeText).width;
        ctx.fillText(refBadgeText, shelfX + shelfSlant + 28, cardY - shelfH / 2);

        ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#6b21a8';
        ctx.fillText('• KING JAMES', shelfX + shelfSlant + 28 + royalRefW + 20, cardY - shelfH / 2);
        ctx.restore();

        // 2. Royal Purple/Violet Gradient Body - Flush to extreme right
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = -10;

        const purpleGrad = ctx.createLinearGradient(capsuleStartX, 0, cardW, 0);
        purpleGrad.addColorStop(0, '#581c87'); // deep purple
        purpleGrad.addColorStop(0.3, '#6b21a8'); // royal violet
        purpleGrad.addColorStop(0.7, '#7e22ce'); // vibrant violet
        purpleGrad.addColorStop(1, '#3b0764'); // dark terminal

        ctx.fillStyle = purpleGrad;
        ctx.beginPath();
        ctx.fillRect(capsuleStartX, cardY, capsuleW, capsuleH + 40);
        ctx.shadowColor = 'transparent';

        // High-gloss top highlight sheen
        const topSheenGrad = ctx.createLinearGradient(capsuleStartX, cardY, capsuleStartX, cardY + (capsuleH + 40) * 0.45);
        topSheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
        topSheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = topSheenGrad;
        ctx.fillRect(capsuleStartX, cardY, capsuleW, (capsuleH + 40) * 0.45);

        // 3. Anchored Left Rotated Diamond Badge (45 deg)
        ctx.save();
        ctx.translate(diamondX, diamondY);
        ctx.rotate(Math.PI / 4);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-diamondSize / 2 - 4, -diamondSize / 2 - 4, diamondSize + 8, diamondSize + 8);

        ctx.shadowColor = 'transparent';
        const diaGrad = ctx.createLinearGradient(-diamondSize / 2, -diamondSize / 2, diamondSize / 2, diamondSize / 2);
        diaGrad.addColorStop(0, '#7e22ce');
        diaGrad.addColorStop(1, '#4c1d95');
        ctx.fillStyle = diaGrad;
        ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-diamondSize / 2 + 5, -diamondSize / 2 + 5, diamondSize - 10, diamondSize - 10);

        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`v.${currentLT.verse || 1}`, 0, 0);

        ctx.restore();
        ctx.restore();

      } else {
        // 1. Clean Solid High-Contrast Card Background with rounded chassis corners
        ctx.save();
        ctx.fillStyle = bgFill;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = -8;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH + 100, [isVertical ? 24 : 32, isVertical ? 24 : 32, 0, 0]);
        ctx.fill();
        ctx.restore();

        // 2. Specular Top Sheen Sweep (Cinematic Broadcast Polish)
        ctx.save();
        if (anim.specularSweepTime < 1.4) {
          const sweepX = (anim.specularSweepTime / 1.4) * (cardW + 400) - 200;
          const sheenGrad = ctx.createLinearGradient(sweepX - 220, 0, sweepX + 220, 0);
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, isWhiteBg ? 'rgba(217, 119, 6, 0.65)' : 'rgba(255, 255, 255, 0.85)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(0, cardY, cardW, 4);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, cardY);
          ctx.lineTo(w, cardY);
          ctx.lineWidth = 3;
          ctx.strokeStyle = topBorderColor;
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── 3. Unified Top Row: Bare Crisp Scripture Reference + Single Unified Study Pill + Parsing Tag ──
      if (!isSpecialCard) {
        ctx.save();
      const topBarH = isVertical ? 88 : 74;
      const topBarY = cardY + (isVertical ? 20 : 16);
      const modeSuffix = isInterlinearMode ? ` • ${currentLT.language === 'Hebrew' ? 'HEB' : 'GRK'}` : '';
      const refText = `${currentLT.book} ${currentLT.chapter}${currentLT.verse ? `:${currentLT.verse}` : ''}${modeSuffix}`;

      // Check if 9:16 interactive expanded root action overlay is active
      const isExpanded916 = isVertical && (isRootActionExpanded916Ref.current || !!selectedWord?.isExpanded);

      if (isExpanded916 && selectedWord) {
        // ── 9:16 UNBOXED ROOT ACTION OVERLAY ──
        const overlayX = padX;
        const overlayW = maxWidth;
        const overlayY = topBarY;
        const overlayH = topBarH;

        // Left Segment: Strong's Code + Language
        const strongsTag = `${selectedWord.strongsNumber || '—'} ↗ • ${currentLT.language?.toUpperCase() || 'ROOT'}`;
        ctx.font = '900 30px "Inter", monospace';
        const sMetrics = ctx.measureText(strongsTag);
        const sBadgeW = sMetrics.width;

        const accentColor = isWhiteBg ? '#1e40af' : '#f87171';
        ctx.fillStyle = accentColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(strongsTag, overlayX, overlayY + overlayH / 2);

        // Dot separator
        const dotX = overlayX + sBadgeW + 14;
        ctx.fillStyle = isWhiteBg ? '#94a3b8' : '#71717a';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText('•', dotX, overlayY + overlayH / 2);

        // Center / Right Segment: The Full Theological Nuance in Large Serif
        const defText = selectedWord.rootMeaning || selectedWord.explanation || '';
        const closeIndicatorW = 50;
        const textStartX = dotX + 18;
        const availTextW = overlayX + overlayW - textStartX - closeIndicatorW - 10;

        if (defText && availTextW > 40) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(textStartX, overlayY, availTextW, overlayH);
          ctx.clip();

          ctx.font = `800 34px ${canvasScriptureFont}`;
          ctx.fillStyle = accentColor;

          const fullTextW = ctx.measureText(defText).width;
          const overflowW = Math.max(0, fullTextW - availTextW);
          const scrollRatio = selectedWord.scrollRatio != null ? Math.min(1, Math.max(0, selectedWord.scrollRatio)) : 0;
          const scrollOffset = scrollRatio * overflowW;

          if (overflowW > 0 && scrollRatio === 0) {
            let displayText = defText;
            if (ctx.measureText(displayText).width > availTextW) {
              while (displayText.length > 0 && ctx.measureText(displayText + '…').width > availTextW) {
                displayText = displayText.slice(0, -1);
              }
              displayText += '…';
            }
            ctx.fillText(displayText, textStartX, overlayY + overlayH / 2);
          } else {
            ctx.fillText(defText, textStartX - scrollOffset, overlayY + overlayH / 2);
          }
          ctx.restore();
        }

        // Far Right: Subtle Close / Collapse Micro-Indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', overlayX + overlayW - 32, overlayY + overlayH / 2);
      } else {
        // ── DEFAULT COLLAPSED / LANDSCAPE TOP ROW ──
        // A. Bare, Ultra-Sharp Book & Chapter Reference Header (No pill box, oversized for crystal-clear mobile legibility)
        ctx.font = isVertical ? '900 44px "Inter", sans-serif' : '900 38px "Inter", sans-serif';
        const refMetrics = ctx.measureText(refText);
        const refTextW = refMetrics.width;
        const refX = padX;

        ctx.fillStyle = primaryTextColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(refText, refX, topBarY + topBarH / 2);

        // If a word is selected in interlinear mode: draw Unified Pill + Parsing Badge on the SAME line
        if (selectedWord) {
          const gap = 20;

          // B. Far Right: Grammatical Parsing Tag Badge
          let tagBadgeW = 0;
          let tagBadgeX = padX + maxWidth;
          const tagStr = selectedWord.parsingTag ? `${selectedWord.parsingTag} ↗` : '';
          if (tagStr) {
            ctx.font = isVertical ? '900 32px "Inter", monospace' : '900 28px "Inter", monospace';
            tagBadgeW = ctx.measureText(tagStr).width + 36;
            tagBadgeX = padX + maxWidth - tagBadgeW;

            ctx.beginPath();
            ctx.roundRect(tagBadgeX, topBarY, tagBadgeW, topBarH, 16);
            ctx.fillStyle = isWhiteBg ? '#09090b' : '#000000';
            ctx.fill();
            ctx.strokeStyle = isWhiteBg ? '#09090b' : '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(tagStr, tagBadgeX + 18, topBarY + topBarH / 2);
          }

          // C. Center: Single Unified Unboxed Root Action Header
          const pillStartX = refX + refTextW + gap;
          const pillEndX = tagStr ? (tagBadgeX - gap) : (padX + maxWidth);
          const maxPillW = Math.max(0, pillEndX - pillStartX);

          if (maxPillW > 80) {
            const strongsStr = `${selectedWord.strongsNumber || '—'} ↗`;
            ctx.font = isVertical ? '900 32px "Inter", monospace' : '900 28px "Inter", monospace';
            const strongsMetrics = ctx.measureText(strongsStr);
            const strongsSegmentW = strongsMetrics.width;

            const accentColor = isWhiteBg ? '#1e40af' : '#f87171';
            ctx.fillStyle = accentColor;
            ctx.textBaseline = 'middle';
            ctx.fillText(strongsStr, pillStartX, topBarY + topBarH / 2);

            // Dot separator
            const dotX = pillStartX + strongsSegmentW + 12;
            ctx.fillStyle = isWhiteBg ? '#94a3b8' : '#71717a';
            ctx.font = 'bold 24px "Inter", sans-serif';
            ctx.fillText('•', dotX, topBarY + topBarH / 2);

            // Right Segment: Theological Nuance without box in accent color
            const defText = selectedWord.rootMeaning || selectedWord.explanation || '';
            const textStartX = dotX + 16;
            const availTextW = pillStartX + maxPillW - textStartX - 10;

            if (defText && availTextW > 40) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(textStartX, topBarY, availTextW, topBarH);
              ctx.clip();

              ctx.font = isVertical ? `800 36px ${canvasScriptureFont}` : `800 32px ${canvasScriptureFont}`;
              ctx.fillStyle = accentColor;

              const fullTextW = ctx.measureText(defText).width;
              const overflowW = Math.max(0, fullTextW - availTextW);
              const scrollRatio = selectedWord.scrollRatio != null ? Math.min(1, Math.max(0, selectedWord.scrollRatio)) : 0;
              const scrollOffset = scrollRatio * overflowW;

              if (overflowW > 0 && scrollRatio === 0) {
                let displayText = defText;
                if (ctx.measureText(displayText).width > availTextW) {
                  while (displayText.length > 0 && ctx.measureText(displayText + '…').width > availTextW) {
                    displayText = displayText.slice(0, -1);
                  }
                  displayText += '…';
                }
                ctx.fillText(displayText, textStartX, topBarY + topBarH / 2);
              } else {
                ctx.fillText(defText, textStartX - scrollOffset, topBarY + topBarH / 2);
              }
              ctx.restore();
            }
          }
        }
      }
        ctx.restore();
      }

      // ── 4. Scripture Text Rendering (Crystal-Clear High Contrast & Zero Bottom Trimming) ──
      let lineY = isSpecialCard ? cardY + (isVertical ? 90 : 84) : cardY + headerAreaHeight;

      // 4A. Manuscript Transliteration Text in Interlinear Mode
      if (isInterlinearMode && msLayoutLines.length > 0) {
        ctx.textBaseline = 'top';

        for (let i = 0; i < msLayoutLines.length; i++) {
          const lTokens = msLayoutLines[i];
          let curX = padTextX;

          for (let j = 0; j < lTokens.length; j++) {
            const token = lTokens[j];
            const tokenWeight = token.isWordActive ? '900' : (isScriptureBold ? '900' : 'bold');
            ctx.font = `${tokenWeight} ${msFontSize}px ${canvasScriptureFont}`;

            ctx.fillStyle = token.isWordActive ? (isWhiteBg ? '#1e40af' : '#f87171') : primaryTextColor;
            ctx.fillText(token.text, curX, lineY);
            curX += token.width + msSpaceW;
          }

          lineY += msLineHeight;
        }

        // Clean divider spacing between manuscript and English
        lineY += 16;
      }

      // 4B. English Scripture Text (Synchronized Word Clustering & In-Place Kinetic Morph)
      if (kjvLayoutLines.length > 0) {
        ctx.textBaseline = 'top';
        const morphP = easeOutQuart(anim.verseMorphProgress);
        const isMorphing = anim.verseMorphProgress < 1.0;
        const textOffsetY = isMorphing ? (20 * (1 - morphP)) : 0;

        for (let i = 0; i < kjvLayoutLines.length; i++) {
          const lTokens = kjvLayoutLines[i];
          let curX = padTextX;

          const lineLag = clampVal((anim.verseMorphProgress - (i * 0.04)) / 0.85, 0, 1);
          const lineEase = easeOutCubic(lineLag);
          const lineAlpha = isMorphing ? (morphP * lineEase) : 1.0;

          ctx.save();
          ctx.globalAlpha = masterAlpha * lineAlpha;
          ctx.translate(0, textOffsetY);

          for (let j = 0; j < lTokens.length; j++) {
            const token = lTokens[j];
            if (token.isWhitespace) {
              curX += token.width;
              continue;
            }

            const kjvWeight = isInterlinearMode
              ? (token.isMatched ? '900' : (isScriptureBold ? '800' : '700'))
              : (isScriptureBold ? '900' : 'bold');

            ctx.font = token.isSupplied
              ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
              : `${kjvWeight} ${kjvFontSize}px ${canvasScriptureFont}`;

            const kjvTextColor = isInterlinearMode
              ? (isWhiteBg ? '#0f172a' : '#f1f5f9')
              : primaryTextColor;

            ctx.fillStyle = token.isMatched
              ? (isWhiteBg ? '#1e40af' : '#f87171')
              : (token.isSupplied ? suppliedTextColor : kjvTextColor);
            ctx.fillText(token.text, curX, lineY);
            curX += token.width;
          }

          ctx.restore();
          lineY += kjvLineHeight;
        }
      }

      ctx.restore();
    };

    // Helper: Draw Full Screen Scripture View onto 2D Canvas (1080p Broadcast Delivery for RTMP/WebRTC)
    const drawFullScreenScripture = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      isVertical: boolean
    ) => {
      const anim = motionAnimRef.current;
      const currentLT = lowerThirdRef.current;
      if (anim.visibilityProgress <= 0.005 || !currentLT) return;

      const isLight = (themeRef.current === 'light') || (currentLT.theme === 'light');
      const bgColor = isLight ? '#ffffff' : '#060913';
      const textColor = isLight ? '#0f172a' : '#faf6f0';
      const borderColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
      const badgeBg = isLight ? '#f1f5f9' : '#111622';
      const badgeBorder = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)';
      const badgeText = isLight ? '#334155' : '#faf6f0';

      ctx.save();
      // Apply Cinematic Motion: Global alpha fade + camera zoom-settle
      const masterAlpha = clampVal(anim.visibilityProgress, 0, 1);
      ctx.globalAlpha = masterAlpha;

      const scaleProg = easeOutQuart(anim.visibilityProgress);
      const currentScale = 1.025 - (0.025 * scaleProg);
      ctx.translate(w / 2, h / 2);
      ctx.scale(currentScale, currentScale);
      ctx.translate(-w / 2, -h / 2);

      // 1. Full Screen Canvas Solid Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      const padX = isVertical ? 56 : 84;
      const headerH = isVertical ? 120 : 100;
      const maxWidth = w - (padX * 2);

      const canvasScriptureFont = getCanvasScriptureFontFamily(scriptureTypefaceRef.current);
      const isScriptureBold = isScriptureBoldRef.current;

      const getWrappedCrossRefLines = (text: string, maxW: number, font: string): string[] => {
        ctx.save();
        ctx.font = font;
        const words = (text || '').trim().split(/\s+/).filter(Boolean);
        const result: string[] = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const test = cur ? `${cur} ${w}` : `"${w}`;
          if (ctx.measureText(test).width > maxW && cur) {
            result.push(cur);
            cur = w;
          } else {
            cur = test;
          }
        }
        if (cur) {
          result.push(cur.endsWith('"') ? cur : `${cur}"`);
        }
        ctx.restore();
        return result.length > 0 ? result : [`"${text || ''}"`];
      };

      const getWrappedTextLines = (text: string, maxW: number, font: string): string[] => {
        ctx.save();
        ctx.font = font;
        const words = (text || '').trim().split(/\s+/).filter(Boolean);
        const result: string[] = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const test = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(test).width > maxW && cur) {
            result.push(cur);
            cur = w;
          } else {
            cur = test;
          }
        }
        if (cur) {
          result.push(cur);
        }
        ctx.restore();
        return result.length > 0 ? result : [text || ''];
      };

      // ── Paragraph Context Layout: Continuous flowing paragraph with inline verse numbers ──
      // Segments: Token-level items that flow inline (verse numbers as superscript, words as text)
      interface ParagraphToken {
        text: string;
        isSupNum: boolean;       // true = superscript verse number
        isTargetVerse: boolean;  // true = belongs to the highlighted target verse
        width: number;
      }

      interface ParagraphFlowLine {
        tokens: ParagraphToken[];
        containsTarget: boolean;
      }

      interface ParagraphContextLayout {
        ref: string;
        book: string;
        chapter: number;
        targetVerse: number | null;
        // Three-segment approach: pre-target paragraph, target block, post-target paragraph
        preTargetLines: ParagraphFlowLine[];
        targetLines: string[];  // word-wrapped lines for the target verse (displayed as highlighted block)
        postTargetLines: ParagraphFlowLine[];
        totalH: number;
        vLineH: number;
        bodyH: number;
        targetYOffset: number;
      }

      // Build flowing paragraph lines from token arrays, word-wrapping across verse boundaries
      const buildFlowLines = (tokens: ParagraphToken[], maxW: number, normalFont: string, supFont: string): ParagraphFlowLine[] => {
        const lines: ParagraphFlowLine[] = [];
        let curTokens: ParagraphToken[] = [];
        let curW = 0;
        let curHasTarget = false;

        ctx.save();
        const spaceW = (() => { ctx.font = normalFont; return ctx.measureText(' ').width; })();

        for (const tok of tokens) {
          ctx.font = tok.isSupNum ? supFont : normalFont;
          const tokW = ctx.measureText(tok.text).width;
          const needed = curW > 0 ? tokW + spaceW : tokW;

          if (curW + needed > maxW && curTokens.length > 0) {
            lines.push({ tokens: curTokens, containsTarget: curHasTarget });
            curTokens = [];
            curW = 0;
            curHasTarget = false;
          }

          curTokens.push({ ...tok, width: tokW });
          curW += curW > 0 ? tokW + spaceW : tokW;
          if (tok.isTargetVerse) curHasTarget = true;
        }

        if (curTokens.length > 0) {
          lines.push({ tokens: curTokens, containsTarget: curHasTarget });
        }

        ctx.restore();
        return lines;
      };

      const getParagraphContextLayout = (
        contextData: { ref: string; book: string; chapter: number; targetVerse: number | null; verses: any[] },
        maxW: number,
        isVerticalLayout: boolean
      ): ParagraphContextLayout => {
        const vLineH = isVerticalLayout ? 36 : 32;
        const fontSize = isVerticalLayout ? 25 : 22;
        const supFontSz = isVerticalLayout ? 16 : 14;
        const normalFont = `500 ${fontSize}px ${canvasScriptureFont}`;
        const targetFont = `${isScriptureBold ? 'bold' : '600'} ${fontSize}px ${canvasScriptureFont}`;
        const supFont = `bold ${supFontSz}px "Inter", sans-serif`;

        const allVerses = contextData.verses || [];
        const targetVerse = contextData.targetVerse;
        const textPadding = maxW - 36; // inset padding for flowing text

        // Collect tokens for pre-target and post-target segments
        const preTokens: ParagraphToken[] = [];
        const postTokens: ParagraphToken[] = [];
        let targetText = '';
        let phase: 'pre' | 'target' | 'post' = 'pre';

        for (const v of allVerses) {
          const isTarget = targetVerse !== null && v.verseNumber === targetVerse;
          const rawText = v.kjvText || v.contemporary || v.nonNativeEnglish || '';
          const cleanedText = stripSuppliedMarkup(rawText).trim();

          if (isTarget) {
            phase = 'target';
            targetText = `${v.verseNumber}  ${cleanedText}`;
          } else {
            const bucket = phase === 'post' ? postTokens : preTokens;
            if (phase === 'pre' && isTarget === false && targetVerse !== null && v.verseNumber > targetVerse) {
              phase = 'post';
            }
            const activeBucket = phase === 'post' ? postTokens : bucket;

            // Add superscript verse number token
            activeBucket.push({ text: `${v.verseNumber}`, isSupNum: true, isTargetVerse: false, width: 0 });

            // Add word tokens
            const words = cleanedText.split(/\s+/).filter(Boolean);
            for (const word of words) {
              activeBucket.push({ text: word, isSupNum: false, isTargetVerse: false, width: 0 });
            }
          }

          // After processing the target verse, switch to post phase
          if (isTarget) {
            phase = 'post';
          }
        }

        // Build flowing lines for pre and post segments
        const preTargetLines = buildFlowLines(preTokens, textPadding, normalFont, supFont);
        const postTargetLines = buildFlowLines(postTokens, textPadding, normalFont, supFont);

        // Build target verse lines (same as before — word-wrapped independently)
        const targetMaxW = maxW - 74;
        const targetLines = targetText ? getWrappedTextLines(targetText, targetMaxW, targetFont) : [];

        // Calculate total body height and target verse offset
        let targetYOffset = 0;
        let bodyH = 0;
        if (preTargetLines.length > 0) {
          const preH = preTargetLines.length * vLineH + 8;
          bodyH += preH;
          targetYOffset = preH;
        }
        if (targetLines.length > 0) {
          bodyH += (targetLines.length * vLineH) + 24 + 12; // highlight box padding + gap
        }
        if (postTargetLines.length > 0) {
          bodyH += postTargetLines.length * vLineH + 8;
        }

        const maxCardH = isVerticalLayout ? 540 : 420;
        const totalH = Math.min(maxCardH, 50 + bodyH + 16);
        return {
          ref: contextData.ref,
          book: contextData.book,
          chapter: contextData.chapter,
          targetVerse,
          preTargetLines,
          targetLines,
          postTargetLines,
          totalH,
          vLineH,
          bodyH,
          targetYOffset
        };
      };

      const drawParagraphContextCard = (
        layout: ParagraphContextLayout,
        cardX: number,
        cardY: number,
        cardW: number,
        cardH: number,
        isVerticalLayout: boolean
      ) => {
        ctx.save();
        // Card Background (matching main reader view theme)
        ctx.fillStyle = isLight ? 'rgba(244, 244, 245, 0.98)' : 'rgba(24, 24, 27, 0.98)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 14);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const headerH = 46;

        // Header Background
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, headerH, [14, 14, 0, 0]);
        ctx.fill();

        // Left Icon Button: Return/Collapse (ArrowLeft ‹)
        const iconBtnSize = 28;
        const leftBtnX = cardX + 12;
        const btnY = cardY + (headerH - iconBtnSize) / 2;

        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(leftBtnX, btnY, iconBtnSize, iconBtnSize, 6);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
        ctx.font = `bold ${isVerticalLayout ? 18 : 16}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('‹', leftBtnX + iconBtnSize / 2, btnY + iconBtnSize / 2 - 1);

        // Header Title: {layout.book} {layout.chapter}
        const headerTitle = `${layout.book} ${layout.chapter}`;
        ctx.fillStyle = isLight ? '#0f172a' : '#faf6f0';
        ctx.font = `bold ${isVerticalLayout ? 20 : 18}px ${canvasScriptureFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(headerTitle, leftBtnX + iconBtnSize + 12, cardY + headerH / 2);

        // Right Icon Button: Open in Reader (Book icon 📖)
        const rightBtnX = cardX + cardW - iconBtnSize - 12;
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(rightBtnX, btnY, iconBtnSize, iconBtnSize, 6);
        ctx.fill();
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = `${isVerticalLayout ? 16 : 14}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📖', rightBtnX + iconBtnSize / 2, btnY + iconBtnSize / 2);

        // Header bottom divider line
        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + headerH);
        ctx.lineTo(cardX + cardW, cardY + headerH);
        ctx.stroke();

        // Calculate scroll offset within card (target verse centered with broadcast smooth motion)
        const visibleBodyH = cardH - headerH;
        const maxScroll = Math.max(0, layout.bodyH - visibleBodyH + 20);
        const centerTargetScroll = layout.targetLines.length > 0
          ? Math.max(0, Math.min(maxScroll, layout.targetYOffset - (visibleBodyH / 2) + ((layout.targetLines.length * layout.vLineH) / 2)))
          : 0;

        // Controlled directly by preview window read paragraph context scrolling:
        const targetCardScroll = (previewScrollRatioRef.current !== null && previewScrollRatioRef.current !== undefined)
          ? Math.max(0, Math.min(maxScroll, previewScrollRatioRef.current * maxScroll))
          : centerTargetScroll;

        const currentCardScroll = cardScrollOffsetRef.current ?? targetCardScroll;
        const cardDiff = targetCardScroll - currentCardScroll;
        const scrollOffset = Math.abs(cardDiff) < 0.5 ? targetCardScroll : currentCardScroll + cardDiff * 0.08;
        cardScrollOffsetRef.current = scrollOffset;

        // Clip verses strictly to card interior below header
        ctx.save();
        ctx.beginPath();
        ctx.rect(cardX + 4, cardY + headerH + 1, cardW - 8, visibleBodyH - 4);
        ctx.clip();

        const fontSize = isVerticalLayout ? 25 : 22;
        const supFontSz = isVerticalLayout ? 16 : 14;
        const normalFont = `500 ${fontSize}px ${canvasScriptureFont}`;
        const targetFont = `${isScriptureBold ? 'bold' : '600'} ${fontSize}px ${canvasScriptureFont}`;
        const supFont = `bold ${supFontSz}px "Inter", sans-serif`;
        const normalColor = isLight ? '#334155' : '#dcd3c6';
        const supColor = isLight ? 'rgba(100, 116, 139, 0.7)' : 'rgba(168, 155, 140, 0.7)';
        const targetColor = isLight ? '#082f49' : '#ffffff';

        let vY = cardY + headerH + 14 - scrollOffset;

        // Helper: Draw a flowing paragraph segment (inline verse numbers + text)
        const drawFlowSegment = (flowLines: ParagraphFlowLine[]) => {
          for (const line of flowLines) {
            let curX = cardX + 18;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            for (const tok of line.tokens) {
              if (tok.isSupNum) {
                // Superscript verse number — smaller, elevated, slightly dimmed
                ctx.font = supFont;
                ctx.fillStyle = supColor;
                ctx.fillText(tok.text, curX, vY - 4);
                curX += tok.width + 4;
              } else {
                ctx.font = normalFont;
                ctx.fillStyle = normalColor;
                ctx.fillText(tok.text, curX, vY);
                // Measure space between words
                const spW = ctx.measureText(' ').width;
                curX += tok.width + spW;
              }
            }
            vY += layout.vLineH;
          }
        };

        // ── 1. Pre-target paragraph (flowing inline) ──
        if (layout.preTargetLines.length > 0) {
          drawFlowSegment(layout.preTargetLines);
          vY += 6; // small gap before target block
        }

        // ── 2. Target verse (highlighted block — same styling as before) ──
        if (layout.targetLines.length > 0) {
          const tBoxH = (layout.targetLines.length * layout.vLineH) + 16;
          // Target verse highlight box
          ctx.fillStyle = isLight ? 'rgba(207, 250, 254, 0.35)' : 'rgba(8, 51, 68, 0.28)';
          ctx.beginPath();
          ctx.roundRect(cardX + 16, vY - 2, cardW - 32, tBoxH, 8);
          ctx.fill();

          // Left target vertical accent line (cyan)
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.roundRect(cardX + 16, vY - 2, 4, tBoxH, 2);
          ctx.fill();

          // Target text
          ctx.font = targetFont;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          let lineY = vY + 6;
          for (let li = 0; li < layout.targetLines.length; li++) {
            ctx.fillStyle = targetColor;
            ctx.fillText(layout.targetLines[li], cardX + 28, lineY);
            lineY += layout.vLineH;
          }
          vY += tBoxH + 12; // gap after target block
        }

        // ── 3. Post-target paragraph (flowing inline) ──
        if (layout.postTargetLines.length > 0) {
          drawFlowSegment(layout.postTargetLines);
        }

        ctx.restore(); // remove clip
        ctx.restore(); // restore card state
      };

      const isInterlinear = currentLT.displayMode === 'interlinear';
      const fullText = currentLT.text ? currentLT.text.trim() : '';

      // Get verses to render (prefer lowerThird.allVerses, cachedChapterVersesRef, STATIC_CHAPTERS, or single verse)
      let versesToRender = (currentLT.allVerses && currentLT.allVerses.length > 0)
        ? currentLT.allVerses
        : (cachedChapterVersesRef.current && cachedChapterVersesRef.current.length > 0
            ? cachedChapterVersesRef.current
            : []);

      if (versesToRender.length === 0) {
        const bookKey = Object.keys(STATIC_CHAPTERS).find(
          (b) => b.toLowerCase() === currentLT.book.toLowerCase()
        );
        const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[currentLT.chapter] : undefined;
        if (staticCh?.verses && staticCh.verses.length > 0) {
          versesToRender = staticCh.verses;
        } else {
          versesToRender = [{ verseNumber: currentLT.verse || 1, kjvText: fullText }];
        }
      }

      const interlinearMap = (currentLT.allInterlinearVerses && Object.keys(currentLT.allInterlinearVerses).length > 0)
        ? currentLT.allInterlinearVerses
        : cachedInterlinearVersesRef.current;

      if (isInterlinear) {
        // ── INTERLINEAR THEOLOGICAL STUDY MODE (ALL CHAPTER VERSES) ──
        const msFontSize = isVertical ? 48 : 44;
        const msLineHeight = isVertical ? 72 : 66;
        const kjvFontSize = isVertical ? 44 : 40;
        const kjvLineHeight = isVertical ? 68 : 62;
        const badgeW = isVertical ? 58 : 50;
        const badgeH = isVertical ? 46 : 40;

        interface VerseLayoutBlock {
          verseNumber: number;
          isSelected: boolean;
          startY: number;
          height: number;
          render: (y: number) => void;
        }

        const blocks: VerseLayoutBlock[] = [];
        let accumulatedH = 0;
        const verseOffsets: Record<number, number> = {};

        for (const vItem of versesToRender) {
          const vNum = vItem.verseNumber;
          const isSelected = vNum === (currentLT.verse || 1);
          verseOffsets[vNum] = accumulatedH;

          const interVerse = interlinearMap?.[vNum];
          const words = interVerse?.words || vItem.interlinearWords || (isSelected ? currentLT.interlinearWords : []) || [];
          const vKjvText = (vItem.kjvText || (isSelected ? fullText : '') || '').trim();
          const vMsText = (interVerse?.manuscriptText || vItem.manuscriptText || (isSelected ? currentLT.manuscriptText : '') || '').trim();

          let activeWordIdx = -1;
          const selectedWord = isSelected ? currentLT.selectedWord : null;
          if (selectedWord && words.length > 0) {
            activeWordIdx = words.findIndex(
              (w: any) => (selectedWord.strongsNumber && w.n === selectedWord.strongsNumber) ||
                          (selectedWord.originalValue && (w.w === selectedWord.originalValue || (w as any).tr === selectedWord.originalValue)) ||
                          (selectedWord.word && (w.t === selectedWord.word || w.w === selectedWord.word))
            );
            if (activeWordIdx === -1) activeWordIdx = 0;
          }

          const matchedKjvIndices = (activeWordIdx >= 0 && vKjvText && words.length > 0)
            ? getMatchedKjvTokenIndices(words, activeWordIdx, vKjvText)
            : new Set<number>();
          const kjvTokens = vKjvText ? parseKjvRawTokens(vKjvText) : [];

          // Precompute Manuscript Lines
          ctx.font = `${isScriptureBold ? '900' : 'bold'} ${msFontSize}px ${canvasScriptureFont}`;
          const msLines: Array<Array<{ text: string; isHighlight: boolean; width: number }>> = [];
          if (words.length > 0) {
            let curMsLine: Array<{ text: string; isHighlight: boolean; width: number }> = [];
            let curMsW = 0;
            const spaceW = ctx.measureText(' ').width;

            for (let wIdx = 0; wIdx < words.length; wIdx++) {
              const wObj = words[wIdx];
              const dispWord = wObj.tr || getWordTransliteration(wObj.w, currentLT.language || 'Greek') || wObj.w;
              const isWordActive = isSelected && activeWordIdx === wIdx;
              const wordW = ctx.measureText(dispWord).width;
              const itemW = wordW;

              if (curMsW + itemW + spaceW > maxWidth && curMsLine.length > 0) {
                msLines.push(curMsLine);
                curMsLine = [];
                curMsW = 0;
              }
              curMsLine.push({ text: dispWord, isHighlight: isWordActive, width: itemW });
              curMsW += itemW + spaceW;
            }
            if (curMsLine.length > 0) msLines.push(curMsLine);
          } else if (vMsText) {
            const rawWords = vMsText.split(/\s+/).filter(Boolean);
            let curMsLine: Array<{ text: string; isHighlight: boolean; width: number }> = [];
            let curMsW = 0;
            const spaceW = ctx.measureText(' ').width;

            for (const rw of rawWords) {
              const wW = ctx.measureText(rw).width;
              if (curMsW + wW + spaceW > maxWidth && curMsLine.length > 0) {
                msLines.push(curMsLine);
                curMsLine = [];
                curMsW = 0;
              }
              curMsLine.push({ text: rw, isHighlight: false, width: wW });
              curMsW += wW + spaceW;
            }
            if (curMsLine.length > 0) msLines.push(curMsLine);
          }

          // Precompute English KJV Lines
          ctx.font = `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;
          const kjvLines: Array<Array<{ text: string; isMatched: boolean; isSupplied?: boolean; width: number }>> = [];
          let curKjvLine: Array<{ text: string; isMatched: boolean; isSupplied?: boolean; width: number }> = [];
          let curKjvW = 0;
          const kjvSpaceW = ctx.measureText(' ').width;

          for (let tIdx = 0; tIdx < kjvTokens.length; tIdx++) {
            const tok = kjvTokens[tIdx];
            const tokStr = tok.text || '';
            const isMatched = matchedKjvIndices.has(tIdx);
            ctx.font = tok.isSupplied
              ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
              : `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;
            const tokW = ctx.measureText(tokStr).width;
            const itemW = tokW + (isMatched ? 20 : 0);

            if (curKjvW + itemW + kjvSpaceW > maxWidth && curKjvLine.length > 0) {
              kjvLines.push(curKjvLine);
              curKjvLine = [];
              curKjvW = 0;
            }
            curKjvLine.push({ text: tokStr, isMatched, isSupplied: tok.isSupplied, width: itemW });
            curKjvW += itemW + kjvSpaceW;
          }
          if (curKjvLine.length > 0) kjvLines.push(curKjvLine);

          // Calculate Cross Reference cards height if present on selected verse
          const attachedRefs = (isSelected && currentLT.isCrossRefOpen !== false && currentLT.attachedCrossRefs) ? currentLT.attachedCrossRefs : [];
          const visualGap = isVertical ? 28 : 22;
          let crossRefsH = 0;
          if (attachedRefs.length > 0) {
            for (const cr of attachedRefs) {
              const isInlineActive = Boolean(currentLT.inlineContextRef && currentLT.inlineContextRef === cr.ref);
              const ctxData = cachedInlineContextVersesRef.current;
              if (isInlineActive && ctxData && ctxData.ref === cr.ref) {
                const pLayout = getParagraphContextLayout(ctxData, maxWidth, isVertical);
                crossRefsH += pLayout.totalH + (visualGap * 2);
              } else {
                const crLines = getWrappedCrossRefLines(cr.text, maxWidth - 52, `italic ${isVertical ? 26 : 22}px ${canvasScriptureFont}`);
                const crLineH = isVertical ? 38 : 32;
                const cardH = Math.max(isVertical ? 140 : 116, 54 + (crLines.length * crLineH) + 16);
                crossRefsH += cardH + (visualGap * 2);
              }
            }
          }

          const verseHeaderH = badgeH + 16;
          const msH = msLines.length * msLineHeight + (msLines.length > 0 ? 12 : 0);
          const kjvH = kjvLines.length * kjvLineHeight + 16;
          const blockH = verseHeaderH + msH + kjvH + crossRefsH + 28;

          blocks.push({
            verseNumber: vNum,
            isSelected,
            startY: accumulatedH,
            height: blockH,
            render: (drawY: number) => {
              let localY = drawY;

              // ── Line 1: Stationary Verse Badge + Strong's Pill + Nuance + Parsing Tag ──
              ctx.save();
              ctx.fillStyle = badgeBg;
              ctx.beginPath();
              ctx.roundRect(padX, localY, badgeW, badgeH, 8);
              ctx.fill();
              ctx.strokeStyle = badgeBorder;
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.fillStyle = badgeText;
              ctx.font = `bold ${isVertical ? 24 : 22}px "Inter", sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`${vNum}`, padX + badgeW / 2, localY + badgeH / 2);

              if (isSelected) {
                // Unified Pill: Strong's Code + Theological Root Action
                const pillStartX = padX + badgeW + 14;
                let strongCode = (selectedWord?.strongsNumber || words[0]?.n || 'G3056').trim();
                if (!strongCode.startsWith('G') && !strongCode.startsWith('H')) {
                  strongCode = (currentLT.language === 'Hebrew' ? 'H' : 'G') + strongCode;
                }

                ctx.font = `900 ${isVertical ? 22 : 20}px "Inter", monospace`;
                const codeW = ctx.measureText(strongCode).width;

                const accentColor = isLight ? '#1e40af' : '#f87171';
                ctx.fillStyle = accentColor;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(strongCode, pillStartX, localY + badgeH / 2);

                // Dot separator
                ctx.fillStyle = isLight ? '#94a3b8' : '#71717a';
                ctx.font = 'bold 20px "Inter", sans-serif';
                ctx.fillText('•', pillStartX + codeW + 8, localY + badgeH / 2);

                // Root Action Nuance Text with Dynamic Inline Scroll & Clipping
                const rootAction = selectedWord?.rootMeaning || 'Divine Purpose • Sovereign Action';
                ctx.font = `bold ${isVertical ? 26 : 24}px ${canvasScriptureFont}`;
                ctx.fillStyle = accentColor;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const actionX = pillStartX + codeW + 24;
                const maxActionW = Math.max(40, w - padX - actionX - (isVertical ? 150 : 200));

                ctx.save();
                ctx.beginPath();
                ctx.rect(actionX, localY, maxActionW, badgeH);
                ctx.clip();

                const fullTextW = ctx.measureText(rootAction).width;
                const overflowW = Math.max(0, fullTextW - maxActionW);
                const scrollRatio = selectedWord?.scrollRatio != null ? Math.min(1, Math.max(0, selectedWord.scrollRatio)) : 0;
                const scrollOffset = scrollRatio * overflowW;

                if (overflowW > 0 && scrollRatio === 0) {
                  let displayAction = rootAction;
                  while (displayAction.length > 0 && ctx.measureText(displayAction + '…').width > maxActionW) {
                    displayAction = displayAction.slice(0, -1);
                  }
                  displayAction += '…';
                  ctx.fillText(displayAction, actionX, localY + badgeH / 2);
                } else {
                  ctx.fillText(rootAction, actionX - scrollOffset, localY + badgeH / 2);
                }
                ctx.restore();

                // Grammatical Parsing Tag
                const parsingTag = selectedWord?.parsingTag || words[0]?.p || 'V-PAI-3S';
                ctx.font = `bold ${isVertical ? 20 : 18}px "JetBrains Mono", monospace`;
                ctx.fillStyle = isLight ? '#64748b' : '#a8a29e';
                ctx.textAlign = 'right';
                ctx.fillText(parsingTag, w - padX, localY + badgeH / 2);
              }
              ctx.restore();

              localY += badgeH + 16;

              // ── Line 2: Manuscript Transliteration Text ──
              if (msLines.length > 0) {
                ctx.save();
                ctx.font = `${isScriptureBold ? '900' : 'bold'} ${msFontSize}px ${canvasScriptureFont}`;
                ctx.textBaseline = 'alphabetic';
                const spaceW = ctx.measureText(' ').width;

                for (const line of msLines) {
                  let curX = padX;
                  const lineBaseY = localY + msFontSize;

                  for (const item of line) {
                    ctx.fillStyle = item.isHighlight
                      ? (isLight ? '#1e40af' : '#f87171')
                      : (isLight ? '#334155' : '#e2d7c5');
                    ctx.fillText(item.text, curX, lineBaseY);
                    curX += item.width + spaceW;
                  }
                  localY += msLineHeight;
                }
                ctx.restore();
                localY += 10;
              }

              // ── Line 3: English KJV Text with Dark Clustering ──
              if (kjvLines.length > 0) {
                ctx.save();
                ctx.textBaseline = 'alphabetic';

                for (const line of kjvLines) {
                  let curX = padX;
                  const lineBaseY = localY + kjvFontSize;

                  for (const item of line) {
                    ctx.font = item.isSupplied
                      ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
                      : `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;

                    ctx.fillStyle = item.isMatched
                      ? (isLight ? '#1e40af' : '#f87171')
                      : item.isSupplied
                        ? (isLight ? '#64748b' : '#a89b8c')
                        : (isLight ? '#0f172a' : '#faf6f0');
                    ctx.fillText(item.text, curX, lineBaseY);
                    curX += item.width + 10;
                  }
                  localY += kjvLineHeight;
                }
                ctx.restore();
                localY += 12;
              }

              // ── Line 4: Attached Cross-Reference Cards (if present) ──
              if (attachedRefs.length > 0) {
                for (const cr of attachedRefs) {
                  const isInlineActive = Boolean(currentLT.inlineContextRef && currentLT.inlineContextRef === cr.ref);
                  const ctxData = cachedInlineContextVersesRef.current;

                  if (isInlineActive && ctxData && ctxData.ref === cr.ref) {
                    const pLayout = getParagraphContextLayout(ctxData, maxWidth, isVertical);
                    localY += visualGap;
                    drawParagraphContextCard(pLayout, padX, localY, maxWidth, pLayout.totalH, isVertical);
                    localY += pLayout.totalH + visualGap;
                  } else {
                    const crLines = getWrappedCrossRefLines(cr.text, maxWidth - 52, `italic ${isVertical ? 26 : 22}px ${canvasScriptureFont}`);
                    const crLineH = isVertical ? 38 : 32;
                    const cardH = Math.max(isVertical ? 140 : 116, 54 + (crLines.length * crLineH) + 16);

                    localY += visualGap;

                    ctx.save();
                    ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(30, 25, 21, 0.95)';
                    ctx.beginPath();
                    ctx.roundRect(padX, localY, maxWidth, cardH, 14);
                    ctx.fill();
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Left Accent bar
                    ctx.fillStyle = isLight ? '#64748b' : '#a8a29e';
                    ctx.beginPath();
                    ctx.roundRect(padX + 8, localY + 12, 6, cardH - 24, 3);
                    ctx.fill();

                    // Reference header
                    ctx.fillStyle = isLight ? '#0f172a' : '#faf6f0';
                    ctx.font = `bold ${isVertical ? 26 : 24}px ${canvasScriptureFont}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(cr.ref, padX + 26, localY + 14);
                    const refW = ctx.measureText(cr.ref).width;

                    // Pill: CROSS-REFERENCE
                    ctx.font = `bold ${isVertical ? 16 : 14}px "JetBrains Mono", monospace`;
                    const pillText = 'CROSS-REFERENCE';
                    const pW = ctx.measureText(pillText).width + 16;
                    const pH = 24;
                    const pX = padX + 26 + refW + 16;
                    ctx.fillStyle = isLight ? '#e2e8f0' : '#27201b';
                    ctx.beginPath();
                    ctx.roundRect(pX, localY + 14, pW, pH, 6);
                    ctx.fill();
                    ctx.fillStyle = isLight ? '#334155' : '#dcd3c6';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(pillText, pX + pW / 2, localY + 14 + pH / 2);

                    // Right Icon Button: Chevron Right (matching main reader view icon button)
                    const btnSize = isVertical ? 26 : 24;
                    const btnX = padX + maxWidth - btnSize - 14;
                    const btnY = localY + 14;
                    ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
                    ctx.beginPath();
                    ctx.roundRect(btnX, btnY, btnSize, btnSize, 6);
                    ctx.fill();
                    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
                    ctx.font = `bold ${isVertical ? 16 : 14}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('›', btnX + btnSize / 2, btnY + btnSize / 2 - 1);

                    // Scripture text lines
                    ctx.fillStyle = isLight ? '#1e293b' : '#e2d7c5';
                    ctx.font = `italic ${isVertical ? 26 : 22}px ${canvasScriptureFont}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    let textY = localY + 54;
                    for (const crLine of crLines) {
                      ctx.fillText(crLine, padX + 26, textY);
                      textY += crLineH;
                    }
                    ctx.restore();

                    localY += cardH + visualGap;
                  }
                }
              }

              // Divider line below verse
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(padX, localY + 8);
              ctx.lineTo(w - padX, localY + 8);
              ctx.stroke();
            }
          });

          accumulatedH += blockH;
        }

        // Calculate scroll offset
        const totalContentH = accumulatedH;
        const visibleH = h - headerH - (isVertical ? 60 : 40);
        const maxScroll = Math.max(0, totalContentH - visibleH);

        let targetScrollOffset = 0;
        if (!currentLT.inlineContextRef && previewScrollRatioRef.current !== null && previewScrollRatioRef.current !== undefined) {
          targetScrollOffset = Math.max(0, Math.min(maxScroll, previewScrollRatioRef.current * maxScroll));
        } else if (currentLT.verse) {
          const targetY = verseOffsets[currentLT.verse] || 0;
          targetScrollOffset = Math.min(maxScroll, Math.max(0, targetY - 40));
        }

        const currentInterlinearScroll = canvasInterlinearScrollRef.current ?? targetScrollOffset;
        const interlinearDiff = targetScrollOffset - currentInterlinearScroll;
        const scrollOffset = Math.abs(interlinearDiff) < 0.5 ? targetScrollOffset : currentInterlinearScroll + interlinearDiff * 0.22;
        canvasInterlinearScrollRef.current = scrollOffset;

        // Clip viewport below header
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, headerH, w, h - headerH);
        ctx.clip();

        const startY = headerH + (isVertical ? 40 : 30) - scrollOffset;
        for (const block of blocks) {
          const blockTop = startY + block.startY;
          const blockBottom = blockTop + block.height;
          // Render only blocks within or intersecting viewport
          if (blockBottom >= headerH && blockTop <= h) {
            block.render(blockTop);
          }
        }
        ctx.restore(); // Restore clip
      } else {
        // ── STANDARD KJV PERICOPE STORY MODE (FULL CHAPTER) ──
        const kjvFontSize = isVertical ? 50 : 46;
        const kjvLineHeight = isVertical ? 76 : 70;
        const supFontSize = isVertical ? 28 : 24;
        ctx.font = `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;
        ctx.fillStyle = isLight ? '#0f172a' : '#faf6f0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Precompute wrapped lines for all verses in the chapter grouped into pericope story paragraphs
        interface LayoutItem {
          text: string;
          isSup: boolean;
          isSupplied?: boolean;
          width: number;
          isSelectedVerse?: boolean;
          isCrossRef?: boolean;
          isInlineContext?: boolean;
          paragraphContextLayout?: any;
          crossRefData?: any;
          cardH?: number;
          crLines?: string[];
          crLineH?: number;
          visualGap?: number;
        }

        interface RenderLine {
          items: LayoutItem[];
          hasSelectedVerse?: boolean;
          isCrossRefBlock?: boolean;
          isInlineContext?: boolean;
          paragraphContextLayout?: any;
          crossRefData?: any;
          cardH?: number;
          crLines?: string[];
          crLineH?: number;
          visualGap?: number;
          isParagraphEnd?: boolean;
        }

        const storyChunks = groupVersesByStory(versesToRender, currentLT.book || '', currentLT.chapter || 1);
        const lines: RenderLine[] = [];
        let currentLineItems: LayoutItem[] = [];
        let currentLineWidth = 0;
        let lineHasSelected = false;

        storyChunks.forEach((chunkVerses, chunkIdx) => {
          const chunkLayoutItems: LayoutItem[] = [];

          chunkVerses.forEach((vItem: any) => {
            const vNum = vItem.verseNumber;
            const vText = (vItem.kjvText || '').trim();
            const isSelected = vNum === (currentLT.verse || 1);

            ctx.font = `bold ${supFontSize}px "Inter", sans-serif`;
            const supWidth = ctx.measureText(`${vNum}`).width + 8;
            chunkLayoutItems.push({ text: `${vNum}`, isSup: true, width: supWidth, isSelectedVerse: isSelected });

            const tokens = parseKjvRawTokens(vText);
            tokens.forEach((tok) => {
              const tokStr = tok.text;
              if (!tokStr) return;
              ctx.font = tok.isSupplied
                ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
                : `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;
              const wWidth = ctx.measureText(tokStr).width;
              chunkLayoutItems.push({
                text: tokStr,
                isSup: false,
                isSupplied: tok.isSupplied,
                width: wWidth,
                isSelectedVerse: isSelected
              });
            });

            // If attached cross-references exist for this selected verse, attach layout item
            if (isSelected && currentLT.isCrossRefOpen !== false && currentLT.attachedCrossRefs && currentLT.attachedCrossRefs.length > 0) {
              const visualGap = isVertical ? 28 : 22;
              for (const cr of currentLT.attachedCrossRefs) {
                const isInlineActive = Boolean(currentLT.inlineContextRef && currentLT.inlineContextRef === cr.ref);
                const ctxData = cachedInlineContextVersesRef.current;

                if (isInlineActive && ctxData && ctxData.ref === cr.ref) {
                  const pLayout = getParagraphContextLayout(ctxData, maxWidth, isVertical);
                  chunkLayoutItems.push({
                    text: '',
                    isSup: false,
                    width: maxWidth,
                    isSelectedVerse: true,
                    isCrossRef: true,
                    isInlineContext: true,
                    paragraphContextLayout: pLayout,
                    crossRefData: cr,
                    cardH: pLayout.totalH,
                    crLines: [],
                    crLineH: pLayout.vLineH,
                    visualGap
                  });
                } else {
                  const crLines = getWrappedCrossRefLines(cr.text, maxWidth - 52, `italic ${isVertical ? 26 : 22}px ${canvasScriptureFont}`);
                  const crLineH = isVertical ? 38 : 32;
                  const cardH = Math.max(isVertical ? 140 : 116, 54 + (crLines.length * crLineH) + 16);
                  chunkLayoutItems.push({
                    text: '',
                    isSup: false,
                    width: maxWidth,
                    isSelectedVerse: true,
                    isCrossRef: true,
                    isInlineContext: false,
                    crossRefData: cr,
                    cardH,
                    crLines,
                    crLineH,
                    visualGap
                  });
                }
              }
            }
          });

          // Pack chunk items into lines
          for (const item of chunkLayoutItems) {
            if (item.isCrossRef) {
              if (currentLineItems.length > 0) {
                lines.push({ items: currentLineItems, hasSelectedVerse: lineHasSelected });
                currentLineItems = [];
                currentLineWidth = 0;
                lineHasSelected = false;
              }
              lines.push({
                items: [],
                hasSelectedVerse: true,
                isCrossRefBlock: true,
                isInlineContext: item.isInlineContext,
                paragraphContextLayout: item.paragraphContextLayout,
                crossRefData: item.crossRefData,
                cardH: item.cardH,
                crLines: item.crLines,
                crLineH: item.crLineH,
                visualGap: item.visualGap
              });
              continue;
            }

            if (currentLineWidth + item.width > maxWidth && currentLineItems.length > 0) {
              lines.push({ items: currentLineItems, hasSelectedVerse: lineHasSelected });
              currentLineItems = [];
              currentLineWidth = 0;
              lineHasSelected = false;
            }
            currentLineItems.push(item);
            currentLineWidth += item.width;
            if (item.isSelectedVerse) lineHasSelected = true;
          }

          // Flush current line at the end of each paragraph chunk with paragraph break marker
          if (currentLineItems.length > 0) {
            const isLastChunk = chunkIdx === storyChunks.length - 1;
            lines.push({
              items: currentLineItems,
              hasSelectedVerse: lineHasSelected,
              isParagraphEnd: !isLastChunk
            });
            currentLineItems = [];
            currentLineWidth = 0;
            lineHasSelected = false;
          }
        });

        // Calculate total content height including pericope paragraph gaps and symmetrically centered cross-ref cards
        let totalContentH = 0;
        for (const line of lines) {
          if (line.isCrossRefBlock && line.cardH && line.visualGap) {
            totalContentH += line.cardH + (line.visualGap * 2) + Math.round(kjvFontSize * 0.8);
          } else {
            const paraGap = line.isParagraphEnd ? Math.round(kjvLineHeight * 0.55) : 0;
            totalContentH += kjvLineHeight + paraGap;
          }
        }

        const visibleH = h - headerH - (isVertical ? 60 : 40);
        const maxScroll = Math.max(0, totalContentH - visibleH);

        let targetScrollOffset = 0;
        if (!currentLT.inlineContextRef && previewScrollRatioRef.current !== null && previewScrollRatioRef.current !== undefined) {
          targetScrollOffset = Math.max(0, Math.min(maxScroll, previewScrollRatioRef.current * maxScroll));
        } else if (currentLT.verse) {
          let lineYAcc = 0;
          for (const line of lines) {
            if (line.hasSelectedVerse) {
              targetScrollOffset = Math.min(maxScroll, Math.max(0, lineYAcc - (currentLT.inlineContextRef ? 40 : 80)));
              break;
            }
            if (line.isCrossRefBlock && line.cardH && line.visualGap) {
              lineYAcc += line.cardH + (line.visualGap * 2) + Math.round(kjvFontSize * 0.8);
            } else {
              const paraGap = line.isParagraphEnd ? Math.round(kjvLineHeight * 0.55) : 0;
              lineYAcc += kjvLineHeight + paraGap;
            }
          }
        }

        const currentCanvasScroll = canvasScrollOffsetRef.current ?? targetScrollOffset;
        const canvasScrollDiff = targetScrollOffset - currentCanvasScroll;
        const scrollOffset = Math.abs(canvasScrollDiff) < 0.5 ? targetScrollOffset : currentCanvasScroll + canvasScrollDiff * 0.22;
        canvasScrollOffsetRef.current = scrollOffset;

        // Clip below header
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, headerH, w, h - headerH);
        ctx.clip();

        let curY = headerH + (isVertical ? 44 : 36) - scrollOffset;

        for (const line of lines) {
          if (line.isCrossRefBlock && line.crossRefData && line.cardH && line.visualGap) {
            const cardH = line.cardH;
            const vGap = line.visualGap;
            const cardTop = curY + 12 + vGap;

            // Skip lines completely outside viewport
            if (cardTop + cardH < headerH || cardTop > h + 50) {
              curY = cardTop + cardH + vGap + Math.round(kjvFontSize * 0.8);
              continue;
            }

            if (line.isInlineContext && line.paragraphContextLayout) {
              drawParagraphContextCard(line.paragraphContextLayout, padX, cardTop, maxWidth, cardH, isVertical);
            } else if (line.crLines && line.crLineH) {
              const cr = line.crossRefData;
              const crLines = line.crLines;
              const crLineH = line.crLineH;

              ctx.save();
              ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(30, 25, 21, 0.95)';
              ctx.beginPath();
              ctx.roundRect(padX, cardTop, maxWidth, cardH, 14);
              ctx.fill();
              ctx.strokeStyle = borderColor;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Left Accent bar
              ctx.fillStyle = isLight ? '#64748b' : '#a8a29e';
              ctx.beginPath();
              ctx.roundRect(padX + 8, cardTop + 12, 6, cardH - 24, 3);
              ctx.fill();

              // Reference title
              ctx.fillStyle = isLight ? '#0f172a' : '#faf6f0';
              ctx.font = `bold ${isVertical ? 26 : 24}px ${canvasScriptureFont}`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(cr.ref, padX + 26, cardTop + 14);
              const refW = ctx.measureText(cr.ref).width;

              // Pill: CROSS-REFERENCE
              ctx.font = `bold ${isVertical ? 16 : 14}px "JetBrains Mono", monospace`;
              const pillText = 'CROSS-REFERENCE';
              const pW = ctx.measureText(pillText).width + 16;
              const pH = 24;
              const pX = padX + 26 + refW + 16;
              ctx.fillStyle = isLight ? '#e2e8f0' : '#27201b';
              ctx.beginPath();
              ctx.roundRect(pX, cardTop + 14, pW, pH, 6);
              ctx.fill();
              ctx.fillStyle = isLight ? '#334155' : '#dcd3c6';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(pillText, pX + pW / 2, cardTop + 14 + pH / 2);

              // Right Icon Button: Chevron Right (matching main reader view icon button)
              const btnSize = isVertical ? 26 : 24;
              const btnX = padX + maxWidth - btnSize - 14;
              const btnY = cardTop + 14;
              ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
              ctx.beginPath();
              ctx.roundRect(btnX, btnY, btnSize, btnSize, 6);
              ctx.fill();
              ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
              ctx.font = `bold ${isVertical ? 16 : 14}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('›', btnX + btnSize / 2, btnY + btnSize / 2 - 1);

              // Scripture text lines (fully wrapped, no truncation)
              ctx.fillStyle = isLight ? '#1e293b' : '#e2d7c5';
              ctx.font = `italic ${isVertical ? 26 : 22}px ${canvasScriptureFont}`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              let textY = cardTop + 54;
              for (const crLine of crLines) {
                ctx.fillText(crLine, padX + 26, textY);
                textY += crLineH;
              }
              ctx.restore();
            }

            // Symmetrically position next verse baseline below card bottom
            curY = cardTop + cardH + vGap + Math.round(kjvFontSize * 0.8);
            continue;
          }

          const lineH = kjvLineHeight;
          const paraGap = line.isParagraphEnd ? Math.round(kjvLineHeight * 0.55) : 0;

          // Skip lines completely outside viewport
          if (curY + lineH + paraGap < headerH || curY > h + 50) {
            curY += lineH + paraGap;
            continue;
          }

          let curX = padX;
          for (const item of line.items) {
            if (item.isSup) {
              ctx.font = `bold ${supFontSize}px "Inter", sans-serif`;
              ctx.fillStyle = isLight ? '#64748b' : '#a8a29e';
              ctx.fillText(item.text, curX, curY - (kjvFontSize * 0.45));
              curX += item.width;
            } else {
              ctx.font = item.isSupplied
                ? `italic ${isScriptureBold ? 'bold ' : ''}${kjvFontSize}px ${canvasScriptureFont}`
                : `${isScriptureBold ? 'bold' : '500'} ${kjvFontSize}px ${canvasScriptureFont}`;
              ctx.fillStyle = isLight
                ? (item.isSupplied ? '#334155' : '#0f172a')
                : (item.isSupplied ? '#dcd3c6' : '#faf6f0');
              ctx.fillText(item.text, curX, curY);
              curX += item.width;
            }
          }
          curY += lineH + paraGap;
        }

        ctx.restore(); // Restore clip
      }

      // ── Fixed Top Header Bar (Book & Chapter + 4-Color Library Icon) ──
      // Drawn on top so text never scrolls over it
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, headerH);

      ctx.fillStyle = textColor;
      ctx.font = `bold ${isVertical ? 46 : 40}px ${canvasScriptureFont}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const title = `${currentLT.book} ${currentLT.chapter}`;
      ctx.fillText(title, padX, headerH / 2);

      // 4-Color Library indicator on the right
      const libX = w - padX - (isVertical ? 65 : 75);
      const libY = headerH / 2 - 14;
      const colors = ['#f59e0b', '#2563eb', '#ef4444', '#16a34a'];
      colors.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(libX + i * 15, libY, 11, 26);
      });
      // Base shelf line
      ctx.fillStyle = isLight ? '#cbd5e1' : '#64748b';
      ctx.fillRect(libX - 2, libY + 26, 64, 3);

      // Header divider line
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, headerH);
      ctx.lineTo(w, headerH);
      ctx.stroke();

      // ── Host Camera Picture-in-Picture (PIP) Window on Full Screen Bible Mode ──
      if (isFullScreenPipRef.current) {
        const pipVideo = hiddenWebcamVideoRef.current;
        const hasPipVideo = Boolean(
          pipVideo &&
          pipVideo.readyState >= 2 &&
          isWebcamActiveRef.current &&
          isWebcamEnabledRef.current
        );

        if (hasPipVideo && pipVideo) {
          const pipW = isVertical ? 340 : 440;
          const pipH = isVertical ? 191 : 248;
          const pipX = w - pipW;
          const pipY = h - pipH;
          const pipRadius = 16;

          ctx.save();
          // Drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 20;

          // Clip rounded rectangle for video - top-left rounded, bottom & right flush with borders
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, [pipRadius, 0, 0, 0]);
          ctx.fillStyle = '#000000';
          ctx.fill();
          ctx.clip();

          // Draw video with aspect ratio fill (centered crop)
          const vw = pipVideo.videoWidth || 1280;
          const vh = pipVideo.videoHeight || 720;
          const scale = Math.max(pipW / vw, pipH / vh);
          const sw = pipW / scale;
          const sh = pipH / scale;
          const sx = (vw - sw) / 2;
          const sy = (vh - sh) / 2;
          ctx.drawImage(pipVideo, sx, sy, sw, sh, pipX, pipY, pipW, pipH);
          ctx.restore();

          // Border on the exposed top & left edges
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pipX, h);
          ctx.lineTo(pipX, pipY + pipRadius);
          ctx.arcTo(pipX, pipY, pipX + pipRadius, pipY, pipRadius);
          ctx.lineTo(w, pipY);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.4)';
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    };

    const currentRatio = activeAspectRatioRef.current;

    // ── 1. Render 16:9 Canvas (1920 x 1080) ── (Only when 16:9 is active)
    if (currentRatio === '16:9' && canvas169) {
      const ctx = canvas169.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(0, 0, 1920, 1080);

        const isFS = (canvasScriptureModeRef.current === 'full-screen' || isFullScreenScripture) && (isLowerThirdVisibleRef.current || anim.visibilityProgress > 0.005);
        if (!isFS || anim.visibilityProgress < 0.999) {
          if (currentMode === 'WEBCAM') {
            drawVideoFit(ctx, hiddenWebcamVideoRef.current || ({} as any), 1920, 1080);
          } else if (currentMode === 'MEDIA_ONLY') {
            if (media) {
              drawVideoFit(ctx, media, 1920, 1080);
            } else if (hasRenderedValidFrameRef.current && freezeFrameCanvasRef.current) {
              ctx.drawImage(freezeFrameCanvasRef.current, 0, 0, 1920, 1080);
            } else {
              ctx.fillStyle = '#0b0e14';
              ctx.fillRect(0, 0, 1920, 1080);
              ctx.save();
              ctx.fillStyle = '#faf6f0';
              ctx.font = 'bold 36px "Literata", serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('MEDIA PLAYBACK', 1920 / 2, 1080 / 2 - 15);
              ctx.fillStyle = '#dcd3c6';
              ctx.font = '500 18px "Inter", sans-serif';
              ctx.fillText('Live Audio Stream Active', 1920 / 2, 1080 / 2 + 30);
              ctx.restore();
            }
          } else if (currentMode === 'PIP') {
            ctx.fillStyle = '#080c14';
            ctx.fillRect(0, 0, 1920, 1080);
            if (media && media.readyState >= 2) {
              drawVideoFit(ctx, media, 1920, 1080);
            } else if (video && isCamEnabled && video.readyState >= 2) {
              drawVideoFit(ctx, video, 1920, 1080);
            } else {
              drawVideoFit(ctx, hiddenWebcamVideoRef.current || ({} as any), 1920, 1080);
            }

            if (isCamEnabled && video && video.readyState >= 2 && media && media.readyState >= 2) {
              const pipW = 440;
              const pipH = 248;
              const pipX = 1920 - pipW - 40;
              const pipY = 40;
              const pipRadius = 18;

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(pipX, pipY, pipW, pipH, pipRadius);
              ctx.clip();
              ctx.drawImage(video, pipX, pipY, pipW, pipH);
              ctx.restore();

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(pipX, pipY, pipW, pipH, pipRadius);
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#06b6d4';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
              ctx.shadowBlur = 20;
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // Draw Lower Third or Full Screen Scripture
        if (canvasScriptureModeRef.current === 'full-screen' || isFullScreenScripture) {
          drawFullScreenScripture(ctx, 1920, 1080, false);
        } else {
          drawLowerThird(ctx, 1920, 1080, false);
        }
      }
    }

    // ── 2. Render 9:16 Canvas (1080 x 1920) ── (Only when 9:16 is active)
    if (currentRatio === '9:16' && canvas916) {
      const ctx = canvas916.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.fillStyle = '#0b0e14';
        ctx.fillRect(0, 0, 1080, 1920);

        const isFS916 = (canvasScriptureModeRef.current === 'full-screen' || isFullScreenScripture) && (isLowerThirdVisibleRef.current || anim.visibilityProgress > 0.005);
        if (!isFS916 || anim.visibilityProgress < 0.999) {
          if (currentMode === 'WEBCAM') {
            drawVideoFit(ctx, hiddenWebcamVideoRef.current || ({} as any), 1080, 1920);
          } else if (currentMode === 'MEDIA_ONLY') {
            if (media) {
              drawVideoFit(ctx, media, 1080, 1920);
            } else if (hasRenderedValidFrameRef.current && freezeFrameCanvasRef.current) {
              ctx.drawImage(freezeFrameCanvasRef.current, 0, 0, 1080, 1920);
            } else {
              ctx.fillStyle = '#0b0e14';
              ctx.fillRect(0, 0, 1080, 1920);
              ctx.save();
              ctx.fillStyle = '#faf6f0';
              ctx.font = 'bold 32px "Literata", serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('MEDIA PLAYBACK', 1080 / 2, 1920 / 2 - 15);
              ctx.fillStyle = '#dcd3c6';
              ctx.font = '500 18px "Inter", sans-serif';
              ctx.fillText('Live Audio Stream Active', 1080 / 2, 1920 / 2 + 30);
              ctx.restore();
            }
          } else if (currentMode === 'PIP') {
            ctx.fillStyle = '#080c14';
            ctx.fillRect(0, 0, 1080, 1920);
            if (media && media.readyState >= 2) {
              drawVideoFit(ctx, media, 1080, 1920);
            } else if (video && isCamEnabled && video.readyState >= 2) {
              drawVideoFit(ctx, video, 1080, 1920);
            } else {
              drawVideoFit(ctx, hiddenWebcamVideoRef.current || ({} as any), 1080, 1920);
            }

            if (isCamEnabled && video && video.readyState >= 2 && media && media.readyState >= 2) {
              const pipW = 340;
              const pipH = 604;
              const pipX = 1080 - pipW - 40;
              const pipY = 60;
              const pipRadius = 24;

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(pipX, pipY, pipW, pipH, pipRadius);
              ctx.clip();
              ctx.drawImage(video, pipX, pipY, pipW, pipH);
              ctx.restore();

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(pipX, pipY, pipW, pipH, pipRadius);
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#06b6d4';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
              ctx.shadowBlur = 20;
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // Draw Lower Third or Full Screen Scripture
        if (canvasScriptureModeRef.current === 'full-screen' || isFullScreenScripture) {
          drawFullScreenScripture(ctx, 1080, 1920, true);
        } else {
          drawLowerThird(ctx, 1080, 1920, true);
        }
      }
    }

    // Audio Peak VU Meter Calculation
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let maxVal = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
        }
      }
      // Peak normalized level (0-100%) with responsive vocal scaling
      const currentLevel = Math.min(100, Math.round((maxVal / 220) * 100));
      setVuMeterLevel((prev) => {
        if (currentLevel >= prev) return currentLevel;
        return Math.max(0, Math.round(prev * 0.88));
      });
      onTelemetryRef.current?.({ fps: 60, bitrate: '3000k', vuLevel: currentLevel });
    }

    // ── 3. Mirror live feed to External Projector Window Canvas if open ──
    const projectorCanvas = getProjectorCanvas();
    if (projectorCanvas) {
      const pCtx = projectorCanvas.getContext('2d');
      if (pCtx) {
        pCtx.imageSmoothingEnabled = true;
        pCtx.imageSmoothingQuality = 'high';
        const sourceCanvas = activeAspectRatioRef.current === '9:16' ? canvas916 : canvas169;
        if (sourceCanvas) {
          pCtx.drawImage(sourceCanvas, 0, 0, 1920, 1080);
        }
      }
    }

    // ── 3b. Relay 1080p live feed to NDI Program Out Window (BroadcastChannel) ──
    if (ndiBroadcastChannelRef.current) {
      const sourceCanvas = activeAspectRatioRef.current === '9:16' ? canvas916 : canvas169;
      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        try {
          createImageBitmap(sourceCanvas).then((bitmap) => {
            ndiBroadcastChannelRef.current?.postMessage({ type: 'FRAME', bitmap }, [bitmap]);
          }).catch(() => {});
        } catch {}
      }
    }

    // Helper: Draw preview thumbnail without interfering with broadcast transitions or freeze buffers
    const drawThumbnailFit = (
      ctx: CanvasRenderingContext2D,
      source: HTMLVideoElement,
      targetW: number,
      targetH: number
    ) => {
      if (!source || source.readyState < 2) return;
      const srcW = source.videoWidth || targetW;
      const srcH = source.videoHeight || targetH;
      const baseScale = Math.max(targetW / srcW, targetH / srcH);
      const scaledW = srcW * baseScale;
      const scaledH = srcH * baseScale;
      const x = (targetW - scaledW) / 2;
      const y = (targetH - scaledH) / 2;
      ctx.drawImage(source, x, y, scaledW, scaledH);
    };

    // ── 4. Mirror media clip to Switcher Preview Thumbnail Canvas ──
    if (mediaPreviewCanvasRef.current && media && media.readyState >= 1) {
      const mCtx = mediaPreviewCanvasRef.current.getContext('2d');
      if (mCtx) {
        mCtx.imageSmoothingEnabled = true;
        mCtx.imageSmoothingQuality = 'medium';
        mCtx.clearRect(0, 0, 160, 96);
        drawThumbnailFit(mCtx, media, 160, 96);
      }
    }
    } catch (drawErr) {
      console.warn('[DualCanvas] Render cycle note:', drawErr);
    } finally {
      animationFrameIdRef.current = requestAnimationFrame(drawFrame);
    }
  }, []);

  useEffect(() => {
    animationFrameIdRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [drawFrame]);

  const [rtmpDeliveryStatus, setRtmpDeliveryStatus] = useState<'IDLE' | 'CONNECTING' | 'INGESTING'>('IDLE');
  const [rtmpBitrate, setRtmpBitrate] = useState<string>('6.0 Mbps');
  const [rtmpSpeed, setRtmpSpeed] = useState<string>('1.0x');
  const [rtmpFramesDelivered, setRtmpFramesDelivered] = useState<number>(0);
  const [isCopiedError, setIsCopiedError] = useState<boolean>(false);
  const [liveSeconds, setLiveSeconds] = useState<number>(0);

  useEffect(() => {
    let timer: any = null;
    if (streamState === 'LIVE' || rtmpDeliveryStatus === 'INGESTING') {
      timer = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setLiveSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [streamState, rtmpDeliveryStatus]);

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

  // ── WebSocket & MediaRecorder RTMP Stream Pusher ──
  const startBroadcast = useCallback(async (overrideConfig?: { rtmpUrl?: string; streamKey?: string; platform?: string }) => {
    try {
      const targetRtmpUrl = (overrideConfig?.rtmpUrl ?? rtmpUrl).trim();
      const targetStreamKey = (overrideConfig?.streamKey ?? streamKey).trim();
      const targetPlatform = (overrideConfig?.platform ?? platform).trim();

      // 1. Force cleanup of any previous session
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      mediaRecorderRef.current = null;

      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }

      updateStreamState('CONNECTING', 'Connecting to Broadcast Bridge...');
      setRtmpDeliveryStatus('CONNECTING');

      // Choose active canvas (16:9 for YouTube/Custom or 9:16 for TikTok/Instagram)
      const targetCanvas = (targetPlatform === 'youtube')
        ? (canvas169Ref.current || canvas916Ref.current)
        : (activeAspectRatio === '9:16' ? canvas916Ref.current : canvas169Ref.current);
      if (!targetCanvas) {
        throw new Error('Canvas not initialized.');
      }

      // Ensure canvas is actively painted before capturing stream
      try { drawFrame(); } catch {}

      // Capture 24 FPS broadcast video stream from canvas (Lightweight profile for slow/unstable connections)
      const canvasStream = targetCanvas.captureStream(24);
      try { drawFrame(); } catch {}

      // ── Dedicated Broadcast Audio Source ──
      let mainCtx = ensureAudioEngine();
      if (mainCtx && mainCtx.state === 'suspended') {
        try { await mainCtx.resume(); } catch {}
      }
      if (mainCtx && mainCtx.state === 'closed') {
        audioContextRef.current = null;
        mainCtx = ensureAudioEngine();
        if (mainCtx && mainCtx.state === 'suspended') {
          try { await mainCtx.resume(); } catch {}
        }
      }

      // Ensure media destination exists and is linked to the active context
      if ((!mediaDestinationRef.current || mainCtx?.state === 'closed') && mainCtx) {
        mediaDestinationRef.current = mainCtx.createMediaStreamDestination();
      }

      if (mainCtx && mediaDestinationRef.current) {
        try {
          // Silent carrier oscillator — guarantees continuous audio frames for YouTube RTMP
          const osc = mainCtx.createOscillator();
          const gain = mainCtx.createGain();
          gain.gain.value = 0.00001; // virtually silent
          osc.connect(gain);
          gain.connect(mediaDestinationRef.current);
          osc.start();
          
          if ((window as any)._rtmpCarrierOsc) {
            try { (window as any)._rtmpCarrierOsc.stop(); } catch {}
          }
          (window as any)._rtmpCarrierOsc = osc;
        } catch (oscErr) {
          console.warn('[DualCanvas] Carrier osc init:', oscErr);
        }
      }

      // Build combined stream: canvas video + master audio
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      
      // Attach audio tracks to guarantee continuous YouTube RTMP audio delivery
      if (mediaDestinationRef.current && mediaDestinationRef.current.stream) {
        mediaDestinationRef.current.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      }

      console.log(`[DualCanvas] Broadcast stream: ${combinedStream.getVideoTracks().length} video, ${combinedStream.getAudioTracks().length} audio tracks (audioCtx: ${mainCtx?.state})`);

      // Initialize MediaRecorder: VP8 and VP9 in WebM are 100% natively supported across all Chromium browsers
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : MediaRecorder.isTypeSupported('video/mp4')
              ? 'video/mp4'
              : 'video/webm;codecs=h264,opus';

      console.log(`[DualCanvas] Selected MediaRecorder MIME type: ${mimeType}`);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps lightweight profile for stable streaming
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = recorder;

      recorder.onerror = (errEvent: any) => {
        console.error('[DualCanvas] MediaRecorder error event:', errEvent.error || errEvent);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({
              type: 'CLIENT_TELEMETRY',
              event: 'RECORDER_ERROR',
              error: errEvent.error?.message || String(errEvent)
            }));
          } catch {}
        }
        updateStreamState('ERROR', 'MediaRecorder encoder error: ' + (errEvent.error?.message || 'Stream encoding interrupted'));
      };

      recorder.onstart = () => {
        console.log('[DualCanvas] MediaRecorder onstart fired. State:', recorder.state);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({
              type: 'CLIENT_TELEMETRY',
              event: 'RECORDER_STARTED',
              state: recorder.state
            }));
          } catch {}
        }
      };

      // Bind data listener BEFORE starting recording or opening socket
      let chunksDeliveredCount = 0;
      recorder.ondataavailable = async (event) => {
        const size = event.data ? event.data.size : 0;
        if (size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          chunksDeliveredCount++;
          if (chunksDeliveredCount <= 3 || chunksDeliveredCount % 20 === 0) {
            try {
              wsRef.current.send(JSON.stringify({
                type: 'CLIENT_TELEMETRY',
                event: 'CHUNK_EMITTED',
                chunkIndex: chunksDeliveredCount,
                bytes: size
              }));
            } catch {}
          }
          try {
            const arrayBuffer = await event.data.arrayBuffer();
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(arrayBuffer);
            }
          } catch {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(event.data);
            }
          }
        } else if (size === 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({
              type: 'CLIENT_TELEMETRY',
              event: 'ZERO_BYTE_CHUNK_WARNING'
            }));
          } catch {}
        }
      };

      // Connect to WebSocket Gateway with resilient multi-host fallback for mobile/LAN
      try {
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
        const sameOriginWsPort = typeof window !== 'undefined' ? (window.location.port || '8443') : '8443';
        const rawStoredHost = (typeof window !== 'undefined' ? localStorage.getItem('logosbridge_bridge_host') : null)?.trim();
        const storedHost = rawStoredHost === '10.79.158.1' ? '10.103.48.1' : rawStoredHost;

        // Build list of candidate bridge endpoints
        const candidates: string[] = [];

        const addCandidateHost = (host: string, customWsPort = '8080', customWssPort = '8443') => {
          if (!host) return;
          // In mobile / Capacitor environments (which run on https://localhost),
          // self-signed certificates on wss:// are rejected by Chromium WebView.
          // Since android:usesCleartextTraffic="true" is enabled in AndroidManifest,
          // plain ws:// to port 8080 connects instantly and reliably across the local network.
          // We include both ws:// and wss:// candidates so all environments succeed.
          candidates.push(`ws://${host}:${customWsPort}`);
          candidates.push(`wss://${host}:${customWssPort}`);
        };

        // 1. Explicit wsUrl prop if provided
        if (wsUrl && wsUrl.trim()) {
          candidates.push(wsUrl.trim());
        }

        // 2. Stored user bridge host from settings
        if (storedHost) {
          addCandidateHost(storedHost);
        }

        // 3. Current origin hostname if non-localhost
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          if (isHttps && !window.location.port) {
            candidates.push(`wss://${hostname}`);
          }
          addCandidateHost(hostname, '8080', sameOriginWsPort || '8443');
        }

        // 4. Current Dev Machine LAN IP (for mobile devices on Wi-Fi)
        addCandidateHost('10.103.48.1');
        addCandidateHost('10.79.158.1');

        // 5. Android Emulator loopback alias
        addCandidateHost('10.0.2.2');

        // 6. Local loopback fallback (desktop development)
        addCandidateHost('127.0.0.1', '8080', sameOriginWsPort || '8443');
        addCandidateHost('localhost', '8080', sameOriginWsPort || '8443');

        // Deduplicate candidates preserving order
        const uniqueCandidates = Array.from(new Set(candidates));

        console.log(`[DualCanvas] Connecting to RTMP WebSocket Bridge. Candidates:`, uniqueCandidates);

        const connectCandidate = (urls: string[], timeoutMs = 2000): Promise<{ ws: WebSocket; url: string }> => {
          return new Promise((resolve, reject) => {
            let settled = false;

            const tryNext = (index: number) => {
              if (settled) return;
              if (index >= urls.length) {
                settled = true;
                return reject(new Error(`Could not connect to broadcast bridge. Attempted ${urls.length} endpoints.`));
              }

              const targetUrl = urls[index];
              let socket: WebSocket | null = null;
              let timer: any = null;

              try {
                socket = new WebSocket(targetUrl);
                socket.binaryType = 'arraybuffer';

                timer = setTimeout(() => {
                  if (!settled && socket && socket.readyState !== WebSocket.OPEN) {
                    try { socket.close(); } catch {}
                    tryNext(index + 1);
                  }
                }, timeoutMs);

                socket.onopen = () => {
                  if (timer) clearTimeout(timer);
                  if (!settled) {
                    settled = true;
                    resolve({ ws: socket!, url: targetUrl });
                  } else {
                    try { socket!.close(); } catch {}
                  }
                };

                socket.onerror = () => {
                  if (timer) clearTimeout(timer);
                  if (!settled) {
                    try { socket!.close(); } catch {}
                    tryNext(index + 1);
                  }
                };
              } catch {
                if (timer) clearTimeout(timer);
                if (!settled) {
                  tryNext(index + 1);
                }
              }
            };

            tryNext(0);
          });
        };

        const { ws, url: connectedUrl } = await connectCandidate(uniqueCandidates);
        wsRef.current = ws;
        console.log(`[DualCanvas] Successfully connected to RTMP WebSocket Bridge: ${connectedUrl}`);

        try {
          const parsed = new URL(connectedUrl);
          if (parsed.hostname && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
            localStorage.setItem('logosbridge_bridge_host', parsed.hostname);
          }
        } catch {}

        const setupWsHandlers = (targetWs: WebSocket) => {
          const onConnected = () => {
            console.log('[DualCanvas] WebSocket connected to RTMP Bridge.');
            updateStreamState('CONNECTING', `Connecting to ${targetPlatform.toUpperCase()}...`);
            targetWs.send(JSON.stringify({
              type: 'START_STREAM',
              rtmpUrl: targetRtmpUrl,
              streamKey: targetStreamKey,
              platform: targetPlatform,
              fps: 30,
              bitrate: '4500k'
            }));

            targetWs.send(JSON.stringify({
              type: 'CLIENT_TELEMETRY',
              event: 'HANDSHAKE_INITIATED',
              mimeType,
              audioCtxState: mainCtx?.state || 'none',
              videoTracks: combinedStream.getVideoTracks().length,
              audioTracks: combinedStream.getAudioTracks().length,
              aspectRatio: activeAspectRatio
            }));

            // Start MediaRecorder ONLY AFTER WebSocket is confirmed OPEN and stream handshake is sent!
            try {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                mediaRecorderRef.current.start(1000); // 1000ms chunks — efficient, stable, low network overhead
                console.log('[DualCanvas] MediaRecorder started with 1000ms chunks.');
              }
            } catch (recErr: any) {
              console.error('[DualCanvas] MediaRecorder start error:', recErr);
              targetWs.send(JSON.stringify({
                type: 'CLIENT_TELEMETRY',
                event: 'RECORDER_START_FAILED',
                error: recErr?.message || String(recErr)
              }));
            }
          };

          targetWs.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'STATUS') {
                if (msg.status === 'CONNECTING') {
                  setRtmpDeliveryStatus('CONNECTING');
                  updateStreamState('CONNECTING', `Connecting to ${platform.toUpperCase()}...`);
                } else if (msg.status === 'INGESTING') {
                  setRtmpDeliveryStatus('INGESTING');
                  if (msg.bitrate) setRtmpBitrate(msg.bitrate);
                  if (msg.speed) setRtmpSpeed(msg.speed);
                  if (msg.frames) setRtmpFramesDelivered(msg.frames);
                  updateStreamState('LIVE', `Connected to ${platform.toUpperCase()} • Live Data Transmitting`);
                } else if (msg.status === 'STREAMING') {
                  setRtmpDeliveryStatus('INGESTING');
                  updateStreamState('LIVE', `Broadcasting Live to ${platform.toUpperCase()}`);
                } else if (msg.status === 'ERROR') {
                  setRtmpDeliveryStatus('IDLE');
                  updateStreamState('ERROR', msg.message || `Stream rejected by ${platform.toUpperCase()}. Please check your Stream Key.`);
                } else if (msg.status === 'STOPPED') {
                  setRtmpDeliveryStatus('IDLE');
                  updateStreamState('IDLE', 'Broadcast ended');
                }
              } else if (msg.type === 'TELEMETRY') {
                if (msg.rtmpActive && streamStateRef.current !== 'LIVE') {
                  setRtmpDeliveryStatus('INGESTING');
                  updateStreamState('LIVE', `Broadcasting Live to ${platform.toUpperCase()}`);
                }
                if (msg.bitrate) setRtmpBitrate(msg.bitrate);
                if (msg.speed) setRtmpSpeed(msg.speed);
                if (msg.frames) setRtmpFramesDelivered(msg.frames);
                onTelemetry?.({ fps: msg.fps || 30, bitrate: msg.bitrate || '4.5 Mbps', vuLevel: vuMeterLevel });
              }
            } catch { }
          };

          targetWs.onerror = (err) => {
            console.warn('[DualCanvas] WebSocket bridge connection note:', err);
            updateStreamState('ERROR', 'Broadcast bridge connection issue. Retrying...');
          };

          targetWs.onclose = () => {
            console.log('[DualCanvas] WebSocket connection closed.');
            setRtmpDeliveryStatus('IDLE');
          };

          if (targetWs.readyState === WebSocket.OPEN) {
            onConnected();
          } else {
            targetWs.onopen = onConnected;
          }
        };

        setupWsHandlers(ws);
      } catch (wsErr: any) {
        console.warn('[DualCanvas] WebSocket init note:', wsErr);
        updateStreamState('ERROR', wsErr?.message || 'Failed to initialize broadcast connection');
        setRtmpDeliveryStatus('IDLE');
      }
    } catch (err: any) {
      console.error('[DualCanvas] Start broadcast error:', err);
      updateStreamState('ERROR', err.message || 'Failed to start broadcast');
      setRtmpDeliveryStatus('IDLE');
    }
  }, [activeAspectRatio, wsUrl, rtmpUrl, streamKey, platform, updateStreamState, onTelemetry, vuMeterLevel]);

  const stopBroadcast = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close dedicated broadcast AudioContext
    if (broadcastAudioCtxRef.current) {
      try { broadcastAudioCtxRef.current.close(); } catch {}
      broadcastAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'STOP_STREAM' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    setRtmpDeliveryStatus('IDLE');
    setRtmpFramesDelivered(0);
    updateStreamState('IDLE', 'Studio Standby');
  }, [updateStreamState]);

  const takeSnapshot = useCallback((): string | null => {
    const targetCanvas = activeAspectRatio === '9:16' ? canvas916Ref.current : canvas169Ref.current;
    return targetCanvas ? targetCanvas.toDataURL('image/png') : null;
  }, [activeAspectRatio]);

  // ── Sermon Video Recording Engine (Lightweight Universal MP4) ──
  const sermonRecorderRef = useRef<MediaRecorder | null>(null);
  const sermonChunksRef = useRef<Blob[]>([]);
  const sermonDirHandleRef = useRef<any>(null);
  const sermonStorageTargetRef = useRef<any>(null);
  const sermonAndroidSessionRef = useRef<{ sessionId: string; filename: string; fileUri: string } | null>(null);
  const sermonMimeRef = useRef<string>('video/mp4');
  const sermonExtRef = useRef<string>('mp4');

  const startSermonRecording = useCallback(async (storageTarget?: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (sermonRecorderRef.current && sermonRecorderRef.current.state !== 'inactive') {
        return { success: false, error: 'A sermon recording is already in progress' };
      }

      sermonStorageTargetRef.current = storageTarget || null;
      sermonDirHandleRef.current = (storageTarget && storageTarget.type === 'desktop_fs') ? storageTarget.handle : (storageTarget?.type ? null : storageTarget);
      sermonAndroidSessionRef.current = null;

      // Select target canvas based on active aspect ratio
      const targetCanvas = activeAspectRatioRef.current === '9:16' ? canvas916Ref.current : canvas169Ref.current;
      if (!targetCanvas) {
        return { success: false, error: 'Studio canvas is not initialized' };
      }

      // Synchronously draw current frame to prime video track
      try { drawFrame(); } catch {}

      const canvasStream = targetCanvas.captureStream(30);
      try { drawFrame(); } catch {}

      // Audio engine setup: Guarantee continuous audio frames even on mobile
      let mainCtx = ensureAudioEngine();
      if (mainCtx && mainCtx.state === 'suspended') {
        try { await mainCtx.resume(); } catch {}
      }
      if (mainCtx && mainCtx.state === 'closed') {
        audioContextRef.current = null;
        mainCtx = ensureAudioEngine();
        if (mainCtx && mainCtx.state === 'suspended') {
          try { await mainCtx.resume(); } catch {}
        }
      }

      if ((!mediaDestinationRef.current || mainCtx?.state === 'closed') && mainCtx) {
        mediaDestinationRef.current = mainCtx.createMediaStreamDestination();
      }

      if (mainCtx && mediaDestinationRef.current) {
        try {
          const osc = mainCtx.createOscillator();
          const gain = mainCtx.createGain();
          gain.gain.value = 0.00001;
          osc.connect(gain);
          gain.connect(mediaDestinationRef.current);
          osc.start();
          if ((window as any)._sermonCarrierOsc) {
            try { (window as any)._sermonCarrierOsc.stop(); } catch {}
          }
          (window as any)._sermonCarrierOsc = osc;
        } catch (oscErr) {
          console.warn('[SermonRecorder] Carrier osc init:', oscErr);
        }
      }

      const recordStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => recordStream.addTrack(track));

      if (mediaDestinationRef.current && mediaDestinationRef.current.stream) {
        mediaDestinationRef.current.stream.getAudioTracks().forEach(track => recordStream.addTrack(track));
      }

      const hasAudioTrack = recordStream.getAudioTracks().length > 0;

      // Determine best universal, lightweight MP4 codec
      let chosenMime = '';
      let chosenExt = 'mp4';
      if (hasAudioTrack && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
        chosenMime = 'video/mp4;codecs=avc1,mp4a.40.2';
        chosenExt = 'mp4';
      } else if (hasAudioTrack && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,aac')) {
        chosenMime = 'video/mp4;codecs=avc1,aac';
        chosenExt = 'mp4';
      } else if (hasAudioTrack && MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
        chosenMime = 'video/mp4;codecs=h264,aac';
        chosenExt = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        chosenMime = 'video/mp4;codecs=avc1';
        chosenExt = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        chosenMime = 'video/mp4;codecs=h264';
        chosenExt = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        chosenMime = 'video/mp4';
        chosenExt = 'mp4';
      } else if (hasAudioTrack && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        chosenMime = 'video/webm;codecs=vp8,opus';
        chosenExt = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        chosenMime = 'video/webm;codecs=vp8';
        chosenExt = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        chosenMime = 'video/webm';
        chosenExt = 'webm';
      }

      sermonMimeRef.current = chosenMime || 'video/mp4';
      sermonExtRef.current = chosenExt;
      sermonChunksRef.current = [];

      // If Android Native SAF target is selected, initialize the file on phone drive
      if (storageTarget && storageTarget.type === 'android_saf' && storageTarget.uri) {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const filename = `Sermon_${dateStr}.${chosenExt}`;
        const bridge = (window as any).BridgeAndroid;
        if (bridge && typeof bridge.createOutputFile === 'function') {
          try {
            const rawRes = bridge.createOutputFile(storageTarget.uri, filename, chosenMime || 'video/mp4');
            const res = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
            if (res && res.success && res.sessionId) {
              sermonAndroidSessionRef.current = {
                sessionId: res.sessionId,
                filename,
                fileUri: res.fileUri || ''
              };
              console.log('[SermonRecorder] Native Android SAF file created on phone drive:', filename, res.sessionId);
            }
          } catch (e) {
            console.warn('[SermonRecorder] Error creating SAF output file:', e);
          }
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 1_800_000, // 1.8 Mbps: lightweight, high quality
        audioBitsPerSecond: 128_000   // 128 kbps
      };
      if (chosenMime) {
        recorderOptions.mimeType = chosenMime;
      }

      const recorder = new MediaRecorder(recordStream, recorderOptions);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          sermonChunksRef.current.push(e.data);
          const session = sermonAndroidSessionRef.current;
          const bridge = (window as any).BridgeAndroid;
          if (session?.sessionId && bridge && typeof bridge.writeChunk === 'function') {
            try {
              const reader = new FileReader();
              reader.onloadend = () => {
                const res = reader.result as string;
                if (res) {
                  const commaIdx = res.indexOf(',');
                  const base64 = commaIdx >= 0 ? res.substring(commaIdx + 1) : res;
                  if (base64) {
                    bridge.writeChunk(session.sessionId, base64);
                  }
                }
              };
              reader.readAsDataURL(e.data);
            } catch (chunkErr) {
              console.warn('[SermonRecorder] Error streaming chunk to phone drive:', chunkErr);
            }
          }
        }
      };

      recorder.start(1000); // 1-second chunks
      sermonRecorderRef.current = recorder;
      return { success: true };
    } catch (err: any) {
      console.error('[SermonRecorder] Failed to start:', err);
      return { success: false, error: err.message || 'Failed to start recording' };
    }
  }, [drawFrame]);

  const stopSermonRecording = useCallback(async (): Promise<{ success: boolean; result?: SermonRecordResult; error?: string }> => {
    return new Promise((resolve) => {
      const recorder = sermonRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve({ success: false, error: 'No active recording session' });
        return;
      }

      recorder.onstop = async () => {
        const rawMime = sermonMimeRef.current || 'video/mp4';
        const ext = sermonExtRef.current || 'mp4';
        const mime = rawMime.startsWith('video/mp4') ? 'video/mp4' : rawMime;
        const blob = new Blob(sermonChunksRef.current, { type: mime });
        sermonChunksRef.current = [];
        sermonRecorderRef.current = null;

        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        let filename = `Sermon_${dateStr}.${ext}`;

        const androidSession = sermonAndroidSessionRef.current;
        sermonAndroidSessionRef.current = null;
        const bridge = (window as any).BridgeAndroid;

        if (androidSession?.sessionId && bridge && typeof bridge.closeOutputFile === 'function') {
          try {
            bridge.closeOutputFile(androidSession.sessionId);
            filename = androidSession.filename || filename;
            console.log(`[SermonRecorder] Successfully saved and closed video on phone drive: ${filename}`);
          } catch (closeErr) {
            console.warn('[SermonRecorder] Error closing SAF file:', closeErr);
          }
        } else {
          // Save directly to the user's selected directory handle on desktop
          const dirHandle = sermonDirHandleRef.current;
          if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
            try {
              const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              console.log(`[SermonRecorder] Saved directly to local folder: ${filename} (${blob.size} bytes)`);
            } catch (writeErr) {
              console.error('[SermonRecorder] Error writing to directory handle, falling back to download:', writeErr);
              // Fallback download if direct write encountered permission error
              try {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } catch {}
            }
          } else {
            // Standard browser download fallback
            try {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } catch {}
          }
        }

        const url = URL.createObjectURL(blob);
        const file = new File([blob], filename, { type: blob.type });

        resolve({
          success: true,
          result: {
            blob,
            filename,
            url,
            file,
            sizeBytes: blob.size
          }
        });
      };

      try {
        recorder.stop();
      } catch (stopErr: any) {
        resolve({ success: false, error: stopErr.message });
      }
    });
  }, []);

  const isSermonRecording = useCallback((): boolean => {
    return Boolean(sermonRecorderRef.current && sermonRecorderRef.current.state === 'recording');
  }, []);

  const pauseSermonRecording = useCallback((): boolean => {
    const recorder = sermonRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
        return true;
      } catch (err) {
        console.error('[SermonRecorder] Pause error:', err);
      }
    }
    return false;
  }, []);

  const resumeSermonRecording = useCallback((): boolean => {
    const recorder = sermonRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
        return true;
      } catch (err) {
        console.error('[SermonRecorder] Resume error:', err);
      }
    }
    return false;
  }, []);

  const getSermonRecordingState = useCallback((): 'IDLE' | 'RECORDING' | 'PAUSED' => {
    const recorder = sermonRecorderRef.current;
    if (!recorder) return 'IDLE';
    if (recorder.state === 'recording') return 'RECORDING';
    if (recorder.state === 'paused') return 'PAUSED';
    return 'IDLE';
  }, []);

  useImperativeHandle(ref, () => ({
    startBroadcast,
    stopBroadcast,
    getAudioContext: () => audioContextRef.current,
    getMediaDestination: () => mediaDestinationRef.current,
    takeSnapshot,
    connectMediaElementToAudio,
    triggerTransition: triggerCinematicTransition,
    startSermonRecording,
    pauseSermonRecording,
    resumeSermonRecording,
    stopSermonRecording,
    isSermonRecording,
    getSermonRecordingState,
    permitViewerRecording: (userId: string, canRecord: boolean) => {
      if (remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
        remotePhoneWsRef.current.send(JSON.stringify({
          type: 'FELLOWSHIP_PERMIT_RECORD',
          room: remoteCamRoomId,
          targetUserId: userId,
          canRecord
        }));
      }
    },
    toggleFellowshipChat: (enabled: boolean) => {
      if (remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
        remotePhoneWsRef.current.send(JSON.stringify({
          type: 'FELLOWSHIP_TOGGLE_CHAT',
          room: remoteCamRoomId,
          isChatEnabled: enabled
        }));
      }
    },
    sendFellowshipMessage: (msg: FellowshipMessage) => {
      if (remotePhoneWsRef.current?.readyState === WebSocket.OPEN) {
        remotePhoneWsRef.current.send(JSON.stringify({
          type: 'FELLOWSHIP_CHAT_MSG',
          room: remoteCamRoomId,
          message: msg
        }));
      }
    },
    getFellowshipRoomKey: () => remoteCamRoomId
  }), [startBroadcast, stopBroadcast, takeSnapshot, connectMediaElementToAudio, triggerCinematicTransition, startSermonRecording, pauseSermonRecording, resumeSermonRecording, stopSermonRecording, isSermonRecording, getSermonRecordingState, remoteCamRoomId]);

  const isFullScreenScripture = Boolean(canvasScriptureMode === 'full-screen' || lowerThird?.canvasViewMode === 'full-screen');
  const fullScreenScrollContainerRef = useRef<HTMLDivElement>(null);
  const isPreviewScrollingRef = useRef<boolean>(false);
  const previewScrollTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isFullScreenScripture) {
      if (isPreviewScrollingRef.current) return;
      const container = fullScreenScrollContainerRef.current;
      if (!container) return;

      // If verse 1 or no specific verse, scroll directly to top cleanly
      if (!lowerThird?.verse || lowerThird.verse <= 1) {
        container.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }

      const targetEl = document.getElementById(`canvas-fs-verse-${lowerThird.verse}`);
      if (targetEl) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop - 90;
        container.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
      }
    }
  }, [
    lowerThird?.verse,
    lowerThird?.displayMode,
    lowerThird?.book,
    lowerThird?.chapter,
    isFullScreenScripture
  ]);

  // Immediately snap to top on book or chapter transition
  useEffect(() => {
    if (fullScreenScrollContainerRef.current) {
      fullScreenScrollContainerRef.current.scrollTop = 0;
    }
  }, [lowerThird?.book, lowerThird?.chapter]);

  useEffect(() => {
    if (!lowerThird?.inlineContextRef && previewScrollRatio !== null && previewScrollRatio !== undefined && isFullScreenScripture && fullScreenScrollContainerRef.current) {
      const container = fullScreenScrollContainerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        isPreviewScrollingRef.current = true;
        if (previewScrollTimeoutRef.current) clearTimeout(previewScrollTimeoutRef.current);
        previewScrollTimeoutRef.current = setTimeout(() => {
          isPreviewScrollingRef.current = false;
        }, 300);

        container.scrollTop = previewScrollRatio * maxScroll;
      }
    }
  }, [previewScrollRatio, isFullScreenScripture, lowerThird?.inlineContextRef]);

  useEffect(() => {
    return () => {
      if (previewScrollTimeoutRef.current) {
        clearTimeout(previewScrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative w-full flex flex-col items-center ${themeTokens.stripBg.split(' ')[0]} p-2 sm:p-3`}>
      {/* Connection Error Notification Banner */}
      {streamState === 'ERROR' && (
        <div className="w-full flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-rose-950/90 border border-rose-500/70 rounded-xl mb-3 text-xs text-rose-100 shadow-lg gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] select-text">
            <span className="text-rose-400 font-bold text-sm">⚠️</span>
            <span className="font-semibold break-words">{statusMessage}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (statusMessage) {
                  try {
                    navigator.clipboard?.writeText(statusMessage);
                    setIsCopiedError(true);
                    setTimeout(() => setIsCopiedError(false), 2000);
                  } catch {}
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-sans text-[11px] font-bold border border-rose-700/50 transition-colors select-none"
              title="Copy error message"
            >
              {isCopiedError ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => updateStreamState('IDLE', 'Studio Standby')}
              className="px-2.5 py-1 rounded bg-rose-800/80 hover:bg-rose-700 text-white font-sans text-[11px] font-bold transition-colors select-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Status Bar Over Live Deck */}
      <div className={`w-full flex flex-wrap items-center justify-between px-2.5 sm:px-3 py-1.5 ${themeTokens.stripBg} backdrop-blur-md rounded-xl border mb-2 text-xs font-mono gap-1.5`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onBackToHome && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick(240, false);
                onBackToHome();
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer ${getTactileBtnClass(deckTheme, false)}`}
              title="Return to Main App"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className={`flex h-2.5 w-2.5 rounded-full ${
            streamState === 'LIVE'
              ? rtmpDeliveryStatus === 'INGESTING'
                ? 'bg-emerald-400 animate-pulse'
                : deckTheme === 'stealth'
                ? 'bg-emerald-400 animate-ping'
                : 'bg-rose-500 animate-ping'
              : streamState === 'CONNECTING'
                ? deckTheme === 'stealth'
                  ? 'bg-emerald-400 animate-pulse'
                  : deckTheme === 'crimson'
                  ? 'bg-rose-400 animate-pulse'
                  : 'bg-amber-400 animate-pulse'
                : deckTheme === 'stealth'
                ? 'bg-emerald-950'
                : deckTheme === 'crimson'
                ? 'bg-rose-950'
                : 'bg-zinc-500'
          }`} />
          <span className={`font-bold uppercase tracking-wider ${themeTokens.mutedText}`}>
            {isFullScreenScripture ? (streamState === 'LIVE' ? 'LIVE' : 'STANDBY') : streamState === 'LIVE' ? 'ON AIR' : streamState}
          </span>
          {streamState !== 'LIVE' && (
            <span className={`hidden sm:inline ${themeTokens.subtleText} font-sans`}>| {statusMessage}</span>
          )}
        </div>

        {/* Real-time Live Timer */}
        {streamState === 'LIVE' && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${themeTokens.stripBg} border text-xs font-mono font-bold text-[#faf6f0]`}>
            <span className={`w-2 h-2 rounded-full ${deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`} />
            <span className="tracking-widest">{formatLiveTimer(liveSeconds)}</span>
          </div>
        )}

        {/* Audio VU Peak Meter Indicator & Top Panel Collapse/Expand Toggle */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-[#faf6f0]" />
          <div className={`w-16 sm:w-20 h-2 rounded-full overflow-hidden flex ${
            deckTheme === 'stealth' ? 'bg-[#0a120c] border border-emerald-950' : deckTheme === 'crimson' ? 'bg-[#150a10] border border-rose-950' : 'bg-zinc-800'
          }`}>
            <div
              className={`h-full transition-all duration-75 ${
                deckTheme === 'stealth'
                  ? (vuMeterLevel > 80 ? 'bg-emerald-300' : vuMeterLevel > 50 ? 'bg-emerald-400' : 'bg-emerald-500')
                  : deckTheme === 'crimson'
                  ? (vuMeterLevel > 80 ? 'bg-rose-500' : vuMeterLevel > 50 ? 'bg-rose-400' : 'bg-emerald-400')
                  : (vuMeterLevel > 80 ? 'bg-rose-500' : vuMeterLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400')
              }`}
              style={{ width: `${vuMeterLevel}%` }}
            />
          </div>
          <span className={`text-[10px] ${themeTokens.subtleText}`}>{activeAspectRatio}</span>

          {/* Minimize Studio to Background Button (Beside Voice VU Meter) */}
          {onMinimize && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick(250, false);
                onMinimize();
              }}
              className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${getTactileBtnClass(deckTheme, false)}`}
              title="Minimize Live Studio to Background"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Studio Settings Trigger (Beside Voice VU Meter) */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick(300, true);
                onOpenSettings();
              }}
              className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${getTactileBtnClass(deckTheme, false)}`}
              title="Studio & Lower Third Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sleek Collapse/Expand Toggle for Top Panel Controls */}
          <button
            type="button"
            onClick={() => {
              playHardwareClick(280, !isTopPanelExpanded);
              setIsTopPanelExpanded(prev => !prev);
              if (isTopPanelExpanded) {
                setIsDeviceSheetOpen(null);
              }
            }}
            className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ml-0.5 ${getTactileBtnClass(deckTheme, isTopPanelExpanded, 'default')}`}
            title={isTopPanelExpanded ? "Collapse Top Control Panel" : "Expand Top Control Panel"}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isTopPanelExpanded ? 'rotate-180 text-white' : 'rotate-0 opacity-70'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── M3 Device & Resolution Selector Panel (Side-by-Side Horizontal Switcher) ── */}
      {isTopPanelExpanded && (
        <div className={`w-full flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 ${themeTokens.stripBg} rounded-xl border mb-2 text-xs select-none relative z-20 overflow-visible`}>
          {/* 3D Cylindrical Camera Roller Pill */}
          <CylinderDeviceRoller
            icon={<Video className="w-3.5 h-3.5 shrink-0" />}
            options={cameraRollOptions}
            selectedId={selectedVideoId}
            fallbackLabel={activeCameraLabel}
            deckTheme={deckTheme}
            themeTokens={themeTokens}
            onSelect={handleVideoDeviceChange}
            title="Video Camera Cylinder (Spin to Roll)"
          />

          {/* 3D Cylindrical Microphone Roller Pill */}
          <CylinderDeviceRoller
            icon={<Mic className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
            options={micRollOptions}
            selectedId={selectedAudioId}
            fallbackLabel={activeMicLabel}
            deckTheme={deckTheme}
            themeTokens={themeTokens}
            onSelect={handleAudioDeviceChange}
            title="Audio Microphone Cylinder (Spin to Roll)"
          />

          {/* Action Tools Group (QR, Projector, Photo, Minimize, Settings) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            {/* 📱 Wireless Phone Camera QR Button */}
            <button
              type="button"
              onClick={() => {
                playHardwareClick(320, true);
                setIsQrModalOpen(true);
              }}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl font-medium shrink-0 min-h-[38px] cursor-pointer ${getTactileBtnClass(deckTheme, connectedPhones.length > 0, 'emerald')}`}
              title="Connect Phone Camera wirelessly via QR Code"
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold whitespace-nowrap hidden md:inline">
                {connectedPhones.length > 0 ? `Phones (${connectedPhones.length})` : 'QR Phone'}
              </span>
              {connectedPhones.length > 0 ? (
                <span className={getTactileLedClass(deckTheme, true, 'emerald')} />
              ) : (
                <QrCode className="w-3.5 h-3.5 opacity-70 shrink-0" />
              )}
            </button>

            {/* External Projector Trigger Button */}
            {onToggleProjector && (
              <button
                type="button"
                onClick={() => {
                  playHardwareClick(isProjectorActive ? 260 : 360, !isProjectorActive);
                  onToggleProjector();
                }}
                className={`flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl font-medium shrink-0 min-h-[38px] cursor-pointer text-xs ${getTactileBtnClass(deckTheme, isProjectorActive, 'emerald')}`}
                title="External Projector Output (Multi-Screen Window Placement)"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isProjectorActive ? 'Projector ON' : 'Projector'}</span>
                {isProjectorActive && <span className={getTactileLedClass(deckTheme, true, 'emerald')} />}
              </button>
            )}

            {/* Photo Snapshot Button */}
            {onSnapshot && (
              <button
                type="button"
                onClick={() => {
                  playHardwareClick(400, false);
                  onSnapshot();
                }}
                className={`flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl shrink-0 min-h-[38px] cursor-pointer text-xs font-medium ${getTactileBtnClass(deckTheme, false)}`}
                title="Capture HD Photo Snapshot"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Photo</span>
              </button>
            )}

          </div>
        </div>
      )}

      {/* ── M3 Wireless Phone Camera QR Slide-Up Bottom Sheet (Confined below canvas line) ── */}
      {isQrModalOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col justify-end pointer-events-none">
          {/* Subtle click-outside backdrop that does NOT dim or blur the canvas */}
          <div
            onClick={() => setIsQrModalOpen(false)}
            className="fixed inset-0 pointer-events-auto bg-black/25 transition-opacity cursor-pointer"
          />
          <div
            style={{ animationDuration: '600ms' }}
            className={`relative pointer-events-auto w-full ${themeTokens.modalBg} border-t rounded-t-3xl shadow-2xl p-4 sm:p-5 text-[#faf6f0] flex flex-col gap-3 animate-in slide-in-from-bottom duration-[600ms] ease-out max-h-[44vh] overflow-y-auto no-scrollbar`}
          >
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-1 shrink-0" />

              {/* Modal Close Button */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className={`absolute top-3.5 right-3.5 sm:right-6 p-1.5 rounded-full ${themeTokens.stripBg} hover:bg-white/15 ${themeTokens.mutedText} hover:text-white border ${themeTokens.cardBorder} transition-colors cursor-pointer`}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header - Compact Icon + Title */}
              <div className="flex items-center gap-2.5 pr-8">
                <div className={`w-8 h-8 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder} ${themeTokens.accentText} flex items-center justify-center shadow shrink-0`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-tight truncate">
                    {connectedPhones.length > 0 ? `Add Phone Camera ${connectedPhones.length + 1}` : 'Connect Wireless Phone Camera'}
                  </h3>
                  <p className={`text-[11px] ${themeTokens.mutedText} truncate`}>
                    {connectedPhones.length > 0
                      ? `${connectedPhones.length} phone connected • Scan to add phone ${connectedPhones.length + 1}`
                      : 'Scan to add a camera without interrupting your stream'}
                  </p>
                </div>
              </div>

              {/* Body: Two-Column Compact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center pt-1">
                {/* Left Column: QR Code */}
                <div className="sm:col-span-5 flex justify-center">
                  <div className="p-2.5 bg-white rounded-2xl shadow-md flex items-center justify-center shrink-0">
                    {remoteCamUrl ? (
                      <QRCodeSVG value={remoteCamUrl} size={128} />
                    ) : (
                      <div className="w-[128px] h-[128px] flex items-center justify-center text-zinc-500 text-[10px]">
                        Generating QR...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Status, Direct URL, and Wi-Fi SSL note */}
                <div className="sm:col-span-7 flex flex-col gap-2">
                  {/* Connection Status Badge */}
                  <div className={`flex items-center justify-between py-1.5 px-3 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder} text-xs font-mono`}>
                    <span className={`text-[10px] ${themeTokens.subtleText} font-sans font-medium`}>Status:</span>
                    {remotePhoneStatus === 'WAITING' ? (
                      <span className={`flex items-center gap-1.5 font-semibold tracking-wider ${
                        deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full animate-ping ${
                          deckTheme === 'stealth' ? 'bg-emerald-400' : deckTheme === 'crimson' ? 'bg-rose-400' : 'bg-amber-400'
                        }`} />
                        PAIRING PHONE {connectedPhones.length + 1}...
                      </span>
                    ) : justConnectedPhone ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400 tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        PHONE {connectedPhones.length} CONNECTED!
                      </span>
                    ) : connectedPhones.length > 0 ? (
                      <span className={`flex items-center gap-1.5 font-semibold tracking-wider ${
                        deckTheme === 'stealth' ? 'text-emerald-300' : deckTheme === 'crimson' ? 'text-rose-300' : 'text-amber-300'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        READY FOR PHONE {connectedPhones.length + 1} ({connectedPhones.length} ACTIVE)
                      </span>
                    ) : remotePhoneStatus === 'CONNECTED' ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400 tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        CONNECTED {remotePhoneInfo?.resolution ? `(${remotePhoneInfo.resolution})` : ''}
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 ${themeTokens.mutedText} tracking-wider`}>
                        <span className={`w-2 h-2 rounded-full ${
                          deckTheme === 'stealth' ? 'bg-emerald-950' : deckTheme === 'crimson' ? 'bg-rose-950' : 'bg-zinc-500'
                        }`} />
                        SCAN TO PAIR
                      </span>
                    )}
                  </div>

                  {/* Direct Link Copy Button */}
                  <div className={`w-full flex items-center gap-1.5 ${themeTokens.inputBg} p-1.5 rounded-xl border ${themeTokens.cardBorder} text-xs`}>
                    <input
                      type="text"
                      readOnly
                      value={remoteCamUrl}
                      className="flex-1 bg-transparent text-zinc-400 font-mono text-[10px] focus:outline-none truncate select-all px-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (remoteCamUrl) {
                          navigator.clipboard.writeText(remoteCamUrl);
                          setIsCopiedQrUrl(true);
                          setTimeout(() => setIsCopiedQrUrl(false), 2000);
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                        deckTheme === 'stealth'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                          : deckTheme === 'crimson'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-white hover:bg-zinc-200 text-black'
                      }`}
                    >
                      {isCopiedQrUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Wi-Fi & SSL Guidance */}
                  <p className={`text-[10px] ${themeTokens.mutedText} leading-tight`}>
                    💡 Connect phone to same Wi-Fi. If prompted with <span className={themeTokens.accentText}>"Not Private"</span>, tap <span className="text-emerald-400 font-semibold">Advanced → Proceed</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual Canvas Viewport Wrapper (Mobile-First Scaling) */}
      <div
        ref={studioContainerRef}
        onClick={() => {
          if (!isWebcamActive || !isWebcamEnabled) {
            switchCamera(selectedVideoId || undefined);
          }
        }}
        className={`relative w-full flex items-center justify-center min-h-[220px] sm:min-h-[340px] md:min-h-[420px] max-h-[60vh] bg-black/50 rounded-xl overflow-hidden group ${
          !isWebcamActive || !isWebcamEnabled ? 'cursor-pointer' : ''
        }`}
      >
        {/* Hidden hardware video decoding element used strictly by canvas compositor */}
        <video
          ref={hiddenWebcamVideoRef}
          playsInline
          muted
          autoPlay
          className="fixed bottom-0 right-0 w-8 h-8 pointer-events-none opacity-20 z-0 overflow-hidden"
        />

        {/* 16:9 Landscape Canvas */}
        <canvas
          ref={canvas169Ref}
          width={1920}
          height={1080}
          className={`relative z-10 w-full max-w-full h-auto object-contain rounded-lg pointer-events-none ${activeAspectRatio === '16:9' ? 'block' : 'hidden'
            }`}
          style={{ aspectRatio: '16/9' }}
        />

        {/* 9:16 Portrait Canvas */}
        <canvas
          ref={canvas916Ref}
          width={1080}
          height={1920}
          onClick={handleCanvas916Click}
          className={`relative z-10 h-full max-h-[55vh] w-auto object-contain rounded-lg pointer-events-auto cursor-pointer ${activeAspectRatio === '9:16' ? 'block' : 'hidden'
            }`}
          style={{ aspectRatio: '9/16' }}
        />

        {/* Full Screen Scripture View (Matches Main Read / Study View Tab in Light/Dark Mode) */}
        {(canvasScriptureMode === 'full-screen' || lowerThird?.canvasViewMode === 'full-screen' || isFullScreenScripture) && isLowerThirdVisible && lowerThird && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-0 z-20 flex flex-col transition-colors duration-300 overflow-hidden w-full h-full ${
              (theme === 'light' || lowerThird.theme === 'light') ? 'bg-white text-zinc-900' : `${themeTokens.chassisBg.split(' ')[0]} text-neutral-100`
            }`}
          >
            {/* Top Header: Book & Chapter + Theme-Pure Library Icon */}
            <div className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between border-b shrink-0 ${
              (theme === 'light' || lowerThird.theme === 'light') ? 'bg-white/95 border-zinc-200 text-zinc-800' : `${themeTokens.stripBg} ${themeTokens.cardBorder} text-[#faf6f0]`
            }`}>
              <div className="text-base sm:text-lg font-serif font-bold tracking-tight">
                {lowerThird.book} {lowerThird.chapter}
              </div>
              <div className="flex items-center gap-1 select-none" title="Library">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5v-14A1.5 1.5 0 0 1 5.5 4H7v15.5H5.5A1.5 1.5 0 0 0 4 19.5z" fill={deckTheme === 'stealth' ? '#34d399' : deckTheme === 'crimson' ? '#f43f5e' : '#f59e0b'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M8 19.5v-15A1.5 1.5 0 0 1 9.5 3H11v16.5H9.5A1.5 1.5 0 0 0 8 19.5z" fill={deckTheme === 'stealth' ? '#10b981' : deckTheme === 'crimson' ? '#10b981' : '#2563eb'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M12 19.5v-14A1.5 1.5 0 0 1 13.5 4H15v15.5h-1.5A1.5 1.5 0 0 0 12 19.5z" fill={deckTheme === 'stealth' ? '#059669' : deckTheme === 'crimson' ? '#e11d48' : '#ef4444'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M16 19.5l2-13.5A1.5 1.5 0 0 1 19.5 4.5l1.5.2-2 14.8h-1.5A1.5 1.5 0 0 0 16 19.5z" fill={deckTheme === 'stealth' ? '#047857' : deckTheme === 'crimson' ? '#059669' : '#16a34a'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <line x1="3" y1="21.5" x2="21" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={(theme === 'light' || lowerThird.theme === 'light') ? 'text-slate-400' : 'text-slate-500'} />
                </svg>
              </div>
            </div>

            {/* Scrollable Verse List (Controlled exclusively from lower preview panel) */}
            <div
              ref={fullScreenScrollContainerRef}
              className={`flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 no-scrollbar pointer-events-none select-none ${
                lowerThird.displayMode === 'standard' ? '' : `space-y-4 divide-y ${(theme === 'light' || lowerThird.theme === 'light') ? 'divide-zinc-200/80' : 'divide-zinc-800/80'}`
              }`}
            >
              {lowerThird.displayMode === 'standard' ? (
                /* ── STANDARD KJV PERICOPE STORY MODE (EXACT MATCH) ── */
                <div className={`space-y-3.5 text-left leading-[1.8] tracking-[0.01em] ${
                  (theme === 'light' || lowerThird.theme === 'light') ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  <div className="text-left leading-[1.8] tracking-[0.01em]">
                    {(() => {
                      const allRawVerses = lowerThird.allVerses && lowerThird.allVerses.length > 0 ? lowerThird.allVerses : [
                        { verseNumber: lowerThird.verse || 1, kjvText: lowerThird.text || '' }
                      ];
                      const domChunks = groupVersesByStory(allRawVerses, lowerThird.book || '', lowerThird.chapter || 1);
                      return domChunks.map((chunk, chunkIdx) => (
                        <div key={`dom-chunk-${chunkIdx}`} className="space-y-2.5 mb-5">
                          <div className="text-left leading-[1.8] tracking-[0.01em]">
                            {chunk.map((vItem: any) => {
                              const textContent = (vItem.kjvText || '').trim();
                              const rawTokens = parseKjvRawTokens(textContent);
                              const isSelected = vItem.verseNumber === (lowerThird.verse || 1);
                              const hasAttachedCrossRef = isSelected && lowerThird.isCrossRefOpen !== false && lowerThird.attachedCrossRefs && lowerThird.attachedCrossRefs.length > 0;
                              
                              return (
                                <React.Fragment key={`para-full-${vItem.verseNumber}`}>
                                  <span
                                    id={`canvas-fs-verse-${vItem.verseNumber}`}
                                    className="inline relative transition-all duration-150 select-none px-1 py-0.5 rounded"
                                  >
                                    <sup className="font-sans font-bold text-[0.6em] md:text-[0.65em] opacity-60 align-super select-none leading-none -top-[0.25em] mr-0.5 tracking-tight">
                                      {vItem.verseNumber}
                                    </sup>
                                    {rawTokens.map((t) => (
                                      <span
                                        key={t.rawIdx}
                                        className={`${getCssScriptureFontClass(activeTypeface)} ${
                                          t.isSupplied ? 'italic font-normal opacity-90' : (activeIsBold ? 'font-bold' : '')
                                        } text-lg sm:text-xl md:text-[21px]`}
                                        title={t.isSupplied ? 'Supplied word (added by KJV translators, not in original manuscript)' : undefined}
                                      >
                                        {t.text}
                                      </span>
                                    ))}
                                    {' '}
                                  </span>
                                  {hasAttachedCrossRef && lowerThird.attachedCrossRefs?.map((cr) => (
                                    lowerThird.inlineContextRef === cr.ref ? (
                                      <div key={cr.ref} className="my-3 text-left animate-fade-in pointer-events-auto">
                                        <InlineParagraphContext
                                          reference={lowerThird.inlineContextRef}
                                          theme={theme === 'light' || lowerThird.theme === 'light' ? 'light' : 'dark'}
                                          onCollapse={() => {}}
                                          onOpenInMainReader={() => {}}
                                          externalScrollRatio={previewScrollRatio}
                                          isBroadcastCanvas={true}
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        key={cr.ref}
                                        className={`my-3 p-3 sm:p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in text-left select-none ${
                                          (theme === 'light' || lowerThird.theme === 'light')
                                            ? 'bg-zinc-100/95 border-zinc-300 text-zinc-900'
                                            : 'bg-black/80 border-white/10 text-[#faf6f0]'
                                        }`}
                                      >
                                        <div className={`w-1.5 self-stretch rounded-full shrink-0 ${
                                          (theme === 'light' || lowerThird.theme === 'light') ? 'bg-zinc-500' : 'bg-zinc-400'
                                        }`} />
                                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className={`text-sm sm:text-base font-bold ${getCssScriptureFontClass(activeTypeface)} tracking-tight`}>
                                                {cr.ref}
                                              </span>
                                              <span className={`text-[9px] sm:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold tracking-wider ${
                                                (theme === 'light' || lowerThird.theme === 'light')
                                                  ? 'bg-zinc-200 text-zinc-800'
                                                  : 'bg-zinc-800 text-zinc-300'
                                              }`}>
                                                Cross-Reference
                                              </span>
                                            </div>
                                            <div className={`p-1 rounded-md shrink-0 transition-colors ${
                                              (theme === 'light' || lowerThird.theme === 'light')
                                                ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                            }`}>
                                              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </div>
                                          </div>
                                          <div className={`${getCssScriptureFontClass(activeTypeface)} text-base sm:text-lg md:text-xl leading-relaxed italic opacity-95`}>
                                            "{cr.text}"
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                /* ── THEOLOGICAL STUDY VIEW (EXACT MATCH) ── */
                (lowerThird.allVerses && lowerThird.allVerses.length > 0 ? lowerThird.allVerses : [
                  {
                    verseNumber: lowerThird.verse || 1,
                    kjvText: lowerThird.text || '',
                    manuscriptText: lowerThird.manuscriptText || '',
                    interlinearWords: lowerThird.interlinearWords || []
                  }
                ]).map((vItem: any) => {
                  const isSelectedVerse = vItem.verseNumber === (lowerThird.verse || 1);
                  const interVerse = lowerThird.allInterlinearVerses?.[vItem.verseNumber];
                  const words = interVerse?.words || vItem.interlinearWords || (isSelectedVerse ? lowerThird.interlinearWords : []) || [];
                  const fullText = (vItem.kjvText || '').trim();
                  const msText = (interVerse?.manuscriptText || vItem.manuscriptText || (isSelectedVerse ? lowerThird.manuscriptText : '') || '').trim();
  
                  // Find active manuscript word index for live clustering
                  let activeWordIdx = -1;
                  const selectedWord = isSelectedVerse ? lowerThird.selectedWord : null;
                  if (selectedWord && words.length > 0) {
                    activeWordIdx = words.findIndex(
                      (w: any) => (selectedWord.strongsNumber && w.n === selectedWord.strongsNumber) ||
                                  (selectedWord.originalValue && (w.w === selectedWord.originalValue || w.tr === selectedWord.originalValue)) ||
                                  (selectedWord.word && (w.t === selectedWord.word || w.w === selectedWord.word))
                    );
                    if (activeWordIdx === -1) activeWordIdx = 0;
                  }
  
                  const matchedKjvIndices = (activeWordIdx >= 0 && fullText && words.length > 0)
                    ? getMatchedKjvTokenIndices(words, activeWordIdx, fullText)
                    : new Set<number>();
                  const kjvTokens = fullText ? parseKjvRawTokens(fullText) : [];
  
                  return (
                    <div
                      key={vItem.verseNumber}
                      id={`canvas-fs-verse-${vItem.verseNumber}`}
                      className="pt-3.5 first:pt-0 pb-1.5 flex flex-col gap-2 relative pointer-events-none select-none"
                    >
                      {/* ── Line 1: Stationary Verse Indicator + Unified Pill + Grammatical Parsing Tag ── */}
                      <div className="flex items-center justify-between gap-2 min-h-[28px]">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* Stationary Verse Badge */}
                          <span className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center font-mono select-none shrink-0 ${
                            (theme === 'light' || lowerThird.theme === 'light')
                              ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                              : 'bg-white/10 text-white border border-white/10'
                          }`}>
                            {vItem.verseNumber}
                          </span>

                          {/* Strong's Code + Theological Root Action (Borderless Typography) */}
                          {isSelectedVerse && (
                            <div className="inline-flex items-center gap-2 max-w-[280px] sm:max-w-[420px] md:max-w-[500px] py-0.5 transition-all overflow-hidden">
                              {/* Strong's Code Segment */}
                              <span className={`font-mono font-bold text-xs sm:text-[12px] tracking-tight shrink-0 flex items-center gap-0.5 ${
                                (theme === 'light' || lowerThird.theme === 'light') ? 'text-[#1e40af]' : themeTokens.highlightText
                              }`}>
                                {selectedWord?.strongsNumber || words[0]?.n || 'G3056'}
                              </span>

                              {/* Dot separator */}
                              <span className="text-zinc-300 dark:text-zinc-700 select-none text-[11px] shrink-0">•</span>

                              {/* Root Action Segment with • Nuance Separators */}
                              <div
                                ref={(el) => {
                                  if (el && selectedWord?.scrollRatio != null) {
                                    const maxScroll = el.scrollWidth - el.clientWidth;
                                    if (maxScroll > 0) {
                                      el.scrollLeft = selectedWord.scrollRatio * maxScroll;
                                    }
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[13.5px] sm:text-[14.5px] select-none flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden antialiased"
                              >
                                {selectedWord?.rootMeaning && selectedWord.rootMeaning.includes('•') ? (
                                  <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
                                    {selectedWord.rootMeaning.split('•').map((item: string, i: number) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <span className="text-zinc-400 dark:text-zinc-500 font-bold mx-0.5 text-xs select-none">•</span>}
                                        <span className={`${getCssScriptureFontClass(activeTypeface)} font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${
                                          (theme === 'light' || lowerThird.theme === 'light') ? 'text-[#1e40af]' : themeTokens.highlightText
                                        }`}>
                                          {item.trim()}
                                        </span>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                ) : (
                                  <span className={`${getCssScriptureFontClass(activeTypeface)} font-bold text-[13.5px] sm:text-[14.5px] whitespace-nowrap ${
                                    (theme === 'light' || lowerThird.theme === 'light') ? 'text-[#1e40af]' : themeTokens.highlightText
                                  }`}>
                                    {selectedWord?.rootMeaning || 'Divine Purpose • Sovereign Action'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Grammatical Parsing Tag Badge */}
                        {isSelectedVerse && (
                          <span className={`font-mono text-xs font-black px-2 py-0.5 rounded border shrink-0 shadow-2xs ${
                            (theme === 'light' || lowerThird.theme === 'light')
                              ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                              : themeTokens.pillBg
                          }`}>
                            {selectedWord?.parsingTag || words[0]?.p || 'V-PAI-3S'}
                          </span>
                        )}
                      </div>

                      {/* ── Line 2: Flowing Original Manuscript / Transliterated Words ── */}
                      {words.length > 0 ? (
                        <div dir="ltr" className={`${getCssScriptureFontClass(activeTypeface)} ${activeIsBold ? 'font-black' : 'font-bold'} text-xl sm:text-2xl leading-relaxed tracking-wide flex flex-wrap gap-x-2.5 sm:gap-x-3 gap-y-1.5 pt-0.5 select-none text-left ${
                          (theme === 'light' || lowerThird.theme === 'light') ? 'text-neutral-900' : 'text-[#faf6f0]'
                        }`}>
                          {words.map((w: any, wIdx: number) => {
                            const isWordActive = isSelectedVerse && activeWordIdx === wIdx;
                            const displayWord = w.tr || getWordTransliteration(w.w, lowerThird.language || 'Greek');
                            return (
                              <span
                                key={`w-${vItem.verseNumber}-${wIdx}`}
                                className={`select-none transition-colors ${
                                  isWordActive
                                    ? (theme === 'light' || lowerThird.theme === 'light'
                                        ? 'text-[#1e40af] font-black'
                                        : `${themeTokens.highlightText} font-black`)
                                    : (theme === 'light' || lowerThird.theme === 'light')
                                      ? 'text-neutral-900'
                                      : 'text-[#faf6f0]'
                                }`}
                              >
                                {displayWord}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`${getCssScriptureFontClass(activeTypeface)} ${activeIsBold ? 'font-bold' : ''} text-xl sm:text-2xl leading-relaxed pt-0.5 ${
                          (theme === 'light' || lowerThird.theme === 'light') ? 'text-slate-900' : 'text-[#faf6f0]'
                        }`}>
                          {msText || <span className="opacity-50 text-xs font-sans">[Loading text...]</span>}
                        </div>
                      )}

                      {/* ── Line 3: Contextual English (KJV) Translation with Synchronized Word Clustering ── */}
                      <div className={`pt-2 mt-0.5 border-t ${getCssScriptureFontClass(activeTypeface)} ${activeIsBold ? 'font-bold' : ''} text-lg sm:text-xl leading-relaxed select-none ${
                        (theme === 'light' || lowerThird.theme === 'light')
                          ? 'border-neutral-200 text-slate-800'
                          : `${themeTokens.cardBorder} text-zinc-300`
                      }`}>
                        "{kjvTokens.map((tok: any, tIdx: number) => {
                          const isM = matchedKjvIndices.has(tIdx);
                          const isSupplied = tok.isSupplied;
                          return (
                            <span
                              key={tIdx}
                              className={`transition-colors duration-150 ${
                                isM
                                  ? (theme === 'light' || lowerThird.theme === 'light'
                                      ? 'text-[#1e40af] font-bold'
                                      : `${themeTokens.highlightText} font-bold`)
                                  : isSupplied
                                    ? 'italic font-normal opacity-75 text-[#a89b8c]'
                                    : ''
                              }`}
                            >
                              {tok.text}
                            </span>
                          );
                        })}"
                      </div>

                      {/* Attached Cross-Reference Card if present on active verse */}
                      {isSelectedVerse && lowerThird.isCrossRefOpen !== false && lowerThird.attachedCrossRefs && lowerThird.attachedCrossRefs.length > 0 && (
                        <div className="flex flex-col gap-2 pt-1 pb-1">
                          {lowerThird.attachedCrossRefs.map((cr) => (
                            lowerThird.inlineContextRef === cr.ref ? (
                              <div key={cr.ref} className="text-left animate-fade-in pointer-events-auto">
                                <InlineParagraphContext
                                  reference={lowerThird.inlineContextRef}
                                  theme={theme === 'light' || lowerThird.theme === 'light' ? 'light' : 'dark'}
                                  onCollapse={() => {}}
                                  onOpenInMainReader={() => {}}
                                  externalScrollRatio={previewScrollRatio}
                                  isBroadcastCanvas={true}
                                />
                              </div>
                            ) : (
                              <div
                                key={cr.ref}
                                className={`p-3 sm:p-3.5 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in text-left select-none ${
                                  (theme === 'light' || lowerThird.theme === 'light')
                                    ? 'bg-zinc-100/95 border-zinc-300 text-zinc-900'
                                    : 'bg-black/80 border-white/10 text-[#faf6f0]'
                                }`}
                              >
                                <div className={`w-1 self-stretch rounded-full shrink-0 ${
                                  (theme === 'light' || lowerThird.theme === 'light') ? 'bg-zinc-500' : 'bg-zinc-400'
                                }`} />
                                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs sm:text-sm font-bold font-serif tracking-tight">
                                        {cr.ref}
                                      </span>
                                      <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded font-bold tracking-wider ${
                                        (theme === 'light' || lowerThird.theme === 'light')
                                          ? 'bg-zinc-200 text-zinc-800'
                                          : 'bg-zinc-800 text-zinc-300'
                                      }`}>
                                        Cross-Reference
                                      </span>
                                    </div>
                                    <div className={`p-1 rounded-md shrink-0 transition-colors ${
                                      (theme === 'light' || lowerThird.theme === 'light')
                                        ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                    }`}>
                                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </div>
                                  </div>
                                  <div className="font-serif text-sm sm:text-base leading-relaxed italic opacity-95">
                                    "{cr.text}"
                                  </div>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Host Camera Picture-in-Picture floating tile */}
            {isFullScreenPipEffective && isWebcamActive && isWebcamEnabled && (
              <div className="absolute bottom-0 right-0 z-30 w-44 sm:w-56 aspect-video rounded-tl-2xl overflow-hidden border-t-2 border-l-2 border-white/20 shadow-2xl bg-black pointer-events-none">
                <video
                  ref={(el) => {
                    if (el && webcamStreamRef.current && el.srcObject !== webcamStreamRef.current) {
                      el.srcObject = webcamStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              </div>
            )}
          </div>
        )}


      </div>

      {/* ── M3 Multi-View Live Camera Preview Switcher Dock (PVW / PGM) ── */}
      <div className={`w-full px-2 sm:px-3 py-2 ${themeTokens.stripBg} border-t flex items-center justify-between gap-2 overflow-x-auto no-scrollbar select-none`}>
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* 1. Inbuilt Camera Live Preview Thumbnail Card */}
          <button
            type="button"
            onClick={() => {
              triggerCinematicTransition();
              if (layoutMode === 'MEDIA_ONLY' && onLayoutModeChange) {
                onLayoutModeChange('WEBCAM');
              }
              handleVideoDeviceChange(currentFacingModeRef.current === 'environment' ? 'facing-environment' : 'facing-user');
            }}
            className={`relative group rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-0.5 ${
              !isPhoneSelected && layoutMode !== 'MEDIA_ONLY'
                ? `ring-2 ${deckTheme === 'stealth' ? 'ring-emerald-400' : deckTheme === 'crimson' ? 'ring-rose-500' : 'ring-white'} shadow-md shadow-black/40 scale-[1.02]`
                : `ring-1 ${themeTokens.cardBorder} opacity-80 hover:opacity-100`
            }`}
            style={{ width: '80px', height: '48px' }}
            title="Switch to Inbuilt Camera"
          >
            <video
              ref={inbuiltPreviewVideoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover rounded-lg bg-black/60 pointer-events-none"
            />
            {/* On-Air / Preview Pill */}
            <div className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[7.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-md ${
              !isPhoneSelected && layoutMode !== 'MEDIA_ONLY' && !isFullScreenScripture
                ? `${themeTokens.stripBg} ${themeTokens.accentText} border ${themeTokens.cardBorder}`
                : `bg-black/70 ${themeTokens.mutedText}`
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                !isPhoneSelected && layoutMode !== 'MEDIA_ONLY' && !isFullScreenScripture
                  ? (deckTheme === 'crimson' ? 'bg-rose-500' : 'bg-emerald-400')
                  : (deckTheme === 'stealth' ? 'bg-emerald-950' : deckTheme === 'crimson' ? 'bg-rose-950' : 'bg-zinc-400')
              }`} />
              <span>{!isPhoneSelected && layoutMode !== 'MEDIA_ONLY' && !isFullScreenScripture ? 'PGM' : 'PVW'}</span>
            </div>
            {/* Micro Label */}
            <div className="absolute bottom-0.5 inset-x-0.5 text-center bg-black/60 backdrop-blur-sm rounded py-0.2 text-[8px] font-bold text-[#faf6f0] truncate px-0.5">
              {currentFacingMode === 'user' ? 'Front' : 'Main'}
            </div>
          </button>

          {/* 2. Dynamic Connected Phone Camera Previews (Supports up to 2-3 phones concurrently) */}
          {connectedPhones.map((phone, idx) => {
            const isThisPhoneOnAir = (selectedVideoId === phone.phoneId || (selectedVideoId === 'remote-phone-cam' && idx === 0)) && layoutMode !== 'MEDIA_ONLY';
            return (
              <button
                key={phone.phoneId}
                type="button"
                onClick={() => {
                  triggerCinematicTransition();
                  if (layoutMode === 'MEDIA_ONLY' && onLayoutModeChange) {
                    onLayoutModeChange('WEBCAM');
                  }
                  handleVideoDeviceChange(phone.phoneId);
                }}
                className={`relative group rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-0.5 ${
                  isThisPhoneOnAir
                    ? `ring-2 ${deckTheme === 'stealth' ? 'ring-emerald-400' : deckTheme === 'crimson' ? 'ring-rose-500' : 'ring-white'} shadow-md shadow-black/40 scale-[1.02]`
                    : `ring-1 ${themeTokens.cardBorder} opacity-80 hover:opacity-100`
                }`}
                style={{ width: '80px', height: '48px' }}
                title={`Switch to ${phone.deviceName || `Phone ${idx + 1}`}`}
              >
                <video
                  ref={(el) => {
                    if (el) {
                      phoneVideoRefs.current.set(phone.phoneId, el);
                      const stream = phoneStreamsRef.current.get(phone.phoneId);
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch(() => {});
                      }
                    }
                  }}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover rounded-lg bg-black/60 pointer-events-none"
                />
                <div className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[7.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-md ${
                  phoneStandbyMap[phone.phoneId]
                    ? (deckTheme === 'stealth' ? 'bg-emerald-950/90 text-emerald-300' : deckTheme === 'crimson' ? 'bg-rose-950/90 text-rose-300' : 'bg-amber-900/90 text-amber-200')
                    : isThisPhoneOnAir && !isFullScreenScripture
                      ? `${themeTokens.stripBg} ${themeTokens.accentText} border ${themeTokens.cardBorder}`
                      : `bg-black/70 ${themeTokens.mutedText}`
                }`}>
                  <span className={`w-1 h-1 rounded-full ${
                    phoneStandbyMap[phone.phoneId]
                      ? (deckTheme === 'stealth' ? 'bg-emerald-400 animate-ping' : deckTheme === 'crimson' ? 'bg-rose-400 animate-ping' : 'bg-amber-400 animate-ping')
                      : isThisPhoneOnAir && !isFullScreenScripture
                      ? (deckTheme === 'crimson' ? 'bg-rose-500' : 'bg-emerald-400')
                      : (deckTheme === 'stealth' ? 'bg-emerald-950' : deckTheme === 'crimson' ? 'bg-rose-950' : 'bg-zinc-400')
                  }`} />
                  <span>{phoneStandbyMap[phone.phoneId] ? 'STANDBY' : isThisPhoneOnAir && !isFullScreenScripture ? 'PGM' : 'PVW'}</span>
                </div>
                <div className="absolute bottom-0.5 inset-x-0.5 text-center bg-black/60 backdrop-blur-sm rounded py-0.2 text-[8px] font-bold text-[#faf6f0] truncate px-0.5">
                  {phone.deviceName ? phone.deviceName.replace(/^(Galaxy|iPhone|Pixel)\s*/i, '') : `Phone ${idx + 1}`}
                </div>
              </button>
            );
          })}

          {/* 3. + Add Phone / QR Phone Card (Shown when fewer than 3 phones are connected) */}
          {connectedPhones.length < 3 && (
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className={`relative group rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-0.5 ring-1 ${themeTokens.cardBorder} opacity-80 hover:opacity-100`}
              style={{ width: '80px', height: '48px' }}
              title="Connect Additional Phone via QR Code"
            >
              <div className={`w-full h-full rounded-lg ${themeTokens.stripBg} border border-dashed ${themeTokens.cardBorder} flex flex-col items-center justify-center gap-0.5 text-[#dcd3c6] hover:text-[#faf6f0]`}>
                <div className="flex items-center gap-0.5">
                  <Smartphone className="w-3 h-3 text-[#dcd3c6]" />
                  <span className={`text-[9px] font-black ${themeTokens.accentText}`}>+</span>
                </div>
                <span className="text-[7.5px] font-bold tracking-tight">
                  {connectedPhones.length === 0 ? 'QR Phone' : '+ Phone'}
                </span>
              </div>
            </button>
          )}

          {/* 4. Media Video Preview Card */}
          {mediaVideoRef.current && (
            <button
              type="button"
              onClick={() => {
                triggerCinematicTransition();
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  audioContextRef.current.resume().catch(() => {});
                }
                if (onLayoutModeChange) {
                  const nextMode = layoutMode === 'MEDIA_ONLY' ? 'WEBCAM' : 'MEDIA_ONLY';
                  onLayoutModeChange(nextMode);
                }
              }}
              className={`relative group rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-0.5 ${
                layoutMode === 'MEDIA_ONLY'
                  ? `ring-2 ${deckTheme === 'stealth' ? 'ring-emerald-400' : deckTheme === 'crimson' ? 'ring-rose-500' : 'ring-white'} shadow-md shadow-black/40 scale-[1.02]`
                  : `ring-1 ${themeTokens.cardBorder} opacity-80 hover:opacity-100`
              }`}
              style={{ width: '80px', height: '48px' }}
              title={layoutMode === 'MEDIA_ONLY' ? 'Media is ON AIR (Tap to switch to Camera)' : 'Tap to switch Media to ON AIR'}
            >
              <canvas
                ref={mediaPreviewCanvasRef}
                width={160}
                height={96}
                className="w-full h-full object-cover rounded-lg bg-black/60 pointer-events-none"
              />
              <div className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[7.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-md ${
                layoutMode === 'MEDIA_ONLY' && !isFullScreenScripture ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-black/60 text-[#dcd3c6]'
              }`}>
                <span className={`w-1 h-1 rounded-full ${
                  layoutMode === 'MEDIA_ONLY' && !isFullScreenScripture ? 'bg-emerald-400' : 'bg-zinc-400'
                }`} />
                <span>{layoutMode === 'MEDIA_ONLY' && !isFullScreenScripture ? 'PGM' : 'PVW'}</span>
              </div>
              <div className="absolute bottom-0.5 inset-x-0.5 text-center bg-black/60 backdrop-blur-sm rounded py-0.2 text-[8px] font-bold text-[#faf6f0] truncate px-0.5">
                Media
              </div>
            </button>
          )}
        </div>

        {/* Zoom, Flip & QR Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Lens Stepper (.5x / 1x / 2x) */}
          {isWebcamActive && isWebcamEnabled && layoutMode !== 'MEDIA_ONLY' && (
            <div className={`flex items-center ${themeTokens.stripBg} rounded-xl border p-0.5 gap-0.5`}>
              {[0.5, 1, 2].map((lens) => {
                const isActive = Math.abs(cameraZoom - lens) < 0.15;
                return (
                  <button
                    key={lens}
                    type="button"
                    onClick={() => {
                      playHardwareClick(280, isActive);
                      handleSelectLens(lens);
                    }}
                    className={`px-1.5 py-1 rounded-lg text-[9px] font-mono font-bold cursor-pointer min-h-[28px] ${getTactileBtnClass(deckTheme, isActive, 'default')}`}
                    title={`${lens}x Zoom`}
                  >
                    {lens === 0.5 ? '.5x' : `${lens}x`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Flip Camera Button */}
          <button
            type="button"
            onClick={() => {
              playHardwareClick(320, false);
              handleFlipCamera();
            }}
            className={`p-1.5 sm:px-2 rounded-xl cursor-pointer min-h-[34px] flex items-center gap-1 ${getTactileBtnClass(deckTheme, false)}`}
            title={`Flip Camera (Currently: ${currentFacingMode === 'user' ? 'Front' : 'Back'})`}
          >
            <RefreshCw className="w-3.5 h-3.5 opacity-80" />
            <span className="text-[10px] font-mono font-bold hidden sm:inline">{currentFacingMode === 'user' ? 'Front' : 'Back'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playHardwareClick(320, true);
              setIsQrModalOpen(true);
            }}
            className={`p-1.5 sm:px-2 rounded-xl cursor-pointer min-h-[34px] flex items-center gap-1 ${getTactileBtnClass(deckTheme, false)}`}
            title="Open QR Code to Connect Phone Camera"
          >
            <QrCode className="w-3.5 h-3.5 opacity-80" />
            <span className="text-[10px] font-mono font-bold hidden sm:inline">QR</span>
          </button>

          {/* Fullscreen Toggle Button in Dock (Unobstructed Canvas) */}
          <button
            type="button"
            onClick={() => {
              playHardwareClick(300, !isFullscreen);
              toggleFullscreen();
            }}
            className={`p-1.5 sm:px-2 rounded-xl cursor-pointer min-h-[34px] flex items-center gap-1 ${getTactileBtnClass(deckTheme, isFullscreen, 'default')}`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 opacity-80" /> : <Maximize2 className="w-3.5 h-3.5 opacity-80" />}
          </button>
        </div>
      </div>
    </div>
  );
});

DualCanvasCompositor.displayName = 'DualCanvasCompositor';
