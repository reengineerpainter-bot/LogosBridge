import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  UploadCloud,
  Volume2,
  VolumeX,
  FileVideo,
  FileAudio,
  Film,
  Camera,
  Layers,
  RotateCcw,
  Trash2,
  Minus,
  Plus
} from 'lucide-react';
import { CanvasLayoutMode, DualCanvasCompositorRef } from './DualCanvasCompositor';
import { useStudioDeckTheme, getTactileBtnClass, playHardwareClick, getStudioThemeTokens } from './tactileTheme';

export interface MediaPlayerControlsProps {
  mediaVideoRef: React.RefObject<HTMLVideoElement | null>;
  compositorRef?: React.RefObject<DualCanvasCompositorRef | null>;
  layoutMode: CanvasLayoutMode;
  onLayoutModeChange: (mode: CanvasLayoutMode) => void;
  mediaVolume: number;
  onMediaVolumeChange: (volume: number) => void;
}

export const MediaPlayerControls: React.FC<MediaPlayerControlsProps> = React.memo(({
  mediaVideoRef,
  compositorRef,
  layoutMode,
  onLayoutModeChange,
  mediaVolume,
  onMediaVolumeChange
}) => {
  const [deckTheme] = useStudioDeckTheme();
  const themeTokens = getStudioThemeTokens(deckTheme);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'video' | 'audio' | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync mini-preview canvas with video frames (on-demand rendering to prevent main-thread choking)
  useEffect(() => {
    let animId: number | null = null;
    let isMounted = true;

    const renderSingleFrame = () => {
      const video = mediaVideoRef.current;
      const canvas = miniCanvasRef.current;
      if (video && canvas && video.readyState >= 1 && fileType === 'video') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }
    };

    const loopPreview = () => {
      if (!isMounted) return;
      const video = mediaVideoRef.current;
      renderSingleFrame();
      if (video && !video.paused && !video.ended) {
        animId = requestAnimationFrame(loopPreview);
      }
    };

    renderSingleFrame();

    const video = mediaVideoRef.current;
    const handlePlay = () => {
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loopPreview);
    };
    const handlePauseOrSeek = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      renderSingleFrame();
    };

    if (video) {
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePauseOrSeek);
      video.addEventListener('seeked', handlePauseOrSeek);
      video.addEventListener('loadeddata', handlePauseOrSeek);
    }

    return () => {
      isMounted = false;
      if (animId) cancelAnimationFrame(animId);
      if (video) {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePauseOrSeek);
        video.removeEventListener('seeked', handlePauseOrSeek);
        video.removeEventListener('loadeddata', handlePauseOrSeek);
      }
    };
  }, [mediaVideoRef, fileType]);

  // Synchronize playback events from video element
  useEffect(() => {
    const video = mediaVideoRef.current;
    if (!video) return;

    // Synchronize video duration and state if a source exists
    if (video.src && video.src !== window.location.href && !video.error) {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      setIsPlaying(!video.paused);
      if (video.currentTime) {
        setCurrentTime(video.currentTime);
      }
    }

    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
    setIsPlaying(!video.paused);
    if (video.currentTime) {
      setCurrentTime(video.currentTime);
    }

    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setCurrentTime(video.currentTime || 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      try {
        video.currentTime = 0;
      } catch {}
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [mediaVideoRef]);

  // Handle file ingestion
  const handleFile = useCallback((file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov');
    const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3');

    if (!isVideo && !isAudio) {
      alert('Please upload a valid .mp4, .mov, or .mp3 media file.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (mediaVideoRef.current) {
      mediaVideoRef.current.src = objectUrl;
      mediaVideoRef.current.load();
      setFileName(file.name);
      setFileType(isVideo ? 'video' : 'audio');
      setIsPlaying(false);
      setCurrentTime(0);

      // Connect to audio graph if not already connected
      try {
        compositorRef?.current?.connectMediaElementToAudio();
      } catch {}
    }
  }, [mediaVideoRef, compositorRef]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = async () => {
    const video = mediaVideoRef.current;
    if (!video) return;

    if (!video.src || video.src === window.location.href || video.error) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Direct hardware check to ensure toggle always responds accurately
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    if (video.ended || (video.duration && video.currentTime >= video.duration - 0.2)) {
      video.currentTime = 0;
      setCurrentTime(0);
    }

    // Connect broadcast audio stream
    try {
      compositorRef?.current?.connectMediaElementToAudio();
      const audioCtx = compositorRef?.current?.getAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
    } catch { /* non-fatal */ }

    try {
      await video.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.warn('[MediaPlayer] Play error:', err.message);
      // Fallback: If autoplay policy blocked unmuted playback, briefly mute to initiate playback then un-mute
      try {
        video.muted = true;
        await video.play();
        video.muted = false;
        setIsPlaying(true);
      } catch (fallbackErr: any) {
        console.warn('[MediaPlayer] Fallback play error:', fallbackErr.message);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (mediaVideoRef.current) {
      mediaVideoRef.current.currentTime = targetTime;
    }
  };

  const clearMedia = () => {
    if (mediaVideoRef.current) {
      mediaVideoRef.current.pause();
      mediaVideoRef.current.src = '';
    }
    setFileName(null);
    setFileType(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    compositorRef?.current?.triggerTransition?.();
    onLayoutModeChange('WEBCAM');
  };

  return (
    <div className={`w-full flex flex-col gap-4 ${themeTokens.containerBg} text-[#faf6f0] p-3 sm:p-4 pb-2.5 sm:pb-3 rounded-2xl border shadow-xl`}>
      {/* 1. Media Upload Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? `${themeTokens.accentBorder} ${themeTokens.accentBg}`
            : `${themeTokens.cardBorder} ${themeTokens.cardBg}`
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.mp3,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {fileName ? (
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <div className="flex items-center gap-3">
              {fileType === 'video' ? (
                <div className={`relative w-14 h-9 rounded-xl overflow-hidden ${themeTokens.stripBg} border ${themeTokens.cardBorder} shrink-0 shadow-sm`}>
                  <canvas
                    ref={miniCanvasRef}
                    width={112}
                    height={72}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-1 ring-black" />
                  )}
                </div>
              ) : (
                <div className={`p-2.5 rounded-xl ${themeTokens.stripBg} border ${themeTokens.cardBorder} ${themeTokens.accentText} shadow-sm`}>
                  <FileAudio className="w-5 h-5" />
                </div>
              )}
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-base text-[#faf6f0] truncate max-w-[180px] sm:max-w-[260px]">
                  {fileName}
                </div>
                <div className={`text-xs font-mono ${themeTokens.mutedText}`}>
                  {formatTime(currentTime)} / {formatTime(duration)} • {fileType?.toUpperCase()}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playHardwareClick();
                clearMedia();
              }}
              className={`p-2.5 rounded-xl cursor-pointer ${getTactileBtnClass(deckTheme, { color: 'danger', size: 'sm', active: false })}`}
              title="Remove media"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`p-3.5 rounded-full ${themeTokens.stripBg} border ${themeTokens.cardBorder} ${themeTokens.accentText} shadow-inner`}>
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#faf6f0]">
              Drag & Drop <span className={`${themeTokens.accentText} font-mono font-bold`}>.mp4</span>, <span className={`${themeTokens.accentText} font-mono font-bold`}>.mov</span>, or <span className={`${themeTokens.accentText} font-mono font-bold`}>.mp3</span>
            </div>
            <div className={`text-xs ${themeTokens.mutedText}`}>or click to browse local files</div>
          </div>
        )}
      </div>

      {/* 2. M3 Segmented Button Group (Canvas Engine Layout Mode) */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="text-xs font-bold uppercase tracking-wider text-[#dcd3c6] font-mono">
          Canvas Layout
        </div>
        <div className={`grid grid-cols-3 gap-1.5 p-1 ${themeTokens.stripBg} rounded-xl border`}>
          {(
            [
              { id: 'WEBCAM', label: 'Webcam', icon: Camera },
              { id: 'MEDIA_ONLY', label: 'Media Only', icon: Film },
              { id: 'PIP', label: 'PIP Mode', icon: Layers }
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                playHardwareClick();
                compositorRef?.current?.triggerTransition?.();
                onLayoutModeChange(id);
              }}
              className={`py-2 px-2 rounded-lg font-sans text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none min-h-[42px] ${getTactileBtnClass(deckTheme, { color: layoutMode === id ? 'accent' : 'default', size: 'md', active: layoutMode === id })}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="inline truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Media Controls & Scrub Bar (Filled Tonal FAB & Sliders) */}
      <div className="flex flex-col gap-3 pt-1">
        {/* Timeline Scrub Bar with Dynamic Timestamps */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#faf6f0] font-bold min-w-[40px]">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!fileName}
            onChange={handleSeek}
            className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer border ${themeTokens.stripBg} ${themeTokens.cardBorder} disabled:opacity-30 disabled:cursor-not-allowed`}
            style={{
              accentColor: deckTheme === 'stealth' ? '#34d399' : deckTheme === 'crimson' ? '#f43f5e' : '#60a5fa'
            }}
          />

          <span className={`text-xs font-mono ${themeTokens.mutedText} min-w-[40px]`}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Controls & Volume */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {/* M3 Filled Tonal FAB Play/Pause */}
          <button
            type="button"
            disabled={!fileName}
            onClick={() => {
              playHardwareClick();
              togglePlay();
            }}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center select-none cursor-pointer ${
              !fileName
                ? `opacity-30 cursor-not-allowed ${themeTokens.stripBg} border ${themeTokens.cardBorder} text-zinc-600`
                : getTactileBtnClass(deckTheme, { color: isPlaying ? 'accent' : 'default', size: 'lg', active: isPlaying })
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Style 1: Tonal Dark Hardware Pill Capsule Volume Control */}
          <div className={`flex items-center gap-2 ${themeTokens.stripBg} border ${themeTokens.cardBorder} rounded-full px-2.5 py-1.5 shadow-md select-none`}>
            {/* Minus Button */}
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                onMediaVolumeChange(Math.max(0, parseFloat((mediaVolume - 0.1).toFixed(2))));
              }}
              disabled={mediaVolume <= 0}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${getTactileBtnClass(deckTheme, { color: 'default', size: 'sm', active: false })}`}
              title="Decrease Volume"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Center: Live Sound Frequency Equalizer & % (Click to Mute/Restore) */}
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                onMediaVolumeChange(mediaVolume > 0 ? 0 : 0.8);
              }}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${themeTokens.hoverItemBg} transition-all cursor-pointer active:scale-95`}
              title={mediaVolume > 0 ? "Click to Mute" : "Click to Unmute"}
            >
              {/* 5-Bar Dynamic Equalizer Wave */}
              <div className="flex items-end gap-0.5 h-4">
                {[0.4, 0.85, 1.0, 0.7, 0.35].map((ratio, idx) => {
                  const barH = mediaVolume === 0 ? 2.5 : Math.max(3, Math.round(ratio * mediaVolume * 15));
                  return (
                    <span
                      key={idx}
                      className={`w-0.5 rounded-full transition-all duration-200 ${
                        mediaVolume === 0
                          ? (deckTheme === 'stealth' ? 'bg-emerald-950' : deckTheme === 'crimson' ? 'bg-rose-950' : 'bg-slate-700')
                          : isPlaying
                          ? (deckTheme === 'stealth' ? 'bg-emerald-400 animate-pulse' : deckTheme === 'crimson' ? 'bg-rose-400 animate-pulse' : 'bg-blue-400 animate-pulse')
                          : (deckTheme === 'stealth' ? 'bg-emerald-600' : deckTheme === 'crimson' ? 'bg-rose-600' : 'bg-slate-400')
                      }`}
                      style={{
                        height: `${barH}px`,
                        animationDelay: `${idx * 75}ms`
                      }}
                    />
                  );
                })}
              </div>

              {/* Volume Percentage Readout */}
              <span className={`text-xs font-mono font-bold tracking-tight min-w-[34px] text-center ${
                mediaVolume === 0 ? 'text-[#b5a99a]' : 'text-[#faf6f0]'
              }`}>
                {Math.round(mediaVolume * 100)}%
              </span>
            </button>

            {/* Plus Button */}
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                onMediaVolumeChange(Math.min(1, parseFloat((mediaVolume + 0.1).toFixed(2))));
              }}
              disabled={mediaVolume >= 1}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${getTactileBtnClass(deckTheme, { color: 'default', size: 'sm', active: false })}`}
              title="Increase Volume"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
