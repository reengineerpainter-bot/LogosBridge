import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace setFullPageMenu('chapters') with setIsBookDropdownOpen(true)
bad_onclick = """                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => setFullPageMenu('chapters')}
                >"""

good_onclick = """                <div 
                  className="flex flex-col items-center justify-center px-3 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                  onClick={() => { setIsBookDropdownOpen(true); setIsChapterDropdownOpen(false); }}
                >"""

if bad_onclick in content:
    content = content.replace(bad_onclick, good_onclick)
    print("Fixed Book/Chapter modal trigger.")
else:
    print("Could not find Book/Chapter onClick.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
