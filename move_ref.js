const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const refManuscriptsRegex = /\n                          \{\/\* BOTH STREAMS SIDE-BY-SIDE DUAL COLUMN SYSTEM: REF MANUSCRIPTS \*\/\}[\s\S]*?playWebAudioBeep\(640, 'sine', 0\.08\);\n                                \}\}\n                              \/>\n                            <\/div>\n                          \)\}/;

const refMatch = content.match(refManuscriptsRegex);

if (refMatch) {
  let newContent = content.replace(refMatch[0], '');
  
  // Find where to insert it (before BOTH STREAMS SIDE-BY-SIDE DUAL COLUMN SYSTEM)
  const bothStreamsStartRegex = /                          \{\/\* BOTH STREAMS SIDE-BY-SIDE DUAL COLUMN SYSTEM \*\/\}/;
  
  // We need to adjust the classes of the REF MANUSCRIPTS div
  // Currently: mt-8 pt-8 border-t
  // Need to change to: mb-8 pb-8 border-b
  let refStr = refMatch[0];
  refStr = refStr.replace('mt-8 pt-8 border-t', 'mb-8 pb-8 border-b');
  
  newContent = newContent.replace(bothStreamsStartRegex, refStr.substring(1) + '\n\n                          {/* BOTH STREAMS SIDE-BY-SIDE DUAL COLUMN SYSTEM */}');
  
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Moved successfully!');
} else {
  console.log('Could not find ref manuscripts regex.');
}
