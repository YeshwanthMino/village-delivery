# Cart: never auto-pick a delivery address

**Date:** 2026-06-23
**Status:** Approved
**Branch:** feat/address-location-flow

## Problem

After login, the Cart auto-selects whichever saved address is flagged
`isDefault`, even when the user never picked an address. The user expects the
Cart to show a delivery address only when they have *explicitly* chosen one
(either in the Home location flow or in the Cart's address screen).

Two code paths cause the unwanted fallback-to-default:

1. `setSavedAddresses` (store) calls `seedSelectedId`, which adopts the default
   address's id when nothing is selected, then persists it.
2. `useCartAddressViewModel` calls `deriveSelectedAddress`, which falls back to
   `pickDefaultAddress` when no explicit selection exists.

## Desired behavior

| Situation | Cart shows |
|-----------|-----------|
| No explicit selection anywhere | "Select delivery address" prompt |
| User selected a saved address in **Home** | that address |
| User selected an address in the **Cart** address screen | that address |
| The previously-selected address was deleted | prompt (selection cleared) |

The `isDefault` flag never drives Cart selection on its own.

### Why the Home selection already works

When the user picks a saved address in Home (`LocationPermissionSheet` /
`SelectLocationScreen` → `vm.selectAddress(a)` → store `selectAddress`), the
store sets `selectedAddressId` on success
(`src/core/store/useLocationStore.ts:239`). The Cart resolves its address with
`findAddressById(addresses, selectedAddressId)`, so an explicit Home selection
flows straight through. This spec must preserve that path.

## Changes

### 1. `src/features/location/domain/addressSelection.ts`

- `deriveSelectedAddress(addresses, selectedId)` → return only
  `findAddressById(addresses, selectedId)`. Drop the `pickDefaultAddress`
  fallback.
- Replace `seedSelectedId` with
  `reconcileSelectedId(addresses, currentSelectedId)`: return
  `currentSelectedId` only when an address with that id still exists in the
  list, otherwise `null`. No default seeding. This also fixes a latent bug
  where a stale/deleted selected id silently fell back to the default.
- Remove `pickDefaultAddress` — it becomes dead code (only referenced here and
  in tests after this change).
- `findAddressById` is unchanged.

### 2. `src/core/store/useLocationStore.ts`

- `setSavedAddresses` calls `reconcileSelectedId` instead of `seedSelectedId`.
- Update the import.
- Persistence logic is unchanged: when the reconciled id differs from the
  previous one (including being cleared to `null`), write it to
  `StorageKeys.SELECTED_ADDRESS_ID`.

### 3. `src/features/location/domain/__tests__/addressSelection.test.ts`

- `deriveSelectedAddress`: drop the "falls back to default" case; assert it
  returns `null` when the selected id is missing, and the selected address when
  the id matches.
- Replace the `seedSelectedId` suite with a `reconcileSelectedId` suite:
  - keeps a still-valid selection id,
  - returns `null` when the selected id no longer exists in the list,
  - returns `null` when nothing is selected,
  - never seeds from `isDefault`.
- Remove the `pickDefaultAddress` suite.

## Out of scope / notes

- **No Cart UI change.** `CartScreen` / `CheckoutBar` already render the
  "Select delivery address" prompt when `selectedAddress == null`
  (`hasAddress` is derived from it).
- **The "Set as default" checkbox** in the add-address form stays (still
  persisted to the backend); it just no longer auto-fills the Cart. Add a brief
  code comment near the selection helpers noting that `isDefault` is
  intentionally not used for Cart selection, so the removed fallback is not
  mistaken for a regression later.
- **Explicit picks still persist across sessions** — tapping an address saves
  its id (`SELECTED_ADDRESS_ID`), so it is remembered on next launch. Only the
  default-based auto-pick is removed.

## Verification

- `reconcileSelectedId` and `deriveSelectedAddress` unit tests pass.
- Manual: fresh login, open Cart without selecting → prompt shown. Select an
  address in Home → Cart shows it. Delete the selected address → Cart returns to
  the prompt.
