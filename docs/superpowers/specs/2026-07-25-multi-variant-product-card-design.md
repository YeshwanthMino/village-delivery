# Multi-variant product card + variant sheet

Date: 2026-07-25
Status: approved, ready for implementation plan

## Problem

Products with more than one variant behave inconsistently across the app, and the
card never reflects what the variant sheet did.

Observed today:

1. `DynamicProductCard` (category listing, search, home rails) subscribes only to
   `cart[product.id]`. Variants are stored under `${product.id}-v${index}`, so a
   variant added from the sheet never changes the card. The card stays on its
   `OPTIONS` button forever, showing no quantity.
2. The CTA reads `OPTIONS`, not `ADD` with an options count. The card cannot show
   a count because `HomeProduct` carries only `hasVariants: boolean`.
3. Tapping the CTA fires `getProductDetail` to fetch variant data the app already
   downloaded with the list response and discarded. Until it returns (300-800 ms)
   nothing happens on screen — `isLoadingVariants` is set but never rendered — and
   a failed request means the sheet silently never opens.
4. The card always shows the first variant's price and no pack size, even when a
   different variant is the one in the cart.

## Target behaviour

Applies only to products with **more than one** variant. Single-variant and
variant-less products keep today's behaviour exactly: cart key `product.id`,
direct add, no sheet, no persisted cart line changes meaning.

Card, nothing in the cart:

```
₹310   ₹599
1 pc (250 ml)        ← default variant (variants[0])
┌────────────────┐
│      ADD       │
│   2 options    │   ← sublabel inside the button
└────────────────┘
```

Card, something in the cart:

```
₹1165  ₹1999
1 pc (1 L)           ← last-touched in-cart variant
┌────────────────┐
│  −    3    +   │   ← total quantity across all variants
└────────────────┘
```

Every tap on that control — `ADD`, `−`, `+`, the number — opens the variant sheet.
The sheet owns all quantity edits; the card is display plus one affordance. The
number is the **sum** of every variant line for that product, so it always agrees
with the cart badge.

Sheet: one row per variant with thumbnail, name, price, MRP, savings; `Add` at
zero quantity and a stepper above zero. Stays open across edits.

## Design

### 1. Data layer — retain variants instead of re-fetching

The list endpoints (`/app/category/flattened/all-products/<id>`,
`/app/product`, and the page-layout carousels) already return fully populated
`variantIds`. `mapProduct` (`src/features/home/data/homeLayoutMapper.ts:98`)
reads them for price (`:105`) and summed stock (`:122`), then keeps only
`hasVariants` (`:141`) and drops the array.

Changes:

- `mapVariant` (`homeLayoutMapper.ts:37`) also maps `image`
  (`landingImage || images[0]`), needed for sheet thumbnails.
- `mapProduct` attaches the mapped array to a new `HomeProduct.variants?: Variant[]`
  (reusing `Variant` from `src/base/types/village.types`). `hasVariants` keeps its
  current meaning: `variantIds.length > 1`.
- `getProductDetail` and `isLoadingVariants` are deleted from
  `CategoryDetailsScreen` (`:25-47`), `ProductCarouselRow` (`:25-48`), and
  `SearchScreen`. Each builds the sheet's `Product` from the card's `HomeProduct`.

Network cost: zero. The bytes are already on the wire; this retains parsed data
instead of re-requesting it. Memory cost: roughly 100 bytes per variant per list
page.

Fallback: if a response returns `variantIds` empty or missing while more than one
variant is expected, the card falls back to today's path — fetch the detail, then
open the sheet.

### 2. Store — which variant the card mirrors

`useVillageStore` gains `lastVariantKey: Record<productId, cartKey>`:

- `addToCart` / `setQuantity` set it. The productId comes from the passed
  `CartSnapshot`, falling back to `cartSnapshots[key].productId`.
- `decFromCart`, when the last-touched line reaches zero, reassigns the entry to
  another still-in-cart variant of the same product, and deletes the entry when
  none remain.
- Persisted alongside `cart` and `cartSnapshots`; `hydrateCart` tolerates its
  absence in older payloads.

Cards read the resulting `cartSnapshots[lastVariantKey[productId]]`, whose
`weight` field already holds the variant name (`bill.ts:42`) and whose `price` /
`mrp` are the variant's. No extra lookup into product data is needed.

Selectors stay primitive-valued (a string key, a number) so no new object
identity is created per render.

### 3. Cards

A pure helper, `resolveVariantCardView({ variants, lastSnapshot, totalCount })`,
returns `{ price, mrp, packLabel, mode, optionsLabel }`.

- `totalCount === 0` → `mode: 'add'`, price/pack from `variants[0]`,
  `optionsLabel: "N options"`.
- `totalCount > 0` → `mode: 'stepper'`, price/pack from `lastSnapshot`.

`DynamicProductCard`, `ProductCard`, and `MiniProductCard` all render from this
helper, keeping the display logic in one tested place. `DynamicProductCard` gains
the pack-size line it currently lacks, rendered only for multi-variant products
(`HomeProduct` has no `weight` field for the others).

### 4. Sheet

`VariantBottomSheet` keeps its current structure and props. It now receives
variants with no network wait, and each row renders `variant.image` as a
thumbnail when present.

### 5. Tests

- Mapper: variants retained, `image` fallback order, `hasVariants` still means
  "more than one".
- Store: `lastVariantKey` set on add, reassigned when the last-touched line hits
  zero, deleted when the product leaves the cart, and restored through a
  persistence round-trip.
- `resolveVariantCardView`: zero / one-in-cart / several-in-cart, and the
  variant-less passthrough.

## Out of scope

Cart keys are variant **index**-based (`${id}-v${i}`), so a persisted cart line
re-points if the API ever reorders a product's variants. Snapshots carry
`variantId` and price, so billing stays correct. Re-keying by `variantId` would
invalidate existing persisted carts and belongs in its own change.
