import React, { useState, useEffect } from 'react';
import { Tv, Maximize, Sparkles, Sliders, Layers } from 'lucide-react';

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
  return shortName.toUpperCase();
};

export default function ProjectorCleanDisplay({ theme }: { theme: 'light' | 'dark' }) {
  const [liveState, setLiveState] = useState<LiveProjectionState | null>(null);

  useEffect(() => {
    // 1. Initial fetch from localStorage
    try {
      const saved = localStorage.getItem('live_projection_state');
      if (saved) {
        setLiveState(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load live projection state on mount:', e);
    }

    // 2. BroadcastChannel receiver for real-time zero-lag sync across tabs/iframe
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('live_projection_channel');
      
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          setLiveState(event.data.state);
        }
      };

      // Request latest state immediately from the operator panel (if open)
      channel.postMessage('REQUEST_LATEST_STATE');
    }

    // 3. Standard cross-tab storage listener fallback
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'live_projection_state') {
        try {
          if (e.newValue) {
            setLiveState(JSON.parse(e.newValue));
          } else {
            setLiveState(null);
          }
        } catch (err) {
          console.warn('Error parsing updated live projection state:', err);
        }
      }
    };

    // Support same-tab test updates
    const handleLocalUpdate = () => {
      try {
        const saved = localStorage.getItem('live_projection_state');
        if (saved) {
          setLiveState(JSON.parse(saved));
        }
      } catch (err) {
        console.warn(err);
      }
    };

    // 4. Secure Window-Opener Direct Cross-Talk (Bypasses Iframe Isolation/Partitioning)
    const handleMessageFromOpener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'STATE_UPDATE') {
        setLiveState(event.data.state);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage_local', handleLocalUpdate);
    window.addEventListener('message', handleMessageFromOpener);

    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'REQUEST_LATEST_STATE' }, '*');
      } catch (err) {
        console.warn('Failed to postMessage request to window.opener:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage_local', handleLocalUpdate);
      window.removeEventListener('message', handleMessageFromOpener);
      if (channel) {
        channel.close();
      }
    };
  }, []);

    const getThemeStyles = (preset: ThemePreset, isLowerThird: boolean) => {
      switch (preset) {
        case 'sapphire-gold':
          return {
            container: `bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white ${
              isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-4 rounded-3xl'
            } border-amber-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]`,
            label: 'text-amber-500 font-semibold tracking-widest',
            ref: 'text-amber-100 font-medium',
            accentBorder: 'border-t-2 border-b border-amber-500/30',
            pageBg: isLowerThird ? 'bg-[#000000]' : 'bg-[#050914]',
            textShadow: 'drop-shadow-md',
          };
        case 'chroma-green':
          return {
            container: `bg-[#00ff00] text-black ${
              isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-8 rounded-3xl'
            } border-black font-semibold`,
            label: 'text-black font-black tracking-tight',
            ref: 'text-black font-black',
            accentBorder: 'border-y-2 border-black',
            pageBg: 'bg-[#00ff00]',
            textShadow: 'drop-shadow-none',
          };
        case 'cyber-slate':
          return {
            container: `bg-zinc-950/95 text-zinc-50 ${
              isLowerThird ? 'border-t-[3px] border-b-0 border-x-0 rounded-none' : 'border-[3px] rounded-3xl'
            } border-zinc-700 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl`,
            label: 'text-zinc-400 font-sans tracking-[0.2em]',
            ref: 'text-white font-medium',
            accentBorder: 'border-t border-zinc-800',
            pageBg: isLowerThird ? 'bg-[#000000]' : 'bg-[#09090b]',
            textShadow: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
          };
        case 'amber-parchment':
          return {
            container: `bg-[#fcf8f2] text-zinc-900 ${
              isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-0 rounded-3xl'
            } shadow-[0_20px_50px_rgba(0,0,0,0.15)]`,
            label: 'text-amber-900 font-serif font-black italic tracking-wide',
            ref: 'text-zinc-900 font-medium',
            accentBorder: 'border-b border-amber-900/10',
            pageBg: isLowerThird ? 'bg-[#000000]' : 'bg-[#f4ebe1]',
            textShadow: 'drop-shadow-sm',
          };
        case 'glass-minimal':
          return {
            container: `bg-black/60 text-white backdrop-blur-[30px] ${
              isLowerThird ? 'border-t border-b-0 border-x-0 rounded-none' : 'border border-white/10 rounded-3xl'
            } shadow-[0_30px_80px_rgba(0,0,0,0.5)]`,
            label: 'text-white/60 tracking-[0.25em] font-medium uppercase',
            ref: 'text-white font-semibold',
            accentBorder: 'border-t border-white/10',
            pageBg: isLowerThird ? 'bg-transparent' : 'bg-[#000000]',
            textShadow: 'drop-shadow-[0_4px_12px_rgba(0,0,0,1)]',
          };
        default:
          return {
            container: 'bg-zinc-900 text-white',
            label: 'text-zinc-300',
            ref: 'text-white',
            accentBorder: '',
            pageBg: 'bg-[#000000]',
            textShadow: '',
          };
      }
    };

  const activePreset = liveState?.themePreset || 'sapphire-gold';
  
  
  const [hasInteracted, setHasInteracted] = useState(false);

  
  
  useEffect(() => {
    // Attempt to move to external monitor and go fullscreen automatically
    
    const setupDisplay = async () => {
      let targetScreen = null;
      try {
        if ('getScreenDetails' in window) {
          // @ts-ignore
          const screenDetails = await window.getScreenDetails();
          const externalScreen = screenDetails.screens.find((s: any) => !s.isInternal) || screenDetails.screens[1];
          
          if (externalScreen) {
            targetScreen = externalScreen;
            // Move window to external screen
            window.moveTo(externalScreen.left, externalScreen.top);
            window.resizeTo(externalScreen.width, externalScreen.height);
          }
        }
      } catch (err) {
        console.warn('Could not auto-move to external screen:', err);
      }

      // Then attempt fullscreen
      if (!document.fullscreenElement) {
        try {
          if (targetScreen) {
            // @ts-ignore
            await document.documentElement.requestFullscreen({ screen: targetScreen });
          } else {
            await document.documentElement.requestFullscreen();
          }
          setHasInteracted(true);
        } catch (err) {
          console.log('Auto-fullscreen prevented by browser, waiting for user click:', err);
        }
      }
    };

    
    setTimeout(setupDisplay, 100);


    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log(err);
          });
        } else {
          document.exitFullscreen();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  
  
  const toggleFullscreen = async () => {
    setHasInteracted(true);
    
    let targetScreen = null;
    try {
      if ('getScreenDetails' in window) {
        // @ts-ignore
        const screenDetails = await window.getScreenDetails();
        const externalScreen = screenDetails.screens.find((s: any) => !s.isInternal) || screenDetails.screens[1];
        
        if (externalScreen) {
          targetScreen = externalScreen;
          window.moveTo(externalScreen.left, externalScreen.top);
          window.resizeTo(externalScreen.width, externalScreen.height);
        }
      }
    } catch (e) {
      console.warn('Screen details error', e);
    }

    if (!document.fullscreenElement) {
      try {
        if (targetScreen) {
          // @ts-ignore
          await document.documentElement.requestFullscreen({ screen: targetScreen });
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.log('Fullscreen error:', err);
      }
    } else {
      document.exitFullscreen();
    }
  };



  const isLowerThird = (liveState?.layoutMode || 'lower-third') === 'lower-third';
  const styles = getThemeStyles(activePreset, isLowerThird);

  // If no scripture is live, render a beautiful standby display
  if (!liveState) {
    return (
      <div onDoubleClick={toggleFullscreen} className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center text-zinc-500 font-sans text-center p-8 select-none border-[12px] border-zinc-950">
        
      {/* Fullscreen Overlay */}
      {!hasInteracted && !document.fullscreenElement && (
        <div 
          onClick={toggleFullscreen}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white cursor-pointer backdrop-blur-sm transition-opacity duration-500"
        >
          <Maximize className="w-16 h-16 mb-4 text-zinc-400 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-widest uppercase mb-2">Click to Enter Fullscreen</h2>
          <p className="text-zinc-400 font-medium max-w-md text-center">
            For a seamless, distraction-free projection, click anywhere to hide the browser address bar and toolbars.
          </p>
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-[#09090b] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center space-y-6">
          <div className="w-20 h-20 rounded-full border border-zinc-800 bg-zinc-900/50 shadow-2xl flex items-center justify-center backdrop-blur-xl">
            <Tv className="w-8 h-8 text-zinc-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-medium tracking-[0.2em] text-zinc-300">NDI PROGRAM OUT</h3>
            <p className="text-[11px] font-sans text-zinc-600 max-w-md mx-auto uppercase tracking-widest leading-relaxed">
              Output standing by. Awaiting live feed from Projection Studio.
            </p>
          </div>

          <div className="mt-8 flex gap-3 justify-center items-center px-4 py-2 rounded-full border border-zinc-800/60 bg-zinc-900/30">
            <span className="flex h-2 w-2 relative items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="text-[10px] text-emerald-500 tracking-[0.25em] uppercase font-bold">Signal Ready</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onDoubleClick={toggleFullscreen} className={`fixed inset-0 ${styles.pageBg} overflow-hidden font-sans select-none flex flex-col justify-end transition-colors duration-300`}>
      {/* Fullscreen Overlay */}
      {!hasInteracted && !document.fullscreenElement && (
        <div 
          onClick={toggleFullscreen}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white cursor-pointer backdrop-blur-sm transition-opacity duration-500"
        >
          <Maximize className="w-16 h-16 mb-4 text-zinc-400 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-widest uppercase mb-2">Click to Enter Fullscreen</h2>
          <p className="text-zinc-400 font-medium max-w-md text-center">
            For a seamless, distraction-free projection, click anywhere to hide the browser address bar and toolbars.
          </p>
        </div>
      )}
      
      {/* Main Alignment framework */}

      <div className={`w-full transition-all duration-300 ${
        !isLowerThird 
          ? 'h-full flex flex-col justify-center items-center p-8 md:p-16' 
          : 'w-full'
      }`}>
        
        {/* Presentation Slide Container */}
        <div className={`transition-all duration-350 flex flex-col overflow-hidden ${styles.container} ${
          !isLowerThird 
            ? 'w-[95vw] max-w-[120rem] py-32 px-16 sm:px-24 md:px-32 rounded-[3rem] relative shadow-2xl' 
            : 'w-full h-[33vh] min-h-[170px] max-h-[45vh] sm:min-h-[200px] sm:max-h-[45vh] justify-center px-8 sm:px-12 md:px-24 lg:px-32 rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-[4px] border-x-0 border-b-0'
        }`}
          id="projector-live-slide"
        >
          {/* Upper Header info */}
          <div className={`flex items-center justify-between font-sans leading-none w-full ${
            isLowerThird 
              ? 'text-xs sm:text-sm md:text-base lg:text-lg mb-2 pb-2 border-b border-white/10' 
              : 'text-sm sm:text-base mb-5 pb-3 border-b border-white/10'
          } ${styles.textShadow}`}>
            <span className={`uppercase font-bold tracking-wider ${styles.label}`}>
              {liveState.isCustomLabelEnabled ? liveState.translationLabel : mapTranslationShorthandToFullName(liveState.liveTranslation)}
            </span>
            <span className={`tracking-wide ${styles.ref} ${isLowerThird ? 'text-sm sm:text-lg lg:text-xl' : 'text-base sm:text-lg'}`}>
              {liveState.book} {liveState.chapter}:{liveState.verseNumber}
            </span>
          </div>

          {/* Core Scripture Body */}
          <div 
            className={`w-full whitespace-pre-wrap transition-all leading-normal ${styles.textShadow} ${
              liveState.fontFamily === 'serif' ? 'font-serif' : liveState.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
            } ${
              liveState.isBold ? 'font-bold' : 'font-normal'
            } ${
              liveState.isItalic ? 'italic' : 'not-italic'
            }`}
            style={{ 
              fontSize: `${isLowerThird ? Math.max(48, liveState.fontSize * 2.0) : liveState.fontSize * 1.5 + 8}px`, 
              textAlign: liveState.alignment,
              lineHeight: '1.3'
            }}
          >
            {liveState.verseText}
          </div>

          {/* Decorative accents for professional presentation look */}
          {activePreset === 'sapphire-gold' && (
            <div className={`w-full flex items-center justify-between h-1.5 ${
              isLowerThird ? 'mt-2.5' : 'mt-6'
            }`}>
              <span className="w-1/3 h-[2px] bg-gradient-to-r from-amber-400 to-transparent" />
              <div className="flex gap-2 justify-center items-center">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full rotate-45" />
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              </div>
              <span className="w-1/3 h-[2px] bg-gradient-to-l from-amber-400 to-transparent" />
            </div>
          )}
          {activePreset === 'cyber-slate' && (
            <div className={`w-full h-[1.5px] bg-cyan-500/20 ${
              isLowerThird ? 'mt-3 z-10' : 'mt-6'
            }`} />
          )}
        </div>

      </div>

    </div>
  );
}
