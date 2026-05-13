/**
 * Mobile Environment Configuration
 * Uses Expo's process.env for EXPO_PUBLIC_* variables
 *
 * IMPORTANT: In Expo, environment variables must be accessed directly,
 * not through dynamic keys. Metro bundler replaces these at build time.
 *
 * @platform mobile
 */

/**
 * Application Environment Configuration (Mobile)
 *
 * Automatically loads EXPO_PUBLIC_* environment variables from .env files
 * Variables are inlined at build time by Metro bundler
 *
 * Usage:
 *   import { env } from '@/src/core/config/env';
 *   console.log(env.apiBaseUrl);
 */
export const env = {
  // Environment flags
  isProduction: process.env.EXPO_PUBLIC_APP_ENV === 'production',
  isStaging: process.env.EXPO_PUBLIC_APP_ENV === 'staging',

  // API Configuration
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
};

// Debug log for mobile (only in development)
if (__DEV__) {
  console.log('Mobile Env Config Loaded:', {
    apiBaseUrl: env.apiBaseUrl,
    isStaging: env.isStaging,
    isProduction: env.isProduction,
  });
}
