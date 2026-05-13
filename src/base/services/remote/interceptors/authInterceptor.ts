import { IS_WEB } from '@/src/core/utils/platform';
import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { IStorageService, StorageServiceFactory } from '../../storage';

const TOKEN_KEY = 'access_token';
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
};
