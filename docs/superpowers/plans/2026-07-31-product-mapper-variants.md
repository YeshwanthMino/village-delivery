# Product Mapper: `variants` Payload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every product mapper read variants from the backend's new `variants` key, map all variant DTO fields onto the `Variant` dataclass, and carry the new product-level category fields through to the UI types.

**Architecture:** All four product endpoints funnel through two files — `src/features/home/data/productMapper.ts` (the shared `mapVariant`/`mapVariants`/`populatedCategoryId` helpers plus `mapApiProduct`) and `src/features/home/data/homeLayoutMapper.ts` (`mapProduct`, `mapProductWithVariants`). The new key is resolved once in a shared `rawVariants(p)` helper so all three product mappers pick it up together, with `variantIds` kept as a fallback for the unmigrated page-layout feed.

**Tech Stack:** TypeScript, React Native / Expo, Jest. Run tests with `npx jest`.

**Background you need before starting:**

- **Prices are in "units", not rupees.** `1 unit = 1/20 ₹` (see `src/shared/utils/currency.ts`). Mappers call `toUnits()` at the API boundary; tests assert through `rupees()` so a double-conversion bug is visible. Never assert a raw price number.
- **Mappers take `unknown`-typed raw fields on purpose.** `RawVariant`/`RawApiProduct` declare every field as `unknown` because nothing is validated server-side. Every read goes through `num()`, `String()`, or `Boolean()`. Keep that style — do not "improve" these to concrete types.
- **`mapProduct` and `mapApiProduct` must produce identical `variants` arrays.** There is an existing test asserting this field-for-field. It exists because drift between these mappers previously shipped incomplete orders (the variant sheet reads tax and free-item fields off these objects). Do not weaken it.

**Spec:** `docs/superpowers/specs/2026-07-31-product-mapper-variants-design.md`

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/base/types/village.types.ts` | Modify | `Variant` gains `landingImage`; `Product` gains `categoryName`, `categoryPath` |
| `src/features/home/data/productMapper.ts` | Modify | Variant field mapping, `rawVariants`/`mapVariants` key resolution, `populatedCategoryId`, `mapApiProduct` |
| `src/features/home/data/homeLayoutMapper.ts` | Modify | `mapProduct` and `mapProductWithVariants` call sites, new category fields, image-fallback fix |
| `src/features/home/data/homeLayout.types.ts` | Modify | `HomeProduct` gains `categoryName`, `categoryPath` |
| `src/features/product/data/productDetail.types.ts` | Modify | Doc comment for `categoryTitle`'s new fallback |
| `src/features/product/data/productDetailApi.ts` | Modify | `categoryTitle` falls back to top-level `category` |
| `src/features/home/data/__tests__/homeLayoutMapper.test.ts` | Modify | New-key, category-field, and `landingImage` coverage + Kandhi Pappu fixture |
| `src/features/product/data/__tests__/productDetailApi.test.ts` | Modify | New-key coverage on the detail path |

---

## Task 1: Map `landingImage` verbatim onto `Variant`

Today `mapVariant` collapses the DTO's `landingImage` into `Variant.image` as `landingImage || images[0]`, so the raw value is unrecoverable. Add it as its own field. **Keep `image` exactly as it is** — it is read by `src/features/cart/domain/bill.ts:50`, `src/features/product/viewmodel/useProductDetailViewModel.ts:54`, and `src/features/product/views/ProductDetailScreen.tsx:120`, all of which want "the image to display", not "the landing image specifically".

**Files:**
- Modify: `src/base/types/village.types.ts:12`
- Modify: `src/features/home/data/productMapper.ts:114`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/home/data/__tests__/homeLayoutMapper.test.ts`, inside the existing `describe('mapProduct variants', ...)` block (after the `'falls back to the first gallery image...'` test at line 126):

```typescript
  it('keeps the raw landingImage alongside the resolved image', () => {
    const variants = mapProduct(raw).variants!;
    // v1 has a landingImage; v2 has only a gallery image.
    expect(variants[0].landingImage).toBe('https://cdn/250.jpg');
    expect(variants[0].image).toBe('https://cdn/250.jpg');
    expect(variants[1].landingImage).toBeUndefined();
    expect(variants[1].image).toBe('https://cdn/1l.jpg');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "landingImage alongside"`

Expected: FAIL — `Property 'landingImage' does not exist on type 'Variant'` (TypeScript), or `expected 'https://cdn/250.jpg', received undefined`.

- [ ] **Step 3: Add the field to the dataclass**

In `src/base/types/village.types.ts`, in `interface Variant`, replace this line:

```typescript
  image?: string;
```

with:

```typescript
  /** The variant's own landing image, verbatim from the API. Prefer `image`
   *  for display — that one already falls back to the first gallery image. */
  landingImage?: string;
  image?: string;
```

- [ ] **Step 4: Map it**

In `src/features/home/data/productMapper.ts`, in `mapVariant`, replace this line:

```typescript
    image: primaryImage ? String(primaryImage) : undefined,
```

with:

```typescript
    landingImage: v?.landingImage ? String(v.landingImage) : undefined,
    image: primaryImage ? String(primaryImage) : undefined,
```

- [ ] **Step 5: Run the whole mapper suite**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts`

Expected: PASS, all tests. The "agrees field-for-field with mapApiProduct" test must still pass — both mappers share `mapVariant`, so the new field appears on both sides.

- [ ] **Step 6: Commit**

```bash
git add src/base/types/village.types.ts src/features/home/data/productMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat(mapper): preserve the variant's raw landingImage"
```

---

## Task 2: Treat a missing variant `active` flag as active

`mapVariant` currently uses `Boolean(v?.active)`, so a variant with no `active` field maps to `active: false` — the opposite of `isProductActive` and `isCategoryActive`, which both treat a missing flag as active. Nothing reads `variant.active` yet, so this is a latent inconsistency being fixed ahead of its first consumer.

**Files:**
- Modify: `src/features/home/data/productMapper.ts:120`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/home/data/__tests__/homeLayoutMapper.test.ts`, inside `describe('mapProduct variants', ...)`, after the test added in Task 1:

```typescript
  it('treats a variant with no active flag as active, like every other active check', () => {
    const variants = mapProduct(raw).variants!;
    expect(variants[0].active).toBe(true); // fixture sets no active flag
    const explicit = mapProduct({
      ...raw,
      variantIds: [{ ...raw.variantIds[0], active: false }],
    });
    expect(explicit.variants![0].active).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "no active flag"`

Expected: FAIL — `expected true, received false`.

- [ ] **Step 3: Fix the coercion**

In `src/features/home/data/productMapper.ts`, in `mapVariant`, replace:

```typescript
    active: Boolean(v?.active),
```

with:

```typescript
    // A missing flag means active — matches isProductActive/isCategoryActive.
    active: v?.active !== false,
```

- [ ] **Step 4: Run the suite**

Run: `npx jest src/features/home/data`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/home/data/productMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "fix(mapper): treat a missing variant active flag as active"
```

---

## Task 3: Read variants from the new `variants` key

The backend now sends populated variants under `variants`. Resolve the key once, in a shared helper, so all three product mappers pick it up together. `variantIds` stays supported — the page-layout feed shares `mapProduct` with category and search and was not confirmed as migrated.

**Files:**
- Modify: `src/features/home/data/productMapper.ts:67`, `:129`, `:142`
- Modify: `src/features/home/data/homeLayoutMapper.ts:18`, `:118`, `:129`, `:172`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
describe('variants arriving under the new `variants` key', () => {
  const newShape = {
    _id: 'p9',
    title: 'Kandhi Pappu',
    variants: [
      { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 100, landingImage: 'https://cdn/kp.webp' },
      { _id: 'v2', title: '250 gm', mrp: 30, dealPrice: 28, stock: 0 },
    ],
  };

  it('maps them through mapProduct', () => {
    const product = mapProduct(newShape);
    expect(product.variants).toHaveLength(2);
    expect(product.variants![0].id).toBe('v1');
    expect(rupees(product.price)).toBe('₹200');
    expect(rupees(product.mrp)).toBe('₹220');
    expect(product.stock).toBe(100);
    expect(product.inStock).toBe(true);
    expect(product.hasVariants).toBe(true);
    expect(product.image).toBe('https://cdn/kp.webp');
  });

  it('maps them through mapApiProduct, agreeing field-for-field with mapProduct', () => {
    expect(mapApiProduct(newShape).variants).toEqual(mapProduct(newShape).variants);
    expect(mapApiProduct(newShape).stock).toBe(100);
  });

  it('maps them through mapProductWithVariants', () => {
    const product = mapProductWithVariants(newShape);
    expect(product.variants).toHaveLength(2);
    expect(rupees(product.price)).toBe('₹200');
    // product.image is asserted in Task 7, which fixes its fallback chain.
  });

  it('prefers `variants` when a response carries both keys', () => {
    const both = {
      ...newShape,
      variantIds: [{ _id: 'old', title: 'stale', mrp: 999, dealPrice: 999, stock: 1 }],
    };
    expect(mapProduct(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(mapProductWithVariants(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(mapApiProduct(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('still drops unpopulated refs under the new key', () => {
    const withRef = { ...newShape, variants: ['64f0000000000000000000aa', newShape.variants[0]] };
    const product = mapProduct(withRef);
    expect(product.variants).toHaveLength(1);
    expect(product.variants![0].id).toBe('v1');
    expect(product.hasVariants).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "new \`variants\` key"`

Expected: FAIL — `expected 2, received undefined` (variants are not read at all today).

- [ ] **Step 3: Add `variants` to the raw type and the `rawVariants` helper**

In `src/features/home/data/productMapper.ts`, in `interface RawApiProduct`, replace:

```typescript
  /** Populated variant objects, or unpopulated ObjectId refs — see `mapVariants`. */
  variantIds?: unknown;
```

with:

```typescript
  /** Populated variant objects — the key newer endpoints send. See `rawVariants`. */
  variants?: unknown;
  /** Legacy key: populated variant objects, or unpopulated ObjectId refs. */
  variantIds?: unknown;
```

- [ ] **Step 4: Replace `mapVariants` with the product-taking version**

In the same file, replace this whole block:

```typescript
/**
 * Maps a raw variantIds array, dropping unpopulated refs (a raw ObjectId
 * string instead of the populated variant object) so callers never see a
 * nameless, ₹0 row.
 */
export function mapVariants(raw: unknown): Variant[] {
  return Array.isArray(raw)
    ? raw.filter((v): v is RawVariant => v != null && typeof v === 'object').map(mapVariant)
    : [];
}
```

with:

```typescript
/**
 * The raw variant array as the backend sends it. Newer endpoints populate
 * `variants`; the page-layout feed still sends `variantIds` (populated objects
 * or bare ObjectId refs). `variants` wins when a response carries both, so a
 * half-migrated response can never serve stale variant data.
 *
 * Exported because mapProductWithVariants needs the *raw* first entry for an
 * image fallback — reading `p.variantIds[0]` there directly is what would
 * otherwise keep it on the old key.
 */
export function rawVariants(p: RawApiProduct): unknown[] {
  const raw = p?.variants ?? p?.variantIds;
  return Array.isArray(raw) ? raw : [];
}

/**
 * Maps a product's variants, dropping unpopulated refs (a raw ObjectId
 * string instead of the populated variant object) so callers never see a
 * nameless, ₹0 row.
 */
export function mapVariants(p: RawApiProduct): Variant[] {
  return rawVariants(p)
    .filter((v): v is RawVariant => v != null && typeof v === 'object')
    .map(mapVariant);
}
```

- [ ] **Step 5: Update the `mapApiProduct` call site**

In the same file, in `mapApiProduct`, replace:

```typescript
  const variants = mapVariants(p?.variantIds);
```

with:

```typescript
  const variants = mapVariants(p);
```

- [ ] **Step 6: Update the two `homeLayoutMapper` call sites and its raw-first-variant read**

In `src/features/home/data/homeLayoutMapper.ts`, replace the import on line 18:

```typescript
import { mapVariants, populatedCategoryId, RawApiProduct, RawVariant } from './productMapper';
```

with:

```typescript
import { mapVariants, populatedCategoryId, rawVariants, RawApiProduct, RawVariant } from './productMapper';
```

In `mapProductWithVariants`, replace:

```typescript
  const variants = mapVariants(p?.variantIds);
```

with:

```typescript
  const variants = mapVariants(p);
```

In the same function, replace:

```typescript
  const rawFirstVariant = (Array.isArray(p?.variantIds) ? p.variantIds[0] : undefined) as
    | RawVariant
    | undefined;
```

with:

```typescript
  const rawFirstVariant = rawVariants(p)[0] as RawVariant | undefined;
```

This keeps the existing (buggy) image fallback reading the right array. Task 7
deletes this line entirely and removes the `rawVariants`/`RawVariant` imports
again — that is intentional, not a mistake. Doing it in two steps keeps this task
a pure key-resolution change with no behaviour drift.

In `mapProduct`, replace:

```typescript
  const mapped = mapVariants(p?.variantIds);
```

with:

```typescript
  const mapped = mapVariants(p);
```

- [ ] **Step 7: Run the full suite**

Run: `npx jest`

Expected: PASS. Every existing `variantIds` test must still pass — `rawVariants` falls back to it.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors. If `mapVariants` is called anywhere else with a raw array, the compiler will point at it — fix those call sites to pass the product.

- [ ] **Step 9: Commit**

```bash
git add src/features/home/data/productMapper.ts src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat(mapper): read variants from the new \`variants\` key"
```

---

## Task 4: Accept a bare-string `categoryId`

`populatedCategoryId` handles only the populated `{ _id, title }` shape and returns `''` for a plain id string, so `Product.categoryId` comes back empty for the new payload. `mapProduct` has the mirror-image problem: it uses `str(p?.categoryId)`, which yields `"[object Object]"` for the populated shape. One helper, used by all three.

**Files:**
- Modify: `src/features/home/data/productMapper.ts:73-78`
- Modify: `src/features/home/data/homeLayoutMapper.ts:209`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
describe('categoryId shapes', () => {
  const bare = { _id: 'p1', title: 'Kandhi Pappu', categoryId: '68a57d05701cbce1ebb1e924' };
  const populated = { _id: 'p1', title: 'Kandhi Pappu', categoryId: { _id: 'c1', title: 'Pulses' } };

  it('reads a bare id string', () => {
    expect(mapApiProduct(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(mapProductWithVariants(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(mapProduct(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
  });

  it('reads a populated categoryId object', () => {
    expect(mapApiProduct(populated).categoryId).toBe('c1');
    expect(mapProductWithVariants(populated).categoryId).toBe('c1');
    expect(mapProduct(populated).categoryId).toBe('c1');
  });

  it('yields no categoryId when the field is absent', () => {
    expect(mapApiProduct({ _id: 'p1', title: 'x' }).categoryId).toBe('');
    expect(mapProduct({ _id: 'p1', title: 'x' }).categoryId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "categoryId shapes"`

Expected: FAIL — `expected '68a57d05701cbce1ebb1e924', received ''` for `mapApiProduct`, and `expected 'c1', received '[object Object]'` for `mapProduct`.

- [ ] **Step 3: Add the bare-string branch**

In `src/features/home/data/productMapper.ts`, replace this whole function:

```typescript
/** Narrow the loosely-typed `categoryId` to the populated `{ _id }` shape a
 *  couple of mappers expect; other endpoints send a bare id string instead,
 *  which has no `_id` to read and falls through to the empty default. */
export function populatedCategoryId(categoryId: unknown): string {
  if (categoryId && typeof categoryId === 'object' && '_id' in categoryId) {
    return String((categoryId as { _id?: unknown })._id ?? '');
  }
  return '';
}
```

with:

```typescript
/** Read an id out of the loosely-typed `categoryId`, which arrives in two
 *  shapes depending on the endpoint: a bare id string, or a populated
 *  `{ _id, title }` object. Anything else yields the empty default. */
export function populatedCategoryId(categoryId: unknown): string {
  if (typeof categoryId === 'string') return categoryId;
  if (categoryId && typeof categoryId === 'object' && '_id' in categoryId) {
    return String((categoryId as { _id?: unknown })._id ?? '');
  }
  return '';
}
```

- [ ] **Step 4: Route `mapProduct` through the same helper**

In `src/features/home/data/homeLayoutMapper.ts`, in `mapProduct`, replace:

```typescript
    // Unlike mapApiProduct/mapProductWithVariants, this endpoint's categoryId
    // arrives unpopulated (a bare id string) — see RawApiProduct's doc comment.
    categoryId: str(p?.categoryId),
```

with:

```typescript
    // Both shapes (bare id string, populated object) resolve through the same
    // helper — see RawApiProduct's doc comment. HomeProduct's categoryId is
    // optional, so an absent field stays undefined rather than becoming ''.
    categoryId: populatedCategoryId(p?.categoryId) || undefined,
```

- [ ] **Step 5: Run the suite**

Run: `npx jest`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/data/productMapper.ts src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "fix(mapper): accept a bare-string categoryId in every product mapper"
```

---

## Task 5: Carry `category` and `categoryPath` through to the UI types

The payload adds a human-readable `category` ("Pulses") and a `categoryPath` ("_Pulses"). Neither has a home on `Product` or `HomeProduct`.

**Files:**
- Modify: `src/base/types/village.types.ts:41`
- Modify: `src/features/home/data/homeLayout.types.ts:33`
- Modify: `src/features/home/data/productMapper.ts`
- Modify: `src/features/home/data/homeLayoutMapper.ts`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
describe('category name and path', () => {
  const raw = {
    _id: 'p1',
    title: 'Kandhi Pappu',
    categoryId: '68a57d05701cbce1ebb1e924',
    category: 'Pulses',
    categoryPath: '_Pulses',
  };

  it('maps both fields on every product mapper', () => {
    expect(mapApiProduct(raw).categoryName).toBe('Pulses');
    expect(mapApiProduct(raw).categoryPath).toBe('_Pulses');
    expect(mapProductWithVariants(raw).categoryName).toBe('Pulses');
    expect(mapProductWithVariants(raw).categoryPath).toBe('_Pulses');
    expect(mapProduct(raw).categoryName).toBe('Pulses');
    expect(mapProduct(raw).categoryPath).toBe('_Pulses');
  });

  it('leaves them undefined when absent or empty', () => {
    const without = { _id: 'p2', title: 'Rice', category: '', categoryPath: '' };
    expect(mapApiProduct(without).categoryName).toBeUndefined();
    expect(mapApiProduct(without).categoryPath).toBeUndefined();
    expect(mapProduct({ _id: 'p3', title: 'Salt' }).categoryName).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "category name and path"`

Expected: FAIL — `Property 'categoryName' does not exist on type 'Product'`.

- [ ] **Step 3: Add the fields to both types**

In `src/base/types/village.types.ts`, in `interface Product`, replace:

```typescript
  stock?: number;
  variants?: Variant[];
}
```

with:

```typescript
  stock?: number;
  /** Human-readable category name, e.g. "Pulses". */
  categoryName?: string;
  /** Backend category path, e.g. "_Pulses". */
  categoryPath?: string;
  variants?: Variant[];
}
```

In `src/features/home/data/homeLayout.types.ts`, in `interface HomeProduct`, replace:

```typescript
  categoryId?: string;
  hasVariants?: boolean; // product has multiple variant options
```

with:

```typescript
  categoryId?: string;
  categoryName?: string; // human-readable name, e.g. "Pulses"
  categoryPath?: string; // backend category path, e.g. "_Pulses"
  hasVariants?: boolean; // product has multiple variant options
```

- [ ] **Step 4: Add a `str` helper to `productMapper.ts`**

`homeLayoutMapper.ts` already has a local `str`; `productMapper.ts` does not. Add it in `src/features/home/data/productMapper.ts` directly below the existing `num` function:

```typescript
/** Coerce to a non-empty string, or undefined — an absent or empty API field
 *  must not become the string "undefined" or a truthy "". */
function str(v: unknown): string | undefined {
  return v ? String(v) : undefined;
}
```

- [ ] **Step 5: Map the fields in `mapApiProduct`**

In `src/features/home/data/productMapper.ts`, in `mapApiProduct`'s return object, replace:

```typescript
    stock: totalStock,
```

with:

```typescript
    stock: totalStock,
    categoryName: str(p?.category),
    categoryPath: str(p?.categoryPath),
```

- [ ] **Step 6: Add the fields to `RawApiProduct`**

In the same file, in `interface RawApiProduct`, replace:

```typescript
  _id?: unknown;
  categoryId?: unknown;
```

with:

```typescript
  _id?: unknown;
  categoryId?: unknown;
  /** Human-readable category name; sibling of the id in `categoryId`. */
  category?: unknown;
  categoryPath?: unknown;
```

- [ ] **Step 7: Map the fields in both `homeLayoutMapper` mappers**

In `src/features/home/data/homeLayoutMapper.ts`, in `mapProductWithVariants`'s return object, replace:

```typescript
    image,
    variants: variants.length > 0 ? variants : undefined,
  };
}
```

with:

```typescript
    image,
    categoryName: str(p?.category),
    categoryPath: str(p?.categoryPath),
    variants: variants.length > 0 ? variants : undefined,
  };
}
```

In `mapProduct`'s return object, replace:

```typescript
    hasVariants: (variants?.length ?? 0) > 1,
```

with:

```typescript
    categoryName: str(p?.category),
    categoryPath: str(p?.categoryPath),
    hasVariants: (variants?.length ?? 0) > 1,
```

- [ ] **Step 8: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`

Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/base/types/village.types.ts src/features/home/data/homeLayout.types.ts src/features/home/data/productMapper.ts src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat(mapper): carry category name and path through the product mappers"
```

---

## Task 6: Give `mapApiProduct` the product-level image fallback

`mapApiProduct` reads only the first variant's image, so a product whose variants carry no images maps to no image at all — even when the payload has a product-level `landingImage`. `mapProduct` and `mapProductWithVariants` already fall back. Bring the third in line.

**Files:**
- Modify: `src/features/home/data/productMapper.ts:151`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
describe('mapApiProduct image fallback', () => {
  it('falls back to the product landingImage when no variant has an image', () => {
    const raw = {
      _id: 'p1',
      title: 'Kandhi Pappu',
      landingImage: 'https://cdn/product.webp',
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5 }],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/product.webp');
  });

  it('falls back to the first product gallery image after that', () => {
    const raw = {
      _id: 'p2',
      title: 'Kandhi Pappu',
      images: ['https://cdn/gallery.webp'],
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5 }],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/gallery.webp');
  });

  it('still prefers the variant image when there is one', () => {
    const raw = {
      _id: 'p3',
      title: 'Kandhi Pappu',
      landingImage: 'https://cdn/product.webp',
      variants: [
        { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, landingImage: 'https://cdn/variant.webp' },
      ],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/variant.webp');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "mapApiProduct image fallback"`

Expected: FAIL on the first two — `expected 'https://cdn/product.webp', received undefined`. The third already passes.

- [ ] **Step 3: Add the fallback chain**

In `src/features/home/data/productMapper.ts`, in `mapApiProduct`, replace:

```typescript
  const productImage = firstVariant?.image;
```

with:

```typescript
  // Same fallback order as mapProduct/mapProductWithVariants: the variant's
  // image wins, then the product's own landing image, then its gallery.
  const productImage =
    firstVariant?.image ??
    str(p?.landingImage) ??
    (Array.isArray(p?.images) ? str(p.images[0]) : undefined);
```

- [ ] **Step 4: Run the suite**

Run: `npx jest`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/home/data/productMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat(mapper): fall back to the product image in mapApiProduct"
```

---

## Task 7: Fix `mapProductWithVariants`'s variant-image fallback

The existing fallback chain tests one thing and returns another:

```typescript
    (firstVariant && (rawFirstVariant?.landingImage || Array.isArray(rawFirstVariant?.images))
      ? (rawFirstVariant?.images as unknown[] | undefined)?.[0]
      : undefined) ||
```

The condition is satisfied by a variant that has a `landingImage`, but the branch
returns `images[0]` — so a variant with a landing image and no gallery array maps
to an empty string. Every variant in the new payload has a `landingImage`, and
some product responses carry no product-level image, so this is reachable.
`mapVariant` already computes the correct value; use it.

**Files:**
- Modify: `src/features/home/data/homeLayoutMapper.ts:125-139`
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
describe('mapProductWithVariants image fallback', () => {
  const noProductImage = {
    _id: 'p1',
    title: 'Kandhi Pappu',
    variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, landingImage: 'https://cdn/kp.webp' }],
  };

  it("uses the variant's landingImage when the variant has no gallery array", () => {
    expect(mapProductWithVariants(noProductImage).image).toBe('https://cdn/kp.webp');
  });

  it("uses the variant's first gallery image when it has no landingImage", () => {
    const galleryOnly = {
      ...noProductImage,
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, images: ['https://cdn/gal.webp'] }],
    };
    expect(mapProductWithVariants(galleryOnly).image).toBe('https://cdn/gal.webp');
  });

  it('still prefers the product-level landingImage over the variant', () => {
    const withProductImage = { ...noProductImage, landingImage: 'https://cdn/product.webp' };
    expect(mapProductWithVariants(withProductImage).image).toBe('https://cdn/product.webp');
  });

  it('maps to an empty string when nothing has an image', () => {
    const nothing = { _id: 'p2', title: 'Salt', variants: [{ _id: 'v1', title: '1 kg', mrp: 20, dealPrice: 20, stock: 5 }] };
    expect(mapProductWithVariants(nothing).image).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "mapProductWithVariants image fallback"`

Expected: FAIL on the first test — `expected 'https://cdn/kp.webp', received ''`. The other three already pass.

- [ ] **Step 3: Replace the fallback chain**

In `src/features/home/data/homeLayoutMapper.ts`, in `mapProductWithVariants`, replace this whole block:

```typescript
  // Extract image from product or first variant. The raw (pre-mapVariants) first
  // entry is read directly here, matching the pre-existing fallback order;
  // `variantIds` is `unknown` on the raw type, so this narrows once at the single
  // nested access rather than typing every level of an already-raw JSON blob.
  const rawFirstVariant = rawVariants(p)[0] as RawVariant | undefined;
  const image = String(
    p?.landingImage ||
    (Array.isArray(p?.images) ? p.images[0] : undefined) ||
    (firstVariant && (rawFirstVariant?.landingImage || Array.isArray(rawFirstVariant?.images))
      ? (rawFirstVariant?.images as unknown[] | undefined)?.[0]
      : undefined) ||
    ''
  );
```

with:

```typescript
  // Product image first, then the first variant's. `firstVariant.image` is
  // already `landingImage || images[0]` (mapVariant), so reading it here keeps
  // this in step with every other mapper instead of re-deriving the fallback.
  const image = String(
    p?.landingImage ||
    (Array.isArray(p?.images) ? p.images[0] : undefined) ||
    firstVariant?.image ||
    ''
  );
```

- [ ] **Step 4: Drop the now-unused imports**

`rawVariants` and `RawVariant` are no longer referenced in `homeLayoutMapper.ts` after that block goes. Replace the import on line 18:

```typescript
import { mapVariants, populatedCategoryId, rawVariants, RawApiProduct, RawVariant } from './productMapper';
```

with:

```typescript
import { mapVariants, populatedCategoryId, RawApiProduct } from './productMapper';
```

- [ ] **Step 5: Run the suite, typecheck, and lint**

Run: `npx jest && npx tsc --noEmit && npm run lint`

Expected: PASS, no type errors, no unused-import lint warnings. If lint still flags an unused import, remove exactly what it names.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "fix(mapper): use the variant's resolved image in mapProductWithVariants"
```

---

## Task 8: Fall back to the top-level `category` for `ProductDetail.categoryTitle`

`mapProductDetail` reads `p?.categoryId?.title`, which is `undefined` when `categoryId` is a bare string. The new payload carries the readable name at the top level as `category`.

**Files:**
- Modify: `src/features/product/data/productDetailApi.ts:67`
- Modify: `src/features/product/data/productDetail.types.ts:23`
- Test: `src/features/product/data/__tests__/productDetailApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/product/data/__tests__/productDetailApi.test.ts`, inside `describe('mapProductDetail', ...)`, after the `'maps active:false to inactive'` test:

```typescript
  it('falls back to the top-level category name when categoryId is a bare string', () => {
    const d = mapProductDetail({
      ...RAW,
      categoryId: '68a57d05701cbce1ebb1e924',
      category: 'Pulses',
    });
    expect(d.categoryTitle).toBe('Pulses');
  });

  it('still prefers the populated categoryId.title', () => {
    const d = mapProductDetail({ ...RAW, category: 'Ignored' });
    expect(d.categoryTitle).toBe('Dairy & Eggs');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts -t "top-level category name"`

Expected: FAIL — `expected 'Pulses', received undefined`.

- [ ] **Step 3: Add the fallback**

In `src/features/product/data/productDetailApi.ts`, in `mapProductDetail`'s return object, replace:

```typescript
    categoryTitle: p?.categoryId?.title || undefined,
```

with:

```typescript
    categoryTitle: p?.categoryId?.title || p?.category || undefined,
```

- [ ] **Step 4: Update the type's doc comment**

In `src/features/product/data/productDetail.types.ts`, replace:

```typescript
  categoryTitle?: string; // categoryId.title
```

with:

```typescript
  categoryTitle?: string; // categoryId.title, falling back to the top-level category
```

- [ ] **Step 5: Run the suite**

Run: `npx jest src/features/product/data`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/product/data/productDetailApi.ts src/features/product/data/productDetail.types.ts src/features/product/data/__tests__/productDetailApi.test.ts
git commit -m "feat(product): fall back to the top-level category for categoryTitle"
```

---

## Task 9: Pin the real payload as an end-to-end fixture

The previous tasks each tested one field in isolation. This one asserts the actual Kandhi Pappu response maps correctly end-to-end, on both the list path and the detail path — the regression test that catches any future field getting dropped.

**Files:**
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`
- Test: `src/features/product/data/__tests__/productDetailApi.test.ts`

- [ ] **Step 1: Write the list-path fixture test**

Add a new top-level `describe` block at the end of `src/features/home/data/__tests__/homeLayoutMapper.test.ts`:

```typescript
// A real /app/product response, trimmed to three of its six variants (one
// per stock condition: plentiful, plentiful, out of stock). Prices are the
// payload's real rupee values, so every assertion goes through rupees().
const KANDHI_PAPPU = {
  _id: '6a69e3c4fcbaf7b551f79ab0',
  title: 'కంది పప్పు | Kandhi Pappu (Toor Dal)',
  description: '',
  teluguTitle: 'కంది పప్పు',
  landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
  categoryId: '68a57d05701cbce1ebb1e924',
  rating: 0,
  reviews: 0,
  manufacturerId: '68a5af6ae286fe170cd176af',
  category: 'Pulses',
  categoryPath: '_Pulses',
  variants: [
    {
      _id: '6a6a3284fcbaf7b551f79ac2',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Normal Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-normal-quality',
      teluguTitle: 'కంది పప్పు - 1 kg - Normal Quality',
      description: '',
      mrp: 220,
      listPrice: 200,
      dealPrice: 200,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 100,
    },
    {
      _id: '6a6a329afcbaf7b551f79acb',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Top Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-top-quality',
      teluguTitle: 'కంది పప్పు - 1 kg - Top Quality',
      description: '',
      mrp: 110,
      listPrice: 100,
      dealPrice: 100,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 90,
    },
    {
      _id: '6a6a3284fcbaf7b551f79ac1',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 250 gm - Top Quality',
      slug: 'or-kandhi-pappu-toor-dal-250-gm-top-quality',
      teluguTitle: 'కంది పప్పు - 250 gm - Top Quality',
      description: '',
      mrp: 30,
      listPrice: 28,
      dealPrice: 28,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 0,
    },
  ],
};

describe('the real Kandhi Pappu payload', () => {
  it('maps every product-level field through mapApiProduct', () => {
    const product = mapApiProduct(KANDHI_PAPPU);
    expect(product.id).toBe('6a69e3c4fcbaf7b551f79ab0');
    expect(product.name).toBe('కంది పప్పు | Kandhi Pappu (Toor Dal)');
    expect(product.nameTE).toBe('కంది పప్పు');
    expect(product.categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(product.categoryName).toBe('Pulses');
    expect(product.categoryPath).toBe('_Pulses');
    expect(product.manufacturerId).toBe('68a5af6ae286fe170cd176af');
    expect(product.image).toBe('https://ik.imagekit.io/mf/Kandi_pappu.webp');
    expect(product.stock).toBe(190); // 100 + 90 + 0
    expect(rupees(product.price)).toBe('₹200');
    expect(rupees(product.mrp)).toBe('₹220');
  });

  it('maps every variant field onto the Variant dataclass', () => {
    const first = mapApiProduct(KANDHI_PAPPU).variants![0];
    expect(first).toEqual({
      id: '6a6a3284fcbaf7b551f79ac2',
      name: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Normal Quality',
      nameTE: 'కంది పప్పు - 1 kg - Normal Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-normal-quality',
      description: '',
      price: 10, // ₹200 in units
      mrp: 11, // ₹220 in units
      listPrice: 10,
      dealPrice: 10,
      stock: 100,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      image: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      hsn: '',
      active: true,
    });
  });

  it('maps identically on the card path', () => {
    const card = mapProduct(KANDHI_PAPPU);
    expect(card.variants).toEqual(mapApiProduct(KANDHI_PAPPU).variants);
    expect(card.hasVariants).toBe(true);
    expect(card.stock).toBe(190);
    expect(card.inStock).toBe(true);
    expect(rupees(card.price)).toBe('₹200');
    expect(card.discountPct).toBe(9); // (220-200)/220 = 9.09% -> 9
    expect(card.categoryName).toBe('Pulses');
  });

  it('keeps the out-of-stock variant in the list rather than dropping it', () => {
    // The variant sheet must show it, disabled — silently omitting a variant
    // would renumber the ${productId}-v${index} cart keys.
    const variants = mapProduct(KANDHI_PAPPU).variants!;
    expect(variants).toHaveLength(3);
    expect(variants[2].stock).toBe(0);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts -t "real Kandhi Pappu"`

Expected: PASS — Tasks 1-6 already implemented everything this asserts. If the `toEqual` on the variant fails, the diff names exactly which field is missing; fix the mapper, not the assertion.

- [ ] **Step 3: Write the detail-path test**

Add to `src/features/product/data/__tests__/productDetailApi.test.ts`, inside `describe('mapProductDetail', ...)`, after the `'reads variant stock from stockId.stock when present'` test:

```typescript
  it('maps variants arriving under the new `variants` key', () => {
    const d = mapProductDetail({
      ...RAW,
      stock: 99, // product-level value must be ignored once variants exist
      variants: [
        { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 100 },
        { _id: 'v2', title: '250 gm', mrp: 30, dealPrice: 28, stock: 0 },
      ],
    });
    expect(d.variants).toHaveLength(2);
    expect(d.variants![0].id).toBe('v1');
    expect(rupees(d.price)).toBe('₹200');
    expect(rupees(d.mrp)).toBe('₹220');
    expect(d.stock).toBe(100);
    expect(d.inStock).toBe(true);
  });
```

- [ ] **Step 4: Run it**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts`

Expected: PASS.

- [ ] **Step 5: Run everything and typecheck**

Run: `npx jest && npx tsc --noEmit && npm run lint`

Expected: all tests pass, no type errors, no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/data/__tests__/homeLayoutMapper.test.ts src/features/product/data/__tests__/productDetailApi.test.ts
git commit -m "test(mapper): pin the real Kandhi Pappu payload end to end"
```

---

## Out of Scope

The `variants[0]` product-level price rule. All three mappers take the first variant for the card price, so this payload renders ₹200 (the 1 kg pack) rather than ₹28 (the cheapest). That is pre-existing behaviour across every endpoint, not a regression from this change. Do not change it in this plan.
