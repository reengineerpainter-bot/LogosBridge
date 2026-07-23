const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const bookDropdownBtn = content.indexOf('id="book-select-dropdown-btn"');
const bookDropdownEnd = content.indexOf('id="chapter-dropdown-btn"');

fs.writeFileSync('book_dropdown_block.txt', content.substring(bookDropdownBtn, bookDropdownEnd));

const chapterDropdownBtn = content.indexOf('id="chapter-dropdown-btn"');
const chapterDropdownEnd = content.indexOf('id="projection-studio-trigger-btn"');

fs.writeFileSync('chapter_dropdown_block.txt', content.substring(chapterDropdownBtn, chapterDropdownEnd));
console.log('Done');
