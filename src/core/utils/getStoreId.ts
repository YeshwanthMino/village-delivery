// src/core/utils/getStoreId.ts
//
// Get the store ID from env. Used by all API calls via x-store-id header.

const DEFAULT_STORE_ID = process.env.EXPO_PUBLIC_DEFAULT_STORE_ID || '';

/**
 * Sync getter for store ID (e.g., for imperative API calls).
 */
export function getStoreIdSync(): string {
  return DEFAULT_STORE_ID;
}

/**
 * Hook to get store ID for use in React components/hooks.
 */
export function useStoreId(): string {
  return DEFAULT_STORE_ID;
}
