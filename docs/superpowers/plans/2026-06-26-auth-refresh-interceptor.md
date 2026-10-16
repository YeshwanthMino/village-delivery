# Auth Refresh Interceptor + Logout on Refresh Failure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apiClient`'s existing 401 interceptor actually work — call the real `/app/auth/refresh` endpoint with the correct header contract, and on refresh failure perform a genuine logout that resets the auth store.

**Architecture:** `apiClient.request()` already retries once on 401 after refreshing. We fix `performTokenRefresh()` to use the real endpoint/headers, add a `setOnSessionExpired` callback so the base-layer client can trigger a logout without importing the store (avoids a circular dependency), and register `useAuthStore.logout()` as that callback.

**Tech Stack:** TypeScript, Zustand, Jest (`jest-expo` preset). Tests live in `__tests__/` dirs beside the code and use plain `it`/`expect`/`jest.fn` (no React Testing Library needed here).

**Spec:** `docs/superpowers/specs/2026-06-26-auth-refresh-interceptor-design.md`

---

## File Structure

- `src/base/services/remote/apiClient.ts` — **Modify.** Fix `performTokenRefresh()`; add `onSessionExpired` field + `setOnSessionExpired()`; change the 401 catch block to call it. Add `AppAuthRoutes` import.
- `src/core/store/useAuthStore.ts` — **Modify.** Register `apiClient.setOnSessionExpired(() => void useAuthStore.getState().logout())` at module load.
- `src/base/services/remote/__tests__/apiClient.test.ts` — **Create.** Interceptor/refresh tests (mock `fetch` + storage/platform factories).
- `src/core/store/__tests__/useAuthStore.session.test.ts` — **Create.** Verifies the logout callback is registered and invokes `logout()`.

No other files change. The `refresh` path constant (`AppAuthRoutes.refresh = '/app/auth/refresh'`) and `WebService.villageBaseURL` already exist in `src/base/constants/AppConstants.ts`.

---

## Task 1: Fix the refresh request to use the real endpoint + header contract

**Files:**
- Create: `src/base/services/remote/__tests__/apiClient.test.ts`
- Modify: `src/base/services/remote/apiClient.ts:1-2` (imports), `src/base/services/remote/apiClient.ts:204-226` (`performTokenRefresh`)

- [ ] **Step 1: Write the failing test (full test-file scaffold + first case)**

Create `src/base/services/remote/__tests__/apiClient.test.ts` with the complete scaffold below. The shared mocks/helpers defined here are reused by Task 2's cases.

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/base/services/remote/__tests__/apiClient.test.ts -t "refreshes against"`
Expected: FAIL. The current code calls `${WebService.villageService}v1/refresh-token` with a JSON body `{ refreshToken }`, so the URL assertion fails (received `.../v1/refresh-token`) and `init.headers['X-Refresh-Token']` is `undefined`.

- [ ] **Step 3: Add the `AppAuthRoutes` import**

In `src/base/services/remote/apiClient.ts`, change line 2 from:

```ts
import { WebService, AppConfig, StorageKeys } from '../../constants/AppConstants';
```

to:

```ts
import { WebService, AppConfig, StorageKeys, AppAuthRoutes } from '../../constants/AppConstants';
```

- [ ] **Step 4: Rewrite `performTokenRefresh` to the real contract**

Replace the body of `performTokenRefresh` (`src/base/services/remote/apiClient.ts:204-226`) with:

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/base/services/remote/__tests__/apiClient.test.ts -t "refreshes against"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/base/services/remote/apiClient.ts src/base/services/remote/__tests__/apiClient.test.ts
git commit -m "fix(api): refresh token via /app/auth/refresh header contract"
```

---

## Task 2: Add the session-expired callback and trigger logout on refresh failure

**Files:**
- Modify: `src/base/services/remote/apiClient.ts:14-20` (field), add `setOnSessionExpired` method, `src/base/services/remote/apiClient.ts:153-168` (401 catch block)
- Test: `src/base/services/remote/__tests__/apiClient.test.ts` (append a new `describe`)

- [ ] **Step 1: Write the failing tests**

Append this `describe` block to the end of `src/base/services/remote/__tests__/apiClient.test.ts` (it reuses the scaffold from Task 1):

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/base/services/remote/__tests__/apiClient.test.ts -t "session expiry"`
Expected: FAIL. `apiClient.setOnSessionExpired` does not exist yet — the cases error with `apiClient.setOnSessionExpired is not a function`.

- [ ] **Step 3: Add the field and setter**

In `src/base/services/remote/apiClient.ts`, add the field after line 15 (`private refreshTokenPromise...`). The class currently starts:

```ts
class ApiClient {
  private refreshTokenPromise: Promise<AuthTokens> | null = null;
```

Change it to:

```ts
class ApiClient {
  private refreshTokenPromise: Promise<AuthTokens> | null = null;
  // Invoked when a refresh fails (refresh token expired/invalid). Registered by
  // useAuthStore so the base layer can trigger a real logout without importing
  // the store (which would create a circular dependency).
  private onSessionExpired: (() => void) | null = null;
```

Then add this method immediately after `clearTokens()` (after `src/base/services/remote/apiClient.ts:248`):

```ts
  setOnSessionExpired(cb: () => void): void {
    this.onSessionExpired = cb;
  }
```

- [ ] **Step 4: Update the 401 catch block to call the callback**

In `src/base/services/remote/apiClient.ts`, replace the catch block (currently `src/base/services/remote/apiClient.ts:164-167`):

```ts
        } catch {
          await this.clearTokens();
          throw await ErrorMapper.mapFetchResponse(response);
        }
```

with:

```ts
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/base/services/remote/__tests__/apiClient.test.ts`
Expected: PASS (all four cases — the Task 1 case plus the three new ones).

- [ ] **Step 6: Commit**

```bash
git add src/base/services/remote/apiClient.ts src/base/services/remote/__tests__/apiClient.test.ts
git commit -m "feat(api): logout via onSessionExpired callback when refresh fails"
```

---

## Task 3: Register `logout()` as the session-expired handler in the auth store

**Files:**
- Modify: `src/core/store/useAuthStore.ts` (after the `create(...)` block, ~line 238)
- Test: `src/core/store/__tests__/useAuthStore.session.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/store/__tests__/useAuthStore.session.test.ts`:

```ts
// src/core/store/__tests__/useAuthStore.session.test.ts
// Keep apiClient construction inert during import.
const mockStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => [] as string[]),
};
const mockPlatform = {
  isWeb: () => false, isMobile: () => true, isIOS: () => true, isAndroid: () => false,
  getPlatform: () => 'ios' as const, getVersion: () => '17.0',
};
jest.mock('../../../base/services/storage', () => ({
  StorageServiceFactory: { create: () => mockStorage, createAsync: async () => mockStorage },
}));
jest.mock('../../../base/services/platform', () => ({
  PlatformServiceFactory: { create: () => mockPlatform, createAsync: async () => mockPlatform },
}));

it('registers a session-expired handler that calls logout()', () => {
  const { apiClient } = require('../../../base/services/remote/apiClient');
  const setSpy = jest.spyOn(apiClient, 'setOnSessionExpired');

  // First import of the store runs the top-level registration.
  const { useAuthStore } = require('../useAuthStore');

  expect(setSpy).toHaveBeenCalledWith(expect.any(Function));
  const handler = setSpy.mock.calls[setSpy.mock.calls.length - 1][0] as () => void;

  const logoutSpy = jest
    .spyOn(useAuthStore.getState(), 'logout')
    .mockResolvedValue(undefined);

  handler();

  expect(logoutSpy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/core/store/__tests__/useAuthStore.session.test.ts`
Expected: FAIL. Nothing registers a handler yet, so `setSpy` is never called — `expect(setSpy).toHaveBeenCalledWith(...)` fails.

- [ ] **Step 3: Register the handler in the store**

In `src/core/store/useAuthStore.ts`, the store is created with `export const useAuthStore = create<AuthStore>((set, get) => { ... });` ending around line 238, followed by the `// Selectors` block. Add this registration immediately after the `create(...)` call closes and before `// Selectors`:

```ts
// When a token refresh fails (refresh token expired/invalid), the base-layer
// apiClient cannot import this store without a circular dependency, so it calls
// back through this registered handler to perform a real logout (resets state to
// signed-out; screens reading isAuthenticated re-render accordingly).
apiClient.setOnSessionExpired(() => {
  void useAuthStore.getState().logout();
});
```

(`apiClient` is already imported at `src/core/store/useAuthStore.ts:6`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/core/store/__tests__/useAuthStore.session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/store/useAuthStore.ts src/core/store/__tests__/useAuthStore.session.test.ts
git commit -m "feat(auth): wire apiClient session-expiry to useAuthStore.logout"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npx jest`
Expected: PASS — all suites green, including the two new test files and the existing ones.

- [ ] **Step 2: Lint the changed files**

Run: `npm run lint`
Expected: No new errors in `apiClient.ts` or `useAuthStore.ts`.

- [ ] **Step 3: Sanity-check the wiring by reading the diff**

Run: `git log --oneline -4 && git diff main --stat`
Expected: Four commits (docs spec from earlier + the three implementation commits, or three implementation commits on top of the spec commit). The diff touches only `apiClient.ts`, `useAuthStore.ts`, and the two new test files.

Confirm by inspection that:
- `performTokenRefresh` points at `${WebService.villageBaseURL}${AppAuthRoutes.refresh}` with `X-Refresh-Token` + `X-Store-Id` headers and no body / no `Authorization`.
- The 401 catch block calls `this.onSessionExpired?.()` (with `clearTokens()` fallback).
- `useAuthStore.ts` registers the handler exactly once at module load.

---

## Notes / Out of scope (per spec)

- No redirect-to-login, no toast — the chosen UX is "reset state, no redirect." `logout()` flips `isAuthenticated` to `false` and screens already render the signed-out UI.
- No event-emitter machinery — a single callback is sufficient.
- The login / OTP / signup flows are untouched.
- Concurrent 401s already share one refresh via the existing `refreshTokenPromise`; `logout()` is idempotent, so multiple simultaneous failures are safe.
