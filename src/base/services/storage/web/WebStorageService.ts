import { IStorageService } from '../interfaces/IStorageService';

/**
 * Web implementation of storage service using localStorage
 * Provides async interface to match mobile AsyncStorage behavior
 */
export class WebStorageService implements IStorageService {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[WebStorageService] Error getting item:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('[WebStorageService] Error setting item:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[WebStorageService] Error removing item:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[WebStorageService] Error clearing storage:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('[WebStorageService] Error getting all keys:', error);
      return [];
    }
  }
}
