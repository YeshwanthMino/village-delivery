# Profile Page Redesign + Address Edit/Delete — Design

**Date:** 2026-06-22
**Branch:** feat/address-location-flow
**Status:** Approved design, pending implementation plan

## Goal

Redesign the Profile screen from a single centered greeting + logout into a
proper **flat menu list** that surfaces every account and support action in one
place. Additionally, add **Edit** and **Delete** actions for saved delivery
addresses.

## Scope

In scope:

- Rebuild `ProfileScreen` as a flat scrollable menu (signed-in and signed-out states).
- New reusable `ProfileRow` component.
- New `AboutScreen` + `app/about.tsx` route (in-app static content).
- Wire rows to: Orders tab, address manager, About, native share, WhatsApp, logout.
- App-version footer sourced from `expo-constants`.
- Add **Edit** and **Delete** affordances to saved addresses in the address
  manager's list mode (inline icon buttons per row).

Out of scope:

- No changes to Orders screen internals.
- No new standalone address-book screen — reuse the existing address manager.
- WhatsApp number (`Support.WHATSAPP_NUMBER`) and the share store-link remain
  placeholders already present in the codebase.

## Part 1 — Profile screen (flat list, "layout B")

### Signed-in layout (top → bottom, single ScrollView)

1. **Header card** — green avatar circle with the user's first initial, display
   name (`displayName`), and phone (`displayPhone`). Reuses the existing helpers.
2. **Account rows**
   - 📦 **Your orders** → `router.push('/(dashboard)/orders')`
   - 📍 **Address book** → `router.push('/address/add')` (existing manager;
     opens list mode when addresses exist, add mode otherwise)
3. **General rows**
   - 🔗 **Share the app** → `Share.share({ message })`
   - ℹ️ **About us** → `router.push('/about')`
   - 💬 **WhatsApp support** → existing `openWhatsApp()` logic (green/highlighted variant)
4. **Logout row** — `danger` variant; existing confirm `Alert` → `logout()`.
5. **Footer** — centered `Version <x.y.z>` read from `expo-constants`.

Bottom padding continues to clear the floating tab bar
(`TAB_BAR_CONTENT_HEIGHT + bottom + 8`).

### Signed-out layout

- Sign-in card at top (existing `sign_in_title` / `sign_in_subtitle` /
  `sign_in_btn`, opens `LoginBottomSheet`).
- **Only public rows** rendered: About us, Share the app, WhatsApp support.
- Account rows (orders, address book) and Logout are **hidden**.
- Version footer always shown.

### Components

- **`src/features/profile/views/ProfileScreen.tsx`** — orchestrator. Holds
  auth-gated row config, handlers (`handleLogout`, `openWhatsApp`,
  `handleShare`), and renders header/footer + `ProfileRow`s.
- **`src/features/profile/views/components/ProfileRow.tsx`** (new) — presentational row.
  - Props: `icon: React.ReactNode`, `label: string`, `onPress: () => void`,
    `variant?: 'default' | 'whatsapp' | 'danger'`, `showChevron?: boolean` (default `true`).
  - Layout: leading icon chip, label (honors Telugu font via the existing
    `locale === 'te'` font pattern), trailing chevron (hidden for `danger`).
  - Variants: `default` (slate), `whatsapp` (green bg/border/text), `danger`
    (red text + red icon chip).
- **`src/features/profile/views/AboutScreen.tsx`** (new) — static info screen:
  app name, tagline, a short mission paragraph, contact (WhatsApp + email), and
  version. Bilingual via translation keys with default copy (editable later).
  Standard back header (`ArrowLeft`, `router.back()`), matching existing screens.
- **`app/about.tsx`** (new route) — renders `<AboutScreen />`.

### Share behavior

```ts
import { Share } from 'react-native';
await Share.share({ message: t('share_message') });
```

`share_message` includes app name + a **placeholder store link**
(e.g. `https://village.app`) to be replaced before release.

### Version source

```ts
import Constants from 'expo-constants';
const version = Constants.expoConfig?.version ?? '1.0.0';
```

(`expo-constants` `~55.0.16` is already a dependency; `app.json` version is `1.0.0`.)

### i18n (new keys in `src/base/constants/translations.ts`, te + en)

- `profile_orders`, `profile_address_book`, `profile_share_app`, `profile_about`,
  `profile_version_label` (WhatsApp row reuses existing `whatsapp_chat`)
- `share_message`
- About screen: `about_title`, `about_tagline`, `about_body`, `about_contact`

Reuse existing: `nav_orders`, `whatsapp_chat`, `profile_logout_btn`,
`sign_in_title`/`sign_in_subtitle`/`sign_in_btn`, `profile_greeting`.

## Part 2 — Edit & Delete saved addresses

Affordance: **inline icon buttons** (✏️ edit, 🗑️ delete) on the right of each
saved-address row in the address manager's **list mode**
(`DeliveryAddressScreen`). Tapping the row body still selects the address as the
delivery address; the two icon buttons have their own hit targets and do **not**
trigger selection. These actions apply wherever the manager is used (Profile
address book **and** the Cart address picker — addresses are managed in one place).

### Delete

- Trash icon → confirm `Alert` (cancel / destructive delete).
- On confirm: `deleteAddress(id)` (already in `locationApi`), then refresh the
  saved list. If the deleted address was the selected one, clear the selection.
- The `useAddressBookViewModel.remove` already wraps `deleteAddress` + list
  update and can be reused or mirrored.

### Edit

- Pencil icon → enter the manager's **add/map form pre-filled** with the chosen
  address (line 1, landmark, tag, default flag, and map region/village from the
  address coordinates).
- Saving in edit mode calls **`updateAddress(id, input)`** (already in
  `locationApi`) instead of `createAddress`, then refreshes the list and returns
  to list mode.
- `useAddAddressViewModel` gains an edit mode: a way to seed form + map state
  from an existing `Address`, and a flag so `save()` routes to `updateAddress`
  vs `createAddress`. The `saveNewAddress` helper (and its test) is extended or
  paralleled to cover the update path.

### Data layer (already present — no API changes)

- `listAddresses()`, `createAddress(input)`, `updateAddress(id, input)`,
  `deleteAddress(id)` all exist in `src/features/location/data/locationApi.ts`.

### i18n (new keys, te + en)

- `edit_address`, `delete_address`, `delete_address_confirm`

## Error handling

- Share: wrap in try/catch; a user-cancelled share is a no-op (no error UI).
- Delete: on API failure show an `Alert`; keep the row.
- Edit save: reuse the form's existing `error` state/messaging.
- WhatsApp / logout: unchanged from current implementation.

## Testing

- Extend/parallel `saveNewAddress.test.ts` to cover the update path.
- Manual: signed-in vs signed-out row sets; each row navigates correctly;
  share sheet opens; About screen renders; edit pre-fills and updates; delete
  confirms, removes, and clears selection when needed; Telugu locale renders
  with correct fonts.

## Files touched

New:

- `src/features/profile/views/components/ProfileRow.tsx`
- `src/features/profile/views/AboutScreen.tsx`
- `app/about.tsx`

Modified:

- `src/features/profile/views/ProfileScreen.tsx`
- `src/features/location/views/DeliveryAddressScreen.tsx` (list-mode row actions, edit entry)
- `src/features/location/viewmodel/useAddAddressViewModel.ts` (edit mode)
- `src/features/location/data/saveNewAddress.ts` (+ test) — update path
- `src/base/constants/translations.ts` (new keys)
