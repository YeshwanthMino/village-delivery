# Address Selection & Location-Gate Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Zepto/Blinkit-style location gate + address book to Village Delivery: on launch the user must confirm a serviceable delivery location (via `find-by-location`) before the dashboard unlocks; a login-gated address book lets authenticated users manage saved addresses.

**Architecture:** New `src/features/location` feature following the existing Clean-Architecture + MVVM + hook-viewmodel pattern. `expo-location` provides permission + GPS. `find-by-location` (public) drives serviceability: any 2xx → serviceable → load home. Address CRUD hits the real `/address` endpoints but only renders when authenticated (login is mocked today, so the book stays hidden until real auth). Serviceable location is cached in SecureStore for fast launch.

**Tech Stack:** Expo Router v5, React Native 0.83, NativeWind v4, Zustand v5, Axios, expo-location, lucide-react-native, TypeScript (strict).

**Testing note:** This project has no test runner and no existing tests (UI-first). Per project convention, each task is verified with `npx tsc --noEmit` (type safety) and, where relevant, a manual smoke run. No automated tests are added.

**Spec:** `docs/superpowers/specs/2026-06-07-address-location-flow-design.md`

---

## File Structure

**Create**
- `src/features/location/domain/models.ts` — domain types (Village, Address, AddressTag, ServiceabilityStatus, LatLng).
- `src/features/location/data/locationApi.ts` — axios instance for the village API + typed HTTP calls.
- `src/features/location/data/mappers.ts` — defensive API→domain mappers + domain→DTO.
- `src/features/location/data/LocationService.ts` — expo-location wrapper (permission, current position).
- `src/features/location/data/AddressRepository.ts` — interface + RemoteAddressRepository (authed CRUD).
- `src/features/location/viewmodel/useLocationGateViewModel.ts` — permission → GPS → find-by-location → status.
- `src/features/location/viewmodel/useSelectLocationViewModel.ts` — Select Location screen actions.
- `src/features/location/viewmodel/useAddressBookViewModel.ts` — list/select/delete saved addresses (authed).
- `src/features/location/viewmodel/useAddressFormViewModel.ts` — add/edit form state + validation + save.
- `src/features/location/views/LocationGateScreen.tsx` — full-screen states (locating/error/not-serviceable).
- `src/features/location/views/SelectLocationScreen.tsx` — search bar + current location + friend stub.
- `src/features/location/views/LocationEntrySheet.tsx` — bottom sheet over home (permission-off / change location).
- `src/features/location/views/AddressFormScreen.tsx` — add/edit form (authed).
- `src/features/location/views/components/CurrentLocationRow.tsx`
- `src/features/location/views/components/NotServiceableView.tsx`
- `src/features/location/views/components/LocationHeader.tsx`
- `src/features/location/views/components/AddressRow.tsx`
- `src/features/location/views/components/TagSelector.tsx`
- `src/features/location/views/AddressBottomSheet.tsx` — saved-address list (authed).
- `src/core/store/useLocationStore.ts` — serviceable location, selected address id, saved addresses, status.
- `app/location/index.tsx` — route → SelectLocationScreen / LocationGateScreen by status.
- `app/address/add.tsx` — route → AddressFormScreen.

**Modify**
- `.env` — add `EXPO_PUBLIC_VILLAGE_API_BASE_URL`.
- `src/core/config/env.native.ts`, `env.web.ts`, `env.d.ts` — expose `villageApiBaseUrl`.
- `src/base/constants/AppConstants.ts` — `WebService.villageBaseURL` + 2 new `StorageKeys`.
- `app.json` — expo-location plugin + iOS/Android permission strings.
- `src/base/constants/translations.ts` — new i18n keys.
- `src/core/store/index.ts` — export `useLocationStore`.
- `app/_layout.tsx` — register `location` + `address/add` routes.
- `src/features/initialization/views/screens/AppScreen/AppScreen.tsx` — hydrate location store + hard gate.
- `src/features/home/views/home/HomeScreen.tsx` — replace hardcoded location row with `LocationHeader` + `LocationEntrySheet`.

---

## Task 1: Dependencies, env & config

**Files:**
- Modify: `package.json` (via installer)
- Modify: `app.json`
- Modify: `.env`
- Modify: `src/core/config/env.native.ts`, `src/core/config/env.web.ts`, `src/core/config/env.d.ts`
- Modify: `src/base/constants/AppConstants.ts`

- [ ] **Step 1: Install expo-location**

Run: `npx expo install expo-location`
Expected: `expo-location` added to `package.json` dependencies.

- [ ] **Step 2: Add the expo-location plugin + permission strings to `app.json`**

Replace the `plugins` array so it includes the location plugin (keep existing entries):

```json
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#E6F4FE",
          "dark": {
            "backgroundColor": "#E6F4FE"
          }
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Village Delivery uses your location to find your village and check if we deliver there."
        }
      ]
    ],
```

- [ ] **Step 3: Add the village API base URL to `.env`**

Append to `.env`:

```
EXPO_PUBLIC_VILLAGE_API_BASE_URL=https://ub7mvw9ks.bizzz.in
```

- [ ] **Step 4: Expose `villageApiBaseUrl` in env configs**

In `src/core/config/env.native.ts`, add the field inside the `env` object (after `apiBaseUrl`):

```ts
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',

  // Village location/address API (separate backend)
  villageApiBaseUrl: process.env.EXPO_PUBLIC_VILLAGE_API_BASE_URL || '',
```

In `src/core/config/env.web.ts`, add to the `env` object (after `apiBaseUrl`):

```ts
  apiBaseUrl: (_importMetaEnv?.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '') as string,

  // Village location/address API (separate backend)
  villageApiBaseUrl: (_importMetaEnv?.VITE_VILLAGE_API_BASE_URL || process.env.VITE_VILLAGE_API_BASE_URL || process.env.EXPO_PUBLIC_VILLAGE_API_BASE_URL || '') as string,
```

In `src/core/config/env.d.ts`, add to `EnvironmentConfig`:

```ts
  // API Configuration
  apiBaseUrl: string;
  villageApiBaseUrl: string;
```

- [ ] **Step 5: Add `WebService.villageBaseURL` + storage keys to `AppConstants.ts`**

In `src/base/constants/AppConstants.ts`, extend `WebService`:

```ts
export const WebService = {
  baseURL: env.apiBaseUrl,
  villageService: `${env.apiBaseUrl}/`,
  villageBaseURL: env.villageApiBaseUrl,
};
```

In the same file, add two keys to the `StorageKeys` object (under `// App state`):

```ts
  // Location
  SERVICEABLE_VILLAGE: 'serviceable_village',
  SELECTED_ADDRESS_ID: 'selected_address_id',
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json app.json .env src/core/config src/base/constants/AppConstants.ts
git commit -m "feat(location): add expo-location dep, village API env & storage keys"
```

---

## Task 2: Domain models

**Files:**
- Create: `src/features/location/domain/models.ts`

- [ ] **Step 1: Create the domain models**

```ts
// src/features/location/domain/models.ts

export type AddressTag = 'home' | 'work' | 'other';

export type ServiceabilityStatus =
  | 'idle'           // no location resolved yet
  | 'locating'       // requesting permission / reading GPS
  | 'checking'       // calling find-by-location
  | 'serviceable'    // 2xx — app unlocked
  | 'not_serviceable'// non-2xx / empty
  | 'error';         // network / 5xx

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Village {
  id: string;
  name: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface Address {
  id: string;            // backend _id
  villageId: string;
  villageName: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  tag: AddressTag;       // local-only (no backend field) — derived/stored in addressLine2 prefix on read
  isDefault: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  village: Village | null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/domain/models.ts
git commit -m "feat(location): add domain models"
```

---

## Task 3: Mappers

**Files:**
- Create: `src/features/location/data/mappers.ts`

- [ ] **Step 1: Create defensive mappers**

The `find-by-location` village response shape is not documented, so probe multiple field names and degrade gracefully.

```ts
// src/features/location/data/mappers.ts

import { Address, AddressTag, Village } from '../domain/models';

const TAG_VALUES: AddressTag[] = ['home', 'work', 'other'];

/** Pick the first defined value among candidate keys on an object. */
function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/** Map an arbitrary village-shaped API object into the domain Village. */
export function mapVillage(raw: any): Village | null {
  // Some APIs wrap payloads in { data: ... }
  const data = raw?.data ?? raw;
  if (!data || typeof data !== 'object') return null;

  // Response may be a single object or an array; take the first.
  const node = Array.isArray(data) ? data[0] : data;
  if (!node) return null;

  const id = pick(node, ['_id', 'id', 'villageId']);
  const name = pick(node, ['name', 'villageName', 'village', 'title']);
  if (!id && !name) return null;

  return {
    id: id ? String(id) : 'unknown',
    name: name ? String(name) : 'Your location',
    pincode: pick(node, ['pincode', 'pinCode', 'postalCode']),
    latitude: pick(node, ['latitude', 'lat']),
    longitude: pick(node, ['longitude', 'lng', 'long']),
  };
}

/** Encode the local-only tag as a prefix on addressLine2 so it round-trips. */
export function encodeTag(tag: AddressTag, addressLine2?: string): string {
  const rest = addressLine2?.trim() ?? '';
  return rest ? `[${tag}] ${rest}` : `[${tag}]`;
}

/** Extract { tag, addressLine2 } from a possibly tag-prefixed addressLine2. */
export function decodeTag(addressLine2?: string): { tag: AddressTag; addressLine2?: string } {
  if (!addressLine2) return { tag: 'home' };
  const match = addressLine2.match(/^\[(home|work|other)\]\s?(.*)$/i);
  if (match) {
    const tag = match[1].toLowerCase() as AddressTag;
    const rest = match[2]?.trim();
    return { tag: TAG_VALUES.includes(tag) ? tag : 'other', addressLine2: rest || undefined };
  }
  return { tag: 'home', addressLine2 };
}

/** Map an address API object into the domain Address. */
export function mapAddress(raw: any): Address {
  const node = raw?.data ?? raw;
  const { tag, addressLine2 } = decodeTag(pick(node, ['addressLine2']));
  return {
    id: String(pick(node, ['_id', 'id']) ?? ''),
    villageId: String(pick(node, ['villageId', 'village']) ?? ''),
    villageName: String(pick(node, ['villageName', 'village', 'name']) ?? ''),
    addressLine1: String(pick(node, ['addressLine1']) ?? ''),
    addressLine2,
    landmark: pick(node, ['landmark']),
    pincode: pick(node, ['pincode']),
    latitude: pick(node, ['latitude', 'lat']),
    longitude: pick(node, ['longitude', 'lng']),
    tag,
    isDefault: Boolean(pick(node, ['isDefault'])),
  };
}

/** Map an array (or wrapped array) of address objects. */
export function mapAddressList(raw: any): Address[] {
  const data = raw?.data ?? raw;
  const arr = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
  return Array.isArray(arr) ? arr.map(mapAddress) : [];
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/data/mappers.ts
git commit -m "feat(location): add defensive API mappers"
```

---

## Task 4: locationApi (HTTP client)

**Files:**
- Create: `src/features/location/data/locationApi.ts`

The village API uses a different base URL than the app's `apiClient`, so use a dedicated axios instance. `find-by-location` is public; address/village endpoints attach a bearer token when present.

- [ ] **Step 1: Create the API module**

```ts
// src/features/location/data/locationApi.ts

import axios, { AxiosInstance } from 'axios';
import { WebService } from '@/src/base/constants/AppConstants';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { LatLng, ServiceabilityResult, Address, AddressTag } from '../domain/models';
import { mapVillage, mapAddressList, mapAddress, encodeTag } from './mappers';

const client: AxiosInstance = axios.create({
  baseURL: WebService.villageBaseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach bearer token for authed endpoints when available.
client.interceptors.request.use(async (config) => {
  const token = await StoredPrefs.getAccessToken();
  const type = (await StoredPrefs.getTokenType()) || 'Bearer';
  if (token && config.headers) {
    config.headers.Authorization = `${type} ${token}`;
  }
  return config;
});

export interface CreateAddressInput {
  villageId: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  tag: AddressTag;
}

function toDto(input: CreateAddressInput) {
  return {
    villageId: input.villageId,
    addressLine1: input.addressLine1,
    addressLine2: encodeTag(input.tag, input.addressLine2),
    landmark: input.landmark,
    pincode: input.pincode,
    latitude: input.latitude,
    longitude: input.longitude,
    isDefault: input.isDefault,
  };
}

/**
 * Serviceability check. Any 2xx → serviceable. A 4xx/empty → not serviceable.
 * Network/5xx throws so the caller can surface a retryable error.
 */
export async function findByLocation(coords: LatLng): Promise<ServiceabilityResult> {
  try {
    const res = await client.post('/villages/find-by-location', {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    // 2xx → serviceable regardless of body; map village for the header if possible.
    return { serviceable: true, village: mapVillage(res.data) };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && status >= 400 && status < 500) {
      // 4xx (incl. not-found) → genuinely not serviceable.
      return { serviceable: false, village: null };
    }
    // Network error / 5xx → rethrow as retryable.
    throw err;
  }
}

export async function listAddresses(): Promise<Address[]> {
  const res = await client.get('/address', { params: { limit: 50, sort: '_id:desc' } });
  return mapAddressList(res.data);
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const res = await client.post('/address', toDto(input));
  return mapAddress(res.data);
}

export async function updateAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const res = await client.patch(`/address/${id}`, toDto(input));
  return mapAddress(res.data);
}

export async function deleteAddress(id: string): Promise<void> {
  await client.delete(`/address/${id}`);
}

export async function setDefaultAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const res = await client.patch(`/address/${id}`, { ...toDto(input), isDefault: true });
  return mapAddress(res.data);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/data/locationApi.ts
git commit -m "feat(location): add village/address API client"
```

---

## Task 5: LocationService (expo-location wrapper)

**Files:**
- Create: `src/features/location/data/LocationService.ts`

- [ ] **Step 1: Create the wrapper**

```ts
// src/features/location/data/LocationService.ts

import * as Location from 'expo-location';
import { LatLng } from '../domain/models';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const LocationService = {
  async getPermissionState(): Promise<PermissionState> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionState;
  },

  /** Request permission. Returns whether it is granted. */
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /** Read the current position. Throws if location is unavailable. */
  async getCurrentPosition(): Promise<LatLng> {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/data/LocationService.ts
git commit -m "feat(location): add expo-location service wrapper"
```

---

## Task 6: useLocationStore (zustand) + store export

**Files:**
- Create: `src/core/store/useLocationStore.ts`
- Modify: `src/core/store/index.ts`

- [ ] **Step 1: Create the store**

```ts
// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';

interface LocationState {
  status: ServiceabilityStatus;
  serviceableVillage: Village | null;
  selectedAddressId: string | null;
  savedAddresses: Address[];
  hydrated: boolean;
}

interface LocationActions {
  hydrate: () => Promise<void>;
  setStatus: (status: ServiceabilityStatus) => void;
  setServiceable: (village: Village) => Promise<void>;
  setNotServiceable: () => void;
  setSavedAddresses: (addresses: Address[]) => void;
  setSelectedAddressId: (id: string | null) => Promise<void>;
  clearLocation: () => Promise<void>;
  hasServiceableLocation: () => boolean;
}

type LocationStore = LocationState & LocationActions;

const initialState: LocationState = {
  status: 'idle',
  serviceableVillage: null,
  selectedAddressId: null,
  savedAddresses: [],
  hydrated: false,
};

export const useLocationStore = create<LocationStore>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const [village, selectedId] = await Promise.all([
      StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.getCustomData<string>(StorageKeys.SELECTED_ADDRESS_ID),
    ]);
    set({
      serviceableVillage: village ?? null,
      selectedAddressId: selectedId ?? null,
      status: village ? 'serviceable' : 'idle',
      hydrated: true,
    });
  },

  setStatus: (status) => set({ status }),

  setServiceable: async (village) => {
    set({ serviceableVillage: village, status: 'serviceable' });
    await StoredPrefs.setCustomData(StorageKeys.SERVICEABLE_VILLAGE, village);
  },

  setNotServiceable: () => set({ status: 'not_serviceable' }),

  setSavedAddresses: (addresses) => set({ savedAddresses: addresses }),

  setSelectedAddressId: async (id) => {
    set({ selectedAddressId: id });
    if (id) await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, id);
    else await StoredPrefs.removeCustomData(StorageKeys.SELECTED_ADDRESS_ID);
  },

  clearLocation: async () => {
    set({ serviceableVillage: null, status: 'idle', selectedAddressId: null, savedAddresses: [] });
    await Promise.all([
      StoredPrefs.removeCustomData(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.removeCustomData(StorageKeys.SELECTED_ADDRESS_ID),
    ]);
  },

  hasServiceableLocation: () => get().serviceableVillage !== null,
}));
```

- [ ] **Step 2: Export it from the store barrel**

In `src/core/store/index.ts`, add (match existing export style in that file):

```ts
export { useLocationStore } from './useLocationStore';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/store/useLocationStore.ts src/core/store/index.ts
git commit -m "feat(location): add useLocationStore with SecureStore hydration"
```

---

## Task 7: AddressRepository

**Files:**
- Create: `src/features/location/data/AddressRepository.ts`

- [ ] **Step 1: Create the interface + remote implementation**

```ts
// src/features/location/data/AddressRepository.ts

import { Address } from '../domain/models';
import {
  CreateAddressInput,
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './locationApi';

export interface AddressRepository {
  list(): Promise<Address[]>;
  create(input: CreateAddressInput): Promise<Address>;
  update(id: string, input: CreateAddressInput): Promise<Address>;
  remove(id: string): Promise<void>;
  makeDefault(id: string, input: CreateAddressInput): Promise<Address>;
}

/** Hits the real /address endpoints. Requires a bearer token (authed users). */
export const RemoteAddressRepository: AddressRepository = {
  list: listAddresses,
  create: createAddress,
  update: updateAddress,
  remove: deleteAddress,
  makeDefault: setDefaultAddress,
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/data/AddressRepository.ts
git commit -m "feat(location): add address repository"
```

---

## Task 8: useLocationGateViewModel

**Files:**
- Create: `src/features/location/viewmodel/useLocationGateViewModel.ts`

- [ ] **Step 1: Create the gate viewmodel**

```ts
// src/features/location/viewmodel/useLocationGateViewModel.ts

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService, PermissionState } from '../data/LocationService';
import { findByLocation } from '../data/locationApi';

export function useLocationGateViewModel() {
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const setStatus = useLocationStore((s) => s.setStatus);
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const setNotServiceable = useLocationStore((s) => s.setNotServiceable);

  const [permission, setPermission] = useState<PermissionState>('undetermined');

  /** Full flow: permission → GPS → find-by-location → status. */
  const useCurrentLocation = useCallback(async () => {
    setStatus('locating');
    try {
      const granted = await LocationService.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setStatus('idle');
        return;
      }

      const coords = await LocationService.getCurrentPosition();
      setStatus('checking');

      const result = await findByLocation(coords);
      if (result.serviceable) {
        await setServiceable(
          result.village ?? { id: 'unknown', name: 'Your location', latitude: coords.latitude, longitude: coords.longitude },
        );
      } else {
        setNotServiceable();
      }
    } catch {
      // Network / 5xx / GPS failure → retryable error state.
      setStatus('error');
    }
  }, [setStatus, setServiceable, setNotServiceable]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const retry = useCallback(() => {
    setStatus('idle');
    void useCurrentLocation();
  }, [setStatus, useCurrentLocation]);

  return { status, village, permission, useCurrentLocation, openSettings, retry };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useLocationGateViewModel.ts
git commit -m "feat(location): add location gate viewmodel"
```

---

## Task 9: useSelectLocationViewModel

**Files:**
- Create: `src/features/location/viewmodel/useSelectLocationViewModel.ts`

This drives the Select Location screen. Search is GPS-only when logged out (no public search endpoint), so the search field is inert and the friend action is a stub.

- [ ] **Step 1: Create the viewmodel**

```ts
// src/features/location/viewmodel/useSelectLocationViewModel.ts

import { useState } from 'react';
import { useLocationGateViewModel } from './useLocationGateViewModel';

export function useSelectLocationViewModel() {
  const gate = useLocationGateViewModel();
  const [search, setSearch] = useState('');

  // Logged-out search is disabled: only find-by-location (lat/lng) is public.
  const searchEnabled = false;

  const requestFromFriend = () => {
    // Stub — WhatsApp share flow not implemented in this scope.
  };

  return { ...gate, search, setSearch, searchEnabled, requestFromFriend };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useSelectLocationViewModel.ts
git commit -m "feat(location): add select-location viewmodel"
```

---

## Task 10: Presentational components (CurrentLocationRow, NotServiceableView)

**Files:**
- Create: `src/features/location/views/components/CurrentLocationRow.tsx`
- Create: `src/features/location/views/components/NotServiceableView.tsx`

- [ ] **Step 1: CurrentLocationRow**

```tsx
// src/features/location/views/components/CurrentLocationRow.tsx

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { LocateFixed } from 'lucide-react-native';

interface Props {
  title: string;
  subtitle: string;
  cta: string;
  loading?: boolean;
  onPress: () => void;
}

export const CurrentLocationRow = ({ title, subtitle, cta, loading, onPress }: Props) => (
  <View className="flex-row items-center bg-white rounded-2xl px-4 py-4">
    <LocateFixed size={22} color="#16a34a" />
    <View className="flex-1 ml-3 mr-3">
      <Text className="text-green-700 font-bold text-base">{title}</Text>
      <Text className="text-slate-500 text-sm mt-0.5">{subtitle}</Text>
    </View>
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className="border border-green-600 rounded-xl px-4 py-2"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#16a34a" />
      ) : (
        <Text className="text-green-700 font-bold text-sm">{cta}</Text>
      )}
    </TouchableOpacity>
  </View>
);
```

- [ ] **Step 2: NotServiceableView**

```tsx
// src/features/location/views/components/NotServiceableView.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

interface Props {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onUseAnotherPincode: () => void;
}

export const NotServiceableView = ({ title, subtitle, ctaLabel, onUseAnotherPincode }: Props) => (
  <View className="items-center px-6 py-10">
    <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-5">
      <ShoppingBag size={30} color="#16a34a" />
    </View>
    <Text className="text-slate-900 font-bold text-xl text-center">{title}</Text>
    <Text className="text-slate-500 text-base text-center mt-2 leading-6">{subtitle}</Text>
    <TouchableOpacity
      onPress={onUseAnotherPincode}
      className="bg-green-600 rounded-2xl px-6 py-3.5 mt-6"
    >
      <Text className="text-white font-bold text-base">{ctaLabel}</Text>
    </TouchableOpacity>
  </View>
);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/location/views/components/CurrentLocationRow.tsx src/features/location/views/components/NotServiceableView.tsx
git commit -m "feat(location): add CurrentLocationRow & NotServiceableView"
```

---

## Task 11: i18n keys

**Files:**
- Modify: `src/base/constants/translations.ts`

Add keys now so all screens can reference them. Insert into the `TRANSLATIONS` object (before the closing `};`).

- [ ] **Step 1: Add the keys**

```ts
  // Location & address
  select_location:        { te: 'లొకేషన్ ఎంచుకోండి',                 en: 'Select Location' },
  search_address_ph:      { te: 'చిరునామా వెతకండి',                  en: 'Search Address' },
  use_current_location:   { te: 'నా ప్రస్తుత లొకేషన్ వాడండి',        en: 'Use my Current Location' },
  current_location_sub:   { te: 'మెరుగైన సేవల కోసం లొకేషన్ ఆన్ చేయండి', en: 'Enable your current location for better services' },
  enable:                 { te: 'ఆన్ చేయి',                          en: 'Enable' },
  request_from_friend:    { te: 'స్నేహితుని నుండి చిరునామా అడగండి',  en: 'Request address from friend' },
  search_your_location:   { te: 'మీ లొకేషన్ వెతకండి',                en: 'Search your Location' },
  permission_off_title:   { te: 'లొకేషన్ అనుమతి ఆఫ్‌లో ఉంది',        en: 'Location permission is off' },
  permission_off_sub:     { te: 'లొకేషన్ ఆన్ చేస్తే మేము మిమ్మల్ని త్వరగా చేరుకోగలం', en: 'Enabling location helps us reach you quickly with accurate delivery' },
  open_settings:          { te: 'సెట్టింగ్స్ తెరవండి',               en: 'Open settings' },
  locating:               { te: 'లొకేషన్ తీసుకుంటోంది…',             en: 'Getting your location…' },
  location_error_title:   { te: 'లొకేషన్ దొరకలేదు',                  en: "Couldn't get your location" },
  retry:                  { te: 'మళ్ళీ ప్రయత్నించండి',              en: 'Retry' },
  not_serviceable_title:  { te: 'ఈ లొకేషన్‌కు సేవ లేదు',             en: 'Location Not Serviceable' },
  not_serviceable_sub:    { te: 'మీ లొకేషన్‌కు 10 నిమిషాల డెలివరీ తీసుకురావడానికి మా బృందం కృషి చేస్తోంది', en: 'Our team is working tirelessly to bring 10 minute deliveries to your location' },
  use_another_pincode:    { te: 'వేరే పిన్‌కోడ్ వాడండి',             en: 'Use another pincode' },
  select_delivery_address:{ te: 'డెలివరీ చిరునామా ఎంచుకోండి',        en: 'Select delivery address' },
  add_new_address:        { te: '+ కొత్త చిరునామా జోడించండి',        en: '+ Add New Address' },
  deliver_here:           { te: 'ఇక్కడ డెలివరీ చేయండి',             en: 'Deliver Here' },
  no_saved_addresses:     { te: 'సేవ్ చేసిన చిరునామాలు లేవు',        en: 'No saved addresses' },
  tag_home:               { te: 'ఇల్లు',                            en: 'Home' },
  tag_work:               { te: 'ఆఫీస్',                            en: 'Work' },
  tag_other:              { te: 'ఇతర',                              en: 'Other' },
  field_house_street:     { te: 'ఇంటి నెం., వీధి',                  en: 'House no., street' },
  field_area_optional:    { te: 'ఏరియా / అపార్ట్‌మెంట్ (ఐచ్ఛికం)',  en: 'Area / apartment (optional)' },
  field_landmark:         { te: 'ల్యాండ్‌మార్క్ (ఐచ్ఛికం)',         en: 'Landmark (optional)' },
  field_pincode:          { te: 'పిన్‌కోడ్',                        en: 'Pincode' },
  set_as_default:         { te: 'డిఫాల్ట్‌గా సెట్ చేయండి',           en: 'Set as default' },
  save_address:           { te: 'చిరునామా సేవ్ చేయండి',             en: 'Save address' },
  err_house_required:     { te: 'ఇంటి నెం./వీధి అవసరం',             en: 'House no./street is required' },
  err_pincode_invalid:    { te: 'సరైన 6 అంకెల పిన్‌కోడ్ ఇవ్వండి',   en: 'Enter a valid 6-digit pincode' },
  minutes_label:          { te: 'నిమిషాలు',                        en: 'minutes' },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(location): add i18n keys for location & address"
```

---

## Task 12: SelectLocationScreen + LocationGateScreen + location route

**Files:**
- Create: `src/features/location/views/SelectLocationScreen.tsx`
- Create: `src/features/location/views/LocationGateScreen.tsx`
- Create: `app/location/index.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: SelectLocationScreen**

```tsx
// src/features/location/views/SelectLocationScreen.tsx

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Phone, Search } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useSelectLocationViewModel } from '../viewmodel/useSelectLocationViewModel';
import { CurrentLocationRow } from './components/CurrentLocationRow';

export const SelectLocationScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const vm = useSelectLocationViewModel();
  const loading = vm.status === 'locating' || vm.status === 'checking';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-2">
        <Text className="text-slate-900 font-bold text-2xl mb-5">{t('select_location')}</Text>

        {/* Search (inert when logged out — GPS-only) */}
        <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3">
          <Search size={20} color="#94a3b8" />
          <TextInput
            value={vm.search}
            onChangeText={vm.setSearch}
            editable={vm.searchEnabled}
            placeholder={t('search_address_ph')}
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-slate-900 text-base"
          />
        </View>
      </View>

      <View className="bg-slate-50 flex-1 mt-5 px-5 pt-5" style={{ paddingBottom: insets.bottom }}>
        <CurrentLocationRow
          title={t('use_current_location')}
          subtitle={t('current_location_sub')}
          cta={t('enable')}
          loading={loading}
          onPress={vm.useCurrentLocation}
        />

        <TouchableOpacity
          onPress={vm.requestFromFriend}
          className="flex-row items-center bg-white rounded-2xl px-4 py-4 mt-4"
        >
          <Phone size={20} color="#16a34a" />
          <Text className="flex-1 ml-3 text-slate-900 font-semibold text-base">
            {t('request_from_friend')}
          </Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: LocationGateScreen (routes between states)**

```tsx
// src/features/location/views/LocationGateScreen.tsx

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { SelectLocationScreen } from './SelectLocationScreen';
import { NotServiceableView } from './components/NotServiceableView';
import { useLocationGateViewModel } from '../viewmodel/useLocationGateViewModel';

export const LocationGateScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useLocationStore((s) => s.status);
  const setStatus = useLocationStore((s) => s.setStatus);
  const gate = useLocationGateViewModel();

  if (status === 'serviceable') {
    // Gate released — leave the location route.
    router.replace('/(dashboard)/home');
    return null;
  }

  if (status === 'locating' || status === 'checking') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="text-slate-500 text-base mt-4">{t('locating')}</Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <NotServiceableView
          title={t('location_error_title')}
          subtitle={t('not_serviceable_sub')}
          ctaLabel={t('retry')}
          onUseAnotherPincode={gate.retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'not_serviceable') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <NotServiceableView
          title={t('not_serviceable_title')}
          subtitle={t('not_serviceable_sub')}
          ctaLabel={t('use_another_pincode')}
          onUseAnotherPincode={() => setStatus('idle')}
        />
      </SafeAreaView>
    );
  }

  // idle
  return <SelectLocationScreen />;
};
```

- [ ] **Step 3: location route**

```tsx
// app/location/index.tsx

import { LocationGateScreen } from '@/src/features/location/views/LocationGateScreen';

export default function LocationRoute() {
  return <LocationGateScreen />;
}
```

- [ ] **Step 4: Register routes in `app/_layout.tsx`**

In the `<Stack>` in `app/_layout.tsx`, add two screens alongside the existing ones:

```tsx
              <Stack.Screen name="location/index" />
              <Stack.Screen name="address/add" />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/location/views/SelectLocationScreen.tsx src/features/location/views/LocationGateScreen.tsx app/location/index.tsx app/_layout.tsx
git commit -m "feat(location): add Select Location & gate screens + route"
```

---

## Task 13: Hard gate in AppScreen

**Files:**
- Modify: `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`

Hydrate the location store at launch and redirect to `/location` when no serviceable location exists. Allow `location` and `address` segments through the guard.

- [ ] **Step 1: Update AppScreen**

Replace the body of `AppScreen` with this version (keeps the existing font + auth logic, adds location hydration + gate):

```tsx
import { useAuthStore, useLocationStore } from '@/src/core/store';
import { useFonts } from 'expo-font';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const checkExistingAuth = useAuthStore((state) => state.checkExistingAuth);
  const hydrateLocation = useLocationStore((s) => s.hydrate);
  const hydrated = useLocationStore((s) => s.hydrated);
  const hasServiceableLocation = useLocationStore((s) => s.serviceableVillage !== null);

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    Promise.all([checkExistingAuth(), hydrateLocation()]).finally(() => setReady(true));
  }, [checkExistingAuth, hydrateLocation]);

  useEffect(() => {
    if (!fontsLoaded || !ready || !hydrated) return;

    const root = segments[0] as string | undefined;
    const inLocation = root === 'location';

    // Hard gate: no serviceable location → force the location screen.
    if (!hasServiceableLocation) {
      if (!inLocation) router.replace('/location');
      return;
    }

    // Serviceable: keep known routes; bounce unknown roots to home.
    const allowed = [
      '(dashboard)', 'auth', 'search', 'onboarding',
      'category-details', 'cart', 'top-picks', 'order-detail', 'location', 'address',
    ];
    if (!root || !allowed.includes(root)) {
      router.replace('/(dashboard)/home');
    }
  }, [fontsLoaded, ready, hydrated, hasServiceableLocation, segments]);

  if (!fontsLoaded || !ready || !hydrated) return null;

  return <>{children}</>;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke (gate)**

Run: `npx expo start` and open the app (fresh install / cleared storage).
Expected: app opens on the **Select Location** screen, not the dashboard. The dashboard is unreachable until a location is confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/features/initialization/views/screens/AppScreen/AppScreen.tsx
git commit -m "feat(location): hard-gate dashboard behind serviceable location"
```

---

## Task 14: LocationHeader + LocationEntrySheet + HomeScreen wiring

**Files:**
- Create: `src/features/location/views/components/LocationHeader.tsx`
- Create: `src/features/location/views/LocationEntrySheet.tsx`
- Modify: `src/features/home/views/home/HomeScreen.tsx`

- [ ] **Step 1: LocationHeader**

```tsx
// src/features/location/views/components/LocationHeader.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, UserCircle2, Zap } from 'lucide-react-native';

interface Props {
  etaMinutes: number;
  minutesLabel: string;
  primaryLabel: string;   // tag or village name, e.g. "Home" / village
  secondaryLabel: string; // address line / village description
  onPressLocation: () => void;
  onPressProfile: () => void;
}

export const LocationHeader = ({
  etaMinutes,
  minutesLabel,
  primaryLabel,
  secondaryLabel,
  onPressLocation,
  onPressProfile,
}: Props) => (
  <View className="flex-row items-start justify-between">
    <TouchableOpacity className="flex-1 mr-3" onPress={onPressLocation} activeOpacity={0.7}>
      <View className="flex-row items-center gap-1">
        <Zap size={18} color="#16a34a" fill="#16a34a" />
        <Text className="text-slate-900 font-bold text-lg">{etaMinutes} {minutesLabel}</Text>
      </View>
      <View className="flex-row items-center mt-0.5">
        <Text className="text-slate-700 font-semibold text-sm" numberOfLines={1}>
          {primaryLabel}
          {secondaryLabel ? <Text className="text-slate-500 font-normal"> - {secondaryLabel}</Text> : null}
        </Text>
        <ChevronDown size={16} color="#64748b" />
      </View>
    </TouchableOpacity>
    <TouchableOpacity onPress={onPressProfile}>
      <UserCircle2 size={32} color="#334155" />
    </TouchableOpacity>
  </View>
);
```

- [ ] **Step 2: LocationEntrySheet**

```tsx
// src/features/location/views/LocationEntrySheet.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Phone, Search } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useSelectLocationViewModel } from '../viewmodel/useSelectLocationViewModel';
import { CurrentLocationRow } from './components/CurrentLocationRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const LocationEntrySheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useSelectLocationViewModel();
  const loading = vm.status === 'locating' || vm.status === 'checking';

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <View className="items-center py-4">
          <MapPin size={48} color="#16a34a" fill="#dcfce7" />
        </View>
        <Text className="text-slate-900 font-bold text-xl text-center">{t('permission_off_title')}</Text>
        <Text className="text-slate-500 text-base text-center mt-2 leading-6">
          {t('permission_off_sub')}
        </Text>

        <View className="mt-5 border border-slate-100 rounded-2xl overflow-hidden">
          <CurrentLocationRow
            title={t('use_current_location')}
            subtitle={t('current_location_sub')}
            cta={t('enable')}
            loading={loading}
            onPress={vm.useCurrentLocation}
          />
          <View className="h-px bg-slate-100" />
          <TouchableOpacity onPress={vm.requestFromFriend} className="flex-row items-center bg-white px-4 py-4">
            <Phone size={20} color="#16a34a" />
            <Text className="flex-1 ml-3 text-slate-900 font-semibold text-base">
              {t('request_from_friend')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="flex-row items-center justify-center border border-slate-200 rounded-2xl px-4 py-3.5 mt-4">
          <Search size={20} color="#64748b" />
          <Text className="ml-2 text-slate-700 font-semibold text-base">{t('search_your_location')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
```

- [ ] **Step 3: Wire HomeScreen header**

In `src/features/home/views/home/HomeScreen.tsx`:

(a) Add imports near the other imports:

```tsx
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationHeader } from '@/src/features/location/views/components/LocationHeader';
import { LocationEntrySheet } from '@/src/features/location/views/LocationEntrySheet';
```

(b) Inside the component, add state + selectors (near the other hooks):

```tsx
  const village = useLocationStore((s) => s.serviceableVillage);
  const [locationSheetOpen, setLocationSheetOpen] = React.useState(false);
```

(c) Replace the existing location `TouchableOpacity` block (the one containing `<MapPin ... />` and `రాజంపేట · 25 min`) with:

```tsx
          <LocationHeader
            etaMinutes={8}
            minutesLabel={t('minutes_label')}
            primaryLabel={village?.name ?? t('home_label')}
            secondaryLabel={village?.pincode ?? ''}
            onPressLocation={() => setLocationSheetOpen(true)}
            onPressProfile={() => router.push('/(dashboard)/profile')}
          />
```

(d) Before the final closing tag of the returned JSX (next to `<VariantBottomSheet ... />`), add:

```tsx
      <LocationEntrySheet visible={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} />
```

> Note: the locale toggle pill currently living in that header row can stay where it is; only the left location block is replaced. If the toggle was inside the replaced block, re-add it next to `LocationHeader`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual smoke (header)**

Run: `npx expo start`. After confirming a location, open home.
Expected: header shows `⚡ 8 minutes` + the village name; tapping it opens the location bottom sheet.

- [ ] **Step 6: Commit**

```bash
git add src/features/location/views/components/LocationHeader.tsx src/features/location/views/LocationEntrySheet.tsx src/features/home/views/home/HomeScreen.tsx
git commit -m "feat(location): add home location header + entry sheet"
```

---

## Task 15: Address book (authed) — TagSelector, AddressRow, viewmodel, bottom sheet

**Files:**
- Create: `src/features/location/views/components/TagSelector.tsx`
- Create: `src/features/location/views/components/AddressRow.tsx`
- Create: `src/features/location/viewmodel/useAddressBookViewModel.ts`
- Create: `src/features/location/views/AddressBottomSheet.tsx`

- [ ] **Step 1: TagSelector**

```tsx
// src/features/location/views/components/TagSelector.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Briefcase, Home, MapPin } from 'lucide-react-native';
import { AddressTag } from '../../domain/models';

interface Props {
  value: AddressTag;
  onChange: (tag: AddressTag) => void;
  labels: Record<AddressTag, string>;
}

const ICONS: Record<AddressTag, React.ComponentType<{ size: number; color: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export const TagSelector = ({ value, onChange, labels }: Props) => (
  <View className="flex-row gap-2">
    {(['home', 'work', 'other'] as AddressTag[]).map((tag) => {
      const Icon = ICONS[tag];
      const active = value === tag;
      return (
        <TouchableOpacity
          key={tag}
          onPress={() => onChange(tag)}
          className={`flex-row items-center px-4 py-2 rounded-full border ${active ? 'bg-green-50 border-green-600' : 'border-slate-200'}`}
        >
          <Icon size={16} color={active ? '#16a34a' : '#64748b'} />
          <Text className={`ml-1.5 text-sm font-semibold ${active ? 'text-green-700' : 'text-slate-600'}`}>
            {labels[tag]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
```

- [ ] **Step 2: AddressRow**

```tsx
// src/features/location/views/components/AddressRow.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Briefcase, Check, Home, MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { Address, AddressTag } from '../../domain/models';

interface Props {
  address: Address;
  selected: boolean;
  tagLabel: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ICONS: Record<AddressTag, React.ComponentType<{ size: number; color: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export const AddressRow = ({ address, selected, tagLabel, onSelect, onEdit, onDelete }: Props) => {
  const Icon = ICONS[address.tag];
  const line = [address.addressLine1, address.addressLine2, address.villageName]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`flex-row items-start rounded-2xl px-4 py-4 mb-3 border ${selected ? 'bg-green-50 border-green-600' : 'bg-white border-slate-100'}`}
    >
      <Icon size={20} color={selected ? '#16a34a' : '#334155'} />
      <View className="flex-1 mx-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-slate-900 font-bold text-base">{tagLabel}</Text>
          {selected ? <Check size={16} color="#16a34a" /> : null}
        </View>
        <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={2}>{line}</Text>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity onPress={onEdit} hitSlop={8}><Pencil size={18} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
```

- [ ] **Step 3: useAddressBookViewModel**

```ts
// src/features/location/viewmodel/useAddressBookViewModel.ts

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/src/core/store';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { RemoteAddressRepository } from '../data/AddressRepository';

export function useAddressBookViewModel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const setSelectedAddressId = useLocationStore((s) => s.setSelectedAddressId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const list = await RemoteAddressRepository.list();
      setSavedAddresses(list);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setSavedAddresses]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const select = useCallback((id: string) => setSelectedAddressId(id), [setSelectedAddressId]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await RemoteAddressRepository.remove(id);
        setSavedAddresses(addresses.filter((a) => a.id !== id));
      } catch {
        setError('failed');
      }
    },
    [addresses, setSavedAddresses],
  );

  return {
    isAuthenticated,
    addresses,
    selectedAddressId,
    loading,
    error,
    refresh,
    select,
    remove,
  };
}
```

- [ ] **Step 4: AddressBottomSheet**

```tsx
// src/features/location/views/AddressBottomSheet.tsx

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { AddressRow } from './components/AddressRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddressBottomSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useAddressBookViewModel();

  const tagLabel = (tag: AddressTag) =>
    tag === 'home' ? t('tag_home') : tag === 'work' ? t('tag_work') : t('tag_other');

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <Text className="text-slate-900 font-bold text-lg mb-4">{t('select_delivery_address')}</Text>

        {vm.loading ? (
          <View className="py-8 items-center"><ActivityIndicator color="#16a34a" /></View>
        ) : vm.addresses.length === 0 ? (
          <Text className="text-slate-500 text-base py-6 text-center">{t('no_saved_addresses')}</Text>
        ) : (
          vm.addresses.map((a) => (
            <AddressRow
              key={a.id}
              address={a}
              tagLabel={tagLabel(a.tag)}
              selected={a.id === vm.selectedAddressId}
              onSelect={() => { vm.select(a.id); onClose(); }}
              onEdit={() => { onClose(); router.push(`/address/add?id=${a.id}` as any); }}
              onDelete={() => vm.remove(a.id)}
            />
          ))
        )}

        <TouchableOpacity
          onPress={() => { onClose(); router.push('/address/add' as any); }}
          className="bg-green-600 rounded-2xl py-4 items-center mt-2"
        >
          <Text className="text-white font-bold text-base">{t('add_new_address')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
```

- [ ] **Step 5: Show the address book to authed users from the header**

In `src/features/home/views/home/HomeScreen.tsx`, add the import and render the address sheet, and switch the header tap target by auth:

(a) Imports:

```tsx
import { AddressBottomSheet } from '@/src/features/location/views/AddressBottomSheet';
import { useAuthStore } from '@/src/core/store';
```

(b) Hooks:

```tsx
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [addressSheetOpen, setAddressSheetOpen] = React.useState(false);
```

(c) Change the `LocationHeader` `onPressLocation` to branch on auth:

```tsx
            onPressLocation={() => (isAuthenticated ? setAddressSheetOpen(true) : setLocationSheetOpen(true))}
```

(d) Next to `LocationEntrySheet`, add:

```tsx
      <AddressBottomSheet visible={addressSheetOpen} onClose={() => setAddressSheetOpen(false)} />
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/location/views/components/TagSelector.tsx src/features/location/views/components/AddressRow.tsx src/features/location/viewmodel/useAddressBookViewModel.ts src/features/location/views/AddressBottomSheet.tsx src/features/home/views/home/HomeScreen.tsx
git commit -m "feat(location): add login-gated address book bottom sheet"
```

---

## Task 16: Add/Edit address form

**Files:**
- Create: `src/features/location/viewmodel/useAddressFormViewModel.ts`
- Create: `src/features/location/views/AddressFormScreen.tsx`
- Create: `app/address/add.tsx`

- [ ] **Step 1: useAddressFormViewModel**

```ts
// src/features/location/viewmodel/useAddressFormViewModel.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { AddressTag } from '../domain/models';
import { CreateAddressInput } from '../data/locationApi';
import { RemoteAddressRepository } from '../data/AddressRepository';

interface FormState {
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  tag: AddressTag;
  isDefault: boolean;
}

const EMPTY: FormState = {
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  pincode: '',
  tag: 'home',
  isDefault: false,
};

export function useAddressFormViewModel(editId?: string) {
  const village = useLocationStore((s) => s.serviceableVillage);
  const savedAddresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ addressLine1?: string; pincode?: string }>({});

  // Prefill when editing.
  useEffect(() => {
    if (!editId) return;
    const existing = savedAddresses.find((a) => a.id === editId);
    if (existing) {
      setForm({
        addressLine1: existing.addressLine1,
        addressLine2: existing.addressLine2 ?? '',
        landmark: existing.landmark ?? '',
        pincode: existing.pincode ?? '',
        tag: existing.tag,
        isDefault: existing.isDefault,
      });
    }
  }, [editId, savedAddresses]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: { addressLine1?: string; pincode?: string } = {};
    if (!form.addressLine1.trim()) next.addressLine1 = 'err_house_required';
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'err_pincode_invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const villageName = village?.name ?? '';
  const canResolveVillage = useMemo(() => !!village?.id, [village]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!validate() || !village) return false;
    setSaving(true);
    try {
      const input: CreateAddressInput = {
        villageId: village.id,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        pincode: form.pincode.trim() || village.pincode,
        latitude: village.latitude,
        longitude: village.longitude,
        isDefault: form.isDefault,
        tag: form.tag,
      };
      const saved = editId
        ? await RemoteAddressRepository.update(editId, input)
        : await RemoteAddressRepository.create(input);
      const others = savedAddresses.filter((a) => a.id !== saved.id);
      setSavedAddresses([saved, ...others]);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [validate, village, form, editId, savedAddresses, setSavedAddresses]);

  return { form, set, errors, saving, save, villageName, villagePincode: village?.pincode, canResolveVillage };
}
```

- [ ] **Step 2: AddressFormScreen**

```tsx
// src/features/location/views/AddressFormScreen.tsx

import React from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useAddressFormViewModel } from '../viewmodel/useAddressFormViewModel';
import { TagSelector } from './components/TagSelector';

export const AddressFormScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const vm = useAddressFormViewModel(id);

  const tagLabels: Record<AddressTag, string> = {
    home: t('tag_home'),
    work: t('tag_work'),
    other: t('tag_other'),
  };

  const onSave = async () => {
    const ok = await vm.save();
    if (ok) router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft size={24} color="#334155" /></TouchableOpacity>
        <Text className="text-slate-900 font-bold text-lg ml-2">{t('add_new_address')}</Text>
      </View>

      <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
        {/* Village chip from find-by-location */}
        <View className="flex-row items-center bg-green-50 rounded-2xl px-4 py-3 mt-4">
          <MapPin size={18} color="#16a34a" />
          <Text className="ml-2 text-green-800 font-semibold text-sm" numberOfLines={1}>
            {vm.villageName}{vm.villagePincode ? ` · ${vm.villagePincode}` : ''}
          </Text>
        </View>

        <TextInput
          value={vm.form.addressLine1}
          onChangeText={(v) => vm.set('addressLine1', v)}
          placeholder={t('field_house_street')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-4 text-slate-900 text-base"
        />
        {vm.errors.addressLine1 ? <Text className="text-red-500 text-xs mt-1 ml-1">{t(vm.errors.addressLine1)}</Text> : null}

        <TextInput
          value={vm.form.addressLine2}
          onChangeText={(v) => vm.set('addressLine2', v)}
          placeholder={t('field_area_optional')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />

        <TextInput
          value={vm.form.landmark}
          onChangeText={(v) => vm.set('landmark', v)}
          placeholder={t('field_landmark')}
          placeholderTextColor="#94a3b8"
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />

        <TextInput
          value={vm.form.pincode}
          onChangeText={(v) => vm.set('pincode', v)}
          placeholder={t('field_pincode')}
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={6}
          className="border border-slate-200 rounded-2xl px-4 py-3.5 mt-3 text-slate-900 text-base"
        />
        {vm.errors.pincode ? <Text className="text-red-500 text-xs mt-1 ml-1">{t(vm.errors.pincode)}</Text> : null}

        <Text className="text-slate-700 font-semibold text-sm mt-5 mb-2">{tagLabels.home} / {tagLabels.work} / {tagLabels.other}</Text>
        <TagSelector value={vm.form.tag} onChange={(tag) => vm.set('tag', tag)} labels={tagLabels} />

        <View className="flex-row items-center justify-between mt-5">
          <Text className="text-slate-700 font-semibold text-base">{t('set_as_default')}</Text>
          <Switch
            value={vm.form.isDefault}
            onValueChange={(v) => vm.set('isDefault', v)}
            trackColor={{ true: '#16a34a', false: '#cbd5e1' }}
          />
        </View>
      </ScrollView>

      <View className="px-5 pt-3 border-t border-slate-100" style={{ paddingBottom: insets.bottom + 12 }}>
        <TouchableOpacity
          onPress={onSave}
          disabled={vm.saving}
          className="bg-green-600 rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">{t('save_address')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
```

- [ ] **Step 3: address/add route**

```tsx
// app/address/add.tsx

import { AddressFormScreen } from '@/src/features/location/views/AddressFormScreen';

export default function AddAddressRoute() {
  return <AddressFormScreen />;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/viewmodel/useAddressFormViewModel.ts src/features/location/views/AddressFormScreen.tsx app/address/add.tsx
git commit -m "feat(location): add add/edit address form + route"
```

---

## Task 17: Lint pass & full smoke

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npx expo lint`
Expected: no errors (warnings acceptable if pre-existing). Fix any new errors introduced by this feature.

- [ ] **Step 2: Final typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke — full flow**

Run: `npx expo start` (clear app storage first).
Verify in order:
1. App launches on **Select Location** (gate active; dashboard not reachable).
2. Tap **Enable** → permission prompt → grant → spinner → home loads with the village name in the header (serviceable, 2xx).
3. Force not-serviceable (e.g. deny/airplane or a non-serviceable area) → **Location Not Serviceable** screen with **Use another pincode**.
4. Relaunch the app → goes straight to home (cached serviceable village, no gate).
5. Tap the header location → logged-out shows the **location bottom sheet** (no "Add New Address"); the saved address book + Add New appear only when `isAuthenticated` is true.

- [ ] **Step 4: Commit (if lint produced fixes)**

```bash
git add -A
git commit -m "chore(location): lint fixes & smoke pass"
```

---

## Self-Review Notes

- **Spec coverage:** initial gate (T8/T12/T13), serviceability 2xx→home (T4/T8), permission denied path (T8/T12), not-serviceable (T10/T12), Select Location screen (T12), location-off sheet (T14), header (T14), login-gated address book + Add New hidden (T15), add/edit form + validation + tag (T16), CRUD endpoints (T4/T7), caching last selected + serviceable village (T6), expo-location + no maps (T1/T5), i18n (T11), green accent + GPS-only (throughout), no games card (T10).
- **Auth reality:** address book renders only when `isAuthenticated`; with mocked login it stays hidden — matches the spec's login-gating rule.
- **Naming consistency:** `findByLocation`, `CreateAddressInput`, `RemoteAddressRepository`, `useLocationStore.serviceableVillage`, `hasServiceableLocation` used consistently across tasks.
