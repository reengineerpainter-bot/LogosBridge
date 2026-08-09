import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Book/Chapter selector chevron
old_book_chapter = """                {/* Book/Chapter Selector */}
                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => setFullPageMenu('chapters')}
                >
                  <span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{selectedBook}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[14px] font-black text-slate-900 leading-tight">{selectedChapter}</span>
                    <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>"""

new_book_chapter = """                {/* Book/Chapter Selector */}
                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => setFullPageMenu('chapters')}
                >
                  <span className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">{selectedBook}</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[14px] font-black text-slate-900 leading-tight">{selectedChapter}</span>
                    <Play className="w-3 h-3 fill-current text-slate-800 rotate-90" />
                  </div>
                </div>"""

# 2. Update the Translation selector to use full name and new chevrons
old_translation = """                {/* Translation Selector */}
                <div 
                  className="flex items-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-2"
                  onClick={() => setFullPageMenu('versions')}
                >
                  <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-[13px] font-black text-slate-900 truncate max-w-[100px] uppercase">{translationDisplayMode}</span>
                  <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
                </div>"""

new_translation = """                {/* Translation Selector */}
                <div 
                  className="flex items-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-2"
                  onClick={() => setFullPageMenu('versions')}
                >
                  <Play className="w-3 h-3 fill-current text-slate-800 rotate-180" />
                  <span className="text-[13px] font-black text-slate-900 truncate max-w-[120px] uppercase">
                    {(() => {
                      const map: Record<string, string> = { kjv: 'King James Version', bsb: 'Berean Standard Bible', asv: 'American Standard Version', ylt: 'Youngs Literal Translation', bbe: 'Bible in Basic English', plain: 'Plain English Translation', personalized: 'Personalized Version', both: 'Dual Translations' };
                      return map[translationDisplayMode] || translationDisplayMode.toUpperCase();
                    })()}
                  </span>
                  <Play className="w-3 h-3 fill-current text-slate-800" />
                </div>"""

if old_book_chapter in content:
    content = content.replace(old_book_chapter, new_book_chapter)
    print("Updated Book/Chapter FAB chevron.")
else:
    print("old_book_chapter not found")

if old_translation in content:
    content = content.replace(old_translation, new_translation)
    print("Updated Translation FAB text and chevrons.")
else:
    print("old_translation not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
