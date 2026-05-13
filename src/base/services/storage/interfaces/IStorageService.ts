/**
 * Platform-agnostic storage service interface
 * Abstracts localStorage (web) and AsyncStorage (mobile)
 */
export interface IStorageService {
  /**
   * Get an item from storage
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Set an item in storage
   * @param key - The key to set
   * @param value - The value to store
   * @returns Promise that resolves when the operation is complete
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Remove an item from storage
   * @param key - The key to remove
   * @returns Promise that resolves when the operation is complete
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all items from storage
   * @returns Promise that resolves when the operation is complete
   */
  clear(): Promise<void>;

  /**
   * Get all keys from storage
   * @returns Promise resolving to an array of all keys
   */
  getAllKeys(): Promise<string[]>;
}
