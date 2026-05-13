# Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen search page to `village-delivery` that supports global product search from the home screen and category-scoped search from within the categories screen.

**Architecture:** `app/search.tsx` is a stack route outside the `(dashboard)` tab group — the root `Stack` in `app/_layout.tsx` picks it up automatically, hiding the tab bar. A dedicated `useSearchViewModel` hook reads `categoryId`/`categoryName`/`categoryEmoji` from URL params, manages `query` text state, and derives filtered results from `ALL_PRODUCTS` via `useMemo`. The home search bar and the dead search icon in the category hero both navigate to this route (with or without category params).

**Tech Stack:** Expo Router v3, React Native, NativeWind (Tailwind), Zustand (`useVillageStore`), lucide-react-native icons, `react-native-safe-area-context`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/features/home/viewmodel/search/useSearchViewModel.ts` | State + filtering logic |
| Create | `src/features/home/views/search/SearchScreen.tsx` | Search UI |
| Create | `app/search.tsx` | Expo Router route entry point |
| Modify | `src/features/home/views/home/HomeScreen.tsx` | Wire search bar `onPress` |
| Modify | `src/features/home/views/categories/CategoriesScreen.tsx` | Wire hero search icon |

---

## Task 1: Create `useSearchViewModel`

**Files:**
- Create: `src/features/home/viewmodel/search/useSearchViewModel.ts`

- [ ] **Step 1: Create the file**

```ts
import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';

export const useSearchViewModel = () => {
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    params.categoryId ?? null
  );
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const cartCount = useVillageStore(state => state.cartCount());

  const results = useMemo(() => {
    const trimmed = query.toLowerCase().trim();

    // No query and no category: show nothing (prompt user to type)
    if (!trimmed && !activeCategoryId) return [];

    return ALL_PRODUCTS
      .filter(p => !activeCategoryId || p.categoryId === activeCategoryId)
      .filter(p => !trimmed || p.name.toLowerCase().includes(trimmed));
  }, [query, activeCategoryId]);

  const clearCategory = () => setActiveCategoryId(null);

  const openVariants = (product: Product) => setVariantProduct(product);
  const closeVariants = () => setVariantProduct(null);

  return {
    query,
    setQuery,
    activeCategoryId,
    categoryName: activeCategoryId ? (params.categoryName ?? activeCategoryId) : null,
    clearCategory,
    results,
    cartCount,
    variantProduct,
    openVariants,
    closeVariants,
  };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `useSearchViewModel.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add src/features/home/viewmodel/search/useSearchViewModel.ts
git commit -m "feat: add useSearchViewModel for local product filtering"
```

---

## Task 2: Create `SearchScreen`

**Files:**
- Create: `src/features/home/views/search/SearchScreen.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ArrowLeft, Search, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FloatingCartPill, ProductCard, VariantBottomSheet } from '@/src/shared/components';
import { useSearchViewModel } from '../../viewmodel/search/useSearchViewModel';

export const SearchScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = useSearchViewModel();
  const inputRef = useRef<TextInput>(null);

  const goToCart = () => router.push('/(dashboard)/cart');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']}>
      {/* ── Header ── */}
      <View
        className="bg-white border-b border-slate-100 px-4 pb-3 flex-col gap-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Back + input row */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 h-10 gap-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              ref={inputRef}
              autoFocus
              value={vm.query}
              onChangeText={vm.setQuery}
              placeholder="Search groceries, brands…"
              placeholderTextColor="#94a3b8"
              className="flex-1 text-slate-900 text-sm"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Category chip + result count row */}
        {(vm.activeCategoryId || vm.results.length > 0) && (
          <View className="flex-row items-center gap-2 pl-12">
            {vm.activeCategoryId && (
              <TouchableOpacity
                onPress={vm.clearCategory}
                className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1"
              >
                <Text className="text-green-700 text-xs font-semibold">
                  {vm.categoryName}
                </Text>
                <X size={12} color="#15803d" />
              </TouchableOpacity>
            )}
            {vm.results.length > 0 && (
              <Text className="text-slate-400 text-xs">
                {vm.results.length} result{vm.results.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── Body ── */}
      {vm.results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          {vm.query.trim().length > 0 ? (
            <Text className="text-slate-400 text-sm">No results for "{vm.query.trim()}"</Text>
          ) : (
            <Text className="text-slate-400 text-sm">Start typing to search</Text>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row flex-wrap gap-3">
            {vm.results.map(product => (
              <View key={product.id} style={{ width: '47.5%' }}>
                <ProductCard product={product} openVariants={vm.openVariants} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Overlays ── */}
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `SearchScreen.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add src/features/home/views/search/SearchScreen.tsx
git commit -m "feat: add SearchScreen component"
```

---

## Task 3: Create Expo Router route `app/search.tsx`

**Files:**
- Create: `app/search.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { SearchScreen } from '@/src/features/home/views/search/SearchScreen';

export default function SearchRoute() {
  return <SearchScreen />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add app/search.tsx
git commit -m "feat: add /search Expo Router route"
```

---

## Task 4: Wire home search bar

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`

The search bar `TouchableOpacity` (lines 57–63) currently has no `onPress`. Add `onPress={() => router.push('/search')}`.

- [ ] **Step 1: Add `onPress` to the search bar `TouchableOpacity`**

Find this block in `HomeScreen.tsx`:

```tsx
        {/* Row 2: search bar */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-100 rounded-xl px-3 h-10 gap-2"
        >
```

Replace with:

```tsx
        {/* Row 2: search bar */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-100 rounded-xl px-3 h-10 gap-2"
          onPress={() => router.push('/search')}
        >
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add src/features/home/views/home/HomeScreen.tsx
git commit -m "feat: navigate to /search when home search bar is tapped"
```

---

## Task 5: Wire category hero search icon

**Files:**
- Modify: `src/features/home/views/categories/CategoriesScreen.tsx`

The search `TouchableOpacity` in the hero gradient (detail state, ~lines 163–168) is currently dead. Wire it to navigate to `/search` with category params.

- [ ] **Step 1: Wire the search icon**

Find this block in `CategoriesScreen.tsx` (inside the detail state return, within `LinearGradient`):

```tsx
          <View className="flex-row gap-2 justify-end mb-2">
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Search size={18} color="white" />
            </TouchableOpacity>
```

Replace with:

```tsx
          <View className="flex-row gap-2 justify-end mb-2">
            <TouchableOpacity
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              onPress={() =>
                router.push(
                  `/search?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`
                )
              }
            >
              <Search size={18} color="white" />
            </TouchableOpacity>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add src/features/home/views/categories/CategoriesScreen.tsx
git commit -m "feat: wire category hero search icon to /search with category params"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx expo start
```

- [ ] **Step 2: Verify global search from home**

1. Open app on Home tab
2. Tap the search bar ("Search groceries, brands…")
3. Expected: full-screen search page opens, tab bar hidden, keyboard appears, input autofocused
4. Type "orange" → expected: products matching "orange" appear in 2-col grid
5. Clear text → expected: "Start typing to search" prompt shown
6. Tap back arrow → expected: returns to Home

- [ ] **Step 3: Verify category-scoped search**

1. Open app → tap Categories tab
2. Tap any category (e.g. "Fruits") → category detail view opens
3. Tap the search icon (top-right of hero gradient)
4. Expected: search screen opens, "🍎 Fruits ×" chip shown in header, results show all Fruits products immediately (query is empty, category is set)
5. Type "mango" → expected: results narrow to Fruits products matching "mango"
6. Tap `×` on the chip → expected: chip disappears, results now search across all categories
7. Tap back → expected: returns to category detail

- [ ] **Step 4: Verify cart overlays**

1. Add items to cart from any screen
2. Open search → expected: `FloatingCartPill` shows item count
3. Tap pill → expected: navigates to cart
4. Open a product with variants in search → tap ADD → expected: `VariantBottomSheet` opens

- [ ] **Step 5: Final commit if any fixes were made during verification**

```bash
cd /Users/yeshwanth/Mino/village-delivery
git add -p
git commit -m "fix: search page verification adjustments"
```
