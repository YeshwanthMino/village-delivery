/**
 * Type definitions for platform utility module
 */

/**
 * Detect if running in web browser environment
 */
export const IS_WEB: boolean;

/**
 * Detect if running in development mode
 */
export const IS_DEV: boolean;

/**
 * Detect if running in mobile environment (React Native)
 */
export const IS_MOBILE: boolean;

/**
 * Get platform name as string
 * @returns 'web' or 'mobile'
 */
export function getPlatform(): 'web' | 'mobile';

/**
 * Execute function only in development environment
 * @param fn - Function to execute in dev mode
 */
export function runInDev(fn: () => void): void;

/**
 * Execute function only in production environment
 * @param fn - Function to execute in production mode
 */
export function runInProduction(fn: () => void): void;

/**
 * Execute function only in web environment
 * @param fn - Function to execute in web
 */
export function runInWeb(fn: () => void): void;

/**
 * Execute function only in mobile environment
 * @param fn - Function to execute in mobile
 */
export function runInMobile(fn: () => void): void;
