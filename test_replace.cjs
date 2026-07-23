const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const originalMapBlock = fs.readFileSync('originalMapBlock.txt', 'utf8');
console.log("Length of originalMapBlock:", originalMapBlock.length);
console.log("Length of content:", content.length);
console.log("Index of originalMapBlock in content:", content.indexOf(originalMapBlock));
