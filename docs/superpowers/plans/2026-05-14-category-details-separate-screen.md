# Category Details — Separate Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move category detail view from in-tab state-based rendering to a separate full-screen route (`/category-details`) that sits outside the tab navigator, matching the existing `/search` pattern.

**Architecture:** A new Expo Router route `app/category-details.tsx` (alongside `search.tsx`) receives `categoryId` as a query param and renders a new `CategoryDetailsScreen`. `CategoriesScreen` becomes a grid-only component that navigates via `router.push`. The Zustand store loses `selectedCat`/`sortKey` (no longer needed globally); `SortBottomSheet` becomes prop-driven. `HomeScreen` navigates directly to the new route when a category is tapped.

**Tech Stack:** Expo Router (file-based routing), React Native, Zustand, NativeWind/Tailwind, expo-linear-gradient, lucide-react-native, react-native-safe-area-context, react-native-gesture-handler.

---

## File Map

| File | Action |
|------|--------|
| `src/shared/components/SortBottomSheet.tsx` | Modify — accept sortKey + onSortChange as props |
| `src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts` | Create — reads categoryId from params, local sort state |
| `src/features/home/views/category-details/CategoryDetailsScreen.tsx` | Create — full detail UI |
| `app/category-details.tsx` | Create — thin route file |
| `src/features/home/views/categories/CategoriesScreen.tsx` | Modify — grid only, router.push on tap |
| `src/features/home/viewmodel/categories/useCategoriesViewModel.ts` | Modify — strip to grid-only needs |
| `src/features/home/views/home/HomeScreen.tsx` | Modify — goToCategories navigation |
| `src/features/home/viewmodel/home/useHomeViewModel.ts` | Modify — remove setSelectedCat |
| `src/core/store/useVillageStore.ts` | Modify — remove selectedCat, setSelectedCat, sortKey, setSortKey |

---

## Task 1: Make SortBottomSheet prop-driven

`SortBottomSheet` currently reads `sortKey`/`setSortKey` from the Zustand store. After this task it accepts them as props so callers control sort state locally.

**Files:**
- Modify: `src/shared/components/SortBottomSheet.tsx`

- [ ] **Step 1: Update SortBottomSheet props and remove store dependency**

Replace the entire file content:

```tsx
import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SortKey } from '@/src/base/types/village.types';
import { VillageBottomSheet } from './VillageBottomSheet';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular',    label: 'Most Popular' },
  { key: 'price_asc',  label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'rating',     label: 'Top Rated' },
];

interface SortBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}

export const SortBottomSheet = ({ visible, onClose, sortKey, onSortChange }: SortBottomSheetProps) => {
  const handleSelect = (key: SortKey) => {
    onSortChange(key);
    onClose();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="pb-6">
        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-slate-100">
          <Text className="text-slate-900 font-bold text-base">Sort by</Text>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="px-4 mt-3 gap-2">
          {SORT_OPTIONS.map(option => {
            const isActive = sortKey === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleSelect(option.key)}
                className={`flex-row items-center justify-between h-12 px-4 rounded-xl border-2 ${
                  isActive
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {option.label}
                </Text>
                {isActive && <Check size={18} color="white" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </VillageBottomSheet>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/shared/components/SortBottomSheet.tsx
git -C /Users/yeshwanth/Mino/village-delivery commit -m "refactor: make SortBottomSheet prop-driven (sortKey + onSortChange)"
```

---

## Task 2: Create useCategoryDetailsViewModel

New viewmodel for the category detail screen. Reads `categoryId` from route params, derives data from static sources, manages sort state locally.

**Files:**
- Create: `src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts`

- [ ] **Step 1: Create the viewmodel**

```ts
import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Product, SortKey } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import {
  CATEGORIES,
  ALL_PRODUCTS,
  getProducts,
  sortProducts,
} from '@/src/features/home/data/static/villageData';

const HERO_GRADIENTS: Record<string, { from: string; to: string }> = {
  fruits:     { from: 'from-red-400',    to: 'to-rose-500' },
  vegetables: { from: 'from-green-500',  to: 'to-emerald-600' },
  dairy:      { from: 'from-sky-400',    to: 'to-blue-500' },
  snacks:     { from: 'from-amber-400',  to: 'to-orange-500' },
  beverages:  { from: 'from-orange-400', to: 'to-amber-500' },
  bakery:     { from: 'from-yellow-400', to: 'to-amber-500' },
  meat:       { from: 'from-rose-400',   to: 'to-red-500' },
  frozen:     { from: 'from-cyan-400',   to: 'to-sky-500' },
  organic:    { from: 'from-lime-400',   to: 'to-green-500' },
  pantry:     { from: 'from-stone-400',  to: 'to-amber-600' },
};

export const useCategoryDetailsViewModel = () => {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const cartCount = useVillageStore(state => state.cartCount());

  const [sortKey, setSortKey] = useState<SortKey>('popular');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const currentCategory = useMemo(
    () => CATEGORIES.find(c => c.id === categoryId) ?? null,
    [categoryId]
  );

  const products = useMemo(() => {
    if (!categoryId) return [];
    return sortProducts(getProducts(categoryId), sortKey);
  }, [categoryId, sortKey]);

  const heroGradient = categoryId ? (HERO_GRADIENTS[categoryId] ?? null) : null;

  return {
    categoryId,
    currentCategory,
    products,
    heroGradient,
    sortKey,
    setSortKey,
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

- [ ] **Step 2: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts
git -C /Users/yeshwanth/Mino/village-delivery commit -m "feat: add useCategoryDetailsViewModel (reads categoryId from route params)"
```

---

## Task 3: Create CategoryDetailsScreen

Extract the detail UI from `CategoriesScreen` into a standalone component. Uses the new viewmodel. Back button calls `router.back()`.

**Files:**
- Create: `src/features/home/views/category-details/CategoryDetailsScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCategoryDetailsViewModel } from '../../viewmodel/categories/useCategoryDetailsViewModel';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const CategoryDetailsScreen = () => {
  const router = useRouter();
  const vm = useCategoryDetailsViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const SORT_LABELS: Record<string, string> = {
    popular:    t('sort_popular'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    rating:     t('sort_rating'),
  };

  const FILTER_CHIPS = [
    t('filter_all'),
    t('filter_best_sellers'),
    t('filter_new'),
    t('filter_on_sale'),
    t('filter_top_rated'),
  ];

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToCart = () => router.push('/(dashboard)/cart');

  if (!vm.currentCategory) {
    return null;
  }

  const cat = vm.currentCategory;
  const grad = vm.heroGradient!;
  const catName = locale === 'te' ? cat.nameTE : cat.name;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Sticky sub-header */}
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
              <View className={`w-8 h-8 rounded-lg ${cat.bgClass} items-center justify-center`}>
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              </View>
              <View>
                <Text className="text-slate-900 font-bold text-sm">{catName}</Text>
                <Text className="text-slate-400 text-[10px]">{interpolate(t('items_label'), vm.products.length)}</Text>
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

          {vm.sortKey !== 'popular' && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <Text className="text-green-700 text-xs font-medium">{SORT_LABELS[vm.sortKey]}</Text>
                <TouchableOpacity onPress={() => vm.setSortKey('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Scrollable content */}
      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        stickyHeaderIndices={[1]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* [0] Full-bleed hero */}
        <LinearGradient
          colors={[gradientColor(grad.from), gradientColor(grad.to)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: 180, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16 }}
        >
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
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Heart size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white/70 text-xs font-semibold tracking-wider uppercase">
            Category · {interpolate(t('items_label'), vm.products.length)}
          </Text>
          <Text className="text-white font-black mt-1" style={{ fontSize: 28 }}>{catName}</Text>
          <Text className="text-white/70 text-sm mt-1">{t('cat_tagline')}</Text>
          <Text style={{ fontSize: 64, marginTop: 8 }}>{cat.emoji}</Text>
        </LinearGradient>

        {/* [1] Chips row — sticky */}
        <View className="bg-white border-b border-slate-100">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            contentContainerStyle={{ gap: 8 }}
            directionalLockEnabled={true}
            nestedScrollEnabled={true}
            decelerationRate="normal"
          >
            {FILTER_CHIPS.map((chip, i) => (
              <View
                key={chip}
                className={`rounded-full px-4 py-1.5 border ${
                  i === 0 ? 'bg-green-600 border-green-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${i === 0 ? 'text-white' : 'text-slate-600'}`}>
                  {chip}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* [2] Products */}
        <View className="bg-white">
          <View className="px-4 pt-3 pb-2">
            <Text className="text-slate-500 text-xs">
              {interpolate(t('items_label'), vm.products.length)} · {SORT_LABELS[vm.sortKey]}
            </Text>
          </View>
          <View className="px-4 pb-8">
            <View className="flex-row flex-wrap gap-3">
              {vm.products.map(product => (
                <View key={product.id} style={{ width: '47.5%' }}>
                  <ProductCard product={product} openVariants={vm.openVariants} />
                </View>
              ))}
            </View>
          </View>
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

- [ ] **Step 2: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/features/home/views/category-details/CategoryDetailsScreen.tsx
git -C /Users/yeshwanth/Mino/village-delivery commit -m "feat: add CategoryDetailsScreen (standalone, outside tab navigator)"
```

---

## Task 4: Create app/category-details.tsx route

Thin Expo Router file that connects the route to the screen component.

**Files:**
- Create: `app/category-details.tsx`

- [ ] **Step 1: Create the route file**

```tsx
import { CategoryDetailsScreen } from '@/src/features/home/views/category-details/CategoryDetailsScreen';

export default function CategoryDetailsRoute() {
  return <CategoryDetailsScreen />;
}
```

- [ ] **Step 2: Verify the route is accessible**

Start the Expo dev server if not running:
```bash
cd /Users/yeshwanth/Mino/village-delivery && npx expo start
```
Navigate in the app to any screen that already uses `router.push('/search')` to confirm the pattern works. The `/category-details` route exists now but isn't wired to any tap yet.

- [ ] **Step 3: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add app/category-details.tsx
git -C /Users/yeshwanth/Mino/village-delivery commit -m "feat: add /category-details route"
```

---

## Task 5: Simplify CategoriesScreen to grid-only

Remove the dual-state branching (grid / detail), the slide animation, and all detail rendering. Tapping a category now navigates to the new route.

**Files:**
- Modify: `src/features/home/views/categories/CategoriesScreen.tsx`

- [ ] **Step 1: Replace CategoriesScreen with grid-only version**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryBigCard, FloatingCartPill } from '@/src/shared/components';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

export const CategoriesScreen = () => {
  const router = useRouter();
  const vm = useCategoriesViewModel();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const goToCart = () => router.push('/(dashboard)/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* Header */}
        <View className="px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
          <Text className="text-slate-900 font-black text-2xl" style={teFont}>{t('groceries_title')}</Text>
          <Text className="text-slate-500 text-sm mt-1">
            {interpolate(t('items_label'), vm.categories.length * 6)} · {interpolate(t('cat_count'), vm.categories.length)}
          </Text>
        </View>

        {/* 2-col category grid */}
        <View className="px-4 gap-3 pb-4">
          {Array.from({ length: Math.ceil(vm.categories.length / 2) }, (_, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-3">
              {vm.categories.slice(rowIdx * 2, rowIdx * 2 + 2).map(cat => (
                <View key={cat.id} className="flex-1">
                  <CategoryBigCard
                    category={cat}
                    itemCount={vm.productCountInCat(cat.id)}
                    onPress={() => router.push(`/category-details?categoryId=${cat.id}`)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify in app**

Open the app, tap the Categories tab. Tap any category card. Confirm:
- A new full-screen opens (tab bar hidden)
- Category name, hero gradient, and products render correctly
- Back arrow returns to the categories grid
- Sort bottom sheet works (uses local state, resets on next category visit)

- [ ] **Step 3: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/features/home/views/categories/CategoriesScreen.tsx
git -C /Users/yeshwanth/Mino/village-delivery commit -m "refactor: CategoriesScreen grid-only, category tap navigates to /category-details"
```

---

## Task 6: Simplify useCategoriesViewModel

Strip to only what the grid view needs: categories list, cart count, and productCountInCat.

**Files:**
- Modify: `src/features/home/viewmodel/categories/useCategoriesViewModel.ts`

- [ ] **Step 1: Replace with simplified viewmodel**

```ts
import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS, CATEGORIES } from '@/src/features/home/data/static/villageData';

export const useCategoriesViewModel = () => {
  const cartCount = useVillageStore(state => state.cartCount());

  return {
    categories: CATEGORIES,
    cartCount,
    productCountInCat: (catId: string) => ALL_PRODUCTS.filter(p => p.categoryId === catId).length,
  };
};
```

- [ ] **Step 2: Verify the app still works**

Open the app. Categories tab grid should still display correctly with item counts. Tapping a category should still open the detail screen.

- [ ] **Step 3: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/features/home/viewmodel/categories/useCategoriesViewModel.ts
git -C /Users/yeshwanth/Mino/village-delivery commit -m "refactor: useCategoriesViewModel stripped to grid-only (categories, cartCount, productCountInCat)"
```

---

## Task 7: Update HomeScreen and useHomeViewModel

`HomeScreen.goToCategories(catId)` currently sets store state then navigates to the categories tab. Change it to navigate directly to `/category-details` when a catId is provided.

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`
- Modify: `src/features/home/viewmodel/home/useHomeViewModel.ts`

- [ ] **Step 1: Update useHomeViewModel — remove setSelectedCat**

```ts
import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS, CATEGORIES, HERO_SLIDES } from '@/src/features/home/data/static/villageData';

export const useHomeViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const favs = useVillageStore(state => state.favs);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const toggleFav = useVillageStore(state => state.toggleFav);
  const cartCount = useVillageStore(state => state.cartCount());

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const topPicks = useMemo(() =>
    [...ALL_PRODUCTS]
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, 6),
    []
  );

  const openVariants = (product: Product) => setVariantProduct(product);
  const closeVariants = () => setVariantProduct(null);

  return {
    categories: CATEGORIES,
    heroSlides: HERO_SLIDES,
    topPicks,
    cart,
    favs,
    cartCount,
    variantProduct,
    addToCart,
    decFromCart,
    toggleFav,
    openVariants,
    closeVariants,
  };
};
```

- [ ] **Step 2: Update HomeScreen.goToCategories**

In `src/features/home/views/home/HomeScreen.tsx`, replace the `goToCategories` function:

```tsx
const goToCategories = (catId?: string) => {
  if (catId) {
    router.push(`/category-details?categoryId=${catId}` as any);
  } else {
    router.push('/(dashboard)/categories');
  }
};
```

- [ ] **Step 3: Verify in app**

Open the app. On the Home tab:
- Tapping a category tile (e.g. Fruits) should open `/category-details` directly (not the categories grid tab)
- Tapping "See all" or "Shop now" (no catId) should open the categories tab grid
- Back from category detail returns to Home

- [ ] **Step 4: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/features/home/viewmodel/home/useHomeViewModel.ts src/features/home/views/home/HomeScreen.tsx
git -C /Users/yeshwanth/Mino/village-delivery commit -m "refactor: HomeScreen category tap navigates to /category-details directly"
```

---

## Task 8: Clean up VillageStore — remove selectedCat, sortKey

Remove the now-unused `selectedCat`, `setSelectedCat`, `sortKey`, and `setSortKey` from the store. At this point no file reads these anymore.

**Files:**
- Modify: `src/core/store/useVillageStore.ts`

- [ ] **Step 1: Verify nothing references selectedCat or sortKey**

```bash
grep -r "selectedCat\|sortKey\|setSortKey\|setSelectedCat" /Users/yeshwanth/Mino/village-delivery/src --include="*.ts" --include="*.tsx"
```

Expected output: no results (or only results in `useVillageStore.ts` itself before editing).

If any file still references them, fix that file before continuing.

- [ ] **Step 2: Update VillageStore — remove unused state and actions**

Replace the entire file:

```ts
import { CartRecord } from '@/src/base/types/village.types';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Locale } from '@/src/base/constants/translations';

interface VillageState {
  cart: CartRecord;
  favs: Record<string, boolean>;
  locale: Locale;
}

interface VillageActions {
  addToCart: (key: string) => void;
  decFromCart: (key: string) => void;
  toggleFav: (productId: string) => void;
  clearCart: () => void;
  setLocale: (locale: Locale) => Promise<void>;
  loadLocale: () => Promise<void>;
}

interface VillageComputed {
  cartCount: () => number;
  cartTotal: () => number;
}

type VillageStore = VillageState & VillageActions & VillageComputed;

const initialState: VillageState = {
  cart: {},
  favs: {},
  locale: 'te',
};

function parseCartKey(key: string): { productId: string; variantIndex: number | null } {
  const match = key.match(/^(.+)-v(\d+)$/);
  if (match) {
    return { productId: match[1], variantIndex: parseInt(match[2], 10) };
  }
  return { productId: key, variantIndex: null };
}

export const useVillageStore = create<VillageStore>((set, get) => ({
  ...initialState,

  addToCart: (key) =>
    set((state) => ({
      cart: {
        ...state.cart,
        [key]: (state.cart[key] ?? 0) + 1,
      },
    })),

  decFromCart: (key) =>
    set((state) => {
      const current = state.cart[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = state.cart;
        return { cart: rest };
      }
      return { cart: { ...state.cart, [key]: current - 1 } };
    }),

  toggleFav: (productId) =>
    set((state) => ({
      favs: {
        ...state.favs,
        [productId]: !state.favs[productId],
      },
    })),

  clearCart: () => set({ cart: {} }),

  setLocale: async (locale) => {
    set({ locale });
    await StoredPrefs.setCustomData(StorageKeys.LOCALE, locale);
  },

  loadLocale: async () => {
    const saved = await StoredPrefs.getCustomData<Locale>(StorageKeys.LOCALE);
    if (saved === 'te' || saved === 'en') {
      set({ locale: saved });
    }
  },

  cartCount: () => {
    const { cart } = get();
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  },

  cartTotal: () => {
    const { cart } = get();
    let total = 0;
    for (const [key, count] of Object.entries(cart)) {
      const { productId, variantIndex } = parseCartKey(key);
      const product = ALL_PRODUCTS.find((p) => p.id === productId);
      if (!product) continue;
      let price: number;
      if (variantIndex !== null && product.variants && product.variants[variantIndex] != null) {
        price = product.variants[variantIndex].price;
      } else {
        price = product.price;
      }
      total += price * count * 20;
    }
    return total;
  },
}));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/yeshwanth/Mino/village-delivery && npx tsc --noEmit
```

Expected: no errors. If errors appear, read them carefully and fix the offending references before committing.

- [ ] **Step 4: Final smoke test in app**

Open the app and verify all flows:
1. Home → tap category tile → `/category-details` opens (full screen, no tab bar)
2. Home → tap "See all" → Categories grid tab opens
3. Categories tab → tap any category → `/category-details` opens
4. Category detail → sort button → sort sheet works, sort resets on next visit
5. Category detail → search icon → `/search` with categoryId pre-filled
6. Back from any detail → returns to the correct previous screen
7. Cart count pill appears on both categories grid and detail when items in cart

- [ ] **Step 5: Commit**

```bash
git -C /Users/yeshwanth/Mino/village-delivery add src/core/store/useVillageStore.ts
git -C /Users/yeshwanth/Mino/village-delivery commit -m "refactor: remove selectedCat and sortKey from VillageStore (moved to local state)"
```
