# Village Search in Select Location — Design

**Date:** 2026-07-15
**Status:** Approved (design)

## Problem

The Select Location screen (`SelectLocationScreen.tsx`) has a search field that is
currently a **visual placeholder** — a static `Text` labelled "behavior deferred".
Users can detect their location via GPS, pick on a map, or choose a saved/recent
location, but they cannot search for a village by name.

We want to wire that field to the village-directory endpoint so a user can type a
village name, see matching villages, and select one to become the active
serviceable store.

## Endpoint

```
GET https://<host>/app/villages?search=mittoor&sort=_id%3Adesc&skip=0&limit=24
Accept: */*
```

Returns a list of villages shaped like the objects `mapVillage()` already handles
(`_id`, `title`, `storeId`, `defaultLocation`, `pincode`).

A raw curl with only `Accept: */*` returns **403** — this is attributed to the
missing app platform headers that `apiClient` attaches centrally (the same
mechanism under which the public `find-by-location` call succeeds). The request is
therefore treated as **public** (no Bearer token), consistent with
`find-by-location`.

## Decisions

- **Auth:** Public — use `apiClient.getWithoutAuth` (mirrors `find-by-location`).
- **Trigger:** Fire only when the trimmed query has **3+ characters**, debounced
  **500ms**.
- **Selecting a result:** Set it as the serviceable village directly (it already
  carries `storeId` + `defaultLocation`, so no `find-by-location` round-trip),
  **add it to recents**, then navigate home. Mirrors `selectRecent()`.
- **Results placement:** A "Search Results" section rendered **above** the
  existing Current Location / Saved Addresses / Recent Locations sections. Those
  sections remain visible; results appear/disappear with the query.

## Architecture

Follows the existing feature layering (data → store → viewmodel → view) and the
react-query + 500ms-debounce pattern already used by `useSearchViewModel`.

### 1. Data layer — `searchVillages()`

Add to `src/features/location/data/locationApi.ts`:

```ts
export async function searchVillages(
  query: string,
  opts: { skip?: number; limit?: number } = {},
): Promise<Village[]> {
  const { skip = 0, limit = 24 } = opts;
  const qs = `search=${encodeURIComponent(query)}&sort=_id%3Adesc&skip=${skip}&limit=${limit}`;
  const data = await apiClient.getWithoutAuth<any>(`${BASE}/app/villages?${qs}`);
  return mapVillageList(data);
}
```

New mapper **`mapVillageList(raw)`** in `mappers.ts`: unwrap `{data}` / `items` /
`results` (same as `mapAddressList`), map each element through the existing
`mapVillage()`, and drop nulls.

### 2. Store action — `selectVillage()`

Add to `useLocationStore` (mirrors `selectRecent()`):

```ts
selectVillage: async (village: Village) => {
  await get().setServiceable(village); // clears selectedAddressId (non-address source)
  if (village.storeId) {
    await get().addRecent({
      storeId: village.storeId,
      villageName: village.name,
      latitude: village.latitude ?? 0,
      longitude: village.longitude ?? 0,
      label: [village.name, village.secondaryName].filter(Boolean).join(', '),
      savedAt: Date.now(),
    });
  }
  return true;
},
```

Returns `boolean` so the screen's existing `run()` helper navigates home on
success. Recents are only written when a `storeId` is present.

### 3. react-query hook + debounce

- **`useVillageSearchQuery(term)`** in `src/features/location/data/queries/`:
  `useQuery` with `enabled: term.trim().length >= 3`,
  `placeholderData: keepPreviousData`, a sensible `staleTime`.
- New key: `queryKeys.villages.search(term)`.
- The 500ms debounce lives in the screen (or a small `useSelectLocationSearch`
  hook), using the same `setTimeout`-in-`useEffect` pattern as
  `useSearchViewModel`. Local `query` drives the `TextInput`; `debouncedQuery`
  feeds the hook.

### 4. UI — `SelectLocationScreen`

- Replace the placeholder `Text` search box with a real **`TextInput`**, with a
  clear (`X`) affordance when non-empty.
- Add a **"Search Results"** section above the existing sections. Existing
  sections stay visible.
- Result rows reuse the existing row styling: a `MapPin` icon, `name` as the
  title, `secondaryName`/pincode as subtitle, `onPress={() => run(vm.selectVillage(v))}`.

### 5. States (within the results section)

- `query.trim().length < 3` → section hidden.
- Loading (debounced fetch in flight) → small spinner/row.
- Empty (≥3 chars, 0 results) → `"No villages found for '<query>'"`.
- Error/403 → subtle `"Couldn't search. Try again."`.
- All copy goes through the existing i18n `t()` (new translation keys).

## Testing (TDD)

- `mappers.test.ts`: `mapVillageList` — wrapped array (`{data:[...]}`), bare array,
  `items`/`results` wrappers, empty, and garbage input.
- `selectVillage`: covered via store test if a harness exists (verifies
  `setServiceable` + `addRecent`, and that recents are skipped when `storeId` is
  absent); otherwise covered through the mapper + a thin api-function test.

## Out of scope (YAGNI)

- Pagination / infinite scroll (single `skip=0&limit=24` page).
- Fuzzy highlighting of the matched substring.
- Reworking the existing GPS-geocode `searchLocation()` path.
