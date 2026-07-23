const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const scrollLogicOriginal = `      if (scrollY <= 20) {
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
      } else if (Math.abs(scrollY - lastScrollY) >= 10) {
        // Only trigger header visibility transitions on significant scroll
        if (scrollY > lastScrollY) {
          // Scrolling down -> hide headers
          setIsHeaderHidden(true);
        } else {
          // Scrolling up -> slide headers back to view
          setIsHeaderHidden(false);
        }
      }`;

const scrollLogicNew = `      if (scrollY <= 20) {
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
      } else if (Math.abs(scrollY - lastScrollY) >= 5) {
        setIsHeaderHidden(true);
      }
      
      // Clear previous timeout and set a new one to show the header when scrolling stops
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        setIsHeaderHidden(false);
      }, 500); // 500ms after scrolling stops
`;

content = content.replace(scrollLogicOriginal, scrollLogicNew);
fs.writeFileSync('src/App.tsx', content);
console.log('Scroll logic updated.');
