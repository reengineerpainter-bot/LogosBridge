/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserStudyState, DiscipleshipCard } from '../../types/discipleship';
import defaultCardsRaw from '../../config/discipleship_cards.json';
import { getUserStudyState } from '../../services/studySessionTracker';

/**
 * Converts category tags (e.g. "REST & RENEWAL") into elegant Title Case (e.g. "Rest & Renewal")
 */
export function formatCategoryLabel(rawLabel?: string): string {
  if (!rawLabel) return 'Grace';
  return rawLabel
    .split(' ')
    .map((word) => {
      if (word === '&') return '&';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}


export interface DailyPulseCheckProps {
  userStudyState?: UserStudyState;
  onSelectCard: (card: DiscipleshipCard) => void;
  onFocusCard?: (card: DiscipleshipCard) => void;
  onSubmitCustomText: (text: string) => void;
  theme?: 'light' | 'dark';
  cards?: DiscipleshipCard[];
  className?: string;
  selectedCardId?: string | null;
}

export const DailyPulseCheck: React.FC<DailyPulseCheckProps> = ({
  userStudyState,
  onSelectCard,
  onFocusCard,
  onSubmitCustomText,
  theme = 'light',
  cards = defaultCardsRaw as DiscipleshipCard[],
  className = '',
  selectedCardId = null,
}) => {
  const [customText, setCustomText] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(selectedCardId);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // 3D Cube Interactive Drag / Swipe State
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Fallback to persisted session state if none passed
  const activeState = useMemo(() => {
    return userStudyState || getUserStudyState();
  }, [userStudyState]);

  const isLight = theme === 'light';

  // 3D Cube Gesture Navigation
  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectedState) return;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startXRef.current;
    // Boundary resistance at start/end of cards list
    if ((activeIndex === 0 && delta > 0) || (activeIndex === cards.length - 1 && delta < 0)) {
      setDragOffset(delta * 0.3);
    } else {
      setDragOffset(delta);
    }
    currentXRef.current = e.clientX;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = currentXRef.current - startXRef.current;
    const timeDelta = Date.now() - startTimeRef.current;
    const velocity = Math.abs(delta) / (timeDelta || 1);

    const threshold = 45;
    if ((delta < -threshold || (delta < -20 && velocity > 0.35)) && activeIndex < cards.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if ((delta > threshold || (delta > 20 && velocity > 0.35)) && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
    setDragOffset(0);
  };

  const handleCardClick = (card: DiscipleshipCard, idx: number) => {
    // If movement was more than tiny threshold, it was a drag, not a tap
    if (Math.abs(currentXRef.current - startXRef.current) > 8) return;
    if (idx === activeIndex) {
      handleCardSelection(card);
    } else {
      setActiveIndex(idx);
    }
  };

  const handleCardSelection = (card: DiscipleshipCard) => {
    if (selectedState) return;
    setSelectedState(card.id);
    setTimeout(() => {
      if (onFocusCard) {
        onFocusCard(card);
      } else {
        onSelectCard(card);
      }
    }, 100);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed) return;
    onSubmitCustomText(trimmed);
    setCustomText('');
  };

  return (
    <div
      className={`relative w-full h-[calc(100vh-5rem)] sm:h-[calc(100vh-5.5rem)] max-w-5xl mx-auto flex flex-col justify-between overflow-hidden text-left select-none transition-colors duration-300 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP WHATSAPP-STYLE SEGMENTED PROGRESS INDICATOR
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`w-full max-w-xl mx-auto px-4 pt-1 pb-2 shrink-0 transition-all duration-300 ${
          selectedState ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-1.5 w-full">
          {cards.map((_, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Jump to season ${idx + 1}`}
                className="relative h-1 sm:h-1.5 flex-1 rounded-full overflow-hidden transition-all cursor-pointer bg-black/10 dark:bg-white/15"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isActive
                      ? isLight
                        ? 'bg-slate-950 shadow-[0_0_8px_rgba(2,6,23,0.4)]'
                        : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                      : isPast
                        ? isLight
                          ? 'bg-slate-400/50'
                          : 'bg-white/40'
                        : 'transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDITORIAL BRIEFING HEADER (CRISP HIGH-CONTRAST)
          ───────────────────────────────────────────────────────────── */}
      <header
        className={`px-4 sm:px-6 mb-2 sm:mb-4 text-center max-w-4xl mx-auto shrink-0 transition-all duration-300 ${
          selectedState ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100'
        }`}
      >
        <h2
          className={`text-2xl sm:text-3xl md:text-4xl font-serif font-semibold tracking-tight ${
            isLight ? 'text-slate-950' : 'text-white'
          }`}
        >
          Daily Spiritual Pulse
        </h2>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. WHATSAPP-STYLE 3D CUBE SWIPE STAGE
          ───────────────────────────────────────────────────────────── */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden my-auto touch-pan-y cursor-grab active:cursor-grabbing"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Desktop Left / Right Cube Rotation Arrows */}
        <button
          type="button"
          onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
          disabled={activeIndex === 0}
          aria-label="Previous face"
          className={`hidden md:flex absolute left-4 z-30 w-10 h-10 rounded-full items-center justify-center backdrop-blur-xl border transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none shadow-md hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-white/80 border-slate-200 text-slate-800 hover:bg-white'
              : 'bg-[#241e1a]/90 border-[#382e27] text-white hover:bg-[#2d2520]'
          } ${selectedState ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setActiveIndex((prev) => Math.min(cards.length - 1, prev + 1))}
          disabled={activeIndex === cards.length - 1}
          aria-label="Next face"
          className={`hidden md:flex absolute right-4 z-30 w-10 h-10 rounded-full items-center justify-center backdrop-blur-xl border transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none shadow-md hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-white/80 border-slate-200 text-slate-800 hover:bg-white'
              : 'bg-[#241e1a]/90 border-[#382e27] text-white hover:bg-[#2d2520]'
          } ${selectedState ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* 3D Cube Stage Wrapper */}
        <div 
          className="relative w-[85vw] max-w-[380px] sm:max-w-[420px] h-[48vh] sm:h-[52vh] max-h-[460px] min-h-[350px] flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {cards.map((card, idx) => {
            const diff = idx - activeIndex;
            // Normalized drag offset ratio (e.g. -1 to 1)
            const faceWidth = 380;
            const dragRatio = Math.max(-1, Math.min(1, dragOffset / faceWidth));

            // Dynamic 3D Cube calculation
            let rotateY = 0;
            let transformOrigin = 'center center';
            let opacity = 0;
            let zIndex = 0;
            let isVisible = false;

            if (diff === 0) {
              // Active face on main view
              rotateY = dragRatio * 90;
              transformOrigin = dragRatio < 0 ? 'right center' : 'left center';
              opacity = 1 - Math.abs(dragRatio) * 0.35;
              zIndex = 10;
              isVisible = true;
            } else if (diff === 1) {
              // Next face to the right, rotating in when dragging left (dragRatio < 0)
              if (dragRatio < 0) {
                rotateY = 90 + dragRatio * 90;
                transformOrigin = 'left center';
                opacity = 0.65 + Math.abs(dragRatio) * 0.35;
                zIndex = 8;
                isVisible = true;
              } else {
                rotateY = 90;
                transformOrigin = 'left center';
                opacity = 0;
                zIndex = 0;
                isVisible = false;
              }
            } else if (diff === -1) {
              // Previous face to the left, rotating in when dragging right (dragRatio > 0)
              if (dragRatio > 0) {
                rotateY = -90 + dragRatio * 90;
                transformOrigin = 'right center';
                opacity = 0.65 + Math.abs(dragRatio) * 0.35;
                zIndex = 8;
                isVisible = true;
              } else {
                rotateY = -90;
                transformOrigin = 'right center';
                opacity = 0;
                zIndex = 0;
                isVisible = false;
              }
            }

            return (
              <motion.div
                key={card.id}
                layoutId={card.id === selectedState ? 'shepherd-card-canvas' : undefined}
                transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                onClick={() => handleCardClick(card, idx)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: `rotateY(${rotateY}deg)`,
                  transformOrigin,
                  opacity: selectedState && selectedState !== card.id ? 0 : opacity,
                  zIndex,
                  display: isVisible ? 'flex' : 'none',
                  transition: isDragging
                    ? 'none'
                    : 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className={`
                  group flex flex-col justify-between p-6 sm:p-8 cursor-pointer
                  rounded-3xl border select-none
                  backdrop-blur-2xl transition-all duration-300
                  ${
                    isLight
                      ? 'bg-white border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-300'
                      : 'bg-[#241e1a] border-[#382e27] shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:border-[#483a30]'
                  }
                  ${diff === 0 ? (isLight ? 'ring-1 ring-slate-900/10' : 'ring-1 ring-white/10') : ''}
                `}
              >
                {/* Card Top: Category Eyebrow */}
                <div className="relative z-10 flex items-center justify-start w-full mb-auto select-none">
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase ${
                      isLight ? 'text-slate-500' : 'text-[#b5a99a]'
                    }`}
                  >
                    {formatCategoryLabel(card.tag || card.badgeText)}
                  </span>
                </div>

                {/* Card Main Center Face: ONLY the bold header in Crisp High-Contrast Typography */}
                <div className="relative z-10 my-auto text-center py-6 px-2">
                  <h3
                    className={`text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-tight leading-snug transition-colors ${
                      isLight
                        ? 'text-slate-950 group-hover:text-black'
                        : 'text-white group-hover:text-[#faf6f0]'
                    }`}
                  >
                    {card.title}
                  </h3>
                </div>

                {/* Card Bottom: Subtle Micro-Indicator (Tap to reflect / expand) */}
                <div className="relative z-10 mt-auto pt-4 flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-white/[0.06] select-none">
                  <span
                    className={`text-xs font-mono font-semibold tracking-wide ${
                      isLight ? 'text-slate-600' : 'text-[#dcd3c6]'
                    }`}
                  >
                    Tap to reflect
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5 ${
                      isLight ? 'text-slate-600' : 'text-[#dcd3c6]'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM ANCHORED REPLY BAR (THEMED TO MAIN APP)
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`relative z-20 w-full max-w-xl mx-auto px-4 sm:px-6 pt-2 pb-3 sm:pb-4 shrink-0 transition-all duration-300 ${
          selectedState ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100'
        }`}
      >
        <form onSubmit={handleCustomSubmit} className="relative w-full flex items-center">
          <div
            className={`relative w-full flex items-center rounded-full border shadow-md transition-all duration-200 ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-slate-950 focus-within:ring-2 focus-within:ring-slate-900/10'
                : 'bg-[#241e1a] border-[#382e27] focus-within:border-white focus-within:ring-2 focus-within:ring-white/10'
            }`}
          >
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="or express your heart..."
              className={`w-full py-3 sm:py-3.5 pl-5 pr-14 text-sm sm:text-base font-sans bg-transparent outline-none rounded-full ${
                isLight
                  ? 'text-slate-950 placeholder:text-slate-400'
                  : 'text-white placeholder:text-[#b5a99a]'
              }`}
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              aria-label="Send reflection"
              className={`absolute right-1.5 p-2 sm:p-2.5 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-xs'
                  : 'bg-[#342b25] hover:bg-[#3f342d] text-white border border-[#483a30] shadow-xs'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CompanionGuide = DailyPulseCheck;
export default DailyPulseCheck;

