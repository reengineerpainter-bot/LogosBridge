import { Share } from '@capacitor/share';

export interface ShareOptions {
  title?: string;
  text: string;
  dialogTitle?: string;
}

/**
 * Robust cross-platform share helper:
 * 1. Native Android JavascriptInterface (BridgeAndroid.shareText) if running inside LogosBridge Android WebView
 * 2. Capacitor Official Share Plugin (Share.share)
 * 3. Web Share API (navigator.share) for modern desktop/mobile web browsers
 * 4. Clipboard fallback (navigator.clipboard)
 */
export async function triggerNativeShare(options: ShareOptions): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const { title = 'LogosBridge', text, dialogTitle } = options;

  // 1. Native Android Bridge Interface (direct native Intent, works immediately in Android WebView)
  if (typeof window !== 'undefined' && (window as any).BridgeAndroid?.shareText) {
    try {
      (window as any).BridgeAndroid.shareText(title, text);
      return 'shared';
    } catch (err) {
      console.warn('BridgeAndroid.shareText error:', err);
    }
  }

  // 2. Capacitor Official Share Plugin
  try {
    const canShareResult = await Share.canShare().catch(() => ({ value: true }));
    if (canShareResult.value !== false) {
      await Share.share({
        title,
        text,
        dialogTitle: dialogTitle || title || 'Share',
      });
      return 'shared';
    }
  } catch (err: any) {
    if (err?.message?.includes('canceled') || err?.name === 'AbortError') {
      return 'cancelled';
    }
    console.warn('Capacitor Share.share notice:', err);
  }

  // 3. Web Share API (Standard Desktop / Mobile browsers)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelled';
      console.warn('navigator.share notice:', err);
    }
  }

  // 4. Clipboard fallback
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } else if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return 'copied';
    }
  } catch (clipErr) {
    console.warn('Clipboard copy error:', clipErr);
  }

  return 'failed';
}
