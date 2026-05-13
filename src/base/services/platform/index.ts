// Platform service exports
export type { IPlatformService } from './interfaces/IPlatformService';
export { PlatformServiceFactory } from './PlatformServiceFactory';

// Platform-specific implementations should not be exported
// They are dynamically imported by the factory based on platform
