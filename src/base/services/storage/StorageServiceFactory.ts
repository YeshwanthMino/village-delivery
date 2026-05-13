import { IS_WEB } from '@/src/core/utils/platform';
import { IStorageService } from './interfaces/IStorageService';
import { WebStorageService } from './web/WebStorageService';

/**
 * Factory for creating storage service instances
 * Uses platform detection to return appropriate implementation
 *
 * NOTE: MobileStorageService is imported conditionally to prevent React Native
 * from being bundled in web builds
 */
export class StorageServiceFactory {
  private static instance: IStorageService | null = null;
  private static initPromise: Promise<IStorageService> | null = null;

  /**
   * Create and return storage service instance
   * Uses singleton pattern to ensure consistent storage access
   */
  static create(): IStorageService {
    if (StorageServiceFactory.instance) {
      return StorageServiceFactory.instance;
    }

    if (IS_WEB) {
      // Web platform - use localStorage (synchronous initialization)
      StorageServiceFactory.instance = new WebStorageService();
      return StorageServiceFactory.instance;
    } else {
      // Mobile platform - throw error, use createAsync() instead
      throw new Error(
        'Mobile storage requires async initialization. Use StorageServiceFactory.createAsync() for mobile platform.'
      );
    }
  }

  /**
   * Create and return storage service instance (async for mobile)
   * Uses singleton pattern to ensure consistent storage access
   * Required for mobile to avoid bundling React Native in web builds
   */
  static async createAsync(): Promise<IStorageService> {
    if (StorageServiceFactory.instance) {
      return StorageServiceFactory.instance;
    }

    // If already initializing, wait for that promise
    if (StorageServiceFactory.initPromise) {
      return StorageServiceFactory.initPromise;
    }

    if (IS_WEB) {
      // Web platform - use localStorage
      StorageServiceFactory.instance = new WebStorageService();
      return StorageServiceFactory.instance;
    } else {
      // Mobile platform - lazy load to avoid bundling in web
      StorageServiceFactory.initPromise = (async () => {
        const { MobileStorageService } = await import('./mobile/MobileStorageService.native');
        StorageServiceFactory.instance = new MobileStorageService();
        StorageServiceFactory.initPromise = null;
        return StorageServiceFactory.instance;
      })();

      return StorageServiceFactory.initPromise;
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    StorageServiceFactory.instance = null;
    StorageServiceFactory.initPromise = null;
  }
}
