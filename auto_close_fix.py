import re

# Fix App.tsx global click handler and auto-close on color pick
filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleDocumentClick
doc_click_old = """    const handleDocumentClick = (event: MouseEvent) => {
      // Dismiss active word details
      setActiveWordId(null);
      setSelectedWord(null);

    };"""

doc_click_new = """    const handleDocumentClick = (event: MouseEvent) => {
      // Dismiss active word details
      setActiveWordId(null);
      setSelectedWord(null);
      // Dismiss focused verse popups when clicking empty space
      setFocusedVerse(null);
      setFocusedStreamType(null);
    };"""
content = content.replace(doc_click_old, doc_click_new)

# 2. Update color picker to auto-close in App.tsx
color_picker_old = """                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        if (next[vId] === color) delete next[vId];
                                        else next[vId] = color;
                                        return next;
                                      });
                                    }}"""

color_picker_new = """                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        if (next[vId] === color) delete next[vId];
                                        else next[vId] = color;
                                        return next;
                                      });
                                      // Auto-close on color select
                                      setFocusedVerse(null);
                                      setFocusedStreamType(null);
                                    }}"""
content = content.replace(color_picker_old, color_picker_new)

remove_color_old = """                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        delete next[vId];
                                        return next;
                                      });
                                    }}"""

remove_color_new = """                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const vId = `${currentBookObj.name}-${selectedChapter}-${v.verseNumber}`;
                                      setHighlightedVerses(prev => {
                                        const next = { ...prev };
                                        delete next[vId];
                                        return next;
                                      });
                                      // Auto-close on color removal
                                      setFocusedVerse(null);
                                      setFocusedStreamType(null);
                                    }}"""
content = content.replace(remove_color_old, remove_color_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.tsx auto-close logic")


# 3. Update NarrativeStream.tsx color picker
ns_filepath = 'src/components/NarrativeStream.tsx'
with open(ns_filepath, 'r', encoding='utf-8') as f:
    ns_content = f.read()

ns_color_old = """                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, color);
                          }}"""

ns_color_new = """                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, color);
                            // Auto-close on color select
                            setFocusedVerse(null);
                            if (setFocusedStreamType) setFocusedStreamType(null);
                          }}"""
ns_content = ns_content.replace(ns_color_old, ns_color_new)

ns_remove_old = """                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, 'none');
                          }}"""

ns_remove_new = """                          onClick={(e) => {
                            e.stopPropagation();
                            if (setVerseHighlightColor) setVerseHighlightColor(v.verseNumber, 'none');
                            // Auto-close on color removal
                            setFocusedVerse(null);
                            if (setFocusedStreamType) setFocusedStreamType(null);
                          }}"""
ns_content = ns_content.replace(ns_remove_old, ns_remove_new)

with open(ns_filepath, 'w', encoding='utf-8') as f:
    f.write(ns_content)
print("Updated NarrativeStream.tsx auto-close logic")
