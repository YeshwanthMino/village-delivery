import { AuthTokens } from './apiTypes';
import { WebService, AppConfig, StorageKeys, AppAuthRoutes } from '../../constants/AppConstants';
import { IPlatformService, PlatformServiceFactory } from '../platform';
import { IStorageService, StorageServiceFactory } from '../storage';
import { IS_WEB } from '@/src/core/utils/platform';
import { ErrorMapper } from './errorMapper';
import { StoredPrefs } from './storage/StoredPrefs';

interface FetchOptions extends RequestInit {
  withAuth?: boolean;
  _retry?: boolean;
}

class ApiClient {
  private refreshTokenPromise: Promise<AuthTokens> | null = null;
  // Invoked when a refresh fails (refresh token expired/invalid). Registered by
  // useAuthStore so the base layer can trigger a real logout without importing
  // the store (which would create a circular dependency).
  private onSessionExpired: (() => void) | null = null;
  private storageService: IStorageService | null = null;
  private storageInitPromise: Promise<IStorageService> | null = null;
  private platformService: IPlatformService | null = null;
  private platformInitPromise: Promise<IPlatformService> | null = null;
  private platformHeaders: Record<string, string> = {};

  constructor() {
    this.initializePlatformHeaders();
  }

  private async getStorageService(): Promise<IStorageService> {
    if (this.storageService) return this.storageService;
    if (this.storageInitPromise) return this.storageInitPromise;

    if (IS_WEB) {
      this.storageService = StorageServiceFactory.create();
      return this.storageService;
    }

    this.storageInitPromise = StorageServiceFactory.createAsync().then((service) => {
      this.storageService = service;
      this.storageInitPromise = null;
      return service;
    });
    return this.storageInitPromise;
  }

  private async getPlatformService(): Promise<IPlatformService> {
    if (this.platformService) return this.platformService;
    if (this.platformInitPromise) return this.platformInitPromise;

    if (IS_WEB) {
      this.platformService = PlatformServiceFactory.create();
      return this.platformService;
    }

    this.platformInitPromise = PlatformServiceFactory.createAsync().then((service) => {
      this.platformService = service;
      this.platformInitPromise = null;
      return service;
    });
    return this.platformInitPromise;
  }

  private async initializePlatformHeaders(): Promise<void> {
    try {
      const platformService = await this.getPlatformService();
      const osVersion = platformService.getVersion() || 'Unknown';
      const platformName = platformService.getPlatform();
      const platform = platformName === 'ios' ? 'iOS' : platformName === 'android' ? 'Android' : 'Web';

      let deviceModel = `${platform} Device`;
      if (IS_WEB) {
        deviceModel = navigator.userAgent.includes('Chrome') ? 'Chrome Browser'
          : navigator.userAgent.includes('Firefox') ? 'Firefox Browser'
          : navigator.userAgent.includes('Safari') ? 'Safari Browser'
          : 'Web Browser';
      } else {
        const Constants = require('expo-constants').default;
        deviceModel = Constants.deviceName || deviceModel;
      }

      this.platformHeaders = {
        'Village-Client': platform,
        'Village-Client-Device': `${deviceModel} (${osVersion})`,
      };
    } catch (error) {
      console.warn('Failed to initialize platform headers:', error);
    }
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // The village API's nginx 403s any User-Agent lacking "Mozilla", which
      // blocks native fetch (CFNetwork/okhttp). Keep the token until the server
      // relaxes that filter.
      'User-Agent': `Mozilla/5.0 ${AppConfig.name}/${AppConfig.version}`,
      'Village-App-Version': `${AppConfig.name} (v${AppConfig.version})`,
      ...this.platformHeaders,
    };
  }

  // The village API is multi-tenant: every authed endpoint needs the active
  // store's `x-store-id` header. Inject it centrally from the persisted
  // serviceable village so individual endpoints never have to remember — a
  // missing header makes the server reply 401 "Store could not be resolved".
  // Callers that target a *specific* store (login, catalog probes) still pass
  // their own `x-store-id`, which overrides this one (merged later).
  private async getStoreId(): Promise<string | null> {
    try {
      const village = await StoredPrefs.getCustomData<{ storeId?: string }>(StorageKeys.SERVICEABLE_VILLAGE);
      return village?.storeId ?? null;
    } catch {
      return null;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const storage = await this.getStorageService();
      const token = await storage.getItem(StorageKeys.ACCESS_TOKEN);
      const tokenType = await storage.getItem(StorageKeys.TOKEN_TYPE);
      if (token && tokenType) {
        return { Authorization: `${tokenType} ${token}` };
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    return {};
  }

  private async request<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { withAuth = true, _retry = false, ...fetchOptions } = options;

    const authHeaders = withAuth ? await this.getAuthHeaders() : {};
    // Authed requests carry the active store's id by default; a per-call
    // `x-store-id` (spread last) still wins for endpoints targeting another store.
    const storeId = withAuth ? await this.getStoreId() : null;
    const headers: Record<string, string> = {
      ...this.getBaseHeaders(),
      ...authHeaders,
      ...(storeId ? { 'x-store-id': storeId } : {}),
      ...(fetchOptions.headers as Record<string, string> ?? {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AppConfig.timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401 && withAuth && !_retry) {
        try {
          const tokens = await this.refreshAccessToken();
          return this.request<T>(url, {
            ...options,
            _retry: true,
            headers: {
              ...(options.headers as Record<string, string> ?? {}),
              Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
            },
          });
        } catch {
          // Refresh failed → the session is dead. Hand off to the registered
          // logout (resets the auth store); fall back to wiping tokens if no
          // handler is registered. Then reject the original call.
          if (this.onSessionExpired) {
            this.onSessionExpired();
          } else {
            await this.clearTokens();
          }
          throw await ErrorMapper.mapFetchResponse(response);
        }
      }

      if (!response.ok) {
        throw await ErrorMapper.mapFetchResponse(response);
      }

      const text = await response.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw ErrorMapper.createNetworkError('DECODE_FAILED');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw ErrorMapper.createNetworkError('REQUEST_TIMED_OUT');
      }
      // Re-throw NetworkError objects as-is
      if (error?.type && error?.message) throw error;
      // TypeError from fetch = no network
      throw ErrorMapper.createNetworkError('NO_INTERNET', error?.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async refreshAccessToken(): Promise<AuthTokens> {
    if (this.refreshTokenPromise) return this.refreshTokenPromise;
    this.refreshTokenPromise = this.performTokenRefresh();
    try {
      return await this.refreshTokenPromise;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const storage = await this.getStorageService();
    const refreshToken = await storage.getItem(StorageKeys.REFRESH_TOKEN);

    if (!refreshToken) throw ErrorMapper.createNetworkError('AUTHENTICATION', 'No refresh token available');

    // The customer-app refresh endpoint takes the refresh token via header (not
    // a body) and must NOT carry the expired access token. withAuth:false keeps
    // the 401 interceptor from recursing into itself.
    const storeId = await this.getStoreId();
    const headers: Record<string, string> = { 'X-Refresh-Token': refreshToken };
    if (storeId) headers['X-Store-Id'] = storeId;

    const response = await this.post<any>(
      `${WebService.villageBaseURL}${AppAuthRoutes.refresh}`,
      undefined,
      { withAuth: false, headers },
    );

    const tokenData = response?.data ?? response;
    const tokens: AuthTokens = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      tokenType: tokenData.tokenType ?? 'Bearer',
      expiresIn: tokenData.expiresIn,
      userId: tokenData.userId,
    };
    await this.saveTokens(tokens);
    return tokens;
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    const storage = await this.getStorageService();
    await Promise.all([
      storage.setItem(StorageKeys.ACCESS_TOKEN, tokens.accessToken),
      storage.setItem(StorageKeys.REFRESH_TOKEN, tokens.refreshToken),
      storage.setItem(StorageKeys.TOKEN_TYPE, tokens.tokenType),
    ]);
    if (tokens.userId) {
      await storage.setItem(StorageKeys.USER_ID, tokens.userId.toString());
    }
  }

  async clearTokens(): Promise<void> {
    const storage = await this.getStorageService();
    await Promise.all([
      storage.removeItem(StorageKeys.ACCESS_TOKEN),
      storage.removeItem(StorageKeys.REFRESH_TOKEN),
      storage.removeItem(StorageKeys.TOKEN_TYPE),
      storage.removeItem(StorageKeys.USER_ID),
    ]);
  }

  setOnSessionExpired(cb: () => void): void {
    this.onSessionExpired = cb;
  }

  async initializeUserId(): Promise<void> {
    try {
      await this.getStorageService();
    } catch (error) {
      console.warn('Failed to initialize storage:', error);
    }
  }

  get<T = any>(url: string, options?: FetchOptions) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  post<T = any>(url: string, data?: any, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  put<T = any>(url: string, data?: any, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  patch<T = any>(url: string, data?: any, options?: FetchOptions) {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  delete<T = any>(url: string, options?: FetchOptions) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  getWithoutAuth<T = any>(url: string, options?: FetchOptions) {
    return this.get<T>(url, { ...options, withAuth: false });
  }

  postWithoutAuth<T = any>(url: string, data?: any, options?: FetchOptions) {
    return this.post<T>(url, data, { ...options, withAuth: false });
  }
}

export const apiClient = new ApiClient();
apiClient.initializeUserId();
