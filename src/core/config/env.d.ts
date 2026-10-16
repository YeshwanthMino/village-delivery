/**
 * Environment Configuration Type Definitions
 * Shared across web and mobile platforms
 */

export interface EnvironmentConfig {
  // Environment flags
  isProduction: boolean;
  isStaging: boolean;

  // API Configuration
  apiBaseUrl: string;
  villageApiBaseUrl: string;
}

export declare const env: EnvironmentConfig;
