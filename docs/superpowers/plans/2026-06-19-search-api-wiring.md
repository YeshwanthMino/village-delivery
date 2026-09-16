# Search API Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `SearchScreen`'s local static search with live, store-scoped API search against `GET /app/product`.

**Architecture:** `useSearchViewModel` debounces the query (500ms) and feeds it plus the optional `activeCategoryId` to `useProductSearchQuery`, which calls `searchProducts` against `GET /app/product` (keyed by `x-store-id`). Results are `HomeProduct[]` rendered with `DynamicProductCard` (same card the two-pane PLP uses). The static `useProductsQuery`/`ALL_PRODUCTS` path and the `VariantBottomSheet` are removed.

**Tech Stack:** React Native + Expo Router, TanStack Query, TypeScript, existing `apiClient`.

**No automated test framework in this repo.** Verification per task = `npx tsc --noEmit` (no new errors) + the manual checks noted. There are no unit-test steps.

---

### Task 1: Extend `searchProducts` with `categoryId` + options object

**Files:**
- Modify: `src/features/home/data/searchProductsApi.ts`

- [ ] **Step 1: Replace the function signature and body**

Replace the existing `searchProducts` function (currently `(storeId, term, skip = 0, limit = 24)`) with an options-object form that adds optional `categoryId` and omits an empty `search` param:

```ts
export interface SearchProductsResult {
  products: HomeProduct[];
  total: number;
}

export async function searchProducts(
  storeId: string,
  term: string,
  opts: { categoryId?: string; skip?: number; limit?: number } = {},
): Promise<SearchProductsResult> {
  const { categoryId, skip = 0, limit = 24 } = opts;

  const query = new URLSearchParams({
    sort: '_id:desc',
    skip: String(skip),
    limit: String(limit),
  });
  const trimmed = term.trim();
  if (trimmed) query.set('search', trimmed);
  if (categoryId) query.set('categoryId', categoryId);

  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/product?${query.toString()}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );

  const rawProducts: any[] = Array.isArray(data?.products) ? data.products : [];
  const products = rawProducts.map((p) => {
    const mapped = mapProduct(p);
    // Payload omits `stock`; treat absent stock as in-stock.
    return p?.stock === undefined ? { ...mapped, inStock: true } : mapped;
  });

  const meta = Array.isArray(data?.results) ? data.results[0] : undefined;
  return {
    products,
    total: typeof meta?.count === 'number' ? meta.count : products.length,
  };
}
```

(Imports `apiClient`, `WebService`, `HomeProduct`, `mapProduct` are already present from the existing file — leave them.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i searchProductsApi`
Expected: no output (no errors). The query-hook caller is updated in Task 2; a transient error there is fine until then.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/data/searchProductsApi.ts
git commit -m "feat(search): add server-side categoryId param to searchProducts"
```

---

### Task 2: Accept `categoryId` in `useProductSearchQuery`

**Files:**
- Modify: `src/features/home/data/queries/useProductSearchQuery.ts`

- [ ] **Step 1: Replace the hook**

```ts
// src/features/home/data/queries/useProductSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { searchProducts } from '../searchProductsApi';

export const useProductSearchQuery = (
  term: string,
  categoryId?: string,
  limit = 24,
) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);
  const trimmed = term.trim();

  return useQuery({
    queryKey: [...queryKeys.products.search(trimmed), { storeId, categoryId, limit }],
    queryFn: () => searchProducts(storeId!, trimmed, { categoryId, limit }),
    enabled: !!storeId && (trimmed.length > 0 || !!categoryId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i useProductSearchQuery`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/data/queries/useProductSearchQuery.ts
git commit -m "feat(search): pass categoryId through useProductSearchQuery"
```

---

### Task 3: Rewrite `useSearchViewModel` to use the API + debounce

**Files:**
- Modify: `src/features/home/viewmodel/search/useSearchViewModel.ts`

- [ ] **Step 1: Replace the whole file**

```ts
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { useProductSearchQuery } from '@/src/features/home/data/queries/useProductSearchQuery';

export const useSearchViewModel = () => {
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    params.categoryId ?? null,
  );

  // 500ms debounce: API fires only after typing settles.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(id);
  }, [query]);

  const cartCount = useVillageStore((state) => state.cartCount());

  const { data, isLoading, isFetching } = useProductSearchQuery(
    debouncedQuery,
    activeCategoryId ?? undefined,
  );

  const results = data?.products ?? [];

  return {
    query,
    setQuery,
    activeCategoryId,
    categoryName: activeCategoryId ? (params.categoryName ?? activeCategoryId) : null,
    clearCategory: () => setActiveCategoryId(null),
    results,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    cartCount,
  };
};
```

Note: `variantProduct` / `openVariants` / `closeVariants` and the static
`useProductsQuery` + `CATEGORIES` imports are intentionally gone.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i useSearchViewModel`
Expected: no output. (`SearchScreen` still references removed fields — fixed in Task 4. A transient error in `SearchScreen.tsx` is expected here.)

- [ ] **Step 3: Commit**

```bash
git add src/features/home/viewmodel/search/useSearchViewModel.ts
git commit -m "feat(search): drive view model from API search with 500ms debounce"
```

---

### Task 4: Swap `SearchScreen` to `DynamicProductCard` + loading state

**Files:**
- Modify: `src/features/home/views/search/SearchScreen.tsx`

- [ ] **Step 1: Update imports**

Replace the shared-components import line:

```ts
import { FloatingCartPill, ProductCard, VariantBottomSheet } from '@/src/shared/components';
```

with:

```ts
import { FloatingCartPill } from '@/src/shared/components';
import { DynamicProductCard } from '../../home/components/DynamicProductCard';
```

Add `ActivityIndicator` to the `react-native` import (alongside `Text`, `TextInput`, `TouchableOpacity`, `View`).

- [ ] **Step 2: Update the result-count line to use `vm.total`**

Replace:

```tsx
{vm.results.length > 0 && (
  <Text className="text-slate-400 text-xs">
    {vm.results.length} result{vm.results.length !== 1 ? 's' : ''}
  </Text>
)}
```

with:

```tsx
{vm.total > 0 && (
  <Text className="text-slate-400 text-xs">
    {vm.total} result{vm.total !== 1 ? 's' : ''}
  </Text>
)}
```

And update the chip-row visibility condition `{(vm.activeCategoryId || vm.results.length > 0) && (` to `{(vm.activeCategoryId || vm.total > 0) && (`.

- [ ] **Step 3: Replace the Body block**

Replace the entire `{vm.results.length === 0 ? ( ... ) : ( ... )}` body block with a three-way loading / empty / grid:

```tsx
{/* ── Body ── */}
{vm.isLoading ? (
  <View className="flex-1 items-center justify-center">
    <ActivityIndicator color="#15803d" />
  </View>
) : vm.results.length === 0 ? (
  <View className="flex-1 items-center justify-center">
    {vm.query.trim().length > 0 ? (
      <Text className="text-slate-400 text-sm">{interpolate(t('no_results'), vm.query.trim())}</Text>
    ) : (
      <Text className="text-slate-400 text-sm">{t('start_typing')}</Text>
    )}
  </View>
) : (
  <ScrollView
    style={{ flex: 1 }}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ padding: 16, paddingBottom: scrollPadding }}
    keyboardShouldPersistTaps="handled"
  >
    <View className="flex-row flex-wrap gap-3">
      {vm.results.map((product) => (
        <View key={product.id} style={{ width: '47.5%' }}>
          <DynamicProductCard product={product} width="100%" />
        </View>
      ))}
    </View>
  </ScrollView>
)}
```

- [ ] **Step 4: Remove the `VariantBottomSheet` overlay**

Delete this line from the Overlays block:

```tsx
<VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
```

- [ ] **Step 5: Typecheck (whole project clean now)**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors anywhere.

- [ ] **Step 6: Lint**

Run: `npx expo lint 2>&1 | tail -5`
Expected: no new errors for the touched files.

- [ ] **Step 7: Commit**

```bash
git add src/features/home/views/search/SearchScreen.tsx
git commit -m "feat(search): render API results with DynamicProductCard + loading state"
```

---

### Task 5: Manual verification

**Files:** none (runtime check).

- [ ] **Step 1: Run the app**

Run: `npx expo start` (or use the existing run flow). Open the app with a serviceable location set (so `storeId` exists).

- [ ] **Step 2: Verify search-as-you-type**

Open search, type `oil`. Expected: ~500ms after typing stops, a loading spinner then API product cards (real images/prices via `DynamicProductCard`). Result count reflects server `total`.

- [ ] **Step 3: Verify category entry**

Navigate into search from a category (so `categoryId` param is set) with empty query. Expected: category's products load from the API. Clear the category chip → results clear (empty query, no category → `start_typing`).

- [ ] **Step 4: Verify no-results + add-to-cart**

Type a nonsense term → `No results for "..."`. Type a real term, tap `+` on a card → cart count pill increments (DynamicProductCard add-to-cart path).

- [ ] **Step 5: Verify no static fallback**

Confirm with location unset (no `storeId`) the screen shows `start_typing` and makes no static results appear — i.e. `ALL_PRODUCTS` is no longer used.

---

## Self-Review Notes

- **Spec coverage:** server-side `categoryId` (Task 1/2), card swap to `DynamicProductCard` (Task 4), variant sheet removed (Task 4 Step 4), 500ms debounce (Task 3), static path removed (Task 3), loading state (Task 4), result count from server `total` (Task 4). All spec sections mapped.
- **Type consistency:** `searchProducts(storeId, term, { categoryId, skip, limit })` defined Task 1, called identically Task 2. `useProductSearchQuery(term, categoryId?, limit?)` defined Task 2, called Task 3. VM exposes `results`, `total`, `isLoading`, `query`, `setQuery`, `activeCategoryId`, `categoryName`, `clearCategory`, `cartCount` — all consumed by `SearchScreen` in Task 4.
- **DynamicProductCard props:** `{ product: HomeProduct; width }` — `width="100%"` matches the two-pane PLP usage.
- **No placeholders.**
