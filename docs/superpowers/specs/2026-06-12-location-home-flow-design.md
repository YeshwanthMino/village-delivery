# Location Selection & Home Loading Flow — Design

Date: 2026-06-12

## Goal

Rework the cold-start, location-selection, and Home-loading experience to match
Zepto / Blinkit / Instamart: no full-screen loaders, **no hard gate** — Home always
renders with its toolbar and bottom navigation visible. When no serviceable village is
selected, Home shows an inline serviceability UI in its body (not a blocking sheet),
and the toolbar shows a "Select delivery location" / "Service unavailable" state.
Selecting a serviceable village refreshes Home into normal content.

## Current State (baseline)

- `AppScreen` hard-gates: when no serviceable village, it `router.replace('/location')`,
  blocking Home entirely. **This is removed.**
- `/location` route renders `LocationGateScreen`, which branches on
  `useLocationStore.status` (`locating`/`checking` → full-screen spinner,
  `not_serviceable`/`error` → full-screen `NotServiceableView`, `idle` →
  `SelectLocationScreen`).
- `HomeScreen` shows a full-screen `ActivityIndicator` while the layout loads.
- `LocationEntrySheet` (bottom sheet) is opened from the Home toolbar; it has a
  current-location tile, a "Request address from friend" row, and an inert Search button.
- Data layer already exists and is reused as-is:
  - `findByLocation(coords)` (`locationApi.ts`) = the spec's `findMyLocation` —
    serviceable only on 2xx **with** a `title`; 4xx → not serviceable; network/5xx
    throws (retryable).
  - `getHomeLayout(storeId, 'main')` (`homeLayoutApi.ts`) hits
    `${villageBaseURL}/app/page-layout/path/main` with the `x-store-id` header.
  - `useLocationStore` persists `serviceableVillage` and `selectedAddressId` via
    `StoredPrefs`.
  - `listAddresses()` returns saved addresses (requires auth).
  - `LocationService` wraps expo-location: `getPermissionState()`,
    `requestPermission()`, `getCurrentPosition()`.

> Note: a prior change rewrote `LocationGateScreen`'s idle branch into a
> persistent-sheet-over-home-shell and added a `dismissable` prop to
> `VillageBottomSheet` + a `persistent` prop to `LocationEntrySheet`. That idle-branch
> rewrite is **reverted** by this design (its job moves to Home). The `dismissable` /
> `persistent` props are **kept** (still used elsewhere); the on-Home selector is
> **non-blocking** — it does not use `persistent=true`.

## Chosen Architecture: Home-as-root, no gate, inline serviceability

`AppScreen` no longer redirects to `/location`. Home is always the landing screen with
toolbar and bottom navigation always visible. Home owns the location state:
- Serviceable village present → toolbar shows village + ETA; body shows shimmer while the
  layout loads, then content.
- No village / not serviceable → toolbar shows "Select delivery location" /
  "Service unavailable"; body shows an inline `HomeServiceabilityView` with actions.

The full `SelectLocationScreen` is reached via "Change Location" / "Search". The
`LocationEntrySheet` is an on-demand (non-blocking) quick selector opened from the
toolbar.

Rejected alternatives:
- `AppScreen` hard gate / blocking persistent sheet — blocks Home, hides bottom nav,
  worse UX.
- Auto-pushing `SelectLocationScreen` on cold start — pulls the user out of Home.

## Components

### 1. Navigation gate (removed) → Home owns location state
- `AppScreen`: remove the `!hasServiceableLocation → router.replace('/location')`
  block. It keeps fonts, auth check, locale, and hydration only.
- Bottom navigation (dashboard tabs) and Home toolbar are visible at all times.
- No auto-navigation and no auto-opening blocking sheet.

### 2. Home toolbar states (`LocationHeader`)
- **Serviceable village:** ETA + village name (current behavior).
- **No village:** "Select delivery location".
- **Not serviceable:** "Service unavailable".
- Tap → opens `LocationEntrySheet` (on-demand quick selector).

### 3. HomeServiceabilityView (new, inline in Home body)
Rendered in the Home body (between toolbar and bottom nav) whenever there is no
serviceable village or the selected area is not serviceable. Bottom nav stays usable.
Contents:
- **Current location status** (e.g. detected label, or "Location not set").
- **Message:** "Delivery isn't available for this area yet" (not-serviceable) or a
  prompt to set a location (no village).
- **Use My Current Location** button → runs the detect flow (§6) inline.
- **Change Location** button → `router.push('/location')` → `SelectLocationScreen`.
- **Search / select another village** → same `SelectLocationScreen`.

This replaces the full-screen `not_serviceable` / empty gate experience; the user never
leaves Home.

### 4. LocationEntrySheet (kept, enhanced, non-blocking) — on-demand quick selector
Opened on demand from the toolbar (`persistent=false`, dismissable). Contents:
- **Logged in:** Saved addresses (`listAddresses`; tap selects that address's village)
  **+** "Use my current location" tile (Enable) **+** Search button.
- **Logged out:** "Use my current location" tile (Enable) **+** Search button.
- **Search** tap → `router.push('/location')` → `SelectLocationScreen`.
- Enable → permission flow (see §6).
- The "Request address from friend" row is **removed**.

### 5. SelectLocationScreen (rebuilt, full screen) — `/location` via LocationGateScreen
`LocationGateScreen` is **kept** as the `/location` route wrapper (idle branch restored:
`locating`/`checking` → spinner, `not_serviceable`/`error` → inline state, `idle` →
`SelectLocationScreen`). `SelectLocationScreen` sections top→bottom:
- **Search address** — text input → `expo-location` `geocodeAsync` → pick →
  `findByLocation`.
- **Use my current location** — tile driven by permission state.
- **Saved addresses** — auth-only (`listAddresses`); tap selects its village.
- **Recent locations** — local (see §7); tap re-selects instantly (no `findByLocation`).
- Inline **"Service not available in your area"** banner when a pick resolves
  not-serviceable; user stays on screen to choose another. Back returns to Home (which
  still shows `HomeServiceabilityView` until a serviceable village is chosen).

### 6. useSelectLocationViewModel (rebuilt) + permission flow + PermissionDeniedSheet
ViewModel exposes: `permissionState`, `detectCurrentLocation()`, `search` /
`searchResults` / `pickSearchResult()`, `recent[]`, `saved[]`,
`selectVillage(village, coords)`, `status`, `notServiceable`. Shared by
`HomeServiceabilityView`, `LocationEntrySheet`, and `SelectLocationScreen`.

Permission state machine (Enable / detect):
- `undetermined` → Enable → `requestForegroundPermissionsAsync` → granted: detect;
  denied: stay (button keeps "Enable").
- denied + `canAskAgain === false` (repeat Enable) → **PermissionDeniedSheet**
  (a `VillageBottomSheet`): "Location access needed" + **Go to Settings**
  (`Linking.openSettings`) + **Cancel**.
- Returning from Settings: an `AppState` `active` listener re-checks permission; if now
  granted, auto-detect.

### 7. Recent locations (new local persistence)
- `useLocationStore` gains `recentLocations: RecentLocation[]` + a `StoredPrefs` key,
  hydrated on launch.
- `RecentLocation = { storeId, villageName, latitude, longitude, label, savedAt }`.
- On every serviceable selection: prepend, dedupe by `storeId`, cap at **5**.
- Tapping a recent re-selects it directly (no `findByLocation` call).

### 8. Home shimmer
- New `HomeSkeleton` component (react-native-reanimated 4.2 + expo-linear-gradient
  sweep). Replaces the full-screen `ActivityIndicator` in `HomeScreen`.
- Shown **only** when a serviceable village exists and `layout.loading &&
  sections.length === 0`. When there is no serviceable village, the body shows
  `HomeServiceabilityView` instead (never shimmer). Toolbar + bottom nav always visible.

## Data Flow

Current-location pick (permission granted), from any entry point
(`HomeServiceabilityView` button, sheet tile, or `SelectLocationScreen`):
1. trigger → status `locating`.
2. `LocationService.getCurrentPosition()` → coords.
3. `findByLocation(coords)`.
4. serviceable → `setServiceable(village)` + push recent → (if on a sub-screen)
   `router.back()` to Home.
5. Home layout effect refetches whenever the serviceable village's `storeId` changes →
   `HomeSkeleton` while loading → render sections.
6. not serviceable → `not_serviceable`; Home shows `HomeServiceabilityView`
   ("Service unavailable"), or the selector shows its inline banner if still on it.
7. network / 5xx → retryable error (inline on the active surface).

Saved-address or recent pick: select village directly → same step 4→5 (no
`findByLocation` for recent; saved carries its village).

Home refetch: the existing `storeId`-keyed layout effect refetches on every village
change, so selecting a **different** location triggers an explicit refetch; re-selecting
the same `storeId` does not.

## Removed / Reverted

- `AppScreen`'s hard `/location` redirect (no hard gate).
- Auto-opening blocking/persistent location sheet on Home.
- "Request address from friend" row (from `LocationEntrySheet`).
- Full-screen Home `ActivityIndicator` (replaced by shimmer / serviceability view).
- Prior persistent-sheet-over-home-shell rewrite of `LocationGateScreen`'s idle branch
  (reverted to render `SelectLocationScreen`).

## Kept

- `LocationEntrySheet`, `LocationGateScreen`, `SelectLocationScreen` (all retained).
- `VillageBottomSheet.dismissable` / `LocationEntrySheet.persistent` props (the on-Home
  selector is non-blocking and does not use `persistent=true`).
- All existing data-layer functions (`findByLocation`, `getHomeLayout`, `listAddresses`,
  `LocationService`, store persistence).
- Bottom navigation (dashboard tabs) — always visible.

## Testing

- ViewModel unit tests: permission state machine (undetermined → granted/denied →
  canAskAgain=false → settings sheet), recent dedupe + cap-at-5, serviceable vs
  not-serviceable vs network-error branching.
- Store tests: recent-locations persistence + hydrate.
- Component tests: `HomeSkeleton` renders during load only when a village exists;
  `HomeServiceabilityView` renders when no/not-serviceable village and exposes the
  Change Location + Use My Current Location actions; toolbar shows the correct state
  string per village state; sheet hides Saved section when logged out.

## Out of Scope

- Map-based pin-drop selection.
- Address create/edit flow (existing `/address/add` unchanged).
- Logged-out search of saved addresses (saved is auth-only by design).
