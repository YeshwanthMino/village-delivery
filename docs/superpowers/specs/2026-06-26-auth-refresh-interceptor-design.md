# Auth Refresh Interceptor + Logout on Refresh Failure

**Date:** 2026-06-26
**Status:** Approved — ready for implementation plan

## Problem

`apiClient.request()` already has the structural shape of a 401 interceptor
(`src/base/services/remote/apiClient.ts:153-168`): on a 401 it calls refresh,
retries the original request once, and on refresh failure clears tokens. But two
defects make it effectively non-functional:

1. **Wrong refresh contract.** `performTokenRefresh()`
   (`apiClient.ts:204-226`) calls the legacy endpoint
   `${WebService.villageService}v1/refresh-token` with a JSON body
   `{ refreshToken }`. The real customer-app endpoint is
   `${villageBaseURL}/app/auth/refresh` (`AppAuthRoutes.refresh`) and takes the
   refresh token via the `X-Refresh-Token` header — not a body. As a result
   refresh fails for every 401, so a single expired access token effectively
   logs the user out instead of silently refreshing.

2. **"Logout" is not a real logout.** On refresh failure the code calls
   `apiClient.clearTokens()`, which only wipes storage token keys. It does NOT
   reset `useAuthStore` (so `isAuthenticated` stays `true`), does not clear the
   cached profile/username, and routes the user nowhere. The genuine logout path
   is `useAuthStore.logout()`.

The constraint that forces a small design choice: `apiClient` lives in the base
layer and `useAuthStore` already imports `apiClient`. The client cannot import
the store back without a circular dependency.

## Goal

A working 401 → refresh → retry interceptor whose refresh failure triggers a
genuine logout, reusing the interceptor and the auth store logic already present.

## Refresh request contract

Derived from the real API call:

- `POST {villageBaseURL}{AppAuthRoutes.refresh}` (`/app/auth/refresh`)
- Headers:
  - `X-Refresh-Token: <stored refresh token>`
  - `X-Store-Id: <active store id>` (reuse existing `getStoreId()`)
- **No** `Authorization` header (the expired access token is deliberately NOT
  sent).
- **No** request body.
- Sent with `withAuth: false` so the interceptor cannot recurse into itself.

Response parsing is unchanged: tolerate either a bare object or a `{ data }`
wrapper, default `tokenType` to `Bearer`, then `saveTokens()`.

## Logout UX on refresh failure

**Decision: reset state, no redirect.** On refresh failure the app calls the
existing `useAuthStore.logout()`, which clears credentials + cached profile +
username and resets state to `initialState` (`isAuthenticated: false`). Screens
that read `isAuthenticated` already render the signed-out UI conditionally, so
they re-render automatically. The user stays on the current screen — no
navigation, no toast. This matches the existing Profile logout button behavior.

## Design

### 1. Correct the refresh contract (`apiClient.performTokenRefresh`)

- Read the refresh token and store id from storage. If no refresh token, throw
  immediately (drives the logout path).
- Issue the refresh request per the contract above (header-based, no body,
  `withAuth: false`).
- Parse tokens with the existing tolerant logic and `saveTokens()`.
- Leave the dedup logic (`refreshTokenPromise` in `refreshAccessToken()`)
  unchanged — concurrent 401s continue to share a single in-flight refresh.

### 2. Real logout via a registered callback (decouples base ← store)

- Add to `apiClient`:
  - `private onSessionExpired: (() => void) | null = null`
  - `setOnSessionExpired(cb: () => void): void`
- In the 401 catch block (`apiClient.ts:164-167`), replace the bare
  `clearTokens()` with: call `this.onSessionExpired?.()` if registered, else
  fall back to `clearTokens()`. Then throw the mapped error so the in-flight
  caller still rejects.
- In `useAuthStore.ts`, after `create(...)`, register:
  `apiClient.setOnSessionExpired(() => { void useAuthStore.getState().logout(); })`.
  No new import cycle — `useAuthStore` already imports `apiClient`.

### 3. Resulting flow

- Authed request → 401 → interceptor calls `/app/auth/refresh` once → on success
  retries the original request with the new bearer token and returns its result
  transparently (caller never observes the 401).
- Refresh fails → `onSessionExpired()` runs `logout()` → state resets to
  signed-out; the original request rejects with the mapped auth error → UI shows
  the signed-out state.

## Edge cases

- **Concurrent 401s:** single shared refresh promise; on failure each request
  rejects and `logout()` is idempotent.
- **No refresh token stored:** `performTokenRefresh` throws immediately → logout
  path.
- **No infinite loop:** the refresh call is `withAuth: false` and the retry is
  guarded by `_retry`, so neither re-enters the interceptor.
- **`withAuth: false` calls** (login OTP, verify, signup, refresh itself) never
  enter the interceptor.

## Testing

Exact harness form is set by the existing test setup; the verifiable behaviors:

1. 401 then 200-on-retry returns data without logging out.
2. The refresh request sends `X-Refresh-Token` + `X-Store-Id`, and sends neither
   an `Authorization` header nor a body.
3. A failed refresh (e.g. 401) triggers `logout()`; `isAuthenticated` becomes
   `false`.
4. `withAuth: false` requests bypass the interceptor entirely.

## Out of scope

- No global navigation guard / redirect-to-login (per the chosen UX).
- No toast or session-expired messaging.
- No event-emitter / multi-listener session machinery (single callback only).
- No changes to the login / OTP / signup flows.

## Files touched

- `src/base/services/remote/apiClient.ts` — refresh contract +
  `setOnSessionExpired` + 401 catch block.
- `src/core/store/useAuthStore.ts` — register the session-expired callback.
- `src/base/constants/AppConstants.ts` — reference `AppAuthRoutes.refresh`
  (already present; only ensure it is used).
