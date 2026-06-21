# Cart Address Flow with Authentication — Design

Date: 2026-06-21
Status: Approved (pending implementation plan)

## Problem

The Cart screen shows a **hardcoded** delivery address ("221B Baker Street…") and
its "Change" button does nothing. There is no concept of a *selected delivery
address*, no way to add an address (`createAddress`/`updateAddress` exist in the
data layer but are never called), and no authentication gate around the address
flow.

We need: from the Cart, a user can select an existing delivery address or add a
new one; unauthenticated users must log in / sign up first; after auth they
return to the Cart and continue seamlessly; a newly added address becomes the
selected delivery address and the Cart reflects it immediately.

## What already exists (reused, not rebuilt)

- **Auth** — `useAuthStore` (`requestOtp`, `verifyOtp` → `'ok' | 'new_user'`,
  `signupUser`, `isAuthenticated`) wired to `app/auth/login`, `verify-otp`,
  `signup`. `LoginBottomSheet` has phone → OTP → signup → success steps and a
  `mode='auth'` path that authenticates and calls `onComplete` without the
  order/placing animation.
- **Address data layer** — `locationApi`: `listAddresses`, `createAddress`,
  `updateAddress`, `deleteAddress`. `useAddressBookViewModel` loads saved
  addresses into `useLocationStore.savedAddresses`.
- **Map / serviceability** — `useMapPickerViewModel` (region, center-pin,
  serviceability resolve on settle, `village`, `useCurrentLocation`) and
  `MapPickerScreen`.
- **Store** — `useLocationStore` with `savedAddresses`, `selectAddress`
  (currently only resolves coords → serviceable village), `serviceableVillage`.
- **Storage** — `StorageKeys.SELECTED_ADDRESS_ID` already declared (unused).

## Design

### 1. Selected delivery address (single source of truth)

`useLocationStore` gains a real *selected delivery address* concept:

- State: `selectedAddressId: string | null`, persisted to
  `StoredPrefs` under `StorageKeys.SELECTED_ADDRESS_ID`, hydrated on app load.
- Action `setSelectedAddress(address: Address)`: sets `selectedAddressId`,
  persists it, and resolves serviceability by the address's coords (so changing
  the delivery address can change the active store / `x-store-id`). This reuses
  the existing `resolveCoords` path rather than duplicating it.
- The existing `selectAddress(address)` (used by the home location screens —
  `SelectLocationScreen`, `LocationPermissionSheet`) is extended to **also** set
  `selectedAddressId` on success. This makes the selection a single source of
  truth: an address picked anywhere (home or cart) is the one the Cart shows.
- A selector derives the active `Address` object from
  `savedAddresses.find(a => a.id === selectedAddressId)`.
- **Server sync**: server `isDefault` is the source of truth; the local id is an
  instant-render cache. Adds-from-cart send `isDefault: true`. When
  `listAddresses()` returns and no local `selectedAddressId` is set, the address
  with `isDefault === true` seeds the selection.

A location set on home via GPS/map (serviceable village, but no saved `Address`)
sets `serviceableVillage` only — it does **not** set `selectedAddressId`. The
Cart card is driven strictly by `selectedAddressId`, so a village-only location
shows "Add a delivery address" (see §3).

### 2. Cart screen

- New `useCartAddressViewModel`: when authenticated, loads saved addresses
  (reuses `useAddressBookViewModel`) and exposes the resolved selected `Address`
  plus `isAuthenticated`.
- New `DeliveryAddressCard` replaces the hardcoded card, with three states:
  - **Not authenticated** → "Add a delivery address". Tap → auth gate.
  - **Authenticated, no selected address** (even if a serviceable village is set)
    → "Add a delivery address". Tap → address screen.
  - **Authenticated, has selected address** → shows tag + `addressLine1` +
    village. "Change" → address screen.
- Tap handler:
  - Not authenticated → open `LoginBottomSheet` (`mode='auth'`) over the Cart.
    On `onComplete`, navigate to the address screen (intent preserved via a
    `pendingAddressFlow` flag so auth flows straight into the address screen).
  - Authenticated → navigate directly to the address screen.
- Cart state is never unmounted: the login step is a sheet, and the address
  screen is a pushed route with the Cart preserved underneath.

### 3. DeliveryAddressScreen (new)

Route `app/address/index.tsx` → `DeliveryAddressScreen`. A map-based address
manager (Blinkit/Zepto style) with two bottom-sheet modes over a single map.

**List mode** (default):
- Map shows the current selected/serviceable location.
- Bottom sheet lists saved addresses with a ✓ on the selected one, plus an
  "Add new address" button.
- Empty state when authenticated with no saved addresses.
- Tap a saved address → `setSelectedAddress(a)` → `router.back()` to Cart.
- Tap "Add new address" → switch to add mode.

**Add mode**:
- Center pin over a pannable map; serviceability resolves on each settle
  (reusing `useMapPickerViewModel`).
- "Confirm location" (enabled only when the pin is serviceable) reveals the
  details form: flat/house no. → `addressLine1`, landmark, tag selector
  (home/work/other), "set as default" (defaulted on for cart adds).
- **Save** (enabled only when serviceable **and** `addressLine1` non-empty):
  `createAddress({ villageId: village.id, latitude/longitude from region
  center, addressLine1, landmark, tag, isDefault: true })` →
  `setSelectedAddress(newAddress)` → refresh `savedAddresses` via
  `listAddresses()` → `router.back()` to Cart. Cart shows the new address
  immediately.

### 4. Components and responsibilities

- `useLocationStore` — `selectedAddressId` state, `setSelectedAddress`, extended
  `selectAddress`, selected-address selector, persistence/hydration via the
  existing `StorageKeys.SELECTED_ADDRESS_ID`.
- `useCartAddressViewModel` — loads addresses when authenticated; resolves the
  selected `Address` for the card.
- `DeliveryAddressCard` — presentational, three states, in the Cart.
- `DeliveryAddressScreen` + `app/address/index.tsx` — orchestrates list/add
  modes; reads `savedAddresses` + selection from the store.
- `useAddAddressViewModel` — add-mode form state + `createAddress` save sequence;
  reuses `useMapPickerViewModel` for the map/serviceability part.

### 5. Error and loading handling

- Auth errors: handled inside `LoginBottomSheet` (existing).
- `createAddress` failure: inline error on the form, fields preserved,
  retryable; no navigation.
- `listAddresses` failure: retry affordance in the list sheet (existing
  `useAddressBookViewModel` tracks `loading`/`error`).
- Save disabled unless the pin is serviceable and `addressLine1` is non-empty.

### 6. Testing

- Unit-test the store selection logic: set/persist/hydrate `selectedAddressId`,
  derive the selected `Address` from the list, server-`isDefault` seeding, and
  that `selectAddress` sets the id.
- Unit-test `useAddAddressViewModel`'s save sequence (createAddress →
  setSelectedAddress → refresh → back).
- Manually verify the four end-to-end paths:
  1. Not logged in → login (existing user) → OTP → address screen → add → cart
     shows new address.
  2. Not logged in → login (new user) → OTP → signup → address screen.
  3. Logged in → select an existing saved address → cart updates.
  4. Address selected on home → cart already shows it (no re-selection).
- Confirm the jest/test setup during planning and match existing patterns.

## Scope guardrails (YAGNI)

Out of scope: editing/deleting addresses from the cart flow (delete already
exists in the address book), address search/autocomplete, and multi-store cart
reconciliation when the delivery store changes. The flow is strictly: auth gate
→ select-or-add → set selected → refresh cart.

## End-to-end UX

- Cart → tap address card / "Change".
- If not authenticated → `LoginBottomSheet` (auth mode); existing user verifies
  OTP, new user signs up then verifies → returns and continues into the address
  screen.
- Address screen: pick a saved address (→ selected, back to cart) or add a new
  one on the map (→ saved with `isDefault: true`, selected, back to cart).
- Cart reflects the selected delivery address immediately; cart state is
  preserved throughout.
