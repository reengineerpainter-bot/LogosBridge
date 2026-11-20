import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Radio,
  Send,
  BookOpen,
  Volume2
} from 'lucide-react';
import { UseVoiceAIReturn, ParsedScripture } from '../../hooks/useVoiceAI';
import { STATIC_CHAPTERS } from '../../staticChapters';
import { getOfflineChapter } from '../../utils/offlineBibleStorage';
import { useStudioDeckTheme, getTactileBtnClass, getTactileLedClass, playHardwareClick, getStudioThemeTokens } from './tactileTheme';

export interface VoiceAIDebugPanelProps {
  voiceAI: UseVoiceAIReturn;
  isAutoApply?: boolean;
  onToggleAutoApply?: () => void;
  onApplyScripture: (scripture: ParsedScripture) => void;
}

// Sub-component to fetch and render verified scripture snippet preview
const ScriptureSnippet: React.FC<{ item: ParsedScripture }> = ({ item }) => {
  const [snippet, setSnippet] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSnippet() {
      setIsLoading(true);
      try {
        // 1. Check STATIC_CHAPTERS first (instant memory)
        const bookKey = Object.keys(STATIC_CHAPTERS).find(b => b.toLowerCase() === item.book.toLowerCase());
        const staticCh = bookKey ? STATIC_CHAPTERS[bookKey]?.[item.chapter] : undefined;
        if (staticCh?.verses && staticCh.verses.length > 0) {
          const targetVerse = item.verse || 1;
          const v = staticCh.verses.find((v: any) => v.verseNumber === targetVerse);
          if (v && isMounted) {
            setSnippet(v.kjvText || (v as any).text || '');
            setIsLoading(false);
            return;
          }
        }

        // 2. Check offline database
        const offlineCh = await getOfflineChapter(item.book, item.chapter);
        if (offlineCh?.verses && offlineCh.verses.length > 0) {
          const targetVerse = item.verse || 1;
          const v = offlineCh.verses.find((v: any) => v.verseNumber === targetVerse);
          if (v && isMounted) {
            setSnippet(v.kjvText || (v as any).text || '');
            setIsLoading(false);
            return;
          }
        }
      } catch {}

      if (isMounted) {
        setSnippet('');
        setIsLoading(false);
      }
    }

    loadSnippet();
    return () => { isMounted = false; };
  }, [item.book, item.chapter, item.verse]);

  if (isLoading) {
    return <div className="text-[10px] text-zinc-500 italic mt-1">Verifying scripture text...</div>;
  }

  if (!snippet) {
    return (
      <div className="text-[10px] italic mt-1 opacity-80">
        Scripture reference detected
      </div>
    );
  }

  return (
    <div className="text-xs font-serif italic line-clamp-2 mt-1 bg-black/40 px-2.5 py-1.5 rounded-md border border-white/10">
      &ldquo;{snippet}&rdquo;
    </div>
  );
};

export const VoiceAIDebugPanel: React.FC<VoiceAIDebugPanelProps> = React.memo(({
  voiceAI,
  isAutoApply = false,
  onToggleAutoApply,
  onApplyScripture
}) => {
  const [deckTheme] = useStudioDeckTheme();
  const themeTokens = getStudioThemeTokens(deckTheme);
  const {
    isListening,
    isAudioActive,
    isMicOpen,
    transcript,
    interimTranscript,
    confidence,
    scriptureHistory,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
    clearHistory
  } = voiceAI;

  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Visual indicator derived cleanly from voiceAI status (zero hardware device contention)
  const micLevel = isAudioActive ? 85 : isListening ? 15 : 0;

  const handleManualApply = (item: ParsedScripture) => {
    const id = `${item.book}_${item.chapter}_${item.verse}_${item.timestamp}`;
    setAppliedId(id);
    clearTranscript();
    onApplyScripture(item);
  };

  return (
    <div className={`w-full flex flex-col gap-3.5 ${themeTokens.containerBg} text-[#faf6f0] p-3 sm:p-4 pb-2.5 sm:pb-3 rounded-2xl border shadow-xl select-none`}>

      {/* Header: Title + Status Pill + Main Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
            isAudioActive
              ? 'bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/20'
              : isListening
              ? (deckTheme === 'stealth' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')
              : `${themeTokens.pillBg} border ${themeTokens.cardBorder}`
          }`}>
            {isListening
              ? <Mic className={`w-5 h-5 ${isAudioActive ? 'animate-bounce' : 'animate-pulse'}`} />
              : <MicOff className="w-5 h-5" />
            }
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-[#faf6f0]">Live Voice AI Listener</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isAudioActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                  : isListening
                  ? (deckTheme === 'stealth'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse')
                  : `${themeTokens.pillBg} border ${themeTokens.cardBorder}`
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isAudioActive
                    ? 'bg-emerald-400'
                    : isListening
                    ? (deckTheme === 'stealth' ? 'bg-emerald-400' : 'bg-rose-400')
                    : (deckTheme === 'stealth' ? 'bg-emerald-800' : deckTheme === 'crimson' ? 'bg-rose-900' : 'bg-zinc-600')
                }`} />
                {isAudioActive ? 'Voice Active' : isListening ? 'Listening' : 'Standby'}
              </span>
            </div>

            {/* Micro Live Input Meter (when listening) */}
            {isListening && (
              <div className="flex items-center gap-1.5 w-28 sm:w-36">
                <Volume2 className="w-3.5 h-3.5 text-[#b5a99a] shrink-0" />
                <div className={`flex-1 h-1.5 rounded-full overflow-hidden border ${themeTokens.stripBg} ${themeTokens.cardBorder}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      micLevel > 25
                        ? 'bg-emerald-400'
                        : micLevel > 8
                        ? (deckTheme === 'stealth' ? 'bg-emerald-300' : deckTheme === 'crimson' ? 'bg-rose-400' : 'bg-[#faf6f0]')
                        : (deckTheme === 'stealth' ? 'bg-emerald-950' : deckTheme === 'crimson' ? 'bg-rose-950' : 'bg-zinc-600')
                    }`}
                    style={{ width: `${Math.max(4, micLevel)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start / Stop Button */}
        <button
          type="button"
          disabled={!isSupported}
          onClick={() => {
            playHardwareClick();
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={`py-2 px-3.5 min-h-[42px] rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer touch-manipulation select-none ${
            !isSupported
              ? 'opacity-30 cursor-not-allowed bg-black/40 border border-white/5 text-zinc-600'
              : getTactileBtnClass(deckTheme, { color: isListening ? 'danger' : 'accent', size: 'md', active: isListening })
          }`}
        >
          {isListening ? (
            <>
              <Radio className="w-4 h-4 animate-pulse text-white" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>

      {/* Auto-Apply Setting Strip */}
      <div className={`flex items-center justify-between p-3.5 rounded-xl ${themeTokens.stripBg} border`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl transition-colors ${
            isAutoApply
              ? (deckTheme === 'stealth'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : deckTheme === 'crimson'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/15 text-white border border-white/20')
              : `${themeTokens.pillBg} ${themeTokens.mutedText} border ${themeTokens.cardBorder}`
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-[#faf6f0]">Auto-Apply to Live Stream</div>
            <div className="text-xs font-mono text-[#b5a99a]">
              {isAutoApply ? 'Instant stream broadcast' : 'Manual verification mode'}
            </div>
          </div>
        </div>

        {onToggleAutoApply && (
          <button
            type="button"
            onClick={() => {
              playHardwareClick();
              onToggleAutoApply();
            }}
            className={`w-12 h-7 min-w-[48px] rounded-full transition-all relative p-0.5 flex items-center cursor-pointer select-none active:scale-95 ${
              isAutoApply
                ? (deckTheme === 'crimson' ? 'bg-rose-600 border border-rose-400/50 shadow-inner' : 'bg-emerald-600 border border-emerald-400/50 shadow-inner')
                : 'bg-black/40 border border-white/10'
            }`}
            title={isAutoApply ? 'Turn off Auto-Apply' : 'Turn on Auto-Apply'}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform shadow-md flex items-center justify-center ${
                isAutoApply ? 'bg-white translate-x-5' : 'bg-zinc-400 translate-x-0'
              }`}
            >
              {isAutoApply && <span className={`w-1.5 h-1.5 rounded-full ${deckTheme === 'crimson' ? 'bg-rose-600' : 'bg-emerald-600'}`} />}
            </div>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs sm:text-sm ${
          deckTheme === 'stealth'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Live Spoken Transcript */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-[#dcd3c6] font-semibold px-0.5">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#faf6f0]" />
            <span>Spoken Transcript</span>
            {confidence > 0 && (
              <span className={`text-[10.5px] px-2 py-0.5 ${themeTokens.pillBg} border ${themeTokens.cardBorder} rounded-md font-bold`}>
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          {transcript && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                clearTranscript();
              }}
              className="text-[#b5a99a] hover:text-[#faf6f0] flex items-center gap-1 text-xs cursor-pointer active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className={`w-full min-h-[64px] max-h-[100px] overflow-y-auto no-scrollbar p-3.5 ${themeTokens.inputBg} rounded-xl border ${themeTokens.cardBorder} text-xs sm:text-sm font-mono leading-relaxed`}>
          {transcript || interimTranscript ? (
            <div>
              <span className="text-[#faf6f0]">{transcript}</span>{' '}
              <span className="text-[#dcd3c6] italic animate-pulse font-semibold">{interimTranscript}</span>
            </div>
          ) : (
            <span className={`${themeTokens.mutedText} italic`}>
              {isListening ? 'Speak a Bible reference...' : 'Standby — tap Start to begin.'}
            </span>
          )}
        </div>
      </div>

      {/* Detected Scriptures Section */}
      <div className={`flex flex-col gap-2 pt-2 border-t ${themeTokens.cardBorder}`}>
        <div className="flex items-center justify-between text-xs font-mono text-[#dcd3c6] font-semibold px-0.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#faf6f0]" />
            <span>Detected References ({scriptureHistory.length})</span>
          </div>
          {scriptureHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playHardwareClick();
                clearHistory();
              }}
              className="text-[#b5a99a] hover:text-[#faf6f0] text-xs cursor-pointer active:scale-95 transition-all"
            >
              Clear All
            </button>
          )}
        </div>

        {scriptureHistory.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
            {scriptureHistory.map((item) => {
              const id = `${item.book}_${item.chapter}_${item.verse}_${item.timestamp}`;
              const isItemApplied = appliedId === id;

              return (
                <div
                  key={id}
                  className={`flex flex-col gap-2 p-3.5 rounded-xl ${themeTokens.cardBg} border transition-all ${
                    isItemApplied
                      ? (deckTheme === 'stealth'
                          ? 'border-emerald-500 shadow-md shadow-emerald-950/50'
                          : deckTheme === 'crimson'
                          ? 'border-rose-500 shadow-md shadow-rose-950/50'
                          : 'border-[#faf6f0] shadow-md')
                      : `${themeTokens.cardBorder} hover:border-white/20`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isItemApplied
                          ? (deckTheme === 'stealth'
                              ? 'bg-emerald-500 text-black'
                              : deckTheme === 'crimson'
                              ? 'bg-rose-500 text-white'
                              : 'bg-white text-black')
                          : `${themeTokens.pillBg} border ${themeTokens.cardBorder}`
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#faf6f0] flex items-center gap-1.5">
                          <span>{item.book} {item.chapter}{item.verse ? `:${item.verse}` : ''}{item.endVerse ? `-${item.endVerse}` : ''}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 ${themeTokens.pillBg} border ${themeTokens.cardBorder} rounded font-mono font-semibold`}>
                            {Math.round((item.confidence || 0.9) * 100)}%
                          </span>
                        </div>
                        <div className="text-xs font-mono text-[#b5a99a] truncate">
                          &quot;{item.rawQuery}&quot;
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playHardwareClick();
                        handleManualApply(item);
                      }}
                      className={`py-1.5 px-3 min-h-[38px] rounded-lg text-xs font-bold touch-manipulation flex items-center gap-1.5 shrink-0 cursor-pointer ${getTactileBtnClass(deckTheme, { color: isItemApplied ? 'success' : 'default', size: 'sm', active: isItemApplied })}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isItemApplied ? 'Live' : 'Apply'}</span>
                      {isItemApplied && <span className={getTactileLedClass(true, 'green')} />}
                    </button>
                  </div>

                  {/* Verified Scripture Snippet Preview */}
                  <ScriptureSnippet item={item} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`p-3 text-center text-[#b5a99a] text-xs italic ${themeTokens.stripBg} rounded-xl border ${themeTokens.cardBorder}`}>
            No scriptures detected yet.
          </div>
        )}
      </div>
    </div>
  );
});
