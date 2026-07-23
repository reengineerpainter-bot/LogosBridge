const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The list mode map starts at:
// {chapterData.verses.map((v) => {
// and goes all the way down.

// This is complex to regex. I'll use a better approach:
// Find the exact block we want to replace and swap it.
