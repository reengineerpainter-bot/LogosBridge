import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to remove the massive block:
# {isFocused ? ( ... ) : hasNotes ? ( ... ) : isSaved ? ( ... ) : null}
# Because regex with dotall can be tricky across 200 lines if we don't anchor it well,
# let's just find the exact string boundaries or use a robust pattern.

# The block starts right after:
#   </div>
# </div>
# {isFocused ? (

start_marker = "{isFocused ? ("
end_marker = ") : null}"

if start_marker in content and end_marker in content:
    # Find the FIRST occurrence of start_marker after line 3500 (in renderVerseCard)
    # Actually, it only appears once in the file for this exact syntax.
    start_idx = content.find(start_marker)
    # Find the FIRST occurrence of end_marker AFTER the start_idx
    end_idx = content.find(end_marker, start_idx) + len(end_marker)
    
    if start_idx != -1 and end_idx > start_idx:
        # Cut it out!
        new_content = content[:start_idx] + content[end_idx:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully removed the massive old focus study block (from index {start_idx} to {end_idx}).")
    else:
        print("Could not find valid start/end bounds.")
else:
    print("Could not find start or end marker.")

