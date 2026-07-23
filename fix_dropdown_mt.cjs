const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Book dropdown:
content = content.replace(
  /className=\{\`absolute left-0 top-full mt-1.5 w-80 md:w-\[540px\] /g,
  "className={`absolute left-0 top-full mt-2.5 md:mt-3.5 w-80 md:w-[540px] "
);

// Chapter dropdown:
content = content.replace(
  /className=\{\`absolute left-0 mt-1.5 top-full w-64 md:w-80 /g,
  "className={`absolute left-0 top-full mt-2.5 md:mt-3.5 w-64 md:w-80 "
);

fs.writeFileSync('src/App.tsx', content);
console.log('Dropdown alignment fixed.');
