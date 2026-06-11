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
// NOTE: this Expo app bundles web with Metro, not Vite. A bare `import.meta`
// literal cannot be parsed in Metro's web output ("Cannot use 'import.meta'
// outside a module"), which throws at load and blanks the whole app. Expo
// injects EXPO_PUBLIC_* into process.env on web, so we read from there and
// keep the (unused under Expo) VITE_* fallbacks pointing at process.env only.
const _importMetaEnv: any = undefined;

export const env = {
  // Environment flags
  isProduction: (_importMetaEnv?.VITE_APP_ENV || process.env.VITE_APP_ENV || process.env.EXPO_PUBLIC_APP_ENV) === 'production',
  isStaging: (_importMetaEnv?.VITE_APP_ENV || process.env.VITE_APP_ENV || process.env.EXPO_PUBLIC_APP_ENV) === 'staging',

  // API Configuration
  apiBaseUrl: (_importMetaEnv?.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '') as string,

  // Village location/address API (separate backend)
  villageApiBaseUrl: (_importMetaEnv?.VITE_VILLAGE_API_BASE_URL || process.env.VITE_VILLAGE_API_BASE_URL || process.env.EXPO_PUBLIC_VILLAGE_API_BASE_URL || '') as string,
};
