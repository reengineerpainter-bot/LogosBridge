import re

filepath = 'src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Top-Left Plain Text Header
# Find the Chapter Header and replace it.
header_regex = re.compile(r'\{/\* Chapter Header \*/\}.*?\{/\* Row 1: Title, Fetch state \*/\}.*?<div className="space-y-1">.*?<h2.*?</h2>\s*</div>\s*</div>', re.DOTALL)
plain_header_replacement = r"""{/* Chapter Header */}
              {mainView !== 'home' && (
              <div className={`flex flex-col gap-2 pb-4 mb-4 border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
                
                {/* Row 1: Title, Fetch state */}
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                  <div className="space-y-1">
                    <h2 className={`text-[1.35rem] font-bold tracking-tight ${theme === 'light' ? 'text-[#1e293b]' : 'text-slate-100'} flex items-baseline flex-wrap gap-x-1`}>
                      <span>{chapterData.book} {chapterData.chapter}</span>
                      {isBackgroundFetching && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm px-1 py-1 font-sans font-semibold tracking-wider uppercase border animate-pulse sm:ml-2 transform -translate-y-0.5 ${theme === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Refining
                        </span>
                      )}
                    </h2>
                  </div>
                </div>"""
content = re.sub(header_regex, plain_header_replacement, content)

# 2. Fix the scroll auto-hide syntax on the bottom FAB
# Currently it looks like: className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-in-out ${isHeaderHidden ? \'translate-y-32 opacity-0 pointer-events-none\' : \'translate-y-0 opacity-100\'}"
bad_fab_regex = r'<div className="fixed bottom-\[85px\] left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-in-out \$\{isHeaderHidden \? \\\'translate-y-32 opacity-0 pointer-events-none\\\' : \\\'translate-y-0 opacity-100\\\'\}">'
good_fab_replacement = r'<div className={`fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-in-out ${isHeaderHidden ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}>'
content = re.sub(bad_fab_regex, good_fab_replacement, content)
# Just in case the regex doesn't catch it perfectly because of backslashes, let's use a simpler replace
content = content.replace('className="fixed bottom-[85px] left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-in-out ${isHeaderHidden ? \'translate-y-32 opacity-0 pointer-events-none\' : \'translate-y-0 opacity-100\'}"', good_fab_replacement)

# 3. Inject the Contextual Notebook FAB into the active verse block
# Look for: if (isFocused) { highlightClasses = ... }
# We will inject a FAB that appears next to the verse if it's focused.
focus_regex = r'(if \(isFocused\) \{\s*highlightClasses = [^;]+;)'
notebook_fab_injection = r"""\1
                            
                            // CONTEXTUAL NOTEBOOK FAB
                            const notebookFab = isFocused ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMainView('notebook'); setActiveNotebookVerse(v.verseNumber); }}
                                className={`absolute -right-3 -top-3 z-50 p-2 rounded-full shadow-xl transition-all duration-300 animate-fade-in-up ${theme === 'light' ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'} ${isHeaderHidden ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
                                title="Open Theological Notebook for this verse"
                              >
                                <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                              </button>
                            ) : null;
"""
if "CONTEXTUAL NOTEBOOK FAB" not in content:
    content = re.sub(focus_regex, notebook_fab_injection, content)

# Now we need to render `notebookFab` inside the verse container.
# Find where the verse card returns its main div: `<div id={`verse-${v.verseNumber}`}`
# And add `{notebookFab}` inside it.
# The `renderVerseCard` returns: `<div id={`verse-${v.verseNumber}`} ... >`
verse_container_regex = r'(<div\s+id=\{`verse-\$\{v\.verseNumber\}`\}\s+onClick=\{[^\}]+\}\s+className=\{`group relative p-2 md:p-3[^\}]+`\}\s*>)'
if "{notebookFab}" not in content:
    content = re.sub(verse_container_regex, r'\1\n                              {notebookFab}', content)

# 4. Remove "Core Feature" text from home page
# Look for <span className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2 block">CORE FEATURE</span>
core_feature_regex = r'<span className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2 block">CORE FEATURE</span>'
content = content.replace(core_feature_regex, '')

# 5. Crop Studio Preview Image via CSS
# Look for src={studioPreviewImg}
studio_preview_regex = r'(<img\s+src=\{studioPreviewImg\}\s+alt="Studio Preview"\s+className=")([^"]+)(")'
# The original classes are likely something like "w-full h-48 object-cover rounded-xl shadow-lg border border-slate-200/20"
# We'll replace object-cover with object-cover object-center scale-110 to crop the edges
def replace_studio_preview(match):
    classes = match.group(2)
    # Add scale-110 and ensure object-cover is there
    if "scale-[1.15]" not in classes:
        classes += " scale-[1.15] object-center"
    return f'{match.group(1)}{classes}{match.group(3)}'

content = re.sub(studio_preview_regex, replace_studio_preview, content)

# 6. Make sure the container holding the studio preview has overflow-hidden
# It's inside a div. We can add overflow-hidden to all image containers in the vertical feed to be safe,
# but it's probably easier to just replace `className="relative mt-6"` or similar with `overflow-hidden` added.
# Let's wrap the img in an overflow hidden if it isn't already.
# Actually, the parent div usually has `rounded-2xl` or similar. Let's just find `src={studioPreviewImg}` and add overflow-hidden to its parent by replacing `className="relative mt-4"`
parent_regex = r'(<div className=")([^"]*)(">\s*<img src=\{studioPreviewImg\})'
def add_overflow_hidden(match):
    classes = match.group(2)
    if "overflow-hidden" not in classes:
        classes += " overflow-hidden"
    return f'{match.group(1)}{classes}{match.group(3)}'
content = re.sub(parent_regex, add_overflow_hidden, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final verification fixes applied.")
