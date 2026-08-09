import re

def patch_app():
    with open('src/App.tsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. State vars
    state_target = "const [selectedChapter, setSelectedChapter] = useState<number>(1);"
    state_repl = """const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedBookRight, setSelectedBookRight] = useState<string>('John');
  const [selectedChapterRight, setSelectedChapterRight] = useState<number>(1);
  const [chapterDataRight, setChapterDataRight] = useState<any>(null);"""
    code = code.replace(state_target, state_repl)

    # 2. PaginatedVersesListRight
    audio_target = "const paginatedVersesList = useMemo(() => {"
    paginated_right = """const paginatedVersesListRight = useMemo(() => {
    if (!chapterDataRight || !chapterDataRight.verses) return [];
    return chapterDataRight.verses.slice(0, currentMaxVerses);
  }, [chapterDataRight, currentMaxVerses]);

  const paginatedVersesList = useMemo(() => {"""
    code = code.replace(audio_target, paginated_right)

    # 3. useEffect for chapter loading
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

    # 4. loadChapter signature
    load_sig = "const loadChapter = async (book: string, chapter: number) => {"
    load_sig_repl = "const loadChapter = async (book: string, chapter: number, targetCol: 'left' | 'right' = 'left') => {"
    code = code.replace(load_sig, load_sig_repl)

    # 5. Extract loadChapter body and replace setChapterData
    start_idx = code.find(load_sig_repl)
    if start_idx != -1:
        # find end of loadChapter (it ends with a return; or just look for the end of the block)
        # loadChapter ends before `const handleSearch = async`
        end_idx = code.find("const handleSearch = async", start_idx)
        if end_idx != -1:
            load_body = code[start_idx:end_idx]
            new_load_body = re.sub(r'setChapterData\((.*?)\);', r"(targetCol === 'left' ? setChapterData : setChapterDataRight)(\1);", load_body)
            # Revert the initial useState setChapterData if we accidentally replaced it
            code = code[:start_idx] + new_load_body + code[end_idx:]

    # 6. FAB Book/Chapter selector
    fab_book_target = """<span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{selectedBook}</span>
                     <span className="text-[14px] font-black text-slate-900 leading-tight mt-0.5">{selectedChapter}</span>"""
    fab_book_repl = """<span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{translationDisplayMode === 'both' && activeDualColumn === 'right' ? selectedBookRight : selectedBook}</span>
                     <span className="text-[14px] font-black text-slate-900 leading-tight mt-0.5">{translationDisplayMode === 'both' && activeDualColumn === 'right' ? selectedChapterRight : selectedChapter}</span>"""
    code = code.replace(fab_book_target, fab_book_repl)

    # 7. FAB Handle next/prev
    handle_prev_target = "onClick={(e) => { e.stopPropagation(); handlePrevChapter(); }}"
    handle_prev_repl = "onClick={(e) => { e.stopPropagation(); if(translationDisplayMode === 'both' && activeDualColumn === 'right') handlePrevChapterRight(); else handlePrevChapter(); }}"
    code = code.replace(handle_prev_target, handle_prev_repl)

    handle_next_target = "onClick={(e) => { e.stopPropagation(); handleNextChapter(); }}"
    handle_next_repl = "onClick={(e) => { e.stopPropagation(); if(translationDisplayMode === 'both' && activeDualColumn === 'right') handleNextChapterRight(); else handleNextChapter(); }}"
    code = code.replace(handle_next_target, handle_next_repl)

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

    # 8. renderNarrativeStream passing chunks
    render_target = "const versesList = paginatedVersesList;"
    render_repl = """const versesList = (translationDisplayMode === 'both' && type === dualStreamRight) ? paginatedVersesListRight : paginatedVersesList;"""
    code = code.replace(render_target, render_repl)
    
    # 9. Update grid scrolling
    grid_target = "grid-cols-2 gap-8' : 'grid-cols-1'} flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-all duration-500 pb-32`}>"
    grid_repl = "grid-cols-2 gap-8' : 'grid-cols-1'} flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 transition-all duration-500 pb-32 ${translationDisplayMode === 'both' ? 'h-[calc(100vh-160px)] overflow-hidden' : ''}`}>\n"
    code = code.replace(grid_target, grid_repl)
    
    # Also add overflow-y-auto to NarrativeStream container inside the grid
    narrative_container_target = """<div className={`p-6 md:p-10 transition-all duration-500 ease-in-out ${
                              mainView === 'interlinear' || mainView === 'audio' 
                                ? 'opacity-0 scale-95 pointer-events-none absolute' 
                                : 'opacity-100 scale-100 relative'
                            }`}>"""
    narrative_container_repl = """<div className={`p-6 md:p-10 transition-all duration-500 ease-in-out ${
                              mainView === 'interlinear' || mainView === 'audio' 
                                ? 'opacity-0 scale-95 pointer-events-none absolute' 
                                : 'opacity-100 scale-100 relative'
                            } ${translationDisplayMode === 'both' ? 'overflow-y-auto h-full scrollbar-hide' : ''}`}>"""
    code = code.replace(narrative_container_target, narrative_container_repl)
    
    # Oh wait, NarrativeStream itself might not be the direct child. 
    # Let's write the file
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(code)

    print("App.tsx patched!")

patch_app()
