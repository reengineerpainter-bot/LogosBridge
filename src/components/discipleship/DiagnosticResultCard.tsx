/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DiscipleshipDiagnosisPayload } from '../../types/discipleship';

export interface DiagnosticResultCardProps {
  payload: DiscipleshipDiagnosisPayload;
  onContinueToStudy: (verseReference: string) => void;
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Formats inline text with basic markdown italics (*word* or _word_)
 * to highlight transliterated Greek and Hebrew root terms with elegant emphasis.
 */
function renderEditorialText(text: string, isLight: boolean) {
  if (!text) return null;
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length > 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em
          key={idx}
          className={`font-serif italic font-medium ${
            isLight ? 'text-slate-950 font-semibold' : 'text-white font-semibold'
          }`}
        >
          {inner}
        </em>
      );
    }
    return part;
  });
}

export const DiagnosticResultCard: React.FC<DiagnosticResultCardProps> = ({
  payload,
  onContinueToStudy,
  theme = 'light',
  className = '',
}) => {
  const isLight = theme === 'light';

  // Resiliently resolve editorial data with fallback mappings for legacy payloads
  const scriptureAnchor = payload.scriptureAnchor || {
    reference: payload.actionableHabit?.scripturalAnchor || 'Scripture Anchor',
    text: 'For the LORD God is a sun and shield: the LORD will give grace and glory: no good thing will he withhold from them that walk uprightly.',
  };

  const biblicalNarrative = payload.biblicalNarrative || {
    title: payload.diagnosis?.headline || 'Covenant Reflection',
    paragraphs: [
      payload.diagnosis?.rootCauseDescription || 'The Lord meets His servants in their exact condition, providing tender wisdom for the path.',
      payload.covenantStrategy?.principleExplanation || 'Grace precedes duty; covenant assurance anchors the soul through every changing season.',
    ].filter(Boolean),
  };

  const shepherdCounsel = payload.shepherdCounsel || {
    reflection: payload.diagnosis?.rootCauseDescription || 'Rest in the sufficiency of His covenant grace today.',
    practicalStep: payload.actionableHabit?.practicalStep || 'Spend five unhurried minutes in prayer before resuming your study.',
    timeCommitmentMinutes: payload.actionableHabit?.timeCommitmentMinutes || 5,
    prayerPoint: 'Father, I declare that Your grace is sufficient for me right now. I receive Your presence as my peace and step boldly into Your Word.',
  };

  const targetVerse = payload.nextAuditRoute?.verseReference || 'Study';
  const buttonLabel = payload.nextAuditRoute?.actionLabel || `Resume Study in ${targetVerse}`;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`w-full max-w-3xl mx-auto text-left transition-colors duration-300 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP: BEAUTIFULLY TYPESET CENTERED SCRIPTURE ANCHOR
          ───────────────────────────────────────────────────────────── */}
      <header className="text-center pt-2 pb-8 sm:pb-12 border-b border-black/5 dark:border-white/5">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] sm:text-xs font-mono tracking-widest uppercase mb-4 sm:mb-6 border ${
            isLight
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-[#241e1a] text-[#dcd3c6] border-[#382e27]'
          }`}
        >
          <Sparkles className={`w-3 h-3 ${isLight ? 'text-slate-600' : 'text-[#b5a99a]'}`} />
          <span>Scripture Anchor</span>
        </div>

        <blockquote className="max-w-2xl mx-auto px-4">
          <p
            className={`font-serif italic text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-normal font-normal drop-shadow-xs ${
              isLight ? 'text-slate-900' : 'text-[#faf6f0]'
            }`}
          >
            “{scriptureAnchor.text}”
          </p>
          <cite
            className={`block not-italic mt-3 sm:mt-4 text-xs sm:text-sm font-mono tracking-widest uppercase font-medium ${
              isLight ? 'text-slate-500' : 'text-[#b5a99a]'
            }`}
          >
            — {scriptureAnchor.reference}
          </cite>
        </blockquote>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MIDDLE: EDITORIAL READING CANVAS (The Biblical Narrative)
          ───────────────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-12 max-w-2xl mx-auto">
        {biblicalNarrative.title && (
          <h2
            className={`text-xl sm:text-2xl font-serif font-semibold tracking-tight mb-6 sm:mb-8 text-center sm:text-left ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {biblicalNarrative.title}
          </h2>
        )}

        <div className="space-y-5 sm:space-y-6">
          {biblicalNarrative.paragraphs.map((paragraph, idx) => (
            <p
              key={idx}
              className={`font-serif text-base sm:text-lg leading-[1.85] font-normal text-justify sm:text-left ${
                isLight ? 'text-slate-700' : 'text-slate-200/90'
              }`}
            >
              {renderEditorialText(paragraph, isLight)}
            </p>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM: SHEPHERD'S COUNSEL (Subtle Left-Border Accent)
          ───────────────────────────────────────────────────────────── */}
      <footer className="my-6 sm:my-8 max-w-2xl mx-auto">
        <div
          className={`pl-5 sm:pl-7 py-3 border-l-2 transition-colors ${
            isLight ? 'border-slate-900 bg-slate-50/80' : 'border-[#483a30] bg-[#1e1916]/80'
          } rounded-r-2xl`}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <span
              className={`text-[11px] sm:text-xs font-mono font-semibold tracking-widest uppercase ${
                isLight ? 'text-slate-900' : 'text-[#faf6f0]'
              }`}
            >
              Shepherd's Counsel
            </span>
            {shepherdCounsel.timeCommitmentMinutes && (
              <span className="text-[10px] sm:text-[11px] font-mono opacity-70 tracking-wider text-slate-500 dark:text-[#b5a99a]">
                {shepherdCounsel.timeCommitmentMinutes} min stillness
              </span>
            )}
          </div>

          <p
            className={`font-serif text-base sm:text-lg font-medium leading-relaxed mb-2 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {shepherdCounsel.reflection}
          </p>

          <p
            className={`font-sans text-xs sm:text-sm leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300/80'
            }`}
          >
            {shepherdCounsel.practicalStep}
          </p>

          {shepherdCounsel.prayerPoint && (
            <div
              className={`font-serif italic text-sm sm:text-base leading-relaxed mt-4 pl-4 border-l transition-colors ${
                isLight
                  ? 'text-slate-600 border-slate-300'
                  : 'text-[#dcd3c6] border-[#382e27]'
              }`}
            >
              “{shepherdCounsel.prayerPoint}”
            </div>
          )}
        </div>

        {/* Unobtrusive, elegant study continuation action */}
        <div className="mt-10 sm:mt-12 flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => onContinueToStudy(targetVerse)}
            className={`group px-6 sm:px-8 py-3.5 rounded-full font-serif font-semibold text-sm sm:text-base flex items-center gap-2.5 transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] border ${
              isLight
                ? 'bg-slate-950 text-white hover:bg-slate-800 border-slate-900 shadow-slate-950/20'
                : 'bg-[#342b25] text-white hover:bg-[#3f342d] border-[#483a30] shadow-black/40'
            }`}
          >
            <span>{buttonLabel}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </footer>
    </motion.article>
  );
};

export const ShepherdCounselCanvas = DiagnosticResultCard;
export default DiagnosticResultCard;
