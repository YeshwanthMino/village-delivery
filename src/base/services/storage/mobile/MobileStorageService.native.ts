import * as SecureStore from 'expo-secure-store';
import { IStorageService } from '../interfaces/IStorageService';

/**
 * Mobile implementation of storage service using SecureStore
 * Wraps Expo SecureStore to implement IStorageService interface
 */
export class MobileStorageService implements IStorageService {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('[MobileStorageService] Error getting item:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('[MobileStorageService] Error setting item:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('[MobileStorageService] Error removing item:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // SecureStore doesn't have a clear method, so we need to get all keys and delete them
      const keys = await this.getAllKeys();
      await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
    } catch (error) {
      console.error('[MobileStorageService] Error clearing storage:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      // SecureStore doesn't have a getAllKeys method
      // We'll need to maintain a separate key to track all keys
      const keysData = await SecureStore.getItemAsync('__all_keys__');
      return keysData ? JSON.parse(keysData) : [];
    } catch (error) {
      console.error('[MobileStorageService] Error getting all keys:', error);
      return [];
    }
  }
}
