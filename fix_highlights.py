import re

# Fix NarrativeStream.tsx
ns_filepath = 'src/components/NarrativeStream.tsx'
with open(ns_filepath, 'r', encoding='utf-8') as f:
    ns_content = f.read()

ns_old = """                  if (isFocused) {
                    highlightClasses = theme === 'light' 
                      ? 'bg-cyan-100/60 dark:bg-cyan-950/25 border-b border-cyan-500/80 text-slate-900 dark:text-white rounded-sm px-1 py-0.5 font-medium' 
                      : 'bg-cyan-500/10 border-b border-cyan-400/50 text-white rounded-sm px-1 py-0.5 font-medium';
                  } else if (holdsNotes) {
                    highlightClasses = theme === 'light' 
                      ? 'bg-amber-105/40 border-b border-amber-400/40 text-slate-900 rounded-sm px-1 py-0.5' 
                      : 'bg-amber-955/20 border-b border-amber-500/20 text-amber-200 rounded-sm px-1 py-0.5';
                  } else {
                    highlightClasses = 'px-1 py-0.5 rounded-sm hover:bg-slate-500/5 dark:hover:bg-cyan-500/5 transition-colors duration-155';
                  }"""

ns_new = """                  if (isFocused) {
                    highlightClasses += theme === 'light' 
                      ? 'bg-cyan-100/60 dark:bg-cyan-950/25 border-b border-cyan-500/80 text-slate-900 dark:text-white rounded-sm px-1 py-0.5 font-medium ' 
                      : 'bg-cyan-500/10 border-b border-cyan-400/50 text-white rounded-sm px-1 py-0.5 font-medium ';
                  } else if (holdsNotes) {
                    highlightClasses += theme === 'light' 
                      ? 'bg-amber-105/40 border-b border-amber-400/40 text-slate-900 rounded-sm px-1 py-0.5 ' 
                      : 'bg-amber-955/20 border-b border-amber-500/20 text-amber-200 rounded-sm px-1 py-0.5 ';
                  } else if (!hColor) {
                    highlightClasses += 'px-1 py-0.5 rounded-sm hover:bg-slate-500/5 dark:hover:bg-cyan-500/5 transition-colors duration-155 ';
                  } else {
                    highlightClasses += 'px-1 py-0.5 rounded-sm transition-colors duration-155 text-slate-900 dark:text-white ';
                  }"""

if ns_old in ns_content:
    ns_content = ns_content.replace(ns_old, ns_new)
    print("Fixed NarrativeStream.tsx highlight overwriting.")
else:
    print("Could not find NarrativeStream.tsx highlight overwrite pattern.")

with open(ns_filepath, 'w', encoding='utf-8') as f:
    f.write(ns_content)


# Fix App.tsx
app_filepath = 'src/App.tsx'
with open(app_filepath, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_old = """                          if (isFocused) {
                            highlightClasses = theme === 'light' ? 'bg-cyan-50/20 border-l-2 border-cyan-600' : 'bg-cyan-950/10 border-l-2 border-cyan-500';
                          } else if (hasNotes) {
                            highlightClasses = theme === 'light' ? 'bg-amber-50/15 border-l-2 border-amber-500/50' : 'bg-amber-950/5 border-l-2 border-amber-500/30';
                          }"""

app_new = """                          if (isFocused) {
                            highlightClasses += theme === 'light' ? 'bg-cyan-50/20 border-l-2 border-cyan-600 ' : 'bg-cyan-950/10 border-l-2 border-cyan-500 ';
                          } else if (hasNotes) {
                            highlightClasses += theme === 'light' ? 'bg-amber-50/15 border-l-2 border-amber-500/50 ' : 'bg-amber-950/5 border-l-2 border-amber-500/30 ';
                          }"""

if app_old in app_content:
    app_content = app_content.replace(app_old, app_new)
    print("Fixed App.tsx highlight overwriting.")
else:
    print("Could not find App.tsx highlight overwrite pattern.")

with open(app_filepath, 'w', encoding='utf-8') as f:
    f.write(app_content)
