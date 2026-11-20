import React, { useState } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Disc,
  Layers,
  Volume2,
  VolumeX,
  PlayCircle,
  StopCircle,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Sliders,
  Tv,
  BookOpen,
  Film,
  Play,
  Pause,
  Square,
  Repeat,
  Layout,
  Maximize2,
  Type,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  Trash2,
  UploadCloud,
  Minus,
  Plus,
  Check,
  Sparkle
} from 'lucide-react';
import {
  StudioDeckTheme,
  useStudioDeckTheme,
  getTactileBtnClass,
  getTactileLedClass,
  playHardwareClick,
  getStudioThemeTokens
} from './tactileTheme';

interface TactileDeckPreviewProps {
  onClose?: () => void;
}

export const TactileDeckPreview: React.FC<TactileDeckPreviewProps> = ({ onClose }) => {
  // ── Aesthetic Theme (Obsidian Slate, Stealth Titanium, Midnight Crimson) ──
  const [theme, setTheme] = useStudioDeckTheme();
  const themeTokens = getStudioThemeTokens(theme);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pressCount, setPressCount] = useState(0);

  // ── Tab Navigation (Real Studio Tabs) ──
  const [activeTab, setActiveTab] = useState<'bible' | 'media' | 'voice' | 'stream'>('bible');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // ── Top Bar Controls ──
  const [activeAspectRatio, setActiveAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [sermonState, setSermonState] = useState<'IDLE' | 'ARMED' | 'RECORDING' | 'PAUSED'>('IDLE');

  // ── Bible Tab Controls ──
  const [selectedBook, setSelectedBook] = useState('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [lowerThirdBgColor, setLowerThirdBgColor] = useState<'black' | 'white' | 'midnight' | 'angular-chyron' | 'royal-diamond'>('black');
  const [scriptureViewMode, setScriptureViewMode] = useState<'lower-third' | 'full-screen'>('lower-third');
  const [isFullScreenPip, setIsFullScreenPip] = useState(false);
  const [studyMode, setStudyMode] = useState<'standard' | 'interlinear'>('standard');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLowerThirdVisible, setIsLowerThirdVisible] = useState(true);

  // ── Media Tab Controls ──
  const [hasMediaFile, setHasMediaFile] = useState(true);
  const [mediaLayout, setMediaLayout] = useState<'WEBCAM' | 'MEDIA_ONLY' | 'PIP'>('PIP');
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [mediaVolume, setMediaVolume] = useState<number>(0.8);

  // ── Voice AI Tab Controls ──
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceAutoApply, setIsVoiceAutoApply] = useState(true);
  const [simulatedTranscript, setSimulatedTranscript] = useState('John 3:16 For God so loved the world');

  // ── Broadcast Tab Controls ──
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'facebook' | 'twitch' | 'custom'>('youtube');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [streamState, setStreamState] = useState<'IDLE' | 'CONNECTING' | 'LIVE'>('IDLE');

  // ── Mechanical Click Synthesizer ──
  const playTactileClick = (freq: number = 240, isDepress: boolean = true) => {
    setPressCount((c) => c + 1);
    if (!soundEnabled) return;
    playHardwareClick(freq, isDepress);
  };

  // ── Theme Style Matrix Helpers Connected Directly to tactileTheme.ts ──
  const getBtnClasses = (isActive: boolean, activeColor: any = 'default') => {
    return getTactileBtnClass(theme, { active: isActive, color: activeColor });
  };

  const getLedDot = (isActive: boolean, activeColor: any = 'default') => {
    return getTactileLedClass(theme, isActive, activeColor);
  };

  return (
    <div className={`fixed inset-0 z-[9999] w-full h-full ${themeTokens.chassisBg.split(' ')[0]} text-[#faf6f0] overflow-y-auto flex flex-col items-center justify-start p-3 sm:p-6 select-none font-sans`}>
      {/* ── TOP HEADER / OPTIONS ── */}
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${getBtnClasses(false)}`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold font-mono">Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${themeTokens.badgeBg}`}>
                TACTILE PANEL PREVIEW
              </span>
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Every Live Studio Control Button Refactored</span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h1>
            </div>
            <p className={`text-xs ${themeTokens.mutedText} mt-0.5`}>
              Testing every single tab control button with the 3 Rules of Physical Digital Hardware
            </p>
          </div>
        </div>

        {/* 3 Solid Aesthetic Themes Switcher & SFX */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio Click SFX */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${getBtnClasses(soundEnabled, 'default')}`}
            title="Toggle Mechanical Audio Click Feedback"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Click SFX {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Theme Palette Switcher (3 Solid Dark Hardware Themes) */}
          <div className={`flex items-center gap-1 ${themeTokens.stripBg} p-1 rounded-xl border ${themeTokens.cardBorder} text-xs font-mono`}>
            <button
              type="button"
              onClick={() => {
                playTactileClick(300, true);
                setTheme('obsidian');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                theme === 'obsidian' ? 'bg-blue-600 text-white shadow-sm' : `${themeTokens.mutedText} hover:text-white`
              }`}
            >
              1. Obsidian Slate
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick(300, true);
                setTheme('stealth');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                theme === 'stealth' ? 'bg-emerald-600 text-white shadow-sm' : `${themeTokens.mutedText} hover:text-white`
              }`}
            >
              2. Stealth Titanium
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileClick(300, true);
                setTheme('crimson');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                theme === 'crimson' ? 'bg-rose-600 text-white shadow-sm' : `${themeTokens.mutedText} hover:text-white`
              }`}
            >
              3. Midnight Crimson
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN HARDWARE CONSOLE BODY ── */}
      <main className="w-full max-w-5xl flex flex-col gap-5">
        <div className={`w-full rounded-3xl p-4 sm:p-6 border shadow-2xl ${themeTokens.containerBg}`}>
          {/* Chassis Telemetry Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`${themeTokens.mutedText} font-bold tracking-widest uppercase`}>
                ACTIVE HARDWARE PALETTE: {theme.toUpperCase()}
              </span>
            </div>
            <div className={`flex items-center gap-3 ${themeTokens.mutedText}`}>
              <span>Actuations: <strong className="text-white">{pressCount}</strong></span>
              <span className="text-emerald-400 font-bold">100ms Spring • 4px Drop Shadow</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 1: THE STUDIO TOP SWITCHER BAR
             ═══════════════════════════════════════════════════════════════════════ */}
          <div className="mb-6">
            <div className={`text-[11px] font-mono uppercase tracking-wider ${themeTokens.mutedText} font-bold mb-2 flex items-center justify-between`}>
              <span className="flex items-center gap-1.5">
                <Sliders className={`w-3.5 h-3.5 ${themeTokens.accentText}`} />
                <span>Section 1: Live Studio Top Control Bar</span>
              </span>
              <span className={`text-[10px] ${themeTokens.subtleText}`}>Flush underneath canvas preview</span>
            </div>

            <div className={`p-3 rounded-2xl border ${themeTokens.cardBorder} ${themeTokens.stripBg} flex flex-wrap items-center justify-between gap-3`}>
              {/* Left Cluster: Aspect Ratio + Cam + Mic + Sermon Rec */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Aspect Ratio Switcher (16:9 vs 9:16) */}
                <div className={`flex items-center gap-1 ${themeTokens.cardBg} p-1 rounded-xl border ${themeTokens.cardBorder}`}>
                  {(['16:9', '9:16'] as const).map((ratio) => {
                    const isActive = activeAspectRatio === ratio;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => {
                          playTactileClick(280, isActive);
                          setActiveAspectRatio(ratio);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${getBtnClasses(isActive, 'default')}`}
                      >
                        {ratio}
                      </button>
                    );
                  })}
                </div>

                {/* 2. Camera Quick Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(isWebcamEnabled ? 260 : 360, !isWebcamEnabled);
                    setIsWebcamEnabled(!isWebcamEnabled);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold font-mono min-h-[40px] ${getBtnClasses(isWebcamEnabled, 'default')}`}
                  title={isWebcamEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  <div className={getLedDot(isWebcamEnabled, 'default')} />
                  {isWebcamEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  <span>Cam</span>
                </button>

                {/* 3. Mic Quick Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(!isMicMuted ? 300 : 400, isMicMuted);
                    setIsMicMuted(!isMicMuted);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold font-mono min-h-[40px] ${getBtnClasses(!isMicMuted, 'emerald')}`}
                  title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  <div className={getLedDot(!isMicMuted, 'emerald')} />
                  {!isMicMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>Mic</span>
                </button>

                {/* 4. Sermon Recording 4-State Controller Deck */}
                <div className="flex items-center gap-1.5">
                  {sermonState === 'IDLE' && (
                    <button
                      type="button"
                      onClick={() => {
                        playTactileClick(250, false);
                        setSermonState('ARMED');
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold min-h-[40px] ${getBtnClasses(false)}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${theme === 'stealth' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-inner`} />
                      <span>Record</span>
                    </button>
                  )}

                  {sermonState === 'ARMED' && (
                    <div className={`flex items-center gap-1.5 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      theme === 'stealth' ? 'border-emerald-500/50' : theme === 'crimson' ? 'border-rose-500/50' : 'border-amber-500/50'
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(380, true);
                          setSermonState('RECORDING');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${getBtnClasses(true, theme === 'stealth' ? 'emerald' : 'rose')}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${theme === 'stealth' ? 'bg-emerald-500' : 'bg-rose-500'} animate-ping`} />
                        <span>Start</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(200, false);
                          setSermonState('IDLE');
                        }}
                        className={`p-1.5 rounded-lg text-xs font-mono ${themeTokens.mutedText} ${getBtnClasses(false)}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {sermonState === 'RECORDING' && (
                    <div className={`flex items-center gap-1.5 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      theme === 'stealth' ? 'border-emerald-500/50' : 'border-rose-500/50'
                    }`}>
                      <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-bold ${
                        theme === 'stealth' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${theme === 'stealth' ? 'bg-emerald-500' : 'bg-rose-500'} animate-ping`} />
                        <span>REC 06:45</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(300, true);
                          setSermonState('PAUSED');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono ${getBtnClasses(false)}`}
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(200, false);
                          setSermonState('IDLE');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono ${getBtnClasses(true, theme === 'stealth' ? 'emerald' : 'rose')}`}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  )}

                  {sermonState === 'PAUSED' && (
                    <div className={`flex items-center gap-1.5 ${themeTokens.stripBg} p-1 rounded-xl border ${
                      theme === 'stealth' ? 'border-emerald-500/50' : theme === 'crimson' ? 'border-rose-500/50' : 'border-amber-500/50'
                    }`}>
                      <span className={`text-xs font-mono font-bold px-2 ${
                        theme === 'stealth' ? 'text-emerald-400' : theme === 'crimson' ? 'text-rose-400' : 'text-amber-400'
                      }`}>PAUSED</span>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(380, true);
                          setSermonState('RECORDING');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono ${getBtnClasses(true, 'emerald')}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playTactileClick(200, false);
                          setSermonState('IDLE');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono ${getBtnClasses(true, theme === 'stealth' ? 'emerald' : 'rose')}`}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Cluster: 4 Studio Navigation Tabs + Expand Chevron */}
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 ${themeTokens.cardBg} p-1 rounded-2xl border ${themeTokens.cardBorder}`}>
                  {[
                    { id: 'bible', label: 'Bible', icon: BookOpen },
                    { id: 'media', label: 'Media', icon: Film },
                    { id: 'voice', label: 'Voice AI', icon: Mic },
                    { id: 'stream', label: 'Broadcast', icon: Radio }
                  ].map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playTactileClick(isActive ? 320 : 420, isActive);
                          setActiveTab(id as any);
                          if (!isPanelExpanded) setIsPanelExpanded(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono min-h-[40px] ${getBtnClasses(isActive, 'default')}`}
                      >
                        <div className={getLedDot(isActive, 'default')} />
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Chevron Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                  className={`p-2.5 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center ${getBtnClasses(isPanelExpanded, 'default')}`}
                  title={isPanelExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
                >
                  {isPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 2: TAB 1 — BIBLE SCRIPTURE PANEL CONTROLS
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'bible' && (
            <div className={`p-4 rounded-2xl border ${themeTokens.cardBorder} ${themeTokens.containerBg} flex flex-col gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
                  <BookOpen className={`w-4 h-4 ${themeTokens.accentText}`} />
                  <span>Tab Controls: Bible Scripture Selection Panel</span>
                </div>
                <span className={`text-xs font-mono ${themeTokens.accentText}`}>BibleSelectionPanel.tsx</span>
              </div>

              {/* Bible Panel Controls Strip */}
              <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder}`}>
                {/* 1. Scripture Stepper & Book Picker Pill */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(250, false);
                      setSelectedChapter((c) => Math.max(1, c - 1));
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${getBtnClasses(false)}`}
                    title="Previous Chapter"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(320, true);
                    }}
                    className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-black font-mono ${getBtnClasses(true, 'default')}`}
                    title="Select Book and Chapter"
                  >
                    <span>{selectedBook} {selectedChapter}</span>
                    <ChevronDown className={`w-3.5 h-3.5 ${themeTokens.accentText}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(250, false);
                      setSelectedChapter((c) => c + 1);
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${getBtnClasses(false)}`}
                    title="Next Chapter"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Lower Third Background Contrast Swatches */}
                <div className={`flex items-center gap-1 p-1 ${themeTokens.cardBg} rounded-xl border ${themeTokens.cardBorder}`}>
                  <span className={`text-[10px] font-mono ${themeTokens.mutedText} px-1 font-bold`}>Contrast:</span>
                  {[
                    { id: 'black', label: 'Black OLED', bg: 'bg-black' },
                    { id: 'white', label: 'Daylight White', bg: 'bg-white' },
                    { id: 'midnight', label: 'Navy Midnight', bg: 'bg-[#0b1329]' },
                    { id: 'angular-chyron', label: 'Broadcast Chyron', bg: 'bg-[#d97706]' },
                    { id: 'royal-diamond', label: 'Royal Diamond', bg: 'bg-[#7e22ce]' }
                  ].map((s) => {
                    const isSelected = lowerThirdBgColor === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          playTactileClick(290, isSelected);
                          setLowerThirdBgColor(s.id as any);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${getBtnClasses(isSelected, 'default')}`}
                        title={s.label}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border border-white/30 ${s.bg}`} />
                      </button>
                    );
                  })}
                </div>

                {/* 3. Canvas Display View Mode (Lower 3rd vs Full Screen) */}
                <div className={`flex items-center gap-1 ${themeTokens.cardBg} p-1 rounded-xl border ${themeTokens.cardBorder}`}>
                  {[
                    { id: 'lower-third', label: 'Lower 3rd' },
                    { id: 'full-screen', label: 'Full Screen' }
                  ].map((m) => {
                    const isActive = scriptureViewMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playTactileClick(280, isActive);
                          setScriptureViewMode(m.id as any);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${getBtnClasses(isActive, 'default')}`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* 4. Host Camera PIP Quick Toggle (when full screen) */}
                {scriptureViewMode === 'full-screen' && (
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(320, !isFullScreenPip);
                      setIsFullScreenPip(!isFullScreenPip);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${getBtnClasses(isFullScreenPip, 'emerald')}`}
                  >
                    <div className={getLedDot(isFullScreenPip, 'emerald')} />
                    <span>Host PIP</span>
                  </button>
                )}

                {/* 5. Scripture Text Mode (KJV vs Interlinear) */}
                <div className={`flex items-center gap-1 ${themeTokens.cardBg} p-1 rounded-xl border ${themeTokens.cardBorder}`}>
                  {(['standard', 'interlinear'] as const).map((m) => {
                    const isActive = studyMode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          playTactileClick(290, isActive);
                          setStudyMode(m);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${getBtnClasses(isActive, 'default')}`}
                      >
                        {m === 'standard' ? 'KJV' : 'Interlinear'}
                      </button>
                    );
                  })}
                </div>

                {/* 6. Chapter Audio Translation Play/Stop Button */}
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(isPlayingAudio ? 220 : 340, !isPlayingAudio);
                    setIsPlayingAudio(!isPlayingAudio);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${getBtnClasses(isPlayingAudio, 'amber')}`}
                  title={isPlayingAudio ? 'Stop Audio' : 'Play Chapter Audio'}
                >
                  {isPlayingAudio ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>

                {/* 7. Live Lower-Third Stream Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(isLowerThirdVisible ? 240 : 360, !isLowerThirdVisible);
                    setIsLowerThirdVisible(!isLowerThirdVisible);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${getBtnClasses(isLowerThirdVisible, 'emerald')}`}
                >
                  <div className={getLedDot(isLowerThirdVisible, 'emerald')} />
                  <span>{isLowerThirdVisible ? 'ON AIR' : 'HIDDEN'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 3: TAB 2 — MEDIA PLAYER CONTROLS
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'media' && (
            <div className={`p-4 rounded-2xl border ${themeTokens.cardBorder} ${themeTokens.containerBg} flex flex-col gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
                  <Film className={`w-4 h-4 ${themeTokens.accentText}`} />
                  <span>Tab Controls: Worship Video & Audio Media Deck</span>
                </div>
                <span className={`text-xs font-mono ${themeTokens.accentText}`}>MediaPlayerControls.tsx</span>
              </div>

              {/* 1. Media Upload / Loaded Status Bar */}
              <div className={`flex items-center justify-between p-3 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${themeTokens.badgeBg}`}>
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono">worship_prelude_hd.mp4</div>
                    <div className="text-[11px] font-mono text-slate-400">01:42 / 04:15 • 1080p 60FPS</div>
                  </div>
                </div>

                {/* Remove Media Button */}
                <button
                  type="button"
                  onClick={() => playTactileClick(200, false)}
                  className={`p-2.5 rounded-xl text-slate-400 hover:text-rose-400 ${getBtnClasses(false)}`}
                  title="Remove Media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 2. Canvas Engine Layout Mode (Segmented 3-Way Buttons) */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  Compositor Canvas Layout Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'WEBCAM', label: 'Webcam', icon: Camera },
                    { id: 'MEDIA_ONLY', label: 'Media Only', icon: Film },
                    { id: 'PIP', label: 'PIP Mode', icon: Layers }
                  ].map(({ id, label, icon: Icon }) => {
                    const isActive = mediaLayout === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playTactileClick(300, isActive);
                          setMediaLayout(id as any);
                        }}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold font-mono ${getBtnClasses(isActive, 'default')}`}
                      >
                        <div className={getLedDot(isActive, 'default')} />
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Transport Controls: Play/Pause FAB + Capsule Volume Controller */}
              <div className="flex items-center justify-between gap-4 pt-2">
                {/* Play/Pause Heavy FAB */}
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(isMediaPlaying ? 240 : 340, !isMediaPlaying);
                    setIsMediaPlaying(!isMediaPlaying);
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getBtnClasses(isMediaPlaying, 'default')}`}
                  title={isMediaPlaying ? 'Pause' : 'Play'}
                >
                  {isMediaPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Tonal Capsule Volume Controller: Minus, Equalizer/Mute, Plus */}
                <div className={`flex items-center gap-2 ${themeTokens.cardBg} border ${themeTokens.cardBorder} rounded-full px-3 py-1.5 shadow-md`}>
                  {/* Volume Minus */}
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(200, false);
                      setMediaVolume((v) => Math.max(0, parseFloat((v - 0.1).toFixed(2))));
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${getBtnClasses(false)}`}
                    title="Volume Down"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Equalizer & Mute Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(250, mediaVolume === 0);
                      setMediaVolume((v) => (v > 0 ? 0 : 0.8));
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/5 cursor-pointer"
                    title={mediaVolume > 0 ? 'Click to Mute' : 'Click to Unmute'}
                  >
                    <div className="flex items-end gap-0.5 h-4">
                      {[0.4, 0.85, 1.0, 0.7, 0.35].map((r, idx) => (
                        <span
                          key={idx}
                          className={`w-0.5 rounded-full transition-all duration-200 ${
                            mediaVolume === 0 ? 'bg-slate-700' : isMediaPlaying ? (theme === 'stealth' ? 'bg-emerald-400 animate-pulse' : theme === 'crimson' ? 'bg-rose-400 animate-pulse' : 'bg-purple-400 animate-pulse') : 'bg-slate-300'
                          }`}
                          style={{ height: `${mediaVolume === 0 ? 2.5 : Math.max(3, Math.round(r * mediaVolume * 15))}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono font-bold min-w-[34px] text-center">
                      {Math.round(mediaVolume * 100)}%
                    </span>
                  </button>

                  {/* Volume Plus */}
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(200, false);
                      setMediaVolume((v) => Math.min(1, parseFloat((v + 0.1).toFixed(2))));
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${getBtnClasses(false)}`}
                    title="Volume Up"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 4: TAB 3 — VOICE AI DEBUG PANEL CONTROLS
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'voice' && (
            <div className={`p-4 rounded-2xl border ${themeTokens.cardBorder} ${themeTokens.containerBg} flex flex-col gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
                  <Mic className={`w-4 h-4 ${themeTokens.accentText}`} />
                  <span>Tab Controls: Voice AI Co-Host Debug Deck</span>
                </div>
                <span className={`text-xs font-mono ${themeTokens.accentText}`}>VoiceAIDebugPanel.tsx</span>
              </div>

              {/* 1. Master Mic Listener Toggle & Auto-Apply Toggle */}
              <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder}`}>
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(isVoiceListening ? 260 : 380, !isVoiceListening);
                    setIsVoiceListening(!isVoiceListening);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-mono min-h-[42px] ${getBtnClasses(isVoiceListening, 'emerald')}`}
                >
                  <div className={getLedDot(isVoiceListening, 'emerald')} />
                  <Mic className="w-4 h-4" />
                  <span>{isVoiceListening ? 'LISTENING (SPEECH API ACTIVE)' : 'START LISTENING'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTactileClick(300, !isVoiceAutoApply);
                    setIsVoiceAutoApply(!isVoiceAutoApply);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold min-h-[42px] ${getBtnClasses(isVoiceAutoApply, 'default')}`}
                >
                  <Sparkle className="w-3.5 h-3.5" />
                  <span>Auto-Apply: {isVoiceAutoApply ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* 2. Live Transcript Simulation & Manual Apply Button */}
              <div className={`p-3 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder} flex flex-col gap-2`}>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Detected Spoken Scripture:</span>
                  <button
                    type="button"
                    onClick={() => {
                      playTactileClick(180, false);
                      setSimulatedTranscript('');
                    }}
                    className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-400 ${getBtnClasses(false)}`}
                    title="Clear Transcript"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`flex items-center justify-between gap-3 p-2.5 rounded-lg ${themeTokens.cardBg} border ${themeTokens.cardBorder}`}>
                  <span className="text-xs font-serif italic text-amber-300 truncate">
                    &ldquo;{simulatedTranscript || 'Speak a verse reference (e.g. Genesis 1:1)...'}&rdquo;
                  </span>

                  <button
                    type="button"
                    disabled={!simulatedTranscript}
                    onClick={() => playTactileClick(420, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 ${getBtnClasses(true, 'emerald')}`}
                  >
                    Apply Verse
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 5: TAB 4 — BROADCAST DESTINATION & RTMP DECK
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'stream' && (
            <div className={`p-4 rounded-2xl border ${themeTokens.cardBorder} ${themeTokens.containerBg} flex flex-col gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
                  <Radio className={`w-4 h-4 ${themeTokens.accentText}`} />
                  <span>Tab Controls: Broadcast Destination & RTMP Deck</span>
                </div>
                <span className={`text-xs font-mono ${themeTokens.accentText}`}>LiveStudioView.tsx</span>
              </div>

              {/* 1. Target Broadcast Platform Presets */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  Destination Platform Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'youtube', name: 'YouTube Live', color: 'rose' as const },
                    { id: 'facebook', name: 'Facebook Live', color: 'blue' as const },
                    { id: 'twitch', name: 'Twitch TV', color: 'purple' as const },
                    { id: 'custom', name: 'Custom RTMP', color: 'amber' as const }
                  ].map((p) => {
                    const isSelected = selectedPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          playTactileClick(320, isSelected);
                          setSelectedPlatform(p.id as any);
                        }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold font-mono ${getBtnClasses(isSelected, p.color)}`}
                      >
                        <div className={getLedDot(isSelected, p.color)} />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Resolution & Stream Quality Matrix */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 font-bold uppercase">Resolution:</span>
                <div className={`flex items-center gap-1.5 ${themeTokens.stripBg} p-1 rounded-xl border ${themeTokens.cardBorder}`}>
                  {(['720p', '1080p'] as const).map((res) => {
                    const isActive = resolution === res;
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => {
                          playTactileClick(260, isActive);
                          setResolution(res);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${getBtnClasses(isActive, 'default')}`}
                      >
                        {res}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. The Big Heavy Master Go-Live Broadcast Actuator */}
              <div className="pt-2 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (streamState === 'IDLE') {
                      playTactileClick(350, true);
                      setStreamState('CONNECTING');
                      setTimeout(() => {
                        playTactileClick(450, true);
                        setStreamState('LIVE');
                      }, 1200);
                    } else {
                      playTactileClick(220, false);
                      setStreamState('IDLE');
                    }
                  }}
                  className={`flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase min-h-[56px] ${
                    streamState === 'LIVE'
                      ? getBtnClasses(true, theme === 'stealth' ? 'emerald' : 'rose')
                      : streamState === 'CONNECTING'
                      ? getBtnClasses(true, theme === 'stealth' ? 'emerald' : theme === 'crimson' ? 'rose' : 'amber')
                      : getBtnClasses(false)
                  }`}
                >
                  <div
                    className={
                      streamState === 'LIVE'
                        ? (theme === 'stealth' ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse' : 'w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse')
                        : streamState === 'CONNECTING'
                        ? (theme === 'stealth' ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-ping' : theme === 'crimson' ? 'w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_#f43f5e] animate-ping' : 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24] animate-ping')
                        : (theme === 'stealth' ? 'w-2.5 h-2.5 rounded-full bg-emerald-950 shadow-inner' : theme === 'crimson' ? 'w-2.5 h-2.5 rounded-full bg-rose-950 shadow-inner' : 'w-2.5 h-2.5 rounded-full bg-slate-700 shadow-inner')
                    }
                  />

                  {streamState === 'LIVE' ? (
                    <>
                      <StopCircle className={`w-5 h-5 ${theme === 'stealth' ? 'text-emerald-400' : 'text-rose-400'}`} />
                      <span>LIVE ON AIR (00:42) • TAP TO END</span>
                    </>
                  ) : streamState === 'CONNECTING' ? (
                    <>
                      <div className={`w-4 h-4 border-2 ${theme === 'stealth' ? 'border-emerald-400' : theme === 'crimson' ? 'border-rose-400' : 'border-amber-400'} border-t-transparent rounded-full animate-spin`} />
                      <span>CONNECTING TO RTMP...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className={`w-5 h-5 ${themeTokens.accentText}`} />
                      <span>START BROADCAST (GO LIVE)</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-mono text-slate-400 mt-2">
                  Mechanical 4px drop shadow • duration-100 spring snap-back
                </span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 6: BROADCAST MACRO SWITCHER (STREAM DECK 6-KEY STUDIO PAD)
             ═══════════════════════════════════════════════════════════════════════ */}
          <div className={`mt-6 pt-5 border-t ${themeTokens.cardBorder}`}>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className={`w-3.5 h-3.5 ${themeTokens.accentText}`} />
                <span>Broadcast Macro Switcher (Stream Deck 6-Key Studio Keypad)</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Ergonomic compact scale (h-14 • 4px mechanical drop • duration-100)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
              {/* KEY 1: MIC 1 */}
              <button
                type="button"
                onClick={() => {
                  playTactileClick(!isMicMuted ? 300 : 400, isMicMuted);
                  setIsMicMuted(!isMicMuted);
                }}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(!isMicMuted, 'emerald')}`}
                title="Toggle Mic 1"
              >
                <div className={`absolute top-2 right-2 ${getLedDot(!isMicMuted, 'emerald')}`} />
                {!isMicMuted ? <Mic className="w-4 h-4 mb-0.5 text-emerald-400" /> : <MicOff className="w-4 h-4 mb-0.5 text-slate-400" />}
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Mic 1</span>
              </button>

              {/* KEY 2: CAMERA */}
              <button
                type="button"
                onClick={() => {
                  playTactileClick(isWebcamEnabled ? 280 : 380, !isWebcamEnabled);
                  setIsWebcamEnabled(!isWebcamEnabled);
                }}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(isWebcamEnabled, 'default')}`}
                title="Toggle Camera"
              >
                <div className={`absolute top-2 right-2 ${getLedDot(isWebcamEnabled, 'default')}`} />
                {isWebcamEnabled ? <Video className={`w-4 h-4 mb-0.5 ${themeTokens.accentText}`} /> : <VideoOff className="w-4 h-4 mb-0.5 text-slate-400" />}
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Camera</span>
              </button>

              {/* KEY 3: SERMON RECORD */}
              <button
                type="button"
                onClick={() => {
                  const next = sermonState === 'RECORDING' ? 'IDLE' : 'RECORDING';
                  playTactileClick(next === 'RECORDING' ? 340 : 200, next === 'RECORDING');
                  setSermonState(next);
                }}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(sermonState === 'RECORDING', 'rose')}`}
                title="Toggle Sermon Recording"
              >
                <div className={`absolute top-2 right-2 ${getLedDot(sermonState === 'RECORDING', 'rose')}`} />
                <Disc className={`w-4 h-4 mb-0.5 ${sermonState === 'RECORDING' ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Record</span>
              </button>

              {/* KEY 4: LOWER 3RD */}
              <button
                type="button"
                onClick={() => {
                  playTactileClick(isLowerThirdVisible ? 260 : 360, !isLowerThirdVisible);
                  setIsLowerThirdVisible(!isLowerThirdVisible);
                }}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(isLowerThirdVisible, 'default')}`}
                title="Toggle Lower Third Overlay"
              >
                <div className={`absolute top-2 right-2 ${getLedDot(isLowerThirdVisible, 'default')}`} />
                <Layers className={`w-4 h-4 mb-0.5 ${themeTokens.accentText}`} />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Lower 3rd</span>
              </button>

              {/* KEY 5: MEDIA */}
              <button
                type="button"
                onClick={() => {
                  playTactileClick(isMediaPlaying ? 240 : 340, !isMediaPlaying);
                  setIsMediaPlaying(!isMediaPlaying);
                }}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(isMediaPlaying, 'default')}`}
                title="Play/Pause Media"
              >
                <div className={`absolute top-2 right-2 ${getLedDot(isMediaPlaying, 'default')}`} />
                <Tv className={`w-4 h-4 mb-0.5 ${themeTokens.accentText}`} />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Media</span>
              </button>

              {/* KEY 6: MOMENTARY CUE PAD */}
              <button
                type="button"
                onMouseDown={() => playTactileClick(520, true)}
                onTouchStart={() => playTactileClick(520, true)}
                className={`flex flex-col items-center justify-center h-14 rounded-xl ${getBtnClasses(false)} active:text-white`}
                title="Momentary Cue Beep"
              >
                <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${themeTokens.accentText} shadow-inner`} />
                <Volume2 className={`w-4 h-4 mb-0.5 ${themeTokens.accentText}`} />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Cue Beep</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER: AUDIT CHECKLIST FOR ALL REFACTORED BUTTONS ── */}
        <div className={`w-full p-4 rounded-2xl ${themeTokens.stripBg} border ${themeTokens.cardBorder} flex flex-col gap-2 text-xs font-mono ${themeTokens.mutedText}`}>
          <div className="text-white font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Refactor Audit: Every Live Studio Tab Button Accounted For</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className={`p-2 rounded-lg ${themeTokens.cardBg} border ${themeTokens.cardBorder}`}>
              <strong className={`${themeTokens.accentText} block mb-0.5`}>Top Bar Strip:</strong>
              • 16:9 / 9:16 Switcher<br />
              • Camera Quick Toggle<br />
              • Mic Quick Toggle<br />
              • 4-State Sermon Rec Deck<br />
              • 4 Navigation Matrix Tabs
            </div>
            <div className={`p-2 rounded-lg ${themeTokens.cardBg} border ${themeTokens.cardBorder}`}>
              <strong className={`${themeTokens.accentText} block mb-0.5`}>Bible Tab:</strong>
              • Prev/Next Chapter<br />
              • Book & Chapter Picker<br />
              • 3 Contrast Swatches<br />
              • Lower 3rd / Full Screen<br />
              • Host PIP Toggle<br />
              • KJV / Interlinear<br />
              • Audio Translation Play/Stop<br />
              • Lower Third ON AIR Toggle
            </div>
            <div className={`p-2 rounded-lg ${themeTokens.cardBg} border ${themeTokens.cardBorder}`}>
              <strong className={`${themeTokens.accentText} block mb-0.5`}>Media Tab:</strong>
              • Remove Media (Trash)<br />
              • 3 Layout Modes (Webcam, Media, PIP)<br />
              • Play/Pause Heavy FAB<br />
              • Volume Minus<br />
              • Live EQ Wave / Mute Pill<br />
              • Volume Plus
            </div>
            <div className={`p-2 rounded-lg ${themeTokens.cardBg} border ${themeTokens.cardBorder}`}>
              <strong className={`${themeTokens.accentText} block mb-0.5`}>Voice AI & Broadcast:</strong>
              • Voice AI Mic Listener<br />
              • Auto-Apply Toggle<br />
              • Apply Verse Action<br />
              • 4 Platform Presets<br />
              • 720p/1080p Matrix<br />
              • Master Broadcast Go Live
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
