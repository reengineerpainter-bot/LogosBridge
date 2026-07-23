const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldScrollEffect = `  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let scrollTimeout: any = null;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Always show all navigation and controls at the very top of the page
      if (scrollY <= 20) {
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


      // Keep lastScrollY updated correctly
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      // Whenever actively scrolling (up or down), hide the side slide panels
      setIsSidePanelHidden(true);

      // Clear previous inactivity timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }

      // Re-enable/slide side panels immediately on stopping scrolling (150ms inactivity)
      scrollTimeout = setTimeout(() => {
        setIsSidePanelHidden(false);
      }, 150);
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);`;

const newScrollEffect = `  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let headerTimeout: any = null;
    let sidePanelTimeout: any = null;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Always show all navigation and controls at the very top of the page
      if (scrollY <= 20) {
        setIsHeaderHidden(false);
        setIsSidePanelHidden(false);
      } else if (Math.abs(scrollY - lastScrollY) >= 5) {
        setIsHeaderHidden(true);
      }

      // Keep lastScrollY updated correctly
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      // Whenever actively scrolling (up or down), hide the side slide panels
      setIsSidePanelHidden(true);
      
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }

      // Re-enable/slide headers immediately on stopping scrolling (500ms inactivity)
      if (headerTimeout) clearTimeout(headerTimeout);
      headerTimeout = setTimeout(() => {
        setIsHeaderHidden(false);
      }, 400);

      // Re-enable/slide side panels immediately on stopping scrolling (150ms inactivity)
      if (sidePanelTimeout) clearTimeout(sidePanelTimeout);
      sidePanelTimeout = setTimeout(() => {
        setIsSidePanelHidden(false);
      }, 150);
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (headerTimeout) clearTimeout(headerTimeout);
      if (sidePanelTimeout) clearTimeout(sidePanelTimeout);
    };
  }, []);`;

content = content.replace(oldScrollEffect, newScrollEffect);
fs.writeFileSync('src/App.tsx', content);
console.log('Scroll timeouts fixed.');
