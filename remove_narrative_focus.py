import re

filepath = 'src/components/NarrativeStream.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "{focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType && ("
# We want to end right before currentlyReadingVerse is checked, which is right after the closing divs.
end_marker = "                  {currentlyReadingVerse === v.verseNumber && ("

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    
    if start_idx != -1 and end_idx > start_idx:
        new_content = content[:start_idx] + content[end_idx:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully removed the massive old focus study block from NarrativeStream (from index {start_idx} to {end_idx}).")
    else:
        print("Could not find valid start/end bounds.")
else:
    print("Could not find start or end marker.")

