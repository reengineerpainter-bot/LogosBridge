import re

filepath = 'src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Top-Left Header completely
# Previous patch changed it to:
header_to_remove = r"<h2 className=\{`text-\[1\.35rem\] font-bold tracking-tight \$\{theme === 'light' \? 'text-\[\#1e293b\]' : 'text-slate-100'\} flex items-baseline flex-wrap gap-x-1`\}>\s*<span>\{chapterData\.book\}</span>\s*<span>\{chapterData\.chapter\}</span>\s*</h2>"
content = re.sub(header_to_remove, "", content)

# 2. Add isHeaderHidden scrolling logic to the floating bottom FAB container
# The existing container is:
fab_container_regex = r'(<div className="fixed bottom-\[85px\] left-1/2 -translate-x-1/2 z-40)'
new_fab_class = r'\1 transition-all duration-500 ease-in-out ${isHeaderHidden ? \'translate-y-32 opacity-0 pointer-events-none\' : \'translate-y-0 opacity-100\'} "'
content = re.sub(fab_container_regex, new_fab_class, content)
# Fix the regex replacement artifact which leaves an extra double quote.
content = content.replace('} "', '}')


# 3. Add isHeaderHidden to the Contextual Notebook FAB
contextual_fab_regex = r'(<div className="absolute -bottom-10 right-4 z-50 animate-fade-in-up)'
new_contextual_class = r'\1 transition-all duration-300 ${isHeaderHidden ? \'opacity-0 pointer-events-none scale-90\' : \'opacity-100 scale-100\'} "'
content = re.sub(contextual_fab_regex, new_contextual_class, content)
content = content.replace('} "', '}')

# 4. Remove 'formal' from layoutMode type definition
content = content.replace("const [layoutMode, setLayoutMode] = useState<'formal' | 'paragraph'>(() => {", "const [layoutMode, setLayoutMode] = useState<'paragraph'>(() => {")
content = content.replace("return (localStorage.getItem('personalized_bible_layout_mode') as 'formal' | 'paragraph') || 'paragraph';", "return 'paragraph';")

# 5. Remove the layoutMode settings block entirely from App.tsx
# Find the block starting with `<div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Layout Mode</div>`
# and remove its parent div.
layout_settings_regex = re.compile(r'<div className=\{`flex flex-col space-y-2 p-4 rounded-2xl shadow-sm border \$\{theme === \'light\' \? \'bg-white border-slate-200\' : \'bg-\[\#121622\] border-cyan-950/30\'\}`\}>\s*<div className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">Layout Mode</div>.*?</div>\s*</div>', re.DOTALL)
content = re.sub(layout_settings_regex, "", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied for final read-view tweaks.")
