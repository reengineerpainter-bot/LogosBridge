const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Change default typeface to 'sans'
content = content.replace(
  /const \[scriptureTypefaceSetting, setScriptureTypefaceSetting\] = useState<'serif' \| 'sans' \| 'mono'>\('serif'\);/,
  "const [scriptureTypefaceSetting, setScriptureTypefaceSetting] = useState<'serif' | 'sans' | 'mono'>('sans');"
);

// Increase the sizes slightly for the reference text since 11.5px is indeed quite painful to look at on mobile
content = content.replace(
  /scriptureFontSizeSetting === 'xs' \? 'text-\[11.5px\]' : scriptureFontSizeSetting === 'sm' \? 'text-\[12.5px\]' : scriptureFontSizeSetting === 'base' \? 'text-\[14.5px\]' : 'text-\[16px\]'/g,
  "scriptureFontSizeSetting === 'xs' ? 'text-[13px]' : scriptureFontSizeSetting === 'sm' ? 'text-[14px]' : scriptureFontSizeSetting === 'base' ? 'text-[16px]' : 'text-[18px]'"
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fonts and sizes patched');
