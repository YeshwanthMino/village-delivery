import { StorageKeys } from '@/src/base/constants/AppConstants';
import { IS_WEB } from '@/src/core/utils/platform';
import { IStorageService, StorageServiceFactory } from '../../storage';


// Types for stored data
export interface UserObject {
  id: number;
  uuid: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  [key: string]: any;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications?: boolean;
  language?: string;
  [key: string]: any;
}

/**
 * StoredPrefs - Utility class for handling app preferences and data storage
 * Platform-agnostic implementation using StorageService abstraction
 * Automatically uses localStorage (web) or SecureStore (mobile)
 *
 * Note: For production, consider using react-native-keychain for sensitive data
 * like tokens, and AsyncStorage for non-sensitive preferences
 */
export class StoredPrefs {
  static shared() {
    throw new Error('Method not implemented.');
  }
  private static storageService: IStorageService | null = null;
  private static initPromise: Promise<IStorageService> | null = null;

  /**
   * Get storage service instance (lazy initialization)
   * Web: Returns immediately with localStorage
   * Mobile: Async loads SecureStore on first call
   */
  private static async getStorageService(): Promise<IStorageService> {
    if (StoredPrefs.storageService) {
      return StoredPrefs.storageService;
    }

    if (StoredPrefs.initPromise) {
      return StoredPrefs.initPromise;
    }

    if (IS_WEB) {
      // Web - synchronous init
      StoredPrefs.storageService = StorageServiceFactory.create();
      return StoredPrefs.storageService;
    } else {
      // Mobile - async init
      StoredPrefs.initPromise = StorageServiceFactory.createAsync().then((service) => {
        StoredPrefs.storageService = service;
        StoredPrefs.initPromise = null;
        return service;
      });
      return StoredPrefs.initPromise;
    }
  }

  // Authentication related storage
  static async getAccessToken(): Promise<string | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getItem(StorageKeys.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  static async setAccessToken(token: string | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (token) {
        await storage.setItem(StorageKeys.ACCESS_TOKEN, token);
      } else {
        await storage.removeItem(StorageKeys.ACCESS_TOKEN);
      }
    } catch (error) {
      console.error('Failed to set access token:', error);
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getItem(StorageKeys.REFRESH_TOKEN);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  static async setRefreshToken(token: string | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (token) {
        await storage.setItem(StorageKeys.REFRESH_TOKEN, token);
      } else {
        await storage.removeItem(StorageKeys.REFRESH_TOKEN);
      }
    } catch (error) {
      console.error('Failed to set refresh token:', error);
    }
  }

  static async getTokenType(): Promise<string | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getItem(StorageKeys.TOKEN_TYPE);
    } catch (error) {
      console.error('Failed to get token type:', error);
      return null;
    }
  }

  static async setTokenType(tokenType: string | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (tokenType) {
        await storage.setItem(StorageKeys.TOKEN_TYPE, tokenType);
      } else {
        await storage.removeItem(StorageKeys.TOKEN_TYPE);
      }
    } catch (error) {
      console.error('Failed to set token type:', error);
    }
  }

  static async getUsername(): Promise<string | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getItem(StorageKeys.USERNAME);
    } catch (error) {
      console.error('Failed to get username:', error);
      return null;
    }
  }

  static async setUsername(username: string | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (username) {
        await storage.setItem(StorageKeys.USERNAME, username);
      } else {
        await storage.removeItem(StorageKeys.USERNAME);
      }
    } catch (error) {
      console.error('Failed to set username:', error);
    }
  }

  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      const prefsData = await storage.getItem(StorageKeys.USER_PREFERENCES);
      return prefsData ? JSON.parse(prefsData) : null;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  static async setUserPreferences(preferences: UserPreferences | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (preferences) {
        await storage.setItem(StorageKeys.USER_PREFERENCES, JSON.stringify(preferences));
      } else {
        await storage.removeItem(StorageKeys.USER_PREFERENCES);
      }
    } catch (error) {
      console.error('Failed to set user preferences:', error);
    }
  }

  // App state storage
  static async getIsFirstLaunch(): Promise<boolean> {
    try {
      const storage = await StoredPrefs.getStorageService();
      const value = await storage.getItem(StorageKeys.IS_FIRST_LAUNCH);
      return value !== 'false'; // Default to true if not set
    } catch (error) {
      console.error('Failed to get first launch status:', error);
      return true;
    }
  }

  static async setIsFirstLaunch(isFirstLaunch: boolean): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      await storage.setItem(StorageKeys.IS_FIRST_LAUNCH, String(isFirstLaunch));
    } catch (error) {
      console.error('Failed to set first launch status:', error);
    }
  }

  // Deep linking
  static async getDeferredDeepLink(): Promise<string | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getItem(StorageKeys.DEFERRED_DEEP_LINK);
    } catch (error) {
      console.error('Failed to get deferred deep link:', error);
      return null;
    }
  }

  static async setDeferredDeepLink(link: string | null): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      if (link) {
        await storage.setItem(StorageKeys.DEFERRED_DEEP_LINK, link);
      } else {
        await storage.removeItem(StorageKeys.DEFERRED_DEEP_LINK);
      }
    } catch (error) {
      console.error('Failed to set deferred deep link:', error);
    }
  }

  // Authentication state check
  static async isUserLoggedIn(): Promise<boolean> {
    try {
      const token = await StoredPrefs.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('Failed to check user login status:', error);
      return false;
    }
  }

  // Clear all authentication data
  static async clearCredentials(): Promise<void> {
    try {
      await Promise.all([
        StoredPrefs.setAccessToken(null),
        StoredPrefs.setRefreshToken(null),
        StoredPrefs.setTokenType(null),
        StoredPrefs.setUserProfile(null),
      ]);
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  // Clear all stored data
  static async clear(): Promise<void> {
    try {
      await StoredPrefs.clearCredentials();
      // Clear other non-essential data but keep app preferences
      await Promise.all([
        StoredPrefs.setDeferredDeepLink(null),
      ]);
    } catch (error) {
      console.error('Failed to clear stored preferences:', error);
    }
  }

  // Generic storage methods for custom data
  static async setCustomData(key: string, value: any): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      const serializedValue = JSON.stringify(value);
      await storage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Failed to set custom data for key ${key}:`, error);
    }
  }

  static async getCustomData<T = any>(key: string): Promise<T | null> {
    try {
      const storage = await StoredPrefs.getStorageService();
      const value = await storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Failed to get custom data for key ${key}:`, error);
      return null;
    }
  }

  static async removeCustomData(key: string): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      await storage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove custom data for key ${key}:`, error);
    }
  }

  // Get all stored keys (for debugging)
  static async getAllKeys(): Promise<readonly string[]> {
    try {
      const storage = await StoredPrefs.getStorageService();
      return await storage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all storage keys:', error);
      return [];
    }
  }

  // Clear all storage (use with caution)
  static async clearAll(): Promise<void> {
    try {
      const storage = await StoredPrefs.getStorageService();
      await storage.clear();
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  }

  // User Profile storage methods
  static async getUserProfile(): Promise<any | null> {
    try {
      return await StoredPrefs.getCustomData('village_user_profile');
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  static async setUserProfile(profile: any | null): Promise<void> {
    try {
      if (profile) {
        await StoredPrefs.setCustomData('village_user_profile', profile);
      } else {
        await StoredPrefs.removeCustomData('village_user_profile');
      }
    } catch (error) {
      console.error('Failed to set user profile:', error);
    }
  }
}
