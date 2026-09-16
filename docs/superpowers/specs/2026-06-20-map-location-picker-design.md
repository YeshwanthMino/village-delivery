1# Google Maps Location Picker — Design

**Date:** 2026-06-20
**Branch:** feat/address-location-flow
**Status:** Approved for planning

## Goal

Add a full-screen, Zepto/Blinkit-style delivery-location picker built on Google Maps. The user selects a location by moving the map underneath a fixed center pin; the app resolves the pinned coordinates to a serviceable village in real time and lets the user confirm. Confirming saves the coordinates and village to the existing location store and returns the user to home.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Map library | `react-native-maps` with `provider={PROVIDER_GOOGLE}` (Google Maps on both platforms) |
| Address source | Backend only — `findByLocation(coords)` provides the labels. No client-side reverse geocoding, no Google Geocoding API. |
| Navigation | New route `app/location/map.tsx`, reached from `SelectLocationScreen`. Confirm → set serviceable village in store → home. |
| Not-serviceable behavior | Disable Confirm + show inline "We don't deliver here yet" copy in the sheet. |
| Initial camera | Auto-detect GPS on open (request permission + fetch fix + center). Fall back to last serviceable village → default region on failure. |
| State architecture | Dedicated `useMapPickerViewModel` hook owns ephemeral picker state; commit to `useLocationStore` only on Confirm. |

## Architecture

The picker follows the repo's existing view / view-model / store separation.

- **Global store (`useLocationStore`)** remains the source of truth for *persisted* serviceable location and recents. The picker writes to it only on Confirm (`setServiceable`, `addRecent`).
- **`useMapPickerViewModel`** owns *ephemeral* screen state — camera region, resolved address labels, resolve status, last serviceable village, GPS-detecting flag — and all orchestration (debounce, stale-response guard, GPS, serviceability call). This keeps high-frequency camera churn out of the global store.
- **`MapPickerScreen`** and its subcomponents are presentational: they render VM state and forward gestures/taps.

### View-model state

```ts
interface MapPickerState {
  region: Region | null;            // current camera region
  primary: string;                  // village title (from backend)
  secondary: string | null;         // finer label if backend returns one
  pinState: 'resolving' | 'serviceable' | 'not_serviceable' | 'error';
  village: Village | null;          // last serviceable village (commit target)
  detectingGps: boolean;            // current-location action in flight
}
```

Resolution uses a sequence token (mirroring the store's `seq` pattern) so a late
`findByLocation` response is dropped when a newer camera settle has started. A
ref guard prevents `setState` after unmount.

## Components & files

### New

- `app/location/map.tsx` — route; renders `<MapPickerScreen/>`.
- `src/features/location/views/MapPickerScreen.tsx` — screen shell: header ("Location Information"), `<MapView>`, pin overlay, tooltip, current-location pill, bottom sheet.
- `src/features/location/viewmodel/useMapPickerViewModel.ts` — ephemeral state + orchestration.
- `src/features/location/views/components/MapPinMarker.tsx` — fixed center pin rendered as an absolutely-positioned overlay (NOT a draggable map `Marker`), so the map moves underneath it.
- `src/features/location/views/components/PinTooltip.tsx` — dark bubble with tail: "Order will be delivered here" / "Place the pin to your exact location".
- `src/features/location/views/components/LocationInfoSheet.tsx` — bottom sheet with primary/secondary labels and serviceable / resolving / not-serviceable / error variants plus the sticky CTA.

### Touched

- `package.json` — add `react-native-maps`.
- `app.config.ts` (new) / `app.json` — supply Google Maps keys via env (`ios.config.googleMapsApiKey`, `android.config.googleMaps.apiKey`). See Native Setup.
- `src/features/location/data/mappers.ts` — `mapVillage` additionally captures a secondary label when the backend provides one (candidate keys: `subtitle`, `locality`, `mandal`, `district`, `area`); the secondary line is hidden when absent. Backend-only — no reverse geocode.
- `src/features/location/data/locationApi.ts` — reuse `findByLocation` unchanged.
- `src/features/location/data/LocationService.ts` — reuse `getCurrentPosition` / permission helpers unchanged.
- `src/features/location/views/SelectLocationScreen.tsx` — add a "Set location on map" entry that does `router.push('/location/map')`.

## Data flow & state machine

1. **Mount** → auto-detect GPS: request permission → `LocationService.getCurrentPosition()` → center camera on the fix.
   - Permission denied (can ask again): skip auto-center; fall back to `store.serviceableVillage` coords, else a default region.
   - Permanently denied (blocked): reuse `PermissionDeniedSheet` → open Settings; no prompt loop.
   - GPS fix fails/timeout: fall back region; map stays usable for manual pan.
2. **`onRegionChangeComplete(region)`** → set `pinState:'resolving'` → **debounce ~450ms** → `findByLocation(center)`.
   - Serviceable (response has `title`): `pinState:'serviceable'`, set `primary`/`secondary`, store `village`, enable CTA.
   - No title: `pinState:'not_serviceable'`, disable CTA, show inline copy.
   - Network/5xx throw: `pinState:'error'`, sheet shows Retry (re-resolves current center).
3. **Stale guard**: sequence token drops responses from superseded settles.
4. **Use current location pill** → permission + GPS → `mapRef.animateCamera(fix)`; the resulting region change drives the same resolve path. Spinner via `detectingGps`.
5. **Confirm & Continue** (enabled only when `serviceable`) → `store.setServiceable(village)` + `store.addRecent({ ...village coords, label })` → navigate home (`goHome` / `router.replace('/(dashboard)/home')`).

## Error & edge cases

| Case | Handling |
|---|---|
| Permission denied (can ask again) | Skip auto-center; fall-back region. Pill tap re-requests. |
| Permanently denied (blocked) | Reuse `PermissionDeniedSheet` → Settings. |
| GPS services off | `getCurrentPosition` tries `enableNetworkProviderAsync` + last-known; on fail, fall-back region + inline note. |
| GPS fix timeout / no fix | Stop pill spinner; inline "Couldn't get location"; manual pan still works. |
| `findByLocation` network / 5xx | `pinState:'error'`; sheet shows Retry. |
| No internet | Same as network-error path; Retry. |
| Not serviceable | `pinState:'not_serviceable'`; CTA disabled + inline copy. |
| Rapid panning | Debounce + sequence token; only newest settle resolves; CTA disabled while resolving. |
| Unmount mid-flight | Sequence token + mounted ref guard; no `setState` after unmount. |
| Backend title but no secondary | Hide secondary line. |

## UI

Matches the reference: header "Location Information", full-bleed Google Map, fixed center pin overlay, dark floating tooltip above the pin, rounded-top bottom sheet (primary bold + secondary muted), sticky red **Confirm & Continue** CTA, and a floating "Use current location" pill. Three sheet states: serviceable (CTA enabled), resolving (skeleton + muted CTA), not-serviceable (inline message + disabled CTA).

## Native setup (prerequisite)

- `react-native-maps` requires **Google Maps API keys** — an iOS Maps SDK key and an Android Maps SDK key. These are client keys embedded in the app binary.
- Keys are injected via env (e.g. `GOOGLE_MAPS_API_KEY`) through an `app.config.ts`, read from a gitignored `.env` (or EAS secrets). The raw key value is **not** committed to git.
- The key must be restricted in Google Cloud Console to the app's iOS bundle id (`com.anonymous.villagedelivery`) and Android package, with only Maps SDK for iOS/Android enabled.
- Requires a custom dev/prebuild client (not Expo Go): `npx expo prebuild` then rebuild the dev client.
- iOS map render uses `provider={PROVIDER_GOOGLE}`.

## Testing

The repo currently has **no test runner configured** (no `test` script, no jest/vitest).

- **Primary verification:** manual testing on a dev client — pan→resolve, use-current-location, permission denied/blocked, airplane mode (network error + Retry), out-of-area (not serviceable), and Confirm committing to the store + navigating home.
- **Optional unit coverage:** if jest is added, target `useMapPickerViewModel` (state transitions, debounce coalescing, stale-token drop, Confirm-commits-only-when-serviceable) and `mapVillage` secondary-label extraction/fallback. Adding the runner is out of scope unless requested.

## Out of scope

- Address-details form / saving a full `Address` (separate flow).
- Free-text place search / autocomplete (existing search placeholder unchanged).
- Reverse geocoding and Google Geocoding API.
