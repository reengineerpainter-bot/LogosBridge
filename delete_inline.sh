sed -i '3684,3718d' src/App.tsx
sed -i 's/} else if (activeDraftVerse === v.verseNumber) {/} else {/g' src/App.tsx
