# Search Page Design

**Date:** 2026-05-13  
**Project:** village-delivery (Expo Router + NativeWind + Zustand)

---

## Goal

Add a full-screen search page that lets users search across all products globally (from home) or scoped to a category (from within the categories screen).

---

## Scope

### In scope
- New search screen (`app/search.tsx`)
- Wire home search bar to navigate to search
- Wire dead search icon in category detail hero to navigate to category-scoped search
- Local filtering of `ALL_PRODUCTS` (no API call)

### Out of scope
- Search from categories browse view (no category selected)
- Search history / recent searches
- Sort/filter chips on search screen

---

## Navigation

| Entry point | Route pushed | Pre-filter |
|---|---|---|
| Home search bar (`TouchableOpacity`) | `/search` | None — global |
| Search icon in category detail hero (CategoriesScreen) | `/search?categoryId=fruits&categoryName=Fruits&categoryEmoji=🍎` | Category scoped |

Category tiles on HomeScreen keep existing behavior (`goToCategories(cat.id)` → `/categories` tab). No change.

---

## Architecture

### New files

**`app/search.tsx`**  
Expo Router route. Renders `<SearchScreen />`. Stack screen — root `_layout.tsx` already wraps all routes in a `Stack` with `headerShown: false`, so the tab bar is hidden automatically.

**`src/features/home/viewmodel/search/useSearchViewModel.ts`**  
ViewModel hook. Reads `useLocalSearchParams()` for `categoryId`, `categoryName`, `categoryEmoji`. Manages `query` (text input state) and `activeCategoryId` (can be cleared by user to widen scope). Derives `results` via `useMemo`.

**`src/features/home/views/search/SearchScreen.tsx`**  
Screen component. Consumes the view model. Renders header, optional category chip, results grid, empty state, overlays.

### Modified files

**`src/features/home/views/home/HomeScreen.tsx`**  
Add `onPress={() => router.push('/search')}` to the search bar `TouchableOpacity` (currently has no `onPress`).

**`src/features/home/views/categories/CategoriesScreen.tsx`**  
Wire the search `TouchableOpacity` in the hero gradient (currently dead, lines ~163–168) to `router.push(\`/search?categoryId=${cat.id}&categoryName=${cat.name}&categoryEmoji=${encodeURIComponent(cat.emoji)}\`)`.

---

## Filtering Logic

```ts
results = ALL_PRODUCTS
  .filter(p => !activeCategoryId || p.categoryId === activeCategoryId)
  .filter(p => p.name.toLowerCase().includes(query.toLowerCase().trim()))
```

- `activeCategoryId` starts as the `categoryId` query param (or `null` for global search)
- User can dismiss the category chip → sets `activeCategoryId` to `null` → searches all products
- When `query` is empty and no `activeCategoryId`: show all products (or a prompt — see UX below)

---

## SearchScreen UX

### Header
- Back button (`ArrowLeft` icon) → `router.back()`
- `TextInput` autofocused, placeholder "Search groceries, brands…"
- Result count suffix (e.g. "12 results")

### Category chip (conditional)
Shown only when `activeCategoryId` is set.  
Format: `{emoji} {categoryName}  ×`  
Tap `×` → clears `activeCategoryId`, re-runs filter across all products.

### Results grid
2-column `ProductCard` grid. Reuses existing `ProductCard` component. Same cart/variant behavior as other screens.

### Empty state
When `results.length === 0` and `query.length > 0`: show "No results for '{query}'" centered message.

When `query` is empty and no `activeCategoryId`: show "Start typing to search" prompt instead of all products. (Showing 60 products with no query would be noisy.)

When `query` is empty and `activeCategoryId` set: show all products in that category (useful — user landed from category search icon).

### Overlays
- `FloatingCartPill` when `cartCount > 0`
- `VariantBottomSheet` for products with variants

---

## Data dependencies

- `ALL_PRODUCTS` from `src/features/home/data/static/villageData.ts` — already imported in other VMs
- `CATEGORIES` — needed only to validate/look up category if needed (not strictly required since name/emoji come via params)
- `useVillageStore` — cart actions (`addToCart`, `decFromCart`), `cartCount`

---

## Files summary

| Action | File |
|---|---|
| Create | `app/search.tsx` |
| Create | `src/features/home/viewmodel/search/useSearchViewModel.ts` |
| Create | `src/features/home/views/search/SearchScreen.tsx` |
| Modify | `src/features/home/views/home/HomeScreen.tsx` |
| Modify | `src/features/home/views/categories/CategoriesScreen.tsx` |
