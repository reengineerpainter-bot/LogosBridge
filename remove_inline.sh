sed -i '3685,3717d' src/App.tsx
sed -i '3685s/) : activeDraftVerse === v.verseNumber ? (/) : hasNotes ? (/g' src/App.tsx
