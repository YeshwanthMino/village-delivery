import { IPlatformService } from '../interfaces/IPlatformService';

/**
 * Web implementation of platform service
 * Uses browser APIs and user agent detection
 */
export class WebPlatformService implements IPlatformService {
  isWeb(): boolean {
    return true;
  }

  isMobile(): boolean {
    return false;
  }

  isIOS(): boolean {
    // Check if running on iOS device in browser
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  isAndroid(): boolean {
    // Check if running on Android device in browser
    return /Android/.test(navigator.userAgent);
  }

  getPlatform(): 'web' | 'ios' | 'android' {
    return 'web';
  }

  getVersion(): string | undefined {
    // Return browser version or undefined
    try {
      const userAgent = navigator.userAgent;
      const versionMatch = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+(?:\.\d+)*)/);
      return versionMatch ? versionMatch[1] : undefined;
    } catch (error) {
      console.warn('[WebPlatformService] Could not determine browser version:', error);
      return undefined;
    }
  }
}
