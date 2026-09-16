# Location Flow Rebuild — Design

**Date:** 2026-06-20
**Status:** Approved (pending spec review)

## Problem

The location flow is spread across 4 independent `useLocationViewModel`
instances (HomeScreen, SelectLocationScreen, LocationPermissionSheet,
LocationSheet). Each holds its own `permission` and `blocked` React state and
registers its own `AppState` foreground listener. `detectCurrentLocation` has no
concurrency guard. Consequences:

- Permission/blocked state desyncs between the home gate and the sheet.
- Up to 4 duplicate foreground listeners run at once.
- Concurrent detect calls (focus effect + manual tap + retry) race, and stale
  `findByLocation` results can overwrite newer ones.
- Edge cases (GPS off, permanently denied, return-from-Settings, fix
  timeout/failure) are handled inconsistently, producing stuck "Finding your
  location" gates.

## Goal

Rebuild the flow around a single source of truth (the zustand
`useLocationStore`) with one guarded orchestrator and one lifecycle listener,
covering every permission / GPS / lifecycle edge case with Zepto/Blinkit-style
UX. Manual fallback (search + saved + recent) is always available, including
when permission is permanently blocked.

## Product Decisions

1. **Permanently denied ("Don't ask again") → manual fallback allowed.** Show an
   "Open Settings" CTA, but the user can still proceed via location search, a
   saved address, or a recent location. GPS is not mandatory.
2. **Auto-detect once.** On launch with permission granted and no saved village,
   silently attempt GPS once; on success unlock, on failure open the sheet with
   an error + retry. Do not silently re-fire on every foreground (except the
   explicit return-from-Settings / GPS-just-enabled transitions below).
3. **Fail/timeout = Zepto/Blinkit style.** The bottom sheet stays open and
   non-dismissable while no village is set; it shows an inline "Couldn't get your
   location" banner with a Retry button plus the manual options.
4. **No pincode entry in the sheet.** Manual fallback is search + saved + recent
   only. (The separate full-screen `NotServiceableView` keeps its own
   "use another pincode" action — out of scope here.)

## Architecture

All location state and orchestration live in `useLocationStore`.
`useLocationViewModel` becomes a thin selector/adapter that exposes the same
return shape the views already consume (no local state, no listeners), so the
view files need minimal change. A single `useLocationLifecycle` hook, mounted
once in the root layout, owns the only `AppState` listener.

### Store state (additions in **bold**)

```
status              idle | locating | checking | serviceable | not_serviceable | error
permission          undetermined | granted | denied | blocked     // blocked = "Don't ask again"  (NEW)
detecting           boolean        // in-flight guard                                            (NEW)
lastError           null | no_fix | timeout | network                                            (NEW)
serviceableVillage  Village | null
recentLocations     RecentLocation[]
savedAddresses      Address[]
hydrated            boolean
```

Plus two non-rendered internals held on the store object (not in `set`):
`_inflight: Promise<boolean> | null` and `_seq: number` (stale-result token).

### Store actions

```
detectCurrentLocation(): Promise<boolean>     // THE orchestrator (below)
refreshPermission(): Promise<PermissionState> // re-read OS permission → store
searchLocation(query): Promise<boolean>
selectAddress(address): Promise<boolean>
selectRecent(recent): Promise<void>
setServiceable, setNotServiceable, clearLocation, addRecent, setSavedAddresses, hydrate  (existing)
```

`searchLocation` / `selectAddress` route through the same internal
`resolveCoords(coords, label)` used by `detectCurrentLocation`.

## Orchestrator: `detectCurrentLocation`

```
detectCurrentLocation():
  if (_inflight) return _inflight              // dedupe concurrent callers
  _inflight = run()
  try { return await _inflight } finally { _inflight = null }

run():
  const seq = ++_seq
  set({ status: 'locating', detecting: true, lastError: null })

  // 1. Permission
  let perm = await LocationService.getPermissionState()
  if (perm !== 'granted') {
    const res = await LocationService.requestPermission()
    perm = res.granted ? 'granted' : (res.canAskAgain ? 'denied' : 'blocked')
    set({ permission: perm })
    if (!res.granted) { set({ status: 'idle', detecting: false }); return false }
  } else {
    set({ permission: 'granted' })
  }

  // 2. GPS fix
  let coords
  try {
    coords = await LocationService.getCurrentPosition()
  } catch (e) {
    const lastError = e?.message === 'LOCATION_TIMEOUT' ? 'timeout' : 'no_fix'
    set({ status: 'error', lastError, detecting: false })
    return false
  }

  // 3. Serviceability
  set({ status: 'checking' })
  return await resolveCoords(coords)   // sets serviceable/not_serviceable/error; clears detecting

resolveCoords(coords, label?):
  try {
    const result = await findByLocation(coords)
    if (seqStale()) return false                       // a newer detect won; drop result
    if (result.serviceable && result.village) {
      await setServiceable(result.village)
      if (village.storeId) await addRecent(...)
      set({ status: 'serviceable', detecting: false, lastError: null })
      return true
    }
    set({ status: 'not_serviceable', detecting: false })
    return false
  } catch {
    if (seqStale()) return false
    set({ status: 'error', lastError: 'network', detecting: false })
    return false
  }
```

`seqStale()` = the captured `seq !== get()._seq`. `searchLocation` and
`selectAddress` bump `_seq`, set `status: 'checking'`, and call `resolveCoords`
directly (no GPS step). `selectRecent` is instant (no find-by-location).

## Service layer (`LocationService`)

Keep the current robust `getCurrentPosition`:

1. `hasServicesEnabledAsync()` (diagnostic).
2. Fast path: `getLastKnownPositionAsync({ maxAge: 5min })` → return if present.
3. `enableNetworkProviderAsync()` (Android: shows the system enable-location
   dialog and resolves once enabled; throws/no-op on iOS — caught and ignored).
4. `getCurrentPositionAsync({ accuracy: Balanced })` one-shot, wrapped in a 20s
   timeout (`firstFix`). One-shot reads the CURRENT location, so a static fix
   (e.g. emulator-set) returns immediately; a watch would never emit for a
   non-moving fix.
5. On failure, last-resort `getLastKnownPositionAsync()`; else throw (timeout →
   `LOCATION_TIMEOUT`).

`[LOC]` console logs are wrapped in `if (__DEV__)` so they don't run in
production. `FIX_TIMEOUT_MS = 20000`.

`getPermissionState` maps to `granted | denied | undetermined`; the
permanently-denied distinction comes from `requestPermission().canAskAgain` and
is recorded by the orchestrator as `blocked`.

## Lifecycle: `useLocationLifecycle` (mounted once in root `_layout`)

Single `AppState` listener. On `background → active`:

```
const prev = get().permission
const perm = await refreshPermission()        // re-read + store
const { serviceableVillage } = get()
if (serviceableVillage) return                 // already set, nothing to do
if ((prev === 'blocked' || prev === 'denied') && perm === 'granted') {
  void detectCurrentLocation()                 // returned from Settings with permission
} else if (perm === 'granted' && await LocationService.hasServicesEnabledAsync()) {
  void detectCurrentLocation()                 // returned after enabling GPS
}
```

Guarded by the orchestrator's `_inflight`, so it can never double-fire with a
concurrent detect.

## Home bootstrap + sheet visibility

`HomeScreen`:

- `useFocusEffect`: if `hydrated && !village && status === 'idle'`, auto-detect
  **once** per session (a `autoDetectedRef`). If permission is not granted, open
  the sheet instead.
- Sheet `visible` derived: `hydrated && !village && status !== 'not_serviceable'`.
- `dismissable={!!village}` — non-dismissable while no village.
- `village` resolves → effect closes the sheet; `not_serviceable` → full-screen
  `NotServiceableView`.

## Edge case → UI matrix (LocationPermissionSheet)

| State | Sheet content |
|---|---|
| undetermined / denied | "Use my current location" row + Search + Saved + Recent |
| locating / checking | "Use my current location" row spinner |
| error (timeout / no_fix / network) | inline "Couldn't get your location" banner + **Retry** + Search + Saved + Recent |
| blocked | "Location access blocked — Open Settings" CTA + Search + Saved + Recent |
| not_serviceable | sheet closes → full-screen `NotServiceableView` |
| serviceable | sheet auto-closes → home feed |

No pincode entry anywhere in the sheet.

## Race / duplicate-call handling

- `_inflight` promise dedupes concurrent `detectCurrentLocation` callers (focus
  effect + sheet tap + lifecycle + retry all share one run).
- `_seq` token discards stale `findByLocation` results when a newer
  detect/search/select started.
- Single `AppState` listener (was up to 4).
- `useLocationViewModel` holds no state, so no cross-instance desync.

## Files

- `src/core/store/useLocationStore.ts` — add `permission`, `detecting`,
  `lastError`, `_inflight`, `_seq`; add `detectCurrentLocation`,
  `refreshPermission`, `searchLocation`, `selectAddress`, `selectRecent`,
  internal `resolveCoords`.
- `src/features/location/viewmodel/useLocationViewModel.ts` — gut to a thin
  selector exposing the **exact existing return shape** so consumer views need no
  changes beyond the sheet: `status`, `village`, `permission`,
  `blocked` (= `permission === 'blocked'`), `recentLocations`, `detecting`,
  `lastError` (new), `detectCurrentLocation`, `searchLocation`, `selectAddress`,
  `selectRecent`, `openSettings` (`Linking.openSettings`), `dismissBlocked`,
  `retry` (re-run `detectCurrentLocation`). No `useState` for permission/blocked,
  no `AppState` listener (moved to `useLocationLifecycle`). `dismissBlocked` may
  keep a small local "dismissed" flag for the `PermissionDeniedSheet` close UX.
- `src/features/location/data/LocationService.ts` — keep robust impl; gate
  `[LOC]` logs behind `__DEV__`; `FIX_TIMEOUT_MS = 20000`.
- `src/features/location/lifecycle/useLocationLifecycle.ts` — **new**; single
  `AppState` listener; called once in the root layout.
- `app/_layout.tsx` (root layout) — call `useLocationLifecycle()` once.
- `src/features/location/views/LocationPermissionSheet.tsx` — add error + blocked
  states, Retry, inline error banner; remove any pincode UI; keep search/saved/recent.
- `src/features/home/views/home/HomeScreen.tsx` — simplify bootstrap to the
  orchestrator + derived sheet visibility.

## Out of Scope

- The emulator/device producing **no** GPS fix at all (no location set) — that
  is an environment condition. The rebuild converts it from an infinite spinner
  into a clean error + Retry + manual search.
- Changes to `NotServiceableView` (keeps its own pincode action).
- Address create/edit (`useAddressBookViewModel`) beyond reading saved addresses.

## Testing

No automated test framework in this repo. Verification = `npx tsc --noEmit`
clean + manual matrix walk:

1. Fresh install, permission undetermined → sheet, tap Use current → OS prompt →
   grant → GPS fix → serviceable → sheet closes.
2. Deny once → sheet stays, error/idle, manual options work.
3. Deny permanently → blocked CTA + manual options; go Settings, enable, return →
   auto-detect fires once.
4. GPS off → tap Use current → enable dialog → enable → fix resolves.
5. No fix / timeout → error banner + Retry; Retry re-runs.
6. Resolve via search and via recent → serviceable, sheet closes.
7. Background→foreground after enabling GPS in Settings → auto-detect.
8. Rapid double-tap Use current → single in-flight detect (no duplicate
   find-by-location).
