# Selecting a saved address sets the active store (no find-by-location)

Date: 2026-06-24

## Problem

On the Home page the location toolbar shows the active village name from
`serviceableVillage.name`, and the home feed is gated on
`serviceableVillage.storeId` (`useHomeLayoutViewModel.ts` returns early without
it). When the user selects a saved delivery address, the toolbar falls back to
the "Select delivery location" placeholder instead of showing the village name,
and the feed does not switch to that address's store.

Two root causes:

1. **The address mapper does not match the API shape.** `mapAddress` looks for a
   `village` key, but `GET /app/address` returns the village as a nested object
   under `villageId`, plus a top-level `storeId` and a `location` object. As a
   result `villageName` maps to `''`, `villageId` maps to `"[object Object]"`,
   and `storeId` is never captured (the `Address` model has no `storeId` field).

2. **Selection depends on `find-by-location`.** `setSelectedAddress` →
   `selectAddress` resolves the serviceable `Village` (with `storeId`) by calling
   `findByLocation(coords)`. That network round-trip is unnecessary: the address
   payload already carries the village title, `storeId`, coordinates, and
   pincode.

## API shape (confirmed)

`GET /app/address` returns an array of:

```json
{
  "_id": "6a37e5e5...",
  "storeId": "68989c821388764b3a92f0dd",
  "label": "Home",
  "addressLine": "1-127, near post office",
  "villageId": {
    "_id": "691860854a92a246c6456b98",
    "title": "Errepalli (Diguva HW)",
    "storeId": "68989c821388764b3a92f0dd",
    "pincode": "123456",
    "defaultLocation": { "latitude": 13.3599, "longitude": 79.0282 }
  },
  "isDefault": true,
  "location": { "latitude": 13.360002, "longitude": 79.028059 }
}
```

So a selected address contains everything required to build a serviceable
`Village` directly.

## Design

A single change spanning three layers.

### 1. `Address` model — `src/features/location/domain/models.ts`

Add one optional field:

```ts
export interface Address {
  // ...existing fields...
  storeId?: string;
}
```

`villageName`, `villageId`, `latitude`, `longitude`, and `pincode` already exist.

### 2. `mapAddress` — `src/features/location/data/mappers.ts`

Read the real API shape, with the nested `villageId` object as the primary
source. Keep existing fallbacks so the old/flat shape still parses (backward
compatible).

- `storeId` ← top-level `storeId`, fallback `villageId.storeId`
- `villageId` (string) ← `villageId._id` when `villageId` is an object;
  fallback to the existing string/`village` handling
- `villageName` ← `villageId.title`, fallback `villageId.name`, then the
  existing fallbacks
- `latitude` / `longitude` ← `location.*`, fallback `villageId.defaultLocation.*`
- `pincode` ← top-level `pincode`, fallback `villageId.pincode`

### 3. `setSelectedAddress` — `src/core/store/useLocationStore.ts`

Switch the active store from the address itself, no `find-by-location`:

```
setSelectedAddress(address):
  set({ selectedAddressId: address.id })
  persist SELECTED_ADDRESS_ID
  if address.storeId:
    village = {
      id: address.villageId || address.storeId,
      name: address.villageName,
      pincode: address.pincode,
      latitude: address.latitude,
      longitude: address.longitude,
      storeId: address.storeId,
    }
    await setServiceable(village)   // sets serviceableVillage, status='serviceable', persists
  else:
    await selectAddress(address)    // legacy find-by-location fallback
```

`setServiceable` already updates `serviceableVillage`, sets
`status: 'serviceable'`, and persists to `StorageKeys.SERVICEABLE_VILLAGE`, so
the toolbar name and the feed's `storeId` both resolve from the selection.

The existing `selectAddress` (find-by-location based) remains as the fallback for
any address that lacks `storeId`.

## Data flow

```
DeliveryAddressScreen.onSelectExisting / cart selection
  -> setSelectedAddress(address)
       -> setServiceable(villageFromAddress)   [happy path, no network]
            -> serviceableVillage set (name + storeId)
                 -> LocationBar shows village name
                 -> useHomeLayoutViewModel loads feed for storeId
```

## Testing

- `mapAddress`: given the real nested-`villageId` payload, assert `villageName`
  ("Errepalli (Diguva HW)"), `villageId` (the village `_id`), `storeId`,
  `latitude`/`longitude` (from `location`), and `pincode`.
- `mapAddress`: backward-compat — the old flat/`village`-key shape still parses.
- store: `setSelectedAddress` with an address carrying `storeId` sets
  `serviceableVillage` (name + storeId), sets `status: 'serviceable'`, and does
  **not** call `findByLocation`.
- store: `setSelectedAddress` with an address missing `storeId` falls back to
  `selectAddress`.

## Out of scope

- No UI/layout changes.
- No change to the `find-by-location` flow used by GPS detect / search /
  map-picker.
- No change to the manage-mode address book behavior.
