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
- Serviceability check via `find-by-location`; serviceable → enter app, not-serviceable → Zepto-style screen.
- Hard gate: dashboard blocked until a serviceable village is confirmed.
- Village name in home header; tap → address bottom sheet.
- Address bottom sheet: list saved addresses, highlight default, Deliver Here / Edit / Delete / Add New.
- Add/Edit address form: current-location autofill, manual fields, tag (Home/Work/Other), validation.
- Local-first persistence (zustand + SecureStore), cached last-selected for fast launch.
- Real typed endpoint functions for address CRUD + village search, dormant until auth exists.
- Telugu + English strings for all new UI.
- Edge cases: permission denied, GPS off, not serviceable, network failure, empty address list, offline (cached village).

**Out of scope**
- Interactive Google Map / draggable pin (expo-location only, no maps lib).
- Real login / token / `customerId` (separate auth work). Address CRUD persists locally until then.
- `addressImage` upload, address verification, household/shared addresses.
- Backend tag field (tag is local-only).

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
│   ├── locationApi.ts          ← typed HTTP calls (find-by-location [live], CRUD + village search [dormant])
│   ├── LocationService.ts      ← expo-location wrapper: permission, getCurrentPosition
│   ├── AddressRepository.ts     ← interface + LocalAddressRepository (zustand/SecureStore) impl
│   └── mappers.ts              ← API DTO ↔ domain model
├── domain/
│   └── models.ts               ← Village, Address, AddressTag, ServiceabilityStatus
├── viewmodel/
│   ├── useLocationGateViewModel.ts   ← permission → GPS → find-by-location → status
│   ├── useAddressBookViewModel.ts    ← list/select/delete saved addresses
│   └── useAddressFormViewModel.ts    ← add/edit form state + validation + save
└── views/
    ├── LocationGateScreen.tsx        ← full-screen gate (permission / loading / not-serviceable)
    ├── AddressBottomSheet.tsx        ← saved-address list (wraps VillageBottomSheet)
    ├── AddressFormScreen.tsx         ← add/edit form
    └── components/
        ├── AddressRow.tsx
        ├── TagSelector.tsx           ← Home / Work / Other
        └── NotServiceableView.tsx

src/core/store/useLocationStore.ts    ← serviceable village, selected address, saved addresses, status
```

**Routes (expo-router)**
- `app/location/index.tsx` → `LocationGateScreen` (registered in root `Stack`).
- `app/address/add.tsx` → `AddressFormScreen` (add mode; edit via `?id=` param).
- `AddressBottomSheet` is a component opened from the home header (not a route).

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
  id: string;          // local uuid until backend id exists
  remoteId?: string;   // backend _id once synced
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
1. Read cached serviceable village (SecureStore). If present → status=serviceable, app proceeds.
2. Else request location permission (expo-location).
   - granted → getCurrentPositionAsync → POST find-by-location {lat,lng}
       → village returned  → cache + status=serviceable
       → empty / 4xx "none" → status=not_serviceable
       → network error      → status=error (retry CTA)
   - denied → status=idle with manual fallback:
       • choose from saved/recent villages (local), or
       • village text search (GET /villages) — auth-gated, disabled until real auth.
```

### Hard gate (in `AppScreen`)
`AppScreen` already guards routing. Extend it: after auth check, read `useLocationStore.hasServiceableVillage`. If false and not already on `location`, `router.replace('/location')`. Dashboard/cart/etc. remain blocked until a serviceable village is set. Selecting a saved address or confirming current location sets the village and releases the gate.

### Address book (`useAddressBookViewModel`)
- Reads `savedAddresses` + `selectedAddressId` from `useLocationStore`.
- `select(id)` → sets selected + updates header + caches; `delete(id)`; `setDefault(id)`.
- Backed by `AddressRepository`: `LocalAddressRepository` (now) persists to SecureStore; swap to `RemoteAddressRepository` (uses `locationApi`) when `customerId` + token present.

### Add/Edit (`useAddressFormViewModel`)
- On open (add): autofill from current GPS → `find-by-location` to resolve `villageId`/`villageName`/pincode; user fills `addressLine1` (house+street), `addressLine2` (area), `landmark`, optional `pincode`; pick tag; toggle default.
- Validation (block save): `addressLine1` non-empty, a resolved `village`, `pincode` 6 digits if provided. Inline errors.
- Save → repository.create/update → update store → close → returns to selection.

---

## Persistence (SecureStore via StoredPrefs)

New keys in `StorageKeys`:
- `SERVICEABLE_VILLAGE` — cached `Village` (fast launch).
- `SAVED_ADDRESSES` — `Address[]`.
- `SELECTED_ADDRESS_ID` — last-selected (cache for fast access).

Use `StoredPrefs.setCustomData/getCustomData` (JSON). `useLocationStore` hydrates from these on app start (mirrors `loadLocale`).

---

## UI / UX (Zepto/Blinkit patterns)

- **LocationGateScreen**: brand header, large `MapPin`, primary CTA "Use current location" (green-600), states: requesting / locating (spinner) / not-serviceable / error. Secondary: manual village pick.
- **NotServiceableView**: friendly illustration/emoji, "We're not in your area yet 🚧", subtext, "Notify me" (stub) + "Try another location".
- **AddressBottomSheet**: wraps existing `VillageBottomSheet`. Header "Select delivery address". Saved rows with tag icon, address text, selected row highlighted (green-50 bg + green-600 check). Sticky "+ Add New Address". Each row: tap = select, edit (pencil) + delete (trash) actions. Empty state: "No saved addresses" + Add CTA.
- **AddressFormScreen**: read-only village/pincode chip (from find-by-location), inputs for the fields, `TagSelector` segmented Home/Work/Other, default toggle, sticky "Save address" CTA. Errors inline.
- **Header hook**: `HomeScreen` location row (currently hardcoded `రాజంపేట · 25 min`, no-op `TouchableOpacity`) wired to show `selectedAddress?.villageName ?? serviceableVillage.name` and `onPress` → open `AddressBottomSheet`.

Brand tokens reused: green-600 CTA, green-50 accent, slate text, `FontFamily`, Telugu font for `te`.

---

## Error handling & loading states

| Case | Handling |
|---|---|
| Permission denied | Gate stays; show manual fallback + "Open settings" (Linking) |
| GPS unavailable / timeout | status=error, "Couldn't get location" + Retry |
| find-by-location network fail | status=error + Retry; if cached village exists, allow proceeding offline |
| Not serviceable (empty village) | NotServiceableView |
| Address CRUD fail (auth/network) | Local repo: optimistic local write + toast; remote repo (later): rollback + error toast |
| Empty address list | Empty state in sheet |
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
- `LocalAddressRepository`: create/update/delete/setDefault against in-memory storage stub.
- Viewmodels: gate state machine transitions; form validation rules.
- Manual smoke: launch → permission → serviceable → header name → sheet → add → select → relaunch (cached, no gate).

---

## Risks / open items

- **Village response shape** for `find-by-location` not fully documented; mapper coded defensively (probe `id/_id/name/villageName/pincode`), to confirm against a live call during implementation.
- **Auth dependency**: address CRUD + village search inert until real login provides token + `customerId`. `RemoteAddressRepository` written but gated behind an `isAuthed` check; until then `LocalAddressRepository` is used.
- **Manual path under denied permission** is limited without auth (search disabled) — relies on saved/recent villages.
