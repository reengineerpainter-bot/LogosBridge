const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const chapterDropdownStart = content.indexOf('id="chapter-dropdown-btn"');
console.log(content.substring(chapterDropdownStart - 200, chapterDropdownStart + 2500));
