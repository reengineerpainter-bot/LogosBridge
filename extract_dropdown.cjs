const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const bookDropdownStart = content.indexOf('id="book-select-dropdown-btn"');
console.log(content.substring(bookDropdownStart + 1000, bookDropdownStart + 4000));
