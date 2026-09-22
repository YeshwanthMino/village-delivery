# Push Notifications (Firebase + APNs) — Design

## Goal

Integrate native push notifications into the app: request permission, obtain
the platform's native device push token (FCM registration token on Android,
raw APNs token on iOS), handle notifications that arrive in the foreground
and background, and deep-link into the app when a notification is tapped.

**Out of scope:** sending the token to a backend (no endpoint exists yet —
this is client-side plumbing only), a settings-screen toggle for
notifications (no such screen exists today), and any server-side sending
infrastructure.

## Library choice

`expo-notifications`. It wraps both FCM (Android) and APNs (iOS) behind one
JS API and integrates with EAS's config-plugin build flow, which fits this
project (managed Expo, SDK ~55, no committed `ios`/`android` folders, builds
via EAS). `@react-native-firebase` was considered but rejected — it needs
its own config plugin, `google-services.json`/`GoogleService-Info.plist`
wired through EAS env vars (see
[[eas-build-env-requirements]]-style setup), and more native build surface
for no benefit here, since we're calling the *native* token APIs
(`getDevicePushTokenAsync`) rather than Expo's push relay service anyway.

## Token type

`Notifications.getDevicePushTokenAsync()` — the **native** device token
(raw FCM registration token on Android, raw APNs token on iOS), not
`getExpoPushTokenAsync()`. This is what a backend would hand directly to
Firebase Admin SDK / APNs later, with no dependency on Expo's push relay
infrastructure.

## Permission handling — mirrors the existing location pattern

The codebase has an established, deliberate convention for permissions,
visible in `useLocationLifecycle.ts` and `HomeScreen.tsx`
(`useFocusEffect` at `HomeScreen.tsx:79-108`):

- **Never auto-fire the OS permission dialog.** Only read current status
  passively (`getPermissionState()`-equivalent).
- If already granted, proceed silently (no sheet).
- If not granted, show an **in-app sheet** explaining why, and only request
  the real OS permission when the user taps a button inside that sheet.
  Reasoning (per the existing code comment on the location flow): the OS
  dialog can only meaningfully appear once per install — auto-firing it
  without context wastes that shot, and a "Don't Allow" can't be easily
  re-prompted.
- On denial with `canAskAgain: false` ("blocked"), don't re-prompt; instead
  show a "go to Settings" sheet, and detect a permission change via
  `AppState` on return to the app (same pattern as
  `useLocationLifecycle`'s `AppState.addEventListener('change', ...)`).

Push notifications follow this exact pattern, via a new
`NotificationPermissionSheet` (visually modeled on
`LocationPermissionSheet`/`PermissionDeniedSheet`, using the shared
`VillageBottomSheet`).

### Sequencing against the location sheet

Both permissions can be unresolved on a fresh install. To avoid stacking
two native dialogs or two in-app sheets:

- The notification sheet **never opens while the location sheet is open**,
  and never opens before location has settled (`village` resolved, or the
  location sheet dismissed/denied).
- Once location is settled, on a subsequent idle moment (next `HomeScreen`
  focus), the notification sheet may appear if notification permission is
  still `undetermined`.
- If notification permission is already `granted` or permanently `denied`
  (blocked), no sheet is shown at all — granted refreshes the token
  silently in the background; blocked is left alone (no nagging).

Gate condition on `HomeScreen`: show the notification sheet only when
`!locationPermSheetOpen && (village !== null || locationPermission ===
'denied')` and `pushPermission === 'undetermined'`.

## File structure

New feature module, following the existing `wallet`/`location` convention:

```
src/features/notifications/
  data/
    NotificationService.ts        // thin wrapper over expo-notifications:
                                   // getPermissionState, requestPermission,
                                   // getDeviceToken, listener registration
  domain/
    notificationPayload.ts        // parses/validates a notification's data
                                   // payload into { route?: string }
  lifecycle/
    usePushNotifications.ts       // the hook: seeds permission state, wires
                                   // foreground handler + response listener,
                                   // AppState re-check on return from Settings
    handleNotificationResponse.ts // pure: payload -> router path decision
  views/
    NotificationPermissionSheet.tsx  // in-app pre-permission explainer
    components/
      PermissionDeniedSheet.tsx      // "go to Settings" (or reuse the
                                      // location one if visually identical —
                                      // decide during implementation)
```

`NotificationService.ts` mirrors `LocationService.ts`'s shape:

```ts
export type PushPermissionState = 'granted' | 'denied' | 'undetermined';
async function getPermissionState(): Promise<PushPermissionState>
async function requestPermission(): Promise<{ granted: boolean; canAskAgain: boolean }>
async function getDeviceToken(): Promise<string | null> // native token, platform-specific under the hood
```

## Store

A new `useNotificationStore` (zustand), mirroring the relevant slice of
`useLocationStore`:

```ts
interface NotificationState {
  permission: PushPermissionState;
  blocked: boolean;
  deviceToken: string | null;
}
interface NotificationActions {
  refreshPermission: () => Promise<PushPermissionState>;
  requestAndRegister: () => Promise<boolean>; // requests OS permission, then fetches + stores token
  dismissBlocked: () => void;
  openSettings: () => void;
}
```

`deviceToken` is kept in memory + persisted via a new
`StoredPrefs.setPushToken`/`getPushToken` pair (same pattern as
`setUserProfile`, using `StoredPrefs.setCustomData`), purely so the app
doesn't refetch on every launch. Not sent anywhere yet.

## Wiring into the app

- `AppScreen.tsx`: call `useNotificationStore.getState().refreshPermission()`
  once at startup (read-only), same as location's
  `refreshPermission()` seed call — no sheet triggered from here directly.
- `HomeScreen.tsx`: extend the existing `useFocusEffect` (or add a sibling
  one) to open `NotificationPermissionSheet` under the gate condition
  described above.
- `usePushNotifications()` hook (mounted once in `AppScreen`, alongside
  `useLocationLifecycle()`):
  - `Notifications.setNotificationHandler(...)` configured to show the OS
    banner/alert even while foregrounded.
  - `Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)`
    for taps (cold-start launch notification is read via
    `getLastNotificationResponseAsync()` on mount, so a tap that launched
    the app from killed state is also handled).
  - `AppState` listener: on returning to `'active'`, re-check permission;
    if it flipped from not-granted to `granted` (user enabled from
    Settings), fetch and store the token.

## Foreground vs. background behavior

- **Foreground:** OS banner/alert is shown (not suppressed) — the handler
  set via `setNotificationHandler` returns
  `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }`.
- **Background/killed:** default OS tray behavior; no custom handling
  needed beyond the response listener for taps.

## Tap → deep link

`notificationPayload.ts` parses the notification's `data` field into
`{ route?: string }`. `handleNotificationResponse.ts`:

1. If `data.route` is a string starting with `/`, extract its root segment
   (the part before the first `/` or `?`, matching how `app/_layout.tsx`
   and `AppScreen.tsx`'s `allowed` list key routes — e.g. `order-detail`
   from `/order-detail?orderId=123`).
2. If that root is in the same `allowed` list already defined in
   `AppScreen.tsx` (`'(dashboard)'`, `'auth'`, `'search'`, `'location'`,
   `'address'`, `'category-details'`, `'cart'`, `'top-picks'`,
   `'order-detail'`, `'product'`, `'about'`), call
   `router.push(data.route)`.
3. Otherwise (missing, non-string, or root not in the allowlist), call
   `router.push('/(dashboard)/home')` — no silent no-op, always lands
   somewhere valid.

The `allowed` list is imported from a shared location rather than
duplicated — if it's not already exported from `AppScreen.tsx`, hoist it
into a small shared constants file both `AppScreen.tsx` and
`handleNotificationResponse.ts` import from.

## Native / EAS configuration (manual, not code)

Required for native push to function — none of this is JS, and it's not
something I can run myself (interactive, account-scoped):

1. Add the `expo-notifications` config plugin to `app.json` (this part
   *is* code — a plugins-array entry, same shape as the existing
   `expo-location` entry).
2. **iOS:** upload an APNs key to EAS credentials (`eas credentials`) so
   EAS can sign the push entitlement into builds and so the native APNs
   token is issuable.
3. **Android:** upload a Firebase service-account JSON to EAS credentials
   for FCM v1, so the native FCM registration token is issuable.
4. Requires a new native build (dev client or EAS build) — push tokens are
   **not available in Expo Go**.

## Error handling

- Permission denied (not blocked): sheet closes, no token fetch, no retry
  until next time the gate condition re-evaluates (e.g., next `HomeScreen`
  focus) — same cadence as location's re-prompt behavior.
- Blocked (`canAskAgain: false`): "go to Settings" sheet only, no
  auto-reprompt; `AppState` listener catches a grant from Settings.
- Token fetch failure (no network, unsupported simulator, etc.): caught,
  logged via the existing `logger` service, non-fatal — rest of app init
  is unaffected.
- Malformed/unroutable tap payload: falls back to `/(dashboard)/home`
  (see above) rather than throwing or leaving the user on a broken route.

## Testing

Pure-function unit tests, colocated in `__tests__/` per existing
convention:

- `notificationPayload.test.ts`: valid route, missing `data`, non-string
  `route`.
- `handleNotificationResponse.test.ts`: allowlisted root → navigates;
  unknown root → falls back to home; missing/malformed → falls back to
  home.
- `useNotificationStore` gate-condition logic (if extracted as a pure
  selector/function) covered similarly to how `useLocationStore`'s
  reducer-style logic is tested today.

Native glue (`NotificationService.ts`, `usePushNotifications.ts`,
`setNotificationHandler` wiring) is not unit tested, consistent with
`useLocationLifecycle` today (also untested) — it's thin wiring over a
native module.

## Open items for implementation time (not blocking spec approval)

- Whether `PermissionDeniedSheet` is reused as-is (generalized to accept
  copy as props) or duplicated for notifications — small enough to decide
  while implementing.
- Exact translation keys to add to `translations.ts` for the new sheet's
  copy (title/subtitle/button text) — content, not design.
