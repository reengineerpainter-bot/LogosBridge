const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The main dual/both/plain sizes
content = content.replace(/scriptureFontSizeSetting === 'xs' \? 'text-\[11px\]' : scriptureFontSizeSetting === 'sm' \? 'text-\[13\.5px\]' : scriptureFontSizeSetting === 'base' \? 'text-\[15\.5px\]' : 'text-\[18px\]'/g, 
"scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[16px]' : scriptureFontSizeSetting === 'base' ? 'text-[18px]' : 'text-[20px]'");

// The reference sizes (10, 11, 12, 14)
content = content.replace(/scriptureFontSizeSetting === 'xs' \? 'text-\[10px\]' : scriptureFontSizeSetting === 'sm' \? 'text-\[11px\]' : scriptureFontSizeSetting === 'base' \? 'text-\[12px\]' : 'text-\[14px\]'/g,
"scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'");

// The secondary stream sizes (11, 12, 13, 15)
content = content.replace(/scriptureFontSizeSetting === 'xs' \? 'text-\[11px\]' : scriptureFontSizeSetting === 'sm' \? 'text-\[12px\]' : scriptureFontSizeSetting === 'base' \? 'text-\[13px\]' : 'text-\[15px\]'/g,
"scriptureFontSizeSetting === 'xs' ? 'text-[14px]' : scriptureFontSizeSetting === 'sm' ? 'text-[15px]' : scriptureFontSizeSetting === 'base' ? 'text-[17px]' : 'text-[19px]'");

fs.writeFileSync('src/App.tsx', content);
