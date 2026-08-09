import re
import sys

def patch_app_tsx():
    with open('src/App.tsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # Add right column state
    state_target = "const [selectedChapter, setSelectedChapter] = useState<number>(1);"
    state_repl = """const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedBookRight, setSelectedBookRight] = useState<string>('John');
  const [selectedChapterRight, setSelectedChapterRight] = useState<number>(1);
  const [chapterDataRight, setChapterDataRight] = useState<any>(null);"""
    code = code.replace(state_target, state_repl)

    # Add paginatedVersesListRight
    audio_target = "const paginatedVersesList = useMemo(() => {"
    paginated_right = """const paginatedVersesListRight = useMemo(() => {
    if (!chapterDataRight || !chapterDataRight.verses) return [];
    return chapterDataRight.verses.slice(0, currentMaxVerses);
  }, [chapterDataRight, currentMaxVerses]);

  const paginatedVersesList = useMemo(() => {"""
    code = code.replace(audio_target, paginated_right)

    # Modify loadChapter to handle right column
    # The simplest way is to create loadChapterRight that mirrors loadChapter!
    # Wait, loadChapter is huge. Let's just modify the `useEffect` that calls loadChapter!
    useeffect_target = """useEffect(() => {
    loadChapter(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter]);"""
    
    useeffect_repl = """useEffect(() => {
    loadChapter(selectedBook, selectedChapter, 'left');
  }, [selectedBook, selectedChapter]);
  
  useEffect(() => {
    if (translationDisplayMode === 'both') {
      loadChapter(selectedBookRight, selectedChapterRight, 'right');
    }
  }, [selectedBookRight, selectedChapterRight, translationDisplayMode]);"""
    code = code.replace(useeffect_target, useeffect_repl)

    # Update loadChapter signature
    load_sig = "const loadChapter = async (book: string, chapter: number) => {"
    load_sig_repl = "const loadChapter = async (book: string, chapter: number, targetCol: 'left'|'right' = 'left') => {"
    code = code.replace(load_sig, load_sig_repl)

    # Update setChapterData inside loadChapter
    # It sets chapterData, we want it to set chapterDataRight if targetCol === 'right'
    # There is `setChapterData(staticData);`, `setChapterData(cachedParsed);`, `setChapterData(dbChapter as any);`, `setChapterData(responseData.data);`, `setChapterData(currentData);`
    code = re.sub(r'setChapterData\((.*?)\);', r"(targetCol === 'left' ? setChapterData : setChapterDataRight)(\1);", code)
    # But wait, we also have `const [chapterDataState, setChapterData] = useState<ChapterData | null>(null);`
    # That will get ruined! Let's revert that one.
    code = code.replace("(targetCol === 'left' ? setChapterData : setChapterDataRight)(null)>", "setChapterData>null>")
    code = code.replace("const [chapterDataState, (targetCol === 'left' ? setChapterData : setChapterDataRight)]", "const [chapterDataState, setChapterData]")
    
    # Update FAB Book/Chapter
    fab_book_target = """<span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{selectedBook}</span>
                     <span className="text-[14px] font-black text-slate-900 leading-tight mt-0.5">{selectedChapter}</span>"""
    fab_book_repl = """<span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{translationDisplayMode === 'both' && activeDualColumn === 'right' ? selectedBookRight : selectedBook}</span>
                     <span className="text-[14px] font-black text-slate-900 leading-tight mt-0.5">{translationDisplayMode === 'both' && activeDualColumn === 'right' ? selectedChapterRight : selectedChapter}</span>"""
    code = code.replace(fab_book_target, fab_book_repl)

    # Update prev/next arrows in FAB
    handle_prev_target = "onClick={(e) => { e.stopPropagation(); handlePrevChapter(); }}"
    handle_prev_repl = "onClick={(e) => { e.stopPropagation(); if(translationDisplayMode === 'both' && activeDualColumn === 'right') handlePrevChapterRight(); else handlePrevChapter(); }}"
    code = code.replace(handle_prev_target, handle_prev_repl)

    handle_next_target = "onClick={(e) => { e.stopPropagation(); handleNextChapter(); }}"
    handle_next_repl = "onClick={(e) => { e.stopPropagation(); if(translationDisplayMode === 'both' && activeDualColumn === 'right') handleNextChapterRight(); else handleNextChapter(); }}"
    code = code.replace(handle_next_target, handle_next_repl)

    # Implement handleNextChapterRight and handlePrevChapterRight
    handle_fns_target = "const handleNextChapter = () => {"
    handle_fns_repl = """const handlePrevChapterRight = () => {
    const currentBookObj = booksList.find(b => b.name === selectedBookRight);
    if (!currentBookObj) return;
    if (selectedChapterRight > 1) {
      setSelectedChapterRight(selectedChapterRight - 1);
    } else {
      const bookIndex = booksList.findIndex(b => b.name === selectedBookRight);
      if (bookIndex > 0) {
        const prevBook = booksList[bookIndex - 1];
        setSelectedBookRight(prevBook.name);
        setSelectedChapterRight(prevBook.chapters);
      }
    }
  };
  const handleNextChapterRight = () => {
    const currentBookObj = booksList.find(b => b.name === selectedBookRight);
    if (!currentBookObj) return;
    if (selectedChapterRight < currentBookObj.chapters) {
      setSelectedChapterRight(selectedChapterRight + 1);
    } else {
      const bookIndex = booksList.findIndex(b => b.name === selectedBookRight);
      if (bookIndex < booksList.length - 1) {
        const nextBook = booksList[bookIndex + 1];
        setSelectedBookRight(nextBook.name);
        setSelectedChapterRight(1);
      }
    }
  };
  const handleNextChapter = () => {"""
    code = code.replace(handle_fns_target, handle_fns_repl)

    # Update renderNarrativeStream to pass the correct chunks
    render_target = "const versesList = paginatedVersesList;"
    render_repl = """const versesList = (translationDisplayMode === 'both' && type === dualStreamRight) ? paginatedVersesListRight : paginatedVersesList;"""
    code = code.replace(render_target, render_repl)
    
    # Update grid scrolling
    grid_target = """<div className={`grid ${translationDisplayMode === 'both' ? 'grid-cols-2 gap-8' : 'grid-cols-1'} flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-all duration-500 pb-32`}>"""
    grid_repl = """<div className={`grid ${translationDisplayMode === 'both' ? 'grid-cols-2 gap-8' : 'grid-cols-1'} flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-all duration-500 pb-32 ${translationDisplayMode === 'both' ? 'h-[calc(100vh-160px)] overflow-hidden' : ''}`}>"""
    code = code.replace(grid_target, grid_repl)

    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(code)

    print("App.tsx patched!")

patch_app_tsx()
