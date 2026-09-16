# Two-Pane Category PLP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-column category detail screen with a Blinkit-style two-pane PLP: left rail of sub-categories, right product grid driven by the real `all-products` API, sub-category pre-selected from the previous page.

**Architecture:** Tapping a sub-category tile (home or categories page) navigates to `/category-details` with params `categoryId`, `title`, and `subcategories` (JSON of sibling sub-categories). The rewritten screen renders a left `SubcategoryRail` (from params) and a right grid (from `useCategoryProductsQuery`). Selecting a rail item is local state — it refetches products, no navigation.

**Tech Stack:** React Native + Expo Router, NativeWind, @tanstack/react-query, Zustand stores, expo-image.

**Testing note:** This repo has **no unit-test framework** (no jest, zero tests; only `expo lint`). Per the codebase reality, each task is verified with TypeScript typecheck (`npx tsc --noEmit`), `npx expo lint`, and a manual runtime check. Do **not** add a test harness — that is out of scope.

**Spec:** `docs/superpowers/specs/2026-06-19-snacks-drinks-two-pane-plp-design.md`

---

### Task 1: Category products API

**Files:**
- Create: `src/features/home/data/categoryProductsApi.ts`

Reuses `mapProduct` from `homeLayoutMapper.ts` (already exported) and mirrors the header/auth style of `homeLayoutApi.ts`. The `all-products` payload has **no `stock` field**, so `mapProduct` would mark everything out-of-stock — override `inStock` to `true` when the raw item omits `stock`.

- [ ] **Step 1: Create the API module**

```typescript
// src/features/home/data/categoryProductsApi.ts
//
// Fetches the product list for a single (sub-)category via the flattened
// all-products endpoint. Public-ish endpoint keyed by the x-store-id header.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeProduct } from './homeLayout.types';
import { mapProduct } from './homeLayoutMapper';

export interface CategoryProductsResult {
  products: HomeProduct[];
  total: number;
  name: string;
}

export async function getCategoryProducts(
  storeId: string,
  categoryId: string,
  skip = 0,
  limit = 24,
): Promise<CategoryProductsResult> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/category/flattened/all-products/${categoryId}?skip=${skip}&limit=${limit}`,
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
    name: String(meta?.name ?? ''),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `categoryProductsApi.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/data/categoryProductsApi.ts
git commit -m "feat(category): add flattened all-products API"
```

---

### Task 2: Category products query hook

**Files:**
- Create: `src/features/home/data/queries/useCategoryProductsQuery.ts`

Reuses the existing `queryKeys.products.byCategory(categoryId)` key, scoped by `storeId` and `limit`. Disabled until both `categoryId` and `storeId` exist.

- [ ] **Step 1: Create the hook**

```typescript
// src/features/home/data/queries/useCategoryProductsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { getCategoryProducts } from '../categoryProductsApi';

export const useCategoryProductsQuery = (categoryId?: string, limit = 24) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);

  return useQuery({
    queryKey: [...queryKeys.products.byCategory(categoryId ?? ''), { storeId, limit }],
    queryFn: () => getCategoryProducts(storeId!, categoryId!, 0, limit),
    enabled: !!categoryId && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `useCategoryProductsQuery.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/data/queries/useCategoryProductsQuery.ts
git commit -m "feat(category): add useCategoryProductsQuery"
```

---

### Task 3: DynamicProductCard width prop

**Files:**
- Modify: `src/features/home/views/home/components/DynamicProductCard.tsx`

The card is hardcoded `width: 150` (good for the home carousel). Add an optional `width` prop so the PLP grid can render full-width cells. Default keeps existing callers unchanged.

- [ ] **Step 1: Add the prop to the interface**

Replace:
```typescript
interface Props {
  product: HomeProduct;
}

export const DynamicProductCard = ({ product }: Props) => {
```
with:
```typescript
interface Props {
  product: HomeProduct;
  width?: number | string;
}

export const DynamicProductCard = ({ product, width = 150 }: Props) => {
```

- [ ] **Step 2: Use the prop in the root View**

Replace:
```typescript
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width: 150 }}>
```
with:
```typescript
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width }}>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Existing `DynamicProductCard` usages still compile (prop is optional).

- [ ] **Step 4: Commit**

```bash
git add src/features/home/views/home/components/DynamicProductCard.tsx
git commit -m "feat(category): make DynamicProductCard width configurable"
```

---

### Task 4: SubcategoryRail component

**Files:**
- Create: `src/features/home/views/category-details/components/SubcategoryRail.tsx`

Left navigation column. Vertical scroll; active item gets white background, green left border, green bold label.

- [ ] **Step 1: Create the component**

```typescript
// src/features/home/views/category-details/components/SubcategoryRail.tsx

import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CategoryItem } from '../../../data/homeLayout.types';

interface Props {
  items: CategoryItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const SubcategoryRail = ({ items, selectedId, onSelect }: Props) => (
  <View style={{ width: 84, backgroundColor: '#f1f5f9' }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => onSelect(item.id)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 4,
              alignItems: 'center',
              backgroundColor: active ? '#ffffff' : 'transparent',
              borderLeftWidth: 3,
              borderLeftColor: active ? '#16a34a' : 'transparent',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: active ? '#dcfce7' : '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 48, height: 48 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 10,
                lineHeight: 12,
                textAlign: 'center',
                color: active ? '#15803d' : '#475569',
                fontWeight: active ? '700' : '500',
              }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `SubcategoryRail.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/category-details/components/SubcategoryRail.tsx
git commit -m "feat(category): add SubcategoryRail nav column"
```

---

### Task 5: Rewrite useCategoryDetailsViewModel

**Files:**
- Modify (full rewrite): `src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts`

Drops static `villageData`, sort, and variant logic. Becomes params-driven: rail from `subcategories`, selection in local state seeded from `categoryId`, products from `useCategoryProductsQuery`, simple grow-the-window load-more.

- [ ] **Step 1: Replace the whole file**

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { CategoryItem } from '@/src/features/home/data/homeLayout.types';
import { useCategoryProductsQuery } from '@/src/features/home/data/queries/useCategoryProductsQuery';

export const useCategoryDetailsViewModel = () => {
  const params = useLocalSearchParams<{
    categoryId?: string;
    title?: string;
    subcategories?: string;
  }>();
  const cartCount = useVillageStore((s) => s.cartCount());

  // Rail = sibling sub-categories passed from the previous page. Fall back to a
  // single item built from the route when the param is missing/malformed.
  const railItems = useMemo<CategoryItem[]>(() => {
    try {
      const parsed = params.subcategories ? JSON.parse(params.subcategories) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed as CategoryItem[];
    } catch {
      // ignore malformed param
    }
    if (params.categoryId) {
      return [{ id: params.categoryId, title: params.title ?? '', imageUrl: '' }];
    }
    return [];
  }, [params.subcategories, params.categoryId, params.title]);

  const [selectedId, setSelectedId] = useState<string | undefined>(
    params.categoryId ?? railItems[0]?.id,
  );

  // Grow-the-window pagination: refetch a larger first page on "load more".
  const [limit, setLimit] = useState(24);
  useEffect(() => {
    setLimit(24);
  }, [selectedId]);

  const query = useCategoryProductsQuery(selectedId, limit);
  const products = query.data?.products ?? [];
  const total = query.data?.total ?? 0;

  const selectedItem = railItems.find((i) => i.id === selectedId) ?? null;

  return {
    title: params.title ?? '',
    railItems,
    selectedId,
    select: setSelectedId,
    selectedItem,
    products,
    total,
    hasMore: total > products.length,
    loadMore: () => setLimit((l) => l + 24),
    loading: query.isLoading,
    loadingMore: query.isFetching && !query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    cartCount,
  };
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `CategoryDetailsScreen.tsx` (it still references the old VM shape — fixed in Task 6). No errors in the VM file itself.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts
git commit -m "refactor(category): params-driven two-pane view model"
```

---

### Task 6: Rewrite CategoryDetailsScreen as two-pane

**Files:**
- Modify (full rewrite): `src/features/home/views/category-details/CategoryDetailsScreen.tsx`

Header (back + department title + count), left `SubcategoryRail`, right grid of `DynamicProductCard` (2 columns), with loading / empty / error states, a "Load more" footer, and the `FloatingCartPill`.

- [ ] **Step 1: Replace the whole file**

```typescript
import { ArrowLeft, Search } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FloatingCartPill } from '@/src/shared/components';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { SubcategoryRail } from './components/SubcategoryRail';
import { useCategoryDetailsViewModel } from '../../viewmodel/categories/useCategoryDetailsViewModel';

export const CategoryDetailsScreen = () => {
  const router = useRouter();
  const vm = useCategoryDetailsViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }, []);

  const headerTitle = vm.title || vm.selectedItem?.title || 'Category';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
              <ArrowLeft size={20} color="#0f172a" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>
                {headerTitle}
              </Text>
              {vm.total > 0 ? (
                <Text className="text-slate-400 text-[11px]">{vm.total} items</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/search' as any)}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <Search size={18} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Two-pane body */}
      <Animated.View style={{ flex: 1, flexDirection: 'row', transform: [{ translateX: slideAnim }] }}>
        <SubcategoryRail items={vm.railItems} selectedId={vm.selectedId} onSelect={vm.select} />

        <View style={{ flex: 1 }}>
          {vm.loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : vm.error ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-slate-500 text-sm text-center mb-4">Couldn’t load products.</Text>
              <TouchableOpacity onPress={() => vm.refetch()} className="bg-green-600 rounded-xl px-5 py-2.5">
                <Text className="text-white font-bold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : vm.products.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-3xl mb-2">🧺</Text>
              <Text className="text-slate-500 text-sm text-center">No products in this category yet.</Text>
            </View>
          ) : (
            <FlatList
              data={vm.products}
              keyExtractor={(p) => p.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={{ gap: 10, paddingHorizontal: 10 }}
              contentContainerStyle={{ paddingVertical: 10, gap: 10, paddingBottom: 96 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <DynamicProductCard product={item} width="100%" />
                </View>
              )}
              ListFooterComponent={
                vm.hasMore ? (
                  <View className="px-10 pt-3">
                    <TouchableOpacity
                      onPress={vm.loadMore}
                      disabled={vm.loadingMore}
                      className="border border-green-600 rounded-xl py-2.5 items-center"
                    >
                      {vm.loadingMore ? (
                        <ActivityIndicator color="#16a34a" />
                      ) : (
                        <Text className="text-green-700 font-bold text-sm">Load more</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Animated.View>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={() => router.push('/cart')} bottomOffset={0} />
      )}
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `CategoryDetailsScreen.tsx` or the VM. (Nav-param wiring in `HomeSections` is Task 7; existing `goCategory` still compiles because it only passes `categoryId`.)

- [ ] **Step 3: Lint**

Run: `npx expo lint`
Expected: no new errors in the changed files.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/views/category-details/CategoryDetailsScreen.tsx
git commit -m "feat(category): two-pane PLP screen"
```

---

### Task 7: Wire navigation params (pass siblings)

**Files:**
- Modify: `src/features/home/views/home/components/CategoryGrid.tsx`
- Modify: `src/features/home/views/home/components/HomeSections.tsx`

`CategoryGrid` must hand the section to its parent so the rail siblings travel with the tap.

- [ ] **Step 1: Widen CategoryGrid's onPressItem signature**

In `CategoryGrid.tsx`, replace:
```typescript
interface Props {
  section: CategorySection;
  onPressItem: (item: CategoryItem) => void;
}
```
with:
```typescript
interface Props {
  section: CategorySection;
  onPressItem: (item: CategoryItem, section: CategorySection) => void;
}
```

- [ ] **Step 2: Pass the section on press**

In `CategoryGrid.tsx`, replace:
```typescript
            onPress={() => onPressItem(item)}
```
with:
```typescript
            onPress={() => onPressItem(item, section)}
```

- [ ] **Step 3: Build the nav params in HomeSections**

In `HomeSections.tsx`, update the import to include `CategorySection`:
```typescript
import { CategoryItem, CategorySection, HomeSection } from '../../../data/homeLayout.types';
```
Then replace:
```typescript
  const goCategory = (item: CategoryItem) =>
    router.push({ pathname: '/category-details', params: { categoryId: item.id } } as any);
```
with:
```typescript
  const goCategory = (item: CategoryItem, section: CategorySection) =>
    router.push({
      pathname: '/category-details',
      params: {
        categoryId: item.id,
        title: section.title,
        subcategories: JSON.stringify(section.items),
      },
    } as any);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `goCategory` now matches the widened `onPressItem` type.

- [ ] **Step 5: Lint**

Run: `npx expo lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/views/home/components/CategoryGrid.tsx src/features/home/views/home/components/HomeSections.tsx
git commit -m "feat(category): pass sibling sub-categories to PLP nav"
```

---

### Task 8: Manual end-to-end verification

**Files:** none (runtime check)

- [ ] **Step 1: Launch the app**

Run: `npx expo start` and open on a simulator/device with a serviceable location set (so `storeId` exists).

- [ ] **Step 2: Verify the flows**

Confirm each:
- Categories tab → tap a tile under "Snacks & Drinks" → PLP opens; that sub-category is active in the rail; rail shows its siblings; right grid populated from the API; header shows department title + total count.
- Tap another rail item → grid swaps, active styling moves, no navigation.
- Home tab "Shop By Category" → tap a tile → same PLP behavior (rail = that grid's items).
- Empty sub-category → empty state. Turn off network / use a bad store → error + Retry.
- Tap ADD on a product → floating cart pill appears/increments.
- "Load more" appears when total > loaded; tapping loads more.
- Back returns to the previous screen.

- [ ] **Step 3: Final typecheck + lint sweep**

Run: `npx tsc --noEmit && npx expo lint`
Expected: clean (no new errors from this feature).
