import re

filepath = 'src/components/NarrativeStream.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add to Props Interface if not already there
if "getVerseHighlightColor?:" not in content:
    content = content.replace("  stopSpeaking: () => void;", "  stopSpeaking: () => void;\n  getVerseHighlightColor?: (verseNo: number) => string | undefined;\n  setVerseHighlightColor?: (verseNo: number, color: string) => void;\n  openContextualNotebook?: (verseNo: number) => void;")

# Add to destructuring block if not already there
if "getVerseHighlightColor," not in content:
    content = content.replace("  stopSpeaking,\n  playSingleVerse,", "  stopSpeaking,\n  getVerseHighlightColor,\n  setVerseHighlightColor,\n  openContextualNotebook,\n  playSingleVerse,")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed NarrativeStream.tsx props")
