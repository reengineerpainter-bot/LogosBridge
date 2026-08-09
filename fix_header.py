import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old top fixed nav bar
start_marker_1 = "{/* FIXED NAV BAR (COLLAPSIBLE & STICKY) */}"
end_marker_1 = "{/* MAIN CONTENT AREA - DYNAMIC RENDER */}"

if start_marker_1 in content and end_marker_1 in content:
    start_idx = content.find(start_marker_1)
    end_idx = content.find(end_marker_1, start_idx)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]
        print("Removed redundant top nav bar.")
    else:
        print("Indexes not valid for nav bar.")
else:
    print("Markers not found for nav bar.")

# 2. Update font weights and chevron boldness in the restored FAB
old_book_chapter = """                {/* Book/Chapter Selector */}
                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => setFullPageMenu('chapters')}
                >
                  <span className="text-[13px] font-bold text-slate-800 tracking-tight leading-tight">{selectedBook}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight">{selectedChapter}</span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>"""

new_book_chapter = """                {/* Book/Chapter Selector */}
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

old_translation = """                {/* Translation Selector */}
                <div 
                  className="flex items-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-2"
                  onClick={() => setFullPageMenu('versions')}
                >
                  <span className="text-sm font-bold text-slate-800 tracking-wide uppercase">{translationDisplayMode}</span>
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>"""

new_translation = """                {/* Translation Selector */}
                <div 
                  className="flex items-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition space-x-2"
                  onClick={() => setFullPageMenu('versions')}
                >
                  <span className="text-[15px] font-black text-slate-900 tracking-wide uppercase">{translationDisplayMode}</span>
                  <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                </div>"""

if old_book_chapter in content:
    content = content.replace(old_book_chapter, new_book_chapter)
    print("Updated Book/Chapter FAB weight.")
else:
    print("old_book_chapter not found")

if old_translation in content:
    content = content.replace(old_translation, new_translation)
    print("Updated Translation FAB weight.")
else:
    print("old_translation not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
