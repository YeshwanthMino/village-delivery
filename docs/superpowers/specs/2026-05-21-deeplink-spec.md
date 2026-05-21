# Deeplink Spec — Village Delivery

**Date:** 2026-05-21  
**Project:** village-delivery  
**Status:** Draft

---

## Overview

This spec defines the deeplink scheme for Village Delivery: the URL patterns, platform configuration, navigation-guard integration, and testing surface. Deeplinks let external surfaces (SMS, push notifications, marketing emails, QR codes, WhatsApp) open the app at a specific screen.

**Expo Router v6 handles deeplink routing automatically** — every file-based route is already a URL. The work here is:
1. Registering the custom scheme and universal-link domains in `app.json`
2. Configuring iOS Associated Domains and Android Intent Filters via Expo plugins
3. Updating `AppScreen`'s navigation guard to whitelist new deep-linked routes
4. Optionally: a thin `useLinkingHandler` hook that captures initial URL on cold launch

---

## URL Scheme

| Type | Scheme | Example |
|---|---|---|
| Custom (deep) | `villagedelivery://` | `villagedelivery://category-details?categoryId=fruits` |
| Universal / App Link (future) | `https://villagedelivery.app/` | `https://villagedelivery.app/category-details?categoryId=fruits` |

The `scheme` key is already set to `"villagedelivery"` in `app.json`. Universal Links / App Links require a verified domain and HTTPS asset files — that work is **out of scope** for V1; this spec covers custom scheme only.

---

## Supported Routes

Every route maps 1-to-1 with the Expo Router file system. Parameters match what `useLocalSearchParams` already reads.

### Tab screens (no params)

| Deeplink URL | Opens |
|---|---|
| `villagedelivery://home` | Home tab `/(dashboard)/home` |
| `villagedelivery://categories` | Categories tab `/(dashboard)/categories` |
| `villagedelivery://orders` | Orders tab `/(dashboard)/orders` |
| `villagedelivery://profile` | Profile tab `/(dashboard)/profile` |

> Expo Router maps `villagedelivery://home` → `/(dashboard)/home` via the index redirect in `app/index.tsx`. Tab screens live under `(dashboard)` but are addressable without the group prefix.

### Stack screens

| Deeplink URL | Params | Opens |
|---|---|---|
| `villagedelivery://search` | _(none)_ | Global search |
| `villagedelivery://search?categoryId=fruits&categoryName=Fruits` | `categoryId`, `categoryName` | Category-scoped search |
| `villagedelivery://category-details?categoryId=vegetables` | `categoryId` (**required**) | Category detail for Vegetables |
| `villagedelivery://cart` | _(none)_ | Cart screen |
| `villagedelivery://top-picks` | _(none)_ | Top-picks screen |
| `villagedelivery://order-detail?orderId=<id>` | `orderId` (**required**) | Order detail |

### Routes intentionally excluded from deeplinks (V1)

| Route | Reason |
|---|---|
| `/onboarding/language` | Only shown on first launch; deep-linking into onboarding would break the flow |
| `/auth` | Auth is stateless/placeholder; no meaningful target |

---

## Category IDs (valid values for `categoryId`)

| ID | Name |
|---|---|
| `fruits` | Fruits |
| `vegetables` | Vegetables |
| `dairy` | Dairy |
| `snacks` | Snacks |
| `beverages` | Beverages |
| `bakery` | Bakery |
| `meat` | Meat |
| `frozen` | Frozen |
| `organic` | Organic |
| `pantry` | Pantry |

An invalid `categoryId` is handled by `useCategoryDetailsViewModel` falling back to `null` — the screen renders empty. No extra deeplink-layer validation is needed for V1.

---

## Platform Configuration

### `app.json` — no changes needed

`scheme: "villagedelivery"` is already present. Expo Router and `expo-linking` consume it automatically.

### iOS — Associated Domains (Universal Links, V2+)

```json
"ios": {
  "bundleIdentifier": "com.anonymous.villagedelivery",
  "associatedDomains": ["applinks:villagedelivery.app"]
}
```

Add this only when the HTTPS domain + `apple-app-site-association` file are ready. Skip for V1.

### Android — Intent Filter (Universal Links, V2+)

```json
"android": {
  "intentFilters": [
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        { "scheme": "https", "host": "villagedelivery.app" }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

Add this when the HTTPS domain + `assetlinks.json` are ready. Skip for V1.

---

## Navigation Guard — `AppScreen.tsx`

The current guard in `AppScreen.tsx:32` whitelists known route segments. When the app cold-launches from a deeplink, `useSegments()` reflects the deeplinked path immediately. The guard must allow all deep-linkable segments to pass through.

### Current whitelist (line 32)
```ts
if (!inDashboard && !inAuth && !inSearch && !inOnboarding && !inCategoryDetails && !inCart && !inTopPicks) {
  router.replace('/(dashboard)/home');
}
```

### Required addition

`order-detail` is missing from the whitelist. Add it so deeplinks to order detail don't redirect to home.

```ts
const inOrderDetail = segments[0] === 'order-detail';

if (
  !inDashboard &&
  !inAuth &&
  !inSearch &&
  !inOnboarding &&
  !inCategoryDetails &&
  !inCart &&
  !inTopPicks &&
  !inOrderDetail
) {
  router.replace('/(dashboard)/home');
}
```

> This is the **only code change** required for V1 deeplinks. Everything else (URL parsing, navigation) is handled by Expo Router automatically.

---

## Cold Launch vs. Warm Launch

| Scenario | Behaviour |
|---|---|
| App not running, user taps link | Expo Router reads the URL on mount, `useSegments` reflects the target route, `AppScreen` guard passes through, screen renders |
| App in background, user taps link | Expo Router's listener fires, router navigates to the linked route |
| App in foreground | Same as warm launch; `Linking.addEventListener` triggers navigation |

No custom `Linking.getInitialURL()` handling is needed — Expo Router v6 manages it internally.

---

## Expo Router Linking Config (Optional Enhancement)

If specific redirect/fallback logic is needed beyond what file-based routing provides, a `linking` config object can be passed to the Expo Router `<Stack>`. Example:

```ts
// Not needed for V1 — Expo Router handles all routes automatically.
// Only add this if custom URL aliases or fallback behaviour is required.
const linking = {
  prefixes: ['villagedelivery://'],
  config: {
    screens: {
      '(dashboard)': {
        screens: {
          home: 'home',
          categories: 'categories',
          orders: 'orders',
          profile: 'profile',
        },
      },
      search: 'search',
      'category-details': 'category-details',
      cart: 'cart',
      'top-picks': 'top-picks',
      'order-detail': 'order-detail',
    },
  },
};
```

This is **not required** for V1 — file-based routing already satisfies all routes above.

---

## Testing

### Manual testing (simulator / device)

```bash
# iOS Simulator
xcrun simctl openurl booted "villagedelivery://home"
xcrun simctl openurl booted "villagedelivery://category-details?categoryId=fruits"
xcrun simctl openurl booted "villagedelivery://search?categoryId=dairy&categoryName=Dairy"
xcrun simctl openurl booted "villagedelivery://cart"
xcrun simctl openurl booted "villagedelivery://top-picks"
xcrun simctl openurl booted "villagedelivery://order-detail?orderId=demo-order-1"
xcrun simctl openurl booted "villagedelivery://orders"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "villagedelivery://home" com.anonymous.villagedelivery
adb shell am start -W -a android.intent.action.VIEW -d "villagedelivery://category-details?categoryId=vegetables" com.anonymous.villagedelivery
adb shell am start -W -a android.intent.action.VIEW -d "villagedelivery://order-detail?orderId=demo-order-1" com.anonymous.villagedelivery
```

### Test matrix

| Deeplink | Cold launch | Warm launch | Expected screen |
|---|---|---|---|
| `villagedelivery://home` | ✓ | ✓ | Home tab |
| `villagedelivery://categories` | ✓ | ✓ | Categories tab |
| `villagedelivery://orders` | ✓ | ✓ | Orders tab |
| `villagedelivery://profile` | ✓ | ✓ | Profile tab |
| `villagedelivery://search` | ✓ | ✓ | Search (global) |
| `villagedelivery://search?categoryId=dairy&categoryName=Dairy` | ✓ | ✓ | Search (dairy scoped) |
| `villagedelivery://category-details?categoryId=fruits` | ✓ | ✓ | Fruits category detail |
| `villagedelivery://category-details?categoryId=INVALID` | ✓ | ✓ | Category detail (empty state) |
| `villagedelivery://cart` | ✓ | ✓ | Cart screen |
| `villagedelivery://top-picks` | ✓ | ✓ | Top picks screen |
| `villagedelivery://order-detail?orderId=demo-order-1` | ✓ | ✓ | Order detail |
| `villagedelivery://order-detail` (missing orderId) | ✓ | ✓ | Order detail (handles gracefully via viewmodel) |

---

## Files Touched Summary

| File | Change |
|---|---|
| `src/features/initialization/views/screens/AppScreen/AppScreen.tsx` | Add `inOrderDetail` guard variable |
| `docs/superpowers/specs/2026-05-21-deeplink-spec.md` | This spec (new) |

> `app.json` requires no changes for custom-scheme V1. Universal Links config is additive and deferred to V2.

---

## Known Edge Cases

These are gaps identified by codebase analysis. They are documented here for implementers; fixes are tracked separately.

### Critical

#### 1. First-launch deeplink is silently lost

**Trigger:** User taps a deeplink on fresh install before completing onboarding.

**Flow:**
1. App launches → `(dashboard)/_layout.tsx` checks `StoredPrefs.getIsFirstLaunch()`
2. Returns `true` → redirects to `/onboarding/language`
3. Expo Router discards the original deeplink URL
4. After language selection, user lands on `/(dashboard)/home` — deeplink is gone

**Note:** `StoredPrefs.getDeferredDeepLink()` and `setDeferredDeepLink()` exist in `StoredPrefs.ts` but are never called anywhere. The deferred deeplink infrastructure is partially built but unwired.

**Fix needed:** On cold launch, capture `Linking.getInitialURL()` before onboarding redirect. Store it via `StoredPrefs.setDeferredDeepLink()`. After onboarding completes, read and navigate to it.

---

#### 2. `order-detail` with missing or invalid `orderId`

**Trigger:** `villagedelivery://order-detail` (no param) or `villagedelivery://order-detail?orderId=nonexistent`

**Behaviour:** `useOrderDetailViewModel` reads `orderId` from params; if absent or unmatched, `order` is `undefined`. The screen renders blank, then a `useEffect` fires `router.back()` — user sees a flash and bounce with no error message.

**Fix needed:** Guard in `OrderDetailScreen` — if `order` is null after hydration, show an error state ("Order not found") with a button to go home rather than silently bouncing.

---

#### 3. `category-details` with missing or invalid `categoryId`

**Trigger:** `villagedelivery://category-details` (no param) or `villagedelivery://category-details?categoryId=invalid`

**Behaviour:** `CategoryDetailsScreen` returns `null` when `currentCategory` or `heroGradient` is null. This produces a **blank screen with no back button** — user is stranded.

**Fix needed:** Replace the `return null` guard with an error state that includes a back button.

---

### Medium

#### 4. Valid `categoryId` missing from `HERO_GRADIENTS`

**Trigger:** A `categoryId` that exists in `CATEGORIES` but has no entry in `HERO_GRADIENTS`.

**Behaviour:** `heroGradient` resolves to `null`, `CategoryDetailsScreen` returns `null` even though the category is valid. This is a data-consistency issue today but could surface if categories are added without updating `HERO_GRADIENTS`.

**Fix needed:** Either derive the gradient from `Category.bgClass`/`textClass` (removing the separate lookup), or assert at app start that every category has a gradient entry.

---

#### 5. Stack routes bypass first-launch onboarding

**Trigger:** `villagedelivery://cart` or `villagedelivery://top-picks` on first install.

**Behaviour:** `/cart` and `/top-picks` are stack routes outside `(dashboard)`. The first-launch redirect in `(dashboard)/_layout.tsx` only fires when the app navigates into the dashboard group. These routes are accessible immediately, skipping onboarding entirely.

**Fix needed:** Move the first-launch check to `AppScreen.tsx` (root guard level) so it applies to all routes, not just dashboard children.

---

#### 6. `search` with invalid `categoryId` produces silent empty results

**Trigger:** `villagedelivery://search?categoryId=notreal&categoryName=Fake`

**Behaviour:** `useSearchViewModel` accepts any string as `categoryId`. The filter finds no matching products and renders an empty list with no explanation.

**Fix needed:** Validate `categoryId` against `CATEGORIES` on mount; if invalid, clear `activeCategoryId` and fall back to global search. Optionally show a toast: "Category not found — showing all results."

---

### Low

#### 7. `villagedelivery://auth` immediately redirects to home

`app/auth/index.tsx` contains only `<Redirect href="/(dashboard)/home" />`. A deeplink to this route silently redirects rather than surfacing any auth UI. Documented as excluded in the spec but the silent redirect may surprise users who follow a marketing link expecting a login screen.

---

## Out of Scope (V2+)

- Universal Links (HTTPS) — requires domain verification, `apple-app-site-association`, `assetlinks.json`
- Push notification deeplinks (FCM/APNs payload routing)
- Deferred deeplinks (link clicks before app install, via Branch.io or Firebase Dynamic Links)
- Product-level deeplinks (e.g., `villagedelivery://product?productId=f1`) — no dedicated product detail screen exists yet
- Share-sheet deeplink generation from within the app
