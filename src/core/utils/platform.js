/**
 * Platform Detection Utility (Pure JavaScript - No React Native)
 * Safe for use in web, mobile, ViewModels, Redux, and all layers
 *
 * @module platform
 */

/**
 * Detect if running in web browser environment
 * @type {boolean}
 */
export const IS_WEB = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Detect if running in development mode
 * Uses Node.js environment variable (works in both web and mobile)
 * @type {boolean}
 */
export const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Detect if running in mobile environment (React Native)
 * @type {boolean}
 */
export const IS_MOBILE = !IS_WEB;

/**
 * Get platform name as string
 * @returns {'web' | 'mobile'}
 */
export const getPlatform = () => {
  return IS_WEB ? 'web' : 'mobile';
};

/**
 * Execute function only in development environment
 * @param {Function} fn - Function to execute in dev mode
 */
export const runInDev = (fn) => {
  if (IS_DEV) {
    fn();
  }
};

/**
 * Execute function only in production environment
 * @param {Function} fn - Function to execute in production mode
 */
export const runInProduction = (fn) => {
  if (!IS_DEV) {
    fn();
  }
};

/**
 * Execute function only in web environment
 * @param {Function} fn - Function to execute in web
 */
export const runInWeb = (fn) => {
  if (IS_WEB) {
    fn();
  }
};

/**
 * Execute function only in mobile environment
 * @param {Function} fn - Function to execute in mobile
 */
export const runInMobile = (fn) => {
  if (IS_MOBILE) {
    fn();
  }
};
