const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startIdx = content.indexOf('{chapterData.verses.map((v) => {');
if (startIdx === -1) {
    console.log("Could not find map block");
    process.exit(1);
}

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
console.log("Found map block length:", originalMapBlock.length);
