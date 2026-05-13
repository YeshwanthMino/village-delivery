/**
 * Platform detection and information service interface
 * Abstracts React Native Platform detection for cross-platform compatibility
 */
export interface IPlatformService {
  /**
   * Check if the current platform is web
   * @returns true if running on web platform
   */
  isWeb(): boolean;

  /**
   * Check if the current platform is mobile (iOS or Android)
   * @returns true if running on mobile platform
   */
  isMobile(): boolean;

  /**
   * Check if the current platform is iOS
   * @returns true if running on iOS
   */
  isIOS(): boolean;

  /**
   * Check if the current platform is Android
   * @returns true if running on Android
   */
  isAndroid(): boolean;

  /**
   * Get the current platform name
   * @returns Platform name: 'web', 'ios', 'android'
   */
  getPlatform(): 'web' | 'ios' | 'android';

  /**
   * Get the platform version (if available)
   * @returns Platform version string or undefined
   */
  getVersion(): string | undefined;
}
