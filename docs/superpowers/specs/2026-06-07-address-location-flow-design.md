# Address Selection & Add-New-Address Flow — Design Spec

_Date: 2026-06-07_

---

## Overview

Add a **location/serviceability gate** and **address book** to Village Delivery, modeled on Zepto/Blinkit. On launch the app must resolve a *serviceable village* before the dashboard is usable (hard gate). The serviceable village name is shown in the home header. Users can manage saved delivery addresses through a bottom sheet and an add/edit form.

The single public backend endpoint `POST /villages/find-by-location` (no auth) drives serviceability. Address CRUD and village search require Bearer auth + `customerId`, which do not exist yet (login is mocked). Therefore the address book is **local-first** behind a repository interface, with real HTTP endpoint functions written and ready to activate once real auth lands.

**Chosen approach:** A — location-gate feature, local-first address repo, real public serviceability API. (Alternatives B "all real endpoints now" and C "fully mocked" rejected: B is non-functional under mocked auth; C throws away the real API.)

---

## Scope

**In scope**
- Location permission + current-position fetch (`expo-location`).
- Serviceability check via `find-by-location`; **2xx → serviceable → load home**; non-2xx/empty → not-serviceable screen.
- Hard gate: dashboard blocked until a serviceable location is confirmed.
- Select Location screen (Zepto-style): search bar, "Use my Current Location / Enable", "Request address from friend" (stub).
- Location-off bottom sheet overlaying home (permission off state) with Enable + Search.
- Not-serviceable screen with "Use another pincode" CTA.
- Header: `{eta} minutes` + `{tag} - {addressLine}` with chevron dropdown + profile icon; tap → address/location entry.
- **Login-gated address book** (see below): when authenticated → list saved addresses, highlight default, Deliver Here / Edit / Delete / **Add New**. When NOT logged in → no Add New / no saved book; only current-location + search.
- Add/Edit address form (authenticated only): current-location autofill, manual fields, tag (Home/Work/Other), validation.
- Cache serviceable village + selected location (zustand + SecureStore) for fast launch — works logged-out.
- Real typed endpoint functions for address CRUD + village search, used when authenticated.
- Telugu + English strings for all new UI.
- Edge cases: permission denied, GPS off, not serviceable, network failure, empty address list, offline (cached village), logged-out.

**Login gating (new rule)**
- **Not logged in:** can resolve current location via `find-by-location` and browse/serviceability-gate, but **"Add New Address" and the saved-address book are hidden**. Address management requires login.
- **Logged in (real token):** full address book via real `/address` endpoints.
- Login is still mocked today → in practice the address book stays hidden until real auth lands. No local address persistence is built; only the serviceable village/selected location is cached.

**Out of scope**
- Interactive Google Map / draggable pin (expo-location only, no maps lib).
- Real login / token / `customerId` (separate auth work). Address book hidden until then.
- "Request address from friend" (WhatsApp) — rendered as a static placeholder to match the reference UI, not wired.
- Games / rewards card — excluded entirely.
- `addressImage` upload, address verification, household/shared addresses.
- Backend tag field (tag is local-only, authenticated users only).

---

## Backend API (reference)

Base URL for this feature: `https://ub7mvw9ks.bizzz.in` (distinct from the app's `EXPO_PUBLIC_API_BASE_URL`). Added as `EXPO_PUBLIC_VILLAGE_API_BASE_URL`.

| Endpoint | Method | Auth | Use |
|---|---|---|---|
| `/villages/find-by-location` | POST | none | `{latitude, longitude}` → village (serviceability) |
| `/villages?search=&skip=&limit=&active=` | GET | Bearer | manual village search (auth-gated) |
| `/address` | GET | Bearer | list saved addresses |
| `/address` | POST | Bearer | create address |
| `/address/{id}` | PATCH | Bearer | update address |
| `/address/{id}` | DELETE | Bearer | delete address |
| `/address/customer/{customerId}?default=true` | GET | Bearer | default address |

**DTOs**

```
DefaultLocationDto: { latitude: number; longitude: number }   // required

CreateAddressDto / UpdateAddressDto:
  customerId?, householdId?, villageId?: string
  addressLine1?, addressLine2?, landmark?, pincode?: string
  latitude?, longitude?: number
  isDefault?: boolean
  addressImage?: string
  (UpdateAddressDto adds) isVerified?: boolean
```

Backend has **no city/state and no Home/Work tag field**. Village (with name/pincode) comes from `find-by-location`. Tag is stored locally.

---

## Architecture

New feature `src/features/location/` following the existing Clean-Architecture + MVVM + hook-viewmodel pattern (mirrors `src/features/home`). No Container registration needed — viewmodels are plain hooks like `useHomeViewModel`.

```
src/features/location/
├── data/
│   ├── locationApi.ts          ← typed HTTP calls (find-by-location [live], CRUD + village search [authed])
│   ├── LocationService.ts      ← expo-location wrapper: permission, getCurrentPosition
│   ├── AddressRepository.ts     ← interface + RemoteAddressRepository (locationApi, authed only)
│   └── mappers.ts              ← API DTO ↔ domain model
├── domain/
│   └── models.ts               ← Village, Address, AddressTag, ServiceabilityStatus
├── viewmodel/
│   ├── useLocationGateViewModel.ts   ← permission → GPS → find-by-location → status
│   ├── useSelectLocationViewModel.ts ← Select Location screen: current loc / search / friend (stub)
│   ├── useAddressBookViewModel.ts    ← list/select/delete saved addresses (authed)
│   └── useAddressFormViewModel.ts    ← add/edit form state + validation + save (authed)
└── views/
    ├── LocationGateScreen.tsx        ← full-screen gate (loading / not-serviceable / error)
    ├── SelectLocationScreen.tsx      ← search bar + current location + request-from-friend (stub)
    ├── LocationEntrySheet.tsx        ← bottom sheet over home (permission-off / change location)
    ├── AddressFormScreen.tsx         ← add/edit form (authed)
    └── components/
        ├── CurrentLocationRow.tsx    ← "Use my Current Location" + Enable
        ├── AddressRow.tsx
        ├── TagSelector.tsx           ← Home / Work / Other
        ├── LocationHeader.tsx        ← "{eta} minutes" + "{tag} - {line}" + chevron + profile
        └── NotServiceableView.tsx    ← "Location Not Serviceable" + "Use another pincode"

src/core/store/useLocationStore.ts    ← serviceable village, selected location/address, saved addresses, status
```

**Routes (expo-router)**
- `app/location/index.tsx` → `SelectLocationScreen` (registered in root `Stack`; serves as the gate entry).
- `app/address/add.tsx` → `AddressFormScreen` (authed; add mode, edit via `?id=` param).
- `LocationEntrySheet` is a component opened from the home header (not a route).
- `LocationGateScreen` / `NotServiceableView` render inside the location route depending on status.

---

## Domain models

```ts
type AddressTag = 'home' | 'work' | 'other';
type ServiceabilityStatus = 'idle' | 'locating' | 'checking' | 'serviceable' | 'not_serviceable' | 'error';

interface Village {
  id: string;          // villageId
  name: string;        // shown in header
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

interface Address {
  id: string;          // backend _id (address book is authed/remote only)
  villageId: string;
  villageName: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  tag: AddressTag;     // local-only
  isDefault: boolean;
}
```

---

## Data flow

### Launch / gate (`useLocationGateViewModel`)
```
1. Read cached serviceable location (SecureStore). If present → status=serviceable, app proceeds.
2. Else show SelectLocationScreen / LocationEntrySheet (permission-off state). User taps Enable:
   - request permission (expo-location)
   - granted → getCurrentPositionAsync → POST find-by-location {lat,lng}
       → **2xx success** → serviceable: cache location + load home data
       → 4xx / empty body → status=not_serviceable (NotServiceableView)
       → 5xx / network error → status=error (retry CTA)
   - denied → stay on Select Location with Enable + search; deep-link to Settings.
3. "Use another pincode" / "Search your Location" → village text search (GET /villages, authed).
   Logged-out: search is disabled/empty (no public search endpoint); primary path is GPS.
```

### Hard gate (in `AppScreen`)
`AppScreen` already guards routing. Extend it: after auth check, read `useLocationStore.hasServiceableLocation`. If false and not already on `location`, `router.replace('/location')`. Dashboard/cart/etc. remain blocked until a serviceable location is set. Confirming current location (or, when authed, selecting a saved address) sets it and releases the gate.

### Address book (`useAddressBookViewModel`) — authenticated only
- Guarded by `useAuthStore.isAuthenticated`. If not authenticated, the book + "Add New Address" are not rendered; user only sees current-location + search.
- When authenticated: loads via `RemoteAddressRepository` → `GET /address`. `select(id)`, `delete(id)` (`DELETE /address/{id}`), `setDefault(id)` (`PATCH`).
- `selectedAddressId` cached locally for fast launch/header.

### Add/Edit (`useAddressFormViewModel`) — authenticated only
- Reached only when logged in. On open (add): autofill from current GPS → `find-by-location` to resolve `villageId`/`villageName`/pincode; user fills `addressLine1` (house+street), `addressLine2` (area), `landmark`, optional `pincode`; pick tag; toggle default.
- Validation (block save): `addressLine1` non-empty, a resolved village, `pincode` 6 digits if provided. Inline errors.
- Save → `POST`/`PATCH /address` → refresh book → close → returns to selection.

---

## Persistence (SecureStore via StoredPrefs)

New keys in `StorageKeys`:
- `SERVICEABLE_VILLAGE` — cached `Village` / selected location (fast launch, works logged-out).
- `SELECTED_ADDRESS_ID` — last-selected address id (authed; cache for fast access/header).

Saved addresses themselves are **not** persisted locally — they come from `GET /address` when authenticated. Only the resolved serviceable village/selected-location and the selected-address id are cached. `useLocationStore` hydrates these on app start (mirrors `loadLocale`).

---

## UI / UX (Zepto/Blinkit patterns)

Matches the supplied reference screenshots. (Reference uses a pink/red accent; we keep Village Delivery's **green-600** brand for CTAs unless instructed otherwise.)

- **SelectLocationScreen**: title "Select Location"; top **Search Address** bar; card with `CurrentLocationRow` ("Use my Current Location" / "Enable your current location for better services" + **Enable** button); "**Request address from friend**" row (WhatsApp icon, chevron) — static stub. Used when no permission/location yet.
- **LocationEntrySheet** (bottom sheet over home, permission-off state): large location-pin illustration, "**Location permission is off**", "Enabling location helps us reach you quickly with accurate delivery", `CurrentLocationRow` + Enable, "Request address from friend" (stub), "**Search your Location**" button. Wraps existing `VillageBottomSheet`.
- **NotServiceableView**: shopping-bag pin, "**Location Not Serviceable**", "Our team is working tirelessly to bring 10-minute deliveries to your location", primary "**Use another pincode**" CTA. No games/rewards card.
- **LocationHeader** (home): row 1 `⚡ {eta} minutes`; row 2 `{tag} - {addressLine}` (e.g. "Home - 1, sankar nilaya, ground floor…", truncated) + chevron-down; profile icon top-right. Tap → opens `LocationEntrySheet` (logged-out) or address book (logged-in). Logged-out with serviceable village shows the village name instead of a saved address.
- **AddressBottomSheet** (authed only): header "Select delivery address". Saved rows with tag icon + address text; selected row highlighted (green-50 bg + green-600 check). Sticky "**+ Add New Address**". Row actions: tap=select, edit (pencil), delete (trash). Empty state: "No saved addresses" + Add CTA. **Hidden entirely when not logged in.**
- **AddressFormScreen** (authed only): read-only village/pincode chip (from find-by-location), inputs for fields, `TagSelector` segmented Home/Work/Other, default toggle, sticky "Save address" CTA, inline errors.

Brand tokens reused: green-600 CTA, green-50 accent, slate text, `FontFamily`, Telugu font for `te`.

---

## Error handling & loading states

| Case | Handling |
|---|---|
| Permission denied | Stay on Select Location; Enable + "Open settings" (Linking) + search |
| GPS unavailable / timeout | status=error, "Couldn't get location" + Retry |
| find-by-location network fail | status=error + Retry; if cached location exists, allow proceeding offline |
| Not serviceable (non-2xx/empty) | NotServiceableView + "Use another pincode" |
| Not logged in | Hide saved book + Add New; show current-location + search only |
| Address CRUD fail (network/401) | Error toast + retry; refetch book; 401 → treat as logged-out |
| Empty address list (authed) | Empty state in sheet + Add CTA |
| Offline launch | Use cached `SERVICEABLE_VILLAGE`, skip network |

Loading: spinners on gate + sheet; disabled CTAs while saving.

---

## New dependencies & config

- `expo-location` (Expo SDK 55 compatible). Add config plugin + iOS `NSLocationWhenInUseUsageDescription` and Android `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` to `app.json`. Requires a dev-build rebuild (already using dev client).
- `.env`: add `EXPO_PUBLIC_VILLAGE_API_BASE_URL=https://ub7mvw9ks.bizzz.in`; expose via `env.native.ts` / `env.web.ts` + `WebService`.

No maps library added.

---

## i18n

Add keys to `TRANSLATIONS` (te + en), e.g.: `loc_use_current`, `loc_locating`, `loc_permission_denied`, `loc_open_settings`, `not_serviceable_title`, `not_serviceable_sub`, `notify_me`, `try_another_location`, `select_address`, `add_new_address`, `deliver_here`, `no_saved_addresses`, `tag_home`, `tag_work`, `tag_other`, `house_street`, `area_optional`, `landmark`, `pincode`, `set_default`, `save_address`, field validation messages.

---

## Testing

- `LocationService`: mock `expo-location` — granted/denied/timeout.
- `locationApi`: mock axios — find-by-location serviceable / empty / error; CRUD shapes.
- `mappers`: DTO ↔ domain round-trip.
- `RemoteAddressRepository`: create/update/delete/list against mocked axios.
- Viewmodels: gate state machine transitions; form validation rules; login-gating (book hidden when logged out).
- Manual smoke: launch → Enable → serviceable → header → relaunch (cached, no gate); not-serviceable path; logged-out hides Add New.

---

## Risks / open items

- **Serviceability is HTTP-status driven**: any 2xx from `find-by-location` → serviceable → load home. Village body is parsed only for the header name; mapper coded defensively (probe `id/_id/name/villageName/pincode`) and degrades to a generic header label if shape differs. Confirm shape against a live call during implementation.
- **Login gating**: address book + Add New only shown when `isAuthenticated`. Login is mocked today, so the book stays hidden until real auth provides a token; serviceability/location flow works regardless.
- **Search is GPS-only when logged out** (decided): only public endpoint is `find-by-location` (lat/lng). Logged-out search is disabled/empty; primary path is GPS. "Use another pincode" re-triggers GPS (authed users get village search later). The search bar still renders for visual parity but is inert when logged out.
- **Accent color: green-600** (decided) — keep Village Delivery brand, not the reference pink.
