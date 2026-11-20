/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Clock, Trash2, BookOpen, Sparkles, Flame, Highlighter, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import {
  StudyLaterVerse,
  getStudyLaterQueue,
  markVerseStudyCompleted,
  removeVerseFromStudyLater,
  snoozeVerseStudyReminder,
  addVerseToStudyLater,
  getPastActivityFourAreas,
  PastActivityFourAreas,
} from '../utils/activityBriefingEngine';

export interface StudyAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  onNavigateToVerse: (book: string, chapter: number, verse?: number) => void;
}

export const StudyAssistantModal: React.FC<StudyAssistantModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
  onNavigateToVerse,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'activity' | 'completed'>('pending');
  const [queue, setQueue] = useState<StudyLaterVerse[]>([]);
  const [fourAreas, setFourAreas] = useState<PastActivityFourAreas | null>(null);
  const [quickInput, setQuickInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = () => {
    setQueue(getStudyLaterQueue());
    setFourAreas(getPastActivityFourAreas());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMarkComplete = (id: string, book: string, chapter: number, verse: number) => {
    markVerseStudyCompleted(id);
    refreshData();
    showToast(`✓ Completed study of ${book} ${chapter}:${verse}! Streak continued.`);
  };

  const handleSnooze = (id: string) => {
    snoozeVerseStudyReminder(id);
    refreshData();
    showToast('Reminder snoozed until tomorrow ⏱');
  };

  const handleDelete = (book: string, chapter: number, verse: number) => {
    removeVerseFromStudyLater(book, chapter, verse);
    refreshData();
    showToast('Removed from Study Later docket');
  };

  const handleStudyNow = (book: string, chapter: number, verse: number) => {
    onClose();
    onNavigateToVerse(book, chapter, verse);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = quickInput.trim();
    if (!val) return;

    // Parse simple reference like "Rom 8:28" or "Romans 8:28 Examine root"
    const match = val.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+))?(.*)$/);
    if (match) {
      const book = match[1].trim();
      const chapter = parseInt(match[2], 10) || 1;
      const verse = match[3] ? parseInt(match[3], 10) : 1;
      const goal = match[4] ? match[4].trim() : `Reflect on ${book} ${chapter}:${verse}`;
      addVerseToStudyLater(book, chapter, verse, undefined, goal);
    } else {
      addVerseToStudyLater('Genesis', 1, 1, undefined, val);
    }

    setQuickInput('');
    refreshData();
    showToast('Added to Study Later docket!');
  };

  if (!isOpen) return null;

  const pendingItems = queue.filter((item) => item.status === 'pending');
  const completedItems = queue.filter((item) => item.status === 'completed');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Smart Office Study Assistant"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white text-slate-900 border-amber-500/30'
            : 'bg-[#191512] text-white border-amber-500/25'
        }`}
      >
        {/* ======================================================== */}
        {/* HEADER: Smart Assistant Title & Badge                    */}
        {/* ======================================================== */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          theme === 'light'
            ? 'border-slate-200 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-transparent'
            : 'border-white/10 bg-gradient-to-r from-amber-500/15 via-transparent to-transparent'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Clock className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-500 dark:text-amber-400">
                Logos Personal Study Concierge
              </span>
              <h3 className="text-base sm:text-lg font-serif font-bold leading-tight">
                Daily Study Later Docket
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* SUB-NAV TABS: Pending / Past Activities / Completed      */}
        {/* ======================================================== */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs flex-wrap gap-2 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Past Activities</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Completed ({completedItems.length})
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Reminds Daily Until Done</span>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PENDING STUDY DOCKET                              */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'pending' && (
            <>
              {pendingItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
                  <p className="text-xs font-semibold">Your Study Later Docket is clear.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    To schedule daily reminders, tap the Study Later clock icon on any verse in the Study Tab.
                  </p>
                </div>
              ) : (
                pendingItems.map((item) => {
                  const isOverdue = item.daysPending >= 2;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-200/80 hover:border-amber-500/40'
                          : 'bg-black/35 border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-serif font-bold">
                              {item.book} {item.chapter}:{item.verse}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                isOverdue
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.daysPending === 0 ? 'Queued Today' : `Pending ${item.daysPending}d`}
                            </span>
                          </div>
                          {item.studyGoal && (
                            <p className="text-xs text-amber-600 dark:text-amber-200/90 italic font-medium mt-0.5">
                              "{item.studyGoal}"
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.book, item.chapter, item.verse)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="Remove from docket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {item.snippetText && (
                        <p className={`text-[11px] line-clamp-2 leading-relaxed p-2 rounded-lg border font-sans ${
                          theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-black/50 border-white/5 text-slate-300'
                        }`}>
                          {item.snippetText}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStudyNow(item.book, item.chapter, item.verse)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Study Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(item.id, item.book, item.chapter, item.verse)}
                          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 border cursor-pointer ${
                            theme === 'light'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSnooze(item.id)}
                          className={`py-1.5 px-2.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                              : 'bg-white/10 hover:bg-white/20 text-slate-300'
                          }`}
                          title="Snooze reminder until tomorrow's study session"
                        >
                          ⏱ Tomorrow
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PAST ACTIVITIES TIMELINE (NOTES, STRONGS, HIGHLIGHTS, STREAK) */}
          {/* ======================================================== */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {/* 1. Reading Streak Card */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                    <Flame className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                      Reading & Study Streak
                    </span>
                    <h4 className="text-sm font-bold">
                      {Math.max(1, fourAreas?.readingStreak.streakDays || 1)} Consecutive Days Active
                    </h4>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">🔥 Daily Habit</span>
              </div>

              {/* 2. Strong's Words Analyzed */}
              <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/35 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold">Strong's Words Analyzed</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    {fourAreas?.strongsAnalyzed.total || 0} Total Analyzed
                  </span>
                </div>
                {fourAreas?.strongsAnalyzed.latestStrongs ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Latest root: <strong className="font-mono text-cyan-600 dark:text-cyan-400">{fourAreas.strongsAnalyzed.latestStrongs}</strong>
                    {fourAreas.strongsAnalyzed.latestWord && ` (${fourAreas.strongsAnalyzed.latestWord})`}
                    {fourAreas.strongsAnalyzed.latestRef && ` in ${fourAreas.strongsAnalyzed.latestRef}`}.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No Strong's word lookups recorded yet.</p>
                )}
              </div>

              {/* 3. Notes Drafted */}
              <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/35 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold">Notes Drafted (Theological Diary)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {fourAreas?.notesDrafted.total || 0} Saved Notes
                  </span>
                </div>
                {fourAreas?.notesDrafted.latestRef ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{fourAreas.notesDrafted.latestSnippet || 'Reflection saved'}"
                    <span className="block text-[10px] font-mono not-italic text-amber-600 dark:text-amber-400 mt-1">
                      Reference: {fourAreas.notesDrafted.latestRef}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No notes drafted yet.</p>
                )}
              </div>

              {/* 4. Verses Highlighted */}
              <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/35 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      <Highlighter className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold">Verses Highlighted (Covenant Library)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {fourAreas?.versesHighlighted.total || 0} Verses Illuminated
                  </span>
                </div>
                {fourAreas?.versesHighlighted.latestRef ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Latest illuminated verse: <strong>{fourAreas.versesHighlighted.latestRef}</strong>
                    {fourAreas.versesHighlighted.latestColor && ` (${fourAreas.versesHighlighted.latestColor} ribbon)`}.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No verses illuminated yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: COMPLETED ARCHIVE                                 */}
          {/* ======================================================== */}
          {activeTab === 'completed' && (
            <>
              {completedItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Check className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="text-xs font-semibold">No completed study entries yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When you finish reflecting on queued verses and tap "Mark Done", they are archived here.
                  </p>
                </div>
              ) : (
                completedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/25 border-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-serif font-bold">
                          {item.book} {item.chapter}:{item.verse}
                        </span>
                        <span className="text-[9.5px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                          Completed ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic mt-0.5">"{item.studyGoal}"</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStudyNow(item.book, item.chapter, item.verse)}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* FOOTER: Quick Queue Input Form                           */}
        {/* ======================================================== */}
        <form
          onSubmit={handleQuickAdd}
          className={`p-3 sm:p-3.5 border-t flex items-center gap-2 ${
            theme === 'light' ? 'bg-slate-100/80 border-slate-200' : 'bg-black/50 border-white/10'
          }`}
        >
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Queue verse (e.g. Philippians 4:13) + goal..."
            className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all ${
              theme === 'light'
                ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                : 'bg-black/60 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/60'
            }`}
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Queue</span>
          </button>
        </form>

        {/* Toast alert feedback */}
        {toastMessage && (
          <div className="absolute bottom-16 left-4 right-4 bg-slate-900 text-amber-300 border border-amber-500/40 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in z-50">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

