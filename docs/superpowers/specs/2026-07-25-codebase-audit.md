# Village Delivery — Codebase Audit

**Date:** 2026-07-25
**Branch audited:** `feat/address-location-flow` (27 modified files, ~651 uncommitted insertions)
**Scope:** Whole application — security, performance, correctness, code structure, tests
**Status:** Findings below were audited first, then acted on. See §0 for what was fixed.

---

## 0. Resolution status

All findings were addressed across seven commits (`c5d6501`..`1a967a3`), each
verified with `tsc --noEmit`, `eslint`, and the full suite.

| Finding | Status |
|---|---|
| C1 adjustment reset · C2 timeout ignored · C3 unreachable fallback · C4 variant collision · C5 cart not persisted | **Fixed** |
| H1 ungated logging · H3 no memo · H4 cartCount selector · H5 money math in mock file · H7 no error boundary · H8 failing tests | **Fixed** |
| H6 lists in ScrollView | **Partly fixed** — search (the unbounded one) virtualised; the rest are bounded static-catalog lists, one inside a scroll-driven animated header that needs visual verification |
| M1 dead code · M2 dead compute · M3 unreachable UI · M5 route casts · M6 large modules · M7 per-unit writes · M8 stale verification · M9 three sheets | **Fixed** |
| M4 `any` at API boundary | **Partly fixed** — auth boundary typed (and surfaced a real string/number id inconsistency); `homeLayoutMapper` (14) and `ordersApi` (10) remain |
| L1 lint · L2 hardcoded version · L3 dead state · L5 duplicate key parsers | **Fixed** |
| **H2 web tokens in localStorage** | **Not done — needs your decision.** Whether web is a shipping target determines whether this is an httpOnly-cookie change or a build gate. Cheap decision, expensive implementation. |
| L4 i18n in OrderModificationSheet · L6 User-Agent spoof · L7 React Query for mutations | **Not done** — L6 needs a server-side fix; L4 and L7 are follow-on work |
| L8 Telugu fonts always loaded | **Deliberately not done** — `loadLocale` accepts only `'en'` today, but the `'te'` rendering path is live in 36 places; removing the fonts would break it the moment Telugu returns |

**Measured before → after:** ungated `console.*` 101 → 0 · failing tests 3 → 0 ·
tests 97 → 143 · `React.memo` 0 → 4 · error boundaries 0 → 1 · `any` 129 → 88 ·
largest component 1108 → 374 lines · verified-dead lines ~800 → 0.

---

## 1. Method

Read every module in `src/` and `app/` (171 TS/TSX files, ~17.7k lines), ran the test
suite, traced the cart → stock-check → checkout path end to end, and grepped for
cross-cutting patterns (logging, `any`, memoization, list rendering, dead exports).

Every finding below cites `file:line` and was verified against the code, not inferred.
Findings are ordered by severity; effort estimates assume someone familiar with the codebase.

---

## 2. Architecture — what is already right

The foundation is sound, and several things are done better than typical for an app this size:

- **Clean layering.** `src/features/<feature>/{data,domain,viewmodel,views}` over
  `src/base` (transport, storage, platform) and `src/core` (stores, config). The
  dependency direction is respected almost everywhere.
- **Platform abstraction is real.** `IStorageService` / `IPlatformService` with
  web and native implementations behind factories, rather than `Platform.OS`
  checks scattered through the UI.
- **The refresh-token interceptor is correct.** `apiClient.ts:212-220` does proper
  single-flight refresh, and `apiClient.ts:160-186` deliberately avoids awaiting the
  retried request inside the refresh `catch` so a retry failure isn't misclassified
  as an expired session. The comment explaining why is accurate.
- **Circular-dependency avoidance is deliberate.** `apiClient.setOnSessionExpired`
  (`useAuthStore.ts:245`) lets the base layer trigger logout without importing the store.
- **Comments explain *why*, not *what*.** e.g. the nginx `User-Agent` workaround
  (`apiClient.ts:95-98`), the `x-store-id` override rule (`apiClient.ts:104-107`).
- **Domain logic is genuinely extracted in places** — `deriveCheckoutState`,
  `addressSelection`, `checkoutState` all have unit tests and no React dependencies.

The problems below are concentrated in the **cart/checkout path** and in
**cross-cutting hygiene**, not in the architecture itself.

---

## 3. Critical

### C1 — `OrderModificationSheet` silently discards the user's quantity edits

**Where:** `OrderModificationSheet.tsx:48-76`, triggered by `CartScreen.tsx:356-363`

The initialization effect depends on `[visible, stockInfo, cartItems]`. `cartItems`
is built inline by the parent:

```tsx
// CartScreen.tsx:356
cartItems={vm.cartItems.map(item => ({ productId: item.productId, ... }))}
```

That produces a **new array identity on every CartScreen render**. The effect therefore
re-runs on any parent re-render — stock verification completing, `isVerifyingStock`
flipping, payment method toggling, auth state changing — and each run executes:

```tsx
setLocalQuantities(quantities);   // back to server-suggested values
setManuallyAdjusted(new Set());   // user's edits forgotten
setRetryError(null);
```

**Failure scenario:** User opens the sheet after a stock conflict, adjusts "Tomatoes"
from 5 to 3 using the stepper. Background stock verification resolves and updates
`useCartStockStore`, re-rendering CartScreen. The sheet resets the quantity to the
server's suggested value. The user's edit is gone with no indication. If they then press
"Update all", `manuallyAdjusted.size === 0`, so it takes the auto-retry branch
(`OrderModificationSheet.tsx:107`) and re-places the order at the **unadjusted**
quantities.

**Fix sketch:** Memoize the prop in CartScreen with `useMemo`, and key the effect on a
stable derived signature (e.g. `visible` plus a joined `productId:availableStock` string)
rather than on object identity.

**Effort:** S

---

### C2 — Per-call request timeouts are silently ignored

**Where:** `apiClient.ts:9-12`, `apiClient.ts:151`, `stockApi.ts:41`

`stockApi.ts` sets a deliberate 5-second budget for the checkout stock check:

```ts
const STOCK_CHECK_TIMEOUT = 5000; // 5 seconds
...
const resp = await apiClient.post<any>(`${BASE}/app/orders/check-stock`, body, {
  timeout: STOCK_CHECK_TIMEOUT,
});
```

But `FetchOptions` (`apiClient.ts:9-12`) declares only `withAuth` and `_retry`, and
`request()` unconditionally uses the global value:

```ts
// apiClient.ts:151
const timeoutId = setTimeout(() => controller.abort(), AppConfig.timeout); // 30_000
```

The extra `timeout` key is spread into `fetchOptions` and passed to `fetch`, where it is
ignored. **The stock check can block checkout for 30 seconds.**

**Fix sketch:** Add `timeout?: number` to `FetchOptions`, destructure it in `request()`,
default to `AppConfig.timeout`.

**Effort:** S

---

### C3 — The stock-check timeout fallback can never fire

**Where:** `stockApi.ts:70-81`

```ts
if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
  return { items: items.map(item => ({ ...item, inStock: true })) };
}
```

Both conditions are dead:

- `ECONNABORTED` is an **Axios** error code. This codebase uses `fetch` +
  `ErrorMapper`, which throws `{ type, message, ... }` with no `code` field.
- The thrown message is `'Request timed out. Please try again.'`
  (`errorMapper.ts:8`) — `"timed out"`, not `"timeout"`, so `.includes('timeout')`
  is `false`.

So on a slow network the error propagates, the red "Unable to verify stock" banner
appears (`CartScreen.tsx:242`), and the intended graceful degradation never happens.
Compounded with C2, the user waits 30s to see it.

**Note:** the fallback's *intent* is also worth revisiting — it fails **open**
(`inStock: true`), which trades a hung checkout for an overselling risk. That's a
product call, but it should be a deliberate one.

**Fix sketch:** Match on `error?.type === 'REQUEST_TIMED_OUT'` (the actual contract),
and decide fail-open vs fail-closed explicitly.

**Effort:** S

---

### C4 — Stock status is keyed by `productId`, so variants collide

**Where:** `useCartStockStore.ts:53-59`, read at `CartScreen.tsx:286`

The API request and response both carry `variantId` (`stockApi.ts:16-21`), but the store
discards it when building its lookup map:

```ts
response.items.forEach((item) => {
  stockStatusMap[item.productId] = { inStock: item.inStock, ... };
});
```

`CartScreen.tsx:286` then reads `stockStatus[item.productId]` for each cart row.

**Failure scenario:** Cart contains "Toor Dal 500g" (in stock) and "Toor Dal 1kg"
(out of stock) — same `productId`, different `variantId`. Whichever response item lands
last overwrites the other. Both rows display the same availability, so either an
in-stock item is blocked or an out-of-stock item is offered for checkout.

This matters more now: the in-flight branch work is explicitly moving stock resolution
onto variants (commit `921e5d4` "rewrite product mapper to get stock from variants").

**Fix sketch:** Key the map by a composite `variantId ?? productId` and use the same key
function on the read side. The cart already has a `key` concept for exactly this.

**Effort:** M

---

### C5 — The cart is never persisted

**Where:** `useVillageStore.ts:34-41`

`cart` and `cartSnapshots` live only in Zustand memory. The same store persists `locale`
through `StoredPrefs` (`useVillageStore.ts:93-105`), so the omission looks accidental
rather than intentional.

**Failure scenario:** User fills a cart, switches to WhatsApp to ask a family member what
to add, Android reclaims the process, they come back — empty cart. On low-RAM devices
(the likely target hardware for this app) this happens routinely.

**Fix sketch:** Persist `cart` + `cartSnapshots` via the existing `StoredPrefs` custom-data
mechanism, hydrating in the same place `loadLocale` is called (`app/_layout.tsx:23`).
Snapshots make this straightforward — line items already carry their own price/name data
and don't need catalog re-resolution.

**Effort:** M

---

## 4. High

### H1 — 101 of 118 `console.*` calls ship to production, several with sensitive payloads

**Where:** across `src/`; worst offenders below

| File | Ungated calls | Notable content |
|---|---|---|
| `StoredPrefs.ts` | 24 | token read/write failures |
| `CartScreen.tsx` | 12 | order placement flow |
| `OrderModificationSheet.tsx` | 11 | cart state |
| `useAuthStore.ts` | 9 | **token metadata** (`:134`) |
| `orderApi.ts` | 7 | **full order body incl. address id** (`:59`) |
| `locationApi.ts` | 4 | **raw GPS coordinates** (`:65`) |
| `stockApi.ts` | 4 | **full cart contents** (`:37`) |

Specifically:

```ts
// useAuthStore.ts:134 — token metadata
console.log('checkExistingAuth: Retrieved tokens', {
  hasAccessToken: !!accessToken, accessTokenLength: accessToken?.length || 0, ...
});

// locationApi.ts:65 — user's precise location
console.log('[LOC] findByLocation: POST', `${BASE}/villages/find-by-location`, coords);
```

On Android these land in logcat, readable by anything with `READ_LOGS` or an attached
debugger, and they persist in bug-report dumps.

**The correct pattern already exists in this codebase.** `LocationService.ts` gates all
15 of its logs:

```ts
if (__DEV__) console.log('[LOC] firstFix: got', pos?.coords?.latitude, ...);
```

This is a consistency problem, not a knowledge problem.

**Fix sketch:** A tiny `logger` module in `src/base` that no-ops on `!__DEV__`, plus an
ESLint `no-console` rule to stop regression. Strip the sensitive payloads entirely
rather than gating them.

**Effort:** M

---

### H2 — Web build stores access and refresh tokens in `localStorage`

**Where:** `WebStorageService.ts:10`, selected by `StorageServiceFactory` for `IS_WEB`

```ts
async getItem(key: string): Promise<string | null> {
  return localStorage.getItem(key);
}
```

Mobile does this correctly — `MobileStorageService.native.ts:11` uses
`SecureStore.getItemAsync`. On web, any XSS (including via a third-party script) reads
both tokens and gains full account access until refresh expiry.

**Fix sketch:** Depends on whether web is a shipping target. If it is: move refresh tokens
to an httpOnly cookie set by the server and keep only the access token in memory. If web
is dev-only convenience, document that and gate the build.

**Effort:** L (needs a server-side decision) — **but the decision itself is S and worth making now**

---

### H3 — Zero `React.memo` in the entire app

**Where:** verified by grep across all `.tsx` — no matches for `React.memo(` or `memo(`.
Only 16 of 171 files use `useMemo`/`useCallback` at all.

Combined with `DynamicProductCard.tsx:22`:

```tsx
const cart = useVillageStore((s) => s.cart);   // subscribes to the whole object
```

…every product card in every rail re-renders whenever *any* cart entry changes, because
`addToCart` replaces the `cart` object identity (`useVillageStore.ts:60-69`). On the home
screen with several rails, one tap on a stepper re-renders every visible card, each
re-running its NativeWind class resolution.

**Fix sketch:** `React.memo` on `ProductCard` / `DynamicProductCard` / `CartItemRow`, and
have cards subscribe to their own count (`s => s.cart[key] ?? 0`) rather than the whole
`cart` object.

**Effort:** M

---

### H4 — `cartCount()` is invoked inside Zustand selectors in 7 view models

**Where:** `useHomeViewModel.ts:14`, `useSearchViewModel.ts:22`,
`useCategoriesViewModel.ts:6`, `useTopPicksViewModel.ts:8`,
`useCategoryDetailsViewModel.ts:13`, `useCartViewModel.ts:16`

```ts
const cartCount = useVillageStore(state => state.cartCount());
```

Zustand runs every selector on every store notification. `cartCount()`
(`useVillageStore.ts:110-113`) reduces over all cart entries, so each unrelated store
update — locale change, favourite toggle, `registerDynamicPrices` — triggers a full cart
scan per mounted view model.

Correctness is fine (it returns a number, so `Object.is` still bails out of re-rendering).
It's wasted work in the hottest code path in the app.

**Fix sketch:** Derive count in the store as state updated on mutation, or memoize with a
stable selector. `registerDynamicPrices` (`useVillageStore.ts:107`) is a particularly bad
trigger since it fires on every home-layout load.

**Effort:** S

---

### H5 — Production money math lives in the mock-data file and carries a ×20 multiplier

**Where:** `villageData.ts:1068` (`getCartItems`), `villageData.ts:1100` (`computeBill`),
`useVillageStore.ts:115-136` (`cartTotal`)

`villageData.ts` is a 1124-line file of static demo catalog data. It also exports the
bill engine that every real order goes through:

```ts
// useVillageStore.ts:133
total += price * count * 20;

// villageData.ts:1117-1119
const couponDiscount = opts?.couponApplied
  ? Math.min(itemTotal * 0.10, 2)   // "10%, capped at ₹40 (= 2 pre-multiplier)"
  : 0;
```

The ×20 mock-catalog scaling factor is baked into the pricing rules, and the coupon cap is
expressed in pre-multiplier units. `CartScreen.tsx:329` passes
`Math.round(vm.bill.grandTotal)` into the checkout sheet, so the number the customer
confirms is derived from this.

Consequences beyond the pricing risk:

- Five production modules import from the mock file — `useVillageStore`, `useCartViewModel`,
  `useProductsQuery`, `useCategoriesQuery`, `useHeroSlidesQuery`.
- `rupees()`, a two-line currency formatter, also lives there, so `CartItemRow`,
  `SavingsStrip`, `OrderDetailScreen`, and `OrderModificationSheet` each pull the entire
  demo catalog into their module graph purely to format a number.

**Fix sketch:** Three separate moves — `rupees` → `src/shared/utils/currency.ts`;
`computeBill`/`getCartItems` → `src/features/cart/domain/` (where `checkoutState` already
lives, with tests); then audit whether the ×20 multiplier should exist at all now that
`dynamicPrices` carries real rupee values (`useVillageStore.ts:120-123`).

**Effort:** M — **do this before the pricing rules change again**

---

### H6 — 14 screens render lists with `.map()` inside `ScrollView`; only 2 use `FlatList`

**Where:** `CartScreen.tsx:282`, `SearchScreen.tsx`, `TopPicksScreen.tsx`,
`ProductCarouselRow.tsx`, `SubcategoryRail.tsx`, `SelectLocationScreen.tsx`,
`OrderModificationSheet.tsx:171`, and 7 more.

Only `CategoryDetailsScreen.tsx` and `OrdersScreen.tsx` use `FlatList`.

Every row mounts eagerly with no virtualization and no recycling. Search results and
top-picks are unbounded — a 200-result search mounts 200 cards, each with an image, before
the first frame paints.

**Fix sketch:** Convert the unbounded lists first (search, top-picks, category products);
short fixed lists like the cart's item rows and the payment section are fine as-is. Pairs
naturally with H3, since `FlatList` only pays off with memoized row components.

**Effort:** M

---

### H7 — No error boundary anywhere in the tree

**Where:** `app/_layout.tsx` — grep for `ErrorBoundary` / `componentDidCatch` /
`getDerivedStateFromError` across `src/` and `app/` returns nothing.

Any render-phase throw unmounts the whole app to a white screen with no recovery path and
no report. Given the number of `any`-typed API responses feeding straight into render
(M4), a malformed payload is a plausible trigger.

Related gap: `expo-splash-screen` is a declared dependency but never imported. `app/_layout.tsx:26`
returns `null` until fonts load, with no timeout and no fallback — if font loading hangs,
the app shows a blank frame indefinitely.

**Fix sketch:** One `ErrorBoundary` wrapping `<Stack>` with a retry action, plus
`SplashScreen.preventAutoHideAsync()` / `hideAsync()` around the font gate with a timeout
fallback to system fonts.

**Effort:** S

---

### H8 — 3 of 15 test suites fail on this branch

```
Test Suites: 3 failed, 12 passed, 15 total
Tests:       3 failed, 94 passed, 97 total
```

**Three distinct causes:**

1. **A real regression.** `productDetailApi.test.ts` — 2 assertion failures:
   ```
   ● mapProductDetail › treats absent stock as in-stock and active by default
     Expected: true   Received: false
   ● mapProductDetail › maps inStock from stock count
     Expected: true   Received: false
   ```
   The in-flight variant-stock mapper rewrite changed `inStock` semantics; the tests
   encode the old contract. One of the two is wrong and it needs a decision, not a
   snapshot update — this is the same `inStock` logic implicated in C4.

2. **Broken test infrastructure.** `OrderModificationSheet.test.tsx` fails at *import*
   on `react-native-worklets`, so zero of its tests run. `jest.setup.js` is a single line
   (`import '@testing-library/jest-native/extend-expect'`) with no reanimated mock. Any
   component that transitively imports `VillageBottomSheet` is currently untestable, which
   is most of the sheet-based UI.

3. **A test written against DOM semantics.** `CartItemRow.test.tsx:72`:
   ```
   TypeError: _reactNative.screen.getByText(...).closest is not a function
   ```
   ```tsx
   const badge = screen.getByText('Out of stock').closest('View');
   if (badge) {
     fireEvent.press(badge);
     expect(onOutOfStockPress).toHaveBeenCalled();
   }
   ```
   `.closest()` is a web DOM API that React Native Testing Library doesn't provide.
   Worth noting the shape of this test independent of the crash: the assertion sits
   inside `if (badge)`, so had `.closest` returned `null` rather than throwing, the test
   would have **passed without asserting anything**. Worth grepping the suite for the same
   pattern.

**Fix sketch:** Add `jest.mock('react-native-reanimated', ...)` to `jest.setup.js`; rewrite
the `CartItemRow` assertion against RNTL queries (`getByTestId` on the badge) with the
assertion unconditional; resolve the `inStock` contract question deliberately and update
whichever side is wrong.

**Effort:** S

---

## 5. Medium

### M1 — ~700 lines of dead, web-only code

| File | Lines | References |
|---|---|---|
| `src/core/utils/progressiveEnhancement.ts` | 369 | **0** |
| `src/core/utils/imageOptimization.ts` | 303 | **0** |
| `src/core/utils/imageSource.ts` | — | **0** |

`progressiveEnhancement.ts` is browser-only (`WebGLRenderingContext`, `PerformanceObserver`,
`document.documentElement.classList`, `navigator.deviceMemory`) in a React Native app, and
**self-executes on import**:

```ts
// progressiveEnhancement.ts:367-369
if (typeof window !== 'undefined') {
  initializeProgressiveEnhancement();
}
```

Harmless today only because nothing imports it. It also registers a `beforeunload`
listener and a permanent `PerformanceObserver` if it ever were imported.

**Fix sketch:** Delete all three. Recoverable from git.

**Effort:** S

---

### M2 — `fbtProducts` sorts the entire catalog on every cart change and is never rendered

**Where:** `useCartViewModel.ts:29-35`

```ts
const fbtProducts = useMemo(() => {
  const cartProductIds = new Set(cartItems.map(item => item.productId));
  return ALL_PRODUCTS.filter(p => !cartProductIds.has(p.id))
    .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
    .slice(0, 8);
}, [cartItems]);
```

It's returned from the view model and consumed by nobody — grep for `fbtProducts` finds
only its definition and the return statement. A full filter + sort of the catalog runs on
every single cart mutation to produce a value that is discarded.

**Effort:** S

---

### M3 — ~90 lines of unreachable UI in `OrderModificationSheet`

**Where:** `OrderModificationSheet.tsx:46`, `:75`, `:323-413`

`state` is initialized to `'conflicts'` and the only `setState` call in the file
(line 75) also sets `'conflicts'`. The entire `'all-sorted'` branch — header, item list,
success banner, footer — is unreachable, and is a near-duplicate of the `'conflicts'`
branch it sits beside.

**Effort:** S

---

### M4 — 129 `any` usages despite `"strict": true`

Concentrated exactly where it's most dangerous — the API boundary:

| File | Count |
|---|---|
| `homeLayoutMapper.ts` | 14 |
| `ordersApi.ts` | 10 |
| `locationApi.ts` | 7 |
| `appAuthApi.ts` | 7 |
| `apiClient.ts` | 6 |

Every `apiClient` method defaults to `<T = any>` (`apiClient.ts:287-325`), and
`AuthState.user` is `any` (`useAuthStore.ts:16`), so unvalidated server payloads flow
untyped into global state and then into render. `strict: true` is doing nothing along the
path where it would help most.

**Fix sketch:** Type the response DTOs at each `data/` module boundary — the mappers
already exist, they just accept `any` inputs. Highest value: `homeLayoutMapper` and
`ordersApi`.

**Effort:** L (incremental — can be done per-feature)

---

### M5 — Route strings cast `as any` in 10+ call sites

**Where:** `CategoryDetailsScreen.tsx:74`, `DynamicProductCard.tsx:27`,
`CategoriesScreen.tsx:48`, `SelectLocationScreen.tsx:47,144`, `LocationSheet.tsx:34`,
`LocationPermissionSheet.tsx:44`, `DeliveryAddressScreen.tsx:82`,
`MapPickerScreen.tsx:54,58`, `CartScreen.tsx:74`

```tsx
router.push('/address/add' as any);
```

This defeats expo-router's typed routes wholesale — a typo'd or renamed route becomes a
silent runtime no-op instead of a compile error.

**Fix sketch:** Enable `experiments.typedRoutes`, then remove the casts and fix whatever
surfaces. The casts are likely suppressing genuine route-name drift already.

**Effort:** S

---

### M6 — Modules that need decomposition

| File | Lines | Problem |
|---|---|---|
| `LoginBottomSheet.tsx` | **1107** | 6 step components (`PhoneStep`, `OtpStep`, `SignupStep`, `PlacingStep`, `SuccessStep`, `PlacingErrorStep`), the orchestrator, and a 360-line `StyleSheet` in one file |
| `OrderModificationSheet.tsx` | 417 | ~90 dead (M3), two near-identical row renderers |
| `CartScreen.tsx` | 370 | business logic inline in the view (below) |
| `OrdersScreen.tsx` | 374 | — |
| `DeliveryAddressScreen.tsx` | 368 | — |
| `StoredPrefs.ts` | 337 | 24 near-identical try/catch accessor pairs |

`LoginBottomSheet` is also mounted **three times simultaneously** in CartScreen
(`CartScreen.tsx:322-350`) behind three separate booleans — `loginSheetVisible`,
`addressLoginVisible`, `pureLoginVisible` — for three different purposes.

Concrete extraction targets in `CartScreen.tsx`:

- `handlePlaceOrder` (`:114-153`) — validation + API call + conflict detection + cart
  clearing + navigation in one function. Belongs in `useCartViewModel` or a dedicated
  `useCheckout` hook.
- `handleManualAdjustment` (`:161-195`) — see M7.
- The duplicated `itemsToCheck` mapping (`:54-58` and `:96-100`) — see M8.

**Fix sketch:** `LoginBottomSheet` → one directory, one file per step, shared styles
module; the three CartScreen instances → one instance driven by a discriminated union
(`{ kind: 'checkout' | 'address-gate' | 'login' } | null`). Extract CartScreen's handlers
into the view model so the view only renders.

**Effort:** L (but splits cleanly into independent pieces)

---

### M7 — Cart quantity adjustments write to the store one unit at a time

**Where:** `CartScreen.tsx:179-190`

```tsx
const diff = newQuantity - cartItem.count;
if (diff > 0) {
  for (let i = 0; i < diff; i++) vm.addToCart(cartItem.key);
} else if (diff < 0) {
  for (let i = 0; i < Math.abs(diff); i++) vm.decFromCart(cartItem.key);
}
```

Each call is a separate Zustand `set`, so adjusting an item by 10 units fires 10 store
notifications → 10 render passes across every subscribed view model (see H4), each
re-running `getCartItems` and `computeBill`. Applied in a loop over every adjusted item.

**Fix sketch:** Add a `setQuantity(key, n)` action to `useVillageStore` and call it once
per item. Also fixes a latent bug: `addToCart`'s `maxQuantity` guard (`useVillageStore.ts:57`)
is bypassed here since it's called without that argument.

**Effort:** S

---

### M8 — Stock verification misses quantity changes

**Where:** `CartScreen.tsx:52-63`

```tsx
React.useEffect(() => { ... }, [vm.cartItems.length]); // Re-check when cart items count changes
```

The effect body reads `vm.cartItems` contents, but only `length` is in the dep array.
Changing the quantity of an existing line item doesn't change the length, so stock is
never re-verified for it.

**Failure scenario:** Cart holds 2 units of an item with 3 in stock — verification passes.
User increases to 8. No re-verification runs; the cart shows no warning; the conflict only
surfaces after "Place Order" fails at `CartScreen.tsx:135`. The entire pre-checkout
verification UI is bypassed for the most common adjustment users make.

The same `itemsToCheck` mapping is also duplicated verbatim at `:54-58` and `:96-100`.

**Fix sketch:** Extract `buildStockCheckItems(cartItems)` to the view model, depend on a
stable serialization of `(key, count)` pairs, and debounce so stepper taps don't fan out
into a request per tap.

**Effort:** S

---

## 6. Low

| # | Finding | Where |
|---|---|---|
| L1 | ESLint is the bare Expo config — no `no-console`, no import ordering, no unused-export detection. All of M1/H1 would have been caught by lint. | `eslint.config.js` |
| L2 | `AppConfig.version` hardcoded `'1.0.0'` with its own comment saying it should come from `package.json`. Ships in the `Village-App-Version` header, so server-side version analytics are wrong. | `AppConstants.ts:35` |
| L3 | `orders: []` marked `// TEMP: empty for UI testing` — dead state, real orders come from `ordersApi`. | `useVillageStore.ts:39` |
| L4 | `OrderModificationSheet` has no i18n at all — every string is an English literal, while the rest of the app uses `t()`. Same for `PromoStrip.tsx`. | `OrderModificationSheet.tsx` |
| L5 | Two different cart-key parsers that can disagree: regex `/^(.+)-v(\d+)$/` vs `lastIndexOf('-v')`. Both are greedy-last-match today, so they agree — but they're separate implementations of one rule. | `useVillageStore.ts:43` vs `villageData.ts:1084` |
| L6 | `User-Agent: Mozilla/5.0` spoofing to get past the API's nginx filter. Correctly documented as a workaround; needs a server-side fix to retire. | `apiClient.ts:95-98` |
| L7 | React Query is configured but order placement bypasses it entirely — no mutation state, no retry policy, no cache invalidation on success. | `CartScreen.tsx:120` |
| L8 | Telugu fonts always loaded despite `loadLocale` documenting that "MVP ships English only". Blocking font load for an unused locale. | `app/_layout.tsx:18-21`, `useVillageStore.ts:99-100` |

---

## 7. Recommended sequence

The critical findings cluster in one place — **the cart → stock-check → checkout path** —
and several are entangled with the uncommitted work on this branch. That suggests the
order below rather than "criticals first, alphabetically".

**Phase 0 — Unblock the branch** *(effort: S, ~half a day)*
H8 (fix jest setup; resolve the `inStock` contract question), then C2 + C3 (timeouts —
both are one-line contract fixes in the same file). This gives every later change a
working test suite, and C2/C3 are prerequisites for trusting any stock-path change.

**Phase 1 — Cart/checkout correctness** *(effort: M, ~2 days)*
C1 (adjustment reset), C4 (variant collision), M8 (missed quantity re-verification),
M7 (batched quantity writes). These four are the same code path and touch the same files;
doing them together avoids four rounds of re-testing the same flow. C4 should land
alongside the in-flight variant-stock work, not after it.

**Phase 2 — Hygiene sweep** *(effort: S–M, ~1 day)*
M1 (delete ~700 dead lines), M2, M3 (delete dead compute and dead UI), H1 (logger +
`no-console` lint), H7 (error boundary + splash), L1 (lint rules). Low risk, high
signal-to-noise improvement, and shrinks the surface area for everything after.

**Phase 3 — Structural** *(effort: M, ~2 days)*
H5 (get money math and `rupees` out of the mock file — **do this before pricing rules
change again**), C5 (persist the cart).

**Phase 4 — Performance** *(effort: M, ~2 days)*
H3 + H6 together (memoization and `FlatList` only pay off in combination), H4.

**Phase 5 — Ongoing** *(effort: L, incremental)*
M4 (type the API boundary, per feature), M6 (decompose large modules, one at a time),
M5 (typed routes).

**Deliberately excluded:** H2 (web token storage) needs a product decision on whether web
is a shipping target before any engineering time goes into it. The decision is cheap; the
implementation is not.

---

## 8. Metrics

| Metric | Value |
|---|---|
| TS/TSX files (`src/` + `app/`) | 171 |
| Total lines | ~17,700 |
| Test suites | 15 (12 passing, **3 failing**) |
| Tests | 97 (94 passing, **3 failing**) |
| `console.*` calls | 118 total, **101 ungated** |
| `any` usages | 129 (with `strict: true`) |
| Files using `React.memo` | **0** |
| Files using any memoization | 16 / 171 |
| `FlatList` / `.map()`-in-`ScrollView` | 2 / 14 |
| Verified-dead lines | ~700 (M1) + ~90 (M3) + ~10 (M2) |
| Largest file | `villageData.ts` (1124) — mock data + production bill engine |
| Largest component | `LoginBottomSheet.tsx` (1107) |
| Error boundaries | **0** |
| TODO/FIXME comments | 0 |
