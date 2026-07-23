const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const bookDropdownBtnIndex = content.indexOf('id="book-select-dropdown-btn"');
const dropdownAnimateStart = content.indexOf('<AnimatePresence>', bookDropdownBtnIndex);
const dropdownAnimateEnd = content.indexOf('</AnimatePresence>', dropdownAnimateStart) + '</AnimatePresence>'.length;

const bookDropdownNew = `<AnimatePresence>
                    {isBookDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        className={\`absolute left-0 top-full mt-2.5 md:mt-3.5 w-[90vw] max-w-md md:w-[540px] md:max-w-none \${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-2xl' : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.4)]'} border rounded-xl p-0 z-50 overflow-hidden flex flex-col max-h-[60vh] md:max-h-[70vh]\`}
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

const originalString = content.substring(dropdownAnimateStart, dropdownAnimateEnd);
content = content.replace(originalString, bookDropdownNew);
fs.writeFileSync('src/App.tsx', content);
console.log('Book dropdown forced patch completed.');
