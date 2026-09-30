# Persist Logged-In User Across App Restarts

**Date:** 2026-06-21
**Status:** Approved (pending spec review)

## Problem

Login currently survives an app close/reopen at the *token* level — `checkExistingAuth()`
(run on app start in `AppScreen`) restores the access token and sets
`isAuthenticated = true`. But the `user` profile (name, phone from `/app/auth/me`) is
never persisted:

- `finalizeAuth()` fetches the profile via `getMe` into the in-memory Zustand store but
  never writes it to `StoredPrefs`.
- `checkExistingAuth()` restores only tokens, leaving `user = null`.

Result: after a restart the user stays signed in, but `ProfileScreen` shows the greeting
**without their name** until the next fresh login.

Secondary issue: `logout()` calls `StoredPrefs.clearAll()`, wiping the *entire* storage —
including saved locale and the selected serviceable village/location. Sign-out should not
reset the user's location.

`ProfileScreen` already renders the name and a sign-out button correctly; it just breaks
because `user` is empty after restart. No UI changes required.

## Design

Restore strategy: **cache + background refresh** — show the cached name instantly on
launch, then silently re-fetch `/app/auth/me` to keep it current.

### 1. Persist profile on login
In `finalizeAuth(tokens)`, after a successful `getMe`, persist the profile:
```
await StoredPrefs.setUserProfile(profile);
```
(`StoredPrefs.getUserProfile/setUserProfile` already exist, keyed `village_user_profile`.)

### 2. Restore + refresh on app start
In `checkExistingAuth()`, when an access token exists:
- Load the cached profile via `StoredPrefs.getUserProfile()` and set it into `user`
  immediately (so the name shows instantly, even offline).
- Then, in the background, call `getMe(storeId)` to refresh; on success update `user` and
  re-save via `setUserProfile`. Failures are swallowed (cached value remains).

Note: the background refresh needs a store id, which comes from
`useLocationStore.getState().serviceableVillage?.storeId`. If no store id is available
yet (location not hydrated), skip the refresh and keep the cached value — do not throw.

### 3. Fix logout to preserve location/locale
Replace `StoredPrefs.clearAll()` in `logout()` with `StoredPrefs.clearCredentials()`
(clears access/refresh token, token type, and user profile only), then reset the auth
store. Locale and selected location survive sign-out.

## Implementation note
The auth store gained a top-level `mobileNumber` field (persisted via
`StoredPrefs.getUsername/setUsername`) during implementation. `ProfileScreen` uses it as
the phone fallback (`user.mobileNumber || user.phoneNumber || mobileNumber`), and the
signed-in view now shows the phone number as the detail line in place of the generic
marketing subtitle. Logout also clears the saved username alongside `clearCredentials()`.

## Out of scope
- No UI/visual changes to `ProfileScreen`.
- No change to the login/OTP flow itself.
- No typed `User` model refactor (the store keeps `user: any` for now).

## Testing
- Log in → fully close app → reopen → ProfileScreen shows the name immediately.
- Reopen while offline → cached name still shows.
- Sign out → confirm selected location and locale persist; auth state cleared.
