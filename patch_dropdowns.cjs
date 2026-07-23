const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The original strings to replace:
const bookDropdownOriginal = `<AnimatePresence>
                    {isBookDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className={\`absolute left-0 mt-2 w-72 \${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-xl' : 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl'} border rounded-xl p-3 z-50 max-h-[250px] overflow-y-auto\`}
                      >
                        <div className={\`sticky top-0 \${theme === 'light' ? 'bg-white border-zinc-100' : 'bg-zinc-900 border-zinc-800'} pb-2 mb-2 border-b flex items-center\`}>
                          <Search className={\`w-4 h-4 \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} mr-2\`} />
                          <input
                            type="text"
                            placeholder="Type to find book (e.g. Genesis)..."
                            value={bookSearchQuery}
                            onChange={(e) => setBookSearchQuery(e.target.value)}
                            className={\`\${theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500'} text-xs px-2.5 py-2 rounded-lg w-full border focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all font-sans\`}
                          />
                          {bookSearchQuery && (
                            <button
                              onClick={() => setBookSearchQuery('')}
                              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 ml-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Testament Filter Groups */}
                        <div className="space-y-4">
                          <div>
                            <p className={\`text-[10px] font-sans font-semibold uppercase tracking-widest pl-2 mb-1.5 \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                              Old Testament
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              {filteredBooks
                                .filter((b) => b.testament === 'Old')
                                .map((book) => (
                                  <button
                                    id={\`select-book-\${book.name}\`}
                                    key={book.name}
                                    onClick={() => {
                                      setSelectedBook(book.name);
                                      setSelectedChapter(1);
                                      setIsBookDropdownOpen(false);
                                      setBookSearchQuery('');
                                    }}
                                    className={\`text-left text-xs px-2 py-1.5 rounded-md transition-all font-sans flex items-center justify-between \${
                                      theme === 'light'
                                        ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                        : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
                                    } \${
                                      selectedBook === book.name
                                        ? (theme === 'light' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-50 font-medium')
                                        : ''
                                    }\`}
                                  >
                                    <span className="truncate">{book.name}</span>
                                    {selectedBook === book.name && (
                                      <Check className="w-3 h-3 shrink-0 ml-1" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </div>
                          <div>
                            <p className={\`text-[10px] font-sans font-semibold uppercase tracking-widest pl-2 mb-1.5 \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                              New Testament
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              {filteredBooks
                                .filter((b) => b.testament === 'New')
                                .map((book) => (
                                  <button
                                    id={\`select-book-\${book.name}\`}
                                    key={book.name}
                                    onClick={() => {
                                      setSelectedBook(book.name);
                                      setSelectedChapter(1);
                                      setIsBookDropdownOpen(false);
                                      setBookSearchQuery('');
                                    }}
                                    className={\`text-left text-xs px-2 py-1.5 rounded-md transition-all font-sans flex items-center justify-between \${
                                      theme === 'light'
                                        ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                        : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
                                    } \${
                                      selectedBook === book.name
                                        ? (theme === 'light' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-50 font-medium')
                                        : ''
                                    }\`}
                                  >
                                    <span className="truncate">{book.name}</span>
                                    {selectedBook === book.name && (
                                      <Check className="w-3 h-3 shrink-0 ml-1" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </div>
                          {filteredBooks.length === 0 && (
                            <div className="text-center text-xs text-zinc-500 py-4 font-sans">
                              No biblical books matched.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

const bookDropdownNew = `<AnimatePresence>
                    {isBookDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        className={\`absolute left-0 top-full mt-1.5 w-80 md:w-[540px] \${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-2xl' : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.4)]'} border rounded-xl p-0 z-50 overflow-hidden flex flex-col max-h-[60vh] md:max-h-[70vh]\`}
                      >
                        <div className={\`shrink-0 \${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'} p-2 border-b flex items-center\`}>
                          <Search className={\`w-4 h-4 \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} ml-1 mr-2\`} />
                          <input
                            type="text"
                            placeholder="Find a book (e.g. Genesis)..."
                            value={bookSearchQuery}
                            onChange={(e) => setBookSearchQuery(e.target.value)}
                            className={\`\${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400' : 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-600'} text-xs px-2.5 py-1.5 rounded-md w-full border shadow-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans\`}
                          />
                          {bookSearchQuery && (
                            <button
                              onClick={() => setBookSearchQuery('')}
                              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 ml-1 mr-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Testament Filter Groups */}
                        <div className="overflow-y-auto p-2 md:p-3 space-y-4">
                          <div className="flex flex-col md:flex-row md:gap-4 space-y-4 md:space-y-0">
                            <div className="flex-1">
                              <div className={\`sticky top-0 z-10 \${theme === 'light' ? 'bg-white/95' : 'bg-zinc-950/95'} backdrop-blur-sm pb-1 mb-1.5 border-b \${theme === 'light' ? 'border-zinc-100' : 'border-zinc-800/60'}\`}>
                                <p className={\`text-[9px] font-sans font-bold uppercase tracking-widest \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                                  Old Testament
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-0.5">
                                {filteredBooks
                                  .filter((b) => b.testament === 'Old')
                                  .map((book) => (
                                    <button
                                      id={\`select-book-\${book.name}\`}
                                      key={book.name}
                                      onClick={() => {
                                        setSelectedBook(book.name);
                                        setSelectedChapter(1);
                                        setIsBookDropdownOpen(false);
                                        setBookSearchQuery('');
                                      }}
                                      className={\`text-left text-[11px] px-2 py-1 rounded-md transition-all font-sans flex items-center justify-between \${
                                        theme === 'light'
                                          ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                          : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                                      } \${
                                        selectedBook === book.name
                                          ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm border border-cyan-100' : 'bg-cyan-900/30 text-cyan-400 font-semibold shadow-sm border border-cyan-800/50')
                                          : 'border border-transparent'
                                      }\`}
                                    >
                                      <span className="truncate">{book.name}</span>
                                      {selectedBook === book.name && (
                                        <Check className="w-3 h-3 shrink-0 ml-1" />
                                      )}
                                    </button>
                                  ))}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className={\`sticky top-0 z-10 \${theme === 'light' ? 'bg-white/95' : 'bg-zinc-950/95'} backdrop-blur-sm pb-1 mb-1.5 border-b \${theme === 'light' ? 'border-zinc-100' : 'border-zinc-800/60'}\`}>
                                <p className={\`text-[9px] font-sans font-bold uppercase tracking-widest \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}\`}>
                                  New Testament
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-0.5">
                                {filteredBooks
                                  .filter((b) => b.testament === 'New')
                                  .map((book) => (
                                    <button
                                      id={\`select-book-\${book.name}\`}
                                      key={book.name}
                                      onClick={() => {
                                        setSelectedBook(book.name);
                                        setSelectedChapter(1);
                                        setIsBookDropdownOpen(false);
                                        setBookSearchQuery('');
                                      }}
                                      className={\`text-left text-[11px] px-2 py-1 rounded-md transition-all font-sans flex items-center justify-between \${
                                        theme === 'light'
                                          ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                          : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                                      } \${
                                        selectedBook === book.name
                                          ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm border border-cyan-100' : 'bg-cyan-900/30 text-cyan-400 font-semibold shadow-sm border border-cyan-800/50')
                                          : 'border border-transparent'
                                      }\`}
                                    >
                                      <span className="truncate">{book.name}</span>
                                      {selectedBook === book.name && (
                                        <Check className="w-3 h-3 shrink-0 ml-1" />
                                      )}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                          {filteredBooks.length === 0 && (
                            <div className="text-center text-[11px] text-zinc-500 py-4 font-sans">
                              No biblical books matched.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

content = content.replace(bookDropdownOriginal, bookDropdownNew);

const chapterDropdownOriginal = `<AnimatePresence>
                    {isChapterDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={\`absolute left-0 mt-2 top-full w-48 \${theme === 'light' ? 'bg-white border-slate-200 text-slate-800 shadow-2xl' : 'bg-[#090e1a] border-cyan-900 border-opacity-70 text-slate-150 shadow-2xl'} border rounded-xl p-3 z-50 max-h-[220px] overflow-y-auto\`}
                      >
                        <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest pl-1 mb-2 font-bold select-none">
                          Select Chapter
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {Array.from(
                            { length: currentBookObj.chapters },
                            (_, i) => i + 1
                          ).map((ch) => (
                            <button
                              key={ch}
                              onClick={() => {
                                setSelectedChapter(ch);
                                setStudyResponse(null);
                                setStudyQuery('');
                                setIsChapterDropdownOpen(false);
                              }}
                              className={\`text-center text-xs py-1.5 rounded-md transition-all font-sans \${
                                theme === 'light'
                                  ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                  : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
                              } \${
                                selectedChapter === ch
                                  ? (theme === 'light' ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'bg-zinc-800 text-zinc-50 font-semibold')
                                  : ''
                              }\`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

const chapterDropdownNew = `<AnimatePresence>
                    {isChapterDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        className={\`absolute left-0 mt-1.5 top-full w-64 md:w-80 \${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-2xl' : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.4)]'} border rounded-xl p-0 z-50 flex flex-col max-h-[60vh] overflow-hidden\`}
                      >
                        <div className={\`sticky top-0 z-10 \${theme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'} p-2 border-b flex items-center justify-between shrink-0\`}>
                          <p className={\`text-[9px] font-sans font-bold uppercase tracking-widest \${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'} ml-1\`}>
                            Select Chapter
                          </p>
                          <span className={\`text-[9px] font-mono \${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'} mr-1\`}>
                            {currentBookObj.chapters} total
                          </span>
                        </div>
                        <div className="overflow-y-auto p-2">
                          <div className="grid grid-cols-5 md:grid-cols-6 gap-0.5">
                            {Array.from(
                              { length: currentBookObj.chapters },
                              (_, i) => i + 1
                            ).map((ch) => (
                              <button
                                key={ch}
                                onClick={() => {
                                  setSelectedChapter(ch);
                                  setStudyResponse(null);
                                  setStudyQuery('');
                                  setIsChapterDropdownOpen(false);
                                }}
                                className={\`text-center text-[12px] py-1.5 rounded-md transition-all font-sans \${
                                  theme === 'light'
                                    ? 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900'
                                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                                } \${
                                  selectedChapter === ch
                                    ? (theme === 'light' ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-sm border border-cyan-100' : 'bg-cyan-900/30 text-cyan-400 font-semibold shadow-sm border border-cyan-800/50')
                                    : 'border border-transparent'
                                }\`}
                              >
                                {ch}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

content = content.replace(chapterDropdownOriginal, chapterDropdownNew);

fs.writeFileSync('src/App.tsx', content);
console.log('Dropdowns patched successfully.');
