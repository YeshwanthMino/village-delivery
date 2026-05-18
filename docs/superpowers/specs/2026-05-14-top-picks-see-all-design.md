# Top Picks — See All Page

**Date:** 2026-05-14  
**App:** village-delivery  
**Status:** Approved

---

## Overview

Full-page "See All" view for the Top Picks section on the Home screen. Matches the visual and structural pattern of `CategoryDetailsScreen`. Shows all top-rated products with real-time search, sort, and cart integration.

---

## Architecture

### Data

- Source: `ALL_PRODUCTS` from `src/features/home/data/static/villageData.ts` (static data, same as category-details)
- Top picks ranking: sort by `rating × reviews` descending — identical formula to home screen, but show **all** products instead of slicing to 6
- No shared store or route params needed; viewmodel independently computes from static data

### Files to create

| File | Purpose |
|------|---------|
| `src/features/home/viewmodel/top-picks/useTopPicksViewModel.ts` | ViewModel hook |
| `src/features/home/views/top-picks/TopPicksScreen.tsx` | Screen component |
| `app/top-picks.tsx` | Expo Router entry point |

### Files to modify

| File | Change |
|------|--------|
| `src/features/home/views/home/HomeScreen.tsx` | Wire "See all" on Top Picks → `router.push('/top-picks')` |

---

## Viewmodel — `useTopPicksViewModel`

```ts
// inputs
searchQuery: string           // local state
sortKey: SortKey              // local state, default 'popular'
sortSheetVisible: boolean
variantProduct: Product | null

// derived (useMemo)
products: Product[]           // ALL_PRODUCTS sorted by rating*reviews, then filtered by searchQuery, then sorted by sortKey

// from store
cartCount: number             // useVillageStore(state => state.cartCount())

// handlers
setSearchQuery, setSortKey
openSortSheet, closeSortSheet
openVariants, closeVariants
```

Search filter matches `product.name` and `product.nameTE` (case-insensitive).  
Sort is applied after search filter, reusing existing `sortProducts()` from `villageData.ts`.

---

## Screen Layout

Mirrors `CategoryDetailsScreen` structure exactly.

### 1. Sticky Sub-Header (Animated, slideAnim translateX)

```
[ ArrowLeft ]  Top Picks          [ SlidersHorizontal | "Sort" ]
               N items
```

- Same `Animated.View` with `slideAnim` (translateX from 390 → 0, 280ms) as CategoryDetails
- Back: `router.back()`
- Sort chip: opens `SortBottomSheet`
- Active sort badge (dismissible X chip) shown below row when `sortKey !== 'popular'` — same as CategoryDetails

### 2. Search Bar (sticky via `stickyHeaderIndices={[0]}` inside AnimatedScrollView)

- Pill: `bg-slate-100 rounded-xl px-3 h-11` — matches home screen search bar style
- Left: `Search` icon (16px, `#94a3b8`)
- `TextInput` with `placeholder` from `t('search_placeholder')` or `"Search top picks…"`
- Right: clear `X` button (shown when query non-empty)
- `onChangeText` → `setSearchQuery`
- `autoCorrect={false}`, `returnKeyType="search"`

### 3. Result Count Row

```
N items · Sort label
```

`text-slate-500 text-xs` — same as CategoryDetails.

### 4. Product Grid

- `flex-row flex-wrap gap-3`
- Each cell: `width: '47.5%'`
- Component: `<ProductCard product={p} openVariants={openVariants} />`
- Matches CategoryDetails and Home grid exactly

### 5. Empty State (search returns 0 results)

```
🔍
No products found
Try a different search term
```

Centered, `text-slate-400`, shown instead of grid when `products.length === 0` after filter.

### 6. Overlays

- `<FloatingCartPill count={cartCount} onPress={() => router.push('/cart')} />` when `cartCount > 0`
- `<SortBottomSheet />` — reuse existing
- `<VariantBottomSheet />` — reuse existing

---

## Home Screen Wire-Up

In `HomeScreen.tsx`, the Top Picks "See all" `TouchableOpacity` currently calls `goToCategories()`. Change to:

```ts
onPress={() => router.push('/top-picks')}
```

---

## States

| State | Behaviour |
|-------|-----------|
| Loading | Not needed — static data, instant |
| Empty (no search match) | Centered icon + message |
| Normal | 2-col grid with FloatingCartPill if cart non-empty |

---

## Constraints

- No new dependencies
- Reuse `ProductCard`, `SortBottomSheet`, `VariantBottomSheet`, `FloatingCartPill` from `src/shared/components`
- Reuse `sortProducts()` from `villageData.ts`
- Telugu locale support: filter by `nameTE` as well as `name`; sort button respects existing `SORT_LABELS`/`t()` translation keys
- `slideAnim` animation: identical to `CategoryDetailsScreen` (value 390 → 0, 280ms, `useNativeDriver: true`)
