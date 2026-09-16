# Select Saved Address Sets Active Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecting a saved delivery address sets the active store directly from the address payload (village name + storeId + coords), so the Home toolbar shows the village name and the feed loads — with no `find-by-location` call.

**Architecture:** Three layers. (1) The `Address` model gains an optional `storeId`. (2) `mapAddress` is fixed to read the real API shape (village nested under `villageId`, top-level `storeId`, `location` object). (3) A pure `villageFromAddress` helper builds a `Village` from an `Address`; `setSelectedAddress` uses it via `setServiceable`, falling back to the legacy `selectAddress` (find-by-location) only when an address has no `storeId`.

**Tech Stack:** TypeScript, Zustand store, Jest (`jest-expo` preset). Pure domain helpers are unit-tested; native/IO-bound store internals are not directly tested (matches existing codebase convention).

---

## File Structure

- `src/features/location/domain/models.ts` — add `storeId?: string` to `Address`.
- `src/features/location/data/mappers.ts` — fix `mapAddress` to parse the nested `villageId` object + top-level `storeId`/`location`.
- `src/features/location/data/__tests__/mappers.test.ts` — **new** test file for `mapAddress`.
- `src/features/location/domain/addressSelection.ts` — add pure `villageFromAddress(address)` helper.
- `src/features/location/domain/__tests__/addressSelection.test.ts` — extend with `villageFromAddress` tests (file already exists).
- `src/core/store/useLocationStore.ts` — rewire `setSelectedAddress` to use `villageFromAddress` + `setServiceable`, fallback to `selectAddress`.

---

## Task 1: Add `storeId` to the Address model

**Files:**
- Modify: `src/features/location/domain/models.ts` (the `Address` interface, around lines 28-40)

- [ ] **Step 1: Add the field**

In `src/features/location/domain/models.ts`, change the `Address` interface to add `storeId`:

```ts
export interface Address {
  id: string;
  villageId: string;
  villageName: string;
  storeId?: string; // village's x-store-id, carried so selection can switch the active store without find-by-location
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  tag: AddressTag;
  isDefault: boolean;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (the field is optional, so existing `Address` literals remain valid).

- [ ] **Step 3: Commit**

```bash
git add src/features/location/domain/models.ts
git commit -m "feat(location): add optional storeId to Address model"
```

---

## Task 2: Fix `mapAddress` to parse the real API shape

**Files:**
- Test: `src/features/location/data/__tests__/mappers.test.ts` (create)
- Modify: `src/features/location/data/mappers.ts` (the `mapAddress` function, lines 55-75)

- [ ] **Step 1: Write the failing test**

Create `src/features/location/data/__tests__/mappers.test.ts`:

```ts
// src/features/location/data/__tests__/mappers.test.ts
import { mapAddress } from '../mappers';

// Shape returned by GET /app/address (village nested under `villageId`).
const apiAddress = {
  _id: '6a37e5e544c38d7d5d569e86',
  storeId: '68989c821388764b3a92f0dd',
  label: 'Home',
  addressLine: '1-127, near post office',
  isDefault: true,
  location: { latitude: 13.360002, longitude: 79.028059 },
  villageId: {
    _id: '691860854a92a246c6456b98',
    title: 'Errepalli (Diguva HW)',
    storeId: '68989c821388764b3a92f0dd',
    pincode: '123456',
    defaultLocation: { latitude: 13.3599, longitude: 79.0282 },
  },
};

it('maps the nested villageId API shape into an Address', () => {
  const a = mapAddress(apiAddress);
  expect(a.id).toBe('6a37e5e544c38d7d5d569e86');
  expect(a.villageId).toBe('691860854a92a246c6456b98');
  expect(a.villageName).toBe('Errepalli (Diguva HW)');
  expect(a.storeId).toBe('68989c821388764b3a92f0dd');
  expect(a.addressLine1).toBe('1-127, near post office');
  expect(a.latitude).toBe(13.360002);
  expect(a.longitude).toBe(79.028059);
  expect(a.pincode).toBe('123456');
  expect(a.tag).toBe('home');
  expect(a.isDefault).toBe(true);
});

it('falls back to defaultLocation coords when no address location is present', () => {
  const a = mapAddress({ ...apiAddress, location: undefined });
  expect(a.latitude).toBe(13.3599);
  expect(a.longitude).toBe(79.0282);
});

it('still parses the legacy flat/village-key shape', () => {
  const a = mapAddress({
    _id: 'x1',
    villageId: 'v9',
    village: { name: 'Old Village' },
    addressLine1: '5 Old Rd',
    latitude: 1,
    longitude: 2,
    label: 'Work',
  });
  expect(a.id).toBe('x1');
  expect(a.villageId).toBe('v9');
  expect(a.villageName).toBe('Old Village');
  expect(a.storeId).toBeUndefined();
  expect(a.latitude).toBe(1);
  expect(a.tag).toBe('work');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/location/data/__tests__/mappers.test.ts`
Expected: FAIL — first test fails on `villageName` (currently `''`), `villageId` (currently `"[object Object]"`), and `storeId` (currently `undefined`).

- [ ] **Step 3: Rewrite `mapAddress`**

Replace the `mapAddress` function in `src/features/location/data/mappers.ts` (lines 51-75) with:

```ts
/**
 * Map an address API object into the domain Address. The /app/address API nests
 * the village as an object under `villageId` (with `_id`, `title`, `storeId`,
 * `defaultLocation`, `pincode`), and carries a top-level `storeId` plus a
 * `location` object. Older/flat shapes (a `village` key, or string ids) still
 * parse via fallbacks.
 */
export function mapAddress(raw: any): Address {
  const node = raw?.data ?? raw;
  const villageIdRaw = pick(node, ['villageId']);
  const villageKeyRaw = pick(node, ['village']);
  const villageObj =
    villageIdRaw && typeof villageIdRaw === 'object'
      ? villageIdRaw
      : villageKeyRaw && typeof villageKeyRaw === 'object'
        ? villageKeyRaw
        : null;
  const villageStr =
    typeof villageIdRaw === 'string'
      ? villageIdRaw
      : typeof villageKeyRaw === 'string'
        ? villageKeyRaw
        : undefined;
  const loc = node?.location && typeof node.location === 'object' ? node.location : null;
  const def =
    villageObj?.defaultLocation && typeof villageObj.defaultLocation === 'object'
      ? villageObj.defaultLocation
      : null;
  const storeId = pick(node, ['storeId']) ?? villageObj?.storeId;
  return {
    id: String(pick(node, ['_id', 'id']) ?? ''),
    villageId: String(villageObj?._id ?? villageStr ?? pick(node, ['villageId']) ?? ''),
    villageName: String(
      villageObj?.title ?? villageObj?.name ?? pick(node, ['villageName']) ?? villageStr ?? pick(node, ['name']) ?? '',
    ),
    storeId: storeId != null ? String(storeId) : undefined,
    addressLine1: String(pick(node, ['addressLine', 'addressLine1']) ?? ''),
    landmark: pick(node, ['landmark']),
    pincode: pick(node, ['pincode']) ?? villageObj?.pincode,
    latitude: pick(node, ['latitude', 'lat']) ?? loc?.latitude ?? def?.latitude,
    longitude: pick(node, ['longitude', 'lng', 'long']) ?? loc?.longitude ?? def?.longitude,
    tag: labelToTag(pick(node, ['label'])),
    isDefault: Boolean(pick(node, ['isDefault'])),
  };
}
```

Note: the `villageId: String(... ?? pick(node, ['villageId']) ...)` final fallback only runs when `villageObj` and `villageStr` are both absent, so it never stringifies an object (an object `villageId` is already captured by `villageObj?._id`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/location/data/__tests__/mappers.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/location/data/mappers.ts src/features/location/data/__tests__/mappers.test.ts
git commit -m "fix(location): map nested villageId + storeId in mapAddress"
```

---

## Task 3: Add pure `villageFromAddress` helper

**Files:**
- Modify: `src/features/location/domain/addressSelection.ts`
- Test: `src/features/location/domain/__tests__/addressSelection.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `src/features/location/domain/__tests__/addressSelection.test.ts`:

```ts
import { villageFromAddress } from '../addressSelection';
import type { Address } from '../models';

const fullAddress: Address = {
  id: 'a1',
  villageId: 'v1',
  villageName: 'Errepalli',
  storeId: 'store1',
  addressLine1: '1-127',
  pincode: '123456',
  latitude: 13.36,
  longitude: 79.02,
  tag: 'home',
  isDefault: true,
};

describe('villageFromAddress', () => {
  it('builds a Village carrying name, storeId, coords, pincode', () => {
    expect(villageFromAddress(fullAddress)).toEqual({
      id: 'v1',
      name: 'Errepalli',
      storeId: 'store1',
      pincode: '123456',
      latitude: 13.36,
      longitude: 79.02,
    });
  });

  it('returns null when the address has no storeId', () => {
    expect(villageFromAddress({ ...fullAddress, storeId: undefined })).toBeNull();
  });

  it('falls back to storeId for the village id when villageId is empty', () => {
    expect(villageFromAddress({ ...fullAddress, villageId: '' })?.id).toBe('store1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/location/domain/__tests__/addressSelection.test.ts`
Expected: FAIL — `villageFromAddress is not a function` / import error.

- [ ] **Step 3: Implement the helper**

In `src/features/location/domain/addressSelection.ts`, update the import line and append the function:

Change line 11 from:
```ts
import type { Address } from './models';
```
to:
```ts
import type { Address, Village } from './models';
```

Append at the end of the file:
```ts
/**
 * Build a serviceable Village straight from a saved address. Returns null when
 * the address carries no storeId (the home feed is keyed on storeId, so such an
 * address cannot switch the active store without a find-by-location fallback).
 */
export function villageFromAddress(address: Address): Village | null {
  if (!address.storeId) return null;
  return {
    id: address.villageId || address.storeId,
    name: address.villageName,
    storeId: address.storeId,
    pincode: address.pincode,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/location/domain/__tests__/addressSelection.test.ts`
Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/features/location/domain/addressSelection.ts src/features/location/domain/__tests__/addressSelection.test.ts
git commit -m "feat(location): add pure villageFromAddress helper"
```

---

## Task 4: Wire `setSelectedAddress` to set the store from the address

**Files:**
- Modify: `src/core/store/useLocationStore.ts` (import + `setSelectedAddress`, lines 247-256)

- [ ] **Step 1: Add the import**

In `src/core/store/useLocationStore.ts`, line 9 currently:
```ts
import { reconcileSelectedId } from '@/src/features/location/domain/addressSelection';
```
Change to:
```ts
import { reconcileSelectedId, villageFromAddress } from '@/src/features/location/domain/addressSelection';
```

- [ ] **Step 2: Rewrite `setSelectedAddress`**

Replace the `setSelectedAddress` action (lines 247-256) with:

```ts
  setSelectedAddress: async (address) => {
    // Record the selection so the cart reflects it instantly.
    set({ selectedAddressId: address.id });
    await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
    // The address payload already carries its village + storeId, so switch the
    // active store directly — no find-by-location round-trip. Fall back to the
    // coords-based resolve only for legacy addresses without a storeId.
    const village = villageFromAddress(address);
    if (village) {
      await get().setServiceable(village);
    } else {
      await get().selectAddress(address);
    }
  },
```

- [ ] **Step 3: Verify it compiles and the suite is green**

Run: `npx tsc --noEmit && npx jest`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/core/store/useLocationStore.ts
git commit -m "feat(location): select saved address sets active store, no find-by-location"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Confirm the behavior in-app**

With the app running and signed in:
1. Open the Home page; if a store is already set, note the toolbar name.
2. Go to Cart → delivery address → select a different saved address.
3. Return to Home. Expected: the toolbar shows the selected address's village name (e.g. "Errepalli"), and the feed reflects that store. No "Select delivery location" placeholder.
4. (If observable via logs) confirm no `[LOC] findByLocation: POST` log fires during selection of an address that has a storeId.

---

## Self-Review Notes

- **Spec coverage:** model `storeId` (Task 1), mapper fix (Task 2), direct store switch without find-by-location (Tasks 3-4), fallback retained via `selectAddress` (Task 4). Mapper tests + backward-compat test (Task 2). The spec's "store test (no findByLocation)" is realized as the pure `villageFromAddress` test (Task 3) plus the trivial store wiring — this matches the codebase convention of testing pure domain helpers rather than the Zustand store directly.
- **Type consistency:** `villageFromAddress(address: Address): Village | null` is defined in Task 3 and consumed in Task 4; `Village` fields (`id`, `name`, `storeId`, `pincode`, `latitude`, `longitude`) match `models.ts`. `Address.storeId` added in Task 1 is read in Tasks 2-4.
- **No placeholders:** every code step contains full code; every run step has an exact command and expected result.
