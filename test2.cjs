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
console.log(content.indexOf(originalMapBlock));
