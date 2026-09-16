# Product & Category Visibility Logic — Design

**Date:** 2026-06-30
**Status:** Approved

## Goal

Apply consistent visibility rules across the app:

1. **Inactive categories** (`active: false`) must never display on the Home page,
   the Categories page, or the Category Details page (its subcategory rail).
2. **Inactive products** (`active: false`) must never appear on the Home page,
   product listing pages, Category Details, or search results.
3. **Out-of-stock products** stay visible but render in a greyed/disabled state,
   clearly labelled "Out of Stock", with Add actions disabled.

## Current state (already implemented)

- **Inactive products** are already filtered everywhere via
  `isProductActive(p) = p?.active !== false` (a missing flag is treated as
  active): home carousels (`mapProductCarousel`), category listings
  (`categoryProductsApi`), search (`searchProductsApi`), and similar-products on
  the detail page (`productDetailApi`). **No new product-filtering work is
  required.**
- **Out-of-stock products** in `DynamicProductCard` (the card used by Home,
  Category Details, and Search) already render a greyed overlay, an
  "Out of stock" label, and a disabled ADD button.

## Gaps this change addresses

1. **Inactive categories are not filtered.** `mapCategory` in
   `homeLayoutMapper.ts` passes all `featuredMenus`/`menuItems` through
   untouched, so inactive categories still show on Home, the Categories page,
   and the Category Details rail (all driven by the same dynamic page-layout).
2. **The product detail page ignores stock.** `ProductDetail` has no `inStock`
   field and `ProductCartBar` always shows an enabled "Add to Cart".
3. **The product detail page ignores `active`.** An inactive product is hidden
   from every listing but is still reachable by a direct/deep link to its
   detail page (by id), where it renders normally.

> **Note:** There is no "Buy Now" button anywhere in the app — only
> "Add to Cart". That part of the original request has nothing to attach to and
> is intentionally out of scope.

## Design

### 1. Inactive category filtering (mapper chokepoint)

Mirror the existing product-filtering approach — filter in one place so every
category surface inherits it.

In `src/features/home/data/homeLayoutMapper.ts`:

- Add `isCategoryActive(c) = c?.active !== false` (same convention as
  `isProductActive`; a missing flag is treated as active).
- In `mapCategory`, filter `menuItems` by `isCategoryActive` before mapping.
- In `mapHomeLayout`, skip a whole `FeaturedMenu` component when the menu
  document itself is inactive (`!isCategoryActive(menu)`).

This single change covers all three category surfaces:

- **Home page** and **Categories page** render `CategorySection.items` via
  `CategoryGrid`, which already returns `null` for an empty section — so an
  emptied section auto-hides.
- **Category Details rail** is built from `section.items` passed as the
  `subcategories` route param, so it receives the already-filtered list.

**Trade-off:** the category `active` flag location is not verifiable from a
fixture (no sample payload in the repo). Reusing `active !== false` degrades
safely — if the backend nests the flag differently, categories are shown rather
than wrongly hidden.

### 2. Product detail page — out-of-stock and inactive

**Type changes** in `src/features/product/data/productDetail.types.ts`:

- Add `inStock: boolean`.
- Add `active: boolean`.

**Mapper** in `src/features/product/data/productDetailApi.ts` (`mapProductDetail`):

- `inStock`: `num(p?.stock) > 0`; treat absent `stock` as in-stock, matching the
  list APIs (`p?.stock === undefined → true`).
- `active`: `p?.active !== false`.

**Out-of-stock UI** — `ProductCartBar`
(`src/features/product/views/components/ProductCartBar.tsx`) gets an `inStock`
prop. When out of stock it renders a single **disabled** bar reading
**"Out of Stock"** (greyed, no press handler), fully replacing the Add-to-Cart
button and the quantity stepper. (Confirmed: the OOS bar replaces the Add UI
even if the item happens to already be in the cart; cart adjustments are a
separate concern handled on the cart screen.)

**Inactive UI** — `ProductDetailScreen`
(`src/features/product/views/ProductDetailScreen.tsx`) checks `active`. When
false, it renders a simple centered **"This product is no longer available"**
state with a working back button, instead of the normal product content.

> Categories have no standalone detail-fetch that returns `active` (the
> category-details page only fetches the category's *products*, not a category
> document). Inactive categories are therefore handled purely by list-level
> filtering; there is no category "unavailable" page to render.

## Testing

- Extend `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:
  - `isCategoryActive` treats `active: false` as inactive and missing/`true` as
    active.
  - `mapCategory` drops inactive `menuItems`.
  - `mapHomeLayout` drops an inactive `FeaturedMenu` section.
- Extend `src/features/product/data/__tests__/productDetailApi.test.ts`:
  - `inStock` maps from `stock` (`> 0` true, `0`/missing handled per rule).
  - `active` maps from `active !== false`.

## Out of scope

- "Buy Now" — no such control exists in the app.
- Category "unavailable" direct-link state — no category detail-fetch exposes
  `active`; covered by list-level filtering instead.
- Cart-screen behavior for items that go out of stock after being added.
