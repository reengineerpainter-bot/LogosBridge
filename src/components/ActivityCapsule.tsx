/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import bibleLogo from '../assets/images/logo_logosbridge.png';

export interface ActivityCapsuleProps {
  /** The narrative summary string to auto-scroll horizontally */
  narrativeBrief?: string;
  /** Study reminder brief (if pending verses exist) */
  studyReminderBrief?: string;
  /** Past activity briefing capturing notes, Strong's, highlights, streak */
  pastActivityBrief?: string;
  /** Callback triggered when user taps the right action button or capsule */
  onResume?: () => void;
  /** Callback triggered when user dismisses the capsule by swiping left or right */
  onDismiss?: () => void;
  /** Optional quick complete callback for the active top pending study reminder */
  onQuickComplete?: () => void;
  /** Optional callback to open the assistant dossier */
  onOpenDossier?: () => void;
  /** Optional custom leading icon. Defaults to the official Bible logo badge */
  icon?: React.ReactNode;
  /** Optional custom styling classes */
  className?: string;
  /** Theme preference for adaptive glassmorphism styling */
  theme?: 'light' | 'dark';
}

export const ActivityCapsule: React.FC<ActivityCapsuleProps> = ({
  narrativeBrief = "You recently traced the Hebrew root of bārā’ in Genesis 1, exploring the ancient etymology of creation.",
  studyReminderBrief,
  pastActivityBrief,
  onResume,
  onDismiss,
  onQuickComplete,
  onOpenDossier,
  icon,
  className = '',
  theme = 'light',
}) => {

  // =========================================================
  // Swipe-to-Dismiss Gesture Engine (Left & Right)
  // =========================================================
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [dismissDirection, setDismissDirection] = useState<'left' | 'right' | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDismissed || !onDismiss) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    isSwipingHorizontal.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isDismissed || !onDismiss) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    if (isSwipingHorizontal.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isSwipingHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isSwipingHorizontal.current) {
      const damped = deltaX * 0.85;
      setDragOffset(damped);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || isDismissed || !onDismiss) {
      touchStartRef.current = null;
      isSwipingHorizontal.current = null;
      setDragOffset(0);
      return;
    }

    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(dragOffset) / Math.max(1, elapsed);
    const DISMISS_THRESHOLD_PX = 60;
    const FLICK_VELOCITY = 0.4;

    if (Math.abs(dragOffset) >= DISMISS_THRESHOLD_PX || velocity > FLICK_VELOCITY) {
      const dir = dragOffset > 0 ? 'right' : 'left';
      setDismissDirection(dir);
      setIsDismissed(true);
      setTimeout(() => {
        onDismiss?.();
      }, 220);
    } else {
      setDragOffset(0);
    }

    touchStartRef.current = null;
    isSwipingHorizontal.current = null;
  };

  // Mouse drag support for desktop testing
  const mouseStartRef = useRef<{ x: number; isDown: boolean } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDismissed || !onDismiss) return;
    if ((e.target as HTMLElement)?.closest('button')) return;
    mouseStartRef.current = { x: e.clientX, isDown: true };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current?.isDown || isDismissed || !onDismiss) return;
    const dx = e.clientX - mouseStartRef.current.x;
    setDragOffset(dx * 0.85);
  };

  const handleMouseUp = () => {
    if (!mouseStartRef.current?.isDown) return;
    mouseStartRef.current = null;
    if (Math.abs(dragOffset) >= 60) {
      const dir = dragOffset > 0 ? 'right' : 'left';
      setDismissDirection(dir);
      setIsDismissed(true);
      setTimeout(() => {
        onDismiss?.();
      }, 220);
    } else {
      setDragOffset(0);
    }
  };

  // Compute dynamic transform and opacity styles
  const getTransformStyle = (): React.CSSProperties => {
    if (isDismissed && dismissDirection) {
      return {
        transform: `translateX(${dismissDirection === 'right' ? '120%' : '-120%'})`,
        opacity: 0,
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease-out',
      };
    }
    if (dragOffset !== 0) {
      const progress = Math.min(1, Math.abs(dragOffset) / 200);
      return {
        transform: `translateX(${dragOffset}px)`,
        opacity: Math.max(0.2, 1 - progress * 0.65),
        transition: 'none',
      };
    }
    return {
      transform: 'translateX(0)',
      opacity: 1,
      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
    };
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Recent activity briefing. Tap to resume or swipe left/right to dismiss."
      title={onDismiss ? "Tap anywhere or chevron to resume • Swipe left or right to dismiss" : "Tap to resume"}
      onClick={() => {
        if (Math.abs(dragOffset) < 6) {
          if (onOpenDossier) {
            onOpenDossier();
          } else {
            onResume?.();
          }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onOpenDossier) {
            onOpenDossier();
          } else {
            onResume?.();
          }
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={getTransformStyle()}
      className={`group relative w-full h-12 sm:h-13 px-3 sm:px-5 rounded-none border-b ${
        theme === 'light'
          ? 'border-slate-200/80 bg-white/85 hover:bg-white/95 text-slate-900 shadow-2xs'
          : 'border-white/20 bg-black/20 hover:bg-black/30 text-white shadow-xs'
      } border-t-0 border-x-0 flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer active:opacity-95 select-none backdrop-blur-md ${className}`}
    >
      {/* ======================================================== */}
      {/* 1. LEFT: Official Bible Logo Anchor                      */}
      {/* ======================================================== */}
      <div className="shrink-0 flex items-center justify-center pointer-events-none">
        {icon ? (
          icon
        ) : (
          <div
            className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center overflow-hidden border ${
              theme === 'light' ? 'border-amber-500/30 bg-amber-50/80' : 'border-white/20 bg-black/20'
            } shadow-2xs transition-transform group-hover:scale-105`}
            title="LogosBridge Bible Study Concierge"
          >
            <img
              src={bibleLogo}
              alt="Bible Logo"
              className="w-4.5 h-4.5 sm:w-5 sm:h-5 object-contain"
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. CENTER: Auto-Scroll Briefing Track                    */}
      {/* ======================================================== */}
      <div
        className="flex-1 min-w-0 overflow-hidden relative @container pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
        }}
      >
        <div className="animate-capsule-scroll flex items-center whitespace-nowrap">
          {/* Render content helper */}
          {(() => {
            const renderContent = () => (
              <span className="inline-flex items-center gap-2">
                {studyReminderBrief && (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      Study Reminder
                    </span>
                    <span className={`text-[13px] sm:text-[14px] font-sans font-semibold ${
                      theme === 'light' ? 'text-amber-900' : 'text-amber-100'
                    }`}>
                      {studyReminderBrief}
                    </span>
                  </span>
                )}

                {studyReminderBrief && pastActivityBrief && (
                  <span className="mx-2 text-xs font-mono text-amber-500/40 select-none shrink-0">◆</span>
                )}

                {pastActivityBrief ? (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                      Recent
                    </span>
                    <span className={`text-[13px] sm:text-[14px] font-sans font-semibold ${
                      theme === 'light' ? 'text-slate-800' : 'text-white/95'
                    }`}>
                      {pastActivityBrief}
                    </span>
                  </span>
                ) : !studyReminderBrief ? (
                  <span className={`text-[13px] sm:text-[14px] font-sans font-semibold shrink-0 ${
                    theme === 'light' ? 'text-slate-800' : 'text-white'
                  }`}>
                    {narrativeBrief}
                  </span>
                ) : null}
              </span>
            );

            return (
              <>
                {/* Pass 1 */}
                {renderContent()}
                {/* Full-width clearing spacer */}
                <div aria-hidden="true" className="w-[100cqi] min-w-[280px] sm:min-w-[420px] shrink-0" />
                {/* Pass 2 */}
                {renderContent()}
                {/* Trailing full-width clearing spacer */}
                <div aria-hidden="true" className="w-[100cqi] min-w-[280px] sm:min-w-[420px] shrink-0" />
              </>
            );
          })()}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. RIGHT: Actions (Quick Complete & Dossier / Resume)    */}
      {/* ======================================================== */}
      <div className="shrink-0 flex items-center gap-1">
        {onQuickComplete && studyReminderBrief && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickComplete();
            }}
            title="Mark top study verse as completed"
            className="w-6.5 h-6.5 rounded-full flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-600 dark:text-emerald-400 active:scale-90 transition-all duration-200 shadow-2xs cursor-pointer border border-emerald-500/30"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDossier) {
              onOpenDossier();
            } else {
              onResume?.();
            }
          }}
          title={onOpenDossier ? "Open Study Assistant Dossier" : "Resume Reading View"}
          className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center ${
            theme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-white/10 hover:bg-white/20 text-white'
          } active:scale-90 transition-all duration-200 shadow-2xs cursor-pointer`}
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
