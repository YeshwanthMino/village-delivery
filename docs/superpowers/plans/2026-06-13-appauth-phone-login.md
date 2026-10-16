# AppAuth Phone Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mocked login in `LoginBottomSheet` with the real AppAuth API (phone → OTP → optional name → logged-in).

**Architecture:** A thin data module (`appAuthApi.ts`) wraps the four AppAuth endpoints over the existing `apiClient`, injecting the required `x-store-id` header from the selected village. `useAuthStore` gains real `requestOtp` / `verifyOtp` / `signupUser` actions that persist tokens via `apiClient.saveTokens` and load the profile via `/app/auth/me`. `LoginBottomSheet` wires its steps to those actions and adds a name-capture step for new users.

**Tech Stack:** React Native (Expo), Zustand, TanStack Query (existing), TypeScript.

**Note:** Automated tests are out of scope (per spec). Each task ends with a manual verification + commit.

---

## File Structure

- `src/base/constants/AppConstants.ts` (modify) — add AppAuth route path constants.
- `src/features/auth/data/appAuthApi.ts` (create) — endpoint wrappers + `parseTokens`.
- `src/core/store/useAuthStore.ts` (modify) — real auth actions, profile load.
- `src/features/auth/views/LoginBottomSheet.tsx` (modify) — wire real calls, add signup step.

Reference contract: `docs/superpowers/specs/2026-06-13-appauth-phone-login-design.md`.

---

## Task 1: AppAuth route constants

**Files:**
- Modify: `src/base/constants/AppConstants.ts` (after the `WebService` block, ~line 19)

- [ ] **Step 1: Add the route constants**

Insert immediately after the `WebService` object definition:

```ts
// AppAuth (customer app) endpoint paths — joined onto WebService.villageBaseURL.
export const AppAuthRoutes = {
  loginOtp: '/app/auth/login-otp',
  loginVerify: '/app/auth/login-verify',
  loginSignup: '/app/auth/login-signup',
  me: '/app/auth/me',
  refresh: '/app/auth/refresh',
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/AppConstants.ts
git commit -m "feat(auth): add AppAuth route path constants"
```

---

## Task 2: AppAuth data module

**Files:**
- Create: `src/features/auth/data/appAuthApi.ts`

- [ ] **Step 1: Create the module**

```ts
// src/features/auth/data/appAuthApi.ts
//
// AppAuth (customer) API: phone-OTP login / signup.
// Every endpoint requires the `x-store-id` header (the serviceable village's
// storeId); without it the server returns 404 "Store not found".

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService, AppAuthRoutes } from '@/src/base/constants/AppConstants';
import { AuthTokens } from '@/src/base/services/remote/apiTypes';

const BASE = WebService.villageBaseURL;

function storeOpts(storeId: string) {
  return { headers: { 'x-store-id': storeId } };
}

/**
 * Defensive token parse — mirrors apiClient.performTokenRefresh. The exact
 * login-verify/signup token JSON is undocumented in swagger, so accept either a
 * bare object or a `{ data }` wrapper. Returns null when no accessToken present
 * (drives the new-user branch in verifyLogin).
 */
export function parseTokens(resp: any): AuthTokens | null {
  const t = resp?.data ?? resp;
  if (!t || !t.accessToken) return null;
  return {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    tokenType: t.tokenType ?? 'Bearer',
    expiresIn: t.expiresIn ?? 0,
    userId: t.userId,
  };
}

export async function requestOtp(storeId: string, mobileNumber: string): Promise<void> {
  await apiClient.postWithoutAuth(
    `${BASE}${AppAuthRoutes.loginOtp}`,
    { mobileNumber },
    storeOpts(storeId),
  );
}

export type VerifyResult =
  | { status: 'ok'; tokens: AuthTokens }
  | { status: 'new_user' };

export async function verifyLogin(
  storeId: string,
  mobileNumber: string,
  otp: string,
): Promise<VerifyResult> {
  try {
    const resp = await apiClient.postWithoutAuth<any>(
      `${BASE}${AppAuthRoutes.loginVerify}`,
      { mobileNumber, otp },
      storeOpts(storeId),
    );
    console.log('[appAuth] login-verify raw:', JSON.stringify(resp));
    const tokens = parseTokens(resp);
    if (tokens) return { status: 'ok', tokens };
    // 2xx without tokens → unregistered number, needs signup.
    return { status: 'new_user' };
  } catch (err: any) {
    // Unregistered numbers may also surface as a 4xx (e.g. 404). Route to signup;
    // re-throw anything else (bad OTP should be 4xx too — see note below).
    const status = err?.statusCode;
    if (status && status >= 400 && status < 500) return { status: 'new_user' };
    throw err;
  }
}

export interface SignupInput {
  mobileNumber: string;
  otp: string;
  firstName: string;
  lastName: string;
}

export async function signup(storeId: string, input: SignupInput): Promise<AuthTokens> {
  const resp = await apiClient.postWithoutAuth<any>(
    `${BASE}${AppAuthRoutes.loginSignup}`,
    input,
    storeOpts(storeId),
  );
  console.log('[appAuth] login-signup raw:', JSON.stringify(resp));
  const tokens = parseTokens(resp);
  if (!tokens) throw new Error('Signup did not return a token');
  return tokens;
}

export async function getMe(storeId: string): Promise<any> {
  return apiClient.get<any>(`${BASE}${AppAuthRoutes.me}`, storeOpts(storeId));
}
```

> **Note on bad-OTP vs new-user:** both may arrive as a 4xx. The exact discriminator
> (status code / message) can only be confirmed on a real device once OTP SMS works.
> The `console.log` lines exist for that. If verify returns a specific "invalid otp"
> code, tighten `verifyLogin` to re-throw it instead of returning `new_user` — capture
> the real response first, then adjust. Until then the name step is the fallback.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/data/appAuthApi.ts
git commit -m "feat(auth): AppAuth API wrappers (otp/verify/signup/me)"
```

---

## Task 3: Real auth actions in the store

**Files:**
- Modify: `src/core/store/useAuthStore.ts`

- [ ] **Step 1: Update imports (top of file)**

Replace the existing import block at the top with:

```ts
/**
 * Auth Store - Zustand
 * Manages authentication state
 */
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import * as appAuth from '@/src/features/auth/data/appAuthApi';
import { create } from 'zustand';
```

- [ ] **Step 2: Update the `user` field type and the actions interface**

In `interface AuthState`, change:

```ts
  user: { id: string; phoneNumber: string } | null;
```
to:
```ts
  user: any | null;
```

In `interface AuthActions`, replace the line:

```ts
  login: (phoneNumber: string, otp: string) => Promise<void>;
```
with:
```ts
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<'ok' | 'new_user'>;
  signupUser: (
    phoneNumber: string,
    otp: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
```

- [ ] **Step 3: Add module-level helpers (above `export const useAuthStore`)**

```ts
function requireStoreId(): string {
  const storeId = useLocationStore.getState().serviceableVillage?.storeId;
  if (!storeId) throw new Error('Select your location first');
  return storeId;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}
```

- [ ] **Step 4: Replace the mock `login` action with the real actions**

In the store body, delete the entire `login: async (phoneNumber, otp) => { ... }` block and insert:

```ts
  requestOtp: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      await appAuth.requestOtp(requireStoreId(), phoneNumber);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  verifyOtp: async (phoneNumber: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appAuth.verifyLogin(requireStoreId(), phoneNumber, otp);
      if (result.status === 'ok') {
        await finalizeAuth(result.tokens);
        return 'ok';
      }
      set({ isLoading: false });
      return 'new_user';
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  signupUser: async (phoneNumber, otp, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await appAuth.signup(requireStoreId(), {
        mobileNumber: phoneNumber,
        otp,
        firstName,
        lastName,
      });
      await finalizeAuth(tokens);
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },
```

- [ ] **Step 5: Add the `finalizeAuth` closure inside `create`**

Inside `create<AuthStore>((set, get) => { ... })`, BEFORE the `return { ... }` of actions
is not how this store is written — it uses an object literal directly. So instead, add this
helper as a `const` at the very top of the `create` callback body, immediately after the
`create<AuthStore>((set, get) => (` opening. Because this store returns an object literal,
convert it to a block body:

Change:
```ts
export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
```
to:
```ts
export const useAuthStore = create<AuthStore>((set, get) => {
  const finalizeAuth = async (tokens: import('@/src/base/services/remote/apiTypes').AuthTokens) => {
    await apiClient.saveTokens(tokens);
    let profile: any = null;
    try {
      profile = await appAuth.getMe(requireStoreId());
    } catch (e) {
      console.warn('getMe failed after auth:', e);
    }
    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: profile,
      isLoading: false,
      error: null,
    });
  };

  return {
  ...initialState,
```

Then at the very end of the store object (after the `reset:` action), close both the object
and the function. Change:
```ts
  reset: () => set(initialState),
}));
```
to:
```ts
  reset: () => set(initialState),
  };
});
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (If TS complains about the inline `import(...)` type, add
`import { AuthTokens } from '@/src/base/services/remote/apiTypes';` to the top imports and
use `tokens: AuthTokens` instead.)

- [ ] **Step 7: Commit**

```bash
git add src/core/store/useAuthStore.ts
git commit -m "feat(auth): real OTP login/signup actions in auth store"
```

---

## Task 4: Wire LoginBottomSheet to real auth + add signup step

**Files:**
- Modify: `src/features/auth/views/LoginBottomSheet.tsx`

- [ ] **Step 1: Extend the Step type**

Change:
```ts
type Step = 'phone' | 'otp' | 'placing' | 'success';
```
to:
```ts
type Step = 'phone' | 'otp' | 'signup' | 'placing' | 'success';
```

- [ ] **Step 2: Add an error prop to PhoneStep**

In `interface PhoneStepProps`, add:
```ts
  error: string | null;
```

In the `PhoneStep` component signature, destructure `error`:
```ts
const PhoneStep = ({ phone, setPhone, onSubmit, onClose, busy, onSimPick, error }: PhoneStepProps) => {
```

Inside PhoneStep, immediately AFTER the closing `</View>` of the phone input row
(`{valid && ( ... )}` block's parent `<View style={[s.phoneRow ...]}>`), add an error line:
```tsx
      {error && <Text style={[s.errorText, { marginTop: 8 }]}>{error}</Text>}
```

- [ ] **Step 3: Add the SignupStep component**

Insert this component definition immediately BEFORE `// ─── Placing Step ───`:

```tsx
// ─── Signup Step ──────────────────────────────────────────────────────────────

interface SignupStepProps {
  phone: string;
  onBack: () => void;
  onSubmit: (firstName: string, lastName: string) => void;
  busy: boolean;
  error: string | null;
}

const SignupStep = ({ phone, onBack, onSubmit, busy, error }: SignupStepProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const valid = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <View style={s.stepContainer}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#334155" strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={s.badge}>
          <Text style={s.badgeText}>CREATE ACCOUNT</Text>
        </View>
        <View style={s.iconBtn} />
      </View>

      <Text style={s.title}>Tell us your name</Text>
      <Text style={s.subtitle}>
        New here — we just need your name to set up{' '}
        <Text style={s.phoneBold}>+91 {formatPhone(phone)}</Text>.
      </Text>

      <View style={[s.phoneRow, { marginTop: 16 }, firstName.trim() && s.phoneRowValid]}>
        <TextInput
          style={[s.phoneInput, { paddingLeft: 14 }]}
          placeholder="First name"
          placeholderTextColor="#94a3b8"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          returnKeyType="next"
          editable={!busy}
        />
      </View>

      <View style={[s.phoneRow, { marginTop: 12 }, lastName.trim() && s.phoneRowValid]}>
        <TextInput
          style={[s.phoneInput, { paddingLeft: 14 }]}
          placeholder="Last name"
          placeholderTextColor="#94a3b8"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          returnKeyType="done"
          editable={!busy}
          onSubmitEditing={() => valid && !busy && onSubmit(firstName.trim(), lastName.trim())}
        />
      </View>

      <View style={{ minHeight: 18, marginTop: 6 }}>
        {error && <Text style={s.errorText}>{error}</Text>}
      </View>

      <TouchableOpacity
        onPress={() => onSubmit(firstName.trim(), lastName.trim())}
        disabled={!valid || busy}
        style={[s.cta, valid && !busy ? s.ctaActive : s.ctaDisabled]}
        activeOpacity={0.88}
      >
        <Text style={[s.ctaText, valid && !busy ? s.ctaTextActive : s.ctaTextDisabled]}>
          {busy ? 'Creating account…' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 4: Replace the container component's state + handlers**

In `LoginBottomSheet`, replace the state declarations and the two handlers
(`handlePhoneSubmit`, `handleVerified`) plus the `login` selector. Find this region:

```ts
  const [step, setStep] = useState<Step>(initialStep);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const login = useAuthStore(state => state.login);
```

Replace with:

```ts
  const [step, setStep] = useState<Step>(initialStep);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const requestOtp = useAuthStore(state => state.requestOtp);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const signupUser = useAuthStore(state => state.signupUser);
```

Then in the `useEffect(() => { if (visible) {...} }, [visible])` reset block, replace its body with:

```ts
    if (visible) {
      setStep(initialStep);
      setSending(false);
      setVerifying(false);
      setSigningUp(false);
      setPhoneError(null);
      setOtpError(null);
      setSignupError(null);
      if (initialStep === 'placing') {
        setTimeout(() => setStep('success'), 1200);
      }
    }
```

Replace `handlePhoneSubmit`:

```ts
  const handlePhoneSubmit = async () => {
    if (phone.length !== 10) return;
    setSending(true);
    setPhoneError(null);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : 'Could not send OTP. Try again.');
    } finally {
      setSending(false);
    }
  };
```

Replace `handleVerified`:

```ts
  const handleVerified = async (code: string) => {
    setVerifying(true);
    setOtpError(null);
    setOtp(code);
    try {
      const result = await verifyOtp(phone, code);
      if (result === 'ok') {
        setStep('placing');
        setTimeout(() => setStep('success'), 1200);
      } else {
        setStep('signup');
      }
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignup = async (firstName: string, lastName: string) => {
    setSigningUp(true);
    setSignupError(null);
    try {
      await signupUser(phone, otp, firstName, lastName);
      setStep('placing');
      setTimeout(() => setStep('success'), 1200);
    } catch (e) {
      setSignupError(e instanceof Error ? e.message : 'Could not create account. Try again.');
    } finally {
      setSigningUp(false);
    }
  };
```

- [ ] **Step 5: Render the new step + pass new props**

Update `preventClose`:
```ts
  const preventClose = step === 'placing' || step === 'success';
```
(unchanged — confirm it stays this way).

In the JSX, pass `error={phoneError}` to `<PhoneStep .../>`:
```tsx
      {step === 'phone' && (
        <PhoneStep
          phone={phone}
          setPhone={setPhone}
          onSubmit={handlePhoneSubmit}
          onClose={onClose}
          busy={sending}
          onSimPick={num => setPhone(num)}
          error={phoneError}
        />
      )}
```

Add the signup branch after the `otp` branch:
```tsx
      {step === 'signup' && (
        <SignupStep
          phone={phone}
          onBack={() => { setStep('otp'); setSignupError(null); }}
          onSubmit={handleSignup}
          busy={signingUp}
          error={signupError}
        />
      )}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Manual verification (device/simulator with a serviceable location selected)**

1. Open the app, select a serviceable village (so `storeId` is set), add an item, go to cart → trigger `LoginBottomSheet`.
2. Enter a 10-digit number → "Continue". Confirm a real OTP request fires (check Metro logs for the network call; if the store has no WhatsApp creds you'll see the backend error surfaced under the phone field — that still proves the call wired through).
3. With a registered number + correct OTP → expect `ok` → placing → success.
4. With an unregistered number + correct OTP → expect the **name step**, then account creation → placing → success.
5. Check Metro console for `[appAuth] login-verify raw:` / `login-signup raw:` to confirm the real token JSON; if the shape differs from `parseTokens` assumptions, adjust `parseTokens`.
6. Without a location selected → expect inline error "Select your location first".

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/views/LoginBottomSheet.tsx
git commit -m "feat(auth): wire LoginBottomSheet to real AppAuth + signup step"
```

---

## Post-implementation follow-ups (not in this plan)
- Confirm real token JSON via the logged responses; tighten `parseTokens` and the
  bad-OTP-vs-new-user discriminator in `verifyLogin` once a real response is captured.
- Wire `/app/auth/refresh` into the global 401-retry (currently uses `/v1/refresh-token`).
- Optional signup fields (email, villageId, etc.).
