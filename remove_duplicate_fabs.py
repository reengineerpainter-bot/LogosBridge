import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old redundant FABs
start_marker_1 = "{/* FLOAT POP TRIGGERS WHEN HEADER COLLAPSED */}"
end_marker_1 = "{/* FLOATING AUDIO PLAY FAB & TRANSLATION TOGGLE */}"

if start_marker_1 in content:
    # Find the end of the AudioFAB block
    end_marker_2 = "      {/* MAIN CONTENT AREA - DYNAMIC RENDER */}"
    start_idx = content.find(start_marker_1)
    end_idx = content.find(end_marker_2, start_idx)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]
        print("Removed redundant top-left and bottom-left FAB blocks.")

# 2. Wire up the audio logic in the central bottom FAB
fake_audio_btn = """                {/* Audio Play Button */}
                <button 
                  className="w-12 h-12 bg-[#0d9488] rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all"
                  onClick={() => {
                     // Toggle Audio logic if needed
                     playWebAudioBeep(600, 'sine', 0.1);
                  }}
                >
                  <Play className="w-6 h-6 ml-1 fill-current" />
                </button>"""

real_audio_btn = """                {/* Audio Play Button */}
                <button 
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all ${
                    isPlayingAudio ? 'bg-rose-500 shadow-rose-500/30' : 'bg-[#0d9488] shadow-teal-500/30'
                  }`}
                  onClick={(e) => {
                     e.stopPropagation();
                     if (isPlayingAudio) {
                       stopSpeaking();
                     } else {
                       playTranslationStream(
                         translationDisplayMode === 'both' ? dualStreamLeft : (['plain', 'kjv', 'bsb', 'pers', 'asv', 'ylt', 'bbe'].includes(translationDisplayMode) ? translationDisplayMode : 'plain')
                       );
                     }
                  }}
                >
                  {isPlayingAudio ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
                </button>"""

if fake_audio_btn in content:
    content = content.replace(fake_audio_btn, real_audio_btn)
    print("Wired up the real audio logic in the central Bottom FAB.")
else:
    print("Fake audio button not found. Maybe it's already updated?")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
