/**
 * Multi-Screen Window Management & External Projector Output Utility
 */

let projectorWindow: Window | null = null;

export interface ScreenDetailsInfo {
  isSupported: boolean;
  screensCount: number;
}

/**
 * Check if the browser supports Multi-Screen Window Placement API
 */
export async function getMultiScreenDetails(): Promise<ScreenDetailsInfo> {
  if (typeof window !== 'undefined' && 'getScreenDetails' in window) {
    try {
      const screenDetails = await (window as any).getScreenDetails();
      return {
        isSupported: true,
        screensCount: screenDetails.screens ? screenDetails.screens.length : 1
      };
    } catch {
      return { isSupported: true, screensCount: 1 };
    }
  }
  return { isSupported: false, screensCount: 1 };
}

/**
 * Detect if device is a true mobile platform (Native Android Capacitor / Bridge or mobile phone OS)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // 1. Native Android bridge or Capacitor native platform
  if ((window as any).BridgeAndroid || (window as any).Capacitor?.isNativePlatform?.()) {
    return true;
  }
  const ua = navigator.userAgent || '';
  // 2. Strict mobile operating system check (Android, iPhone, iPad, iPod, Windows Phone)
  return /Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(ua);
}

export interface ExternalDisplayCheckResult {
  supported: boolean;
  connected: boolean;
  type: 'presentation' | 'android-bridge' | 'multiscreen' | 'none';
}

/**
 * Check if the device has an external screen connected or supports casting / Smart View
 */
export async function checkExternalDisplaySupport(): Promise<ExternalDisplayCheckResult> {
  // 1. Check Android Native Bridge (Samsung Smart View / DisplayManager)
  if (typeof window !== 'undefined' && (window as any).BridgeAndroid?.hasExternalDisplay) {
    try {
      const hasExt = (window as any).BridgeAndroid.hasExternalDisplay();
      return { supported: true, connected: Boolean(hasExt), type: 'android-bridge' };
    } catch {}
  }

  // 2. Check W3C Presentation API (Wireless Display / Cast / Smart View)
  if (typeof window !== 'undefined' && 'PresentationRequest' in window) {
    try {
      const request = new (window as any).PresentationRequest(['about:blank']);
      const availability = await request.getAvailability().catch(() => null);
      if (availability) {
        return {
          supported: true,
          connected: Boolean(availability.value),
          type: 'presentation'
        };
      }
      return { supported: true, connected: false, type: 'presentation' };
    } catch {}
  }

  // 3. Check Multi-Screen Window Placement API (Desktop monitors)
  if (typeof window !== 'undefined' && 'getScreenDetails' in window) {
    try {
      const details = await (window as any).getScreenDetails();
      const count = details.screens ? details.screens.length : 1;
      return {
        supported: true,
        connected: count > 1,
        type: 'multiscreen'
      };
    } catch {}
  }

  return { supported: false, connected: false, type: 'none' };
}

/**
 * Open external projector window in borderless / fullscreen mode (Desktop only)
 */
export async function openProjectorWindow(title: string = 'LogosBridge Live Broadcast'): Promise<Window | null> {
  // CRITICAL SAFETY GUARD: Mobile environments do not support separate window popups
  if (isMobileDevice()) {
    console.warn('[WindowManager] External projector popup is disabled on mobile view.');
    return null;
  }

  if (projectorWindow && !projectorWindow.closed) {
    projectorWindow.focus();
    return projectorWindow;
  }

  let left = 0;
  let top = 0;
  let width = 1920;
  let height = 1080;

  // Attempt Multi-Screen placement on secondary monitor if available
  if (typeof window !== 'undefined' && 'getScreenDetails' in window) {
    try {
      const screenDetails = await (window as any).getScreenDetails();
      if (screenDetails.screens && screenDetails.screens.length > 1) {
        // Find secondary external monitor
        const secondary = screenDetails.screens.find((s: any) => s !== screenDetails.currentScreen) || screenDetails.screens[1];
        if (secondary) {
          left = secondary.left;
          top = secondary.top;
          width = secondary.width;
          height = secondary.height;
        }
      }
    } catch (e: any) {
      console.warn('[WindowManager] Screen details permission note:', e.message);
    }
  } else if (typeof window !== 'undefined' && (window.screen as any)?.isExtended) {
    // Chrome/Edge screen.isExtended fallback for multi-monitor desktop placement
    const extScreen = window.screen as any;
    left = (extScreen.availLeft || 0) + (extScreen.availWidth || 1920);
    top = extScreen.availTop || 0;
  }

  const windowFeatures = `left=${left},top=${top},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`;
  const win = window.open('', 'LogosBridgeProjector', windowFeatures);

  // Absolute safety check: If window.open failed or returned current window, ABORT immediately to prevent overwriting host DOM
  if (!win || win === window) {
    console.warn('[WindowManager] window.open failed or returned host window; aborting to preserve application DOM.');
    return null;
  }

  projectorWindow = win;
  win.document.title = title;
  win.document.body.style.margin = '0';
  win.document.body.style.padding = '0';
  win.document.body.style.backgroundColor = '#000000';
  win.document.body.style.overflow = 'hidden';
  win.document.body.style.display = 'flex';
  win.document.body.style.alignItems = 'center';
  win.document.body.style.justifyContent = 'center';
  win.document.body.style.height = '100vh';
  win.document.body.style.width = '100vw';

  // Create clean container for live feed with true 1080p canvas
  win.document.body.innerHTML = `
    <div id="projector-root" style="position: fixed; inset: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000000; overflow: hidden; user-select: none;">
      <canvas id="projector-canvas" width="1920" height="1080" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;"></canvas>
    </div>
  `;

  // Direct JS event listeners (clicking anywhere or pressing F11 toggles Fullscreen cleanly)
  const toggleFullscreen = () => {
    try {
      if (!win.document.fullscreenElement) {
        win.document.documentElement.requestFullscreen().catch(() => {});
      } else {
        win.document.exitFullscreen().catch(() => {});
      }
    } catch (fsErr) {
      console.warn('[WindowManager] Fullscreen toggle:', fsErr);
    }
  };

  const canvasElem = win.document.getElementById('projector-canvas');
  if (canvasElem) {
    canvasElem.addEventListener('click', toggleFullscreen);
  }

  win.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      win.close();
    } else if (e.key === 'F11' || e.key === 'f' || e.key === 'F' || e.key === 'Enter') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  return win;
}

/**
 * Close projector window
 */
export function closeProjectorWindow(): void {
  if (projectorWindow && !projectorWindow.closed) {
    projectorWindow.close();
    projectorWindow = null;
  }
}

/**
 * Check if projector window is currently open
 */
export function isProjectorOpen(): boolean {
  return !!(projectorWindow && !projectorWindow.closed);
}

/**
 * Get projector canvas context if open
 */
export function getProjectorCanvas(): HTMLCanvasElement | null {
  if (projectorWindow && !projectorWindow.closed) {
    return projectorWindow.document.getElementById('projector-canvas') as HTMLCanvasElement | null;
  }
  return null;
}
