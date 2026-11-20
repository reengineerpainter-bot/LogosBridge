import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Home,
  BookOpen,
  Layers,
  Radio
} from 'lucide-react';

export interface UnifiedReaderDockProps {
  theme: 'light' | 'dark';
  mainView: 'home' | 'read' | 'interlinear' | 'live';
  isReaderScrolledDown: boolean;
  isKeyboardOpen: boolean;
  activeDraftVerse: number | null;
  isBottomControlsHidden: boolean;
  bottomNavHeight: number;
  bottomNavRef: React.RefObject<HTMLDivElement | null>;
  selectedBook: string;
  selectedChapter: number;
  isPlayingAudio: boolean;
  fullPageMenu: string | null;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenBookPicker: () => void;
  onToggleAudio: () => void;
  onOpenTranslationPicker: () => void;
  onSelectTab: (tab: 'home' | 'read' | 'interlinear' | 'live') => void;
}

/**
 * 🛡️ FROZEN ARCHITECTURE COMPONENT: UnifiedReaderDock
 * 
 * Houses the contoured silhouette curve profile, central Reader Pill capsule,
 * and the 4 navigation tabs (Home, Read, Study, Live).
 * 
 * Protected by permanent invariant rules in AGENTS.md.
 * Failsafe visibility: Navigation tabs are always rendered and accessible
 * across Home, Read, and Study views.
 */
export const UnifiedReaderDock: React.FC<UnifiedReaderDockProps> = React.memo(({
  theme,
  mainView,
  isReaderScrolledDown,
  isKeyboardOpen,
  activeDraftVerse,
  isBottomControlsHidden,
  bottomNavHeight,
  bottomNavRef,
  selectedBook,
  selectedChapter,
  isPlayingAudio,
  fullPageMenu,
  onPrevChapter,
  onNextChapter,
  onOpenBookPicker,
  onToggleAudio,
  onOpenTranslationPicker,
  onSelectTab
}) => {
  // Never render on Homepage or Live view (strictly active on Scripture Read & Study views)
  if (mainView === 'home' || mainView === 'live') {
    return null;
  }

  const isReadingView = mainView === 'read' || mainView === 'interlinear';

  return (
    <div
      id="unified-bottom-compound-dock"
      className={`fixed bottom-0 left-0 right-0 w-full z-[1300] flex flex-col items-center pointer-events-none ${
        isBottomControlsHidden ? 'opacity-0 pointer-events-none invisible' : 'opacity-100'
      }`}
      style={{
        transform: isBottomControlsHidden
          ? 'translate3d(0, 100%, 0)'
          : (isReaderScrolledDown && (mainView === 'read' || mainView === 'interlinear'))
          ? `translate3d(0, ${bottomNavHeight}px, 0)`
          : 'translate3d(0, 0, 0)',
        transition: (isKeyboardOpen || activeDraftVerse !== null)
          ? 'none'
          : 'transform 300ms ease-in-out, opacity 300ms ease-in-out',
        visibility: isBottomControlsHidden ? 'hidden' : 'visible',
        willChange: isBottomControlsHidden ? 'auto' : 'transform'
      }}
    >
      {/* ── UPPER SECTION: CONTOURED TOP PROFILE (Home, Read, Study) ── */}
      {isReadingView && (
        <div
          id="reader-pill-upper-section"
          data-reader-dock="true"
          className="w-full flex items-end justify-center pointer-events-auto"
        >
          {/* Left straight horizontal line running straight to the left edge of the screen */}
          <div
            className={`flex-1 h-[1.5px] ${
              theme === 'light' ? 'bg-zinc-200/90' : 'bg-[#382e27]'
            }`}
          />

          {/* Left Shoulder: curves down from the left of the reader pill */}
          <svg className="w-6 h-12 shrink-0 -mr-[1px] block overflow-visible" viewBox="0 0 24 48" fill="none">
            <path
              d="M 0,48 C 12,48 24,28 24,0 L 24,48 Z"
              className={theme === 'light' ? 'fill-white' : 'fill-[#1e1916]'}
            />
            <path
              d="M 0,48 C 12,48 24,28 24,0"
              stroke={theme === 'light' ? 'rgba(228, 228, 231, 0.9)' : '#382e27'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Central Reader Pill Dome */}
          <div
            className={`shrink-0 flex items-center px-2 sm:px-3 pt-2 pb-1 rounded-t-2xl border-t border-zinc-200/90 dark:border-[#382e27] ${
              theme === 'light' ? 'bg-white' : 'bg-[#1e1916]'
            } shadow-[0_-8px_30px_rgba(0,0,0,0.08)]`}
          >
            <div className="flex items-center space-x-1.5">
              {/* Unified Book/Chapter Pill Capsule */}
              <div
                className={`flex items-center h-9 rounded-xl border shadow-sm overflow-hidden select-none ${
                  theme === 'light'
                    ? 'bg-zinc-100/90 border-zinc-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'bg-[#28211c]/90 border-[#3d322b] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                }`}
              >
                {/* Left Rounded End Cap (Previous Chapter) */}
                <button
                  type="button"
                  className={`h-full px-2.5 flex items-center justify-center transition-colors cursor-pointer border-r ${
                    theme === 'light'
                      ? 'bg-zinc-200/80 hover:bg-zinc-300 text-black border-zinc-300/80 active:bg-zinc-400'
                      : 'bg-[#342b25] hover:bg-[#3f342c] text-[#faf6f0] border-[#483d34] active:bg-[#4a3e35]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevChapter();
                  }}
                  title="Previous Chapter"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[3]" />
                </button>

                {/* Middle Container: "Book Chapter" side-by-side */}
                <div
                  className={`h-full px-3 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'hover:bg-white text-black'
                      : 'hover:bg-[#342b25] text-[#faf6f0]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBookPicker();
                  }}
                  title="Select Book and Chapter"
                >
                  <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap">
                    {selectedBook} {selectedChapter}
                  </span>
                </div>

                {/* Right Rounded End Cap (Next Chapter) */}
                <button
                  type="button"
                  className={`h-full px-2.5 flex items-center justify-center transition-colors cursor-pointer border-l ${
                    theme === 'light'
                      ? 'bg-zinc-200/80 hover:bg-zinc-300 text-black border-zinc-300/80 active:bg-zinc-400'
                      : 'bg-[#342b25] hover:bg-[#3f342c] text-[#faf6f0] border-[#483d34] active:bg-[#4a3e35]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextChapter();
                  }}
                  title="Next Chapter"
                >
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Thin divider */}
              <div className={`w-px h-6 mx-0.5 ${theme === 'light' ? 'bg-zinc-300' : 'bg-[#483d34]'}`} />

              {/* Audio Play Button */}
              <button
                type="button"
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                  theme === 'light'
                    ? (isPlayingAudio
                        ? 'bg-zinc-900 text-white border border-zinc-700 shadow-zinc-900/30'
                        : 'bg-black text-white hover:bg-zinc-800 shadow-black/30')
                    : (isPlayingAudio
                        ? 'bg-[#faf6f0] text-[#191512] border border-zinc-300 shadow-zinc-100/30'
                        : 'bg-[#faf6f0] text-[#191512] hover:bg-white shadow-white/30')
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAudio();
                }}
                title={isPlayingAudio ? 'Stop Audio' : 'Play Audio'}
              >
                {isPlayingAudio ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                )}
              </button>

              {/* Translation Badge (Visible across Home, Read, Study) */}
              {mainView !== 'live' && (
                <div
                  className="h-9 px-3 cursor-pointer rounded-xl bg-zinc-100 dark:bg-[#28211c] hover:bg-zinc-200 dark:hover:bg-[#342b25] border border-zinc-300/80 dark:border-[#382e27] shadow-sm transition flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTranslationPicker();
                  }}
                  title="Select Translation"
                >
                  <span className={`text-[11px] font-black tracking-wider uppercase ${
                    theme === 'light' ? 'text-black' : 'text-[#faf6f0]'
                  }`}>
                    KJV
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Shoulder: curves down to the right of the play audio / badge */}
          <svg className="w-6 h-12 shrink-0 -mr-[1px] block overflow-visible" viewBox="0 0 24 48" fill="none">
            <path
              d="M 0,0 C 0,28 12,48 24,48 L 0,48 Z"
              className={theme === 'light' ? 'fill-white' : 'fill-[#1e1916]'}
            />
            <path
              d="M 0,0 C 0,28 12,48 24,48"
              stroke={theme === 'light' ? 'rgba(228, 228, 231, 0.9)' : '#382e27'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Right straight horizontal line running straight to the right edge of the screen */}
          <div
            className={`flex-1 h-[1.5px] ${
              theme === 'light' ? 'bg-zinc-200/90' : 'bg-[#382e27]'
            }`}
          />
        </div>
      )}

      {/* ── LOWER SECTION: 4 NAVIGATION TABS (Home, Read, Study, Live) ── */}
      <div
        ref={bottomNavRef}
        className={`w-full flex items-center justify-around px-3 sm:px-6 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] ${
          (isReaderScrolledDown && (mainView === 'read' || mainView === 'interlinear'))
            ? 'pointer-events-none shadow-none'
            : 'pointer-events-auto shadow-[0_-8px_30px_rgba(0,0,0,0.15)]'
        } ${
          theme === 'light' ? 'bg-white' : 'bg-[#1e1916]'
        }`}
      >
        {/* Home Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex flex-col items-center justify-center p-2 rounded-[1.25rem] transition-all group cursor-pointer"
        >
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${
              !fullPageMenu && mainView === 'home'
                ? (theme === 'light'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30] shadow-sm')
                : (theme === 'light'
                    ? 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]')
            }`}
          >
            <Home className="w-6 h-6" strokeWidth={!fullPageMenu && mainView === 'home' ? 3 : 2} />
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors ${
              !fullPageMenu && mainView === 'home'
                ? (theme === 'light' ? 'text-black' : 'text-[#faf6f0]')
                : (theme === 'light' ? 'text-zinc-400' : 'text-[#b5a99a]')
            }`}
          >
            Home
          </span>
        </button>

        {/* Read Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('read')}
          className="flex flex-col items-center justify-center p-2 rounded-[1.25rem] transition-all group cursor-pointer"
        >
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${
              !fullPageMenu && mainView === 'read'
                ? (theme === 'light'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30] shadow-sm')
                : (theme === 'light'
                    ? 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]')
            }`}
          >
            <BookOpen className="w-6 h-6" strokeWidth={!fullPageMenu && mainView === 'read' ? 3 : 2} />
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors ${
              !fullPageMenu && mainView === 'read'
                ? (theme === 'light' ? 'text-black' : 'text-[#faf6f0]')
                : (theme === 'light' ? 'text-zinc-400' : 'text-[#b5a99a]')
            }`}
          >
            Read
          </span>
        </button>

        {/* Study Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('interlinear')}
          className="flex flex-col items-center justify-center p-2 rounded-[1.25rem] transition-all group cursor-pointer"
        >
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${
              !fullPageMenu && mainView === 'interlinear'
                ? (theme === 'light'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30] shadow-sm')
                : (theme === 'light'
                    ? 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]')
            }`}
          >
            <Layers className="w-6 h-6" strokeWidth={!fullPageMenu && mainView === 'interlinear' ? 3 : 2} />
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors ${
              !fullPageMenu && mainView === 'interlinear'
                ? (theme === 'light' ? 'text-black' : 'text-[#faf6f0]')
                : (theme === 'light' ? 'text-zinc-400' : 'text-[#b5a99a]')
            }`}
          >
            Study
          </span>
        </button>

        {/* Live Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('live')}
          className="flex flex-col items-center justify-center p-2 rounded-[1.25rem] transition-all group cursor-pointer"
        >
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${
              !fullPageMenu && mainView === 'live'
                ? (theme === 'light'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-[#342b25] text-[#faf6f0] border border-[#483a30] shadow-sm')
                : (theme === 'light'
                    ? 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    : 'text-[#dcd3c6] hover:text-[#faf6f0] hover:bg-[#28211c]')
            }`}
          >
            <Radio className="w-6 h-6" strokeWidth={!fullPageMenu && mainView === 'live' ? 3 : 2} />
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors ${
              !fullPageMenu && mainView === 'live'
                ? (theme === 'light' ? 'text-black' : 'text-[#faf6f0]')
                : (theme === 'light' ? 'text-zinc-400' : 'text-[#b5a99a]')
            }`}
          >
            Live
          </span>
        </button>
      </div>
    </div>
  );
});

UnifiedReaderDock.displayName = 'UnifiedReaderDock';
