import './index.css';

interface LiveProjectionState {
  book: string;
  chapter: number;
  verseText: string;
  verseNumber: number;
  themePreset: 'sapphire-gold' | 'chroma-green' | 'cyber-slate' | 'amber-parchment' | 'glass-minimal';
  layoutMode: 'lower-third' | 'projector-slide';
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
  if (name === 'asv') return 'AMERICAN STANDARD VERSION';
  if (name === 'ylt') return 'YOUNG\'S LITERAL TRANSLATION';
  if (name === 'bbe') return 'BIBLE IN BASIC ENGLISH';
  return shortName.toUpperCase();
};

const getThemeStyles = (preset: string, isLowerThird: boolean) => {
  switch (preset) {
    case 'sapphire-gold':
      return {
        container: `bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white ${
          isLowerThird ? 'border-t-4 border-b-0 border-x-0 rounded-none' : 'border-4 rounded-3xl'
        } border-amber-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]`,
        label: 'text-amber-500 font-semibold tracking-widest',
        ref: 'text-amber-100 font-medium',
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
        pageBg: isLowerThird ? 'bg-transparent' : 'bg-[#000000]',
        textShadow: 'drop-shadow-[0_4px_12px_rgba(0,0,0,1)]',
      };
    default:
      return {
        container: 'bg-zinc-900 text-white border rounded-3xl',
        label: 'text-zinc-300',
        ref: 'text-white',
        pageBg: 'bg-[#000000]',
        textShadow: '',
      };
  }
};

if (typeof window !== 'undefined') {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.onSlideUpdate) {
    electronAPI.onSlideUpdate((state: LiveProjectionState | null) => {
      console.log('[Projection Window] Received slide update:', state);
      const pageEl = document.getElementById('page');
      const innerContainerEl = document.getElementById('inner-container');
      const slideEl = document.getElementById('slide');
      const labelEl = document.getElementById('label');
      const refEl = document.getElementById('reference');
      const textEl = document.getElementById('text');
      const standbyEl = document.getElementById('standby');
      const accentsEl = document.getElementById('accents');

      if (!state) {
        // Standby Mode
        if (pageEl) pageEl.className = 'fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center text-zinc-500 font-sans text-center p-8 select-none border-[12px] border-zinc-950';
        if (innerContainerEl) innerContainerEl.style.display = 'none';
        if (standbyEl) standbyEl.style.display = 'flex';
        return;
      }

      // Live Mode
      if (standbyEl) standbyEl.style.display = 'none';
      if (innerContainerEl) innerContainerEl.style.display = 'flex';

      const isLowerThird = state.layoutMode === 'lower-third';
      const styles = getThemeStyles(state.themePreset, isLowerThird);

      // Page Background
      if (pageEl) {
        pageEl.className = `fixed inset-0 ${styles.pageBg} overflow-hidden font-sans select-none flex flex-col justify-end transition-colors duration-300`;
        
        // Ensure absolutely no scrollbars ever flash in the native window
        if (!document.getElementById('projector-global-styles')) {
          const style = document.createElement('style');
          style.id = 'projector-global-styles';
          style.innerHTML = `
            body, html { overflow: hidden !important; }
            ::-webkit-scrollbar { display: none !important; }
            * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
          `;
          document.head.appendChild(style);
        }
      }

      // Inner container structure
      if (innerContainerEl) {
        innerContainerEl.className = `w-full transition-all duration-300 ${
          !isLowerThird 
            ? 'h-full flex flex-col justify-center items-center p-8 md:p-16' 
            : 'w-full'
        }`;
      }

      // Slide Container
      if (slideEl) {
        slideEl.className = `transition-all duration-350 flex flex-col overflow-hidden ${styles.container} ${
          !isLowerThird 
            ? 'w-[95vw] max-w-[120rem] py-32 px-16 sm:px-24 md:px-32 rounded-[3rem] relative shadow-2xl' 
            : 'w-full h-[33vh] min-h-[170px] max-h-[45vh] sm:min-h-[200px] sm:max-h-[45vh] justify-center px-8 sm:px-12 md:px-24 lg:px-32 rounded-none shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-[4px] border-x-0 border-b-0'
        }`;
      }

      // Header Labels
      if (labelEl) {
        labelEl.textContent = state.isCustomLabelEnabled ? state.translationLabel : mapTranslationShorthandToFullName(state.liveTranslation);
        labelEl.className = `uppercase font-bold tracking-wider ${styles.label}`;
      }
      if (refEl) {
        refEl.textContent = `${state.book} ${state.chapter}:${state.verseNumber}`;
        refEl.className = `tracking-wide ${styles.ref} ${isLowerThird ? 'text-sm sm:text-lg lg:text-xl' : 'text-base sm:text-lg lg:text-2xl'}`;
      }

      const headerEl = document.getElementById('header');
      if (headerEl) {
        headerEl.className = `flex items-center justify-between font-sans leading-none w-full ${
          isLowerThird 
            ? 'text-xs sm:text-sm md:text-base lg:text-lg mb-2 pb-2 border-b border-white/10' 
            : 'text-sm sm:text-base mb-5 pb-3 border-b border-white/10'
        } ${styles.textShadow}`;
      }

      // Main Text Body
      if (textEl) {
        textEl.textContent = state.verseText;
        textEl.className = `w-full whitespace-pre-wrap transition-all leading-normal ${styles.textShadow} ${
          state.fontFamily === 'serif' ? 'font-serif' : state.fontFamily === 'mono' ? 'font-mono' : 'font-sans'
        } ${state.isBold ? 'font-bold' : 'font-normal'} ${state.isItalic ? 'italic' : 'not-italic'}`;
        
        const size = isLowerThird ? Math.max(48, state.fontSize * 2.0) : state.fontSize * 1.5 + 8;
        textEl.style.fontSize = `${size}px`;
        textEl.style.textAlign = state.alignment;
        textEl.style.lineHeight = '1.3';
      }

      // Accents rendering
      if (accentsEl) {
        if (state.themePreset === 'sapphire-gold') {
          accentsEl.style.display = 'flex';
          accentsEl.className = `w-full flex items-center justify-between h-1.5 ${isLowerThird ? 'mt-2.5' : 'mt-6'}`;
          accentsEl.innerHTML = `
            <span class="w-1/3 h-[2px] bg-gradient-to-r from-amber-400 to-transparent"></span>
            <div class="flex gap-2 justify-center items-center">
              <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
              <span class="w-2.5 h-2.5 bg-amber-400 rounded-full rotate-45"></span>
              <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            </div>
            <span class="w-1/3 h-[2px] bg-gradient-to-l from-amber-400 to-transparent"></span>
          `;
        } else if (state.themePreset === 'cyber-slate') {
          accentsEl.style.display = 'block';
          accentsEl.className = `w-full h-[1.5px] bg-cyan-500/20 ${isLowerThird ? 'mt-3 z-10' : 'mt-6'}`;
          accentsEl.innerHTML = '';
        } else {
          accentsEl.style.display = 'none';
        }
      }
    });
  }
}
