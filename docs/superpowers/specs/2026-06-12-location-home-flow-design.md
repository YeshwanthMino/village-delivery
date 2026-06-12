# Location Selection & Home Loading Flow — Design

Date: 2026-06-12

## Goal

Rework the cold-start, location-selection, and Home-loading experience to match
Zepto / Blinkit / Instamart: no full-screen loaders, Home renders immediately with
shimmer, location selection happens through a bottom sheet on Home (with a full
SelectLocationScreen for search), and smooth transitions between selection and
Home content.

## Current State (baseline)

- `AppScreen` hard-gates: when no serviceable village, it `router.replace('/location')`,
  blocking Home entirely.
- `/location` route renders `LocationGateScreen`, which branches on
  `useLocationStore.status` (`locating`/`checking` → full-screen spinner,
  `not_serviceable`/`error` → full-screen `NotServiceableView`, `idle` →
  `SelectLocationScreen`).
- `HomeScreen` shows a full-screen `ActivityIndicator` while the layout loads.
- `LocationEntrySheet` (bottom sheet) is only opened from the Home toolbar for
  logged-out users; it has a current-location tile, a "Request address from friend"
  row, and an inert Search button.
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
> `persistent` props are **kept** — they are reused for the on-Home persistent sheet.

## Chosen Architecture: Home-as-root + imperative gate

`AppScreen` no longer redirects to `/location`. Home is always the landing screen.
Home renders shimmer and, when there is no serviceable village (or location permission
is denied after launch), opens `LocationEntrySheet` (persistent) over the shimmer.
The full `SelectLocationScreen` is reached only via the sheet's **Search** action.

Rejected alternatives:
- Keep the `AppScreen` gate but mount Home behind a modal route — more coupling, two
  sources of truth for navigation state.
- Make location selection a bottom sheet only (no navigable screen) — conflicts with
  the requirement that the toolbar / Search navigates to `SelectLocationScreen`.

## Components

### 1. Navigation gate
- `AppScreen`: remove the `!hasServiceableLocation → router.replace('/location')`
  block. It keeps fonts, auth check, locale, and hydration only. Home is the landing
  route.
- `HomeScreen`: a gate effect opens `LocationEntrySheet` (persistent) when
  `hydrated && !serviceableVillage`. (Permission being denied is handled *inside* the
  sheet's Enable flow — it does not, on its own, force the sheet open when a serviceable
  village already exists.) No auto-navigation to `SelectLocationScreen`.

### 2. LocationEntrySheet (kept, enhanced) — primary on-Home selector
Persistent (`dismissable=false`) until a serviceable location is chosen. Contents:
- **Logged in:** Saved addresses (`listAddresses`; tap selects that address's village)
  **+** "Use my current location" tile (Enable button) **+** Search button.
- **Logged out:** "Use my current location" tile (Enable) **+** Search button.
- **Search** tap → `router.push('/location')` → `SelectLocationScreen`.
- Enable → permission flow (see §4).
- The "Request address from friend" row is **removed**.

### 3. LocationGateScreen (kept) — `/location` route wrapper
Role unchanged from baseline (idle branch restored): branches on
`useLocationStore.status` — `locating`/`checking` → spinner, `not_serviceable`/`error`
→ inline state, `idle` → `SelectLocationScreen`. The prior persistent-sheet idle
rewrite is reverted here.

### 4. SelectLocationScreen (rebuilt, full screen) — reached via sheet Search
Sections top→bottom:
- **Search address** — text input → `expo-location` `geocodeAsync` → pick →
  `findByLocation`.
- **Use my current location** — tile driven by permission state.
- **Saved addresses** — auth-only (`listAddresses`); tap selects its village.
- **Recent locations** — local (see §6); tap re-selects instantly (no `findByLocation`).
- Inline **"Service not available in your area"** banner when a pick resolves
  not-serviceable; user stays on screen to choose another.

`mandatory` param: when set (entered while no village exists), back / swipe-dismiss are
disabled until a serviceable location is chosen.

### 5. useSelectLocationViewModel (rebuilt) + permission flow + PermissionDeniedSheet
ViewModel exposes: `permissionState`, `detectCurrentLocation()`, `search` /
`searchResults` / `pickSearchResult()`, `recent[]`, `saved[]`,
`selectVillage(village, coords)`, `status`, `notServiceable`. It encapsulates the
permission state machine and serviceability branching.

Permission state machine (Enable / detect):
- `undetermined` → Enable → `requestForegroundPermissionsAsync` → granted: detect;
  denied: stay (tile keeps Enable).
- denied + `canAskAgain === false` (repeat Enable) → **PermissionDeniedSheet**
  (a `VillageBottomSheet`): "Location access needed" + **Go to Settings**
  (`Linking.openSettings`) + **Cancel**.
- Returning from Settings: an `AppState` `active` listener re-checks permission; if now
  granted, auto-detect.

### 6. Recent locations (new local persistence)
- `useLocationStore` gains `recentLocations: RecentLocation[]` + a `StoredPrefs` key,
  hydrated on launch.
- `RecentLocation = { storeId, villageName, latitude, longitude, label, savedAt }`.
- On every serviceable selection: prepend, dedupe by `storeId`, cap at **5**.
- Tapping a recent re-selects it directly (no `findByLocation` call).

### 7. Home shimmer
- New `HomeSkeleton` component (react-native-reanimated 4.2 + expo-linear-gradient
  sweep). Replaces the full-screen `ActivityIndicator` in `HomeScreen`.
- Shown while `layout.loading && sections.length === 0`. Toolbar stays visible
  throughout.

### 8. Service-not-available
- **Primary:** inline banner inside `SelectLocationScreen` / `LocationEntrySheet`
  (covers spec Cases 1.4 / 2 / 3 — "choose another location manually").
- **Secondary:** centered `NotServiceableView` on Home when a previously-saved
  village's layout resolves not-serviceable/empty; its button reopens the selector.

## Data Flow

Current-location pick (permission granted):
1. tile tapped → status `locating`.
2. `LocationService.getCurrentPosition()` → coords.
3. `findByLocation(coords)`.
4. serviceable → `setServiceable(village)` + push recent → close sheet / `router.back()`
   to Home.
5. Home layout effect refetches whenever the serviceable village's `storeId` changes →
   `HomeSkeleton` while loading → render sections.
6. not serviceable → inline "Service not available" banner, stay on selector.
7. network / 5xx → retryable inline error.

Saved-address or recent pick: select village directly → same step 4→5 (no
`findByLocation` for recent; saved carries its village).

Home refetch: the existing `storeId`-keyed layout effect refetches on every village
change, so selecting a **different** location triggers an explicit refetch; re-selecting
the same `storeId` does not.

## Removed / Reverted

- "Request address from friend" row (from `LocationEntrySheet`, and not added to
  `SelectLocationScreen`).
- `AppScreen`'s hard `/location` redirect.
- Full-screen Home `ActivityIndicator` (replaced by shimmer).
- Prior persistent-sheet-over-home-shell rewrite of `LocationGateScreen`'s idle branch
  (reverted to render `SelectLocationScreen`).

## Kept

- `LocationEntrySheet`, `LocationGateScreen`, `SelectLocationScreen` (all retained).
- `VillageBottomSheet.dismissable` and `LocationEntrySheet.persistent` props (reused).
- All existing data-layer functions (`findByLocation`, `getHomeLayout`, `listAddresses`,
  `LocationService`, store persistence).

## Testing

- ViewModel unit tests: permission state machine (undetermined → granted/denied →
  canAskAgain=false → settings sheet), recent dedupe + cap-at-5, serviceable vs
  not-serviceable vs network-error branching.
- Store tests: recent-locations persistence + hydrate.
- Component tests: `HomeSkeleton` renders during load and is replaced by sections;
  `SelectLocationScreen` `mandatory` mode blocks back; sheet hides Saved section when
  logged out.

## Out of Scope

- Map-based pin-drop selection.
- Address create/edit flow (existing `/address/add` unchanged).
- Logged-out search of saved addresses (saved is auth-only by design).
