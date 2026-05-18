# Category Details — Separate Screen Design

**Date:** 2026-05-14  
**Project:** village-delivery  
**Status:** Approved

## Problem

Category detail view currently renders inside `CategoriesScreen` via local state (`selectedCat` in Zustand). Tapping a category triggers an in-tab slide-in animation — the tab bar remains visible and the navigation is state-based, not route-based. This differs from the established "search" pattern where the screen is a separate route outside the tab group.

## Goal

Tapping a category navigates to a separate full-screen route (`/category-details`) outside the tab navigator — identical pattern to `/search`. The tab bar is hidden. Back returns to wherever the user came from (standard `router.back()`).

## Architecture

### Routing

- New file: `app/category-details.tsx` (alongside `app/search.tsx`, outside `app/(dashboard)/`)
- Expo Router treats it as a stack screen — tab bar hidden, full screen
- `categoryId` passed as query param: `/category-details?categoryId=vegetables`
- `router.back()` used for back navigation — no manual state cleanup needed

### New Files

**`app/category-details.tsx`**  
Thin route file, renders `CategoryDetailsScreen`.

**`src/features/home/views/category-details/CategoryDetailsScreen.tsx`**  
Extracted verbatim from the detail branch of `CategoriesScreen`. Back button calls `router.back()`. Reads `categoryId` from route params via `useCategoryDetailsViewModel`.

**`src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts`**  
- Reads `categoryId` from `useLocalSearchParams`
- Derives `currentCategory`, `products`, `heroGradient` from static data
- `sortKey` and `sortSheetVisible` are local `useState` (resets fresh each visit)
- `variantProduct` stays local `useState`
- Exposes same interface as current detail branch of `useCategoriesViewModel`

### Modified Files

**`src/features/home/views/categories/CategoriesScreen.tsx`**  
- Remove: dual-state branching, `slideAnim`, detail render, `selectedCat` reads
- On category tap: `router.push(\`/category-details?categoryId=\${cat.id}\`)`
- Result: grid-only component, significantly simpler

**`src/features/home/viewmodel/categories/useCategoriesViewModel.ts`**  
- Remove: `selectedCat`, `setSelectedCat`, `sortKey`, `setSortKey`, `heroGradient`, `currentCategory`, `products`, `sortSheetVisible` (all moved to detail viewmodel)
- Retain: `categories`, `cart`, `favs`, `cartCount`, `productCountInCat`, `variantProduct`, `openVariants`, `closeVariants`

**`src/core/store/useVillageStore.ts`**  
- Remove state: `selectedCat`, `sortKey`
- Remove actions: `setSelectedCat`, `setSortKey`
- Remove from `VillageState` and `VillageActions` interfaces
- Remove from `initialState`

**`src/features/home/views/home/HomeScreen.tsx`**  
- `goToCategories(catId)` currently sets store state then pushes to categories tab
- Change to: if `catId` provided → `router.push(\`/category-details?categoryId=\${catId}\`)`, else → `router.push('/(dashboard)/categories')`

**`src/features/home/viewmodel/home/useHomeViewModel.ts`**  
- Remove `setSelectedCat` (no longer needed)

**`src/shared/components/SortBottomSheet.tsx`**  
- Remove store reads (`useVillageStore` for `sortKey`/`setSortKey`)
- Accept props: `sortKey: SortKey`, `onSortChange: (key: SortKey) => void`
- Caller (`CategoryDetailsScreen`) passes local state values

## Data Flow

```
CategoriesScreen grid tap
  → router.push('/category-details?categoryId=vegetables')
  → CategoryDetailsScreen mounts
  → useCategoryDetailsViewModel reads categoryId from params
  → derives category + products from static CATEGORIES/ALL_PRODUCTS
  → renders detail UI (hero, chips, product grid)
  → back press → router.back() → previous screen (categories or home)
```

## What Does NOT Change

- Static data (`villageData.ts`) — unchanged
- `CategoryBigCard`, `ProductCard`, `VariantBottomSheet`, `FloatingCartPill` — unchanged
- Cart state in store — unchanged
- Favs state in store — unchanged
- `SearchScreen` and `/search` route — unchanged

## Files Touched Summary

| File | Change |
|------|--------|
| `app/category-details.tsx` | New |
| `src/features/home/views/category-details/CategoryDetailsScreen.tsx` | New |
| `src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts` | New |
| `src/features/home/views/categories/CategoriesScreen.tsx` | Simplify (remove detail branch) |
| `src/features/home/viewmodel/categories/useCategoriesViewModel.ts` | Remove selectedCat/sort |
| `src/core/store/useVillageStore.ts` | Remove selectedCat, setSelectedCat, sortKey, setSortKey |
| `src/features/home/views/home/HomeScreen.tsx` | Update goToCategories navigation |
| `src/features/home/viewmodel/home/useHomeViewModel.ts` | Remove setSelectedCat |
| `src/shared/components/SortBottomSheet.tsx` | Prop-driven sortKey/onSortChange |
