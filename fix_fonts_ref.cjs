const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/scriptureFontSizeSetting === 'xs' \? 'text-\[13px\]' : scriptureFontSizeSetting === 'sm' \? 'text-\[14px\]' : scriptureFontSizeSetting === 'base' \? 'text-\[16px\]' : 'text-\[18px\]'/g, 
"scriptureFontSizeSetting === 'xs' ? 'text-[11.5px]' : scriptureFontSizeSetting === 'sm' ? 'text-[12.5px]' : scriptureFontSizeSetting === 'base' ? 'text-[14.5px]' : 'text-[16px]'");
fs.writeFileSync('src/App.tsx', content);
