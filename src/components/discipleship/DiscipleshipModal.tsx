/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Loader2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { DiscipleshipDiagnosisPayload, DiscipleshipCard, UserPulseResponse } from '../../types/discipleship';
import { DailyPulseCheck, formatCategoryLabel } from './DailyPulseCheck';
import { DiagnosticResultCard } from './DiagnosticResultCard';
import { sendPulseCheck } from '../../services/discipleshipAgentService';
import { getUserStudyState } from '../../services/studySessionTracker';

export type DiscipleshipUIState = 'CAROUSEL' | 'FOCUSED' | 'READING';

export interface DiscipleshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToVerse: (verseRef: string) => void;
  theme?: 'light' | 'dark';
  activePayload?: DiscipleshipDiagnosisPayload | null;
  onPayloadUpdate?: (payload: DiscipleshipDiagnosisPayload | null) => void;
}

export const DiscipleshipModal: React.FC<DiscipleshipModalProps> = ({
  isOpen,
  onClose,
  onNavigateToVerse,
  theme = 'light',
  activePayload = null,
  onPayloadUpdate,
}) => {
  const [uiState, setUiState] = useState<DiscipleshipUIState>(activePayload ? 'READING' : 'CAROUSEL');
  const [focusedCard, setFocusedCard] = useState<DiscipleshipCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLight = theme === 'light';

  // Synchronize when activePayload is updated externally
  useEffect(() => {
    if (activePayload) {
      setUiState('READING');
    }
  }, [activePayload]);

  const handleFocusCard = (card: DiscipleshipCard) => {
    setFocusedCard(card);
    setUiState('FOCUSED');
    setErrorMessage(null);
  };

  const handleReturnToCarousel = () => {
    setUiState('CAROUSEL');
    setFocusedCard(null);
    setErrorMessage(null);
  };

  const handleStepIntoSeason = (card: DiscipleshipCard) => {
    setUiState('READING');
    handlePulseSubmission('CARD_SELECTION', card);
  };

  const handleCustomReflectionSubmit = (customText: string) => {
    const syntheticCard: DiscipleshipCard = {
      id: 'custom-reflection',
      title: customText.slice(0, 36) || 'Personal Reflection',
      tag: 'HEART REFLECTION',
      description: customText,
      diagnosticKey: 'CUSTOM_REFLECTION',
    };
    setFocusedCard(syntheticCard);
    setUiState('READING');
    handlePulseSubmission('FREE_TEXT', undefined, customText);
  };

  const handlePulseSubmission = async (
    interactionType: 'CARD_SELECTION' | 'FREE_TEXT',
    card?: DiscipleshipCard,
    customText?: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    const userState = getUserStudyState();
    const pulseResponse: UserPulseResponse = {
      interactionType,
      selectedCardId: card?.id,
      diagnosticKey: card?.diagnosticKey || card?.tag || card?.badgeText || 'REST_AND_RENEWAL',
      userInputText: customText,
      userStateSnapshot: userState,
    };

    try {
      const payload = await sendPulseCheck(pulseResponse);
      onPayloadUpdate?.(payload);
    } catch (err: any) {
      console.error('Error during discipleship pulse check:', err);
      setErrorMessage('Unable to complete check-in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCheckIn = () => {
    setUiState('CAROUSEL');
    setFocusedCard(null);
    onPayloadUpdate?.(null);
    setErrorMessage(null);
  };

  const handleContinue = (verseRef: string) => {
    onClose();
    onNavigateToVerse(verseRef);
  };

  const isExpandedView = uiState !== 'CAROUSEL';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-[2600] w-full min-h-screen overflow-y-auto ${
            isLight
              ? 'bg-[#fafafa] text-slate-950'
              : 'bg-[#191512] text-white'
          }`}
        >
          {/* Dedicated Page Top Navigation Bar (Themed to Main App) */}
          <div
            className={`sticky top-0 z-20 w-full border-b px-4 py-3 flex items-center justify-between backdrop-blur-xl transition-colors ${
              isLight
                ? 'bg-white/90 border-slate-200 text-slate-950'
                : 'bg-[#1e1916]/90 border-[#382e27] text-white'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              title="Return to Home"
              aria-label="Return to Home"
              className={`p-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center ${
                isLight
                  ? 'hover:bg-slate-100 text-slate-800 active:scale-95'
                  : 'hover:bg-[#28211c] text-[#faf6f0] active:scale-95'
              }`}
            >
              <Home className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {isExpandedView && (
                <button
                  type="button"
                  onClick={handleResetCheckIn}
                  title={uiState === 'FOCUSED' ? 'Overview' : 'Begin Again'}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono tracking-wider flex items-center gap-1.5 border cursor-pointer transition-all duration-150 active:scale-95 ${
                    isLight
                      ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs'
                      : 'border-[#483a30] bg-[#241e1a] hover:bg-[#2e2621] text-[#faf6f0]'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{uiState === 'FOCUSED' ? 'Overview' : 'Begin Again'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Full Page Content Container */}
          <div
            className={`relative z-10 max-w-5xl mx-auto transition-all duration-300 ${
              isExpandedView ? 'px-4 sm:px-6 py-4 sm:py-8' : 'px-0 sm:px-2 py-1 sm:py-2'
            }`}
          >
            {/* Error Message */}
            {errorMessage && !isExpandedView && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
                {errorMessage}
              </div>
            )}

            {/* Expanding Card Shared Element View */}
            <AnimatePresence>
              {isExpandedView ? (
                <motion.div
                  key="shepherd-expanded-canvas"
                  layoutId="shepherd-card-canvas"
                  transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`relative w-full max-w-3xl min-h-[75vh] sm:min-h-[80vh] mx-auto rounded-3xl border backdrop-blur-2xl transition-colors shadow-2xl p-6 sm:p-10 my-2 sm:my-4 flex flex-col justify-between ${
                    isLight
                      ? 'bg-white border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.08)]'
                      : 'bg-[#241e1a] border-[#382e27] shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {uiState === 'FOCUSED' && focusedCard ? (
                      <motion.div
                        key="focused-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex-1 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-6">
                            <button
                              type="button"
                              onClick={handleReturnToCarousel}
                              aria-label="Back"
                              title="Back"
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                  : 'bg-[#342b25] hover:bg-[#3f342d] text-white border border-[#483a30]'
                              }`}
                            >
                              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${
                              isLight ? 'text-slate-500' : 'text-[#b5a99a]'
                            }`}>
                              {formatCategoryLabel(focusedCard.tag || focusedCard.badgeText)}
                            </span>
                          </div>

                          {/* Full Narrative Context / Description */}
                          <p
                            className={`font-serif text-lg sm:text-xl md:text-2xl leading-relaxed max-w-2xl pt-2 sm:pt-4 ${
                              isLight ? 'text-slate-900' : 'text-[#f5ede3]'
                            }`}
                          >
                            {focusedCard.description || focusedCard.subtitle}
                          </p>
                        </div>

                        {/* Redesigned Docked Action Button (Themed to Main App) */}
                        <div className="pt-8 sm:pt-12 mt-auto border-t border-slate-100 dark:border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => handleStepIntoSeason(focusedCard)}
                            className={`group w-full py-4 px-6 rounded-2xl font-serif font-semibold text-base sm:text-lg flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99] border ${
                              isLight
                                ? 'bg-slate-950 text-white hover:bg-slate-800 border-slate-900 shadow-slate-950/20'
                                : 'bg-[#342b25] text-white hover:bg-[#3f342d] border-[#483a30] shadow-black/40'
                            }`}
                          >
                            <span className="tracking-wide">
                              {formatCategoryLabel(focusedCard.tag || focusedCard.badgeText)}
                            </span>
                            {/* Sleek compact pointing indicator */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                              isLight
                                ? 'bg-white/10 text-white'
                                : 'bg-white/10 text-white'
                            }`}>
                              <ChevronRight className="w-5 h-5 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-0.5" />
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="reading-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="w-full"
                      >
                        {isLoading ? (
                          <div className="py-16 sm:py-24 text-center space-y-6">
                            {focusedCard && (
                              <div className="space-y-2 mb-4">
                                <h3
                                  className={`text-2xl sm:text-3xl font-serif font-bold ${
                                    isLight ? 'text-stone-900' : 'text-stone-100'
                                  }`}
                                >
                                  {focusedCard.title}
                                </h3>
                              </div>
                            )}

                            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 dark:bg-white/10 blur-lg animate-pulse" />
                              <Loader2 className={`w-8 h-8 animate-spin relative ${isLight ? 'text-slate-800' : 'text-[#dcd3c6]'}`} />
                            </div>

                            <div className="space-y-1.5">
                              <p className={`text-base font-serif italic ${isLight ? 'text-stone-800' : 'text-stone-200'}`}>
                                Seeking counsel from the Word...
                              </p>
                              <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                                Drawing from biblical narratives to refresh and anchor your soul.
                              </p>
                            </div>
                          </div>
                        ) : activePayload ? (
                          <DiagnosticResultCard
                            payload={activePayload}
                            onContinueToStudy={handleContinue}
                            theme={theme}
                          />
                        ) : errorMessage ? (
                          <div className="py-12 text-center space-y-4">
                            <p className="text-sm font-sans text-rose-600 dark:text-rose-400">
                              {errorMessage}
                            </p>
                            <button
                              type="button"
                              onClick={handleReturnToCarousel}
                              className={`px-4 py-2 rounded-xl text-xs font-mono border transition-colors ${
                                isLight
                                  ? 'border-stone-300 text-stone-700 hover:bg-stone-100'
                                  : 'border-white/20 text-stone-200 hover:bg-white/10'
                              }`}
                            >
                              Try Again
                            </button>
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="pulse-carousel-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DailyPulseCheck
                    onFocusCard={handleFocusCard}
                    onSelectCard={handleFocusCard}
                    onSubmitCustomText={handleCustomReflectionSubmit}
                    theme={theme}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
