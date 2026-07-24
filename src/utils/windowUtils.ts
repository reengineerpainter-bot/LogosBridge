export async function openProjectorStandalone(liveState: any = null): Promise<Window | null> {
  const url = window.location.origin + window.location.pathname + '?projector=true';
  let left = 0;
  let top = 0;
  let width = 1280;
  let height = 720;
  let isMultiScreen = false;

  try {
    // Check if the modern Window Management API is supported
    if ('getScreenDetails' in window) {
      // @ts-ignore - getScreenDetails is a modern API
      const screenDetails = await window.getScreenDetails();
      // Look for an external screen. In some environments it might be called 'isInternal'
      const externalScreen = screenDetails.screens.find((s: any) => !s.isInternal) || screenDetails.screens[1];
      
      if (externalScreen) {
        left = externalScreen.left;
        top = externalScreen.top;
        width = externalScreen.width;
        height = externalScreen.height;
        isMultiScreen = true;
      }
    }
  } catch (error) {
    console.warn('Window Management API error or permission denied:', error);
    // Fallback to default primary screen behavior handled below
  }

  // Construct features string to force a popup without browser chrome
  let features = `popup=yes,menubar=no,toolbar=no,location=no,status=no,width=${width},height=${height},left=${left},top=${top}`;
  
  

  // Open the window
  const win = window.open(url, '_blank', features);
  
  // Track and send initial state if provided
  
  if (win) {
    if (isMultiScreen) {
      setTimeout(() => {
        try {
          win.moveTo(left, top);
          win.resizeTo(width, height);
          win.focus();
        } catch (e) {
          console.warn('Could not move/resize window', e);
        }
      }, 500);
    }

    if (!(window as any).__OPENED_PROJECTOR_WINDOWS__) {
      (window as any).__OPENED_PROJECTOR_WINDOWS__ = [];
    }
    (window as any).__OPENED_PROJECTOR_WINDOWS__.push(win);
    
    if (liveState) {
      setTimeout(() => {
        if (!win.closed) {
          win.postMessage({ type: 'STATE_UPDATE', state: liveState }, '*');
        }
      }, 600);
    }
  } else {
    console.warn("Popup blocked by the browser.");
  }

  return win;
}
