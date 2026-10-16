# Cart Address Flow with Authentication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From the Cart, let a user select an existing delivery address or add a new one on a map, gated behind phone-OTP authentication, with the selected address persisted and reflected on the Cart immediately.

**Architecture:** Reuse the existing auth (`useAuthStore` + `LoginBottomSheet` in `mode='auth'`) and address data layer (`locationApi`). Introduce a *selected delivery address* concept in `useLocationStore` (a persisted `selectedAddressId`). Add a map-based `DeliveryAddressScreen` (route `app/address/add`) with a list mode (pick saved) and an add mode (map pin → details form → `createAddress`). The Cart's hardcoded address card becomes a live `DeliveryAddressCard` whose tap either opens the login sheet (unauthenticated) or navigates to the address screen.

**Tech Stack:** React Native 0.83, Expo SDK 55, expo-router, Zustand, react-native-maps, NativeWind, jest-expo (new, for pure-logic unit tests).

**Testing strategy:** The repo currently has no test runner. We add jest-expo and unit-test only the **pure logic** (address selection helpers, the save-orchestration function) — no native mocks needed. Store, view-models, and screens are hook/RN-bound and are verified via `npx tsc --noEmit`, `npm run lint`, and the manual checklist in Task 9.

---

## File structure

**Create:**
- `src/features/location/domain/addressSelection.ts` — pure selection/seeding helpers.
- `src/features/location/domain/__tests__/addressSelection.test.ts` — tests.
- `src/features/location/data/saveNewAddress.ts` — pure save-orchestration.
- `src/features/location/data/__tests__/saveNewAddress.test.ts` — tests.
- `src/features/cart/viewmodel/useCartAddressViewModel.ts` — resolves the card's address.
- `src/features/cart/views/components/DeliveryAddressCard.tsx` — presentational card.
- `src/features/location/viewmodel/useAddAddressViewModel.ts` — add-mode form + save.
- `src/features/location/views/DeliveryAddressScreen.tsx` — list + add screen.
- `app/address/add.tsx` — route.
- `src/base/__tests__/sanity.test.ts` — harness smoke test.

**Modify:**
- `package.json` — jest devDeps, preset, `test` script.
- `src/core/store/useLocationStore.ts` — `selectedAddressId`, `setSelectedAddress`, extended `selectAddress`, hydrate + seed.
- `src/base/constants/translations.ts` — new keys.
- `src/features/cart/views/CartScreen.tsx` — live address card + auth gate + navigation.

The route `address/add` is already registered in `app/_layout.tsx` (`<Stack.Screen name="address/add" />`), so no layout change is needed.

---

## Task 1: Set up jest-expo test harness

**Files:**
- Modify: `package.json`
- Create: `src/base/__tests__/sanity.test.ts`

- [ ] **Step 1: Install jest-expo and types**

Run:
```bash
npx expo install jest-expo
npm install --save-dev @types/jest
```
Expected: both install without peer-dependency errors. (`jest-expo` brings a compatible `jest`.)

- [ ] **Step 2: Add the jest preset and test script to `package.json`**

In the `"scripts"` block add a `test` entry:
```json
    "lint": "expo lint",
    "test": "jest"
```
Add a top-level `"jest"` key (sibling of `"scripts"`, `"dependencies"`):
```json
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": ["/node_modules/", "/android/", "/ios/"]
  }
```

- [ ] **Step 3: Write the sanity test**

```typescript
// src/base/__tests__/sanity.test.ts
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test to verify the harness works**

Run: `npm test -- src/base/__tests__/sanity.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/base/__tests__/sanity.test.ts
git commit -m "test: add jest-expo harness"
```

---

## Task 2: Pure address-selection helpers (TDD)

These drive which address the Cart shows and how the server default seeds the selection.

**Files:**
- Create: `src/features/location/domain/addressSelection.ts`
- Test: `src/features/location/domain/__tests__/addressSelection.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/location/domain/__tests__/addressSelection.test.ts
import {
  pickDefaultAddress,
  findAddressById,
  deriveSelectedAddress,
  seedSelectedId,
} from '../addressSelection';
import type { Address } from '../models';

const make = (id: string, isDefault = false): Address => ({
  id,
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: `Line ${id}`,
  tag: 'home',
  isDefault,
});

describe('pickDefaultAddress', () => {
  it('returns null when none are default', () => {
    expect(pickDefaultAddress([make('a'), make('b')])).toBeNull();
  });
  it('returns the only default', () => {
    expect(pickDefaultAddress([make('a'), make('b', true)])?.id).toBe('b');
  });
  it('returns the FIRST when multiple are default', () => {
    expect(pickDefaultAddress([make('a', true), make('b', true)])?.id).toBe('a');
  });
});

describe('findAddressById', () => {
  it('finds by id', () => {
    expect(findAddressById([make('a'), make('b')], 'b')?.id).toBe('b');
  });
  it('returns null for null id or no match', () => {
    expect(findAddressById([make('a')], null)).toBeNull();
    expect(findAddressById([make('a')], 'zzz')).toBeNull();
  });
});

describe('deriveSelectedAddress', () => {
  it('prefers the explicitly selected id', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'b')?.id).toBe('b');
  });
  it('falls back to the default when selected id is missing', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'zzz')?.id).toBe('a');
  });
  it('returns null when nothing selected and no default', () => {
    expect(deriveSelectedAddress([make('a'), make('b')], null)).toBeNull();
  });
});

describe('seedSelectedId', () => {
  it('keeps an existing selection', () => {
    expect(seedSelectedId([make('a', true)], 'x')).toBe('x');
  });
  it('seeds from the default when nothing is selected', () => {
    expect(seedSelectedId([make('a'), make('b', true)], null)).toBe('b');
  });
  it('seeds from the FIRST default when multiple defaults', () => {
    expect(seedSelectedId([make('a', true), make('b', true)], null)).toBe('a');
  });
  it('returns null when nothing selected and no default', () => {
    expect(seedSelectedId([make('a')], null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- addressSelection`
Expected: FAIL — "Cannot find module '../addressSelection'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/location/domain/addressSelection.ts
//
// Pure helpers for resolving the user's selected delivery address. No React /
// RN / IO dependencies so they are trivially unit-testable.

import type { Address } from './models';

/** First address flagged isDefault; if several are, the first wins. Else null. */
export function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? null;
}

/** Address whose id matches, else null (null id → null). */
export function findAddressById(addresses: Address[], id: string | null): Address | null {
  if (!id) return null;
  return addresses.find((a) => a.id === id) ?? null;
}

/**
 * The address the Cart should display: the explicitly selected one when it
 * still exists, otherwise the server default (seeding), otherwise null.
 */
export function deriveSelectedAddress(
  addresses: Address[],
  selectedId: string | null,
): Address | null {
  return findAddressById(addresses, selectedId) ?? pickDefaultAddress(addresses);
}

/**
 * Persisted-selection seeding: keep an existing selection id; when none is set,
 * adopt the server default's id. Returns the id to store (may be null).
 */
export function seedSelectedId(
  addresses: Address[],
  currentSelectedId: string | null,
): string | null {
  if (currentSelectedId) return currentSelectedId;
  return pickDefaultAddress(addresses)?.id ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- addressSelection`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/domain/addressSelection.ts src/features/location/domain/__tests__/addressSelection.test.ts
git commit -m "feat(location): pure address-selection helpers"
```

---

## Task 3: Save-new-address orchestration (TDD)

A pure async sequence: create → set selected → refresh list → return created. Dependencies are injected so it tests with plain fakes.

**Files:**
- Create: `src/features/location/data/saveNewAddress.ts`
- Test: `src/features/location/data/__tests__/saveNewAddress.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/location/data/__tests__/saveNewAddress.test.ts
import { saveNewAddress } from '../saveNewAddress';
import type { CreateAddressInput } from '../locationApi';
import type { Address } from '../../domain/models';

const input: CreateAddressInput = {
  villageId: 'v1',
  addressLine1: '12 Main St',
  isDefault: true,
  tag: 'home',
};

const created: Address = {
  id: 'new1',
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: '12 Main St',
  tag: 'home',
  isDefault: true,
};

const fresh: Address[] = [created];

it('creates, selects, refreshes, and returns the created address in order', async () => {
  const calls: string[] = [];
  const setSelected = jest.fn(async () => { calls.push('setSelected'); });
  const setSaved = jest.fn(() => { calls.push('setSaved'); });

  const result = await saveNewAddress(input, {
    create: jest.fn(async () => { calls.push('create'); return created; }),
    list: jest.fn(async () => { calls.push('list'); return fresh; }),
    setSelected,
    setSaved,
  });

  expect(result).toBe(created);
  expect(calls).toEqual(['create', 'setSelected', 'list', 'setSaved']);
  expect(setSelected).toHaveBeenCalledWith(created);
  expect(setSaved).toHaveBeenCalledWith(fresh);
});

it('propagates a create error and does not refresh', async () => {
  const setSaved = jest.fn();
  await expect(
    saveNewAddress(input, {
      create: jest.fn(async () => { throw new Error('boom'); }),
      list: jest.fn(async () => []),
      setSelected: jest.fn(),
      setSaved,
    }),
  ).rejects.toThrow('boom');
  expect(setSaved).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saveNewAddress`
Expected: FAIL — "Cannot find module '../saveNewAddress'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/location/data/saveNewAddress.ts
//
// Pure orchestration for saving a new delivery address: create it, make it the
// selected address, then refresh the saved list. Dependencies are injected so
// the sequence is testable without IO.

import type { Address } from '../domain/models';
import type { CreateAddressInput } from './locationApi';

export interface SaveNewAddressDeps {
  create: (input: CreateAddressInput) => Promise<Address>;
  list: () => Promise<Address[]>;
  setSelected: (address: Address) => void | Promise<void>;
  setSaved: (addresses: Address[]) => void;
}

/** Persist + select + refresh. Returns the created address. */
export async function saveNewAddress(
  input: CreateAddressInput,
  deps: SaveNewAddressDeps,
): Promise<Address> {
  const created = await deps.create(input);
  await deps.setSelected(created);
  const fresh = await deps.list();
  deps.setSaved(fresh);
  return created;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- saveNewAddress`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/data/saveNewAddress.ts src/features/location/data/__tests__/saveNewAddress.test.ts
git commit -m "feat(location): saveNewAddress orchestration"
```

---

## Task 4: Selected-address state in the location store

Add the persisted `selectedAddressId`, a `setSelectedAddress` action, extend `selectAddress` to record the id, hydrate the id, and seed it from the server default whenever the saved list is set.

**Files:**
- Modify: `src/core/store/useLocationStore.ts`

- [ ] **Step 1: Add the import for the seeding helper**

At the top of `src/core/store/useLocationStore.ts`, after the existing `findByLocation` import (line 8), add:
```typescript
import { seedSelectedId } from '@/src/features/location/domain/addressSelection';
```

- [ ] **Step 2: Add `selectedAddressId` to state, actions, and initial state**

In `interface LocationState` (after `savedAddresses: Address[];`, line ~21) add:
```typescript
  selectedAddressId: string | null;
```
In `interface LocationActions` (after `setSavedAddresses: ...`, line ~31) add:
```typescript
  setSelectedAddress: (address: Address) => Promise<void>;
```
In `const initialState` (after `savedAddresses: [],`, line ~53) add:
```typescript
  selectedAddressId: null,
```

- [ ] **Step 3: Hydrate the selected id**

Replace the `hydrate` body (lines ~137-148) with:
```typescript
  hydrate: async () => {
    const [village, recents, selectedAddressId] = await Promise.all([
      StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.getCustomData<RecentLocation[]>(StorageKeys.RECENT_LOCATIONS),
      StoredPrefs.getCustomData<string>(StorageKeys.SELECTED_ADDRESS_ID),
    ]);
    set({
      serviceableVillage: village ?? null,
      recentLocations: Array.isArray(recents) ? recents : [],
      selectedAddressId: selectedAddressId ?? null,
      status: village ? 'serviceable' : 'idle',
      hydrated: true,
    });
  },
```

- [ ] **Step 4: Seed the selection inside `setSavedAddresses`**

Replace the one-line `setSavedAddresses` (line ~159) with:
```typescript
  setSavedAddresses: (addresses) => {
    const prev = get().selectedAddressId;
    const seeded = seedSelectedId(addresses, prev);
    set({ savedAddresses: addresses, selectedAddressId: seeded });
    if (seeded !== prev) {
      void StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, seeded);
    }
  },
```

- [ ] **Step 5: Record the id in `selectAddress`, and add `setSelectedAddress`**

Replace the existing `selectAddress` block (lines ~210-222) with:
```typescript
  selectAddress: async (address) => {
    if (address.latitude == null || address.longitude == null) return false;
    const token = ++seq;
    const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
    set({ status: 'locating', detecting: true, lastError: null });
    const ok = await resolveCoords(
      set,
      get,
      { latitude: address.latitude, longitude: address.longitude },
      label,
      token,
    );
    if (ok) {
      set({ selectedAddressId: address.id });
      await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
    }
    return ok;
  },

  setSelectedAddress: async (address) => {
    set({ selectedAddressId: address.id });
    await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
    // Switch the active store/serviceability to the address's location when it
    // carries coords. No-op (id still set) when coords are absent.
    await get().selectAddress(address);
  },
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/store/useLocationStore.ts
git commit -m "feat(location): selected delivery address in store"
```

---

## Task 5: Add translation keys

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add the missing keys**

Find the line for `saved_addresses:` (around line 197) and add the following keys immediately after it (these keys do **not** already exist — verified):
```typescript
  add_delivery_address:   { te: 'డెలివరీ చిరునామా జోడించండి',   en: 'Add a delivery address' },
  confirm_location:       { te: 'లొకేషన్‌ను నిర్ధారించండి',      en: 'Confirm location' },
  address_details:        { te: 'చిరునామా వివరాలు',             en: 'Address details' },
  flat_house_no:          { te: 'ఫ్లాట్ / ఇంటి నంబర్',           en: 'Flat / House no.' },
  landmark_optional:      { te: 'ల్యాండ్‌మార్క్ (ఐచ్ఛికం)',     en: 'Landmark (optional)' },
  saving_ellipsis:        { te: 'సేవ్ చేస్తోంది…',               en: 'Saving…' },
  address_tag_home:       { te: 'ఇల్లు',                          en: 'Home' },
  address_tag_work:       { te: 'ఆఫీస్',                          en: 'Work' },
  address_tag_other:      { te: 'ఇతర',                            en: 'Other' },
```

- [ ] **Step 2: Typecheck (catches accidental duplicate keys)**

Run: `npx tsc --noEmit`
Expected: no errors. (A duplicate key would raise TS1117.)

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(i18n): cart address flow strings"
```

---

## Task 6: Cart delivery-address card + auth gate

**Files:**
- Create: `src/features/cart/viewmodel/useCartAddressViewModel.ts`
- Create: `src/features/cart/views/components/DeliveryAddressCard.tsx`
- Modify: `src/features/cart/views/CartScreen.tsx`

- [ ] **Step 1: Create the cart-address view model**

```typescript
// src/features/cart/viewmodel/useCartAddressViewModel.ts
//
// Resolves the delivery address shown on the Cart. Loads saved addresses when
// authenticated (via the address-book VM) and derives the selected one.

import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useAddressBookViewModel } from '@/src/features/location/viewmodel/useAddressBookViewModel';
import { deriveSelectedAddress } from '@/src/features/location/domain/addressSelection';

export function useCartAddressViewModel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const book = useAddressBookViewModel(); // auto-loads addresses when authenticated

  const selectedAddress = deriveSelectedAddress(addresses, selectedAddressId);

  return { isAuthenticated, selectedAddress, loading: book.loading };
}
```

- [ ] **Step 2: Create the presentational card**

```tsx
// src/features/cart/views/components/DeliveryAddressCard.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { Address } from '@/src/features/location/domain/models';

interface Props {
  address: Address | null;
  onPress: () => void;
}

export const DeliveryAddressCard = ({ address, onPress }: Props) => {
  const { t } = useTranslation();

  if (!address) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="bg-white border border-dashed border-green-300 rounded-2xl p-4 flex-row items-center gap-3"
      >
        <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
          <Plus size={18} color="#16a34a" />
        </View>
        <Text className="flex-1 text-green-700 font-bold text-sm">{t('add_delivery_address')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-start gap-3">
      <MapPin size={18} color="#16a34a" className="mt-0.5" />
      <View className="flex-1">
        <Text className="text-slate-900 font-bold text-sm">{t(`address_tag_${address.tag}`)}</Text>
        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
          {[address.addressLine1, address.villageName].filter(Boolean).join(', ')}
        </Text>
      </View>
      <TouchableOpacity onPress={onPress}>
        <Text className="text-green-600 font-bold text-sm">{t('change')}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 3: Wire the card + auth gate into `CartScreen`**

In `src/features/cart/views/CartScreen.tsx`:

(a) Add imports after the existing `useAuthStore` import (line 21):
```typescript
import { useCartAddressViewModel } from '../viewmodel/useCartAddressViewModel';
import { DeliveryAddressCard } from './components/DeliveryAddressCard';
```

(b) Inside the component, after `const isAuthenticated = useAuthStore(...)` (line 31), add:
```typescript
  const addr = useCartAddressViewModel();
  const [addressLoginVisible, setAddressLoginVisible] = React.useState(false);

  const openAddressScreen = () => router.push('/address/add' as any);
  const handleAddressPress = () => {
    if (addr.isAuthenticated) openAddressScreen();
    else setAddressLoginVisible(true);
  };
```

(c) Replace the hardcoded "Delivery address" block (lines ~110-122, the `<View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-start gap-3">` containing "221B Baker Street…") with:
```tsx
          {/* Delivery address */}
          <DeliveryAddressCard address={addr.selectedAddress} onPress={handleAddressPress} />
```

(d) Add a second `LoginBottomSheet` for the address gate, right after the existing checkout `LoginBottomSheet` (after line ~152, before the closing `</SafeAreaView>`):
```tsx
      {/* Auth gate for the address flow */}
      <LoginBottomSheet
        visible={addressLoginVisible}
        onClose={() => setAddressLoginVisible(false)}
        onComplete={() => {
          setAddressLoginVisible(false);
          openAddressScreen();
        }}
        mode="auth"
      />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/viewmodel/useCartAddressViewModel.ts src/features/cart/views/components/DeliveryAddressCard.tsx src/features/cart/views/CartScreen.tsx
git commit -m "feat(cart): live delivery address card + auth gate"
```

---

## Task 7: Add-address view model

Wraps the existing map picker VM and adds the details-form state + save via `saveNewAddress`.

**Files:**
- Create: `src/features/location/viewmodel/useAddAddressViewModel.ts`

- [ ] **Step 1: Create the view model**

```typescript
// src/features/location/viewmodel/useAddAddressViewModel.ts
//
// Add-address orchestration for the delivery-address screen's "add" mode.
// Reuses useMapPickerViewModel for the map + serviceability, and adds the
// address-details form fields and the save sequence.

import { useCallback, useState } from 'react';
import { useMapPickerViewModel } from './useMapPickerViewModel';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { createAddress, listAddresses, type CreateAddressInput } from '../data/locationApi';
import { saveNewAddress } from '../data/saveNewAddress';
import type { AddressTag } from '../domain/models';

export function useAddAddressViewModel() {
  const map = useMapPickerViewModel();
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);

  const [addressLine1, setAddressLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [tag, setTag] = useState<AddressTag>('home');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    map.pinState === 'serviceable' &&
    !!map.village &&
    !!map.region &&
    addressLine1.trim().length > 0 &&
    !saving;

  const save = useCallback(async (): Promise<boolean> => {
    if (map.pinState !== 'serviceable' || !map.village || !map.region) return false;
    if (!addressLine1.trim()) return false;
    setSaving(true);
    setError(null);
    const input: CreateAddressInput = {
      villageId: map.village.id,
      addressLine1: addressLine1.trim(),
      landmark: landmark.trim() || undefined,
      latitude: map.region.latitude,
      longitude: map.region.longitude,
      isDefault,
      tag,
    };
    try {
      await saveNewAddress(input, {
        create: createAddress,
        list: listAddresses,
        setSelected: setSelectedAddress,
        setSaved: setSavedAddresses,
      });
      return true;
    } catch (e: any) {
      setError(e?.fullMessage || e?.message || 'Could not save address. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [map.pinState, map.village, map.region, addressLine1, landmark, tag, isDefault, setSelectedAddress, setSavedAddresses]);

  return {
    map,
    addressLine1, setAddressLine1,
    landmark, setLandmark,
    tag, setTag,
    isDefault, setIsDefault,
    saving, error, canSave, save,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useAddAddressViewModel.ts
git commit -m "feat(location): add-address view model"
```

---

## Task 8: Delivery address screen + route

A map-based screen with a list mode (pick a saved address or start adding) and an add mode (pan the map, confirm the pin, fill the form, save).

**Files:**
- Create: `src/features/location/views/DeliveryAddressScreen.tsx`
- Create: `app/address/add.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// src/features/location/views/DeliveryAddressScreen.tsx
//
// Delivery-address manager reached from the Cart. List mode lets the user pick a
// saved address or start adding; add mode is a map picker + details form that
// creates the address, selects it, and returns to the Cart.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, LocateFixed, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { DEFAULT_REGION } from '../viewmodel/useMapPickerViewModel';
import { useAddAddressViewModel } from '../viewmodel/useAddAddressViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';
import type { AddressTag } from '../domain/models';

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };
const TAGS: AddressTag[] = ['home', 'work', 'other'];

export const DeliveryAddressScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useAddAddressViewModel();
  const map = vm.map;

  const savedAddresses = useLocationStore((s) => s.savedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [showForm, setShowForm] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const suppressSettle = useRef(false);

  // Initialize the camera once when entering add mode.
  useEffect(() => {
    if (mode === 'add') void map.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Point the camera at the VM region; suppress the resulting settle.
  useEffect(() => {
    if (mode === 'add' && map.region && mapRef.current) {
      suppressSettle.current = true;
      mapRef.current.animateToRegion(map.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.region?.latitude, map.region?.longitude, mode]);

  const handleRegionChangeComplete = useCallback(
    (next: Region) => {
      if (suppressSettle.current) { suppressSettle.current = false; return; }
      map.onRegionSettled(next);
      setShowForm(false); // pin moved → require re-confirm
    },
    [map],
  );

  const backToCart = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/cart' as any);
  };

  const goBack = () => {
    if (mode === 'add') { setMode('list'); setShowForm(false); return; }
    backToCart();
  };

  const onSelectExisting = async (id: string) => {
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    await setSelectedAddress(a);
    backToCart();
  };

  const onUseCurrent = async () => {
    const region = await map.useCurrentLocation();
    if (region && mapRef.current) mapRef.current.animateToRegion(region, 350);
  };

  const onConfirmPin = () => { if (map.pinState === 'serviceable') setShowForm(true); };

  const onSave = async () => {
    if (await vm.save()) backToCart();
  };

  // ── List mode ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
        <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={goBack} hitSlop={8} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-black text-xl">{t('select_delivery_address')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            onPress={() => setMode('add')}
            activeOpacity={0.85}
            className="flex-row items-center gap-3 bg-white border border-green-200 rounded-2xl px-4 py-4 mb-4"
          >
            <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
              <Plus size={18} color="#16a34a" />
            </View>
            <Text className="flex-1 text-green-700 font-extrabold text-[14px]">{t('add_new_address')}</Text>
          </TouchableOpacity>

          {savedAddresses.length > 0 ? (
            <>
              <Text className="text-slate-500 font-semibold text-xs uppercase mb-3">{t('saved_addresses')}</Text>
              {savedAddresses.map((a) => {
                const active = a.id === selectedAddressId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => onSelectExisting(a.id)}
                    className={`flex-row items-center rounded-2xl px-4 py-4 mb-3 border ${active ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-white'}`}
                  >
                    <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                      <Text className="text-xl leading-none">{TAG_EMOJI[a.tag]}</Text>
                    </View>
                    <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={2}>
                      {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                    </Text>
                    {active ? <Check size={18} color="#16a34a" /> : null}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <Text className="text-slate-400 text-sm text-center mt-8">{t('no_saved_addresses')}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Add mode ───────────────────────────────────────────────────────────────
  const initialRegion: Region = map.region ?? DEFAULT_REGION;
  const canConfirm = map.pinState === 'serviceable';

  return (
    <View className="flex-1 bg-slate-100">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsMyLocationButton={false}
        showsUserLocation
      />
      <MapPinMarker />

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={goBack}
            hitSlop={8}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View
            className="bg-white rounded-full px-4 py-2"
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
          >
            <Text className="text-slate-900 font-bold text-base">{t('add_new_address')}</Text>
          </View>
        </View>
      </SafeAreaView>

      {!showForm ? (
        <TouchableOpacity
          onPress={onUseCurrent}
          activeOpacity={0.85}
          className="absolute right-4 bottom-48 bg-white rounded-full px-4 py-2.5 flex-row items-center gap-2"
          style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
        >
          <LocateFixed size={16} color="#16a34a" />
          <Text className="text-slate-900 font-bold text-[12px]">{t('use_current_location')}</Text>
        </TouchableOpacity>
      ) : null}

      <View
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl px-5 pt-5 pb-8"
        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 }}
      >
        {!showForm ? (
          <>
            {map.pinState === 'serviceable' ? (
              <>
                <Text className="text-slate-900 font-extrabold text-xl" numberOfLines={1}>{map.primary}</Text>
                {map.secondary ? <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>{map.secondary}</Text> : null}
              </>
            ) : map.pinState === 'resolving' ? (
              <Text className="text-slate-400 font-bold text-[15px]">{t('locating_ellipsis')}</Text>
            ) : (
              <Text className="text-slate-900 font-extrabold text-[15px]">{t('map_not_serviceable_title')}</Text>
            )}
            <TouchableOpacity
              onPress={onConfirmPin}
              disabled={!canConfirm}
              activeOpacity={0.85}
              className={`mt-4 rounded-2xl py-4 items-center ${canConfirm ? 'bg-green-600' : 'bg-slate-200'}`}
            >
              <Text className={`font-extrabold text-[15px] ${canConfirm ? 'text-white' : 'text-slate-400'}`}>
                {t('confirm_location')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-slate-900 font-extrabold text-lg mb-3">{t('address_details')}</Text>

            <TextInput
              value={vm.addressLine1}
              onChangeText={vm.setAddressLine1}
              placeholder={t('flat_house_no')}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
            />
            <TextInput
              value={vm.landmark}
              onChangeText={vm.setLandmark}
              placeholder={t('landmark_optional')}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
            />

            <View className="flex-row gap-2 mb-3">
              {TAGS.map((tg) => (
                <TouchableOpacity
                  key={tg}
                  onPress={() => vm.setTag(tg)}
                  className={`px-4 py-2 rounded-full border ${vm.tag === tg ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white'}`}
                >
                  <Text className={`font-bold text-[13px] ${vm.tag === tg ? 'text-green-700' : 'text-slate-600'}`}>
                    {TAG_EMOJI[tg]} {t(`address_tag_${tg}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => vm.setIsDefault(!vm.isDefault)} className="flex-row items-center gap-2 mb-4">
              <View className={`w-5 h-5 rounded border items-center justify-center ${vm.isDefault ? 'bg-green-600 border-green-600' : 'border-slate-300'}`}>
                {vm.isDefault ? <Check size={14} color="#fff" /> : null}
              </View>
              <Text className="text-slate-700 font-semibold text-sm">{t('set_as_default')}</Text>
            </TouchableOpacity>

            {vm.error ? <Text className="text-rose-600 font-bold text-xs mb-2">{vm.error}</Text> : null}

            <TouchableOpacity
              onPress={onSave}
              disabled={!vm.canSave}
              activeOpacity={0.85}
              className={`rounded-2xl py-4 items-center ${vm.canSave ? 'bg-green-600' : 'bg-slate-200'}`}
            >
              <Text className={`font-extrabold text-[15px] ${vm.canSave ? 'text-white' : 'text-slate-400'}`}>
                {vm.saving ? t('saving_ellipsis') : t('save_address')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <PermissionDeniedSheet visible={map.blocked} onClose={map.dismissBlocked} onGoToSettings={map.openSettings} />
    </View>
  );
};
```

- [ ] **Step 2: Create the route**

```tsx
// app/address/add.tsx
import { DeliveryAddressScreen } from '@/src/features/location/views/DeliveryAddressScreen';

export default function AddressAddRoute() {
  return <DeliveryAddressScreen />;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; lint passes (warnings acceptable if pre-existing).

- [ ] **Step 4: Commit**

```bash
git add src/features/location/views/DeliveryAddressScreen.tsx app/address/add.tsx
git commit -m "feat(location): delivery address screen (list + add)"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: all suites pass (sanity, addressSelection, saveNewAddress).

- [ ] **Step 2: Typecheck + lint the whole project**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors.

- [ ] **Step 3: Manual end-to-end verification**

Run the app (`npm run android` or `npm run ios`). With a serviceable location already set, open the Cart and verify each path:

1. **Unauthenticated add:** Tap "Add a delivery address" → `LoginBottomSheet` opens. Enter an existing number → OTP → on success it auto-navigates to the address screen. Add an address on the map → Save → returns to Cart, card shows the new address.
2. **New user:** Use an unregistered number → OTP → signup (first/last name) → address screen.
3. **Select existing:** With ≥1 saved address, tap "Change" → list mode → tap another address → returns to Cart showing it; the ✓ tracks the selection.
4. **Default toggle:** Add an address with "Set as default" off and one with it on; confirm the just-added address is always selected on return regardless, and that the default ✓ seeds correctly on a fresh app launch.
5. **Home sync:** Pick a saved address from the home location flow, then open the Cart — it already shows that address without re-selection.

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address flow verification fixes"
```

---

## Self-review notes (spec coverage)

- Auth enforcement before add/select → Task 6 (auth gate) + Cart card states.
- Login `isExist` true/false branching → existing `LoginBottomSheet`/`useAuthStore` (reused, no change).
- Return to Cart after auth and continue → Task 6 `onComplete` → `openAddressScreen`.
- Add address from Cart → auto-select + refresh → Tasks 3, 7, 8 (`saveNewAddress` + `setSelectedAddress`).
- User-chosen default; multiple defaults → first → Tasks 2 (`pickDefaultAddress`/`seedSelectedId`) + 7 (toggle).
- Selected-address single source of truth (home ↔ cart) → Task 4 (`selectAddress` records id; `selectedAddressId` in store).
- Cart shows selected; village-only → "Add a delivery address" → Task 6 (`deriveSelectedAddress` is null when no saved address).
- Preserve Cart state → sheets + pushed route; Cart never unmounts.
