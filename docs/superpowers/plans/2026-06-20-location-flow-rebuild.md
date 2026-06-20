# Location Flow Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize the location flow into one guarded store orchestrator + one lifecycle listener, covering every permission / GPS / lifecycle edge case with Zepto/Blinkit-style UX.

**Architecture:** All location state and orchestration move into the zustand `useLocationStore`. `detectCurrentLocation`, `searchLocation`, `selectAddress`, `selectRecent`, and an internal `resolveCoords` live there, guarded by a module-level in-flight promise and a `seq` token. `useLocationViewModel` becomes a thin selector exposing the same return shape. One `useLocationLifecycle` (mounted once in `AppScreen`) owns the only `AppState` listener.

**Tech Stack:** React Native + Expo Router, zustand, expo-location (55.x), TypeScript.

**No automated test framework in this repo.** Verification per task = `npx tsc --noEmit` (no new errors) + manual checks in the final task. No unit-test steps.

**Design decision (refines spec):** permanently-denied is represented by a separate `blocked: boolean`, NOT by adding `'blocked'` to `PermissionState`. This keeps `PermissionState` (`granted|denied|undetermined`) and `UseCurrentLocationRow` unchanged.

---

### Task 1: Service tweaks — `__DEV__` logs, 20s timeout, `hasServicesEnabled`

**Files:**
- Modify: `src/features/location/data/LocationService.ts`

- [ ] **Step 1: Change the fix timeout to 20s**

In `getCurrentPosition`, change:

```ts
    const FIX_TIMEOUT_MS = 25000;
```

to:

```ts
    const FIX_TIMEOUT_MS = 20000;
```

- [ ] **Step 2: Add a `hasServicesEnabled` method**

Add this method to the `LocationService` object, right after `getPermissionState`:

```ts
  /** True when device location services (GPS) are on. */
  async hasServicesEnabled(): Promise<boolean> {
    return Location.hasServicesEnabledAsync().catch(() => false);
  },
```

- [ ] **Step 3: Gate every `console.log('[LOC] ...')` in this file behind `__DEV__`**

Wrap each existing `console.log('[LOC] ...')` call so it only runs in development. For every line of the form `console.log('[LOC] ...', ...)`, change it to `if (__DEV__) console.log('[LOC] ...', ...)`. There are log calls inside `firstFix` and `getCurrentPosition` — wrap all of them. Example:

```ts
      if (__DEV__) console.log('[LOC] firstFix: got', pos?.coords?.latitude, pos?.coords?.longitude);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i LocationService`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/data/LocationService.ts
git commit -m "refactor(location): 20s fix timeout, hasServicesEnabled, dev-gated logs"
```

---

### Task 2: Store — state fields + orchestrator + actions

**Files:**
- Modify: `src/core/store/useLocationStore.ts`

- [ ] **Step 1: Replace the entire file**

```ts
// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, LatLng, RecentLocation, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';
import { LocationService, PermissionState } from '@/src/features/location/data/LocationService';
import { findByLocation } from '@/src/features/location/data/locationApi';

const RECENT_LIMIT = 5;

export type LocationErrorKind = 'no_fix' | 'timeout' | 'network';

interface LocationState {
  status: ServiceabilityStatus;
  permission: PermissionState;
  blocked: boolean; // permanently denied ("Don't ask again")
  detecting: boolean;
  lastError: LocationErrorKind | null;
  serviceableVillage: Village | null;
  savedAddresses: Address[];
  recentLocations: RecentLocation[];
  hydrated: boolean;
}

interface LocationActions {
  hydrate: () => Promise<void>;
  setStatus: (status: ServiceabilityStatus) => void;
  setServiceable: (village: Village) => Promise<void>;
  setNotServiceable: () => void;
  setSavedAddresses: (addresses: Address[]) => void;
  addRecent: (recent: RecentLocation) => Promise<void>;
  clearLocation: () => Promise<void>;
  refreshPermission: () => Promise<PermissionState>;
  detectCurrentLocation: () => Promise<boolean>;
  searchLocation: (query: string) => Promise<boolean>;
  selectAddress: (address: Address) => Promise<boolean>;
  selectRecent: (recent: RecentLocation) => Promise<void>;
}

type LocationStore = LocationState & LocationActions;

type SetState = (partial: Partial<LocationState>) => void;
type GetState = () => LocationStore;

const initialState: LocationState = {
  status: 'idle',
  permission: 'undetermined',
  blocked: false,
  detecting: false,
  lastError: null,
  serviceableVillage: null,
  savedAddresses: [],
  recentLocations: [],
  hydrated: false,
};

// Module-level race guards (not in render state).
let inflight: Promise<boolean> | null = null;
let seq = 0;

/** Coords → serviceability. Drops its result if a newer detect/search started. */
async function resolveCoords(
  set: SetState,
  get: GetState,
  coords: LatLng,
  label: string | undefined,
  token: number,
): Promise<boolean> {
  set({ status: 'checking' });
  try {
    const result = await findByLocation(coords);
    if (token !== seq) return false; // stale — a newer request won
    if (result.serviceable && result.village) {
      const v = result.village;
      await get().setServiceable(v);
      if (v.storeId) {
        await get().addRecent({
          storeId: v.storeId,
          villageName: v.name,
          latitude: v.latitude ?? coords.latitude,
          longitude: v.longitude ?? coords.longitude,
          label: label ?? v.name,
          savedAt: Date.now(),
        });
      }
      set({ status: 'serviceable', detecting: false, lastError: null });
      return true;
    }
    set({ status: 'not_serviceable', detecting: false });
    return false;
  } catch {
    if (token !== seq) return false;
    set({ status: 'error', lastError: 'network', detecting: false });
    return false;
  }
}

/** Permission → GPS fix → resolve. */
async function runDetect(set: SetState, get: GetState): Promise<boolean> {
  const token = ++seq;
  set({ status: 'locating', detecting: true, lastError: null });

  const current = await LocationService.getPermissionState();
  if (current !== 'granted') {
    const res = await LocationService.requestPermission();
    set({
      permission: res.granted ? 'granted' : 'denied',
      blocked: !res.granted && !res.canAskAgain,
    });
    if (!res.granted) {
      set({ status: 'idle', detecting: false });
      return false;
    }
  } else {
    set({ permission: 'granted', blocked: false });
  }

  let coords: LatLng;
  try {
    coords = await LocationService.getCurrentPosition();
  } catch (e: any) {
    set({
      status: 'error',
      lastError: e?.message === 'LOCATION_TIMEOUT' ? 'timeout' : 'no_fix',
      detecting: false,
    });
    return false;
  }

  return resolveCoords(set, get, coords, undefined, token);
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const [village, recents] = await Promise.all([
      StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.getCustomData<RecentLocation[]>(StorageKeys.RECENT_LOCATIONS),
    ]);
    set({
      serviceableVillage: village ?? null,
      recentLocations: Array.isArray(recents) ? recents : [],
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

  addRecent: async (recent) => {
    const next = [
      recent,
      ...get().recentLocations.filter((r) => r.storeId !== recent.storeId),
    ].slice(0, RECENT_LIMIT);
    set({ recentLocations: next });
    await StoredPrefs.setCustomData(StorageKeys.RECENT_LOCATIONS, next);
  },

  clearLocation: async () => {
    set({ serviceableVillage: null, status: 'idle' });
    await StoredPrefs.removeCustomData(StorageKeys.SERVICEABLE_VILLAGE);
  },

  refreshPermission: async () => {
    const permission = await LocationService.getPermissionState();
    set({ permission });
    return permission;
  },

  detectCurrentLocation: async () => {
    if (inflight) return inflight; // dedupe concurrent callers
    inflight = runDetect(set, get);
    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  },

  searchLocation: async (query) => {
    const q = query.trim();
    if (!q) return false;
    const token = ++seq;
    set({ status: 'locating', detecting: true, lastError: null });
    let coords: LatLng | null;
    try {
      coords = await LocationService.geocode(q);
    } catch {
      set({ status: 'error', lastError: 'network', detecting: false });
      return false;
    }
    if (!coords) {
      set({ status: 'idle', detecting: false });
      return false;
    }
    return resolveCoords(set, get, coords, q, token);
  },

  selectAddress: async (address) => {
    if (address.latitude == null || address.longitude == null) return false;
    const token = ++seq;
    const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
    set({ detecting: true, lastError: null });
    return resolveCoords(
      set,
      get,
      { latitude: address.latitude, longitude: address.longitude },
      label,
      token,
    );
  },

  selectRecent: async (r) => {
    const v: Village = {
      id: r.storeId,
      name: r.villageName,
      storeId: r.storeId,
      latitude: r.latitude,
      longitude: r.longitude,
    };
    await get().setServiceable(v);
    await get().addRecent({ ...r, savedAt: Date.now() });
  },
}));
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i useLocationStore`
Expected: no output. (`useLocationViewModel.ts` still has its own logic and will be reconciled in Task 3; a transient error there is acceptable until then.)

- [ ] **Step 3: Commit**

```bash
git add src/core/store/useLocationStore.ts
git commit -m "feat(location): centralize orchestrator + race guards in store"
```

---

### Task 3: Gut `useLocationViewModel` to a thin selector

**Files:**
- Modify: `src/features/location/viewmodel/useLocationViewModel.ts`

- [ ] **Step 1: Replace the entire file**

```ts
// src/features/location/viewmodel/useLocationViewModel.ts
//
// Thin adapter over useLocationStore. All orchestration + race guards live in
// the store; this hook only selects state and exposes the actions the views use.
// Permission/blocked are store state (single source of truth), so every consumer
// stays in sync and there are no per-instance AppState listeners.

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';

export function useLocationViewModel() {
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const permission = useLocationStore((s) => s.permission);
  const storeBlocked = useLocationStore((s) => s.blocked);
  const lastError = useLocationStore((s) => s.lastError);
  const detecting = useLocationStore((s) => s.detecting);
  const recentLocations = useLocationStore((s) => s.recentLocations);

  const detectCurrentLocation = useLocationStore((s) => s.detectCurrentLocation);
  const searchLocation = useLocationStore((s) => s.searchLocation);
  const selectAddress = useLocationStore((s) => s.selectAddress);
  const selectRecent = useLocationStore((s) => s.selectRecent);

  // Local-only flag so the user can dismiss the "blocked → Settings" sheet
  // without changing the underlying OS permission.
  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const blocked = storeBlocked && !blockedDismissed;

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlockedDismissed(true), []);

  const retry = useCallback(() => {
    setBlockedDismissed(false);
    void detectCurrentLocation();
  }, [detectCurrentLocation]);

  return {
    status,
    village,
    permission,
    blocked,
    lastError,
    recentLocations,
    detecting,
    detectCurrentLocation,
    searchLocation,
    selectAddress,
    selectRecent,
    openSettings,
    dismissBlocked,
    retry,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "useLocationViewModel|LocationSheet|SelectLocationScreen|LocationPermissionSheet"`
Expected: no output. The existing consumer views use `vm.status`, `vm.village`, `vm.permission`, `vm.blocked`, `vm.recentLocations`, `vm.detecting`, `vm.detectCurrentLocation`, `vm.searchLocation`, `vm.selectAddress`, `vm.selectRecent`, `vm.openSettings`, `vm.dismissBlocked`, `vm.retry` — all preserved.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useLocationViewModel.ts
git commit -m "refactor(location): thin view model over centralized store"
```

---

### Task 4: Lifecycle listener + wire into AppScreen

**Files:**
- Create: `src/features/location/lifecycle/useLocationLifecycle.ts`
- Modify: `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`

- [ ] **Step 1: Create the lifecycle hook**

```ts
// src/features/location/lifecycle/useLocationLifecycle.ts
//
// The single AppState listener for location. Mounted once (AppScreen). On
// returning to the foreground it re-reads permission and auto-detects when the
// user has just granted permission or enabled GPS in Settings — but never when a
// village is already set. Guarded by the store's in-flight promise, so it can't
// double-fire with another detect.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService } from '@/src/features/location/data/LocationService';

export function useLocationLifecycle() {
  useEffect(() => {
    // Seed the permission state once at startup.
    void useLocationStore.getState().refreshPermission();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const store = useLocationStore.getState();
      const prevPerm = store.permission;
      const perm = await store.refreshPermission();
      if (useLocationStore.getState().serviceableVillage) return; // already set

      if (prevPerm !== 'granted' && perm === 'granted') {
        void store.detectCurrentLocation(); // returned from Settings with permission
        return;
      }
      if (perm === 'granted' && (await LocationService.hasServicesEnabled())) {
        void store.detectCurrentLocation(); // returned after enabling GPS
      }
    });

    return () => sub.remove();
  }, []);
}
```

- [ ] **Step 2: Call it once in AppScreen**

In `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`, add the import after the existing imports:

```ts
import { useLocationLifecycle } from '@/src/features/location/lifecycle/useLocationLifecycle';
```

Then call the hook inside the component, right after the `hydrateLocation` line:

```ts
  const hydrateLocation = useLocationStore((s) => s.hydrate);
  useLocationLifecycle();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "useLocationLifecycle|AppScreen"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/location/lifecycle/useLocationLifecycle.ts src/features/initialization/views/screens/AppScreen/AppScreen.tsx
git commit -m "feat(location): single AppState lifecycle listener in AppScreen"
```

---

### Task 5: LocationPermissionSheet — error + blocked states, Retry

**Files:**
- Modify: `src/features/location/views/LocationPermissionSheet.tsx`

**Context:** The sheet currently shows the hero, `UseCurrentLocationRow`, an inline "denied" note, saved addresses, and a "Search your location" button. Add (a) an error banner with a Retry button when `vm.lastError` is set, and (b) a "blocked → Open Settings" CTA when `vm.blocked` is true. Keep search + saved + recent as the manual fallback. There is no pincode UI to remove. The existing `PermissionDeniedSheet` overlay stays for the explicit blocked-sheet UX.

- [ ] **Step 1: Read `vm.lastError` and add recent locations to the destructured fields**

In `LocationPermissionSheet.tsx`, the component already does `const vm = useLocationViewModel();`. Add these derived values right after `const granted = vm.permission === 'granted';`:

```ts
  const hasError = vm.lastError !== null;
```

- [ ] **Step 2: Add the error banner + Retry, and the blocked CTA, above the saved-addresses block**

Locate this block:

```tsx
          {/* Use my Current Location */}
          <View className="mb-4">
            <UseCurrentLocationRow
              permission={vm.permission}
              loading={vm.detecting}
              onPress={() => run(vm.detectCurrentLocation())}
            />
            {denied ? (
              <View className="px-4 py-2.5 mt-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Text className="text-amber-800 font-medium text-[11.5px] leading-snug">
                  {t('location_denied_inline')}
                </Text>
              </View>
            ) : null}
          </View>
```

Replace it with:

```tsx
          {/* Use my Current Location */}
          <View className="mb-4">
            <UseCurrentLocationRow
              permission={vm.permission}
              loading={vm.detecting}
              onPress={() => run(vm.detectCurrentLocation())}
            />

            {hasError && !vm.detecting ? (
              <View className="px-4 py-3 mt-2 bg-red-50 border border-red-100 rounded-xl flex-row items-center gap-3">
                <Text className="flex-1 text-red-700 font-medium text-[12px] leading-snug">
                  {t('location_error_title')}
                </Text>
                <TouchableOpacity
                  onPress={() => run(vm.detectCurrentLocation())}
                  className="border border-red-300 bg-white px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-red-700 font-extrabold text-[11px]">{t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {vm.blocked ? (
              <TouchableOpacity
                onPress={vm.openSettings}
                className="px-4 py-3 mt-2 bg-amber-50 border border-amber-100 rounded-xl flex-row items-center justify-between"
              >
                <Text className="flex-1 text-amber-800 font-medium text-[11.5px] leading-snug">
                  {t('location_blocked_title')}
                </Text>
                <Text className="text-amber-900 font-extrabold text-[11px] underline ml-3">
                  {t('open_settings')}
                </Text>
              </TouchableOpacity>
            ) : denied && !hasError ? (
              <View className="px-4 py-2.5 mt-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Text className="text-amber-800 font-medium text-[11.5px] leading-snug">
                  {t('location_denied_inline')}
                </Text>
              </View>
            ) : null}
          </View>
```

- [ ] **Step 3: Add the `open_settings` translation key**

In `src/base/constants/translations.ts`, add this entry near the other location keys (e.g. right after the `location_blocked_title` line):

```ts
  open_settings:          { te: 'సెట్టింగ్‌లకు వెళ్లండి',          en: 'Open Settings' },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "LocationPermissionSheet|translations"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/views/LocationPermissionSheet.tsx src/base/constants/translations.ts
git commit -m "feat(location): error+blocked states with Retry in permission sheet"
```

---

### Task 6: Simplify HomeScreen bootstrap

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`

**Context:** `detectCurrentLocation` now lives in the store and is concurrency-guarded, so HomeScreen no longer needs `useLocationViewModel` for detection nor its own permission read. The bootstrap focus-effect should: auto-detect once when permission is granted, otherwise open the sheet. Sheet visibility stays derived; the sheet auto-closes when a village resolves.

- [ ] **Step 1: Swap the detection source**

In `HomeScreen.tsx`, the component currently has `const locationVm = useLocationViewModel();`. Replace that line with a direct store selector:

```ts
  const detectCurrentLocation = useLocationStore((s) => s.detectCurrentLocation);
```

Remove the now-unused import:

```ts
import { useLocationViewModel } from '@/src/features/location/viewmodel/useLocationViewModel';
```

(Delete that import line entirely. `LocationService` import stays — it is used by the focus effect.)

- [ ] **Step 2: Update the focus-effect body to use the store action**

Replace the auto-detect call inside the `useFocusEffect` callback:

```ts
        if (perm === 'granted' && !autoDetectedRef.current) {
          autoDetectedRef.current = true;
          void locationVm.detectCurrentLocation();
        } else {
          setPermSheetOpen(true);
        }
```

with:

```ts
        if (perm === 'granted' && !autoDetectedRef.current) {
          autoDetectedRef.current = true;
          void detectCurrentLocation();
        } else {
          setPermSheetOpen(true);
        }
```

- [ ] **Step 3: Fix the focus-effect dependency array**

The `React.useCallback` passed to `useFocusEffect` lists `locationVm.detectCurrentLocation` as a dependency. Change that dependency to the new stable store action:

```ts
    }, [hydrated, village, status, detectCurrentLocation]),
```

- [ ] **Step 4: Typecheck (whole project must be clean)**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors anywhere.

- [ ] **Step 5: Lint the touched files**

Run: `npx expo lint 2>&1 | tail -5`
Expected: no new errors for HomeScreen.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/views/home/HomeScreen.tsx
git commit -m "refactor(location): drive HomeScreen bootstrap from store orchestrator"
```

---

### Task 7: Manual verification

**Files:** none (runtime).

- [ ] **Step 1: Run the app**

Run: `npx expo start`. Use a build/device where a location fix is actually obtainable (physical device with GPS, or emulator with a location set in Extended Controls → Location).

- [ ] **Step 2: Walk the edge-case matrix**

Verify each row of the spec's matrix:
1. Fresh permission undetermined → sheet → tap Use current → OS prompt → grant → fix → serviceable → sheet closes.
2. Deny once → sheet stays, manual options (search/saved/recent) work.
3. Deny permanently → "Location access blocked / Open Settings" CTA + manual options; enable in Settings, return → auto-detect fires once.
4. GPS off → tap Use current → enable dialog → enable → fix resolves.
5. No fix / timeout → red error banner + Retry; Retry re-runs.
6. Resolve via search and via recent → serviceable, sheet closes.
7. Background → enable GPS in Settings → foreground → auto-detect.
8. Rapid double-tap Use current → only one `[LOC] detectCurrentLocation: start` / one find-by-location (in-flight dedupe).

- [ ] **Step 3: Confirm no console `[LOC]` spam in a production build (optional)**

Logs are `__DEV__`-gated, so they appear in dev only. No action needed unless they leak into a release build.

---

## Self-Review Notes

- **Spec coverage:** single source of truth + thin VM (Task 2/3); orchestrator with `_inflight`/`_seq` race guards (Task 2); service robustness + dev logs + 20s timeout + `hasServicesEnabled` (Task 1); single AppState lifecycle listener with return-from-Settings / GPS-enabled auto-detect (Task 4); error + blocked sheet states with Retry and manual fallback, no pincode (Task 5); simplified Home bootstrap + derived sheet visibility (Task 6); auto-detect-once preserved via `autoDetectedRef` (Task 6). Permanently-denied manual fallback (Task 5). All spec sections mapped.
- **Type consistency:** store exposes `detectCurrentLocation`, `searchLocation`, `selectAddress`, `selectRecent`, `refreshPermission`, `permission: PermissionState`, `blocked: boolean`, `lastError: LocationErrorKind | null`. The thin VM re-exposes exactly the fields the views consume. `LocationService.hasServicesEnabled` (Task 1) is consumed by the lifecycle hook (Task 4). `runDetect`/`resolveCoords` use the `SetState`/`GetState` aliases defined in Task 2.
- **No placeholders.**
- **Pre-existing behavior preserved:** HomeScreen's `village`-resolves-closes-sheet effect, `dismissable={!!village}`, and `autoDetectedRef` (added earlier this session) are untouched by Task 6 except the detection source swap.
