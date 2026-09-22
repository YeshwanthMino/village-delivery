# Push Notifications (Firebase + APNs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate native push notifications (FCM device token on Android, raw APNs token on iOS) via `expo-notifications` — permission request gated behind an in-app sheet (mirroring the existing location-permission UX), foreground/background notification handling, and tap-to-deep-link navigation.

**Architecture:** A new `src/features/notifications/` feature module (data/domain/viewmodel/lifecycle/views) plus a `useNotificationStore` in `src/core/store/`, wired into `AppScreen` (lifecycle hook) and `HomeScreen` (permission sheet, sequenced after the location flow settles). No backend call — token is fetched and cached locally only.

**Tech Stack:** `expo-notifications` (SDK ~55), zustand, expo-router, existing `VillageBottomSheet`/translation infra.

**Spec:** `docs/superpowers/specs/2026-09-22-push-notifications-design.md`

**Deviation from the written spec, decided during planning:** the spec's "wire into `useAuthStore.finalizeAuth`" idea (written before the location-pattern correction later in the same conversation) is dropped. Since permission is now sheet-gated from `HomeScreen` rather than auto-requested, and every login lands the user on Home, `HomeScreen`'s own focus-based gate already covers the post-login case with no separate trigger needed — adding one in `useAuthStore` would risk a double-open race. `useAuthStore.ts` is not touched by this plan.

---

### Task 1: Shared known-routes constant (extracted from `AppScreen.tsx`)

Hoists the route allowlist that `AppScreen.tsx` already has inline into a shared, tested module, so the notification tap handler (Task 6) can validate against the same list without duplicating it.

**Files:**
- Create: `src/features/initialization/domain/knownRoutes.ts`
- Test: `src/features/initialization/domain/__tests__/knownRoutes.test.ts`
- Modify: `src/features/initialization/views/screens/AppScreen/AppScreen.tsx:50-56`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/initialization/domain/__tests__/knownRoutes.test.ts

import { KNOWN_ROOT_ROUTES, isKnownRoute, rootSegment } from '../knownRoutes';

describe('rootSegment', () => {
  it('extracts the root segment from a bare path', () => {
    expect(rootSegment('/cart')).toBe('cart');
  });

  it('extracts the root segment ignoring a query string', () => {
    expect(rootSegment('/order-detail?orderId=123')).toBe('order-detail');
  });

  it('extracts the root segment from a nested path', () => {
    expect(rootSegment('/location/search')).toBe('location');
  });

  it('extracts a group segment unchanged', () => {
    expect(rootSegment('/(dashboard)/home')).toBe('(dashboard)');
  });

  it('returns an empty string for an empty or root-only path', () => {
    expect(rootSegment('')).toBe('');
    expect(rootSegment('/')).toBe('');
  });
});

describe('isKnownRoute', () => {
  it('accepts every route in the known list', () => {
    for (const root of KNOWN_ROOT_ROUTES) {
      expect(isKnownRoute(`/${root}`)).toBe(true);
    }
  });

  it('accepts a known root with a nested path and query string', () => {
    expect(isKnownRoute('/order-detail?orderId=123')).toBe(true);
  });

  it('rejects an unknown route', () => {
    expect(isKnownRoute('/not-a-real-route')).toBe(false);
  });

  it('rejects an empty path', () => {
    expect(isKnownRoute('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/initialization/domain/__tests__/knownRoutes.test.ts`
Expected: FAIL — `Cannot find module '../knownRoutes'`

- [ ] **Step 3: Write the implementation**

```ts
// src/features/initialization/domain/knownRoutes.ts
//
// Root-level route segments the app's Stack navigator actually renders
// (app/_layout.tsx's <Stack.Screen> list). Shared between AppScreen (bouncing
// an unknown root to home on launch) and the push notification tap handler
// (validating a payload's route before navigating).

export const KNOWN_ROOT_ROUTES = [
  '(dashboard)', 'auth', 'search', 'location', 'address',
  'category-details', 'cart', 'top-picks', 'order-detail',
  'product', 'about',
] as const;

/** Extracts the root segment: "/order-detail?orderId=1" -> "order-detail". */
export function rootSegment(path: string): string {
  const withoutQuery = path.split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  return segments[0] ?? '';
}

export function isKnownRoute(path: string): boolean {
  const root = rootSegment(path);
  return (KNOWN_ROOT_ROUTES as readonly string[]).includes(root);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/initialization/domain/__tests__/knownRoutes.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Replace the inline allowlist in `AppScreen.tsx` with the shared constant**

In `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`, add the import:

```ts
import { KNOWN_ROOT_ROUTES } from '@/src/features/initialization/domain/knownRoutes';
```

Replace this block (currently lines 50-56):

```ts
    // Keep known routes; bounce unknown roots to home.
    const allowed = [
      '(dashboard)', 'auth', 'search', 'location', 'address',
      'category-details', 'cart', 'top-picks', 'order-detail',
      'product', 'about',
    ];
    if (!root || !allowed.includes(root)) {
```

with:

```ts
    // Keep known routes; bounce unknown roots to home.
    const allowed: readonly string[] = KNOWN_ROOT_ROUTES;
    if (!root || !allowed.includes(root)) {
```

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npm test -- --silent`
Expected: same pass count as the pre-existing baseline (53 suites passing, 1 skipped, 0 failing)

- [ ] **Step 7: Commit**

```bash
git add src/features/initialization/domain/knownRoutes.ts \
        src/features/initialization/domain/__tests__/knownRoutes.test.ts \
        src/features/initialization/views/screens/AppScreen/AppScreen.tsx
git commit -m "refactor(init): extract known-routes allowlist into a shared, tested module"
```

---

### Task 2: Install `expo-notifications` and add its config plugin

**Files:**
- Modify: `package.json` (via `expo install`, do not hand-edit the version)
- Modify: `app.json`

- [ ] **Step 1: Install the package with the Expo-compatible version**

Run: `npx expo install expo-notifications`
Expected: adds `expo-notifications` to `package.json` `dependencies` at a version compatible with Expo SDK ~55.

- [ ] **Step 2: Add the config plugin to `app.json`**

In `app.json`, the `expo.plugins` array currently ends with:

```json
      "expo-image"
    ],
```

Change it to:

```json
      "expo-image",
      "expo-notifications"
    ],
```

- [ ] **Step 3: Verify the app config parses**

Run: `npx expo config --type public --json > /tmp/expo-config-check.json && node -e "const c = require('/tmp/expo-config-check.json'); console.log(c.plugins ? c.plugins.length : c._internal ? 'ok' : 'ok')"`
Expected: no error thrown (the config plugin resolves without crashing `expo config`)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add expo-notifications dependency and config plugin"
```

Note for later (not part of this plan, flagged for you to do manually — see the spec's "Native / EAS configuration" section): before a build with working push actually reaches a device, an APNs key (iOS) and an FCM v1 service-account JSON (Android) need to be uploaded via `eas credentials`. That's an EAS Dashboard/CLI step, not code, and isn't part of this task list.

---

### Task 3: `NotificationService` — thin wrapper over `expo-notifications`

Mirrors `src/features/location/data/LocationService.ts`'s shape and naming (`PermissionState`/`getPermissionState`/`requestPermission`), so anyone who's read the location code recognizes this immediately. Not unit tested — same call made for `LocationService`/`useLocationLifecycle` today: this is thin native glue, and its correctness is exercised on-device, not in Jest.

**Files:**
- Create: `src/features/notifications/data/NotificationService.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/features/notifications/data/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { logger } from '@/src/base/services/logger';

export type PushPermissionState = 'granted' | 'denied' | 'undetermined';

export interface PushPermissionResult {
  granted: boolean;
  /** False once the OS will no longer show the system dialog (permanently denied). */
  canAskAgain: boolean;
}

export const NotificationService = {
  async getPermissionState(): Promise<PushPermissionState> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PushPermissionState;
  },

  /**
   * Request permission. When already permanently denied the OS resolves
   * immediately without showing a dialog, so the caller can branch on
   * `canAskAgain` — same contract as LocationService.requestPermission.
   */
  async requestPermission(): Promise<PushPermissionResult> {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
  },

  /**
   * Native device push token: the raw FCM registration token on Android, the
   * raw APNs token on iOS. Not an Expo push token — nothing here talks to
   * Expo's push relay service. Returns null (never throws) on failure, e.g. no
   * network, or a simulator/emulator without push capability.
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      const result = await Notifications.getDevicePushTokenAsync();
      return result.data ?? null;
    } catch (e) {
      // Never log the token itself (see logger.ts) — only that the fetch failed.
      logger.warn('[PUSH] getDeviceToken failed:', e instanceof Error ? e.message : e);
      return null;
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/notifications/data/NotificationService.ts
git commit -m "feat(notifications): add NotificationService wrapper over expo-notifications"
```

---

### Task 4: Storage key for the cached device token

**Files:**
- Modify: `src/base/constants/AppConstants.ts`

- [ ] **Step 1: Add the key**

In `src/base/constants/AppConstants.ts`, inside the `StorageKeys` object, add a new group after the existing `// Location` group (after `RECENT_LOCATIONS: 'recent_locations',`):

```ts
  // Push notifications
  PUSH_DEVICE_TOKEN: 'push_device_token',
```

- [ ] **Step 2: Commit**

```bash
git add src/base/constants/AppConstants.ts
git commit -m "chore: add PUSH_DEVICE_TOKEN storage key"
```

---

### Task 5: `notificationPayload` — pure payload parsing (domain)

**Files:**
- Create: `src/features/notifications/domain/notificationPayload.ts`
- Test: `src/features/notifications/domain/__tests__/notificationPayload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/notifications/domain/__tests__/notificationPayload.test.ts

import { parseNotificationPayload } from '../notificationPayload';

describe('parseNotificationPayload', () => {
  it('extracts a string route', () => {
    expect(parseNotificationPayload({ route: '/order-detail?orderId=1' }))
      .toEqual({ route: '/order-detail?orderId=1' });
  });

  it('ignores unrelated fields on the payload', () => {
    expect(parseNotificationPayload({ route: '/cart', orderId: '1', title: 'Hi' }))
      .toEqual({ route: '/cart' });
  });

  it('returns an empty object when route is missing', () => {
    expect(parseNotificationPayload({})).toEqual({});
    expect(parseNotificationPayload({ orderId: '1' })).toEqual({});
  });

  it('returns an empty object when data is null or undefined', () => {
    expect(parseNotificationPayload(null)).toEqual({});
    expect(parseNotificationPayload(undefined)).toEqual({});
  });

  it('returns an empty object when data is not an object', () => {
    expect(parseNotificationPayload('/cart')).toEqual({});
    expect(parseNotificationPayload(42)).toEqual({});
  });

  it('returns an empty object when route is not a string', () => {
    expect(parseNotificationPayload({ route: 123 })).toEqual({});
    expect(parseNotificationPayload({ route: { path: '/cart' } })).toEqual({});
    expect(parseNotificationPayload({ route: null })).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/notifications/domain/__tests__/notificationPayload.test.ts`
Expected: FAIL — `Cannot find module '../notificationPayload'`

- [ ] **Step 3: Write the implementation**

```ts
// src/features/notifications/domain/notificationPayload.ts
//
// Parses an incoming push notification's data payload into the one field the
// app currently acts on. The payload shape is producer-controlled (whatever
// sends the push), so every field is treated as untrusted/unknown.

export interface NotificationPayload {
  route?: string;
}

export function parseNotificationPayload(data: unknown): NotificationPayload {
  if (!data || typeof data !== 'object') return {};
  const route = (data as Record<string, unknown>).route;
  return typeof route === 'string' ? { route } : {};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/notifications/domain/__tests__/notificationPayload.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/domain/notificationPayload.ts \
        src/features/notifications/domain/__tests__/notificationPayload.test.ts
git commit -m "feat(notifications): add pure notification payload parser"
```

---

### Task 6: `resolveNotificationRoute` — tap → route decision (pure) + router glue

**Files:**
- Create: `src/features/notifications/lifecycle/handleNotificationResponse.ts`
- Test: `src/features/notifications/lifecycle/__tests__/handleNotificationResponse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/notifications/lifecycle/__tests__/handleNotificationResponse.test.ts

import { NOTIFICATION_FALLBACK_ROUTE, resolveNotificationRoute } from '../handleNotificationResponse';

describe('resolveNotificationRoute', () => {
  it('navigates to an allowlisted route with its query string intact', () => {
    expect(resolveNotificationRoute({ route: '/order-detail?orderId=123' }))
      .toBe('/order-detail?orderId=123');
  });

  it('navigates to an allowlisted group route', () => {
    expect(resolveNotificationRoute({ route: '/(dashboard)/home' }))
      .toBe('/(dashboard)/home');
  });

  it('falls back to home for an unknown route', () => {
    expect(resolveNotificationRoute({ route: '/not-a-real-route' }))
      .toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when the payload has no route', () => {
    expect(resolveNotificationRoute({})).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when data is null or undefined', () => {
    expect(resolveNotificationRoute(null)).toBe(NOTIFICATION_FALLBACK_ROUTE);
    expect(resolveNotificationRoute(undefined)).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when route is not a string', () => {
    expect(resolveNotificationRoute({ route: 123 })).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/notifications/lifecycle/__tests__/handleNotificationResponse.test.ts`
Expected: FAIL — `Cannot find module '../handleNotificationResponse'`

- [ ] **Step 3: Write the implementation**

```ts
// src/features/notifications/lifecycle/handleNotificationResponse.ts
//
// Pure decision: given a tapped notification's data payload, which in-app
// route to open. Always resolves to a valid route — a missing or unroutable
// payload falls back to home rather than leaving the tap silently ignored.
// The router-calling wrapper below is thin glue kept separate so the decision
// logic itself needs no expo-router/expo-notifications mocking to test.

import type { NotificationResponse } from 'expo-notifications';
import { isKnownRoute } from '@/src/features/initialization/domain/knownRoutes';
import { parseNotificationPayload } from '../domain/notificationPayload';

export const NOTIFICATION_FALLBACK_ROUTE = '/(dashboard)/home';

export function resolveNotificationRoute(data: unknown): string {
  const { route } = parseNotificationPayload(data);
  if (route && isKnownRoute(route)) return route;
  return NOTIFICATION_FALLBACK_ROUTE;
}

// `href: any` deliberately widens past expo-router's typed-routes `Href` union —
// a notification payload's route is a runtime string, not statically knowable,
// same reasoning as the existing `pathname: pathname as any` cast in
// app/onboarding/language.tsx's deferred-deep-link handler.
export function handleNotificationResponse(
  response: NotificationResponse,
  router: { push: (href: any) => void },
): void {
  const path = resolveNotificationRoute(response.notification.request.content.data);
  router.push(path);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/notifications/lifecycle/__tests__/handleNotificationResponse.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/lifecycle/handleNotificationResponse.ts \
        src/features/notifications/lifecycle/__tests__/handleNotificationResponse.test.ts
git commit -m "feat(notifications): add tap-to-route resolution with allowlist validation"
```

---

### Task 7: `useNotificationStore` — permission + token state

Mirrors the relevant slice of `src/core/store/useLocationStore.ts`. Not unit tested — its direct analog, `useLocationStore`, is also untested in this codebase today (unlike the simpler stores such as `useVillageStore`, which mock `StoredPrefs`); this store carries the same kind of native-permission orchestration.

**Files:**
- Create: `src/core/store/useNotificationStore.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/core/store/useNotificationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { NotificationService, PushPermissionState } from '@/src/features/notifications/data/NotificationService';

interface NotificationState {
  permission: PushPermissionState;
  /** True once refreshPermission has resolved at least once. Gates HomeScreen's
   *  sheet so it never opens on the default 'undetermined' before the real
   *  status has loaded — same role as useLocationStore's `hydrated`. */
  permissionChecked: boolean;
  blocked: boolean; // permanently denied ("Don't ask again")
  deviceToken: string | null;
}

interface NotificationActions {
  hydrate: () => Promise<void>;
  refreshPermission: () => Promise<PushPermissionState>;
  registerToken: () => Promise<void>;
  requestAndRegister: () => Promise<boolean>;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  permission: 'undetermined',
  permissionChecked: false,
  blocked: false,
  deviceToken: null,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const token = await StoredPrefs.getCustomData<string>(StorageKeys.PUSH_DEVICE_TOKEN);
    set({ deviceToken: token ?? null });
  },

  refreshPermission: async () => {
    const permission = await NotificationService.getPermissionState();
    set({ permission, permissionChecked: true });
    return permission;
  },

  registerToken: async () => {
    const token = await NotificationService.getDeviceToken();
    set({ deviceToken: token });
    if (token) {
      await StoredPrefs.setCustomData(StorageKeys.PUSH_DEVICE_TOKEN, token);
    }
  },

  requestAndRegister: async () => {
    const res = await NotificationService.requestPermission();
    set({
      permission: res.granted ? 'granted' : 'denied',
      permissionChecked: true,
      blocked: !res.granted && !res.canAskAgain,
    });
    if (!res.granted) return false;
    await get().registerToken();
    return true;
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/core/store/useNotificationStore.ts
git commit -m "feat(notifications): add useNotificationStore for permission and token state"
```

---

### Task 8: `usePushNotifications` — lifecycle hook (native glue)

Mirrors `src/features/location/lifecycle/useLocationLifecycle.ts`: seeds state once, then reacts to `AppState` changes. Also wires the two ways a tap can happen (while running, and the one that launched the app from a killed state). Not unit tested, same reasoning as Task 3 and `useLocationLifecycle`.

**Files:**
- Create: `src/features/notifications/lifecycle/usePushNotifications.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/features/notifications/lifecycle/usePushNotifications.ts
//
// Mirrors useLocationLifecycle: seeds permission + cached token once, then
// reacts to AppState changes (catches a grant made from system Settings) and
// to notification taps (both while running and the one that launched the app
// from a killed state).
//
// setNotificationHandler is called at module scope (not inside the hook body)
// so it registers exactly once regardless of how many times the hook
// re-renders — it's a global handler, not per-instance state.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/src/core/store/useNotificationStore';
import { handleNotificationResponse } from './handleNotificationResponse';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      await useNotificationStore.getState().hydrate();
      const perm = await useNotificationStore.getState().refreshPermission();
      // Already granted (returning user) — refresh the token silently, no sheet.
      if (perm === 'granted') {
        await useNotificationStore.getState().registerToken();
      }
    })();

    // The tap that launched the app from a killed state.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response, router);
    });

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, router);
    });

    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const store = useNotificationStore.getState();
      const prevPerm = store.permission;
      const perm = await store.refreshPermission();
      if (prevPerm !== 'granted' && perm === 'granted') {
        await useNotificationStore.getState().registerToken(); // granted from Settings
      }
    });

    return () => {
      tapSub.remove();
      appStateSub.remove();
    };
  }, [router]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/notifications/lifecycle/usePushNotifications.ts
git commit -m "feat(notifications): add usePushNotifications lifecycle hook"
```

---

### Task 9: `useNotificationViewModel` — thin adapter for the sheet

Mirrors `src/features/location/viewmodel/useLocationViewModel.ts`'s "blocked-dismissed is local state, not store state" pattern.

**Files:**
- Create: `src/features/notifications/viewmodel/useNotificationViewModel.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/features/notifications/viewmodel/useNotificationViewModel.ts
//
// Thin adapter over useNotificationStore, mirroring useLocationViewModel:
// permission/blocked live in the store (single source of truth); this hook
// only adds the local "dismiss the blocked sheet without touching the OS
// permission" flag and the Settings deep link.

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useNotificationStore } from '@/src/core/store/useNotificationStore';

export function useNotificationViewModel() {
  const permission = useNotificationStore((s) => s.permission);
  const storeBlocked = useNotificationStore((s) => s.blocked);
  const requestAndRegister = useNotificationStore((s) => s.requestAndRegister);

  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const blocked = storeBlocked && !blockedDismissed;

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlockedDismissed(true), []);

  const requestPermission = useCallback(() => {
    setBlockedDismissed(false);
    return requestAndRegister();
  }, [requestAndRegister]);

  return { permission, blocked, requestPermission, openSettings, dismissBlocked };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/notifications/viewmodel/useNotificationViewModel.ts
git commit -m "feat(notifications): add useNotificationViewModel adapter"
```

---

### Task 10: Translation keys

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add the keys**

In `src/base/constants/translations.ts`, add a new group right before the closing `};` of `TRANSLATIONS` (after the existing `promo_use_at_checkout` line):

```ts
  // Push notification permission sheet
  notif_permission_title: { te: 'నోటిఫికేషన్‌లను ఆన్ చేయండి', en: 'Turn on notifications' },
  notif_permission_sub:   { te: 'మీ ఆర్డర్ అప్‌డేట్‌లను వెంటనే తెలుసుకోండి', en: 'Get instant updates on your order status' },
  allow_notifications:    { te: 'అనుమతించండి', en: 'Allow' },
  not_now:                { te: 'ఇప్పుడు వద్దు', en: 'Not now' },
  notif_blocked_title:    { te: 'నోటిఫికేషన్‌లు బ్లాక్ అయ్యాయి', en: 'Notifications are blocked' },
  notif_blocked_sub:      { te: 'ఆర్డర్ అప్‌డేట్‌లు పొందడానికి సెట్టింగ్స్‌లో నోటిఫికేషన్‌లను ఆన్ చేయండి', en: 'Enable notifications in Settings to get order updates' },
```

(The blocked sheet reuses the existing `go_to_settings` and `cancel` keys already defined earlier in the file — no new keys needed for those two strings.)

- [ ] **Step 2: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(notifications): add translation keys for the permission sheets"
```

---

### Task 11: `NotificationPermissionSheet` + `NotificationBlockedSheet` (views)

Visually modeled on `src/features/location/views/LocationPermissionSheet.tsx` and `src/features/location/views/components/PermissionDeniedSheet.tsx`, but as new, notifications-specific components — not shared/generalized ones, so the location sheets are left untouched and unaffected by this feature.

**Files:**
- Create: `src/features/notifications/views/components/NotificationBlockedSheet.tsx`
- Create: `src/features/notifications/views/NotificationPermissionSheet.tsx`

- [ ] **Step 1: Write `NotificationBlockedSheet`**

```tsx
// src/features/notifications/views/components/NotificationBlockedSheet.tsx
//
// Shown when notification permission is permanently denied (OS won't prompt
// again). Routes the user to system Settings. Mirrors
// src/features/location/views/components/PermissionDeniedSheet.tsx.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BellOff } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
}

export const NotificationBlockedSheet = ({ visible, onClose, onGoToSettings }: Props) => {
  const { t } = useTranslation();
  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <View className="items-center py-4">
          <BellOff size={46} color="#16a34a" />
        </View>
        <Text className="text-slate-900 font-bold text-xl text-center">{t('notif_blocked_title')}</Text>
        <Text className="text-slate-500 text-base text-center mt-2 leading-6">{t('notif_blocked_sub')}</Text>
        <TouchableOpacity onPress={onGoToSettings} className="bg-green-600 rounded-2xl py-4 items-center mt-5">
          <Text className="text-white font-bold text-base">{t('go_to_settings')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} className="py-3.5 items-center mt-1">
          <Text className="text-slate-500 font-semibold text-base">{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
```

- [ ] **Step 2: Write `NotificationPermissionSheet`**

```tsx
// src/features/notifications/views/NotificationPermissionSheet.tsx
//
// First-ask notification permission sheet. Mirrors the location permission
// sheet's rule: the OS dialog only fires from a user tap inside this
// explainer, never automatically.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useNotificationViewModel } from '../viewmodel/useNotificationViewModel';
import { NotificationBlockedSheet } from './components/NotificationBlockedSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const NotificationPermissionSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useNotificationViewModel();

  const handleAllow = async () => {
    await vm.requestPermission();
    onClose();
  };

  return (
    <>
      <VillageBottomSheet visible={visible} onClose={onClose}>
        <View className="items-center px-6 pt-6 pb-4">
          <Bell size={40} color="#16a34a" />
          <Text className="mt-3 text-slate-900 font-extrabold text-lg text-center leading-tight">
            {t('notif_permission_title')}
          </Text>
          <Text className="mt-1.5 text-slate-500 text-[13px] text-center leading-snug" style={{ maxWidth: 260 }}>
            {t('notif_permission_sub')}
          </Text>
        </View>
        <View className="px-4 pb-4">
          <TouchableOpacity onPress={handleAllow} className="bg-green-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-bold text-base">{t('allow_notifications')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="py-3.5 items-center mt-1">
            <Text className="text-slate-500 font-semibold text-base">{t('not_now')}</Text>
          </TouchableOpacity>
        </View>
      </VillageBottomSheet>

      <NotificationBlockedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/notifications/views/components/NotificationBlockedSheet.tsx \
        src/features/notifications/views/NotificationPermissionSheet.tsx
git commit -m "feat(notifications): add NotificationPermissionSheet and NotificationBlockedSheet views"
```

---

### Task 12: Wire `usePushNotifications` into `AppScreen`

**Files:**
- Modify: `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`

- [ ] **Step 1: Add the import and the hook call**

Add the import alongside the existing `useLocationLifecycle` import:

```ts
import { usePushNotifications } from '@/src/features/notifications/lifecycle/usePushNotifications';
```

Add the call alongside the existing `useLocationLifecycle();` line inside the `AppScreen` component body:

```ts
  useLocationLifecycle();
  usePushNotifications();
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --silent`
Expected: same pass count as baseline (53 suites, 1 skipped, 0 failing) — this hook isn't unit tested, but nothing it imports should break existing tests since `AppScreen` isn't imported by any test file.

- [ ] **Step 3: Commit**

```bash
git add src/features/initialization/views/screens/AppScreen/AppScreen.tsx
git commit -m "feat(notifications): wire usePushNotifications into AppScreen"
```

---

### Task 13: Wire the permission sheet into `HomeScreen`, sequenced after location

Implements the sequencing rule from the spec: the notification sheet never opens while the location sheet is open, and only opens once location has settled (village resolved, or resolved to not-serviceable/error) — never both sheets stacked, notification always second.

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`

- [ ] **Step 1: Add imports**

Add alongside the existing imports at the top of `HomeScreen.tsx`:

```ts
import { useNotificationStore } from '@/src/core/store/useNotificationStore';
import { NotificationPermissionSheet } from '@/src/features/notifications/views/NotificationPermissionSheet';
```

- [ ] **Step 2: Add state and the settled-location derivation**

Add these lines in the `HomeScreen` component body, right after the existing `const [changeSheetOpen, setChangeSheetOpen] = React.useState(false);` line:

```ts
  const [notifSheetOpen, setNotifSheetOpen] = React.useState(false);
  const notifPermission = useNotificationStore((s) => s.permission);
  const notifPermissionChecked = useNotificationStore((s) => s.permissionChecked);
  // Location is "settled" once it either resolved a village or reached a
  // terminal non-serviceable/error state — i.e. the location sheet is done
  // deciding what to show, whether or not it's still visibly open.
  const locationSettled = !!village || status === 'not_serviceable' || status === 'error';
```

- [ ] **Step 3: Auto-close the sheet if permission resolves out from under it**

Add this effect near the existing `village`-driven sheet-closing effect (right after the block that closes `permSheetOpen`/`changeSheetOpen` when `village` is set):

```ts
  // If permission changes while the sheet happens to be open (e.g. granted
  // from system Settings while backgrounded), close it — nothing left to ask.
  React.useEffect(() => {
    if (notifPermission !== 'undetermined') setNotifSheetOpen(false);
  }, [notifPermission]);
```

- [ ] **Step 4: Add the gated open effect**

Add this new `useFocusEffect` block right after the existing location-bootstrap `useFocusEffect` (the one ending with `}, [hydrated, village, status, detectCurrentLocation]),\n  );`):

```ts
  // Notification permission sheet: never competes with the location sheet.
  // Only offered once location has settled, and only while push permission
  // is still undetermined (already granted/blocked skip the sheet entirely).
  useFocusEffect(
    React.useCallback(() => {
      if (permSheetOpen || !locationSettled) return;
      if (!notifPermissionChecked || notifPermission !== 'undetermined') return;
      setNotifSheetOpen(true);
    }, [permSheetOpen, locationSettled, notifPermissionChecked, notifPermission]),
  );
```

- [ ] **Step 5: Render the sheet**

Add this JSX right after the existing `<LocationSheet .../>` line, inside the closing `</SafeAreaView>`:

```tsx
      <NotificationPermissionSheet
        visible={notifSheetOpen}
        onClose={() => setNotifSheetOpen(false)}
      />
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test -- --silent`
Expected: same pass count as baseline (no existing test renders `HomeScreen`, so this should be a no-op for the suite — confirm by checking the output for `HomeScreen` specifically not appearing as a new failure)

- [ ] **Step 7: Commit**

```bash
git add src/features/home/views/home/HomeScreen.tsx
git commit -m "feat(notifications): sequence the notification permission sheet after location on HomeScreen"
```

---

### Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --silent`
Expected: all suites pass except the 1 pre-existing skip; total test count is the baseline 461 plus the 23 new tests added in Tasks 1, 5, and 6 (10 + 7 + 6 = 23) → 484 passing.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Pay particular attention to `handleNotificationResponse.ts` (the `NotificationResponse` type import) and the `AppScreen.tsx`/`HomeScreen.tsx` edits.

- [ ] **Step 3: Run lint**

Run: `npx eslint src/features/notifications src/core/store/useNotificationStore.ts src/features/initialization/domain/knownRoutes.ts src/features/initialization/views/screens/AppScreen/AppScreen.tsx src/features/home/views/home/HomeScreen.tsx`
Expected: no errors (check `package.json` `scripts.lint` first in case there's a project-specific lint command to use instead of calling `eslint` directly).

- [ ] **Step 4: Manual smoke test (requires a native build — this feature cannot run in Expo Go)**

Since this needs the EAS credentials setup noted in Task 2 (APNs key, FCM service account) before a real device can receive a token, full device verification is out of reach in this environment. At minimum, confirm the JS side doesn't crash by starting the dev server and checking `HomeScreen` still renders and the location flow still works end-to-end (the notification sheet will simply never open without a native push-capable build, which is expected and fine):

Run: `npx expo start`
Expected: app loads, location permission/sheet flow behaves exactly as before this branch (no regression), no red-screen errors from the new imports.

- [ ] **Step 5: Report status to the user**

Summarize: JS-side integration complete and tested; native push delivery requires the manual EAS credentials step (APNs key + FCM service account) and a new native build before it can be verified on a real device.
