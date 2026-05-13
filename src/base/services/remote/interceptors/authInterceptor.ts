import { IS_WEB } from '@/src/core/utils/platform';
import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { IStorageService, StorageServiceFactory } from '../../storage';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_TYPE_KEY = 'token_type';

// Lazy-loaded storage service (async initialization for mobile)
let storageService: IStorageService | null = null;
let storageInitPromise: Promise<IStorageService> | null = null;

const getStorageService = async (): Promise<IStorageService> => {
  if (storageService) {
    return storageService;
  }

  if (storageInitPromise) {
    return storageInitPromise;
  }

  if (IS_WEB) {
    storageService = StorageServiceFactory.create();
    return storageService;
  } else {
    storageInitPromise = StorageServiceFactory.createAsync().then((service) => {
      storageService = service;
      storageInitPromise = null;
      return service;
    });
    return storageInitPromise;
  }
};

export const authInterceptor = {
  request: async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      const storage = await getStorageService();
      const token = await storage.getItem(TOKEN_KEY);
      const tokenType = await storage.getItem(TOKEN_TYPE_KEY);

      if (token && tokenType) {
        config.headers.Authorization = `${tokenType} ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return config;
  },

  response: (response: AxiosResponse) => response,

  error: async (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storage = await getStorageService();
        const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

        if (refreshToken) {
          // This will be handled by the refresh token logic in ApiClient
          throw error;
        }
      } catch (refreshError) {
        const storage = await getStorageService();
        await Promise.all([
          storage.removeItem(TOKEN_KEY),
          storage.removeItem(REFRESH_TOKEN_KEY),
          storage.removeItem(TOKEN_TYPE_KEY)
        ]);
        throw error;
      }
    }

    return Promise.reject(error);
  },
};
