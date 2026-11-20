import { useState, useEffect, useCallback } from 'react';

export type StudioDeckTheme = 'obsidian' | 'stealth' | 'crimson';

export const STUDIO_DECK_THEME_STORAGE_KEY = 'logosbridge_studio_deck_theme';

export function getStoredStudioDeckTheme(): StudioDeckTheme {
  try {
    const saved = localStorage.getItem(STUDIO_DECK_THEME_STORAGE_KEY);
    if (saved === 'obsidian' || saved === 'stealth' || saved === 'crimson') {
      return saved;
    }
  } catch {}
  return 'obsidian';
}

export function setStoredStudioDeckTheme(theme: StudioDeckTheme) {
  try {
    localStorage.setItem(STUDIO_DECK_THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('studio-deck-theme-change', { detail: theme }));
  } catch {}
}

export function useStudioDeckTheme(): [StudioDeckTheme, (t: StudioDeckTheme) => void] {
  const [theme, setThemeState] = useState<StudioDeckTheme>(getStoredStudioDeckTheme);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) setThemeState(e.detail);
    };
    window.addEventListener('studio-deck-theme-change', handleThemeChange);
    return () => window.removeEventListener('studio-deck-theme-change', handleThemeChange);
  }, []);

  const setTheme = useCallback((t: StudioDeckTheme) => {
    setThemeState(t);
    setStoredStudioDeckTheme(t);
  }, []);

  return [theme, setTheme];
}

export interface StudioThemeTokens {
  chassisBg: string;
  containerBg: string;
  stripBg: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  modalBg: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  highlightText: string;
  activeItemBg: string;
  hoverItemBg: string;
  pillBg: string;
  mutedText: string;
  subtleText: string;
  badgeBg: string;
}

export function getStudioThemeTokens(theme: StudioDeckTheme): StudioThemeTokens {
  if (theme === 'stealth') {
    return {
      chassisBg: 'bg-[#080d0a] text-emerald-100/90',
      containerBg: 'bg-[#0d1410] border-emerald-950/80',
      stripBg: 'bg-[#090f0c] border-emerald-950/70',
      cardBg: 'bg-[#131d16] border-emerald-900/60',
      cardBorder: 'border-emerald-900/60',
      inputBg: 'bg-[#080d0a] border-emerald-900/80 text-emerald-100 focus:border-emerald-400',
      modalBg: 'bg-[#0d1410] border-emerald-900/80',
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-500/20 text-emerald-300',
      accentBorder: 'border-emerald-500/50',
      highlightText: 'text-emerald-400',
      activeItemBg: 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 font-bold',
      hoverItemBg: 'hover:bg-emerald-950/40',
      pillBg: 'bg-[#101a13] border border-emerald-900/70 text-emerald-200',
      mutedText: 'text-emerald-300/70',
      subtleText: 'text-emerald-400/40',
      badgeBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50'
    };
  }

  if (theme === 'crimson') {
    return {
      chassisBg: 'bg-[#0e070a] text-rose-100/90',
      containerBg: 'bg-[#160c11] border-rose-950/80',
      stripBg: 'bg-[#11080d] border-rose-950/70',
      cardBg: 'bg-[#1e1017] border-rose-900/60',
      cardBorder: 'border-rose-900/60',
      inputBg: 'bg-[#0e070a] border-rose-900/80 text-rose-100 focus:border-rose-400',
      modalBg: 'bg-[#160c11] border-rose-900/80',
      accentText: 'text-rose-400',
      accentBg: 'bg-rose-500/20 text-rose-300',
      accentBorder: 'border-rose-500/50',
      highlightText: 'text-rose-400',
      activeItemBg: 'bg-rose-500/15 border border-rose-500/40 text-rose-100 font-bold',
      hoverItemBg: 'hover:bg-rose-950/40',
      pillBg: 'bg-[#1f0f18] border border-rose-900/70 text-rose-200',
      mutedText: 'text-rose-300/70',
      subtleText: 'text-rose-400/40',
      badgeBg: 'bg-rose-950/70 text-rose-300 border-rose-800/50'
    };
  }

  // Obsidian
  return {
    chassisBg: 'bg-[#0b0e14] text-slate-100',
    containerBg: 'bg-[#111622] border-slate-800/80',
    stripBg: 'bg-[#0e1420] border-slate-800/60',
    cardBg: 'bg-[#161d2d] border-slate-700/60',
    cardBorder: 'border-slate-700/60',
    inputBg: 'bg-[#0b0e14] border-slate-700/80 text-white focus:border-blue-400',
    modalBg: 'bg-[#111622] border-slate-700/80',
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500/20 text-blue-300',
    accentBorder: 'border-blue-500/50',
    highlightText: 'text-blue-400',
    activeItemBg: 'bg-blue-500/15 border border-blue-500/40 text-blue-100 font-bold',
    hoverItemBg: 'hover:bg-slate-800/40',
    pillBg: 'bg-[#161d2d] border border-slate-700 text-slate-200',
    mutedText: 'text-slate-400',
    subtleText: 'text-slate-500',
    badgeBg: 'bg-slate-800/60 text-slate-300 border-slate-700/40'
  };
}

// ── Synthesized Mechanical Audio Feedback (Silenced upon user request) ──
export function playHardwareClick(_freq: number = 240, _isDepress: boolean = true) {
  // Beep sound in studio permanently silenced
  return;
}

export type TactileColor =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'purple'
  | 'green'
  | 'default'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'success';

export interface TactileBtnOptions {
  color?: TactileColor;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

// ── The 3 Rules of Digital Hardware CSS Classes ──
// Rule 1: The Mechanical Press (4px drop shadow + active:translate-y-[3px/4px] active:shadow-none)
// Rule 2: The Snap-Back Transition (duration-100 spring)
// Rule 3: The Digital LED State (depressed inset shadow + glowing diode)
export function getTactileBtnClass(
  theme: StudioDeckTheme,
  isActiveOrOptions: boolean | TactileBtnOptions = false,
  activeColor: TactileColor = 'blue'
): string {
  let isActive = false;
  let resolvedColor: TactileColor = activeColor;

  if (typeof isActiveOrOptions === 'boolean') {
    isActive = isActiveOrOptions;
  } else if (isActiveOrOptions && typeof isActiveOrOptions === 'object') {
    isActive = !!isActiveOrOptions.active;
    if (isActiveOrOptions.color) {
      resolvedColor = isActiveOrOptions.color;
    }
  }

  // Normalize aliases
  if (resolvedColor === 'green' || resolvedColor === 'success') resolvedColor = 'emerald';
  if (resolvedColor === 'danger') resolvedColor = 'rose';
  if (resolvedColor === 'warning') resolvedColor = 'amber';
  if (resolvedColor === 'accent' || resolvedColor === 'default') {
    resolvedColor = theme === 'crimson' ? 'rose' : theme === 'stealth' ? 'emerald' : 'blue';
  }

  // Enforce Theme Palette Purity
  if (theme === 'stealth') {
    // Stealth Titanium: Strictly Green
    resolvedColor = 'emerald';
  } else if (theme === 'crimson') {
    // Midnight Crimson: Strictly Crimson Red and Green (emerald for live/audio, rose for everything else)
    if (resolvedColor !== 'emerald') {
      resolvedColor = 'rose';
    }
  }

  const base = 'relative select-none transition-all duration-100 cursor-pointer ';

  if (theme === 'obsidian') {
    if (isActive) {
      const glow =
        resolvedColor === 'emerald'
          ? 'border-emerald-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(16,185,129,0.22)] text-emerald-400'
          : resolvedColor === 'rose'
          ? 'border-rose-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(244,63,94,0.25)] text-rose-400'
          : resolvedColor === 'amber'
          ? 'border-amber-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(245,158,11,0.22)] text-amber-400'
          : resolvedColor === 'cyan'
          ? 'border-cyan-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(6,182,212,0.22)] text-cyan-400'
          : resolvedColor === 'purple'
          ? 'border-purple-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(168,85,247,0.22)] text-purple-400'
          : 'border-blue-500/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(59,130,246,0.2)] text-blue-400';
      return `${base} bg-[#0e1420] border scale-[0.98] ${glow}`;
    }
    return `${base} bg-[#1a2232] border border-slate-700 shadow-[0_4px_0_rgb(12,16,23),0_8px_16px_rgba(0,0,0,0.3)] text-slate-300 hover:bg-[#222c40] hover:text-white active:translate-y-[4px] active:shadow-[0_0px_0_rgb(12,16,23)]`;
  }

  if (theme === 'stealth') {
    if (isActive) {
      return `${base} bg-[#0f1a13] border border-emerald-500/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(16,185,129,0.35)] text-emerald-400 scale-[0.98]`;
    }
    return `${base} bg-[#141f18] border border-emerald-900/70 shadow-[0_4px_0_rgb(6,12,8),0_8px_16px_rgba(0,0,0,0.4)] text-emerald-100/90 hover:bg-[#1a2820] hover:text-emerald-50 hover:border-emerald-700/70 active:translate-y-[4px] active:shadow-[0_0px_0_rgb(6,12,8)]`;
  }

  // theme === 'crimson'
  if (isActive) {
    if (resolvedColor === 'emerald') {
      return `${base} bg-[#101812] border border-emerald-500/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_15px_rgba(16,185,129,0.35)] text-emerald-400 scale-[0.98]`;
    }
    return `${base} bg-[#1c0d15] border border-rose-500/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.7),0_0_18px_rgba(244,63,94,0.35)] text-rose-400 scale-[0.98]`;
  }
  return `${base} bg-[#22121b] border border-rose-900/70 shadow-[0_4px_0_rgb(16,6,10),0_8px_16px_rgba(0,0,0,0.4)] text-rose-100/90 hover:bg-[#2c1723] hover:text-rose-50 hover:border-rose-700/70 active:translate-y-[4px] active:shadow-[0_0px_0_rgb(16,6,10)]`;
}

export function getTactileLedClass(
  themeOrActive: StudioDeckTheme | boolean,
  isActiveOrColor?: boolean | string,
  maybeColor: TactileColor = 'blue'
): string {
  let theme: StudioDeckTheme = 'obsidian';
  let isActive = false;
  let resolvedColor: string = 'blue';

  if (typeof themeOrActive === 'boolean') {
    theme = getStoredStudioDeckTheme();
    isActive = themeOrActive;
    if (typeof isActiveOrColor === 'string') {
      resolvedColor = isActiveOrColor;
    }
  } else {
    theme = themeOrActive;
    isActive = !!isActiveOrColor;
    if (maybeColor) resolvedColor = maybeColor;
  }

  if (resolvedColor === 'green' || resolvedColor === 'success') resolvedColor = 'emerald';
  if (resolvedColor === 'danger') resolvedColor = 'rose';
  if (resolvedColor === 'warning') resolvedColor = 'amber';

  if (!isActive) {
    if (theme === 'stealth') {
      return 'w-1.5 h-1.5 rounded-full bg-emerald-950/80 shadow-inner transition-colors duration-300';
    }
    if (theme === 'crimson') {
      return 'w-1.5 h-1.5 rounded-full bg-rose-950/80 shadow-inner transition-colors duration-300';
    }
    return 'w-1.5 h-1.5 rounded-full bg-slate-700 shadow-inner transition-colors duration-300';
  }

  // Theme Purity for Active LEDs
  if (theme === 'stealth') {
    return 'w-1.5 h-1.5 rounded-full transition-colors duration-300 bg-emerald-400 shadow-[0_0_8px_#34d399]';
  }

  if (theme === 'crimson') {
    if (resolvedColor === 'emerald') {
      return 'w-1.5 h-1.5 rounded-full transition-colors duration-300 bg-emerald-400 shadow-[0_0_8px_#34d399]';
    }
    return 'w-1.5 h-1.5 rounded-full transition-colors duration-300 bg-rose-500 shadow-[0_0_8px_#f43f5e]';
  }

  // Obsidian theme color map
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]',
    emerald: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    amber: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    rose: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
    purple: 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
  };

  return `w-1.5 h-1.5 rounded-full transition-colors duration-300 ${colorMap[resolvedColor] || colorMap.blue}`;
}
