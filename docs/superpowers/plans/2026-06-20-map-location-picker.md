# Google Maps Location Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen Google Maps location picker where the user moves the map under a fixed center pin to choose a delivery location, resolved to a serviceable village in real time, then confirms.

**Architecture:** A new route `app/location/map.tsx` renders `MapPickerScreen`. A dedicated `useMapPickerViewModel` hook owns ephemeral picker state (camera region, address labels, resolve status) and orchestration (GPS, debounced serviceability resolve, stale-response guard). It reuses `LocationService` (GPS/permission) and `findByLocation` (serviceability + address labels). State commits to the global `useLocationStore` only on Confirm. Presentational components render VM state.

**Tech Stack:** Expo SDK 55, React Native 0.83, expo-router, `react-native-maps` (Google provider), NativeWind (`className`), `lucide-react-native`, Zustand store, `useTranslation`.

---

## Important conventions (read first)

- **No test runner exists** in this repo (no `test` script, no jest). Automated verification per task = `npx tsc --noEmit` (type check) and `npm run lint`. Behavioural verification = manual checks on a dev client, described explicitly per task.
- **Styling:** NativeWind `className` strings (Tailwind). Icons from `lucide-react-native`. Strings via `useTranslation().t('key')` with keys added to `src/base/constants/translations.ts` (both `te` and `en`).
- **`react-native-maps` requires a custom dev client** — it does NOT run in Expo Go. Task 1 sets this up; later tasks assume the dev client is installed on a simulator/device.
- **Commit after every task.** Branch is already `feat/address-location-flow`.

---

## File structure

| File | Responsibility |
|---|---|
| `app.config.ts` (create) | Inject Google Maps API keys from env into the Expo config. |
| `.env` (create, gitignored) | Holds `GOOGLE_MAPS_API_KEY` locally. |
| `src/base/constants/translations.ts` (modify) | New i18n keys for the picker. |
| `src/features/location/data/mappers.ts` (modify) | `mapVillage` also extracts an optional secondary label. |
| `src/features/location/viewmodel/useMapPickerViewModel.ts` (create) | Ephemeral picker state + orchestration. |
| `src/features/location/views/components/MapPinMarker.tsx` (create) | Fixed center pin overlay. |
| `src/features/location/views/components/PinTooltip.tsx` (create) | Dark tooltip bubble above the pin. |
| `src/features/location/views/components/LocationInfoSheet.tsx` (create) | Bottom sheet with labels + CTA, all states. |
| `src/features/location/views/MapPickerScreen.tsx` (create) | Screen shell: MapView + overlays + sheet + pill. |
| `app/location/map.tsx` (create) | Route for the picker. |
| `src/features/location/views/SelectLocationScreen.tsx` (modify) | Add "Set location on map" entry. |

---

## Task 1: Native setup — react-native-maps + Google Maps keys

**Files:**
- Create: `app.config.ts`
- Create: `.env`
- Modify: `.gitignore`
- Modify: `package.json` (via installer)

- [ ] **Step 1: Install react-native-maps**

Run:
```bash
npx expo install react-native-maps
```
Expected: `react-native-maps` added to `package.json` dependencies, no peer-dep errors.

- [ ] **Step 2: Create `.env` with the Maps key**

Create `.env` (repo root):
```
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```
(Use the real key value the user provided — do NOT commit the real key anywhere, including this plan.)

- [ ] **Step 3: Gitignore the env file**

Confirm `.env` is ignored. Run:
```bash
grep -qxF '.env' .gitignore || printf '\n# local env\n.env\n' >> .gitignore
git check-ignore .env
```
Expected: prints `.env` (it is ignored).

- [ ] **Step 4: Create `app.config.ts` that injects the keys**

The existing static `app.json` stays as the base. `app.config.ts` reads it and adds the Google Maps keys from env. Expo CLI auto-loads `.env` into `process.env` when evaluating the config.

Create `app.config.ts`:
```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: GOOGLE_MAPS_API_KEY },
    },
  },
});
```

- [ ] **Step 5: Verify the config resolves the key**

Run:
```bash
npx expo config --type public --json | grep -i googleMapsApiKey
```
Expected: the iOS `googleMapsApiKey` field shows the key value (proves `.env` → config wiring works). If it is empty, the `.env` isn't being loaded — stop and fix before continuing.

- [ ] **Step 6: Prebuild + build the dev client**

Run:
```bash
npx expo prebuild --clean
npx expo run:ios   # or: npx expo run:android
```
Expected: the app builds and launches on simulator/device. (This is the dev client `react-native-maps` needs.)

- [ ] **Step 7: Commit**

```bash
git add app.config.ts .gitignore package.json package-lock.json
git commit -m "chore(location): add react-native-maps + env-driven Google Maps keys"
```
Note: `.env` is intentionally NOT committed.

---

## Task 2: Translation keys + secondary label in `mapVillage`

**Files:**
- Modify: `src/base/constants/translations.ts`
- Modify: `src/features/location/data/mappers.ts`
- Modify: `src/features/location/domain/models.ts`

- [ ] **Step 1: Add the picker translation keys**

In `src/base/constants/translations.ts`, add these entries inside the `TRANSLATIONS` object (place them near the existing location keys around line 146):
```ts
  location_information:    { te: 'లొకేషన్ సమాచారం',                  en: 'Location Information' },
  delivered_here_title:    { te: 'ఆర్డర్ ఇక్కడ డెలివరీ అవుతుంది',    en: 'Order will be delivered here' },
  delivered_here_sub:      { te: 'పిన్‌ను మీ ఖచ్చితమైన లొకేషన్‌లో ఉంచండి', en: 'Place the pin to your exact location' },
  confirm_continue:        { te: 'నిర్ధారించి కొనసాగించు',           en: 'Confirm & Continue' },
  locating_ellipsis:       { te: 'గుర్తిస్తోంది…',                   en: 'Locating…' },
  set_location_on_map:     { te: 'మ్యాప్‌లో లొకేషన్ ఎంచుకోండి',       en: 'Set location on map' },
  cant_check_area:         { te: 'ఈ ప్రాంతాన్ని తనిఖీ చేయలేకపోయాం',  en: "Couldn't check this area" },
  retry:                   { te: 'మళ్లీ ప్రయత్నించండి',             en: 'Retry' },
  map_not_serviceable_title: { te: 'మేము ఇంకా ఇక్కడ డెలివరీ చేయట్లేదు', en: "We don't deliver here yet" },
  map_not_serviceable_sub:   { te: 'సమీపంలోని సర్వీస్ ఉన్న ప్రాంతానికి మ్యాప్‌ను జరపండి', en: 'Move the map to a nearby serviceable area.' },
  couldnt_get_location:    { te: 'లొకేషన్ పొందలేకపోయాం',            en: "Couldn't get location" },
```

- [ ] **Step 2: Add `secondaryName` to the Village model**

In `src/features/location/domain/models.ts`, add a field to the `Village` interface (after `name`):
```ts
export interface Village {
  id: string;
  name: string;
  secondaryName?: string; // optional finer label (locality/mandal/district) from backend
  pincode?: string;
  latitude?: number;
  longitude?: number;
  storeId?: string; // x-store-id for the dynamic home page-layout API
}
```

- [ ] **Step 3: Extract the secondary label in `mapVillage`**

In `src/features/location/data/mappers.ts`, inside `mapVillage`, after the `name` line and before the `return`, add:
```ts
  const secondaryName = pick(node, ['subtitle', 'locality', 'mandal', 'district', 'area']);
```
Then add to the returned object (after `name: ...`):
```ts
    secondaryName: secondaryName ? String(secondaryName) : undefined,
```

- [ ] **Step 4: Type check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/base/constants/translations.ts src/features/location/data/mappers.ts src/features/location/domain/models.ts
git commit -m "feat(location): picker i18n keys + optional secondary village label"
```

---

## Task 3: `useMapPickerViewModel` hook

**Files:**
- Create: `src/features/location/viewmodel/useMapPickerViewModel.ts`

Reuses: `LocationService` (`getPermissionState`, `requestPermission`, `getCurrentPosition`), `findByLocation`, `useLocationStore` (`setServiceable`, `addRecent`, `serviceableVillage`, `permission`, `blocked`).

- [ ] **Step 1: Create the hook**

Create `src/features/location/viewmodel/useMapPickerViewModel.ts`:
```ts
// src/features/location/viewmodel/useMapPickerViewModel.ts
//
// Ephemeral state + orchestration for the full-screen map picker. Owns the
// camera region, resolved address labels and resolve status. Calls
// findByLocation (debounced) on every camera settle, guards against stale
// responses with a sequence token, and commits to useLocationStore only on
// Confirm. Camera churn stays out of the global store by design.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import type { Region } from 'react-native-maps';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService } from '../data/LocationService';
import { findByLocation } from '../data/locationApi';
import { LatLng, Village } from '../domain/models';

export type PinState = 'resolving' | 'serviceable' | 'not_serviceable' | 'error';

const DEBOUNCE_MS = 450;
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
// Fallback region used when there is no prior village and no GPS fix.
const DEFAULT_REGION: Region = { latitude: 13.6288, longitude: 79.4192, ...DEFAULT_DELTA };

function regionFor(coords: LatLng): Region {
  return { latitude: coords.latitude, longitude: coords.longitude, ...DEFAULT_DELTA };
}

export function useMapPickerViewModel() {
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const addRecent = useLocationStore((s) => s.addRecent);
  const savedVillage = useLocationStore((s) => s.serviceableVillage);

  const [region, setRegion] = useState<Region | null>(null);
  const [pinState, setPinState] = useState<PinState>('resolving');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState<string | null>(null);
  const [village, setVillage] = useState<Village | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const seq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  // Resolve coords → serviceability. Drops its result if a newer settle started.
  const resolve = useCallback(async (coords: LatLng) => {
    const token = ++seq.current;
    setPinState('resolving');
    try {
      const result = await findByLocation(coords);
      if (token !== seq.current || !mounted.current) return;
      if (result.serviceable && result.village) {
        setVillage(result.village);
        setPrimary(result.village.name);
        setSecondary(result.village.secondaryName ?? null);
        setPinState('serviceable');
      } else {
        setVillage(null);
        setPinState('not_serviceable');
      }
    } catch {
      if (token !== seq.current || !mounted.current) return;
      setVillage(null);
      setPinState('error');
    }
  }, []);

  // Called on every onRegionChangeComplete. Debounced so rapid pans coalesce.
  const onRegionSettled = useCallback((next: Region) => {
    setRegion(next);
    setPinState('resolving');
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void resolve({ latitude: next.latitude, longitude: next.longitude });
    }, DEBOUNCE_MS);
  }, [resolve]);

  // Initial camera: auto-detect GPS, fall back to saved village, then default.
  const initialDetect = useCallback(async () => {
    setDetectingGps(true);
    try {
      const perm = await LocationService.getPermissionState();
      if (perm !== 'granted') {
        const res = await LocationService.requestPermission();
        if (!res.granted) {
          if (!mounted.current) return;
          setBlocked(!res.canAskAgain);
          fallbackRegion();
          return;
        }
      }
      const fix = await LocationService.getCurrentPosition();
      if (!mounted.current) return;
      setRegion(regionFor(fix));
      void resolve(fix);
    } catch {
      if (!mounted.current) return;
      fallbackRegion();
    } finally {
      if (mounted.current) setDetectingGps(false);
    }
  }, [resolve]);

  const fallbackRegion = useCallback(() => {
    if (savedVillage?.latitude != null && savedVillage?.longitude != null) {
      const coords = { latitude: savedVillage.latitude, longitude: savedVillage.longitude };
      setRegion(regionFor(coords));
      void resolve(coords);
    } else {
      setRegion(DEFAULT_REGION);
      void resolve({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
    }
  }, [resolve, savedVillage]);

  // "Use my current location" pill. Returns the GPS region so the screen can
  // animate the camera to it; the resulting settle drives the resolve path.
  const useCurrentLocation = useCallback(async (): Promise<Region | null> => {
    setDetectingGps(true);
    try {
      const perm = await LocationService.getPermissionState();
      if (perm !== 'granted') {
        const res = await LocationService.requestPermission();
        if (!res.granted) {
          if (mounted.current) setBlocked(!res.canAskAgain);
          return null;
        }
      }
      const fix = await LocationService.getCurrentPosition();
      if (!mounted.current) return null;
      return regionFor(fix);
    } catch {
      return null;
    } finally {
      if (mounted.current) setDetectingGps(false);
    }
  }, []);

  // Re-run resolve for the current center (error-state Retry).
  const retry = useCallback(() => {
    if (region) void resolve({ latitude: region.latitude, longitude: region.longitude });
  }, [region, resolve]);

  // Commit the confirmed serviceable village to the global store.
  const confirm = useCallback(async (): Promise<boolean> => {
    if (pinState !== 'serviceable' || !village || !region) return false;
    const lat = region.latitude;
    const lng = region.longitude;
    await setServiceable({ ...village, latitude: lat, longitude: lng });
    if (village.storeId) {
      await addRecent({
        storeId: village.storeId,
        villageName: village.name,
        latitude: lat,
        longitude: lng,
        label: village.name,
        savedAt: Date.now(),
      });
    }
    return true;
  }, [pinState, village, region, setServiceable, addRecent]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlocked(false), []);

  return {
    region,
    pinState,
    primary,
    secondary,
    detectingGps,
    blocked,
    initialDetect,
    onRegionSettled,
    useCurrentLocation,
    retry,
    confirm,
    openSettings,
    dismissBlocked,
  };
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors. (If `react-native-maps` types aren't found, Task 1 install is incomplete — fix before continuing.)

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useMapPickerViewModel.ts
git commit -m "feat(location): useMapPickerViewModel — debounced resolve + confirm commit"
```

---

## Task 4: Presentational components (pin, tooltip, sheet)

**Files:**
- Create: `src/features/location/views/components/MapPinMarker.tsx`
- Create: `src/features/location/views/components/PinTooltip.tsx`
- Create: `src/features/location/views/components/LocationInfoSheet.tsx`

- [ ] **Step 1: Create `PinTooltip`**

Create `src/features/location/views/components/PinTooltip.tsx`:
```tsx
// src/features/location/views/components/PinTooltip.tsx
//
// Dark floating bubble shown above the fixed center pin. Pure presentational.

import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const PinTooltip = () => {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="bg-slate-900 rounded-2xl px-4 py-2.5 max-w-[260px]">
        <Text className="text-white font-extrabold text-[14px] text-center">
          {t('delivered_here_title')}
        </Text>
        <Text className="text-slate-300 text-[12px] text-center mt-0.5">
          {t('delivered_here_sub')}
        </Text>
      </View>
      {/* tail */}
      <View className="w-3 h-3 bg-slate-900 rotate-45 -mt-1.5" />
    </View>
  );
};
```

- [ ] **Step 2: Create `MapPinMarker`**

Create `src/features/location/views/components/MapPinMarker.tsx`:
```tsx
// src/features/location/views/components/MapPinMarker.tsx
//
// Fixed center pin rendered as an absolute overlay (NOT a map Marker), so the
// map moves underneath it. Includes the tooltip above and a shadow ellipse.

import React from 'react';
import { View } from 'react-native';
import { PinTooltip } from './PinTooltip';

export const MapPinMarker = () => (
  <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
    {/* tooltip + pin stacked; nudged up so the pin tip sits at exact center */}
    <View className="items-center -mt-[64px]">
      <PinTooltip />
      <View className="items-center mt-2">
        <View className="w-[18px] h-[18px] rounded-full bg-rose-600" />
        <View className="w-[3px] h-[22px] bg-rose-600" />
        <View className="w-[22px] h-[6px] rounded-full bg-purple-500/40 -mt-0.5" />
      </View>
    </View>
  </View>
);
```

- [ ] **Step 3: Create `LocationInfoSheet`**

Create `src/features/location/views/components/LocationInfoSheet.tsx`:
```tsx
// src/features/location/views/components/LocationInfoSheet.tsx
//
// Bottom sheet for the map picker. Renders primary/secondary labels and the
// sticky CTA, switching copy + enabled-state by PinState.

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { PinState } from '../../viewmodel/useMapPickerViewModel';

interface Props {
  pinState: PinState;
  primary: string;
  secondary: string | null;
  onConfirm: () => void;
  onRetry: () => void;
}

export const LocationInfoSheet = ({ pinState, primary, secondary, onConfirm, onRetry }: Props) => {
  const { t } = useTranslation();
  const canConfirm = pinState === 'serviceable';

  return (
    <View
      className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl px-5 pt-5 pb-8"
      style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 }}
    >
      {pinState === 'resolving' ? (
        <>
          <View className="h-6 w-40 bg-slate-100 rounded-md" />
          <View className="h-4 w-24 bg-slate-50 rounded-md mt-2.5" />
        </>
      ) : pinState === 'serviceable' ? (
        <>
          <Text className="text-slate-900 font-extrabold text-xl" numberOfLines={1}>{primary}</Text>
          {secondary ? <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>{secondary}</Text> : null}
        </>
      ) : pinState === 'not_serviceable' ? (
        <>
          <Text className="text-slate-900 font-extrabold text-[17px]">{t('map_not_serviceable_title')}</Text>
          <Text className="text-slate-400 text-[13px] mt-1">{t('map_not_serviceable_sub')}</Text>
        </>
      ) : (
        <>
          <Text className="text-slate-900 font-extrabold text-[17px]">{t('cant_check_area')}</Text>
          <TouchableOpacity onPress={onRetry} className="mt-2">
            <Text className="text-rose-600 font-extrabold text-[14px]">{t('retry')}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={onConfirm}
        disabled={!canConfirm}
        activeOpacity={0.85}
        className={`mt-4 rounded-2xl py-4 items-center justify-center flex-row gap-2 ${canConfirm ? 'bg-rose-600' : 'bg-slate-200'}`}
      >
        {pinState === 'resolving' ? <ActivityIndicator size="small" color="#94a3b8" /> : null}
        <Text className={`font-extrabold text-[15px] ${canConfirm ? 'text-white' : 'text-slate-400'}`}>
          {pinState === 'resolving' ? t('locating_ellipsis') : t('confirm_continue')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 4: Type check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/location/views/components/MapPinMarker.tsx src/features/location/views/components/PinTooltip.tsx src/features/location/views/components/LocationInfoSheet.tsx
git commit -m "feat(location): map picker presentational components"
```

---

## Task 5: `MapPickerScreen`

**Files:**
- Create: `src/features/location/views/MapPickerScreen.tsx`

Uses: `useMapPickerViewModel`, `MapPinMarker`, `LocationInfoSheet`, existing `PermissionDeniedSheet` (props: `visible`, `onClose`, `onGoToSettings`), `react-native-maps` `MapView` + `PROVIDER_GOOGLE`.

- [ ] **Step 1: Create the screen**

Create `src/features/location/views/MapPickerScreen.tsx`:
```tsx
// src/features/location/views/MapPickerScreen.tsx
//
// Full-screen Google Maps location picker. The map moves under a fixed center
// pin; every settle resolves to a serviceable village via the view model.

import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ArrowLeft, LocateFixed } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useMapPickerViewModel } from '../viewmodel/useMapPickerViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { LocationInfoSheet } from './components/LocationInfoSheet';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

export const MapPickerScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useMapPickerViewModel();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    void vm.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the VM produces a region (GPS or fallback), point the camera at it.
  useEffect(() => {
    if (vm.region && mapRef.current) {
      mapRef.current.animateToRegion(vm.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.region?.latitude, vm.region?.longitude]);

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(dashboard)/home' as any);
  };

  const onConfirm = async () => {
    if (await vm.confirm()) router.replace('/(dashboard)/home' as any);
  };

  const onUseCurrent = async () => {
    const region = await vm.useCurrentLocation();
    if (region && mapRef.current) mapRef.current.animateToRegion(region, 350);
  };

  const initialRegion: Region = vm.region ?? {
    latitude: 13.6288,
    longitude: 79.4192,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View className="flex-1 bg-slate-100">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChangeComplete={vm.onRegionSettled}
        showsMyLocationButton={false}
        showsUserLocation
      />

      {/* Fixed center pin overlay */}
      <MapPinMarker />

      {/* Header */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="bg-white/95 flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity onPress={goHome} hitSlop={8} className="w-9 h-9 -ml-1 rounded-full items-center justify-center">
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-bold text-lg">{t('location_information')}</Text>
        </View>
      </SafeAreaView>

      {/* Use current location pill */}
      <TouchableOpacity
        onPress={onUseCurrent}
        activeOpacity={0.85}
        className="absolute right-4 bottom-48 bg-white rounded-full px-4 py-2.5 flex-row items-center gap-2"
        style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
      >
        <LocateFixed size={16} color="#16a34a" />
        <Text className="text-slate-900 font-bold text-[12px]">{t('use_current_location')}</Text>
      </TouchableOpacity>

      <LocationInfoSheet
        pinState={vm.pinState}
        primary={vm.primary}
        secondary={vm.secondary}
        onConfirm={onConfirm}
        onRetry={vm.retry}
      />

      <PermissionDeniedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </View>
  );
};
```

- [ ] **Step 2: Verify `PermissionDeniedSheet` prop names match**

Run:
```bash
grep -n "interface Props\|visible\|onClose\|onGoToSettings" src/features/location/views/components/PermissionDeniedSheet.tsx
```
Expected: confirms `visible`, `onClose`, `onGoToSettings` exist. If the names differ, update the `<PermissionDeniedSheet .../>` usage above to match.

- [ ] **Step 3: Type check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no type errors; lint passes (warnings acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/features/location/views/MapPickerScreen.tsx
git commit -m "feat(location): MapPickerScreen with Google MapView + fixed pin"
```

---

## Task 6: Route + entry from SelectLocationScreen

**Files:**
- Create: `app/location/map.tsx`
- Modify: `src/features/location/views/SelectLocationScreen.tsx`

- [ ] **Step 1: Create the route**

Create `app/location/map.tsx`:
```tsx
// app/location/map.tsx

import { MapPickerScreen } from '@/src/features/location/views/MapPickerScreen';

export default function LocationMapRoute() {
  return <MapPickerScreen />;
}
```

- [ ] **Step 2: Add the "Set location on map" entry**

In `src/features/location/views/SelectLocationScreen.tsx`, add `MapPin` is already imported. Insert a new entry button directly below the `UseCurrentLocationRow` (after its closing `/>` near line 65):
```tsx
          {/* Set location on map */}
          <TouchableOpacity
            onPress={() => router.push('/location/map' as any)}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 mt-3"
          >
            <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center">
              <MapPin size={18} color="#e11d48" />
            </View>
            <Text className="flex-1 text-slate-900 font-extrabold text-[14px]">
              {t('set_location_on_map')}
            </Text>
          </TouchableOpacity>
```

- [ ] **Step 3: Type check + lint**

Run:
```bash
npx tsc --noEmit && npm run lint
```
Expected: no type errors; lint passes.

- [ ] **Step 4: Commit**

```bash
git add app/location/map.tsx src/features/location/views/SelectLocationScreen.tsx
git commit -m "feat(location): map picker route + entry from select-location"
```

---

## Task 7: End-to-end manual verification

No automated runner exists, so verify behaviour on the dev client built in Task 1.

**Files:** none (verification only).

- [ ] **Step 1: Launch and open the picker**

Run the dev client (`npx expo run:ios` or `run:android` if not already running). Navigate: open the location flow → tap **Set location on map**.
Expected: map renders with Google tiles, fixed center pin + tooltip, bottom sheet, current-location pill.

- [ ] **Step 2: Pan → resolve**

Drag the map. Expected: sheet shows skeleton + "Locating…" while panning; ~450ms after release it shows the village name (and secondary line if backend returns one), CTA turns red/enabled.

- [ ] **Step 3: Not-serviceable area**

Pan far outside the service area. Expected: sheet shows "We don't deliver here yet"; **Confirm & Continue** greyed/disabled.

- [ ] **Step 4: Use current location**

Tap the pill. Expected: permission prompt if not granted; on grant, camera animates to the GPS fix and the sheet resolves for that point.

- [ ] **Step 5: Permission denied / blocked**

Deny permission (or set "Don't ask again" / Settings → deny). Expected: no crash; on permanent denial the `PermissionDeniedSheet` appears with a Settings action. Map still pannable using the fallback region.

- [ ] **Step 6: Network error + retry**

Enable airplane mode, then pan to force a `findByLocation` failure. Expected: sheet shows "Couldn't check this area" + **Retry**. Disable airplane mode, tap Retry → resolves.

- [ ] **Step 7: Confirm**

On a serviceable spot, tap **Confirm & Continue**. Expected: navigates to home; the home/cart "delivering to" reflects the chosen village (store updated via `setServiceable`), and the spot appears in recents.

- [ ] **Step 8: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "fix(location): map picker verification fixes"
```
(Skip if no changes were needed.)

---

## Notes for the implementer

- **Default region** (`13.6288, 79.4192`) is a placeholder centroid; adjust to your actual service-area center if known. It only matters when there is no saved village and no GPS fix.
- **Pin centering:** `MapPinMarker` nudges the stack up (`-mt-[64px]`) so the pin tip — not the tooltip — sits at the true map center (which is what `onRegionChangeComplete` reports). Verify visually in Step 1 and adjust the offset if the tip is off-center.
- **`react-native-maps` is dev-client only** — none of this renders in Expo Go.
