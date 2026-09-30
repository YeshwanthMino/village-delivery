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

describe('request lifecycle cancellation', () => {
  let apiClient: typeof import('../apiClient').apiClient;
  beforeAll(() => { apiClient = require('../apiClient').apiClient; });
  it('does not start a fetch for an already cancelled screen', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(apiClient.getWithoutAuth('https://api.test/cancelled', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('aborts the underlying fetch and removes the caller listener', async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    let fetchSignal!: AbortSignal;
    (global.fetch as jest.Mock).mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      fetchSignal = options.signal;
      fetchSignal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      started();
    }));
    const request = apiClient.getWithoutAuth('https://api.test/pending', { signal: controller.signal });
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await entered;
    controller.abort();
    await rejection;
    expect(fetchSignal.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('removes cancellation listeners after a successful response', async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));
    await expect(apiClient.getWithoutAuth('https://api.test/ok', { signal: controller.signal }))
      .resolves.toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
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

describe('apiClient 401 interceptor — session expiry', () => {
  it('retries successfully without firing onSessionExpired', async () => {
    const { apiClient } = require('../apiClient');
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-access', refreshToken: 'refresh-2', tokenType: 'Bearer' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const onExpired = jest.fn();
    apiClient.setOnSessionExpired(onExpired);

    await apiClient.get('https://api.test/thing');

    expect(onExpired).not.toHaveBeenCalled();
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(3);
  });

  it('fires onSessionExpired when the refresh also fails', async () => {
    const { apiClient } = require('../apiClient');
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401))   // original
      .mockResolvedValueOnce(jsonResponse(401));  // refresh fails
    const onExpired = jest.fn();
    apiClient.setOnSessionExpired(onExpired);

    await expect(apiClient.get('https://api.test/thing')).rejects.toBeDefined();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh for withAuth:false requests', async () => {
    const { apiClient } = require('../apiClient');
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(401));
    const onExpired = jest.fn();
    apiClient.setOnSessionExpired(onExpired);

    await expect(apiClient.getWithoutAuth('https://api.test/public')).rejects.toBeDefined();
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe('apiClient request timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('aborts a per-call timeout at the caller-supplied deadline, not the global one', async () => {
    const { apiClient } = require('../apiClient');
    // Resolve only when the AbortSignal fires, so the rejection proves the abort
    // came from *this* request's timer rather than the 30s AppConfig default.
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const pending = apiClient.get('https://api.test/slow', { timeout: 5000 });
    const assertion = expect(pending).rejects.toMatchObject({ type: 'REQUEST_TIMED_OUT' });

    await jest.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('does not pass the timeout option through to fetch', async () => {
    const { apiClient } = require('../apiClient');
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiClient.get('https://api.test/thing', { timeout: 5000 });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init).not.toHaveProperty('timeout');
  });
});

describe('apiClient x-branch-id', () => {
  const setup = (branch: string | undefined) => {
    const { apiClient } = require('../apiClient');
    apiClient.setBranchIdProvider(jest.fn().mockResolvedValue(branch));
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));
    return apiClient;
  };
  const sentHeaders = () => (global.fetch as jest.Mock).mock.calls[0][1].headers;

  it.each([
    ['post', 'https://api.test/app/orders/check-stock'],
    ['post', 'https://api.test/app/orders'],
    ['get', 'https://api.test/app/orders?sort=_id%3Adesc&skip=0&limit=24'],
    ['get', 'https://api.test/app/store-config'],
    ['getWithoutAuth', 'https://api.test/app/products?skip=0&limit=24'],
    ['getWithoutAuth', 'https://api.test/app/products/abc123'],
    ['getWithoutAuth', 'https://api.test/app/category/flattened/all-products/c1?skip=0&limit=24'],
    ['get', 'https://api.test/app/orders/abc123'],
    ['get', 'https://api.test/app/auth/me'],
  ])('adds the header on %s %s', async (method, url) => {
    const apiClient = setup('branch-1');
    await apiClient[method](url);
    expect(sentHeaders()['x-branch-id']).toBe('branch-1');
  });

  it('does not add it to the village directory endpoints', async () => {
    const apiClient = setup('branch-1');
    await apiClient.postWithoutAuth('https://api.test/villages/find-by-location', {});
    await apiClient.getWithoutAuth('https://api.test/villages/search?q=a');
    for (const call of (global.fetch as jest.Mock).mock.calls) {
      expect(call[1].headers['x-branch-id']).toBeUndefined();
    }
  });

  it('omits it when there is no branch or the provider throws', async () => {
    let apiClient = setup(undefined);
    await apiClient.get('https://api.test/app/orders');
    expect(sentHeaders()['x-branch-id']).toBeUndefined();

    (global.fetch as jest.Mock).mockClear();
    apiClient.setBranchIdProvider(jest.fn().mockRejectedValue(new Error('boom')));
    await apiClient.get('https://api.test/app/orders');
    expect(sentHeaders()['x-branch-id']).toBeUndefined();
  });
});
