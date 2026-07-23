const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const headerStart = content.indexOf('<motion.header');
const headerEnd = content.indexOf('</motion.header>') + '</motion.header>'.length;

if (headerStart !== -1 && headerEnd !== -1) {
  fs.writeFileSync('topbar.txt', content.substring(headerStart, headerEnd));
  console.log('Extracted topbar to topbar.txt');
} else {
  console.log('Could not find header');
}
