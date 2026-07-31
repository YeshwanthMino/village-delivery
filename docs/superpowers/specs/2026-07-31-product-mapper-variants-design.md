# Product mapper: `variants` key, full variant field mapping, category fields

Date: 2026-07-31
Status: approved, ready for implementation plan

## Problem

The backend now returns products with populated variants under a `variants` key
instead of `variantIds`, alongside two new product-level category fields. This
affects four endpoints:

- `GET /app/product/:id` (detail) — `mapApiProduct` → `mapProductDetail`, and
  `mapProductWithVariants` via `getProductById`
- `GET /app/products` — `mapProductWithVariants`
- `GET /app/category/flattened/all-products/:id` — `mapProduct`
- product search — `mapProduct`

Representative payload (Kandhi Pappu, 6 variants across two quality tiers):

```json
{
  "_id": "6a69e3c4fcbaf7b551f79ab0",
  "title": "కంది పప్పు | Kandhi Pappu (Toor Dal)",
  "teluguTitle": "కంది పప్పు",
  "landingImage": "https://ik.imagekit.io/.../Kandi_pappu.webp",
  "categoryId": "68a57d05701cbce1ebb1e924",
  "category": "Pulses",
  "categoryPath": "_Pulses",
  "manufacturerId": "68a5af6ae286fe170cd176af",
  "rating": 0,
  "reviews": 0,
  "variants": [
    {
      "_id": "6a6a3284fcbaf7b551f79ac2",
      "active": true,
      "title": "కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Normal Quality",
      "slug": "or-kandhi-pappu-toor-dal-1-kg-normal-quality",
      "teluguTitle": "కంది పప్పు - 1 kg - Normal Quality",
      "mrp": 220, "listPrice": 200, "dealPrice": 200,
      "taxType": "NIL", "taxRate": 0, "hasFreeItem": true,
      "landingImage": "https://ik.imagekit.io/.../Kandi_pappu.webp",
      "images": ["https://ik.imagekit.io/.../Kandi_pappu.webp"],
      "stock": 100
    }
  ]
}
```

### What breaks today

| Field | Current behaviour |
|---|---|
| `variants` | Not read at all. Every mapper looks only at `variantIds`, so products map with zero variants: no price, no stock, ₹0 everywhere. |
| `categoryId` (bare string) | `populatedCategoryId` handles only the populated `{_id, title}` shape and returns `''` for a string, so `Product.categoryId` comes back empty. |
| `category`, `categoryPath` | No field on `Product` or `HomeProduct`. |
| `landingImage` (product level) | `mapApiProduct` ignores it and reads the first variant's image only. `mapProduct` and `mapProductWithVariants` already fall back to it. |
| `landingImage` (variant level) | Collapsed into `Variant.image` as `landingImage \|\| images[0]`. The raw value is not preserved. |

Two latent issues found while reading, both in scope:

- `mapVariant` sets `active: Boolean(v?.active)`, so a **missing** flag maps to
  `false` — the opposite of `isProductActive`, where a missing flag means active.
  Nothing reads `variant.active` today, so this is latent rather than broken.
- `mapProductWithVariants` reads `p.variantIds[0]` directly (bypassing
  `mapVariants`) for an image fallback, so it would keep reading the old key even
  after `mapVariants` is updated.

## Approach

Resolve the new key **once**, in the shared `mapVariants` helper that all four
mappers already funnel through. The alternatives considered were per-mapper
handling (three copies to keep in sync — the existing "mapProduct agrees
field-for-field with mapApiProduct" test exists because drift between these
mappers has bitten before) and normalizing `variants` → `variantIds` at the API
layer (hands mappers an object shaped like a field name the backend no longer
sends).

`variantIds` keeps working as a fallback. The home page-layout feed
(`GET /app/page-layout/path/main`) was not confirmed as migrated, and it shares
`mapProduct` with category and search — dropping the old key would silently
strip variants from the home rails.

## Changes

### 1. Variant field mapping — `src/features/home/data/productMapper.ts`

`RawVariant` and `Variant` (`src/base/types/village.types.ts`) each gain
`landingImage?: string`. `mapVariant` maps it verbatim: the string when present,
`undefined` when absent.

`Variant.image` keeps its current derivation (`landingImage || images[0]`) and is
**not** replaced. It is read by the cart bill (`src/features/cart/domain/bill.ts:50`),
`useProductDetailViewModel.ts:54`, and `ProductDetailScreen.tsx:120`, all of
which want "whatever image to show", not "the landing image specifically".

`mapVariant` changes `active: Boolean(v?.active)` to `active: v?.active !== false`,
matching `isProductActive`.

After this change every field in the DTO maps to a `Variant` field:

| DTO | `Variant` |
|---|---|
| `_id` | `id` |
| `title` | `name` |
| `teluguTitle` | `nameTE` |
| `slug` | `slug` |
| `description` | `description` |
| `mrp` / `listPrice` / `dealPrice` | `mrp` / `listPrice` / `dealPrice` (converted to internal units) |
| `stock` (or `stockId.stock`) | `stock` |
| `landingImage` | `landingImage` (new), plus `image` (derived) |
| `images` | `images` |
| `taxType` / `taxRate` | `taxType` / `taxRate` |
| `hasFreeItem` | `hasFreeItem` |
| `active` | `active` |

`hsn` stays on `Variant` as optional; it is absent from this payload.

### 2. Variant source — `mapVariants`

Signature changes from `mapVariants(raw: unknown)` to
`mapVariants(p: RawApiProduct)`, resolving `p.variants ?? p.variantIds`
internally via a new exported `rawVariants(p): unknown[]` helper. `RawApiProduct`
gains `variants?: unknown`. Unpopulated-ref filtering (dropping bare ObjectId
strings) is unchanged and applies to both keys.

Call sites updated to pass `p`: `mapApiProduct`, `mapProductWithVariants`,
`mapProduct`. `mapProductWithVariants`'s direct `p.variantIds[0]` image fallback
switches to `rawVariants(p)[0]` so both paths read the same array.

### 3. Product-level fields

`populatedCategoryId` gains a bare-string branch:

- string input → returned as-is
- `{ _id }` object → `String(_id)`
- anything else → `''`

`Product` and `HomeProduct` gain `categoryName?: string` (from `category`) and
`categoryPath?: string`, mapped in `mapApiProduct`, `mapProductWithVariants`, and
`mapProduct`. Both are `undefined` when the field is absent or empty.

`mapApiProduct` gains the product-level image fallback the other two mappers
already have: first variant's image, then `p.landingImage`, then `p.images[0]`.

### 4. Tests

`src/features/home/data/__tests__/homeLayoutMapper.test.ts` — add the Kandhi Pappu
payload as a fixture and assert:

- variants map from the `variants` key across `mapProduct`, `mapApiProduct`, and
  `mapProductWithVariants`
- `variantIds` still maps (existing fixtures continue to pass unchanged)
- a product carrying both keys prefers `variants`
- `categoryId` survives as a bare string; `categoryName` and `categoryPath` map
- `landingImage` round-trips on each variant, and `image` still derives correctly
- a variant with no `active` flag maps to `active: true`
- the existing "mapProduct agrees field-for-field with mapApiProduct" assertion
  holds for the new shape

`src/features/product/data/__tests__/productDetailApi.test.ts` — add a case
asserting the `variants` key reaches `ProductDetail.variants` with correct prices
and stock.

## Out of scope

The `variants[0]` product-level price rule. All three mappers take the first
variant for the card price, so this payload renders ₹200 (the 1 kg pack) rather
than the cheapest option. That is pre-existing behaviour across every endpoint,
not a regression from this change, and switching to cheapest-variant pricing is a
separate behavioural decision.
