import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# We need to find the start of:
#                      {chapterData.verses.map((v) => {
#                      const isFocused = focusedVerse?.verseNumber === v.verseNumber;
# And its closing bracket.

start_idx = content.find('{chapterData.verses.map((v) => {')
if start_idx == -1:
    print("Could not find the map block.")
    exit(1)

# Now find the matching closing bracket
open_brackets = 0
end_idx = -1
for i in range(start_idx, len(content)):
    if content[i] == '{':
        open_brackets += 1
    elif content[i] == '}':
        open_brackets -= 1
        if open_brackets == 0:
            end_idx = i + 1
            break

if end_idx == -1:
    print("Could not find end of map block.")
    exit(1)

original_map_block = content[start_idx:end_idx]

# We will extract the inner part of the map function into a helper.
# Actually, the easiest way to avoid dealing with state is to just 
# keep the map block, but restructure how we loop.

# The current structure:
# <div className="flex flex-col space-y-1 py-1">
#   {chapterData.verses.map((v) => {
#       ...
#   })}
# </div>

# We will replace it with a call to a function `renderListLayout()`
# And define `renderListLayout()` right above it.

print("Found block, length:", len(original_map_block))
