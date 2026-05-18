# Top Picks — See All Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-page "See All" screen for the Top Picks section — toolbar + live search + 2-col product grid — that opens from the Home screen and matches the CategoryDetails visual pattern.

**Architecture:** A new `useTopPicksViewModel` hook independently reads `ALL_PRODUCTS` from static data, applies sort + search filter, and exposes state to a new `TopPicksScreen`. The screen mirrors `CategoryDetailsScreen` structure (slide-in animation, sticky sub-header, 2-col grid, FloatingCartPill, SortBottomSheet, VariantBottomSheet). The Home screen's "See all" on Top Picks is wired to `router.push('/top-picks')`.

**Tech Stack:** React Native, Expo Router, NativeWind (Tailwind), react-native-gesture-handler (ScrollView), react-native-safe-area-context, lucide-react-native, existing shared components (`ProductCard`, `SortBottomSheet`, `VariantBottomSheet`, `FloatingCartPill`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/base/constants/translations.ts` | Add 4 translation keys for Top Picks page |
| Create | `src/features/home/viewmodel/top-picks/useTopPicksViewModel.ts` | All state: search, sort, variants, cart count |
| Create | `src/features/home/views/top-picks/TopPicksScreen.tsx` | Full screen UI |
| Create | `app/top-picks.tsx` | Expo Router entry point |
| Modify | `src/features/home/views/home/HomeScreen.tsx` | Wire "See all" → `/top-picks` |

---

## Task 1: Add translation keys

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add 4 new keys to the TRANSLATIONS object**

Open `src/base/constants/translations.ts`. Inside the `TRANSLATIONS` object, add these 4 keys after the `top_picks` entry (line ~15):

```ts
  top_picks_title:           { te: 'టాప్ పిక్స్',               en: 'Top Picks' },
  search_top_picks_ph:       { te: 'టాప్ పిక్స్ వెతకండి…',      en: 'Search top picks…' },
  top_picks_empty_title:     { te: 'వస్తువులు కనుగొనబడలేదు',   en: 'No products found' },
  top_picks_empty_subtitle:  { te: 'వేరే పదాలతో వెతకండి',       en: 'Try a different search term' },
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `translations.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat: add Top Picks page translation keys"
```

---

## Task 2: Create the ViewModel

**Files:**
- Create: `src/features/home/viewmodel/top-picks/useTopPicksViewModel.ts`

- [ ] **Step 1: Create the file**

```ts
// src/features/home/viewmodel/top-picks/useTopPicksViewModel.ts
import { useMemo, useState } from 'react';
import { Product, SortKey } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS, sortProducts } from '@/src/features/home/data/static/villageData';

export const useTopPicksViewModel = () => {
  const cartCount = useVillageStore(state => state.cartCount());

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('popular');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const products = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = query
      ? ALL_PRODUCTS.filter(
          p =>
            p.name.toLowerCase().includes(query) ||
            p.nameTE.toLowerCase().includes(query)
        )
      : ALL_PRODUCTS;
    return sortProducts(base, sortKey);
  }, [searchQuery, sortKey]);

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    products,
    cartCount,
    variantProduct,
    sortSheetVisible,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    openSortSheet: () => setSortSheetVisible(true),
    closeSortSheet: () => setSortSheetVisible(false),
  };
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/viewmodel/top-picks/useTopPicksViewModel.ts
git commit -m "feat: add useTopPicksViewModel with search and sort"
```

---

## Task 3: Create the Screen

**Files:**
- Create: `src/features/home/views/top-picks/TopPicksScreen.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/features/home/views/top-picks/TopPicksScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useTopPicksViewModel } from '@/src/features/home/viewmodel/top-picks/useTopPicksViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const TopPicksScreen = () => {
  const router = useRouter();
  const vm = useTopPicksViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();

  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const sortLabels: Record<string, string> = {
    popular:    t('sort_popular'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    rating:     t('sort_rating'),
  };

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Sticky sub-header ── */}
      <Animated.View
        className="bg-white border-b border-slate-100"
        style={{ transform: [{ translateX: slideAnim }] }}
      >
        <View className="px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-8 h-8 items-center justify-center mr-1"
              >
                <ArrowLeft size={20} color="#0f172a" />
              </TouchableOpacity>
              <View>
                <Text
                  className="text-slate-900 font-bold text-sm"
                  style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
                >
                  {t('top_picks_title')}
                </Text>
                <Text className="text-slate-400 text-[10px]">
                  {interpolate(t('items_label'), vm.products.length)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={vm.openSortSheet}
              className="flex-row items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color="#64748b" />
              <Text className="text-slate-600 text-xs font-medium">{t('sort')}</Text>
            </TouchableOpacity>
          </View>

          {/* Active sort badge */}
          {vm.sortKey !== 'popular' && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <Text className="text-green-700 text-xs font-medium">{sortLabels[vm.sortKey]}</Text>
                <TouchableOpacity onPress={() => vm.setSortKey('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        stickyHeaderIndices={[0]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      >
        {/* [0] Search bar — sticky */}
        <View className="bg-white border-b border-slate-100 px-4 py-3">
          <View className="flex-row items-center bg-slate-100 rounded-xl px-3 h-11 gap-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              className="flex-1 text-slate-900 text-base"
              placeholder={t('search_top_picks_ph')}
              placeholderTextColor="#94a3b8"
              value={vm.searchQuery}
              onChangeText={vm.setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
              style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
            />
            {vm.searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => vm.setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* [1] Content */}
        <View className="bg-white">
          {vm.products.length === 0 ? (
            /* Empty state */
            <View className="items-center justify-center py-20 px-8">
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text
                className="text-slate-700 font-bold text-base mt-4 text-center"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
              >
                {t('top_picks_empty_title')}
              </Text>
              <Text
                className="text-slate-400 text-sm mt-2 text-center"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
              >
                {t('top_picks_empty_subtitle')}
              </Text>
            </View>
          ) : (
            /* Product grid */
            <View className="px-4 pt-3 pb-8">
              <Text className="text-slate-500 text-xs mb-3">
                {interpolate(t('items_label'), vm.products.length)} · {sortLabels[vm.sortKey]}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {vm.products.map(product => (
                  <View key={product.id} style={{ width: '47.5%' }}>
                    <ProductCard product={product} openVariants={vm.openVariants} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </AnimatedScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
      <SortBottomSheet
        visible={vm.sortSheetVisible}
        onClose={vm.closeSortSheet}
        sortKey={vm.sortKey}
        onSortChange={vm.setSortKey}
      />
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/top-picks/TopPicksScreen.tsx
git commit -m "feat: add TopPicksScreen with search, sort, and 2-col product grid"
```

---

## Task 4: Create the Expo Router entry point

**Files:**
- Create: `app/top-picks.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/top-picks.tsx
import { TopPicksScreen } from '@/src/features/home/views/top-picks/TopPicksScreen';

export default function TopPicksRoute() {
  return <TopPicksScreen />;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/top-picks.tsx
git commit -m "feat: add /top-picks route"
```

---

## Task 5: Wire Home screen "See all" to the new route

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`

- [ ] **Step 1: Update the Top Picks "See all" handler**

In `HomeScreen.tsx`, find the Top Picks section (~line 174). The "See all" `TouchableOpacity` currently calls `goToCategories()`. Change its `onPress` to navigate to `/top-picks`:

```tsx
// Before:
<TouchableOpacity onPress={() => goToCategories()}>

// After:
<TouchableOpacity onPress={() => router.push('/top-picks')}>
```

The full Top Picks header block should look like:

```tsx
<View className="flex-row justify-between items-center mb-3">
  <Text
    className="text-slate-900 font-bold text-base"
    style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
  >
    {t('top_picks')}
  </Text>
  <TouchableOpacity onPress={() => router.push('/top-picks')}>
    <Text
      className="text-green-600 font-semibold text-sm"
      style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
    >
      {t('see_all')}
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/home/HomeScreen.tsx
git commit -m "feat: wire Top Picks 'See all' to /top-picks route"
```

---

## Task 6: Manual Verification

No automated test infrastructure exists in this project. Verify in the simulator:

- [ ] Start the dev server: `cd village-delivery && npx expo start`

- [ ] **Home → Top Picks flow**
  - Open Home tab
  - Tap "See all" next to "Top picks for you"
  - Confirm screen slides in from right with "Top Picks" title and item count in sub-header

- [ ] **Product grid**
  - Confirm 2-column grid with all products (not just 6)
  - Confirm products sorted by popularity (highest `rating × reviews` first)
  - Confirm `ProductCard` renders correctly (emoji, price, add button, discount badge)

- [ ] **Search**
  - Type "orange" → grid filters in real time, only matching products shown
  - Clear search with X → all products restored
  - Type a Telugu word (if locale = 'te') → filters by `nameTE`
  - Type gibberish → empty state shown (🔍 icon + "No products found")

- [ ] **Sort**
  - Tap "Sort" button → `SortBottomSheet` opens
  - Select "Price: Low to High" → products reorder, sort badge appears in header
  - Tap X on sort badge → reverts to "Most Popular"

- [ ] **Cart integration**
  - Add a product to cart → `FloatingCartPill` appears at bottom
  - Tap pill → navigates to `/cart`

- [ ] **Back navigation**
  - Tap `ArrowLeft` → returns to Home screen

- [ ] **Telugu locale**
  - Switch locale to "తె" on Home screen
  - Open Top Picks → toolbar title shows "టాప్ పిక్స్", search placeholder in Telugu, item count in Telugu

---

## Self-Review Checklist (Pre-Commit)

- All 4 translation keys added in Task 1 are consumed in `TopPicksScreen.tsx`
- `useTopPicksViewModel` returns `sortLabels` computed inside the screen (not the VM) — consistent with `CategoryDetailsScreen` pattern
- `stickyHeaderIndices={[0]}` targets the search bar (first child of `AnimatedScrollView`)
- `slideAnim` value 390 matches `CategoryDetailsScreen`
- `width: '47.5%'` matches `CategoryDetailsScreen` and `HomeScreen` product grids
- `FloatingCartPill` only renders when `cartCount > 0` (already enforced inside the component, double-safe)
- Empty `SORT_LABELS` const removed from final screen — `sortLabels` is computed from `t()` inside the component
