const fs = require('fs');
let code = fs.readFileSync('src/components/NarrativeStream.tsx', 'utf8');

const regex = /{focusedInChunk && \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>\s*\)}/;
const match = code.match(regex);
if (match) {
  let tooltipCode = match[0];
  
  // Change the tooltip classes to be absolute and floating above
  tooltipCode = tooltipCode.replace(
    /className="flex flex-col animate-fade-in-up"/, 
    'className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-max"'
  );
  tooltipCode = tooltipCode.replace(
    /className="mt-1\.5 flex items-center justify-center overflow-x-auto hide-scrollbar"/,
    'className="flex items-center overflow-x-auto hide-scrollbar shadow-lg rounded-full backdrop-blur-md"'
  );
  
  // Change focusedInChunk to check if the current verse is focused
  tooltipCode = tooltipCode.replace(/focusedInChunk/g, 'v');
  tooltipCode = tooltipCode.replace(/{v && \(/, '{focusedVerse?.verseNumber === v.verseNumber && focusedStreamType === streamType && (');

  // Remove the old tooltip block
  code = code.replace(match[0], '');
  
  // Insert the new tooltip block inside the span
  code = code.replace(
    /<\/span>\s*<\/span>\s*\);\s*}\)}/g, 
    `</span>\n${tooltipCode}\n                    </span>\n                  );\n                })}`
  );
  
  fs.writeFileSync('src/components/NarrativeStream.tsx', code);
  console.log('Tooltip updated successfully in NarrativeStream.tsx');
} else {
  console.error('Could not find focusedInChunk block');
}
