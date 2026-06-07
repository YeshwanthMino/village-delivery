import { env } from '@/src/core/config/env';

// Environment configuration
export enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export const ENV = env.isProduction ? Environment.PRODUCTION : Environment.STAGING;

// Web Service URLs
export const WebService = {
  baseURL: env.apiBaseUrl,
  villageService: `${env.apiBaseUrl}/`,
  villageBaseURL: env.villageApiBaseUrl,
};

// App configuration
export const AppConfig = {
  name: 'Village',
  version: '1.0.0', // This should come from package.json in production
  bundleId: 'com.village.delivery',

  // API configuration
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay

  // Cache configuration
  cacheTime: 10 * 60 * 1000, // 10 minutes
  staleTime: 5 * 60 * 1000, // 5 minutes

  // OTP configuration
  otpLength: 6,
  otpResendTimer: 30, // seconds
  otpValidityDuration: 5 * 60, // 5 minutes

  // Deep linking
  urlScheme: 'villagedelivery',

  // Feature flags
  features: {
    enableAnalytics: true,
    enableCrashReporting: true,
    enablePushNotifications: false,
    enableBiometric: false,
    enableDarkMode: false,
  }
};

// Storage keys
export const StorageKeys = {
  // Authentication
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_TYPE: 'token_type',
  USERNAME: 'username',
  USER_ID: 'user_id',

  // User data
  USER_PREFERENCES: 'userPreferences',

  // App state
  IS_FIRST_LAUNCH: 'isFirstLaunch',
  LAST_APP_VERSION: 'lastAppVersion',

  // Location
  SERVICEABLE_VILLAGE: 'serviceable_village',
  SELECTED_ADDRESS_ID: 'selected_address_id',

  // Deep linking
  DEFERRED_DEEP_LINK: 'deferredDeepLink',

  // Locale
  LOCALE: 'app_locale',
};

export const Support = {
  // Set this to your real WhatsApp support number before release.
  // Format: country code + number, no '+' or spaces. Example: '919876543210'
  WHATSAPP_NUMBER: '91XXXXXXXXXX',
};

// Error codes and messages
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // Auth specific
  INVALID_OTP: 'INVALID_OTP',
  EXPIRED_OTP: 'EXPIRED_OTP',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  INVALID_PHONE: 'INVALID_PHONE',
};
