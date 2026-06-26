// src/base/services/remote/__tests__/apiClient.test.ts
import { StorageKeys, WebService, AppAuthRoutes } from '@/src/base/constants/AppConstants';

// In-memory storage shared by apiClient + StoredPrefs (both import the storage
// module index). jest.mock factories may only reference vars prefixed "mock".
const mockStore = new Map<string, string>();
const mockStorage = {
  getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  clear: jest.fn(async () => { mockStore.clear(); }),
  getAllKeys: jest.fn(async () => Array.from(mockStore.keys())),
};
const mockPlatform = {
  isWeb: () => false, isMobile: () => true, isIOS: () => true, isAndroid: () => false,
  getPlatform: () => 'ios' as const, getVersion: () => '17.0',
};

// Relative paths resolve to the SAME module files apiClient imports, so the
// mocks apply to apiClient's own dependencies.
jest.mock('../../storage', () => ({
  StorageServiceFactory: { create: () => mockStorage, createAsync: async () => mockStorage },
}));
jest.mock('../../platform', () => ({
  PlatformServiceFactory: { create: () => mockPlatform, createAsync: async () => mockPlatform },
}));

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockStore.set(StorageKeys.ACCESS_TOKEN, 'old-access');
  mockStore.set(StorageKeys.REFRESH_TOKEN, 'refresh-1');
  mockStore.set(StorageKeys.TOKEN_TYPE, 'Bearer');
  mockStore.set(StorageKeys.SERVICEABLE_VILLAGE, JSON.stringify({ storeId: 'store-1' }));
  global.fetch = jest.fn();
});

describe('apiClient 401 interceptor — refresh contract', () => {
  it('refreshes against /app/auth/refresh with X-Refresh-Token + X-Store-Id, no Authorization, no body', async () => {
    const { apiClient } = require('../apiClient');
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401))                                              // original GET
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'refresh-2', tokenType: 'Bearer' })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));                               // retry

    const res = await apiClient.get('https://api.test/thing');

    expect(res).toEqual({ ok: true });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toBe(`${WebService.villageBaseURL}${AppAuthRoutes.refresh}`);
    expect(init.method).toBe('POST');
    expect(init.headers['X-Refresh-Token']).toBe('refresh-1');
    expect(init.headers['X-Store-Id']).toBe('store-1');
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBeUndefined();
  });
});
