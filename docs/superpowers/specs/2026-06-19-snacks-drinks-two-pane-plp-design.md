# Two-Pane Category PLP (Blinkit-style) — Design

Date: 2026-06-19
Branch: feat/address-location-flow
Status: Approved

## Goal

Replace the single-column category detail screen with a two-pane product
listing page (PLP) in the style of Blinkit. A left rail lists the
sub-categories of a department (e.g. "Snacks & Drinks"); the right pane shows a
product grid for the selected sub-category. The sub-category tapped on the
previous page is pre-selected on load; tapping another rail item swaps the grid
without navigating.

## Background / current state

- Categories come from the CMS layout API, not from static `villageData`.
  `useHomeLayoutViewModel('app-category-page-layout')` returns `CategorySection[]`.
  Each `CategorySection` has a `title` (department, e.g. "Snacks & Drinks") and
  `items: CategoryItem[]` (sub-categories, e.g. "Snacks & Sweets", "Chocolates",
  "Cold Drinks & Beverages"). Each `CategoryItem.id` is the category `docId`.
- Both the Categories tab (`CategoryGrid` sections) and the Home tab
  ("Shop By Category" grid) render `CategoryGrid`, and tapping a tile currently
  navigates to `/category-details?categoryId=<docId>`.
- `CategoryDetailsScreen` today is single-column (hero + 2-col grid + sort +
  variant sheet) and resolves products from **static** `villageData`, so real
  CMS docIds produce an empty/"not found" screen.
- A real products-by-category endpoint exists and is confirmed working:
  `GET {villageBaseURL}/app/category/flattened/all-products/{categoryId}?skip=0&limit=24`
  with header `x-store-id`. (UA-gated at the edge; the RN client sends its own
  User-Agent, so this is transparent to the app — only relevant to curl probing.)

## Decisions (locked)

1. **Entry point:** Replace `category-details`. Tapping any sub-category tile
   (home or categories page) opens the two-pane PLP with that sub-category
   pre-selected. The rail shows its sibling sub-categories from the same section.
2. **Rail source:** Passed via navigation params from the previous page (the
   `CategoryGrid` already holds the section). No layout refetch inside the PLP.
3. **Product source:** Real API
   `/app/category/flattened/all-products/{categoryId}`.
4. **Card:** Reuse `DynamicProductCard` (it already maps `HomeProduct` and wires
   cart add via the `price/20` unit convention).

## API contract

Request:
```
GET {villageBaseURL}/app/category/flattened/all-products/{categoryId}?skip=0&limit=24
headers: { Accept: '*/*', 'x-store-id': <storeId> }   // getWithoutAuth
```

Response (relevant fields):
```jsonc
{
  "results": [ { "id": "...", "name": "Fruits & Vegetables", "path": "...", "count": 117 } ],
  "products": [
    {
      "_id": "...", "title": "...", "slug": "...",
      "mrp": 55, "listPrice": 50, "dealPrice": 50,
      "landingImage": "https://...", "images": ["https://..."],
      "categoryId": "..."
      // NOTE: no `stock` field
    }
  ]
}
```

- `results[0].count` = total products in the sub-category → drives pagination.
- `products[]` maps cleanly through the existing `mapProduct()` in
  `homeLayoutMapper.ts` (price = `dealPrice ?? listPrice ?? mrp`, image =
  `landingImage || images[0]`).
- **Stock caveat:** the payload has no `stock` field, so `mapProduct` would set
  `inStock = false` for every item. The fetch layer must treat missing `stock`
  as in-stock. Implementation: in the new API mapper, default products with no
  `stock` field to `inStock: true` (e.g. `mapProduct(p)` then override
  `inStock` when `p.stock` is `undefined`).

## Data flow

```
sub-category tile tap (CategoryGrid)
  → router.push('/category-details', {
        categoryId,                            // selected sub-cat docId
        title: section.title,                  // department name → header
        subcategories: JSON.stringify(items),  // rail = sibling sub-cats
    })
  → CategoryDetailsScreen (rewritten: two-pane)
       useCategoryDetailsViewModel (rewritten)
         ├ parse params → railItems[], selectedId (seed), title
         ├ selectedId held in local state; rail tap → setSelectedId (no nav)
         └ useCategoryProductsQuery(selectedId, storeId)
               → { products: HomeProduct[], total: number, name: string }
       Left rail  = railItems (SubcategoryRail, active = selectedId)
       Right pane = DynamicProductCard, 2-col grid
```

## Components / modules

### New

- `src/features/home/data/categoryProductsApi.ts`
  - `getCategoryProducts(storeId, categoryId, skip=0, limit=24)` →
    `{ products: HomeProduct[]; total: number; name: string }`.
  - Uses `apiClient.getWithoutAuth` with `x-store-id` header (mirror
    `homeLayoutApi.ts`). Maps via `mapProduct`, overriding `inStock` to `true`
    when the raw item has no `stock` field. Reads `total` from
    `results[0].count`.

- `src/features/home/data/queries/useCategoryProductsQuery.ts`
  - react-query hook keyed `['category', categoryId, 'products', storeId]`.
  - `enabled: !!categoryId && !!storeId`. `staleTime` a few minutes.
  - v1 fetches the first page (`skip=0, limit=24`). Returns data + total so the
    screen can show a load-more affordance.

- `src/features/home/views/category-details/components/SubcategoryRail.tsx`
  - Vertical scrollable list of sub-categories. Each item: image/icon + title.
    Active item styled (white bg, green left border + green label). Calls
    `onSelect(id)`.

### Rewritten

- `src/features/home/views/category-details/CategoryDetailsScreen.tsx`
  - Two-pane layout: fixed-width left `SubcategoryRail` (~78–84px) + flexible
    right grid (`DynamicProductCard`, 2 columns, width `'100%'` per cell).
  - Header: department `title` + total item count.
  - States: loading skeleton (right pane), empty ("no products"), error +
    retry. Keep `FloatingCartPill`.
  - Drop hero, sort sheet, variant sheet, filter chips.

- `src/features/home/viewmodel/categories/useCategoryDetailsViewModel.ts`
  - Driven by route params (`categoryId`, `title`, `subcategories`) instead of
    static `villageData`. Holds `selectedId` local state seeded from
    `categoryId`. Exposes `railItems`, `title`, `selectedId`, `select`,
    products query result (products, total, loading, error, refetch),
    `cartCount`.
  - Robust param parsing: malformed/empty `subcategories` → rail falls back to
    a single item built from `categoryId` (+ `title`).

### Touched

- `src/features/home/views/home/components/DynamicProductCard.tsx`
  - Add optional `width?: number | string` prop (default `150`) so the PLP grid
    can render full-width cells. No behavior change for existing callers.
  - (Stock handled in the API mapper, not here.)

- `src/features/home/views/home/components/CategoryGrid.tsx`
  - `onPressItem` signature → `(item: CategoryItem, section: CategorySection)`
    so the parent can pass siblings.

- `src/features/home/views/home/components/HomeSections.tsx`
  - `goCategory(item, section)` builds the new nav params
    (`categoryId`, `title`, `subcategories`).

## Out of scope (v1, YAGNI)

- Sort / filter chips (API exposes no sort param).
- Telugu product titles (API returns none).
- Variant bottom sheet on the PLP.
- Infinite scroll beyond a simple load-more; full pagination polish can follow.

## Testing

- Manual: from Categories tab → tap a "Snacks & Drinks" tile → PLP opens with
  that sub-category active, rail = siblings, grid populated from API.
- Rail tap swaps grid without navigation; active styling moves.
- Same flow from Home "Shop By Category".
- Empty sub-category → empty state. Network failure → error + retry.
- Add to cart from grid increments the floating cart pill.
- Back returns to previous screen with prior state intact.
