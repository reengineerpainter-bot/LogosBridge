import React, { useState, useEffect, useRef } from 'react';
import appLogoNew from '../assets/images/logo_logosbridge.png';

interface StartupExperienceProps {
  onComplete: () => void;
}

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  // Sequence: 'media' (Screen 1: Video clip) -> 'logo' (Screen 2: Brand & Logo hold) -> 'finishing' -> unmount
  const [stage, setStage] = useState<'media' | 'logo' | 'finishing'>('media');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [headlineStep, setHeadlineStep] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef<boolean>(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  // 1. ABSOLUTE FAILSAFE: App will never be trapped on startup under any condition (< 4.5s max)
  useEffect(() => {
    const absoluteFailsafe = setTimeout(() => {
      handleFinish();
    }, 4500);

    return () => clearTimeout(absoluteFailsafe);
  }, []);

  // 2. Screen 1: Video Playback initialization with audio
  useEffect(() => {
    if (stage === 'media') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.volume = 0.2;
        // Start playback with muted flag so WebKit never paints the native play icon overlay
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Unmute immediately once video plays with comfortable reduced volume
              if (videoRef.current) {
                videoRef.current.volume = 0.2;
                videoRef.current.muted = false;
              }
            })
            .catch((err) => {
              console.warn('[StartupExperience] Autoplay play attempt:', err);
              if (videoRef.current) {
                videoRef.current.volume = 0.2;
                videoRef.current.muted = true;
                setIsAudioMuted(true);
                videoRef.current.play().catch(() => {});
              }
            });
        }
      }

      // Safety timeout: transition to logo quickly if video genuinely stalls on mobile data (< 2.5s)
      const mediaSafetyTimer = setTimeout(() => {
        setStage('logo');
      }, 2500);

      return () => clearTimeout(mediaSafetyTimer);
    }
  }, [stage]);

  const handleUnmuteOnTap = () => {
    if (videoRef.current) {
      videoRef.current.volume = 0.2;
      videoRef.current.muted = false;
      setIsAudioMuted(false);
      videoRef.current.play().catch(() => {});
    }
  };

  // 3. Screen 2: Brand Logo Screen hold duration (exactly 1200ms / 1.2 seconds)
  useEffect(() => {
    if (stage === 'logo') {
      const logoTimer = setTimeout(() => {
        setStage('finishing');
        setTimeout(() => {
          handleFinish();
        }, 300);
      }, 1200);

      return () => clearTimeout(logoTimer);
    }
  }, [stage]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Make video visible as soon as playback actually starts
    if (cur > 0.05 && !isVideoPlaying) {
      setIsVideoPlaying(true);
    }

    // Transition smoothly to the Logo screen as soon as the media completes
    if (cur >= 9.8) {
      setStage('logo');
      return;
    }

    // Staggered headline pop-in timing during Sanctuary scene (7.5s - 10.0s)
    if (cur >= 8.9) {
      setHeadlineStep(3);
    } else if (cur >= 8.2) {
      setHeadlineStep(2);
    } else if (cur >= 7.5) {
      setHeadlineStep(1);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[3000] w-full h-full bg-black overflow-hidden select-none transition-opacity duration-300 ${
        stage === 'finishing' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      onClick={isAudioMuted ? handleUnmuteOnTap : undefined}
    >
      {/* Quick Skip button in top corner for instant access */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
        className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white text-xs font-mono tracking-widest uppercase transition-all backdrop-blur-md cursor-pointer border border-white/10"
      >
        Skip
      </button>
      {/* =========================================================================
          SCREEN 1: Cinematic Media Scene Clip (Plays FIRST at launch, let_there_be_light.mp4)
          Full display uncropped (object-contain) with subtle ambient backdrop
          ========================================================================= */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 bg-black ${
          stage === 'media'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative w-full h-full flex items-center justify-center bg-radial from-slate-950 via-black to-black overflow-hidden">
          {/* Foreground Uncropped Video: full display with zero edge trimming, unmuted audio */}
          <video
            ref={videoRef}
            src="/let_there_be_light.mp4"
            autoPlay
            playsInline
            defaultMuted
            muted
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            preload="auto"
            onPlaying={() => {
              setIsVideoPlaying(true);
              if (videoRef.current && !isAudioMuted) {
                videoRef.current.volume = 0.2;
                videoRef.current.muted = false;
              }
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setStage('logo')}
            onError={(e) => {
              console.warn('[StartupExperience] Video playback retry:', e);
              // Do NOT show logo before video playout; retry muted if needed
              if (videoRef.current && videoRef.current.currentTime < 1) {
                videoRef.current.muted = true;
                videoRef.current.play().catch((playErr) => {
                  console.warn('[StartupExperience] Video retry play:', playErr);
                });
              }
            }}
            className={`relative z-10 max-w-full max-h-full w-auto h-auto object-contain mx-auto pointer-events-none select-none transition-opacity duration-300 ${
              isVideoPlaying ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ WebkitUserSelect: 'none' }}
          >
            <source src="/let_there_be_light.mp4" type="video/mp4" />
            <source src="let_there_be_light.mp4" type="video/mp4" />
            <source src="/data/let_there_be_light.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Subtle Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-15" />

        {/* -----------------------------------------------------------------------
            Creation Light Sequence Overlay (0.2s - 5.8s):
            Genesis 1:3 spoken command & manifestation without numbering
            ----------------------------------------------------------------------- */}
        <div
          className={`absolute top-10 sm:top-14 md:top-20 inset-x-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none select-none transition-all duration-500 ${
            currentTime >= 0.2 && currentTime < 5.8 ? 'opacity-100' : 'opacity-0 -translate-y-2'
          }`}
        >
          {currentTime < 2.9 ? (
            /* Sequence 1: Wayomer Elohim, Yehi Or, Wayehi Or (with English under it) */
            <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 transition-all duration-500">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]">
                Wayomer Elohim, Yehi Or, Wayehi Or
              </h2>
              <p className="text-sm sm:text-base md:text-lg font-serif italic text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-xl">
                “And God said, Let there be light: and there was light”
              </p>
            </div>
          ) : (
            /* Sequence 2: Immediately when light appears -> Wayehi Or & Light became */
            <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 transition-all duration-500">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black tracking-wide text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.6)]">
                Wayehi Or
              </h2>
              <p className="text-base sm:text-lg md:text-xl font-serif italic text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                “Light became”
              </p>
            </div>
          )}
        </div>

        {/* -----------------------------------------------------------------------
            Scene 3 Sanctuary Overlay (7.5s - 10.0s):
            3-part glowing headline pop-in
            ----------------------------------------------------------------------- */}
        <div
          className={`absolute inset-0 flex flex-col justify-start pt-16 sm:pt-24 md:pt-28 px-6 sm:px-12 max-w-5xl mx-auto pointer-events-none transition-opacity duration-500 z-20 ${
            currentTime >= 7.4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] max-w-2xl text-white drop-shadow-xl flex flex-col items-start gap-1 select-none">
            <span
              className={`inline-block transition-all ${
                headlineStep >= 1 ? 'animate-glow-pop-1' : 'opacity-0 translate-y-5'
              }`}
            >
              Bridge the gap
            </span>
            <span
              className={`inline-block transition-all ${
                headlineStep >= 2 ? 'animate-glow-pop-2' : 'opacity-0 translate-y-5'
              }`}
            >
              between evidence
            </span>
            <span
              className={`inline-block transition-all ${
                headlineStep >= 3 ? 'animate-glow-pop-3' : 'opacity-0 translate-y-5'
              }`}
            >
              and assurance.
            </span>
          </h2>
        </div>
      </div>

      {/* =========================================================================
          SCREEN 2: Brand & Logo Screen (Plays strictly AFTER media, exactly 1200ms hold)
          Snow/smoke canvas with compact scale - Mounted ONLY when stage is logo or finishing
          ========================================================================= */}
      {(stage === 'logo' || stage === 'finishing') && (
        <div
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center transition-all duration-700 bg-black ${
            stage === 'logo'
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-105 pointer-events-none'
          }`}
        >
          <div className="flex flex-col items-center text-center px-6">
            {/* Pure Logo Emblem */}
            <div className="relative mb-3">
              <img
                src={appLogoNew}
                alt="LogosBridge"
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-[0_4px_20px_rgba(255,255,255,0.08)] transition-transform duration-700 ease-out"
              />
            </div>

            {/* Compact Premium Typography Scale */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-serif font-bold tracking-[0.26em] uppercase text-white select-none">
              LogosBridge
            </h1>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupExperience;
