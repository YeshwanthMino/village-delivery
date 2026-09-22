# Search API Wiring — Design

**Date:** 2026-06-19
**Status:** Approved (pending spec review)

## Problem

`SearchScreen` still runs **local static search**: `useSearchViewModel` pulls
`useProductsQuery` (returns the hard-coded `ALL_PRODUCTS` from `villageData.ts`)
and filters client-side with `.includes()`. A real `/app/product` search API
exists but is not wired in. Users get stale, store-agnostic static results.

## Goal

Replace static search with live, store-scoped API search against
`GET /app/product`, keyed by the `x-store-id` header.

## API

`GET {villageBaseURL}/app/product` — public-ish, keyed by `x-store-id`.
Relevant query params (from swagger):

- `search` — text term
- `sort` — `_id:desc`
- `skip`, `limit` — pagination (0 / 24)
- `categoryId` — **server-side category scope** (enables category-entry path)

Response shape mirrors the category endpoint: `{ products: [...], results: [{ count }] }`.

Confirmed raw product keys (curl, 2026-06-19):
`_id, brandId, categoryId, dealPrice, description, images, landingImage,
listPrice, mrp, similarProducts, slug, title`.
**No `variants` / `options` field** — API products carry no variants.

## Decisions

1. **Server-side category scope.** The endpoint supports `categoryId`, so the
   category-entry path (nav passes `categoryId`) is handled by passing the param
   to the same search call — not a client-side filter.
2. **Card swap.** Render results with `DynamicProductCard` (the API product card,
   already used by the two-pane PLP) instead of the static `ProductCard`. Results
   are now `HomeProduct[]`.
3. **Variant sheet removed.** Investigation confirmed API products have no
   variant data; `DynamicProductCard` already hardcodes `variantIndex: null` and
   adds to cart directly. The `VariantBottomSheet` + `variantProduct` state are
   dead code against API data — remove them from the search screen.
4. **Debounce 500ms.** Live search-as-you-type, debounced to limit request volume.

## Components

### 1. `searchProductsApi.ts`
Extend `searchProducts` to take an options object:

```ts
searchProducts(
  storeId: string,
  term: string,
  opts?: { categoryId?: string; skip?: number; limit?: number },
): Promise<SearchProductsResult>
```

- Build query: `search` (omit when empty), `sort=_id:desc`, `skip`, `limit`,
  `categoryId` (when provided).
- Map via `mapProduct`, absent `stock` → `inStock: true` (same as category api).
- Return `{ products: HomeProduct[]; total }`.

### 2. `useProductSearchQuery.ts`
Accept `categoryId`:

```ts
useProductSearchQuery(term: string, categoryId?: string, limit = 24)
```

- `queryKey`: `[...queryKeys.products.search(trimmed), { storeId, categoryId, limit }]`.
- `enabled`: `!!storeId && (trimmed.length > 0 || !!categoryId)`.
- Keep `placeholderData: keepPreviousData`, `staleTime: 5min`.

### 3. `useSearchViewModel.ts` (rewrite data path)
- Remove `useProductsQuery`, `CATEGORIES` validation, local `.filter()` memo,
  `variantProduct` / `openVariants` / `closeVariants`.
- Keep `query` + `setQuery` (raw input) and `activeCategoryId` from params.
- Add 500ms debounce: derive `debouncedQuery` from `query` (e.g. `setTimeout`
  in `useEffect`, cleared on change).
- `const { data, isLoading, isFetching } = useProductSearchQuery(debouncedQuery, activeCategoryId ?? undefined)`.
- Expose: `query`, `setQuery`, `activeCategoryId`, `categoryName`,
  `clearCategory`, `results: data?.products ?? []`, `total: data?.total ?? 0`,
  `isLoading`, `cartCount`.

### 4. `SearchScreen.tsx`
- Swap `ProductCard` → `DynamicProductCard` (drop `openVariants` prop).
- Remove `VariantBottomSheet` import + render.
- Add loading state (spinner) while `isLoading` and query/category active.
- Keep empty state (`start_typing`) and no-results state (`no_results`).
- Result count uses `vm.total` (server count) instead of `results.length`.

## Data Flow

```
user types ─▶ setQuery ─(500ms debounce)─▶ debouncedQuery
                                              │
activeCategoryId ─────────────────────────────┤
                                              ▼
                            useProductSearchQuery(term, categoryId)
                                              │  (enabled: storeId & (term|category))
                                              ▼
                            searchProducts ─▶ GET /app/product?search&categoryId&...
                                              │
                                              ▼
                            HomeProduct[] ─▶ DynamicProductCard grid
```

## Error / Edge Handling

- No `storeId` (location not set) → query disabled, empty state shown.
- Empty term + no category → query disabled, `start_typing` state.
- API error → react-query `isError`; show no-results / existing empty copy
  (no new error UI in scope; `apiClient` already maps network errors).
- Rapid typing → debounce + `keepPreviousData` keeps last results visible, no flicker.

## Out of Scope

- Pagination / infinite scroll (single 24-item page, matches category screen).
- Brand / price / manufacturer filters (params exist, unused for now).
- Search history, suggestions, recent searches.
- Variant selection on search results (API has none).

## Testing

- `searchProducts` builds correct query string with/without `categoryId`, omits
  empty `search`, maps products, defaults absent stock to in-stock.
- `useProductSearchQuery` enabled-gating: off when no storeId, off when empty
  term + no category, on otherwise.
- Manual: type term → API results render; enter via category → category results;
  clear category; no-results term; loading spinner.
