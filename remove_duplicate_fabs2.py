import re

filepath = 'src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old redundant FABs
start_marker_1 = "{/* FLOAT POP TRIGGERS WHEN HEADER COLLAPSED */}"
end_marker_1 = "{/* FLOATING PILL BOTTOM NAVIGATION BAR */}"

if start_marker_1 in content and end_marker_1 in content:
    start_idx = content.find(start_marker_1)
    end_idx = content.find(end_marker_1, start_idx)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]
        print("Removed redundant top-left and bottom-left FAB blocks.")
    else:
        print("Indexes not valid.")
else:
    print("Markers not found.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
