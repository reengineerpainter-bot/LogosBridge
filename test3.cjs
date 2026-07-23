const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const startMarker = '{chapterData.verses.map((v) => {';
const startIdx = content.indexOf(startMarker);
let openBrackets = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') openBrackets++;
    else if (content[i] === '}') {
        openBrackets--;
        if (openBrackets === 0) {
            endIdx = i + 1;
            break;
        }
    }
}
const originalMapBlock = content.substring(startIdx, endIdx);
console.log("Before length:", content.length);
content = content.replace(originalMapBlock, 'HELLO_WORLD_123');
console.log("After length:", content.length);
console.log(content.includes('HELLO_WORLD_123'));
