# Village Search in Select Location — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Select Location screen's search field functional — type a village name, see matching villages from `GET /app/villages?search=…`, tap one to set it as the active serviceable store and go home.

**Architecture:** Follows the existing data → store → viewmodel → view layering. A public `searchVillages()` data function (mirrors `find-by-location`) feeds a react-query hook gated at 3+ chars; a 500ms debounce in the screen drives it. Selecting a result reuses the store's serviceable-village + recents machinery (no `find-by-location` round-trip, since results carry `storeId`).

**Tech Stack:** React Native + Expo Router, Zustand (`useLocationStore`), @tanstack/react-query, Jest, NativeWind, i18n via `useTranslation`/`TRANSLATIONS`.

**Spec:** `docs/superpowers/specs/2026-07-15-village-search-select-location-design.md`

---

## File Structure

- **Modify** `src/features/location/data/mappers.ts` — add `mapVillageList()`.
- **Modify** `src/features/location/data/__tests__/mappers.test.ts` — tests for `mapVillageList()`.
- **Modify** `src/features/location/data/locationApi.ts` — add `searchVillages()`.
- **Modify** `src/base/query/queryKeys.ts` — add `villages.search(term)` key.
- **Create** `src/features/location/data/queries/useVillageSearchQuery.ts` — react-query hook.
- **Modify** `src/core/store/useLocationStore.ts` — add `selectVillage()` action (+ interface entry).
- **Modify** `src/features/location/viewmodel/useLocationViewModel.ts` — expose `selectVillage`.
- **Modify** `src/base/constants/translations.ts` — new i18n keys.
- **Modify** `src/features/location/views/SelectLocationScreen.tsx` — real `TextInput`, debounce, results section.

---

## Task 1: `mapVillageList()` mapper

**Files:**
- Modify: `src/features/location/data/mappers.ts`
- Test: `src/features/location/data/__tests__/mappers.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/features/location/data/__tests__/mappers.test.ts`. First update the import line at the top of the file from:

```ts
import { mapAddress } from '../mappers';
```

to:

```ts
import { mapAddress, mapVillageList } from '../mappers';
```

Then append at the end of the file:

```ts
// Shape returned by GET /app/villages?search=… (array of village objects).
const apiVillage = {
  _id: '691860854a92a246c6456b98',
  title: 'Mittoor',
  storeId: '68989c821388764b3a92f0dd',
  pincode: '517001',
  defaultLocation: { latitude: 13.36, longitude: 79.02 },
};

describe('mapVillageList', () => {
  it('maps a bare array of villages', () => {
    const out = mapVillageList([apiVillage]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: '691860854a92a246c6456b98',
      name: 'Mittoor',
      storeId: '68989c821388764b3a92f0dd',
      pincode: '517001',
      latitude: 13.36,
      longitude: 79.02,
    });
  });

  it('unwraps a { data: [...] } envelope', () => {
    expect(mapVillageList({ data: [apiVillage] })).toHaveLength(1);
  });

  it('unwraps items / results envelopes', () => {
    expect(mapVillageList({ items: [apiVillage] })).toHaveLength(1);
    expect(mapVillageList({ results: [apiVillage] })).toHaveLength(1);
  });

  it('returns [] for empty or garbage input', () => {
    expect(mapVillageList([])).toEqual([]);
    expect(mapVillageList(null)).toEqual([]);
    expect(mapVillageList({ nope: true })).toEqual([]);
  });

  it('drops elements that map to null', () => {
    expect(mapVillageList([{ foo: 'bar' }, apiVillage])).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/location/data/__tests__/mappers.test.ts -t mapVillageList`
Expected: FAIL — `mapVillageList is not a function` (import undefined).

- [ ] **Step 3: Implement `mapVillageList`**

Append to `src/features/location/data/mappers.ts` (after `mapVillage`, before or after `mapAddressList` — end of file is fine):

```ts
/** Map an array (or wrapped array) of village-shaped objects, dropping nulls. */
export function mapVillageList(raw: any): Village[] {
  const data = raw?.data ?? raw;
  const arr = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map(mapVillage).filter((v): v is Village => v !== null);
}
```

(`Village` is already imported at the top of `mappers.ts`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/location/data/__tests__/mappers.test.ts`
Expected: PASS (existing `mapAddress` tests + new `mapVillageList` tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/location/data/mappers.ts src/features/location/data/__tests__/mappers.test.ts
git commit -m "feat: add mapVillageList mapper for village search"
```

---

## Task 2: `searchVillages()` data function

**Files:**
- Modify: `src/features/location/data/locationApi.ts`

No new unit test: this is a thin `apiClient.getWithoutAuth` + `mapVillageList` composition (mapper is covered in Task 1, and there is no HTTP mock harness in this codebase — `find-by-location` is likewise untested at the api layer). Verification is by type-check.

- [ ] **Step 1: Add the function**

In `src/features/location/data/locationApi.ts`, the imports already include `mapVillage`, `mapAddressList`, `mapAddress` from `./mappers` and `Village` from `../domain/models`. Update the mappers import to add `mapVillageList`:

Change:

```ts
import { mapVillage, mapAddressList, mapAddress } from './mappers';
```

to:

```ts
import { mapVillage, mapVillageList, mapAddressList, mapAddress } from './mappers';
```

Then add this function (place it right after `findByLocation`, before `listAddresses`):

```ts
/**
 * Village-directory search. Public (no auth), like find-by-location — the app's
 * platform headers are attached centrally by apiClient. Used pre-serviceability
 * so a user can pick their village by name.
 */
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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `locationApi.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/data/locationApi.ts
git commit -m "feat: add searchVillages api for village directory search"
```

---

## Task 3: `villages.search` query key + react-query hook

**Files:**
- Modify: `src/base/query/queryKeys.ts`
- Create: `src/features/location/data/queries/useVillageSearchQuery.ts`

- [ ] **Step 1: Add the query key**

In `src/base/query/queryKeys.ts`, add a `villages` block after the `orders` block (before the closing `} as const;`):

```ts
  villages: {
    all: ['villages'] as const,
    search: (term: string) => [...queryKeys.villages.all, 'search', { term }] as const,
  },
```

- [ ] **Step 2: Create the hook**

Create `src/features/location/data/queries/useVillageSearchQuery.ts`:

```ts
// src/features/location/data/queries/useVillageSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { searchVillages } from '../locationApi';

/** Village-directory search. Enabled only at 3+ trimmed characters. */
export const useVillageSearchQuery = (term: string, limit = 24) => {
  const trimmed = term.trim();

  return useQuery({
    queryKey: [...queryKeys.villages.search(trimmed), { limit }],
    queryFn: () => searchVillages(trimmed, { limit }),
    enabled: trimmed.length >= 3,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/base/query/queryKeys.ts src/features/location/data/queries/useVillageSearchQuery.ts
git commit -m "feat: add useVillageSearchQuery hook"
```

---

## Task 4: `selectVillage()` store action

**Files:**
- Modify: `src/core/store/useLocationStore.ts`

- [ ] **Step 1: Add the action to the `LocationActions` interface**

In `src/core/store/useLocationStore.ts`, add to the `LocationActions` interface (after the `selectRecent` line):

```ts
  selectVillage: (village: Village) => Promise<boolean>;
```

- [ ] **Step 2: Implement the action**

In the store body, add `selectVillage` right after the `selectRecent` implementation (which ends at `await get().addRecent({ ...r, savedAt: Date.now() });` / `},`). Insert before the final `}));`:

```ts
  selectVillage: async (village) => {
    // Search results already carry storeId + defaultLocation, so switch the
    // active store directly — no find-by-location round-trip (like selectRecent).
    await get().setServiceable(village);
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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`Village` is already imported in this file.)

- [ ] **Step 4: Commit**

```bash
git add src/core/store/useLocationStore.ts
git commit -m "feat: add selectVillage store action"
```

---

## Task 5: Expose `selectVillage` from the viewmodel

**Files:**
- Modify: `src/features/location/viewmodel/useLocationViewModel.ts`

- [ ] **Step 1: Select and return the action**

In `src/features/location/viewmodel/useLocationViewModel.ts`, add a selector next to the other action selectors (after the `selectRecent` line):

```ts
  const selectVillage = useLocationStore((s) => s.selectVillage);
```

Then add `selectVillage` to the returned object (after `selectRecent,`):

```ts
    selectVillage,
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/location/viewmodel/useLocationViewModel.ts
git commit -m "feat: expose selectVillage from location viewmodel"
```

---

## Task 6: i18n strings

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add translation keys**

In `src/base/constants/translations.ts`, add these keys near the existing location keys (e.g. right after the `search_address_ph` line at ~171):

```ts
  village_search_ph:      { te: 'ఊరు వెతకండి',                    en: 'Search your village' },
  search_results:         { te: 'వెతుకుడు ఫలితాలు',              en: 'Search results' },
  no_villages_found:      { te: '“{n}” కోసం ఊళ్లు కనబడలేదు',      en: 'No villages found for “{n}”' },
  village_search_error:   { te: 'వెతకడం విఫలమైంది. మళ్లీ ప్రయత్నించండి.', en: "Couldn't search. Try again." },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat: add village search i18n strings"
```

---

## Task 7: Wire the search UI into `SelectLocationScreen`

**Files:**
- Modify: `src/features/location/views/SelectLocationScreen.tsx`

This task replaces the placeholder search `Text` with a real `TextInput`, adds a 500ms debounce, and renders a "Search results" section above the existing sections.

- [ ] **Step 1: Update imports**

At the top of `src/features/location/views/SelectLocationScreen.tsx`:

Change the react import:

```ts
import React from 'react';
```

to:

```ts
import React, { useEffect, useState } from 'react';
```

Change the react-native import to add `ActivityIndicator` and `TextInput`:

```ts
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
```

to:

```ts
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
```

Add `X` to the lucide import:

```ts
import { ArrowLeft, Clock, MapPin, Search } from 'lucide-react-native';
```

to:

```ts
import { ArrowLeft, Clock, MapPin, Search, X } from 'lucide-react-native';
```

Add these two imports alongside the existing feature imports:

```ts
import { interpolate } from '@/src/base/constants/translations';
import { useVillageSearchQuery } from '../data/queries/useVillageSearchQuery';
```

- [ ] **Step 2: Add query state + debounce inside the component**

Inside `SelectLocationScreen`, right after `const book = useAddressBookViewModel();`, add:

```ts
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 500ms debounce: village search fires only after typing settles.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(id);
  }, [query]);

  const villageSearch = useVillageSearchQuery(debouncedQuery);
  const showResults = query.trim().length >= 3;
  const villageResults = villageSearch.data ?? [];
```

- [ ] **Step 3: Replace the placeholder search box with a real input**

Replace this block:

```tsx
          {/* Search Address — visual placeholder (behavior deferred) */}
          <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3.5">
            <Search size={20} color="#94a3b8" />
            <Text className="flex-1 ml-3 text-slate-400 text-base">{t('search_address_ph')}</Text>
          </View>
```

with:

```tsx
          {/* Village search */}
          <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3.5">
            <Search size={20} color="#94a3b8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('village_search_ph')}
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-3 text-slate-900 text-base"
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
```

- [ ] **Step 4: Render the results section above the existing sections**

Immediately after the opening of the content wrapper `<View className="px-5 pt-4">` and **before** the `{/* Use my Current Location */}` block, insert:

```tsx
          {/* Search results (village directory) */}
          {showResults ? (
            <View className="mb-2">
              <View className="flex-row items-center mb-3">
                <Text className="text-slate-500 font-semibold text-xs uppercase">
                  {t('search_results')}
                </Text>
                {villageSearch.isFetching ? (
                  <ActivityIndicator size="small" color="#64748b" className="ml-2" />
                ) : null}
              </View>

              {villageSearch.isError ? (
                <Text className="text-slate-400 text-sm mb-2">{t('village_search_error')}</Text>
              ) : villageResults.length === 0 && !villageSearch.isFetching ? (
                <Text className="text-slate-400 text-sm mb-2">
                  {interpolate(t('no_villages_found'), query.trim())}
                </Text>
              ) : (
                villageResults.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => run(vm.selectVillage(v))}
                    className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-3"
                  >
                    <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center">
                      <MapPin size={18} color="#e11d48" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-slate-900 font-semibold text-base" numberOfLines={1}>
                        {v.name}
                      </Text>
                      {v.secondaryName || v.pincode ? (
                        <Text className="text-slate-400 text-xs" numberOfLines={1}>
                          {[v.secondaryName, v.pincode].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}
```

Note: `run` and `vm` are already defined in this component (`run` navigates home when the promise resolves truthy; `vm.selectVillage` returns `Promise<boolean>`).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: PASS (no regressions; Task 1 tests green).

- [ ] **Step 7: Manual smoke check (device/simulator)**

Run the app, open Select Location, type `mit` (3+ chars). Expected: after ~500ms a "Search results" section appears above Current Location with matching villages; tapping one navigates home with that village active and adds it to Recent locations. Clearing the field (`X`) hides the section and restores the normal layout.

- [ ] **Step 8: Commit**

```bash
git add src/features/location/views/SelectLocationScreen.tsx
git commit -m "feat: wire village search into select location screen"
```

---

## Self-Review Notes

- **Spec coverage:** data layer (Task 2) ✓, `mapVillageList` (Task 1) ✓, `selectVillage` store action (Task 4) ✓, react-query hook + debounce (Task 3 + Task 7 step 2) ✓, UI results-above-sections (Task 7) ✓, states loading/empty/error/hidden (Task 7 step 4) ✓, 3-char gate + 500ms (Task 3 `enabled` + Task 7 debounce) ✓, i18n (Task 6) ✓, tests (Task 1) ✓.
- **Type consistency:** `searchVillages(query, {skip,limit})` → `mapVillageList` → `Village[]`; hook consumes `searchVillages`; `selectVillage(village: Village): Promise<boolean>` used by `run(vm.selectVillage(v))`; `Village` fields referenced in UI (`id`, `name`, `secondaryName`, `pincode`) all exist in `domain/models.ts`.
- **Auth note:** the raw curl 403'd with only `Accept: */*`; if `getWithoutAuth` still 403s on-device (endpoint truly requires auth), the fix is a one-line swap to `apiClient.get` in `searchVillages` — captured here so the executor knows the fallback.
