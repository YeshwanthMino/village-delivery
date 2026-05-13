// Storage service exports
export type { IStorageService } from './interfaces/IStorageService';
export { StorageServiceFactory } from './StorageServiceFactory';

// Platform-specific implementations should not be exported
// They are dynamically imported by the factory based on platform
