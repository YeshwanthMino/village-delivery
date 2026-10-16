# AppAuth Phone Login — Design Spec

**Date:** 2026-06-13
**Branch:** feat/address-location-flow
**Goal:** Replace the mocked login in `LoginBottomSheet` with the real AppAuth API
(`https://ub7mvw9ks.bizzz.in`), giving a Zepto/Blinkit-style phone → OTP → (name) → logged-in flow.

## API Contract (verified against live swagger `/api-json`)

Base URL: `WebService.villageBaseURL` (`https://ub7mvw9ks.bizzz.in`).
**Every endpoint requires header `x-store-id: <serviceableVillage.storeId>`** — without it the
server returns `404 {"message":"Store not found"}`. Same keying as the existing `/app/page-layout`.

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/app/auth/login-otp` | `{ mobileNumber }` | Send OTP to number |
| POST | `/app/auth/login-verify` | `{ mobileNumber, otp }` | Verify OTP → tokens (existing user) or new-user signal |
| POST | `/app/auth/login-signup` | `{ firstName, lastName, mobileNumber, otp, email?, householdId?, alias?, villageId?, active?, customFields? }` | Create account → tokens |
| GET | `/app/auth/me` | — (bearer) | Current user profile |
| POST | `/app/auth/refresh` | (undocumented; empty in swagger) | Token refresh — follow-up only |

`mobileNumber` = 10-digit string. `otp` = string.

**Unverified live:** exact token JSON of `login-verify`/`login-signup`, and how a new
(unregistered) number is signalled. No serviceable village was reachable to probe, and
`login-verify` sends a real SMS. Handled by defensive parsing + raw-response logging (below).

## Components

### 1. `src/features/auth/data/appAuthApi.ts` (new)
Thin functions over `apiClient`. Each accepts `storeId` and injects `x-store-id`.
- `requestOtp(storeId, mobileNumber)` → `postWithoutAuth('/app/auth/login-otp', …)`
- `verifyLogin(storeId, mobileNumber, otp)` → `postWithoutAuth('/app/auth/login-verify', …)`,
  returns a discriminated result `{ status: 'ok', tokens } | { status: 'new_user' }`.
  New-user branch chosen when the response carries no usable tokens, or verify throws a
  4xx / "not found"-style error.
- `signup(storeId, { mobileNumber, otp, firstName, lastName })` → `postWithoutAuth('/app/auth/login-signup', …)` → tokens.
- `getMe(storeId)` → authed `get('/app/auth/me')`.
- `refresh(storeId)` stub for `/app/auth/refresh` — present but not wired into the global retry.
- `parseTokens(resp)` helper: mirrors `apiClient.performTokenRefresh` —
  `const t = resp?.data ?? resp` then pick `accessToken`, `refreshToken`, `tokenType`,
  `expiresIn`, `userId`. Returns `null` when no `accessToken` present (drives the new-user branch).
- `console.log` the raw verify/signup responses so the real shape can be confirmed on device.

### 2. `src/core/store/useAuthStore.ts` (edit)
Replace the mock `login`. Add real actions, each reading
`useLocationStore.getState().serviceableVillage?.storeId` and throwing a clear error
(`"Select your location first"`) when absent:
- `requestOtp(phone)`
- `verifyOtp(phone, otp)` → returns `'ok' | 'new_user'`
- `signup(phone, otp, firstName, lastName)`

On token success: `apiClient.saveTokens(tokens)` → `getMe()` → `setUser` → `setAuthenticated(true)`.
`checkExistingAuth` stays as-is (token-presence based).

### 3. `src/features/auth/views/LoginBottomSheet.tsx` (edit)
Add a `'signup'` step (firstName / lastName capture) and wire real calls. New `Step` union:
`'phone' | 'otp' | 'signup' | 'placing' | 'success'`.
- **phone submit** → `requestOtp(phone)` (replaces the 600 ms fake); real "Sending OTP…" + error surface.
- **otp filled** → `verifyOtp(phone, otp)`:
  - `'ok'` → `placing` → `success` (existing checkout behaviour)
  - `'new_user'` → `signup` step
- **signup submit** → `signup(phone, otp, firstName, lastName)` → `placing` → `success`.
- **resend** → real `requestOtp`.
- **guard:** missing `storeId` → inline error "Select your location first", block submit.

### 4. `src/base/constants/AppConstants.ts` (edit)
Add AppAuth path constants (e.g. `AppAuthRoutes = { loginOtp, loginVerify, loginSignup, me, refresh }`)
to avoid string literals in the data layer.

## Data Flow
```
PhoneStep ──requestOtp──▶ OTP sent
OtpStep ──verifyOtp──▶ ok ──────────────▶ saveTokens + getMe ─▶ authenticated ─▶ placing/success
                    └─ new_user ─▶ SignupStep ──signup──▶ saveTokens + getMe ─▶ authenticated ─▶ placing/success
```
`storeId` flows from `useLocationStore.serviceableVillage.storeId` into every call's `x-store-id`.

## Error Handling
- No `storeId` → blocked with "Select your location first".
- `requestOtp` failure → error under phone CTA, stay on phone step.
- `verifyOtp` invalid OTP → reuse existing OTP error UI (boxes reset).
- `signup` failure → error on signup step.
- Network/timeout → existing `ErrorMapper` messages bubble through `apiClient`.

## Out of Scope
- Global 401-retry still uses the existing `/v1/refresh-token`; AppAuth `/app/auth/refresh`
  wiring is a follow-up (body shape undocumented).
- Optional signup fields (email, householdId, alias, villageId, customFields) — not collected.
- Automated tests.
