/**
 * Web Environment Configuration
 * Uses Vite's import.meta.env for VITE_* variables
 *
 * IMPORTANT: In Vite, environment variables must be accessed directly,
 * not through dynamic keys. Vite replaces these at build time.
 *
 * @platform web
 */

/**
 * Application Environment Configuration (Web)
 *
 * Automatically loads VITE_* environment variables from .env files
 * Variables are inlined at build time by Vite
 *
 * Usage:
 *   import { env } from '@/src/core/config/env';
 *   console.log(env.apiBaseUrl);
 */
const _importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

export const env = {
  // Environment flags
  isProduction: (_importMetaEnv?.VITE_APP_ENV || process.env.VITE_APP_ENV || process.env.EXPO_PUBLIC_APP_ENV) === 'production',
  isStaging: (_importMetaEnv?.VITE_APP_ENV || process.env.VITE_APP_ENV || process.env.EXPO_PUBLIC_APP_ENV) === 'staging',

  // API Configuration
  apiBaseUrl: (_importMetaEnv?.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '') as string,
};
