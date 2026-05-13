import { IPlatformService } from './interfaces/IPlatformService';
import { WebPlatformService } from './web/WebPlatformService';

/**
 * Factory for creating platform service instances
 * Determines platform at runtime and returns appropriate implementation
 *
 * NOTE: MobilePlatformService is not imported to prevent React Native
 * from being bundled in web builds
 */
export class PlatformServiceFactory {
  private static instance: IPlatformService | null = null;

  /**
   * Create and return platform service instance (synchronous - web only)
   * Uses singleton pattern to ensure consistent platform detection
   */
  static create(): IPlatformService {
    if (PlatformServiceFactory.instance) {
      return PlatformServiceFactory.instance;
    }

    // Detect platform at runtime
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // We're in a browser environment (web)
      PlatformServiceFactory.instance = new WebPlatformService();
      return PlatformServiceFactory.instance;
    } else {
      // We're in a React Native environment (mobile) - use createAsync() instead
      throw new Error('Mobile platform service requires async initialization. Use PlatformServiceFactory.createAsync() for mobile platform.');
    }
  }

  /**
   * Create and return platform service instance (async for mobile)
   * Uses singleton pattern to ensure consistent platform detection
   */
  static async createAsync(): Promise<IPlatformService> {
    if (PlatformServiceFactory.instance) {
      return PlatformServiceFactory.instance;
    }

    // Detect platform at runtime
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // We're in a browser environment (web)
      PlatformServiceFactory.instance = new WebPlatformService();
      return PlatformServiceFactory.instance;
    } else {
      // We're in a React Native environment (mobile) - lazy load to avoid bundling
      const { MobilePlatformService } = await import('./mobile/MobilePlatformService.native');
      PlatformServiceFactory.instance = new MobilePlatformService();
      return PlatformServiceFactory.instance;
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    PlatformServiceFactory.instance = null;
  }
}
