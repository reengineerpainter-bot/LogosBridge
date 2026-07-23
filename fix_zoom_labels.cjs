const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the negative sign with A-
code = code.replace(
  '<span className="text-lg font-light leading-none mb-0.5">−</span>',
  '<span className="text-sm font-serif font-bold leading-none">A-</span>'
);

// Replace the positive sign with A+
code = code.replace(
  '<span className="text-lg font-light leading-none mb-0.5">+</span>',
  '<span className="text-sm font-serif font-bold leading-none">A+</span>'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Zoom labels updated to A- and A+');
