# Select Location Screen — Design

Date: 2026-06-12

## Goal

When location permission is not granted, the location bottom sheet auto-opens
(already implemented). Replace the sheet's inline search input with a
"Search your Location" button that navigates to a full-screen **Select Location**
screen (Zepto/Blinkit style), which offers Search Address, Use my Current Location,
and saved/recent locations.

## Current State

- `LocationPermissionSheet` auto-opens on Home when there is no serviceable village.
  Its search is an inline `TextInput` (geocode on submit).
- There is no `/location` route or full-screen location picker (the old one was
  deleted during the location rebuild).
- Shared pieces exist and are reused: `useLocationViewModel` (permission machine,
  detect/search/saved/recent resolve, blocked→Settings), `useAddressBookViewModel`
  (saved addresses), `UseCurrentLocationRow`, `PermissionDeniedSheet`,
  `useLocationStore` (serviceableVillage, recentLocations).

## Components

### 1. LocationPermissionSheet (edit)
- Remove the inline search `TextInput`.
- Add a **"Search your Location"** button (search icon + label) that calls
  `router.push('/location')` and closes the sheet.
- Unchanged: pin hero, `UseCurrentLocationRow`, denied amber strip, saved addresses.

### 2. SelectLocationScreen (new) — route `/location`
Full screen, green theme (mirrors screenshot 1):
- Header: title **"Select Location"** (`t('select_location')`).
- **Search Address** field: visual only for now — rounded bordered box with a search
  icon and "Search Address" placeholder. Inert (no geocoding wired); behavior is
  deferred to a later decision. Implemented as a non-editable row so it is obviously
  a placeholder.
- Body (slate-50 section):
  - **Use my Current Location** — `UseCurrentLocationRow` (Enable when permission not
    granted → OS dialog; GPS detect when granted).
  - **Saved addresses** (auth only, from `useAddressBookViewModel`) — tap → resolve
    via `vm.selectAddress`.
  - **Recent locations** (from store) — tap → `vm.selectRecent` (instant, no API).
- On any successful selection → village is set in the store →
  `router.back()` (or `router.replace('/(dashboard)/home')` when there is no back
  entry) → Home reloads its layout via the new `storeId`.
- `PermissionDeniedSheet` rendered for the permanently-denied path.

### 3. Routing
- `app/location/index.tsx` renders `SelectLocationScreen`.
- `AppScreen` `allowed` roots gains `'location'` so the route is not bounced to Home.

## Data Flow

LocationPermissionSheet → "Search your Location" → `router.push('/location')` →
SelectLocationScreen → user picks current location / saved address / recent →
`useLocationViewModel` resolves a serviceable village → `setServiceable` →
`router.back()` to Home → home layout effect refetches on `storeId` change.

## Out of Scope (deferred)

- Search Address geocoding / autocomplete behavior (to be decided later; the field is
  a visual placeholder for now).
- "Request address from friend" row (omitted).
- `LocationSheet` (change-delivery-location) is unchanged.

## Testing

- tsc + eslint clean on changed files.
- Manual (device): no-permission launch → sheet auto-opens → "Search your Location" →
  Select Location screen → Use current location resolves → returns to Home with content.
  Not runtime-verifiable via available tools (Expo native).
