import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { authInterceptor } from './interceptors/authInterceptor';
import { loggingInterceptor } from './interceptors/loggingInterceptor';
import { errorInterceptor } from './interceptors/errorInterceptor';

// Import app constants
import { IS_WEB } from '@/src/core/utils/platform';
import { AuthTokens } from './apiTypes';
import { WebService, AppConfig } from '../../constants/AppConstants';
import { IPlatformService, PlatformServiceFactory } from '../platform';
import { IStorageService, StorageServiceFactory } from '../storage';

// Storage keys
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_TYPE_KEY = 'token_type';
const USER_ID_KEY = 'user_id';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private axiosInstanceWithoutAuth: AxiosInstance;
  private refreshTokenPromise: Promise<AuthTokens> | null = null;
  private storageService: IStorageService | null = null;
  private storageInitPromise: Promise<IStorageService> | null = null;
  private platformService: IPlatformService | null = null;
  private platformInitPromise: Promise<IPlatformService> | null = null;

  // Lazy-load storage service with async initialization for mobile
  private async getStorageService(): Promise<IStorageService> {
    if (this.storageService) {
      return this.storageService;
    }

    if (this.storageInitPromise) {
      return this.storageInitPromise;
    }

    if (IS_WEB) {
      this.storageService = StorageServiceFactory.create();
      return this.storageService;
    } else {
      this.storageInitPromise = StorageServiceFactory.createAsync().then((service) => {
        this.storageService = service;
        this.storageInitPromise = null;
        return service;
      });
      return this.storageInitPromise;
    }
  }

  // Lazy-load platform service with async initialization for mobile
  private async getPlatformService(): Promise<IPlatformService> {
    if (this.platformService) {
      return this.platformService;
    }

    if (this.platformInitPromise) {
      return this.platformInitPromise;
    }

    if (IS_WEB) {
      this.platformService = PlatformServiceFactory.create();
      return this.platformService;
    } else {
      this.platformInitPromise = PlatformServiceFactory.createAsync().then((service) => {
        this.platformService = service;
        this.platformInitPromise = null;
        return service;
      });
      return this.platformInitPromise;
    }
  }

  constructor() {
    // Main axios instance with auth
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: this.getBasicHeaders(),
    });

    // Instance without auth interceptor (for token refresh)
    this.axiosInstanceWithoutAuth = axios.create({
      timeout: 30000,
      headers: this.getBasicHeaders(),
    });

    this.setupInterceptors();

    // Initialize platform-specific headers async
    this.initializePlatformHeaders();
  }

  private getBasicHeaders(): Record<string, string> {
    // Basic headers that don't require platform service
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Village-App-Version': `${AppConfig.name} (v${AppConfig.version})`,
    };
  }

  private async initializePlatformHeaders(): Promise<void> {
    try {
      const platformService = await this.getPlatformService();
      const osVersion = platformService.getVersion() || 'Unknown';
      const platformName = platformService.getPlatform();
      const platform = platformName === 'ios' ? 'iOS' : platformName === 'android' ? 'Android' : 'Web';

      // Get device model based on platform
      let deviceModel = `${platform} Device`;
      if (IS_WEB) {
        // For web, use browser info
        deviceModel = navigator.userAgent.includes('Chrome') ? 'Chrome Browser' :
                      navigator.userAgent.includes('Firefox') ? 'Firefox Browser' :
                      navigator.userAgent.includes('Safari') ? 'Safari Browser' : 'Web Browser';
      } else {
        // For mobile, dynamically import expo-constants
        const Constants = require('expo-constants').default;
        deviceModel = Constants.deviceName || deviceModel;
      }

      // Update headers on both axios instances
      const headers = {
        'Village-Client': platform,
        'Village-Client-Device': `${deviceModel} (${osVersion})`,
      };

      Object.assign(this.axiosInstance.defaults.headers.common, headers);
      Object.assign(this.axiosInstanceWithoutAuth.defaults.headers.common, headers);
    } catch (error) {
      console.warn('Failed to initialize platform headers:', error);
    }
  }

  private setupInterceptors() {
    // Request interceptors
    this.axiosInstance.interceptors.request.use(
      loggingInterceptor.request,
      (error: any) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.request.use(
      authInterceptor.request,
      (error: any) => Promise.reject(error)
    );

    // Response interceptors
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        loggingInterceptor.response(response);
        return authInterceptor.response(response);
      },
      async (error: any) => {
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;

          try {
            const tokens = await this.refreshAccessToken();
            if (tokens) {
              // Retry the original request with new token
              error.config.headers.Authorization = `${tokens.tokenType} ${tokens.accessToken}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        const networkError = errorInterceptor.error(error);
        return Promise.reject(networkError);
      }
    );

    // Setup logging for non-auth instance
    this.axiosInstanceWithoutAuth.interceptors.request.use(
      loggingInterceptor.request,
      (error) => Promise.reject(error)
    );

    this.axiosInstanceWithoutAuth.interceptors.response.use(
      loggingInterceptor.response,
      (error: any) => {
        const networkError = errorInterceptor.error(error);
        return Promise.reject(networkError);
      }
    );
  }

  private async refreshAccessToken(): Promise<AuthTokens> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshTokenPromise;
      return result;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    try {
      const storage = await this.getStorageService();
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.axiosInstanceWithoutAuth.post(
        `${WebService.villageService}v1/refresh-token`,
        { refreshToken }
      );

      // Handle both wrapped and direct response formats
      const tokenData = response.data.data || response.data;
      const tokens: AuthTokens = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenType: tokenData.tokenType,
        expiresIn: tokenData.expiresIn,
        userId: tokenData.userId
      };
      await this.saveTokens(tokens);

      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    // Save tokens using storage service
    const storage = await this.getStorageService();
    await Promise.all([
      storage.setItem(TOKEN_KEY, tokens.accessToken),
      storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
      storage.setItem(TOKEN_TYPE_KEY, tokens.tokenType),
    ]);

    // Update user ID in headers
    if (tokens.userId) {
      await storage.setItem(USER_ID_KEY, tokens.userId.toString());
      await this.updateUserId(tokens.userId);
    }
  }

  async clearTokens(): Promise<void> {
    // Clear tokens using storage service
    const storage = await this.getStorageService();
    await Promise.all([
      storage.removeItem(TOKEN_KEY),
      storage.removeItem(REFRESH_TOKEN_KEY),
      storage.removeItem(TOKEN_TYPE_KEY),
      storage.removeItem(USER_ID_KEY),
    ]);
    // Reset user id header to null
    this.axiosInstance.defaults.headers.common['Village-User-Id'] = 'null';
    this.axiosInstanceWithoutAuth.defaults.headers.common['Village-User-Id'] = 'null';
  }

  private async logout(): Promise<void> {
    await this.clearTokens();
    // Here you would typically navigate to login screen
    // This should be handled by your app's navigation logic
  }

  // Public methods for making requests
  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.get<T>(url, config);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.post<T>(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.put<T>(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Methods for requests without auth (like login, register)
  getWithoutAuth<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstanceWithoutAuth.get<T>(url, config);
  }

  postWithoutAuth<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstanceWithoutAuth.post<T>(url, data, config);
  }

  // Update user ID in headers
  async updateUserId(userId?: number | string): Promise<void> {
    const userIdValue = userId ? userId.toString() : 'null';
    this.axiosInstance.defaults.headers.common['Village-User-Id'] = userIdValue;
    this.axiosInstanceWithoutAuth.defaults.headers.common['Village-User-Id'] = userIdValue;
  }

  // Initialize user ID from storage
  async initializeUserId(): Promise<void> {
    try {
      const storage = await this.getStorageService();
      const userId = await storage.getItem(USER_ID_KEY);
      if (userId) {
        await this.updateUserId(userId);
      }
    } catch (error) {
      console.warn('Failed to initialize user ID:', error);
    }
  }

  // Set base URLs dynamically
  setAuthBaseURL(url: string) {
    this.axiosInstance.defaults.baseURL = url;
    this.axiosInstanceWithoutAuth.defaults.baseURL = url;
  }

  setBFFBaseURL(url: string) {
    // This would be used for GraphQL requests
    return url;
  }

  // Get current headers for debugging
  async getHeaders(): Promise<Record<string, string>> {
    const headers = { ...this.axiosInstance.defaults.headers.common } as Record<string, string>;
    const storage = await this.getStorageService();
    const accessToken = await storage.getItem(TOKEN_KEY);
    const tokenType = await storage.getItem(TOKEN_TYPE_KEY);

    if (accessToken && tokenType) {
      headers['Authorization'] = `${tokenType} ${accessToken}`;
    }

    return headers;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Initialize user ID from storage on app start
apiClient.initializeUserId();
