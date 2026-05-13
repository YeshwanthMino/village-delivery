/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 *
 * Add your VITE_* environment variables here for type safety
 */
interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
