const effect = `
  // Smooth scroll to active verse during playback
  useEffect(() => {
    if (currentlyReadingVerse !== null && isPlayingAudio) {
      let elId = '';
      if (activeAudioStream && ['plain', 'pers', 'kjv', 'bsb'].includes(activeAudioStream)) {
        if (layoutMode === 'paragraph') {
          elId = \`narrative-verse-\${activeAudioStream}-\${currentlyReadingVerse}\`;
        } else {
          elId = \`verse-row-\${currentlyReadingVerse}\`;
        }
      } else {
        elId = \`verse-row-\${currentlyReadingVerse}\`;
      }
      
      // Fallbacks in case the specific element isn't found
      const el = document.getElementById(elId) || 
                 document.getElementById(\`narrative-verse-plain-\${currentlyReadingVerse}\`) || 
                 document.getElementById(\`verse-row-\${currentlyReadingVerse}\`);
      
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentlyReadingVerse, isPlayingAudio, activeAudioStream, layoutMode]);
`;
console.log(effect);
