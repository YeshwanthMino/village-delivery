import { Platform } from 'react-native';
import { IPlatformService } from '../interfaces/IPlatformService';

/**
 * Mobile implementation of platform service
 * Uses React Native Platform API
 */
export class MobilePlatformService implements IPlatformService {
  isWeb(): boolean {
    return Platform.OS === 'web';
  }

  isMobile(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  isIOS(): boolean {
    return Platform.OS === 'ios';
  }

  isAndroid(): boolean {
    return Platform.OS === 'android';
  }

  getPlatform(): 'web' | 'ios' | 'android' {
    switch (Platform.OS) {
      case 'ios':
        return 'ios';
      case 'android':
        return 'android';
      case 'web':
        return 'web';
      default:
        return 'web'; // Fallback to web for unknown platforms
    }
  }

  getVersion(): string | undefined {
    try {
      return Platform.Version ? Platform.Version.toString() : undefined;
    } catch (error) {
      console.warn('[MobilePlatformService] Could not determine platform version:', error);
      return undefined;
    }
  }
}
