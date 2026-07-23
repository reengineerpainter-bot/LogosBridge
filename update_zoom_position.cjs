const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the Zoom control wrapper
const target = "className={`fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50 animate-fade-in-up`}";
const replacement = "className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up`}";

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
console.log('Zoom control repositioned');
